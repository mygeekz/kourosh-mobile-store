// Extracted from server/db/core/initRuntime.ts. Preserve values and messages exactly.
import type { SettingItem } from "../../repositories/settings.repo";
import { getAsync, runAsync } from "../query";
import { ensureInstallationId } from "../../connectivity/installationIdentity";

export const ensureDefaultBusinessSettings = async (): Promise<void> => {
  const defaultSettings: SettingItem[] = [
    { key: "store_name", value: "فروشگاه کوروش" },
    { key: "store_address_line1", value: "خیابان اصلی، پلاک ۱۲۳" },
    { key: "store_city_state_zip", value: "تهران، استان تهران، ۱۲۳۴۵-۶۷۸" },
    { key: "store_phone", value: "۰۲۱-۱۲۳۴۵۶۷۸" },
    { key: "store_email", value: "info@kouroshstore.example.com" },
    { key: "backup_enabled", value: "1" },
    { key: "backup_cron", value: "0 2 * * *" },
    { key: "backup_timezone", value: "Asia/Tehran" },
    { key: "backup_retention", value: "14" },

    // Telegram routing (comma/newline separated chat ids, or JSON array)
    { key: "telegram_chat_ids_reports", value: "" },
    { key: "telegram_chat_ids_installments", value: "" },
    { key: "telegram_chat_ids_sales", value: "" },
    { key: "telegram_chat_ids_notifications", value: "" },

    // Commercial module feature flags
    { key: "feature_cash_sales_enabled", value: "1" },
    { key: "feature_dashboard_experience_enabled", value: "1" },
    { key: "feature_installments_enabled", value: "1" },
    { key: "feature_products_inventory_enabled", value: "1" },
    { key: "feature_mobile_phones_enabled", value: "1" },
    { key: "feature_purchases_stock_counts_enabled", value: "1" },
    { key: "feature_people_crm_enabled", value: "1" },
    { key: "feature_repairs_services_enabled", value: "1" },
    { key: "feature_notifications_outbox_enabled", value: "1" },
    { key: "feature_sms_enabled", value: "1" },
    { key: "feature_telegram_enabled", value: "1" },
    { key: "feature_advanced_reports_enabled", value: "1" },
    { key: "feature_ai_pricing_enabled", value: "1" },
    { key: "feature_smart_insights_enabled", value: "1" },
    { key: "feature_audit_log_enabled", value: "1" },
    { key: "feature_local_domain_pwa_enabled", value: "1" },
    { key: "feature_phone_ai_pricing_settings_enabled", value: "1" },
    { key: "feature_phone_ai_price_signal_enabled", value: "1" },
    { key: "feature_phone_ai_strategy_advisor_enabled", value: "1" },
    { key: "feature_phone_pricing_behavior_learning_enabled", value: "1" },
    { key: "feature_phone_smart_warnings_enabled", value: "1" },
    { key: "feature_phone_inventory_drilldown_enabled", value: "1" },
    { key: "feature_dashboard_clock_widget_enabled", value: "1" },
    { key: "feature_settings_ai_control_panel_enabled", value: "1" },
  ];

  for (const setting of defaultSettings) {
    const existing = await getAsync(
      "SELECT value FROM settings WHERE key = ?",
      [setting.key],
    );
    if (!existing) {
      await runAsync("INSERT INTO settings (key, value) VALUES (?, ?)", [
        setting.key,
        setting.value,
      ]);
      console.log(`Default setting "${setting.key}" created.`);
    }
  }

  await ensureInstallationId({
    get: async (key) => {
      const row = await getAsync("SELECT value FROM settings WHERE key = ?", [key]) as { value?: string } | undefined;
      return row?.value;
    },
    set: async (key, value) => {
      await runAsync(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
      );
    },
  });
};
