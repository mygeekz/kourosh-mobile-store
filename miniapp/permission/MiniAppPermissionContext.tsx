import React, { createContext, useContext, useMemo } from "react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";

type MiniAppPermissionState = {
  capabilities: ReadonlySet<string>;
  can: (capability: string) => boolean;
};

const MiniAppPermissionContext = createContext<MiniAppPermissionState | null>(null);

export const MiniAppPermissionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { identity } = useMiniAppAuth();
  const value = useMemo<MiniAppPermissionState>(() => {
    const capabilities = new Set(identity?.capabilities || []);
    return { capabilities, can: (capability: string) => capabilities.has(capability) };
  }, [identity]);
  return (
    <MiniAppPermissionContext.Provider value={value}>
      {children}
    </MiniAppPermissionContext.Provider>
  );
};

export const useMiniAppPermissions = (): MiniAppPermissionState => {
  const value = useContext(MiniAppPermissionContext);
  if (!value) {
    throw new Error("useMiniAppPermissions must be used inside MiniAppPermissionProvider");
  }
  return value;
};
