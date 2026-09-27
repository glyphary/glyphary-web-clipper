import assert from "node:assert/strict";
import test from "node:test";
import {
  addCategory,
  defaultCategory,
  locationSegments,
  normalizeState,
  parseTags,
  removeCategory,
  selectCategory,
} from "../.test-dist/categories.js";
import { composeClipping } from "../.test-dist/clipping.js";

test("categories seed a default, add, select, and forget without going empty", () => {
  const seeded = normalizeState(undefined);
  assert.deepEqual(seeded, { categories: [defaultCategory], lastCategory: "Clippings" });

  const added = addCategory(seeded, { name: " Research ", location: "" });
  assert.deepEqual(added.categories, [defaultCategory, { name: "Research", location: "Research" }]);
  assert.equal(added.lastCategory, "Research");

  const replaced = addCategory(added, { name: "research", location: "Notes/Web/" });
  assert.deepEqual(replaced.categories, [defaultCategory, { name: "research", location: "Notes/Web" }]);

  const selected = selectCategory(replaced, "Clippings");
  assert.equal(selected.lastCategory, "Clippings");
  assert.equal(selectCategory(replaced, "nope").lastCategory, "Clippings");

  const forgotten = removeCategory(replaced, "Clippings");
  assert.deepEqual(forgotten.categories, [{ name: "research", location: "Notes/Web" }]);
  assert.equal(forgotten.lastCategory, "research");
  assert.deepEqual(removeCategory(forgotten, "research"), seeded);

  assert.throws(() => addCategory(seeded, { name: "", location: "x" }), /name/);
  assert.throws(() => locationSegments("../out"), /inside the vault/);
  assert.throws(() => locationSegments(" / "), /empty/);
  assert.deepEqual(locationSegments("Research\\Web//Clips"), ["Research", "Web", "Clips"]);
  assert.deepEqual(normalizeState({ categories: [{ name: "Bad", location: ".." }] }), seeded);
});

test("tags parse loosely and land in the frontmatter after clippings", () => {
  assert.deepEqual(parseTags(""), ["clippings"]);
  assert.deepEqual(parseTags(" #reading, ai  ml/notes clippings "), ["clippings", "reading", "ai", "ml/notes"]);

  const note = composeClipping(
    { title: "T", url: "https://x.test", markdown: "body" },
    undefined,
    "2026-09-20",
    parseTags("reading, -draft"),
  );
  assert.ok(note.includes('\ntags:\n  - clippings\n  - reading\n  - "-draft"\n---\n\nbody\n'));
});
