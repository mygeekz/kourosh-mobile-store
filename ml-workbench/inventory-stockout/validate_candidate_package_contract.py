#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from _workbench_common import (
    ALLOWED_OUTPUT_FIELDS,
    SAFETY_POLICY,
    find_forbidden_output_fields,
    read_json,
    sha256_file,
    utc_now,
    validate_candidate_output_contract,
    validate_offline_metadata_enrichment,
    write_json,
)

DEFAULT_EXPECTATIONS_PATH = Path("fixtures/candidate_package_contract/contract_expectations.json")


def read_json_any(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def find_forbidden_fields(value: Any, forbidden_fields: set[str], path: str = "$", allow_false_safety: bool = True) -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            next_path = f"{path}.{key}"
            if key in forbidden_fields:
                if allow_false_safety and key in SAFETY_POLICY and item is False:
                    pass
                else:
                    findings.append(next_path)
            findings.extend(find_forbidden_fields(item, forbidden_fields, next_path, allow_false_safety))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            findings.extend(find_forbidden_fields(item, forbidden_fields, f"{path}[{index}]", allow_false_safety))
    return findings


def _missing_keys(payload: dict[str, Any], required_keys: list[str]) -> list[str]:
    return [key for key in required_keys if key not in payload]


def _status_from_errors_warnings(errors: list[str], warnings: list[str]) -> str:
    if errors:
        return "fail"
    if warnings:
        return "warning"
    return "pass"


def validate_checksums(candidate_package_dir: Path, training_package_dir: Path | None, checksums: dict[str, Any], expectations: dict[str, Any]) -> tuple[list[str], list[str], dict[str, Any]]:
    errors: list[str] = []
    warnings: list[str] = []
    files = checksums.get("files")
    verified: dict[str, Any] = {}
    if not isinstance(files, dict):
        return ["checksums.json must contain a files object."], warnings, verified

    required_checksum_files = [str(item) for item in expectations.get("requiredChecksumFiles", [])]
    optional_checksum_files = [str(item) for item in expectations.get("optionalChecksumFiles", [])]
    for name in required_checksum_files:
        if name not in files:
            errors.append(f"checksums.json is missing required file hash: {name}")
    for name, expected_hash in files.items():
        path: Path | None = None
        if name in {"manifest.json", "train.csv", "test.csv"}:
            if training_package_dir is not None:
                path = training_package_dir / name
            else:
                warnings.append(f"Training package directory not provided; cannot verify source hash for {name}.")
                continue
        else:
            path = candidate_package_dir / name
        if path is None:
            continue
        if not path.exists() or not path.is_file():
            if name in optional_checksum_files:
                warnings.append(f"Optional checksum file is listed but not present locally: {name}")
            else:
                errors.append(f"Checksum file is missing locally: {name}")
            continue
        actual_hash = sha256_file(path)
        ok = actual_hash == expected_hash
        verified[name] = {"expectedSha256": expected_hash, "actualSha256": actual_hash, "matches": ok}
        if not ok:
            errors.append(f"SHA-256 mismatch for {name}.")
    return errors, warnings, verified


def validate_candidate_package_contract(
    candidate_package_dir: Path,
    expectations_path: Path = DEFAULT_EXPECTATIONS_PATH,
    training_package_dir: Path | None = None,
    output_dir: Path | None = None,
) -> dict[str, Any]:
    candidate_package_dir = candidate_package_dir.resolve()
    expectations_path = expectations_path.resolve()
    if training_package_dir is not None:
        training_package_dir = training_package_dir.resolve()

    expectations = read_json(expectations_path)
    errors: list[str] = []
    warnings: list[str] = []
    checks: list[dict[str, Any]] = []

    def add_check(name: str, passed: bool, detail: str, severity: str = "error") -> None:
        checks.append({"name": name, "passed": passed, "detail": detail, "severity": severity})
        if not passed:
            if severity == "warning":
                warnings.append(detail)
            else:
                errors.append(detail)

    required_files = [str(item) for item in expectations.get("requiredFiles", [])]
    for filename in required_files:
        add_check(f"file:{filename}", (candidate_package_dir / filename).exists(), f"Required candidate package file is missing: {filename}")

    payloads: dict[str, Any] = {}
    for filename in required_files:
        path = candidate_package_dir / filename
        if not path.exists():
            continue
        try:
            payloads[filename] = read_json_any(path)
        except Exception as exc:  # pragma: no cover - deterministic CLI report path
            add_check(f"json:{filename}", False, f"{filename} is not valid JSON: {exc}")

    candidate_manifest = payloads.get("candidate_manifest.json")
    if isinstance(candidate_manifest, dict):
        missing = _missing_keys(candidate_manifest, [str(item) for item in expectations.get("candidateManifestRequiredFields", [])])
        add_check("candidate_manifest.required_fields", not missing, "candidate_manifest.json missing required field(s): " + ", ".join(missing) if missing else "candidate_manifest.json includes required fields.")
        safety_policy = candidate_manifest.get("safetyPolicy") or {}
        for flag in [str(item) for item in expectations.get("requiredSafetyFalseFlags", [])]:
            add_check(f"candidate_manifest.safetyPolicy.{flag}", safety_policy.get(flag) is False, f"candidate_manifest safetyPolicy.{flag} must be false.")
        readiness = candidate_manifest.get("productionReadiness") or {}
        for flag in ("approvedForProduction", "approvedForBackendExecution", "approvedForArtifactActivation", "approvedForBusinessMutation"):
            add_check(f"candidate_manifest.productionReadiness.{flag}", readiness.get(flag) is False, f"candidate_manifest productionReadiness.{flag} must be false.")
        output_contract = candidate_manifest.get("outputContract") or {}
        allowed = set(output_contract.get("allowedFields") or [])
        add_check("candidate_manifest.outputContract.allowed_fields", allowed == set(ALLOWED_OUTPUT_FIELDS), "candidate_manifest outputContract allowed fields must match the safe output contract.")
        add_check("candidate_manifest.outputContract.businessMutationAllowed", output_contract.get("businessMutationAllowed") is False, "candidate_manifest outputContract.businessMutationAllowed must be false.")
    elif "candidate_manifest.json" in required_files:
        add_check("candidate_manifest.object", False, "candidate_manifest.json must be a JSON object.")

    model_card = payloads.get("model_card.json")
    if isinstance(model_card, dict):
        missing = _missing_keys(model_card, [str(item) for item in expectations.get("modelCardRequiredFields", [])])
        add_check("model_card.required_fields", not missing, "model_card.json missing required field(s): " + ", ".join(missing) if missing else "model_card.json includes required fields.")
        safety = model_card.get("safetyRestrictions") or {}
        for flag in [str(item) for item in expectations.get("requiredSafetyFalseFlags", [])]:
            add_check(f"model_card.safetyRestrictions.{flag}", safety.get(flag) is False, f"model_card safetyRestrictions.{flag} must be false.")
        add_check("model_card.production_claim", str(model_card.get("productionReadinessClaim")) == "not_approved_for_production", "model_card productionReadinessClaim must remain not_approved_for_production.")
    elif "model_card.json" in required_files:
        add_check("model_card.object", False, "model_card.json must be a JSON object.")

    candidate_output = payloads.get("candidate_output_sample.json")
    if candidate_output is not None:
        ok, output_errors = validate_candidate_output_contract(candidate_output)
        add_check("candidate_output_sample.safe_contract", ok, "candidate_output_sample.json failed safe output contract: " + "; ".join(output_errors) if not ok else "candidate_output_sample.json matches safe output contract.")

    enrichment = payloads.get("offline_metadata_enrichment.json")
    if enrichment is not None:
        enrichment_report = validate_offline_metadata_enrichment(enrichment)
        add_check("offline_metadata_enrichment.schema", enrichment_report.get("status") in {"pass", "warning"}, "offline_metadata_enrichment.json failed schema validation: " + "; ".join([str(item) for item in enrichment_report.get("errors", [])]) if enrichment_report.get("status") == "fail" else "offline_metadata_enrichment.json passes schema validation.")
        required_sections = [str(item) for item in expectations.get("requiredEnrichmentSections", [])]
        missing_sections = [section for section in required_sections if not isinstance(enrichment, dict) or section not in enrichment]
        add_check("offline_metadata_enrichment.required_sections", not missing_sections, "offline_metadata_enrichment.json missing required section(s): " + ", ".join(missing_sections) if missing_sections else "offline_metadata_enrichment.json includes required sections.")

    enrichment_validation = payloads.get("offline_metadata_enrichment_validation_report.json")
    if isinstance(enrichment_validation, dict):
        add_check("offline_metadata_enrichment_validation_report.status", enrichment_validation.get("status") in {"pass", "warning"}, "offline_metadata_enrichment_validation_report.json status must be pass or warning.")

    validation_report = payloads.get("training_package_validation_report.json")
    if isinstance(validation_report, dict):
        add_check("training_package_validation_report.status", validation_report.get("status") in {"pass", "warning"}, "training_package_validation_report.json status must be pass or warning.")
        row_counts = validation_report.get("rowCounts") or {}
        add_check("training_package_validation_report.row_counts", (bool(row_counts.get("trainRows")) or bool(row_counts.get("train"))) and (bool(row_counts.get("testRows")) or bool(row_counts.get("test"))), "training package validation report must include non-zero train/test row counts.")

    # Forbidden execution/mutation/artifact fields are scanned across the package JSON surface.
    forbidden_fields = set(str(item) for item in expectations.get("forbiddenFields", []))
    forbidden_findings: list[str] = []
    for filename, payload in payloads.items():
        findings = find_forbidden_fields(payload, forbidden_fields, f"{filename}")
        forbidden_findings.extend(findings)
    add_check("package.forbidden_fields", not forbidden_findings, "Forbidden execution/mutation/artifact field(s) found: " + ", ".join(forbidden_findings) if forbidden_findings else "No forbidden execution/mutation/artifact fields found in package JSON surface.")

    checksums = payloads.get("checksums.json")
    checksum_verified: dict[str, Any] = {}
    if isinstance(checksums, dict):
        checksum_errors, checksum_warnings, checksum_verified = validate_checksums(candidate_package_dir, training_package_dir, checksums, expectations)
        for item in checksum_errors:
            add_check("checksums.error", False, item)
        for item in checksum_warnings:
            add_check("checksums.warning", False, item, severity="warning")
        if not checksum_errors:
            add_check("checksums.required_hashes", True, "checksums.json contains required hashes and local hashes match where source files are available.")
    elif "checksums.json" in required_files:
        add_check("checksums.object", False, "checksums.json must be a JSON object.")

    report = {
        "status": _status_from_errors_warnings(errors, warnings),
        "contractSuiteVersion": expectations.get("contractSuiteVersion", "phase10d-v1"),
        "generatedAt": utc_now(),
        "candidatePackageDir": str(candidate_package_dir),
        "trainingPackageDir": str(training_package_dir) if training_package_dir is not None else None,
        "requiredFileCount": len(required_files),
        "checkCount": len(checks),
        "passedCheckCount": len([item for item in checks if item.get("passed")]),
        "warningCount": len(warnings),
        "errorCount": len(errors),
        "checks": checks,
        "checksumVerification": checksum_verified,
        "warnings": warnings,
        "errors": errors,
        "safetyPolicy": {
            "backendModelExecutionAllowed": False,
            "backendInferenceEndpointExposed": False,
            "productionIntegrationAllowed": False,
            "decisionAutomationAllowed": False,
            "canChangeInventoryOrAccounting": False,
            "artifactActivationAllowed": False,
            "backendCandidatePackageContractExecutionAllowed": False,
        },
    }
    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        write_json(output_dir / "candidate_package_contract_validation_report.json", report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the full offline candidate package contract for deterministic regression checks.")
    parser.add_argument("--candidate-package-dir", required=True, help="Directory containing candidate_manifest.json, model_card.json, metrics.json, evaluation_report.json, candidate_output_sample.json, offline_metadata_enrichment.json, and checksums.json.")
    parser.add_argument("--training-package-dir", help="Optional source training package directory for manifest/train/test checksum verification.")
    parser.add_argument("--expectations", default=str(DEFAULT_EXPECTATIONS_PATH), help="Contract expectations JSON file.")
    parser.add_argument("--output-dir", help="Optional output directory for candidate_package_contract_validation_report.json.")
    args = parser.parse_args()

    report = validate_candidate_package_contract(
        candidate_package_dir=Path(args.candidate_package_dir),
        expectations_path=Path(args.expectations),
        training_package_dir=Path(args.training_package_dir) if args.training_package_dir else None,
        output_dir=Path(args.output_dir) if args.output_dir else None,
    )
    print(f"Candidate package contract validation status: {report['status']}")
    print(f"Checks: {report['passedCheckCount']}/{report['checkCount']} passed")
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
