import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../api/api.config";
import { Guide } from "../../types/Guide";

export const useGuides = (mode: "all" | "public" = "all") => {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGuides = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = mode === "public" ? "/guides/public" : "/guides";
            const data = await apiFetch(endpoint);
            setGuides(data);
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
    }, [mode]);

    useEffect(() => {
        fetchGuides();
    }, [fetchGuides]);

    return { guides, loading, error, refetch: fetchGuides };
};