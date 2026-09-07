export const MINIAPP_IDENTITY_SYNC_RECOVERY_DELAYS_MS = [1000, 2000, 4000] as const;
export const MINIAPP_IDENTITY_SYNC_RECOVERY_CODES = new Set(["MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE"]);

export type MiniAppIdentitySyncRecoveryError = {
  code?: string | null;
};

type RecoveryOptions<T> = {
  attempt: (attemptNumber: number) => Promise<T>;
  getErrorCode: (error: unknown) => string | null;
  onPending?: (input: { attemptNumber: number; nextDelayMs: number; error: unknown }) => void;
  delaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const runMiniAppIdentitySyncRecovery = async <T>(options: RecoveryOptions<T>): Promise<T> => {
  const delays = options.delaysMs?.length ? [...options.delaysMs] : [...MINIAPP_IDENTITY_SYNC_RECOVERY_DELAYS_MS];
  const sleep = options.sleep || defaultSleep;
  for (let index = 0; ; index += 1) {
    try {
      return await options.attempt(index + 1);
    } catch (error: unknown) {
      const code = options.getErrorCode(error);
      const canRetry = !!code && MINIAPP_IDENTITY_SYNC_RECOVERY_CODES.has(code) && index < delays.length;
      if (!canRetry) throw error;
      const nextDelayMs = Math.max(0, Number(delays[index] || 0));
      options.onPending?.({ attemptNumber: index + 1, nextDelayMs, error });
      await sleep(nextDelayMs);
    }
  }
};
