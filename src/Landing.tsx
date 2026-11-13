import type { CSSProperties } from "react";
import { Garment, garmentFill } from "./Garment";
import { Icon } from "./Icon";
import { demoWardrobe } from "./domain";

const showcase = [0, 9, 2, 8].map((i) => demoWardrobe[i]);

export function Landing({
  ready,
  onSignIn,
  onSample,
  onPrivacy,
}: {
  ready: boolean;
  onSignIn: () => void;
  onSample: () => void;
  onPrivacy: () => void;
}) {
  return (
    <div className="landing">
      <header className="landing-bar">
        <span className="brand">
          <span className="brandmark">w</span>wardrobe
        </span>
        <button className="ghost" onClick={onSignIn} disabled={!ready}>
          Sign in
        </button>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="kicker">
            <Icon name="sparkle" /> Your private closet
          </span>
          <h1>Get dressed faster with clothes you already own.</h1>
          <p className="lead">
            Keep every piece in one place, then let Wardrobe put together
            outfits for work, weekends and everything in between.
          </p>
          <div className="hero-actions">
            <button
              className="primary large"
              disabled={!ready}
              onClick={onSignIn}
            >
              Open my wardrobe <Icon name="arrow" />
            </button>
            <button className="secondary large" onClick={onSample}>
              Explore a sample wardrobe
            </button>
          </div>
          <p className="muted small">
            Sign in with the email you use for your tracker account.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          {showcase.map((item, n) => (
            <div
              key={item.item_id}
              className={`hero-tile hero-tile-${n}`}
              style={
                { "--tint": garmentFill(item.primary_colour) } as CSSProperties
              }
            >
              <Garment item={item} />
              <span>{item.display_name}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="features">
        {[
          [
            "camera",
            "Snap or describe",
            "Photograph a pile of clothes or type a list. AI suggests the details, and you confirm what gets saved.",
          ],
          [
            "outfits",
            "Outfits in a tap",
            "Pick an occasion and get a complete look from your own pieces. Rate looks to make the next one better.",
          ],
          [
            "shield",
            "Private by design",
            "Only you can see your wardrobe. Photos are never stored, and you can export or clear your data any time.",
          ],
        ].map(([icon, title, body]) => (
          <article key={title} className="feature">
            <span className="feature-icon">
              <Icon name={icon} />
            </span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <footer className="landing-foot">
        <span>© Wardrobe</span>
        <button className="link" onClick={onPrivacy}>
          Privacy & your data
        </button>
      </footer>
    </div>
  );
}
