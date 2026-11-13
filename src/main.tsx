import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import {
  demoWardrobe,
  emptyPreferences,
  mergeItem,
  blankItem,
  type Item,
} from "./domain";
import type { Feedback, Look } from "./domain";
import { AssignmentReview } from "./AssignmentReview";
import { GarmentDetails } from "./GarmentDetails";
import { BulkImport } from "./BulkImport";
import { Icon } from "./Icon";
import { OutfitStudio } from "./OutfitStudio";
import { Privacy } from "./Privacy";
import { Landing } from "./Landing";
import { WardrobePage } from "./WardrobePage";
import { SettingsPage } from "./SettingsPage";
import { ItemEditor } from "./ItemEditor";
import { AddSheet } from "./AddSheet";
import { AuthDialog, type AuthMode } from "./AuthDialog";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "./style.css";

const pages = ["wardrobe", "outfits", "preferences", "privacy"];
const nav: [string, string, string][] = [
  ["wardrobe", "Wardrobe", "wardrobe"],
  ["outfits", "Outfits", "outfits"],
  ["preferences", "Settings", "preferences"],
];

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function App() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [demo, setDemo] = useState(false),
    [items, setItems] = useState<Item[]>([]),
    [page, setPageState] = useState(() => location.hash.slice(1) || "wardrobe"),
    [editor, setEditor] = useState<Item | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [authOpen, setAuthOpen] = useState(false),
    [authMode, setAuthMode] = useState<AuthMode>("login"),
    [access, setAccess] = useState(false),
    [loadState, setLoadState] = useState<
      "idle" | "loading" | "ready" | "error"
    >("idle"),
    [loadVersion, reload] = useState(0),
    [loadError, setLoadError] = useState(""),
    [feedback, setFeedback] = useState<Feedback[]>([]),
    [importOpen, setImportOpen] = useState(false),
    [addOpen, setAddOpen] = useState(false),
    [viewed, setViewed] = useState<Item | null>(null),
    [assignmentId, setAssignmentId] = useState<string | null>(null),
    [savedPrefs, setSavedPrefs] = useState(emptyPreferences),
    [online, setOnline] = useState(navigator.onLine),
    [confirmAction, setConfirmAction] = useState<"delete" | "clear" | null>(
      null,
    ),
    [confirmText, setConfirmText] = useState(""),
    [prefs, setPrefs] = useState(emptyPreferences);
  const epoch = useRef(0);
  const draftOwner = useRef<string | null>(null);
  const navigationGuard = useRef({ dirty: false, page: "wardrobe" });
  const editorInitial = useRef("");
  const actionDialog = useRef<HTMLDialogElement>(null);
  const openEditor = (item: Item) => {
    setError("");
    editorInitial.current = JSON.stringify(item);
    setEditor({ ...item });
  };
  const editorDirty =
    !!editor && JSON.stringify(editor) !== editorInitial.current;
  const preferencesDirty = JSON.stringify(prefs) !== JSON.stringify(savedPrefs);
  navigationGuard.current = { dirty: preferencesDirty || editorDirty, page };
  const live = !!session && !demo;
  const showWorkspace = demo || live;
  const signIn = () => {
    setAuthMode("login");
    setAuthOpen(true);
  };

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
      setPageState(pages.includes(next) ? next : "wardrobe");
      window.scrollTo?.({ top: 0 });
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
      if (editorDirty || preferencesDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [editorDirty, preferencesDirty]);
  useEffect(() => {
    if (confirmAction) actionDialog.current?.showModal();
    else actionDialog.current?.close();
    setConfirmText("");
  }, [confirmAction]);
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
        setImportOpen(false);
        setBusy(false);
        setLoadState("idle");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const n = ++epoch.current;
    setItems([]);
    setViewed(null);
    setAssignmentId(null);
    setFeedback([]);
    setAccess(false);
    setLoadError("");
    const owner = demo ? "demo" : session?.user.id;
    const preserve = !!owner && draftOwner.current === owner;
    if (owner && draftOwner.current !== owner) {
      setEditor(null);
      setPrefs(emptyPreferences);
      setSavedPrefs(emptyPreferences);
      draftOwner.current = owner;
    }
    if (demo) {
      setItems(demoWardrobe.map((i) => ({ ...i })));
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
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    if (!demo && (!session || !access)) {
      setError("Sign in again to save. Your draft is still open.");
      signIn();
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
      setItems((prev) => [
        saved,
        ...prev.filter((i) => i.item_id !== saved.item_id),
      ]);
      setEditor(null);
      setNotice(
        saved.lifecycle_status === "archived"
          ? `${saved.display_name} archived.`
          : `${saved.display_name} saved.`,
      );
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
  async function importItem(item: Item): Promise<Item> {
    const start = epoch.current;
    if (draftOwner.current !== (demo ? "demo" : session?.user.id))
      throw new Error(
        "Your account changed. Reopen the import for the current account.",
      );
    if (!demo && (!session || !access))
      throw new Error("Sign in again before importing.");
    let saved: Item;
    if (demo)
      saved = {
        ...item,
        item_id: item.item_id || crypto.randomUUID(),
        created_at: item.created_at || new Date().toISOString(),
      };
    else {
      const { data, error } = await supabase.rpc("wardrobe_save_item", {
        payload: item,
      });
      if (error) throw error;
      saved = data;
    }
    if (start !== epoch.current)
      throw new Error(
        "Your session changed. Reload your wardrobe before continuing.",
      );
    setItems((p) => [saved, ...p.filter((i) => i.item_id !== saved.item_id)]);
    return saved;
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
      setNotice("Piece deleted.");
    } catch (e) {
      setError((e as Error).message);
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
        demo ? "Preferences updated for this session." : "Preferences saved.",
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
    download("my-wardrobe.json", {
      exported_at: new Date().toISOString(),
      items,
      preferences: savedPrefs,
      feedback: exportedFeedback,
      recommendations,
    });
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
  async function signOut() {
    if (
      (editorDirty || preferencesDirty) &&
      !confirm("Sign out and discard unsaved changes?")
    )
      return;
    setEditor(null);
    setPrefs(emptyPreferences);
    setSavedPrefs(emptyPreferences);
    draftOwner.current = null;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) setError(error.message);
  }

  const active = items.filter((i) => i.lifecycle_status === "active");
  const banners = (
    <>
      {error && !editor && !confirmAction && (
        <div className="alert banner" role="alert">
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
      {!online && (
        <div className="offline-banner" role="status">
          You're offline. You can browse loaded pieces, but saving and sign-in
          need a connection.
        </div>
      )}
    </>
  );

  let content;
  if (!showWorkspace) {
    content =
      page === "privacy" ? (
        <div className="solo-page">
          <button className="ghost back" onClick={() => setPage("wardrobe")}>
            <Icon name="arrow" /> Back
          </button>
          {banners}
          <Privacy />
        </div>
      ) : (
        <>
          {error && <div className="solo-page">{banners}</div>}
          <Landing
            ready={ready}
            onSignIn={signIn}
            onSample={() => setDemo(true)}
            onPrivacy={() => setPage("privacy")}
          />
        </>
      );
  } else {
    content = (
      <div className="app">
        <aside className="sidebar">
          <a
            className="brand"
            href="#wardrobe"
            onClick={(e) => {
              e.preventDefault();
              setPage("wardrobe");
            }}
          >
            <span className="brandmark">w</span>wardrobe
          </a>
          <nav aria-label="Main">
            {nav.map(([id, label, icon]) => (
              <button
                key={id}
                className={page === id ? "nav-item active" : "nav-item"}
                aria-current={page === id ? "page" : undefined}
                onClick={() => setPage(id)}
              >
                <Icon name={icon} />
                {label}
                {id === "wardrobe" && <small>{active.length}</small>}
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <button
              className={page === "privacy" ? "nav-item active" : "nav-item"}
              onClick={() => setPage("privacy")}
            >
              <Icon name="shield" /> Privacy
            </button>
            <div className="side-user">
              <span className="avatar">
                {demo ? "S" : (session?.user.email?.[0] || "Y").toUpperCase()}
              </span>
              <div>
                <b>
                  {demo
                    ? "Sample wardrobe"
                    : session?.user.email || "Your account"}
                </b>
                <small>{demo ? "Not saved" : "Signed in"}</small>
              </div>
            </div>
          </div>
        </aside>
        <div className="shell">
          <header className="appbar">
            <span className="brand">
              <span className="brandmark">w</span>wardrobe
            </span>
            <div className="appbar-actions">
              {demo ? (
                <>
                  <span className="pill">Sample</span>
                  <button className="primary small" onClick={signIn}>
                    Sign in
                  </button>
                </>
              ) : (
                <button
                  className="icon-button"
                  aria-label="Settings"
                  onClick={() => setPage("preferences")}
                >
                  <span className="avatar small">
                    {(session?.user.email?.[0] || "Y").toUpperCase()}
                  </span>
                </button>
              )}
            </div>
          </header>
          <main>
            {demo && (
              <div className="preview-banner">
                <span>
                  <b>You're viewing a sample wardrobe.</b> Changes last for this
                  session only.
                </span>
                <button className="link" onClick={signIn}>
                  Use my account
                </button>
              </div>
            )}
            {banners}
            {page === "privacy" ? (
              <Privacy />
            ) : loadState === "loading" ? (
              <section
                className="loading"
                role="status"
                aria-label="Opening your wardrobe…"
              >
                <div className="skeleton head" />
                <div className="garment-grid">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="skeleton card" />
                  ))}
                </div>
              </section>
            ) : loadState === "error" ? (
              <section className="empty">
                <h2>We couldn’t load your wardrobe.</h2>
                <p role="alert" className="muted">
                  {loadError}
                </p>
                <button
                  className="primary"
                  onClick={() => reload((v) => v + 1)}
                >
                  Try again
                </button>
              </section>
            ) : !access ? (
              <section className="empty">
                <h1>Your account is ready.</h1>
                <p className="muted">
                  Wardrobe access hasn’t been enabled for this account yet. Ask
                  the owner for an invitation.
                </p>
                <button className="secondary" onClick={signOut}>
                  Sign out
                </button>
              </section>
            ) : page === "outfits" ? (
              <OutfitStudio
                items={items}
                preferences={savedPrefs}
                feedback={feedback}
                onEdit={(item) => setViewed(item)}
                onRecord={recordLook}
                onRate={rateLook}
                onAdd={() => {
                  setPage("wardrobe");
                  setAddOpen(true);
                }}
              />
            ) : page === "preferences" ? (
              <SettingsPage
                prefs={prefs}
                dirty={preferencesDirty}
                busy={busy}
                demo={demo}
                email={session?.user.email || ""}
                onChange={setPrefs}
                onSave={savePrefs}
                onDiscard={() => setPrefs(savedPrefs)}
                onExport={exportData}
                onClear={() => {
                  setError("");
                  setConfirmAction("clear");
                }}
                onPrivacy={() => setPage("privacy")}
                onSignIn={signIn}
                onSignOut={signOut}
              />
            ) : (
              <WardrobePage
                items={items}
                busy={busy}
                online={online}
                onAdd={() => setAddOpen(true)}
                onView={setViewed}
                onAssign={setAssignmentId}
                onExportAll={exportData}
                onExportSelected={(selected) =>
                  download("wardrobe-selected.json", {
                    items: selected,
                    exported_at: new Date().toISOString(),
                  })
                }
                onSaveItem={importItem}
                onStyle={() => setPage("outfits")}
                onError={setError}
                onNotice={setNotice}
                setBusy={setBusy}
              />
            )}
          </main>
        </div>
        <nav className="tabbar" aria-label="Mobile navigation">
          {nav.map(([id, title, icon]) => (
            <button
              key={id}
              aria-current={page === id ? "page" : undefined}
              onClick={() => setPage(id)}
            >
              <Icon name={icon} />
              <span>{title}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <>
      {content}
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" /> {notice}
        </div>
      )}
      {addOpen && (
        <AddSheet
          demo={demo}
          online={online}
          onClose={() => setAddOpen(false)}
          onAi={() => {
            setAddOpen(false);
            setImportOpen(true);
          }}
          onManual={() => {
            setAddOpen(false);
            openEditor({ ...blankItem });
          }}
          onSignIn={() => {
            setAddOpen(false);
            signIn();
          }}
        />
      )}
      {assignmentId && items.find((i) => i.item_id === assignmentId) && (
        <AssignmentReview
          key={`${demo ? "demo" : session?.user.id}:${assignmentId}`}
          item={items.find((i) => i.item_id === assignmentId)!}
          onSave={importItem}
          onClose={() => setAssignmentId(null)}
        />
      )}
      {viewed && (
        <GarmentDetails
          item={viewed}
          onAssign={() => {
            setAssignmentId(viewed.item_id);
            setViewed(null);
          }}
          onClose={() => setViewed(null)}
          onEdit={() => {
            const item = viewed;
            setViewed(null);
            openEditor(item);
          }}
        />
      )}
      {importOpen && (
        <BulkImport
          key={demo ? "demo" : session?.user.id || "signed-out"}
          items={items}
          onSave={importItem}
          onClose={() => setImportOpen(false)}
        />
      )}
      <ItemEditor
        draft={editor}
        items={items}
        busy={busy}
        error={error}
        onChange={setEditor}
        onSubmit={save}
        onClose={closeEditor}
        onDelete={() => {
          setError("");
          setConfirmAction("delete");
        }}
        onReviewMerge={(target) =>
          editor && openEditor(mergeItem(target, editor))
        }
      />
      <dialog
        ref={actionDialog}
        className="sheet confirm-dialog"
        aria-labelledby="confirm-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setConfirmAction(null);
        }}
      >
        <div className="sheet-body stack">
          <h2 id="confirm-title">
            {confirmAction === "clear"
              ? "Clear your Wardrobe data?"
              : "Permanently delete this piece?"}
          </h2>
          <p className="muted">
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
        </div>
        <div className="sheet-foot">
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
      <AuthDialog
        open={authOpen}
        mode={authMode}
        onMode={setAuthMode}
        onClose={() => setAuthOpen(false)}
        onSignedIn={() => {
          setError("");
          setDemo(false);
          setAuthOpen(false);
        }}
        onNotice={setNotice}
      />
    </>
  );
}
