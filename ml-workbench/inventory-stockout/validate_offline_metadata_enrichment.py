#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from _workbench_common import assert_offline_metadata_enrichment_valid, read_json, validate_offline_metadata_enrichment, write_json


def validate_file(input_path: Path, output_dir: Path | None = None) -> dict:
    payload = read_json(input_path)
    report = validate_offline_metadata_enrichment(payload)
    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        write_json(output_dir / "offline_metadata_enrichment_validation_report.json", report)
    if report["status"] == "fail":
        assert_offline_metadata_enrichment_valid(payload)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate offline_metadata_enrichment.json against the Kourosh Phase 10B local schema rules.")
    parser.add_argument("--input", required=True, help="Path to offline_metadata_enrichment.json.")
    parser.add_argument("--output-dir", help="Optional output directory for offline_metadata_enrichment_validation_report.json.")
    args = parser.parse_args()

    report = validate_file(Path(args.input), Path(args.output_dir) if args.output_dir else None)
    print(f"Offline metadata enrichment validation status: {report['status']}")
    if report.get("errors"):
        print("Errors:")
        for item in report["errors"]:
            print(f"- {item}")
    if report.get("warnings"):
        print("Warnings:")
        for item in report["warnings"]:
            print(f"- {item}")
    return 0 if report["status"] != "fail" else 1


if __name__ == "__main__":
    raise SystemExit(main())
