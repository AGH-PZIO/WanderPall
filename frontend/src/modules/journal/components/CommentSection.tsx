import { useState, useEffect } from "react";
import type { Comment } from "../api/journal-api";
import { listComments, createComment, deleteComment } from "../api/journal-api";
import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";

interface CommentSectionProps {
  journalId: string;
  commentCount: number;
  accessToken: string;
  currentUserId: string;
}

export function CommentSection({ journalId, commentCount, accessToken, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  async function loadComments() {
    setLoading(true);
    setError(null);
    try {
      const result = await listComments(accessToken, journalId, 200, 0);
      setComments(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isExpanded && comments.length === 0) {
      void loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  async function handleCreateComment(body: string, parentCommentId?: string) {
    await createComment(accessToken, journalId, body, parentCommentId);
    await loadComments();
  }

  async function handleDeleteComment(commentId: string) {
    await deleteComment(accessToken, journalId, commentId);
    await loadComments();
  }

  // Build comment tree
  function buildCommentTree(comments: Comment[]): { topLevel: Comment[]; childrenMap: Map<string, Comment[]> } {
    const topLevel: Comment[] = [];
    const childrenMap = new Map<string, Comment[]>();

    for (const comment of comments) {
      if (comment.parent_comment_id === null) {
        topLevel.push(comment);
      } else {
        const siblings = childrenMap.get(comment.parent_comment_id) || [];
        siblings.push(comment);
        childrenMap.set(comment.parent_comment_id, siblings);
      }
    }

    return { topLevel, childrenMap };
  }

  const { topLevel, childrenMap } = buildCommentTree(comments);

  return (
    <div className="jr-comment-section">
      <div className="jr-comment-header">
        <button
          type="button"
          className="jr-comment-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          💬 {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
          <span className="jr-comment-toggle-icon">{isExpanded ? "▼" : "▶"}</span>
        </button>
      </div>

      {isExpanded && (
        <div className="jr-comment-content">
          {loading && <p className="jr-muted">Loading comments...</p>}
          
          {error && (
            <div className="jr-error" style={{ color: "#d32f2f", padding: "8px 0" }}>
              {error}
              <button
                type="button"
                className="jr-btn-secondary jr-btn"
                style={{ marginLeft: "8px" }}
                onClick={() => void loadComments()}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="jr-comment-list">
                {topLevel.length === 0 ? (
                  <p className="jr-muted">No comments yet. Be the first to comment!</p>
                ) : (
                  topLevel.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      journalId={journalId}
                      depth={0}
                      currentUserId={currentUserId}
                      onReply={handleCreateComment}
                      onDelete={handleDeleteComment}
                      replies={childrenMap.get(comment.id) || []}
                      childrenMap={childrenMap}
                    />
                  ))
                )}
              </div>

              <div className="jr-comment-add">
                <CommentForm
                  journalId={journalId}
                  onSuccess={() => void loadComments()}
                  onSubmit={handleCreateComment}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

