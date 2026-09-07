#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from _workbench_common import (
    FORBIDDEN_OUTPUT_FIELDS,
    count_csv_rows,
    dataset_identity,
    feature_names,
    load_manifest,
    read_csv_header,
    target_column,
    target_definition,
    utc_now,
    write_json,
)


def validate_training_package(package_dir: Path) -> dict[str, Any]:
    package_dir = package_dir.resolve()
    manifest_path = package_dir / "manifest.json"
    train_path = package_dir / "train.csv"
    test_path = package_dir / "test.csv"

    errors: list[str] = []
    warnings: list[str] = []
    missing_files: list[str] = []

    for required in (manifest_path, train_path, test_path):
        if not required.exists():
            missing_files.append(required.name)
            errors.append(f"Missing required file: {required.name}")

    manifest: dict[str, Any] = {}
    if manifest_path.exists():
        try:
            manifest = load_manifest(package_dir)
        except Exception as exc:  # noqa: BLE001 - validation report should capture bad local files.
            errors.append(f"manifest.json is not valid JSON object: {exc}")

    identity = dataset_identity(manifest) if manifest else {}
    if not identity:
        errors.append("Manifest is missing dataset identity (datasetIdentity or dataset/package keys).")

    features = feature_names(manifest) if manifest else []
    if not features:
        errors.append("Manifest is missing feature contract (featureSchema or featureContract features).")

    target = target_column(manifest) if manifest else None
    if not target:
        errors.append("Manifest is missing target definition key.")

    if not isinstance(manifest.get("split"), dict) or not manifest.get("split"):
        errors.append("Manifest is missing split information.")

    train_rows = count_csv_rows(train_path) if train_path.exists() else 0
    test_rows = count_csv_rows(test_path) if test_path.exists() else 0
    if train_path.exists() and train_rows <= 0:
        errors.append("train.csv has no data rows.")
    if test_path.exists() and test_rows <= 0:
        errors.append("test.csv has no data rows.")

    train_header = read_csv_header(train_path) if train_path.exists() else []
    test_header = read_csv_header(test_path) if test_path.exists() else []

    missing_columns = {
        "train": [column for column in features if column not in train_header],
        "test": [column for column in features if column not in test_header],
    }

    if target:
        if train_header and target not in train_header:
            missing_columns["train"].append(target)
        if test_header and target not in test_header:
            missing_columns["test"].append(target)

    if missing_columns["train"]:
        errors.append(f"train.csv is missing required column(s): {', '.join(missing_columns['train'])}")
    if missing_columns["test"]:
        errors.append(f"test.csv is missing required column(s): {', '.join(missing_columns['test'])}")

    forbidden_manifest_paths: list[str] = []
    def walk(value: Any, path: str = "$") -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                if key in FORBIDDEN_OUTPUT_FIELDS:
                    forbidden_manifest_paths.append(f"{path}.{key}")
                walk(item, f"{path}.{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value):
                walk(item, f"{path}[{index}]")

    walk(manifest)
    if forbidden_manifest_paths:
        errors.append(
            "Manifest includes forbidden business mutation output field(s): "
            + ", ".join(forbidden_manifest_paths)
        )

    if train_rows < 30:
        warnings.append("train.csv has fewer than 30 rows; useful for smoke tests but not for production candidate claims.")
    if test_rows < 5:
        warnings.append("test.csv has fewer than 5 rows; some metrics may be unstable or unavailable.")

    status = "fail" if errors else "warning" if warnings else "pass"
    return {
        "status": status,
        "packageDir": str(package_dir),
        "generatedAt": utc_now(),
        "files": {
            "manifest": manifest_path.exists(),
            "trainCsv": train_path.exists(),
            "testCsv": test_path.exists(),
            "missing": missing_files,
        },
        "datasetIdentity": identity,
        "rowCounts": {
            "train": train_rows,
            "test": test_rows,
        },
        "featureCount": len(features),
        "features": features,
        "targetColumn": target,
        "targetDefinition": target_definition(manifest) if manifest else {},
        "missingColumns": missing_columns,
        "warnings": warnings,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a local Kourosh Inventory Stockout training package.")
    parser.add_argument("--package-dir", required=True, help="Directory containing manifest.json, train.csv, and test.csv.")
    parser.add_argument("--output-dir", default=None, help="Directory where validation_report.json should be written. Defaults to package dir.")
    args = parser.parse_args()

    package_dir = Path(args.package_dir)
    output_dir = Path(args.output_dir) if args.output_dir else package_dir
    report = validate_training_package(package_dir)
    write_json(output_dir / "validation_report.json", report)

    print(f"Training package validation status: {report['status']}")
    print(f"Validation report written to: {output_dir / 'validation_report.json'}")
    return 0 if report["status"] in {"pass", "warning"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
