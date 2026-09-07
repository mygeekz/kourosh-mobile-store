import {
  insertManagerInAppNotification,
  listManagerNotificationRecipients,
} from "../db/domains/managerNotifications.db";
import {
  getManagerNotificationDefinition,
  mapSourceEventToManagerNotificationKey,
  type ManagerNotificationSeverity,
} from "../notifications/managerNotificationCatalog";

export type ManagerEventTopic = "reports" | "installments" | "sales" | "notifications";
export type ManagerEventMeta = {
  entityType?: string;
  entityId?: number;
  data?: Record<string, unknown>;
};

type EnqueueOutbox = (payload: {
  channel: "telegram";
  provider?: string | null;
  eventType?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  recipient: string;
  payload: Record<string, unknown>;
  dedupeToday?: boolean;
  dedupeEventWindowHours?: number;
  skipCustomerRateLimit?: boolean;
  skipInvalidChatCheck?: boolean;
}) => Promise<any>;

type ManagerDeliveryContext = {
  membershipId: number;
  userId: number;
  chatId: string | null;
  notificationKey: string;
  sourceEventType: string;
  title: string;
  body: string;
  telegramText: string;
  severity: ManagerNotificationSeverity;
  entityType: string | null;
  entityId: number | null;
  data: Record<string, unknown>;
};

type ManagerDeliveryAdapter = {
  channel: "telegram" | "in_app";
  deliver: (context: ManagerDeliveryContext) => Promise<{ delivered: boolean; reason?: string }>;
};

const decodeEntity = (value: string): string => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'");

const telegramHtmlToPlainText = (value: string): string => {
  const raw = String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return decodeEntity(raw);
};

export const createManagerNotificationEngine = (deps: { enqueueOutbox: EnqueueOutbox }) => {
  const adapters: readonly ManagerDeliveryAdapter[] = [
    {
      channel: "in_app",
      deliver: async (context) => {
        const result = await insertManagerInAppNotification({
          membershipId: context.membershipId,
          notificationKey: context.notificationKey,
          sourceEventType: context.sourceEventType,
          title: context.title,
          body: context.body,
          severity: context.severity,
          entityType: context.entityType,
          entityId: context.entityId,
          data: context.data,
          dedupeMinutes: 5,
        });
        return { delivered: result.created, reason: result.created ? undefined : "deduped" };
      },
    },
    {
      channel: "telegram",
      deliver: async (context) => {
        if (!context.chatId) return { delivered: false, reason: "telegram_not_linked" };
        const queued = await deps.enqueueOutbox({
          channel: "telegram",
          provider: null,
          eventType: context.notificationKey,
          entityType: context.entityType || "manager_event",
          entityId: context.entityId,
          recipient: context.chatId,
          payload: {
            text: context.telegramText,
            chatId: context.chatId,
            parse_mode: "HTML",
            meta: {
              managerUserId: context.userId,
              tenantMembershipId: context.membershipId,
              notificationKey: context.notificationKey,
              sourceEventType: context.sourceEventType,
            },
          },
          dedupeToday: false,
          dedupeEventWindowHours: 5 / 60,
          skipCustomerRateLimit: true,
          skipInvalidChatCheck: true,
        });
        return { delivered: Boolean(queued?.queued), reason: queued?.reason };
      },
    },
  ];

  const publish = async (input: {
    topic: ManagerEventTopic;
    sourceEventType: string;
    text: string;
    meta?: ManagerEventMeta;
  }) => {
    const notificationKey = mapSourceEventToManagerNotificationKey(input.topic, input.sourceEventType);
    if (!notificationKey) return { matched: false, recipients: 0, inApp: 0, telegram: 0 };
    const definition = getManagerNotificationDefinition(notificationKey);
    if (!definition) return { matched: false, recipients: 0, inApp: 0, telegram: 0 };

    const recipients = await listManagerNotificationRecipients(notificationKey);
    const body = telegramHtmlToPlainText(input.text) || definition.label;
    let inApp = 0;
    let telegram = 0;
    for (const recipient of recipients) {
      const context: ManagerDeliveryContext = {
        membershipId: recipient.membershipId,
        userId: recipient.userId,
        chatId: recipient.chatId,
        notificationKey,
        sourceEventType: String(input.sourceEventType || ""),
        title: definition.label,
        body,
        telegramText: String(input.text || body),
        severity: definition.severity,
        entityType: input.meta?.entityType ? String(input.meta.entityType) : null,
        entityId: Number(input.meta?.entityId || 0) || null,
        data: {
          ...(input.meta?.data || {}),
          sourceEventType: String(input.sourceEventType || ""),
        },
      };
      if (recipient.inAppEnabled) {
        const adapter = adapters.find((item) => item.channel === "in_app")!;
        // eslint-disable-next-line no-await-in-loop
        const result = await adapter.deliver(context);
        if (result.delivered) inApp += 1;
      }
      if (recipient.telegramEnabled) {
        const adapter = adapters.find((item) => item.channel === "telegram")!;
        // eslint-disable-next-line no-await-in-loop
        const result = await adapter.deliver(context);
        if (result.delivered) telegram += 1;
      }
    }
    return { matched: true, notificationKey, recipients: recipients.length, inApp, telegram };
  };

  const publishTargeted = async (input: {
    userId: number;
    notificationKey: string;
    sourceEventType: string;
    text: string;
    title?: string;
    meta?: ManagerEventMeta;
    channels: { inApp: boolean; telegram: boolean };
  }) => {
    const definition = getManagerNotificationDefinition(input.notificationKey);
    if (!definition) return { matched: false, recipients: 0, inApp: 0, telegram: 0, reason: "notification_key_unknown" };
    const recipients = await listManagerNotificationRecipients(input.notificationKey);
    const recipient = recipients.find((item) => item.userId === Number(input.userId));
    if (!recipient) return { matched: true, recipients: 0, inApp: 0, telegram: 0, reason: "target_not_authorized" };
    const body = telegramHtmlToPlainText(input.text) || definition.label;
    const context: ManagerDeliveryContext = {
      membershipId: recipient.membershipId,
      userId: recipient.userId,
      chatId: recipient.chatId,
      notificationKey: input.notificationKey,
      sourceEventType: String(input.sourceEventType || ""),
      title: String(input.title || definition.label),
      body,
      telegramText: String(input.text || body),
      severity: definition.severity,
      entityType: input.meta?.entityType ? String(input.meta.entityType) : null,
      entityId: Number(input.meta?.entityId || 0) || null,
      data: { ...(input.meta?.data || {}), sourceEventType: String(input.sourceEventType || "") },
    };
    let inApp = 0;
    let telegram = 0;
    if (input.channels.inApp) {
      const result = await adapters.find((item) => item.channel === "in_app")!.deliver(context);
      if (result.delivered) inApp += 1;
    }
    if (input.channels.telegram) {
      const result = await adapters.find((item) => item.channel === "telegram")!.deliver(context);
      if (result.delivered) telegram += 1;
    }
    return { matched: true, recipients: 1, inApp, telegram };
  };

  return { publish, publishTargeted };
};
