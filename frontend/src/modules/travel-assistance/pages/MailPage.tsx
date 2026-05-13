import { useNavigate } from "react-router-dom";
import { useTravelAssistance } from "../hooks/useTravelAssistance";
import "../ui/travel-assistance.css";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import { tokenStore } from "../../account/auth-runtime";


export function MailPage() {
  const navigate = useNavigate();
  const tokens = tokenStore.get();
  const accessToken = tokens?.accessToken;
  const {
    items,
    selected,
    setSelected,
    loading,
    syncing,
    connected,
    googleEmail,
    sync,
    disconnect,
    connectToGoogle,
    downloadAttachment
  } = useTravelAssistance();

  if (!accessToken) {
    return <AuthRequiredGate feature="Email documents" />;
  }

  if (!connected) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <h2>Email Documents</h2>
        </div>

        <div className="ta-disconnected">
          <p>Connect your Gmail to get started</p>
          <button onClick={connectToGoogle} className="btn-primary">
            Connect with Gmail
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ta-shell">

      {/* HEADER */}
      <div className="ta-header">
        <div className="ta-header-left">
          <button onClick={() => navigate("/travel-assistance")} className="btn-back">← Back</button>
          <h2>Email Documents</h2>
          <small>{googleEmail}</small>
        </div>

        <div className="ta-actions">
          <button onClick={sync} disabled={syncing} className={syncing ? 'btn-syncing' : ''}>
            {syncing ? (
              <>
                <span className="spinner"></span>
                Syncing...
              </>
            ) : (
              'Sync emails'
            )}
          </button>
          <button onClick={disconnect} className="btn-secondary">
            Disconnect Gmail
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="ta-body">

        {/* LEFT: LIST */}
        <div className="ta-list">
          {loading && <p className="ta-loading">Loading...</p>}

          {items.length === 0 && !loading && (
            <p className="ta-empty">No emails found. Click "Sync emails" to get started.</p>
          )}

          {items.map((mail) => (
            <div
              key={mail.id}
              className={`ta-card ${selected?.id === mail.id ? "active" : ""}`}
              onClick={() => setSelected(mail)}
            >
              <p>{mail.subject}</p>
              <small>{mail.from_addr}</small>
            </div>
          ))}
        </div>

        {/* RIGHT: DETAILS */}
        <div className="ta-details">
          {!selected ? (
            <div className="ta-empty-state">
              <div className="ta-empty-icon">📧</div>
              <p>Select an email to view details</p>
            </div>
          ) : (
            <>
              <h3>{selected.subject}</h3>
              <p>{selected.snippet}</p>

              <h4>Attachments</h4>

              {(selected.attachments ?? []).length === 0 ? (
                <p>No attachments</p>
              ) : (
                selected.attachments!.map((a) => (
                  <div key={a.attachment_id}>
                    <span>{a.filename}</span>
                    <button
                      onClick={() =>
                        downloadAttachment(selected.id, a.attachment_id)
                      }
                      className="btn-download"
                    >
                      Download
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}