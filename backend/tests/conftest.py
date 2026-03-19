from __future__ import annotations

import os
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("RAW_DATA_DIR", str(REPO_ROOT / "data" / "raw"))
os.environ.setdefault("GARTH_HOME", str(REPO_ROOT / "data" / "garth"))
