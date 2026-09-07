export type PartnerSettlementManagerSignoffPersistenceRequirement = {
  readonly label: string;
  readonly status: 'required' | 'deferred';
  readonly detail: string;
};

export type PartnerSettlementManagerSignoffPersistenceContract = {
  readonly contractName: 'partner-settlement-manager-signoff-persistence-contract';
  readonly phase: 'Business Phase 1S';
  readonly managerControlled: true;
  readonly managerRoleRequired: true;
  readonly allowedRoles: readonly ['Admin', 'Manager'];
  readonly explicitManagerSignoffRequired: true;
  readonly persistenceRouteEnabled: false;
  readonly routeRegistrationAllowed: false;
  readonly backendWriteAllowed: false;
  readonly schemaMigrationAllowed: false;
  readonly dependencyChangeAllowed: false;
  readonly automaticSettlementAllowed: false;
  readonly batchSettlementAllowed: false;
  readonly scheduledSettlementAllowed: false;
  readonly inventoryMutationAllowed: false;
  readonly customerLedgerMutationAllowed: false;
  readonly invoiceMutationAllowed: false;
  readonly pricingMutationAllowed: false;
  readonly mlMutationAllowed: false;
  readonly signoffEvidenceRequired: readonly string[];
  readonly futurePersistenceTargetPreference: readonly string[];
  readonly requiredDuplicateGuards: readonly string[];
  readonly mutationLocks: readonly string[];
  readonly requirements: readonly PartnerSettlementManagerSignoffPersistenceRequirement[];
  readonly nextSafeStepLabel: string;
  readonly summaryNote: string;
};

export const partnerSettlementManagerSignoffPersistenceContract: PartnerSettlementManagerSignoffPersistenceContract = {
  contractName: 'partner-settlement-manager-signoff-persistence-contract',
  phase: 'Business Phase 1S',
  managerControlled: true,
  managerRoleRequired: true,
  allowedRoles: ['Admin', 'Manager'],
  explicitManagerSignoffRequired: true,
  persistenceRouteEnabled: false,
  routeRegistrationAllowed: false,
  backendWriteAllowed: false,
  schemaMigrationAllowed: false,
  dependencyChangeAllowed: false,
  automaticSettlementAllowed: false,
  batchSettlementAllowed: false,
  scheduledSettlementAllowed: false,
  inventoryMutationAllowed: false,
  customerLedgerMutationAllowed: false,
  invoiceMutationAllowed: false,
  pricingMutationAllowed: false,
  mlMutationAllowed: false,
  signoffEvidenceRequired: [
    'settlementId',
    'idempotencyKey',
    'settlementFingerprint',
    'ledgerTrace',
    'postSubmitReconciliationStatus',
    'managerRole',
    'signoffChecklist',
  ],
  futurePersistenceTargetPreference: [
    'Reuse existing audit_logs when the project accepts manager signoff persistence.',
    'Reuse existing partner_ledger metadata when a settlement-scoped signoff reference is needed.',
    'Do not add a schema migration unless existing audit/ledger metadata cannot safely store the signoff evidence.',
  ],
  requiredDuplicateGuards: [
    'Persisted signoff must be keyed by settlementId and settlementFingerprint rather than by current user id.',
    'The same manager signoff evidence must not create duplicate signoff records.',
    'The same settlement submitted by another manager must reference the existing signoff evidence instead of creating conflicting evidence.',
  ],
  mutationLocks: [
    'Phase 1S does not register a signoff persistence route.',
    'Phase 1S does not write audit_logs, partner_ledger, inventory, customer ledger, invoices, pricing, settings, users, or ML records.',
    'Phase 1S does not change atomic settlement submit behavior.',
    'Phase 1S does not add automatic, batch, scheduled, or ML-driven settlement.',
  ],
  requirements: [
    {
      label: 'Manager/Admin signoff boundary',
      status: 'required',
      detail: 'Future signoff persistence must require Admin or Manager role and explicit human signoff evidence.',
    },
    {
      label: 'Existing storage preference',
      status: 'required',
      detail: 'Future implementation must prefer existing audit_logs or partner_ledger metadata before considering schema changes.',
    },
    {
      label: 'No write in Phase 1S',
      status: 'required',
      detail: 'This phase is a contract/readiness layer only and must not persist signoff evidence.',
    },
    {
      label: 'Persistence implementation',
      status: 'deferred',
      detail: 'Actual persistence route and write path are deferred to a later phase after this contract is reviewed.',
    },
  ],
  nextSafeStepLabel: 'Partner Settlement Manager Signoff Persistence Implementation',
  summaryNote: 'Phase 1S defines the manager signoff persistence contract without adding routes, schema, dependencies, or mutations.',
};
