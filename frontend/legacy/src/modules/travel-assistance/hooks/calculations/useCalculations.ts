import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../api/api.config";
import { Calculation } from "../../types/Calculation";

export const useCalculations = () => {
    const [calculations, setCalculations] = useState<Calculation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCalculations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch("/calculator");
            setCalculations(data);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unknown ERROR");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCalculations();
    }, [fetchCalculations]);

    return { calculations, loading, error, refetch: fetchCalculations };
};