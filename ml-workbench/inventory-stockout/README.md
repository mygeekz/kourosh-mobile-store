# Phase 13C — Metadata-only Shadow Score Import Fixture

This folder contains the offline ML training workbench for the Kourosh Inventory Stockout prediction use case. Phase 13C converts a validated Phase 13B offline shadow score export into a metadata-only shadow score import fixture for future backend validation/storage work. Model execution remains limited to the Phase 13A offline workbench harness; the Kourosh backend still does not load or execute models, does not read workbench score outputs directly, and does not import this fixture in this phase. UI work and governance expansion remain intentionally frozen for this phase.

The workbench trains and evaluates a local candidate model from an exported training package containing:

- `manifest.json`
- `train.csv`
- `test.csv`

This workbench does **not** run inside the Kourosh backend. It does **not** expose inference endpoints. It does **not** activate a model. It does **not** mutate business data. Generated models, enriched metadata, candidate scores, and execution reports are offline candidate artifacts only.

## Location and boundary

The workbench lives under:

```text
ml-workbench/inventory-stockout/
```

It is intentionally outside `server/` and outside the React/Vite frontend. Do not import it from the Express backend, do not import it from frontend code, and do not add it to backend startup.

## Export a training package from Kourosh

From the Kourosh MLOps / Smart Insight training package area, export the Inventory Stockout package files and place them into a local folder with this shape:

```text
my-training-package/
  manifest.json
  train.csv
  test.csv
```

The backend training package endpoints that describe the source files are recorded in the exported `manifest.json`. The workbench consumes only the local files after export. It does not call Kourosh API endpoints and does not connect to the SQLite database.

A tiny deterministic fixture is included for local smoke tests:

```text
fixtures/sample_training_package/
  manifest.json
  train.csv
  test.csv
```

The fixture is only for script validation and is not production evidence.

## Install local Python dependencies

Use an isolated virtual environment inside the workbench folder:

```bash
cd ml-workbench/inventory-stockout
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Python dependencies are intentionally kept in `ml-workbench/inventory-stockout/requirements.txt`. Do not add Python ML dependencies to the Node/Express backend.

## Validate a training package

```bash
python validate_training_package.py \
  --package-dir fixtures/sample_training_package \
  --output-dir output/sample_run
```

This writes:

```text
output/sample_run/validation_report.json
```

Validation checks local files only:

- `manifest.json` exists and is valid JSON
- `train.csv` exists and has rows
- `test.csv` exists and has rows
- manifest has dataset identity
- manifest has a feature contract via `featureSchema` or `featureContract`
- manifest has a target definition
- manifest has split information
- required feature columns exist in train/test CSV files
- target column exists in train/test CSV files
- forbidden mutation output fields are not present in the manifest

## Train a local candidate model

```bash
python train_inventory_stockout.py \
  --package-dir fixtures/sample_training_package \
  --output-dir output/sample_run
```

The training script:

- reads `manifest.json`, `train.csv`, and `test.csv`
- uses the manifest feature contract and target definition
- safely handles numeric and categorical features
- imputes missing values
- uses a deterministic scikit-learn baseline model
- uses Logistic Regression for normal classification training
- falls back to `DummyClassifier` for single-class tiny data
- uses Random Forest Regressor for regression targets
- writes only local output files

## Evaluate the local model

```bash
python evaluate_inventory_stockout.py \
  --package-dir fixtures/sample_training_package \
  --model-dir output/sample_run \
  --output-dir output/sample_run
```

For classification, the evaluator writes available metrics such as:

- accuracy
- precision
- recall
- f1
- roc_auc when probabilities and both classes exist
- confusion matrix
- positive class rate
- prediction distribution

For regression, it writes available metrics such as:

- mae
- rmse
- r2 when enough rows exist
- prediction distribution

Tiny or single-class datasets do not crash the evaluator. Metrics that are not computable are reported as warnings.


## Phase 10A/10B offline metadata enrichment

Phase 10A/10B adds `offline_metadata_enrichment.py` and enriches local workbench output with review metadata derived from the exported package and fixed offline test predictions only. The enrichment is written into `metrics.json`, `evaluation_report.json`, `candidate_manifest.json`, `model_card.json`, and the standalone file:

```text
offline_metadata_enrichment.json
```

The generated metadata families are:

- threshold scenario metadata
- calibration metadata, including probability bins, Brier score, and expected calibration error when computable
- error analysis metadata, including false positive / false negative summaries and high-confidence wrong examples
- dataset slice diagnostics
- train/test drift baseline metadata
- feature contract drift metadata
- robustness metadata
- deployment readiness metadata summary

All of this is offline metadata. The backend must not recompute these values from raw CSV files, run thresholds, recalibrate probabilities, execute the model, activate the artifact, or mutate business records.

## Build an offline candidate package

```bash
python build_candidate_package.py \
  --package-dir fixtures/sample_training_package \
  --model-dir output/sample_run \
  --output-dir output/sample_run
```

The candidate package builder writes:

```text
candidate_manifest.json
model_card.json
metrics.json
evaluation_report.json
candidate_output_sample.json
offline_metadata_enrichment.json
checksums.json
training_package_validation_report.json
model.joblib
```

`model.joblib` is optional local output. It must stay inside the local output folder and must not be loaded by the Kourosh backend.

## Safe candidate output contract

Candidate output rows may contain only:

```text
entityId
predictionType
horizonDays
score
label
confidence
modelVersion
generatedAt
```

The builder fails if any forbidden mutation field appears anywhere in candidate output:

```text
set_stock
change_price
approve_purchase
create_invoice
mutate_ledger
auto_order
delete_record
production_action
auto_decision
activate_artifact
deploy_model
```

## Output locations and Git hygiene

Generated outputs go under:

```text
ml-workbench/inventory-stockout/output/
```

The root `.gitignore` ignores generated workbench output and local virtual environments while keeping `output/.gitkeep` tracked.

Do not commit generated `model.joblib` files unless a future explicit fixture-only policy says otherwise.

## Later metadata import

A later phase may import evaluation metadata from `candidate_manifest.json`, `model_card.json`, `metrics.json`, `evaluation_report.json`, `candidate_output_sample.json`, `offline_metadata_enrichment.json`, and `checksums.json`.

Metadata import must remain separate from model execution. Importing metadata must not activate a model, load model bytes, expose inference, or mutate inventory/accounting/pricing/ledger/report data.

## Explicitly forbidden in Phase 10A/10B

- No Express training endpoint
- No Express inference endpoint
- No backend model loading
- No backend artifact byte loading
- No production scoring
- No scheduler job that trains models
- No automatic retraining
- No background ML worker
- No database mutation from model output
- No inventory mutation
- No accounting mutation
- No pricing mutation
- No ledger mutation
- No report mutation
- No model activation
- No business decision automation

Generated models are offline candidate artifacts only.

## Phase 9B metadata import

After a candidate package is built locally, Phase 9B may import only these JSON metadata files into Kourosh for review visibility: `candidate_manifest.json`, `model_card.json`, `metrics.json`, `evaluation_report.json`, `candidate_output_sample.json`, `checksums.json`, and optionally `training_package_validation_report.json`.

Phase 9B does not import `model.joblib`, does not load model bytes, does not execute a model, does not expose inference endpoints, does not activate artifacts, and does not mutate inventory, accounting, pricing, reports, ledgers, customers, partners, repairs, or other business records.



## Phase 10B enrichment schema hardening

Phase 10B adds a formal local schema surface for `offline_metadata_enrichment.json`:

```text
schemas/offline_metadata_enrichment.schema.json
validate_offline_metadata_enrichment.py
offline_metadata_enrichment_validation_report.json
```

The validator is dependency-free and runs only against local JSON files. It checks the required enrichment sections, threshold scenario arrays, calibration bins, error-analysis arrays, slice/robustness/drift/readiness metadata surfaces, and forbidden mutation/artifact-byte fields.

Example validation command:

```bash
python validate_offline_metadata_enrichment.py --input output/sample_run/offline_metadata_enrichment.json --output-dir output/sample_run
```

`train_inventory_stockout.py`, `evaluate_inventory_stockout.py`, and `build_candidate_package.py` now validate enriched metadata before writing or packaging it. If the enrichment metadata contains forbidden fields such as `set_stock`, `change_price`, `artifactBytes`, `serializedModel`, or `deploy_model`, the workbench fails locally.

Candidate packages now include:

```text
offline_metadata_enrichment.json
offline_metadata_enrichment_validation_report.json
```

`checksums.json` includes SHA-256 coverage for both files. This schema hardening remains local/offline and does not run inside the Kourosh backend.

## Explicitly forbidden in Phase 10B

- No backend schema execution endpoint
- No Express training endpoint
- No Express inference endpoint
- No backend model loading
- No backend artifact byte loading
- No raw training CSV loading in backend
- No production scoring
- No model activation
- No decision automation
- No inventory/accounting/pricing/ledger/report mutation

The schema validator only validates local offline metadata files generated by the workbench.

## Phase 10C — enrichment fixture pack

Phase 10C adds deterministic positive and negative fixtures for `offline_metadata_enrichment.json` validation only. These fixtures are local workbench files and do not run inside the Kourosh backend.

Fixture location:

```text
fixtures/offline_metadata_enrichment/
  valid_enrichment.json
  invalid_missing_required_section.json
  invalid_forbidden_mutation_field.json
  invalid_calibration_bins.json
  invalid_threshold_scenario.json
  invalid_readiness_safety_flag.json
  fixture_expectations.json
```

Run the fixture harness:

```bash
python validate_offline_metadata_enrichment_fixtures.py   --fixture-dir fixtures/offline_metadata_enrichment   --output-dir output/sample_run
```

Expected result: `valid_enrichment.json` passes, and the negative fixtures fail for the expected reasons. The optional local report is written to `offline_metadata_enrichment_fixture_validation_report.json`.

This fixture harness does **not** execute a model, expose inference, activate artifacts, mutate business data, call backend APIs, connect to SQLite, or use the network.


## Phase 10D — Offline candidate package contract regression suite

Phase 10D adds a deterministic contract validator for the complete offline candidate package. It validates the package JSON surface after the local workbench builds a candidate package.

```bash
python validate_candidate_package_contract.py \
  --candidate-package-dir output/sample_run \
  --training-package-dir fixtures/sample_training_package \
  --expectations fixtures/candidate_package_contract/contract_expectations.json \
  --output-dir output/sample_run
```

The regression validator checks:

```text
candidate_manifest.json
model_card.json
metrics.json
evaluation_report.json
candidate_output_sample.json
offline_metadata_enrichment.json
offline_metadata_enrichment_validation_report.json
training_package_validation_report.json
checksums.json
```

It verifies required files, JSON structure, safe output contract, required manifest/model-card fields, required offline enrichment sections, checksum coverage, local SHA-256 matches, safety flags, and forbidden execution/mutation/artifact fields.

When `--output-dir` is provided, it writes:

```text
candidate_package_contract_validation_report.json
```

This report is local smoke-test evidence only. It is not a model activation, not production approval, not backend inference, and not a business decision.

Phase 10D remains completely offline. It does not run inside the Kourosh backend, does not expose inference endpoints, does not activate a model, does not load model bytes in backend, does not read raw training CSVs in backend, and does not mutate business data.

## Phase 10E — Offline candidate package negative contract fixtures

Phase 10E adds deterministic negative fixtures for the complete offline candidate package contract. The fixture harness starts from a locally generated valid candidate package, copies it into output-only scratch folders, applies one intentional corruption per case, and verifies that `validate_candidate_package_contract.py` rejects the corrupted package.

Fixture expectations live here:

```text
fixtures/candidate_package_contract/negative_fixture_expectations.json
```

Run the negative fixture harness after building the local sample candidate package:

```bash
python validate_candidate_package_negative_fixtures.py \
  --candidate-package-dir output/sample_run \
  --training-package-dir fixtures/sample_training_package \
  --expectations fixtures/candidate_package_contract/contract_expectations.json \
  --fixture-expectations fixtures/candidate_package_contract/negative_fixture_expectations.json \
  --output-dir output/sample_run
```

The harness writes this local report:

```text
candidate_package_negative_fixture_validation_report.json
```

Run this negative fixture harness against a freshly built candidate package or after `validate_candidate_package_contract.py`. Do not overwrite checksummed package files such as `offline_metadata_enrichment_validation_report.json` between package build and contract validation unless you rebuild the package afterward.

The current fixture pack covers:

```text
valid_candidate_package
missing_candidate_manifest
checksum_mismatch
unsafe_candidate_output_field
missing_enrichment_section
unsafe_safety_flag_true
invalid_model_card_production_claim
invalid_checksums_structure
```

Generated mutated package copies are created only under `output/sample_run/candidate_package_negative_fixture_runs/`, which remains gitignored. Phase 10E does not run inside the Kourosh backend, does not expose inference endpoints, does not activate a model, does not load model bytes in backend, does not read raw training CSVs in backend, and does not mutate business data.

## Phase 10F — Offline Candidate Package Roundtrip Import Fixture

Phase 10F adds an offline bridge check between the workbench candidate package and the Phase 9B metadata-import contract.

The bridge builds a local JSON payload that can be submitted to the Phase 9B metadata import surface later, if an operator chooses to do so. It does not import the payload automatically and it does not call the Kourosh backend.

```bash
python build_phase9b_candidate_import_payload.py \
  --candidate-package-dir output/sample_run \
  --training-package-dir fixtures/sample_training_package \
  --output-dir output/sample_run
```

This creates local-only files:

```text
phase9b_candidate_evaluation_metadata_import_payload.json
phase9b_candidate_evaluation_metadata_import_payload_validation_report.json
```

The payload contains only Phase 9B-compatible metadata sections:

```text
candidateManifest
modelCard
metrics
evaluationReport
candidateOutputSample
checksums
trainingPackageValidationReport
```

The payload explicitly strips `model.joblib` and `modelJoblibSha256` references before import-payload generation. It rejects model bytes, serialized model payloads, artifact bytes, unsafe candidate output fields, and missing embedded enrichment metadata.

Run the deterministic roundtrip fixture harness:

```bash
python validate_phase9b_import_payload_fixtures.py \
  --candidate-package-dir output/sample_run \
  --training-package-dir fixtures/sample_training_package \
  --output-dir output/sample_run
```

This writes:

```text
phase9b_import_payload_roundtrip_fixture_validation_report.json
```

Fixture cases include:

```text
valid_phase9b_import_payload
payload_with_model_bytes
payload_with_model_joblib_checksum
payload_missing_candidate_manifest
payload_with_unsafe_output_field
payload_missing_embedded_enrichment
```

This workbench does not run inside the Kourosh backend. It does not expose inference endpoints. It does not activate a model. It does not import `model.joblib`. It does not import model bytes. It does not mutate inventory, accounting, pricing, ledgers, reports, customers, partners, repairs, or any other business data.


## Phase 13A — Offline Candidate Model Execution Harness

Phase 13A executes the candidate model only inside the offline workbench. The Kourosh backend still does not load or execute the model. No inference endpoint is exposed. No artifact is activated. No business records are mutated. UI work is intentionally frozen for this phase. Governance expansion is intentionally frozen for this phase.

Model execution is allowed only under:

```text
ml-workbench/inventory-stockout/
```

Model execution remains forbidden under backend/frontend runtime folders such as:

```text
server/
src/
components/
pages/
routes/
db/
```

### Phase 13A files

```text
execute_candidate_model.py
validate_candidate_score_output.py
build_offline_execution_report.py
schemas/candidate_score_output.schema.json
schemas/offline_execution_report.schema.json
fixtures/sample_feature_snapshots/feature_snapshots.json
```

### Canonical workbench execution order

Run these commands from `ml-workbench/inventory-stockout`:

```bash
python validate_training_package.py --package-dir fixtures/sample_training_package --output-dir output/sample_run
python train_inventory_stockout.py --package-dir fixtures/sample_training_package --output-dir output/sample_run
python evaluate_inventory_stockout.py --package-dir fixtures/sample_training_package --model-dir output/sample_run --output-dir output/sample_run
python build_candidate_package.py --package-dir fixtures/sample_training_package --model-dir output/sample_run --output-dir output/sample_run
python validate_candidate_package_contract.py --candidate-package-dir output/sample_run --training-package-dir fixtures/sample_training_package --expectations fixtures/candidate_package_contract/contract_expectations.json --output-dir output/sample_run
python execute_candidate_model.py --package-dir fixtures/sample_training_package --model-dir output/sample_run --output-dir output/sample_run
python validate_candidate_score_output.py --score-output output/sample_run/candidate_score_output.json --candidate-package-dir output/sample_run --output-dir output/sample_run
python build_offline_execution_report.py --score-output output/sample_run/candidate_score_output.json --validation-report output/sample_run/candidate_score_output_validation_report.json --metrics output/sample_run/metrics.json --output-dir output/sample_run
python export_offline_shadow_scores.py --score-output output/sample_run/candidate_score_output.json --validation-report output/sample_run/candidate_score_output_validation_report.json --execution-report output/sample_run/offline_execution_report.json --output-dir output/sample_run
python validate_offline_shadow_score_export.py --shadow-export output/sample_run/offline_shadow_score_export.json --output-dir output/sample_run
python build_offline_shadow_score_export_report.py --shadow-export output/sample_run/offline_shadow_score_export.json --validation-report output/sample_run/offline_shadow_score_export_validation_report.json --output-dir output/sample_run
python build_shadow_score_import_fixture.py --shadow-export output/sample_run/offline_shadow_score_export.json --shadow-validation-report output/sample_run/offline_shadow_score_export_validation_report.json --shadow-export-report output/sample_run/offline_shadow_score_export_report.json --output-dir output/sample_run
python validate_shadow_score_import_fixture.py --import-fixture output/sample_run/shadow_score_import_fixture.json --output-dir output/sample_run
python build_shadow_score_import_fixture_report.py --import-fixture output/sample_run/shadow_score_import_fixture.json --validation-report output/sample_run/shadow_score_import_fixture_validation_report.json --output-dir output/sample_run
```

If any output file is regenerated after checksums are built, rebuild the package/checksums. Phase 13A and Phase 13B scripts refresh SHA-256 entries for their own generated artifacts, but the safe canonical order above avoids the previous order-of-operations issue where a validation report was regenerated after package build and caused checksum mismatch.

### Offline candidate model execution

```bash
python execute_candidate_model.py \
  --package-dir fixtures/sample_training_package \
  --model-dir output/sample_run \
  --output-dir output/sample_run
```

The execution harness loads `model.joblib` and `candidate_manifest.json` from `--model-dir`, reads `test.csv` from the local training package, prepares features according to the manifest feature contract, runs local offline predictions, and writes:

```text
candidate_score_output.json
candidate_score_output.csv
execution_manifest.json
```

The harness may use `joblib` and `sklearn` only inside this workbench. It must not import Kourosh backend code, connect to SQLite, call Express APIs, expose a route, activate an artifact, or mutate inventory/accounting/pricing/ledger/report/business data.

### Optional feature snapshot scoring

```bash
python execute_candidate_model.py \
  --feature-snapshots fixtures/sample_feature_snapshots/feature_snapshots.json \
  --model-dir output/sample_run \
  --output-dir output/sample_run
```

Feature snapshot scoring preserves row identity through `entityId`, `productId`, or `rowKey`. Feature names are checked against the training contract. Missing features are supplied as nulls with warnings. Extra fields are ignored with warnings. This is still offline workbench execution only.

### Candidate score output contract

`candidate_score_output.json` has only these top-level metadata fields:

```text
candidatePackageId
modelKey
modelVersion
predictionType
horizonDays
rowCount
scoreCount
generatedAt
workbenchVersion
source
safetyPolicy
scores
```

Each score row may contain only:

```text
entityId
predictionType
horizonDays
score
label
confidence
modelKey
modelVersion
candidatePackageId
generatedAt
sourceRowIndex
```

Forbidden fields fail validation anywhere in the output:

```text
set_stock
change_price
approve_purchase
create_invoice
mutate_ledger
auto_order
delete_record
production_action
auto_decision
activate_artifact
deploy_model
write_inventory
write_accounting
write_ledger
write_report
```

The output is score evidence only. It is not an activation directive, not a backend execution directive, not a production decision directive, and not a business mutation plan.

### Score output validation

```bash
python validate_candidate_score_output.py \
  --score-output output/sample_run/candidate_score_output.json \
  --candidate-package-dir output/sample_run \
  --output-dir output/sample_run
```

This writes:

```text
candidate_score_output_validation_report.json
```

The validator checks schema shape, candidate manifest identity matches, row counts, numeric score values, confidence range, label presence, generated timestamps, explicit safety policy, forbidden fields, activation directives, production decision directives, and backend execution directives.

### Offline execution report

```bash
python build_offline_execution_report.py \
  --score-output output/sample_run/candidate_score_output.json \
  --validation-report output/sample_run/candidate_score_output_validation_report.json \
  --metrics output/sample_run/metrics.json \
  --output-dir output/sample_run
```

This writes:

```text
offline_execution_report.json
```

The report includes the candidate package identity, execution status, score distribution, label distribution, confidence summary, metrics reference, validation status, warnings, errors, safety policy, and generated timestamp. It is offline evidence only and must not be described as production readiness, live inference, deployment, activation, or automated decision-making.

### Backend safety boundary for Phase 13A

These backend safety claims must remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

The backend must not load `model.joblib`, import `joblib`, import `sklearn`, read raw `train.csv`/`test.csv`, read `candidate_score_output.json` directly from workbench output, execute model scoring, expose inference/training/activation routes, or mutate inventory/accounting/pricing/ledger/reports.


## Phase 13B — Offline Shadow Score Export Contract

Phase 13B exports the Phase 13A `candidate_score_output.json` into a backend-acceptable, metadata-only shadow score export contract. This remains a metadata-only shadow score contract and not a runtime integration. It does not execute a model, does not load `model.joblib`, does not expose inference, does not activate an artifact, does not add UI, does not add a governance workflow, and does not mutate business records.

The backend may only ever treat the resulting export as metadata evidence in a future phase. In this phase, the backend still does not read `candidate_score_output.json`, `offline_shadow_score_export.json`, or any workbench output directly.

### Phase 13B files

```text
export_offline_shadow_scores.py
validate_offline_shadow_score_export.py
build_offline_shadow_score_export_report.py
schemas/offline_shadow_score_export.schema.json
schemas/offline_shadow_score_export_report.schema.json
```

### Export offline shadow scores

```bash
python export_offline_shadow_scores.py   --score-output output/sample_run/candidate_score_output.json   --validation-report output/sample_run/candidate_score_output_validation_report.json   --execution-report output/sample_run/offline_execution_report.json   --output-dir output/sample_run
```

This writes:

```text
offline_shadow_score_export.json
offline_shadow_score_export.csv
offline_shadow_score_export_manifest.json
```

The export maps each offline score row into a metadata-only shadow score record with:

```text
shadowScoreId
entityType
entityId
predictionType
horizonDays
candidateScore
candidateLabel
candidateConfidence
scoreQuality
modelKey
modelVersion
candidatePackageId
sourceRowIndex
scoreGeneratedAt
exportGeneratedAt
storageClass = metadata_only_shadow_score
evidenceOnly = true
backendAction = none
automationAllowed = false
businessMutationAllowed = false
inventoryMutationAllowed = false
accountingMutationAllowed = false
pricingMutationAllowed = false
ledgerMutationAllowed = false
reportMutationAllowed = false
artifactActivationAllowed = false
modelExecutionAllowed = false
inferenceEndpointExposed = false
```

### Validate offline shadow score export

```bash
python validate_offline_shadow_score_export.py   --shadow-export output/sample_run/offline_shadow_score_export.json   --output-dir output/sample_run
```

This writes:

```text
offline_shadow_score_export_validation_report.json
```

The validator rejects forbidden mutation fields, activation directives, backend execution directives, production decision directives, true runtime/model/inference/action flags, malformed counts, unsafe backend import policy, and any non-metadata-only record shape.

### Build offline shadow score export report

```bash
python build_offline_shadow_score_export_report.py   --shadow-export output/sample_run/offline_shadow_score_export.json   --validation-report output/sample_run/offline_shadow_score_export_validation_report.json   --output-dir output/sample_run
```

This writes:

```text
offline_shadow_score_export_report.json
```

The report summarizes score distribution, confidence summary, label distribution, score quality distribution, validation status, output hashes, warnings, errors, and safety policy. It is offline metadata evidence only and must not be described as production readiness, live inference, deployment, activation, or automated decision-making.

### Backend safety boundary for Phase 13B

These backend safety claims must remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

The backend must not load `model.joblib`, import `joblib`, import `sklearn`, read raw `train.csv`/`test.csv`, read `candidate_score_output.json` or `offline_shadow_score_export.json` directly from workbench output, execute model scoring, expose inference/training/activation routes, activate artifacts, or mutate inventory/accounting/pricing/ledger/reports.


## Phase 13C — Metadata-only Shadow Score Import Fixture

Phase 13C builds a local metadata-only import fixture from the validated Phase 13B `offline_shadow_score_export.json`. This fixture is intended only as offline evidence for a future backend metadata validation/storage phase. Phase 13C does not execute a model, does not load `model.joblib`, does not expose inference, does not activate an artifact, does not add UI, does not add a governance workflow, and does not mutate business records.

The Kourosh backend still does not read `candidate_score_output.json`, `offline_shadow_score_export.json`, `shadow_score_import_fixture.json`, or any workbench output directly. No backend import/storage route is added in this phase.

### Phase 13C files

```text
build_shadow_score_import_fixture.py
validate_shadow_score_import_fixture.py
build_shadow_score_import_fixture_report.py
schemas/shadow_score_import_fixture.schema.json
schemas/shadow_score_import_fixture_report.schema.json
```

### Build metadata-only shadow score import fixture

```bash
python build_shadow_score_import_fixture.py \
  --shadow-export output/sample_run/offline_shadow_score_export.json \
  --shadow-validation-report output/sample_run/offline_shadow_score_export_validation_report.json \
  --shadow-export-report output/sample_run/offline_shadow_score_export_report.json \
  --output-dir output/sample_run
```

This writes:

```text
shadow_score_import_fixture.json
shadow_score_import_fixture.csv
shadow_score_import_fixture_manifest.json
```

Each record is shaped as metadata-only evidence with:

```text
storageClass = metadata_only_shadow_score_import_fixture
evidenceOnly = true
backendAction = validate_and_store_metadata_only_when_future_import_exists
importEligibility = eligible_for_metadata_only_import
automationAllowed = false
businessMutationAllowed = false
inventoryMutationAllowed = false
accountingMutationAllowed = false
pricingMutationAllowed = false
ledgerMutationAllowed = false
reportMutationAllowed = false
artifactActivationAllowed = false
modelExecutionAllowed = false
inferenceEndpointExposed = false
```

### Validate metadata-only shadow score import fixture

```bash
python validate_shadow_score_import_fixture.py \
  --import-fixture output/sample_run/shadow_score_import_fixture.json \
  --output-dir output/sample_run
```

This writes:

```text
shadow_score_import_fixture_validation_report.json
```

The validator rejects forbidden mutation fields, activation directives, backend execution directives, production decision directives, true runtime/model/inference/action flags, malformed counts, duplicate import IDs, unsafe backend import policy, and any non-metadata-only record shape.

### Build metadata-only shadow score import fixture report

```bash
python build_shadow_score_import_fixture_report.py \
  --import-fixture output/sample_run/shadow_score_import_fixture.json \
  --validation-report output/sample_run/shadow_score_import_fixture_validation_report.json \
  --output-dir output/sample_run
```

This writes:

```text
shadow_score_import_fixture_report.json
```

The report summarizes record count, score summary, confidence summary, label distribution, score quality distribution, entity type distribution, import eligibility, validation status, hashes, warnings, errors, and safety policy. It is offline metadata evidence only and must not be described as production readiness, live inference, deployment, activation, or automated decision-making.

### Backend safety boundary for Phase 13C

These backend safety claims must remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

The backend must not load `model.joblib`, import `joblib`, import `sklearn`, read raw `train.csv`/`test.csv`, read `candidate_score_output.json`, `offline_shadow_score_export.json`, or `shadow_score_import_fixture.json` directly from workbench output, execute model scoring, expose inference/training/activation/import routes, activate artifacts, or mutate inventory/accounting/pricing/ledger/reports.

## Phase 13D — Backend Metadata-only Shadow Score Import Validator

Phase 13D adds a pure in-memory backend validator for the Phase 13C metadata-only shadow score import fixture contract. The validator accepts a payload object that has already been supplied by a caller/test harness and validates its metadata-only shape, safety policy, record consistency, duplicate import IDs, forbidden fields, and unsafe true flags.

The backend validator does not read `candidate_score_output.json`, `offline_shadow_score_export.json`, or `shadow_score_import_fixture.json` from the workbench. It does not add a route, does not store metadata, does not connect to SQLite, does not execute a model, does not load artifact bytes, does not expose inference, does not activate artifacts, and does not mutate inventory/accounting/pricing/ledger/report/business records. No UI work and no governance workflow are added in this phase.

### Phase 13D files

```text
server/intelligence/mlRuntime/shadowScoreImportMetadataOnlyValidator.ts
server/tests/fixtures/mlShadowScoreImportValidator/metadataOnlyShadowScoreImportPayload.valid.json
server/tests/mlShadowScoreImportMetadataOnlyValidatorGuard.test.mjs
```

### Backend validator behavior

The validator exports:

```text
validateShadowScoreImportMetadataOnlyPayload(payload)
SHADOW_SCORE_IMPORT_METADATA_ONLY_VALIDATOR_SAFETY_POLICY
```

The validator report is in-memory only and contains:

```text
phase
validatorKind
status: pass | warning | fail
recordCount
validatedRecordCount
warningCount
errorCount
forbiddenFieldCount
duplicateRecordCount
warnings
errors
safetyPolicy
generatedAt
```

The validator requires the metadata-only import fixture markers:

```text
fixtureKind = metadata_only_shadow_score_import_fixture
importMode = metadata_only_fixture
evidenceOnly = true
storageClass = metadata_only_shadow_score_import_fixture
backendAction = validate_and_store_metadata_only_when_future_import_exists
importEligibility = eligible_for_metadata_only_import
```

These backend safety claims remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

Phase 13D intentionally stops before import persistence. It validates metadata-only payload objects but does not write records to the database and does not expose an HTTP API.

## Phase 13E — Metadata-only Shadow Score Persistence Dry-run

Phase 13E adds a backend metadata-only persistence dry-run for the Phase 13C import fixture payload contract. The dry-run accepts a payload object that has already been supplied by a caller/test harness, runs the Phase 13D in-memory validator first, and prepares deterministic metadata-only dry-run records that describe what would become future metadata storage candidates.

The backend dry-run does not read workbench output files, does not persist to SQLite, does not add a repository, does not add a migration, does not expose a route, does not execute a model, does not load artifact bytes, does not expose inference, does not activate artifacts, and does not mutate inventory/accounting/pricing/ledger/report/business records. No UI work and no governance workflow are added in this phase.

### Phase 13E files

```text
server/intelligence/mlRuntime/shadowScoreImportMetadataOnlyPersistenceDryRun.ts
server/tests/fixtures/mlShadowScorePersistenceDryRun/metadataOnlyShadowScorePersistenceDryRunPayload.valid.json
server/tests/mlShadowScorePersistenceDryRunGuard.test.mjs
docs/release/phase13e-release-readiness.json
docs/release/phase13e-manual-qa-checklist.json
```

### Backend dry-run behavior

The dry-run exports:

```text
buildShadowScoreImportMetadataOnlyPersistenceDryRun(payload)
SHADOW_SCORE_IMPORT_METADATA_ONLY_PERSISTENCE_DRY_RUN_POLICY
```

The dry-run report is in-memory only and contains:

```text
phase
dryRunKind
status: pass | warning | fail
importValidatorStatus
recordCount
eligibleRecordCount
skippedRecordCount
dryRunRecordCount
duplicateRecordCount
warningCount
errorCount
forbiddenFieldCount
warnings
errors
dryRunRecords
dryRunSummary
safetyPolicy
generatedAt
```

Each dry-run record is metadata-only and uses:

```text
metadataOnly = true
dryRunOnly = true
persistenceMode = dry_run_no_write
validationStatus = validated_metadata_only
wouldPersistTo = future_shadow_score_metadata_store
```

The dry-run summary must remain:

```text
acceptsPayloadObjectOnly = true
validationRequiredBeforeDryRun = true
persistenceMode = dry_run_no_write
databaseWritePerformed = false
routeExposed = false
modelExecutionPerformed = false
artifactActivationPerformed = false
businessMutationPerformed = false
```

These backend safety claims remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

Phase 13E intentionally stops before real metadata storage. A future phase may add a dedicated metadata-only persistence boundary only after the dry-run and validator guards remain green.


## Phase 13F — Metadata-only Shadow Score Storage Schema Draft

Phase 13F adds a backend storage schema draft and repository interface draft for future metadata-only shadow score storage. This phase is intentionally limited to TypeScript contracts, a JSON schema draft, and guard coverage. It does not add a repository implementation, does not add a migration, does not create a table, does not connect to SQLite, does not persist metadata, does not expose a route, does not execute a model, does not load artifact bytes, does not expose inference, does not activate artifacts, and does not mutate inventory/accounting/pricing/ledger/report/business records. No UI work and no governance workflow are added in this phase.

### Phase 13F files

```text
server/intelligence/mlRuntime/shadowScoreMetadataOnlyStorageSchemaDraft.ts
server/intelligence/mlRuntime/schemas/shadow_score_metadata_only_storage.schema.draft.json
server/tests/fixtures/mlShadowScoreStorageSchemaDraft/metadataOnlyShadowScoreStorageDraft.valid.json
server/tests/mlShadowScoreStorageSchemaDraftGuard.test.mjs
docs/release/phase13f-release-readiness.json
docs/release/phase13f-manual-qa-checklist.json
```

### Storage draft boundary

The draft exports:

```text
ShadowScoreMetadataOnlyStorageRowDraft
ShadowScoreMetadataOnlyStorageRepositoryDraft
validateShadowScoreMetadataOnlyStorageRowDraft(row)
buildShadowScoreMetadataOnlyStorageSchemaDraftReport(input)
SHADOW_SCORE_METADATA_ONLY_STORAGE_SCHEMA_DRAFT_POLICY
```

The repository interface is deliberately non-operational. It exposes preview and validation methods only. It does not expose create, update, delete, insert, save, activate, deploy, infer, or execute methods.

Each storage draft row must remain:

```text
storageClass = metadata_only_shadow_score_storage_schema_draft
storageMode = schema_draft_no_write
evidenceOnly = true
metadataOnly = true
schemaDraftOnly = true
repositoryWriteMethodAvailable = false
databaseWriteAllowed = false
routeExposed = false
modelExecutionAllowed = false
inferenceEndpointExposed = false
artifactActivationAllowed = false
businessMutationAllowed = false
```

These backend safety claims remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

Phase 13F intentionally stops before real metadata storage. A future phase may add a guarded metadata-only repository implementation and migration only after this draft boundary and all backend-disconnection guards remain green.


## Phase 13G — Guarded Metadata-only Shadow Score Repository Implementation Draft

Phase 13G adds a guarded in-memory repository implementation draft for future metadata-only shadow score storage. This phase accepts payload objects only after the Phase 13D validator, Phase 13E dry-run, and Phase 13F storage schema draft boundaries are applied. It does not read workbench output files, does not add a migration, does not create a table, does not connect to SQLite, does not write to a database, does not expose a route, does not execute a model, does not load artifact bytes, does not expose inference, does not activate artifacts, and does not mutate inventory/accounting/pricing/ledger/report/business records. No UI work and no governance workflow are added in this phase.

### Phase 13G files

```text
server/intelligence/mlRuntime/shadowScoreMetadataOnlyRepositoryImplementationDraft.ts
server/intelligence/mlRuntime/schemas/shadow_score_metadata_only_repository_implementation.draft.schema.json
server/tests/fixtures/mlShadowScoreRepositoryImplementationDraft/metadataOnlyShadowScoreRepositoryImplementationPayload.valid.json
server/tests/mlShadowScoreRepositoryImplementationDraftGuard.test.mjs
docs/release/phase13g-release-readiness.json
docs/release/phase13g-manual-qa-checklist.json
```

### Repository implementation draft boundary

The draft exports:

```text
createShadowScoreMetadataOnlyRepositoryImplementationDraft()
buildShadowScoreMetadataOnlyRepositoryImplementationDraftPreview(payload)
SHADOW_SCORE_METADATA_ONLY_REPOSITORY_IMPLEMENTATION_DRAFT_POLICY
SHADOW_SCORE_METADATA_ONLY_REPOSITORY_IMPLEMENTATION_DRAFT_BOUNDARY
```

The repository implementation draft is deliberately guarded and non-operational. It can preview validated metadata-only rows, stage validated rows in memory, list the in-memory staged rows, and clear the in-memory draft stage. It does not expose a public route and does not perform database persistence.

Each Phase 13G report must remain:

```text
repositoryKind = guarded_metadata_only_shadow_score_repository_implementation_draft
stageMode = guarded_in_memory_draft_no_database_write
repositoryImplementationDraft = true
guardedInMemoryDraftOnly = true
acceptsPayloadObjectOnly = true
requiresPhase13DValidator = true
requiresPhase13EDryRun = true
usesPhase13FStorageSchemaDraft = true
migrationAdded = false
tableCreated = false
connectsToDatabase = false
databaseWriteAllowed = false
writesToDatabase = false
readsWorkbenchOutputFiles = false
exposesRoute = false
loadsModelArtifact = false
executesModel = false
activatesArtifact = false
mutatesBusinessRecords = false
```

These backend safety claims remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

Phase 13G intentionally stops before database persistence. A future phase may add a guarded metadata-only storage migration only after this repository implementation draft and all backend-disconnection guards remain green.


## Phase 13H — Metadata-only Shadow Score Storage Migration Draft

Phase 13H adds a draft SQL schema and TypeScript migration draft report for a future metadata-only shadow score table. The draft SQL schema is deliberately stored as a `.draft.sql` design artifact and is marked `DRAFT ONLY` and `DO NOT RUN`. This phase does not register a migration runner, does not apply the SQL, does not create a table, does not connect to SQLite, does not write to a database, does not expose a route, does not execute a model, does not load artifact bytes, does not expose inference, does not activate artifacts, and does not mutate inventory/accounting/pricing/ledger/report/business records. No UI work and no governance workflow are added in this phase.

### Phase 13H files

```text
server/intelligence/mlRuntime/shadowScoreMetadataOnlyStorageMigrationDraft.ts
server/intelligence/mlRuntime/migrationDrafts/phase13h_shadow_score_metadata_only_store.draft.sql
server/intelligence/mlRuntime/schemas/shadow_score_metadata_only_storage_migration.draft.schema.json
server/tests/fixtures/mlShadowScoreStorageMigrationDraft/metadataOnlyShadowScoreStorageMigrationDraft.valid.json
server/tests/mlShadowScoreStorageMigrationDraftGuard.test.mjs
docs/release/phase13h-release-readiness.json
docs/release/phase13h-manual-qa-checklist.json
```

### Migration draft boundary

The draft exports:

```text
buildShadowScoreMetadataOnlyStorageMigrationDraftReport()
SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_POLICY
SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_BOUNDARY
SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_COLUMNS
SHADOW_SCORE_METADATA_ONLY_STORAGE_MIGRATION_DRAFT_INDEXES
```

The SQL file is a review artifact only. Backend TypeScript does not read it from disk, does not execute it, and does not register it with any migration runner.

Each Phase 13H report must remain:

```text
migrationDraftKind = metadata_only_shadow_score_storage_migration_draft
migrationMode = draft_sql_no_execution
migrationDraftOnly = true
sqlFileIsDraftOnly = true
sqlFileIsNotRuntimeLoaded = true
sqlFileIsNotExecuted = true
noMigrationRunnerAdded = true
migrationApplicationAllowed = false
sqlExecutionAllowed = false
databaseConnectionAllowed = false
databaseWriteAllowed = false
tableCreationApplied = false
tableCreated = false
repositoryWriteAllowed = false
readsWorkbenchOutputFiles = false
exposesRoute = false
loadsModelArtifact = false
executesModel = false
activatesArtifact = false
mutatesBusinessRecords = false
```

These backend safety claims remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

Phase 13H intentionally stops before executable migrations. A future phase may add a guarded metadata-only migration runner only after this draft SQL boundary and all backend-disconnection guards remain green.


## Phase 13I — Guarded Metadata-only Migration Runner Dry-run

Phase 13I adds a guarded dry-run preflight report for the Phase 13H metadata-only shadow score storage migration draft. The dry-run uses the Phase 13H TypeScript migration draft report only. It does not read the `.draft.sql` file from disk at runtime, does not execute SQL, does not register a migration runner, does not mutate a migration registry, does not apply a migration, does not create a table, does not connect to SQLite, does not write to a database, does not expose a route, does not execute a model, does not load artifact bytes, does not expose inference, does not activate artifacts, and does not mutate inventory/accounting/pricing/ledger/report/business records. No UI work and no governance workflow are added in this phase.

### Phase 13I files

```text
server/intelligence/mlRuntime/shadowScoreMetadataOnlyMigrationRunnerDryRun.ts
server/intelligence/mlRuntime/schemas/shadow_score_metadata_only_migration_runner_dry_run.schema.json
server/tests/fixtures/mlShadowScoreMigrationRunnerDryRun/metadataOnlyShadowScoreMigrationRunnerDryRun.valid.json
server/tests/mlShadowScoreMigrationRunnerDryRunGuard.test.mjs
docs/release/phase13i-release-readiness.json
docs/release/phase13i-manual-qa-checklist.json
```

### Migration runner dry-run boundary

The dry-run exports:

```text
buildShadowScoreMetadataOnlyMigrationRunnerDryRunReport()
SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_POLICY
SHADOW_SCORE_METADATA_ONLY_MIGRATION_RUNNER_DRY_RUN_BOUNDARY
```

The dry-run is a preflight report only. It describes the planned table, columns, indexes, uniqueness keys, and guard/check-constraint count from the Phase 13H TypeScript draft report. It does not read the .draft.sql file from disk. It does not load the SQL text from disk and does not execute the SQL. It is intentionally not registered with a migration runner.

Each Phase 13I report must remain:

```text
dryRunKind = guarded_metadata_only_migration_runner_dry_run
dryRunMode = preflight_only_no_sql_execution
migrationRunnerDryRunOnly = true
preflightOnly = true
usesPhase13HMigrationDraftReportOnly = true
sourceSqlFileIsNotReadFromDisk = true
sqlTextLoadedFromDisk = false
sqlFileIsNotExecuted = true
sqlExecutionAllowed = false
databaseConnectionAllowed = false
databaseWriteAllowed = false
migrationApplicationAllowed = false
migrationRunnerRegistered = false
migrationRunnerOperational = false
migrationRegistryMutated = false
tableCreationApplied = false
tableCreated = false
repositoryWriteAllowed = false
readsWorkbenchOutputFiles = false
exposesRoute = false
loadsModelArtifact = false
executesModel = false
activatesArtifact = false
mutatesBusinessRecords = false
```

These backend safety claims remain false:

```text
modelExecutionAllowed = false
runtimeInvocationAllowed = false
inferenceEndpointExposed = false
productionIntegrationAllowed = false
decisionAutomationAllowed = false
canChangeInventoryOrAccounting = false
canChangePricing = false
canChangeReports = false
canChangeLedger = false
canMutateBusinessRecords = false
artifactExecutionAllowed = false
artifactActivationAllowed = false
artifactBytesLoadingAllowed = false
rawTrainingCsvLoadingAllowed = false
automaticDeletionAllowed = false
purgeJobAllowed = false
```

Phase 13I intentionally stops before executable migrations. A future phase may add a real guarded metadata-only migration runner only after this dry-run boundary and all backend-disconnection guards remain green.


## Phase 13J — Guarded Metadata-only Migration Apply Boundary

Phase 13J adds a guarded metadata-only migration apply boundary. It uses the Phase 13I dry-run preflight report as evidence and defines a safety gate for a future migration apply step. It does not read the `.draft.sql` file from disk at runtime, does not execute SQL, does not accept a migration apply request, does not apply a migration, does not register a migration runner, does not mutate a migration registry, does not connect to SQLite, does not create a table, does not write to a database, does not expose a route, does not execute a model, does not load artifact bytes, does not expose inference, does not activate artifacts, and does not mutate inventory/accounting/pricing/ledger/report/business records. No UI work and no governance workflow are added in this phase.

### Phase 13J files

```text
server/intelligence/mlRuntime/shadowScoreMetadataOnlyMigrationApplyBoundary.ts
server/intelligence/mlRuntime/schemas/shadow_score_metadata_only_migration_apply_boundary.schema.json
server/tests/fixtures/mlShadowScoreMigrationApplyBoundary/metadataOnlyShadowScoreMigrationApplyBoundary.valid.json
server/tests/mlShadowScoreMigrationApplyBoundaryGuard.test.mjs
docs/release/phase13j-release-readiness.json
docs/release/phase13j-manual-qa-checklist.json
```

### Phase 13J verification

```bash
npm run test:ml-shadow-score-migration-apply-boundary
npm run test:ml-shadow-score-migration-runner-dry-run
npm run test:ml-shadow-score-storage-migration-draft
npm run test:ml-shadow-score-repository-implementation-draft
npm run test:ml-shadow-score-storage-schema-draft
npm run audit:production:base
npm run audit:case-safe-imports
npm run docs:manual-qa
npm run docs:release-readiness
```

Each Phase 13J report must remain:

```text
boundaryKind = guarded_metadata_only_migration_apply_boundary
boundaryMode = safety_gate_only_no_migration_application
applyBoundaryOnly = true
migrationApplyRequested = false
migrationApplyAccepted = false
migrationApplyDecision = blocked_until_future_explicit_migration_phase
migrationApplicationAllowed = false
migrationApplicationPerformed = false
migrationRunnerRegistered = false
migrationRunnerOperational = false
migrationRegistryMutated = false
sqlTextLoadedFromDisk = false
sqlExecutionAllowed = false
databaseConnectionAllowed = false
databaseWriteAllowed = false
tableCreationApplied = false
tableCreated = false
routeExposed = false
modelExecutionAllowed = false
inferenceEndpointExposed = false
artifactActivationAllowed = false
canMutateBusinessRecords = false
```

Phase 13J intentionally stops before executable migrations. A future phase may introduce a real guarded metadata-only migration application only after this apply-boundary gate and all backend-disconnection guards remain green.


## Phase 13K — Metadata-only Migration Apply Preflight Fixture

Phase 13K adds backend metadata-only preflight fixture scenarios for a future migration apply decision. It remains a fixture-only phase and does not apply a migration.

The preflight fixture exports:

```text
buildShadowScoreMetadataOnlyMigrationApplyPreflightFixtureReport()
buildShadowScoreMetadataOnlyMigrationApplyPreflightFixtureScenarios()
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_POLICY
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_PREFLIGHT_FIXTURE_BOUNDARY
```

The fixture covers blocked scenarios only:

```text
allowed_false_baseline
blocked_by_missing_explicit_migration_phase
blocked_by_failed_dry_run
blocked_by_apply_boundary
```

Phase 13K uses the Phase 13J apply boundary report only. It does not read the `.draft.sql` file from disk, does not execute SQL, does not accept a migration apply request, does not apply a migration, does not register a migration runner, does not mutate a migration registry, does not connect to SQLite, does not create a table, does not write to the database, and does not expose a backend route.

No UI work and no governance workflow are added in Phase 13K. The Kourosh backend still does not load or execute a model, expose inference, activate artifacts, or mutate inventory/accounting/pricing/ledger/report/business records.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-preflight-fixture
```

Phase 13K intentionally stops before executable migrations. A future phase must explicitly preserve the no-inference/no-mutation boundary before any real migration application can be considered.


## Phase 13L — Metadata-only Migration Apply Eligibility Matrix

Phase 13L adds a metadata-only migration apply eligibility matrix for future migration decisions. It uses the Phase 13K preflight fixture report as source evidence and documents which preconditions must be satisfied before any future migration application can even be considered.

The eligibility matrix exports:

```text
buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixReport()
buildShadowScoreMetadataOnlyMigrationApplyEligibilityMatrixRows()
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_POLICY
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_ELIGIBILITY_MATRIX_BOUNDARY
```

The matrix rows are blocked-only. All rows remain blocked and `eligibleScenarioCount = 0` in Phase 13L:

```text
current_phase_design_only
missing_explicit_migration_phase
failed_migration_runner_dry_run
failed_apply_boundary
failed_preflight_fixture
missing_sql_execution_authorization
missing_database_connection_authorization
missing_database_write_authorization
missing_migration_registry_authorization
all_documented_preconditions_but_apply_still_disabled
```

Phase 13L uses the Phase 13K preflight fixture report only. It does not read the `.draft.sql` file from disk, does not execute SQL, does not accept a migration apply request, does not apply a migration, does not register a migration runner, does not mutate a migration registry, does not connect to SQLite, does not create a table, does not write to the database, and does not expose a backend route.

No UI work and no governance workflow are added in Phase 13L. The Kourosh backend still does not load or execute a model, expose inference, activate artifacts, or mutate inventory/accounting/pricing/ledger/report/business records.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-eligibility-matrix
```

Phase 13L intentionally stops before executable migrations. A future phase must explicitly preserve the no-inference/no-mutation boundary before any real migration application can be considered.

## Phase 13M — Metadata-only Migration Apply Risk Classification

Phase 13M adds a metadata-only migration apply risk classification for future migration decisions. It uses the Phase 13L eligibility matrix report as source evidence and classifies every blocked row by the boundary that keeps migration application disabled.

The risk classification exports:

```text
buildShadowScoreMetadataOnlyMigrationApplyRiskClassificationReport()
classifyShadowScoreMetadataOnlyMigrationApplyRiskRows()
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_POLICY
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_RISK_CLASSIFICATION_BOUNDARY
```

The classification categories are blocked-only:

```text
blocked_by_phase_boundary
blocked_by_evidence_boundary
blocked_by_apply_boundary
blocked_by_execution_boundary
blocked_by_database_boundary
blocked_by_registry_boundary
```

Every risk row remains blocked and `allowed = false`. Phase 13M does not read the `.draft.sql` file from disk, does not execute SQL, does not accept a migration apply request, does not apply a migration, does not register a migration runner, does not mutate a migration registry, does not connect to SQLite, does not create a table, does not write to the database, and does not expose a backend route.

No UI work and no governance workflow are added in Phase 13M. The Kourosh backend still does not load or execute a model, expose inference, activate artifacts, or mutate inventory/accounting/pricing/ledger/report/business records.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-risk-classification
```

Phase 13M intentionally stops before executable migrations. Risk classification is evidence only and does not change any apply eligibility decision.

## Phase 13N — Metadata-only Migration Apply Readiness Snapshot

Phase 13N adds a metadata-only migration apply readiness snapshot for future migration decisions. It summarizes the Phase 13L eligibility matrix and the Phase 13M risk classification into a single backend-only report.

The readiness snapshot exports:

```text
buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotReport()
buildShadowScoreMetadataOnlyMigrationApplyReadinessSnapshotRows()
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_POLICY
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_READINESS_SNAPSHOT_BOUNDARY
```

The readiness decisions are still blocked-only:

```text
not_ready_blocked_by_phase_boundary
not_ready_blocked_by_source_evidence_failure
not_ready_blocked_by_execution_database_or_registry_boundary
```

Every snapshot row remains blocked with `ready = false`, `allowed = false`, and `migrationApplicationAllowed = false`. Phase 13N does not read the `.draft.sql` file from disk, does not execute SQL, does not accept a migration apply request, does not apply a migration, does not register a migration runner, does not mutate a migration registry, does not connect to SQLite, does not create a table, does not write to the database, and does not expose a backend route.

No UI work and no governance workflow are added in Phase 13N. The Kourosh backend still does not load or execute a model, expose inference, activate artifacts, or mutate inventory/accounting/pricing/ledger/report/business records.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-readiness-snapshot
```

Phase 13N intentionally stops before executable migrations. Readiness snapshot evidence is backend-only metadata and does not change any apply eligibility or risk decision.

## Phase 13O — Metadata-only Migration Apply Operator Checklist

Phase 13O adds a backend-only operator checklist for a possible future metadata-only migration apply phase. It uses the Phase 13N readiness snapshot as source evidence and keeps the current project state blocked: `operatorApproved=false`, `allowed=false`, `ready=false`, and `migrationApplicationAllowed=false`.

The checklist is informational and non-executable. It includes these required, uncompleted, apply-blocking items:

- `confirm_explicit_future_migration_phase_authorized`
- `confirm_readiness_snapshot_passes`
- `confirm_all_current_rows_remain_blocked`
- `confirm_sql_execution_still_disabled`
- `confirm_database_connection_still_disabled`
- `confirm_database_write_still_disabled`
- `confirm_migration_registry_still_unchanged`
- `confirm_no_route_exposure`
- `confirm_no_model_execution`
- `confirm_no_artifact_activation`
- `confirm_no_business_mutation`

Phase 13O does not read the `.draft.sql` file from disk. It does not execute SQL. It does not apply a migration. It does not register a migration runner. It does not mutate a migration registry. It does not connect to SQLite. It does not create a table. It does not write metadata. It does not expose a backend route. It does not execute a model. It does not activate an artifact. It does not mutate inventory, accounting, pricing, ledger, reports, invoices, or business records.

No UI work and no governance workflow are added in Phase 13O. Phase 13O intentionally stops before executable migrations.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-operator-checklist
```

## Phase 13P — Metadata-only Migration Apply Operator Evidence Packet

Phase 13P adds a backend-only operator evidence packet for a possible future metadata-only migration apply phase. It packages the Phase 13O operator checklist, the Phase 13N readiness snapshot, and the Phase 13M risk classification into one evidence-only report.

The evidence packet exports:

```text
buildShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketReport()
buildShadowScoreMetadataOnlyMigrationApplyOperatorEvidencePacketItems()
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_POLICY
SHADOW_SCORE_METADATA_ONLY_MIGRATION_APPLY_OPERATOR_EVIDENCE_PACKET_BOUNDARY
```

The packet includes these non-actionable evidence items:

```text
operator_checklist_evidence
readiness_snapshot_evidence
risk_classification_evidence
```

Every evidence item remains `included=true`, `evidenceOnly=true`, `actionable=false`, `operatorApproved=false`, `allowed=false`, and `migrationApplicationAllowed=false`.

Phase 13P does not read the `.draft.sql` file from disk. It does not execute SQL. It does not apply a migration. It does not register a migration runner. It does not mutate a migration registry. It does not connect to SQLite. It does not create a table. It does not write metadata. It does not expose a backend route. It does not execute a model. It does not activate an artifact. It does not mutate inventory, accounting, pricing, ledger, reports, invoices, or business records.

No UI work and no governance workflow are added in Phase 13P. Phase 13P intentionally stops before executable migrations.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-operator-evidence-packet
```


## Phase 13Q — Metadata-only Migration Apply Evidence Diff Snapshot

Phase 13Q adds a backend-only evidence diff snapshot for a possible future metadata-only migration apply phase. It compares a baseline Phase 13P operator evidence packet and a current Phase 13P operator evidence packet in memory only.

The diff snapshot records these blocked invariants:

```text
diffSnapshotOnly=true
evidenceOnly=true
changedRowCount=0
safetyRelevantChangeCount=0
unsafeChangeDetected=false
blockedInvariantPreserved=true
migrationApplicationAllowed=false
sqlExecutionAllowed=false
databaseConnectionAllowed=false
databaseWriteAllowed=false
tableCreated=false
routeExposed=false
```

The Phase 13Q diff rows remain `diffStatus=unchanged_blocked`, `valueChanged=false`, `safetyRelevant=true`, `blockedInvariant=true`, and `migrationApplicationAllowed=false`.

Phase 13Q does not read evidence packet JSON files from disk. It does not read the `.draft.sql` file from disk. It does not execute SQL. It does not apply a migration. It does not register a migration runner. It does not mutate a migration registry. It does not connect to SQLite. It does not create a table. It does not write metadata. It does not expose a backend route. It does not execute a model. It does not activate an artifact. It does not mutate inventory, accounting, pricing, ledger, reports, invoices, or business records.

No UI work and no governance workflow are added in Phase 13Q. Phase 13Q intentionally stops before executable migrations.

## Phase 13R — Metadata-only Evidence Diff Drift Classifier

Phase 13R adds a backend-only evidence diff drift classifier for a possible future metadata-only migration apply phase. It classifies the Phase 13Q evidence diff snapshot rows in memory only.

The drift classifier records these blocked invariants:

```text
classifierKind=metadata_only_migration_apply_evidence_diff_drift_classifier
classifierMode=drift_classifier_only_no_migration_application
driftClassifierOnly=true
evidenceOnly=true
deterministicRuleBasedOnly=true
noMlClassifier=true
safeNoopDriftCount=17
blockedPolicyDriftCount=0
unsafeBoundaryDriftCount=0
unsafeDriftDetected=false
migrationApplicationAllowed=false
sqlExecutionAllowed=false
databaseConnectionAllowed=false
databaseWriteAllowed=false
tableCreated=false
routeExposed=false
```

The Phase 13R drift rows remain `driftClass=safe_noop_drift`, `driftSeverity=none`, `actionable=false`, `blockedInvariantPreserved=true`, and `migrationApplicationAllowed=false`.

Phase 13R does not load an ML classifier or model artifact. It does not read evidence diff snapshot JSON files from disk. It does not read the `.draft.sql` file from disk. It does not execute SQL. It does not apply a migration. It does not register a migration runner. It does not mutate a migration registry. It does not connect to SQLite. It does not create a table. It does not write metadata. It does not expose a backend route. It does not execute a model. It does not activate an artifact. It does not mutate inventory, accounting, pricing, ledger, reports, invoices, or business records.

No UI work and no governance workflow are added in Phase 13R. Phase 13R intentionally stops before executable migrations.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-evidence-diff-drift-classifier
```


## Phase 13S — Metadata-only Drift Classifier Stability Snapshot

Phase 13S adds a backend-only stability snapshot for the Phase 13R drift classifier. It runs the Phase 13R deterministic drift classifier three times in memory and compares the resulting classifier signatures.

The stability snapshot records these blocked invariants:

```text
stabilitySnapshotOnly=true
runCount=3
stableRunCount=3
unstableRunCount=0
unsafeRunCount=0
distinctClassifierSignatureCount=1
allRunsStable=true
classifierStabilityPreserved=true
safeNoopDriftCount=17
blockedPolicyDriftCount=0
unsafeBoundaryDriftCount=0
migrationApplicationAllowed=false
sqlExecutionAllowed=false
databaseConnectionAllowed=false
databaseWriteAllowed=false
tableCreated=false
routeExposed=false
```

Phase 13S does not load an ML classifier or model artifact. It does not read drift classifier JSON files from disk. It does not read the `.draft.sql` file from disk. It does not execute SQL. It does not apply a migration. It does not register a migration runner. It does not mutate a migration registry. It does not connect to SQLite. It does not create a table. It does not write metadata. It does not expose a backend route. It does not execute a model. It does not activate an artifact. It does not mutate inventory, accounting, pricing, ledger, reports, invoices, or business records.

No UI work and no governance workflow are added in Phase 13S. Phase 13S intentionally stops before executable migrations.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-evidence-diff-drift-stability-snapshot
```

## Phase 13T — Metadata-only Drift Stability Regression Fixture

Phase 13T adds a backend-only regression fixture for the Phase 13S drift classifier stability snapshot. It defines three deterministic, metadata-only regression scenarios for future stability checks:

```text
stable_safe_noop
unstable_but_blocked
unsafe_boundary_drift
```

The regression fixture records these blocked invariants:

```text
regressionFixtureOnly=true
scenarioCount=3
stableSafeNoopScenarioCount=1
unstableButBlockedScenarioCount=1
unsafeBoundaryDriftScenarioCount=1
blockedScenarioCount=3
actionableScenarioCount=0
migrationAllowedScenarioCount=0
sqlAllowedScenarioCount=0
databaseWriteAllowedScenarioCount=0
unsafeMigrationAllowedScenarioCount=0
allScenariosBlocked=true
allScenariosNonActionable=true
regressionFixtureValidated=true
migrationApplicationAllowed=false
sqlExecutionAllowed=false
databaseConnectionAllowed=false
databaseWriteAllowed=false
tableCreated=false
routeExposed=false
```

Phase 13T does not load an ML classifier or model artifact. It does not read stability snapshot JSON files from disk. It does not read drift classifier JSON files from disk. It does not read the `.draft.sql` file from disk. It does not execute SQL. It does not apply a migration. It does not register a migration runner. It does not mutate a migration registry. It does not connect to SQLite. It does not create a table. It does not write metadata. It does not expose a backend route. It does not execute a model. It does not activate an artifact. It does not mutate inventory, accounting, pricing, ledger, reports, invoices, or business records.

No UI work and no governance workflow are added in Phase 13T. Phase 13T intentionally stops before executable migrations.

Verification command:

```bash
npm run test:ml-shadow-score-migration-apply-evidence-diff-drift-stability-regression-fixture
```

## Phase 13U — Metadata-only Regression Fixture Coverage Summary

Phase 13U adds a backend-only coverage summary for the Phase 13T drift stability regression fixture. It accounts for which future migration apply boundaries are covered by regression fixture scenarios and which boundaries are documented-only.

The coverage summary uses the Phase 13T regression fixture report in memory only. It does not read regression fixture JSON files from disk and does not add executable migration coverage.

The coverage summary records these blocked invariants:

```text
coverageSummaryOnly=true
boundaryCount=13
regressionFixtureCoveredBoundaryCount=3
documentedOnlyBoundaryCount=10
uncoveredBoundaryCount=0
actionableBoundaryCount=0
migrationAllowedBoundaryCount=0
sqlAllowedBoundaryCount=0
databaseWriteAllowedBoundaryCount=0
routeExposedBoundaryCount=0
unsafeBoundaryCount=0
coverageComplete=true
coverageSummaryValidated=true
migrationApplicationAllowed=false
sqlExecutionAllowed=false
databaseConnectionAllowed=false
databaseWriteAllowed=false
tableCreated=false
routeExposed=false
```

Regression fixture covered rows map to `stable_safe_noop`, `unstable_but_blocked`, and `unsafe_boundary_drift`. Documented-only boundaries include `sql_execution_boundary`, `database_connection_boundary`, `database_write_boundary`, `migration_registry_boundary`, `route_exposure_boundary`, `model_execution_boundary`, `artifact_activation_boundary`, `business_mutation_boundary`, `workbench_output_file_runtime_read_boundary`, and `ui_governance_freeze_boundary`.

Phase 13U does not load an ML classifier or model artifact. It does not read regression fixture JSON files from disk. It does not read stability snapshot JSON files from disk. It does not read drift classifier JSON files from disk. It does not read the `.draft.sql` file from disk. It does not execute SQL. It does not apply a migration. It does not register a migration runner. It does not mutate a migration registry. It does not connect to SQLite. It does not create a table. It does not write metadata. It does not expose a backend route. It does not execute a model. It does not activate an artifact. It does not mutate inventory, accounting, pricing, ledger, reports, invoices, or business records.

No UI work and no governance workflow are added in Phase 13U. Phase 13U intentionally stops before executable migrations.

Verification command:

```bash
npm run test:ml-shadow-score-regression-fixture-coverage-summary
```

## Phase 14A — Guarded Metadata-only Shadow Score Storage Migration Apply

Phase 14A applies real SQLite-backed metadata-only shadow score storage in the Kourosh backend. It stores only metadata-only shadow score records in `ml_shadow_score_metadata_records` and keeps all safety boundaries non-operational.

Phase 14A does not execute models, expose inference, activate artifacts, mutate business records, add UI, or add governance workflows. The backend storage path accepts validated metadata-only fixture payloads through an internal repository/service boundary and keeps duplicate fixture inserts idempotent.

The verification command is:

```bash
npm run test:ml-shadow-score-storage-migration-apply
```

Suggested next phase only: Phase 14B — Baseline vs Candidate Shadow Score Comparison from Stored Metadata.


## Phase 14B — Baseline vs Candidate Shadow Score Comparison from Stored Metadata

Phase 14B adds a backend-only, read-only metadata comparison layer for stored shadow score records. It reads candidate records from `ml_shadow_score_metadata_records` by `candidatePackageId`, computes score distribution summaries, and can compare those records against safe metadata-only baseline records supplied to the comparison service.

The comparison layer computes candidate and baseline score summaries, entity-level score deltas where entity keys align, confidence summaries, and label agreement/disagreement summaries. If no safe baseline metadata exists, it returns `insufficient_baseline` with the candidate summary only.

Phase 14B does not execute models, expose inference, activate artifacts, mutate business records, add UI, add dashboard panels, or add governance workflows. It does not run the Python workbench, load model binaries, or read raw train/test CSV files.
