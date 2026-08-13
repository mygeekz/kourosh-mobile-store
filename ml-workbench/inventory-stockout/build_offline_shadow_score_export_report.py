#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
from statistics import mean, median
from typing import Any

from _workbench_common import (
    EXTENDED_SAFETY_RESTRICTIONS,
    sha256_file,
    update_output_checksums,
    utc_now,
    read_json,
    write_json,
)

CHECKSUM_ARTIFACTS = ["offline_shadow_score_export_report.json"]


def _numeric_values(rows: list[dict[str, Any]], key: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        value = row.get(key)
        if value is None or isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def _summary(values: list[float]) -> dict[str, Any]:
    if not values:
        return {"count": 0, "min": None, "max": None, "mean": None, "median": None}
    return {
        "count": len(values),
        "min": min(values),
        "max": max(values),
        "mean": mean(values),
        "median": median(values),
    }


def _distribution(values: list[float]) -> dict[str, Any]:
    summary = _summary(values)
    if not values:
        return {**summary, "buckets": []}
    edges = [0, 0.2, 0.4, 0.6, 0.8, 1.0000001]
    labels = ["0.00-0.20", "0.20-0.40", "0.40-0.60", "0.60-0.80", "0.80-1.00"]
    buckets = []
    for index, label in enumerate(labels):
        low = edges[index]
        high = edges[index + 1]
        buckets.append({"bucket": label, "count": len([value for value in values if low <= value < high])})
    return {**summary, "buckets": buckets}


def build_offline_shadow_score_export_report(shadow_export: Path, validation_report: Path, output_dir: Path) -> dict[str, Any]:
    export_payload = read_json(shadow_export)
    validation_payload = read_json(validation_report)
    records = export_payload.get("records") or []
    if not isinstance(records, list):
        records = []
    record_objects = [record for record in records if isinstance(record, dict)]
    validation_status = str(validation_payload.get("status") or "unknown")
    export_status = "offline_shadow_score_export_validated" if validation_status == "pass" else "offline_shadow_score_export_with_warnings" if validation_status == "warning" else "offline_shadow_score_export_invalid"
    warnings = [str(item) for item in export_payload.get("warnings") or []]
    warnings.extend(str(item) for item in validation_payload.get("warnings") or [])
    errors = [str(item) for item in export_payload.get("errors") or []]
    errors.extend(str(item) for item in validation_payload.get("errors") or [])
    labels = Counter(str(record.get("candidateLabel", "unknown")) for record in record_objects)
    qualities = Counter(str(record.get("scoreQuality", "unknown")) for record in record_objects)
    report = {
        "contractVersion": str(export_payload.get("contractVersion") or "phase13b-v1"),
        "candidatePackageId": export_payload.get("candidatePackageId"),
        "modelKey": export_payload.get("modelKey"),
        "modelVersion": export_payload.get("modelVersion"),
        "predictionType": export_payload.get("predictionType"),
        "exportStatus": export_status,
        "validationStatus": validation_status,
        "rowCount": export_payload.get("source", {}).get("rowCount") if isinstance(export_payload.get("source"), dict) else None,
        "recordCount": export_payload.get("recordCount"),
        "scoreDistribution": _distribution(_numeric_values(record_objects, "candidateScore")),
        "confidenceSummary": _summary(_numeric_values(record_objects, "candidateConfidence")),
        "labelDistribution": dict(sorted(labels.items())),
        "scoreQualityDistribution": dict(sorted(qualities.items())),
        "outputReferences": {
            "shadowExportPath": str(shadow_export),
            "shadowExportSha256": sha256_file(shadow_export),
            "validationReportPath": str(validation_report),
            "validationReportSha256": sha256_file(validation_report),
            "sourceScoreOutputSha256": export_payload.get("source", {}).get("scoreOutputSha256") if isinstance(export_payload.get("source"), dict) else None,
        },
        "warnings": warnings,
        "errors": errors,
        "safetyPolicy": {
            **EXTENDED_SAFETY_RESTRICTIONS,
            "modelExecutionAllowed": False,
            "runtimeInvocationAllowed": False,
            "inferenceEndpointExposed": False,
            "artifactExecutionAllowed": False,
            "artifactActivationAllowed": False,
            "artifactBytesLoadingAllowed": False,
            "rawTrainingCsvLoadingAllowed": False,
            "backendMetadataOnlyImportCompatible": True,
            "backendMayExecuteModel": False,
            "backendMayCallInferenceRuntime": False,
            "backendMayMutateBusinessRecords": False,
        },
        "generatedAt": utc_now(),
        "evidenceOnly": True,
        "productionReadinessClaim": "not_approved_for_production",
        "backendInferenceClaim": "not_exposed",
        "artifactActivationClaim": "not_activated",
        "businessMutationClaim": "not_allowed",
        "scopeLimitations": [
            "Phase 13B exports metadata-only offline shadow score evidence.",
            "The Kourosh backend still must not load model.joblib, execute models, expose inference, activate artifacts, or mutate business records.",
            "This report is not production readiness, deployment approval, or decision automation evidence.",
        ],
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "offline_shadow_score_export_report.json", report)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a Phase 13B offline shadow score export report.")
    parser.add_argument("--shadow-export", required=True, help="Path to offline_shadow_score_export.json.")
    parser.add_argument("--validation-report", required=True, help="Path to offline_shadow_score_export_validation_report.json.")
    parser.add_argument("--output-dir", required=True, help="Directory where offline_shadow_score_export_report.json should be written.")
    args = parser.parse_args()
    report = build_offline_shadow_score_export_report(
        shadow_export=Path(args.shadow_export),
        validation_report=Path(args.validation_report),
        output_dir=Path(args.output_dir),
    )
    print(f"Offline shadow score export report status: {report['exportStatus']}")
    print(f"Validation status: {report['validationStatus']}")
    print(f"Record count: {report['recordCount']}")
    return 0 if report["validationStatus"] in {"pass", "warning"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
