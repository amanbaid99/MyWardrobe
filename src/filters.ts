import { categories, type Item } from "./domain.ts";

/** Multi-select facets offered in the filter sheet. */
export const facetKeys = [
  "primary_colour",
  "usage_group",
  "season",
  "fit",
  "pattern",
  "condition",
] as const;
export type FacetKey = (typeof facetKeys)[number];
export const facetLabels: Record<FacetKey, string> = {
  primary_colour: "Colour",
  usage_group: "Worn for",
  season: "Season",
  fit: "Fit",
  pattern: "Pattern",
  condition: "Condition",
};
export const occasionOptions = [
  { value: "all", label: "All occasions" },
  { value: "casual", label: "Casual" },
  { value: "smart", label: "Smart / work" },
  { value: "formal", label: "Formal" },
  { value: "unknown", label: "Not set" },
];
export const sortOptions = [
  { value: "category", label: "Category" },
  { value: "recent", label: "Recently added" },
  { value: "name", label: "Name A–Z" },
  { value: "colour", label: "Colour" },
  { value: "occasion", label: "Occasion" },
];
export type Sort = "category" | "recent" | "name" | "colour" | "occasion";

export type Filters = {
  occasion: string;
} & Record<FacetKey, string[]>;

export const emptyFilters: Filters = {
  occasion: "all",
  primary_colour: [],
  usage_group: [],
  season: [],
  fit: [],
  pattern: [],
  condition: [],
};

const known = (v?: string) =>
  v && v.trim() ? v.trim().toLowerCase() : "unknown";
export const occasionOf = (item: Item) => known(item.formality);

/** Does a single item satisfy one facet selection? Empty selection matches all. */
function facetMatch(item: Item, key: FacetKey, selected: string[]) {
  if (!selected.length) return true;
  const value = known(item[key]);
  // An all-season piece belongs in every season.
  if (key === "season" && value === "all") return true;
  return selected.includes(value);
}

export function matchesFilters(
  item: Item,
  filters: Filters,
  ignore?: FacetKey | "occasion",
) {
  if (
    ignore !== "occasion" &&
    filters.occasion !== "all" &&
    occasionOf(item) !== filters.occasion
  )
    return false;
  return facetKeys.every(
    (key) => key === ignore || facetMatch(item, key, filters[key]),
  );
}

/** Number of active facet selections (occasion counts as one). */
export function activeFilterCount(filters: Filters) {
  return (
    Number(filters.occasion !== "all") +
    facetKeys.reduce((n, key) => n + filters[key].length, 0)
  );
}

/**
 * Option counts for a facet, computed with every *other* filter applied so the
 * numbers always show what you would get by also picking that option.
 */
export function facetCounts(items: Item[], filters: Filters, key: FacetKey) {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!matchesFilters(item, filters, key)) continue;
    const value = known(item[key]);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

export function occasionCounts(items: Item[], filters: Filters) {
  const counts = new Map<string, number>([["all", 0]]);
  for (const item of items) {
    if (!matchesFilters(item, filters, "occasion")) continue;
    counts.set("all", counts.get("all")! + 1);
    const value = occasionOf(item);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

const occasionRank: Record<string, number> = {
  casual: 0,
  smart: 1,
  formal: 2,
  unknown: 3,
};

export function sortItems(items: Item[], sort: Sort) {
  const byName = (a: Item, b: Item) =>
    a.display_name.localeCompare(b.display_name, undefined, {
      sensitivity: "base",
    });
  const list = [...items];
  switch (sort) {
    case "recent":
      return list.sort(
        (a, b) =>
          (b.created_at || "").localeCompare(a.created_at || "") ||
          byName(a, b),
      );
    case "name":
      return list.sort(byName);
    case "colour":
      return list.sort(
        (a, b) =>
          a.primary_colour.localeCompare(b.primary_colour) || byName(a, b),
      );
    case "occasion":
      return list.sort(
        (a, b) =>
          (occasionRank[occasionOf(a)] ?? 3) -
            (occasionRank[occasionOf(b)] ?? 3) || byName(a, b),
      );
    default:
      return list.sort(
        (a, b) =>
          categories.indexOf(a.category) - categories.indexOf(b.category) ||
          byName(a, b),
      );
  }
}
