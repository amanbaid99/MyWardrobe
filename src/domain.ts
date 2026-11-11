export const categories = [
  "top",
  "bottom",
  "one_piece",
  "shoes",
  "outerwear",
  "accessory",
] as const;
export type Category = (typeof categories)[number];
export type Item = {
  item_id: string;
  owner_user_id?: string;
  display_name: string;
  category: Category;
  subcategory: string;
  primary_colour: string;
  pattern: string;
  fit: string;
  formality: string;
  notes: string;
  lifecycle_status: "active" | "archived";
  created_at: string;
};
export const labels: Record<Category, string> = {
  top: "Tops",
  bottom: "Bottoms",
  one_piece: "One-pieces",
  shoes: "Shoes",
  outerwear: "Layers",
  accessory: "Accessories",
};
export const colours: Record<string, string> = {
  cream: "#e6dcc9",
  white: "#faf9f4",
  black: "#303332",
  navy: "#343f56",
  blue: "#6386a3",
  green: "#7b8867",
  brown: "#927258",
  grey: "#979b9a",
  pink: "#d5a4a4",
  red: "#ab534c",
  yellow: "#d4b967",
  purple: "#9683aa",
  unknown: "#c5c2bc",
};
export function duplicates(items: Item[], candidate: Partial<Item>) {
  return items.filter(
    (i) =>
      i.item_id !== candidate.item_id &&
      i.lifecycle_status === "active" &&
      i.category === candidate.category &&
      i.subcategory.toLowerCase() === candidate.subcategory?.toLowerCase() &&
      i.primary_colour === candidate.primary_colour &&
      i.pattern === candidate.pattern,
  );
}
export type Look = { items: Item[]; missing: string[]; signature: string };
export function suggest(items: Item[], occasion: string, previous = ""): Look {
  const active = items.filter((i) => i.lifecycle_status === "active");
  const rank = (a: Item, b: Item) =>
    Number(b.formality === occasion) - Number(a.formality === occasion) ||
    a.item_id.localeCompare(b.item_id);
  const group = (c: Category) =>
    active.filter((i) => i.category === c).sort(rank);
  const tops = group("top"),
    bottoms = group("bottom"),
    ones = group("one_piece"),
    shoes = group("shoes");
  const bases: Item[][] = [
    ...tops.flatMap((t) => bottoms.map((b) => [t, b])),
    ...ones.map((i) => [i]),
  ];
  const looks = (
    bases.length ? bases : [[...tops.slice(0, 1), ...bottoms.slice(0, 1)]]
  ).flatMap((base) => (shoes.length ? shoes.map((s) => [...base, s]) : [base]));
  const signature = (a: Item[]) =>
    a
      .map((i) => i.item_id)
      .sort()
      .join("|");
  const chosen = looks.find((l) => signature(l) !== previous) || looks[0] || [];
  const missing: string[] = [];
  if (!chosen.some((i) => i.category === "one_piece")) {
    if (!chosen.some((i) => i.category === "top")) missing.push("Top");
    if (!chosen.some((i) => i.category === "bottom")) missing.push("Bottom");
  }
  if (!chosen.some((i) => i.category === "shoes")) missing.push("Shoes");
  return { items: chosen, missing, signature: signature(chosen) };
}
export const samples: Item[] = [
  ["Oxford shirt", "top", "shirt", "blue", "solid", "regular", "smart"],
  ["Everyday tee", "top", "t-shirt", "cream", "solid", "relaxed", "casual"],
  [
    "Straight-leg denim",
    "bottom",
    "jeans",
    "navy",
    "solid",
    "straight",
    "casual",
  ],
  [
    "Weekend chinos",
    "bottom",
    "trousers",
    "brown",
    "solid",
    "straight",
    "smart",
  ],
  [
    "Court sneakers",
    "shoes",
    "sneakers",
    "white",
    "solid",
    "regular",
    "casual",
  ],
  [
    "The linen layer",
    "outerwear",
    "jacket",
    "green",
    "solid",
    "relaxed",
    "casual",
  ],
].map((a, n) => ({
  item_id: `sample-${n}`,
  display_name: a[0],
  category: a[1] as Category,
  subcategory: a[2],
  primary_colour: a[3],
  pattern: a[4],
  fit: a[5],
  formality: a[6],
  notes: "",
  lifecycle_status: "active",
  created_at: new Date(2026, 10, 11).toISOString(),
}));
