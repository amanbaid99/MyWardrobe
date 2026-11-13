import { useEffect, useRef } from "react";
import { Icon } from "./Icon";

/** First step of adding clothes: AI capture or manual entry. */
export function AddSheet({
  demo,
  online,
  onAi,
  onManual,
  onClose,
  onSignIn,
}: {
  demo: boolean;
  online: boolean;
  onAi: () => void;
  onManual: () => void;
  onClose: () => void;
  onSignIn: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet add-sheet"
      aria-labelledby="add-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-head">
        <h2 id="add-title">Add to your wardrobe</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close add options"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="sheet-body add-options">
        <button
          className="add-option featured"
          disabled={demo || !online}
          onClick={onAi}
        >
          <span className="add-option-icon">
            <Icon name="camera" />
          </span>
          <span>
            <b>Snap or describe</b>
            <small>
              Take a photo or type a list of several pieces. AI fills in the
              details for you to check.
            </small>
          </span>
          <Icon name="arrow" />
        </button>
        {demo && (
          <p className="muted small">
            AI capture needs your account.{" "}
            <button className="link" onClick={onSignIn}>
              Sign in
            </button>{" "}
            to use it.
          </p>
        )}
        <button className="add-option" disabled={!online} onClick={onManual}>
          <span className="add-option-icon">
            <Icon name="edit" />
          </span>
          <span>
            <b>Add manually</b>
            <small>Pick the type, colour and style yourself.</small>
          </span>
          <Icon name="arrow" />
        </button>
      </div>
    </dialog>
  );
}
