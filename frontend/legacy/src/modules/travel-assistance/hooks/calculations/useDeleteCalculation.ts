import { apiFetch } from "../../api/api.config";

export const useDeleteCalculation = (onSuccess?: () => void) => {
    const remove = async (id: string) => {
        if (!window.confirm("Are you sure?")) return;

        try {
            await apiFetch(`/calculator/${id}`, {
                method: "DELETE",
            });
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            } else {
                alert("Unknown ERROR");
            }
        }
    };

    return { remove };
};