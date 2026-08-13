import type { Express } from "express";

import { dashboardRouter } from "../dashboard";
import { createCommercialModuleGuard } from "../commercialModuleFlags";
import { createPublicAuthGate } from "../middleware/publicAuthGate";
import { createProductionRateLimiter } from "../middleware/productionRateLimiter";
import {
  registerProtectedAuthAppRoutes,
  registerPreTokenUtilityRoutes,
  registerPublicAppRoutes,
} from "../routes/authRouteRegistry";
import {
  activeSessions,
  authenticateToken,
  authorizeRole,
  generateToken,
  requireAuth,
  revokeSession,
  revokeUserSessions,
  SESSION_DURATION_MS,
  synchronizeSession,
} from "../utils/sessionAuth";
import { uploadsDir } from "../utils/localSettingsHelpers";
import { getAllSettingsAsObject } from "../database";
import { registerCoreBusinessRuntime } from "./coreBusinessRuntime";
import { ensureUploadDirectories, registerUploadStaticMiddleware } from "./appBootstrap";
import {
  registerMessagingRuntime,
  type EnqueueTelegramToTopicTargets,
  type GetTelegramTargetsForTopic,
  type IsTopicTypeEnabled,
  type MessagingRuntime,
  type MessagingRuntimeDeps,
  type NotifyCustomer,
} from "./messagingRuntime";
import { buildMessagingRuntimeDeps } from "./messagingRuntimeDeps";

export type KouroshAppCompositionRuntime = {
  reportAutomationRuntime: ReturnType<typeof registerCoreBusinessRuntime>["reportAutomationRuntime"];
  messagingRuntime: MessagingRuntime;
};

export function registerKouroshAppComposition(
  app: Express,
  messagingDeps: MessagingRuntimeDeps = buildMessagingRuntimeDeps(),
): KouroshAppCompositionRuntime {
  registerPublicAppRoutes(app, {
    activeSessions,
    generateToken,
    sessionDurationMs: SESSION_DURATION_MS,
  });

  app.use(createPublicAuthGate(requireAuth));
  app.use(createCommercialModuleGuard(getAllSettingsAsObject));
  app.use("/dashboard", dashboardRouter);
  app.use(createProductionRateLimiter());

  const { avatarsDir } = ensureUploadDirectories(uploadsDir);
  registerUploadStaticMiddleware(app, uploadsDir);

  registerPreTokenUtilityRoutes(app);

  app.use(authenticateToken);
  registerProtectedAuthAppRoutes(app, {
    activeSessions,
    avatarsDir,
    revokeSession,
    revokeUserSessions,
    synchronizeSession,
  });

  let messagingRuntime: MessagingRuntime | null = null;
  const { reportAutomationRuntime } = registerCoreBusinessRuntime(app, {
    requireAuth,
    authorizeRole,
    revokeUserSessions,
    messaging: {
      notifyCustomer: ((eventType, targetId, mode, extra) =>
        messagingRuntime!.sendCustomCustomerNotification(
          eventType,
          targetId,
          mode,
          extra,
        )) satisfies NotifyCustomer,
      enqueueTelegramToTopicTargets: ((topic, typeKey, text, meta) =>
        messagingRuntime!.enqueueTelegramToTopicTargets(
          topic,
          typeKey,
          text,
          meta,
        )) satisfies EnqueueTelegramToTopicTargets,
      getTelegramTargetsForTopic: ((topic) =>
        messagingRuntime!.getTelegramTargetsForTopic(
          topic,
        )) satisfies GetTelegramTargetsForTopic,
      isTopicTypeEnabled: ((topic, typeKey) =>
        messagingRuntime!.isTopicTypeEnabled(
          topic,
          typeKey,
        )) satisfies IsTopicTypeEnabled,
    },
  });

  messagingRuntime = registerMessagingRuntime(app, messagingDeps);

  return { reportAutomationRuntime, messagingRuntime };
}
