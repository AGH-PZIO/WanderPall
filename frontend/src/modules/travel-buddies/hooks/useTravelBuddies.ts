import { useCallback, useState } from "react";
import { apiClient } from "../../../shared/api-client";
import type { components } from "../../../shared/api-types";

type Group = components["schemas"]["GroupResponse"];
type GroupWithMembers = components["schemas"]["GroupWithMembersResponse"];

export const DEV_USER_ID = "123e4567-e89b-12d3-a456-426614174000";

export function useTravelBuddies() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = { "X-Dev-User-Id": DEV_USER_ID };

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient.GET("/travel-buddies/groups", { headers });
    if (!res.error && res.data) {
      setGroups(res.data as Group[]);
    } else {
      setError("Failed to load groups");
    }
    setLoading(false);
  }, []);

  const createGroup = useCallback(async (name: string, description?: string) => {
    const res = await apiClient.POST("/travel-buddies/groups", {
      headers,
      body: { name, description: description ?? null }
    });
    if (!res.error) {
      await fetchGroups();
    }
  }, [fetchGroups]);

  const selectGroup = useCallback(async (groupId: string) => {
    const res = await apiClient.GET("/travel-buddies/groups/{group_id}", {
      headers,
      params: { path: { group_id: groupId } }
    });
    if (!res.error && res.data) {
      setSelectedGroup(res.data as GroupWithMembers);
    }
  }, []);

  const deleteGroup = useCallback(async (groupId: string) => {
    await apiClient.DELETE("/travel-buddies/groups/{group_id}", {
      headers,
      params: { path: { group_id: groupId } }
    });
    setSelectedGroup(null);
    await fetchGroups();
  }, [fetchGroups]);

  const addMember = useCallback(async (groupId: string, userId: string) => {
    await apiClient.POST("/travel-buddies/groups/{group_id}/members", {
      headers,
      params: { path: { group_id: groupId } },
      body: { user_id: userId }
    });
    await selectGroup(groupId);
  }, [selectGroup]);

  const removeMember = useCallback(async (groupId: string, memberId: string) => {
    await apiClient.DELETE("/travel-buddies/groups/{group_id}/members/{member_id}", {
      headers,
      params: { path: { group_id: groupId, member_id: memberId } }
    });
    await selectGroup(groupId);
  }, [selectGroup]);

  return {
    groups,
    selectedGroup,
    setSelectedGroup,
    loading,
    error,
    fetchGroups,
    createGroup,
    selectGroup,
    deleteGroup,
    addMember,
    removeMember
  };
}
