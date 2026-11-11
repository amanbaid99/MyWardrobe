import { blankItem, categories, colours, type Item } from "./domain.ts";
export type ImportRow = { line: number; item: Item; errors: string[] };
export const importTemplate =
  "display_name,category,subcategory,primary_colour,pattern,fit,formality,lifecycle_status\nBlue Oxford shirt,top,shirt,blue,solid,regular,smart,active\nBlack jeans,bottom,jeans,black,solid,straight,casual,active\n";
export function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let n = 0; n < text.length; n++) {
    const c = text[n];
    if (c === '"') {
      if (quoted && text[n + 1] === '"') {
        value += '"';
        n++;
      } else if (!quoted && value.length)
        throw new Error("Unexpected quote in CSV. Quote the entire cell.");
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[n + 1] === "\n") n++;
      row.push(value);
      if (row.some((s) => s.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quote.");
  row.push(value);
  if (row.some((s) => s.trim())) rows.push(row);
  return rows;
}
const fields = [
  "display_name",
  "category",
  "subcategory",
  "primary_colour",
  "pattern",
  "fit",
  "formality",
  "notes",
  "lifecycle_status",
  "season",
  "material",
  "garment_length",
  "style_tags",
] as const;
export function validateImport(item: Item) {
  const errors: string[] = [];
  if (!item.display_name.trim() || item.display_name.length > 100)
    errors.push("Name must contain 1–100 characters");
  if (!(categories as readonly string[]).includes(item.category))
    errors.push("Choose a valid category");
  if (!item.subcategory.trim() || item.subcategory.length > 60)
    errors.push("Type must contain 1–60 characters");
  if (!Object.keys(colours).includes(item.primary_colour))
    errors.push("Choose a supported colour");
  if (
    !["solid", "striped", "checked", "other", "unknown"].includes(item.pattern)
  )
    errors.push("Invalid pattern");
  if (!["casual", "smart", "formal", "unknown"].includes(item.formality))
    errors.push("Invalid formality");
  if (!["active", "archived"].includes(item.lifecycle_status))
    errors.push("Status must be active or archived");
  if (
    !["unknown", "all", "summer", "winter", "spring", "autumn"].includes(
      item.season || "unknown",
    )
  )
    errors.push("Invalid season");
  for (const [key, limit] of [
    ["fit", 60],
    ["material", 60],
    ["garment_length", 60],
    ["style_tags", 200],
    ["notes", 1000],
  ] as const)
    if ((item[key] || "").length > limit)
      errors.push(`${key} exceeds ${limit} characters`);
  return errors;
}
export function parseImport(text: string, format: "csv" | "json"): ImportRow[] {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw new Error("Choose a file under 2 MB.");
  let records: unknown[];
  let start = 1;
  if (format === "json") {
    const parsed = JSON.parse(text);
    records = Array.isArray(parsed) ? parsed : parsed?.items;
    if (!Array.isArray(records))
      throw new Error(
        "JSON must be an array of garments or a Wardrobe export with an items array.",
      );
  } else {
    const rows = csvRows(text.replace(/^\uFEFF/, ""));
    if (!rows.length) throw new Error("The file is empty.");
    const headers = rows.shift()!.map((h) => h.trim().toLowerCase());
    if (new Set(headers).size !== headers.length)
      throw new Error("CSV headers must be unique.");
    if (!headers.includes("display_name") || !headers.includes("category"))
      throw new Error(
        "CSV requires display_name and category headers. Download the template for an example.",
      );
    records = rows.map((row) => {
      if (row.length !== headers.length) return null;
      return Object.fromEntries(headers.map((h, i) => [h, row[i]]));
    });
    start = 2;
  }
  if (!records.length) throw new Error("No garments found.");
  if (records.length > 500)
    throw new Error("Import up to 500 garments per file.");
  return records.map((record, index) => {
    const item = { ...blankItem, subcategory: "other" };
    const errors: string[] = [];
    if (!record || typeof record !== "object" || Array.isArray(record))
      errors.push("Row must be a garment object with matching CSV columns");
    else
      for (const key of fields) {
        const value = (record as Record<string, unknown>)[key];
        if (value == null || value === "") continue;
        if (typeof value !== "string") {
          errors.push(`${key} must be text`);
          continue;
        }
        (item as unknown as Record<string, string>)[key] = [
          "display_name",
          "notes",
        ].includes(key)
          ? value.trim()
          : value.trim().toLowerCase();
      }
    if (!record || !(record as Record<string, unknown>).category)
      item.category = "" as Item["category"];
    if (item.primary_colour === "gray") item.primary_colour = "grey";
    return {
      line: index + start,
      item,
      errors: [...errors, ...validateImport(item)],
    };
  });
}
