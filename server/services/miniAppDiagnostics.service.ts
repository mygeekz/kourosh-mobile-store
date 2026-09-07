import { randomUUID } from "node:crypto";
import { allTypedAsync, getTypedAsync } from "../db/query";
import { ensureConnectorCredential } from "../cloud/connectorCredentialStore";
import {
  getMiniAppSnapshotRuntimeStatus,
  getMiniAppSnapshotSubjectDiagnostic,
} from "../cloud/snapshots/miniAppSnapshotRuntime";
import {
  MINIAPP_DIAGNOSTICS_MAX_RESPONSE_BYTES,
  MINIAPP_DIAGNOSTICS_PATH,
  createSignedMiniAppDiagnosticsRequest,
  type MiniAppDiagnosticsSubjectKind,
} from "../cloud/snapshots/miniAppDiagnosticsProtocol";
import { resolveMiniAppIdentity, MiniAppIdentityResolutionError } from "./miniAppIdentity.service";

export type MiniAppDiagnosticState = "ok" | "warning" | "error" | "info";

export type MiniAppDiagnosticStep = {
  key: string;
  label: string;
  state: MiniAppDiagnosticState;
  code: string;
  message: string;
  at?: string | null;
  meta?: Record<string, string | number | boolean | null>;
};

export type MiniAppDiagnosticReport = {
  correlationId: string;
  generatedAt: string;
  subject: {
    kind: MiniAppDiagnosticsSubjectKind;
    id: number;
    displayName: string;
    phoneNumber: string | null;
    telegramLinked: boolean;
    telegramUserId: string | null;
  };
  overall: MiniAppDiagnosticState;
  overallCode: string;
  summary: string;
  recommendedAction: string | null;
  steps: MiniAppDiagnosticStep[];
};

type SubjectRow = {
  id: number;
  displayName: string;
  phoneNumber: string | null;
  telegram_user_id: string | null;
};

type EdgeDiagnosticData = {
  edgeVersion?: string;
  installation?: { active?: boolean };
  snapshot?: {
    present?: boolean;
    state?: string;
    snapshotVersion?: number;
    generatedAt?: string;
    receivedAt?: string;
    authorizationValidUntil?: string;
  };
  liveOriginConfigured?: boolean;
};

const TELEGRAM_USER_ID = /^[1-9][0-9]{0,19}$/;
const severityRank: Record<MiniAppDiagnosticState, number> = { ok: 0, info: 1, warning: 2, error: 3 };

const readSubject = async (kind: MiniAppDiagnosticsSubjectKind, id: number): Promise<SubjectRow | null> => {
  const sql = kind === "customer"
    ? `SELECT id, fullName AS displayName, phoneNumber, telegram_user_id FROM customers WHERE id=? LIMIT 1`
    : `SELECT id, partnerName AS displayName, phoneNumber, telegram_user_id FROM partners WHERE id=? LIMIT 1`;
  return (await getTypedAsync<SubjectRow>(sql, [id])) || null;
};

const readResponseBounded = async (response: Response): Promise<string> => {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MINIAPP_DIAGNOSTICS_MAX_RESPONSE_BYTES) throw Object.assign(new Error("Diagnostic response too large."), { code: "MINIAPP_DIAGNOSTIC_RESPONSE_TOO_LARGE" });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MINIAPP_DIAGNOSTICS_MAX_RESPONSE_BYTES) throw Object.assign(new Error("Diagnostic response too large."), { code: "MINIAPP_DIAGNOSTIC_RESPONSE_TOO_LARGE" });
  return Buffer.from(bytes).toString("utf8");
};

const probeEdge = async (input: {
  kind: MiniAppDiagnosticsSubjectKind;
  telegramUserId: string;
}): Promise<{ ok: boolean; status: number; code: string; requestId?: string; data?: EdgeDiagnosticData }> => {
  const runtime = getMiniAppSnapshotRuntimeStatus();
  if (!runtime.enabled || !runtime.installationId || !runtime.botId || !runtime.syncEndpoint) {
    return { ok: false, status: 0, code: "MINIAPP_DIAGNOSTIC_EDGE_NOT_CONFIGURED" };
  }
  const credential = ensureConnectorCredential({ createIfMissing: false });
  if (!credential) return { ok: false, status: 0, code: "MINIAPP_DIAGNOSTIC_CREDENTIAL_UNAVAILABLE" };
  const signed = createSignedMiniAppDiagnosticsRequest({
    installationId: runtime.installationId,
    credentialVersion: runtime.credentialVersion,
    botId: runtime.botId,
    subjectKind: input.kind,
    telegramUserId: input.telegramUserId,
    signCanonical: credential.signChallenge,
  });
  let endpoint: URL;
  try {
    endpoint = new URL(runtime.syncEndpoint);
    endpoint.pathname = MINIAPP_DIAGNOSTICS_PATH;
    endpoint.search = "";
    endpoint.hash = "";
  } catch {
    return { ok: false, status: 0, code: "MINIAPP_DIAGNOSTIC_EDGE_URL_INVALID" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(endpoint, { method: signed.method, headers: signed.headers, body: signed.body, signal: controller.signal });
    const text = await readResponseBounded(response);
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { return { ok: false, status: response.status, code: "MINIAPP_DIAGNOSTIC_EDGE_RESPONSE_INVALID", requestId: signed.requestId }; }
    return {
      ok: Boolean(response.ok && payload?.success !== false),
      status: response.status,
      code: String(payload?.code || (response.ok ? "MINIAPP_DIAGNOSTIC_EDGE_OK" : "MINIAPP_DIAGNOSTIC_EDGE_REJECTED")),
      requestId: String(payload?.requestId || signed.requestId),
      data: payload?.data || undefined,
    };
  } catch (error: any) {
    return { ok: false, status: 0, code: error?.name === "AbortError" ? "MINIAPP_DIAGNOSTIC_EDGE_TIMEOUT" : String(error?.code || "MINIAPP_DIAGNOSTIC_EDGE_UNREACHABLE"), requestId: signed.requestId };
  } finally {
    clearTimeout(timeout);
  }
};

const probeLiveOrigin = async (): Promise<{ ok: boolean; status: number; code: string; release: string | null }> => {
  const runtime = getMiniAppSnapshotRuntimeStatus();
  if (!runtime.liveOrigin) return { ok: false, status: 0, code: "MINIAPP_DIAGNOSTIC_LIVE_ORIGIN_NOT_CONFIGURED", release: null };
  let endpoint: URL;
  try { endpoint = new URL("/healthz", runtime.liveOrigin); }
  catch { return { ok: false, status: 0, code: "MINIAPP_DIAGNOSTIC_LIVE_ORIGIN_INVALID", release: null }; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(endpoint, { method: "GET", cache: "no-store", signal: controller.signal });
    return {
      ok: response.status === 200,
      status: response.status,
      code: response.status === 200 ? "MINIAPP_DIAGNOSTIC_LIVE_OK" : "MINIAPP_DIAGNOSTIC_LIVE_REJECTED",
      release: response.headers.get("x-kourosh-release"),
    };
  } catch (error: any) {
    return { ok: false, status: 0, code: error?.name === "AbortError" ? "MINIAPP_DIAGNOSTIC_LIVE_TIMEOUT" : "MINIAPP_DIAGNOSTIC_LIVE_UNREACHABLE", release: null };
  } finally {
    clearTimeout(timeout);
  }
};

const overallFromSteps = (steps: MiniAppDiagnosticStep[]): MiniAppDiagnosticState =>
  steps.reduce<MiniAppDiagnosticState>((current, step) => severityRank[step.state] > severityRank[current] ? step.state : current, "ok");

const recommendedActionFor = (steps: MiniAppDiagnosticStep[]): string | null => {
  const firstError = steps.find((step) => step.state === "error") || steps.find((step) => step.state === "warning");
  if (!firstError) return null;
  if (firstError.code === "MINIAPP_DIAGNOSTIC_TELEGRAM_NOT_LINKED") return "ابتدا اتصال امن تلگرام این پرونده را انجام دهید و سپس دوباره عیب‌یابی را اجرا کنید.";
  if (firstError.code.includes("IDENTITY")) return "اتصال هویت این پرونده را بررسی کنید؛ یک Telegram User ID نباید هم‌زمان به چند پرونده یا نقش متصل باشد.";
  if (firstError.code.includes("EDGE") || firstError.code.includes("SNAPSHOT")) return "همگام‌سازی Snapshot را اجرا کنید و وضعیت Cloudflare/Connector را بررسی کنید.";
  if (firstError.code.includes("LIVE")) return "Live Origin یا تونل فروشگاه را بررسی کنید؛ MiniApp مشتری/همکار می‌تواند موقتاً از Snapshot استفاده کند ولی Staff به اتصال زنده نیاز دارد.";
  return "کد خطای مرحله ناموفق را بررسی کرده و پس از رفع علت، عیب‌یابی را دوباره اجرا کنید.";
};

export const runMiniAppDiagnostic = async (input: {
  kind: MiniAppDiagnosticsSubjectKind;
  subjectId: number;
}): Promise<MiniAppDiagnosticReport> => {
  const kind = input.kind;
  const subjectId = Number(input.subjectId);
  if (!(["customer", "partner"] as const).includes(kind) || !Number.isSafeInteger(subjectId) || subjectId <= 0) {
    throw Object.assign(new Error("پرونده انتخاب‌شده برای عیب‌یابی معتبر نیست."), { code: "MINIAPP_DIAGNOSTIC_SUBJECT_INVALID" });
  }
  const correlationId = `diag_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const generatedAt = new Date().toISOString();
  const row = await readSubject(kind, subjectId);
  if (!row) throw Object.assign(new Error(kind === "customer" ? "مشتری یافت نشد." : "همکار یافت نشد."), { code: "MINIAPP_DIAGNOSTIC_SUBJECT_NOT_FOUND" });

  const telegramUserId = String(row.telegram_user_id || "").trim();
  const telegramLinked = TELEGRAM_USER_ID.test(telegramUserId);
  const steps: MiniAppDiagnosticStep[] = [{
    key: "database_binding",
    label: "پرونده و اتصال تلگرام",
    state: telegramLinked ? "ok" : "error",
    code: telegramLinked ? "MINIAPP_DIAGNOSTIC_DB_BINDING_OK" : "MINIAPP_DIAGNOSTIC_TELEGRAM_NOT_LINKED",
    message: telegramLinked ? "Telegram User ID معتبر روی پرونده ثبت شده است." : "این پرونده Telegram User ID معتبر ندارد.",
  }];

  if (telegramLinked) {
    try {
      const resolved = await resolveMiniAppIdentity(telegramUserId);
      const matches = Boolean(resolved && resolved.kind === kind && Number(resolved.subjectId) === subjectId);
      steps.push({
        key: "identity_resolution",
        label: "تطبیق هویت MiniApp",
        state: matches ? "ok" : "error",
        code: matches ? "MINIAPP_DIAGNOSTIC_IDENTITY_OK" : "MINIAPP_DIAGNOSTIC_IDENTITY_MISMATCH",
        message: matches ? "هویت MiniApp دقیقاً به همین پرونده resolve می‌شود." : "Telegram User ID به این پرونده به‌صورت یکتا resolve نمی‌شود.",
      });
    } catch (error) {
      const ambiguous = error instanceof MiniAppIdentityResolutionError;
      steps.push({
        key: "identity_resolution",
        label: "تطبیق هویت MiniApp",
        state: "error",
        code: ambiguous ? "MINIAPP_DIAGNOSTIC_IDENTITY_AMBIGUOUS" : "MINIAPP_DIAGNOSTIC_IDENTITY_LOOKUP_FAILED",
        message: ambiguous ? "این Telegram User ID به بیش از یک هویت متصل است." : "بررسی هویت MiniApp با خطا روبه‌رو شد.",
      });
    }
  }

  const runtime = getMiniAppSnapshotRuntimeStatus();
  steps.push({
    key: "snapshot_runtime",
    label: "Snapshot Runtime",
    state: runtime.enabled && runtime.state !== "not_ready" ? (runtime.state === "degraded" ? "warning" : "ok") : "error",
    code: runtime.enabled
      ? runtime.state === "degraded" ? String(runtime.lastErrorCode || "MINIAPP_DIAGNOSTIC_SNAPSHOT_DEGRADED") : "MINIAPP_DIAGNOSTIC_SNAPSHOT_RUNTIME_OK"
      : `MINIAPP_DIAGNOSTIC_SNAPSHOT_${String(runtime.reason || "NOT_READY").toUpperCase()}`,
    message: runtime.enabled
      ? runtime.state === "degraded" ? "Snapshot Runtime فعال است اما آخرین اجرا خطا داشته است." : "Snapshot Runtime برای Stable Edge آماده است."
      : "Snapshot Runtime برای این تنظیمات آماده نیست.",
    at: runtime.lastSuccessAt,
    meta: { state: runtime.state, syncedSubjects: runtime.syncedSubjects, failedSubjects: runtime.failedSubjects },
  });

  if (telegramLinked) {
    const local = getMiniAppSnapshotSubjectDiagnostic(kind, subjectId, telegramUserId);
    const syncState = local.syncStatus?.state || (local.persisted && local.identityMatches ? "ready" : null);
    steps.push({
      key: "subject_snapshot",
      label: "وضعیت انتشار این پرونده",
      state: local.persisted && local.identityMatches ? (syncState === "failed" ? "warning" : "ok") : syncState === "pending" ? "info" : "warning",
      code: local.persisted && local.identityMatches
        ? "MINIAPP_DIAGNOSTIC_SUBJECT_PUBLISHED"
        : syncState === "pending"
          ? "MINIAPP_DIAGNOSTIC_IDENTITY_SYNC_PENDING"
          : String(local.lastErrorCode || "MINIAPP_DIAGNOSTIC_SUBJECT_NOT_PUBLISHED"),
      message: local.persisted && local.identityMatches
        ? "آخرین انتشار موفق این پرونده در state محلی ثبت شده است."
        : syncState === "pending"
          ? "همگام‌سازی هویت این پرونده هنوز در حال انجام است."
          : "انتشار موفقی برای هویت فعلی این پرونده در state محلی ثبت نشده است.",
      at: local.syncStatus?.readyAt || local.syncStatus?.updatedAt || null,
      meta: { snapshotVersion: local.snapshotVersion, syncState, attempts: local.syncStatus?.attempts ?? null },
    });

    const edge = await probeEdge({ kind, telegramUserId });
    const edgeSnapshotPresent = Boolean(edge.ok && edge.data?.snapshot?.present);
    steps.push({
      key: "edge_snapshot",
      label: "Cloudflare Edge",
      state: edgeSnapshotPresent ? "ok" : edge.ok ? "warning" : "error",
      code: edgeSnapshotPresent ? "MINIAPP_DIAGNOSTIC_EDGE_SNAPSHOT_OK" : edge.ok ? "MINIAPP_DIAGNOSTIC_EDGE_SNAPSHOT_MISSING" : edge.code,
      message: edgeSnapshotPresent ? "Snapshot این هویت واقعاً روی Edge موجود است." : edge.ok ? "Edge در دسترس است اما Snapshot این هویت روی Edge پیدا نشد." : "Probe امضاشده Edge انجام نشد یا رد شد.",
      at: edge.data?.snapshot?.receivedAt || null,
      meta: {
        httpStatus: edge.status,
        edgeVersion: edge.data?.edgeVersion || null,
        snapshotVersion: edge.data?.snapshot?.snapshotVersion ?? null,
        snapshotState: edge.data?.snapshot?.state || null,
        authorizationValidUntil: edge.data?.snapshot?.authorizationValidUntil || null,
        requestId: edge.requestId || null,
      },
    });
  }

  const live = await probeLiveOrigin();
  steps.push({
    key: "live_origin",
    label: "Live Origin",
    state: live.ok ? "ok" : "warning",
    code: live.code,
    message: live.ok ? "Gateway زنده فروشگاه از مسیر /healthz پاسخ سالم داد." : "اتصال زنده فروشگاه در Probe فعلی در دسترس نیست.",
    meta: { httpStatus: live.status, release: live.release },
  });

  const identityReady = steps.some((step) => step.key === "identity_resolution" && step.state === "ok");
  const edgeReady = steps.some((step) => step.key === "edge_snapshot" && step.state === "ok");
  steps.push({
    key: "miniapp_access_readiness",
    label: "آمادگی دسترسی MiniApp",
    state: identityReady && (live.ok || edgeReady) ? "ok" : identityReady ? "warning" : "error",
    code: identityReady && (live.ok || edgeReady) ? "MINIAPP_DIAGNOSTIC_ACCESS_READY" : identityReady ? "MINIAPP_DIAGNOSTIC_ACCESS_DEGRADED" : "MINIAPP_DIAGNOSTIC_ACCESS_BLOCKED",
    message: identityReady && live.ok
      ? "هویت صحیح است و مسیر Live در دسترس است."
      : identityReady && edgeReady
        ? "هویت صحیح است و Snapshot Edge موجود است؛ در نبود Live، مشتری/همکار امکان fallback دارد."
        : identityReady
          ? "هویت صحیح است اما مسیر Live و Snapshot Edge برای دسترسی پایدار آماده نیستند."
          : "تا زمانی که هویت پرونده صحیح نشود، MiniApp این حساب قابل اتکا نیست.",
  });

  const overall = overallFromSteps(steps);
  const report: MiniAppDiagnosticReport = {
    correlationId,
    generatedAt,
    subject: {
      kind,
      id: subjectId,
      displayName: String(row.displayName || (kind === "customer" ? "مشتری" : "همکار")),
      phoneNumber: row.phoneNumber ? String(row.phoneNumber) : null,
      telegramLinked,
      telegramUserId: telegramLinked ? telegramUserId : null,
    },
    overall,
    overallCode: overall === "ok" ? "MINIAPP_DIAGNOSTIC_HEALTHY" : overall === "warning" || overall === "info" ? "MINIAPP_DIAGNOSTIC_DEGRADED" : "MINIAPP_DIAGNOSTIC_FAILED",
    summary: overall === "ok" ? "زنجیره دسترسی MiniApp این پرونده آماده است." : overall === "error" ? "حداقل یک مانع جدی در زنجیره MiniApp این پرونده پیدا شد." : "MiniApp قابل بررسی است اما حداقل یک بخش در وضعیت محدود یا ناپایدار قرار دارد.",
    recommendedAction: null,
    steps,
  };
  report.recommendedAction = recommendedActionFor(steps);
  return report;
};

export const searchMiniAppDiagnosticSubjects = async (input: {
  kind: MiniAppDiagnosticsSubjectKind;
  query: string;
}) => {
  const kind = input.kind;
  if (!(["customer", "partner"] as const).includes(kind)) {
    throw Object.assign(new Error("نوع پرونده برای جستجو معتبر نیست."), { code: "MINIAPP_DIAGNOSTIC_SUBJECT_INVALID" });
  }
  const query = String(input.query || "").trim().slice(0, 100);
  if (!query) return [];
  const escaped = query.replace(/[\\%_]/g, (value) => `\\${value}`);
  const like = `%${escaped}%`;
  const numeric = /^\d+$/.test(query) ? Number(query) : null;
  const sql = kind === "customer"
    ? `SELECT id, fullName AS displayName, phoneNumber, telegram_user_id FROM customers
       WHERE (? IS NOT NULL AND id=?) OR fullName LIKE ? ESCAPE '\\' OR COALESCE(phoneNumber,'') LIKE ? ESCAPE '\\'
       ORDER BY CASE WHEN (? IS NOT NULL AND id=?) THEN 0 ELSE 1 END, fullName COLLATE NOCASE ASC LIMIT 12`
    : `SELECT id, partnerName AS displayName, phoneNumber, telegram_user_id FROM partners
       WHERE (? IS NOT NULL AND id=?) OR partnerName LIKE ? ESCAPE '\\' OR COALESCE(phoneNumber,'') LIKE ? ESCAPE '\\'
       ORDER BY CASE WHEN (? IS NOT NULL AND id=?) THEN 0 ELSE 1 END, partnerName COLLATE NOCASE ASC LIMIT 12`;
  const rows = await allTypedAsync<SubjectRow>(sql, [numeric, numeric, like, like, numeric, numeric]);
  return rows.map((row) => ({
    id: Number(row.id),
    displayName: String(row.displayName || ""),
    phoneNumber: row.phoneNumber ? String(row.phoneNumber) : null,
    telegramLinked: TELEGRAM_USER_ID.test(String(row.telegram_user_id || "").trim()),
  }));
};
