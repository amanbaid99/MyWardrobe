import type { SupabaseClient } from "@supabase/supabase-js";
export type EmailAuth = Pick<
  SupabaseClient["auth"],
  "signInWithOtp" | "verifyOtp"
>;
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export async function requestEmailCode(auth: EmailAuth, email: string) {
  return auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: false },
  });
}
export async function verifyEmailCode(
  auth: EmailAuth,
  email: string,
  code: string,
) {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(token))
    throw new Error("Enter the numeric code from your latest sign-in email.");
  return auth.verifyOtp({ email: normalizeEmail(email), token, type: "email" });
}
export function authMessage(message: string) {
  if (/invalid login credentials/i.test(message))
    return "That email/password combination was not accepted. If you use an email code or Google in the finance app, choose email-code sign-in here instead.";
  if (/expired|token.*invalid|otp.*invalid/i.test(message))
    return "That code is incorrect or expired. Use the latest email, or request a new code.";
  if (/rate limit|too many|security purposes/i.test(message))
    return "Please wait a minute before requesting another sign-in code.";
  return message;
}
