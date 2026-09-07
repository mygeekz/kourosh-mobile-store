#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from _workbench_common import read_json, validate_offline_metadata_enrichment, write_json, utc_now


def _status_matches(actual: str, expected: str) -> bool:
    return actual == expected


def _errors_contain(errors: list[str], fragments: list[str]) -> list[str]:
    missing: list[str] = []
    for fragment in fragments:
        if not any(fragment in error for error in errors):
            missing.append(fragment)
    return missing


def validate_fixture_pack(fixture_dir: Path, output_dir: Path | None = None) -> dict[str, Any]:
    expectations_path = fixture_dir / "fixture_expectations.json"
    expectations = read_json(expectations_path)
    fixture_specs = expectations.get("fixtures")
    if not isinstance(fixture_specs, list) or not fixture_specs:
        raise ValueError("fixture_expectations.json must contain a non-empty fixtures array.")

    results: list[dict[str, Any]] = []
    failures: list[str] = []
    for spec in fixture_specs:
        if not isinstance(spec, dict):
            failures.append("Fixture expectation entry must be an object.")
            continue
        filename = str(spec.get("file") or "").strip()
        expected_status = str(spec.get("expectedStatus") or "").strip()
        expected_error_contains = spec.get("expectedErrorContains") or []
        if not filename or expected_status not in {"pass", "warning", "fail"}:
            failures.append(f"Invalid fixture expectation entry: {spec}")
            continue
        if not isinstance(expected_error_contains, list):
            failures.append(f"{filename}: expectedErrorContains must be an array.")
            continue

        payload_path = fixture_dir / filename
        if not payload_path.exists():
            failures.append(f"{filename}: fixture file is missing.")
            continue
        report = validate_offline_metadata_enrichment(read_json(payload_path))
        status_ok = _status_matches(str(report.get("status")), expected_status)
        missing_fragments = _errors_contain([str(item) for item in report.get("errors", [])], [str(item) for item in expected_error_contains])
        ok = status_ok and not missing_fragments
        if not ok:
            if not status_ok:
                failures.append(f"{filename}: expected status {expected_status}, got {report.get('status')}.")
            if missing_fragments:
                failures.append(f"{filename}: missing expected error fragment(s): {', '.join(missing_fragments)}")
        results.append({
            "file": filename,
            "expectedStatus": expected_status,
            "actualStatus": report.get("status"),
            "passed": ok,
            "expectedErrorContains": expected_error_contains,
            "errors": report.get("errors", []),
            "warnings": report.get("warnings", []),
        })

    pass_count = len([item for item in results if item.get("passed")])
    report = {
        "status": "pass" if not failures else "fail",
        "fixturePackVersion": expectations.get("fixturePackVersion", "phase10c-v1"),
        "generatedAt": utc_now(),
        "fixtureDir": str(fixture_dir),
        "fixtureCount": len(results),
        "passCount": pass_count,
        "failCount": len(results) - pass_count,
        "results": results,
        "errors": failures,
        "warnings": [],
        "safetyPolicy": expectations.get("safetyPolicy", {}),
    }
    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        write_json(output_dir / "offline_metadata_enrichment_fixture_validation_report.json", report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Run deterministic positive and negative fixture tests for offline_metadata_enrichment.json validation.")
    parser.add_argument("--fixture-dir", default="fixtures/offline_metadata_enrichment", help="Fixture directory containing fixture_expectations.json.")
    parser.add_argument("--output-dir", help="Optional output directory for offline_metadata_enrichment_fixture_validation_report.json.")
    args = parser.parse_args()

    report = validate_fixture_pack(Path(args.fixture_dir), Path(args.output_dir) if args.output_dir else None)
    print(f"Offline metadata enrichment fixture validation status: {report['status']}")
    print(f"Fixtures: {report['passCount']}/{report['fixtureCount']} matched expected outcomes")
    if report.get("errors"):
        print("Errors:")
        for item in report["errors"]:
            print(f"- {item}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
