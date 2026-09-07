export type DisabledShadowRuntimeSource = 'operator-readiness' | 'test-contract' | 'internal-metadata';

export type DisabledShadowRuntimeRequest = {
  readonly source: DisabledShadowRuntimeSource;
  readonly correlationId?: string;
};

export type DisabledShadowRuntimeSafetyInvariants = {
  readonly modelExecutionAllowed: false;
  readonly runtimeInvocationAllowed: false;
  readonly inferenceEndpointExposed: false;
  readonly artifactActivationAllowed: false;
  readonly businessMutationAllowed: false;
  readonly canMutateBusinessRecords: false;
};

export type DisabledShadowRuntimeResult = DisabledShadowRuntimeSafetyInvariants & {
  readonly ok: false;
  readonly status: 'disabled';
  readonly reason: 'shadow-runtime-not-approved';
  readonly metadataOnly: true;
  readonly contractVersion: 'phase31a-disabled-adapter-stub-v1';
  readonly adapter: 'disabled-shadow-runtime-adapter-stub';
  readonly correlationId?: string;
};

export type DisabledShadowRuntimeAdapter = {
  readonly describe: () => DisabledShadowRuntimeResult;
  readonly evaluateDisabled: (request: DisabledShadowRuntimeRequest) => DisabledShadowRuntimeResult;
  readonly getDisabledRuntimeStatus: () => DisabledShadowRuntimeResult;
};

export const DISABLED_SHADOW_RUNTIME_CONTRACT_VERSION = 'phase31a-disabled-adapter-stub-v1';

const createDisabledShadowRuntimeResult = (correlationId?: string): DisabledShadowRuntimeResult => {
  const result = {
    ok: false,
    status: 'disabled',
    reason: 'shadow-runtime-not-approved',
    metadataOnly: true,
    runtimeInvocationAllowed: false,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
    canMutateBusinessRecords: false,
    contractVersion: DISABLED_SHADOW_RUNTIME_CONTRACT_VERSION,
    adapter: 'disabled-shadow-runtime-adapter-stub',
    ...(correlationId ? { correlationId } : {}),
  };

  return result;
};

export const createDisabledShadowRuntimeAdapter = (): DisabledShadowRuntimeAdapter => {
  const describe = () => createDisabledShadowRuntimeResult();
  const getDisabledRuntimeStatus = () => createDisabledShadowRuntimeResult();
  const evaluateDisabled = (request: DisabledShadowRuntimeRequest) =>
    createDisabledShadowRuntimeResult(request.correlationId);

  return {
    describe,
    evaluateDisabled,
    getDisabledRuntimeStatus,
  };
};
