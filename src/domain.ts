export const categories = [
  "top",
  "bottom",
  "one_piece",
  "shoes",
  "outerwear",
  "accessory",
  "fragrance",
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
  quantity?: number;
  usage_group?: string;
  sleeve_length?: string;
  condition?: string;
  season?: string;
  material?: string;
  garment_length?: string;
  style_tags?: string;
};
export type Preferences = {
  style: string;
  fit: string;
  climate: string;
  preferred_colours: string;
  avoided_colours: string;
  budget: string;
};
export const emptyPreferences: Preferences = {
  style: "",
  fit: "",
  climate: "",
  preferred_colours: "",
  avoided_colours: "",
  budget: "",
};
export const labels: Record<Category, string> = {
  top: "Tops",
  bottom: "Bottoms",
  one_piece: "One-pieces",
  shoes: "Shoes",
  outerwear: "Layers",
  accessory: "Accessories",
  fragrance: "Perfumes",
};
export const subtypes: Record<Category, string[]> = {
  top: [
    "t-shirt",
    "shirt",
    "polo",
    "blouse",
    "sweater",
    "hoodie",
    "kurta",
    "vest",
    "other",
  ],
  bottom: ["trousers", "jeans", "shorts", "skirt", "other"],
  one_piece: ["dress", "jumpsuit", "other"],
  shoes: [
    "sneakers",
    "loafers",
    "boots",
    "heels",
    "sandals",
    "flats",
    "slippers",
    "clogs",
    "formal-shoes",
    "other",
  ],
  outerwear: ["jacket", "blazer", "coat", "cardigan", "other"],
  accessory: [
    "belt",
    "bag",
    "scarf",
    "hat",
    "watch",
    "socks",
    "underwear",
    "handkerchief",
    "eyewear",
    "other",
  ],
  fragrance: [
    "perfume",
    "eau-de-parfum",
    "eau-de-toilette",
    "cologne",
    "body-mist",
    "other",
  ],
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
  olive: "#80815b",
  light_blue: "#9bbbd4",
  sage: "#9ba88d",
  charcoal: "#555a59",
  beige: "#d3bd98",
  gold: "#c5a344",
  silver: "#b8bfc5",
  maroon: "#753e4c",
  lilac: "#b8a2ca",
  rust: "#a66245",
  light_grey: "#b6bab8",
  pale_yellow: "#eadc9a",
  multicolour: "#a59a8c",
  unknown: "#c5c2bc",
};
export const blankItem: Item = {
  quantity: 1,
  usage_group: "unknown",
  sleeve_length: "unknown",
  condition: "unknown",
  item_id: "",
  display_name: "",
  category: "top",
  subcategory: "t-shirt",
  primary_colour: "unknown",
  pattern: "unknown",
  fit: "unknown",
  formality: "unknown",
  notes: "",
  lifecycle_status: "active",
  created_at: "",
  season: "unknown",
  material: "unknown",
  garment_length: "unknown",
  style_tags: "",
};
const clean = (s: string) => s.trim().toLowerCase();
const words = (s: string) =>
  clean(s)
    .split(/[,\s;]+/)
    .filter(Boolean);
export function canonicalSubtype(value: string) {
  const v = clean(value);
  return (
    {
      "formal shirt": "shirt",
      "casual shirt": "shirt",
      "striped shirt": "shirt",
      "polo shirt": "polo",
      "light jacket": "jacket",
      tee: "t-shirt",
      tshirt: "t-shirt",
      trainers: "sneakers",
      "formal shoes": "formal-shoes",
      crocs: "clogs",
      "boxer shorts": "shorts",
    }[v] || v
  );
}
export function duplicates(items: Item[], candidate: Partial<Item>) {
  return items.filter(
    (i) =>
      i.item_id !== candidate.item_id &&
      i.lifecycle_status === "active" &&
      i.category === candidate.category &&
      canonicalSubtype(i.subcategory) ===
        canonicalSubtype(candidate.subcategory || "") &&
      i.primary_colour === candidate.primary_colour &&
      (i.pattern === candidate.pattern ||
        i.pattern === "unknown" ||
        candidate.pattern === "unknown"),
  );
}
export function mergeItem(existing: Item, incoming: Item): Item {
  const merged = { ...existing };
  for (const key of [
    "pattern",
    "fit",
    "formality",
    "season",
    "material",
    "garment_length",
    "style_tags",
    "usage_group",
    "sleeve_length",
    "condition",
  ] as const) {
    if (!merged[key] || merged[key] === "unknown")
      (merged as unknown as Record<string, unknown>)[key] =
        incoming[key] || merged[key];
  }
  merged.notes = [existing.notes, incoming.notes]
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .join(" · ")
    .slice(0, 1000);
  return merged;
}
export type Feedback = {
  recommendation_id: string;
  item_ids: string[];
  rating: number;
  reason?: string;
  signature?: string;
};
export type Look = {
  items: Item[];
  missing: string[];
  signature: string;
  rationale: string;
  warnings: string[];
  exhausted: boolean;
  totalCandidates: number;
};
export type SuggestOptions = {
  history?: string[];
  preferences?: Preferences;
  feedback?: Feedback[];
  request?: string;
};
export const signature = (items: Item[]) =>
  items
    .map((i) => i.item_id)
    .sort()
    .join("|");
export function suggest(
  items: Item[],
  occasion: string,
  previous = "",
  options: SuggestOptions = {},
): Look {
  const prefs = options.preferences || emptyPreferences,
    feedback = options.feedback || [],
    request = clean(options.request || "");
  const avoided = words(prefs.avoided_colours),
    preferred = words(prefs.preferred_colours),
    style = words(prefs.style);
  const excluded = [
    ...request.matchAll(/(?:no|avoid|without)\s+([a-z-]+)/g),
  ].map((m) => m[1]);
  const active = items.filter((i) => i.lifecycle_status === "active");
  const allowed = active.filter(
    (i) =>
      !avoided.includes(i.primary_colour) &&
      !excluded.some((x) => x === i.subcategory || x === i.primary_colour) &&
      (occasion === "formal"
        ? i.formality === "formal"
        : occasion === "smart"
          ? ["smart", "formal"].includes(i.formality)
          : true) &&
      !(prefs.climate === "hot" && i.season === "winter") &&
      !(prefs.climate === "cold" && i.season === "summer"),
  );
  const itemScore = (i: Item) =>
    Number(i.formality === occasion) * 2 +
    Number(preferred.includes(i.primary_colour)) * 3 +
    Number(prefs.fit !== "" && i.fit === prefs.fit) * 2 +
    style.filter((s) =>
      `${i.style_tags || ""} ${i.notes}`.toLowerCase().includes(s),
    ).length +
    Number(
      request.includes(i.subcategory) || request.includes(i.primary_colour),
    ) *
      2 +
    feedback
      .filter((f) => f.item_ids.includes(i.item_id))
      .reduce((n, f) => n + f.rating * 0.2, 0);
  const group = (c: Category) =>
    allowed
      .filter((i) => i.category === c)
      .sort(
        (a, b) =>
          itemScore(b) - itemScore(a) || a.item_id.localeCompare(b.item_id),
      )
      .slice(0, 24);
  const tops = group("top"),
    bottoms = group("bottom"),
    ones = group("one_piece"),
    shoes = group("shoes");
  const bases: Item[][] = [
    ...tops.flatMap((t) => bottoms.map((b) => [t, b])),
    ...ones.map((i) => [i]),
  ];
  const partial = bases.length
    ? bases
    : [[...tops.slice(0, 1), ...bottoms.slice(0, 1)]];
  const layers = prefs.climate === "cold" ? group("outerwear").slice(0, 1) : [];
  const candidates = partial.flatMap((base) =>
    shoes.length
      ? shoes.map((s) => [...base, s, ...layers])
      : [[...base, ...layers]],
  );
  const missingFor = (look: Item[]) => {
    const missing: string[] = [];
    if (!look.some((i) => i.category === "one_piece")) {
      if (!look.some((i) => i.category === "top")) missing.push("Top");
      if (!look.some((i) => i.category === "bottom")) missing.push("Bottom");
    }
    if (!look.some((i) => i.category === "shoes")) missing.push("Shoes");
    if (
      prefs.climate === "cold" &&
      !look.some((i) => i.category === "outerwear")
    )
      missing.push("Warm layer");
    return missing;
  };
  const score = (look: Item[]) =>
    look.reduce((n, i) => n + itemScore(i), 0) +
    feedback
      .filter((f) => [...f.item_ids].sort().join("|") === signature(look))
      .reduce((n, f) => n + f.rating * 8, 0) +
    Number(new Set(look.map((i) => i.primary_colour)).size <= 3);
  candidates.sort(
    (a, b) =>
      missingFor(a).length - missingFor(b).length ||
      score(b) - score(a) ||
      signature(a).localeCompare(signature(b)),
  );
  const bestMissing = candidates.length ? missingFor(candidates[0]).length : 3;
  const pool = candidates.filter((c) => missingFor(c).length === bestMissing);
  const seen = new Set(options.history || (previous ? [previous] : []));
  const fresh = pool.find((c) => !seen.has(signature(c)));
  const chosen =
    fresh || pool.find((c) => signature(c) !== previous) || pool[0] || [];
  const warnings: string[] = [];
  if (active.length > allowed.length)
    warnings.push(
      "Pieces that conflict with this occasion, avoided colours or known climate needs were left out.",
    );
  if (chosen.some((i) => i.formality === "unknown"))
    warnings.push(
      "Some pieces have unknown formality. Review their details before wearing this look.",
    );
  if (allowed.length > 0 && chosen.length === 0)
    warnings.push(
      "Add a top or one-piece, bottoms and shoes to start an outfit.",
    );
  const missing = missingFor(chosen);
  const preferredCount = chosen.filter((i) =>
    preferred.includes(i.primary_colour),
  ).length;
  const rationale = [
    missing.length
      ? "A partial look using suitable pieces you own."
      : `A complete ${occasion} look using your active wardrobe.`,
    preferredCount ? "Your preferred colours influenced the ranking." : "",
    prefs.fit && chosen.some((i) => i.fit === prefs.fit)
      ? "Your preferred fit was prioritised."
      : "",
    style.length ? "Style tags and notes were considered." : "",
    feedback.length ? "Your past ratings influenced the order." : "",
    prefs.climate === "cold" ? "A warm layer is included when available." : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    items: chosen,
    missing,
    signature: signature(chosen),
    rationale,
    warnings,
    exhausted: !fresh && seen.size > 0,
    totalCandidates: pool.length,
  };
}
export function parseDescription(text: string): Partial<Item>[] {
  return text
    .split(/[\n;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((line) => {
      const lower = clean(line);
      let category: Category = "top",
        subcategory = "other";
      const aliases: [RegExp, Category, string][] = [
        [/\bt[ -]?shirts?\b/, "top", "t-shirt"],
        [/\bshirts?\b/, "top", "shirt"],
        [/\bpolos?\b/, "top", "polo"],
        [/\bblouses?\b/, "top", "blouse"],
        [/\bsweaters?\b/, "top", "sweater"],
        [/\bhoodies?\b/, "top", "hoodie"],
        [/\bjeans?\b/, "bottom", "jeans"],
        [/\bshorts\b/, "bottom", "shorts"],
        [/\bskirts?\b/, "bottom", "skirt"],
        [/\b(?:pants|trousers|chinos)\b/, "bottom", "trousers"],
        [/\bdress(?:es)?\b/, "one_piece", "dress"],
        [/\bjumpsuits?\b/, "one_piece", "jumpsuit"],
        [/\bsneakers?\b/, "shoes", "sneakers"],
        [/\bloafers?\b/, "shoes", "loafers"],
        [/\bboots?\b/, "shoes", "boots"],
        [/\bheels?\b/, "shoes", "heels"],
        [/\bsandals?\b/, "shoes", "sandals"],
        [/\bflats?\b/, "shoes", "flats"],
        [/\bjackets?\b/, "outerwear", "jacket"],
        [/\bblazers?\b/, "outerwear", "blazer"],
        [/\bcoats?\b/, "outerwear", "coat"],
        [/\bcardigans?\b/, "outerwear", "cardigan"],
        [/\bbelts?\b/, "accessory", "belt"],
        [/\b(?:bag|handbag)s?\b/, "accessory", "bag"],
        [/\bscar(?:f|ves)\b/, "accessory", "scarf"],
        [/\bhats?\b/, "accessory", "hat"],
        [/\bwatches?\b/, "accessory", "watch"],
      ];
      for (const [re, c, s] of aliases)
        if (re.test(lower)) {
          category = c;
          subcategory = s;
          break;
        }
      const detected = Object.keys(colours).filter(
        (c) => c !== "unknown" && new RegExp(`\\b${c}\\b`).test(lower),
      );
      const fit =
        ["relaxed", "regular", "slim", "straight", "oversized"].find((f) =>
          new RegExp(`\\b${f}\\b`).test(lower),
        ) || "unknown";
      const pattern =
        ["striped", "checked", "solid"].find((p) =>
          new RegExp(`\\b${p}\\b`).test(lower),
        ) || "unknown";
      const formality =
        ["casual", "smart", "formal"].find((f) =>
          new RegExp(`\\b${f}\\b`).test(lower),
        ) || "unknown";
      return {
        ...blankItem,
        display_name: line.slice(0, 100),
        category,
        subcategory,
        primary_colour:
          detected[0] || (lower.includes("gray") ? "grey" : "unknown"),
        fit,
        pattern,
        formality,
        notes: line.slice(0, 1000),
      };
    });
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
  ...blankItem,
  item_id: `sample-${n}`,
  display_name: a[0],
  category: a[1] as Category,
  subcategory: a[2],
  primary_colour: a[3],
  pattern: a[4],
  fit: a[5],
  formality: a[6],
  lifecycle_status: "active",
  created_at: new Date(2026, 10, 11).toISOString(),
  season: "all",
}));
