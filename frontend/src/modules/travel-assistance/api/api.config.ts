import { tokenStore } from "../../account/auth-runtime";

const API_BASE_URL = "http://localhost:8000/travel-assistance";

export const getAuthHeaders = (): HeadersInit => {
    const tokens = tokenStore.get(); 
    const accessToken = tokens?.accessToken;
    
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
    };
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
};