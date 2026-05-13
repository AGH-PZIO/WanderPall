import { useParams } from "react-router";
import { useAuth } from "../../account/hooks/useAuth";
import { useCalculations } from "../hooks/calculations/useCalculations";
import { useNavigate } from "react-router";
import { useCreateCalculation } from "../hooks/calculations/useCreateCalculation";
import { useDeleteCalculation } from "../hooks/calculations/useDeleteCalculation";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import { useMemo, useState, useEffect, useRef } from "react";
import type { Calculation, CreateCalculationDTO, Expense, ExpenseBase } from "../types/Calculation";
import Calculator from "./Calculator";

function Calculation() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const { calculations, loading, refetch } = useCalculations();
    const navigate = useNavigate();
    const { create } = useCreateCalculation(refetch);
    const { remove } = useDeleteCalculation(refetch);
    const isNew = id === "new";
    const tokens = tokenStore.get(); 
    const accessToken = tokens?.accessToken;
    const lastInitializedId = useRef<string | null>(null);

    const currentCalc = useMemo(() => {
        if (isNew) return null;
        return calculations.find((c: Calculation) => c.id === id) ?? null;
    }, [calculations, id, isNew]);

    const defaultExpenses: ExpenseBase[] = [
        { category: "get-to", amount: 0 },
        { category: "transport", amount: 0 },
        { category: "accommodation", amount: 0 },
        { category: "food", amount: 0 },
        { category: "entrances", amount: 0 },
    ];

    const [expenses, setExpenses] = useState<ExpenseBase[]>(isNew ? defaultExpenses : []);
    const [title, setTitle] = useState("");

    useEffect(() => {
        if (currentCalc && lastInitializedId.current !== currentCalc.id) {
            // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
            setTitle(currentCalc.title);
            setExpenses(currentCalc.expenses);
            lastInitializedId.current = currentCalc.id;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCalc]);

    const handleExpenseChange = (index: number, field: keyof Expense, value: string | number) => {
        const newExpenses = [...(expenses || [])];
        newExpenses[index] = { 
            ...newExpenses[index], 
            [field]: field === "amount" ? Number(value) : value 
        };
        setExpenses(newExpenses);
    };

    const addExpenseField = () => {
        setExpenses([...(expenses || []), { category: "", amount: 0 }]);
    };

    const removeExpenseField = (index: number) => {
        const newExpenses = (expenses || []).filter((_, i) => i !== index);
        setExpenses(newExpenses);
    };

    function handleSave() {
        if (!user) {
            alert("You have to be logged in!");
            return;
        }

        if(expenses) {
            const calcData: CreateCalculationDTO = {
                title: title,
                expenses: expenses,
            };
            create(calcData); 
            navigate('/travel-assistance/my-calculations');
        }
    }

    function renderCalculations() {
        return [...calculations]
            .sort(
                (a: Calculation, b: Calculation) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
            )
            .map((c: Calculation) => (
                <div
                    key={c.id}
                    className="ta-note-list-item"
                    onClick={() => navigate(`/travel-assistance/calculation/${c.id}`)}
                >
                    <h3>{c.title}</h3>
                    <p style={{color: 'gray'}}>
                        {new Date(c.created_at).toLocaleString()}
                    </p>
                </div>
        ));
    }
    
    function renderEditor() {
        return (
            <>
                <div className="ta-calc-editor">
                    <div className="ta-calc-fields">
                        <label>
                            <h2>Title</h2>
                        </label>

                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        <label>
                            <h3>Content</h3>
                        </label>

                        <div className="ta-expenses-form">
                            {expenses?.map((expense, index) => (
                                <div key={index} className="ta-expense-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="Category"
                                        value={expense.category}
                                        onChange={(e) => handleExpenseChange(index, "category", e.target.value)}
                                        style={{ flex: 2 }}
                                        disabled={index < 5 ? true : false}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={expense.amount}
                                        onChange={(e) => handleExpenseChange(index, "amount", e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <button 
                                        className="del-small" 
                                        onClick={() => removeExpenseField(index)}
                                        style={{ background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}
                                        disabled={index < 5 ? true : false}
                                    >
                                        ✕
                                    </button>
                                    
                                </div>
                            ))}
                            
                            <button 
                                type="button" 
                                onClick={addExpenseField}
                                className="add-btn"
                                style={{ marginTop: '10px', width: '100%', padding: '8px', cursor: 'pointer' }}
                            >
                                + Add next category
                            </button>
                        </div>

                        <div style={{ marginTop: '20px', fontWeight: 'bold' }}>
                            Total: {expenses?.reduce((sum, e) => sum + e.amount, 0)} PLN
                        </div>

                        <button className="create-btn" onClick={handleSave}>Create</button>
                    </div>
                    
                    <div className="ta-calc" style={{marginRight: '20px'}}>
                        <Calculator></Calculator>
                    </div>
                </div>
            </>
        )
    }

    function renderView() {
        return (
            <>
                <div className="ta-calc-view">
                    <h2>{currentCalc?.title}</h2>
                    <ul>
                        {currentCalc?.expenses.map((e: Expense) => {
                            return (
                                <li>
                                    <b>{e.category}:</b> {e.amount}
                                </li>
                            )
                        })}
                    </ul>
                    <div style={{ marginTop: '20px', fontWeight: 'bold' }}>
                        Total: {expenses?.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)} PLN
                    </div>
                    <button className="del-btn" onClick={() => { remove(id ? id : ""); navigate('/travel-assistance/my-calculations') }}>Delete</button>
                </div>
            </>
        )
    }

    if (!accessToken) return <AuthRequiredGate feature="the trip calculator" />;
    if (loading) return <p style={{marginLeft: '20px'}}>Loading...</p>;

    return (
        <>
            <div className="ta-shell">
                <div className="ta-header">
                    <h2 onClick={() => navigate("/travel-assistance/my-calculations")}>
                    {isNew ? "Create calculation" : "View note"}
                    </h2>
                </div>

                <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance")}> Back to travel assistance</h3>

                <div className="ta-calc-container">
                    {
                        isNew && renderEditor()
                    }
                    {
                        !isNew && renderView()
                    }

                    <div className="ta-notes-list">{renderCalculations()}</div>
                </div>

            </div>
        </>
    )
}

export default Calculation