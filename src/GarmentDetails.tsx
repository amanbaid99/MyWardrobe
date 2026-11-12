import { useEffect, useRef } from "react";
import { Garment } from "./Garment";
import { Icon } from "./Icon";
import { labels, type Item } from "./domain";
export function GarmentDetails({
  item,
  onClose,
  onEdit,
}: {
  item: Item;
  onClose: () => void;
  onEdit: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="garment-details"
      aria-labelledby="details-title"
      onCancel={onClose}
    >
      <button
        className="close"
        aria-label="Close garment details"
        onClick={onClose}
      >
        ×
      </button>
      <div className="details-art">
        <Garment item={item} />
      </div>
      <p className="eyebrow">
        {labels[item.category]} · {item.lifecycle_status}
      </p>
      <h2 id="details-title">{item.display_name}</h2>
      <dl>
        {[
          ["Quantity", String(item.quantity || 1)],
          ["Use", item.usage_group || "unknown"],
          ["Condition", item.condition || "unknown"],
          ["Sleeves", item.sleeve_length || "unknown"],
          ["Colour", item.primary_colour],
          ["Type", item.subcategory],
          ["Pattern", item.pattern],
          ["Fit", item.fit],
          ["Occasion", item.formality],
          ["Season", item.season || "unknown"],
          ["Material", item.material || "unknown"],
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {item.notes && <p>{item.notes}</p>}
      <div className="modal-footer">
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
