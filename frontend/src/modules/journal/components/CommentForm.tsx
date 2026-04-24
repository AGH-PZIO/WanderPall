import { useState } from "react";

interface CommentFormProps {
  journalId: string;
  parentCommentId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  onSubmit: (body: string, parentCommentId?: string) => Promise<void>;
}

export function CommentForm({ parentCommentId, onSuccess, onCancel, onSubmit }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError("Comment cannot be empty");
      return;
    }

    if (trimmedBody.length > 5000) {
      setError("Comment is too long (max 5000 characters)");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(trimmedBody, parentCommentId);
      setBody("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="jr-comment-form">
      <div className="jr-field">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={parentCommentId ? "Write a reply..." : "Add a comment..."}
          rows={3}
          disabled={isSubmitting}
          maxLength={5000}
        />
        {body.length > 4500 && (
          <div className="jr-muted" style={{ fontSize: "0.85rem" }}>
            {5000 - body.length} characters remaining
          </div>
        )}
      </div>
      {error && (
        <div className="jr-error" style={{ color: "#d32f2f", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}
      <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
        <button type="submit" className="jr-btn" disabled={isSubmitting || !body.trim()}>
          {isSubmitting ? "Posting..." : parentCommentId ? "Reply" : "Post Comment"}
        </button>
        {onCancel && (
          <button type="button" className="jr-btn-secondary jr-btn" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}


