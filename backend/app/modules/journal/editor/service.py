from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from psycopg import Connection

from app.modules.journal.editor.schemas import JournalVisibility
from app.modules.journal.editor import repository
from app.modules.journal.storage.base import StorageBackend


@dataclass(frozen=True)
class JournalEditorService:
    connection: Connection
    storage: StorageBackend

    def _require_journal(self, *, user_id: UUID, journal_id: UUID) -> dict:
        row = repository.get_journal(self.connection, user_id=user_id, journal_id=journal_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
        return row

    def _require_entry(self, *, user_id: UUID, journal_id: UUID, entry_id: UUID) -> dict:
        row = repository.get_entry(
            self.connection,
            user_id=user_id,
            journal_id=journal_id,
            entry_id=entry_id,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
        return row

    def create_journal(self, *, user_id: UUID, title: str) -> dict:
        return repository.create_journal(
            self.connection,
            user_id=user_id,
            title=title,
            visibility=JournalVisibility.private.value,
        )

    def update_journal_title(self, *, user_id: UUID, journal_id: UUID, title: str) -> dict:
        row = repository.update_journal_title(self.connection, user_id=user_id, journal_id=journal_id, title=title)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
        return row

    def update_journal_visibility(self, *, user_id: UUID, journal_id: UUID, visibility: JournalVisibility) -> dict:
        row = repository.update_journal_visibility(
            self.connection,
            user_id=user_id,
            journal_id=journal_id,
            visibility=visibility.value,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
        return row

    def delete_journal(self, *, user_id: UUID, journal_id: UUID) -> None:
        keys = repository.list_image_keys_for_journal(self.connection, user_id=user_id, journal_id=journal_id)
        for key in keys:
            self.storage.delete(key=key)
        n = repository.delete_journal(self.connection, user_id=user_id, journal_id=journal_id)
        if n == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")

    def create_entry(self, *, user_id: UUID, journal_id: UUID, lat: float, lng: float, text: str) -> dict:
        self._require_journal(user_id=user_id, journal_id=journal_id)
        return repository.create_entry(self.connection, journal_id=journal_id, lat=lat, lng=lng, text=text)

    def update_entry(
        self,
        *,
        user_id: UUID,
        journal_id: UUID,
        entry_id: UUID,
        lat: float | None,
        lng: float | None,
        text: str | None,
    ) -> dict:
        row = repository.update_entry(
            self.connection,
            user_id=user_id,
            journal_id=journal_id,
            entry_id=entry_id,
            lat=lat,
            lng=lng,
            text=text,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
        return row

    def delete_entry(self, *, user_id: UUID, journal_id: UUID, entry_id: UUID) -> None:
        self._require_entry(user_id=user_id, journal_id=journal_id, entry_id=entry_id)
        keys = repository.list_image_keys_for_entry(
            self.connection,
            user_id=user_id,
            journal_id=journal_id,
            entry_id=entry_id,
        )
        for key in keys:
            self.storage.delete(key=key)
        repository.delete_entry(self.connection, user_id=user_id, journal_id=journal_id, entry_id=entry_id)

    def delete_entry_image(
        self,
        *,
        user_id: UUID,
        journal_id: UUID,
        entry_id: UUID,
        image_id: UUID,
    ) -> dict:
        row = repository.delete_entry_image(
            self.connection,
            user_id=user_id,
            journal_id=journal_id,
            entry_id=entry_id,
            image_id=image_id,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
        self.storage.delete(key=row["storage_key"])
        return row

    def get_entry_image(
        self,
        *,
        user_id: UUID,
        journal_id: UUID,
        entry_id: UUID,
        image_id: UUID,
    ) -> dict:
        row = repository.get_entry_image(
            self.connection,
            user_id=user_id,
            journal_id=journal_id,
            entry_id=entry_id,
            image_id=image_id,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
        return row

    def require_entry_for_images(self, *, user_id: UUID, journal_id: UUID, entry_id: UUID) -> dict:
        return self._require_entry(user_id=user_id, journal_id=journal_id, entry_id=entry_id)
