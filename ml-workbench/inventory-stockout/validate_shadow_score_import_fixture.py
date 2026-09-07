#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from _workbench_common import FORBIDDEN_OUTPUT_FIELDS, update_output_checksums, utc_now, read_json, write_json

CONTRACT_VERSION = "phase13c-v1"
FIXTURE_KIND = "metadata_only_shadow_score_import_fixture"
CHECKSUM_ARTIFACTS = ["shadow_score_import_fixture_validation_report.json"]

REQUIRED_TOP_LEVEL_FIELDS = {
    "contractVersion",
    "fixtureKind",
    "candidatePackageId",
    "modelKey",
    "modelVersion",
    "predictionType",
    "horizonDays",
    "generatedAt",
    "workbenchVersion",
    "source",
    "recordCount",
    "importMode",
    "evidenceOnly",
    "productionReadinessClaim",
    "backendInferenceClaim",
    "artifactActivationClaim",
    "businessMutationClaim",
    "backendImportPolicy",
    "safetyPolicy",
    "records",
    "warnings",
    "errors",
}

ALLOWED_RECORD_FIELDS = {
    "importRecordId",
    "shadowScoreId",
    "entityType",
    "entityId",
    "predictionType",
    "horizonDays",
    "candidateScore",
    "candidateLabel",
    "candidateConfidence",
    "scoreQuality",
    "modelKey",
    "modelVersion",
    "candidatePackageId",
    "sourceRowIndex",
    "sourceShadowRecordIndex",
    "sourceExportRecordHash",
    "scoreGeneratedAt",
    "exportGeneratedAt",
    "importFixtureGeneratedAt",
    "storageClass",
    "evidenceOnly",
    "backendAction",
    "importEligibility",
    "importBlockedReasons",
    "automationAllowed",
    "businessMutationAllowed",
    "inventoryMutationAllowed",
    "accountingMutationAllowed",
    "pricingMutationAllowed",
    "ledgerMutationAllowed",
    "reportMutationAllowed",
    "artifactActivationAllowed",
    "modelExecutionAllowed",
    "inferenceEndpointExposed",
    "safetyNotes",
}

FORBIDDEN_FIELDS = FORBIDDEN_OUTPUT_FIELDS | {
    "modelBinary",
    "modelBytes",
    "artifactBytes",
    "artifactPayload",
    "binaryPayload",
    "serializedModel",
    "base64Model",
    "picklePayload",
    "executableArtifactBytes",
    "activationDirective",
    "productionDecisionDirective",
    "backendExecutionDirective",
    "runtimeExecutionDirective",
    "inferenceRequest",
    "livePredictionRequest",
    "productionScoringRequest",
    "trainModelRequest",
    "fitModelRequest",
    "artifactActivationRequest",
    "businessMutationRequest",
}

FALSE_ONLY_FLAGS = {
    "modelExecutionAllowed",
    "runtimeInvocationAllowed",
    "inferenceEndpointExposed",
    "productionIntegrationAllowed",
    "decisionAutomationAllowed",
    "canChangeInventoryOrAccounting",
    "canChangePricing",
    "canChangeReports",
    "canChangeLedger",
    "canMutateBusinessRecords",
    "artifactExecutionAllowed",
    "artifactActivationAllowed",
    "artifactBytesLoadingAllowed",
    "rawTrainingCsvLoadingAllowed",
    "automaticDeletionAllowed",
    "purgeJobAllowed",
    "backendModelExecutionAllowed",
    "backendInferenceEndpointExposed",
    "artifactBytesLoadingAllowedInBackend",
    "rawTrainingCsvLoadingAllowedInBackend",
    "backendMayStoreModelBytes",
    "backendMayExecuteModel",
    "backendMayCallInferenceRuntime",
    "backendMayMutateBusinessRecords",
    "backendMayCreateOperationalDecision",
    "automationAllowed",
    "businessMutationAllowed",
    "inventoryMutationAllowed",
    "accountingMutationAllowed",
    "pricingMutationAllowed",
    "ledgerMutationAllowed",
    "reportMutationAllowed",
}


def _is_number_or_none(value: Any) -> bool:
    return value is None or (isinstance(value, (int, float)) and not isinstance(value, bool))


def _find_forbidden_fields(value: Any, path: str = "$", findings: list[str] | None = None) -> list[str]:
    findings = findings or []
    if isinstance(value, dict):
        for key, item in value.items():
            current = f"{path}.{key}"
            if key in FORBIDDEN_FIELDS:
                findings.append(current)
            if key in FALSE_ONLY_FLAGS and item is True:
                findings.append(current)
            _find_forbidden_fields(item, current, findings)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _find_forbidden_fields(item, f"{path}[{index}]", findings)
    return findings


def _validate_schema(payload: Any) -> tuple[list[str], list[str], int]:
    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(payload, dict):
        return ["Shadow score import fixture must be a JSON object."], warnings, 0

    missing_top = sorted(REQUIRED_TOP_LEVEL_FIELDS - set(payload.keys()))
    extra_top = sorted(set(payload.keys()) - REQUIRED_TOP_LEVEL_FIELDS)
    if missing_top:
        errors.append("Missing top-level field(s): " + ", ".join(missing_top))
    if extra_top:
        errors.append("Unexpected top-level field(s): " + ", ".join(extra_top))
    if payload.get("contractVersion") != CONTRACT_VERSION:
        errors.append(f"contractVersion must be {CONTRACT_VERSION}.")
    if payload.get("fixtureKind") != FIXTURE_KIND:
        errors.append(f"fixtureKind must be {FIXTURE_KIND}.")
    if payload.get("importMode") != "metadata_only_fixture":
        errors.append("importMode must be metadata_only_fixture.")
    if payload.get("evidenceOnly") is not True:
        errors.append("evidenceOnly must be true.")
    for field, expected in (
        ("productionReadinessClaim", "not_approved_for_production"),
        ("backendInferenceClaim", "not_exposed"),
        ("artifactActivationClaim", "not_activated"),
        ("businessMutationClaim", "not_allowed"),
    ):
        if payload.get(field) != expected:
            errors.append(f"{field} must be {expected}.")

    records = payload.get("records")
    if not isinstance(records, list):
        errors.append("records must be an array.")
        return errors, warnings, 0

    seen_ids: set[str] = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            errors.append(f"records[{index}] must be an object.")
            continue
        missing = sorted(ALLOWED_RECORD_FIELDS - set(record.keys()))
        extra = sorted(set(record.keys()) - ALLOWED_RECORD_FIELDS)
        if missing:
            errors.append(f"records[{index}] missing field(s): " + ", ".join(missing))
        if extra:
            errors.append(f"records[{index}] has unexpected field(s): " + ", ".join(extra))
        for text_field in ("importRecordId", "shadowScoreId", "entityType", "entityId", "predictionType", "candidateLabel", "scoreQuality", "modelKey", "modelVersion", "candidatePackageId", "storageClass", "backendAction", "importEligibility"):
            if not isinstance(record.get(text_field), str) or not str(record.get(text_field)).strip():
                errors.append(f"records[{index}].{text_field} must be a non-empty string.")
        import_id = str(record.get("importRecordId") or "")
        if import_id in seen_ids:
            errors.append(f"records[{index}].importRecordId is duplicated: {import_id}")
        seen_ids.add(import_id)
        if record.get("storageClass") != "metadata_only_shadow_score_import_fixture":
            errors.append(f"records[{index}].storageClass must be metadata_only_shadow_score_import_fixture.")
        if record.get("backendAction") != "validate_and_store_metadata_only_when_future_import_exists":
            errors.append(f"records[{index}].backendAction must remain a metadata-only future validation/storage action.")
        if record.get("importEligibility") != "eligible_for_metadata_only_import":
            errors.append(f"records[{index}].importEligibility must be eligible_for_metadata_only_import.")
        if record.get("evidenceOnly") is not True:
            errors.append(f"records[{index}].evidenceOnly must be true.")
        if not _is_number_or_none(record.get("candidateScore")):
            warnings.append(f"records[{index}].candidateScore is not numeric or null.")
        if not _is_number_or_none(record.get("candidateConfidence")):
            errors.append(f"records[{index}].candidateConfidence must be numeric or null.")
        confidence = record.get("candidateConfidence")
        if isinstance(confidence, (int, float)) and not 0 <= confidence <= 1:
            errors.append(f"records[{index}].candidateConfidence must be between 0 and 1.")
        if not isinstance(record.get("sourceShadowRecordIndex"), int):
            errors.append(f"records[{index}].sourceShadowRecordIndex must be an integer.")
        if not isinstance(record.get("sourceExportRecordHash"), str) or len(record.get("sourceExportRecordHash", "")) < 12:
            errors.append(f"records[{index}].sourceExportRecordHash must be a stable hash string.")
        for flag in FALSE_ONLY_FLAGS:
            if record.get(flag) is True:
                errors.append(f"records[{index}].{flag} must not be true.")
        if not isinstance(record.get("importBlockedReasons"), list):
            errors.append(f"records[{index}].importBlockedReasons must be an array.")
        if not isinstance(record.get("safetyNotes"), list) or any(not isinstance(note, str) for note in record.get("safetyNotes", [])):
            errors.append(f"records[{index}].safetyNotes must be an array of strings.")

    if not isinstance(payload.get("recordCount"), int):
        errors.append("recordCount must be an integer.")
    elif payload.get("recordCount") != len(records):
        errors.append(f"recordCount {payload.get('recordCount')} does not match records length {len(records)}.")

    source = payload.get("source")
    if not isinstance(source, dict):
        errors.append("source must be an object.")
    else:
        if source.get("shadowExportValidationStatus") not in {"pass", "warning"}:
            errors.append("source.shadowExportValidationStatus must be pass or warning before import fixture can be accepted.")
        if not source.get("shadowExportSha256"):
            errors.append("source.shadowExportSha256 must be present.")

    safety = payload.get("safetyPolicy")
    if not isinstance(safety, dict):
        errors.append("safetyPolicy must be an object.")
    else:
        for flag in FALSE_ONLY_FLAGS:
            if safety.get(flag) is True:
                errors.append(f"safetyPolicy.{flag} must not be true.")
    policy = payload.get("backendImportPolicy")
    if not isinstance(policy, dict):
        errors.append("backendImportPolicy must be an object.")
    else:
        for field in (
            "backendAcceptableAsMetadataOnlyFixture",
            "backendMustValidateBeforeStorage",
            "backendMustNotLoadModelArtifact",
            "backendMustNotExecuteModel",
            "backendMustNotExposeInference",
            "backendMustNotActivateArtifact",
            "backendMustNotMutateBusinessRecords",
            "backendMustNotApplyOperationalDecision",
            "backendMustTreatAsEvidenceOnly",
        ):
            if policy.get(field) is not True:
                errors.append(f"backendImportPolicy.{field} must be true.")
    if payload.get("errors"):
        errors.append("shadow_score_import_fixture.json contains builder errors: " + "; ".join(str(item) for item in payload.get("errors") or []))
    if not payload.get("generatedAt"):
        errors.append("generatedAt must be present.")

    return errors, warnings, len(records)


def validate_shadow_score_import_fixture(import_fixture: Path, output_dir: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    record_count = 0
    forbidden_findings: list[str] = []

    if not import_fixture.exists():
        errors.append(f"Shadow score import fixture does not exist: {import_fixture}")
        payload: Any = {}
    else:
        try:
            payload = read_json(import_fixture)
        except Exception as exc:
            errors.append(f"Shadow score import fixture is not valid JSON object: {exc}")
            payload = {}

    schema_errors, schema_warnings, record_count = _validate_schema(payload)
    errors.extend(schema_errors)
    warnings.extend(schema_warnings)
    forbidden_findings = _find_forbidden_fields(payload)
    if forbidden_findings:
        errors.append("Forbidden mutation/execution/activation/directive field(s) found: " + ", ".join(forbidden_findings))

    status = "fail" if errors else "warning" if warnings else "pass"
    report = {
        "status": status,
        "contractVersion": CONTRACT_VERSION,
        "recordCount": record_count,
        "warningCount": len(warnings),
        "errorCount": len(errors),
        "forbiddenFieldCount": len(forbidden_findings),
        "warnings": warnings,
        "errors": errors,
        "generatedAt": utc_now(),
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "shadow_score_import_fixture_validation_report.json", report)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a Phase 13C metadata-only shadow score import fixture.")
    parser.add_argument("--import-fixture", required=True, help="Path to shadow_score_import_fixture.json.")
    parser.add_argument("--output-dir", required=True, help="Output directory for shadow_score_import_fixture_validation_report.json.")
    args = parser.parse_args()
    report = validate_shadow_score_import_fixture(import_fixture=Path(args.import_fixture), output_dir=Path(args.output_dir))
    print(f"Shadow score import fixture validation status: {report['status']}")
    print(f"Records: {report['recordCount']}; warnings: {report['warningCount']}; errors: {report['errorCount']}")
    if report.get("errors"):
        print("Errors:")
        for item in report["errors"]:
            print(f"- {item}")
    if report.get("warnings"):
        print("Warnings:")
        for item in report["warnings"]:
            print(f"- {item}")
    return 0 if report["status"] in {"pass", "warning"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
