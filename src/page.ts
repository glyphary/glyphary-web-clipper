// Responsibilities:
// - Run Defuddle inside the active tab and bring back a serializable result.
// Contracts:
// - `extractInPage` is serialized by chrome.scripting and executed in the page,
//   so it must be self-contained: no imports, no closures over this module.

import type { ClippedPage } from "./clipping";

export type PageExtraction = ClippedPage & { selection: string };

function extractInPage(): PageExtraction {
  type DefuddleResult = {
    content: string;
    title: string;
    author: string;
    published: string;
    description: string;
    site: string;
    domain: string;
  };
  type DefuddleClass = new (document: Document, options: { url: string }) => { parse(): DefuddleResult };
  const page = globalThis as unknown as {
    GlypharyDefuddle: DefuddleClass;
    GlypharyDefuddleMarkdown: (html: string, url: string) => string;
  };
  const result = new page.GlypharyDefuddle(document, { url: location.href }).parse();

  return {
    title: result.title || document.title || location.href,
    url: location.href,
    author: result.author,
    published: result.published,
    description: result.description,
    site: result.site || result.domain,
    markdown: page.GlypharyDefuddleMarkdown(result.content, location.href),
    selection: String(getSelection() ?? ""),
  };
}

export async function extractActivePage(tabId: number) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["defuddle-global.js"] });

  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: extractInPage });

  if (!injection?.result) {
    throw new Error("Could not read this page");
  }

  return injection.result as PageExtraction;
}

export async function readSelection(tabId: number) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => String(getSelection() ?? ""),
  });

  return (injection?.result as string | undefined)?.trim() ?? "";
}
