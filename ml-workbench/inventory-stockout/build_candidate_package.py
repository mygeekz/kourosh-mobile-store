#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from _workbench_common import (
    DEFAULT_CREATED_BY,
    DEFAULT_MODEL_FAMILY,
    DEFAULT_MODEL_KEY,
    EXTENDED_SAFETY_RESTRICTIONS,
    SAFETY_POLICY,
    WORKBENCH_VERSION,
    feature_contract_summary,
    horizon_days_from_manifest,
    load_manifest,
    output_contract,
    read_json,
    sha256_file,
    short_hash,
    target_definition,
    utc_now,
    assert_offline_metadata_enrichment_valid,
    validate_candidate_output_contract,
    write_json,
)
from validate_training_package import validate_training_package


def require_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Required JSON file is missing: {path}")
    return read_json(path)


def require_json_array(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(f"Required JSON file is missing: {path}")
    import json
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, list):
        raise ValueError(f"Expected JSON array in {path}")
    return value


def metrics_summary(metrics_payload: dict[str, Any]) -> dict[str, Any]:
    metrics = metrics_payload.get("metrics") if isinstance(metrics_payload.get("metrics"), dict) else {}
    selected = {}
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc", "mae", "rmse", "r2", "positiveClassRate", "predictionDistribution"):
        if key in metrics:
            selected[key] = metrics[key]
    return {
        "status": "warning" if metrics_payload.get("warnings") else "pass",
        "algorithm": metrics_payload.get("algorithm"),
        "trainingRows": metrics_payload.get("trainingRows"),
        "testRows": metrics_payload.get("testRows"),
        "metrics": selected,
        "warnings": metrics_payload.get("warnings", []),
    }


def metadata_enrichment_from(metrics_payload: dict[str, Any], evaluation_report: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    for source in (evaluation_report, metrics_payload, metadata):
        value = source.get("metadataEnrichment")
        if isinstance(value, dict) and value:
            return value
    sections = {
        "thresholdScenarioMetadata": evaluation_report.get("thresholdScenarioMetadata") or metrics_payload.get("thresholdScenarios"),
        "calibrationMetadata": evaluation_report.get("calibrationMetadata") or metrics_payload.get("calibrationMetadata"),
        "errorAnalysis": evaluation_report.get("errorAnalysis") or metrics_payload.get("errorAnalysis"),
        "datasetSliceDiagnostics": evaluation_report.get("datasetSliceDiagnostics"),
        "dataDrift": evaluation_report.get("dataDrift"),
        "featureContractDrift": evaluation_report.get("featureContractDrift"),
        "robustnessMetadata": evaluation_report.get("robustnessMetadata") or metrics_payload.get("robustnessMetadata"),
        "deploymentReadinessMetadata": evaluation_report.get("deploymentReadinessMetadata") or metrics_payload.get("deploymentReadinessMetadata"),
    }
    return {key: value for key, value in sections.items() if isinstance(value, (dict, list)) and value}


def build_model_card(
    manifest: dict[str, Any],
    metadata: dict[str, Any],
    metrics_payload: dict[str, Any],
    validation_report: dict[str, Any],
    metadata_enrichment: dict[str, Any] | None = None,
) -> dict[str, Any]:
    metadata_enrichment = metadata_enrichment or {}
    return {
        "modelPurpose": "Offline candidate model for estimating inventory stockout risk from exported Kourosh training-package files.",
        "predictionType": metadata.get("predictionType", "inventory_stockout"),
        "datasetSource": {
            "description": "Local manifest.json, train.csv, and test.csv exported from the Kourosh Inventory Stockout training package pipeline.",
            "datasetIdentity": validation_report.get("datasetIdentity", {}),
            "rowCounts": validation_report.get("rowCounts", {}),
        },
        "trainingPackageReference": metadata.get("trainingPackageReference", {}),
        "featureList": validation_report.get("features", []),
        "targetDefinition": target_definition(manifest),
        "algorithm": metadata.get("algorithm", metrics_payload.get("algorithm", "unknown")),
        "metrics": metrics_payload.get("metrics", {}),
        "metadataEnrichment": metadata_enrichment,
        "calibrationMetadata": metadata_enrichment.get("calibrationMetadata"),
        "thresholdScenarioMetadata": metadata_enrichment.get("thresholdScenarioMetadata"),
        "errorAnalysis": metadata_enrichment.get("errorAnalysis"),
        "robustnessMetadata": metadata_enrichment.get("robustnessMetadata"),
        "deploymentReadinessMetadata": metadata_enrichment.get("deploymentReadinessMetadata"),
        "knownLimitations": [
            "Offline candidate artifact only; it is not a production model.",
            "Tiny fixture datasets are for smoke testing only and do not support production-readiness claims.",
            "Metrics may be unavailable or unstable when train/test splits are small or single-class.",
            "The workbench does not connect to the Kourosh database or call Kourosh API endpoints.",
            "The backend must not load model.joblib or execute this model.",
        ],
        "safetyRestrictions": {
            **EXTENDED_SAFETY_RESTRICTIONS,
            "notApprovedForProduction": True,
            "notApprovedForBackendExecution": True,
            "notApprovedForPricingAccountingInventoryMutation": True,
        },
        "productionReadinessClaim": "not_approved_for_production",
        "backendExecutionClaim": "not_approved_for_backend_execution",
        "businessMutationClaim": "not_approved_for_pricing_accounting_inventory_or_ledger_mutation",
    }


def build_checksums(package_dir: Path, output_dir: Path) -> dict[str, Any]:
    files = {
        "manifest.json": package_dir / "manifest.json",
        "train.csv": package_dir / "train.csv",
        "test.csv": package_dir / "test.csv",
        "candidate_manifest.json": output_dir / "candidate_manifest.json",
        "metrics.json": output_dir / "metrics.json",
        "evaluation_report.json": output_dir / "evaluation_report.json",
        "candidate_output_sample.json": output_dir / "candidate_output_sample.json",
        "model_card.json": output_dir / "model_card.json",
        "training_package_validation_report.json": output_dir / "training_package_validation_report.json",
        "offline_metadata_enrichment.json": output_dir / "offline_metadata_enrichment.json",
        "offline_metadata_enrichment_validation_report.json": output_dir / "offline_metadata_enrichment_validation_report.json",
        "candidate_score_output.json": output_dir / "candidate_score_output.json",
        "candidate_score_output.csv": output_dir / "candidate_score_output.csv",
        "candidate_score_output_validation_report.json": output_dir / "candidate_score_output_validation_report.json",
        "offline_execution_report.json": output_dir / "offline_execution_report.json",
        "execution_manifest.json": output_dir / "execution_manifest.json",
        "model.joblib": output_dir / "model.joblib",
    }
    return {
        "generatedAt": utc_now(),
        "algorithm": "sha256",
        "files": {
            name: sha256_file(path)
            for name, path in files.items()
            if path.exists() and path.is_file()
        },
    }


def build_candidate_package(package_dir: Path, model_dir: Path, output_dir: Path) -> dict[str, Any]:
    package_dir = package_dir.resolve()
    model_dir = model_dir.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest(package_dir)
    validation_report = validate_training_package(package_dir)
    write_json(output_dir / "training_package_validation_report.json", validation_report)
    if validation_report["status"] == "fail":
        raise ValueError("Training package validation failed. See training_package_validation_report.json.")

    metrics_payload = require_json(model_dir / "metrics.json")
    evaluation_report = require_json(model_dir / "evaluation_report.json")
    metadata = require_json(model_dir / "model_metadata.json")
    candidate_output = require_json_array(model_dir / "candidate_output_sample.json")
    metadata_enrichment = metadata_enrichment_from(metrics_payload, evaluation_report, metadata)
    ok, output_errors = validate_candidate_output_contract(candidate_output)
    if not ok:
        raise ValueError("Candidate output sample failed safe output contract: " + "; ".join(output_errors))

    enrichment_validation_report = assert_offline_metadata_enrichment_valid(metadata_enrichment)
    write_json(output_dir / "offline_metadata_enrichment_validation_report.json", enrichment_validation_report)

    # Copy/refresh package source files into the requested output folder.
    if metadata_enrichment:
        metrics_payload.setdefault("metadataEnrichment", metadata_enrichment)
        evaluation_report.setdefault("metadataEnrichment", metadata_enrichment)
        for key, value in metadata_enrichment.items():
            evaluation_report.setdefault(key, value)
    write_json(output_dir / "metrics.json", metrics_payload)
    write_json(output_dir / "evaluation_report.json", evaluation_report)
    write_json(output_dir / "candidate_output_sample.json", candidate_output)
    write_json(output_dir / "offline_metadata_enrichment.json", metadata_enrichment)

    model_binary_source = model_dir / "model.joblib"
    if model_binary_source.exists() and model_binary_source.resolve() != (output_dir / "model.joblib").resolve():
        (output_dir / "model.joblib").write_bytes(model_binary_source.read_bytes())

    created_at = utc_now()
    training_manifest_hash = sha256_file(package_dir / "manifest.json")
    model_key = str(metadata.get("modelKey") or DEFAULT_MODEL_KEY)
    model_version = str(metadata.get("modelVersion") or metrics_payload.get("modelVersion") or f"offline-{created_at}")
    package_id_seed = f"{model_key}|{model_version}|{training_manifest_hash}"
    candidate_package_id = f"inventory-stockout-candidate-{short_hash(package_id_seed, 16)}"
    model_card = build_model_card(manifest, metadata, metrics_payload, validation_report, metadata_enrichment)
    model_card["offlineMetadataEnrichmentValidation"] = enrichment_validation_report
    write_json(output_dir / "model_card.json", model_card)

    candidate_manifest = {
        "candidatePackageId": candidate_package_id,
        "modelKey": model_key,
        "modelVersion": model_version,
        "modelFamily": str(metadata.get("modelFamily") or DEFAULT_MODEL_FAMILY),
        "predictionType": str(metadata.get("predictionType") or "inventory_stockout"),
        "target": target_definition(manifest),
        "horizonDays": metadata.get("horizonDays", horizon_days_from_manifest(manifest)),
        "trainingPackageReference": metadata.get("trainingPackageReference", {
            "packageDir": str(package_dir),
            "manifest": "manifest.json",
            "trainCsv": "train.csv",
            "testCsv": "test.csv",
        }),
        "trainingManifestHash": training_manifest_hash,
        "featureContract": feature_contract_summary(manifest),
        "outputContract": output_contract(),
        "metricsSummary": metrics_summary(metrics_payload),
        "metadataEnrichment": metadata_enrichment,
        "thresholdScenarioMetadata": metadata_enrichment.get("thresholdScenarioMetadata"),
        "calibrationMetadata": metadata_enrichment.get("calibrationMetadata"),
        "errorAnalysis": metadata_enrichment.get("errorAnalysis"),
        "datasetSliceDiagnostics": metadata_enrichment.get("datasetSliceDiagnostics"),
        "dataDrift": metadata_enrichment.get("dataDrift"),
        "featureContractDrift": metadata_enrichment.get("featureContractDrift"),
        "robustnessMetadata": metadata_enrichment.get("robustnessMetadata"),
        "deploymentReadinessMetadata": metadata_enrichment.get("deploymentReadinessMetadata"),
        "safetyPolicy": SAFETY_POLICY,
        "createdAt": created_at,
        "createdBy": str(metadata.get("createdBy") or DEFAULT_CREATED_BY),
        "workbenchVersion": WORKBENCH_VERSION,
        "checksums": {
            "checksumsFile": "checksums.json",
            "algorithm": "sha256",
            "includedInChecksumsFile": True,
        },
        "productionReadiness": {
            "approvedForProduction": False,
            "approvedForBackendExecution": False,
            "approvedForArtifactActivation": False,
            "approvedForBusinessMutation": False,
        },
    }
    write_json(output_dir / "candidate_manifest.json", candidate_manifest)

    checksums = build_checksums(package_dir, output_dir)
    # Keep a compact non-circular checksum summary in the manifest and then record the final manifest hash in checksums.json.
    candidate_manifest["checksums"] = {
        "algorithm": "sha256",
        "checksumsFile": "checksums.json",
        "sourceManifestSha256": checksums["files"].get("manifest.json"),
        "trainCsvSha256": checksums["files"].get("train.csv"),
        "testCsvSha256": checksums["files"].get("test.csv"),
        "metricsSha256": checksums["files"].get("metrics.json"),
        "evaluationReportSha256": checksums["files"].get("evaluation_report.json"),
        "candidateOutputSampleSha256": checksums["files"].get("candidate_output_sample.json"),
        "modelCardSha256": checksums["files"].get("model_card.json"),
        "offlineMetadataEnrichmentSha256": checksums["files"].get("offline_metadata_enrichment.json"),
        "offlineMetadataEnrichmentValidationReportSha256": checksums["files"].get("offline_metadata_enrichment_validation_report.json"),
        "modelJoblibSha256": checksums["files"].get("model.joblib"),
    }
    write_json(output_dir / "candidate_manifest.json", candidate_manifest)
    checksums = build_checksums(package_dir, output_dir)
    write_json(output_dir / "checksums.json", checksums)

    return {
        "status": "built",
        "candidatePackageId": candidate_package_id,
        "outputDir": str(output_dir),
        "files": sorted(checksums["files"].keys()) + ["checksums.json"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build an offline Kourosh Inventory Stockout candidate package.")
    parser.add_argument("--package-dir", required=True, help="Directory containing manifest.json, train.csv, and test.csv.")
    parser.add_argument("--model-dir", required=True, help="Directory containing model/evaluation outputs from train/evaluate scripts.")
    parser.add_argument("--output-dir", required=True, help="Output directory for candidate package files.")
    args = parser.parse_args()

    result = build_candidate_package(Path(args.package_dir), Path(args.model_dir), Path(args.output_dir))
    print(f"Candidate package status: {result['status']}")
    print(f"Candidate package id: {result['candidatePackageId']}")
    print(f"Output directory: {result['outputDir']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
