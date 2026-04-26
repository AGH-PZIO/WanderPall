from uuid import UUID, uuid4

from app.modules.travel_buddies.errors import NotFoundError, ValidationError
from app.modules.travel_buddies.models import PackingItem
from app.modules.travel_buddies.repositories.protocols import PackingItemRepository
from app.modules.travel_buddies.schemas import (
    CreatePackingItemRequest,
    PackingItemResponse,
    PackingProgressResponse,
    UpdatePackingItemRequest,
    PackingItemListResponse,
)


class PackingListService:
    def __init__(self, packing: PackingItemRepository) -> None:
        self.packing = packing

    def list_items(
        self,
        group_id: UUID,
        limit: int,
        offset: int,
        category: str | None = None,
    ) -> PackingItemListResponse:
        if category is not None:
            all_items = self.packing.list_by_category(group_id, category)
            total = len(all_items)
            items = all_items[offset:offset + limit]
        else:
            items = self.packing.list_by_group(group_id, limit, offset)
            total = self.packing.count_by_group(group_id)
        packed_count = sum(1 for item in items if item.is_packed)
        return PackingItemListResponse(
            items=[self._item_to_response(i) for i in items],
            total=total,
            packed_count=packed_count,
        )

    def add_item(self, group_id: UUID, user_id: UUID, request: CreatePackingItemRequest) -> PackingItemResponse:
        name = request.name.strip()
        if not name:
            raise ValidationError("Item name cannot be empty")
        if len(name) > 200:
            raise ValidationError("Item name too long (max 200 characters)")

        item = PackingItem(
            id=uuid4(),
            group_id=group_id,
            name=name,
            category=request.category,
            quantity=request.quantity,
            is_packed=False,
            added_by=user_id,
        )
        created = self.packing.create(item)
        return self._item_to_response(created)

    def update_item(self, item_id: UUID, user_id: UUID, request: UpdatePackingItemRequest) -> PackingItemResponse:
        item = self._get_item(item_id)

        name = item.name
        if request.name is not None:
            name = request.name.strip()
            if not name:
                raise ValidationError("Item name cannot be empty")

        updated = self.packing.update(
            PackingItem(
                id=item.id,
                group_id=item.group_id,
                name=name,
                category=request.category if request.category is not None else item.category,
                quantity=request.quantity if request.quantity is not None else item.quantity,
                is_packed=item.is_packed,
                added_by=item.added_by,
                created_at=item.created_at,
            )
        )
        return self._item_to_response(updated)

    def mark_packed(self, item_id: UUID, user_id: UUID) -> PackingItemResponse:
        item = self._get_item(item_id)
        updated = self.packing.mark_packed(item_id)
        return self._item_to_response(updated)

    def mark_unpacked(self, item_id: UUID, user_id: UUID) -> PackingItemResponse:
        item = self._get_item(item_id)
        updated = self.packing.mark_unpacked(item_id)
        return self._item_to_response(updated)

    def delete_item(self, item_id: UUID, user_id: UUID) -> None:
        item = self._get_item(item_id)
        self.packing.delete(item_id)

    def get_progress(self, group_id: UUID) -> PackingProgressResponse:
        total, packed = self.packing.packing_progress(group_id)
        unpacked = total - packed
        percent = (packed / total * 100) if total > 0 else 0.0
        return PackingProgressResponse(
            total=total,
            packed=packed,
            unpacked=unpacked,
            progress_percent=round(percent, 1),
        )

    def get_categories(self, group_id: UUID) -> list[str]:
        return self.packing.categories(group_id)

    def _get_item(self, item_id: UUID) -> PackingItem:
        item = self.packing.get_by_id(item_id)
        if item is None:
            raise NotFoundError("Packing item not found")
        return item

    def _item_to_response(self, item: PackingItem) -> PackingItemResponse:
        return PackingItemResponse(
            id=item.id,
            group_id=item.group_id,
            name=item.name,
            category=item.category,
            quantity=item.quantity,
            is_packed=item.is_packed,
            added_by=item.added_by,
            created_at=item.created_at.isoformat() if item.created_at else None,
        )