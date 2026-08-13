export type PartnerSettlementAtomicSubmitBackendContractRequirement = {
  readonly label: string;
  readonly status: 'required' | 'implemented' | 'deferred';
  readonly detail: string;
};

export type PartnerSettlementAtomicSubmitBackendContractGuard = {
  readonly contractName: 'partner-settlement-atomic-submit-backend-contract-guard';
  readonly phase: 'Business Phase 1L';
  readonly readonlyContract: false;
  readonly managerControlled: true;
  readonly managerRoleRequired: true;
  readonly allowedRoles: readonly ['Admin', 'Manager'];
  readonly explicitManagerConfirmationRequired: true;
  readonly submitRouteEnabled: true;
  readonly routeRegistrationAllowed: true;
  readonly implementationAllowed: true;
  readonly backendWriteAllowed: true;
  readonly ledgerMutationAllowed: true;
  readonly inventoryMutationAllowed: false;
  readonly accountingMutationAllowed: false;
  readonly pricingMutationAllowed: false;
  readonly schemaMigrationAllowed: false;
  readonly dependencyChangeAllowed: false;
  readonly transactionRequired: true;
  readonly atomicWriteRequired: true;
  readonly rollbackRequired: true;
  readonly noPartialMutationAllowed: true;
  readonly idempotencyKeyRequired: true;
  readonly duplicateSubmitBlocked: true;
  readonly auditTrailRequired: true;
  readonly preflightValidationRequired: true;
  readonly currentRouteStatus: 'registered-manager-controlled';
  readonly routeMethod: 'POST';
  readonly routePath: '/api/partners/:partnerId/settlement/atomic-submit';
  readonly requiredRequestFields: readonly string[];
  readonly transactionBoundary: readonly string[];
  readonly rollbackRules: readonly string[];
  readonly noPartialMutationChecks: readonly string[];
  readonly failureResponses: readonly string[];
  readonly mutationLocks: readonly string[];
  readonly requirements: readonly PartnerSettlementAtomicSubmitBackendContractRequirement[];
  readonly nextSafeStepLabel: string;
  readonly summaryNote: string;
};

export const partnerSettlementAtomicSubmitBackendContractGuard: PartnerSettlementAtomicSubmitBackendContractGuard = {
  contractName: 'partner-settlement-atomic-submit-backend-contract-guard',
  phase: 'Business Phase 1L',
  readonlyContract: false,
  managerControlled: true,
  managerRoleRequired: true,
  allowedRoles: ['Admin', 'Manager'],
  explicitManagerConfirmationRequired: true,
  submitRouteEnabled: true,
  routeRegistrationAllowed: true,
  implementationAllowed: true,
  backendWriteAllowed: true,
  ledgerMutationAllowed: true,
  inventoryMutationAllowed: false,
  accountingMutationAllowed: false,
  pricingMutationAllowed: false,
  schemaMigrationAllowed: false,
  dependencyChangeAllowed: false,
  transactionRequired: true,
  atomicWriteRequired: true,
  rollbackRequired: true,
  noPartialMutationAllowed: true,
  idempotencyKeyRequired: true,
  duplicateSubmitBlocked: true,
  auditTrailRequired: true,
  preflightValidationRequired: true,
  currentRouteStatus: 'registered-manager-controlled',
  routeMethod: 'POST',
  routePath: '/api/partners/:partnerId/settlement/atomic-submit',
  requiredRequestFields: [
    'partnerId',
    'settlementDraftId',
    'dryRunId',
    'idempotencyKey',
    'managerConfirmation.confirmed',
  ],
  transactionBoundary: [
    'Authorize Admin or Manager role and explicit manager confirmation before any settlement write.',
    'Validate partner, current dry-run key, settlement draft key, idempotency key, amount, and line ids before writes.',
    'Partner ledger rows and audit log are inserted inside one SQLite transaction.',
    'Success response is emitted only after COMMIT returns successfully.',
  ],
  rollbackRules: [
    'Preflight failure returns before opening a database transaction and writes nothing.',
    'Any in-transaction error rolls back every partner ledger and audit write from that submit attempt.',
    'A duplicate idempotency key returns the previous accepted result instead of creating another ledger row.',
    'The same idempotency key with a different settlement draft or dry-run is rejected as a conflict.',
  ],
  noPartialMutationChecks: [
    'There must be no state where partner ledger is written but audit trail is missing.',
    'There must be no inventory, pricing, customer ledger, invoice, settings, users, or ML mutation in this submit boundary.',
    'A failed attempt leaves partner ledger, inventory, pricing, invoices, customer ledger, and ML unchanged.',
  ],
  failureResponses: [
    '401 for missing authenticated user context.',
    '403 for non Admin/Manager submit attempts.',
    '400 for missing confirmation or malformed idempotency key.',
    '409 for stale dry-run/draft ids or idempotency conflicts.',
    '422 for blocking settlement validation errors.',
    '500 only after rollback is attempted and without exposing sensitive internals.',
  ],
  mutationLocks: [
    'This phase registers only the manager-controlled partner settlement atomic-submit route.',
    'This phase writes only partner_ledger settlement rows and audit_logs within the transaction.',
    'This phase does not mutate inventory, phone/product quantity, pricing, customer ledger, invoices, settings, users, schema, dependencies, ML runtime, or shadow runtime.',
    'This phase does not add automatic, batch, scheduled, or ML-driven settlement.',
  ],
  requirements: [
    {
      label: 'Admin/Manager role gate',
      status: 'implemented',
      detail: 'Submit route uses the existing authorizeRole convention with Admin and Manager roles only.',
    },
    {
      label: 'Current dry-run validation',
      status: 'implemented',
      detail: 'Submit validates deterministic current dry-run and draft ids derived from current settlement data before writing.',
    },
    {
      label: 'Idempotency key',
      status: 'implemented',
      detail: 'The idempotency key is stored as the partner_ledger settlementBatchId and duplicates return the previous result.',
    },
    {
      label: 'Atomic transaction',
      status: 'implemented',
      detail: 'Partner ledger rows and audit log insert in one SQLite transaction and rollback together on failure.',
    },
    {
      label: 'Frontend production submit polish',
      status: 'deferred',
      detail: 'UI integration and manager confirmation polish are intentionally deferred to Business Phase 1M.',
    },
  ],
  nextSafeStepLabel: 'Partner Settlement Submit UI Integration & Manager Confirmation Polish',
  summaryNote: 'Phase 1L enables the first manager-controlled atomic backend submit while preserving dry-run, idempotency, rollback, and narrow mutation-scope locks.',
};
