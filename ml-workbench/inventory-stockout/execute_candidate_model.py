#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from _workbench_common import (
    EXTENDED_SAFETY_RESTRICTIONS,
    WORKBENCH_VERSION,
    feature_contract_summary,
    feature_names,
    horizon_days_from_manifest,
    load_manifest,
    prediction_kind,
    read_json,
    sha256_file,
    target_definition,
    update_output_checksums,
    utc_now,
    write_json,
)
from train_inventory_stockout import normalise_target, predict_probabilities
from validate_training_package import validate_training_package

SCORE_OUTPUT_FIELDS = {
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

SCORE_OUTPUT_TOP_LEVEL_FIELDS = {
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

BACKEND_SAFE_POLICY = {
    **EXTENDED_SAFETY_RESTRICTIONS,
    "modelExecutionAllowed": False,
    "runtimeInvocationAllowed": False,
    "inferenceEndpointExposed": False,
    "artifactExecutionAllowed": False,
    "artifactActivationAllowed": False,
    "artifactBytesLoadingAllowed": False,
    "rawTrainingCsvLoadingAllowed": False,
}

CHECKSUM_ARTIFACTS = [
    "candidate_score_output.json",
    "candidate_score_output.csv",
    "execution_manifest.json",
]


def _to_json_scalar(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value


def _to_float_or_none(value: Any) -> float | None:
    value = _to_json_scalar(value)
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _label(value: Any) -> str:
    value = _to_json_scalar(value)
    if value is None:
        return "unknown"
    return str(value)


def _entity_id(row: pd.Series, index: int) -> str:
    for key in ("entityId", "productId", "rowKey", "sku", "id"):
        if key in row and pd.notna(row.get(key)):
            return str(row.get(key))
    return f"offline-row-{index}"


def _positive_class_index(model: Any, manifest: dict[str, Any], class_count: int) -> int:
    positive_class = target_definition(manifest).get("positiveClass", 1)
    estimator = None
    if hasattr(model, "named_steps"):
        estimator = model.named_steps.get("model")
    classes = getattr(estimator, "classes_", None)
    if classes is not None:
        for index, klass in enumerate(classes):
            if str(klass) == str(positive_class):
                return index
    return 1 if class_count >= 2 else 0


def _read_feature_snapshots(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    payload = read_json(path) if path.exists() else {}
    if isinstance(payload.get("snapshots"), list):
        rows = [item for item in payload["snapshots"] if isinstance(item, dict)]
        metadata = {key: value for key, value in payload.items() if key != "snapshots"}
        return rows, metadata
    if isinstance(payload.get("featureSnapshots"), list):
        rows = [item for item in payload["featureSnapshots"] if isinstance(item, dict)]
        metadata = {key: value for key, value in payload.items() if key != "featureSnapshots"}
        return rows, metadata
    if isinstance(payload, list):  # pragma: no cover - read_json enforces object, kept for fixture compatibility if relaxed later.
        return [item for item in payload if isinstance(item, dict)], {}
    raise ValueError("Feature snapshots JSON must contain a snapshots or featureSnapshots array.")


def _prepare_feature_snapshot_frame(snapshot_path: Path, features: list[str]) -> tuple[pd.DataFrame, dict[str, Any], list[str]]:
    rows, metadata = _read_feature_snapshots(snapshot_path)
    warnings: list[str] = []
    if not rows:
        raise ValueError("Feature snapshot file contains no scoring rows.")

    source_columns = sorted({key for row in rows for key in row.keys()})
    missing_features = [name for name in features if name not in source_columns]
    extra_features = [name for name in source_columns if name not in set(features) and name not in {"entityId", "productId", "rowKey", "sku", "id", "observedAt", "horizonDays"}]
    if missing_features:
        warnings.append("Feature snapshots are missing feature(s); nulls were supplied: " + ", ".join(missing_features))
    if extra_features:
        warnings.append("Feature snapshots include extra field(s) ignored for scoring: " + ", ".join(extra_features))

    normalized_rows: list[dict[str, Any]] = []
    for row in rows:
        normalized = dict(row)
        for feature in features:
            normalized.setdefault(feature, None)
        normalized_rows.append(normalized)
    return pd.DataFrame(normalized_rows), metadata, warnings


def _prepare_test_csv_frame(package_dir: Path, manifest: dict[str, Any]) -> tuple[pd.DataFrame, dict[str, Any], list[str]]:
    validation = validate_training_package(package_dir)
    if validation["status"] == "fail":
        raise ValueError("Training package validation failed; cannot execute offline candidate model.")
    test_path = package_dir / "test.csv"
    return pd.read_csv(test_path), {"trainingPackageValidation": validation}, list(validation.get("warnings", []))


def _build_score_rows(
    *,
    source_df: pd.DataFrame,
    feature_df: pd.DataFrame,
    predictions: Any,
    probabilities: Any,
    candidate_manifest: dict[str, Any],
    training_manifest: dict[str, Any],
    kind: str,
    generated_at: str,
) -> list[dict[str, Any]]:
    model_key = str(candidate_manifest.get("modelKey") or "inventory_stockout_stockout_risk_candidate")
    model_version = str(candidate_manifest.get("modelVersion") or "unknown")
    package_id = str(candidate_manifest.get("candidatePackageId") or "unknown")
    prediction_type = str(candidate_manifest.get("predictionType") or "inventory_stockout")
    default_horizon = candidate_manifest.get("horizonDays", horizon_days_from_manifest(training_manifest))

    rows: list[dict[str, Any]] = []
    class_count = probabilities.shape[1] if probabilities is not None and getattr(probabilities, "ndim", 0) == 2 else 0
    positive_index = _positive_class_index(model=None, manifest=training_manifest, class_count=class_count)
    for index, (_, row) in enumerate(source_df.iterrows()):
        prediction = predictions[index] if index < len(predictions) else None
        score: float | None = None
        confidence: float | None = None
        if kind == "classification" and probabilities is not None and getattr(probabilities, "ndim", 0) == 2 and index < len(probabilities):
            class_count = probabilities.shape[1]
            positive_index = min(_positive_class_index(feature_df.attrs.get("model"), training_manifest, class_count), class_count - 1)
            score = float(probabilities[index, positive_index])
            confidence = float(max(probabilities[index]))
        elif kind == "regression":
            score = _to_float_or_none(prediction)
            confidence = None
        else:
            score = _to_float_or_none(prediction)
            confidence = None

        horizon = row.get("horizonDays", default_horizon) if "horizonDays" in row else default_horizon
        rows.append({
            "entityId": _entity_id(row, index),
            "predictionType": prediction_type,
            "horizonDays": int(horizon) if horizon is not None and not pd.isna(horizon) else None,
            "score": score,
            "label": _label(prediction),
            "confidence": confidence,
            "modelKey": model_key,
            "modelVersion": model_version,
            "candidatePackageId": package_id,
            "generatedAt": generated_at,
            "sourceRowIndex": int(index),
        })
    return rows


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
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
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def execute_candidate_model(
    *,
    package_dir: Path | None,
    feature_snapshots: Path | None,
    model_dir: Path,
    output_dir: Path,
) -> dict[str, Any]:
    model_dir = model_dir.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    candidate_manifest_path = model_dir / "candidate_manifest.json"
    if not candidate_manifest_path.exists():
        raise FileNotFoundError(f"Missing candidate_manifest.json in model dir: {candidate_manifest_path}")
    candidate_manifest = read_json(candidate_manifest_path)

    model_path = model_dir / "model.joblib"
    if not model_path.exists():
        raise FileNotFoundError(f"Missing local workbench model artifact: {model_path}")

    if package_dir is None and feature_snapshots is None:
        raise ValueError("Either --package-dir or --feature-snapshots is required.")

    if package_dir is not None:
        package_dir = package_dir.resolve()
        training_manifest = load_manifest(package_dir)
    else:
        training_manifest = {
            "featureContract": candidate_manifest.get("featureContract", {}),
            "target": candidate_manifest.get("target", {}),
            "horizonDays": candidate_manifest.get("horizonDays"),
        }

    features = feature_names(training_manifest)
    if not features:
        feature_contract = candidate_manifest.get("featureContract") or {}
        features = [str(item) for item in feature_contract.get("featureNames") or []]
    if not features:
        raise ValueError("No feature contract is available for offline scoring.")

    source_metadata: dict[str, Any]
    source_warnings: list[str]
    if feature_snapshots is not None:
        source_df, snapshot_metadata, source_warnings = _prepare_feature_snapshot_frame(feature_snapshots.resolve(), features)
        source_metadata = {
            "sourceType": "feature_snapshots",
            "inputFile": str(feature_snapshots.resolve()),
            "snapshotMetadata": snapshot_metadata,
        }
    else:
        assert package_dir is not None
        source_df, source_metadata, source_warnings = _prepare_test_csv_frame(package_dir, training_manifest)
        source_metadata.update({
            "sourceType": "test_csv",
            "packageDir": str(package_dir),
            "inputFile": str((package_dir / "test.csv").resolve()),
        })

    model = joblib.load(model_path)
    feature_df = source_df[features].copy()
    feature_df.attrs["model"] = model
    kind = str(candidate_manifest.get("predictionKind") or prediction_kind(training_manifest))
    predictions = model.predict(feature_df)
    probabilities = predict_probabilities(model, feature_df) if kind == "classification" else None
    generated_at = utc_now()

    scores = _build_score_rows(
        source_df=source_df,
        feature_df=feature_df,
        predictions=predictions,
        probabilities=probabilities,
        candidate_manifest=candidate_manifest,
        training_manifest=training_manifest,
        kind=kind,
        generated_at=generated_at,
    )

    payload = {
        "candidatePackageId": str(candidate_manifest.get("candidatePackageId") or "unknown"),
        "modelKey": str(candidate_manifest.get("modelKey") or "inventory_stockout_stockout_risk_candidate"),
        "modelVersion": str(candidate_manifest.get("modelVersion") or "unknown"),
        "predictionType": str(candidate_manifest.get("predictionType") or "inventory_stockout"),
        "horizonDays": candidate_manifest.get("horizonDays", horizon_days_from_manifest(training_manifest)),
        "rowCount": int(len(source_df)),
        "scoreCount": int(len(scores)),
        "generatedAt": generated_at,
        "workbenchVersion": WORKBENCH_VERSION,
        "source": {
            **source_metadata,
            "featureCount": len(features),
            "featureNames": features,
            "featureContract": feature_contract_summary(training_manifest),
            "warnings": source_warnings,
        },
        "safetyPolicy": BACKEND_SAFE_POLICY,
        "scores": scores,
    }

    score_path = output_dir / "candidate_score_output.json"
    csv_path = output_dir / "candidate_score_output.csv"
    execution_manifest_path = output_dir / "execution_manifest.json"
    write_json(score_path, payload)
    _write_csv(csv_path, scores)

    execution_manifest = {
        "generatedAt": generated_at,
        "workbenchVersion": WORKBENCH_VERSION,
        "executionMode": "offline_workbench_only",
        "candidatePackageId": payload["candidatePackageId"],
        "modelKey": payload["modelKey"],
        "modelVersion": payload["modelVersion"],
        "predictionType": payload["predictionType"],
        "sourceType": payload["source"].get("sourceType"),
        "rowCount": payload["rowCount"],
        "scoreCount": payload["scoreCount"],
        "modelArtifact": {
            "path": str(model_path),
            "sha256": sha256_file(model_path),
            "loadedInsideWorkbenchOnly": True,
            "loadedByBackend": False,
        },
        "candidateManifestSha256": sha256_file(candidate_manifest_path),
        "scoreOutputSha256": sha256_file(score_path),
        "scoreCsvSha256": sha256_file(csv_path),
        "safetyPolicy": BACKEND_SAFE_POLICY,
        "limitations": [
            "Offline score evidence only; not production inference.",
            "The Kourosh backend must not load model.joblib or execute this model.",
            "No inventory, accounting, pricing, ledger, report, invoice, or business record mutation is performed.",
        ],
    }
    write_json(execution_manifest_path, execution_manifest)
    update_output_checksums(output_dir, CHECKSUM_ARTIFACTS)

    return {
        "status": "executed_offline",
        "scoreOutput": str(score_path),
        "scoreCsv": str(csv_path),
        "executionManifest": str(execution_manifest_path),
        "scoreCount": len(scores),
        "warnings": source_warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Execute a Kourosh Inventory Stockout candidate model inside the offline workbench only.")
    parser.add_argument("--package-dir", help="Training package directory containing manifest.json and test.csv.")
    parser.add_argument("--feature-snapshots", help="Optional local feature_snapshots.json for metadata snapshot scoring.")
    parser.add_argument("--model-dir", required=True, help="Directory containing model.joblib and candidate_manifest.json.")
    parser.add_argument("--output-dir", required=True, help="Output directory for score outputs and execution manifest.")
    args = parser.parse_args()

    result = execute_candidate_model(
        package_dir=Path(args.package_dir) if args.package_dir else None,
        feature_snapshots=Path(args.feature_snapshots) if args.feature_snapshots else None,
        model_dir=Path(args.model_dir),
        output_dir=Path(args.output_dir),
    )
    print(f"Offline candidate execution status: {result['status']}")
    print(f"Score count: {result['scoreCount']}")
    print(f"Score output written to: {result['scoreOutput']}")
    if result.get("warnings"):
        print("Warnings:")
        for warning in result["warnings"]:
            print(f"- {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
