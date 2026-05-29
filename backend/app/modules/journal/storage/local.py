from __future__ import annotations

from pathlib import Path


class LocalStorageBackend:
    def __init__(self, root_dir: str) -> None:
        self.root_dir = Path(root_dir)

    def _path_for_key(self, key: str) -> Path:
        # key is a trusted internal identifier; keep it relative to root_dir.
        return self.root_dir / Path(key)

    def save_bytes(self, *, key: str, data: bytes) -> None:
        path = self._path_for_key(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def open_bytes(self, *, key: str) -> bytes | None:
        path = self._path_for_key(key)
        if not path.exists():
            return None
        return path.read_bytes()

    def delete(self, *, key: str) -> None:
        path = self._path_for_key(key)
        try:
            path.unlink(missing_ok=True)
        except IsADirectoryError:
            # Defensive; shouldn't happen for file keys.
            return
