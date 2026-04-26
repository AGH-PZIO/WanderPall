import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTravelBuddies } from "../hooks/useTravelBuddies";
import { useAuth } from "../../account/hooks/useAuth";
import {
  inviteMemberByEmail, createPoll, createTask, votePoll, markTaskDone,
  markTaskPending, deleteTask, getPoll, sendMessage,
  addReaction, removeReaction, listMessages, deleteMessage,
  transferOwnership, uploadAttachment,
} from "../api/travel-buddies-api";
import type { PollDetailResponse, MessageDetailWithCountsResponse, AttachmentResponse } from "../api/travel-buddies-api";

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { currentGroup, members, polls, tasks, refreshGroup, refreshMembers, refreshPolls, refreshTasks, accessToken } = useTravelBuddies();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"members" | "polls" | "tasks" | "notes">("members");
  const [inviteEmail, setInviteEmail] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Notes state
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<MessageDetailWithCountsResponse[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) {
      refreshGroup(groupId);
      refreshMembers(groupId);
      refreshPolls(groupId);
      refreshTasks(groupId);
    }
  }, [groupId, refreshGroup, refreshMembers, refreshPolls, refreshTasks]);

  useEffect(() => {
    if (activeTab === "notes" && groupId) {
      setLoadingNotes(true);
      if (!accessToken) {
        setLoadingNotes(false);
        return;
      }
      listMessages(accessToken, groupId)
        .then((data) => {
          setNotes(data.items);
        })
        .catch((err) => {
          console.error("Error loading messages:", err);
          setNotes([]);
        })
        .finally(() => setLoadingNotes(false));
    }
  }, [activeTab, groupId, accessToken]);

  function showMsg(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3000);
  }

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

  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    if (!pollQuestion.trim() || !groupId || !accessToken) return;
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return;
    setSaving(true);
    try {
      await createPoll(accessToken, groupId, { question: pollQuestion.trim(), options: opts });
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

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !groupId || !accessToken) return;
    setSaving(true);
    try {
      await createTask(accessToken, groupId, { title: taskTitle.trim(), description: taskDesc.trim() || undefined });
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

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if ((!noteText.trim() && pendingAttachments.length === 0) || !groupId || !accessToken) return;
    setSaving(true);
    try {
      if (pendingAttachments.length > 0) {
        await sendMessage(accessToken, groupId, { content: noteText.trim() || "📎", attachment_ids: pendingAttachments.map((a) => a.id) });
        setPendingAttachments([]);
      } else {
        await sendMessage(accessToken, groupId, { content: noteText.trim(), attachment_ids: [] });
      }
      setNoteText("");
      const data = await listMessages(accessToken, groupId);
      setNotes(data.items);
      showMsg(true, "Notatka dodana!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  const [pendingAttachments, setPendingAttachments] = useState<AttachmentResponse[]>([]);

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
      const data = await listMessages(accessToken, groupId);
      setNotes(data.items);
      showMsg(true, "Dodano reakcję!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleRemoveReaction(noteId: string, emoji: string) {
    if (!groupId || !accessToken) return;
    try {
      await removeReaction(accessToken, groupId, noteId, emoji);
      const data = await listMessages(accessToken, groupId);
      setNotes(data.items);
      showMsg(true, "Reakcja usunięta!");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleToggleReaction(noteId: string, emoji: string) {
    await handleRemoveReaction(noteId, emoji);
  }

  async function handleTransferOwnership(newOwnerId: string) {
    if (!groupId || !accessToken) return;
    try {
      await transferOwnership(accessToken, groupId, { new_owner_id: newOwnerId });
      refreshMembers(groupId);
      refreshGroup(groupId);
      setEditingRoleId(null);
      showMsg(true, "Własność przekazana! Teraz jesteś członkiem.");
    } catch (err: unknown) {
      showMsg(false, err instanceof Error ? err.message : "Błąd");
    }
  }

  if (!currentGroup) {
    return <div className="tb-loading">Ładowanie grupy...</div>;
  }

  return (
    <div className="tb-group-detail">
      <div className="tb-group-header">
        <h2>{currentGroup.name}</h2>
        {currentGroup.description && (
          <p className="tb-group-description">{currentGroup.description}</p>
        )}
      </div>

      {msg && <div className={`tb-msg ${msg.ok ? "tb-msg-ok" : "tb-msg-err"}`}>{msg.text}</div>}

      <div className="tb-tabs-nav">
        <button className={activeTab === "members" ? "active" : ""} onClick={() => setActiveTab("members")}>
          Członkowie ({members?.total ?? 0})
        </button>
        <button className={activeTab === "polls" ? "active" : ""} onClick={() => setActiveTab("polls")}>
          Ankiety ({polls?.total ?? 0})
        </button>
        <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>
          Zadania ({tasks?.total ?? 0})
        </button>
        <button className={activeTab === "notes" ? "active" : ""} onClick={() => setActiveTab("notes")}>
          Notatki
        </button>
      </div>

      <div className="tb-tab-content">
        {activeTab === "members" && (
          <div className="tb-section">
            <h3>Członkowie grupy</h3>
            {currentGroup.is_admin && (
              <form className="tb-inline-form" onSubmit={handleInvite}>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@przykład.pl"
                  required
                />
                <button type="submit" disabled={saving}>
                  {saving ? "..." : "Zaproś"}
                </button>
              </form>
            )}
            <ul className="tb-member-list-full">
{(members?.items ?? []).map((m) => {
                const roleName = m.role === "owner" ? "Właściciel" : m.role === "admin" ? "Admin" : "Członek";
                const displayName = m.first_name && m.last_name ? `${m.first_name} ${m.last_name}` : m.user_id;
                const isOwner = m.role === "owner";
                const canTransfer = currentGroup.is_owner && !isOwner;
                return (
                  <li key={m.id} className="tb-member-row">
                    <div className="tb-member-info">
                      <span className="tb-member-name">{displayName}</span>
                      <span className={`tb-member-role role-${m.role}`}>{roleName}</span>
                    </div>
                    {canTransfer && (
                      <div className="tb-member-actions">
                        {editingRoleId === m.user_id ? (
                          <div className="tb-role-form">
                            <span className="tb-transfer-label">Przekazać własność?</span>
                            <button type="button" className="tb-btn-confirm" onClick={() => handleTransferOwnership(m.user_id)}>Tak</button>
                            <button type="button" className="tb-btn-cancel" onClick={() => setEditingRoleId(null)}>Nie</button>
                          </div>
                        ) : (
                          <button type="button" className="tb-btn-edit" onClick={() => { setEditingRoleId(m.user_id); }}>Przekaż własność</button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {activeTab === "polls" && (
          <div className="tb-section">
            <h3>Utwórz ankietę</h3>
            <form className="tb-form" onSubmit={handleCreatePoll}>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Pytanie do ankiety..."
                required
              />
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const copy = [...pollOptions];
                    copy[i] = e.target.value;
                    setPollOptions(copy);
                  }}
                  placeholder={`Opcja ${i + 1}`}
                  required={i < 2}
                />
              ))}
              <div className="tb-form-row">
                <button type="button" className="tb-btn-small" onClick={() => setPollOptions([...pollOptions, ""])}>
                  + Opcja
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? "..." : "Utwórz"}
                </button>
              </div>
            </form>

            <h3>Istniejące ankiety</h3>
            {(polls?.items ?? []).length === 0 ? (
              <p className="tb-empty-text">Brak ankiet</p>
            ) : (
              <div className="tb-poll-list">
                {(polls?.items ?? []).map((p) => (
                  <PollCard key={p.id} poll={p} groupId={groupId!} onVote={handleVotePoll} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="tb-section">
            <h3>Utwórz zadanie</h3>
            <form className="tb-form" onSubmit={handleCreateTask}>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Tytuł zadania..."
                required
              />
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Opis (opcjonalnie)..."
              />
              <button type="submit" disabled={saving}>
                {saving ? "..." : "Utwórz zadanie"}
              </button>
            </form>

            <h3>Lista zadań</h3>
            {(tasks?.items ?? []).length === 0 ? (
              <p className="tb-empty-text">Brak zadań</p>
            ) : (
              <ul className="tb-task-list-full">
                {(tasks?.items ?? []).map((t) => (
                  <li key={t.id} className={`tb-task-row tb-task-${t.status}`}>
                    <button
                      type="button"
                      className={`tb-task-check ${t.status === "done" ? "checked" : ""}`}
                      onClick={() => handleToggleTask(t.id, t.status)}
                      title={t.status === "done" ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}
                    >
                      {t.status === "done" ? "✓" : "○"}
                    </button>
                    <div className="tb-task-info">
                      <span className={t.status === "done" ? "done-text" : ""}>{t.title}</span>
                      {t.description && <small>{t.description}</small>}
                    </div>
                    <button type="button" className="tb-task-del" onClick={() => handleDeleteTask(t.id)}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="tb-section">
            <h3>Nowa notatka</h3>
            <form className="tb-form" onSubmit={handleAddNote}>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Treść notatki..."
              />
              <div className="tb-note-attachments">
                {pendingAttachments.map((att) => (
                  <div key={att.id} className="tb-pending-att">
                    <span className="tb-att-name">{att.filename}</span>
                    <button type="button" onClick={() => removePendingAttachment(att.id)}>✕</button>
                  </div>
                ))}
                <label className="tb-att-upload-btn">
                  📎
                  <input type="file" hidden onChange={handleFileSelect} />
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
              <p className="tb-empty-text">Brak notatek - dodaj pierwszą!</p>
            ) : (
              <div className="tb-notes-list">
                {notes.map((n) => {
                  const authorName = n.first_name && n.last_name ? `${n.first_name} ${n.last_name}` : n.user_id;
                  //const reactionEntries = Object.entries(n.reactions || {}).filter(([, count]) => count > 0).map(([emoji, count]) => [decodeURIComponent(emoji), count] as [string, number]);
                  return (
                  <div key={n.id} className="tb-note-item">
                    <div className="tb-note-author">{authorName}</div>
                    <div className="tb-note-content">{n.content}</div>
                    {(n as MessageDetailWithCountsResponse).attachments?.length ? (
                      <div className="tb-note-att-list">
                        {(n as MessageDetailWithCountsResponse).attachments.map((att) => (
                          <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="tb-note-att-link">
                            📎 {att.filename}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div className="tb-note-reactions">
                      {[...new Map(Object.entries(n.reactions || {}).filter(([, count]) => count > 0).map(([emoji, count]) => [decodeURIComponent(emoji), count])).entries()].map(([emoji, count]) => (
                        <span key={emoji} className="tb-note-reaction" onClick={() => handleToggleReaction(n.id, emoji)} title="Usuń reakcję">{emoji} {count}</span>
                      ))}
                      <button type="button" className="tb-note-react-btn" onClick={() => handleAddReaction(n.id, "👍")} title="Dodaj reakcję">👍</button>
                    </div>
                    <div className="tb-note-footer">
                      <div className="tb-note-date">{n.created_at ? new Date(n.created_at).toLocaleString("pl-PL") : ""}</div>
                      {n.user_id === user?.id && (
                      <button type="button" className="tb-note-del" onClick={() => handleDeleteNote(n.id)} title="Usuń notatkę">✕</button>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PollCard({ poll, groupId, onVote }: { poll: { id: string; question: string; status: string; option_count: number; vote_count: number; created_by: string }; groupId: string; onVote: (pollId: string, optionId: string) => void }) {
  const { accessToken } = useTravelBuddies();
  const [detail, setDetail] = useState<PollDetailResponse | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken) {
        if (!cancelled) setDetail(null);
        return;
      }
      try {
        const d = await getPoll(accessToken, groupId, poll.id);
        if (!cancelled) setDetail(d);
      } catch {
        if (!cancelled) setDetail(null);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [accessToken, groupId, poll.id]);

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

  return (
    <div className="tb-poll-card">
      <div className="tb-poll-q">{detail.question}</div>
      {detail.status === "open" ? (
        <>
          <div className="tb-poll-meta">
            {detail.options.length} opcji · {detail.options.reduce((s, o) => s + o.vote_count, 0)} głosów
          </div>
          <div className="tb-poll-options">
            {detail.options.map((opt) => (
              <button
                key={opt.id}
                className={`tb-poll-option${opt.vote_count > 0 ? " voted" : ""}`}
                onClick={() => handleVote(opt.id)}
              >
                <span className="tb-poll-opt-text">{opt.text}</span>
                <span className="tb-poll-opt-count">{opt.vote_count > 0 ? opt.vote_count : ""}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="tb-poll-meta">{detail.options.length} opcji · {detail.options.reduce((s, o) => s + o.vote_count, 0)} głosów</div>
          <div className="tb-poll-results">
            {detail.options.map((opt) => {
              const totalVotes = detail.options.reduce((s, o) => s + o.vote_count, 0);
              const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
              return (
                <div key={opt.id} className="tb-poll-result">
                  <div className="tb-poll-result-label">{opt.text} <span>({pct}%)</span></div>
                  <div className="tb-poll-result-bar"><div className="tb-poll-result-fill" style={{ width: `${pct}%` }} /></div>
                  <div className="tb-poll-result-votes">{opt.vote_count}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}