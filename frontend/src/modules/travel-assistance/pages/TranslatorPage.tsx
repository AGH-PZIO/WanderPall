import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslator } from "../hooks/useTranslator";
import "../ui/travel-assistance.css";

export function TranslatorPage() {
  const navigate = useNavigate();
  const { translate, translatedText, languages, fetchLanguages, loading } =
    useTranslator();

  const [text, setText] = useState("");
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("pl");

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  const handleTranslate = async () => {
    await translate(text, source, target);
  };

  return (
    <div className="ta-shell">

      {/* HEADER */}
      <div className="ta-header">
        <div className="ta-header-left">
          <button
            onClick={() => navigate("/travel-assistance")}
            className="btn-back"
          >
            ← Back
          </button>
          <h2>Translator</h2>
        </div>

        <div className="ta-actions">
          <button
            onClick={handleTranslate}
            disabled={loading || !text}
            className={loading ? "btn-syncing" : ""}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Translating...
              </>
            ) : (
              "Translate"
            )}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="ta-body">

        {/* LEFT */}
        <div className="ta-list">
          <h4>Input</h4>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to translate..."
            className="ta-textarea"
          />

          <div className="ta-row">
            <div>
              <label>From</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>To</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="ta-details">
          <h4>Result</h4>

          {!translatedText ? (
            <div className="ta-empty-state">
              <div className="ta-empty-icon">🌍</div>
              <p>Translation will appear here</p>
            </div>
          ) : (
            <div className="ta-result">
              {translatedText}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}