import { test, expect, vi, afterEach } from "vitest";
import handler from "../api/capture.mjs";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const response = () => {
  const r = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
  r.status.mockReturnValue(r);
  return r;
};
test("capture requires a signed-in user", async () => {
  const r = response();
  await handler({ method: "POST", headers: {}, body: {} }, r);
  expect(r.status).toHaveBeenCalledWith(401);
});
test("capture rejects missing processing consent before provider access", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  const r = response();
  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: { text: "shirt" },
    },
    r,
  );
  expect(r.status).toHaveBeenCalledWith(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("capture returns proposals without writing inventory", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("OPENROUTER_MODEL", "example/test:free");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.rpc.mockResolvedValue({ error: null });
  const proposals = [{ display_name: "Blue shirt", category: "top" }];
  const network = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: JSON.stringify({ items: proposals }) } },
        ],
      }),
    });
  vi.stubGlobal("fetch", network);
  const r = response();
  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: { text: "blue shirt", consent: true },
    },
    r,
  );
  expect(r.status).toHaveBeenCalledWith(200);
  expect(r.json).toHaveBeenCalledWith({
    items: proposals,
    model: "example/test:free",
  });
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.rpc).toHaveBeenCalledWith("wardrobe_reserve_capture");
});
