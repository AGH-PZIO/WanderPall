import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  listGroups,
  getGroup,
  listGroupMembers,
  listPolls,
  listMessages,
  listTasks,
  listPackingItems,
  getPackingProgress,
  type GroupResponse,
  type GroupDetailResponse,
  type MemberListResponse,
  type PollListResponse,
  type MessageDetailWithCountsResponse,
  type TaskListResponse,
  type PackingItemListResponse,
  type PackingProgressResponse,
} from "../api/travel-buddies-api";

interface TravelBuddiesState {
  groups: GroupResponse[];
  currentGroup: GroupDetailResponse | null;
  members: MemberListResponse | null;
  polls: PollListResponse | null;
  messages: MessageDetailWithCountsResponse[];
  tasks: TaskListResponse | null;
  packingItems: PackingItemListResponse | null;
  packingProgress: PackingProgressResponse | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface TravelBuddiesContextValue extends TravelBuddiesState {
  accessToken: string | null;
  refreshGroups: () => Promise<void>;
  setCurrentGroup: (group: GroupDetailResponse | null) => void;
  refreshGroup: (groupId: string) => Promise<void>;
  refreshMembers: (groupId?: string) => Promise<void>;
  refreshPolls: (groupId?: string) => Promise<void>;
  refreshMessages: (groupId?: string) => Promise<void>;
  refreshTasks: (groupId?: string) => Promise<void>;
  refreshPacking: (groupId?: string) => Promise<void>;
}

const TravelBuddiesContext = createContext<TravelBuddiesContextValue | null>(null);

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem("wanderpall.account.tokens");
    if (!raw) return null;
    const tokens = JSON.parse(raw);
    return tokens.accessToken || null;
  } catch {
    return null;
  }
}

export function TravelBuddiesProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());
  const [state, setState] = useState<TravelBuddiesState>({
    groups: [],
    currentGroup: null,
    members: null,
    polls: null,
    messages: [],
    tasks: null,
    packingItems: null,
    packingProgress: null,
    loading: false,
    error: null,
    isAuthenticated: Boolean(accessToken),
  });

  useEffect(() => {
    const syncAccessToken = () => {
      setAccessToken(getAccessToken());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "wanderpall.account.tokens") {
        syncAccessToken();
      }
    };
    window.addEventListener("storage", handleStorage);
    syncAccessToken();
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    setState((s) =>
      s.isAuthenticated === Boolean(accessToken)
        ? s
        : { ...s, isAuthenticated: Boolean(accessToken) },
    );
  }, [accessToken]);

  const refreshGroups = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setState((s) => ({ ...s, loading: false, error: "Not authenticated" }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await listGroups(token);
      setState((s) => ({ ...s, groups: data.items, loading: false }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load groups",
      }));
    }
  }, []);

  const setCurrentGroup = useCallback((group: GroupDetailResponse | null) => {
    setState((s) => ({ ...s, currentGroup: group }));
  }, []);

  const refreshGroup = useCallback(async (groupId: string) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await getGroup(token, groupId);
      setState((s) => ({ ...s, currentGroup: data }));
    } catch {
      // silently fail
    }
  }, []);

  const refreshMembers = useCallback(async (groupId?: string) => {
    const token = getAccessToken();
    const gid = groupId || state.currentGroup?.id;
    if (!token || !gid) return;
    try {
      const data = await listGroupMembers(token, gid);
      setState((s) => ({ ...s, members: data }));
    } catch {
      // silently fail
    }
  }, [state.currentGroup]);

  const refreshPolls = useCallback(async (groupId?: string) => {
    const token = getAccessToken();
    const gid = groupId || state.currentGroup?.id;
    if (!token || !gid) return;
    try {
      const data = await listPolls(token, gid);
      setState((s) => ({ ...s, polls: data }));
    } catch {
      // silently fail
    }
  }, [state.currentGroup]);

  const refreshMessages = useCallback(async (groupId?: string) => {
    const token = getAccessToken();
    const gid = groupId || state.currentGroup?.id;
    if (!token || !gid) return;
    try {
      const data = await listMessages(token, gid);
      setState((s) => ({ ...s, messages: data.items }));
    } catch {
      // silently fail
    }
  }, [state.currentGroup]);

  const refreshTasks = useCallback(async (groupId?: string) => {
    const token = getAccessToken();
    const gid = groupId || state.currentGroup?.id;
    if (!token || !gid) return;
    try {
      const data = await listTasks(token, gid);
      setState((s) => ({ ...s, tasks: data }));
    } catch {
      // silently fail
    }
  }, [state.currentGroup]);

  const refreshPacking = useCallback(async (groupId?: string) => {
    const token = getAccessToken();
    const gid = groupId || state.currentGroup?.id;
    if (!token || !gid) return;
    try {
      const [items, progress] = await Promise.all([
        listPackingItems(token, gid),
        getPackingProgress(token, gid),
      ]);
      setState((s) => ({ ...s, packingItems: items, packingProgress: progress }));
    } catch {
      // silently fail
    }
  }, [state.currentGroup]);

  const value = useMemo<TravelBuddiesContextValue>(
    () => ({
      ...state,
      accessToken: accessToken,
      refreshGroups,
      setCurrentGroup,
      refreshGroup,
      refreshMembers,
      refreshPolls,
      refreshMessages,
      refreshTasks,
      refreshPacking,
    }),
    [state, accessToken, refreshGroups, setCurrentGroup, refreshGroup, refreshMembers, refreshPolls, refreshMessages, refreshTasks, refreshPacking]
  );

  return (
    <TravelBuddiesContext.Provider value={value}>
      {children}
    </TravelBuddiesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTravelBuddies(): TravelBuddiesContextValue {
  const ctx = useContext(TravelBuddiesContext);
  if (!ctx) {
    throw new Error("useTravelBuddies must be used within TravelBuddiesProvider");
  }
  return ctx;
}