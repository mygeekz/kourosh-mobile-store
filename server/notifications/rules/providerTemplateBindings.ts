export const providerTemplateBindings = Object.freeze({
  installment_due_notice: Object.freeze({
    provider: "meli_payamak",
    settingKey: "meli_payamak_installment_due_notice_pattern_id",
    tokenKeys: ["name", "amount", "dueDate"],
  }),
  installment_overdue: Object.freeze({
    provider: "meli_payamak",
    settingKey: "meli_payamak_installment_overdue_pattern_id",
    tokenKeys: ["name", "amount", "dueDate"],
  }),
} as const);

export type ProviderTemplateKey = keyof typeof providerTemplateBindings;
