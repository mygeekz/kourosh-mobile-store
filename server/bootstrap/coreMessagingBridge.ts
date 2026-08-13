import type {
  EnqueueTelegramToTopicTargets,
  GetTelegramTargetsForTopic,
  IsTopicTypeEnabled,
  CustomerNotificationEventType,
  CustomerNotificationMode,
  NotifyCustomer,
  TelegramNotificationTopic,
  TelegramTopicNotificationMeta,
} from "./messagingRuntime";

export interface CoreMessagingBridge {
  notifyCustomer: NotifyCustomer;
  enqueueTelegramToTopicTargets: EnqueueTelegramToTopicTargets;
  getTelegramTargetsForTopic: GetTelegramTargetsForTopic;
  isTopicTypeEnabled: IsTopicTypeEnabled;
}

const asTelegramNotificationTopic = (topic: string): TelegramNotificationTopic =>
  topic as TelegramNotificationTopic;

const asCustomerNotificationEventType = (
  eventType: string,
): CustomerNotificationEventType => eventType as CustomerNotificationEventType;

const asCustomerNotificationMode = (
  mode?: string,
): CustomerNotificationMode | undefined => mode as CustomerNotificationMode | undefined;

const asTelegramTopicNotificationMeta = (
  meta?: Record<string, unknown>,
): TelegramTopicNotificationMeta | undefined =>
  meta as TelegramTopicNotificationMeta | undefined;

export interface CoreMessagingRouteAdapters {
  notifyCustomer: (
    eventType: string,
    targetId: number,
    mode?: string,
    extra?: Record<string, unknown>,
  ) => ReturnType<NotifyCustomer>;
  enqueueTelegramToTopicTargets: (
    topic: string,
    typeKey: string,
    text: string,
    meta?: Record<string, unknown>,
  ) => ReturnType<EnqueueTelegramToTopicTargets>;
  getTelegramTargetsForTopic: (topic: string) => ReturnType<GetTelegramTargetsForTopic>;
  isTopicTypeEnabled: (
    topic: string,
    typeKey: string,
  ) => ReturnType<IsTopicTypeEnabled>;
}

export function createCoreMessagingRouteAdapters(
  messaging: CoreMessagingBridge,
): CoreMessagingRouteAdapters {
  return {
    notifyCustomer: (
      eventType: string,
      targetId: number,
      mode?: string,
      extra?: Record<string, unknown>,
    ) =>
      messaging.notifyCustomer(
        asCustomerNotificationEventType(eventType),
        targetId,
        asCustomerNotificationMode(mode),
        extra,
      ),
    enqueueTelegramToTopicTargets: (
      topic: string,
      typeKey: string,
      text: string,
      meta?: Record<string, unknown>,
    ) =>
      messaging.enqueueTelegramToTopicTargets(
        asTelegramNotificationTopic(topic),
        typeKey,
        text,
        asTelegramTopicNotificationMeta(meta),
      ),
    getTelegramTargetsForTopic: (topic: string) =>
      messaging.getTelegramTargetsForTopic(asTelegramNotificationTopic(topic)),
    isTopicTypeEnabled: (topic: string, typeKey: string) =>
      messaging.isTopicTypeEnabled(asTelegramNotificationTopic(topic), typeKey),
  };
}
