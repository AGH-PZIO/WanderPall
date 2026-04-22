from uuid import UUID, uuid4

from app.modules.travel_buddies.errors import ForbiddenError, NotFoundError, ValidationError
from app.modules.travel_buddies.models import Poll, PollOption, PollStatus, PollVote
from app.modules.travel_buddies.repositories.protocols import PollRepository, PollOptionRepository, PollVoteRepository
from app.modules.travel_buddies.schemas import (
    CreatePollRequest,
    AddPollOptionRequest,
    PollResponse,
    PollDetailResponse,
    PollOptionResponse,
    VoteRequest,
    PollListResponse,
)


def _poll_to_response(poll: Poll, option_count: int = 0, vote_count: int = 0) -> PollResponse:
    return PollResponse(
        id=poll.id,
        group_id=poll.group_id,
        question=poll.question,
        status=poll.status.value,
        created_by=poll.created_by,
        option_count=option_count,
        vote_count=vote_count,
        created_at=poll.created_at.isoformat() if poll.created_at else None,
        closed_at=poll.closed_at.isoformat() if poll.closed_at else None,
    )


def _option_to_response(option: PollOption, vote_count: int = 0) -> PollOptionResponse:
    return PollOptionResponse(
        id=option.id,
        poll_id=option.poll_id,
        text=option.text,
        order_index=option.order_index,
        vote_count=vote_count,
    )


class PollManagementService:
    def __init__(
        self,
        polls: PollRepository,
        poll_options: PollOptionRepository | None = None,
        poll_votes: PollVoteRepository | None = None,
    ) -> None:
        self.polls = polls
        self.poll_options = poll_options
        self.poll_votes = poll_votes

    def list_polls(self, group_id: UUID, limit: int, offset: int) -> PollListResponse:
        poll_list = self.polls.list_by_group(group_id, limit, offset)
        total = self.polls.count_by_group(group_id)
        items = []
        for poll in poll_list:
            opt_count = len(self.poll_options.list_by_poll(poll.id)) if self.poll_options else 0
            vote_count = self.poll_votes.vote_count(poll.id) if self.poll_votes else 0
            items.append(_poll_to_response(poll, opt_count, vote_count))
        return PollListResponse(items=items, total=total)

    def create_poll(self, group_id: UUID, user_id: UUID, request: CreatePollRequest) -> PollResponse:
        if len(request.options) < 2:
            raise ValidationError("Poll must have at least 2 options")
        if len(request.options) > 20:
            raise ValidationError("Poll cannot have more than 20 options")

        poll = Poll(
            id=uuid4(),
            group_id=group_id,
            question=request.question.strip(),
            status=PollStatus.OPEN,
            created_by=user_id,
        )
        created_poll = self.polls.create(poll)

        if self.poll_options:
            db_options = []
            for i, text in enumerate(request.options):
                db_options.append(
                    PollOption(
                        id=uuid4(),
                        poll_id=created_poll.id,
                        text=text.strip(),
                        order_index=i,
                    )
                )
            self.poll_options.bulk_create(db_options)
            return _poll_to_response(created_poll, len(db_options), 0)
        return _poll_to_response(created_poll, 0, 0)

    def get_poll_detail(self, poll_id: UUID, user_id: UUID) -> PollDetailResponse:
        poll = self._get_poll(poll_id)
        options = self.poll_options.list_by_poll(poll_id) if self.poll_options else []
        results = self.poll_votes.get_results(poll_id) if self.poll_votes else {}
        option_responses = []
        for opt in options:
            vc = results.get(opt.id, 0)
            option_responses.append(_option_to_response(opt, vc))

        user_vote_option_id = None
        if self.poll_votes and self.poll_votes.has_voted(poll_id, user_id):
            vote = self.poll_votes.get_by_poll_and_user(poll_id, user_id)
            if vote:
                user_vote_option_id = vote.option_id

        winning_option = None
        if option_responses and poll.status == PollStatus.CLOSED:
            winning_option = max(option_responses, key=lambda o: o.vote_count)

        return PollDetailResponse(
            id=poll.id,
            group_id=poll.group_id,
            question=poll.question,
            status=poll.status.value,
            created_by=poll.created_by,
            created_at=poll.created_at.isoformat() if poll.created_at else None,
            closed_at=poll.closed_at.isoformat() if poll.closed_at else None,
            options=option_responses,
            user_vote_option_id=user_vote_option_id,
            is_closed=poll.status == PollStatus.CLOSED,
            winning_option=winning_option,
        )

    def add_option(self, poll_id: UUID, user_id: UUID, request: AddPollOptionRequest) -> PollOptionResponse:
        poll = self._get_poll(poll_id)
        if poll.status == PollStatus.CLOSED:
            raise ValidationError("Cannot add option to closed poll")
        if not self.poll_options:
            raise NotFoundError("Poll options repository not configured")

        option = PollOption(
            id=uuid4(),
            poll_id=poll_id,
            text=request.text.strip(),
        )
        created = self.poll_options.create(option)
        return _option_to_response(created, 0)

    def vote(self, poll_id: UUID, option_id: UUID, user_id: UUID) -> PollDetailResponse:
        poll = self._get_poll(poll_id)
        if poll.status == PollStatus.CLOSED:
            raise ValidationError("Cannot vote on closed poll")
        if not self.poll_options or not self.poll_votes:
            raise NotFoundError("Poll repositories not configured")

        option = self.poll_options.get_by_id(option_id)
        if option is None or option.poll_id != poll_id:
            raise NotFoundError("Option not found in this poll")

        if self.poll_votes.has_voted(poll_id, user_id):
            self.poll_votes.delete_by_poll_and_user(poll_id, user_id)

        vote = PollVote(
            id=uuid4(),
            poll_id=poll_id,
            option_id=option_id,
            user_id=user_id,
        )
        self.poll_votes.create(vote)
        return self.get_poll_detail(poll_id, user_id)

    def remove_vote(self, poll_id: UUID, user_id: UUID) -> None:
        if not self.poll_votes:
            raise NotFoundError("Poll votes repository not configured")
        self.poll_votes.delete_by_poll_and_user(poll_id, user_id)

    def close_poll(self, poll_id: UUID, user_id: UUID) -> PollResponse:
        poll = self._get_poll(poll_id)
        if poll.status == PollStatus.CLOSED:
            raise ValidationError("Poll is already closed")
        closed_poll = self.polls.close(poll_id)
        return _poll_to_response(closed_poll)

    def _get_poll(self, poll_id: UUID) -> Poll:
        poll = self.polls.get_by_id(poll_id)
        if poll is None:
            raise NotFoundError("Poll not found")
        return poll