#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any

from _workbench_common import (
    EXTENDED_SAFETY_RESTRICTIONS,
    FORBIDDEN_OUTPUT_FIELDS,
    WORKBENCH_VERSION,
    sha256_file,
    short_hash,
    update_output_checksums,
    utc_now,
    read_json,
    write_json,
)

CONTRACT_VERSION = "phase13c-v1"
FIXTURE_KIND = "metadata_only_shadow_score_import_fixture"
CHECKSUM_ARTIFACTS = [
    "shadow_score_import_fixture.json",
    "shadow_score_import_fixture.csv",
    "shadow_score_import_fixture_manifest.json",
]

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

BACKEND_METADATA_ONLY_IMPORT_POLICY = {
    "backendAcceptableAsMetadataOnlyFixture": True,
    "backendImportType": "metadata_only_shadow_score_fixture",
    "backendMustValidateBeforeStorage": True,
    "backendMustNotLoadModelArtifact": True,
    "backendMustNotExecuteModel": True,
    "backendMustNotExposeInference": True,
    "backendMustNotActivateArtifact": True,
    "backendMustNotMutateBusinessRecords": True,
    "backendMustNotApplyOperationalDecision": True,
    "backendMustTreatAsEvidenceOnly": True,
    "backendMayStoreOnlyValidatedMetadataInFuturePhase": True,
}

SAFETY_POLICY = {
    **EXTENDED_SAFETY_RESTRICTIONS,
    "modelExecutionAllowed": False,
    "runtimeInvocationAllowed": False,
    "inferenceEndpointExposed": False,
    "artifactExecutionAllowed": False,
    "artifactActivationAllowed": False,
    "artifactBytesLoadingAllowed": False,
    "rawTrainingCsvLoadingAllowed": False,
    "backendMayStoreModelBytes": False,
    "backendMayExecuteModel": False,
    "backendMayCallInferenceRuntime": False,
    "backendMayMutateBusinessRecords": False,
    "backendMayCreateOperationalDecision": False,
}

FORBIDDEN_IMPORT_FIELDS = FORBIDDEN_OUTPUT_FIELDS | {
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
    "set_stock",
    "change_price",
    "approve_purchase",
    "create_invoice",
    "mutate_ledger",
    "auto_order",
    "delete_record",
    "production_action",
    "auto_decision",
    "activate_artifact",
    "deploy_model",
    "write_inventory",
    "write_accounting",
    "write_ledger",
    "write_report",
}


def _as_number_or_none(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _find_forbidden_fields(value: Any, path: str = "$", findings: list[str] | None = None) -> list[str]:
    findings = findings or []
    if isinstance(value, dict):
        for key, item in value.items():
            current = f"{path}.{key}"
            if key in FORBIDDEN_IMPORT_FIELDS:
                findings.append(current)
            if key in FALSE_ONLY_FLAGS and item is True:
                findings.append(current)
            _find_forbidden_fields(item, current, findings)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _find_forbidden_fields(item, f"{path}[{index}]", findings)
    return findings


def _record_hash(record: dict[str, Any]) -> str:
    basis = "|".join(str(record.get(key, "")) for key in (
        "shadowScoreId",
        "entityType",
        "entityId",
        "predictionType",
        "horizonDays",
        "candidateScore",
        "candidateLabel",
        "candidateConfidence",
        "modelKey",
        "modelVersion",
        "candidatePackageId",
        "sourceRowIndex",
    ))
    return short_hash(basis, 24)


def _build_import_records(shadow_export: dict[str, Any], generated_at: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for index, source in enumerate(shadow_export.get("records") or []):
        if not isinstance(source, dict):
            continue
        source_hash = _record_hash(source)
        import_key = f"{shadow_export.get('candidatePackageId')}|{source.get('shadowScoreId')}|{source_hash}|{index}"
        records.append({
            "importRecordId": "shadow-import-fixture-" + short_hash(import_key, 18),
            "shadowScoreId": str(source.get("shadowScoreId") or f"offline-shadow-score-{index}"),
            "entityType": str(source.get("entityType") or "product"),
            "entityId": str(source.get("entityId") or f"offline-row-{index}"),
            "predictionType": str(source.get("predictionType") or shadow_export.get("predictionType") or "unknown"),
            "horizonDays": source.get("horizonDays", shadow_export.get("horizonDays")),
            "candidateScore": _as_number_or_none(source.get("candidateScore")),
            "candidateLabel": str(source.get("candidateLabel") or "unknown"),
            "candidateConfidence": _as_number_or_none(source.get("candidateConfidence")),
            "scoreQuality": str(source.get("scoreQuality") or "unknown"),
            "modelKey": str(source.get("modelKey") or shadow_export.get("modelKey") or "unknown"),
            "modelVersion": str(source.get("modelVersion") or shadow_export.get("modelVersion") or "unknown"),
            "candidatePackageId": str(source.get("candidatePackageId") or shadow_export.get("candidatePackageId") or "unknown"),
            "sourceRowIndex": int(source.get("sourceRowIndex") if str(source.get("sourceRowIndex", "")).isdigit() else index),
            "sourceShadowRecordIndex": index,
            "sourceExportRecordHash": source_hash,
            "scoreGeneratedAt": str(source.get("scoreGeneratedAt") or shadow_export.get("generatedAt") or generated_at),
            "exportGeneratedAt": str(source.get("exportGeneratedAt") or shadow_export.get("generatedAt") or generated_at),
            "importFixtureGeneratedAt": generated_at,
            "storageClass": "metadata_only_shadow_score_import_fixture",
            "evidenceOnly": True,
            "backendAction": "validate_and_store_metadata_only_when_future_import_exists",
            "importEligibility": "eligible_for_metadata_only_import",
            "importBlockedReasons": [],
            "automationAllowed": False,
            "businessMutationAllowed": False,
            "inventoryMutationAllowed": False,
            "accountingMutationAllowed": False,
            "pricingMutationAllowed": False,
            "ledgerMutationAllowed": False,
            "reportMutationAllowed": False,
            "artifactActivationAllowed": False,
            "modelExecutionAllowed": False,
            "inferenceEndpointExposed": False,
            "safetyNotes": [
                "Metadata-only shadow score import fixture.",
                "Prepared for future backend validation/storage only; this phase performs no backend import.",
                "No inference, artifact activation, automation, or business mutation is permitted.",
            ],
        })
    return records


def _write_csv(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
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
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for record in records:
            writer.writerow({field: record.get(field) for field in fields})


def build_shadow_score_import_fixture(
    *,
    shadow_export: Path,
    shadow_validation_report: Path,
    shadow_export_report: Path,
    output_dir: Path,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    generated_at = utc_now()
    warnings: list[str] = []
    errors: list[str] = []

    if not shadow_export.exists():
        raise FileNotFoundError(f"Missing offline shadow score export: {shadow_export}")
    export_payload = read_json(shadow_export)

    validation_payload: dict[str, Any] = {}
    if shadow_validation_report.exists():
        validation_payload = read_json(shadow_validation_report)
        if validation_payload.get("status") not in {"pass", "warning"}:
            errors.append("Shadow score export validation status must be pass or warning before building import fixture.")
    else:
        warnings.append(f"Shadow score export validation report not found: {shadow_validation_report}")

    export_report_payload: dict[str, Any] = {}
    if shadow_export_report.exists():
        export_report_payload = read_json(shadow_export_report)
        if export_report_payload.get("validationStatus") not in {"pass", "warning"} and export_report_payload.get("exportStatus") not in {"offline_shadow_score_export_validated", "offline_shadow_score_export_warning"}:
            warnings.append("Shadow score export report status could not be confirmed as validated/warning.")
    else:
        warnings.append(f"Shadow score export report not found: {shadow_export_report}")

    forbidden_findings = _find_forbidden_fields(export_payload)
    if forbidden_findings:
        errors.append("Source shadow export contains forbidden execution/mutation fields: " + ", ".join(forbidden_findings))

    records = _build_import_records(export_payload, generated_at)
    source_hash = sha256_file(shadow_export)
    fixture = {
        "contractVersion": CONTRACT_VERSION,
        "fixtureKind": FIXTURE_KIND,
        "candidatePackageId": str(export_payload.get("candidatePackageId") or "unknown"),
        "modelKey": str(export_payload.get("modelKey") or "unknown"),
        "modelVersion": str(export_payload.get("modelVersion") or "unknown"),
        "predictionType": str(export_payload.get("predictionType") or "unknown"),
        "horizonDays": export_payload.get("horizonDays"),
        "generatedAt": generated_at,
        "workbenchVersion": WORKBENCH_VERSION,
        "source": {
            "shadowExportPath": str(shadow_export),
            "shadowExportSha256": source_hash,
            "shadowExportValidationStatus": validation_payload.get("status", "unknown"),
            "shadowExportReportStatus": export_report_payload.get("exportStatus") or export_report_payload.get("validationStatus") or "unknown",
            "sourceRecordCount": export_payload.get("recordCount"),
        },
        "recordCount": len(records),
        "importMode": "metadata_only_fixture",
        "evidenceOnly": True,
        "productionReadinessClaim": "not_approved_for_production",
        "backendInferenceClaim": "not_exposed",
        "artifactActivationClaim": "not_activated",
        "businessMutationClaim": "not_allowed",
        "backendImportPolicy": BACKEND_METADATA_ONLY_IMPORT_POLICY,
        "safetyPolicy": SAFETY_POLICY,
        "records": records,
        "warnings": warnings,
        "errors": errors,
    }

    fixture_forbidden = _find_forbidden_fields(fixture)
    if fixture_forbidden:
        fixture["errors"].append("Generated import fixture contains forbidden execution/mutation fields: " + ", ".join(fixture_forbidden))

    write_json(output_dir / "shadow_score_import_fixture.json", fixture)
    _write_csv(output_dir / "shadow_score_import_fixture.csv", records)
    manifest = {
        "contractVersion": CONTRACT_VERSION,
        "fixtureKind": FIXTURE_KIND,
        "generatedAt": generated_at,
        "recordCount": len(records),
        "sourceShadowExportSha256": source_hash,
        "outputs": {
            "json": "shadow_score_import_fixture.json",
            "csv": "shadow_score_import_fixture.csv",
        },
        "safetyPolicy": SAFETY_POLICY,
        "backendImportPolicy": BACKEND_METADATA_ONLY_IMPORT_POLICY,
    }
    write_json(output_dir / "shadow_score_import_fixture_manifest.json", manifest)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)
    return fixture


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a Phase 13C metadata-only shadow score import fixture from a validated Phase 13B export.")
    parser.add_argument("--shadow-export", required=True, help="Path to offline_shadow_score_export.json.")
    parser.add_argument("--shadow-validation-report", required=True, help="Path to offline_shadow_score_export_validation_report.json.")
    parser.add_argument("--shadow-export-report", required=True, help="Path to offline_shadow_score_export_report.json.")
    parser.add_argument("--output-dir", required=True, help="Output directory for shadow_score_import_fixture files.")
    args = parser.parse_args()
    fixture = build_shadow_score_import_fixture(
        shadow_export=Path(args.shadow_export),
        shadow_validation_report=Path(args.shadow_validation_report),
        shadow_export_report=Path(args.shadow_export_report),
        output_dir=Path(args.output_dir),
    )
    print("Shadow score import fixture generated.")
    print(f"Records: {fixture['recordCount']}; warnings: {len(fixture['warnings'])}; errors: {len(fixture['errors'])}")
    if fixture.get("errors"):
        print("Errors:")
        for item in fixture["errors"]:
            print(f"- {item}")
    if fixture.get("warnings"):
        print("Warnings:")
        for item in fixture["warnings"]:
            print(f"- {item}")
    return 0 if not fixture.get("errors") else 1


if __name__ == "__main__":
    raise SystemExit(main())
