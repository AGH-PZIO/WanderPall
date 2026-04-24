from . import repository as guides_repo
from uuid import UUID
from typing import Any

class GuideService:
    def __init__(self, conn):
        self.conn = conn
        
    def ensure_owner(self, resource_user_id: UUID, current_user_id: UUID):
        if resource_user_id != current_user_id:
            raise PermissionError("Forbidden")
    
    def validate_guide(self, title: str, content: Any):
        if not content or content == []:
            raise ValueError("Guide cannot be empty")
        if not isinstance(content, (dict, list)):
            raise ValueError("Invalid content format")
        if not title.strip():
            raise ValueError("Title cannot be empty")
        if len(title) > 100:
            raise ValueError("Length of the title cannot exceed 100 characters")
        
    def create_guide(self, user_id: UUID, title: str, content: str):
        self.validate_guide(title, content)
        return guides_repo.create_guide(self.conn, user_id, title, content)

    def publish_guide(self, user_id: UUID, guide_id: UUID):
        guide = guides_repo.get_guide(self.conn, guide_id)
        if guide is None:
            raise ValueError("Guide not found")
        self.ensure_owner(guide.user_id, user_id)
        return guides_repo.publish_guide(self.conn, guide_id, user_id)
    
    def unpublish_guide(self, user_id: UUID, guide_id: UUID):
        guide = guides_repo.get_guide(self.conn, guide_id)
        if guide is None:
            raise ValueError("Guide not found")
        self.ensure_owner(guide.user_id, user_id)
        return guides_repo.unpublish_guide(self.conn, guide_id, user_id)

    def update_guide(self, user_id: UUID, guide_id: UUID, title: str, data: Any):
        guide = guides_repo.get_guide(self.conn, guide_id)
        if guide is None:
            raise ValueError("Guide not found")
        self.ensure_owner(guide.user_id, user_id)
        self.validate_guide(title, data)
        return guides_repo.update_guide(self.conn, guide_id, title, data, user_id)

    def get_user_guides(self, user_id: UUID):
        return guides_repo.get_guides(self.conn, user_id)
    
    def get_guide(self, guide_id: UUID, user_id: UUID):
        guide = guides_repo.get_guide(self.conn, guide_id)
        if guide is None:
            raise ValueError("Guide not found")
        self.ensure_owner(guide.user_id, user_id)
        return guide

    def get_published_guides(self):
        return guides_repo.get_published_guides(self.conn)
    
    def delete_guide(self, user_id: UUID, guide_id: UUID):
        guide = guides_repo.get_guide(self.conn, guide_id)
        if guide is None:
            raise ValueError("Guide not found")
        self.ensure_owner(guide.user_id, user_id)
        return guides_repo.delete_guide(self.conn, guide_id)