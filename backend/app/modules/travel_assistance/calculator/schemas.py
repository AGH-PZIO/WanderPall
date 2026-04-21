from datetime import datetime
from uuid import UUID
from typing import List
from pydantic import BaseModel
from decimal import Decimal

class ExpenseBase(BaseModel):
    category: str
    amount: Decimal

class ExpenseCreate(ExpenseBase):
    pass

class CalculationBase(BaseModel):
    title: str

class CalculationCreate(CalculationBase):
    expenses: List[ExpenseCreate]

class CalculationResponse(CalculationBase):
    id: UUID
    user_id: UUID
    created_at: datetime

class ExpenseResponse(ExpenseBase):
    id: UUID
    calculation_id: UUID

class CalculationWithExpenses(CalculationResponse):
    expenses: List[ExpenseResponse]