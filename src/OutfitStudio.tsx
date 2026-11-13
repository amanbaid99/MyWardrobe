import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  nice,
  suggest,
  type Item,
  type Look,
  type Preferences,
  type Feedback,
} from "./domain";
import { Garment, garmentFill } from "./Garment";
import { Chips } from "./Choices";
import { Icon } from "./Icon";

const occasions = [
  { value: "casual", label: "Everyday" },
  { value: "smart", label: "Work / smart" },
  { value: "formal", label: "Formal" },
];

export function OutfitStudio({
  items,
  preferences,
  feedback,
  onEdit,
  onRecord,
  onRate,
  onAdd,
  initialOccasion = "casual",
}: {
  items: Item[];
  preferences: Preferences;
  feedback: Feedback[];
  onEdit: (item: Item) => void;
  onRecord: (look: Look, occasion: string, id: string) => Promise<string>;
  onRate: (
    id: string,
    rating: number,
    reason: string,
    look: Look,
  ) => Promise<void>;
  onAdd?: () => void;
  initialOccasion?: string;
}) {
  const [occasion, setOccasion] = useState(initialOccasion),
    [request, setRequest] = useState(""),
    [look, setLook] = useState<Look | null>(null),
    [history, setHistory] = useState<string[]>([]),
    [recordId, setRecordId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [rating, setRating] = useState(0);
  const stage = useRef<HTMLElement>(null);
  const revision = JSON.stringify([items, preferences]);
  useEffect(() => {
    setLook(null);
    setHistory([]);
    setRecordId("");
    setRating(0);
    setError("");
  }, [revision, occasion, request]);
  const activeCount = items.filter(
    (i) => i.lifecycle_status === "active",
  ).length;
  const eligible = (occ: string) =>
    items.filter(
      (i) =>
        i.lifecycle_status === "active" &&
        (occ === "formal"
          ? i.formality === "formal"
          : occ === "smart"
            ? ["smart", "formal"].includes(i.formality)
            : true),
    ).length;

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError("");
    setRating(0);
    setReason("");
    try {
      const next = suggest(items, occasion, look?.signature, {
        history,
        preferences,
        feedback,
        request,
      });
      const id = next.items.length
        ? await onRecord(next, occasion, crypto.randomUUID())
        : "";
      setRecordId(id);
      setLook(next);
      setHistory(
        next.exhausted ? [next.signature] : [...history, next.signature],
      );
      if (window.matchMedia?.("(max-width: 860px)").matches)
        requestAnimationFrame(() =>
          stage.current?.scrollIntoView?.({
            behavior: "smooth",
            block: "start",
          }),
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function rate(value: number) {
    if (!look || !recordId || busy) return;
    setBusy(true);
    setError("");
    try {
      await onRate(recordId, value, reason, look);
      setRating(value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const outfitSlot = (
    category: Item["category"],
    label: string,
    slot: string,
  ) => {
    const item = look?.items.find((i) => i.category === category);
    return item ? (
      <button
        className={`outfit-piece slot-${slot}`}
        style={{ "--tint": garmentFill(item.primary_colour) } as CSSProperties}
        onClick={() => onEdit(item)}
        title={`View ${item.display_name}`}
      >
        <Garment item={item} />
        <span className="piece-name">{item.display_name}</span>
        <small>
          {nice(item.primary_colour)} · {nice(item.subcategory)}
        </small>
      </button>
    ) : (
      <div className={`outfit-placeholder slot-${slot}`}>
        <Icon name="plus" />
        <span>{label}</span>
        <small>Missing for this look</small>
      </div>
    );
  };
  const hasLayer = !!look?.items.some((i) => i.category === "outerwear");
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Outfits</h1>
          <p className="muted">
            Complete looks built only from pieces you own.
          </p>
        </div>
      </header>
      <div className="studio">
        <section className="panel studio-controls" aria-label="Outfit options">
          <div className="field">
            <span className="field-label">Occasion</span>
            <Chips
              label="Occasion"
              value={occasion}
              options={occasions.map((o) => ({
                ...o,
                label: `${o.label} · ${eligible(o.value)}`,
              }))}
              onChange={(v) => !busy && setOccasion(v)}
            />
          </div>
          <label>
            <span>
              Anything in mind? <span className="optional">Optional</span>
            </span>
            <input
              maxLength={200}
              placeholder="e.g. blue shirt, no jeans"
              value={request}
              disabled={busy}
              onChange={(e) => setRequest(e.target.value)}
            />
          </label>
          <button
            className="primary wide large"
            disabled={busy}
            onClick={generate}
          >
            <Icon name={look ? "shuffle" : "outfits"} />
            {busy
              ? "Checking your wardrobe…"
              : look
                ? "Another look"
                : "Style a look"}
          </button>
          <details className="how">
            <summary>How suggestions work</summary>
            <p>
              Formal uses formal pieces; work uses smart or formal pieces.
              Colours you avoid are never used, and colours and fits you love
              rank higher. You can name garments or colours ("blue shirt") or
              exclude them ("no jeans"). Your ratings shape future looks.
            </p>
          </details>
        </section>

        <section className="studio-stage" ref={stage}>
          {error && (
            <div role="alert" className="alert">
              {error}
              <button className="link" onClick={generate}>
                Try again
              </button>
            </div>
          )}
          {look ? (
            <>
              <div className="look-heading">
                <h2>
                  {look.missing.length
                    ? "A look to build on"
                    : `Your ${occasions.find((o) => o.value === occasion)!.label.toLowerCase()} look`}
                </h2>
                <span className={look.missing.length ? "pill warn" : "pill"}>
                  {look.missing.length ? "Incomplete" : "All pieces owned"}
                </span>
              </div>
              <div
                className="outfit-flatlay"
                data-layer={hasLayer || undefined}
                data-layout={
                  look.items.some((i) => i.category === "one_piece")
                    ? "one-piece"
                    : "separates"
                }
                aria-label="Coordinated outfit arranged from top to shoes"
              >
                {look.items.some((i) => i.category === "one_piece") ? (
                  outfitSlot("one_piece", "One-piece", "one-piece")
                ) : (
                  <>
                    {outfitSlot("top", "Top", "top")}
                    {outfitSlot("bottom", "Bottoms", "bottom")}
                  </>
                )}
                {outfitSlot("shoes", "Shoes", "shoes")}
                {hasLayer && outfitSlot("outerwear", "Layer", "layer")}
              </div>
              <p className="muted small center">
                Tap a piece to see its details.
              </p>

              {look.missing.length > 0 && (
                <div className="callout warn">
                  <p>
                    <b>Still needed: {look.missing.join(", ")}.</b> These aren't
                    in your wardrobe yet or don't suit this occasion.
                  </p>
                  {onAdd && (
                    <button className="secondary small" onClick={onAdd}>
                      <Icon name="plus" /> Add a piece
                    </button>
                  )}
                </div>
              )}

              {recordId && (
                <div className="panel outfit-feedback">
                  <h3>Would you wear this?</h3>
                  <div className="feedback-actions">
                    <button
                      className={
                        rating === 1 ? "secondary selected" : "secondary"
                      }
                      aria-pressed={rating === 1}
                      disabled={busy}
                      onClick={() => rate(1)}
                    >
                      <Icon name="thumbsup" />
                      Yes
                    </button>
                    <button
                      className={
                        rating === -1 ? "secondary selected" : "secondary"
                      }
                      aria-pressed={rating === -1}
                      disabled={busy}
                      onClick={() => rate(-1)}
                    >
                      <Icon name="thumbsdown" />
                      Not for me
                    </button>
                  </div>
                  <details className="how" open={rating !== 0 || undefined}>
                    <summary>Add a reason</summary>
                    <label>
                      <span className="sr-only">Optional reason</span>
                      <textarea
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="What works, or what would you change?"
                      />
                    </label>
                    {rating !== 0 && (
                      <button
                        className="secondary small"
                        disabled={busy}
                        onClick={() => rate(rating)}
                      >
                        Update rating
                      </button>
                    )}
                  </details>
                  {rating !== 0 && (
                    <p role="status" className="muted small">
                      <Icon name="check" /> Thanks. This will shape future
                      looks.
                    </p>
                  )}
                </div>
              )}

              <details className="panel outfit-explanation">
                <summary>Why this look</summary>
                <p>{look.rationale}</p>
                {look.warnings.map((w) => (
                  <p className="muted small" key={w}>
                    <Icon name="info" /> {w}
                  </p>
                ))}
                <p className="muted small">
                  {look.totalCandidates} suitable{" "}
                  {look.totalCandidates === 1 ? "combination" : "combinations"}{" "}
                  available.
                  {look.exhausted
                    ? " You’ve seen them all; starting a new cycle."
                    : ""}
                </p>
              </details>
            </>
          ) : (
            <div className="studio-empty">
              <div className="studio-empty-art" aria-hidden="true">
                {(["top", "bottom", "shoes"] as const).map((c, n) => (
                  <Garment
                    key={c}
                    item={{
                      category: c,
                      subcategory: ["shirt", "trousers", "sneakers"][n],
                      primary_colour: ["light_blue", "beige", "white"][n],
                      pattern: "solid",
                    }}
                  />
                ))}
              </div>
              <h2>
                {activeCount
                  ? "Ready when you are"
                  : "Add pieces to start styling"}
              </h2>
              <p className="muted">
                {activeCount
                  ? "Pick an occasion and tap Style a look. We'll put together a top, bottoms and shoes from your wardrobe."
                  : "A top, some bottoms and a pair of shoes are enough for your first outfit."}
              </p>
              {!activeCount && onAdd && (
                <button className="primary" onClick={onAdd}>
                  <Icon name="plus" /> Add a piece
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
