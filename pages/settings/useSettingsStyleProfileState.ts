import { useCallback, useEffect, useMemo, useState } from 'react';
import { type StyleState } from '../../contexts/StyleContext';
import {
  ACTIVE_STYLE_PROFILE_KEY,
  APP_STYLE_TEMPLATES,
  LEGACY_STYLE_PROFILES_KEY,
  STYLE_PROFILES_KEY,
  type ActiveStyleProfileReference,
  type AppStyleTemplate,
  type SavedStyleProfile,
} from './styleTemplates';
import { isStandardStylePalette, STANDARD_STYLE_PALETTES } from '../../config/stylePalettes';

export type StyleProfileMatchState = 'active' | 'modified' | 'idle';

export type ActiveStyleProfile = {
  kind: ActiveStyleProfileReference['kind'];
  id: string;
  name: string;
  modified: boolean;
};

const isActiveStyleProfileReference = (value: unknown): value is ActiveStyleProfileReference => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ActiveStyleProfileReference>;
  return (candidate.kind === 'template' || candidate.kind === 'saved') && typeof candidate.id === 'string' && candidate.id.length > 0;
};

const readActiveStyleProfileReference = (): ActiveStyleProfileReference | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_STYLE_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isActiveStyleProfileReference(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const styleMatchesSnapshot = (style: StyleState, snapshot: Partial<StyleState>): boolean =>
  (Object.keys(snapshot) as Array<keyof StyleState>).every((key) => Object.is(style[key], snapshot[key]));

const sanitizeSnapshot = (style: StyleState, snapshot: Partial<StyleState>): Partial<StyleState> => {
  const sanitized = Object.fromEntries(
    (Object.keys(style) as Array<keyof StyleState>)
      .filter((key) => Object.prototype.hasOwnProperty.call(snapshot, key))
      .map((key) => [key, snapshot[key]]),
  ) as Partial<StyleState>;

  if (isStandardStylePalette(sanitized.palette)) {
    const palette = STANDARD_STYLE_PALETTES[sanitized.palette];
    sanitized.primaryHue = palette.hue;
    sanitized.primaryS = palette.saturation;
    sanitized.primaryL = palette.lightness;
    if (sanitized.buttonPreset === undefined) sanitized.buttonPreset = palette.buttonPreset;
  }

  return sanitized;
};

export function useSettingsStyleProfileState(
  style: StyleState,
  setMany: (patch: Partial<StyleState>) => void,
) {
  const [styleProfileName, setStyleProfileName] = useState('');
  const [styleProfiles, setStyleProfiles] = useState<SavedStyleProfile[]>([]);
  const [profilesHydrated, setProfilesHydrated] = useState(false);
  const [activeStyleProfileReference, setActiveStyleProfileReference] = useState<ActiveStyleProfileReference | null>(readActiveStyleProfileReference);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STYLE_PROFILES_KEY) ?? localStorage.getItem(LEGACY_STYLE_PROFILES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setStyleProfiles(Array.isArray(parsed)
        ? parsed.filter((item): item is SavedStyleProfile => Boolean(
          item
          && typeof item.id === 'string'
          && typeof item.name === 'string'
          && item.snapshot
          && typeof item.snapshot === 'object',
        ))
        : []);
    } catch {
      setStyleProfiles([]);
    } finally {
      setProfilesHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!profilesHydrated) return;
    try {
      localStorage.setItem(STYLE_PROFILES_KEY, JSON.stringify(styleProfiles));
    } catch {}
  }, [profilesHydrated, styleProfiles]);

  useEffect(() => {
    try {
      if (activeStyleProfileReference) {
        localStorage.setItem(ACTIVE_STYLE_PROFILE_KEY, JSON.stringify(activeStyleProfileReference));
      } else {
        localStorage.removeItem(ACTIVE_STYLE_PROFILE_KEY);
      }
    } catch {}
  }, [activeStyleProfileReference]);

  const inferredActiveReference = useMemo<ActiveStyleProfileReference | null>(() => {
    if (!profilesHydrated || activeStyleProfileReference) return null;

    const savedMatch = styleProfiles.find((profile) => styleMatchesSnapshot(style, profile.snapshot));
    if (savedMatch) return { kind: 'saved', id: savedMatch.id };

    const templateMatch = APP_STYLE_TEMPLATES.find((template) => styleMatchesSnapshot(style, template.snapshot));
    return templateMatch ? { kind: 'template', id: templateMatch.key } : null;
  }, [activeStyleProfileReference, profilesHydrated, style, styleProfiles]);

  useEffect(() => {
    if (!profilesHydrated) return;

    if (activeStyleProfileReference?.kind === 'saved') {
      const exists = styleProfiles.some((profile) => profile.id === activeStyleProfileReference.id);
      if (!exists) setActiveStyleProfileReference(null);
      return;
    }

    if (activeStyleProfileReference?.kind === 'template') {
      const exists = APP_STYLE_TEMPLATES.some((template) => template.key === activeStyleProfileReference.id);
      if (!exists) setActiveStyleProfileReference(null);
      return;
    }

    if (inferredActiveReference) setActiveStyleProfileReference(inferredActiveReference);
  }, [activeStyleProfileReference, inferredActiveReference, profilesHydrated, styleProfiles]);

  const activeDefinition = useMemo(() => {
    const reference = activeStyleProfileReference ?? inferredActiveReference;
    if (!reference) return null;

    if (reference.kind === 'saved') {
      const profile = styleProfiles.find((item) => item.id === reference.id);
      return profile
        ? { reference, name: profile.name, snapshot: profile.snapshot }
        : null;
    }

    const template = APP_STYLE_TEMPLATES.find((item) => item.key === reference.id);
    return template
      ? { reference, name: template.label, snapshot: template.snapshot }
      : null;
  }, [activeStyleProfileReference, inferredActiveReference, styleProfiles]);

  const activeStyleProfile = useMemo<ActiveStyleProfile | null>(() => {
    if (!activeDefinition) return null;
    return {
      kind: activeDefinition.reference.kind,
      id: activeDefinition.reference.id,
      name: activeDefinition.name,
      modified: !styleMatchesSnapshot(style, activeDefinition.snapshot),
    };
  }, [activeDefinition, style]);

  const getMatchState = useCallback((kind: ActiveStyleProfileReference['kind'], id: string): StyleProfileMatchState => {
    if (!activeStyleProfile || activeStyleProfile.kind !== kind || activeStyleProfile.id !== id) return 'idle';
    return activeStyleProfile.modified ? 'modified' : 'active';
  }, [activeStyleProfile]);

  const saveCurrentStyleProfile = () => {
    const normalizedName = styleProfileName.trim() || `استایل ${new Date().toLocaleDateString('fa-IR-u-ca-persian')}`;
    const profile: SavedStyleProfile = {
      id: `${Date.now()}`,
      name: normalizedName,
      snapshot: { ...style },
      createdAt: new Date().toISOString(),
    };
    setStyleProfiles((previous) => [profile, ...previous.filter((item) => item.name !== normalizedName)].slice(0, 12));
    setActiveStyleProfileReference({ kind: 'saved', id: profile.id });
    setStyleProfileName('');
  };

  const applyStyleProfile = (profile: SavedStyleProfile) => {
    setActiveStyleProfileReference({ kind: 'saved', id: profile.id });
    setMany(sanitizeSnapshot(style, profile.snapshot));
  };

  const deleteStyleProfile = (profileId: string) => {
    setStyleProfiles((previous) => previous.filter((item) => item.id !== profileId));
    setActiveStyleProfileReference((current) => current?.kind === 'saved' && current.id === profileId ? null : current);
  };

  const applyAppStyleTemplate = (template: AppStyleTemplate) => {
    setActiveStyleProfileReference({ kind: 'template', id: template.key });
    setMany(sanitizeSnapshot(style, template.snapshot));
  };

  const reapplyActiveStyleProfile = () => {
    if (!activeDefinition) return;
    setMany(sanitizeSnapshot(style, activeDefinition.snapshot));
  };

  const updateActiveSavedStyleProfile = () => {
    if (!activeStyleProfile || activeStyleProfile.kind !== 'saved') return;
    const updatedAt = new Date().toISOString();
    setStyleProfiles((previous) => previous.map((profile) => profile.id === activeStyleProfile.id
      ? { ...profile, snapshot: { ...style }, updatedAt }
      : profile));
  };

  const clearActiveStyleProfile = () => {
    setActiveStyleProfileReference(null);
  };

  return {
    styleProfileName,
    setStyleProfileName,
    styleProfiles,
    setStyleProfiles,
    activeStyleProfile,
    getAppStyleTemplateState: (template: AppStyleTemplate) => getMatchState('template', template.key),
    getSavedStyleProfileState: (profile: SavedStyleProfile) => getMatchState('saved', profile.id),
    saveCurrentStyleProfile,
    applyStyleProfile,
    deleteStyleProfile,
    applyAppStyleTemplate,
    reapplyActiveStyleProfile,
    updateActiveSavedStyleProfile,
    clearActiveStyleProfile,
  };
}
