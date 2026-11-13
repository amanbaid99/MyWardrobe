import { useEffect, useState, type FormEvent } from "react";
import { db } from "./db";
import {
  authMessage,
  normalizeEmail,
  requestEmailCode,
  verifyEmailCode,
} from "./auth";
export function EmailSignIn({
  onSignedIn,
  onPassword,
  onCreateAccount,
}: {
  onSignedIn: () => void;
  onPassword: () => void;
  onCreateAccount: () => void;
}) {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [retryAt, setRetryAt] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!retryAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [retryAt]);
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    if (Date.now() < retryAt) {
      setError("Please wait a minute before requesting another code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error } = await requestEmailCode((await db()).auth, email);
      if (error) throw error;
      setEmail(normalizeEmail(email));
      setSent(true);
      setCode("");
      setNow(Date.now());
      setRetryAt(Date.now() + 60000);
    } catch (e) {
      setError(authMessage((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await verifyEmailCode(
        (await db()).auth,
        email,
        code,
      );
      if (error) throw error;
      if (!data.session)
        throw new Error("Sign-in did not finish. Please request a new code.");
      setCode("");
      onSignedIn();
    } catch (e) {
      setError(authMessage((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="fine">
        Use the same email as your finance account. No password needed.
      </p>
      {sent ? (
        <>
          <p className="code-notice" role="status">
            Check the latest sign-in email for <b>{email}</b>. Enter its code
            here to open Wardrobe. The email’s link may open the finance app.
          </p>
          <form onSubmit={verify}>
            <label>
              Code from your email
              <input
                autoFocus
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                minLength={6}
                pattern="[0-9]{6,10}"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter your sign-in code"
              />
            </label>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Checking…" : "Verify code & sign in ↗"}
            </button>
          </form>
          <div className="auth-links">
            <button
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
                setError("");
              }}
            >
              Use a different email
            </button>
            <button
              disabled={busy || remaining > 0}
              onClick={() => void send()}
            >
              {remaining > 0 ? `Resend in ${remaining}s` : "Send a new code"}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={send}>
          <label>
            Email address
            <input
              autoFocus
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Sending…" : "Email me a sign-in code"}
          </button>
        </form>
      )}
      <div className="auth-links">
        <button disabled={busy} onClick={onPassword}>
          Use a password instead
        </button>
        <button disabled={busy} onClick={onCreateAccount}>
          Have an invitation?
        </button>
      </div>
    </>
  );
}
