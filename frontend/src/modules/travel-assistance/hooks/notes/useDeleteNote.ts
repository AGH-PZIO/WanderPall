import { useState } from "react";
import { apiFetch } from "../../api/api.config";

export function useDeleteNote(onSuccess?: () => void) {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const remove = async (noteId: string) => {
        if (!window.confirm("Are you sure you want to delete this note?")) return;

        setLoading(true);
        setError(null);
        try {
            await apiFetch(`/notes/${noteId}`, {
                method: "DELETE",
            });
            if (onSuccess) {
                onSuccess();
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
                console.log(err.message);
            } else {
                setError("Unknown ERROR");
                console.log("Failed to delete the note")
            }
        } finally {
            setLoading(false);
        }
    };

    return { remove, loading, error };
}