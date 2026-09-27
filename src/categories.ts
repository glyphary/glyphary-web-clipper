// Responsibilities:
// - Clipping categories: a name plus a vault-relative folder, with the
//   last-used one remembered.
// - Tag parsing for the popup's free-text tag field.
// Contracts:
// - Pure: plain data in and out, so it is tested without a browser; storage
//   lives in `category-storage.ts`.
// - Removing a category forgets the definition only; notes stay where they are.
// - There is always at least one category; deleting the last one re-seeds the
//   default so the popup never has nothing to clip into.

export type Category = { name: string; location: string };

export type CategoryState = { categories: Category[]; lastCategory: string };

export const defaultCategory: Category = { name: "Clippings", location: "Clippings" };

export function locationSegments(location: string): string[] {
  const segments = location
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");

  if (segments.length === 0) {
    throw new Error("Location cannot be empty");
  }

  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Location must stay inside the vault");
  }

  return segments;
}

export function normalizeCategory(category: Category): Category {
  const name = category.name.trim();

  if (!name) {
    throw new Error("Category name cannot be empty");
  }

  return { name, location: locationSegments(category.location || name).join("/") };
}

export function normalizeState(state: Partial<CategoryState> | undefined): CategoryState {
  const categories = (state?.categories ?? [])
    .map((category) => {
      try {
        return normalizeCategory(category);
      } catch {
        return null;
      }
    })
    .filter((category): category is Category => category !== null);
  const list = categories.length ? categories : [defaultCategory];
  const last = state?.lastCategory ?? "";

  return {
    categories: list,
    lastCategory: list.some((category) => category.name === last) ? last : list[0].name,
  };
}

export function addCategory(state: CategoryState, category: Category): CategoryState {
  const next = normalizeCategory(category);
  const others = state.categories.filter(
    (existing) => existing.name.localeCompare(next.name, undefined, { sensitivity: "base" }) !== 0,
  );

  return { categories: [...others, next], lastCategory: next.name };
}

export function removeCategory(state: CategoryState, name: string): CategoryState {
  return normalizeState({
    categories: state.categories.filter((category) => category.name !== name),
    lastCategory: state.lastCategory === name ? "" : state.lastCategory,
  });
}

export function selectCategory(state: CategoryState, name: string): CategoryState {
  return normalizeState({ ...state, lastCategory: name });
}

/** `clippings` always leads so the app's own clips and these sort together. */
export function parseTags(input: string): string[] {
  const tags = ["clippings"];

  for (const raw of input.split(/[\s,]+/)) {
    const tag = raw.replace(/^#+/, "").trim();

    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}
