import { apiFetch } from "../../api/api.config";
import { CreateCalculationDTO } from "../../types/Calculation";
import { useState } from "react";

export const useCreateCalculation = (onSuccess?: () => void) => {
    const [submitting, setSubmitting] = useState(false);

    const create = async (data: CreateCalculationDTO) => {
        setSubmitting(true);
        try {
            await apiFetch("/calculator", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            } else {
                alert("Unknown ERROR");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return { create, submitting };
};