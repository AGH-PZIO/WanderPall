import pytest
from uuid import uuid4
from unittest.mock import patch, MagicMock

from app.modules.travel_assistance.calculator.services import CalculationService

@pytest.fixture
def mock_conn():
    return MagicMock()

@pytest.fixture
def users():
    return {
        "owner": uuid4(),
        "other": uuid4()
    }

class TestCalculationService:
    @pytest.fixture
    def service(self, mock_conn):
        return CalculationService(mock_conn)

    def test_ensure_owner_success(self, service, users):
        service.ensure_owner(users["owner"], users["owner"])

    def test_ensure_owner_forbidden(self, service, users):
        with pytest.raises(PermissionError, match="Forbidden"):
            service.ensure_owner(users["owner"], users["other"])

    def test_validate_calculation_success(self, service):
        service.validate_calculation("Valid Title", [{"amount": 10.5}, {"amount": 0}])

    def test_validate_calculation_negative_amount(self, service):
        with pytest.raises(ValueError, match="Amounts cannot be negative"):
            service.validate_calculation("Title", [{"amount": -5}])

    def test_validate_calculation_empty_title(self, service):
        with pytest.raises(ValueError, match="Title cannot be empty"):
            service.validate_calculation("   ", [{"amount": 10}])

    @patch('app.modules.travel_assistance.calculator.services.calculations_repo')
    def test_get_calculation_success(self, mock_repo, service, users):
        calc_id = uuid4()
        mock_repo.get_calculation.return_value = {'id': calc_id, 'user_id': users["owner"], 'title': 'Test'}
        
        result = service.get_calculation(calc_id, users["owner"])
        assert result['title'] == 'Test'
        mock_repo.get_calculation.assert_called_once_with(service.conn, calc_id)

    @patch('app.modules.travel_assistance.calculator.services.calculations_repo')
    def test_get_calculation_not_found(self, mock_repo, service, users):
        mock_repo.get_calculation.return_value = None
        with pytest.raises(ValueError, match="Calculation not found"):
            service.get_calculation(uuid4(), users["owner"])