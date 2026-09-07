export const ADVISORY_POLICY_VERSION = "human-in-the-loop-advisory-v1" as const;
export const ADVISORY_KILL_SWITCH_ENV = "KOUROSH_ML_ADVISORY_ENABLED" as const;

export type AdvisoryPolicyEnvironment = Partial<Record<
  | typeof ADVISORY_KILL_SWITCH_ENV
  | "KOUROSH_ML_AUTOMATION_ENABLED"
  | "KOUROSH_ML_EXTERNAL_CALLS_ENABLED",
  string | undefined
>>;

export type AdvisoryOnlyPolicy = {
  policyVersion: typeof ADVISORY_POLICY_VERSION;
  mode: "human-in-the-loop-advisory-only";
  advisoryInferenceEnabled: boolean;
  humanReviewRequired: true;
  automaticDecisioningEnabled: false;
  automaticApplicationEnabled: false;
  automaticOrderingEnabled: false;
  automaticPricingEnabled: false;
  businessMutationEnabled: false;
  externalModelCallsEnabled: false;
  protectedLegacyMlRuntimeEnabled: false;
  killSwitch: {
    environmentKey: typeof ADVISORY_KILL_SWITCH_ENV;
    defaultEnabled: true;
  };
  blockedUnsafeOverrides: Array<"automation" | "external-model-calls">;
};

const FALSE_VALUES = new Set(["0", "false", "off", "no", "disabled", "غیرفعال"]);
const TRUE_VALUES = new Set(["1", "true", "on", "yes", "enabled", "فعال"]);

const enabledUnlessExplicitlyDisabled = (value: string | undefined): boolean => {
  if (value === undefined || value.trim() === "") return true;
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return false;
};

const explicitlyRequested = (value: string | undefined): boolean => (
  value !== undefined && TRUE_VALUES.has(value.trim().toLocaleLowerCase("en-US"))
);

/**
 * The advisory kill switch may disable inference. No environment value can
 * enable automation, business writes, external model calls, or the protected
 * legacy shadow runtime.
 */
export const getAdvisoryOnlyPolicy = (
  environment: AdvisoryPolicyEnvironment = process.env,
): AdvisoryOnlyPolicy => {
  const blockedUnsafeOverrides: AdvisoryOnlyPolicy["blockedUnsafeOverrides"] = [];
  if (explicitlyRequested(environment.KOUROSH_ML_AUTOMATION_ENABLED)) {
    blockedUnsafeOverrides.push("automation");
  }
  if (explicitlyRequested(environment.KOUROSH_ML_EXTERNAL_CALLS_ENABLED)) {
    blockedUnsafeOverrides.push("external-model-calls");
  }

  return {
    policyVersion: ADVISORY_POLICY_VERSION,
    mode: "human-in-the-loop-advisory-only",
    advisoryInferenceEnabled: enabledUnlessExplicitlyDisabled(environment[ADVISORY_KILL_SWITCH_ENV]),
    humanReviewRequired: true,
    automaticDecisioningEnabled: false,
    automaticApplicationEnabled: false,
    automaticOrderingEnabled: false,
    automaticPricingEnabled: false,
    businessMutationEnabled: false,
    externalModelCallsEnabled: false,
    protectedLegacyMlRuntimeEnabled: false,
    killSwitch: {
      environmentKey: ADVISORY_KILL_SWITCH_ENV,
      defaultEnabled: true,
    },
    blockedUnsafeOverrides,
  };
};

export const advisoryPolicyPublicSnapshot = (
  policy: AdvisoryOnlyPolicy = getAdvisoryOnlyPolicy(),
) => ({
  ...policy,
  capabilities: {
    phonePriceRecommendation: true,
    inventoryStockoutRisk: true,
    productPriceRecommendation: true,
    feedbackCapture: true,
  },
  operatorNotice: policy.advisoryInferenceEnabled
    ? "ML فقط پیشنهاد می‌دهد؛ بررسی و اقدام نهایی همیشه با کاربر است."
    : "ML با kill switch غیرفعال است؛ مسیرهای قطعی و مقایسه‌ای همچنان در دسترس‌اند.",
});
