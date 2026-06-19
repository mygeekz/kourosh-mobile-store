import { apiFetch } from './apiFetch';

const fallbackAssetUrl = (assetPath: string) => {
  const cleaned = assetPath.split('?')[0];
  if (cleaned.includes('logo.png')) return '/logo.png';
  return null;
};

export const loadAuthedAssetUrl = async (assetPath: string): Promise<string> => {
  const fallback = fallbackAssetUrl(assetPath);
  if (fallback) return fallback;

  const res = await apiFetch(assetPath, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Asset request failed with ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const revokeObjectUrlSafe = (url: string | null | undefined) => {
  if (!url) return;
  if (url.startsWith('blob:')) {
    try { URL.revokeObjectURL(url); } catch {}
  }
};
