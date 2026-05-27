import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile
from pydantic import BaseModel

UPLOAD_DIR = Path("media") 
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class UploadResponse(BaseModel):
    file_id: str
    original_name: str

async def save_file_with_uuid(file: UploadFile, module_folder: str = "general") -> str:
    _, ext = os.path.splitext(file.filename)
    
    unique_filename = f"{uuid.uuid4()}{ext}"
    
    target_dir = UPLOAD_DIR / module_folder
    target_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = target_dir / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return f"{module_folder}/{unique_filename}"