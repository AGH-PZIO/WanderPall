from uuid import UUID
from . import repository as notes_repo

class NotesService:
    def __init__(self, conn):
        self.conn = conn
        
    def ensure_owner(self, resource_user_id: UUID, current_user_id: UUID):
        if resource_user_id != current_user_id:
            raise PermissionError("Forbidden")
    
    def validate_note(self, title: str, content: str):
        if not title.strip():
            raise ValueError("Title cannot be empty")
        if len(title) > 100:
            raise ValueError("Length of the title cannot exceed 100 characters")
        if len(content) > 5000:
            raise ValueError("Size of the note cannot exceed 5000 characters")
    
    def get_user_notes(self, user_id: UUID):
        return notes_repo.get_notes(self.conn, user_id)
    
    def get_note(self, user_id: UUID, note_id: UUID):
        note = notes_repo.get_note(self.conn, note_id)
        self.ensure_owner(note['user_id'], user_id)
        return note

    def create_note(self, user_id: UUID, title: str, content: str):
        self.validate_note(title, content)
        return notes_repo.create_note(self.conn, user_id, title, content)

    def update_note(self, user_id: UUID, note_id: UUID, title: str, content: str):
        note = notes_repo.get_note(self.conn, note_id)
        if note is None:
            raise ValueError("Note not found")
        self.ensure_owner(note['user_id'], user_id)
        self.validate_note(title, content)
        return notes_repo.update_note(self.conn, note_id, title, content, user_id)

    def delete_note(self, user_id: UUID, note_id: UUID):
        note = notes_repo.get_note(self.conn, note_id)
        if note is None:
            raise ValueError("Note not found")
        self.ensure_owner(note['user_id'], user_id)
        return notes_repo.delete_note(self.conn, note_id, user_id)