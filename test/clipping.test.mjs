import assert from "node:assert/strict";
import test from "node:test";
import { composeClipping, glypharyOpenUrl, markdownFileName, yamlScalar } from "../.test-dist/clipping.js";

const page = {
  title: "Why Notes Rot: A Field Guide",
  url: "https://example.com/notes/rot",
  author: "Ada Example",
  published: "2026-03-04T10:00:00Z",
  description: "Notes rot when nobody revisits them.",
  site: "Example Journal",
  markdown: "Notes rot when nobody revisits them.\n\nSecond paragraph.",
};

// The expected text is the same the Rust test in src-tauri/src/tests/clipper.rs
// asserts, so a note from the extension and one from the app are identical.
test("composes the same note as the app", () => {
  const note = composeClipping(page, undefined, "2026-09-20");

  assert.equal(
    note,
    [
      "---",
      'title: "Why Notes Rot: A Field Guide"',
      "source: https://example.com/notes/rot",
      "author: Ada Example",
      "published: 2026-03-04T10:00:00Z",
      "site: Example Journal",
      "description: Notes rot when nobody revisits them.",
      "clipped: 2026-09-20",
      "tags:",
      "  - clippings",
      "---",
      "",
      "Notes rot when nobody revisits them.",
      "",
      "Second paragraph.",
      "",
    ].join("\n"),
  );

  const quoted = composeClipping({ ...page, author: " " }, "first line\nsecond line", "2026-09-20");
  assert.ok(quoted.endsWith("---\n\n> first line\n> second line\n"));
  assert.ok(!quoted.includes("author:"));
  assert.ok(!quoted.includes("Second paragraph"));
});

test("file names and YAML scalars follow the app's rules", () => {
  assert.equal(markdownFileName("Why Notes Rot: A Field Guide"), "Why Notes Rot- A Field Guide.md");
  assert.equal(markdownFileName("a/b\\c   d.md"), "b-c d.md");
  assert.equal(markdownFileName("..-- Trim --.."), "Trim.md");
  assert.throws(() => markdownFileName("???"));
  assert.equal(yamlScalar("plain text"), "plain text");
  assert.equal(yamlScalar("a: b"), '"a: b"');
  assert.equal(yamlScalar("- dash"), '"- dash"');
  assert.equal(yamlScalar('say "hi"'), 'say "hi"');
  assert.equal(yamlScalar('"quoted"'), '"\\"quoted\\""');
  assert.equal(yamlScalar(""), '""');
  assert.equal(
    glypharyOpenUrl("Demo", "Clippings/Why Notes Rot- A Field Guide.md"),
    "glyphary://open?vault=Demo&file=Clippings%2FWhy+Notes+Rot-+A+Field+Guide.md",
  );
});
