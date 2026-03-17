from __future__ import annotations

from dataclasses import dataclass
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
