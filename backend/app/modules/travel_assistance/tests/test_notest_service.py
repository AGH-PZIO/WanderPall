import pytest
from uuid import uuid4
from unittest.mock import patch, MagicMock

from app.modules.travel_assistance.notes.services import NotesService

@pytest.fixture
def mock_conn():
    return MagicMock()

@pytest.fixture
def users():
    return {
        "owner": uuid4(),
        "other": uuid4()
    }

class TestNotesService:
    @pytest.fixture
    def service(self, mock_conn):
        return NotesService(mock_conn)

    def test_validate_note_success(self, service):
        service.validate_note("My Note", "Content goes here")

    def test_validate_note_too_long(self, service):
        long_content = "a" * 5001
        with pytest.raises(ValueError, match="Size of the note cannot exceed 5000 characters"):
            service.validate_note("Title", long_content)

    @patch('app.modules.travel_assistance.notes.services.notes_repo')
    def test_update_note_success(self, mock_repo, service, users):
        note_id = uuid4()
        mock_repo.get_note.return_value = {'id': note_id, 'user_id': users["owner"]}
        
        service.update_note(users["owner"], note_id, "New Title", "New Content")
        mock_repo.update_note.assert_called_once_with(service.conn, note_id, "New Title", "New Content", users["owner"])

    @patch('app.modules.travel_assistance.notes.services.notes_repo')
    def test_update_note_forbidden(self, mock_repo, service, users):
        note_id = uuid4()
        mock_repo.get_note.return_value = {'id': note_id, 'user_id': users["owner"]}
        
        with pytest.raises(PermissionError, match="Forbidden"):
            service.update_note(users["other"], note_id, "New Title", "New Content")