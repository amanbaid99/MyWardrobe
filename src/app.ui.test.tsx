import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "./main";
import { OutfitStudio } from "./OutfitStudio";
import { EmailSignIn } from "./EmailSignIn";
import { emptyPreferences, samples } from "./domain";
const api = vi.hoisted(() => ({
  rpc: vi.fn(),
  session: vi.fn(),
  otp: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("./client", () => ({
  supabase: {
    rpc: api.rpc,
    auth: {
      getSession: api.session,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      signInWithOtp: api.otp,
      verifyOtp: api.verify,
    },
  },
}));
beforeEach(() => {
  api.session.mockResolvedValue({ data: { session: null }, error: null });
  api.rpc.mockResolvedValue({
    data: {
      access: true,
      items: [],
      feedback: [],
      preferences: emptyPreferences,
    },
    error: null,
  });
  api.otp.mockResolvedValue({ error: null });
});
test("sample wardrobe uses distinct empty-category state and exposes selected filter", async () => {
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Explore a sample wardrobe" }),
  );
  await screen.findByRole("heading", { name: /My wardrobe/ });
  const filter = screen.getByRole("button", { name: /^One-pieces/ });
  fireEvent.click(filter);
  expect(filter.getAttribute("aria-pressed")).toBe("true");
  expect(
    screen.getByRole("heading", { name: "No one-pieces yet" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
});
test("failed bootstrap shows retry instead of claiming the account needs an invitation", async () => {
  api.session.mockResolvedValue({
    data: { session: { user: { id: "test-user" } } },
    error: null,
  });
  api.rpc.mockResolvedValue({
    data: null,
    error: { message: "Network unavailable" },
  });
  render(<App />);
  expect(
    await screen.findByRole("heading", {
      name: "We couldn’t load your wardrobe.",
    }),
  ).toBeTruthy();
  expect(screen.queryByText(/access hasn’t been enabled/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(api.rpc).toHaveBeenCalledTimes(2));
});
test("the outfit is a single coordinated canvas with clickable pieces, not a card grid", async () => {
  const record = vi.fn().mockResolvedValue("rec");
  const edit = vi.fn();
  render(
    <OutfitStudio
      items={samples}
      preferences={emptyPreferences}
      feedback={[]}
      onRecord={record}
      onRate={vi.fn()}
      onEdit={edit}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Style a look" }));
  const canvas = await screen.findByLabelText(
    "Coordinated outfit arranged from top to shoes",
  );
  expect(canvas.className).toBe("outfit-flatlay");
  expect(canvas.querySelectorAll("button.outfit-piece").length).toBe(3);
  fireEvent.click(canvas.querySelector("button")!);
  expect(edit).toHaveBeenCalled();
  expect(record).toHaveBeenCalledTimes(1);
});
test("OTP resend displays and enforces the cooldown immediately after requesting a code", async () => {
  render(
    <EmailSignIn
      onSignedIn={vi.fn()}
      onPassword={vi.fn()}
      onCreateAccount={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
    target: { value: "person@example.com" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Email me a sign-in code" }),
  );
  const resend = await screen.findByRole("button", { name: /Resend in 60s/ });
  expect((resend as HTMLButtonElement).disabled).toBe(true);
  expect(api.otp).toHaveBeenCalledTimes(1);
});
test("edited garment needs discard confirmation and retains the draft when declined", async () => {
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Explore a sample wardrobe" }),
  );
  await screen.findByRole("heading", { name: /My wardrobe/ });
  fireEvent.click(screen.getByRole("button", { name: "Add a piece" }));
  fireEvent.click(screen.getByRole("button", { name: /Add manually/ }));
  fireEvent.change(screen.getByRole("textbox", { name: "Piece name" }), {
    target: { value: "Unsaved favourite" },
  });
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole("button", { name: "Close item editor" }));
  expect(
    (screen.getByRole("textbox", { name: "Piece name" }) as HTMLInputElement)
      .value,
  ).toBe("Unsaved favourite");
});
test("AI capture requires consent and explicit selection before any garment is saved", async () => {
  const { BulkImport } = await import("./BulkImport");
  api.session.mockResolvedValue({
    data: { session: { access_token: "test-token" } },
    error: null,
  });
  const save = vi
    .fn()
    .mockImplementation(async (item) => ({ ...item, item_id: "saved" }));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            display_name: "Blue shirt",
            category: "top",
            subcategory: "shirt",
            primary_colour: "blue",
          },
        ],
      }),
    }),
  );
  render(<BulkImport items={samples} onSave={save} onClose={vi.fn()} />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Describe your clothes" }),
    { target: { value: "a blue shirt" } },
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Analyse and review garments",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /I agree to send/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Analyse and review garments" }),
  );
  await screen.findByDisplayValue("Blue shirt");
  expect(save).not.toHaveBeenCalled();
  const selected = screen.getByRole("checkbox", {
    name: "Select row 1",
  }) as HTMLInputElement;
  expect(selected.checked).toBe(false);
  fireEvent.click(selected);
  fireEvent.click(
    screen.getByRole("button", { name: "Save 1 confirmed pieces" }),
  );
  await screen.findByText("Saved");
  expect(save).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});
test("garment cards open read-only details before editing", async () => {
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Explore a sample wardrobe" }),
  );
  await screen.findByRole("heading", { name: /My wardrobe/ });
  fireEvent.click(screen.getByRole("button", { name: /Oxford shirt/ }));
  expect(screen.getByRole("dialog", { name: "Oxford shirt" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Piece name" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Edit piece" }));
  expect(screen.getByRole("textbox", { name: "Piece name" })).toBeTruthy();
});

test("capture can explicitly merge a duplicate without creating a new record", async () => {
  const { BulkImport } = await import("./BulkImport");
  api.session.mockResolvedValue({
    data: { session: { access_token: "test-token" } },
    error: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ ...samples[0], item_id: undefined, material: "cotton" }],
      }),
    }),
  );
  const save = vi.fn().mockResolvedValue(samples[0]);
  render(<BulkImport items={samples} onSave={save} onClose={vi.fn()} />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Describe your clothes" }),
    { target: { value: "blue shirt" } },
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /I agree to send/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "Analyse and review garments" }),
  );
  await screen.findByDisplayValue(samples[0].display_name);
  fireEvent.change(
    screen.getByRole("combobox", { name: /Possible duplicate/ }),
    { target: { value: samples[0].item_id } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save 1 confirmed pieces" }),
  );
  await screen.findByText("Saved");
  expect(save.mock.calls[0][0].item_id).toBe(samples[0].item_id);
  expect(save.mock.calls[0][0].display_name).toBe(samples[0].display_name);
  expect(save.mock.calls[0][0].material).toBe("cotton");
  vi.unstubAllGlobals();
});

test("inventory highlights missing assignments and opens the review from its filter", async () => {
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Explore a sample wardrobe" }),
  );
  await screen.findByRole("heading", { name: /My wardrobe/ });
  fireEvent.click(screen.getByRole("button", { name: "Review pieces" }));
  expect(screen.getAllByText(/Needs details ·/).length).toBeGreaterThan(0);
  fireEvent.click(
    screen.getAllByRole("button", { name: /^Assign details/ })[0],
  );
  expect(
    screen.getByRole("dialog", { name: "Assign missing details" }),
  ).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: "Save 0 selected details",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

test("sample mode add sheet offers manual entry and keeps AI capture behind sign-in", async () => {
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Explore a sample wardrobe" }),
  );
  await screen.findByRole("heading", { name: /My wardrobe/ });
  fireEvent.click(screen.getByRole("button", { name: "Add a piece" }));
  const sheet = screen.getByRole("dialog", { name: "Add to your wardrobe" });
  expect(sheet).toBeTruthy();
  expect(
    (
      screen.getByRole("button", {
        name: /Snap or describe/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(
    (screen.getByRole("button", { name: /Add manually/ }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});
