from . import repository as calculations_repo
from uuid import UUID

class CalculationService:
    def __init__(self, conn):
        self.conn = conn
        
    def ensure_owner(self, resource_user_id: UUID, current_user_id: UUID):
        if resource_user_id != current_user_id:
            raise PermissionError("Forbidden")
    
    def validate_calculation(self, title: str, expenses: list[dict]):
        if any(float(e["amount"]) < 0 for e in expenses):
            raise ValueError("Amounts cannot be negative")
        if not title.strip():
            raise ValueError("Title cannot be empty")
        if len(title) > 100:
            raise ValueError("Length of the title cannot exceed 100 characters")
        
    def create_calculation(self, user_id: UUID, title: str, expenses: list[dict]):
        self.validate_calculation(title, expenses)
        return calculations_repo.create_calculation(self.conn, user_id, title, expenses)

    def get_calculations(self, user_id):
        return calculations_repo.get_calculations(self.conn, user_id)
    
    def get_calculation(self, calculation_id, user_id):
        calculation = calculations_repo.get_calculation(self.conn, calculation_id)
        if calculation is None:
            raise ValueError("Calculation not found")
        self.ensure_owner(calculation['user_id'], user_id)
        return calculation

    def delete_calculation(self, user_id: UUID, calculation_id: UUID):
        calculation = calculations_repo.get_calculation(self.conn, calculation_id)
        if calculation is None:
            raise ValueError("Calculation not found")
        self.ensure_owner(calculation['user_id'], user_id)
        return calculations_repo.delete_calculation(self.conn, calculation_id, user_id)