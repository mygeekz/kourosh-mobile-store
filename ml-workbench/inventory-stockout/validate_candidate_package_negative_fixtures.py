#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

from _workbench_common import read_json, utc_now, write_json
from validate_candidate_package_contract import DEFAULT_EXPECTATIONS_PATH, validate_candidate_package_contract

DEFAULT_NEGATIVE_FIXTURE_EXPECTATIONS_PATH = Path("fixtures/candidate_package_contract/negative_fixture_expectations.json")


def read_json_any(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json_any(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def _resolve_parent(payload: Any, path_parts: list[Any]) -> tuple[Any, Any]:
    if not path_parts:
        raise ValueError("JSON mutation path must not be empty.")
    current = payload
    for part in path_parts[:-1]:
        if isinstance(current, list):
            current = current[int(part)]
        elif isinstance(current, dict):
            if part not in current or current[part] is None:
                current[part] = {}
            current = current[part]
        else:
            raise ValueError(f"Cannot descend into non-container value at {part!r}.")
    return current, path_parts[-1]


def set_json_value(path: Path, path_parts: list[Any], value: Any) -> None:
    payload = read_json_any(path)
    parent, leaf = _resolve_parent(payload, path_parts)
    if isinstance(parent, list):
        parent[int(leaf)] = value
    elif isinstance(parent, dict):
        parent[leaf] = value
    else:
        raise ValueError("Cannot set value on non-container parent.")
    write_json_any(path, payload)


def delete_json_key(path: Path, path_parts: list[Any]) -> None:
    payload = read_json_any(path)
    parent, leaf = _resolve_parent(payload, path_parts)
    if isinstance(parent, list):
        del parent[int(leaf)]
    elif isinstance(parent, dict):
        parent.pop(leaf, None)
    else:
        raise ValueError("Cannot delete from non-container parent.")
    write_json_any(path, payload)


def add_candidate_output_field(package_dir: Path, field: str, value: Any) -> None:
    path = package_dir / "candidate_output_sample.json"
    payload = read_json_any(path)
    if not isinstance(payload, list) or not payload:
        raise ValueError("candidate_output_sample.json must be a non-empty array for the negative fixture mutation.")
    if not isinstance(payload[0], dict):
        raise ValueError("candidate_output_sample.json first row must be an object for the negative fixture mutation.")
    payload[0][field] = value
    write_json_any(path, payload)


def apply_mutation(package_dir: Path, mutation: dict[str, Any]) -> None:
    operation = str(mutation.get("operation") or "").strip()
    if operation == "delete_file":
        target = package_dir / str(mutation["path"])
        if target.exists():
            target.unlink()
        return
    if operation == "set_json_value":
        set_json_value(package_dir / str(mutation["file"]), list(mutation["path"]), mutation.get("value"))
        return
    if operation == "delete_json_key":
        delete_json_key(package_dir / str(mutation["file"]), list(mutation["path"]))
        return
    if operation == "add_candidate_output_field":
        add_candidate_output_field(package_dir, str(mutation["field"]), mutation.get("value"))
        return
    raise ValueError(f"Unsupported negative fixture mutation operation: {operation}")


def validation_text(report: dict[str, Any]) -> str:
    pieces: list[str] = []
    for key in ("errors", "warnings"):
        values = report.get(key)
        if isinstance(values, list):
            pieces.extend(str(item) for item in values)
    for check in report.get("checks", []) if isinstance(report.get("checks"), list) else []:
        if isinstance(check, dict):
            pieces.append(str(check.get("name", "")))
            pieces.append(str(check.get("detail", "")))
    return "\n".join(pieces)


def run_negative_fixture_suite(
    candidate_package_dir: Path,
    training_package_dir: Path | None,
    expectations_path: Path,
    fixture_expectations_path: Path,
    output_dir: Path,
) -> dict[str, Any]:
    candidate_package_dir = candidate_package_dir.resolve()
    if training_package_dir is not None:
        training_package_dir = training_package_dir.resolve()
    expectations_path = expectations_path.resolve()
    fixture_expectations_path = fixture_expectations_path.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    fixture_expectations = read_json(fixture_expectations_path)
    cases = fixture_expectations.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("negative_fixture_expectations.json must contain a non-empty cases array.")

    scratch_root = output_dir / "candidate_package_negative_fixture_runs"
    if scratch_root.exists():
        shutil.rmtree(scratch_root)
    scratch_root.mkdir(parents=True, exist_ok=True)

    case_results: list[dict[str, Any]] = []
    suite_errors: list[str] = []
    suite_warnings: list[str] = []

    for case in cases:
        if not isinstance(case, dict):
            suite_errors.append("Fixture case must be an object.")
            continue
        case_id = str(case.get("id") or "unnamed_case")
        case_dir = scratch_root / case_id
        shutil.copytree(candidate_package_dir, case_dir, ignore=shutil.ignore_patterns("candidate_package_negative_fixture_runs"))
        mutation_errors: list[str] = []
        for mutation in case.get("mutations", []) if isinstance(case.get("mutations"), list) else []:
            try:
                apply_mutation(case_dir, mutation)
            except Exception as exc:  # pragma: no cover - CLI report path
                mutation_errors.append(f"{case_id}: failed to apply mutation {mutation}: {exc}")
        if mutation_errors:
            suite_errors.extend(mutation_errors)
        report = validate_candidate_package_contract(
            candidate_package_dir=case_dir,
            expectations_path=expectations_path,
            training_package_dir=training_package_dir,
            output_dir=None,
        )
        expected_statuses = set(str(item) for item in case.get("expectedStatus", []))
        status_matches = report.get("status") in expected_statuses
        text = validation_text(report)
        missing_expected_substrings = [
            str(item)
            for item in case.get("expectedErrorContains", [])
            if str(item) not in text
        ]
        expected_error_text_matches = not missing_expected_substrings
        passed = status_matches and expected_error_text_matches and not mutation_errors
        if not status_matches:
            suite_errors.append(f"{case_id}: expected status in {sorted(expected_statuses)}, got {report.get('status')}.")
        if missing_expected_substrings:
            suite_errors.append(f"{case_id}: missing expected validation text: {', '.join(missing_expected_substrings)}.")
        case_results.append({
            "id": case_id,
            "description": case.get("description"),
            "expectedStatus": sorted(expected_statuses),
            "actualStatus": report.get("status"),
            "passed": passed,
            "expectedErrorContains": case.get("expectedErrorContains", []),
            "missingExpectedErrorText": missing_expected_substrings,
            "mutationErrors": mutation_errors,
            "validatorErrorCount": report.get("errorCount"),
            "validatorWarningCount": report.get("warningCount"),
            "contractCheckCount": report.get("checkCount"),
            "contractPassedCheckCount": report.get("passedCheckCount"),
        })

    report = {
        "status": "fail" if suite_errors else "pass",
        "fixtureSuiteVersion": fixture_expectations.get("fixtureSuiteVersion", "phase10e-v1"),
        "generatedAt": utc_now(),
        "candidatePackageDir": str(candidate_package_dir),
        "trainingPackageDir": str(training_package_dir) if training_package_dir is not None else None,
        "caseCount": len(case_results),
        "passedCaseCount": len([item for item in case_results if item.get("passed")]),
        "failedCaseCount": len([item for item in case_results if not item.get("passed")]),
        "cases": case_results,
        "warnings": suite_warnings,
        "errors": suite_errors,
        "safetyPolicy": {
            "backendModelExecutionAllowed": False,
            "backendInferenceEndpointExposed": False,
            "productionIntegrationAllowed": False,
            "decisionAutomationAllowed": False,
            "canChangeInventoryOrAccounting": False,
            "artifactActivationAllowed": False,
            "backendCandidatePackageNegativeFixtureExecutionAllowed": False,
        },
    }
    write_json(output_dir / "candidate_package_negative_fixture_validation_report.json", report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Run deterministic negative contract fixtures against a locally built offline candidate package.")
    parser.add_argument("--candidate-package-dir", required=True, help="Directory containing a valid locally built candidate package to copy and corrupt for negative fixture checks.")
    parser.add_argument("--training-package-dir", help="Optional source training package directory for checksum verification.")
    parser.add_argument("--expectations", default=str(DEFAULT_EXPECTATIONS_PATH), help="Phase 10D contract expectations JSON file.")
    parser.add_argument("--fixture-expectations", default=str(DEFAULT_NEGATIVE_FIXTURE_EXPECTATIONS_PATH), help="Phase 10E negative fixture expectations JSON file.")
    parser.add_argument("--output-dir", required=True, help="Local output directory for candidate_package_negative_fixture_validation_report.json and temporary mutated copies.")
    args = parser.parse_args()

    report = run_negative_fixture_suite(
        candidate_package_dir=Path(args.candidate_package_dir),
        training_package_dir=Path(args.training_package_dir) if args.training_package_dir else None,
        expectations_path=Path(args.expectations),
        fixture_expectations_path=Path(args.fixture_expectations),
        output_dir=Path(args.output_dir),
    )
    print(f"Candidate package negative fixture validation status: {report['status']}")
    print(f"Cases: {report['passedCaseCount']}/{report['caseCount']} passed")
    if report.get("errors"):
        print("Errors:")
        for item in report["errors"]:
            print(f"- {item}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
