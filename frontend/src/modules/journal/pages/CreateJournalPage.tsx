import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../account/hooks/useAuth";
import { createEntry, createJournal, uploadEntryImages } from "../api/journal-api";

function clampFiles(files: File[], max: number) {
  return files.slice(0, max);
}

export function CreateJournalPage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  async function useMyLocation() {
    if (!navigator.geolocation) {
      window.alert("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => window.alert("Could not read your location. You can type coordinates manually.")
    );
  }

  async function handleSubmit() {
    if (!accessToken) return;
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!text.trim()) {
      setError("Entry text is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const journal = await createJournal(accessToken, title.trim());
      const entry = await createEntry(accessToken, journal.id, { lat, lng, text: text.trim() });
      if (files.length > 0) {
        await uploadEntryImages(accessToken, journal.id, entry.id, clampFiles(files, 3));
      }
      navigate(`/journal/my/${journal.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create journal");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="jr-shell">
        <p className="jr-muted">Please sign in to create journals.</p>
      </div>
    );
  }

  return (
    <div className="jr-shell">
      <div className="jr-header">
        <div>
          <h2 style={{ margin: 0 }}>Create journal</h2>
          <p className="jr-muted" style={{ margin: "6px 0 0" }}>
            This creates a journal plus its first entry (max 3 photos).
          </p>
        </div>
        <div className="jr-actions">
          <button className="jr-btn-secondary jr-btn" type="button" onClick={() => navigate("/journal/my")}>
            Back
          </button>
        </div>
      </div>

      <div className="jr-card">
        <div className="jr-form">
          {error && <div className="jr-card" style={{ borderColor: "#ffcdd2" }}><p>{error}</p></div>}

          <div className="jr-field">
            <label>Journal title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekend in Warsaw" />
          </div>

          <div className="jr-field">
            <label>First entry text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="What happened here?"
            />
          </div>

          <div className="jr-grid-2">
            <div className="jr-field">
              <label>Latitude</label>
              <input type="number" value={lat} onChange={(e) => setLat(Number(e.target.value))} step="0.000001" />
            </div>
            <div className="jr-field">
              <label>Longitude</label>
              <input type="number" value={lng} onChange={(e) => setLng(Number(e.target.value))} step="0.000001" />
            </div>
          </div>

          <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
            <button className="jr-btn-secondary jr-btn" type="button" onClick={() => void useMyLocation()}>
              Use my location
            </button>
          </div>

          <div className="jr-field">
            <label>Photos (max 3)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                setFiles(clampFiles(list, 3));
              }}
            />
            {files.length > 3 && <p className="jr-muted">Only the first 3 photos will be used.</p>}
            {previews.length > 0 && (
              <div className="jr-photos" aria-label="Selected photos">
                {previews.slice(0, 3).map((src) => (
                  <img className="jr-photo" src={src} key={src} alt="Selected upload preview" />
                ))}
              </div>
            )}
          </div>

          <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
            <button className="jr-btn" type="button" disabled={busy} onClick={() => void handleSubmit()}>
              {busy ? "Creating..." : "Create journal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
