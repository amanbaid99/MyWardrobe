import { useEffect, useRef, useState, type CSSProperties } from "react";
import { categories, labels, nice, type Category, type Item } from "./domain";
import { Garment, garmentFill } from "./Garment";
import { Icon } from "./Icon";
import { assignmentLabels, missingAssignments } from "./assignments";

export function WardrobePage({
  items,
  busy,
  online,
  onAdd,
  onView,
  onAssign,
  onExportAll,
  onExportSelected,
  onSaveItem,
  onStyle,
  onError,
  onNotice,
  setBusy,
}: {
  items: Item[];
  busy: boolean;
  online: boolean;
  onAdd: () => void;
  onView: (item: Item) => void;
  onAssign: (id: string) => void;
  onExportAll: () => void;
  onExportSelected: (items: Item[]) => void;
  onSaveItem: (item: Item) => Promise<Item>;
  onStyle: () => void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
  setBusy: (busy: boolean) => void;
}) {
  const [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [archive, setArchive] = useState(false),
    [needsDetails, setNeedsDetails] = useState(false),
    [selectMode, setSelectMode] = useState(false),
    [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()),
    [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const active = items.filter((i) => i.lifecycle_status === "active");
  const archivedCount = items.length - active.length;
  const pool = archive
    ? items.filter((i) => i.lifecycle_status === "archived")
    : active;
  const needing = active.filter((i) => missingAssignments(i).length > 0);
  const q = query.trim().toLowerCase();
  const filtered = pool.filter(
    (i) =>
      (category === "all" || i.category === category) &&
      (!needsDetails || missingAssignments(i).length > 0) &&
      `${i.display_name} ${i.subcategory} ${i.primary_colour} ${i.notes} ${i.style_tags || ""}`
        .toLowerCase()
        .replaceAll("_", " ")
        .includes(q),
  );
  const categoryCount = new Set(active.map((i) => i.category)).size;
  const filtersOn = needsDetails || !!q || category !== "all";

  async function archiveSelected() {
    setBusy(true);
    onError("");
    try {
      for (const item of items.filter((i) => selectedIds.has(i.item_id))) {
        await onSaveItem({
          ...item,
          lifecycle_status: archive ? "active" : "archived",
        });
        setSelectedIds((p) => {
          const n = new Set(p);
          n.delete(item.item_id);
          return n;
        });
      }
      onNotice(
        archive ? "Selected pieces restored." : "Selected pieces archived.",
      );
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const finishSelecting = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{archive ? "Archived pieces" : "My wardrobe"}</h1>
          <p className="muted">
            {archive
              ? `${pool.length} archived ${pool.length === 1 ? "piece" : "pieces"}`
              : active.length
                ? `${active.length} ${active.length === 1 ? "piece" : "pieces"} · ${categoryCount} ${categoryCount === 1 ? "category" : "categories"}`
                : "Start with a few everyday favourites."}
          </p>
        </div>
        <div className="head-actions">
          {active.length > 0 && (
            <button className="secondary hide-mobile" onClick={onStyle}>
              <Icon name="outfits" /> Style a look
            </button>
          )}
          <button
            className="primary"
            disabled={busy || !online}
            onClick={onAdd}
          >
            <Icon name="plus" /> Add a piece
          </button>
        </div>
      </header>

      {archive && (
        <div className="callout">
          <p>Archived pieces are kept but never used in outfits.</p>
          <button className="secondary small" onClick={() => setArchive(false)}>
            Back to wardrobe
          </button>
        </div>
      )}

      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            aria-label="Search your wardrobe"
            placeholder="Search by name, colour or type"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="menu-wrap" ref={menuRef}>
          <button
            className="icon-button outlined"
            aria-label="More wardrobe options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name="more" />
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setSelectMode(true);
                  setSelectedIds(new Set());
                }}
              >
                <Icon name="select" /> Select pieces
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setArchive((v) => !v);
                  finishSelecting();
                }}
              >
                <Icon name="archive" />
                {archive ? "Show wardrobe" : `Show archived (${archivedCount})`}
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onExportAll();
                }}
              >
                <Icon name="download" /> Export wardrobe
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="chip-row" aria-label="Filter by category">
        {["all", ...categories].map((c) => {
          const count = pool.filter(
            (i) => c === "all" || i.category === c,
          ).length;
          return (
            <button
              key={c}
              className={`filter-chip${category === c ? " on" : ""}${count ? "" : " zero"}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c === "all" ? "All" : labels[c as Category]}{" "}
              <small>{count}</small>
            </button>
          );
        })}
      </div>

      {!archive && needing.length > 0 && !needsDetails && (
        <div className="callout nudge">
          <Icon name="sparkle" />
          <p>
            <b>
              {needing.length}{" "}
              {needing.length === 1 ? "piece needs" : "pieces need"} a few
              details.
            </b>{" "}
            Filling them in makes outfit suggestions better.
          </p>
          <button
            className="secondary small"
            onClick={() => setNeedsDetails(true)}
          >
            Review pieces
          </button>
        </div>
      )}
      {needsDetails && (
        <div className="callout">
          <p>Showing pieces with missing details.</p>
          <button
            className="secondary small"
            onClick={() => setNeedsDetails(false)}
          >
            Show all
          </button>
        </div>
      )}
      {selectMode && (
        <div className="callout select-bar">
          <p>
            <b>{selectedIds.size} selected.</b> Tap pieces to select them.
          </p>
          <button
            className="ghost small"
            onClick={() =>
              setSelectedIds(new Set(filtered.map((i) => i.item_id)))
            }
          >
            Select all
          </button>
          <button className="secondary small" onClick={finishSelecting}>
            Done
          </button>
        </div>
      )}

      {filtered.length ? (
        <section className="garment-grid">
          {filtered.map((item) => {
            const missing = missingAssignments(item);
            const picked = selectedIds.has(item.item_id);
            return (
              <div
                className={`card-wrap${picked ? " picked" : ""}`}
                key={item.item_id}
              >
                {selectMode && (
                  <label className="piece-select">
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.display_name}`}
                      checked={picked}
                      onChange={(e) =>
                        setSelectedIds((p) => {
                          const n = new Set(p);
                          e.target.checked
                            ? n.add(item.item_id)
                            : n.delete(item.item_id);
                          return n;
                        })
                      }
                    />
                  </label>
                )}
                <button
                  className="garment-card"
                  onClick={() => {
                    if (selectMode) {
                      setSelectedIds((p) => {
                        const n = new Set(p);
                        n.has(item.item_id)
                          ? n.delete(item.item_id)
                          : n.add(item.item_id);
                        return n;
                      });
                      return;
                    }
                    onError("");
                    onView({ ...item });
                  }}
                >
                  <span
                    className="garment-canvas"
                    style={
                      {
                        "--tint": garmentFill(item.primary_colour),
                      } as CSSProperties
                    }
                  >
                    <Garment item={item} />
                    {missing.length > 0 && (
                      <span className="badge">
                        Needs details · {missing.length}
                      </span>
                    )}
                    {(item.quantity || 1) > 1 && (
                      <span className="qty">×{item.quantity}</span>
                    )}
                  </span>
                  <span className="card-info">
                    <span className="card-title">{item.display_name}</span>
                    <span className="card-meta">
                      <span
                        className="swatch"
                        style={{ background: garmentFill(item.primary_colour) }}
                      />
                      {item.primary_colour === "unknown"
                        ? "Colour?"
                        : nice(item.primary_colour)}
                      <span aria-hidden="true">·</span>
                      {nice(item.subcategory)}
                    </span>
                  </span>
                </button>
                {needsDetails && missing.length > 0 && (
                  <button
                    className="assignment-action"
                    onClick={() => onAssign(item.item_id)}
                  >
                    Assign details
                    <span>
                      {missing.map((f) => assignmentLabels[f]).join(", ")}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
          {!archive && !selectMode && (
            <button
              className="add-card"
              disabled={busy || !online}
              onClick={onAdd}
            >
              <span className="add-card-icon">
                <Icon name="plus" />
              </span>
              <b>Add another</b>
            </button>
          )}
        </section>
      ) : (
        <section className="empty">
          <div className="empty-art">
            <Garment
              item={{
                category: category === "all" ? "top" : (category as Category),
                subcategory: "other",
                primary_colour: "unknown",
                pattern: "solid",
              }}
            />
          </div>
          <h2>
            {needsDetails
              ? "No pieces need details in this view"
              : q
                ? "No matching pieces"
                : archive
                  ? "Nothing archived"
                  : category !== "all"
                    ? `No ${labels[category as Category].toLowerCase()} yet`
                    : "Your wardrobe starts with one piece."}
          </h2>
          <p className="muted">
            {filtersOn
              ? "Try another colour, name or category, or clear your filters."
              : archive
                ? "Pieces you archive will show up here."
                : "Add a few everyday favourites: a top, some bottoms and a pair of shoes is enough for your first outfit."}
          </p>
          <div className="empty-actions">
            {filtersOn && (
              <button
                className="secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                  setNeedsDetails(false);
                }}
              >
                Clear filters
              </button>
            )}
            {!needsDetails && !archive && !q && (
              <button className="primary" disabled={!online} onClick={onAdd}>
                <Icon name="plus" /> Add your first piece
              </button>
            )}
          </div>
        </section>
      )}

      {selectMode && selectedIds.size > 0 && (
        <div
          className="bulk-action-bar"
          role="region"
          aria-label="Selected garment actions"
        >
          <b>{selectedIds.size} selected</b>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              onExportSelected(items.filter((i) => selectedIds.has(i.item_id)))
            }
          >
            <Icon name="download" /> Export
          </button>
          <button
            className="primary"
            disabled={busy || !online}
            onClick={archiveSelected}
          >
            <Icon name="archive" />
            {busy ? "Saving…" : archive ? "Restore" : "Archive"}
          </button>
        </div>
      )}
      <button
        className="fab"
        aria-label="Add a piece (quick)"
        disabled={busy || !online}
        onClick={onAdd}
      >
        <Icon name="plus" />
      </button>
    </>
  );
}
