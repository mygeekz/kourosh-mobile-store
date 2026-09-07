from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from _workbench_common import EXTENDED_SAFETY_RESTRICTIONS, feature_specs, feature_contract_summary, target_definition, utc_now

THRESHOLDS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
PROBABILITY_BINS = [(0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.0)]


@dataclass(frozen=True)
class EnrichmentInputs:
    manifest: dict[str, Any]
    train_df: pd.DataFrame
    test_df: pd.DataFrame
    features: list[str]
    target: str
    kind: str
    y_true: pd.Series
    y_pred: np.ndarray
    proba: np.ndarray | None
    model_version: str
    generated_at: str


def _as_float(value: Any) -> float | None:
    try:
        if value is None or pd.isna(value):
            return None
        result = float(value)
        return result if np.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def _safe_div(numerator: float, denominator: float) -> float | None:
    return float(numerator / denominator) if denominator else None


def _entity_id(row: pd.Series, fallback: int) -> str:
    for key in ("productId", "rowKey", "entityId", "sku", "id"):
        value = row.get(key)
        if value is not None and not pd.isna(value):
            return str(value)
    return str(fallback)


def _positive_scores(y_pred: np.ndarray, proba: np.ndarray | None, kind: str) -> np.ndarray | None:
    if kind != "classification":
        return None
    if proba is not None and getattr(proba, "ndim", 0) == 2 and proba.shape[1] >= 2:
        return np.asarray(proba[:, 1], dtype=float)
    try:
        return np.asarray(y_pred, dtype=float)
    except (TypeError, ValueError):
        return None


def _binary_truth(y_true: pd.Series) -> np.ndarray | None:
    try:
        values = pd.to_numeric(y_true, errors="coerce")
        if values.isna().any():
            return None
        unique = set(values.astype(int).unique().tolist())
        if unique.issubset({0, 1}):
            return values.astype(int).to_numpy()
    except Exception:  # noqa: BLE001 - enrichment is best-effort metadata generation only.
        return None
    return None


def _class_metrics(y_true_binary: np.ndarray, y_pred_binary: np.ndarray) -> dict[str, Any]:
    return {
        "accuracy": float(accuracy_score(y_true_binary, y_pred_binary)),
        "precision": float(precision_score(y_true_binary, y_pred_binary, zero_division=0)),
        "recall": float(recall_score(y_true_binary, y_pred_binary, zero_division=0)),
        "f1": float(f1_score(y_true_binary, y_pred_binary, zero_division=0)),
        "predictedPositiveRate": float(np.mean(y_pred_binary)) if len(y_pred_binary) else None,
        "truePositiveCount": int(((y_true_binary == 1) & (y_pred_binary == 1)).sum()),
        "falsePositiveCount": int(((y_true_binary == 0) & (y_pred_binary == 1)).sum()),
        "trueNegativeCount": int(((y_true_binary == 0) & (y_pred_binary == 0)).sum()),
        "falseNegativeCount": int(((y_true_binary == 1) & (y_pred_binary == 0)).sum()),
    }


def build_threshold_scenarios(inputs: EnrichmentInputs) -> dict[str, Any]:
    scores = _positive_scores(inputs.y_pred, inputs.proba, inputs.kind)
    y_true_binary = _binary_truth(inputs.y_true)
    if scores is None or y_true_binary is None or len(scores) == 0:
        return {
            "status": "not_available",
            "reason": "Threshold scenarios require binary classification scores and binary test targets.",
            "scenarios": [],
        }

    scenarios: list[dict[str, Any]] = []
    for threshold in THRESHOLDS:
        predicted = (scores >= threshold).astype(int)
        metrics = _class_metrics(y_true_binary, predicted)
        if threshold <= 0.35:
            label = "recall_oriented_review_only"
        elif threshold >= 0.65:
            label = "precision_oriented_review_only"
        else:
            label = "balanced_review_only"
        scenarios.append({
            "threshold": threshold,
            "label": label,
            "businessSafeScenarioLabel": label,
            "notes": ["Offline evaluation metadata only; not a backend decision threshold."],
            **metrics,
        })

    best_f1 = max(scenarios, key=lambda item: (item.get("f1") or 0, item.get("recall") or 0))
    best_recall = max(scenarios, key=lambda item: (item.get("recall") or 0, item.get("precision") or 0))
    best_precision = max(scenarios, key=lambda item: (item.get("precision") or 0, item.get("recall") or 0))
    return {
        "status": "available",
        "generatedAt": inputs.generated_at,
        "source": "offline_test_split_predictions",
        "scenarioCount": len(scenarios),
        "thresholds": scenarios,
        "thresholdScenarios": scenarios,
        "bestF1Threshold": best_f1.get("threshold"),
        "bestRecallThreshold": best_recall.get("threshold"),
        "bestPrecisionThreshold": best_precision.get("threshold"),
        "safetyNotes": [
            "Threshold metrics are offline metadata only.",
            "The Kourosh backend must not execute thresholds or automate decisions from this metadata.",
        ],
    }


def build_calibration_metadata(inputs: EnrichmentInputs) -> dict[str, Any]:
    scores = _positive_scores(inputs.y_pred, inputs.proba, inputs.kind)
    y_true_binary = _binary_truth(inputs.y_true)
    if scores is None or y_true_binary is None or len(scores) == 0:
        return {
            "status": "not_available",
            "reason": "Calibration metadata requires binary classification scores and binary test targets.",
            "bins": [],
        }

    bins: list[dict[str, Any]] = []
    total = len(scores)
    weighted_abs_error = 0.0
    for lower, upper in PROBABILITY_BINS:
        if upper >= 1.0:
            mask = (scores >= lower) & (scores <= upper)
        else:
            mask = (scores >= lower) & (scores < upper)
        count = int(mask.sum())
        if count:
            mean_predicted = float(np.mean(scores[mask]))
            observed = float(np.mean(y_true_binary[mask]))
            weighted_abs_error += abs(mean_predicted - observed) * count
        else:
            mean_predicted = None
            observed = None
        bins.append({
            "label": f"{lower:.1f}-{upper:.1f}",
            "lowerBound": lower,
            "upperBound": upper,
            "meanPredictedProbability": mean_predicted,
            "observedPositiveRate": observed,
            "sampleCount": count,
        })

    brier = float(np.mean((scores - y_true_binary) ** 2))
    ece = float(weighted_abs_error / total) if total else None
    return {
        "status": "available",
        "generatedAt": inputs.generated_at,
        "source": "offline_test_split_predictions",
        "brierScore": brier,
        "expectedCalibrationError": ece,
        "ece": ece,
        "probabilityBins": bins,
        "bins": bins,
        "safetyNotes": [
            "Calibration is computed offline from the fixed test split only.",
            "No backend probability recalibration is enabled.",
        ],
    }


def build_error_analysis_metadata(inputs: EnrichmentInputs) -> dict[str, Any]:
    scores = _positive_scores(inputs.y_pred, inputs.proba, inputs.kind)
    y_true_binary = _binary_truth(inputs.y_true)
    if y_true_binary is None or len(inputs.y_pred) == 0:
        return {
            "status": "not_available",
            "reason": "Error analysis metadata requires classification predictions and binary test targets.",
            "falsePositives": [],
            "falseNegatives": [],
        }
    if scores is None:
        try:
            scores = np.asarray(inputs.y_pred, dtype=float)
        except (TypeError, ValueError):
            scores = np.zeros(len(inputs.y_pred), dtype=float)
    y_pred_binary = np.asarray(pd.to_numeric(pd.Series(inputs.y_pred), errors="coerce").fillna(0).astype(int))
    false_positive_mask = (y_true_binary == 0) & (y_pred_binary == 1)
    false_negative_mask = (y_true_binary == 1) & (y_pred_binary == 0)
    wrong_mask = y_true_binary != y_pred_binary

    def examples(mask: np.ndarray, limit: int = 10) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        indices = np.where(mask)[0][:limit]
        for index in indices:
            source_row = inputs.test_df.iloc[int(index)]
            rows.append({
                "entityId": _entity_id(source_row, int(index)),
                "actual": int(y_true_binary[index]),
                "predicted": int(y_pred_binary[index]),
                "score": _as_float(scores[index]),
                "confidence": _as_float(max(scores[index], 1 - scores[index])) if scores is not None else None,
                "notes": ["Offline error example only; not a production action."],
            })
        return rows

    high_confidence_wrong = wrong_mask & ((scores >= 0.75) | (scores <= 0.25))
    buckets = [
        {"key": "false_positive", "label": "False positives", "count": int(false_positive_mask.sum()), "severity": "review"},
        {"key": "false_negative", "label": "False negatives", "count": int(false_negative_mask.sum()), "severity": "review"},
        {"key": "high_confidence_wrong", "label": "High-confidence wrong predictions", "count": int(high_confidence_wrong.sum()), "severity": "high_review"},
    ]
    return {
        "status": "available",
        "generatedAt": inputs.generated_at,
        "source": "offline_test_split_predictions",
        "falsePositives": examples(false_positive_mask),
        "falseNegatives": examples(false_negative_mask),
        "highConfidenceWrongPredictions": examples(high_confidence_wrong),
        "errorBuckets": buckets,
        "summary": {
            "falsePositiveCount": int(false_positive_mask.sum()),
            "falseNegativeCount": int(false_negative_mask.sum()),
            "highConfidenceWrongCount": int(high_confidence_wrong.sum()),
            "totalErrors": int(wrong_mask.sum()),
            "testRows": int(len(inputs.test_df)),
        },
        "errorNotes": [
            "Error analysis is generated offline from test split predictions.",
            "Rows are safe examples for review only and do not trigger any business mutation.",
        ],
    }


def _numeric_band(series: pd.Series, value: Any) -> str:
    numeric = pd.to_numeric(series, errors="coerce").dropna()
    candidate = _as_float(value)
    if candidate is None or numeric.empty:
        return "unknown"
    q1 = float(numeric.quantile(0.33))
    q2 = float(numeric.quantile(0.66))
    if candidate <= q1:
        return "low"
    if candidate <= q2:
        return "medium"
    return "high"


def _slice_metrics(y_true: np.ndarray | None, y_pred: np.ndarray, mask: np.ndarray) -> dict[str, Any]:
    count = int(mask.sum())
    if count == 0:
        return {"rowCount": 0, "accuracy": None, "precision": None, "recall": None, "f1": None}
    if y_true is None:
        return {"rowCount": count, "accuracy": None, "precision": None, "recall": None, "f1": None}
    return {"rowCount": count, **_class_metrics(y_true[mask], y_pred[mask])}


def build_slice_and_robustness_metadata(inputs: EnrichmentInputs) -> tuple[dict[str, Any], dict[str, Any]]:
    y_true_binary = _binary_truth(inputs.y_true)
    try:
        y_pred_binary = np.asarray(pd.to_numeric(pd.Series(inputs.y_pred), errors="coerce").fillna(0).astype(int))
    except Exception:  # noqa: BLE001
        y_pred_binary = np.zeros(len(inputs.test_df), dtype=int)

    slices: list[dict[str, Any]] = []
    category_features = [spec["key"] for spec in feature_specs(inputs.manifest) if str(spec.get("type", "")).lower() in {"category", "categorical", "string", "enum"} and spec.get("key") in inputs.test_df.columns]
    for feature in category_features:
        for value, group in inputs.test_df.groupby(feature, dropna=False):
            mask = np.asarray(inputs.test_df.index.isin(group.index), dtype=bool)
            slices.append({
                "key": f"category:{feature}:{value}",
                "family": "category",
                "label": f"{feature} = {value}",
                **_slice_metrics(y_true_binary, y_pred_binary, mask),
                "notes": ["Offline slice diagnostic only."],
            })

    for numeric_feature, family in (("stockQuantity", "stock_level_band"), ("avgDailySold", "sales_velocity_band"), ("soldQty14", "sales_velocity_band")):
        if numeric_feature not in inputs.test_df.columns:
            continue
        bands = inputs.test_df[numeric_feature].apply(lambda value: _numeric_band(inputs.test_df[numeric_feature], value))
        for band, group_indexes in bands.groupby(bands).groups.items():
            mask = np.asarray(inputs.test_df.index.isin(list(group_indexes)), dtype=bool)
            slices.append({
                "key": f"{family}:{numeric_feature}:{band}",
                "family": family,
                "label": f"{numeric_feature} {band}",
                **_slice_metrics(y_true_binary, y_pred_binary, mask),
                "notes": ["Offline slice diagnostic only."],
            })

    missingness_slices: list[dict[str, Any]] = []
    for feature in inputs.features:
        if feature not in inputs.test_df.columns:
            continue
        count = int(inputs.test_df[feature].isna().sum())
        if count > 0:
            mask = inputs.test_df[feature].isna().to_numpy()
            missingness_slices.append({
                "key": f"missing:{feature}",
                "family": "missingness",
                "label": f"Missing {feature}",
                **_slice_metrics(y_true_binary, y_pred_binary, mask),
            })

    target_distribution = {}
    if y_true_binary is not None:
        target_distribution = {
            "positiveCount": int((y_true_binary == 1).sum()),
            "negativeCount": int((y_true_binary == 0).sum()),
            "positiveRate": float(np.mean(y_true_binary)) if len(y_true_binary) else None,
            "rowCount": int(len(y_true_binary)),
        }

    dataset_slice_diagnostics = {
        "status": "available",
        "generatedAt": inputs.generated_at,
        "source": "offline_test_split_predictions",
        "slices": slices,
        "sliceDiagnostics": slices,
        "missingness": missingness_slices,
        "targetDistribution": target_distribution,
        "classBalance": target_distribution,
        "warnings": [] if slices else ["No sliceable categorical or numeric-band metadata was produced."],
    }

    low_sample = [item for item in slices if int(item.get("rowCount") or 0) < 3]
    edge_cases = [item for item in slices if item.get("family") in {"stock_level_band", "sales_velocity_band"}]
    stress_tests = [
        {"key": "all_test_rows", "family": "stress_test", "label": "All offline test rows", **_slice_metrics(y_true_binary, y_pred_binary, np.ones(len(inputs.test_df), dtype=bool))},
        {"key": "low_sample_segments", "family": "low_sample_segment", "label": "Low-sample segments", "rowCount": len(low_sample), "notes": ["Review only; low sample counts reduce confidence."]},
        {"key": "missing_feature_segments", "family": "missing_feature_stress", "label": "Missing-feature stress rows", "rowCount": len(missingness_slices), "notes": ["Review only; no backend stress execution."]},
    ]
    robustness_metadata = {
        "status": "available",
        "generatedAt": inputs.generated_at,
        "source": "offline_test_split_predictions",
        "stressTests": stress_tests,
        "edgeCases": edge_cases[:12],
        "lowSampleSegments": low_sample[:12],
        "missingFeatureStress": missingness_slices[:12],
        "warnings": ["Tiny slice counts should be interpreted cautiously."] if low_sample else [],
        "limitations": ["Robustness metadata is computed offline from the fixed exported package only."],
    }
    return dataset_slice_diagnostics, robustness_metadata


def _feature_distribution(train_df: pd.DataFrame, test_df: pd.DataFrame, features: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for feature in features:
        if feature not in train_df.columns or feature not in test_df.columns:
            continue
        train_numeric = pd.to_numeric(train_df[feature], errors="coerce")
        test_numeric = pd.to_numeric(test_df[feature], errors="coerce")
        if train_numeric.notna().any() or test_numeric.notna().any():
            train_mean = _as_float(train_numeric.mean())
            test_mean = _as_float(test_numeric.mean())
            rows.append({
                "feature": feature,
                "type": "numeric",
                "trainMean": train_mean,
                "testMean": test_mean,
                "absoluteMeanDelta": abs((test_mean or 0) - (train_mean or 0)) if train_mean is not None and test_mean is not None else None,
            })
        else:
            rows.append({
                "feature": feature,
                "type": "categorical",
                "trainUniqueCount": int(train_df[feature].nunique(dropna=True)),
                "testUniqueCount": int(test_df[feature].nunique(dropna=True)),
                "trainTopValue": None if train_df[feature].mode(dropna=True).empty else str(train_df[feature].mode(dropna=True).iloc[0]),
                "testTopValue": None if test_df[feature].mode(dropna=True).empty else str(test_df[feature].mode(dropna=True).iloc[0]),
            })
    return rows


def build_drift_metadata(inputs: EnrichmentInputs) -> tuple[dict[str, Any], dict[str, Any]]:
    train_target = pd.to_numeric(inputs.train_df[inputs.target], errors="coerce") if inputs.target in inputs.train_df.columns else pd.Series(dtype=float)
    test_target = pd.to_numeric(inputs.test_df[inputs.target], errors="coerce") if inputs.target in inputs.test_df.columns else pd.Series(dtype=float)
    feature_distribution = _feature_distribution(inputs.train_df, inputs.test_df, inputs.features)
    missingness = [
        {
            "feature": feature,
            "trainMissingRate": float(inputs.train_df[feature].isna().mean()) if feature in inputs.train_df.columns else None,
            "testMissingRate": float(inputs.test_df[feature].isna().mean()) if feature in inputs.test_df.columns else None,
        }
        for feature in inputs.features
    ]
    data_drift = {
        "status": "available",
        "generatedAt": inputs.generated_at,
        "source": "offline_train_test_metadata_comparison",
        "baselineReference": {"split": "train.csv", "rowCount": int(len(inputs.train_df))},
        "currentReference": {"split": "test.csv", "rowCount": int(len(inputs.test_df))},
        "rowCount": {"baseline": int(len(inputs.train_df)), "candidate": int(len(inputs.test_df)), "delta": int(len(inputs.test_df) - len(inputs.train_df))},
        "targetBalance": {
            "baselinePositiveRate": _as_float(train_target.mean()),
            "candidatePositiveRate": _as_float(test_target.mean()),
            "delta": _as_float(test_target.mean() - train_target.mean()) if len(train_target.dropna()) and len(test_target.dropna()) else None,
        },
        "featureDistributions": feature_distribution,
        "missingness": missingness,
        "warnings": ["Drift metadata compares fixture train/test splits only; no production data is loaded."],
    }

    candidate_contract = feature_contract_summary(inputs.manifest)
    baseline_contract = candidate_contract
    feature_contract_drift = {
        "status": "available",
        "generatedAt": inputs.generated_at,
        "source": "offline_manifest_feature_contract",
        "baselineFeatureContract": baseline_contract,
        "candidateFeatureContract": candidate_contract,
        "addedFeatures": [],
        "removedFeatures": [],
        "changedFeatures": [],
        "typeDrift": [],
        "nullableDrift": [],
        "targetContractDrift": {"status": "unchanged", "target": target_definition(inputs.manifest)},
        "warnings": ["No external baseline contract was supplied; candidate manifest is used as the local baseline."],
    }
    return data_drift, feature_contract_drift


def build_deployment_readiness_metadata(
    inputs: EnrichmentInputs,
    metrics_payload: dict[str, Any],
    validation_report: dict[str, Any],
    threshold_metadata: dict[str, Any],
    calibration_metadata: dict[str, Any],
    error_analysis_metadata: dict[str, Any],
    robustness_metadata: dict[str, Any],
) -> dict[str, Any]:
    metric_values = metrics_payload.get("metrics") if isinstance(metrics_payload.get("metrics"), dict) else {}
    checks = [
        {"key": "training_package_validation", "status": "pass" if validation_report.get("status") in {"pass", "warning"} else "fail", "source": "training_package_validation_report.json"},
        {"key": "metrics_coverage", "status": "pass" if metric_values else "warning", "source": "metrics.json"},
        {"key": "threshold_coverage", "status": "pass" if threshold_metadata.get("status") == "available" else "warning", "source": "evaluation_report.thresholdScenarios"},
        {"key": "calibration_coverage", "status": "pass" if calibration_metadata.get("status") == "available" else "warning", "source": "evaluation_report.calibrationMetadata"},
        {"key": "error_analysis_coverage", "status": "pass" if error_analysis_metadata.get("status") == "available" else "warning", "source": "evaluation_report.errorAnalysis"},
        {"key": "robustness_coverage", "status": "pass" if robustness_metadata.get("status") == "available" else "warning", "source": "evaluation_report.robustnessMetadata"},
        {"key": "safety_disabled", "status": "pass", "source": "candidate_manifest.safetyPolicy"},
        {"key": "not_production_approved", "status": "pass", "source": "candidate_manifest.productionReadiness"},
    ]
    passed = sum(1 for item in checks if item["status"] == "pass")
    score = round((passed / len(checks)) * 100) if checks else 0
    return {
        "status": "metadata_summary_ready" if score >= 80 else "metadata_summary_warning",
        "generatedAt": inputs.generated_at,
        "source": "offline_candidate_package_metadata",
        "readinessScore": score,
        "readinessScorePct": score,
        "metadataCompleteness": {"passed": passed, "total": len(checks), "scorePct": score},
        "safetyStatus": EXTENDED_SAFETY_RESTRICTIONS,
        "metricsCoverage": {"available": bool(metric_values), "metricKeys": sorted(metric_values.keys())},
        "calibrationCoverage": {"available": calibration_metadata.get("status") == "available"},
        "errorAnalysisCoverage": {"available": error_analysis_metadata.get("status") == "available"},
        "robustnessCoverage": {"available": robustness_metadata.get("status") == "available"},
        "limitations": [
            "Deployment readiness metadata is an offline summary only and is not production approval.",
            "The backend must not load model bytes, execute the model, expose inference, activate artifacts, or mutate business data.",
        ],
        "checks": checks,
    }


def build_offline_metadata_enrichment(inputs: EnrichmentInputs, metrics_payload: dict[str, Any], validation_report: dict[str, Any]) -> dict[str, Any]:
    threshold_metadata = build_threshold_scenarios(inputs)
    calibration_metadata = build_calibration_metadata(inputs)
    error_analysis_metadata = build_error_analysis_metadata(inputs)
    dataset_slice_diagnostics, robustness_metadata = build_slice_and_robustness_metadata(inputs)
    data_drift_metadata, feature_contract_drift = build_drift_metadata(inputs)
    deployment_readiness = build_deployment_readiness_metadata(
        inputs,
        metrics_payload,
        validation_report,
        threshold_metadata,
        calibration_metadata,
        error_analysis_metadata,
        robustness_metadata,
    )
    return {
        "generatedAt": inputs.generated_at,
        "workbenchEnrichmentVersion": "phase10b-v1",
        "thresholdScenarioMetadata": threshold_metadata,
        "thresholdScenarios": threshold_metadata,
        "calibrationMetadata": calibration_metadata,
        "calibration": calibration_metadata,
        "errorAnalysis": error_analysis_metadata,
        "errorAnalysisMetadata": error_analysis_metadata,
        "datasetSliceDiagnostics": dataset_slice_diagnostics,
        "sliceDiagnostics": dataset_slice_diagnostics.get("slices", []),
        "dataDrift": data_drift_metadata,
        "driftBaselineMetadata": data_drift_metadata,
        "featureContractDrift": feature_contract_drift,
        "robustnessMetadata": robustness_metadata,
        "deploymentReadinessMetadata": deployment_readiness,
        "deploymentReadiness": deployment_readiness,
    }
