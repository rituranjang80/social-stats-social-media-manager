"""
Build Cython extensions in-place (next to .pyx sources).

Usage (from backend/):
  pip install cython
  python setup_cython.py build_ext --inplace

Or:
  python scripts/build_cython.py
"""
from __future__ import annotations

import json
from pathlib import Path

from setuptools import Extension, setup

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "cython_manifest.json"


def load_extensions():
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    exts = []
    for item in data.get("extensions", []):
        name = item["name"]
        sources = [str(ROOT / src) for src in item["sources"]]
        exts.append(Extension(name, sources))
    return exts


setup(
    name="social-stats-cython",
    ext_modules=load_extensions(),
    zip_safe=False,
    packages=[],
)
