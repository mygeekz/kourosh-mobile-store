/**
 * Font Awesome icon metadata used by navigation/report registries.
 *
 * This is intentionally string-based because these surfaces are metadata
 * registries, not shared UI primitive props. Shared UI components should keep
 * accepting ReactNode icons at their public boundary.
 */
export type FontAwesomeStylePrefix = 'fa' | 'fa-solid' | 'fa-regular' | 'fa-brands' | 'fas' | 'far' | 'fab';

export type FontAwesomeIconClass =
  | `fa-${string}`
  | `${FontAwesomeStylePrefix} fa-${string}`
  | `${FontAwesomeStylePrefix} fa-${string} ${string}`;

export type NavigationIconMetadata = FontAwesomeIconClass;
export type ReportIconMetadata = FontAwesomeIconClass;
export type FeatureIconMetadata = FontAwesomeIconClass;

const fontAwesomeTokenPattern = /^(?:fa|fas|far|fab|fa(?:-[a-z0-9]+)+)$/;

export const isFontAwesomeIconClass = (value: unknown): value is FontAwesomeIconClass => {
  if (typeof value !== 'string') return false;
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => fontAwesomeTokenPattern.test(token));
};
