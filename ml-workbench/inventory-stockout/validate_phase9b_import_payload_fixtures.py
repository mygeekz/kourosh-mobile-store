#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
from pathlib import Path
from typing import Any

from _workbench_common import read_json, utc_now, write_json
from build_phase9b_candidate_import_payload import (
    IMPORT_PAYLOAD_FILENAME,
    build_phase9b_import_payload,
    validate_phase9b_import_payload,
)

DEFAULT_ROUNDTRIP_EXPECTATIONS_PATH = Path("fixtures/phase9b_roundtrip_import/roundtrip_import_expectations.json")
DEFAULT_CONTRACT_EXPECTATIONS_PATH = Path("fixtures/candidate_package_contract/contract_expectations.json")


def read_json_any(path: Path) -> Any:
    import json
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def set_nested_value(payload: Any, path: list[str], value: Any) -> None:
    current = payload
    for key in path[:-1]:
        if not isinstance(current, dict):
            raise ValueError(f"Cannot descend into non-object at {key} for path {path}")
        if key not in current or not isinstance(current[key], dict):
            current[key] = {}
        current = current[key]
    if not isinstance(current, dict):
        raise ValueError(f"Cannot set value on non-object for path {path}")
    current[path[-1]] = value


def delete_nested_key(payload: Any, path: list[str]) -> None:
    current = payload
    for key in path[:-1]:
        if not isinstance(current, dict) or key not in current:
            return
        current = current[key]
    if isinstance(current, dict):
        current.pop(path[-1], None)


def add_candidate_output_field(payload: dict[str, Any], field: str, value: Any) -> None:
    candidate_package = payload.setdefault("candidatePackage", {})
    rows = candidate_package.setdefault("candidateOutputSample", [])
    if isinstance(rows, list) and rows and isinstance(rows[0], dict):
        rows[0][field] = value
    else:
        candidate_package["candidateOutputSample"] = [{field: value}]


def apply_mutation(payload: dict[str, Any], mutation: dict[str, Any]) -> None:
    operation = mutation.get("operation")
    if operation == "set_json_value":
        set_nested_value(payload, [str(item) for item in mutation.get("path", [])], mutation.get("value"))
    elif operation == "delete_json_key":
        delete_nested_key(payload, [str(item) for item in mutation.get("path", [])])
    elif operation == "add_candidate_output_field":
        add_candidate_output_field(payload, str(mutation.get("field")), mutation.get("value"))
    else:
        raise ValueError(f"Unsupported Phase 9B roundtrip fixture mutation operation: {operation}")


def case_matches_expectation(case: dict[str, Any], report: dict[str, Any]) -> tuple[bool, list[str]]:
    errors: list[str] = []
    expected_status = set(str(item) for item in case.get("expectedStatus", []))
    if report.get("status") not in expected_status:
        errors.append(f"Expected status {sorted(expected_status)} but got {report.get('status')}")
    combined_errors = "\n".join(str(item) for item in report.get("errors", []))
    for needle in case.get("expectedErrorContains", []):
        if str(needle) not in combined_errors:
            errors.append(f"Expected error text not found: {needle}")
    return not errors, errors


def validate_phase9b_import_payload_fixtures(
    candidate_package_dir: Path,
    training_package_dir: Path | None,
    contract_expectations_path: Path,
    roundtrip_expectations_path: Path,
    output_dir: Path,
) -> dict[str, Any]:
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    roundtrip_expectations = read_json(roundtrip_expectations_path)

    base_dir = output_dir / "phase9b_roundtrip_fixture_base"
    base_report = build_phase9b_import_payload(
        candidate_package_dir=candidate_package_dir,
        training_package_dir=training_package_dir,
        contract_expectations_path=contract_expectations_path,
        roundtrip_expectations_path=roundtrip_expectations_path,
        output_dir=base_dir,
    )
    if base_report.get("status") not in {"pass", "warning"}:
        raise ValueError("Base Phase 9B import payload must pass before fixture mutations are evaluated.")

    base_payload = read_json_any(base_dir / IMPORT_PAYLOAD_FILENAME)
    case_results: list[dict[str, Any]] = []
    passed = 0
    for case in roundtrip_expectations.get("cases", []):
        mutated_payload = copy.deepcopy(base_payload)
        for mutation in case.get("mutations", []):
            apply_mutation(mutated_payload, mutation)
        report = validate_phase9b_import_payload(mutated_payload, roundtrip_expectations)
        ok, expectation_errors = case_matches_expectation(case, report)
        if ok:
            passed += 1
        case_results.append({
            "id": case.get("id"),
            "description": case.get("description"),
            "expectedStatus": case.get("expectedStatus"),
            "actualStatus": report.get("status"),
            "passed": ok,
            "expectationErrors": expectation_errors,
            "reportErrorCount": report.get("errorCount"),
            "reportWarningCount": report.get("warningCount"),
            "reportErrors": report.get("errors", []),
        })

    errors = [f"{item['id']}: {'; '.join(item['expectationErrors'])}" for item in case_results if not item.get("passed")]
    result = {
        "status": "pass" if not errors else "fail",
        "roundtripSuiteVersion": roundtrip_expectations.get("roundtripSuiteVersion", "phase10f-v1"),
        "generatedAt": utc_now(),
        "caseCount": len(case_results),
        "passedCaseCount": passed,
        "failedCaseCount": len(case_results) - passed,
        "cases": case_results,
        "errors": errors,
        "safetyPolicy": {
            "backendModelExecutionAllowed": False,
            "backendInferenceEndpointExposed": False,
            "productionIntegrationAllowed": False,
            "decisionAutomationAllowed": False,
            "canChangeInventoryOrAccounting": False,
            "artifactActivationAllowed": False,
            "backendPhase9bRoundtripImportExecutionAllowed": False,
        },
    }
    write_json(output_dir / "phase9b_import_payload_roundtrip_fixture_validation_report.json", result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run deterministic fixtures against the Phase 9B import payload roundtrip validator.")
    parser.add_argument("--candidate-package-dir", required=True)
    parser.add_argument("--training-package-dir")
    parser.add_argument("--contract-expectations", default=str(DEFAULT_CONTRACT_EXPECTATIONS_PATH))
    parser.add_argument("--roundtrip-expectations", default=str(DEFAULT_ROUNDTRIP_EXPECTATIONS_PATH))
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    report = validate_phase9b_import_payload_fixtures(
        candidate_package_dir=Path(args.candidate_package_dir),
        training_package_dir=Path(args.training_package_dir) if args.training_package_dir else None,
        contract_expectations_path=Path(args.contract_expectations),
        roundtrip_expectations_path=Path(args.roundtrip_expectations),
        output_dir=Path(args.output_dir),
    )
    print(f"Phase 9B import payload roundtrip fixture validation status: {report['status']}")
    print(f"Cases: {report['passedCaseCount']}/{report['caseCount']} passed")
    if report.get("errors"):
        print("Errors:")
        for item in report["errors"]:
            print(f"- {item}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
