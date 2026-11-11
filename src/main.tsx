import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import {
  categories,
  colours,
  duplicates,
  labels,
  samples,
  suggest,
  type Category,
  type Item,
} from "./domain";
import { Garment } from "./Garment";
import { EmailSignIn } from "./EmailSignIn";
import { authMessage, normalizeEmail } from "./auth";
import "./style.css";
const blank: Item = {
  item_id: "",
  display_name: "",
  category: "top",
  subcategory: "t-shirt",
  primary_colour: "cream",
  pattern: "solid",
  fit: "unknown",
  formality: "casual",
  notes: "",
  lifecycle_status: "active",
  created_at: "",
};
function Icon({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="icon">
      {(
        {
          wardrobe: "▥",
          outfits: "✧",
          preferences: "☷",
          plus: "＋",
          arrow: "↗",
          search: "⌕",
          close: "×",
          lock: "♧",
        } as Record<string, string>
      )[name] || name}
    </span>
  );
}
function App() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [demo, setDemo] = useState(false),
    [items, setItems] = useState<Item[]>([]),
    [page, setPage] = useState("wardrobe"),
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
    [occasion, setOccasion] = useState("casual"),
    [look, setLook] = useState<ReturnType<typeof suggest> | null>(null),
    [prefs, setPrefs] = useState({
      style: "",
      fit: "",
      climate: "",
      preferred_colours: "",
      avoided_colours: "",
      budget: "",
    });
  const epoch = useRef(0);
  const live = !!session && !demo;
  const dialog = useRef<HTMLDialogElement>(null);
  const authDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
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
        setLook(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const n = ++epoch.current;
    setLook(null);
    setEditor(null);
    setPrefs({
      style: "",
      fit: "",
      climate: "",
      preferred_colours: "",
      avoided_colours: "",
      budget: "",
    });
    if (demo) {
      setItems(samples.map((i) => ({ ...i })));
      setAccess(true);
      return;
    }
    setItems([]);
    setAccess(false);
    if (!session) return;
    setBusy(true);
    supabase.rpc("wardrobe_bootstrap").then(({ data, error }) => {
      if (n !== epoch.current) return;
      if (error) setError(error.message);
      else {
        setAccess(data.access);
        setItems(data.items || []);
        if (data.preferences) setPrefs(data.preferences);
      }
      setBusy(false);
    });
  }, [session?.user.id, demo]);
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
      setItems((prev) => [
        saved,
        ...prev.filter((i) => i.item_id !== saved.item_id),
      ]);
      setEditor(null);
      setLook(null);
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
    if (
      !editor ||
      !confirm(`Delete “${editor.display_name}”? This cannot be undone.`)
    )
      return;
    setBusy(true);
    try {
      if (live) {
        const { error } = await supabase.rpc("wardrobe_delete_item", {
          target_id: editor.item_id,
        });
        if (error) throw error;
      }
      setItems((p) => p.filter((i) => i.item_id !== editor.item_id));
      setLook(null);
      setEditor(null);
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
  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          { exported_at: new Date().toISOString(), items, preferences: prefs },
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
  const active = items.filter((i) => i.lifecycle_status === "active");
  const filtered = items.filter(
    (i) =>
      (archive
        ? i.lifecycle_status === "archived"
        : i.lifecycle_status === "active") &&
      (category === "all" || i.category === category) &&
      `${i.display_name} ${i.subcategory} ${i.primary_colour} ${i.notes}`
        .toLowerCase()
        .includes(query.toLowerCase()),
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
          ].map(([id, label]) => (
            <button
              key={id}
              className={page === id ? "nav active" : "nav"}
              onClick={() => setPage(id)}
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
          {!showWorkspace ? (
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
          ) : !access && !busy ? (
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
                      disabled={busy || !access}
                      onClick={() => setEditor({ ...blank })}
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
                      <span>ways to start</span>
                    </div>
                    <p>
                      Buy thoughtfully.
                      <br />
                      <em>Wear what you love.</em>
                    </p>
                    <span className="summary-star">✧</span>
                  </section>
                  <section className="collection-tools">
                    <div className="tabs" aria-label="Filter by category">
                      {["all", ...categories].map((c) => (
                        <button
                          key={c}
                          className={category === c ? "selected" : ""}
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
                        Export ↗
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
                            setEditor({ ...item });
                          }}
                        >
                          <div className={`garment-canvas tone-${n % 4}`}>
                            <span className="category-tag">
                              {labels[item.category]}
                            </span>
                            <span className="card-arrow">↗</span>
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
                        onClick={() => setEditor({ ...blank })}
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
                        {query
                          ? "No matching pieces"
                          : archive
                            ? "Nothing archived"
                            : "Your wardrobe starts with one piece."}
                      </h2>
                      <p>
                        {query
                          ? "Try another colour, name or category."
                          : "Add a few everyday favourites. You can build from there."}
                      </p>
                      {!archive && !query && (
                        <button
                          className="primary"
                          onClick={() => setEditor({ ...blank })}
                        >
                          Add your first piece ＋
                        </button>
                      )}
                    </section>
                  )}
                  <footer className="page-footer">
                    <span>Thoughtfully collected. Uniquely yours.</span>
                    <span>WARDROBE / THE PERSONAL EDIT</span>
                  </footer>
                </>
              )}
              {page === "outfits" && (
                <>
                  <section className="page-heading">
                    <div>
                      <p className="eyebrow">MAKE MORE OF WHAT YOU OWN</p>
                      <h1>
                        Outfit studio<span className="heading-dot">.</span>
                      </h1>
                      <p>Your pieces. A fresh perspective.</p>
                    </div>
                  </section>
                  <div className="studio-controls">
                    <label>
                      What’s the occasion?
                      <select
                        value={occasion}
                        onChange={(e) => {
                          setOccasion(e.target.value);
                          setLook(null);
                        }}
                      >
                        <option value="casual">An everyday kind of day</option>
                        <option value="smart">
                          Something a little smarter
                        </option>
                        <option value="formal">A formal occasion</option>
                      </select>
                    </label>
                    <button
                      className="primary"
                      onClick={() =>
                        setLook(suggest(items, occasion, look?.signature))
                      }
                    >
                      {look ? "Try another combination" : "Put a look together"}{" "}
                      ✧
                    </button>
                  </div>
                  <p className="fine">
                    A first look at the outfit engine: simple category
                    combinations, with occasion matches prioritised. AI styling
                    and feedback learning are coming next.
                  </p>
                  {look ? (
                    <>
                      <div className="look-heading">
                        <h2>
                          {look.missing.length
                            ? "A starting point"
                            : "Your next everyday look"}
                        </h2>
                        <span className="pill">
                          {look.missing.length
                            ? "Incomplete outfit"
                            : "From your wardrobe"}
                        </span>
                      </div>
                      <section className="garment-grid outfit-grid">
                        {look.items.map((i) => (
                          <div key={i.item_id} className="garment-card">
                            <div className="garment-canvas">
                              <Garment item={i} />
                            </div>
                            <div className="card-info">
                              <h2>{i.display_name}</h2>
                              <p>Owned · {i.primary_colour}</p>
                            </div>
                          </div>
                        ))}
                      </section>
                      {look.missing.length > 0 && (
                        <div className="missing">
                          Missing from this look:{" "}
                          <b>{look.missing.join(", ")}</b>. These pieces are not
                          in your active wardrobe.
                        </div>
                      )}
                      <p className="fine">
                        Only active pieces from this wardrobe appear above.
                        Regenerate changes the combination when alternatives
                        exist.
                      </p>
                    </>
                  ) : (
                    <div className="studio-empty">
                      <span>✧</span>
                      <h2>A good outfit is already in there.</h2>
                      <p>
                        Start with what you have. Let’s see what goes together.
                      </p>
                    </div>
                  )}
                </>
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
                        <input
                          maxLength={500}
                          value={prefs[key as keyof typeof prefs]}
                          onChange={(e) =>
                            setPrefs({ ...prefs, [key]: e.target.value })
                          }
                          placeholder="Make it your own…"
                        />
                      </label>
                    ))}
                    <button className="primary" disabled={busy}>
                      Save preferences ↗
                    </button>
                    <p className="fine">
                      Stored for upcoming personalised styling. This
                      foundation’s outfit combinations don’t yet use these
                      preferences. Photos and AI requests are disabled.
                    </p>
                  </form>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setEditor(null)}
        onClick={(e) => {
          if (e.target === dialog.current && !busy) setEditor(null);
        }}
      >
        {editor && (
          <form onSubmit={save}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">YOUR WARDROBE, ONE PIECE AT A TIME</p>
                <h2>
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
                onClick={() => setEditor(null)}
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
                    <input
                      required
                      maxLength={60}
                      value={editor.subcategory}
                      onChange={(e) =>
                        setEditor({ ...editor, subcategory: e.target.value })
                      }
                    />
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
                  className="danger"
                  disabled={busy}
                  onClick={remove}
                >
                  Delete piece
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setEditor(null)}
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
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if ("serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
