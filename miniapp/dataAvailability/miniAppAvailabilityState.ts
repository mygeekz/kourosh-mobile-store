import type { MiniAppResponseMeta } from "../reference/miniAppDataAvailability";

export type MiniAppDataAvailabilityState = {
  /** Last successfully resolved provenance metadata. Kept while a refresh is in flight. */
  meta: MiniAppResponseMeta | null;
  /** True while the current primary request is in flight. */
  pending: boolean;
  /** Path of the primary request currently allowed to control global availability. */
  requestPath: string | null;
};

export const MINIAPP_DATA_AVAILABILITY_INITIAL_STATE: MiniAppDataAvailabilityState = Object.freeze({
  meta: null,
  pending: false,
  requestPath: null,
});

export const beginMiniAppAvailabilityRequest = (
  current: MiniAppDataAvailabilityState,
  path: string,
  primary = true,
): MiniAppDataAvailabilityState => {
  if (!primary) return current;
  return {
    meta: current.meta,
    pending: true,
    requestPath: path,
  };
};

export const reportMiniAppAvailabilityMeta = (
  current: MiniAppDataAvailabilityState,
  path: string,
  meta: MiniAppResponseMeta,
): MiniAppDataAvailabilityState => {
  if (current.requestPath !== null && current.requestPath !== path) return current;
  return { meta, pending: false, requestPath: path };
};

export const finishMiniAppAvailabilityRequest = (
  current: MiniAppDataAvailabilityState,
  path: string,
): MiniAppDataAvailabilityState => {
  if (current.requestPath !== path) return current;
  return { ...current, pending: false };
};

export const clearMiniAppAvailability = (
  current: MiniAppDataAvailabilityState,
  path?: string,
): MiniAppDataAvailabilityState => {
  if (path && current.requestPath !== path) return current;
  return { ...MINIAPP_DATA_AVAILABILITY_INITIAL_STATE };
};
