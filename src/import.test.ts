import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImport, csvRows } from "./import.ts";
test("CSV supports BOM, quoted commas, escaped quotes and multiline cells", () => {
  const rows = parseImport(
    '\uFEFFdisplay_name,category,notes\r\n"Shirt, blue",top,"A ""favourite""\nshirt"',
    "csv",
  );
  assert.equal(rows[0].item.display_name, "Shirt, blue");
  assert.equal(rows[0].item.notes, 'A "favourite"\nshirt');
  assert.equal(rows[0].errors.length, 0);
});
test("JSON backup imports only item fields and strips owner and record identity", () => {
  const rows = parseImport(
    JSON.stringify({
      items: [
        {
          display_name: "Jeans",
          category: "bottom",
          item_id: "foreign",
          owner_user_id: "other",
          photo_url: "https://example.com",
        },
      ],
      preferences: { style: "ignore" },
    }),
    "json",
  );
  assert.equal(rows[0].item.item_id, "");
  assert.equal(rows[0].item.owner_user_id, undefined);
  assert.equal(
    (rows[0].item as unknown as Record<string, unknown>).photo_url,
    undefined,
  );
});
test("invalid rows remain visible with errors, rather than silently importing", () => {
  const rows = parseImport(
    '[{"display_name":"","category":"bad","primary_colour":"orange"},null]',
    "json",
  );
  assert(rows[0].errors.length >= 3);
  assert(rows[1].errors.length > 0);
});
test("malformed CSV, duplicate headers and oversized batches are rejected", () => {
  assert.throws(() => csvRows('"unclosed'), /unclosed/);
  assert.throws(
    () => parseImport("display_name,category,category\na,top,top", "csv"),
    /unique/,
  );
  assert.throws(
    () =>
      parseImport(
        JSON.stringify(Array.from({ length: 501 }, () => ({}))),
        "json",
      ),
    /500/,
  );
});

test("perfume and grouped accessory quantities survive review parsing", () => {
  const rows = parseImport(
    JSON.stringify([
      {
        display_name: "Daily socks, seven pairs",
        category: "accessory",
        subcategory: "socks",
        quantity: 7,
        usage_group: "everyday",
      },
      {
        display_name: "Evening scent",
        category: "fragrance",
        subcategory: "perfume",
        quantity: 1,
      },
    ]),
    "json",
  );
  assert.equal(rows[0].item.quantity, 7);
  assert.equal(rows[0].item.usage_group, "everyday");
  assert.equal(rows[1].errors.length, 0);
});
