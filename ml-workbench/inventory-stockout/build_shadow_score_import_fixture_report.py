#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from statistics import mean
from typing import Any

from _workbench_common import sha256_file, update_output_checksums, utc_now, read_json, write_json

CONTRACT_VERSION = "phase13c-v1"
REPORT_KIND = "metadata_only_shadow_score_import_fixture_report"
CHECKSUM_ARTIFACTS = ["shadow_score_import_fixture_report.json"]


def _numeric(values: list[Any]) -> list[float]:
    output: list[float] = []
    for value in values:
        if isinstance(value, bool) or value is None:
            continue
        if isinstance(value, (int, float)):
            output.append(float(value))
    return output


def _summary(values: list[float]) -> dict[str, Any]:
    return {
        "count": len(values),
        "min": min(values) if values else None,
        "max": max(values) if values else None,
        "mean": mean(values) if values else None,
    }


def _distribution(records: list[dict[str, Any]], key: str) -> dict[str, int]:
    result: dict[str, int] = {}
    for record in records:
        value = str(record.get(key) or "unknown")
        result[value] = result.get(value, 0) + 1
    return dict(sorted(result.items()))


def build_shadow_score_import_fixture_report(import_fixture: Path, validation_report: Path, output_dir: Path) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    fixture = read_json(import_fixture)
    validation = read_json(validation_report)
    records = [record for record in fixture.get("records", []) if isinstance(record, dict)]
    scores = _numeric([record.get("candidateScore") for record in records])
    confidences = _numeric([record.get("candidateConfidence") for record in records])
    validation_status = validation.get("status", "unknown")
    warnings = list(fixture.get("warnings") or []) + list(validation.get("warnings") or [])
    errors = list(fixture.get("errors") or []) + list(validation.get("errors") or [])
    report_status = "shadow_score_import_fixture_failed" if validation_status == "fail" else "shadow_score_import_fixture_warning" if validation_status == "warning" or warnings else "shadow_score_import_fixture_validated"

    report = {
        "contractVersion": CONTRACT_VERSION,
        "reportKind": REPORT_KIND,
        "candidatePackageId": fixture.get("candidatePackageId"),
        "modelKey": fixture.get("modelKey"),
        "modelVersion": fixture.get("modelVersion"),
        "predictionType": fixture.get("predictionType"),
        "fixtureStatus": report_status,
        "validationStatus": validation_status,
        "rowCount": fixture.get("recordCount"),
        "recordCount": len(records),
        "scoreSummary": _summary(scores),
        "confidenceSummary": _summary(confidences),
        "labelDistribution": _distribution(records, "candidateLabel"),
        "scoreQualityDistribution": _distribution(records, "scoreQuality"),
        "entityTypeDistribution": _distribution(records, "entityType"),
        "importEligibilityDistribution": _distribution(records, "importEligibility"),
        "source": fixture.get("source") or {},
        "outputHashes": {
            "shadow_score_import_fixture.json": sha256_file(import_fixture) if import_fixture.exists() else None,
            "shadow_score_import_fixture_validation_report.json": sha256_file(validation_report) if validation_report.exists() else None,
        },
        "warningCount": len(warnings),
        "errorCount": len(errors),
        "warnings": warnings,
        "errors": errors,
        "safetyPolicy": fixture.get("safetyPolicy") or {},
        "backendImportPolicy": fixture.get("backendImportPolicy") or {},
        "productionReadinessClaim": "not_approved_for_production",
        "backendInferenceClaim": "not_exposed",
        "artifactActivationClaim": "not_activated",
        "businessMutationClaim": "not_allowed",
        "generatedAt": utc_now(),
    }
    write_json(output_dir / "shadow_score_import_fixture_report.json", report)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a Phase 13C metadata-only shadow score import fixture report.")
    parser.add_argument("--import-fixture", required=True, help="Path to shadow_score_import_fixture.json.")
    parser.add_argument("--validation-report", required=True, help="Path to shadow_score_import_fixture_validation_report.json.")
    parser.add_argument("--output-dir", required=True, help="Output directory for shadow_score_import_fixture_report.json.")
    args = parser.parse_args()
    report = build_shadow_score_import_fixture_report(
        import_fixture=Path(args.import_fixture),
        validation_report=Path(args.validation_report),
        output_dir=Path(args.output_dir),
    )
    print(f"Shadow score import fixture report status: {report['fixtureStatus']}")
    print(f"Records: {report['recordCount']}; warnings: {report['warningCount']}; errors: {report['errorCount']}")
    if report.get("errors"):
        print("Errors:")
        for item in report["errors"]:
            print(f"- {item}")
    if report.get("warnings"):
        print("Warnings:")
        for item in report["warnings"]:
            print(f"- {item}")
    return 0 if report["validationStatus"] in {"pass", "warning"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
