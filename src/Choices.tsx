import { colours, nice } from "./domain";
export function ColourChoices({
  value,
  onChange,
  multiple = false,
  label = "Primary colour",
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const selected = value.split(/[,\s]+/).filter(Boolean);
  return (
    <div
      role="group"
      aria-label={label}
      className={`choice-chips colour-chips${compact ? " compact" : ""}`}
    >
      {Object.entries(colours)
        .filter(([key]) => !multiple || key !== "unknown")
        .map(([key, fill]) => (
          <button
            key={key}
            type="button"
            title={key === "unknown" ? "Not sure" : nice(key)}
            aria-label={
              compact ? (key === "unknown" ? "Not sure" : nice(key)) : undefined
            }
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
            {!compact && (key === "unknown" ? "Not sure" : nice(key))}
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
          {v === "unknown" ? "Not sure" : v ? nice(v) : "No preference"}
        </button>
      ))}
    </div>
  );
}
export type ChipOption = string | { value: string; label: string };
/** Single-choice chip group; replaces native selects for short option lists. */
export function Chips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ChipOption[];
  onChange: (value: string) => void;
}) {
  const list = options.map((o) =>
    typeof o === "string"
      ? { value: o, label: o === "unknown" ? "Not sure" : nice(o) }
      : o,
  );
  if (value && !list.some((o) => o.value === value))
    list.push({ value, label: nice(value) });
  return (
    <div role="group" aria-label={label} className="choice-chips">
      {list.map((o) => (
        <button
          type="button"
          key={o.value}
          aria-pressed={value === o.value}
          className={value === o.value ? "choice-chip chosen" : "choice-chip"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
