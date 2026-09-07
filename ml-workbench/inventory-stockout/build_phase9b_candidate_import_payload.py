#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any

from _workbench_common import (
    ALLOWED_OUTPUT_FIELDS,
    ENRICHMENT_REQUIRED_SECTIONS,
    SAFETY_POLICY,
    read_json,
    utc_now,
    validate_candidate_output_contract,
    write_json,
)
from validate_candidate_package_contract import validate_candidate_package_contract

DEFAULT_CONTRACT_EXPECTATIONS_PATH = Path("fixtures/candidate_package_contract/contract_expectations.json")
DEFAULT_ROUNDTRIP_EXPECTATIONS_PATH = Path("fixtures/phase9b_roundtrip_import/roundtrip_import_expectations.json")

IMPORT_PAYLOAD_FILENAME = "phase9b_candidate_evaluation_metadata_import_payload.json"
IMPORT_PAYLOAD_REPORT_FILENAME = "phase9b_candidate_evaluation_metadata_import_payload_validation_report.json"

PHASE9B_PACKAGE_KEYS = [
    "candidateManifest",
    "modelCard",
    "metrics",
    "evaluationReport",
    "candidateOutputSample",
    "checksums",
    "trainingPackageValidationReport",
]

REJECTED_ARTIFACT_KEYS = {
    "modelBinary",
    "modelBytes",
    "artifactBytes",
    "artifactPayload",
    "binaryPayload",
    "serializedModel",
    "base64Model",
    "picklePayload",
    "executableArtifact",
    "executableArtifactBytes",
}

FORBIDDEN_IMPORT_OUTPUT_FIELDS = {
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
}

MODEL_BINARY_NAME_MARKERS = {
    "model.joblib",
    "modelJoblibSha256",
    "joblibPayload",
    "joblibModel",
}


def read_json_any(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def status_from(errors: list[str], warnings: list[str]) -> str:
    if errors:
        return "fail"
    if warnings:
        return "warning"
    return "pass"


def recursive_key_findings(value: Any, forbidden_keys: set[str], path: str = "$", allow_false_safety: bool = True) -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            next_path = f"{path}.{key}"
            if key in forbidden_keys:
                if allow_false_safety and key in SAFETY_POLICY and item is False:
                    pass
                else:
                    findings.append(next_path)
            findings.extend(recursive_key_findings(item, forbidden_keys, next_path, allow_false_safety))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            findings.extend(recursive_key_findings(item, forbidden_keys, f"{path}[{index}]", allow_false_safety))
    return findings


def recursive_model_binary_markers(value: Any, path: str = "$") -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            next_path = f"{path}.{key}"
            if key in MODEL_BINARY_NAME_MARKERS:
                findings.append(next_path)
            findings.extend(recursive_model_binary_markers(item, next_path))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            findings.extend(recursive_model_binary_markers(item, f"{path}[{index}]"))
    elif isinstance(value, str):
        if value in MODEL_BINARY_NAME_MARKERS or "model.joblib" in value:
            findings.append(path)
    return findings


def read_required_candidate_package_sections(candidate_package_dir: Path) -> dict[str, Any]:
    return {
        "candidateManifest": read_json(candidate_package_dir / "candidate_manifest.json"),
        "modelCard": read_json(candidate_package_dir / "model_card.json"),
        "metrics": read_json(candidate_package_dir / "metrics.json"),
        "evaluationReport": read_json(candidate_package_dir / "evaluation_report.json"),
        "candidateOutputSample": read_json_any(candidate_package_dir / "candidate_output_sample.json"),
        "checksums": read_json(candidate_package_dir / "checksums.json"),
        "trainingPackageValidationReport": read_json(candidate_package_dir / "training_package_validation_report.json"),
    }



def scrub_model_binary_strings(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: scrub_model_binary_strings(item) for key, item in value.items() if key not in MODEL_BINARY_NAME_MARKERS}
    if isinstance(value, list):
        return [scrub_model_binary_strings(item) for item in value]
    if isinstance(value, str):
        return value.replace("model.joblib", "local model binary").replace("modelJoblibSha256", "localModelBinarySha256")
    return value

def strip_model_binary_references(sections: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    payload_sections = copy.deepcopy(sections)
    stripped: list[str] = []

    manifest_checksums = payload_sections.get("candidateManifest", {}).get("checksums")
    if isinstance(manifest_checksums, dict) and "modelJoblibSha256" in manifest_checksums:
        manifest_checksums.pop("modelJoblibSha256", None)
        stripped.append("candidateManifest.checksums.modelJoblibSha256")

    checksums = payload_sections.get("checksums")
    files = checksums.get("files") if isinstance(checksums, dict) else None
    if isinstance(files, dict) and "model.joblib" in files:
        files.pop("model.joblib", None)
        stripped.append("checksums.files.model.joblib")

    payload_sections = scrub_model_binary_strings(payload_sections)
    return payload_sections, stripped


def enrichment_sections(value: Any) -> set[str]:
    if not isinstance(value, dict):
        return set()
    metadata = value.get("metadataEnrichment")
    if isinstance(metadata, dict):
        return set(metadata.keys())
    return {section for section in ENRICHMENT_REQUIRED_SECTIONS if section in value}


def validate_phase9b_import_payload(payload: dict[str, Any], expectations: dict[str, Any] | None = None) -> dict[str, Any]:
    expectations = expectations or {}
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

    candidate_package = payload.get("candidatePackage")
    add_check("payload.candidatePackage", isinstance(candidate_package, dict), "Payload must contain a candidatePackage object.")
    if not isinstance(candidate_package, dict):
        candidate_package = {}

    required_package_keys = list(expectations.get("requiredCandidatePackageKeys") or PHASE9B_PACKAGE_KEYS)
    for key in required_package_keys:
        add_check(f"candidatePackage.{key}", key in candidate_package, f"Phase 9B import payload missing candidatePackage.{key}.")

    unexpected_keys = sorted(set(candidate_package.keys()) - set(required_package_keys))
    add_check("candidatePackage.no_unexpected_sections", not unexpected_keys, f"Phase 9B import payload has unexpected candidatePackage section(s): {', '.join(unexpected_keys)}" if unexpected_keys else "Candidate package payload uses only Phase 9B-compatible sections.")

    artifact_findings = recursive_key_findings(payload, REJECTED_ARTIFACT_KEYS)
    add_check("payload.no_artifact_bytes", not artifact_findings, "Phase 9B import payload contains rejected artifact byte/model key(s): " + ", ".join(artifact_findings) if artifact_findings else "Payload contains no executable artifact bytes or serialized model fields.")

    model_binary_markers = recursive_model_binary_markers(payload)
    add_check("payload.no_model_joblib_reference", not model_binary_markers, "Phase 9B import payload must not contain model.joblib/modelJoblib references: " + ", ".join(model_binary_markers) if model_binary_markers else "Payload strips model.joblib references before Phase 9B metadata import.")

    output_sample = candidate_package.get("candidateOutputSample")
    ok, output_errors = validate_candidate_output_contract(output_sample)
    add_check("candidateOutputSample.safe_output_contract", ok, "candidateOutputSample failed safe output contract: " + "; ".join(output_errors) if not ok else "candidateOutputSample uses only safe Phase 9B output fields.")

    forbidden_output_findings = recursive_key_findings(payload, FORBIDDEN_IMPORT_OUTPUT_FIELDS)
    add_check("payload.no_forbidden_business_output_fields", not forbidden_output_findings, "Payload contains forbidden business mutation field(s): " + ", ".join(forbidden_output_findings) if forbidden_output_findings else "Payload contains no forbidden business mutation output fields.")

    safety_policy = {}
    candidate_manifest = candidate_package.get("candidateManifest")
    model_card = candidate_package.get("modelCard")
    if isinstance(candidate_manifest, dict) and isinstance(candidate_manifest.get("safetyPolicy"), dict):
        safety_policy.update(candidate_manifest["safetyPolicy"])
    if isinstance(model_card, dict) and isinstance(model_card.get("safetyRestrictions"), dict):
        safety_policy.update(model_card["safetyRestrictions"])
    for flag in expectations.get("requiredSafetyFalseFlags", list(SAFETY_POLICY.keys())):
        add_check(f"safety.{flag}", safety_policy.get(flag) is False, f"Safety flag {flag} must be false in the Phase 9B roundtrip payload.")

    required_enrichment_sections = set(expectations.get("requiredEmbeddedEnrichmentSections") or ENRICHMENT_REQUIRED_SECTIONS)
    enrichment_surfaces = {
        "candidateManifest": enrichment_sections(candidate_package.get("candidateManifest")),
        "modelCard": enrichment_sections(candidate_package.get("modelCard")),
        "metrics": enrichment_sections(candidate_package.get("metrics")),
        "evaluationReport": enrichment_sections(candidate_package.get("evaluationReport")),
    }
    for surface, sections in enrichment_surfaces.items():
        missing = sorted(required_enrichment_sections - sections)
        add_check(
            f"{surface}.metadataEnrichment.embedded",
            not missing,
            f"{surface} is missing embedded enrichment section(s): {', '.join(missing)}" if missing else f"{surface} carries embedded enrichment metadata for Phase 9 UI surfaces.",
        )

    checksums = candidate_package.get("checksums")
    if isinstance(checksums, dict):
        files = checksums.get("files")
        add_check("checksums.files", isinstance(files, dict), "checksums must contain a files object after model binary references are stripped.")
        if isinstance(files, dict):
            add_check("checksums.no_model_joblib", "model.joblib" not in files, "checksums.files must not include model.joblib in Phase 9B import payload.")
    else:
        add_check("checksums.object", False, "checksums must be a JSON object.")

    report = {
        "status": status_from(errors, warnings),
        "roundtripSuiteVersion": expectations.get("roundtripSuiteVersion", "phase10f-v1"),
        "generatedAt": utc_now(),
        "checkCount": len(checks),
        "passedCheckCount": len([item for item in checks if item.get("passed")]),
        "warningCount": len(warnings),
        "errorCount": len(errors),
        "checks": checks,
        "warnings": warnings,
        "errors": errors,
        "roundtripAssertions": {
            "phase9bPayloadCompatible": not errors,
            "metadataImportOnly": True,
            "modelJoblibExcluded": not model_binary_markers,
            "artifactBytesExcluded": not artifact_findings,
            "safeOutputContract": ok,
            "embeddedEnrichmentSurfaces": {key: sorted(value) for key, value in enrichment_surfaces.items()},
        },
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
    return report


def build_phase9b_import_payload(
    candidate_package_dir: Path,
    training_package_dir: Path | None,
    contract_expectations_path: Path,
    roundtrip_expectations_path: Path,
    output_dir: Path,
) -> dict[str, Any]:
    candidate_package_dir = candidate_package_dir.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    contract_report = validate_candidate_package_contract(
        candidate_package_dir=candidate_package_dir,
        expectations_path=contract_expectations_path,
        training_package_dir=training_package_dir,
        output_dir=output_dir,
    )
    if contract_report.get("status") not in {"pass", "warning"}:
        raise ValueError("Candidate package contract validation must pass before building the Phase 9B import payload.")

    roundtrip_expectations = read_json(roundtrip_expectations_path)
    source_sections = read_required_candidate_package_sections(candidate_package_dir)
    payload_sections, stripped_model_binary_references = strip_model_binary_references(source_sections)

    candidate_manifest = payload_sections.get("candidateManifest") if isinstance(payload_sections.get("candidateManifest"), dict) else {}
    payload = {
        "payloadVersion": roundtrip_expectations.get("roundtripSuiteVersion", "phase10f-v1"),
        "generatedAt": utc_now(),
        "source": {
            "sourceType": "offline_workbench_candidate_package",
            "candidatePackageId": candidate_manifest.get("candidatePackageId"),
            "modelKey": candidate_manifest.get("modelKey"),
            "modelVersion": candidate_manifest.get("modelVersion"),
            "metadataOnly": True,
            "strippedModelBinaryReferenceCount": len(stripped_model_binary_references),
            "excludedArtifactClasses": ["local_model_binary"],
        },
        "candidatePackage": payload_sections,
        "roundtripPolicy": {
            "targetContract": "inventory_stockout_candidate_evaluation_metadata_import_v1",
            "targetPhase": "Phase 9B",
            "metadataImportOnly": True,
            "modelJoblibImported": False,
            "modelBytesImported": False,
            "backendExecutionEnabled": False,
            "backendInferenceEndpointEnabled": False,
            "artifactActivationEnabled": False,
            "businessMutationEnabled": False,
        },
    }

    report = validate_phase9b_import_payload(payload, roundtrip_expectations)
    write_json(output_dir / IMPORT_PAYLOAD_FILENAME, payload)
    write_json(output_dir / IMPORT_PAYLOAD_REPORT_FILENAME, report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Build and validate a Phase 9B-compatible metadata import payload from an offline candidate package.")
    parser.add_argument("--candidate-package-dir", required=True, help="Directory containing the offline candidate package JSON outputs.")
    parser.add_argument("--training-package-dir", help="Optional training package directory for source checksum verification.")
    parser.add_argument("--contract-expectations", default=str(DEFAULT_CONTRACT_EXPECTATIONS_PATH), help="Phase 10D candidate package contract expectations JSON.")
    parser.add_argument("--roundtrip-expectations", default=str(DEFAULT_ROUNDTRIP_EXPECTATIONS_PATH), help="Phase 10F roundtrip import expectations JSON.")
    parser.add_argument("--output-dir", required=True, help="Directory for the import payload and validation report.")
    args = parser.parse_args()

    report = build_phase9b_import_payload(
        candidate_package_dir=Path(args.candidate_package_dir),
        training_package_dir=Path(args.training_package_dir) if args.training_package_dir else None,
        contract_expectations_path=Path(args.contract_expectations),
        roundtrip_expectations_path=Path(args.roundtrip_expectations),
        output_dir=Path(args.output_dir),
    )
    print(f"Phase 9B roundtrip import payload validation status: {report['status']}")
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
