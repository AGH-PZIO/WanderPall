from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from psycopg import Connection

from app.modules.journal.explorer import repository
from app.modules.journal.explorer.schemas import ReactionEmoji


@dataclass(frozen=True)
class JournalExplorerService:
    connection: Connection

    def require_accessible_journal(self, *, current_user_id: UUID, journal_id: UUID, include_own: bool = False) -> dict:
        """
        Require that a journal is accessible via explorer rules.
        
        Args:
            current_user_id: The current user's ID
            journal_id: The journal ID to check
            include_own: If True, allows access to user's own public journals
        """
        if include_own:
            row = repository.get_explorer_journal_including_own(
                self.connection, current_user_id=current_user_id, journal_id=journal_id
            )
        else:
            row = repository.get_explorer_journal(
                self.connection, current_user_id=current_user_id, journal_id=journal_id
            )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
        return row

    def list_feed(self, *, current_user_id: UUID, limit: int, offset: int) -> tuple[list[dict], int]:
        return repository.list_explorer_journals(
            self.connection,
            current_user_id=current_user_id,
            limit=limit,
            offset=offset,
        )

    def list_my_public_journals(self, *, current_user_id: UUID, limit: int, offset: int) -> tuple[list[dict], int]:
        """List the current user's own public journals."""
        return repository.list_my_public_journals(
            self.connection,
            current_user_id=current_user_id,
            limit=limit,
            offset=offset,
        )

    def upsert_reaction(self, *, current_user_id: UUID, journal_id: UUID, emoji: ReactionEmoji, include_own: bool = False) -> None:
        self.require_accessible_journal(current_user_id=current_user_id, journal_id=journal_id, include_own=include_own)
        repository.upsert_reaction(
            self.connection,
            journal_id=journal_id,
            user_id=current_user_id,
            emoji=emoji.value,
        )

    def delete_reaction(self, *, current_user_id: UUID, journal_id: UUID, include_own: bool = False) -> None:
        self.require_accessible_journal(current_user_id=current_user_id, journal_id=journal_id, include_own=include_own)
        repository.delete_reaction(self.connection, journal_id=journal_id, user_id=current_user_id)

    def create_comment(
        self,
        *,
        current_user_id: UUID,
        journal_id: UUID,
        body: str,
        parent_comment_id: UUID | None,
        include_own: bool = False,
    ) -> dict:
        self.require_accessible_journal(current_user_id=current_user_id, journal_id=journal_id, include_own=include_own)
        if parent_comment_id is not None and not repository.comment_exists(
            self.connection, journal_id=journal_id, comment_id=parent_comment_id
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent comment not found")
        return repository.create_comment(
            self.connection,
            journal_id=journal_id,
            user_id=current_user_id,
            body=body,
            parent_comment_id=parent_comment_id,
        )

    def delete_comment(self, *, current_user_id: UUID, journal_id: UUID, comment_id: UUID, include_own: bool = False) -> None:
        self.require_accessible_journal(current_user_id=current_user_id, journal_id=journal_id, include_own=include_own)
        n = repository.soft_delete_comment(
            self.connection,
            journal_id=journal_id,
            comment_id=comment_id,
            user_id=current_user_id,
        )
        if n == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
