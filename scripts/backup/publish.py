from __future__ import annotations

import shutil
from pathlib import Path


def copy_to_destinations(source: Path, destinations: list[Path]) -> list[str]:
    copied: list[str] = []
    for dest_root in destinations:
        dest_root.mkdir(parents=True, exist_ok=True)
        target = dest_root / source.name
        if source.is_dir():
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)
        copied.append(str(dest_root))
    return copied
