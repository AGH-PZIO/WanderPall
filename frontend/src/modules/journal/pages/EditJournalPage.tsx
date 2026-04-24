import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../account/hooks/useAuth";
import {
  createEntry,
  deleteEntry,
  deleteEntryImage,
  deleteJournal,
  listEntries,
  listMyJournals,
  updateEntry,
  updateJournal,
  updateJournalVisibility,
  uploadEntryImages,
  type Entry,
  type JournalVisibility
} from "../api/journal-api";

function clampFiles(files: File[], max: number) {
  return files.slice(0, max);
}

export function EditJournalPage() {
  const { journalId } = useParams();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<JournalVisibility>("private");
  const [entries, setEntries] = useState<Entry[]>([]);

  // Add-entry form
  const [newText, setNewText] = useState("");
  const [newLat, setNewLat] = useState<number>(0);
  const [newLng, setNewLng] = useState<number>(0);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const newPreviews = useMemo(() => newFiles.map((f) => URL.createObjectURL(f)), [newFiles]);

  async function load() {
    if (!accessToken || !journalId) return;
    setLoading(true);
    setError(null);
    try {
      const jRes = await listMyJournals(accessToken, 200, 0);
      const journal = jRes.items.find((j) => j.id === journalId);
      if (!journal) throw new Error("Journal not found");
      setTitle(journal.title);
      setVisibility(journal.visibility);

      const eRes = await listEntries(accessToken, journalId, 200, 0);
      setEntries(eRes.items);
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

  async function handleSaveJournal() {
    if (!accessToken || !journalId) return;
    try {
      await updateJournal(accessToken, journalId, title.trim());
      await updateJournalVisibility(accessToken, journalId, visibility);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleDeleteJournal() {
    if (!accessToken || !journalId) return;
    if (!window.confirm("Delete this journal? This will delete its entries and images.")) return;
    try {
      await deleteJournal(accessToken, journalId);
      navigate("/journal/my");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleAddEntry() {
    if (!accessToken || !journalId) return;
    if (!newText.trim()) {
      window.alert("Entry text is required");
      return;
    }
    try {
      const entry = await createEntry(accessToken, journalId, { lat: newLat, lng: newLng, text: newText.trim() });
      if (newFiles.length > 0) {
        await uploadEntryImages(accessToken, journalId, entry.id, clampFiles(newFiles, 3));
      }
      setNewText("");
      setNewFiles([]);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not add entry");
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!accessToken || !journalId) return;
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEntry(accessToken, journalId, entryId);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleUpdateEntry(entryId: string, text: string) {
    if (!accessToken || !journalId) return;
    try {
      await updateEntry(accessToken, journalId, entryId, { text });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleDeleteImage(entryId: string, imageId: string) {
    if (!accessToken || !journalId) return;
    try {
      await deleteEntryImage(accessToken, journalId, entryId, imageId);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Image delete failed");
    }
  }

  if (!user) {
    return (
      <div className="jr-shell">
        <p className="jr-muted">Please sign in to edit journals.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="jr-shell">
        <div className="jr-card"><p className="jr-muted">Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="jr-shell">
      <div className="jr-header">
        <div>
          <h2 style={{ margin: 0 }}>Edit journal</h2>
          <p className="jr-muted" style={{ margin: "6px 0 0" }}>Update metadata, manage entries and images.</p>
        </div>
        <div className="jr-actions">
          <button className="jr-btn-secondary jr-btn" type="button" onClick={() => navigate("/journal/my")}>
            Back
          </button>
          <button className="jr-btn-danger jr-btn" type="button" onClick={() => void handleDeleteJournal()}>
            Delete journal
          </button>
        </div>
      </div>

      {error && <div className="jr-card" style={{ borderColor: "#ffcdd2" }}><p>{error}</p></div>}

      <div className="jr-card" style={{ marginBottom: 12 }}>
        <div className="jr-form">
          <div className="jr-field">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="jr-field">
            <label>Visibility</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as JournalVisibility)}>
              <option value="private">private</option>
              <option value="friends_only">friends_only</option>
              <option value="public">public</option>
            </select>
          </div>
          <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
            <button className="jr-btn" type="button" onClick={() => void handleSaveJournal()}>
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="jr-card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Add entry</h3>
        <div className="jr-form">
          <div className="jr-field">
            <label>Text</label>
            <textarea rows={4} value={newText} onChange={(e) => setNewText(e.target.value)} />
          </div>
          <div className="jr-grid-2">
            <div className="jr-field">
              <label>Latitude</label>
              <input type="number" value={newLat} onChange={(e) => setNewLat(Number(e.target.value))} step="0.000001" />
            </div>
            <div className="jr-field">
              <label>Longitude</label>
              <input type="number" value={newLng} onChange={(e) => setNewLng(Number(e.target.value))} step="0.000001" />
            </div>
          </div>
          <div className="jr-field">
            <label>Photos (max 3)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                setNewFiles(clampFiles(list, 3));
              }}
            />
            {newPreviews.length > 0 && (
              <div className="jr-photos">
                {newPreviews.slice(0, 3).map((src) => (
                  <img className="jr-photo" src={src} key={src} alt="New entry upload preview" />
                ))}
              </div>
            )}
          </div>
          <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
            <button className="jr-btn" type="button" onClick={() => void handleAddEntry()}>
              Add entry
            </button>
          </div>
        </div>
      </div>

      <div className="jr-list">
        {entries.map((e) => (
          <div className="jr-card" key={e.id}>
            <div className="jr-row">
              <div>
                <h3 style={{ margin: 0 }}>Entry</h3>
                <div className="jr-muted">
                  {new Date(e.created_at).toLocaleString()} · ({e.lat.toFixed(5)}, {e.lng.toFixed(5)})
                </div>
              </div>
              <div className="jr-actions">
                <button className="jr-btn-danger jr-btn" type="button" onClick={() => void handleDeleteEntry(e.id)}>
                  Delete entry
                </button>
              </div>
            </div>

            <div className="jr-field" style={{ marginTop: 12 }}>
              <label>Text</label>
              <textarea
                rows={4}
                value={e.text}
                onChange={(evt) => {
                  const next = evt.target.value;
                  setEntries((prev) => prev.map((x) => (x.id === e.id ? { ...x, text: next } : x)));
                }}
              />
              <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
                <button className="jr-btn-secondary jr-btn" type="button" onClick={() => void handleUpdateEntry(e.id, e.text)}>
                  Save entry text
                </button>
              </div>
            </div>

            {e.images?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="jr-muted" style={{ marginBottom: 8 }}>Photos</div>
                <div className="jr-photos">
                  {e.images.map((img) => (
                    <div key={img.id} style={{ display: "grid", gap: 6 }}>
                      <img className="jr-photo" src={img.url} alt="Entry" />
                      <button
                        className="jr-btn-danger jr-btn"
                        type="button"
                        onClick={() => void handleDeleteImage(e.id, img.id)}
                      >
                        Delete photo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
