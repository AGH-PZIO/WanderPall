from __future__ import annotations

from typing import Protocol


class StorageBackend(Protocol):
    def save_bytes(self, *, key: str, data: bytes) -> None: ...

    def open_bytes(self, *, key: str) -> bytes | None: ...

    def delete(self, *, key: str) -> None: ...
