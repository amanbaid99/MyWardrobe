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
  const network = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ items: proposals }) } }],
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
test("text capture discovers text-only free models and preserves privacy on provider fallback", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("OPENROUTER_MODEL", "");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.rpc.mockResolvedValue({ error: null });
  const network = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "text/free:free",
            pricing: { prompt: "0", completion: "0" },
            architecture: { input_modalities: ["text"] },
          },
        ],
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"items":[]}' } }],
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
  const sent = JSON.parse(network.mock.calls[1][1].body);
  expect(sent.provider).toEqual({
    data_collection: "deny",
    allow_fallbacks: true,
  });
});
test("an invalid provider key produces an actionable error without exposing provider contents", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("OPENROUTER_MODEL", "example/test:free");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.rpc.mockResolvedValue({ error: null });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: "sensitive upstream details" },
        }),
      }),
  );
  const r = response();
  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: { text: "shirt", consent: true },
    },
    r,
  );
  expect(r.status).toHaveBeenCalledWith(503);
  expect(r.json.mock.calls[0][0].error).toMatch(/API key/);
  expect(r.json.mock.calls[0][0].error).not.toContain("sensitive");
});
test("a failing free model falls back once without relaxing privacy", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("OPENROUTER_MODEL", "");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.rpc.mockResolvedValue({ error: null });
  const network = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: ["first", "second"].map((n) => ({
          id: n + ":free",
          pricing: { prompt: "0", completion: "0" },
        })),
      }),
    })
    .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"items":[]}' } }],
      }),
    });
  vi.stubGlobal("fetch", network);
  const r = response();
  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: { text: "shirt", consent: true },
    },
    r,
  );
  expect(r.status).toHaveBeenCalledWith(200);
  expect(network).toHaveBeenCalledTimes(3);
  expect(
    JSON.parse(network.mock.calls[2][1].body).provider.data_collection,
  ).toBe("deny");
});
