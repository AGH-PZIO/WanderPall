import { useNavigate } from "react-router-dom";

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="ta-home">
      <div className="ta-home-header">
        <h2>Travel Assistance</h2>
        <p>Choose a feature to get started</p>
      </div>

      <div className="ta-home-grid">
        <button
          className="ta-home-card"
          onClick={() => navigate("mail")}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div className="ta-card-icon">📧</div>
          <h3>Email Documents</h3>
          <p>Manage and sync your travel-related emails</p>
        </button>

        <button
          className="ta-home-card"
          style={{ background: "none", border: "none", cursor: "default" }}
        >
          <div className="ta-card-icon">📖</div>
          <h3>Travel Guides</h3>
          <p>Browse travel guides for your destinations</p>
        </button>

        <button
          className="ta-home-card"
           onClick={() => navigate("translator")}
          style={{ background: "none", border: "none", cursor: "default" }}
        >
          <div className="ta-card-icon">🌐</div>
          <h3>Translator</h3>
          <p>Translate text for your travels</p>
        </button>

        <button
          className="ta-home-card"
          onClick={() => navigate("calendar")}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div className="ta-card-icon">📅</div>
          <h3>Calendar</h3>
          <p>Sync with Google Calendar</p>
        </button>
      </div>
    </div>
  );
}
