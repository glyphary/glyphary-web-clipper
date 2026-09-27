import { type CategoryState, normalizeState } from "./categories";

// Kept apart from the pure helpers so those compile without the browser
// types that the test build deliberately leaves out.

const CATEGORIES_KEY = "categories";
const OPEN_IN_APP_KEY = "openInApp";

export async function loadCategories(): Promise<CategoryState> {
  const stored = await chrome.storage.local.get(CATEGORIES_KEY);

  return normalizeState(stored[CATEGORIES_KEY] as Partial<CategoryState> | undefined);
}

export function saveCategories(state: CategoryState) {
  return chrome.storage.local.set({ [CATEGORIES_KEY]: state });
}

export async function loadOpenInApp() {
  const stored = await chrome.storage.local.get(OPEN_IN_APP_KEY);

  return stored[OPEN_IN_APP_KEY] !== false;
}

export function saveOpenInApp(enabled: boolean) {
  return chrome.storage.local.set({ [OPEN_IN_APP_KEY]: enabled });
}
