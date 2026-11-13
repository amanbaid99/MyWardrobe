import { useEffect, useRef, type CSSProperties, type FormEvent } from "react";
import {
  categories,
  duplicates,
  labels,
  nice,
  subtypes,
  type Category,
  type Item,
} from "./domain";
import { Garment, garmentFill } from "./Garment";
import { Chips, ColourChoices, FitChoices } from "./Choices";
import { Icon } from "./Icon";

export const usageOptions = [
  { value: "unknown", label: "Not sure" },
  { value: "everyday", label: "Everyday" },
  { value: "out", label: "Going out" },
  { value: "home", label: "Home" },
  { value: "gym", label: "Gym" },
];
export const formalityOptions = [
  { value: "unknown", label: "Not sure" },
  { value: "casual", label: "Casual" },
  { value: "smart", label: "Smart / work" },
  { value: "formal", label: "Formal" },
];
const defaultSubtype: Record<Category, string> = {
  top: "t-shirt",
  bottom: "trousers",
  one_piece: "dress",
  shoes: "sneakers",
  outerwear: "jacket",
  accessory: "belt",
  fragrance: "perfume",
};

export function ItemEditor({
  draft,
  items,
  busy,
  error,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  onReviewMerge,
}: {
  draft: Item | null;
  items: Item[];
  busy: boolean;
  error: string;
  onChange: (item: Item) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  onDelete: () => void;
  onReviewMerge: (target: Item) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (draft) {
      if (!ref.current?.open) ref.current?.showModal();
    } else ref.current?.close();
  }, [draft]);
  const dup = draft ? duplicates(items, draft) : [];
  const set = (patch: Partial<Item>) =>
    draft && onChange({ ...draft, ...patch });
  const clothing =
    draft && !["accessory", "fragrance"].includes(draft.category);
  return (
    <dialog
      ref={ref}
      className="sheet editor-sheet"
      aria-labelledby="item-editor-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {draft && (
        <form onSubmit={onSubmit}>
          <div className="sheet-head">
            <h2 id="item-editor-title">
              {draft.item_id ? "Edit piece" : "Add a piece"}
            </h2>
            <button
              type="button"
              aria-label="Close item editor"
              className="icon-button"
              disabled={busy}
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="sheet-body editor-body">
            <div
              className="editor-preview"
              style={
                { "--tint": garmentFill(draft.primary_colour) } as CSSProperties
              }
            >
              <Garment item={draft} />
            </div>
            <div className="editor-fields">
              <label>
                Piece name
                <input
                  autoFocus={!draft.item_id}
                  required
                  maxLength={100}
                  value={draft.display_name}
                  onChange={(e) => set({ display_name: e.target.value })}
                  placeholder="e.g. My favourite linen shirt"
                />
              </label>
              <div className="field">
                <span className="field-label">Category</span>
                <Chips
                  label="Category"
                  value={draft.category}
                  options={categories.map((c) => ({
                    value: c,
                    label: labels[c],
                  }))}
                  onChange={(c) =>
                    set({
                      category: c as Category,
                      subcategory: defaultSubtype[c as Category] || "other",
                    })
                  }
                />
              </div>
              <div className="field">
                <span className="field-label">Type</span>
                <Chips
                  label="Type"
                  value={
                    subtypes[draft.category].includes(draft.subcategory)
                      ? draft.subcategory
                      : "other"
                  }
                  options={subtypes[draft.category]}
                  onChange={(v) => set({ subcategory: v })}
                />
              </div>
              <div className="field">
                <span className="field-label">
                  Colour
                  <em>
                    {draft.primary_colour === "unknown"
                      ? "Not sure"
                      : nice(draft.primary_colour)}
                  </em>
                </span>
                <ColourChoices
                  compact
                  value={draft.primary_colour}
                  onChange={(v) => set({ primary_colour: v })}
                />
              </div>
              {clothing && (
                <>
                  <div className="field">
                    <span className="field-label">Occasion</span>
                    <Chips
                      label="Occasion"
                      value={draft.formality}
                      options={formalityOptions}
                      onChange={(v) => set({ formality: v })}
                    />
                  </div>
                  <div className="field">
                    <span className="field-label">Pattern</span>
                    <Chips
                      label="Pattern"
                      value={draft.pattern}
                      options={[
                        "unknown",
                        "solid",
                        "striped",
                        "checked",
                        "other",
                      ]}
                      onChange={(v) => set({ pattern: v })}
                    />
                  </div>
                  <div className="field">
                    <span className="field-label">Fit</span>
                    <FitChoices
                      value={draft.fit}
                      onChange={(v) => set({ fit: v })}
                    />
                  </div>
                </>
              )}
              {draft.category === "top" && (
                <div className="field">
                  <span className="field-label">Sleeves</span>
                  <Chips
                    label="Sleeves"
                    value={draft.sleeve_length || "unknown"}
                    options={["unknown", "full", "half", "sleeveless"]}
                    onChange={(v) => set({ sleeve_length: v })}
                  />
                </div>
              )}
              <div className="field">
                <span className="field-label">Mostly worn for</span>
                <Chips
                  label="Use"
                  value={draft.usage_group || "unknown"}
                  options={usageOptions}
                  onChange={(v) => set({ usage_group: v })}
                />
              </div>
              <details className="more-details">
                <summary>More details</summary>
                <div className="stack">
                  <label className="quantity">
                    Quantity / pairs
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={draft.quantity || 1}
                      onChange={(e) =>
                        set({ quantity: Number(e.target.value) })
                      }
                    />
                  </label>
                  {!clothing && (
                    <div className="field">
                      <span className="field-label">Occasion</span>
                      <Chips
                        label="Occasion"
                        value={draft.formality}
                        options={formalityOptions}
                        onChange={(v) => set({ formality: v })}
                      />
                    </div>
                  )}
                  <div className="field">
                    <span className="field-label">Condition</span>
                    <Chips
                      label="Condition"
                      value={draft.condition || "unknown"}
                      options={["unknown", "new", "good", "worn", "stained"]}
                      onChange={(v) => set({ condition: v })}
                    />
                  </div>
                  <div className="field">
                    <span className="field-label">Season</span>
                    <Chips
                      label="Season"
                      value={draft.season || "unknown"}
                      options={[
                        "unknown",
                        "all",
                        "summer",
                        "winter",
                        "spring",
                        "autumn",
                      ]}
                      onChange={(v) => set({ season: v })}
                    />
                  </div>
                  <div className="field-pair">
                    <label>
                      Material
                      <input
                        maxLength={60}
                        placeholder="e.g. cotton"
                        value={
                          draft.material === "unknown"
                            ? ""
                            : draft.material || ""
                        }
                        onChange={(e) =>
                          set({ material: e.target.value || "unknown" })
                        }
                      />
                    </label>
                    <label>
                      Length
                      <input
                        maxLength={60}
                        placeholder="e.g. cropped"
                        value={
                          draft.garment_length === "unknown"
                            ? ""
                            : draft.garment_length || ""
                        }
                        onChange={(e) =>
                          set({ garment_length: e.target.value || "unknown" })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Style tags
                    <input
                      maxLength={200}
                      value={draft.style_tags || ""}
                      placeholder="e.g. minimal, vintage"
                      onChange={(e) => set({ style_tags: e.target.value })}
                    />
                  </label>
                </div>
              </details>
              <label>
                Notes
                <textarea
                  maxLength={1000}
                  value={draft.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  placeholder="Where it's from, how it fits, what you wear it with…"
                />
              </label>
              {dup.length > 0 && (
                <div className="callout warn">
                  <p>
                    <b>Looks like you may already own this:</b>{" "}
                    {dup.map((i) => i.display_name).join(", ")}.
                  </p>
                  {!draft.item_id &&
                    dup.map((target) => (
                      <button
                        type="button"
                        className="secondary small"
                        disabled={busy}
                        key={target.item_id}
                        onClick={() => onReviewMerge(target)}
                      >
                        Review merge with {target.display_name}
                      </button>
                    ))}
                  <p className="muted small">
                    Merging keeps the saved name, quantity and known details,
                    and fills in anything unknown. Nothing is deleted.
                  </p>
                </div>
              )}
              {error && (
                <p className="alert" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="sheet-foot">
            {draft.item_id && (
              <div className="foot-secondary">
                <button
                  type="button"
                  className="ghost small"
                  disabled={busy}
                  onClick={() =>
                    set({
                      lifecycle_status:
                        draft.lifecycle_status === "active"
                          ? "archived"
                          : "active",
                    })
                  }
                >
                  <Icon name="archive" />
                  {draft.lifecycle_status === "active" ? "Archive" : "Restore"}
                </button>
                <button
                  type="button"
                  className="ghost small danger"
                  disabled={busy}
                  onClick={onDelete}
                >
                  <Icon name="trash" />
                  Delete
                </button>
              </div>
            )}
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              {busy
                ? "Saving…"
                : !draft.item_id && dup.length
                  ? "Save as separate piece"
                  : draft.lifecycle_status === "archived" && draft.item_id
                    ? "Save (archived)"
                    : "Save piece"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
