// Injected into the page ahead of the extraction call, which looks these up by
// global name because chrome.scripting cannot pass module imports.
//
// Defuddle's `markdown` option is applied only by its Node entry point; the
// browser builds return HTML regardless. Its Turndown-based converter is still
// shipped in the package but not in its `exports` map, so it is reached by a
// relative path, which both esbuild and tsc resolve without the map.
import Defuddle from "defuddle/full";
import { createMarkdownContent } from "../node_modules/defuddle/dist/markdown.js";

const page = globalThis as unknown as {
  GlypharyDefuddle: typeof Defuddle;
  GlypharyDefuddleMarkdown: typeof createMarkdownContent;
};

page.GlypharyDefuddle = Defuddle;
page.GlypharyDefuddleMarkdown = createMarkdownContent;
