import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { MiniAppResponseMeta } from "../reference/miniAppDataAvailability";
import {
  beginMiniAppAvailabilityRequest,
  clearMiniAppAvailability,
  finishMiniAppAvailabilityRequest,
  MINIAPP_DATA_AVAILABILITY_INITIAL_STATE,
  reportMiniAppAvailabilityMeta,
  type MiniAppDataAvailabilityState,
} from "./miniAppAvailabilityState";

type MiniAppDataAvailabilityContextValue = MiniAppDataAvailabilityState & {
  beginRequest: (path: string, options?: { primary?: boolean }) => void;
  reportMeta: (path: string, meta: MiniAppResponseMeta) => void;
  finishRequest: (path: string) => void;
  clearAvailability: (path?: string) => void;
};

const MiniAppDataAvailabilityContext = createContext<MiniAppDataAvailabilityContextValue | null>(null);

export const MiniAppDataAvailabilityProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<MiniAppDataAvailabilityState>(() => ({ ...MINIAPP_DATA_AVAILABILITY_INITIAL_STATE }));

  const beginRequest = useCallback((path: string, options: { primary?: boolean } = {}) => {
    setState((current) => beginMiniAppAvailabilityRequest(current, path, options.primary !== false));
  }, []);

  const reportMeta = useCallback((path: string, meta: MiniAppResponseMeta) => {
    setState((current) => reportMiniAppAvailabilityMeta(current, path, meta));
  }, []);

  const finishRequest = useCallback((path: string) => {
    setState((current) => finishMiniAppAvailabilityRequest(current, path));
  }, []);

  const clearAvailability = useCallback((path?: string) => {
    setState((current) => clearMiniAppAvailability(current, path));
  }, []);

  const value = useMemo<MiniAppDataAvailabilityContextValue>(
    () => ({ ...state, beginRequest, reportMeta, finishRequest, clearAvailability }),
    [beginRequest, clearAvailability, finishRequest, reportMeta, state],
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
