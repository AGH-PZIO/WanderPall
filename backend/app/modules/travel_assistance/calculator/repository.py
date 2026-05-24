from uuid import UUID
from typing import Any, List, Dict
from decimal import Decimal
import psycopg
from . import schemas

def get_calculations(conn: psycopg.Connection, user_id: UUID):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id as calc_id, c.user_id, c.title, c.created_at, c.total, e.id AS expense_id, e.category, e.amount, e.currency
            FROM travel_assistance.calculations c
            LEFT JOIN travel_assistance.expenses e on c.id = e.calculation_id
            WHERE c.user_id = %s
            """,
            (str(user_id),),
        )
        rows = cur.fetchall()
        
    calculations = {}

    for row in rows:
        cid = row['calc_id'] 

        if cid not in calculations:
            calculations[cid] = {
                "id": cid,
                "user_id": row['user_id'],
                "title": row['title'],
                "created_at": row['created_at'],
                "total": row["total"],
                "expenses": []
            }

        if row['category'] is not None:
            calculations[cid]["expenses"].append({
                "id": row['expense_id'],
                "calculation_id": cid,
                "category": row['category'],
                "amount": row['amount'],
                "currency": row['currency']
            })

    return list(calculations.values())

def get_calculation(conn, calculation_id: UUID) -> schemas.CalculationResponse | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id as calc_id, c.user_id, c.title, c.created_at, c.total,
                   e.id as expense_id, e.category, e.amount, e.currency
            FROM travel_assistance.calculations c
            LEFT JOIN travel_assistance.expenses e
                ON c.id = e.calculation_id
            WHERE c.id = %s
            """,
            (str(calculation_id),),
        )
        rows = cur.fetchall()

    if not rows:
        return None

    first = rows[0]

    result = {
        "id": first['calc_id'],
        "user_id": first['user_id'],
        "title": first['title'],
        "created_at": first['created_at'],
        "total": first['total'],
        "expenses": []
    }

    for row in rows:
        if row['category'] is not None:
            result["expenses"].append({
                "id": row['expense_id'],
                "calculation_id": first['calc_id'],
                "category": row['category'],
                "amount": row['amount'],
                "currency": row['currency']
            })

    return result

def create_calculation(conn: psycopg.Connection, user_id: UUID, title: str, total: Decimal, expenses: List[Dict]):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO travel_assistance.calculations (user_id, title, total, created_at)
            VALUES (%s, %s, %s, now())
            RETURNING id
            """,
            (str(user_id), title, total),
        )
        row = cur.fetchone()
        calculation_id = row['id'] if isinstance(row, dict) else row[0]

        for expense in expenses:
            cur.execute(
                """
                INSERT INTO travel_assistance.expenses (calculation_id, category, amount, currency)
                VALUES (%s, %s, %s, %s)
                """,
                (str(calculation_id), expense["category"], expense["amount"], expense["currency"]),
            )
        return calculation_id

def delete_calculation(conn: psycopg.Connection, calculation_id: UUID, user_id: UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM travel_assistance.calculations
            WHERE id = %s and user_id = %s
            """,
            (str(calculation_id), str(user_id),),
        )
    return cur.rowcount