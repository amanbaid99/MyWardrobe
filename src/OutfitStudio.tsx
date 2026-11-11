import { useEffect, useState } from "react";
import {
  suggest,
  type Item,
  type Look,
  type Preferences,
  type Feedback,
} from "./domain";
import { Garment } from "./Garment";
import { Icon } from "./Icon";
export function OutfitStudio({
  items,
  preferences,
  feedback,
  onEdit,
  onRecord,
  onRate,
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
}) {
  const [occasion, setOccasion] = useState("casual"),
    [request, setRequest] = useState(""),
    [look, setLook] = useState<Look | null>(null),
    [history, setHistory] = useState<string[]>([]),
    [recordId, setRecordId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [rating, setRating] = useState(0);
  const revision = JSON.stringify([items, preferences]);
  useEffect(() => {
    setLook(null);
    setHistory([]);
    setRecordId("");
    setRating(0);
    setError("");
  }, [revision, occasion, request]);
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
        onClick={() => onEdit(item)}
        title={`Edit ${item.display_name}`}
      >
        <Garment item={item} />
        <span>{item.display_name}</span>
        <small>
          {item.primary_colour} · {item.subcategory} <Icon name="edit" />
        </small>
      </button>
    ) : (
      <div className={`outfit-placeholder slot-${slot}`}>
        <span>{label}</span>
        <small>Not available for this look</small>
      </div>
    );
  };
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">MAKE MORE OF WHAT YOU OWN</p>
          <h1>
            Outfit studio<span className="heading-dot">.</span>
          </h1>
          <p>One complete view. Pieces that belong together.</p>
        </div>
      </section>
      <div className="studio-controls">
        <label>
          Occasion
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            disabled={busy}
          >
            <option value="casual">Everyday / casual</option>
            <option value="smart">Smart / work</option>
            <option value="formal">Formal</option>
          </select>
        </label>
        <label>
          Anything in mind? <span className="optional">Optional</span>
          <input
            maxLength={200}
            placeholder="e.g. blue shirt, no jeans"
            value={request}
            disabled={busy}
            onChange={(e) => setRequest(e.target.value)}
          />
        </label>
        <button className="primary" disabled={busy} onClick={generate}>
          <Icon name="outfits" />
          {busy
            ? "Checking your wardrobe…"
            : look
              ? "Another look"
              : "Style a look"}
        </button>
      </div>
      <p className="fine">
        Formal uses formal-rated pieces; smart uses smart or formal. Avoided
        colours are excluded. Requests recognise garment and colour names, and
        “no / avoid / without” exclusions.
      </p>
      {error && (
        <div role="alert" className="alert">
          {error}
          <button className="text-button" onClick={generate}>
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
                : `${occasion[0].toUpperCase() + occasion.slice(1)} · your personal edit`}
            </h2>
            <span className="pill">
              {look.missing.length ? "Incomplete look" : "All pieces owned"}
            </span>
          </div>
          <div className="outfit-composition">
            <div
              className="outfit-flatlay"
              aria-label="Coordinated outfit arranged from top to shoes"
            >
              {look.items.some((i) => i.category === "one_piece") ? (
                outfitSlot("one_piece", "One-piece", "one-piece")
              ) : (
                <>
                  {outfitSlot("top", "Top", "top")}
                  {outfitSlot("bottom", "Bottom", "bottom")}
                </>
              )}
              {outfitSlot("shoes", "Shoes", "shoes")}
              {look.items.some((i) => i.category === "outerwear") &&
                outfitSlot("outerwear", "Layer", "layer")}
              <span className="flatlay-caption">
                YOUR WARDROBE / CLICK A PIECE FOR DETAILS
              </span>
            </div>
            <aside className="look-notes">
              <p className="eyebrow">WHY THIS WORKS</p>
              <p>{look.rationale}</p>
              {look.missing.length > 0 && (
                <div className="missing">
                  <b>Still needed</b>
                  <ul>
                    {look.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <p>
                    These pieces are not owned or are unsuitable for the
                    selected constraints.
                  </p>
                </div>
              )}
              {look.warnings.map((w) => (
                <p className="fine" key={w}>
                  <Icon name="info" /> {w}
                </p>
              ))}
              <p className="fine">
                {look.totalCandidates} suitable{" "}
                {look.totalCandidates === 1 ? "combination" : "combinations"}{" "}
                available.
                {look.exhausted
                  ? " You’ve seen them all; starting a new cycle."
                  : ""}
              </p>
              {recordId && (
                <div className="outfit-feedback">
                  <h3>Would you wear this?</h3>
                  <label>
                    Optional reason
                    <textarea
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="What works—or what would you change?"
                    />
                  </label>
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
                  {rating !== 0 && (
                    <p role="status" className="fine">
                      Rating saved. It will influence future looks. Change the
                      reason and rate again to update it.
                    </p>
                  )}
                </div>
              )}
            </aside>
          </div>
        </>
      ) : (
        <div className="studio-empty">
          <Icon name="outfits" />
          <h2>A good outfit starts with your pieces.</h2>
          <p>
            Choose an occasion. We’ll arrange the top, bottoms and shoes as one
            look—no model needed.
          </p>
        </div>
      )}
    </>
  );
}
