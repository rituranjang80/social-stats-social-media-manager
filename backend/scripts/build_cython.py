#!/usr/bin/env python3
"""
Compile Cython extensions for the Django REST API backend.

DRF viewsets and APIView classes remain Python. This script builds optional
native extensions for pure helper modules (see cython_manifest.json).

Existing HTTP behavior is unchanged: helpers fall back to pure Python when
extensions are not built (default in dev/CI).

Usage (from repository backend/ directory):
  python scripts/build_cython.py
  python scripts/build_cython.py --clean
  python scripts/build_cython.py --clean --verify   # build + run API-related tests

Requires: pip install cython
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
MANIFEST = BACKEND_ROOT / "cython_manifest.json"


def _ensure_cython():
    try:
        import Cython  # noqa: F401
    except ImportError:
        print("Cython is not installed. Run: pip install cython", file=sys.stderr)
        sys.exit(1)


def _clean_artifacts():
    for pattern in ("*.so", "*.pyd", "*.c"):
        for path in BACKEND_ROOT.rglob(pattern):
            if "_cython" in path.parts and path.name.startswith("date_utils"):
                path.unlink(missing_ok=True)
    build_dir = BACKEND_ROOT / "build"
    if build_dir.is_dir():
        shutil.rmtree(build_dir, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Social Stats Cython extensions")
    parser.add_argument("--clean", action="store_true", help="Remove build artifacts before compile")
    parser.add_argument(
        "--verify",
        action="store_true",
        help="After build, run manage.py tests for Cython-backed helpers",
    )
    args = parser.parse_args()

    if not MANIFEST.is_file():
        print(f"Missing manifest: {MANIFEST}", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not manifest.get("extensions"):
        print("No extensions listed in cython_manifest.json")
        return 0

    _ensure_cython()

    if args.clean:
        _clean_artifacts()

    cmd = [sys.executable, str(BACKEND_ROOT / "setup_cython.py"), "build_ext", "--inplace"]
    print("Running:", " ".join(cmd))
    result = subprocess.run(cmd, cwd=str(BACKEND_ROOT))
    if result.returncode != 0:
        return result.returncode

    # Smoke import
    sys.path.insert(0, str(BACKEND_ROOT))
    try:
        from social_stats.date_utils_fast import (  # noqa: WPS433
            parse_publish_date_range,
            using_cython,
        )
        s, e = parse_publish_date_range("2026-01-10", "2026-01-01")
        assert s.isoformat() == "2026-01-01" and e.isoformat() == "2026-01-10"
        print(f"Smoke test OK (cython={using_cython()})")
    except Exception as exc:
        print(f"Smoke import failed: {exc}", file=sys.stderr)
        return 1

    print("Cython build finished. Restart gunicorn/celery to load .so modules.")

    if args.verify:
        test_cmd = [
            sys.executable,
            str(BACKEND_ROOT / "manage.py"),
            "test",
            "social_stats.tests.test_date_utils_fast",
            "social_stats.tests.test_inbox",
            "-v",
            "1",
        ]
        print("Running:", " ".join(test_cmd))
        verify = subprocess.run(test_cmd, cwd=str(BACKEND_ROOT))
        if verify.returncode != 0:
            return verify.returncode

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
