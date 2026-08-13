#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from statistics import mean
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

CONTRACT_VERSION = "phase13b-v1"
EXPORT_KIND = "offline_shadow_score_metadata_export"
CHECKSUM_ARTIFACTS = [
    "offline_shadow_score_export.json",
    "offline_shadow_score_export.csv",
    "offline_shadow_score_export_manifest.json",
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
}

BACKEND_METADATA_ONLY_POLICY = {
    **EXTENDED_SAFETY_RESTRICTIONS,
    "modelExecutionAllowed": False,
    "runtimeInvocationAllowed": False,
    "inferenceEndpointExposed": False,
    "artifactExecutionAllowed": False,
    "artifactActivationAllowed": False,
    "artifactBytesLoadingAllowed": False,
    "rawTrainingCsvLoadingAllowed": False,
    "backendMetadataOnlyImportCompatible": True,
    "backendMayStoreModelBytes": False,
    "backendMayExecuteModel": False,
    "backendMayCallInferenceRuntime": False,
    "backendMayMutateBusinessRecords": False,
    "backendMayCreateOperationalDecision": False,
}

FORBIDDEN_EXPORT_FIELDS = FORBIDDEN_OUTPUT_FIELDS | {
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


def _as_number_or_none(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _score_quality(score: float | None, confidence: float | None) -> str:
    basis = confidence if confidence is not None else score
    if basis is None:
        return "score_unavailable"
    if basis >= 0.8:
        return "high"
    if basis >= 0.5:
        return "medium"
    return "low"


def _entity_type(prediction_type: str) -> str:
    text = prediction_type.lower()
    if "phone" in text:
        return "phone"
    if "cashflow" in text or "store" in text:
        return "store"
    return "product"


def _find_forbidden_fields(value: Any, path: str = "$", findings: list[str] | None = None) -> list[str]:
    findings = findings or []
    if isinstance(value, dict):
        for key, item in value.items():
            current = f"{path}.{key}"
            if key in FORBIDDEN_EXPORT_FIELDS:
                findings.append(current)
            if key in FALSE_ONLY_FLAGS and item is True:
                findings.append(current)
            _find_forbidden_fields(item, current, findings)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _find_forbidden_fields(item, f"{path}[{index}]", findings)
    return findings


def _build_shadow_records(score_payload: dict[str, Any], generated_at: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    candidate_package_id = str(score_payload.get("candidatePackageId") or "unknown")
    model_key = str(score_payload.get("modelKey") or "unknown")
    model_version = str(score_payload.get("modelVersion") or "unknown")
    prediction_type = str(score_payload.get("predictionType") or "unknown")
    default_horizon = score_payload.get("horizonDays")
    entity_type = _entity_type(prediction_type)

    for index, row in enumerate(score_payload.get("scores") or []):
        if not isinstance(row, dict):
            continue
        entity_id = str(row.get("entityId") or f"offline-row-{index}")
        source_row_index = row.get("sourceRowIndex", index)
        score = _as_number_or_none(row.get("score"))
        confidence = _as_number_or_none(row.get("confidence"))
        record_key = f"{candidate_package_id}|{model_key}|{model_version}|{prediction_type}|{entity_id}|{source_row_index}"
        records.append({
            "shadowScoreId": "offline-shadow-score-" + short_hash(record_key, 16),
            "entityType": entity_type,
            "entityId": entity_id,
            "predictionType": str(row.get("predictionType") or prediction_type),
            "horizonDays": row.get("horizonDays", default_horizon),
            "candidateScore": score,
            "candidateLabel": str(row.get("label") or "unknown"),
            "candidateConfidence": confidence,
            "scoreQuality": _score_quality(score, confidence),
            "modelKey": str(row.get("modelKey") or model_key),
            "modelVersion": str(row.get("modelVersion") or model_version),
            "candidatePackageId": str(row.get("candidatePackageId") or candidate_package_id),
            "sourceRowIndex": int(source_row_index) if isinstance(source_row_index, int) or str(source_row_index).isdigit() else index,
            "scoreGeneratedAt": str(row.get("generatedAt") or score_payload.get("generatedAt") or generated_at),
            "exportGeneratedAt": generated_at,
            "storageClass": "metadata_only_shadow_score",
            "evidenceOnly": True,
            "backendAction": "none",
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
                "Offline shadow score metadata only.",
                "Not a production decision or recommendation.",
                "No backend model execution, inference endpoint, artifact activation, or business mutation is permitted.",
            ],
        })
    return records


def _score_summary(records: list[dict[str, Any]]) -> dict[str, Any]:
    scores = [record["candidateScore"] for record in records if isinstance(record.get("candidateScore"), (int, float))]
    confidences = [record["candidateConfidence"] for record in records if isinstance(record.get("candidateConfidence"), (int, float))]
    labels: dict[str, int] = {}
    for record in records:
        label = str(record.get("candidateLabel") or "unknown")
        labels[label] = labels.get(label, 0) + 1
    return {
        "scoreCount": len(scores),
        "scoreMin": min(scores) if scores else None,
        "scoreMax": max(scores) if scores else None,
        "scoreMean": mean(scores) if scores else None,
        "confidenceCount": len(confidences),
        "confidenceMin": min(confidences) if confidences else None,
        "confidenceMax": max(confidences) if confidences else None,
        "confidenceMean": mean(confidences) if confidences else None,
        "labelDistribution": dict(sorted(labels.items())),
    }


def _write_csv(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
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
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for record in records:
            writer.writerow({field: record.get(field) for field in fields})


def export_offline_shadow_scores(
    *,
    score_output: Path,
    validation_report: Path,
    execution_report: Path,
    output_dir: Path,
) -> dict[str, Any]:
    score_payload = read_json(score_output)
    validation_payload = read_json(validation_report)
    execution_payload = read_json(execution_report) if execution_report.exists() else {}
    generated_at = utc_now()

    warnings: list[str] = []
    errors: list[str] = []
    validation_status = str(validation_payload.get("status") or "unknown")
    execution_status = str(execution_payload.get("executionStatus") or "unknown")
    if validation_status not in {"pass", "warning"}:
        errors.append(f"Candidate score output validation status is not exportable: {validation_status}")
    if validation_status == "warning":
        warnings.append("Candidate score output validation completed with warnings; export remains metadata-only.")
    warnings.extend(str(item) for item in validation_payload.get("warnings") or [])
    errors.extend(str(item) for item in validation_payload.get("errors") or [])

    records = _build_shadow_records(score_payload, generated_at)
    if len(records) != int(score_payload.get("scoreCount") or 0):
        errors.append("Export record count does not match candidate score output scoreCount.")

    payload = {
        "contractVersion": CONTRACT_VERSION,
        "exportKind": EXPORT_KIND,
        "candidatePackageId": str(score_payload.get("candidatePackageId") or "unknown"),
        "modelKey": str(score_payload.get("modelKey") or "unknown"),
        "modelVersion": str(score_payload.get("modelVersion") or "unknown"),
        "predictionType": str(score_payload.get("predictionType") or "unknown"),
        "horizonDays": score_payload.get("horizonDays"),
        "generatedAt": generated_at,
        "workbenchVersion": WORKBENCH_VERSION,
        "source": {
            "scoreOutputPath": str(score_output),
            "scoreOutputSha256": sha256_file(score_output),
            "scoreOutputGeneratedAt": score_payload.get("generatedAt"),
            "scoreValidationReportPath": str(validation_report),
            "scoreValidationReportSha256": sha256_file(validation_report),
            "scoreValidationStatus": validation_status,
            "offlineExecutionReportPath": str(execution_report),
            "offlineExecutionReportSha256": sha256_file(execution_report) if execution_report.exists() else None,
            "offlineExecutionStatus": execution_status,
            "rowCount": score_payload.get("rowCount"),
            "scoreCount": score_payload.get("scoreCount"),
        },
        "backendImportPolicy": {
            "contractPurpose": "metadata_only_shadow_score_export",
            "backendAcceptableAsMetadataOnly": True,
            "backendMustNotLoadModelArtifact": True,
            "backendMustNotExecuteModel": True,
            "backendMustNotExposeInference": True,
            "backendMustNotActivateArtifact": True,
            "backendMustNotMutateBusinessRecords": True,
            "backendMustTreatAsEvidenceOnly": True,
        },
        "safetyPolicy": BACKEND_METADATA_ONLY_POLICY,
        "summary": _score_summary(records),
        "recordCount": len(records),
        "records": records,
        "warnings": warnings,
        "errors": errors,
        "evidenceOnly": True,
        "productionReadinessClaim": "not_approved_for_production",
        "backendInferenceClaim": "not_exposed",
        "artifactActivationClaim": "not_activated",
        "businessMutationClaim": "not_allowed",
    }

    forbidden_findings = _find_forbidden_fields(payload)
    if forbidden_findings:
        payload["errors"] = [*payload["errors"], "Forbidden field(s) found before export write: " + ", ".join(forbidden_findings)]

    output_dir.mkdir(parents=True, exist_ok=True)
    export_path = output_dir / "offline_shadow_score_export.json"
    csv_path = output_dir / "offline_shadow_score_export.csv"
    manifest_path = output_dir / "offline_shadow_score_export_manifest.json"
    write_json(export_path, payload)
    _write_csv(csv_path, records)
    manifest = {
        "generatedAt": generated_at,
        "contractVersion": CONTRACT_VERSION,
        "exportKind": EXPORT_KIND,
        "candidatePackageId": payload["candidatePackageId"],
        "modelKey": payload["modelKey"],
        "modelVersion": payload["modelVersion"],
        "predictionType": payload["predictionType"],
        "recordCount": payload["recordCount"],
        "sourceScoreOutputSha256": payload["source"]["scoreOutputSha256"],
        "offlineShadowScoreExportSha256": sha256_file(export_path),
        "offlineShadowScoreExportCsvSha256": sha256_file(csv_path),
        "metadataOnly": True,
        "evidenceOnly": True,
        "backendModelExecutionAllowed": False,
        "inferenceEndpointExposed": False,
        "artifactActivationAllowed": False,
        "businessMutationAllowed": False,
    }
    write_json(manifest_path, manifest)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)

    status = "offline_shadow_score_export_ready" if not payload["errors"] else "offline_shadow_score_export_blocked"
    return {
        "status": status,
        "recordCount": len(records),
        "exportPath": str(export_path),
        "csvPath": str(csv_path),
        "manifestPath": str(manifest_path),
        "warningCount": len(payload["warnings"]),
        "errorCount": len(payload["errors"]),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Export Phase 13A offline candidate scores into a Phase 13B metadata-only shadow score contract.")
    parser.add_argument("--score-output", required=True, help="Path to candidate_score_output.json from Phase 13A.")
    parser.add_argument("--validation-report", required=True, help="Path to candidate_score_output_validation_report.json.")
    parser.add_argument("--execution-report", required=True, help="Path to offline_execution_report.json.")
    parser.add_argument("--output-dir", required=True, help="Output directory for Phase 13B export artifacts.")
    args = parser.parse_args()
    result = export_offline_shadow_scores(
        score_output=Path(args.score_output),
        validation_report=Path(args.validation_report),
        execution_report=Path(args.execution_report),
        output_dir=Path(args.output_dir),
    )
    print(f"Offline shadow score export status: {result['status']}")
    print(f"Record count: {result['recordCount']}; warnings: {result['warningCount']}; errors: {result['errorCount']}")
    print(f"Export written to: {result['exportPath']}")
    return 0 if result["status"] == "offline_shadow_score_export_ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
