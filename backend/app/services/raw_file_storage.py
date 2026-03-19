from __future__ import annotations

from dataclasses import dataclass
import shutil
from pathlib import Path


@dataclass(frozen=True)
class RawFileSaveResult:
    path: Path
    already_existed: bool


class RawFileStorageService:
    """Persist raw FIT files to a stable local filesystem layout."""

    def __init__(self, root_dir: Path) -> None:
        self._root_dir = root_dir

    def save_activity_fit(
        self,
        *,
        source_activity_id: str,
        start_year: int,
        start_month: int,
        payload: bytes,
    ) -> RawFileSaveResult:
        target_dir = self._root_dir / "activities" / f"{start_year:04d}" / f"{start_month:02d}"
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / f"{source_activity_id}.fit"

        if target_path.exists():
            return RawFileSaveResult(path=target_path, already_existed=True)

        target_path.write_bytes(payload)
        return RawFileSaveResult(path=target_path, already_existed=False)

    def save_quarantined_activity_payload(
        self,
        *,
        source_activity_id: str,
        start_year: int,
        start_month: int,
        payload: bytes,
        reason: str,
    ) -> Path:
        quarantine_dir = self._quarantine_dir(start_year=start_year, start_month=start_month)
        quarantine_path = quarantine_dir / f"{source_activity_id}.{reason}.fit"
        quarantine_path.write_bytes(payload)
        return quarantine_path

    def copy_to_quarantine(
        self,
        *,
        source_activity_id: str,
        start_year: int,
        start_month: int,
        source_path: str | Path,
        reason: str,
    ) -> Path:
        quarantine_dir = self._quarantine_dir(start_year=start_year, start_month=start_month)
        quarantine_path = quarantine_dir / f"{source_activity_id}.{reason}.fit"
        shutil.copy2(source_path, quarantine_path)
        return quarantine_path

    def _quarantine_dir(self, *, start_year: int, start_month: int) -> Path:
        quarantine_dir = (
            self._root_dir / "_quarantine" / "activities" / f"{start_year:04d}" / f"{start_month:02d}"
        )
        quarantine_dir.mkdir(parents=True, exist_ok=True)
        return quarantine_dir
