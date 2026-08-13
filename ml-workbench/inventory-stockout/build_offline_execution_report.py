#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
from statistics import mean, median
from typing import Any

from _workbench_common import (
    EXTENDED_SAFETY_RESTRICTIONS,
    update_output_checksums,
    utc_now,
    read_json,
    sha256_file,
    write_json,
)

CHECKSUM_ARTIFACTS = ["offline_execution_report.json"]


def _numeric_values(rows: list[dict[str, Any]], key: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        value = row.get(key)
        if value is None or isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def _distribution(values: list[float]) -> dict[str, Any]:
    if not values:
        return {
            "count": 0,
            "min": None,
            "max": None,
            "mean": None,
            "median": None,
            "buckets": [],
        }
    min_value = min(values)
    max_value = max(values)
    if min_value >= 0 and max_value <= 1:
        bucket_edges = [0, 0.2, 0.4, 0.6, 0.8, 1.0000001]
        labels = ["0.00-0.20", "0.20-0.40", "0.40-0.60", "0.60-0.80", "0.80-1.00"]
        buckets = []
        for index, label in enumerate(labels):
            low = bucket_edges[index]
            high = bucket_edges[index + 1]
            buckets.append({"bucket": label, "count": len([value for value in values if low <= value < high])})
    else:
        buckets = [
            {"bucket": "min", "value": min_value},
            {"bucket": "max", "value": max_value},
        ]
    return {
        "count": len(values),
        "min": min_value,
        "max": max_value,
        "mean": mean(values),
        "median": median(values),
        "buckets": buckets,
    }


def _label_distribution(rows: list[dict[str, Any]]) -> dict[str, int]:
    labels = Counter(str(row.get("label", "unknown")) for row in rows)
    return dict(sorted(labels.items()))


def _confidence_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    values = _numeric_values(rows, "confidence")
    if not values:
        return {"count": 0, "min": None, "max": None, "mean": None, "median": None}
    return {
        "count": len(values),
        "min": min(values),
        "max": max(values),
        "mean": mean(values),
        "median": median(values),
    }


def build_offline_execution_report(score_output: Path, validation_report: Path, metrics: Path, output_dir: Path) -> dict[str, Any]:
    score_payload = read_json(score_output)
    validation_payload = read_json(validation_report)
    metrics_payload = read_json(metrics) if metrics.exists() else {}
    scores = score_payload.get("scores") or []
    if not isinstance(scores, list):
        scores = []

    warnings = []
    errors = []
    for source in (score_payload.get("source") or {}).get("warnings") or []:
        warnings.append(str(source))
    warnings.extend(str(item) for item in validation_payload.get("warnings") or [])
    errors.extend(str(item) for item in validation_payload.get("errors") or [])

    validation_status = str(validation_payload.get("status") or "unknown")
    execution_status = "offline_execution_validated" if validation_status == "pass" else "offline_execution_with_warnings" if validation_status == "warning" else "offline_execution_invalid"
    report = {
        "candidatePackageId": score_payload.get("candidatePackageId"),
        "modelKey": score_payload.get("modelKey"),
        "modelVersion": score_payload.get("modelVersion"),
        "predictionType": score_payload.get("predictionType"),
        "executionStatus": execution_status,
        "rowCount": score_payload.get("rowCount"),
        "scoreCount": score_payload.get("scoreCount"),
        "scoreDistribution": _distribution(_numeric_values(scores, "score")),
        "labelDistribution": _label_distribution([row for row in scores if isinstance(row, dict)]),
        "confidenceSummary": _confidence_summary([row for row in scores if isinstance(row, dict)]),
        "metricsReference": {
            "path": str(metrics),
            "sha256": sha256_file(metrics) if metrics.exists() else None,
            "metricKeys": sorted((metrics_payload.get("metrics") or {}).keys()) if isinstance(metrics_payload.get("metrics"), dict) else [],
        },
        "validationStatus": validation_status,
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
        },
        "generatedAt": utc_now(),
        "evidenceOnly": True,
        "productionReadinessClaim": "not_approved_for_production",
        "backendInferenceClaim": "not_exposed",
        "artifactActivationClaim": "not_activated",
        "businessMutationClaim": "not_allowed",
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "offline_execution_report.json", report)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a Phase 13A offline candidate execution report.")
    parser.add_argument("--score-output", required=True, help="Path to candidate_score_output.json.")
    parser.add_argument("--validation-report", required=True, help="Path to candidate_score_output_validation_report.json.")
    parser.add_argument("--metrics", required=True, help="Path to metrics.json from the offline workbench.")
    parser.add_argument("--output-dir", required=True, help="Directory where offline_execution_report.json should be written.")
    args = parser.parse_args()

    report = build_offline_execution_report(
        score_output=Path(args.score_output),
        validation_report=Path(args.validation_report),
        metrics=Path(args.metrics),
        output_dir=Path(args.output_dir),
    )
    print(f"Offline execution report status: {report['executionStatus']}")
    print(f"Validation status: {report['validationStatus']}")
    print(f"Score count: {report['scoreCount']}")
    return 0 if report["validationStatus"] in {"pass", "warning"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
