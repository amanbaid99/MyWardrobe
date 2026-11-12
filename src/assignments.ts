import { colours, subtypes, type Item } from "./domain.ts";
export const assignmentLabels = {
  subcategory: "Type",
  primary_colour: "Colour",
  usage_group: "Use",
  formality: "Occasion",
  pattern: "Pattern",
  sleeve_length: "Sleeves",
};
export type AssignmentField = keyof typeof assignmentLabels;
export const unassigned = (value?: string) =>
  !value?.trim() || value.trim().toLowerCase() === "unknown";
export function missingAssignments(item: Item): AssignmentField[] {
  const fields: AssignmentField[] = [
    "subcategory",
    "primary_colour",
    "usage_group",
  ];
  if (!["accessory", "fragrance"].includes(item.category))
    fields.push("formality");
  if (["top", "bottom", "one_piece", "outerwear"].includes(item.category))
    fields.push("pattern");
  if (
    item.category === "top" &&
    ["shirt", "t-shirt", "polo", "blouse", "kurta"].includes(item.subcategory)
  )
    fields.push("sleeve_length");
  return fields.filter(
    (field) =>
      unassigned(item[field]) ||
      (field === "subcategory" && ["other", "shoes"].includes(item[field])),
  );
}
export function assignmentOptions(
  field: AssignmentField,
  item: Item,
): string[] {
  switch (field) {
    case "subcategory":
      return subtypes[item.category].filter((v) => v !== "other");
    case "primary_colour":
      return Object.keys(colours).filter((v) => v !== "unknown");
    case "usage_group":
      return [
        "out",
        "everyday",
        "home",
        "gym",
        "daily",
        "walks, weekends",
        "nice plans",
        "backup",
        "gym backup",
        "errands",
      ];
    case "formality":
      return ["casual", "smart", "formal"];
    case "pattern":
      return ["solid", "striped", "checked", "other"];
    case "sleeve_length":
      return ["full", "half", "sleeveless"];
  }
}
export function selectedAssignments(
  item: Item,
  draft: Partial<Record<AssignmentField, string>>,
  selected: Set<AssignmentField>,
): Item {
  const next = { ...item };
  for (const field of missingAssignments(item)) {
    const value = draft[field];
    if (
      selected.has(field) &&
      value &&
      assignmentOptions(field, item).includes(value)
    )
      next[field] = value;
  }
  return next;
}
