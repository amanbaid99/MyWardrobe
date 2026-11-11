import React, { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import {
  categories,
  colours,
  duplicates,
  labels,
  samples,
  type Category,
  type Item,
} from "./domain";
import { Garment } from "./Garment";
import { Icon } from "./Icon";
import { OutfitStudio } from "./OutfitStudio";
import { Privacy } from "./Privacy";
import {
  blankItem,
  emptyPreferences,
  subtypes,
  parseDescription,
  type Feedback,
  type Look,
} from "./domain";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/libre-caslon-display/latin-400.css";
import { EmailSignIn } from "./EmailSignIn";
import { authMessage, normalizeEmail } from "./auth";
import "./style.css";
const blank = blankItem;
export function App() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [demo, setDemo] = useState(false),
    [items, setItems] = useState<Item[]>([]),
    [page, setPageState] = useState(() => location.hash.slice(1) || "wardrobe"),
    [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [archive, setArchive] = useState(false),
    [editor, setEditor] = useState<Item | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [authOpen, setAuthOpen] = useState(false),
    [authMode, setAuthMode] = useState("login"),
    [access, setAccess] = useState(false),
    [loadState, setLoadState] = useState<
      "idle" | "loading" | "ready" | "error"
    >("idle"),
    [loadVersion, reload] = useState(0),
    [loadError, setLoadError] = useState(""),
    [feedback, setFeedback] = useState<Feedback[]>([]),
    [textEntry, setTextEntry] = useState(false),
    [starterHidden, setStarterHidden] = useState(false),
    [description, setDescription] = useState(""),
    [candidates, setCandidates] = useState<{ key: string; item: Item }[]>([]),
    [candidateKey, setCandidateKey] = useState(""),
    [savedPrefs, setSavedPrefs] = useState(emptyPreferences),
    [online, setOnline] = useState(navigator.onLine),
    [confirmAction, setConfirmAction] = useState<"delete" | "clear" | null>(
      null,
    ),
    [confirmText, setConfirmText] = useState(""),
    [prefs, setPrefs] = useState({
      style: "",
      fit: "",
      climate: "",
      preferred_colours: "",
      avoided_colours: "",
      budget: "",
    });
  const epoch = useRef(0);
  const draftOwner = useRef<string | null>(null);
  const navigationGuard = useRef({ dirty: false, page: "wardrobe" });
  const editorInitial = useRef("");
  const actionDialog = useRef<HTMLDialogElement>(null);
  const openEditor = (item: Item, key = "") => {
    setCandidateKey(key);
    setError("");
    editorInitial.current = JSON.stringify(item);
    setEditor({ ...item });
  };
  const editorDirty =
    !!editor && JSON.stringify(editor) !== editorInitial.current;
  const preferencesDirty = JSON.stringify(prefs) !== JSON.stringify(savedPrefs);
  navigationGuard.current = { dirty: preferencesDirty || editorDirty, page };
  function closeEditor() {
    if (busy) return;
    if (editorDirty && !confirm("Discard your unsaved changes to this piece?"))
      return;
    setEditor(null);
  }
  function setPage(next: string) {
    if (
      (preferencesDirty || editorDirty) &&
      !confirm("Leave this page and discard unsaved changes?")
    )
      return;
    if (preferencesDirty) setPrefs(savedPrefs);
    setEditor(null);
    navigationGuard.current.dirty = false;
    location.hash = next;
  }
  useEffect(() => {
    const navigate = () => {
      const next = location.hash.slice(1) || "wardrobe";
      if (
        next !== navigationGuard.current.page &&
        navigationGuard.current.dirty &&
        !confirm("Discard unsaved changes and leave this page?")
      ) {
        history.replaceState(null, "", `#${navigationGuard.current.page}`);
        return;
      }
      setPageState(
        ["wardrobe", "outfits", "preferences", "privacy"].includes(next)
          ? next
          : "wardrobe",
      );
    };
    window.addEventListener("hashchange", navigate);
    navigate();
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (editorDirty || preferencesDirty || description || candidates.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [editorDirty, preferencesDirty, description, candidates.length]);
  useEffect(() => {
    if (confirmAction) actionDialog.current?.showModal();
    else actionDialog.current?.close();
    setConfirmText("");
  }, [confirmAction]);
  const live = !!session && !demo;
  const dialog = useRef<HTMLDialogElement>(null);
  const authDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setSession(data.session);
        setReady(true);
      })
      .catch(() => {
        setError(
          "Could not restore your sign-in session. Please sign in again.",
        );
        setReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("update");
        setAuthOpen(true);
      }
      if (event === "SIGNED_OUT") {
        epoch.current++;
        setItems([]);
        setAccess(false);
        setFeedback([]);
        setBusy(false);
        setLoadState("idle");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const n = ++epoch.current;
    setItems([]);
    setFeedback([]);
    setAccess(false);
    setLoadError("");
    const owner = demo ? "demo" : session?.user.id;
    const preserve = !!owner && draftOwner.current === owner;
    if (owner && draftOwner.current !== owner) {
      setEditor(null);
      setPrefs(emptyPreferences);
      setSavedPrefs(emptyPreferences);
      setCandidates([]);
      setDescription("");
      draftOwner.current = owner;
    }
    if (demo) {
      setItems(samples.map((i) => ({ ...i })));
      setAccess(true);
      setLoadState("ready");
      return;
    }
    if (!session) {
      setLoadState("idle");
      return;
    }
    setLoadState("loading");
    Promise.resolve(supabase.rpc("wardrobe_bootstrap"))
      .then(({ data, error }) => {
        if (n !== epoch.current) return;
        if (error) throw error;
        setAccess(data.access);
        setItems(data.items || []);
        setFeedback(data.feedback || []);
        const loaded = { ...emptyPreferences, ...data.preferences };
        if (!preserve || !navigationGuard.current.dirty) setPrefs(loaded);
        setSavedPrefs(loaded);
        setLoadState("ready");
      })
      .catch((e) => {
        if (n !== epoch.current) return;
        setLoadError(e.message || "Could not load your wardrobe.");
        setLoadState("error");
      });
    return () => {
      epoch.current++;
    };
  }, [session?.user.id, demo, loadVersion]);
  useEffect(() => {
    if (editor) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editor]);
  useEffect(() => {
    if (authOpen) authDialog.current?.showModal();
    else authDialog.current?.close();
  }, [authOpen]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    if (!demo && (!session || !access)) {
      setError("Sign in again to save. Your draft is still open.");
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }
    const savingEpoch = epoch.current;
    setBusy(true);
    setError("");
    try {
      let saved: Item;
      if (demo)
        saved = {
          ...editor,
          item_id: editor.item_id || crypto.randomUUID(),
          created_at: editor.created_at || new Date().toISOString(),
        };
      else {
        const { data, error } = await supabase.rpc("wardrobe_save_item", {
          payload: editor,
        });
        if (error) throw error;
        saved = data;
      }
      if (savingEpoch !== epoch.current) return;
      setArchive(saved.lifecycle_status === "archived");
      setCategory("all");
      setQuery("");
      setCandidates((p) => p.filter((c) => c.key !== candidateKey));
      setItems((prev) => [
        saved,
        ...prev.filter((i) => i.item_id !== saved.item_id),
      ]);
      setEditor(null);

      setNotice("Your wardrobe is up to date.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!editor) return;
    setBusy(true);
    try {
      if (live) {
        const { error } = await supabase.rpc("wardrobe_delete_item", {
          target_id: editor.item_id,
        });
        if (error) throw error;
      }
      setItems((p) => p.filter((i) => i.item_id !== editor.item_id));

      setEditor(null);
      setConfirmAction(null);
      setNotice("Item deleted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function auth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      email = normalizeEmail(String(f.get("email") || "")),
      password = String(f.get("password") || "");
    setBusy(true);
    setError("");
    try {
      if (authMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin,
        });
        if (error) throw error;
        setNotice("If an account exists, check your inbox for a reset link.");
        setAuthOpen(false);
      } else if (authMode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setAuthOpen(false);
        setNotice("Password updated for your shared account.");
      } else if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin },
        });
        if (error) throw error;
        setNotice(
          "Check your email to verify your account. Signup requires an existing invitation.",
        );
        setAuthOpen(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setDemo(false);
        setAuthOpen(false);
      }
    } catch (e) {
      setError(authMessage((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function savePrefs(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (live) {
        const { error } = await supabase.rpc("wardrobe_save_preferences", {
          payload: prefs,
        });
        if (error) throw error;
      }
      setSavedPrefs({ ...prefs });
      setNotice(
        demo
          ? "Preview preferences updated for this session."
          : "Preferences saved.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    let recommendations: unknown[] = [];
    let exportedFeedback = feedback;
    if (live) {
      const { data, error } = await supabase.rpc("wardrobe_export_data");
      if (error) {
        setError("Export failed. Please try again.");
        return;
      }
      recommendations = data.recommendations || [];
      exportedFeedback = data.feedback || [];
    }
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            items,
            preferences: savedPrefs,
            feedback: exportedFeedback,
            recommendations,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "my-wardrobe.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function recordLook(look: Look, occasion: string, id: string) {
    if (demo) return id;
    const { data, error } = await supabase.rpc(
      "wardrobe_record_recommendation",
      {
        request_id: id,
        owned_ids: look.items.map((i) => i.item_id),
        selected_occasion: occasion,
        explanation: look.rationale,
        missing_slots: look.missing,
      },
    );
    if (error)
      throw new Error(
        "Could not validate and save this look. Please reload your wardrobe and try again.",
      );
    if (JSON.stringify(data.missing_slots) !== JSON.stringify(look.missing))
      throw new Error(
        "Your preferences changed. Reload your wardrobe before styling again.",
      );
    return data.recommendation_id as string;
  }
  async function rateLook(
    id: string,
    rating: number,
    reason: string,
    look: Look,
  ) {
    if (live) {
      const { error } = await supabase.rpc("wardrobe_rate_recommendation", {
        target_id: id,
        rating_value: rating,
        reason_text: reason,
      });
      if (error) throw error;
    }
    setFeedback((p) => [
      {
        recommendation_id: id,
        item_ids: look.items.map((i) => i.item_id),
        rating,
        reason,
      },
      ...p.filter((f) => f.recommendation_id !== id),
    ]);
  }
  async function clearWardrobe() {
    if (confirmText !== "DELETE WARDROBE") return;
    setBusy(true);
    setError("");
    try {
      if (live) {
        const { error } = await supabase.rpc("wardrobe_clear_data");
        if (error) throw error;
      }
      setItems([]);
      setFeedback([]);
      setPrefs(emptyPreferences);
      setSavedPrefs(emptyPreferences);
      setCandidates([]);
      setDescription("");
      setConfirmAction(null);
      setNotice(
        "Wardrobe data cleared. Your finance records and sign-in account are unchanged.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const active = items.filter((i) => i.lifecycle_status === "active");
  const filtered = items.filter(
    (i) =>
      (archive
        ? i.lifecycle_status === "archived"
        : i.lifecycle_status === "active") &&
      (category === "all" || i.category === category) &&
      `${i.display_name} ${i.subcategory} ${i.primary_colour} ${i.notes}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const showWorkspace = demo || live;
  const dup = editor ? duplicates(items, editor) : [];
  return (
    <>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("wardrobe");
          }}
        >
          <span className="brandmark">w.</span>wardrobe
          <span className="branddot">®</span>
        </a>
        <div className="side-label">YOUR EVERYDAY, REIMAGINED</div>
        <nav>
          {[
            ["wardrobe", "My wardrobe"],
            ["outfits", "Outfit studio"],
            ["preferences", "My preferences"],
            ["privacy", "Privacy"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={page === id ? "nav active" : "nav"}
              aria-current={page === id ? "page" : undefined}
              onClick={() => {
                if (!showWorkspace && id !== "privacy") {
                  setAuthMode("login");
                  setAuthOpen(true);
                  return;
                }
                setPage(id);
              }}
            >
              <Icon name={id} />
              {label}
              {id === "wardrobe" && (
                <small>{showWorkspace ? active.length : "—"}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <span>
            Considered clothes.
            <br />
            Effortless mornings.
          </span>
          <p>
            A wardrobe that feels
            <br />a little more like you.
          </p>
          <div className="line-art">✧</div>
        </div>
        <div className="side-bottom">
          <span className="avatar">{demo ? "P" : session ? "Y" : "W"}</span>
          <div>
            <b>
              {demo
                ? "Preview wardrobe"
                : session
                  ? "Your private space"
                  : "Make yourself at home"}
            </b>
            <small>
              {demo
                ? "Sample items · not saved"
                : session
                  ? "Connected to your account"
                  : "A place for your favourites"}
            </small>
          </div>
        </div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <span>LESS GUESSWORK. MORE GOOD OUTFITS.</span>
          <div className="top-actions">
            {demo && <span className="pill">Preview mode</span>}
            <span className="private-label">◈ Private by design</span>
            {live ? (
              <button
                className="text-button"
                onClick={async () => {
                  if (
                    (editorDirty ||
                      preferencesDirty ||
                      description ||
                      candidates.length) &&
                    !confirm("Sign out and discard unsaved changes?")
                  )
                    return;
                  setEditor(null);
                  setPrefs(emptyPreferences);
                  setSavedPrefs(emptyPreferences);
                  setCandidates([]);
                  setDescription("");
                  draftOwner.current = null;
                  const { error } = await supabase.auth.signOut({
                    scope: "local",
                  });
                  if (error) setError(error.message);
                }}
              >
                Sign out
              </button>
            ) : (
              <button
                className="text-button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
              >
                Sign in <Icon name="arrow" />
              </button>
            )}
          </div>
        </header>
        <main>
          {error && (
            <div className="alert" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              ✓ {notice}
            </div>
          )}
          {!online && (
            <div className="offline-banner" role="status">
              You’re offline. You can review loaded pieces, but saving and
              sign-in need a connection.
            </div>
          )}
          {page === "privacy" ? (
            <Privacy />
          ) : !showWorkspace ? (
            <>
              <section className="welcome">
                <p className="eyebrow">A HOME FOR WHAT YOU WEAR</p>
                <h1>
                  Good outfits begin
                  <br />
                  with <em>what you own.</em>
                </h1>
                <p className="intro">
                  Meet your wardrobe, all over again. Keep your favourite pieces
                  in one place and make getting dressed feel effortless.
                </p>
                <div className="welcome-actions">
                  <button
                    className="primary"
                    disabled={!ready}
                    onClick={() => {
                      setAuthMode("login");
                      setAuthOpen(true);
                    }}
                  >
                    Open my wardrobe <Icon name="arrow" />
                  </button>
                  <button className="secondary" onClick={() => setDemo(true)}>
                    Explore a sample wardrobe
                  </button>
                </div>
                <p className="fine">
                  Use your existing tracker account. Your wardrobe stays
                  private.
                </p>
              </section>
              <section className="welcome-shelf">
                {[samples[0], samples[2], samples[4]].map((i, n) => (
                  <div key={i.item_id} className={`shelf-piece shelf-${n}`}>
                    <span className="piece-no">
                      0{n + 1} / THE EVERYDAY EDIT
                    </span>
                    <Garment item={i} />
                    <div>
                      <b>{i.display_name}</b>
                      <small>
                        {labels[i.category]} · {i.primary_colour}
                      </small>
                    </div>
                  </div>
                ))}
              </section>
              <div className="welcome-footer">
                <span>YOUR CLOTHES. NEW POSSIBILITIES.</span>
                <p>
                  No endless feeds. Just pieces you love,
                  <br />
                  and a little help putting them together.
                </p>
                <span>✧</span>
              </div>
            </>
          ) : loadState === "loading" ? (
            <section className="empty" role="status">
              <h2>Opening your wardrobe…</h2>
              <p>Your collection is on its way.</p>
            </section>
          ) : loadState === "error" ? (
            <section className="empty">
              <h2>We couldn’t load your wardrobe.</h2>
              <p role="alert">{loadError}</p>
              <button className="primary" onClick={() => reload((v) => v + 1)}>
                Try again
              </button>
            </section>
          ) : !access ? (
            <section className="empty">
              <h1>Your account is ready.</h1>
              <p>
                Wardrobe access hasn’t been enabled for this account yet. Ask
                the owner for an invitation.
              </p>
            </section>
          ) : (
            <>
              {demo && (
                <div className="preview-banner">
                  You’re exploring sample clothes. Changes last for this session
                  only.
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthOpen(true);
                    }}
                  >
                    Use my account ↗
                  </button>
                </div>
              )}
              {page === "wardrobe" && (
                <>
                  <section className="page-heading">
                    <div>
                      <p className="eyebrow">YOUR PERSONAL COLLECTION</p>
                      <h1>
                        My wardrobe<span className="heading-dot">.</span>
                      </h1>
                      <p>
                        A little less “nothing to wear”. A little more
                        possibility.
                      </p>
                    </div>
                    <button
                      className="primary"
                      disabled={busy || !access || !online}
                      onClick={() => openEditor({ ...blank })}
                    >
                      <Icon name="plus" /> Add a piece
                    </button>
                  </section>
                  <section className="collection-summary">
                    <div>
                      <strong>
                        {active.length.toString().padStart(2, "0")}
                      </strong>
                      <span>pieces, all yours</span>
                    </div>
                    <div>
                      <strong>
                        {new Set(active.map((i) => i.category)).size
                          .toString()
                          .padStart(2, "0")}
                      </strong>
                      <span>categories</span>
                    </div>
                    <p>
                      Buy thoughtfully.
                      <br />
                      <em>Wear what you love.</em>
                    </p>
                    <span className="summary-star">✧</span>
                  </section>
                  {active.length < 10 && !starterHidden && (
                    <section className="starter-guide">
                      <div>
                        <b>
                          {active.length
                            ? `${active.length} of 10 starter pieces`
                            : "Start with your everyday favourites"}
                        </b>
                        <p>
                          Add a few tops, bottoms and shoes. More suitable
                          pieces give you more outfit choices.
                        </p>
                        <progress
                          max="10"
                          value={Math.min(active.length, 10)}
                          aria-label="Starter wardrobe progress"
                        />
                      </div>
                      <div>
                        <button
                          className="secondary"
                          onClick={() => {
                            setTextEntry((v) => !v);
                          }}
                        >
                          Describe pieces
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setStarterHidden(true)}
                        >
                          Dismiss checklist
                        </button>
                      </div>
                    </section>
                  )}
                  <div className="capture-actions">
                    <button
                      className="text-button"
                      onClick={() => setTextEntry((v) => !v)}
                    >
                      Add from a description
                    </button>
                    <span className="fine">
                      Photos are coming later. No images are uploaded.
                    </span>
                  </div>
                  {textEntry && (
                    <section className="text-capture">
                      <h2>Describe what you own</h2>
                      <p>
                        One piece per line, or separate with semicolons (up to
                        20 at a time). We recognise common garments, colours and
                        fit words locally; review every suggestion before
                        saving.
                      </p>
                      <label>
                        Your descriptions
                        <textarea
                          value={description}
                          maxLength={10000}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={
                            "Blue striped regular shirt\nBlack casual straight jeans; white sneakers"
                          }
                        />
                      </label>
                      <button
                        className="secondary"
                        disabled={!description.trim()}
                        onClick={() => {
                          if (
                            description.split(/[\n;]/).filter((t) => t.trim())
                              .length > 20
                          ) {
                            setError(
                              "Please review up to 20 descriptions at a time. Your text is still here.",
                            );
                            return;
                          }
                          setError("");
                          setCandidates((p) => [
                            ...p,
                            ...parseDescription(description).map((i) => ({
                              key: crypto.randomUUID(),
                              item: { ...blank, ...i },
                            })),
                          ]);
                          setDescription("");
                        }}
                      >
                        Review suggested pieces
                      </button>
                      {candidates.length > 0 && (
                        <ul className="candidate-list">
                          {candidates.map((c) => (
                            <li key={c.key}>
                              <div>
                                <b>{c.item.display_name}</b>
                                <small>
                                  {c.item.primary_colour} · {c.item.subcategory}{" "}
                                  · not saved yet
                                </small>
                              </div>
                              <button
                                className="secondary"
                                onClick={() => openEditor(c.item, c.key)}
                              >
                                Review
                              </button>
                              <button
                                className="text-button"
                                aria-label={`Remove ${c.item.display_name} suggestion`}
                                onClick={() =>
                                  setCandidates((p) =>
                                    p.filter((i) => i.key !== c.key),
                                  )
                                }
                              >
                                <Icon name="close" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                  <section className="collection-tools">
                    <div className="tabs" aria-label="Filter by category">
                      {["all", ...categories].map((c) => (
                        <button
                          key={c}
                          className={category === c ? "selected" : ""}
                          aria-pressed={category === c}
                          onClick={() => setCategory(c)}
                        >
                          {c === "all" ? "All pieces" : labels[c as Category]}{" "}
                          <small>
                            {
                              (archive
                                ? items.filter(
                                    (i) => i.lifecycle_status === "archived",
                                  )
                                : active
                              ).filter((i) => c === "all" || i.category === c)
                                .length
                            }
                          </small>
                        </button>
                      ))}
                    </div>
                    <div className="search-row">
                      <label className="search">
                        <Icon name="search" />
                        <input
                          aria-label="Search your wardrobe"
                          placeholder="Find a favourite…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <label className="archive-toggle">
                        <input
                          type="checkbox"
                          checked={archive}
                          onChange={(e) => setArchive(e.target.checked)}
                        />
                        Archived
                      </label>
                      <button className="text-button" onClick={exportData}>
                        <Icon name="download" /> Export
                      </button>
                    </div>
                  </section>
                  <div className="grid-caption">
                    <span>
                      {filtered.length} {archive ? "ARCHIVED" : "EVERYDAY"}{" "}
                      PIECES
                    </span>
                    <span>Made for your real life</span>
                  </div>
                  {busy && !items.length ? (
                    <div className="empty" role="status">
                      Opening your wardrobe…
                    </div>
                  ) : filtered.length ? (
                    <section className="garment-grid">
                      {filtered.map((item, n) => (
                        <button
                          className="garment-card"
                          key={item.item_id}
                          onClick={() => {
                            setError("");
                            openEditor({ ...item });
                          }}
                        >
                          <div className={`garment-canvas tone-${n % 4}`}>
                            <span className="category-tag">
                              {labels[item.category]}
                            </span>
                            <span className="card-arrow">
                              <Icon name="edit" />
                            </span>
                            <Garment item={item} />
                          </div>
                          <div className="card-info">
                            <h2>{item.display_name}</h2>
                            <p>
                              <span
                                className="swatch"
                                style={{
                                  background: colours[item.primary_colour],
                                }}
                              />
                              {item.primary_colour} <span>·</span>{" "}
                              {item.subcategory}
                            </p>
                          </div>
                        </button>
                      ))}
                      <button
                        className="add-card"
                        onClick={() => openEditor({ ...blank })}
                      >
                        <span>＋</span>
                        <b>Room for a favourite</b>
                        <small>Add something you love to wear</small>
                      </button>
                    </section>
                  ) : (
                    <section className="empty">
                      <div className="empty-icon">♧</div>
                      <h2>
                        {query.trim()
                          ? "No matching pieces"
                          : archive
                            ? "Nothing archived"
                            : category !== "all"
                              ? `No ${labels[category as Category].toLowerCase()} yet`
                              : "Your wardrobe starts with one piece."}
                      </h2>
                      <p>
                        {query.trim() || category !== "all"
                          ? "Try another colour, name or category, or clear your filters."
                          : "Add a few everyday favourites. You can build from there."}
                      </p>
                      {(query.trim() || category !== "all") && (
                        <button
                          className="secondary"
                          onClick={() => {
                            setQuery("");
                            setCategory("all");
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                      {!archive && !query.trim() && (
                        <button
                          className="primary"
                          onClick={() => openEditor({ ...blank })}
                        >
                          Add your first piece ＋
                        </button>
                      )}
                    </section>
                  )}
                  <footer className="page-footer">
                    <span>
                      Install Wardrobe from your browser menu for quick access.
                      Online connection required.
                    </span>
                    <span>WARDROBE / THE PERSONAL EDIT</span>
                  </footer>
                </>
              )}
              {page === "outfits" && (
                <OutfitStudio
                  items={items}
                  preferences={savedPrefs}
                  feedback={feedback}
                  onEdit={openEditor}
                  onRecord={recordLook}
                  onRate={rateLook}
                />
              )}
              {page === "preferences" && (
                <>
                  <section className="page-heading">
                    <div>
                      <p className="eyebrow">MAKE IT FEEL LIKE YOU</p>
                      <h1>
                        My preferences<span className="heading-dot">.</span>
                      </h1>
                      <p>All optional. Always yours to change.</p>
                    </div>
                  </section>
                  <form className="preferences" onSubmit={savePrefs}>
                    {Object.entries({
                      style: "Style notes",
                      fit: "Preferred fit",
                      climate: "Your usual climate",
                      preferred_colours: "Colours you love",
                      avoided_colours: "Colours you avoid",
                      budget: "Shopping budget (include currency)",
                    }).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        {key === "climate" || key === "fit" ? (
                          <select
                            value={prefs[key as "climate" | "fit"]}
                            onChange={(e) =>
                              setPrefs({ ...prefs, [key]: e.target.value })
                            }
                          >
                            <option value="">No preference</option>
                            {(key === "climate"
                              ? ["hot", "mild", "cold"]
                              : [
                                  "regular",
                                  "relaxed",
                                  "slim",
                                  "straight",
                                  "oversized",
                                ]
                            ).map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                            {prefs[key as "climate" | "fit"] &&
                              !(
                                key === "climate"
                                  ? ["hot", "mild", "cold"]
                                  : [
                                      "regular",
                                      "relaxed",
                                      "slim",
                                      "straight",
                                      "oversized",
                                    ]
                              ).includes(prefs[key as "climate" | "fit"]) && (
                                <option value={prefs[key as "climate" | "fit"]}>
                                  {prefs[key as "climate" | "fit"]}
                                </option>
                              )}
                          </select>
                        ) : (
                          <input
                            maxLength={500}
                            value={prefs[key as keyof typeof prefs]}
                            onChange={(e) =>
                              setPrefs({ ...prefs, [key]: e.target.value })
                            }
                            placeholder={
                              key === "avoided_colours"
                                ? "e.g. red, yellow (excluded from looks)"
                                : key === "preferred_colours"
                                  ? "e.g. blue, cream"
                                  : "Make it your own…"
                            }
                          />
                        )}
                      </label>
                    ))}
                    <button className="primary" disabled={busy}>
                      Save preferences ↗
                    </button>
                    <p className="fine">
                      Preferred colours, fit, style words and known climate
                      needs influence outfit ranking. Avoided colours are
                      excluded. Budget is saved for future shopping suggestions;
                      it does not affect owned outfits.
                    </p>
                  </form>
                  <section className="account-tools">
                    <h2>Your Wardrobe data</h2>
                    <p>
                      Export or clear only Wardrobe data. Your finance records
                      and shared sign-in identity are preserved.
                    </p>
                    <button className="secondary" onClick={exportData}>
                      <Icon name="download" /> Export all Wardrobe data
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        setError("");
                        setConfirmAction("clear");
                      }}
                    >
                      Clear Wardrobe data
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setPage("privacy")}
                    >
                      Read the privacy notice
                    </button>
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="item-editor-title"
        onCancel={(e) => {
          e.preventDefault();
          closeEditor();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) closeEditor();
        }}
      >
        {editor && (
          <form onSubmit={save}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">YOUR WARDROBE, ONE PIECE AT A TIME</p>
                <h2 id="item-editor-title">
                  {editor.item_id
                    ? "The finer details"
                    : "Meet your next favourite."}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close item editor"
                className="close"
                disabled={busy}
                onClick={closeEditor}
              >
                ×
              </button>
            </div>
            <div className="editor-body">
              <div className="editor-preview">
                <Garment item={editor} />
                <span>Illustrated from your details</span>
              </div>
              <div className="fields">
                <label>
                  Piece name
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    value={editor.display_name}
                    onChange={(e) =>
                      setEditor({ ...editor, display_name: e.target.value })
                    }
                    placeholder="e.g. My favourite linen shirt"
                  />
                </label>
                <div className="field-pair">
                  <label>
                    Category
                    <select
                      value={editor.category}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          category: e.target.value as Category,
                          subcategory:
                            {
                              top: "t-shirt",
                              bottom: "trousers",
                              one_piece: "dress",
                              shoes: "sneakers",
                              outerwear: "jacket",
                              accessory: "belt",
                            }[e.target.value] || "other",
                        })
                      }
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {labels[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Type
                    <select
                      value={
                        subtypes[editor.category].includes(editor.subcategory)
                          ? editor.subcategory
                          : "other"
                      }
                      onChange={(e) =>
                        setEditor({ ...editor, subcategory: e.target.value })
                      }
                    >
                      {subtypes[editor.category].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Primary colour
                  <select
                    value={editor.primary_colour}
                    onChange={(e) =>
                      setEditor({ ...editor, primary_colour: e.target.value })
                    }
                  >
                    {Object.keys(colours).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <div className="field-pair">
                  <label>
                    Pattern
                    <select
                      value={editor.pattern}
                      onChange={(e) =>
                        setEditor({ ...editor, pattern: e.target.value })
                      }
                    >
                      {["solid", "striped", "checked", "other", "unknown"].map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Formality
                    <select
                      value={editor.formality}
                      onChange={(e) =>
                        setEditor({ ...editor, formality: e.target.value })
                      }
                    >
                      {["casual", "smart", "formal", "unknown"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Fit
                  <input
                    maxLength={60}
                    value={editor.fit}
                    onChange={(e) =>
                      setEditor({ ...editor, fit: e.target.value })
                    }
                  />
                </label>
                <details className="item-optional">
                  <summary>
                    More details <span className="optional">Optional</span>
                  </summary>
                  <label>
                    Season
                    <select
                      value={editor.season || "unknown"}
                      onChange={(e) =>
                        setEditor({ ...editor, season: e.target.value })
                      }
                    >
                      {[
                        "unknown",
                        "all",
                        "summer",
                        "winter",
                        "spring",
                        "autumn",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Style tags
                    <input
                      maxLength={200}
                      value={editor.style_tags || ""}
                      placeholder="e.g. minimal, vintage"
                      onChange={(e) =>
                        setEditor({ ...editor, style_tags: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Material (only if known)
                    <input
                      maxLength={60}
                      value={editor.material || "unknown"}
                      onChange={(e) =>
                        setEditor({ ...editor, material: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Garment length
                    <input
                      maxLength={60}
                      value={editor.garment_length || "unknown"}
                      onChange={(e) =>
                        setEditor({ ...editor, garment_length: e.target.value })
                      }
                    />
                  </label>
                </details>
                <label>
                  Notes
                  <textarea
                    maxLength={1000}
                    value={editor.notes}
                    onChange={(e) =>
                      setEditor({ ...editor, notes: e.target.value })
                    }
                    placeholder="Anything that makes this piece yours"
                  />
                </label>
                {editor.item_id && (
                  <label>
                    Status
                    <select
                      value={editor.lifecycle_status}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          lifecycle_status: e.target
                            .value as Item["lifecycle_status"],
                        })
                      }
                    >
                      <option value="active">In my wardrobe</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                )}
              </div>
            </div>
            {dup.length > 0 && (
              <p className="missing">
                Looks similar to {dup.map((i) => i.display_name).join(", ")}.
                You can still save it.
              </p>
            )}
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            <div className="modal-footer">
              {editor.item_id && (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    setEditor({
                      ...editor,
                      lifecycle_status:
                        editor.lifecycle_status === "active"
                          ? "archived"
                          : "active",
                    })
                  }
                >
                  <Icon name="archive" />
                  {editor.lifecycle_status === "active"
                    ? "Mark archived"
                    : "Restore piece"}
                </button>
              )}
              {editor.item_id && (
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setConfirmAction("delete");
                  }}
                >
                  Delete piece
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save piece ↗"}
              </button>
            </div>
            <p className="fine">
              Manual capture · No photos uploaded or stored.
            </p>
          </form>
        )}
      </dialog>
      <dialog
        ref={actionDialog}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setConfirmAction(null);
        }}
      >
        <h2 id="confirm-title">
          {confirmAction === "clear"
            ? "Clear your Wardrobe data?"
            : "Permanently delete this piece?"}
        </h2>
        <p>
          {confirmAction === "clear"
            ? "This removes your Wardrobe pieces, preferences, recommendations and feedback. Finance records, your sign-in account and membership stay unchanged. Export first if you need a copy."
            : `“${editor?.display_name || "This piece"}” will be deleted permanently. You can archive it instead to keep it for later.`}
        </p>
        {confirmAction === "clear" && (
          <label>
            Type DELETE WARDROBE to confirm
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setConfirmAction(null)}
          >
            Keep my data
          </button>
          <button
            className="primary danger-fill"
            disabled={
              busy ||
              (confirmAction === "clear" && confirmText !== "DELETE WARDROBE")
            }
            onClick={() =>
              confirmAction === "clear" ? clearWardrobe() : remove()
            }
          >
            {busy
              ? "Working…"
              : confirmAction === "clear"
                ? "Clear Wardrobe data"
                : "Delete permanently"}
          </button>
        </div>
      </dialog>
      <dialog
        ref={authDialog}
        className="auth-modal"
        onCancel={() => setAuthOpen(false)}
        aria-labelledby="auth-title"
      >
        <button
          className="close"
          aria-label="Close sign in"
          onClick={() => setAuthOpen(false)}
        >
          ×
        </button>
        <p className="eyebrow">YOUR PRIVATE SPACE</p>
        <h2 id="auth-title">
          {authMode === "reset"
            ? "A fresh start."
            : authMode === "signup"
              ? "Make yourself at home."
              : authMode === "update"
                ? "Choose a new password."
                : "Welcome back."}
        </h2>
        <p>
          {authMode === "update"
            ? "This updates the password shared with tracker."
            : "Your existing tracker account works here too."}
        </p>
        {authMode === "login" ? (
          <EmailSignIn
            key={String(authOpen)}
            onSignedIn={() => {
              setError("");
              setDemo(false);
              setAuthOpen(false);
            }}
            onPassword={() => {
              setError("");
              setAuthMode("password");
            }}
            onCreateAccount={() => {
              setError("");
              setAuthMode("signup");
            }}
          />
        ) : (
          <>
            <form onSubmit={auth}>
              {authMode !== "update" && (
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
              {authMode !== "reset" && (
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    minLength={authMode === "password" ? 1 : 8}
                    autoComplete={
                      authMode === "password"
                        ? "current-password"
                        : "new-password"
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
              <button className="primary" disabled={busy}>
                {busy
                  ? "One moment…"
                  : authMode === "reset"
                    ? "Send reset link"
                    : authMode === "signup"
                      ? "Create account"
                      : authMode === "update"
                        ? "Update password"
                        : "Sign in ↗"}
              </button>
            </form>
            <div className="auth-links">
              <button
                onClick={() =>
                  setAuthMode(authMode === "login" ? "signup" : "login")
                }
              >
                {authMode === "login"
                  ? "Have an invitation? Create account"
                  : "Back to sign in"}
              </button>
              {authMode === "password" && (
                <button onClick={() => setAuthMode("reset")}>
                  Forgot password?
                </button>
              )}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
