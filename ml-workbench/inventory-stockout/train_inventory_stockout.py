#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, mean_absolute_error, precision_score, r2_score, recall_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from _workbench_common import (
    DEFAULT_CREATED_BY,
    DEFAULT_MODEL_FAMILY,
    DEFAULT_MODEL_KEY,
    EXTENDED_SAFETY_RESTRICTIONS,
    NUMERIC_TYPES,
    PREDICTION_TYPE,
    WORKBENCH_VERSION,
    feature_contract_summary,
    feature_specs,
    horizon_days_from_manifest,
    load_manifest,
    prediction_kind,
    safe_relative,
    sha256_file,
    short_hash,
    target_column,
    target_definition,
    assert_offline_metadata_enrichment_valid,
    utc_now,
    assert_offline_metadata_enrichment_valid,
    validate_candidate_output_contract,
    write_json,
)
from validate_training_package import validate_training_package
from offline_metadata_enrichment import EnrichmentInputs, build_offline_metadata_enrichment

RANDOM_SEED = 42
MAX_SAMPLE_ROWS = 20


def read_package_csvs(package_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    return pd.read_csv(package_dir / "train.csv"), pd.read_csv(package_dir / "test.csv")


def split_feature_types(manifest: dict[str, Any]) -> tuple[list[str], list[str]]:
    numeric: list[str] = []
    categorical: list[str] = []
    for spec in feature_specs(manifest):
        key = str(spec.get("key", "")).strip()
        if not key:
            continue
        declared_type = str(spec.get("type", "number")).lower()
        if declared_type in NUMERIC_TYPES:
            numeric.append(key)
        else:
            categorical.append(key)
    return numeric, categorical


def build_preprocessor(numeric_features: list[str], categorical_features: list[str]) -> ColumnTransformer:
    transformers: list[tuple[str, Pipeline, list[str]]] = []
    if numeric_features:
        transformers.append((
            "numeric",
            Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))]),
            numeric_features,
        ))
    if categorical_features:
        transformers.append((
            "categorical",
            Pipeline(steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]),
            categorical_features,
        ))
    return ColumnTransformer(transformers=transformers, remainder="drop")


def normalise_target(series: pd.Series, kind: str) -> pd.Series:
    if kind == "regression":
        return pd.to_numeric(series, errors="coerce")
    if series.dtype == object:
        return series.astype(str).str.strip().replace({"true": 1, "false": 0, "True": 1, "False": 0})
    return series


def rmse(y_true: pd.Series, y_pred: np.ndarray) -> float | None:
    if len(y_true) == 0:
        return None
    value = np.sqrt(np.mean((np.asarray(y_true, dtype=float) - np.asarray(y_pred, dtype=float)) ** 2))
    return float(value)


def safe_classification_metrics(y_true: pd.Series, y_pred: np.ndarray, proba: np.ndarray | None) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    metrics: dict[str, Any] = {
        "accuracy": None,
        "precision": None,
        "recall": None,
        "f1": None,
        "roc_auc": None,
        "confusionMatrix": None,
        "positiveClassRate": None,
        "predictionDistribution": {},
    }
    if len(y_true) == 0:
        warnings.append("Test split is empty; classification metrics are not computable.")
        return metrics, warnings

    unique_true = sorted(pd.Series(y_true).dropna().unique().tolist())
    unique_pred = sorted(pd.Series(y_pred).dropna().unique().tolist())
    labels = sorted(set(unique_true + unique_pred))
    metrics["accuracy"] = float(accuracy_score(y_true, y_pred))
    metrics["precision"] = float(precision_score(y_true, y_pred, zero_division=0)) if len(labels) <= 2 else float(precision_score(y_true, y_pred, average="weighted", zero_division=0))
    metrics["recall"] = float(recall_score(y_true, y_pred, zero_division=0)) if len(labels) <= 2 else float(recall_score(y_true, y_pred, average="weighted", zero_division=0))
    metrics["f1"] = float(f1_score(y_true, y_pred, zero_division=0)) if len(labels) <= 2 else float(f1_score(y_true, y_pred, average="weighted", zero_division=0))
    metrics["confusionMatrix"] = confusion_matrix(y_true, y_pred, labels=labels).tolist()
    metrics["confusionMatrixLabels"] = [str(label) for label in labels]
    metrics["positiveClassRate"] = float(pd.Series(y_true).astype(float).mean()) if set(unique_true).issubset({0, 1, 0.0, 1.0}) else None
    metrics["predictionDistribution"] = {str(key): int(value) for key, value in pd.Series(y_pred).value_counts(dropna=False).sort_index().items()}

    if proba is not None and proba.ndim == 2 and proba.shape[1] >= 2 and len(unique_true) >= 2:
        try:
            metrics["roc_auc"] = float(roc_auc_score(y_true, proba[:, 1]))
        except ValueError as exc:
            warnings.append(f"roc_auc unavailable: {exc}")
    else:
        warnings.append("roc_auc unavailable because probabilities or both test classes are not available.")

    if len(unique_true) < 2:
        warnings.append("Test split contains a single class; class-separation metrics should be interpreted cautiously.")
    return metrics, warnings


def safe_regression_metrics(y_true: pd.Series, y_pred: np.ndarray) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    valid = pd.DataFrame({"y_true": y_true, "y_pred": y_pred}).dropna()
    if valid.empty:
        return {
            "mae": None,
            "rmse": None,
            "r2": None,
            "predictionDistribution": {},
        }, ["No valid regression target rows are available in the test split."]
    metrics = {
        "mae": float(mean_absolute_error(valid["y_true"], valid["y_pred"])),
        "rmse": rmse(valid["y_true"], valid["y_pred"]),
        "r2": None,
        "predictionDistribution": {
            "min": float(np.min(valid["y_pred"])),
            "max": float(np.max(valid["y_pred"])),
            "mean": float(np.mean(valid["y_pred"])),
            "median": float(np.median(valid["y_pred"])),
        },
    }
    if len(valid) > 1:
        metrics["r2"] = float(r2_score(valid["y_true"], valid["y_pred"]))
    else:
        warnings.append("r2 unavailable because fewer than two valid test rows exist.")
    return metrics, warnings


def predict_probabilities(model: Pipeline, x_test: pd.DataFrame) -> np.ndarray | None:
    if hasattr(model, "predict_proba"):
        try:
            return model.predict_proba(x_test)
        except Exception:  # noqa: BLE001 - evaluation should stay robust for local candidate models.
            return None
    return None


def candidate_rows(
    test_df: pd.DataFrame,
    y_pred: np.ndarray,
    proba: np.ndarray | None,
    model_version: str,
    horizon_days: int | None,
    kind: str,
    generated_at: str,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, (_, row) in enumerate(test_df.head(MAX_SAMPLE_ROWS).iterrows()):
        prediction = y_pred[index] if index < len(y_pred) else None
        if kind == "classification" and proba is not None and proba.ndim == 2:
            if proba.shape[1] >= 2:
                score = float(proba[index, 1])
                confidence = float(np.max(proba[index]))
            else:
                score = float(proba[index, 0])
                confidence = score
        elif prediction is not None:
            score = float(prediction) if kind == "regression" else float(prediction)
            confidence = None if kind == "regression" else 1.0
        else:
            score = None
            confidence = None
        rows.append({
            "entityId": str(row.get("productId") or row.get("rowKey") or index),
            "predictionType": PREDICTION_TYPE,
            "horizonDays": int(row.get("horizonDays")) if "horizonDays" in row and pd.notna(row.get("horizonDays")) else horizon_days,
            "score": score,
            "label": str(prediction) if prediction is not None else None,
            "confidence": confidence,
            "modelVersion": model_version,
            "generatedAt": generated_at,
        })
    ok, errors = validate_candidate_output_contract(rows)
    if not ok:
        raise ValueError("Candidate output contract validation failed: " + "; ".join(errors))
    return rows


def train(package_dir: Path, output_dir: Path) -> dict[str, Any]:
    package_dir = package_dir.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    validation = validate_training_package(package_dir)
    write_json(output_dir / "training_package_validation_report.json", validation)
    if validation["status"] == "fail":
        raise ValueError("Training package validation failed. See training_package_validation_report.json.")

    manifest = load_manifest(package_dir)
    train_df, test_df = read_package_csvs(package_dir)
    features = validation["features"]
    target = target_column(manifest)
    if not target:
        raise ValueError("Manifest target key is required.")
    kind = prediction_kind(manifest)
    numeric_features, categorical_features = split_feature_types(manifest)

    x_train = train_df[features].copy()
    x_test = test_df[features].copy()
    y_train = normalise_target(train_df[target], kind)
    y_test = normalise_target(test_df[target], kind)

    generated_at = utc_now()
    model_version = f"v{generated_at.replace('-', '').replace(':', '').replace('Z', 'Z').replace('T', '')}"
    warnings: list[str] = list(validation.get("warnings", []))

    preprocessor = build_preprocessor(numeric_features, categorical_features)
    if kind == "classification":
        unique_train_classes = pd.Series(y_train).dropna().unique()
        if len(unique_train_classes) >= 2:
            estimator = LogisticRegression(max_iter=1000, random_state=RANDOM_SEED, class_weight="balanced")
            algorithm = "LogisticRegression"
        else:
            estimator = DummyClassifier(strategy="most_frequent")
            algorithm = "DummyClassifier"
            warnings.append("Training split contains a single class; DummyClassifier fallback was used.")
    else:
        valid_target_count = int(pd.Series(y_train).dropna().shape[0])
        if valid_target_count >= 2:
            estimator = RandomForestRegressor(n_estimators=80, random_state=RANDOM_SEED, min_samples_leaf=1)
            algorithm = "RandomForestRegressor"
        else:
            estimator = DummyRegressor(strategy="mean")
            algorithm = "DummyRegressor"
            warnings.append("Regression target has fewer than two valid rows; DummyRegressor fallback was used.")

    model = Pipeline(steps=[("preprocess", preprocessor), ("model", estimator)])
    if kind == "regression":
        fit_mask = pd.Series(y_train).notna()
        model.fit(x_train.loc[fit_mask], pd.Series(y_train).loc[fit_mask])
    else:
        model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    proba = predict_probabilities(model, x_test) if kind == "classification" else None
    if kind == "classification":
        metrics, metric_warnings = safe_classification_metrics(y_test, y_pred, proba)
    else:
        metrics, metric_warnings = safe_regression_metrics(y_test, y_pred)
    warnings.extend(metric_warnings)

    metrics_payload = {
        "generatedAt": generated_at,
        "predictionType": PREDICTION_TYPE,
        "targetColumn": target,
        "modelVersion": model_version,
        "algorithm": algorithm,
        "trainingRows": int(len(train_df)),
        "testRows": int(len(test_df)),
        "metrics": metrics,
        "warnings": warnings,
    }

    evaluation_report = {
        "generatedAt": generated_at,
        "status": "warning" if warnings else "pass",
        "predictionKind": kind,
        "modelKey": DEFAULT_MODEL_KEY,
        "modelVersion": model_version,
        "algorithm": algorithm,
        "target": target_definition(manifest),
        "featureContract": feature_contract_summary(manifest),
        "metrics": metrics,
        "warnings": warnings,
        "safetyRestrictions": EXTENDED_SAFETY_RESTRICTIONS,
    }

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
        horizon_days=horizon_days_from_manifest(manifest),
        kind=kind,
        generated_at=generated_at,
    )

    model_path = output_dir / "model.joblib"
    joblib.dump(model, model_path)

    metadata = {
        "generatedAt": generated_at,
        "workbenchVersion": WORKBENCH_VERSION,
        "modelKey": DEFAULT_MODEL_KEY,
        "modelVersion": model_version,
        "modelFamily": DEFAULT_MODEL_FAMILY,
        "algorithm": algorithm,
        "predictionType": PREDICTION_TYPE,
        "predictionKind": kind,
        "target": target_definition(manifest),
        "targetColumn": target,
        "horizonDays": horizon_days_from_manifest(manifest),
        "features": features,
        "numericFeatures": numeric_features,
        "categoricalFeatures": categorical_features,
        "trainingPackageReference": {
            "packageDir": str(package_dir),
            "manifest": "manifest.json",
            "trainCsv": "train.csv",
            "testCsv": "test.csv",
        },
        "trainingManifestHash": sha256_file(package_dir / "manifest.json"),
        "createdBy": DEFAULT_CREATED_BY,
        "safetyPolicy": EXTENDED_SAFETY_RESTRICTIONS,
        "metadataEnrichment": metadata_enrichment,
    }

    write_json(output_dir / "metrics.json", metrics_payload)
    write_json(output_dir / "evaluation_report.json", evaluation_report)
    write_json(output_dir / "candidate_output_sample.json", sample)
    write_json(output_dir / "model_metadata.json", metadata)

    return {
        "status": evaluation_report["status"],
        "modelPath": safe_relative(model_path, Path.cwd()),
        "metricsPath": safe_relative(output_dir / "metrics.json", Path.cwd()),
        "evaluationReportPath": safe_relative(output_dir / "evaluation_report.json", Path.cwd()),
        "candidateOutputSamplePath": safe_relative(output_dir / "candidate_output_sample.json", Path.cwd()),
        "modelVersion": model_version,
        "algorithm": algorithm,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Train an offline Kourosh Inventory Stockout candidate model.")
    parser.add_argument("--package-dir", required=True, help="Directory containing manifest.json, train.csv, and test.csv.")
    parser.add_argument("--output-dir", required=True, help="Local output directory for model.joblib and metadata.")
    args = parser.parse_args()

    result = train(Path(args.package_dir), Path(args.output_dir))
    print(f"Offline training status: {result['status']}")
    print(f"Model artifact written locally: {result['modelPath']}")
    print(f"Metrics written to: {result['metricsPath']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
