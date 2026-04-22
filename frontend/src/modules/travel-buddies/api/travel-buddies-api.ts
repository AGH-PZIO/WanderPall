import { apiClient } from "../../../shared/api-client";
import type { components } from "../../../shared/api-types";

export interface LocalAttachment {
  id: string;
  filename: string;
  content_type: string;
  url: string;
  size: number;
}

export interface LocalMessageDetail {
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
}

export interface LocalMessageList {
  items: LocalMessageDetail[];
  total: number;
}

export type GroupResponse = components["schemas"]["GroupResponse"];
export type GroupDetailResponse = components["schemas"]["GroupDetailResponse"];
export type GroupListResponse = components["schemas"]["GroupListResponse"];
export type CreateGroupRequest = components["schemas"]["CreateGroupRequest"];
export type UpdateGroupRequest = components["schemas"]["UpdateGroupRequest"];

export type GroupMemberResponse = components["schemas"]["GroupMemberResponse"];
export type MemberListResponse = components["schemas"]["MemberListResponse"];
export type AddMemberRequest = components["schemas"]["AddMemberRequest"];
export type InviteMemberRequest = components["schemas"]["InviteMemberRequest"];
export type UpdateMemberRoleRequest = components["schemas"]["UpdateMemberRoleRequest"];
export type TransferOwnershipRequest = components["schemas"]["TransferOwnershipRequest"];

export type PollResponse = components["schemas"]["PollResponse"];
export type PollDetailResponse = components["schemas"]["PollDetailResponse"];
export type PollListResponse = components["schemas"]["PollListResponse"];
export type CreatePollRequest = components["schemas"]["CreatePollRequest"];
export type AddPollOptionRequest = components["schemas"]["AddPollOptionRequest"];
export type VoteRequest = components["schemas"]["VoteRequest"];

export type MessageResponse = components["schemas"]["MessageResponse"];
export type MessageDetailResponse = components["schemas"]["MessageDetailResponse"];
export type MessageDetailWithCountsResponse = LocalMessageDetail;
export type MessageListResponse = LocalMessageList;
export type CreateMessageRequest = components["schemas"]["CreateMessageRequest"];
export type AttachmentResponse = LocalAttachment;

export type TaskResponse = components["schemas"]["TaskResponse"];
export type TaskListResponse = components["schemas"]["TaskListResponse"];
export type CreateTaskRequest = components["schemas"]["CreateTaskRequest"];
export type UpdateTaskRequest = components["schemas"]["UpdateTaskRequest"];

export type PackingItemResponse = components["schemas"]["PackingItemResponse"];
export type PackingItemListResponse = components["schemas"]["PackingItemListResponse"];
export type PackingProgressResponse = components["schemas"]["PackingProgressResponse"];
export type CreatePackingItemRequest = components["schemas"]["CreatePackingItemRequest"];
export type UpdatePackingItemRequest = components["schemas"]["UpdatePackingItemRequest"];

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
    params: { limit: options?.limit, offset: options?.offset, search: options?.search }
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
  const { data, error } = await apiClient.GET(`/travel-buddies/groups/${groupId}`, {
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
  const { data, error } = await apiClient.PATCH(`/travel-buddies/groups/${groupId}`, {
    body,
    headers: authHeaders(accessToken)
  });
  if (error || !data) throw new Error(describeError(error, "Could not update group"));
  return data;
}

export async function deleteGroup(accessToken: string, groupId: string): Promise<void> {
  const { error } = await apiClient.DELETE(`/travel-buddies/groups/${groupId}`, {
    headers: authHeaders(accessToken)
  });
  if (error) throw new Error(describeError(error, "Could not delete group"));
}

export async function listGroupMembers(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<MemberListResponse> {
  const { data, error } = await apiClient.GET(`/travel-buddies/groups/${groupId}/members`, {
    headers: authHeaders(accessToken),
    params: { limit: options?.limit, offset: options?.offset }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch members"));
  return data;
}

export async function addGroupMember(
  accessToken: string,
  groupId: string,
  body: AddMemberRequest
): Promise<GroupMemberResponse> {
  const { data, error } = await apiClient.POST(`/travel-buddies/groups/${groupId}/members`, {
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
  const { data, error } = await apiClient.POST(`/travel-buddies/groups/${groupId}/invite`, {
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
  const { data, error } = await apiClient.PATCH(
    `/travel-buddies/groups/${groupId}/members/${userId}`,
    { body, headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not update role"));
  return data;
}

export async function removeGroupMember(
  accessToken: string,
  groupId: string,
  userId: string
): Promise<void> {
  const { error } = await apiClient.DELETE(
    `/travel-buddies/groups/${groupId}/members/${userId}`,
    { headers: authHeaders(accessToken) }
  );
  if (error) throw new Error(describeError(error, "Could not remove member"));
}

export async function leaveGroup(
  accessToken: string,
  groupId: string
): Promise<void> {
  const { error } = await apiClient.DELETE(
    `/travel-buddies/groups/${groupId}/leave`,
    { headers: authHeaders(accessToken) }
  );
  if (error) throw new Error(describeError(error, "Could not leave group"));
}

export async function transferOwnership(
  accessToken: string,
  groupId: string,
  body: TransferOwnershipRequest
): Promise<GroupMemberResponse> {
  const { data, error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/transfer-ownership`,
    { body, headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not transfer ownership"));
  return data;
}

export async function listPolls(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<PollListResponse> {
  const { data, error } = await apiClient.GET(`/travel-buddies/groups/${groupId}/polls`, {
    headers: authHeaders(accessToken),
    params: { limit: options?.limit, offset: options?.offset }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch polls"));
  return data;
}

export async function createPoll(
  accessToken: string,
  groupId: string,
  body: CreatePollRequest
): Promise<PollResponse> {
  const { data, error } = await apiClient.POST(`/travel-buddies/groups/${groupId}/polls`, {
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
  const { data, error } = await apiClient.GET(
    `/travel-buddies/groups/${groupId}/polls/${pollId}`,
    { headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not fetch poll"));
  return data;
}

export async function votePoll(
  accessToken: string,
  groupId: string,
  pollId: string,
  body: VoteRequest
): Promise<PollDetailResponse> {
  const { data, error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/polls/${pollId}/vote`,
    { body, headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not vote"));
  return data;
}

export async function closePoll(
  accessToken: string,
  groupId: string,
  pollId: string
): Promise<PollResponse> {
  const { data, error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/polls/${pollId}/close`,
    { headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not close poll"));
  return data;
}

export async function listMessages(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number }
): Promise<LocalMessageList> {
  const params = options ? `?limit=${options.limit}&offset=${options.offset}` : "";
  const { data, error } = await apiClient.GET(
    `/travel-buddies/groups/${groupId}/messages${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (error) throw new Error(describeError(error, "Could not fetch messages"));
  return data as LocalMessageList;
}

export async function sendMessage(
  accessToken: string,
  groupId: string,
  body: CreateMessageRequest,
  attachmentIds?: string[]
): Promise<LocalMessageDetail> {
  const { data, error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/messages`,
    {
      body: { content: body.content || "", attachment_ids: attachmentIds || [] },
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  if (error) throw new Error(describeError(error, "Could not send message"));
  return data as LocalMessageDetail;
}

export async function uploadAttachment(
  accessToken: string,
  groupId: string,
  file: File
): Promise<AttachmentResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data, error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/attachments`,
    {
      body: formData,
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  if (error || !data) throw new Error(describeError(error, "Could not upload file"));
  return data as AttachmentResponse;
}

export async function addReaction(
  accessToken: string,
  groupId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const encodedEmoji = encodeURIComponent(emoji);
  const { error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/messages/${messageId}/reactions/${encodedEmoji}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
if (error) throw new Error(describeError(error, "Could not add reaction"));
}

export async function removeReaction(
  accessToken: string,
  groupId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const encodedEmoji = encodeURIComponent(emoji);
  const { error } = await apiClient.DELETE(
    `/travel-buddies/groups/${groupId}/messages/${messageId}/reactions/${encodedEmoji}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (error) throw new Error(describeError(error, "Could not remove reaction"));
}
}

export async function removeReaction(
  accessToken: string,
  groupId: string,
  messageId: string,
  emoji: string
): Promise<void> {
  const encodedEmoji = encodeURIComponent(emoji);
  const { error } = await apiClient.DELETE(
    `/travel-buddies/groups/${groupId}/messages/${messageId}/reactions/${encodedEmoji}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (error) throw new Error(describeError(error, "Could not remove reaction"));
}

export async function deleteMessage(
  accessToken: string,
  groupId: string,
  messageId: string
): Promise<void> {
  const { error } = await apiClient.DELETE(
    `/travel-buddies/groups/${groupId}/messages/${messageId}`,
    { headers: authHeaders(accessToken) }
  );
  if (error) throw new Error(describeError(error, "Could not delete message"));
}

export async function listTasks(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number; status_filter?: string }
): Promise<TaskListResponse> {
  const { data, error } = await apiClient.GET(`/travel-buddies/groups/${groupId}/tasks`, {
    headers: authHeaders(accessToken),
    params: {
      limit: options?.limit,
      offset: options?.offset,
      status_filter: options?.status_filter
    }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch tasks"));
  return data;
}

export async function createTask(
  accessToken: string,
  groupId: string,
  body: CreateTaskRequest
): Promise<TaskResponse> {
  const { data, error } = await apiClient.POST(`/travel-buddies/groups/${groupId}/tasks`, {
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
  const { data, error } = await apiClient.PATCH(
    `/travel-buddies/groups/${groupId}/tasks/${taskId}`,
    { body, headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not update task"));
  return data;
}

export async function markTaskDone(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<TaskResponse> {
  const { data, error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/tasks/${taskId}/done`,
    { headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not mark task done"));
  return data;
}

export async function markTaskPending(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<TaskResponse> {
  const { data, error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/tasks/${taskId}/pending`,
    { headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not mark task pending"));
  return data;
}

export async function deleteTask(
  accessToken: string,
  groupId: string,
  taskId: string
): Promise<void> {
  const { error } = await apiClient.DELETE(
    `/travel-buddies/groups/${groupId}/tasks/${taskId}`,
    { headers: authHeaders(accessToken) }
  );
  if (error) throw new Error(describeError(error, "Could not delete task"));
}

export async function listPackingItems(
  accessToken: string,
  groupId: string,
  options?: { limit?: number; offset?: number; category?: string }
): Promise<PackingItemListResponse> {
  const { data, error } = await apiClient.GET(`/travel-buddies/groups/${groupId}/packing`, {
    headers: authHeaders(accessToken),
    params: { limit: options?.limit, offset: options?.offset, category: options?.category }
  });
  if (error || !data) throw new Error(describeError(error, "Could not fetch packing items"));
  return data;
}

export async function createPackingItem(
  accessToken: string,
  groupId: string,
  body: CreatePackingItemRequest
): Promise<PackingItemResponse> {
  const { data, error } = await apiClient.POST(`/travel-buddies/groups/${groupId}/packing`, {
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
  const { data, error } = await apiClient.PATCH(
    `/travel-buddies/groups/${groupId}/packing/${itemId}`,
    { body, headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not update packing item"));
  return data;
}

export async function markItemPacked(
  accessToken: string,
  groupId: string,
  itemId: string
): Promise<PackingItemResponse> {
  const { data, error } = await apiClient.POST(
    `/travel-buddies/groups/${groupId}/packing/${itemId}/packed`,
    { headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not mark item packed"));
  return data;
}

export async function getPackingProgress(
  accessToken: string,
  groupId: string
): Promise<PackingProgressResponse> {
  const { data, error } = await apiClient.GET(
    `/travel-buddies/groups/${groupId}/packing/progress`,
    { headers: authHeaders(accessToken) }
  );
  if (error || !data) throw new Error(describeError(error, "Could not fetch progress"));
  return data;
}