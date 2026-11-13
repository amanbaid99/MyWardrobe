import { expect, test, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { blankItem } from "./domain";
import { AssignmentReview } from "./AssignmentReview";
import { missingAssignments, selectedAssignments } from "./assignments";
const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("./client", () => ({ supabase: { auth } }));
afterEach(() => vi.unstubAllGlobals());
const item = {
  ...blankItem,
  item_id: "existing-item",
  display_name: "Navy shirt",
  subcategory: "shirt",
  primary_colour: "navy",
  pattern: "other",
  material: "cotton",
};
test("missing fields are category-aware and printed patterns remain assigned", () => {
  expect(missingAssignments(item)).toEqual([
    "usage_group",
    "formality",
    "sleeve_length",
  ]);
  expect(
    missingAssignments({
      ...item,
      category: "accessory",
      subcategory: "socks",
      usage_group: "gym",
    }),
  ).toEqual([]);
});
test("only selected valid missing fields can change, preserving ID and known values", () => {
  expect(
    selectedAssignments(
      item,
      {
        primary_colour: "red",
        formality: "formal",
        usage_group: "injected-value",
      },
      new Set(["primary_colour", "formality", "usage_group"]),
    ),
  ).toEqual({ ...item, formality: "formal" });
});
test("manual assignment works without AI consent and saves only chosen details", async () => {
  const save = vi.fn().mockResolvedValue(item);
  render(<AssignmentReview item={item} onSave={save} onClose={() => {}} />);
  expect(
    (
      screen.getByRole("button", {
        name: "Suggest with AI",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Choose Occasion"), {
    target: { value: "smart" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save 1 selected detail" }),
  );
  expect(save).toHaveBeenCalledWith({ ...item, formality: "smart" });
});
test("AI requires consent, sends no identity, and leaves every suggestion unselected", async () => {
  auth.getSession.mockResolvedValue({
    data: { session: { access_token: "test-token" } },
  });
  const network = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      items: [
        {
          formality: "smart",
          usage_group: "everyday",
          primary_colour: "red",
          sleeve_length: "invalid",
        },
      ],
    }),
  });
  vi.stubGlobal("fetch", network);
  const save = vi.fn().mockResolvedValue(item);
  render(<AssignmentReview item={item} onSave={save} onClose={() => {}} />);
  fireEvent.click(screen.getByLabelText(/Send this piece/));
  fireEvent.click(screen.getByRole("button", { name: "Suggest with AI" }));
  await screen.findByRole("status");
  expect(
    (screen.getByLabelText("Apply Occasion") as HTMLInputElement).checked,
  ).toBe(false);
  expect(
    (screen.getByLabelText("Choose Sleeves") as HTMLSelectElement).value,
  ).toBe("");
  expect(save).not.toHaveBeenCalled();
  const body = JSON.parse(network.mock.calls[0][1].body);
  expect(body.task).toBe("assign");
  expect(body.text).not.toContain("existing-item");
  fireEvent.click(screen.getByLabelText("Apply Occasion"));
  fireEvent.click(
    screen.getByRole("button", { name: "Save 1 selected detail" }),
  );
  expect(save).toHaveBeenCalledWith({ ...item, formality: "smart" });
});
