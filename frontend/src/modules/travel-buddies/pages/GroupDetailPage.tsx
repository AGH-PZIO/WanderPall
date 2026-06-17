import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTravelBuddies } from "../hooks/useTravelBuddies";
import { useAuth } from "../../account/hooks/useAuth";
import {
  inviteMemberByEmail,
  createPoll,
  closePoll,
  createTask,
  votePoll,
  markTaskDone,
  markTaskPending,
  deleteTask,
  getPoll,
  sendMessage,
  addReaction,
  removeReaction,
  listMessages,
  deleteMessage,
  transferOwnership,
  uploadAttachment,
  leaveGroup,
  createPackingItem,
  markItemPacked,
  markItemUnpacked,
  deletePackingItem,
  listPackingItems,
  getPackingProgress,
} from "../api/travel-buddies-api";
import type {
  GroupMemberResponse,
  PollDetailResponse,
  MessageDetailWithCountsResponse,
  AttachmentResponse,
  PackingItemResponse,
  PackingProgressResponse,
} from "../api/travel-buddies-api";

// ─── Constants ───────────────────────────────────────────────────────────────

const EMOJI_REACTIONS = ["👍", "❤️", "😄", "🔥", "😮"];

type Tab = "members" | "polls" | "tasks" | "notes" | "packing";

const ROLE_LABELS: Record<string, string> = {
  owner: "Właściciel",
  admin: "Admin",
  member: "Członek",
};

// ─── Module-level helpers ─────────────────────────────────────────────────────

function getDisplayName(member: GroupMemberResponse): string {
  return member.first_name && member.last_name
    ? `${member.first_name} ${member.last_name}`
    : member.user_id;
}

function getInitials(member: GroupMemberResponse): string {
  if (member.first_name && member.last_name) {
    return `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
  }
  return member.user_id.slice(0, 2).toUpperCase();
}

function parseReactions(raw: Record<string, number>): [string, number][] {
  return Object.entries(raw)
    .filter(([, count]) => count > 0)
    .map(([emoji, count]) => [decodeURIComponent(emoji), count]);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const {
    currentGroup,
    members,
    polls,
    tasks,
    refreshGroup,
    refreshMembers,
    refreshPolls,
    refreshTasks,
    accessToken,
  } = useTravelBuddies();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Members state
  const [inviteEmail, setInviteEmail] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Polls state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Tasks state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

  // Notes state
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<MessageDetailWithCountsResponse[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentResponse[]>([]);

  // Packing state
  const [packingItems, setPackingItems] = useState<PackingItemResponse[]>([]);
  const [packingProgress, setPackingProgress] = useState<PackingProgressResponse | null>(null);
  const [loadingPacking, setLoadingPacking] = useState(false);
  const [packingName, setPackingName] = useState("");
  const [packingCategory, setPackingCategory] = useState("");
  const [packingQty, setPackingQty] = useState(1);

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!groupId) return;
    refreshGroup(groupId);
    refreshMembers(groupId);
    refreshPolls(groupId);
    refreshTasks(groupId);
  }, [groupId, refreshGroup, refreshMembers, refreshPolls, refreshTasks]);

  useEffect(() => {
    if (activeTab !== "notes" || !groupId || !accessToken) return;
    setLoadingNotes(true);
    listMessages(accessToken, groupId)
      .then((data) => setNotes(data.items))
      .catch(() => setNotes([]))
      .finally(() => setLoadingNotes(false));
  }, [activeTab, groupId, accessToken]);

  useEffect(() => {
    if (activeTab !== "packing" || !groupId || !accessToken) return;
    setLoadingPacking(true);
    Promise.all([
      listPackingItems(accessToken, groupId),
      getPackingProgress(accessToken, groupId),
    ])
      .then(([items, progress]) => {
        setPackingItems(items.items);
        setPackingProgress(progress);
      })
      .catch(() => {})
      .finally(() => setLoadingPacking(false));
  }, [activeTab, groupId, accessToken]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function showMsg(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3000);
  }

  async function reloadPacking() {
    if (!groupId || !accessToken) return;
    const [items, progress] = await Promise.all([
      listPackingItems(accessToken, groupId),
      getPackingProgress(accessToken, groupId),
    ]);
    setPackingItems(items.items);
    setPackingProgress(progress);
  }

  async function reloadNotes() {
    if (!groupId || !accessToken) return;
    const data = await listMessages(accessToken, groupId);
    setNotes(data.items);
  }

  // ─── Members handlers ─────────────────────────────────────────────────────

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !groupId || !accessToken) return;
    setSaving(true);
    try {
      await inviteMemberByEmail(accessToken, groupId, { email: inviteEmail.trim() });
      setInviteEmail("");
      refreshMembers(groupId);
      showMsg(true, "Zaproszenie wysłane!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransferOwnership(newOwnerId: string) {
    if (!groupId || !accessToken) return;
    try {
      await transferOwnership(accessToken, groupId, { new_owner_id: newOwnerId });
      refreshMembers(groupId);
      refreshGroup(groupId);
      setEditingRoleId(null);
      showMsg(true, "Własność przekazana!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleLeaveGroup() {
    if (!groupId || !accessToken) return;
    if (!confirm("Na pewno chcesz opuścić tę grupę?")) return;
    try {
      await leaveGroup(accessToken, groupId);
      navigate("/groups");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd opuszczania grupy");
    }
  }

  // ─── Polls handlers ──────────────────────────────────────────────────────

  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    if (!pollQuestion.trim() || !groupId || !accessToken) return;
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) return;
    setSaving(true);
    try {
      await createPoll(accessToken, groupId, { question: pollQuestion.trim(), options });
      setPollQuestion("");
      setPollOptions(["", ""]);
      refreshPolls(groupId);
      showMsg(true, "Ankieta utworzona!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  async function handleVotePoll(pollId: string, optionId: string) {
    if (!groupId || !accessToken) return;
    try {
      await votePoll(accessToken, groupId, pollId, { option_id: optionId });
      refreshPolls(groupId);
      showMsg(true, "Głos oddany!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleClosePoll(pollId: string) {
    if (!groupId || !accessToken) return;
    try {
      await closePoll(accessToken, groupId, pollId);
      refreshPolls(groupId);
      showMsg(true, "Ankieta zamknięta.");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  // ─── Tasks handlers ───────────────────────────────────────────────────────

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !groupId || !accessToken) return;
    setSaving(true);
    try {
      await createTask(accessToken, groupId, {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
      });
      setTaskTitle("");
      setTaskDesc("");
      refreshTasks(groupId);
      showMsg(true, "Zadanie utworzone!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTask(taskId: string, currentStatus: string) {
    if (!groupId || !accessToken) return;
    try {
      if (currentStatus === "done") {
        await markTaskPending(accessToken, groupId, taskId);
      } else {
        await markTaskDone(accessToken, groupId, taskId);
      }
      refreshTasks(groupId);
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!groupId || !accessToken) return;
    try {
      await deleteTask(accessToken, groupId, taskId);
      refreshTasks(groupId);
      showMsg(true, "Zadanie usunięte!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  // ─── Notes handlers ───────────────────────────────────────────────────────

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    const hasContent = noteText.trim() || pendingAttachments.length > 0;
    if (!hasContent || !groupId || !accessToken) return;
    setSaving(true);
    try {
      const content = noteText.trim() || "📎";
      await sendMessage(accessToken, groupId, {
        content,
        attachment_ids: pendingAttachments.map((a) => a.id),
      });
      setNoteText("");
      setPendingAttachments([]);
      await reloadNotes();
      showMsg(true, "Notatka dodana!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !groupId || !accessToken) return;
    try {
      const att = await uploadAttachment(accessToken, groupId, file);
      setPendingAttachments((prev) => [...prev, att]);
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd uploadu");
    }
    e.target.value = "";
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleDeleteNote(noteId: string) {
    if (!groupId || !accessToken) return;
    try {
      await deleteMessage(accessToken, groupId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showMsg(true, "Notatka usunięta!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleAddReaction(noteId: string, emoji: string) {
    if (!groupId || !accessToken) return;
    try {
      await addReaction(accessToken, groupId, noteId, emoji);
      await reloadNotes();
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleRemoveReaction(noteId: string, emoji: string) {
    if (!groupId || !accessToken) return;
    try {
      await removeReaction(accessToken, groupId, noteId, emoji);
      await reloadNotes();
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  // ─── Packing handlers ─────────────────────────────────────────────────────

  async function handleAddPackingItem(e: React.FormEvent) {
    e.preventDefault();
    if (!packingName.trim() || !groupId || !accessToken) return;
    setSaving(true);
    try {
      await createPackingItem(accessToken, groupId, {
        name: packingName.trim(),
        category: packingCategory.trim() || undefined,
        quantity: packingQty,
      });
      setPackingName("");
      setPackingCategory("");
      setPackingQty(1);
      await reloadPacking();
      showMsg(true, "Pozycja dodana!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePacked(itemId: string, isPacked: boolean) {
    if (!groupId || !accessToken) return;
    try {
      if (isPacked) {
        await markItemUnpacked(accessToken, groupId, itemId);
      } else {
        await markItemPacked(accessToken, groupId, itemId);
      }
      await reloadPacking();
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleDeletePackingItem(itemId: string) {
    if (!groupId || !accessToken) return;
    try {
      await deletePackingItem(accessToken, groupId, itemId);
      await reloadPacking();
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!currentGroup) {
    return <div className="tb-loading">Ładowanie grupy...</div>;
  }

  const isAdmin = currentGroup.is_admin;
  const isOwner = currentGroup.is_owner;
  const currentMember = members?.items.find((m) => m.user_id === user?.id);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "members", label: "Członkowie", count: members?.total },
    { id: "polls",   label: "Ankiety",    count: polls?.total },
    { id: "tasks",   label: "Zadania",    count: tasks?.total },
    { id: "notes",   label: "Notatki" },
    { id: "packing", label: "Pakowanie" },
  ];

  return (
    <div className="tb-group-detail">
      <div className="tb-group-header">
        <h2>{currentGroup.name}</h2>
        {currentGroup.description && (
          <p className="tb-group-description">{currentGroup.description}</p>
        )}
      </div>

      {msg && (
        <div className={`tb-msg ${msg.ok ? "tb-msg-ok" : "tb-msg-err"}`}>
          {msg.text}
        </div>
      )}

      <div className="tb-tabs-nav">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            className={activeTab === id ? "active" : ""}
            onClick={() => setActiveTab(id)}
          >
            {label}
            {count !== undefined && ` (${count})`}
          </button>
        ))}
      </div>

      <div className="tb-tab-content">
        {activeTab === "members" && (
          <MembersTab
            members={members?.items ?? []}
            isAdmin={isAdmin}
            isOwner={isOwner}
            currentMember={currentMember}
            editingRoleId={editingRoleId}
            inviteEmail={inviteEmail}
            saving={saving}
            onInviteEmailChange={setInviteEmail}
            onInviteSubmit={handleInvite}
            onEditRole={setEditingRoleId}
            onTransferOwnership={handleTransferOwnership}
            onLeaveGroup={handleLeaveGroup}
          />
        )}

        {activeTab === "polls" && (
          <PollsTab
            polls={polls?.items ?? []}
            groupId={groupId!}
            pollQuestion={pollQuestion}
            pollOptions={pollOptions}
            saving={saving}
            isAdmin={isAdmin}
            onQuestionChange={setPollQuestion}
            onOptionChange={(i, value) => {
              const copy = [...pollOptions];
              copy[i] = value;
              setPollOptions(copy);
            }}
            onAddOption={() => setPollOptions([...pollOptions, ""])}
            onSubmitPoll={handleCreatePoll}
            onVote={handleVotePoll}
            onClose={handleClosePoll}
          />
        )}

        {activeTab === "tasks" && (
          <TasksTab
            tasks={tasks?.items ?? []}
            taskTitle={taskTitle}
            taskDesc={taskDesc}
            saving={saving}
            onTitleChange={setTaskTitle}
            onDescChange={setTaskDesc}
            onSubmitTask={handleCreateTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === "notes" && (
          <NotesTab
            notes={notes}
            loadingNotes={loadingNotes}
            noteText={noteText}
            pendingAttachments={pendingAttachments}
            saving={saving}
            currentUserId={user?.id}
            onNoteTextChange={setNoteText}
            onFileSelect={handleFileSelect}
            onRemoveAttachment={removePendingAttachment}
            onSubmitNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onAddReaction={handleAddReaction}
            onRemoveReaction={handleRemoveReaction}
          />
        )}

        {activeTab === "packing" && (
          <PackingTab
            items={packingItems}
            progress={packingProgress}
            loading={loadingPacking}
            saving={saving}
            packingName={packingName}
            packingCategory={packingCategory}
            packingQty={packingQty}
            onNameChange={setPackingName}
            onCategoryChange={setPackingCategory}
            onQtyChange={setPackingQty}
            onSubmit={handleAddPackingItem}
            onTogglePacked={handleTogglePacked}
            onDelete={handleDeletePackingItem}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tab components ───────────────────────────────────────────────────────────

function MembersTab({
  members,
  isAdmin,
  isOwner,
  currentMember,
  editingRoleId,
  inviteEmail,
  saving,
  onInviteEmailChange,
  onInviteSubmit,
  onEditRole,
  onTransferOwnership,
  onLeaveGroup,
}: {
  members: GroupMemberResponse[];
  isAdmin: boolean;
  isOwner: boolean;
  currentMember: GroupMemberResponse | undefined;
  editingRoleId: string | null;
  inviteEmail: string;
  saving: boolean;
  onInviteEmailChange: (v: string) => void;
  onInviteSubmit: (e: React.FormEvent) => void;
  onEditRole: (id: string | null) => void;
  onTransferOwnership: (id: string) => void;
  onLeaveGroup: () => void;
}) {
  return (
    <div className="tb-section">
      <h3>Członkowie grupy</h3>

      {isAdmin && (
        <form className="tb-inline-form" onSubmit={onInviteSubmit}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => onInviteEmailChange(e.target.value)}
            placeholder="email@przykład.pl"
            required
          />
          <button type="submit" disabled={saving}>
            {saving ? "..." : "Zaproś"}
          </button>
        </form>
      )}

      <ul className="tb-member-list-full">
        {members.map((m) => {
          const canTransfer = isOwner && m.role !== "owner";
          return (
            <li key={m.id} className="tb-member-row">
              <div className="tb-avatar">{getInitials(m)}</div>
              <div className="tb-member-info">
                <span className="tb-member-name">{getDisplayName(m)}</span>
                <span className={`tb-member-role role-${m.role}`}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
              </div>
              {canTransfer && (
                <div className="tb-member-actions">
                  {editingRoleId === m.user_id ? (
                    <div className="tb-role-form">
                      <span className="tb-transfer-label">Przekazać własność?</span>
                      <button
                        type="button"
                        className="tb-btn-confirm"
                        onClick={() => onTransferOwnership(m.user_id)}
                      >
                        Tak
                      </button>
                      <button
                        type="button"
                        className="tb-btn-cancel"
                        onClick={() => onEditRole(null)}
                      >
                        Nie
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="tb-btn-edit"
                      onClick={() => onEditRole(m.user_id)}
                    >
                      Przekaż własność
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!isOwner && currentMember && (
        <button type="button" className="tb-leave-btn" onClick={onLeaveGroup}>
          Opuść grupę
        </button>
      )}
    </div>
  );
}

function PollsTab({
  polls,
  groupId,
  pollQuestion,
  pollOptions,
  saving,
  isAdmin,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onSubmitPoll,
  onVote,
  onClose,
}: {
  polls: { id: string; question: string; status: string; option_count: number; vote_count: number; created_by: string }[];
  groupId: string;
  pollQuestion: string;
  pollOptions: string[];
  saving: boolean;
  isAdmin: boolean;
  onQuestionChange: (v: string) => void;
  onOptionChange: (i: number, v: string) => void;
  onAddOption: () => void;
  onSubmitPoll: (e: React.FormEvent) => void;
  onVote: (pollId: string, optionId: string) => void;
  onClose: (pollId: string) => void;
}) {
  return (
    <div className="tb-section">
      <h3>Utwórz ankietę</h3>
      <form className="tb-form" onSubmit={onSubmitPoll}>
        <input
          type="text"
          value={pollQuestion}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder="Pytanie do ankiety..."
          required
        />
        {pollOptions.map((opt, i) => (
          <input
            key={i}
            type="text"
            value={opt}
            onChange={(e) => onOptionChange(i, e.target.value)}
            placeholder={`Opcja ${i + 1}`}
            required={i < 2}
          />
        ))}
        <div className="tb-form-row">
          <button type="button" className="tb-btn-small" onClick={onAddOption}>
            + Opcja
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "..." : "Utwórz"}
          </button>
        </div>
      </form>

      <h3>Istniejące ankiety</h3>
      {polls.length === 0 ? (
        <p className="tb-empty-text">Brak ankiet</p>
      ) : (
        <div className="tb-poll-list">
          {polls.map((p) => (
            <PollCard
              key={p.id}
              poll={p}
              groupId={groupId}
              onVote={onVote}
              onClose={isAdmin ? onClose : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TasksTab({
  tasks,
  taskTitle,
  taskDesc,
  saving,
  onTitleChange,
  onDescChange,
  onSubmitTask,
  onToggleTask,
  onDeleteTask,
}: {
  tasks: { id: string; title: string; description?: string | null; status: string }[];
  taskTitle: string;
  taskDesc: string;
  saving: boolean;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onSubmitTask: (e: React.FormEvent) => void;
  onToggleTask: (id: string, status: string) => void;
  onDeleteTask: (id: string) => void;
}) {
  return (
    <div className="tb-section">
      <h3>Utwórz zadanie</h3>
      <form className="tb-form" onSubmit={onSubmitTask}>
        <input
          type="text"
          value={taskTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Tytuł zadania..."
          required
        />
        <textarea
          value={taskDesc}
          onChange={(e) => onDescChange(e.target.value)}
          placeholder="Opis (opcjonalnie)..."
        />
        <button type="submit" disabled={saving}>
          {saving ? "..." : "Utwórz zadanie"}
        </button>
      </form>

      <h3>Lista zadań</h3>
      {tasks.length === 0 ? (
        <p className="tb-empty-text">Brak zadań</p>
      ) : (
        <ul className="tb-task-list-full">
          {tasks.map((t) => {
            const isDone = t.status === "done";
            return (
              <li key={t.id} className="tb-task-row">
                <button
                  type="button"
                  className={`tb-task-check ${isDone ? "checked" : ""}`}
                  onClick={() => onToggleTask(t.id, t.status)}
                  title={isDone ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}
                >
                  {isDone ? "✓" : ""}
                </button>
                <div className="tb-task-info">
                  <span className={isDone ? "done-text" : ""}>{t.title}</span>
                  {t.description && <small>{t.description}</small>}
                </div>
                <button
                  type="button"
                  className="tb-task-del"
                  onClick={() => onDeleteTask(t.id)}
                  title="Usuń zadanie"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NotesTab({
  notes,
  loadingNotes,
  noteText,
  pendingAttachments,
  saving,
  currentUserId,
  onNoteTextChange,
  onFileSelect,
  onRemoveAttachment,
  onSubmitNote,
  onDeleteNote,
  onAddReaction,
  onRemoveReaction,
}: {
  notes: MessageDetailWithCountsResponse[];
  loadingNotes: boolean;
  noteText: string;
  pendingAttachments: AttachmentResponse[];
  saving: boolean;
  currentUserId: string | undefined;
  onNoteTextChange: (v: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  onSubmitNote: (e: React.FormEvent) => void;
  onDeleteNote: (id: string) => void;
  onAddReaction: (noteId: string, emoji: string) => void;
  onRemoveReaction: (noteId: string, emoji: string) => void;
}) {
  return (
    <div className="tb-section">
      <h3>Nowa notatka</h3>
      <form className="tb-form" onSubmit={onSubmitNote}>
        <textarea
          value={noteText}
          onChange={(e) => onNoteTextChange(e.target.value)}
          placeholder="Treść notatki..."
        />
        <div className="tb-note-attachments">
          {pendingAttachments.map((att) => (
            <div key={att.id} className="tb-pending-att">
              <span className="tb-att-name">{att.filename}</span>
              <button type="button" onClick={() => onRemoveAttachment(att.id)}>✕</button>
            </div>
          ))}
          <label className="tb-att-upload-btn">
            📎 Załącz
            <input type="file" hidden onChange={onFileSelect} />
          </label>
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "..." : "Wyślij"}
        </button>
      </form>

      <h3>Wszystkie notatki ({notes.length})</h3>
      {loadingNotes ? (
        <p className="tb-empty-text">Ładowanie...</p>
      ) : notes.length === 0 ? (
        <p className="tb-empty-text">Brak notatek – dodaj pierwszą!</p>
      ) : (
        <div className="tb-notes-list">
          {notes.map((n) => {
            const reactions = parseReactions(n.reactions ?? {});
            const authorName =
              n.first_name && n.last_name
                ? `${n.first_name} ${n.last_name}`
                : n.user_id;
            return (
              <div key={n.id} className="tb-note-item">
                <div className="tb-note-author">{authorName}</div>
                <div className="tb-note-content">{n.content}</div>

                {n.attachments?.length ? (
                  <div className="tb-note-att-list">
                    {n.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="tb-note-att-link"
                      >
                        📎 {att.filename}
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="tb-note-reactions">
                  {reactions.map(([emoji, count]) => (
                    <span
                      key={emoji}
                      className="tb-note-reaction"
                      onClick={() => onRemoveReaction(n.id, emoji)}
                      title="Kliknij, by usunąć reakcję"
                    >
                      {emoji} {count}
                    </span>
                  ))}
                  <div className="tb-emoji-picker">
                    {EMOJI_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="tb-emoji-picker-btn"
                        onClick={() => onAddReaction(n.id, emoji)}
                        title={`Dodaj ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tb-note-footer">
                  <div className="tb-note-date">
                    {n.created_at ? new Date(n.created_at).toLocaleString("pl-PL") : ""}
                  </div>
                  {n.user_id === currentUserId && (
                    <button
                      type="button"
                      className="tb-note-del"
                      onClick={() => onDeleteNote(n.id)}
                      title="Usuń notatkę"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PackingTab({
  items,
  progress,
  loading,
  saving,
  packingName,
  packingCategory,
  packingQty,
  onNameChange,
  onCategoryChange,
  onQtyChange,
  onSubmit,
  onTogglePacked,
  onDelete,
}: {
  items: PackingItemResponse[];
  progress: PackingProgressResponse | null;
  loading: boolean;
  saving: boolean;
  packingName: string;
  packingCategory: string;
  packingQty: number;
  onNameChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onQtyChange: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTogglePacked: (id: string, isPacked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="tb-section">
      {progress && progress.total > 0 && (
        <div className="tb-packing-progress-wrap">
          <div className="tb-packing-progress-bar">
            <div
              className="tb-packing-progress-fill"
              style={{ width: `${progress.progress_percent}%` }}
            />
          </div>
          <span className="tb-packing-progress-text">
            {progress.packed} / {progress.total} spakowane ({progress.progress_percent}%)
          </span>
        </div>
      )}

      <h3>Dodaj do listy</h3>
      <form className="tb-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={packingName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nazwa przedmiotu..."
          required
        />
        <div className="tb-form-row">
          <input
            type="text"
            value={packingCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            placeholder="Kategoria (opcjonalnie)"
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={packingQty}
            onChange={(e) => onQtyChange(Math.max(1, Number(e.target.value)))}
            min={1}
            max={99}
            style={{ width: 70 }}
            title="Ilość"
          />
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "..." : "Dodaj"}
        </button>
      </form>

      <h3>Lista pakowania ({items.length})</h3>
      {loading ? (
        <p className="tb-empty-text">Ładowanie...</p>
      ) : items.length === 0 ? (
        <p className="tb-empty-text">Lista pusta – dodaj pierwszą pozycję!</p>
      ) : (
        <ul className="tb-packing-list">
          {items.map((item) => {
            const isDone = item.is_packed;
            return (
              <li
                key={item.id}
                className={`tb-packing-row ${isDone ? "tb-packing-packed" : ""}`}
              >
                <button
                  type="button"
                  className={`tb-task-check ${isDone ? "checked" : ""}`}
                  onClick={() => onTogglePacked(item.id, isDone)}
                  title={isDone ? "Oznacz jako niespakowane" : "Oznacz jako spakowane"}
                >
                  {isDone ? "✓" : ""}
                </button>
                <div className="tb-task-info">
                  <span className={isDone ? "done-text" : ""}>
                    {item.name}
                    {item.quantity > 1 && (
                      <span className="tb-item-qty">×{item.quantity}</span>
                    )}
                  </span>
                  {item.category && (
                    <small>
                      <span className="tb-packing-category">{item.category}</span>
                    </small>
                  )}
                </div>
                <button
                  type="button"
                  className="tb-task-del"
                  onClick={() => onDelete(item.id)}
                  title="Usuń"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── PollCard ─────────────────────────────────────────────────────────────────

type PollSummary = {
  id: string;
  question: string;
  status: string;
  option_count: number;
  vote_count: number;
  created_by: string;
};

function PollCard({
  poll,
  groupId,
  onVote,
  onClose,
}: {
  poll: PollSummary;
  groupId: string;
  onVote: (pollId: string, optionId: string) => void;
  onClose?: (pollId: string) => void;
}) {
  const { accessToken } = useTravelBuddies();
  const [detail, setDetail] = useState<PollDetailResponse | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getPoll(accessToken, groupId, poll.id)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accessToken, groupId, poll.id, poll.status]);

  async function handleVote(optionId: string) {
    if (!accessToken) return;
    await onVote(poll.id, optionId);
    const d = await getPoll(accessToken, groupId, poll.id);
    setDetail(d);
  }

  if (!detail) {
    return (
      <div className="tb-poll-card">
        <div className="tb-poll-q">{poll.question}</div>
        <div className="tb-poll-meta">
          {poll.option_count} opcji · {poll.vote_count} głosów
        </div>
      </div>
    );
  }

  const totalVotes = detail.options.reduce((sum, o) => sum + o.vote_count, 0);

  return (
    <div className="tb-poll-card">
      <div className="tb-poll-q">{detail.question}</div>

      {detail.status === "open" ? (
        <>
          <div className="tb-poll-meta">
            {detail.options.length} opcji · {totalVotes} głosów
          </div>
          <div className="tb-poll-options">
            {detail.options.map((opt) => (
              <button
                key={opt.id}
                className={`tb-poll-option${opt.id === detail.user_vote_option_id ? " voted" : ""}`}
                onClick={() => handleVote(opt.id)}
              >
                <span className="tb-poll-opt-text">{opt.text}</span>
                {opt.vote_count > 0 && (
                  <span className="tb-poll-opt-count">{opt.vote_count}</span>
                )}
              </button>
            ))}
          </div>
          {onClose && (
            <button
              type="button"
              className="tb-close-poll-btn"
              onClick={() => onClose(poll.id)}
            >
              Zamknij ankietę
            </button>
          )}
        </>
      ) : (
        <>
          <div className="tb-poll-meta">
            {detail.options.length} opcji · {totalVotes} głosów
            <span className="tb-poll-closed-badge">Zamknięta</span>
          </div>
          <div className="tb-poll-results">
            {detail.options.map((opt) => {
              const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
              const isVoted = opt.id === detail.user_vote_option_id;
              return (
                <div key={opt.id} className="tb-poll-result">
                  <div className="tb-poll-result-label">
                    <span className={isVoted ? "tb-poll-voted-label" : ""}>{opt.text}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="tb-poll-result-bar">
                    <div className="tb-poll-result-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="tb-poll-result-votes">{opt.vote_count} głos(ów)</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
