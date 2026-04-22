import os
from uuid import uuid4

from fastapi import UploadFile

STORAGE_PATH = os.getenv("STORAGE_PATH", "/app/storage")


def get_attachment_path(group_id: str) -> str:
    path = os.path.join(STORAGE_PATH, group_id)
    os.makedirs(path, exist_ok=True)
    return path


async def save_attachment(group_id: str, file: UploadFile) -> tuple[str, str]:
    file_id = str(uuid4())
    ext = os.path.splitext(file.filename or "")[1] or ""
    safe_ext = "".join(c for c in ext if c.isalnum())[:10]
    filename = f"{file_id}.{safe_ext}" if safe_ext else file_id
    filepath = os.path.join(get_attachment_path(group_id), filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return file_id, filename


def get_attachment_url(group_id: str, filename: str) -> str:
    return f"/files/{group_id}/{filename}"