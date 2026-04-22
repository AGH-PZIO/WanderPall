from uuid import UUID, uuid4

from app.modules.travel_buddies.errors import ForbiddenError, NotFoundError, ValidationError
from app.modules.travel_buddies.models import Task, TaskStatus
from app.modules.travel_buddies.repositories.protocols import TaskRepository
from app.modules.travel_buddies.schemas import CreateTaskRequest, TaskResponse, UpdateTaskRequest, TaskListResponse


class ToDoListService:
    def __init__(self, tasks: TaskRepository) -> None:
        self.tasks = tasks

    def list_tasks(
        self,
        group_id: UUID,
        limit: int,
        offset: int,
        status_filter: str | None = None,
    ) -> TaskListResponse:
        if status_filter:
            status = TaskStatus(status_filter)
            task_list = self.tasks.list_by_status(group_id, status, limit, offset)
            total = self.tasks.count_by_status(group_id, status)
        else:
            task_list = self.tasks.list_by_group(group_id, limit, offset)
            total = self.tasks.count_by_group(group_id)
        items = [self._task_to_response(t) for t in task_list]
        return TaskListResponse(items=items, total=total)

    def create_task(self, group_id: UUID, user_id: UUID, request: CreateTaskRequest) -> TaskResponse:
        title = request.title.strip()
        if not title:
            raise ValidationError("Task title cannot be empty")
        if len(title) > 200:
            raise ValidationError("Task title too long (max 200 characters)")

        task = Task(
            id=uuid4(),
            group_id=group_id,
            title=title,
            description=request.description,
            status=TaskStatus.PENDING,
            assigned_to=request.assigned_to,
            due_date=request.due_date,
            created_by=user_id,
        )
        created = self.tasks.create(task)
        return self._task_to_response(created)

    def update_task(self, task_id: UUID, user_id: UUID, request: UpdateTaskRequest) -> TaskResponse:
        task = self._get_task(task_id)

        title = task.title
        if request.title is not None:
            title = request.title.strip()
            if not title:
                raise ValidationError("Task title cannot be empty")

        updated = self.tasks.update(
            Task(
                id=task.id,
                group_id=task.group_id,
                title=title,
                description=request.description if request.description is not None else task.description,
                status=task.status,
                assigned_to=request.assigned_to if request.assigned_to is not None else task.assigned_to,
                due_date=request.due_date if request.due_date is not None else task.due_date,
                created_by=task.created_by,
                created_at=task.created_at,
                updated_at=task.updated_at,
            )
        )
        return self._task_to_response(updated)

    def mark_done(self, task_id: UUID, user_id: UUID) -> TaskResponse:
        task = self._get_task(task_id)
        updated = self.tasks.mark_done(task_id)
        return self._task_to_response(updated)

    def mark_pending(self, task_id: UUID, user_id: UUID) -> TaskResponse:
        task = self._get_task(task_id)
        updated = self.tasks.mark_pending(task_id)
        return self._task_to_response(updated)

    def assign_task(self, task_id: UUID, user_id: UUID, assignee_id: UUID | None) -> TaskResponse:
        task = self._get_task(task_id)
        updated = self.tasks.assign(task_id, assignee_id)
        return self._task_to_response(updated)

    def delete_task(self, task_id: UUID, user_id: UUID) -> None:
        task = self._get_task(task_id)
        self.tasks.delete(task_id)

    def get_pending_count(self, group_id: UUID) -> int:
        return self.tasks.count_pending(group_id)

    def get_done_count(self, group_id: UUID) -> int:
        return self.tasks.count_done(group_id)

    def _get_task(self, task_id: UUID) -> Task:
        task = self.tasks.get_by_id(task_id)
        if task is None:
            raise NotFoundError("Task not found")
        return task

    def _task_to_response(self, task: Task) -> TaskResponse:
        return TaskResponse(
            id=task.id,
            group_id=task.group_id,
            title=task.title,
            description=task.description,
            status=task.status.value,
            assigned_to=task.assigned_to,
            due_date=task.due_date,
            created_by=task.created_by,
            created_at=task.created_at.isoformat() if task.created_at else None,
        )