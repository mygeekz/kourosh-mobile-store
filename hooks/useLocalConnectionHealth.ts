import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../utils/apiFetch';

type RuntimeNetworkPayload = {
  publicHost?: unknown;
  publicPort?: unknown;
  publicUrl?: unknown;
  bindAddress?: unknown;
  shareable?: unknown;
  hostDevice?: unknown;
  remoteAccessVerified?: unknown;
};

type RuntimeHealthPayload = {
  ok?: unknown;
  runtime?: unknown;
  secure?: unknown;
  network?: RuntimeNetworkPayload;
};

type SetupStatusPayload = {
  success?: unknown;
  setupRequired?: unknown;
};

export type LocalConnectionHealth = {
  checked: boolean;
  checking: boolean;
  runtimeReachable: boolean;
  apiReachable: boolean;
  secure: boolean;
  shareable: boolean;
  hostDevice: boolean;
  remoteAccessVerified: boolean;
  setupRequired: boolean | null;
  publicHost: string | null;
  publicUrl: string | null;
  qrUrl: string | null;
  error: string | null;
};

const initialState: LocalConnectionHealth = {
  checked: false,
  checking: true,
  runtimeReachable: false,
  apiReachable: false,
  secure: false,
  shareable: false,
  hostDevice: false,
  remoteAccessVerified: false,
  setupRequired: null,
  publicHost: null,
  publicUrl: null,
  qrUrl: null,
  error: null,
};

const isPrivateLanIpv4 = (value: string): boolean => {
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168);
};

const parsePublicAddress = (payload: RuntimeHealthPayload) => {
  const network = payload.network;
  const publicHost = typeof network?.publicHost === 'string' ? network.publicHost.trim() : '';
  const publicUrlValue = typeof network?.publicUrl === 'string' ? network.publicUrl.trim() : '';
  if (!isPrivateLanIpv4(publicHost) || !publicUrlValue) return null;

  try {
    const publicUrl = new URL(publicUrlValue);
    if (publicUrl.protocol !== 'https:' || publicUrl.hostname !== publicHost) return null;
    publicUrl.hash = '/';
    const qrUrl = new URL(publicUrl.href);
    qrUrl.hash = '/install';
    return { publicHost, publicUrl: publicUrl.href, qrUrl: qrUrl.href };
  } catch {
    return null;
  }
};

const fetchJson = async <T,>(request: Promise<Response>): Promise<{ response: Response; payload: T }> => {
  const response = await request;
  const payload = await response.json() as T;
  return { response, payload };
};

export const useLocalConnectionHealth = () => {
  const [health, setHealth] = useState<LocalConnectionHealth>(initialState);

  const refresh = useCallback(async () => {
    setHealth((current) => ({ ...current, checking: true, error: null }));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6500);

    try {
      const [runtimeResult, apiResult] = await Promise.allSettled([
        fetchJson<RuntimeHealthPayload>(fetch('/__kourosh/pwa-health', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        })),
        fetchJson<SetupStatusPayload>(apiFetch('/api/setup/status', {
          cache: 'no-store',
          signal: controller.signal,
          suppressAuthInvalidation: true,
        })),
      ]);

      const runtimeResponse = runtimeResult.status === 'fulfilled' ? runtimeResult.value.response : null;
      const runtimePayload = runtimeResult.status === 'fulfilled' ? runtimeResult.value.payload : null;
      const apiResponse = apiResult.status === 'fulfilled' ? apiResult.value.response : null;
      const apiPayload = apiResult.status === 'fulfilled' ? apiResult.value.payload : null;
      const runtimeReachable = Boolean(
        runtimeResponse?.ok
        && runtimePayload?.ok === true
        && runtimePayload.runtime === 'kourosh-local-pwa',
      );
      const apiReachable = Boolean(
        apiResponse?.ok
        && apiPayload?.success === true
        && typeof apiPayload.setupRequired === 'boolean',
      );
      const address = runtimePayload ? parsePublicAddress(runtimePayload) : null;

      setHealth({
        checked: true,
        checking: false,
        runtimeReachable,
        apiReachable,
        secure: runtimeReachable && runtimePayload?.secure === true && window.isSecureContext,
        shareable: runtimeReachable && runtimePayload?.network?.shareable === true && Boolean(address),
        hostDevice: runtimeReachable && runtimePayload?.network?.hostDevice === true,
        remoteAccessVerified: runtimeReachable && runtimePayload?.network?.remoteAccessVerified === true,
        setupRequired: apiReachable ? Boolean(apiPayload?.setupRequired) : null,
        publicHost: address?.publicHost || null,
        publicUrl: address?.publicUrl || null,
        qrUrl: address?.qrUrl || null,
        error: runtimeReachable && apiReachable
          ? null
          : 'بخشی از اتصال پاسخ نداد. Runtime را باز نگه دارید و بررسی را دوباره اجرا کنید.',
      });
    } catch {
      setHealth((current) => ({
        ...current,
        checked: true,
        checking: false,
        error: 'بررسی اتصال کامل نشد. شبکه یا Runtime در دسترس نیست.',
      }));
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { health, refresh };
};

export default useLocalConnectionHealth;
