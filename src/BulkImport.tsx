import { useEffect, useRef, useState } from "react";
import { categories, labels, colours, duplicates, type Item } from "./domain";
import {
  parseImport,
  validateImport,
  importTemplate,
  type ImportRow,
} from "./import";
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
    [fileName, setFileName] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (rows.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [rows.length]);
  function close() {
    if (busy || reading) return;
    if (
      rows.some((_, i) => !saved.has(i)) &&
      !confirm(
        "Discard the remaining import preview? Saved pieces will remain in your wardrobe.",
      )
    )
      return;
    onClose();
  }
  const duplicate = (row: ImportRow, index: number) =>
    duplicates([...items, ...rows.slice(0, index).map((r) => r.item)], row.item)
      .length > 0;
  async function file(file?: File) {
    if (!file) return;
    if (!/\.(csv|json)$/i.test(file.name)) {
      setError("Choose a .csv or .json file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose a file under 2 MB.");
      return;
    }
    setReading(true);
    setError("");
    try {
      const parsed = parseImport(
        await file.text(),
        /\.json$/i.test(file.name) ? "json" : "csv",
      );
      setRows(parsed);
      setSaved(new Set());
      setFailures({});
      setFileName(file.name);
      setSelected(
        new Set(
          parsed.flatMap((r, i) =>
            !r.errors.length &&
            !duplicates(
              [...items, ...parsed.slice(0, i).map((p) => p.item)],
              r.item,
            ).length
              ? [i]
              : [],
          ),
        ),
      );
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
          <h2 id="import-title">Bulk import</h2>
        </div>
        <button
          className="close"
          aria-label="Close bulk import"
          disabled={busy || reading}
          onClick={close}
        >
          ×
        </button>
      </div>
      <p>
        Upload CSV or a Wardrobe JSON export. Review garments before saving. IDs
        and owners are ignored; this adds new pieces to your own wardrobe.
        Preferences, ratings and outfits are not imported.
      </p>
      <a
        className="secondary"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(importTemplate)}`}
        download="wardrobe-import-template.csv"
      >
        Download CSV template
      </a>
      <label className="import-file">
        Choose CSV or JSON (up to 500 pieces / 2 MB)
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          disabled={busy || reading || rows.length > 0}
          onChange={(e) => void file(e.target.files?.[0])}
        />
      </label>
      {reading && <p role="status">Reading your file…</p>}
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
            Possible duplicates start unselected. Select them explicitly if you
            own separate matching pieces. Edits apply to this preview only.
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
          {busy ? "Importing…" : `Import ${pending.length} selected pieces`}
        </button>
      </div>
      <p className="fine">
        Files are parsed locally. Only selected garment details are saved; the
        source file is not uploaded. Keep this window open until importing
        finishes.
      </p>
    </dialog>
  );
}
