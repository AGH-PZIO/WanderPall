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
  created_at: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
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
  const path = `/travel-buddies/groups/${groupId}` as "/travel-buddies/groups/{group_id}";
  const { data, error } = await apiClient.GET(path, {
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch group"));
  return data;
}

export async function updateGroup(
  accessToken: string,
  groupId: string,
  body: UpdateGroupRequest
): Promise<GroupResponse> {
  const path = `/travel-buddies/groups/${groupId}` as "/travel-buddies/groups/{group_id}";
  const { data, error } = await apiClient.PATCH(path, {
    body,
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not update group"));
  return data;
}

export async function deleteGroup(accessToken: string, groupId: string): Promise<void> {
  const path = `/travel-buddies/groups/${groupId}` as "/travel-buddies/groups/{group_id}";
  const { error } = await apiClient.DELETE(path, {
    headers: authHeaders(accessToken)
  });
  if (error) throw new Error(describeError(error, "Could not delete group"));
}

export async function listGroupMembers(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<MemberListResponse> {
  const path = `/travel-buddies/groups/${groupId}/members` as "/travel-buddies/groups/{group_id}/members";
  const { data, error } = await apiClient.GET(path, {
    headers: authHeaders(accessToken),
    params: { query: { limit: options?.limit, offset: options?.offset } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch members"));
  return data;
}

export async function addGroupMember(
  accessToken: string,
  groupId: string,
  body: AddMemberRequest
): Promise<GroupMemberResponse> {
  const path = `/travel-buddies/groups/${groupId}/members` as "/travel-buddies/groups/{group_id}/members";
  const { data, error } = await apiClient.POST(path, {
    body,
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not add member"));
  return data;
}

export async function inviteMemberByEmail(
  accessToken: string,
  groupId: string,
  body: InviteMemberRequest
): Promise<GroupMemberResponse> {
  const path = `/travel-buddies/groups/${groupId}/invite` as "/travel-buddies/groups/{group_id}/invite";
  const { data, error } = await apiClient.POST(path, {
    body,
    headers: authHeaders(accessToken)
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
  const path = `/travel-buddies/groups/${groupId}/members/${userId}` as "/travel-buddies/groups/{group_id}/members/{user_id}";
  const { data, error } = await apiClient.PATCH(path, {
    body, headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not update role"));
  return data;
}

export async function removeGroupMember(
  accessToken: string,
  groupId: string,
  userId: string
): Promise<void> {
  const path = `/travel-buddies/groups/${groupId}/members/${userId}` as "/travel-buddies/groups/{group_id}/members/{user_id}";
  const { error } = await apiClient.DELETE(path, {
    headers: authHeaders(accessToken)
  });
  if (error) throw new Error(describeError(error, "Could not remove member"));
}

export async function leaveGroup(
  accessToken: string,
  groupId: string
): Promise<void> {
  const path = `/travel-buddies/groups/${groupId}/leave` as "/travel-buddies/groups/{group_id}/leave";
  const { error } = await apiClient.DELETE(path, {
    headers: authHeaders(accessToken)
  });
  if (error) throw new Error(describeError(error, "Could not leave group"));
}

export async function transferOwnership(
  accessToken: string,
  groupId: string,
  body: TransferOwnershipRequest
): Promise<GroupMemberResponse> {
  const path = `/travel-buddies/groups/${groupId}/transfer-ownership` as "/travel-buddies/groups/{group_id}/transfer-ownership";
  const { data, error } = await apiClient.POST(path, {
    body, headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not transfer ownership"));
  return data;
}

export async function listPolls(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<PollListResponse> {
  const path = `/travel-buddies/groups/${groupId}/polls` as "/travel-buddies/groups/{group_id}/polls";
  const { data, error } = await apiClient.GET(path, {
    headers: authHeaders(accessToken),
    params: { query: { limit: options?.limit, offset: options?.offset } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch polls"));
  return data;
}

export async function createPoll(
  accessToken: string,
  groupId: string,
  body: CreatePollRequest
): Promise<PollResponse> {
  const path = `/travel-buddies/groups/${groupId}/polls` as "/travel-buddies/groups/{group_id}/polls";
  const { data, error } = await apiClient.POST(path, {
    body,
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not create poll"));
  return data;
}

export async function getPoll(
  accessToken: string,
  groupId: string,
  pollId: string
): Promise<PollDetailResponse> {
  const path = `/travel-buddies/groups/${groupId}/polls/${pollId}` as "/travel-buddies/groups/{group_id}/polls/{poll_id}";
  const { data, error } = await apiClient.GET(path, {
    headers: authHeaders(accessToken)
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
  const path = `/travel-buddies/groups/${groupId}/polls/${pollId}/vote` as "/travel-buddies/groups/{group_id}/polls/{poll_id}/vote";
  const { data, error } = await apiClient.POST(path, {
    body, headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not vote"));
  return data;
}

export async function closePoll(
  accessToken: string,
  groupId: string,
  pollId: string
): Promise<PollResponse> {
  const path = `/travel-buddies/groups/${groupId}/polls/${pollId}/close` as "/travel-buddies/groups/{group_id}/polls/{poll_id}/close";
  const { data, error } = await apiClient.POST(path, {
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not close poll"));
  return data;
}

export async function listMessages(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<MessageListResponse> {
  const path = `/travel-buddies/groups/${groupId}/messages` as "/travel-buddies/groups/{group_id}/messages";
  const { data, error } = await apiClient.GET(path, {
    headers: authHeaders(accessToken),
    params: { query: { limit: options?.limit, offset: options?.offset } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch messages"));
  return data;
}

export async function sendMessage(
  accessToken: string,
  groupId: string,
  body: CreateMessageRequest
): Promise<MessageDetailResponse> {
  const path = `/travel-buddies/groups/${groupId}/messages` as "/travel-buddies/groups/{group_id}/messages";
  const { data, error } = await apiClient.POST(path, {
    body: { content: body.content || "", attachment_ids: body.attachment_ids || [] },
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not send message"));
  return data;
}

export async function uploadAttachment(
  accessToken: string,
  groupId: string,
  file: File
): Promise<AttachmentResponse> {
  const path = `/travel-buddies/groups/${groupId}/attachments` as "/travel-buddies/groups/{group_id}/attachments";
  const formData = new FormData();
  formData.append("file", file);
  const { data, error } = await apiClient.POST(path, {
    body: formData,
    headers: authHeaders(accessToken)
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
  const path = `/travel-buddies/groups/${groupId}/messages/${messageId}/reactions/${encodedEmoji}` as "/travel-buddies/groups/{group_id}/messages/{message_id}/reactions/{emoji}";
  const { error } = await apiClient.POST(path, {
    headers: authHeaders(accessToken)
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
  const path = `/travel-buddies/groups/${groupId}/messages/${messageId}/reactions/${encodedEmoji}` as "/travel-buddies/groups/{group_id}/messages/{message_id}/reactions/{emoji}";
  const { error } = await apiClient.DELETE(path, {
    headers: authHeaders(accessToken)
  });
  if (error) throw new Error(describeError(error, "Could not remove reaction"));
}

export async function deleteMessage(
  accessToken: string,
  groupId: string,
  messageId: string
): Promise<void> {
  const path = `/travel-buddies/groups/${groupId}/messages/${messageId}` as "/travel-buddies/groups/{group_id}/messages/{message_id}";
  const { error } = await apiClient.DELETE(path, {
    headers: authHeaders(accessToken)
  });
  if (error) throw new Error(describeError(error, "Could not delete message"));
}

export async function listTasks(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number; status_filter?: string }
): Promise<TaskListResponse> {
  const path = `/travel-buddies/groups/${groupId}/tasks` as "/travel-buddies/groups/{group_id}/tasks";
  const { data, error } = await apiClient.GET(path, {
    headers: authHeaders(accessToken),
    params: { query: { limit: options?.limit, offset: options?.offset, status_filter: options?.status_filter } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch tasks"));
  return data;
}

export async function createTask(
  accessToken: string,
  groupId: string,
  body: CreateTaskRequest
): Promise<TaskResponse> {
  const path = `/travel-buddies/groups/${groupId}/tasks` as "/travel-buddies/groups/{group_id}/tasks";
  const { data, error } = await apiClient.POST(path, {
    body,
    headers: authHeaders(accessToken)
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
  const path = `/travel-buddies/groups/${groupId}/tasks/${taskId}` as "/travel-buddies/groups/{group_id}/tasks/{task_id}";
  const { data, error } = await apiClient.PATCH(path, {
    body, headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not update task"));
  return data;
}

export async function markTaskDone(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<TaskResponse> {
  const path = `/travel-buddies/groups/${groupId}/tasks/${taskId}/done` as "/travel-buddies/groups/{group_id}/tasks/{task_id}/done";
  const { data, error } = await apiClient.POST(path, {
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not mark task done"));
  return data;
}

export async function markTaskPending(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<TaskResponse> {
  const path = `/travel-buddies/groups/${groupId}/tasks/${taskId}/pending` as "/travel-buddies/groups/{group_id}/tasks/{task_id}/pending";
  const { data, error } = await apiClient.POST(path, {
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not mark task pending"));
  return data;
}

export async function deleteTask(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<void> {
  const path = `/travel-buddies/groups/${groupId}/tasks/${taskId}` as "/travel-buddies/groups/{group_id}/tasks/{task_id}";
  const { error } = await apiClient.DELETE(path, {
    headers: authHeaders(accessToken)
  });
  if (error) throw new Error(describeError(error, "Could not delete task"));
}

export async function listPackingItems(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number; category?: string }
): Promise<PackingItemListResponse> {
  const path = `/travel-buddies/groups/${groupId}/packing` as "/travel-buddies/groups/{group_id}/packing";
  const { data, error } = await apiClient.GET(path, {
    headers: authHeaders(accessToken),
    params: { query: { limit: options?.limit, offset: options?.offset, category: options?.category } }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch packing items"));
  return data;
}

export async function createPackingItem(
  accessToken: string,
  groupId: string,
  body: CreatePackingItemRequest
): Promise<PackingItemResponse> {
  const path = `/travel-buddies/groups/${groupId}/packing` as "/travel-buddies/groups/{group_id}/packing";
  const { data, error } = await apiClient.POST(path, {
    body,
    headers: authHeaders(accessToken)
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
  const path = `/travel-buddies/groups/${groupId}/packing/${itemId}` as "/travel-buddies/groups/{group_id}/packing/{item_id}";
  const { data, error } = await apiClient.PATCH(path, {
    body, headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not update packing item"));
  return data;
}

export async function markItemPacked(
  accessToken: string,
  groupId: string,
  itemId: string
): Promise<PackingItemResponse> {
  const path = `/travel-buddies/groups/${groupId}/packing/${itemId}/packed` as "/travel-buddies/groups/{group_id}/packing/{item_id}/packed";
  const { data, error } = await apiClient.POST(path, {
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not mark item packed"));
  return data;
}

export async function getPackingProgress(
  accessToken: string,
  groupId: string
): Promise<PackingProgressResponse> {
  const path = `/travel-buddies/groups/${groupId}/packing/progress` as "/travel-buddies/groups/{group_id}/packing/progress";
  const { data, error } = await apiClient.GET(path, {
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch progress"));
  return data;
}