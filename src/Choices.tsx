import { colours } from "./domain";
export function ColourChoices({
  value,
  onChange,
  multiple = false,
  label = "Primary colour",
}: {
  value: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  label?: string;
}) {
  const selected = value.split(/[,\s]+/).filter(Boolean);
  return (
    <div role="group" aria-label={label} className="choice-chips colour-chips">
      {Object.entries(colours)
        .filter(([key]) => !multiple || key !== "unknown")
        .map(([key, fill]) => (
          <button
            key={key}
            type="button"
            aria-pressed={multiple ? selected.includes(key) : value === key}
            className={
              (multiple ? selected.includes(key) : value === key)
                ? "choice-chip chosen"
                : "choice-chip"
            }
            onClick={() =>
              onChange(
                multiple
                  ? (selected.includes(key)
                      ? selected.filter((v) => v !== key)
                      : [...selected, key]
                    ).join(", ")
                  : key,
              )
            }
          >
            <span style={{ background: fill }} />
            {key}
          </button>
        ))}
    </div>
  );
}
export function FitChoices({
  value,
  onChange,
  optional = false,
}: {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  const values = [
    optional ? "" : "unknown",
    "regular",
    "relaxed",
    "slim",
    "straight",
    "oversized",
  ];
  if (value && !values.includes(value)) values.push(value);
  return (
    <div
      role="group"
      aria-label={optional ? "Preferred fit" : "Fit"}
      className="choice-chips"
    >
      {values.map((v) => (
        <button
          type="button"
          key={v}
          aria-pressed={value === v}
          className={value === v ? "choice-chip chosen" : "choice-chip"}
          onClick={() => onChange(v)}
        >
          {v || "No preference"}
        </button>
      ))}
    </div>
  );
}
