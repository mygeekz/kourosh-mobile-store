#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from _workbench_common import (
    FORBIDDEN_OUTPUT_FIELDS,
    update_output_checksums,
    utc_now,
    read_json,
    write_json,
)

ALLOWED_ROW_FIELDS = {
    "entityId",
    "predictionType",
    "horizonDays",
    "score",
    "label",
    "confidence",
    "modelKey",
    "modelVersion",
    "candidatePackageId",
    "generatedAt",
    "sourceRowIndex",
}

REQUIRED_TOP_LEVEL_FIELDS = {
    "candidatePackageId",
    "modelKey",
    "modelVersion",
    "predictionType",
    "horizonDays",
    "rowCount",
    "scoreCount",
    "generatedAt",
    "workbenchVersion",
    "source",
    "safetyPolicy",
    "scores",
}

FORBIDDEN_FIELDS = FORBIDDEN_OUTPUT_FIELDS | {
    "modelBinary",
    "modelBytes",
    "artifactBytes",
    "artifactPayload",
    "binaryPayload",
    "serializedModel",
    "base64Model",
    "picklePayload",
    "executableArtifactBytes",
    "backend_execution",
    "backendExecution",
    "activationDirective",
    "productionDecisionDirective",
    "backendExecutionDirective",
}

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

CHECKSUM_ARTIFACTS = ["candidate_score_output_validation_report.json"]


def _find_forbidden_fields(value: Any, path: str = "$", findings: list[str] | None = None) -> list[str]:
    findings = findings or []
    if isinstance(value, dict):
        for key, item in value.items():
            current = f"{path}.{key}"
            if key in FORBIDDEN_FIELDS:
                findings.append(current)
            if key in FALSE_ONLY_FLAGS and item is True:
                findings.append(current)
            _find_forbidden_fields(item, current, findings)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _find_forbidden_fields(item, f"{path}[{index}]", findings)
    return findings


def _is_number_or_none(value: Any) -> bool:
    return value is None or (isinstance(value, (int, float)) and not isinstance(value, bool))


def _validate_schema(payload: Any) -> tuple[list[str], list[str], int]:
    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(payload, dict):
        return ["Score output must be a JSON object."], warnings, 0

    missing_top = sorted(REQUIRED_TOP_LEVEL_FIELDS - set(payload.keys()))
    extra_top = sorted(set(payload.keys()) - REQUIRED_TOP_LEVEL_FIELDS)
    if missing_top:
        errors.append("Missing top-level field(s): " + ", ".join(missing_top))
    if extra_top:
        errors.append("Unexpected top-level field(s): " + ", ".join(extra_top))

    scores = payload.get("scores")
    if not isinstance(scores, list):
        errors.append("scores must be an array.")
        return errors, warnings, 0

    for index, row in enumerate(scores):
        if not isinstance(row, dict):
            errors.append(f"scores[{index}] must be an object.")
            continue
        missing = sorted(ALLOWED_ROW_FIELDS - set(row.keys()))
        extra = sorted(set(row.keys()) - ALLOWED_ROW_FIELDS)
        if missing:
            errors.append(f"scores[{index}] missing field(s): " + ", ".join(missing))
        if extra:
            errors.append(f"scores[{index}] has unexpected field(s): " + ", ".join(extra))
        if not _is_number_or_none(row.get("score")):
            warnings.append(f"scores[{index}].score is not numeric or null.")
        confidence = row.get("confidence")
        if confidence is not None:
            if not _is_number_or_none(confidence):
                errors.append(f"scores[{index}].confidence must be numeric or null.")
            elif confidence < 0 or confidence > 1:
                errors.append(f"scores[{index}].confidence must be between 0 and 1.")
        if row.get("label") is None or str(row.get("label")).strip() == "":
            errors.append(f"scores[{index}].label must be present.")
        if not row.get("generatedAt"):
            errors.append(f"scores[{index}].generatedAt must be present.")

    row_count = payload.get("rowCount")
    score_count = payload.get("scoreCount")
    if not isinstance(row_count, int):
        errors.append("rowCount must be an integer.")
    if not isinstance(score_count, int):
        errors.append("scoreCount must be an integer.")
    if isinstance(row_count, int) and row_count != len(scores):
        errors.append(f"rowCount {row_count} does not match scores length {len(scores)}.")
    if isinstance(score_count, int) and score_count != len(scores):
        errors.append(f"scoreCount {score_count} does not match scores length {len(scores)}.")
    if not payload.get("generatedAt"):
        errors.append("generatedAt must be present.")
    if not isinstance(payload.get("safetyPolicy"), dict):
        errors.append("safetyPolicy must be present as an object.")

    return errors, warnings, len(scores)


def _validate_manifest_match(payload: dict[str, Any], candidate_manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    for key in ("candidatePackageId", "modelKey", "modelVersion", "predictionType"):
        if str(payload.get(key)) != str(candidate_manifest.get(key)):
            errors.append(f"{key} does not match candidate_manifest.json.")
    return errors


def validate_candidate_score_output(score_output: Path, candidate_package_dir: Path, output_dir: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    forbidden_findings: list[str] = []
    score_count = 0

    if not score_output.exists():
        errors.append(f"Score output does not exist: {score_output}")
        payload: Any = {}
    else:
        try:
            payload = read_json(score_output)
        except Exception as exc:
            errors.append(f"Score output is not valid JSON object: {exc}")
            payload = {}

    candidate_manifest_path = candidate_package_dir / "candidate_manifest.json"
    if not candidate_manifest_path.exists():
        errors.append(f"candidate_manifest.json is missing: {candidate_manifest_path}")
        candidate_manifest: dict[str, Any] = {}
    else:
        try:
            candidate_manifest = read_json(candidate_manifest_path)
        except Exception as exc:
            errors.append(f"candidate_manifest.json is not valid JSON object: {exc}")
            candidate_manifest = {}

    schema_errors, schema_warnings, score_count = _validate_schema(payload)
    errors.extend(schema_errors)
    warnings.extend(schema_warnings)

    if isinstance(payload, dict) and candidate_manifest:
        errors.extend(_validate_manifest_match(payload, candidate_manifest))
        for index, row in enumerate(payload.get("scores") or []):
            if not isinstance(row, dict):
                continue
            for key in ("candidatePackageId", "modelKey", "modelVersion", "predictionType"):
                if str(row.get(key)) != str(candidate_manifest.get(key)):
                    errors.append(f"scores[{index}].{key} does not match candidate_manifest.json.")

    forbidden_findings = _find_forbidden_fields(payload)
    if forbidden_findings:
        errors.append("Forbidden mutation/execution/activation/directive field(s) found: " + ", ".join(forbidden_findings))

    safety = payload.get("safetyPolicy") if isinstance(payload, dict) else None
    if isinstance(safety, dict):
        for flag in FALSE_ONLY_FLAGS:
            if safety.get(flag) is True:
                errors.append(f"safetyPolicy.{flag} must not be true.")
        for flag in ("artifactActivationAllowed", "productionIntegrationAllowed", "decisionAutomationAllowed", "canMutateBusinessRecords"):
            if flag not in safety:
                warnings.append(f"safetyPolicy.{flag} is not explicitly present.")

    status = "fail" if errors else "warning" if warnings else "pass"
    report = {
        "status": status,
        "scoreCount": score_count,
        "warningCount": len(warnings),
        "errorCount": len(errors),
        "forbiddenFieldCount": len(forbidden_findings),
        "warnings": warnings,
        "errors": errors,
        "generatedAt": utc_now(),
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "candidate_score_output_validation_report.json", report)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a Phase 13A offline candidate score output contract.")
    parser.add_argument("--score-output", required=True, help="Path to candidate_score_output.json.")
    parser.add_argument("--candidate-package-dir", required=True, help="Directory containing candidate_manifest.json.")
    parser.add_argument("--output-dir", required=True, help="Directory where candidate_score_output_validation_report.json should be written.")
    args = parser.parse_args()

    report = validate_candidate_score_output(
        score_output=Path(args.score_output),
        candidate_package_dir=Path(args.candidate_package_dir),
        output_dir=Path(args.output_dir),
    )
    print(f"Candidate score output validation status: {report['status']}")
    print(f"Scores: {report['scoreCount']}; warnings: {report['warningCount']}; errors: {report['errorCount']}")
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
