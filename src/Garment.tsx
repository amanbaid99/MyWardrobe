import { useId } from "react";
import { colours, type Item } from "./domain";
export function Garment({
  item,
}: {
  item: Pick<Item, "category" | "primary_colour" | "subcategory" | "pattern">;
}) {
  const id = useId().replace(/:/g, "");
  const fill = colours[item.primary_colour] || colours.unknown;
  const shape =
    item.category === "top" || item.category === "outerwear"
      ? "M65 35 40 49 22 84 47 97 58 77 58 171 Q100 180 142 171 L142 77 153 97 178 84 160 49 135 35 Q100 54 65 35Z"
      : item.category === "bottom"
        ? "M58 33 142 33 150 177 112 177 100 91 88 177 50 177Z"
        : item.category === "one_piece"
          ? "M72 30 54 45 62 86 35 174 Q100 190 165 174 L138 86 146 45 128 30 Q100 49 72 30Z"
          : item.category === "shoes"
            ? "M40 85 67 89 80 114 119 129 161 134 Q179 138 177 158 L27 158 Q20 139 29 118Z"
            : "M38 90 Q100 63 162 90 L160 120 Q100 94 40 120Z";
  return (
    <svg
      viewBox="0 0 200 210"
      role="img"
      aria-label={`${item.primary_colour} ${item.subcategory}`}
    >
      <defs>
        <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={fill} />
          <path
            d={
              item.pattern === "striped"
                ? "M0 4H10"
                : item.pattern === "checked"
                  ? "M0 4H10 M4 0V10"
                  : ""
            }
            stroke="#fff"
            strokeOpacity=".35"
            strokeWidth="2"
          />
        </pattern>
        <filter id={`${id}shadow`} x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity=".1" />
        </filter>
      </defs>
      <ellipse cx="100" cy="187" rx="56" ry="5" fill="#000" opacity=".035" />
      <path
        d={shape}
        fill={`url(#${id})`}
        stroke="#343a32"
        strokeOpacity=".25"
        strokeWidth="1.5"
        strokeLinejoin="round"
        filter={`url(#${id}shadow)`}
      />
      {(item.category === "top" || item.category === "outerwear") && (
        <>
          <path
            d="M65 35 Q100 70 135 35 M58 162Q100 170 142 162"
            fill="none"
            stroke="#333"
            strokeOpacity=".2"
          />
          {(item.subcategory === "shirt" || item.category === "outerwear") && (
            <>
              <path
                d="M100 54V170 M75 40 90 65 100 53 110 65 125 40"
                fill="none"
                stroke="#333"
                strokeOpacity=".25"
              />
              {[80, 105, 130, 155].map((y) => (
                <circle
                  key={y}
                  cx="104"
                  cy={y}
                  r="1.5"
                  fill="#333"
                  opacity=".4"
                />
              ))}
            </>
          )}
        </>
      )}
      {item.category === "bottom" && (
        <path
          d="M59 47H141 M100 48V90 M60 53Q68 72 84 72 M140 53Q132 72 116 72"
          fill="none"
          stroke="#222"
          strokeOpacity=".25"
        />
      )}
      {item.category === "shoes" && (
        <path
          d="M27 150H177 M78 115 100 111 M86 122 108 118 M96 129 118 125"
          fill="none"
          stroke="#444"
          strokeOpacity=".35"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
