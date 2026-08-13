export type PartnerSettlementManagerSignoffPersistenceImplementationRequirement = {
  readonly label: string;
  readonly status: 'required' | 'implemented';
  readonly detail: string;
};

export type PartnerSettlementManagerSignoffPersistenceImplementationContract = {
  readonly contractName: 'partner-settlement-manager-signoff-persistence-implementation-contract';
  readonly phase: 'Business Phase 1T';
  readonly managerControlled: true;
  readonly managerRoleRequired: true;
  readonly allowedRoles: readonly ['Admin', 'Manager'];
  readonly routePath: '/api/partners/:partnerId/settlement/manager-signoff';
  readonly routeMethod: 'POST';
  readonly explicitManagerSignoffRequired: true;
  readonly persistenceRouteEnabled: true;
  readonly routeRegistrationAllowed: true;
  readonly backendWriteAllowed: true;
  readonly backendWriteScope: readonly ['audit_logs'];
  readonly schemaMigrationAllowed: false;
  readonly dependencyChangeAllowed: false;
  readonly automaticSettlementAllowed: false;
  readonly batchSettlementAllowed: false;
  readonly scheduledSettlementAllowed: false;
  readonly inventoryMutationAllowed: false;
  readonly partnerLedgerMutationAllowed: false;
  readonly customerLedgerMutationAllowed: false;
  readonly invoiceMutationAllowed: false;
  readonly pricingMutationAllowed: false;
  readonly mlMutationAllowed: false;
  readonly requiredRequestFields: readonly string[];
  readonly duplicateGuards: readonly string[];
  readonly mutationLocks: readonly string[];
  readonly requirements: readonly PartnerSettlementManagerSignoffPersistenceImplementationRequirement[];
  readonly nextSafeStepLabel: string;
  readonly summaryNote: string;
};

export const partnerSettlementManagerSignoffPersistenceImplementationContract: PartnerSettlementManagerSignoffPersistenceImplementationContract = {
  contractName: 'partner-settlement-manager-signoff-persistence-implementation-contract',
  phase: 'Business Phase 1T',
  managerControlled: true,
  managerRoleRequired: true,
  allowedRoles: ['Admin', 'Manager'],
  routePath: '/api/partners/:partnerId/settlement/manager-signoff',
  routeMethod: 'POST',
  explicitManagerSignoffRequired: true,
  persistenceRouteEnabled: true,
  routeRegistrationAllowed: true,
  backendWriteAllowed: true,
  backendWriteScope: ['audit_logs'],
  schemaMigrationAllowed: false,
  dependencyChangeAllowed: false,
  automaticSettlementAllowed: false,
  batchSettlementAllowed: false,
  scheduledSettlementAllowed: false,
  inventoryMutationAllowed: false,
  partnerLedgerMutationAllowed: false,
  customerLedgerMutationAllowed: false,
  invoiceMutationAllowed: false,
  pricingMutationAllowed: false,
  mlMutationAllowed: false,
  requiredRequestFields: [
    'settlementId',
    'idempotencyKey',
    'settlementFingerprint',
    'managerSignoff.confirmed',
  ],
  duplicateGuards: [
    'Signoff lookup is keyed by partnerId plus settlementId.',
    'Signoff lookup is also keyed by partnerId plus settlementFingerprint.',
    'A second manager/admin receives the existing signoff result instead of creating a duplicate audit row.',
    'A reused idempotency key with a different settlementId is rejected as a signoff idempotency conflict.',
  ],
  mutationLocks: [
    'Phase 1T persists manager signoff evidence only in audit_logs.',
    'Phase 1T does not update partner_ledger rows, settlement amounts, inventory, invoices, customers, pricing, settings, users, SMS/Telegram configs, or ML records.',
    'Phase 1T does not create automatic, batch, scheduled, or ML-driven settlement.',
  ],
  requirements: [
    {
      label: 'Admin/Manager role gate',
      status: 'implemented',
      detail: 'The route is registered only through Partner routes and uses the Admin/Manager role allow-list.',
    },
    {
      label: 'Existing audit storage',
      status: 'implemented',
      detail: 'The implementation uses existing audit_logs.description JSON and does not require schema migration.',
    },
    {
      label: 'Duplicate-safe signoff evidence',
      status: 'implemented',
      detail: 'The same settlementId or settlementFingerprint returns already-signed without inserting a second audit row.',
    },
    {
      label: 'No settlement mutation',
      status: 'required',
      detail: 'The signoff path must never create settlement ledger entries or update financial settlement values.',
    },
  ],
  nextSafeStepLabel: 'Partner Settlement Final Acceptance Gate',
  summaryNote: 'Phase 1T persists manager signoff evidence using the existing audit log, with Admin/Manager role gates and duplicate protection.',
};
