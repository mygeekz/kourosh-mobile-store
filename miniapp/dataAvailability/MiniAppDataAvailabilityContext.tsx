import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { MiniAppResponseMeta } from "../reference/miniAppDataAvailability";

type MiniAppDataAvailabilityState = {
  meta: MiniAppResponseMeta | null;
  pending: boolean;
  requestPath: string | null;
};

type MiniAppDataAvailabilityContextValue = MiniAppDataAvailabilityState & {
  beginRequest: (path: string, options?: { primary?: boolean }) => void;
  reportMeta: (path: string, meta: MiniAppResponseMeta) => void;
  clearAvailability: (path?: string) => void;
};

const MiniAppDataAvailabilityContext = createContext<MiniAppDataAvailabilityContextValue | null>(null);

export const MiniAppDataAvailabilityProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<MiniAppDataAvailabilityState>({
    meta: null,
    pending: false,
    requestPath: null,
  });

  const beginRequest = useCallback((path: string, options: { primary?: boolean } = {}) => {
    if (options.primary === false) return;
    setState({ meta: null, pending: true, requestPath: path });
  }, []);

  const reportMeta = useCallback((path: string, meta: MiniAppResponseMeta) => {
    setState((current) => {
      // Only the request selected as the current screen's primary request may
      // control the global availability badge. This also ignores late results
      // from a screen that has already been left.
      if (current.requestPath !== null && current.requestPath !== path) return current;
      return { meta, pending: false, requestPath: path };
    });
  }, []);

  const clearAvailability = useCallback((path?: string) => {
    setState((current) => {
      if (path && current.requestPath !== path) return current;
      return { meta: null, pending: false, requestPath: null };
    });
  }, []);

  const value = useMemo<MiniAppDataAvailabilityContextValue>(
    () => ({ ...state, beginRequest, reportMeta, clearAvailability }),
    [beginRequest, clearAvailability, reportMeta, state],
  );

  return (
    <MiniAppDataAvailabilityContext.Provider value={value}>
      {children}
    </MiniAppDataAvailabilityContext.Provider>
  );
};

export const useMiniAppDataAvailability = (): MiniAppDataAvailabilityContextValue => {
  const value = useContext(MiniAppDataAvailabilityContext);
  if (!value) throw new Error("useMiniAppDataAvailability must be used inside MiniAppDataAvailabilityProvider");
  return value;
};
