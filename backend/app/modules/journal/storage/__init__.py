from app.modules.journal.storage.base import StorageBackend
from app.modules.journal.storage.local import LocalStorageBackend

__all__ = ["StorageBackend", "LocalStorageBackend"]
