#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from _workbench_common import (
    FORBIDDEN_OUTPUT_FIELDS,
    update_output_checksums,
    utc_now,
    read_json,
    write_json,
)

CONTRACT_VERSION = "phase13b-v1"
EXPORT_KIND = "offline_shadow_score_metadata_export"
CHECKSUM_ARTIFACTS = ["offline_shadow_score_export_validation_report.json"]

REQUIRED_TOP_LEVEL_FIELDS = {
    "contractVersion",
    "exportKind",
    "candidatePackageId",
    "modelKey",
    "modelVersion",
    "predictionType",
    "horizonDays",
    "generatedAt",
    "workbenchVersion",
    "source",
    "backendImportPolicy",
    "safetyPolicy",
    "summary",
    "recordCount",
    "records",
    "warnings",
    "errors",
    "evidenceOnly",
    "productionReadinessClaim",
    "backendInferenceClaim",
    "artifactActivationClaim",
    "businessMutationClaim",
}

ALLOWED_RECORD_FIELDS = {
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
    "scoreGeneratedAt",
    "exportGeneratedAt",
    "storageClass",
    "evidenceOnly",
    "backendAction",
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
        return ["Offline shadow score export must be a JSON object."], warnings, 0

    missing_top = sorted(REQUIRED_TOP_LEVEL_FIELDS - set(payload.keys()))
    extra_top = sorted(set(payload.keys()) - REQUIRED_TOP_LEVEL_FIELDS)
    if missing_top:
        errors.append("Missing top-level field(s): " + ", ".join(missing_top))
    if extra_top:
        errors.append("Unexpected top-level field(s): " + ", ".join(extra_top))
    if payload.get("contractVersion") != CONTRACT_VERSION:
        errors.append(f"contractVersion must be {CONTRACT_VERSION}.")
    if payload.get("exportKind") != EXPORT_KIND:
        errors.append(f"exportKind must be {EXPORT_KIND}.")
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
        for text_field in ("shadowScoreId", "entityType", "entityId", "predictionType", "candidateLabel", "modelKey", "modelVersion", "candidatePackageId", "storageClass", "backendAction"):
            if not isinstance(record.get(text_field), str) or not str(record.get(text_field)).strip():
                errors.append(f"records[{index}].{text_field} must be a non-empty string.")
        if record.get("storageClass") != "metadata_only_shadow_score":
            errors.append(f"records[{index}].storageClass must be metadata_only_shadow_score.")
        if record.get("backendAction") != "none":
            errors.append(f"records[{index}].backendAction must be none.")
        if record.get("evidenceOnly") is not True:
            errors.append(f"records[{index}].evidenceOnly must be true.")
        if not _is_number_or_none(record.get("candidateScore")):
            warnings.append(f"records[{index}].candidateScore is not numeric or null.")
        if not _is_number_or_none(record.get("candidateConfidence")):
            errors.append(f"records[{index}].candidateConfidence must be numeric or null.")
        confidence = record.get("candidateConfidence")
        if isinstance(confidence, (int, float)) and not 0 <= confidence <= 1:
            errors.append(f"records[{index}].candidateConfidence must be between 0 and 1.")
        score = record.get("candidateScore")
        if isinstance(score, (int, float)) and not 0 <= score <= 1:
            warnings.append(f"records[{index}].candidateScore is outside 0..1; keep as metadata but review calibration.")
        for flag in FALSE_ONLY_FLAGS:
            if record.get(flag) is True:
                errors.append(f"records[{index}].{flag} must not be true.")
        if not isinstance(record.get("safetyNotes"), list) or any(not isinstance(note, str) for note in record.get("safetyNotes", [])):
            errors.append(f"records[{index}].safetyNotes must be an array of strings.")

    if not isinstance(payload.get("recordCount"), int):
        errors.append("recordCount must be an integer.")
    elif payload.get("recordCount") != len(records):
        errors.append(f"recordCount {payload.get('recordCount')} does not match records length {len(records)}.")

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
            "backendMustNotLoadModelArtifact",
            "backendMustNotExecuteModel",
            "backendMustNotExposeInference",
            "backendMustNotActivateArtifact",
            "backendMustNotMutateBusinessRecords",
            "backendMustTreatAsEvidenceOnly",
        ):
            if policy.get(field) is not True:
                errors.append(f"backendImportPolicy.{field} must be true.")
    if not payload.get("generatedAt"):
        errors.append("generatedAt must be present.")

    return errors, warnings, len(records)


def validate_offline_shadow_score_export(export_path: Path, output_dir: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    record_count = 0
    forbidden_findings: list[str] = []

    if not export_path.exists():
        errors.append(f"Offline shadow score export does not exist: {export_path}")
        payload: Any = {}
    else:
        try:
            payload = read_json(export_path)
        except Exception as exc:
            errors.append(f"Offline shadow score export is not valid JSON object: {exc}")
            payload = {}

    schema_errors, schema_warnings, record_count = _validate_schema(payload)
    errors.extend(schema_errors)
    warnings.extend(schema_warnings)
    forbidden_findings = _find_forbidden_fields(payload)
    if forbidden_findings:
        errors.append("Forbidden mutation/execution/activation/directive field(s) found: " + ", ".join(forbidden_findings))

    if isinstance(payload, dict):
        source = payload.get("source") or {}
        if isinstance(source, dict) and source.get("scoreValidationStatus") not in {"pass", "warning"}:
            errors.append("source.scoreValidationStatus must be pass or warning before shadow export can be accepted.")
        if payload.get("errors"):
            errors.append("offline_shadow_score_export.json contains exporter errors: " + "; ".join(str(item) for item in payload.get("errors") or []))

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
    write_json(output_dir / "offline_shadow_score_export_validation_report.json", report)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a Phase 13B metadata-only offline shadow score export contract.")
    parser.add_argument("--shadow-export", required=True, help="Path to offline_shadow_score_export.json.")
    parser.add_argument("--output-dir", required=True, help="Output directory for offline_shadow_score_export_validation_report.json.")
    args = parser.parse_args()
    report = validate_offline_shadow_score_export(export_path=Path(args.shadow_export), output_dir=Path(args.output_dir))
    print(f"Offline shadow score export validation status: {report['status']}")
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
