import {
  type CategoryState,
  addCategory,
  locationSegments,
  parseTags,
  removeCategory,
  selectCategory,
} from "./categories";
import { loadCategories, loadOpenInApp, saveCategories, saveOpenInApp } from "./storage";
import { composeClipping, glypharyOpenUrl, localDayKey, markdownFileName } from "./clipping";
import { extractActivePage, readSelection } from "./page";
import { chooseVaultFolder, ensureWritable, loadVaultHandle, writeClipping } from "./vault";

// Responsibilities:
// - The toolbar popup: pick the vault folder the first time, pick or define a
//   category, add tags, and run the clip from a click so the folder
//   permission prompt is allowed.
// Contracts:
// - The whole clip runs while the popup is open; closing it mid-write aborts
//   the write, so the status line reports each step.

const NEW_CATEGORY = "__new__";

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = element<HTMLParagraphElement>("status");
const clipPage = element<HTMLButtonElement>("clip-page");
const clipSelection = element<HTMLButtonElement>("clip-selection");
const chooseVault = element<HTMLButtonElement>("choose-vault");
const vaultName = element<HTMLParagraphElement>("vault-name");
const pageTitle = element<HTMLHeadingElement>("page-title");
const clipForm = element<HTMLDivElement>("clip-form");
const categorySelect = element<HTMLSelectElement>("category");
const removeCategoryButton = element<HTMLButtonElement>("remove-category");
const newCategory = element<HTMLDivElement>("new-category");
const newCategoryName = element<HTMLInputElement>("new-category-name");
const newCategoryLocation = element<HTMLInputElement>("new-category-location");
const saveCategoryButton = element<HTMLButtonElement>("save-category");
const cancelCategoryButton = element<HTMLButtonElement>("cancel-category");
const tagsInput = element<HTMLInputElement>("tags");
const openInApp = element<HTMLInputElement>("open-in-app");

let vault: FileSystemDirectoryHandle | undefined;
let tab: chrome.tabs.Tab | undefined;
let categories: CategoryState = { categories: [], lastCategory: "" };

function report(message: string) {
  status.textContent = message;
}

function currentCategory() {
  return categories.categories.find((category) => category.name === categories.lastCategory);
}

function renderCategories() {
  categorySelect.replaceChildren(
    ...categories.categories.map((category) => {
      const option = document.createElement("option");

      option.value = category.name;
      option.textContent = `${category.name} (${category.location}/)`;
      option.selected = category.name === categories.lastCategory;

      return option;
    }),
    new Option("New category...", NEW_CATEGORY),
  );
}

function render() {
  const ready = Boolean(vault && tab?.id);

  vaultName.textContent = vault ? `Vault: ${vault.name}` : "Choose the vault folder to clip into.";
  chooseVault.hidden = Boolean(vault);
  clipForm.hidden = !vault;
  clipPage.disabled = !ready;
  clipSelection.disabled = !ready;
  renderCategories();
}

function showNewCategory(show: boolean) {
  newCategory.hidden = !show;

  if (show) {
    newCategoryName.value = "";
    newCategoryLocation.value = "";
    newCategoryName.focus();
  } else {
    renderCategories();
  }
}

async function persist(next: CategoryState) {
  categories = next;
  await saveCategories(next);
  renderCategories();
}

async function clip(useSelection: boolean) {
  const category = currentCategory();

  if (!vault || !tab?.id || !category) {
    return;
  }

  clipPage.disabled = true;
  clipSelection.disabled = true;

  try {
    if (!(await ensureWritable(vault))) {
      report("Glyphary needs permission to write to the vault folder.");
      return;
    }

    report("Reading page...");
    const page = await extractActivePage(tab.id);
    const note = composeClipping(
      page,
      useSelection ? page.selection : undefined,
      localDayKey(new Date()),
      parseTags(tagsInput.value),
    );

    report("Saving...");
    const relativePath = await writeClipping(
      vault,
      locationSegments(category.location),
      markdownFileName(page.title),
      note,
    );

    report(`Saved ${relativePath}`);

    // The note is already saved, so a failed hand-off loses nothing. The
    // browser keeps the page in place and asks once before opening the scheme.
    if (openInApp.checked) {
      await chrome.tabs.update(tab.id, { url: glypharyOpenUrl(vault.name, relativePath) });
    }
  } catch (error) {
    report(error instanceof Error ? error.message : String(error));
  } finally {
    render();
  }
}

async function start() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pageTitle.textContent = tab?.title || "Clip to Glyphary";
  pageTitle.title = tab?.url ?? "";

  try {
    vault = await loadVaultHandle();
  } catch {
    vault = undefined;
  }

  categories = await loadCategories();
  openInApp.checked = await loadOpenInApp();
  render();

  if (tab?.id) {
    try {
      clipSelection.hidden = !(await readSelection(tab.id));
    } catch {
      // Browser-internal pages refuse scripts; the clip button reports it.
    }
  }
}

chooseVault.addEventListener("click", async () => {
  try {
    vault = await chooseVaultFolder();
    render();
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      report(error instanceof Error ? error.message : String(error));
    }
  }
});

categorySelect.addEventListener("change", () => {
  if (categorySelect.value === NEW_CATEGORY) {
    showNewCategory(true);
    return;
  }

  void persist(selectCategory(categories, categorySelect.value));
});

// The folder follows the name until the user edits the folder themselves.
newCategoryName.addEventListener("input", () => {
  if (!newCategoryLocation.dataset.edited) {
    newCategoryLocation.value = newCategoryName.value;
  }
});
newCategoryLocation.addEventListener("input", () => {
  newCategoryLocation.dataset.edited = "true";
});

saveCategoryButton.addEventListener("click", async () => {
  try {
    await persist(
      addCategory(categories, { name: newCategoryName.value, location: newCategoryLocation.value }),
    );
    delete newCategoryLocation.dataset.edited;
    showNewCategory(false);
    report("");
  } catch (error) {
    report(error instanceof Error ? error.message : String(error));
  }
});
cancelCategoryButton.addEventListener("click", () => {
  delete newCategoryLocation.dataset.edited;
  showNewCategory(false);
});

removeCategoryButton.addEventListener("click", () => {
  const category = currentCategory();

  if (!category) {
    return;
  }

  void persist(removeCategory(categories, category.name));
  report(`Forgot category ${category.name}; its notes were left in place.`);
});

openInApp.addEventListener("change", () => void saveOpenInApp(openInApp.checked));
clipPage.addEventListener("click", () => void clip(false));
clipSelection.addEventListener("click", () => void clip(true));

void start();
