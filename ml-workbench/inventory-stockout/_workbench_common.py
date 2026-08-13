from __future__ import annotations

import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

WORKBENCH_VERSION = "phase10b-v1"
OFFLINE_METADATA_ENRICHMENT_SCHEMA_VERSION = "phase10b-v1"
PREDICTION_TYPE = "inventory_stockout"
DEFAULT_MODEL_KEY = "inventory_stockout_stockout_risk_candidate"
DEFAULT_MODEL_FAMILY = "sklearn_baseline"
DEFAULT_CREATED_BY = "offline_inventory_stockout_workbench"

ALLOWED_OUTPUT_FIELDS = {
    "entityId",
    "predictionType",
    "horizonDays",
    "score",
    "label",
    "confidence",
    "modelVersion",
    "generatedAt",
}

FORBIDDEN_OUTPUT_FIELDS = {
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
    "write_inventory",
    "write_accounting",
    "write_ledger",
    "write_report",
}

SAFETY_POLICY = {
    "backendModelExecutionAllowed": False,
    "backendInferenceEndpointExposed": False,
    "productionIntegrationAllowed": False,
    "decisionAutomationAllowed": False,
    "canChangeInventoryOrAccounting": False,
    "artifactActivationAllowed": False,
}

EXTENDED_SAFETY_RESTRICTIONS = {
    **SAFETY_POLICY,
    "runtimeInvocationAllowed": False,
    "canChangePricing": False,
    "canChangeReports": False,
    "canChangeLedger": False,
    "canMutateBusinessRecords": False,
    "artifactExecutionAllowed": False,
    "artifactBytesLoadingAllowed": False,
    "artifactBytesLoadingAllowedInBackend": False,
    "rawTrainingCsvLoadingAllowed": False,
    "rawTrainingCsvLoadingAllowedInBackend": False,
    "automaticDeletionAllowed": False,
    "purgeJobAllowed": False,
    "notApprovedForProduction": True,
    "notApprovedForBackendExecution": True,
}

NUMERIC_TYPES = {"number", "integer", "float", "double", "decimal", "binary", "boolean", "bool"}
CATEGORICAL_TYPES = {"category", "categorical", "string", "text", "enum"}
CLASSIFICATION_TARGET_TYPES = {"binary", "classification", "multiclass", "category", "categorical", "boolean", "bool"}
REGRESSION_TARGET_TYPES = {"number", "integer", "float", "double", "decimal", "regression"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return value


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def short_hash(value: str, length: int = 12) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:length]


def load_manifest(package_dir: Path) -> dict[str, Any]:
    return read_json(package_dir / "manifest.json")


def dataset_identity(manifest: dict[str, Any]) -> dict[str, Any]:
    identity = manifest.get("datasetIdentity")
    if isinstance(identity, dict) and identity:
        return identity
    keys = ["packageKey", "packageVersion", "datasetKey", "datasetVersion", "createdAt"]
    return {key: manifest.get(key) for key in keys if manifest.get(key) is not None}


def feature_specs(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    schema = manifest.get("featureSchema")
    if isinstance(schema, list):
        return [item for item in schema if isinstance(item, dict) and str(item.get("key", "")).strip()]

    contract = manifest.get("featureContract")
    if isinstance(contract, dict):
        for key in ("features", "requiredFeatures", "featureSchema", "columns"):
            values = contract.get(key)
            if isinstance(values, list):
                specs: list[dict[str, Any]] = []
                for item in values:
                    if isinstance(item, str):
                        specs.append({"key": item, "type": "number", "nullable": True})
                    elif isinstance(item, dict) and str(item.get("key") or item.get("name") or "").strip():
                        specs.append({
                            "key": item.get("key") or item.get("name"),
                            "type": item.get("type", "number"),
                            "nullable": bool(item.get("nullable", True)),
                            "description": item.get("description", ""),
                        })
                if specs:
                    return specs
    return []


def feature_names(manifest: dict[str, Any]) -> list[str]:
    return [str(spec["key"]).strip() for spec in feature_specs(manifest)]


def target_definition(manifest: dict[str, Any]) -> dict[str, Any]:
    target = manifest.get("target") or manifest.get("targetDefinition") or manifest.get("label") or {}
    if isinstance(target, str):
        return {"key": target, "type": "binary"}
    if isinstance(target, dict):
        key = target.get("key") or target.get("name") or target.get("column")
        return {**target, "key": key} if key else target
    return {}


def target_column(manifest: dict[str, Any]) -> str | None:
    key = target_definition(manifest).get("key")
    return str(key).strip() if key else None


def prediction_kind(manifest: dict[str, Any]) -> str:
    target = target_definition(manifest)
    declared = str(target.get("type") or target.get("predictionType") or "binary").strip().lower()
    if declared in REGRESSION_TARGET_TYPES:
        return "regression"
    return "classification"


def horizon_days_from_manifest(manifest: dict[str, Any], default: int = 14) -> int | None:
    for container_key in ("target", "split", "datasetIdentity"):
        container = manifest.get(container_key)
        if isinstance(container, dict) and container.get("horizonDays") is not None:
            try:
                return int(container["horizonDays"])
            except (TypeError, ValueError):
                return default
    if manifest.get("horizonDays") is not None:
        try:
            return int(manifest["horizonDays"])
        except (TypeError, ValueError):
            return default
    return default


def read_csv_header(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        for row in reader:
            return [str(value).strip() for value in row]
    return []


def count_csv_rows(path: Path) -> int:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        try:
            next(reader)
        except StopIteration:
            return 0
        return sum(1 for row in reader if any(str(cell).strip() for cell in row))


def feature_contract_summary(manifest: dict[str, Any]) -> dict[str, Any]:
    specs = feature_specs(manifest)
    return {
        "featureCount": len(specs),
        "features": specs,
        "featureNames": [str(spec.get("key")) for spec in specs],
    }


def output_contract() -> dict[str, Any]:
    return {
        "allowedFields": sorted(ALLOWED_OUTPUT_FIELDS),
        "forbiddenFields": sorted(FORBIDDEN_OUTPUT_FIELDS),
        "additionalFieldsAllowed": False,
        "businessMutationAllowed": False,
    }


def find_forbidden_output_fields(value: Any, path: str = "$") -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            next_path = f"{path}.{key}"
            if key in FORBIDDEN_OUTPUT_FIELDS:
                findings.append(next_path)
            findings.extend(find_forbidden_output_fields(item, next_path))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            findings.extend(find_forbidden_output_fields(item, f"{path}[{index}]"))
    return findings


def validate_candidate_output_contract(rows: Any) -> tuple[bool, list[str]]:
    errors: list[str] = []
    forbidden = find_forbidden_output_fields(rows)
    if forbidden:
        errors.append(f"Forbidden mutation output field(s) found: {', '.join(forbidden)}")
    if not isinstance(rows, list):
        errors.append("Candidate output sample must be a JSON array.")
        return False, errors
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"Candidate output row {index} must be an object.")
            continue
        fields = set(row.keys())
        extra = fields - ALLOWED_OUTPUT_FIELDS
        missing = ALLOWED_OUTPUT_FIELDS - fields
        if extra:
            errors.append(f"Candidate output row {index} has non-contract field(s): {', '.join(sorted(extra))}")
        if missing:
            errors.append(f"Candidate output row {index} is missing required field(s): {', '.join(sorted(missing))}")
    return not errors, errors



ENRICHMENT_REQUIRED_SECTIONS = {
    "thresholdScenarioMetadata",
    "calibrationMetadata",
    "errorAnalysis",
    "datasetSliceDiagnostics",
    "dataDrift",
    "featureContractDrift",
    "robustnessMetadata",
    "deploymentReadinessMetadata",
}

ENRICHMENT_FORBIDDEN_FIELDS = FORBIDDEN_OUTPUT_FIELDS | {
    "modelBinary",
    "modelBytes",
    "artifactBytes",
    "artifactPayload",
    "binaryPayload",
    "serializedModel",
    "base64Model",
    "picklePayload",
    "executableArtifactBytes",
    "backendModelExecutionAllowed",
    "backendInferenceEndpointExposed",
    "productionIntegrationAllowed",
    "decisionAutomationAllowed",
    "canChangeInventoryOrAccounting",
    "artifactActivationAllowed",
}

ENRICHMENT_ALLOWED_STATUS = {"available", "not_available", "pass", "warning", "fail", "limited", "missing", "unchanged", "metadata_summary_ready", "metadata_summary_warning"}


def find_forbidden_enrichment_fields(value: Any, path: str = "$") -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            next_path = f"{path}.{key}"
            if key in ENRICHMENT_FORBIDDEN_FIELDS:
                item_is_false_safety = key in EXTENDED_SAFETY_RESTRICTIONS and item is False
                if not item_is_false_safety:
                    findings.append(next_path)
            findings.extend(find_forbidden_enrichment_fields(item, next_path))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            findings.extend(find_forbidden_enrichment_fields(item, f"{path}[{index}]"))
    return findings


def _is_number_or_none(value: Any) -> bool:
    return value is None or isinstance(value, (int, float))


def _section_status(section: Any) -> str | None:
    if not isinstance(section, dict):
        return None
    status = section.get("status")
    return str(status) if status is not None else None


def validate_offline_metadata_enrichment(payload: Any) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    section_results: dict[str, Any] = {}

    if not isinstance(payload, dict):
        return {
            "status": "fail",
            "schemaVersion": OFFLINE_METADATA_ENRICHMENT_SCHEMA_VERSION,
            "generatedAt": utc_now(),
            "errors": ["offline_metadata_enrichment must be a JSON object."],
            "warnings": [],
            "sectionResults": {},
        }

    for key in ("generatedAt", "workbenchEnrichmentVersion"):
        if not payload.get(key):
            errors.append(f"Missing required top-level field: {key}")

    missing_sections = sorted(section for section in ENRICHMENT_REQUIRED_SECTIONS if section not in payload)
    for section in missing_sections:
        errors.append(f"Missing required enrichment section: {section}")

    forbidden = find_forbidden_enrichment_fields(payload)
    if forbidden:
        errors.append("Forbidden execution/mutation/artifact field(s) found in enrichment metadata: " + ", ".join(forbidden))

    for section in sorted(ENRICHMENT_REQUIRED_SECTIONS):
        value = payload.get(section)
        result = {"present": section in payload, "status": None, "errors": [], "warnings": []}
        if section not in payload:
            section_results[section] = result
            continue
        if not isinstance(value, dict):
            result["errors"].append("Section must be a JSON object.")
            errors.append(f"{section} must be a JSON object.")
            section_results[section] = result
            continue
        status = _section_status(value)
        result["status"] = status
        if status is not None and status not in ENRICHMENT_ALLOWED_STATUS:
            result["errors"].append(f"Unsupported status: {status}")
            errors.append(f"{section} has unsupported status: {status}")
        if status == "not_available":
            if not value.get("reason") and not value.get("warnings"):
                result["warnings"].append("not_available section should include a reason or warning.")
                warnings.append(f"{section} is not_available without a reason/warning.")
            section_results[section] = result
            continue

        if section == "thresholdScenarioMetadata":
            scenarios = value.get("thresholds") or value.get("thresholdScenarios") or []
            if not isinstance(scenarios, list):
                result["errors"].append("thresholds/thresholdScenarios must be an array.")
                errors.append("thresholdScenarioMetadata thresholds must be an array.")
            else:
                result["itemCount"] = len(scenarios)
                for index, item in enumerate(scenarios):
                    if not isinstance(item, dict):
                        errors.append(f"thresholdScenarioMetadata.thresholds[{index}] must be an object.")
                        continue
                    if not _is_number_or_none(item.get("threshold")):
                        errors.append(f"thresholdScenarioMetadata.thresholds[{index}].threshold must be numeric or null.")
                    for metric in ("precision", "recall", "f1", "accuracy", "predictedPositiveRate"):
                        if metric in item and not _is_number_or_none(item.get(metric)):
                            errors.append(f"thresholdScenarioMetadata.thresholds[{index}].{metric} must be numeric or null.")
        elif section == "calibrationMetadata":
            bins = value.get("probabilityBins") or value.get("bins") or []
            if not isinstance(bins, list):
                errors.append("calibrationMetadata probabilityBins/bins must be an array.")
            else:
                result["itemCount"] = len(bins)
                for index, item in enumerate(bins):
                    if not isinstance(item, dict):
                        errors.append(f"calibrationMetadata.bins[{index}] must be an object.")
                        continue
                    for metric in ("lowerBound", "upperBound", "meanPredictedProbability", "observedPositiveRate"):
                        if metric in item and not _is_number_or_none(item.get(metric)):
                            errors.append(f"calibrationMetadata.bins[{index}].{metric} must be numeric or null.")
                    if "sampleCount" in item and not isinstance(item.get("sampleCount"), int):
                        errors.append(f"calibrationMetadata.bins[{index}].sampleCount must be an integer.")
            for metric in ("brierScore", "expectedCalibrationError", "ece"):
                if metric in value and not _is_number_or_none(value.get(metric)):
                    errors.append(f"calibrationMetadata.{metric} must be numeric or null.")
        elif section == "errorAnalysis":
            for array_key in ("falsePositives", "falseNegatives", "highConfidenceWrongPredictions", "errorBuckets"):
                if array_key in value and not isinstance(value.get(array_key), list):
                    errors.append(f"errorAnalysis.{array_key} must be an array.")
        elif section == "datasetSliceDiagnostics":
            for array_key in ("slices", "sliceDiagnostics", "missingness"):
                if array_key in value and not isinstance(value.get(array_key), list):
                    errors.append(f"datasetSliceDiagnostics.{array_key} must be an array.")
        elif section == "dataDrift":
            for array_key in ("featureDistribution", "missingnessDrift", "driftSignals"):
                if array_key in value and not isinstance(value.get(array_key), list):
                    errors.append(f"dataDrift.{array_key} must be an array when present.")
        elif section == "featureContractDrift":
            for array_key in ("addedFeatures", "removedFeatures", "changedFeatures", "typeDrift", "nullableDrift"):
                if array_key in value and not isinstance(value.get(array_key), list):
                    errors.append(f"featureContractDrift.{array_key} must be an array when present.")
        elif section == "robustnessMetadata":
            for array_key in ("stressTests", "edgeCases", "lowSampleSegments", "missingFeatureStress"):
                if array_key in value and not isinstance(value.get(array_key), list):
                    errors.append(f"robustnessMetadata.{array_key} must be an array when present.")
        elif section == "deploymentReadinessMetadata":
            if "readinessScorePct" in value and not _is_number_or_none(value.get("readinessScorePct")):
                errors.append("deploymentReadinessMetadata.readinessScorePct must be numeric or null.")
            if "checks" in value and not isinstance(value.get("checks"), list):
                errors.append("deploymentReadinessMetadata.checks must be an array when present.")
            safety = value.get("safetyStatus") or {}
            if isinstance(safety, dict):
                for key in (
                    "backendModelExecutionAllowed",
                    "backendInferenceEndpointExposed",
                    "productionIntegrationAllowed",
                    "decisionAutomationAllowed",
                    "canChangeInventoryOrAccounting",
                    "artifactActivationAllowed",
                    "artifactBytesLoadingAllowedInBackend",
                    "rawTrainingCsvLoadingAllowedInBackend",
                ):
                    if safety.get(key) is True:
                        errors.append(f"deploymentReadinessMetadata.safetyStatus.{key} must not be true.")
        section_results[section] = result

    status = "fail" if errors else "warning" if warnings else "pass"
    return {
        "status": status,
        "schemaVersion": OFFLINE_METADATA_ENRICHMENT_SCHEMA_VERSION,
        "generatedAt": utc_now(),
        "sectionCount": len([section for section in ENRICHMENT_REQUIRED_SECTIONS if section in payload]),
        "requiredSectionCount": len(ENRICHMENT_REQUIRED_SECTIONS),
        "sectionResults": section_results,
        "warnings": warnings,
        "errors": errors,
    }


def assert_offline_metadata_enrichment_valid(payload: Any) -> dict[str, Any]:
    report = validate_offline_metadata_enrichment(payload)
    if report["status"] == "fail":
        raise ValueError("Offline metadata enrichment schema validation failed: " + "; ".join(report["errors"]))
    return report


def safe_relative(path: Path, base: Path) -> str:
    try:
        return str(path.resolve().relative_to(base.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def existing_files(paths: Iterable[Path]) -> list[Path]:
    return [path for path in paths if path.exists() and path.is_file()]


def update_output_checksums(output_dir: Path, artifact_names: Iterable[str]) -> dict[str, Any]:
    """Create or refresh SHA-256 entries for generated workbench artifacts.

    The helper intentionally does not hash checksums.json itself, which avoids a
    self-referential checksum loop. Existing source-package hashes are preserved
    unless their named artifact is explicitly refreshed from output_dir.
    """
    output_dir = output_dir.resolve()
    checksums_path = output_dir / "checksums.json"
    if checksums_path.exists():
        try:
            checksums = read_json(checksums_path)
        except Exception:
            checksums = {}
    else:
        checksums = {}

    if not isinstance(checksums.get("files"), dict):
        checksums["files"] = {}
    checksums["generatedAt"] = utc_now()
    checksums["algorithm"] = "sha256"

    for name in artifact_names:
        if name == "checksums.json":
            continue
        path = output_dir / name
        if path.exists() and path.is_file():
            checksums["files"][name] = sha256_file(path)

    write_json(checksums_path, checksums)
    return checksums
