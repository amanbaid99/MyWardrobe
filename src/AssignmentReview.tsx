import { useEffect, useRef, useState } from "react";
import type { Item } from "./domain";
import { supabase } from "./client";
import {
  assignmentLabels,
  assignmentOptions,
  missingAssignments,
  selectedAssignments,
  type AssignmentField,
} from "./assignments";
export function AssignmentReview({
  item,
  onSave,
  onClose,
}: {
  item: Item;
  onSave: (item: Item) => Promise<Item>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Partial<Record<AssignmentField, string>>>(
    {},
  );
  const [suggestions, setSuggestions] = useState<
    Partial<Record<AssignmentField, string>>
  >({});
  const [selected, setSelected] = useState<Set<AssignmentField>>(new Set());
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const fields = missingAssignments(item);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (selected.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [selected.size]);
  function close() {
    if (
      !busy &&
      (!selected.size || confirm("Discard the unconfirmed assignments?"))
    )
      onClose();
  }
  async function suggest() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session)
        throw Error(
          "Sign in to use AI suggestions. You can still assign details manually.",
        );
      const {
        item_id: _id,
        owner_user_id: _owner,
        created_at: _date,
        ...details
      } = item;
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          consent,
          task: "assign",
          text: JSON.stringify({ item: details, missing_fields: fields }),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          result.error ||
            "Suggestions are unavailable. Assign details manually or try later.",
        );
      const candidate = result.items?.[0];
      const next: Partial<Record<AssignmentField, string>> = {};
      for (const field of fields)
        if (
          typeof candidate?.[field] === "string" &&
          assignmentOptions(field, item).includes(candidate[field]) &&
          candidate[field] !== "other"
        )
          next[field] = candidate[field];
      setSuggestions(next);
      setDraft((previous) => ({ ...next, ...previous }));
      setMessage(
        Object.keys(next).length
          ? "Suggestions are ready. Select the fields you want to save, or choose another value."
          : "AI could not establish these details. Choose manually or leave them unassigned.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not suggest details.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await onSave(selectedAssignments(item, draft, selected));
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your choices are still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="assignment-review"
      aria-labelledby="assignment-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <button
        className="close"
        aria-label="Close assignment review"
        disabled={busy}
        onClick={close}
      >
        ×
      </button>
      <p className="eyebrow">COMPLETE YOUR WARDROBE</p>
      <h2 id="assignment-title">Assign missing details</h2>
      <h3>{item.display_name}</h3>
      <p>
        Known details stay unchanged. Use and occasion are styling suggestions;
        physical details may remain unassigned. Fit, material and condition can
        be edited in Edit piece.
      </p>
      <label className="assignment-consent">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Send this piece’s details and notes to the external AI provider for
        suggestions. Provider retention policies apply.
      </label>
      <button
        className="secondary"
        disabled={!consent || busy}
        onClick={suggest}
      >
        {busy ? "Working…" : "Suggest with AI"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="assignment-fields">
        {fields.map((field) => (
          <div className="assignment-field" key={field}>
            <label>
              <input
                type="checkbox"
                aria-label={`Apply ${assignmentLabels[field]}`}
                disabled={busy || !draft[field]}
                checked={selected.has(field)}
                onChange={(e) =>
                  setSelected((p) => {
                    const n = new Set(p);
                    e.target.checked ? n.add(field) : n.delete(field);
                    return n;
                  })
                }
              />
              {assignmentLabels[field]}
            </label>
            <label>
              <span hidden>Choose {assignmentLabels[field]}</span>
              <select
                aria-label={`Choose ${assignmentLabels[field]}`}
                disabled={busy}
                value={draft[field] || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft((p) => ({ ...p, [field]: value }));
                  setSelected((p) => {
                    const n = new Set(p);
                    value ? n.add(field) : n.delete(field);
                    return n;
                  });
                }}
              >
                <option value="">Leave unassigned</option>
                {assignmentOptions(field, item).map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <small>
              {suggestions[field]
                ? `AI suggestion: ${suggestions[field]!.replaceAll("_", " ")} · review before saving`
                : "Choose manually, or ask AI"}
            </small>
          </div>
        ))}
      </div>
      <div className="modal-footer">
        <button className="secondary" disabled={busy} onClick={close}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={busy || !selected.size}
          onClick={save}
        >
          Save {selected.size} selected{" "}
          {selected.size === 1 ? "detail" : "details"}
        </button>
      </div>
    </dialog>
  );
}
