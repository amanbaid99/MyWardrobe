import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeItem,
  suggest,
  duplicates,
  samples,
  emptyPreferences,
  parseDescription,
  type Item,
} from "./domain.ts";
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
test("regeneration reaches every available candidate before repeating", () => {
  let history: string[] = [],
    previous = "";
  for (let n = 0; n < 4; n++) {
    const look = suggest(samples, "casual", previous, { history });
    assert(!history.includes(look.signature));
    history.push(look.signature);
    previous = look.signature;
  }
  assert(suggest(samples, "casual", previous, { history }).exhausted);
});
test("formal occasion never includes casual or smart garments", () => {
  const look = suggest(samples, "formal");
  assert.equal(look.items.length, 0);
  assert.deepEqual(look.missing, ["Top", "Bottom", "Shoes"]);
});
test("avoided colours are excluded and preferred colours influence ranking", () => {
  const p = {
    ...emptyPreferences,
    avoided_colours: "cream",
    preferred_colours: "blue",
  };
  const look = suggest(samples, "casual", "", { preferences: p });
  assert(look.items.every((i) => i.primary_colour !== "cream"));
  assert(look.items.some((i) => i.primary_colour === "blue"));
});
test("a dress can outrank incomplete separates", () => {
  const dress = {
    ...samples[0],
    item_id: "dress",
    category: "one_piece" as const,
    formality: "formal",
  };
  const shoes = { ...samples[4], formality: "formal" };
  const look = suggest([dress, shoes], "formal");
  assert.equal(look.missing.length, 0);
});
test("feedback alters ranking without inventing inventory", () => {
  const first = suggest(samples, "casual");
  const look = suggest(samples, "casual", "", {
    feedback: [
      {
        recommendation_id: "r",
        item_ids: first.items.map((i) => i.item_id),
        rating: -1,
      },
    ],
  });
  assert.notEqual(look.signature, first.signature);
  assert(look.items.every((i) => samples.some((s) => s.item_id === i.item_id)));
});
test("local description capture proposes multiple editable pieces and unknown attributes", () => {
  const result = parseDescription(
    "blue striped shirt; black jeans\nwhite sneakers",
  );
  assert.equal(result.length, 3);
  assert.equal(result[0].subcategory, "shirt");
  assert.equal(result[0].primary_colour, "blue");
  assert.equal(result[1].category, "bottom");
  assert.equal(result[2].category, "shoes");
  assert.equal(result[0].formality, "unknown");
  assert.equal(result[0].material, "unknown");
});

test("merging fills unknown fields without replacing manually confirmed details or quantity", () => {
  const original = {
    ...samples[0],
    display_name: "My manually named shirt",
    fit: "Slim fit",
    quantity: 1,
    material: "unknown",
    notes: "Original note",
  };
  const incoming = {
    ...original,
    display_name: "Different generated name",
    fit: "regular",
    quantity: 3,
    material: "bamboo",
    notes: "Additional detail",
  };
  const merged = mergeItem(original, incoming);
  assert.equal(merged.display_name, original.display_name);
  assert.equal(merged.fit, "Slim fit");
  assert.equal(merged.quantity, 1);
  assert.equal(merged.material, "bamboo");
  assert.match(merged.notes, /Original note/);
});
