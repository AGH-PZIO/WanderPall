from __future__ import annotations

import re
from pathlib import PurePosixPath
from uuid import UUID


_SAFE_EXT_RE = re.compile(r"^[a-zA-Z0-9]{1,10}$")


def _safe_extension(filename: str | None) -> str:
    if not filename:
        return "bin"
    suffix = PurePosixPath(filename).suffix.lstrip(".").lower()
    if not suffix or not _SAFE_EXT_RE.match(suffix):
        return "bin"
    return suffix


def entry_image_key(*, journal_id: UUID, entry_id: UUID, image_id: UUID, filename: str | None) -> str:
    ext = _safe_extension(filename)
    return f"journals/{journal_id}/entries/{entry_id}/{image_id}.{ext}"
