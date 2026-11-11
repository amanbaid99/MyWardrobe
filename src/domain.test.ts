import { test } from "node:test";
import assert from "node:assert/strict";
import { suggest, duplicates, samples, type Item } from "./domain.ts";
test("recommendations only contain active inventory; complete looks use required slots", () => {
  const result = suggest(samples, "casual");
  assert.equal(result.missing.length, 0);
  assert.equal(result.items.length, 3);
  for (const i of result.items)
    assert(
      samples.some(
        (s) => s.item_id === i.item_id && s.lifecycle_status === "active",
      ),
    );
});
test("empty inventory reports every missing slot", () => {
  assert.deepEqual(suggest([], "casual").missing, ["Top", "Bottom", "Shoes"]);
});
test("archived garments cannot be recommended", () => {
  const archived = samples.map((i) => ({
    ...i,
    lifecycle_status: "archived" as const,
  }));
  assert.equal(suggest(archived, "casual").items.length, 0);
});
test("regenerate avoids immediate repeats when alternatives exist", () => {
  const first = suggest(samples, "casual");
  assert.notEqual(
    suggest(samples, "casual", first.signature).signature,
    first.signature,
  );
});
test("one-piece plus shoes counts as complete", () => {
  const dress: Item = {
    ...samples[0],
    item_id: "dress",
    category: "one_piece",
  };
  assert.equal(suggest([dress, samples[4]], "casual").missing.length, 0);
});
test("duplicate warning excludes self and archived items", () => {
  assert.equal(duplicates(samples, { ...samples[0], item_id: "" }).length, 1);
  assert.equal(duplicates(samples, samples[0]).length, 0);
});
