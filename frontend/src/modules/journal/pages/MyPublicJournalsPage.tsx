import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../account/hooks/useAuth";
import type { ExplorerJournalPreview, ReactionEmoji } from "../api/journal-api";
import { listMyPublicJournals, upsertReaction, deleteReaction } from "../api/journal-api";
import { JournalCard } from "../components/JournalCard";

export function MyPublicJournalsPage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [journals, setJournals] = useState<ExplorerJournalPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const observerTarget = useRef<HTMLDivElement>(null);
  const limit = 20;

  async function loadFeed(isLoadMore = false) {
    if (!accessToken) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const currentOffset = isLoadMore ? offset : 0;
      const result = await listMyPublicJournals(accessToken, limit, currentOffset);
      
      if (isLoadMore) {
        setJournals((prev) => [...prev, ...result.items]);
      } else {
        setJournals(result.items);
      }

      setOffset(currentOffset + result.items.length);
      setHasMore(result.items.length === limit && currentOffset + result.items.length < result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journals");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      void loadFeed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loading && !loadingMore && accessToken) {
        void loadFeed(true);
      }
    },
    [hasMore, loading, loadingMore, accessToken]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  async function handleReactionChange(journalId: string, emoji: ReactionEmoji | null) {
    if (!accessToken) return;

    try {
      if (emoji === null) {
        await deleteReaction(accessToken, journalId);
      } else {
        await upsertReaction(accessToken, journalId, emoji);
      }
      // Reload feed to get updated reaction counts and breakdown
      await loadFeed(false);
    } catch (err) {
      console.error("Failed to update reaction:", err);
      window.alert(err instanceof Error ? err.message : "Failed to update reaction");
    }
  }

  if (!user) {
    return (
      <div className="jr-shell">
        <div className="jr-card">
          <p className="jr-muted">Please sign in to view your public journals.</p>
          <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
            <button className="jr-btn" type="button" onClick={() => navigate("/account/login")}>
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jr-shell">
      <div className="jr-header">
        <div>
          <h2 style={{ margin: 0 }}>My Public Journals</h2>
          <p className="jr-muted" style={{ margin: "6px 0 0" }}>
            View your public journals with reactions and comments from the community
          </p>
        </div>
        <div className="jr-actions">
          <button className="jr-btn-secondary jr-btn" type="button" onClick={() => navigate("/journal/explorer")}>
            Explore Feed
          </button>
          <button className="jr-btn-secondary jr-btn" type="button" onClick={() => navigate("/journal")}>
            Back
          </button>
        </div>
      </div>

      {error && (
        <div className="jr-card" style={{ borderColor: "#ffcdd2", marginBottom: "12px" }}>
          <p style={{ color: "#d32f2f" }}>{error}</p>
          <button className="jr-btn" type="button" onClick={() => void loadFeed(false)}>
            Retry
          </button>
        </div>
      )}

      {loading && journals.length === 0 ? (
        <div className="jr-card">
          <p className="jr-muted">Loading journals...</p>
        </div>
      ) : journals.length === 0 ? (
        <div className="jr-card">
          <p className="jr-muted">You don't have any public journals yet. Create one and set it to public to see it here!</p>
          <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
            <button className="jr-btn" type="button" onClick={() => navigate("/journal/my/new")}>
              Create a journal
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="jr-list jr-explorer-feed">
            {journals.map((journal) => (
              <JournalCard
                key={journal.id}
                journal={journal}
                accessToken={accessToken!}
                currentUserId={user.id}
                onReactionChange={handleReactionChange}
              />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} style={{ height: "20px", margin: "20px 0" }}>
            {loadingMore && (
              <div className="jr-card">
                <p className="jr-muted" style={{ textAlign: "center" }}>
                  Loading more journals...
                </p>
              </div>
            )}
            {!hasMore && journals.length > 0 && (
              <p className="jr-muted" style={{ textAlign: "center" }}>
                You've reached the end!
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

