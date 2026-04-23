import { useState } from "react";
import { CreateNoteDTO } from "../../types/Note";
import { apiFetch } from "../../api/api.config";

export function useCreateNote(onSuccess?: () => void) {
    const [loading, setLoading] = useState<boolean>(false);

    const create = async (data: CreateNoteDTO) => {
        setLoading(true);
        try {
            const newNoteId = await apiFetch("/notes", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (onSuccess) {
                onSuccess();
            }
            return newNoteId;
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Failed to create note", err);
                throw err;
            } else {
                console.error("Unknown ERROR");
            }
        } finally {
            setLoading(false);
        }
    };

    return { create, loading };
}