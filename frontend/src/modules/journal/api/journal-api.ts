const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

function authHeaders(accessToken: string | null): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: unknown };
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

export type JournalVisibility = "private" | "friends_only" | "public";

export type EntryImage = {
  id: string;
  url: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
};

export type Entry = {
  id: string;
  journal_id: string;
  lat: number;
  lng: number;
  text: string;
  created_at: string;
  updated_at: string;
  images: EntryImage[];
};

export type Journal = {
  id: string;
  title: string;
  visibility: JournalVisibility;
  created_at: string;
  updated_at: string;
};

export async function listMyJournals(accessToken: string, limit = 50, offset = 0) {
  const res = await fetch(`${baseUrl}/journals?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { items: Journal[]; total: number };
}

export async function createJournal(accessToken: string, title: string): Promise<Journal> {
  const res = await fetch(`${baseUrl}/journals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Journal;
}

export async function updateJournal(accessToken: string, journalId: string, title: string): Promise<Journal> {
  const res = await fetch(`${baseUrl}/journals/${journalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Journal;
}

export async function updateJournalVisibility(
  accessToken: string,
  journalId: string,
  visibility: JournalVisibility
): Promise<Journal> {
  const res = await fetch(`${baseUrl}/journals/${journalId}/visibility`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify({ visibility })
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Journal;
}

export async function deleteJournal(accessToken: string, journalId: string): Promise<void> {
  const res = await fetch(`${baseUrl}/journals/${journalId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function listEntries(accessToken: string, journalId: string, limit = 200, offset = 0) {
  const res = await fetch(`${baseUrl}/journals/${journalId}/entries?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { items: Entry[]; total: number };
}

export async function createEntry(
  accessToken: string,
  journalId: string,
  input: { lat: number; lng: number; text: string }
): Promise<Entry> {
  const res = await fetch(`${baseUrl}/journals/${journalId}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Entry;
}

export async function updateEntry(
  accessToken: string,
  journalId: string,
  entryId: string,
  input: { lat?: number; lng?: number; text?: string }
): Promise<Entry> {
  const res = await fetch(`${baseUrl}/journals/${journalId}/entries/${entryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Entry;
}

export async function deleteEntry(accessToken: string, journalId: string, entryId: string): Promise<void> {
  const res = await fetch(`${baseUrl}/journals/${journalId}/entries/${entryId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function uploadEntryImages(
  accessToken: string,
  journalId: string,
  entryId: string,
  files: File[]
): Promise<EntryImage[]> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await fetch(`${baseUrl}/journals/${journalId}/entries/${entryId}/images`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: form
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as EntryImage[];
}

export async function deleteEntryImage(
  accessToken: string,
  journalId: string,
  entryId: string,
  imageId: string
): Promise<void> {
  const res = await fetch(`${baseUrl}/journals/${journalId}/entries/${entryId}/images/${imageId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ============================================================================
// Explorer Types and API Functions
// ============================================================================

export type ReactionEmoji = "like" | "heart" | "haha" | "sad";

export type PublicAuthor = {
  id: string;
  first_name: string;
  last_name: string;
};

export type ExplorerEntryImage = {
  id: string;
  url: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
};

export type ExplorerEntry = {
  id: string;
  lat: number;
  lng: number;
  text: string;
  created_at: string;
  updated_at: string;
  images: ExplorerEntryImage[];
};

export type ExplorerJournalPreview = {
  id: string;
  title: string;
  visibility: JournalVisibility;
  author: PublicAuthor;
  created_at: string;
  updated_at: string;
  reaction_count: number;
  reactions: Record<string, number>;  // emoji -> count
  comment_count: number;
  my_reaction: ReactionEmoji | null;
  first_entry: ExplorerEntry | null;
};

export type ExplorerJournalDetail = {
  id: string;
  title: string;
  visibility: JournalVisibility;
  author: PublicAuthor;
  created_at: string;
  updated_at: string;
  reaction_count: number;
  reactions: Record<string, number>;  // emoji -> count
  comment_count: number;
  my_reaction: ReactionEmoji | null;
  entries: ExplorerEntry[];
};

export type Comment = {
  id: string;
  journal_id: string;
  user: PublicAuthor;
  parent_comment_id: string | null;
  body: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

// Explorer Feed
export async function listExplorerFeed(
  accessToken: string,
  limit = 20,
  offset = 0
): Promise<{ items: ExplorerJournalPreview[]; total: number }> {
  const res = await fetch(`${baseUrl}/journals/explorer?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { items: ExplorerJournalPreview[]; total: number };
}

// My Public Journals (author's own public journals in explorer)
export async function listMyPublicJournals(
  accessToken: string,
  limit = 20,
  offset = 0
): Promise<{ items: ExplorerJournalPreview[]; total: number }> {
  const res = await fetch(`${baseUrl}/journals/explorer/my-public?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { items: ExplorerJournalPreview[]; total: number };
}

// Get Journal Detail
export async function getExplorerJournal(
  accessToken: string,
  journalId: string
): Promise<ExplorerJournalDetail> {
  const res = await fetch(`${baseUrl}/journals/explorer/${journalId}`, {
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ExplorerJournalDetail;
}

// Reactions
export async function upsertReaction(
  accessToken: string,
  journalId: string,
  emoji: ReactionEmoji
): Promise<void> {
  const res = await fetch(`${baseUrl}/journals/explorer/${journalId}/reactions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify({ emoji })
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deleteReaction(
  accessToken: string,
  journalId: string
): Promise<void> {
  const res = await fetch(`${baseUrl}/journals/explorer/${journalId}/reactions`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// Comments
export async function listComments(
  accessToken: string,
  journalId: string,
  limit = 50,
  offset = 0
): Promise<{ items: Comment[]; total: number }> {
  const res = await fetch(`${baseUrl}/journals/explorer/${journalId}/comments?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { items: Comment[]; total: number };
}

export async function createComment(
  accessToken: string,
  journalId: string,
  body: string,
  parentCommentId?: string
): Promise<Comment> {
  const res = await fetch(`${baseUrl}/journals/explorer/${journalId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify({ body, parent_comment_id: parentCommentId })
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as Comment;
}

export async function deleteComment(
  accessToken: string,
  journalId: string,
  commentId: string
): Promise<void> {
  const res = await fetch(`${baseUrl}/journals/explorer/${journalId}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  if (!res.ok) throw new Error(await parseError(res));
}
