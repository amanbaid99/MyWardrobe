import { useState, type FormEvent } from "react";
import { nice, type Preferences } from "./domain";
import { Chips, ColourChoices, FitChoices } from "./Choices";
import { Icon } from "./Icon";
import { applyTheme, loadTheme, type Theme } from "./theme";

const listNames = (v: string) =>
  v
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(nice)
    .join(", ") || "None";

export function SettingsPage({
  prefs,
  dirty,
  busy,
  demo,
  email,
  onChange,
  onSave,
  onDiscard,
  onExport,
  onClear,
  onPrivacy,
  onSignIn,
  onSignOut,
}: {
  prefs: Preferences;
  dirty: boolean;
  busy: boolean;
  demo: boolean;
  email: string;
  onChange: (prefs: Preferences) => void;
  onSave: (e: FormEvent) => void;
  onDiscard: () => void;
  onExport: () => void;
  onClear: () => void;
  onPrivacy: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const set = (patch: Partial<Preferences>) => onChange({ ...prefs, ...patch });
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Your style profile, appearance and data.</p>
        </div>
      </header>

      <section className="panel account-card">
        <span className="avatar">
          {demo ? "S" : (email[0] || "Y").toUpperCase()}
        </span>
        <div>
          <b>{demo ? "Sample wardrobe" : email || "Your account"}</b>
          <small className="muted">
            {demo
              ? "Nothing here is saved."
              : "Signed in · shared with your tracker account"}
          </small>
        </div>
        {demo ? (
          <button className="primary small" onClick={onSignIn}>
            Sign in
          </button>
        ) : (
          <button className="secondary small" onClick={onSignOut}>
            <Icon name="logout" /> Sign out
          </button>
        )}
      </section>

      <form className="panel preferences" onSubmit={onSave}>
        <div className="panel-head">
          <h2>Style profile</h2>
          <p className="muted">
            All optional. Used to rank outfit suggestions; avoided colours are
            never suggested.
          </p>
        </div>
        <div className="field">
          <span className="field-label">
            Colours you love
            <em>{listNames(prefs.preferred_colours)}</em>
          </span>
          <ColourChoices
            multiple
            compact
            label="Colours you love"
            value={prefs.preferred_colours}
            onChange={(v) => set({ preferred_colours: v })}
          />
        </div>
        <div className="field">
          <span className="field-label">
            Colours to avoid
            <em>{listNames(prefs.avoided_colours)}</em>
          </span>
          <ColourChoices
            multiple
            compact
            label="Colours you avoid"
            value={prefs.avoided_colours}
            onChange={(v) => set({ avoided_colours: v })}
          />
        </div>
        <div className="field">
          <span className="field-label">Preferred fit</span>
          <FitChoices
            optional
            value={prefs.fit}
            onChange={(v) => set({ fit: v })}
          />
        </div>
        <div className="field">
          <span className="field-label">Your usual climate</span>
          <Chips
            label="Your usual climate"
            value={prefs.climate}
            options={[
              { value: "", label: "No preference" },
              { value: "hot", label: "Hot" },
              { value: "mild", label: "Mild" },
              { value: "cold", label: "Cold (adds a layer)" },
            ]}
            onChange={(v) => set({ climate: v })}
          />
        </div>
        <div className="field-pair">
          <label>
            Style words
            <input
              maxLength={500}
              value={prefs.style}
              placeholder="e.g. minimal, classic"
              onChange={(e) => set({ style: e.target.value })}
            />
          </label>
          <label>
            Shopping budget
            <input
              maxLength={500}
              value={prefs.budget}
              placeholder="e.g. ₹5,000 a month"
              onChange={(e) => set({ budget: e.target.value })}
            />
          </label>
        </div>
        <p className="muted small">
          Budget is saved for future shopping ideas and doesn't affect outfits.
        </p>
        {dirty && (
          <div
            className="save-bar"
            role="region"
            aria-label="Unsaved preferences"
          >
            <span>Unsaved changes</span>
            <button
              type="button"
              className="ghost small"
              disabled={busy}
              onClick={onDiscard}
            >
              Discard
            </button>
            <button className="primary small" disabled={busy}>
              {busy ? "Saving…" : "Save preferences"}
            </button>
          </div>
        )}
      </form>

      <section className="panel">
        <div className="panel-head">
          <h2>Appearance</h2>
        </div>
        <Chips
          label="Theme"
          value={theme}
          options={[
            { value: "system", label: "Match device" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(v) => {
            setTheme(v as Theme);
            applyTheme(v as Theme);
          }}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Your data</h2>
          <p className="muted">
            Export or clear only Wardrobe data. Your finance records and sign-in
            account are never touched.
          </p>
        </div>
        <div className="row-actions">
          <button className="secondary" onClick={onExport}>
            <Icon name="download" /> Export all Wardrobe data
          </button>
          <button className="ghost danger" onClick={onClear}>
            <Icon name="trash" /> Clear Wardrobe data
          </button>
        </div>
        <button className="list-link" onClick={onPrivacy}>
          <Icon name="shield" /> Privacy & your data <Icon name="arrow" />
        </button>
      </section>

      <p className="muted small center">
        Tip: install Wardrobe from your browser menu (Add to Home Screen) for an
        app-like experience. An internet connection is required.
      </p>
    </>
  );
}
