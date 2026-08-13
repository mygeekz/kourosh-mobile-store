import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import type { TelegramTransport, TelegramTransportRequest, TelegramTransportResult } from "./TelegramTransport";

const TELEGRAM_BOT_API_BASE_URL = "https://api.telegram.org";
const TG_TIMEOUT_MS = 12_000;

const formatTelegramNetworkError = (err: any, timeoutMs = TG_TIMEOUT_MS) => {
  const cause = err?.cause;
  const extra = cause?.code ? ` (cause: ${cause.code})` : cause?.message ? ` (cause: ${cause.message})` : "";
  return err?.name === "AbortError" || err?.code === "TELEGRAM_REQUEST_TIMEOUT"
    ? `Telegram request timeout after ${timeoutMs}ms`
    : (err?.message || "Telegram network request failed") + extra;
};

const safeMultipartToken = (value: unknown) => String(value ?? "").replace(/[\r\n"]/g, "_");

const buildMultipartBody = (multipart: NonNullable<TelegramTransportRequest["multipart"]>) => {
  const boundary = `----kourosh-telegram-${crypto.randomUUID().replace(/-/g, "")}`;
  const chunks: Buffer[] = [];
  for (const [key, value] of Object.entries(multipart.fields || {})) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${safeMultipartToken(key)}"\r\n\r\n${String(value)}\r\n`, "utf8"));
  }
  const attachment = multipart.attachment;
  chunks.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${safeMultipartToken(attachment.fieldName)}"; filename="${safeMultipartToken(attachment.filename || "file.bin")}"\r\nContent-Type: ${String(attachment.mimeType || "application/octet-stream").replace(/[\r\n]/g, "")}\r\n\r\n`,
    "utf8",
  ));
  chunks.push(Buffer.from(attachment.data));
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
};

const buildRequestBody = (request: TelegramTransportRequest) => {
  if (request.multipart) return buildMultipartBody(request.multipart);
  if ((request.httpMethod || "POST") === "GET" || request.payload === undefined) return { body: null as Buffer | null, contentType: null as string | null };
  return { body: Buffer.from(JSON.stringify(request.payload), "utf8"), contentType: "application/json" };
};

type MinimalHttpResponse = { status: number; ok: boolean; text: () => Promise<string> };

const executeDirectHttpRequest = (urlValue: string, request: TelegramTransportRequest, timeoutMs: number): Promise<MinimalHttpResponse> => {
  const url = new URL(urlValue);
  if (url.protocol !== "http:" && url.protocol !== "https:") return Promise.reject(new Error("Unsupported Telegram Bot API protocol."));
  const httpMethod = request.httpMethod || "POST";
  const { body, contentType } = buildRequestBody(request);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const clearRequestTimeout = () => { if (timeoutHandle) { clearTimeout(timeoutHandle); timeoutHandle = null; } };
    const finishReject = (error: any) => {
      if (settled) return;
      settled = true;
      clearRequestTimeout();
      reject(error);
    };
    const req = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      method: httpMethod,
      path: `${url.pathname}${url.search}`,
      headers: body ? {
        ...(contentType ? { "content-type": contentType } : {}),
        "content-length": String(body.length),
      } : undefined,
      // Critical v160 invariant: native one-shot HTTP(S), no global fetch dispatcher,
      // no application proxy and no HTTP(S)_PROXY / NODE_USE_ENV_PROXY inheritance.
      agent: false,
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      response.on("error", finishReject);
      response.on("end", () => {
        if (settled) return;
        settled = true;
        clearRequestTimeout();
        const raw = Buffer.concat(chunks).toString("utf8");
        const status = Number(response.statusCode || 0);
        resolve({ status, ok: status >= 200 && status < 300, text: async () => raw });
      });
    });
    timeoutHandle = setTimeout(() => {
      const error: any = new Error(`Telegram request timeout after ${timeoutMs}ms`);
      error.code = "TELEGRAM_REQUEST_TIMEOUT";
      req.destroy(error);
    }, timeoutMs);
    req.on("error", finishReject);
    if (body) req.end(body);
    else req.end();
  });
};

export class DirectTelegramTransport implements TelegramTransport {
  readonly mode: TelegramTransport["mode"] = "direct";
  protected readonly apiBaseUrl: string;

  constructor(options: { apiBaseUrl?: string; environment?: string } = {}) {
    const candidate = String(options.apiBaseUrl || TELEGRAM_BOT_API_BASE_URL).replace(/\/$/, "");
    const environment = options.environment || process.env.NODE_ENV || "production";
    if (candidate !== TELEGRAM_BOT_API_BASE_URL && !["test", "development"].includes(environment)) {
      throw new Error("Custom Telegram Bot API origin is restricted to test/development.");
    }
    this.apiBaseUrl = candidate;
  }

  // Compatibility with TelegramTransport. Direct mode intentionally ignores app proxy configuration.
  setProxy(_proxyUrl?: string | null): void {}

  protected buildUrl(botToken: string, method: string) {
    return `${this.apiBaseUrl}/bot${botToken}/${method}`;
  }

  protected async requestWithNetwork(
    request: TelegramTransportRequest,
    options: { proxyUrl?: string | null } = {},
  ): Promise<TelegramTransportResult> {
    const botToken = String(request.botToken || "").trim();
    const method = String(request.method || "").trim();
    if (!method) return { success: false, message: "Telegram method is required." };

    const startedAt = Date.now();
    const timeoutMs = Number.isFinite(request.timeoutMs) && Number(request.timeoutMs) > 0 ? Number(request.timeoutMs) : TG_TIMEOUT_MS;
    const url = this.buildUrl(botToken, method);
    try {
      const proxyUrl = String(options.proxyUrl || "").trim();
      let response: any;
      if (proxyUrl) {
        let agent: any;
        if (proxyUrl.startsWith("socks")) {
          const { SocksProxyAgent } = await import("socks-proxy-agent");
          agent = new SocksProxyAgent(proxyUrl);
        } else {
          const { HttpsProxyAgent } = await import("https-proxy-agent");
          agent = new HttpsProxyAgent(proxyUrl);
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const httpMethod = request.httpMethod || "POST";
          let multipartForm: FormData | null = null;
          if (request.multipart) {
            multipartForm = new FormData();
            for (const [key, value] of Object.entries(request.multipart.fields || {})) multipartForm.append(key, value);
            const attachment = request.multipart.attachment;
            multipartForm.append(attachment.fieldName, new Blob([attachment.data], { type: attachment.mimeType || "application/octet-stream" }), attachment.filename || "file.bin");
          }
          const init: any = request.multipart
            ? { method: httpMethod, body: multipartForm, signal: controller.signal }
            : { method: httpMethod, headers: request.payload === undefined ? undefined : { "Content-Type": "application/json" }, body: httpMethod === "GET" || request.payload === undefined ? undefined : JSON.stringify(request.payload), signal: controller.signal };
          const { default: nodeFetch } = await import("node-fetch");
          // Proxy mode always owns an explicit application proxy agent; system ENV proxy state is irrelevant.
          response = await nodeFetch(url, { ...init, agent } as any);
        } finally {
          clearTimeout(timer);
        }
      } else {
        response = await executeDirectHttpRequest(url, request, timeoutMs);
      }
      const durationMs = Date.now() - startedAt;
      const status = response.status;
      const rawText = await response.text().catch(() => "");
      let data: any = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch { data = null; }
      const details = { httpStatus: status, rawResponseText: rawText, durationMs };
      if (response.ok && data?.ok) return { success: true, status, data, rawText, details };
      return { success: false, status, message: data?.description || `Telegram request failed (HTTP ${status})`, data: data ?? rawText, rawText, errorCode: "TELEGRAM_API_ERROR", details };
    } catch (error: any) {
      return {
        success: false,
        message: formatTelegramNetworkError(error, timeoutMs),
        errorCode: "TELEGRAM_NETWORK_ERROR",
        details: { rawResponseText: "", durationMs: Date.now() - startedAt },
      };
    }
  }

  async request(request: TelegramTransportRequest): Promise<TelegramTransportResult> {
    return this.requestWithNetwork(request);
  }
}

export const directTelegramTransport = new DirectTelegramTransport();
