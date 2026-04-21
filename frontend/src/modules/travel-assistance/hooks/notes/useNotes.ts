import { useState, useEffect, useCallback } from "react";
import { Note } from "../../types/Note";
import { apiFetch } from "../../api/api.config";

export function useNotes() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch("/notes");
            setNotes(data);
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
        fetchNotes();
    }, [fetchNotes]);

    return { notes, loading, error, refetch: fetchNotes };
}