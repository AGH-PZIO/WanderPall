import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useGuides } from "../hooks/guides/useGuides";
import { Guide } from "../types/Guide";
import "../ui/travel-assistance.css";

const AVAILABLE_LEVELS = ["beginner", "intermediate", "advanced"];

const AVAILABLE_CATEGORIES = [
  "flights",
  "transport",
  "accommodation",
  "food",
  "monuments",
  "museums",
  "nature",
  "entertainment",
];

function BrowseGuides() {
  const { guides, loading, error } = useGuides("public");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    return guides.filter((guide: Guide) => {
      const matchesSearch = guide.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const matchesLevel =
        selectedLevels.length === 0 || selectedLevels.includes(guide.level);

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(guide.category);

      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [guides, searchTerm, selectedLevels, selectedCategories]);

  if (loading) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
              ← Back
            </button>
            <h2>Public travel guides</h2>
          </div>
        </div>
        <p className="ta-loading">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
              ← Back
            </button>
            <h2>Public travel guides</h2>
          </div>
        </div>
        <div className="ta-error" style={{ margin: 20 }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="ta-shell">
      <div className="ta-header">
        <div className="ta-header-left">
          <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
            ← Back
          </button>
          <h2>Public travel guides</h2>
        </div>
      </div>

      <div className="ta-subnav">
        <button type="button" onClick={() => navigate("/travel-assistance/my-guides")}>
          My guides
        </button>
      </div>

      <div style={{ padding: "0 20px", marginBottom: "25px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="text"
          placeholder="Search by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "1rem",
            marginTop: '10px'
          }}
        />
        
        <div>
          <span style={{ fontSize: "0.85rem", color: "#666", display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Filter by level:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {AVAILABLE_LEVELS.map((level) => {
              const isSelected = selectedLevels.includes(level);
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleLevel(level)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: isSelected ? "1px solid transparent" : "1px solid #ccc",
                    backgroundColor: isSelected ? "#28a745" : "#f8f9fa",
                    color: isSelected ? "#fff" : "#333",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    transition: "all 0.2s"
                  }}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "0.85rem", color: "#666", display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Filter by category:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {AVAILABLE_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    border: isSelected ? "1px solid transparent" : "1px solid #ccc",
                    backgroundColor: isSelected ? "#007bff" : "#f8f9fa",
                    color: isSelected ? "#fff" : "#333",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    transition: "all 0.2s"
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ta-stack">
        {filteredGuides.length === 0 ? (
          <div className="ta-empty-state" style={{ minHeight: 200 }}>
            <div className="ta-empty-icon">📖</div>
            <p>{guides.length === 0 ? "No public guides yet." : "No guides match your filters."}</p>
          </div>
        ) : (
          filteredGuides.map((guide: Guide) => (
            <div
              key={guide.id}
              className="ta-stack-card"
              onClick={() => navigate(`/travel-assistance/read-guide/${guide.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/travel-assistance/read-guide/${guide.id}`);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="ta-stack-card__title">{guide.title}</div>
              <p className="ta-stack-card__preview">
                <span style={{ fontWeight: "bold", marginRight: "10px" }}>
                  {guide.category} • {guide.level}
                </span>
                <br />
                Updated {new Date(guide.updated_at || guide.created_at).toLocaleDateString()}
              </p>
              <div className="ta-stack-card__footer">
                <span className="ta-stack-card__meta">Open to read</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BrowseGuides;
