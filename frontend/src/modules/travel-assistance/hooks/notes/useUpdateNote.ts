import { useState } from "react";
import { CreateNoteDTO } from "../../types/Note";
import { apiFetch } from "../../api/api.config";

export function useUpdateNote(onSuccess?: () => void) {
    const [loading, setLoading] = useState<boolean>(false);

    const update = async (noteId: string, data: CreateNoteDTO) => {
        setLoading(true);
        try {
            await apiFetch(`/notes/${noteId}`, {
                method: "PUT",
                body: JSON.stringify(data),
            });
            if (onSuccess) {
                onSuccess();
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Failed to update note", err.message);
                throw err;
            } else {
                console.error("Unknown ERROR");
            }
        } finally {
            setLoading(false);
        }
    };

    return { update, loading };
}