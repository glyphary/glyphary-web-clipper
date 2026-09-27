import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// The browser builds of Defuddle ignore its `markdown` option, so the
// extension calls this converter itself. This locks that the converter is
// reachable and produces Markdown, not HTML.
test("Defuddle's converter turns extracted HTML into Markdown", () => {
  const { createMarkdownContent } = require("../node_modules/defuddle/dist/markdown.js");
  const markdown = createMarkdownContent(
    '<h1>Title</h1><p>Body with <strong>bold</strong> and a <a href="https://x.test/a">link</a>.</p><pre><code class="language-rust">fn main() {}</code></pre>',
    "https://x.test/page",
  );

  // The leading H1 is dropped on purpose: the title lives in frontmatter.
  assert.ok(!markdown.includes("Title"));
  assert.ok(markdown.includes("**bold**"));
  assert.ok(markdown.includes("[link](https://x.test/a)"));
  assert.ok(markdown.includes("```\nfn main() {}\n```"));
  assert.ok(!markdown.includes("<"));
});
