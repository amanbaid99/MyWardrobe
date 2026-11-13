import { test } from "node:test";
import assert from "node:assert/strict";
import { demoWardrobe, type Item } from "./domain.ts";
import {
  activeFilterCount,
  emptyFilters,
  facetCounts,
  matchesFilters,
  occasionCounts,
  sortItems,
} from "./filters.ts";

const visible = (filters: typeof emptyFilters) =>
  demoWardrobe.filter((i) => matchesFilters(i, filters));

test("occasion filter shows only that formality", () => {
  for (const occasion of ["casual", "smart", "formal"]) {
    const shown = visible({ ...emptyFilters, occasion });
    assert(shown.length > 0);
    assert(shown.every((i) => i.formality === occasion));
  }
  assert.equal(visible(emptyFilters).length, demoWardrobe.length);
});

test("occasion counts add up and respect other filters", () => {
  const counts = occasionCounts(demoWardrobe, emptyFilters);
  assert.equal(
    counts.get("all"),
    (counts.get("casual") || 0) +
      (counts.get("smart") || 0) +
      (counts.get("formal") || 0) +
      (counts.get("unknown") || 0),
  );
  const navyOnly = occasionCounts(demoWardrobe, {
    ...emptyFilters,
    primary_colour: ["navy"],
  });
  assert.equal(
    navyOnly.get("all"),
    demoWardrobe.filter((i) => i.primary_colour === "navy").length,
  );
});

test("missing formality counts as not set", () => {
  const item = { ...demoWardrobe[0], formality: "" } as Item;
  assert(matchesFilters(item, { ...emptyFilters, occasion: "unknown" }));
});

test("multi-select facets combine with OR inside a facet and AND across facets", () => {
  const shown = visible({
    ...emptyFilters,
    primary_colour: ["navy", "white"],
    occasion: "formal",
  });
  assert(shown.length > 0);
  assert(
    shown.every(
      (i) =>
        ["navy", "white"].includes(i.primary_colour) &&
        i.formality === "formal",
    ),
  );
  assert.equal(
    activeFilterCount({
      ...emptyFilters,
      primary_colour: ["navy", "white"],
      occasion: "formal",
    }),
    3,
  );
});

test("all-season pieces appear under any season", () => {
  const summer = visible({ ...emptyFilters, season: ["summer"] });
  assert.equal(
    summer.length,
    demoWardrobe.filter((i) => i.season === "all").length,
  );
});

test("facet counts ignore their own selection", () => {
  const counts = facetCounts(
    demoWardrobe,
    { ...emptyFilters, primary_colour: ["navy"] },
    "primary_colour",
  );
  assert(counts.get("white")! > 0);
});

test("sorting is stable and category order follows the wardrobe sections", () => {
  const byCategory = sortItems(demoWardrobe, "category");
  assert.equal(byCategory[0].category, "top");
  assert.equal(byCategory.at(-1)!.category, "accessory");
  const byName = sortItems(demoWardrobe, "name").map((i) => i.display_name);
  assert.deepEqual(
    byName,
    [...byName].sort((a, b) => a.localeCompare(b)),
  );
  const byOccasion = sortItems(demoWardrobe, "occasion");
  assert.equal(byOccasion[0].formality, "casual");
});
