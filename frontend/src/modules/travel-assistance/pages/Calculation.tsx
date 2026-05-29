import { useParams } from "react-router";
import { useAuth } from "../../account/hooks/useAuth";
import { useCalculations } from "../hooks/calculations/useCalculations";
import { useNavigate } from "react-router";
import { useCreateCalculation } from "../hooks/calculations/useCreateCalculation";
import { useDeleteCalculation } from "../hooks/calculations/useDeleteCalculation";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import { useMemo, useState, useEffect } from "react";
import type { Calculation, CreateCalculationDTO, Expense, ExpenseBase } from "../types/Calculation";
import Calculator from "./Calculator";
import "../ui/travel-assistance.css";

function CalculationPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { calculations, loading, refetch } = useCalculations();
  const navigate = useNavigate();
  const { create } = useCreateCalculation(refetch);
  const { remove } = useDeleteCalculation(refetch);
  const isNew = id === "new";
  const tokens = tokenStore.get();
  const accessToken = tokens?.accessToken;
  const currentCalc = useMemo(() => {
    if (isNew) return null;
    return calculations.find((c: Calculation) => c.id === id) ?? null;
  }, [calculations, id, isNew]);
  const [rates, setRates] = useState<Record<string, number>>({ PLN: 1.0 });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch("https://api.nbp.pl/api/exchangerates/tables/A/?format=json");
        if (!response.ok) throw new Error("Failed to fetch rates");
        
        const data = await response.json();
        const nbpRates = data[0].rates;
        
        const newRates: Record<string, number> = { PLN: 1.0 };
        
        nbpRates.forEach((r: { code: string; mid: number }) => {
          newRates[r.code] = r.mid;
        });
        
        setRates(newRates);
      } catch (err) {
        console.error("ERROR when fetching currencies exchanges from NBP:", err);
      }
    };

    fetchRates();
  }, []);

  const defaultExpenses: ExpenseBase[] = [
    { category: "get-to", amount: 0, currency: "PLN" },
    { category: "transport", amount: 0, currency: "PLN" },
    { category: "accommodation", amount: 0, currency: "PLN" },
    { category: "food", amount: 0, currency: "PLN" },
    { category: "entrances", amount: 0, currency: "PLN" }
  ];

  const [expenses, setExpenses] = useState<ExpenseBase[]>(isNew ? defaultExpenses : []);
  const [title, setTitle] = useState("");

  const handleExpenseChange = (index: number, field: keyof Expense, value: string | number) => {
    const next = [...(expenses || [])];
    next[index] = {
      ...next[index],
      [field]: field === "amount" ? Number(value) : value
    };
    setExpenses(next);
  };

  const addExpenseField = () => {
    setExpenses([...(expenses || []), { category: "", amount: 0, currency: "PLN" }]);
  };

  const removeExpenseField = (index: number) => {
    setExpenses((expenses || []).filter((_, i) => i !== index));
  };

  function handleSave() {
    if (!user) {
      alert("You have to be logged in!");
      return;
    }

    const total = expenses?.reduce((sum, e) => {
      const currencyCode = e.currency || "PLN";
      const rate = rates[currencyCode] ?? 1.0; 
      return sum + (e.amount * rate);
    }, 0) ?? 0;

    if (expenses) {
      const calcData: CreateCalculationDTO = {
        title,
        expenses,
        total
      };
      create(calcData);
      navigate("/tools/calculator");
    }
  }

  function renderCalculations() {
    return [...calculations]
      .sort(
        (a: Calculation, b: Calculation) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((c: Calculation) => (
        <div
          key={c.id}
          className="ta-note-list-item"
          onClick={() => navigate(`/tools/calculator/${c.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/tools/calculator/${c.id}`);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <h3>{c.title}</h3>
          <p>{new Date(c.created_at).toLocaleString()}</p>
        </div>
      ));
  }

  function renderEditor() {
    const total = expenses?.reduce((sum, e) => {
      const currencyCode = e.currency || "PLN";
      const rate = rates[currencyCode] ?? 1.0; 
      return sum + (e.amount * rate);
    }, 0) ?? 0;

    return (
      <div className="ta-calc-editor">
        <div className="ta-calc-fields">
          <label className="ta-field-label" htmlFor="calc-title">
            Title
          </label>
          <input
            id="calc-title"
            type="text"
            className="ta-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Trip name"
          />

          <span className="ta-field-label">Expenses</span>
          <div className="ta-expenses-form">
            {expenses?.map((expense, index) => (
              <div key={index} className="ta-expense-row">
                <input
                  type="text"
                  placeholder="Category"
                  value={expense.category}
                  onChange={(e) => handleExpenseChange(index, "category", e.target.value)}
                  style={{ flex: 2 }}
                  disabled={index < 5}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={expense.amount}
                  onChange={(e) => handleExpenseChange(index, "amount", e.target.value)}
                  style={{ flex: 1 }}
                  disabled={false}
                />
                <select
                  value={expense.currency || "PLN"}
                  onChange={(e) => handleExpenseChange(index, "currency", e.target.value)}
                  style={{ flex: 0.8, padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: 'white' }}
                >
                  {Object.keys(rates)
                    .sort()
                    .map((currencyCode) => (
                      <option key={currencyCode} value={currencyCode}>
                        {currencyCode} {currencyCode === "PLN" ? "(zł)" : ""}
                      </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ta-expense-remove"
                  onClick={() => removeExpenseField(index)}
                  disabled={index < 5}
                >
                  ✕
                </button>
              </div>
            ))}

            <button type="button" onClick={addExpenseField} className="ta-add-expense">
              + Add category
            </button>
          </div>

          <div className="ta-calc-total">Total: {total.toFixed(2)} PLN</div>
        </div>

        <div className="ta-calc">
          <Calculator />
        </div>
      </div>
    );
  }

  function renderView() {
    const list = currentCalc?.expenses ?? [];
    const total = currentCalc?.total;
    return (
      <div className="ta-calc-view">
        <h2 style={{ marginTop: 0 }}>{currentCalc?.title}</h2>
        <ul>
          {list.map((e: Expense) => (
            <li key={`${e.category}-${e.amount}`}>
              <strong>{e.category}:</strong> {e.amount} {e.currency}
            </li>
          ))}
        </ul>
        <div className="ta-calc-total">Total: {total} PLN</div>
        <div className="ta-form-actions">
          <button
            type="button"
            className="ta-btn-danger"
            onClick={() => {
              remove(id ?? "");
              navigate("/tools/calculator");
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  if (!accessToken) return <AuthRequiredGate feature="the trip calculator" />;
  if (loading) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/tools/calculator")}>
              ← Back
            </button>
            <h2>Calculator</h2>
          </div>
        </div>
        <p className="ta-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="ta-shell">
      <div className="ta-header">
        <div className="ta-header-left">
          <button type="button" className="btn-back" onClick={() => navigate("/tools/calculator")}>
            ← Back
          </button>
          <h2>{isNew ? "New calculation" : "Calculation"}</h2>
        </div>
        {isNew && (
          <div className="ta-actions">
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        )}
      </div>

      <div className="ta-calc-container">
        {isNew && renderEditor()}
        {!isNew && renderView()}
        <div className="ta-notes-list">{renderCalculations()}</div>
      </div>
    </div>
  );
}

export default CalculationPage;
