import { useEffect, useRef } from "react";
import { colours, nice, type Item } from "./domain";
import {
  emptyFilters,
  facetCounts,
  facetKeys,
  facetLabels,
  occasionCounts,
  occasionOptions,
  sortOptions,
  type FacetKey,
  type Filters,
  type Sort,
} from "./filters";
import { Icon } from "./Icon";

/** Human label for a facet value. */
export function facetValueLabel(key: FacetKey | "occasion", value: string) {
  if (value === "unknown" || value === "") return "Not set";
  if (key === "occasion")
    return occasionOptions.find((o) => o.value === value)?.label || nice(value);
  if (key === "usage_group" && value === "out") return "Going out";
  if (key === "season" && value === "all") return "All-season";
  return nice(value);
}

export function FilterSheet({
  items,
  filters,
  sort,
  resultCount,
  onChange,
  onSort,
  onClose,
}: {
  items: Item[];
  filters: Filters;
  sort: Sort;
  resultCount: number;
  onChange: (filters: Filters) => void;
  onSort: (sort: Sort) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const toggle = (key: FacetKey, value: string) => {
    const current = filters[key];
    onChange({
      ...filters,
      [key]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  };
  const occasions = occasionCounts(items, filters);
  return (
    <dialog
      ref={ref}
      className="sheet filter-sheet"
      aria-labelledby="filter-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-head">
        <h2 id="filter-title">Filter & sort</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close filters"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="sheet-body stack filter-body">
        <div className="field">
          <span className="field-label">Sort by</span>
          <div className="choice-chips" role="group" aria-label="Sort by">
            {sortOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                className={
                  sort === o.value ? "choice-chip chosen" : "choice-chip"
                }
                aria-pressed={sort === o.value}
                onClick={() => onSort(o.value as Sort)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Occasion</span>
          <div
            className="choice-chips"
            role="group"
            aria-label="Occasion filter"
          >
            {occasionOptions
              .filter(
                (o) =>
                  o.value === "all" ||
                  occasions.get(o.value) ||
                  filters.occasion === o.value,
              )
              .map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={
                    filters.occasion === o.value
                      ? "choice-chip chosen"
                      : "choice-chip"
                  }
                  aria-pressed={filters.occasion === o.value}
                  onClick={() => onChange({ ...filters, occasion: o.value })}
                >
                  {o.label}
                  <small>{occasions.get(o.value) || 0}</small>
                </button>
              ))}
          </div>
        </div>
        {facetKeys.map((key) => {
          const counts = facetCounts(items, filters, key);
          const values = [...new Set([...counts.keys(), ...filters[key]])].sort(
            (a, b) =>
              Number(a === "unknown") - Number(b === "unknown") ||
              (key === "primary_colour"
                ? Object.keys(colours).indexOf(a) -
                  Object.keys(colours).indexOf(b)
                : a.localeCompare(b)),
          );
          // Hide facets that cannot narrow anything down.
          if (values.length < 2 && !filters[key].length) return null;
          return (
            <div className="field" key={key}>
              <span className="field-label">
                {facetLabels[key]}
                {key === "season" && <em>All-season pieces always show</em>}
              </span>
              <div
                className="choice-chips"
                role="group"
                aria-label={`${facetLabels[key]} filter`}
              >
                {values.map((value) => {
                  const on = filters[key].includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      className={on ? "choice-chip chosen" : "choice-chip"}
                      aria-pressed={on}
                      onClick={() => toggle(key, value)}
                    >
                      {key === "primary_colour" && (
                        <i
                          className="dot"
                          style={{
                            background: colours[value] || colours.unknown,
                          }}
                        />
                      )}
                      {facetValueLabel(key, value)}
                      <small>{counts.get(value) || 0}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sheet-foot">
        <button
          type="button"
          className="ghost"
          onClick={() => onChange({ ...emptyFilters })}
        >
          Clear all
        </button>
        <button type="button" className="primary" onClick={onClose}>
          Show {resultCount} {resultCount === 1 ? "piece" : "pieces"}
        </button>
      </div>
    </dialog>
  );
}
