import manifestData from '../../config/ui/ui-manifest.json';

export type UiComponentStatus = 'canonical' | 'migrating' | 'retired';

export interface UiComponentManifestEntry {
  id: string;
  role: string;
  canonicalPath: string;
  barrelPath: string;
  exportName: string;
  status: UiComponentStatus;
  owner: string;
  replaces: string[];
}

export interface UiLegacyComponentManifestEntry {
  path: string;
  status: 'migrating' | 'retired';
  replacementId: string;
  newImportsAllowed: boolean;
}

export interface UiManifest {
  schemaVersion: number;
  version: string;
  phase: string;
  status: string;
  styleSystem: {
    manifest: string;
    runtimeEntry: string;
    generator: string;
    directCssImportsAllowedIn: string[];
    pageLevelCssImportsAllowed: boolean;
  };
  responsiveContract: {
    status: string;
    breakpoints: Record<string, number>;
    newArbitraryBreakpointsAllowed: boolean;
  };
  layerContract: {
    status: string;
    layers: Record<string, number>;
    newArbitraryZIndexAllowed: boolean;
  };
  componentPolicy: {
    canonicalImportPath: string;
    newRawPrimitivesAllowed: boolean;
    newDuplicateComponentsAllowed: boolean;
    legacyUsageMayOnlyDecrease: boolean;
  };
  components: UiComponentManifestEntry[];
  legacyComponents: UiLegacyComponentManifestEntry[];
}

export const UI_MANIFEST = manifestData as UiManifest;
export const UI_MANIFEST_VERSION = UI_MANIFEST.version;

export const getUiComponentContract = (id: string) =>
  UI_MANIFEST.components.find((component) => component.id === id);

export default UI_MANIFEST;
