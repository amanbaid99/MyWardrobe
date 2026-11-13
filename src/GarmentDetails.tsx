import { useEffect, useRef, type CSSProperties } from "react";
import { assignmentLabels, missingAssignments } from "./assignments";
import { Garment, garmentFill } from "./Garment";
import { Icon } from "./Icon";
import { labels, nice, type Item } from "./domain";

export function GarmentDetails({
  item,
  onClose,
  onEdit,
  onAssign,
  onArchive,
}: {
  item: Item;
  onClose: () => void;
  onEdit: () => void;
  onAssign?: () => void;
  onArchive?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const missing = missingAssignments(item);
  const known = (v?: string) => !!v && v !== "unknown";
  const facts = [
    ["Type", item.subcategory],
    ["Colour", item.primary_colour],
    ["Occasion", item.formality],
    ["Use", item.usage_group],
    ["Fit", item.fit],
    ["Pattern", item.pattern],
    ["Sleeves", item.sleeve_length],
    ["Season", item.season],
    ["Condition", item.condition],
    ["Material", item.material],
    ["Length", item.garment_length],
    ["Quantity", (item.quantity || 1) > 1 ? String(item.quantity) : ""],
  ].filter(([, v]) => known(v));
  return (
    <dialog
      ref={ref}
      className="sheet garment-details"
      aria-labelledby="details-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div
        className="details-art"
        style={{ "--tint": garmentFill(item.primary_colour) } as CSSProperties}
      >
        <Garment item={item} />
        <button
          className="icon-button floating"
          aria-label="Close garment details"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="sheet-body stack">
        <div>
          <p className="kicker">
            {labels[item.category]}
            {item.lifecycle_status === "archived" ? " · Archived" : ""}
          </p>
          <h2 id="details-title">{item.display_name}</h2>
        </div>
        {facts.length > 0 && (
          <dl className="facts">
            {facts.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>
                  {key === "Use" && value === "out" ? "Going out" : nice(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {item.style_tags && <p className="muted">Style: {item.style_tags}</p>}
        {item.notes && <p className="notes">{item.notes}</p>}
        {onAssign && missing.length > 0 && (
          <button className="assignment-action" onClick={onAssign}>
            Assign {missing.length} missing details
            <span>{missing.map((f) => assignmentLabels[f]).join(", ")}</span>
          </button>
        )}
      </div>
      <div className="sheet-foot">
        {onArchive && (
          <button className="ghost small foot-left" onClick={onArchive}>
            <Icon name="archive" />
            {item.lifecycle_status === "active" ? "Archive" : "Restore"}
          </button>
        )}
        <button className="secondary" onClick={onClose}>
          Close
        </button>
        <button className="primary" onClick={onEdit}>
          <Icon name="edit" />
          Edit piece
        </button>
      </div>
    </dialog>
  );
}
