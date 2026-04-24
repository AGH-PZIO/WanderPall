import pytest
from uuid import uuid4
from unittest.mock import patch, MagicMock

from app.modules.travel_assistance.guides.services import GuideService

@pytest.fixture
def mock_conn():
    return MagicMock()

@pytest.fixture
def users():
    return {
        "owner": uuid4(),
        "other": uuid4()
    }
    
class TestGuideService:
    @pytest.fixture
    def service(self, mock_conn):
        return GuideService(mock_conn)

    def test_validate_guide_success(self, service):
        service.validate_guide("My Guide", [{"type": "text", "value": "Hello"}])

    def test_validate_guide_empty_content(self, service):
        with pytest.raises(ValueError, match="Guide cannot be empty"):
            service.validate_guide("Title", [])

    def test_validate_guide_invalid_format(self, service):
        with pytest.raises(ValueError, match="Invalid content format"):
            service.validate_guide("Title", "string content instead of list/dict")

    @patch('app.modules.travel_assistance.guides.services.guides_repo')
    def test_publish_guide_success(self, mock_repo, service, users):
        guide_id = uuid4()
        mock_guide = MagicMock()
        mock_guide.user_id = users["owner"]
        mock_repo.get_guide.return_value = mock_guide
        
        service.publish_guide(users["owner"], guide_id)
        mock_repo.publish_guide.assert_called_once_with(service.conn, guide_id, users["owner"])