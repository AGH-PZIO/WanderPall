import type { ExplorerJournalPreview, ReactionEmoji } from "../api/journal-api";
import { ReactionBar } from "./ReactionBar";
import { CommentSection } from "./CommentSection";

interface JournalCardProps {
  journal: ExplorerJournalPreview;
  accessToken: string;
  currentUserId: string;
  onReactionChange: (journalId: string, emoji: ReactionEmoji | null) => Promise<void>;
}

export function JournalCard({ journal, accessToken, currentUserId, onReactionChange }: JournalCardProps) {
  const authorName = `${journal.author.first_name} ${journal.author.last_name}`;
  const updatedAt = new Date(journal.updated_at).toLocaleString();

  async function handleReactionChange(emoji: ReactionEmoji | null) {
    await onReactionChange(journal.id, emoji);
  }

  return (
    <div className="jr-card jr-journal-card">
      <div className="jr-journal-header">
        <div>
          <h3 style={{ margin: "0 0 4px" }}>📖 {journal.title}</h3>
          <div className="jr-muted">
            by {authorName} · Updated {updatedAt}
          </div>
        </div>
      </div>

      {journal.first_entry && (
        <div className="jr-entry-preview">
          <div className="jr-entry-text">
            {journal.first_entry.text.length > 300
              ? `${journal.first_entry.text.substring(0, 300)}...`
              : journal.first_entry.text}
          </div>
          <div className="jr-muted jr-entry-location">
            📍 {journal.first_entry.lat.toFixed(5)}, {journal.first_entry.lng.toFixed(5)}
          </div>
          {journal.first_entry.images.length > 0 && (
            <div className="jr-photos">
              {journal.first_entry.images.slice(0, 3).map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt="Entry"
                  className="jr-photo"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="jr-journal-interactions">
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
          accessToken={accessToken}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}

