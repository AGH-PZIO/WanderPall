import { useState } from "react";
import type { ReactionEmoji } from "../api/journal-api";

interface ReactionBarProps {
  journalId: string;
  reactionCount: number;
  reactions: Record<string, number>;
  myReaction: ReactionEmoji | null;
  onReactionChange: (emoji: ReactionEmoji | null) => Promise<void>;
}

const REACTION_EMOJIS: { emoji: ReactionEmoji; icon: string; label: string }[] = [
  { emoji: "like", icon: "👍", label: "Like" },
  { emoji: "heart", icon: "❤️", label: "Heart" },
  { emoji: "haha", icon: "😄", label: "Haha" },
  { emoji: "sad", icon: "😢", label: "Sad" }
];

export function ReactionBar({ reactionCount, reactions, myReaction, onReactionChange }: ReactionBarProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleReactionClick(emoji: ReactionEmoji) {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      // If clicking the same reaction, remove it; otherwise, change to new reaction
      const newReaction = myReaction === emoji ? null : emoji;
      await onReactionChange(newReaction);
    } catch (error) {
      console.error("Failed to update reaction:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="jr-reaction-bar">
      <div className="jr-reaction-count">
        {reactionCount > 0 && (
          <span className="jr-muted">
            {reactionCount} {reactionCount === 1 ? "reaction" : "reactions"}
            {Object.keys(reactions).length > 0 && (
              <span style={{ marginLeft: "8px" }}>
                {REACTION_EMOJIS.map(({ emoji, icon }) => {
                  const count = reactions[emoji];
                  return count ? (
                    <span key={emoji} style={{ marginLeft: "4px" }}>
                      {icon} {count}
                    </span>
                  ) : null;
                })}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="jr-reaction-buttons">
        {REACTION_EMOJIS.map(({ emoji, icon, label }) => (
          <button
            key={emoji}
            type="button"
            className={`jr-reaction-btn ${myReaction === emoji ? "active" : ""}`}
            onClick={() => void handleReactionClick(emoji)}
            disabled={isUpdating}
            title={label}
            aria-label={label}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

