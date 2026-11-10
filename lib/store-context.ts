export const ACTIVE_STORE_KEY = "spurax_active_store_id";

export function getActiveStoreId(): string | null {
if (typeof window === "undefined") {
return null;
}

return localStorage.getItem(ACTIVE_STORE_KEY);
}

export function setActiveStoreId(storeId: string): void {
if (typeof window === "undefined") {
return;
}

localStorage.setItem(ACTIVE_STORE_KEY, storeId);
}

export function clearActiveStoreId(): void {
if (typeof window === "undefined") {
return;
}

localStorage.removeItem(ACTIVE_STORE_KEY);
}
