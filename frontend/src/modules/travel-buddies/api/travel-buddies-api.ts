import { apiClient } from "../../../shared/api-client";

export interface LocalAttachment {
  id: string;
  filename: string;
  content_type: string;
  url: string;
  size: number;
}

export type GroupResponse = {
  id: string;
  name: string;
  description?: string | null;
  member_count: number;
  created_at?: string | null;
};
export type GroupDetailResponse = {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at?: string | null;
  updated_at?: string | null;
  is_member: boolean;
  is_admin: boolean;
  is_owner: boolean;
};
export type GroupListResponse = {
  items: GroupResponse[];
  total: number;
};
export type CreateGroupRequest = {
  name: string;
  description?: string | null;
};
export type UpdateGroupRequest = {
  name?: string | null;
  description?: string | null;
};

export type GroupMemberResponse = {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  nickname?: string | null;
  joined_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};
export type MemberListResponse = {
  items: GroupMemberResponse[];
  total: number;
};
export type AddMemberRequest = {
  user_id: string;
};
export type InviteMemberRequest = {
  email: string;
};
export type UpdateMemberRoleRequest = {
  role: string;
};
export type TransferOwnershipRequest = {
  new_owner_id: string;
};

export type PollResponse = {
  id: string;
  group_id: string;
  question: string;
  status: string;
  created_by: string;
  option_count: number;
  vote_count: number;
  created_at?: string | null;
  closed_at?: string | null;
};
export type PollDetailResponse = {
  id: string;
  group_id: string;
  question: string;
  status: string;
  created_by: string;
  created_at?: string | null;
  closed_at?: string | null;
  options: { id: string; poll_id: string; text: string; order_index: number; vote_count: number }[];
  user_vote_option_id?: string | null;
  is_closed: boolean;
};
export type PollListResponse = {
  items: PollResponse[];
  total: number;
};
export type CreatePollRequest = {
  question: string;
  options: string[];
};
export type AddPollOptionRequest = {
  text: string;
};
export type VoteRequest = {
  option_id: string;
};

export type MessageDetailResponse = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  reactions: Record<string, number>;
  attachments: LocalAttachment[];
  created_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
};
export type MessageDetailWithCountsResponse = MessageDetailResponse;
export type MessageListResponse = {
  items: MessageDetailResponse[];
  total: number;
};
export type CreateMessageRequest = {
  content: string;
  attachment_ids?: string[];
};
export type AttachmentResponse = LocalAttachment;

export type TaskResponse = {
  id: string;
  group_id: string;
  title: string;
  description?: string | null;
  status: string;
  assigned_to?: string | null;
  due_date?: string | null;
  created_by: string;
  created_at?: string | null;
};
export type TaskListResponse = {
  items: TaskResponse[];
  total: number;
};
export type CreateTaskRequest = {
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
};
export type UpdateTaskRequest = {
  title?: string | null;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
};

export type PackingItemResponse = {
  id: string;
  group_id: string;
  name: string;
  category?: string | null;
  quantity: number;
  is_packed: boolean;
  added_by: string;
  created_at?: string | null;
};
export type PackingItemListResponse = {
  items: PackingItemResponse[];
  total: number;
  packed_count: number;
};
export type PackingProgressResponse = {
  total: number;
  packed: number;
  unpacked: number;
  progress_percent: number;
};
export type CreatePackingItemRequest = {
  name: string;
  category?: string | null;
  quantity?: number;
};
export type UpdatePackingItemRequest = {
  name?: string | null;
  category?: string | null;
  quantity?: number | null;
};

function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function describeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
  }
  return fallback;
}

export async function listGroups(
  accessToken: string,
  options?: { limit?: number; offset?: number; search?: string }
): Promise<GroupListResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups", {
    headers: authHeaders(accessToken),
    params: { query: { limit: options?.limit, offset: options?.offset, search: options?.search } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch groups"));
  return data;
}

export async function createGroup(
  accessToken: string,
  body: CreateGroupRequest
): Promise<GroupResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups", {
    body,
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not create group"));
  return data;
}

export async function getGroup(
  accessToken: string,
  groupId: string
): Promise<GroupDetailResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups/{group_id}", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch group"));
  return data;
}

export async function updateGroup(
  accessToken: string,
  groupId: string,
  body: UpdateGroupRequest
): Promise<GroupResponse> {
  const { data, error } = await apiClient.PATCH("/travel-buddies/groups/{group_id}", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not update group"));
  return data;
}

export async function deleteGroup(accessToken: string, groupId: string): Promise<void> {
  const { error } = await apiClient.DELETE("/travel-buddies/groups/{group_id}", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error) throw new Error(describeError(error, "Could not delete group"));
}

export async function listGroupMembers(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<MemberListResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups/{group_id}/members", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId }, query: { limit: options?.limit, offset: options?.offset } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch members"));
  return data;
}

export async function addGroupMember(
  accessToken: string,
  groupId: string,
  body: AddMemberRequest
): Promise<GroupMemberResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/members", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not add member"));
  return data;
}

export async function inviteMemberByEmail(
  accessToken: string,
  groupId: string,
  body: InviteMemberRequest
): Promise<GroupMemberResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/invite", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not invite member"));
  return data;
}

export async function updateMemberRole(
  accessToken: string,
  groupId: string,
  userId: string,
  body: UpdateMemberRoleRequest
): Promise<GroupMemberResponse> {
  const { data, error } = await apiClient.PATCH("/travel-buddies/groups/{group_id}/members/{user_id}", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, user_id: userId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not update role"));
  return data;
}

export async function removeGroupMember(
  accessToken: string,
  groupId: string,
  userId: string
): Promise<void> {
  const { error } = await apiClient.DELETE("/travel-buddies/groups/{group_id}/members/{user_id}", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, user_id: userId } }
  });
  if (error) throw new Error(describeError(error, "Could not remove member"));
}

export async function leaveGroup(
  accessToken: string,
  groupId: string
): Promise<void> {
  const { error } = await apiClient.DELETE("/travel-buddies/groups/{group_id}/leave", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error) throw new Error(describeError(error, "Could not leave group"));
}

export async function transferOwnership(
  accessToken: string,
  groupId: string,
  body: TransferOwnershipRequest
): Promise<GroupMemberResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/transfer-ownership", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not transfer ownership"));
  return data;
}

export async function listPolls(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<PollListResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups/{group_id}/polls", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId }, query: { limit: options?.limit, offset: options?.offset } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch polls"));
  return data;
}

export async function createPoll(
  accessToken: string,
  groupId: string,
  body: CreatePollRequest
): Promise<PollResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/polls", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not create poll"));
  return data;
}

export async function getPoll(
  accessToken: string,
  groupId: string,
  pollId: string
): Promise<PollDetailResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups/{group_id}/polls/{poll_id}", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, poll_id: pollId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch poll"));
  return data;
}

export async function votePoll(
  accessToken: string,
  groupId: string,
  pollId: string,
  body: VoteRequest
): Promise<PollDetailResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/polls/{poll_id}/vote", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, poll_id: pollId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not vote"));
  return data;
}

export async function closePoll(
  accessToken: string,
  groupId: string,
  pollId: string
): Promise<PollResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/polls/{poll_id}/close", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, poll_id: pollId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not close poll"));
  return data;
}

export async function listMessages(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<MessageListResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups/{group_id}/messages", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId }, query: { limit: options?.limit, offset: options?.offset } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch messages"));
  return data;
}

export async function sendMessage(
  accessToken: string,
  groupId: string,
  body: CreateMessageRequest
): Promise<MessageDetailResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/messages", {
    body: { content: body.content || "", attachment_ids: body.attachment_ids || [] },
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not send message"));
  return data;
}

export async function uploadAttachment(
  accessToken: string,
  groupId: string,
  file: File
): Promise<AttachmentResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/attachments", {
    body: formData as unknown as { file: string },
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId }, query: {} }
  });
  if (error || !data) throw new Error(describeError(error, "Could not upload file"));
  return data;
}

export async function addReaction(
  accessToken: string,
  groupId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const encodedEmoji = encodeURIComponent(emoji);
  const { error } = await apiClient.POST("/travel-buddies/groups/{group_id}/messages/{message_id}/reactions/{emoji}", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, message_id: messageId, emoji: encodedEmoji } }
  });
  if (error) throw new Error(describeError(error, "Could not add reaction"));
}

export async function removeReaction(
  accessToken: string,
  groupId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const encodedEmoji = encodeURIComponent(emoji);
  const { error } = await apiClient.DELETE("/travel-buddies/groups/{group_id}/messages/{message_id}/reactions/{emoji}", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, message_id: messageId, emoji: encodedEmoji } }
  });
  if (error) throw new Error(describeError(error, "Could not remove reaction"));
}

export async function deleteMessage(
  accessToken: string,
  groupId: string,
  messageId: string
): Promise<void> {
  const { error } = await apiClient.DELETE("/travel-buddies/groups/{group_id}/messages/{message_id}", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, message_id: messageId } }
  });
  if (error) throw new Error(describeError(error, "Could not delete message"));
}

export async function listTasks(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number; status_filter?: string }
): Promise<TaskListResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups/{group_id}/tasks", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId }, query: { limit: options?.limit, offset: options?.offset, status_filter: options?.status_filter ?? null } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch tasks"));
  return data;
}

export async function createTask(
  accessToken: string,
  groupId: string,
  body: CreateTaskRequest
): Promise<TaskResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/tasks", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not create task"));
  return data;
}

export async function updateTask(
  accessToken: string,
  groupId: string,
  taskId: string,
  body: UpdateTaskRequest
): Promise<TaskResponse> {
  const { data, error } = await apiClient.PATCH("/travel-buddies/groups/{group_id}/tasks/{task_id}", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, task_id: taskId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not update task"));
  return data;
}

export async function markTaskDone(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<TaskResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/tasks/{task_id}/done", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, task_id: taskId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not mark task done"));
  return data;
}

export async function markTaskPending(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<TaskResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/tasks/{task_id}/pending", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, task_id: taskId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not mark task pending"));
  return data;
}

export async function deleteTask(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<void> {
  const { error } = await apiClient.DELETE("/travel-buddies/groups/{group_id}/tasks/{task_id}", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, task_id: taskId } }
  });
  if (error) throw new Error(describeError(error, "Could not delete task"));
}

export async function listPackingItems(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number; category?: string }
): Promise<PackingItemListResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups/{group_id}/packing", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId }, query: { limit: options?.limit, offset: options?.offset, category: options?.category ?? null } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch packing items"));
  return data;
}

export async function createPackingItem(
  accessToken: string,
  groupId: string,
  body: CreatePackingItemRequest
): Promise<PackingItemResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/packing", {
    body: { ...body, quantity: body.quantity ?? 1 },
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not create packing item"));
  return data;
}

export async function updatePackingItem(
  accessToken: string,
  groupId: string,
  itemId: string,
  body: UpdatePackingItemRequest
): Promise<PackingItemResponse> {
  const { data, error } = await apiClient.PATCH("/travel-buddies/groups/{group_id}/packing/{item_id}", {
    body,
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, item_id: itemId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not update packing item"));
  return data;
}

export async function markItemPacked(
  accessToken: string,
  groupId: string,
  itemId: string
): Promise<PackingItemResponse> {
  const { data, error } = await apiClient.POST("/travel-buddies/groups/{group_id}/packing/{item_id}/packed", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId, item_id: itemId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not mark item packed"));
  return data;
}

export async function getPackingProgress(
  accessToken: string,
  groupId: string
): Promise<PackingProgressResponse> {
  const { data, error } = await apiClient.GET("/travel-buddies/groups/{group_id}/packing/progress", {
    headers: authHeaders(accessToken),
    params: { path: { group_id: groupId } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not create packing item"));
  return data;
}