from uuid import UUID, uuid4

from app.modules.travel_buddies.errors import NotFoundError, ValidationError
from app.modules.travel_buddies.models import Message
from app.modules.travel_buddies.repositories.protocols import MessageRepository, AttachmentRepository
from app.modules.travel_buddies.schemas import CreateMessageRequest, MessageResponse, MessageListResponse, MessageDetailWithCountsResponse, AttachmentResponse
from app.modules.account.repositories.protocols import UserRepository


class MessageService:
    def __init__(self, messages: MessageRepository, attachments: "AttachmentRepository | None" = None) -> None:
        self.messages = messages
        self.attachments = attachments

    def list_messages(self, group_id: UUID, limit: int, offset: int, user_repo: "UserRepository | None" = None) -> MessageListResponse:
        msg_list = self.messages.list_by_group(group_id, limit, offset)
        total = self.messages.count_by_group(group_id)
        items = []
        for msg in msg_list:
            reactions = self.messages.get_reactions(msg.id)
            reaction_counts = {emoji: len(users) for emoji, users in reactions.items()}
            user = user_repo.get_by_id(msg.user_id) if user_repo else None
            atts = self.messages.get_attachments(msg.id)
            attachments = [
                AttachmentResponse(
                    id=a.id,
                    filename=a.filename,
                    content_type=a.content_type,
                    url=f"/media/travel_buddies/{a.filename.split('/')[-1]}",
                    size=a.size,
                )
                for a in atts
            ]
            items.append(
                MessageDetailWithCountsResponse(
                    id=msg.id,
                    group_id=msg.group_id,
                    user_id=msg.user_id,
                    content=msg.content,
                    reactions=reaction_counts,
                    attachments=attachments,
                    created_at=msg.created_at.isoformat() if msg.created_at else None,
                    first_name=user.first_name if user else None,
                    last_name=user.last_name if user else None,
                )
            )
        return MessageListResponse(items=items, total=total)

    def send_message(self, group_id: UUID, user_id: UUID, request: CreateMessageRequest, user_repo: "UserRepository | None" = None) -> MessageDetailWithCountsResponse:
        content = request.content.strip()
        if not content and not request.attachment_ids:
            raise ValidationError("Message cannot be empty")
        if content and len(content) > 5000:
            raise ValidationError("Message too long (max 5000 characters)")

        message = Message(
            id=uuid4(),
            group_id=group_id,
            user_id=user_id,
            content=content or "📎",
        )
        created = self.messages.create(message)
        
        if request.attachment_ids and self.attachments:
            for att_id in request.attachment_ids:
                self.attachments.link_attachment(created.id, att_id)
        
        atts = self.messages.get_attachments(created.id)
        attachments = [
            AttachmentResponse(
                id=a.id,
                filename=a.filename,
                content_type=a.content_type,
                url=f"/media/travel_buddies/{a.filename.split('/')[-1]}",
                size=a.size,
            )
            for a in atts
        ]
        
        user = user_repo.get_by_id(user_id) if user_repo else None
        return MessageDetailWithCountsResponse(
            id=created.id,
            group_id=group_id,
            user_id=user_id,
            content=created.content,
            reactions={},
            attachments=attachments,
            created_at=created.created_at.isoformat() if created.created_at else None,
            first_name=user.first_name if user else None,
            last_name=user.last_name if user else None,
        )

    def add_reaction(self, message_id: UUID, user_id: UUID, emoji: str) -> None:
        if not emoji or len(emoji) > 32:
            raise ValidationError("Invalid emoji")
        self.messages.add_reaction(message_id, user_id, emoji)

    def remove_reaction(self, message_id: UUID, user_id: UUID, emoji: str) -> None:
        self.messages.remove_reaction(message_id, user_id, emoji)

    def get_message(self, message_id: UUID) -> Message:
        message = self.messages.get_by_id(message_id)
        if message is None:
            raise NotFoundError("Message not found")
        return message

    def delete_message(self, message_id: UUID, user_id: UUID) -> None:
        message = self._get_message(message_id)
        if message.user_id != user_id:
            raise NotFoundError("You can only delete your own messages")
        self.messages.delete(message_id)

    def _get_message(self, message_id: UUID) -> Message:
        message = self.messages.get_by_id(message_id)
        if message is None:
            raise NotFoundError("Message not found")
        return message