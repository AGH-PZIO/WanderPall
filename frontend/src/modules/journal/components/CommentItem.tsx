import { useState } from "react";
import type { Comment } from "../api/journal-api";
import { CommentForm } from "./CommentForm";

interface CommentItemProps {
  comment: Comment;
  journalId: string;
  depth: number;
  currentUserId: string;
  onReply: (body: string, parentCommentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  replies: Comment[];
  childrenMap: Map<string, Comment[]>;
}

const MAX_DEPTH = 3;

export function CommentItem({
  comment,
  journalId,
  depth,
  currentUserId,
  onReply,
  onDelete,
  replies,
  childrenMap
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnComment = comment.user.id === currentUserId;
  const canReply = depth < MAX_DEPTH;

  async function handleDelete() {
    if (!window.confirm("Delete this comment?")) return;
    
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      window.alert(error instanceof Error ? error.message : "Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleReplySubmit(body: string) {
    await onReply(body, comment.id);
    setIsReplying(false);
  }

  return (
    <div className={`jr-comment-item depth-${depth}`}>
      <div className="jr-comment-header">
        <span className="jr-comment-author">
          {comment.user.first_name} {comment.user.last_name}
        </span>
        <span className="jr-muted jr-comment-time">
          {new Date(comment.created_at).toLocaleString()}
        </span>
      </div>
      
      <div className="jr-comment-body">
        {comment.is_deleted ? (
          <span className="jr-muted jr-comment-deleted">[deleted]</span>
        ) : (
          <p>{comment.body}</p>
        )}
      </div>

      {!comment.is_deleted && (
        <div className="jr-comment-actions">
          {canReply && (
            <button
              type="button"
              className="jr-comment-action-btn"
              onClick={() => setIsReplying(!isReplying)}
            >
              Reply
            </button>
          )}
          {isOwnComment && (
            <button
              type="button"
              className="jr-comment-action-btn jr-comment-delete-btn"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      )}

      {isReplying && (
        <div className="jr-comment-reply-form">
          <CommentForm
            journalId={journalId}
            parentCommentId={comment.id}
            onSuccess={() => setIsReplying(false)}
            onCancel={() => setIsReplying(false)}
            onSubmit={handleReplySubmit}
          />
        </div>
      )}

      {replies.length > 0 && (
        <div className="jr-comment-replies">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              journalId={journalId}
              depth={depth + 1}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              replies={childrenMap.get(reply.id) || []}
              childrenMap={childrenMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

