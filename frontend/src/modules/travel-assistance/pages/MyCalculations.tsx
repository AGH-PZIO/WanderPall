import { useNavigate } from "react-router";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import { useCalculations } from "../hooks/calculations/useCalculations";
import { useDeleteCalculation } from "../hooks/calculations/useDeleteCalculation";
import { Calculation } from "../types/Calculation";

function MyCalculations() {
    const navigate = useNavigate();
    const tokens = tokenStore.get(); 
    const accessToken = tokens?.accessToken;
    const { calculations, loading, refetch } = useCalculations();
    const { remove } = useDeleteCalculation(refetch);

    function renderCalculations() {
            return [...calculations].sort((a: Calculation, b: Calculation) => 
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime())
            .map((c: Calculation) => 
            <>
                <div className="ta-note-item" key={c.id} >
                    <h3 onClick={() => navigate(`/travel-assistance/calculation/${c.id}`)} style={{cursor: "pointer"}}>{c.title}</h3>
                    <p> {c.expenses[0].category}: {c.expenses[0].amount} <br />
                        {c.expenses[1].category}: {c.expenses[1].amount} <br />
                        {c.expenses[2].category}: {c.expenses[2].amount}</p>
                    <p>...</p>
                    <div className="ta-note-item-controls">
                        <p style={{color: 'gray'}}>{new Date(c.created_at).toLocaleString()}</p>
                        <button className="delete-button" onClick={(e) => {e.stopPropagation(); remove(c.id) }}>🗑</button>
                    </div>
                </div>
            </>)
        }

    if (!accessToken) return <AuthRequiredGate feature="the trip calculator" />;
    if (loading) return <p style={{marginLeft: '20px'}}>Loading...</p>;

    return (
        <>
            <div className="ta-shell">
                <div className="ta-header">
                    <h2 onClick={() => navigate("/travel-assistance/my-calculations")}>My Calculations</h2>
                </div>

                <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance")}>Back to travel assistance</h3>
                <div className="ta-notes">
                    <button id="create-note" onClick={() => navigate("/travel-assistance/calculation/new")}>+</button>
                    {renderCalculations()}
                </div>
            </div>
        </>
    )
}

export default MyCalculations