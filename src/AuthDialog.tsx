import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "./client";
import { EmailSignIn } from "./EmailSignIn";
import { authMessage, normalizeEmail } from "./auth";
import { Icon } from "./Icon";

export type AuthMode = "login" | "password" | "reset" | "signup" | "update";

export function AuthDialog({
  open,
  mode,
  onMode,
  onClose,
  onSignedIn,
  onNotice,
}: {
  open: boolean;
  mode: AuthMode;
  onMode: (mode: AuthMode) => void;
  onClose: () => void;
  onSignedIn: () => void;
  onNotice: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
    setError("");
  }, [open]);
  useEffect(() => setError(""), [mode]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      email = normalizeEmail(String(f.get("email") || "")),
      password = String(f.get("password") || "");
    setBusy(true);
    setError("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin,
        });
        if (error) throw error;
        onNotice("If an account exists, check your inbox for a reset link.");
        onClose();
      } else if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        onClose();
        onNotice("Password updated for your shared account.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin },
        });
        if (error) throw error;
        onNotice(
          "Check your email to verify your account. Signup requires an existing invitation.",
        );
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSignedIn();
      }
    } catch (e) {
      setError(authMessage((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="sheet auth-modal"
      onCancel={onClose}
      aria-labelledby="auth-title"
    >
      <div className="sheet-head">
        <div>
          <h2 id="auth-title">
            {mode === "reset"
              ? "Reset your password"
              : mode === "signup"
                ? "Create your account"
                : mode === "update"
                  ? "Choose a new password"
                  : "Welcome back"}
          </h2>
          <p className="muted">
            {mode === "update"
              ? "This updates the password shared with your tracker account."
              : "Your tracker account works here too."}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close sign in"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="sheet-body stack">
        {mode === "login" ? (
          <EmailSignIn
            key={String(open)}
            onSignedIn={onSignedIn}
            onPassword={() => onMode("password")}
            onCreateAccount={() => onMode("signup")}
          />
        ) : (
          <>
            <form className="stack" onSubmit={submit}>
              {mode !== "update" && (
                <label>
                  Email address
                  <input
                    autoFocus
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
              )}
              {mode !== "reset" && (
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    minLength={mode === "password" ? 1 : 8}
                    autoComplete={
                      mode === "password" ? "current-password" : "new-password"
                    }
                    required
                  />
                </label>
              )}
              {error && (
                <p className="alert" role="alert">
                  {error}
                </p>
              )}
              <button className="primary wide" disabled={busy}>
                {busy
                  ? "One moment…"
                  : mode === "reset"
                    ? "Send reset link"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "update"
                        ? "Update password"
                        : "Sign in"}
              </button>
            </form>
            <div className="auth-links">
              <button type="button" onClick={() => onMode("login")}>
                Sign in with an email code
              </button>
              {mode === "password" && (
                <button type="button" onClick={() => onMode("reset")}>
                  Forgot password?
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
