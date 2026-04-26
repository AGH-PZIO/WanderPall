from typing import Any
from uuid import UUID

import psycopg


def create_group(
    conn: psycopg.Connection,
    *,
    owner_id: UUID,
    name: str,
    description: str | None,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO travel_buddies.travel_group (owner_id, name, description)
            VALUES (%s, %s, %s)
            RETURNING id, owner_id, name, description, created_at, updated_at
            """,
            (str(owner_id), name, description),
        )
        group = cur.fetchone()
        cur.execute(
            """
            INSERT INTO travel_buddies.group_member (group_id, user_id, role)
            VALUES (%s, %s, 'owner')
            """,
            (str(group["id"]), str(owner_id)),
        )
    return group


def list_user_groups(conn: psycopg.Connection, *, user_id: UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT g.id, g.owner_id, g.name, g.description, g.created_at, g.updated_at
            FROM travel_buddies.travel_group g
            LEFT JOIN travel_buddies.group_member m ON m.group_id = g.id
            WHERE g.owner_id = %s OR m.user_id = %s
            ORDER BY g.created_at DESC
            """,
            (str(user_id), str(user_id)),
        )
        return cur.fetchall()


def get_group(conn: psycopg.Connection, *, group_id: UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, owner_id, name, description, created_at, updated_at
            FROM travel_buddies.travel_group
            WHERE id = %s
            """,
            (str(group_id),),
        )
        return cur.fetchone()


def delete_group(conn: psycopg.Connection, *, group_id: UUID, owner_id: UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM travel_buddies.travel_group
            WHERE id = %s AND owner_id = %s
            """,
            (str(group_id), str(owner_id)),
        )
        return cur.rowcount


def is_member(conn: psycopg.Connection, *, group_id: UUID, user_id: UUID) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM travel_buddies.group_member
            WHERE group_id = %s AND user_id = %s
            LIMIT 1
            """,
            (str(group_id), str(user_id)),
        )
        return cur.fetchone() is not None


def add_member(
    conn: psycopg.Connection,
    *,
    group_id: UUID,
    user_id: UUID,
    role: str = "member",
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO travel_buddies.group_member (group_id, user_id, role)
            VALUES (%s, %s, %s)
            ON CONFLICT (group_id, user_id) DO NOTHING
            RETURNING id, group_id, user_id, role, joined_at
            """,
            (str(group_id), str(user_id), role),
        )
        return cur.fetchone()


def list_members(conn: psycopg.Connection, *, group_id: UUID) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, group_id, user_id, role, joined_at
            FROM travel_buddies.group_member
            WHERE group_id = %s
            ORDER BY joined_at
            """,
            (str(group_id),),
        )
        return cur.fetchall()


def remove_member(conn: psycopg.Connection, *, group_id: UUID, member_id: UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM travel_buddies.group_member
            WHERE id = %s AND group_id = %s
            """,
            (str(member_id), str(group_id)),
        )
        return cur.rowcount
