import { test } from "node:test";
import assert from "node:assert/strict";
import { captureBatches } from "./captureText.ts";
test("long wardrobe descriptions are batched without losing source lines or sections", () => {
  const text =
    "MY WARDROBE\nTOPS: HOME\n" +
    Array.from({ length: 23 }, (_, i) => `- Shirt ${i + 1}`).join("\n") +
    "\nACCESSORIES\n- 7 pairs of socks";
  const batches = captureBatches(text);
  assert.equal(batches.length, 3);
  const all = batches.join("\n");
  for (let i = 1; i <= 23; i++) assert(all.includes(`[TOPS: HOME] Shirt ${i}`));
  assert(all.includes("[ACCESSORIES] 7 pairs of socks"));
});
test("grouped colours and counted garments remain intact for AI extraction", () => {
  assert.equal(
    captureBatches(
      "- 2 kurtas: pink, navy printed\n- Tees: white, blue, sage",
    )[0],
    "1. 2 kurtas: pink, navy printed\n2. Tees: white, blue, sage",
  );
});
