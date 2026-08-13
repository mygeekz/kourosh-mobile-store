#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from _workbench_common import (
    DEFAULT_MODEL_KEY,
    EXTENDED_SAFETY_RESTRICTIONS,
    PREDICTION_TYPE,
    feature_contract_summary,
    load_manifest,
    prediction_kind,
    read_json,
    target_column,
    target_definition,
    assert_offline_metadata_enrichment_valid,
    utc_now,
    write_json,
)
from train_inventory_stockout import (
    candidate_rows,
    normalise_target,
    predict_probabilities,
    safe_classification_metrics,
    safe_regression_metrics,
)
from validate_training_package import validate_training_package
from offline_metadata_enrichment import EnrichmentInputs, build_offline_metadata_enrichment

# Metric surface: accuracy, precision, recall, f1, roc_auc, confusion matrix, mae, rmse, r2.


def evaluate(package_dir: Path, model_dir: Path, output_dir: Path) -> dict[str, Any]:
    package_dir = package_dir.resolve()
    model_dir = model_dir.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    validation = validate_training_package(package_dir)
    write_json(output_dir / "training_package_validation_report.json", validation)
    if validation["status"] == "fail":
        raise ValueError("Training package validation failed. See training_package_validation_report.json.")

    model_path = model_dir / "model.joblib"
    if not model_path.exists():
        raise FileNotFoundError(f"Missing local model artifact: {model_path}")

    metadata_path = model_dir / "model_metadata.json"
    metadata = read_json(metadata_path) if metadata_path.exists() else {}
    model = joblib.load(model_path)
    manifest = load_manifest(package_dir)
    test_df = pd.read_csv(package_dir / "test.csv")
    features = validation["features"]
    target = target_column(manifest)
    if not target:
        raise ValueError("Manifest target key is required.")

    kind = str(metadata.get("predictionKind") or prediction_kind(manifest))
    x_test = test_df[features].copy()
    y_test = normalise_target(test_df[target], kind)
    y_pred = model.predict(x_test)
    proba = predict_probabilities(model, x_test) if kind == "classification" else None

    generated_at = utc_now()
    warnings: list[str] = list(validation.get("warnings", []))
    if kind == "classification":
        metrics, metric_warnings = safe_classification_metrics(y_test, y_pred, proba)
    else:
        metrics, metric_warnings = safe_regression_metrics(y_test, y_pred)
    warnings.extend(metric_warnings)

    model_version = str(metadata.get("modelVersion") or "unknown_offline_model_version")
    metrics_payload = {
        "generatedAt": generated_at,
        "predictionType": PREDICTION_TYPE,
        "targetColumn": target,
        "modelVersion": model_version,
        "algorithm": metadata.get("algorithm", "unknown"),
        "trainingRows": validation["rowCounts"]["train"],
        "testRows": validation["rowCounts"]["test"],
        "metrics": metrics,
        "warnings": warnings,
    }
    evaluation_report = {
        "generatedAt": generated_at,
        "status": "warning" if warnings else "pass",
        "predictionKind": kind,
        "modelKey": metadata.get("modelKey", DEFAULT_MODEL_KEY),
        "modelVersion": model_version,
        "algorithm": metadata.get("algorithm", "unknown"),
        "target": target_definition(manifest),
        "featureContract": feature_contract_summary(manifest),
        "metrics": metrics,
        "warnings": warnings,
        "safetyRestrictions": EXTENDED_SAFETY_RESTRICTIONS,
    }
    train_df = pd.read_csv(package_dir / "train.csv")
    enrichment_inputs = EnrichmentInputs(
        manifest=manifest,
        train_df=train_df,
        test_df=test_df,
        features=features,
        target=target,
        kind=kind,
        y_true=y_test,
        y_pred=y_pred,
        proba=proba,
        model_version=model_version,
        generated_at=generated_at,
    )
    metadata_enrichment = build_offline_metadata_enrichment(enrichment_inputs, metrics_payload, validation)
    enrichment_validation_report = assert_offline_metadata_enrichment_valid(metadata_enrichment)
    write_json(output_dir / "offline_metadata_enrichment_validation_report.json", enrichment_validation_report)
    metrics_payload["metadataEnrichment"] = metadata_enrichment
    metrics_payload["offlineMetadataEnrichmentValidation"] = enrichment_validation_report
    metrics_payload["thresholdScenarios"] = metadata_enrichment["thresholdScenarioMetadata"]
    metrics_payload["calibrationMetadata"] = metadata_enrichment["calibrationMetadata"]
    metrics_payload["errorAnalysis"] = metadata_enrichment["errorAnalysis"]
    metrics_payload["robustnessMetadata"] = metadata_enrichment["robustnessMetadata"]
    metrics_payload["deploymentReadinessMetadata"] = metadata_enrichment["deploymentReadinessMetadata"]
    evaluation_report.update(metadata_enrichment)
    evaluation_report["metadataEnrichment"] = metadata_enrichment
    evaluation_report["offlineMetadataEnrichmentValidation"] = enrichment_validation_report
    sample = candidate_rows(
        test_df=test_df,
        y_pred=y_pred,
        proba=proba,
        model_version=model_version,
        horizon_days=metadata.get("horizonDays"),
        kind=kind,
        generated_at=generated_at,
    )

    write_json(output_dir / "metrics.json", metrics_payload)
    write_json(output_dir / "evaluation_report.json", evaluation_report)
    write_json(output_dir / "candidate_output_sample.json", sample)
    return {
        "status": evaluation_report["status"],
        "metricsPath": str(output_dir / "metrics.json"),
        "evaluationReportPath": str(output_dir / "evaluation_report.json"),
        "candidateOutputSamplePath": str(output_dir / "candidate_output_sample.json"),
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate a local offline Kourosh Inventory Stockout candidate model.")
    parser.add_argument("--package-dir", required=True, help="Directory containing manifest.json, train.csv, and test.csv.")
    parser.add_argument("--model-dir", required=True, help="Directory containing model.joblib and model_metadata.json.")
    parser.add_argument("--output-dir", required=True, help="Output directory for metrics and evaluation report.")
    args = parser.parse_args()

    result = evaluate(Path(args.package_dir), Path(args.model_dir), Path(args.output_dir))
    print(f"Offline evaluation status: {result['status']}")
    print(f"Metrics written to: {result['metricsPath']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
