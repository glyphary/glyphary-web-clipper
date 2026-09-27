// Responsibilities:
// - Compose a clipping note and its file name exactly as the app's
//   `clipper.rs` does, so notes made by either look the same in a vault.
// Contracts:
// - Pure and browser-free; every rule here has a twin in Rust and the test
//   asserts the same expected output as the Rust test.
// - Extra tags are the one thing the app does not write; with the default
//   `clippings` tag alone the output is byte-identical to the app's.

export type ClippedPage = {
  title: string;
  url: string;
  author?: string;
  published?: string;
  description?: string;
  site?: string;
  markdown: string;
};

/** Double-quotes a value when YAML would otherwise misread it. */
export function yamlScalar(value: string) {
  const needsQuotes =
    value === "" ||
    value !== value.trim() ||
    value.includes(": ") ||
    value.endsWith(":") ||
    value.includes(" #") ||
    /^[-?:,\[\]{}#&*!|>'"%@`]/.test(value);

  return needsQuotes ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : value;
}

function nonEmpty(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed ? trimmed : undefined;
}

/**
 * A selection clips as a quote under the page's metadata instead of the
 * whole article, which is what someone highlighting a passage asked for.
 */
export function composeClipping(
  page: ClippedPage,
  selection: string | undefined,
  clippedOn: string,
  tags: string[] = ["clippings"],
) {
  const lines = ["---"];
  const property = (key: string, value: string | undefined) => {
    if (value !== undefined) {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  };

  property("title", page.title);
  property("source", page.url);
  property("author", nonEmpty(page.author));
  property("published", nonEmpty(page.published));
  property("site", nonEmpty(page.site));
  property("description", nonEmpty(page.description));
  property("clipped", clippedOn);
  lines.push("tags:", ...tags.map((tag) => `  - ${yamlScalar(tag)}`), "---", "");

  const quoted = nonEmpty(selection);
  const body = quoted
    ? quoted.split("\n").map((line) => `> ${line}`).join("\n")
    : page.markdown.trim();

  return `${lines.join("\n")}\n${body}\n`;
}

/** Same reduction as the app's `sanitize_markdown_file_name`. */
export function markdownFileName(title: string) {
  const base = title.split("/").pop() ?? "";
  const stem = base.replace(/\.(md|markdown)$/, "");
  let clean = "";
  let previousSpace = false;

  for (const character of stem) {
    const next = /[A-Za-z0-9._\- ]/.test(character) ? character : /\s/.test(character) ? " " : "-";

    if (next === " ") {
      if (!previousSpace) {
        clean += next;
      }
      previousSpace = true;
    } else {
      clean += next;
      previousSpace = false;
    }
  }

  clean = clean.replace(/^[.\- ]+|[.\- ]+$/g, "");

  if (!clean) {
    throw new Error("Page name cannot be empty");
  }

  return `${clean}.md`;
}

export function localDayKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function glypharyOpenUrl(vaultName: string, filePath: string) {
  const query = new URLSearchParams({ vault: vaultName, file: filePath });

  return `glyphary://open?${query.toString()}`;
}
