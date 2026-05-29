import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../account/hooks/useAuth";
import type { ExplorerJournalDetail, ReactionEmoji } from "../api/journal-api";
import { deleteReaction, getExplorerJournal, upsertReaction } from "../api/journal-api";
import { CommentSection } from "../components/CommentSection";
import { ReactionBar } from "../components/ReactionBar";

export function PublicJournalDetailPage() {
  const { journalId } = useParams<{ journalId: string }>();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [journal, setJournal] = useState<ExplorerJournalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!accessToken || !journalId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExplorerJournal(accessToken, journalId);
      setJournal(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load journal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalId, accessToken]);

  async function handleReactionChange(emoji: ReactionEmoji | null) {
    if (!accessToken || !journalId) return;
    try {
      if (emoji === null) {
        await deleteReaction(accessToken, journalId);
      } else {
        await upsertReaction(accessToken, journalId, emoji);
      }
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to update reaction");
    }
  }

  if (!user) {
    return (
      <div className="jr-shell">
        <p className="jr-muted">Please sign in to view this journal.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="jr-shell">
        <div className="jr-card">
          <p className="jr-muted">Loading journal...</p>
        </div>
      </div>
    );
  }

  if (error || !journal) {
    return (
      <div className="jr-shell">
        <div className="jr-card" style={{ borderColor: "#ffcdd2" }}>
          <p style={{ color: "#d32f2f" }}>{error ?? "Journal not found."}</p>
          <div className="jr-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
            <button className="jr-btn-secondary jr-btn" type="button" onClick={() => navigate(-1)}>
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const authorName = `${journal.author.first_name} ${journal.author.last_name}`;

  return (
    <div className="jr-shell">
      {/* Header */}
      <div className="jr-header">
        <div>
          <h2 style={{ margin: 0 }}>📖 {journal.title}</h2>
          <p className="jr-muted" style={{ margin: "6px 0 0" }}>
            by {authorName} · Updated {new Date(journal.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="jr-actions">
          <button className="jr-btn-secondary jr-btn" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>

      {/* Reactions */}
      <div className="jr-card" style={{ marginBottom: 16 }}>
        <ReactionBar
          journalId={journal.id}
          reactionCount={journal.reaction_count}
          reactions={journal.reactions}
          myReaction={journal.my_reaction}
          onReactionChange={handleReactionChange}
        />

        <CommentSection
          journalId={journal.id}
          commentCount={journal.comment_count}
          accessToken={accessToken!}
          currentUserId={user.id}
        />
      </div>

      {/* Entries */}
      {journal.entries.length === 0 ? (
        <div className="jr-card">
          <p className="jr-muted">This journal has no entries yet.</p>
        </div>
      ) : (
        <div className="jr-list">
          {journal.entries.map((entry, index) => (
            <div className="jr-card jr-detail-entry" key={entry.id}>
              <div className="jr-detail-entry-header">
                <span className="jr-detail-entry-index">Entry {index + 1}</span>
                <span className="jr-muted jr-detail-entry-meta">
                  📍 {entry.lat.toFixed(5)}, {entry.lng.toFixed(5)} ·{" "}
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>

              <p className="jr-detail-entry-text">{entry.text}</p>

              {entry.images.length > 0 && (
                <div className="jr-detail-photos">
                  {entry.images.map((img) => (
                    <a
                      key={img.id}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="jr-detail-photo-link"
                    >
                      <img
                        className="jr-detail-photo"
                        src={img.url}
                        alt="Entry photo"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
