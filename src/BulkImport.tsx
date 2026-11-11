import { useEffect, useRef, useState } from "react";
import { supabase } from "./client";
import { categories, labels, colours, duplicates, type Item } from "./domain";
import { parseImport, validateImport, type ImportRow } from "./import";
export function BulkImport({
  items,
  onSave,
  onClose,
}: {
  items: Item[];
  onSave: (item: Item) => Promise<Item>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    running = useRef(false);
  const [rows, setRows] = useState<ImportRow[]>([]),
    [selected, setSelected] = useState<Set<number>>(new Set()),
    [saved, setSaved] = useState<Set<number>>(new Set()),
    [failures, setFailures] = useState<Record<number, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reading, setReading] = useState(false),
    [fileName, setFileName] = useState(""),
    [mode, setMode] = useState<"text" | "photo">("text"),
    [description, setDescription] = useState(""),
    [image, setImage] = useState(""),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (rows.length || description || image) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [rows.length, description, image]);
  function close() {
    if (busy || reading) return;
    if (
      (rows.some((_, i) => !saved.has(i)) || description || image) &&
      !confirm(
        "Discard the remaining garment suggestions? Saved pieces will remain in your wardrobe.",
      )
    )
      return;
    onClose();
  }
  const duplicate = (row: ImportRow, index: number) =>
    duplicates([...items, ...rows.slice(0, index).map((r) => r.item)], row.item)
      .length > 0;
  async function photo(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10000000
    ) {
      setError("Choose a JPEG, PNG or WebP photo under 10 MB.");
      return;
    }
    setReading(true);
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const encoded = canvas.toDataURL("image/jpeg", 0.82);
      if (encoded.length > 3300000)
        throw new Error(
          "This image is too large after resizing. Try a smaller photo.",
        );
      setImage(encoded);
    } catch (e) {
      setError((e as Error).message || "Could not read this image.");
    } finally {
      setReading(false);
    }
  }
  async function analyse() {
    setReading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session)
        throw new Error(
          "Sign in to use AI capture. Manual entry and sample browsing remain available.",
        );
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          text: mode === "text" ? description : "",
          image: mode === "photo" ? image : "",
          consent,
        }),
        signal: AbortSignal.timeout(65000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Analysis failed. Nothing was saved.");
      const parsed = parseImport(
        JSON.stringify({ items: result.items }),
        "json",
      );
      setRows(parsed);
      setSaved(new Set());
      setFailures({});
      setFileName("AI suggestions — review required");
      setSelected(new Set());
      setDescription("");
      setImage("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }
  function edit(index: number, key: keyof Item, value: string) {
    setRows((p) =>
      p.map((r, i) =>
        i === index
          ? { ...r, item: { ...r.item, [key]: value }, errors: [] }
          : r,
      ),
    );
    setFailures((p) => {
      const n = { ...p };
      delete n[index];
      return n;
    });
  }
  async function save() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    const done = new Set(saved);
    let uncertain = false;
    for (const index of selected) {
      if (
        done.has(index) ||
        validateImport(rows[index].item).length ||
        rows[index].errors.length
      )
        continue;
      try {
        await onSave({ ...rows[index].item, item_id: "" });
        done.add(index);
        setSaved(new Set(done));
      } catch (e) {
        setFailures((p) => ({ ...p, [index]: (e as Error).message }));
        uncertain = true;
        break;
      }
    }
    setSelected((p) => new Set([...p].filter((i) => !done.has(i))));
    if (uncertain)
      setError(
        "Import paused after a failed request. Saved rows will not be retried. Check your wardrobe before retrying a failed row: a lost response can mean the save completed.",
      );
    setBusy(false);
    running.current = false;
  }
  const pending = [...selected].filter(
    (i) =>
      !saved.has(i) &&
      !rows[i].errors.length &&
      !validateImport(rows[i].item).length,
  );
  return (
    <dialog
      ref={dialog}
      className="bulk-import"
      aria-labelledby="import-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-heading">
        <div>
          <p className="eyebrow">BRING YOUR COLLECTION WITH YOU</p>
          <h2 id="import-title">Add clothes with AI</h2>
        </div>
        <button
          className="close"
          aria-label="Close garment capture"
          disabled={busy || reading}
          onClick={close}
        >
          ×
        </button>
      </div>
      <p>
        Describe several pieces or take a photo containing multiple garments. AI
        proposes the details; you correct and select what to save. Nothing
        enters your wardrobe until you confirm.
      </p>
      {rows.length === 0 && (
        <>
          <div
            className="capture-mode"
            role="group"
            aria-label="Capture method"
          >
            <button
              className={mode === "text" ? "secondary selected" : "secondary"}
              aria-pressed={mode === "text"}
              disabled={reading}
              onClick={() => setMode("text")}
            >
              Add by text
            </button>
            <button
              className={mode === "photo" ? "secondary selected" : "secondary"}
              aria-pressed={mode === "photo"}
              disabled={reading}
              onClick={() => setMode("photo")}
            >
              Add by photo
            </button>
          </div>
          {mode === "text" ? (
            <label>
              Describe your clothes
              <textarea
                maxLength={10000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="I have a navy linen shirt, black straight jeans and white trainers…"
              />
            </label>
          ) : (
            <>
              <label>
                Take or choose a photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  disabled={reading}
                  onChange={(e) => void photo(e.target.files?.[0])}
                />
              </label>
              {image && (
                <img
                  className="capture-preview"
                  src={image}
                  alt="Temporary garment photo for analysis"
                />
              )}
            </>
          )}
          <label className="archive-toggle consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I agree to send this text/photo through OpenRouter to an AI provider
            for analysis. Providers may retain data under their policies.
            Wardrobe does not save the photo.
          </label>
          <a
            href="https://openrouter.ai/privacy"
            target="_blank"
            rel="noreferrer"
          >
            OpenRouter privacy policy
          </a>
          <button
            className="primary"
            disabled={
              reading ||
              !consent ||
              (mode === "text" ? !description.trim() : !image)
            }
            onClick={analyse}
          >
            {reading ? "Analysing…" : "Analyse and review garments"}
          </button>
        </>
      )}
      {reading && <p role="status">Analysing your garments…</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <>
          <p role="status">
            {fileName} · {rows.length} rows · {saved.size} saved ·{" "}
            {pending.length} selected
          </p>
          <p className="fine">
            All suggestions start unselected. Review their details, then select
            what you own. Possible duplicates are flagged.
          </p>
          <div className="import-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                setSelected(
                  new Set(
                    rows.flatMap((r, i) =>
                      !saved.has(i) &&
                      !r.errors.length &&
                      !validateImport(r.item).length &&
                      !duplicate(r, i)
                        ? [i]
                        : [],
                    ),
                  ),
                )
              }
            >
              Select valid non-duplicates
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </button>
          </div>
          <ol className="import-list">
            {rows.map((r, i) => {
              const errors = [...r.errors, ...validateImport(r.item)];
              return (
                <li key={i} className={saved.has(i) ? "import-saved" : ""}>
                  <div className="import-row-heading">
                    <label className="archive-toggle">
                      <input
                        type="checkbox"
                        aria-label={`Select row ${r.line}`}
                        checked={selected.has(i)}
                        disabled={busy || saved.has(i) || errors.length > 0}
                        onChange={(e) =>
                          setSelected((p) => {
                            const n = new Set(p);
                            e.target.checked ? n.add(i) : n.delete(i);
                            return n;
                          })
                        }
                      />
                      Row {r.line}
                    </label>
                    <span>
                      {saved.has(i)
                        ? "Saved"
                        : duplicate(r, i)
                          ? "Possible duplicate"
                          : "New piece"}
                    </span>
                  </div>
                  <fieldset disabled={busy || saved.has(i)}>
                    <div className="import-fields">
                      <label>
                        Name
                        <input
                          value={r.item.display_name}
                          maxLength={100}
                          onChange={(e) =>
                            edit(i, "display_name", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Category
                        <select
                          value={r.item.category}
                          onChange={(e) => edit(i, "category", e.target.value)}
                        >
                          <option value="">Choose category</option>
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
                          maxLength={60}
                          value={r.item.subcategory}
                          onChange={(e) =>
                            edit(i, "subcategory", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        Colour
                        <select
                          value={r.item.primary_colour}
                          onChange={(e) =>
                            edit(i, "primary_colour", e.target.value)
                          }
                        >
                          {!Object.hasOwn(colours, r.item.primary_colour) && (
                            <option>{r.item.primary_colour}</option>
                          )}
                          {Object.keys(colours).map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <details>
                      <summary>More attributes & validation details</summary>
                      {(
                        [
                          "pattern",
                          "fit",
                          "formality",
                          "lifecycle_status",
                          "season",
                          "material",
                          "garment_length",
                          "style_tags",
                          "notes",
                        ] as const
                      ).map((key) => (
                        <label key={key}>
                          {key.replaceAll("_", " ")}
                          <input
                            value={r.item[key] || ""}
                            onChange={(e) => edit(i, key, e.target.value)}
                          />
                        </label>
                      ))}
                    </details>
                  </fieldset>
                  {errors.length > 0 && (
                    <ul className="import-errors">
                      {[...new Set(errors)].map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                  {failures[i] && (
                    <p role="alert" className="alert">
                      {failures[i]}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
      <div className="modal-footer">
        <button
          className="secondary"
          disabled={busy || reading}
          onClick={close}
        >
          {saved.size ? "Done" : "Cancel"}
        </button>
        <button
          className="primary"
          disabled={busy || reading || !pending.length}
          onClick={save}
        >
          {busy ? "Saving…" : `Save ${pending.length} confirmed pieces`}
        </button>
      </div>
      <p className="fine">
        AI can be wrong. Confirm colours and garment types before saving. Only
        confirmed structured details are stored; source photos are discarded.
      </p>
    </dialog>
  );
}
