type BrowserResolverResult = {
  executablePath: string | null;
  source: string | null;
  candidates: string[];
};

type BrowserResolverModule = {
  resolveSystemBrowserExecutable: (options?: { includeSystemLookup?: boolean }) => BrowserResolverResult;
  describeBrowserExecutable: (executablePath: string | null) => string;
};

export type QualityBrowserRuntimeStatus = {
  available: boolean;
  browserName: string;
  executablePath: string | null;
  source: string | null;
  platform: NodeJS.Platform;
  nodeVersion: string;
};

const resolverModuleUrl = new URL('../../scripts/lib/resolve-browser-executable.mjs', import.meta.url);

export const getQualityBrowserRuntimeStatus = async (): Promise<QualityBrowserRuntimeStatus> => {
  const resolver = await import(resolverModuleUrl.href) as BrowserResolverModule;
  const result = resolver.resolveSystemBrowserExecutable({ includeSystemLookup: true });
  return {
    available: Boolean(result.executablePath),
    browserName: resolver.describeBrowserExecutable(result.executablePath),
    executablePath: result.executablePath,
    source: result.source,
    platform: process.platform,
    nodeVersion: process.version,
  };
};
