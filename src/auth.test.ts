import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requestEmailCode,
  verifyEmailCode,
  authMessage,
  type EmailAuth,
} from "./auth.ts";
test("email-code sign-in normalizes identity and never creates an account", async () => {
  let request: unknown;
  const auth = {
    signInWithOtp: async (value: unknown) => {
      request = value;
      return { error: null };
    },
  } as unknown as EmailAuth;
  await requestEmailCode(auth, "  Person@Example.COM  ");
  assert.deepEqual(request, {
    email: "person@example.com",
    options: { shouldCreateUser: false },
  });
});
test("verification uses the email OTP flow and handles pasted code spacing", async () => {
  let request: unknown;
  const auth = {
    verifyOtp: async (value: unknown) => {
      request = value;
      return { data: { session: {} }, error: null };
    },
  } as unknown as EmailAuth;
  await verifyEmailCode(auth, " Person@Example.COM ", "123 456");
  assert.deepEqual(request, {
    email: "person@example.com",
    token: "123456",
    type: "email",
  });
});
test("malformed codes never reach the authentication API", async () => {
  let called = false;
  const auth = {
    verifyOtp: async () => {
      called = true;
    },
  } as unknown as EmailAuth;
  await assert.rejects(
    verifyEmailCode(auth, "person@example.com", "not-a-code"),
    /numeric code/,
  );
  assert.equal(called, false);
});
test("password errors explain the finance app sign-in distinction", () => {
  assert.match(
    authMessage("Invalid login credentials"),
    /email code or Google/,
  );
  assert.match(authMessage("Email rate limit exceeded"), /wait a minute/);
});
