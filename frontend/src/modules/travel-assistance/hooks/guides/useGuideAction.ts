import { useState, useCallback } from "react";
import { apiFetch } from "../../api/api.config";
import { Guide, CreateGuideDTO } from "../../types/Guide";

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

export const useGuideAction = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getGuide = useCallback(async (id: string): Promise<Guide | null> => {
        setLoading(true);
        try {
            return await apiFetch(`/guides/${id}`);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unknown ERROR");
            }
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const saveGuide = async (id: string | null, data: CreateGuideDTO) => {
        setLoading(true);
        try {
            const method = id ? "PUT" : "POST";
            const url = id ? `/guides/${id}` : "/guides";
            return await apiFetch(url, {
                method,
                body: JSON.stringify(data),
            });
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unknown ERROR");
            }
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteGuide = async (id: string) => {
        setLoading(true);
        try {
            await apiFetch(`/guides/${id}`, { method: "DELETE" });
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unknown ERROR");
            }
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const togglePublish = async (id: string, currentlyPublished: boolean) => {
        const action = currentlyPublished ? "unpublish" : "publish";
        try {
            await apiFetch(`/guides/${id}/${action}`, { method: "POST" });
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unknown ERROR");
            }
            throw err;
        }
    };

    const uploadFile = async (file: File): Promise<{ url: string }> => {
        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // const meta = import.meta as unknown as ImportMeta;
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            const response = await fetch(`${apiUrl}/travel-assistance/guides/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");
            return await response.json();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unknown ERROR");
            }
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { getGuide, saveGuide, deleteGuide, togglePublish, uploadFile, loading, error };
};