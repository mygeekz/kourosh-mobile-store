import {
  createMiniAppIdentityResolver,
  MiniAppIdentityResolutionError,
} from "../miniapp/miniAppIdentityResolver";
import { miniAppIdentityRepo } from "../repositories/miniAppIdentity.repo";

export { MiniAppIdentityResolutionError };

export const resolveMiniAppIdentity = createMiniAppIdentityResolver(miniAppIdentityRepo);
