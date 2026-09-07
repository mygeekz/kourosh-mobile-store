export type ShadowRuntimeSafetyGate = {
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  canChangePricing: boolean;
  canChangeReports: boolean;
  canChangeLedger: boolean;
  canMutateBusinessRecords: boolean;
};

export const getShadowRuntimeSafetyGate = (): ShadowRuntimeSafetyGate => ({
  runtimeInvocationAllowed: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canChangePricing: false,
  canChangeReports: false,
  canChangeLedger: false,
  canMutateBusinessRecords: false,
});

export const buildShadowRuntimeSafetyNotes = (): string[] => {
  const gate = getShadowRuntimeSafetyGate();
  return [
    `runtimeInvocationAllowed=${String(gate.runtimeInvocationAllowed)}`,
    `modelExecutionAllowed=${String(gate.modelExecutionAllowed)}`,
    `inferenceEndpointExposed=${String(gate.inferenceEndpointExposed)}`,
    `productionIntegrationAllowed=${String(gate.productionIntegrationAllowed)}`,
    `decisionAutomationAllowed=${String(gate.decisionAutomationAllowed)}`,
    `canChangeInventoryOrAccounting=${String(gate.canChangeInventoryOrAccounting)}`,
    `canChangePricing=${String(gate.canChangePricing)}`,
    `canChangeReports=${String(gate.canChangeReports)}`,
    `canChangeLedger=${String(gate.canChangeLedger)}`,
    `canMutateBusinessRecords=${String(gate.canMutateBusinessRecords)}`,
    "External Model Shadow Score remains shadow-only evidence and cannot replace baseline predictions.",
    "No production decision is created by this adapter.",
  ];
};
