import { useId } from "react";
import { colours, subtypes, type Item } from "./domain";
export function Garment({
  item,
}: {
  item: Pick<Item, "category" | "primary_colour" | "subcategory" | "pattern">;
}) {
  const id = useId().replace(/:/g, "");
  const fill = colours[item.primary_colour] || colours.unknown;
  const subtype = item.subcategory.toLowerCase();
  const shortSleeve = subtype === "t-shirt" || subtype === "polo";
  const generic =
    subtype === "other" || !subtypes[item.category].includes(subtype);
  const shape = generic
    ? "M60 45 140 45 155 165 45 165Z"
    : item.category === "top" || item.category === "outerwear"
      ? shortSleeve
        ? "M65 35 40 49 22 84 47 97 58 77 58 171 Q100 180 142 171 L142 77 153 97 178 84 160 49 135 35 Q100 54 65 35Z"
        : "M65 35 40 49 22 154 47 163 58 85 58 171 Q100 180 142 171 L142 85 153 163 178 154 160 49 135 35 Q100 54 65 35Z"
      : item.category === "bottom"
        ? subtype === "shorts"
          ? "M58 33H142L150 123H112L100 85 88 123H50Z"
          : subtype === "skirt"
            ? "M65 35H135L162 173Q100 188 38 173Z"
            : "M58 33 142 33 150 177 112 177 100 91 88 177 50 177Z"
        : item.category === "one_piece"
          ? subtype === "jumpsuit"
            ? "M72 30 54 45 62 86 50 181H88L100 115 112 181H150L138 86 146 45 128 30Q100 49 72 30Z"
            : "M72 30 54 45 62 86 35 174 Q100 190 165 174 L138 86 146 45 128 30 Q100 49 72 30Z"
          : item.category === "shoes"
            ? subtype === "boots"
              ? "M46 35H88L92 119 155 136Q174 139 173 158H29L35 116Z"
              : subtype === "heels"
                ? "M42 90 64 90 86 124 155 137Q174 141 172 157H88L60 132 51 176H37L38 126Z"
                : subtype === "sandals" || subtype === "flats"
                  ? "M35 128Q65 109 90 122L151 138Q176 141 171 160H32Q20 145 35 128Z"
                  : "M40 85 67 89 80 114 119 129 161 134 Q179 138 177 158 L27 158 Q20 139 29 118Z"
            : subtype === "bag"
              ? "M65 75V53Q100 15 135 53V75H155L166 171H34L45 75Z"
              : subtype === "hat"
                ? "M62 115 72 60Q100 40 128 60L138 115Q175 115 180 132Q100 163 20 132Q25 115 62 115Z"
                : subtype === "scarf"
                  ? "M65 36H108L130 165 93 177 81 80 66 171 36 161Z"
                  : subtype === "watch"
                    ? "M86 25H114V72Q150 100 114 128V180H86V128Q50 100 86 72Z"
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
      {item.category === "shoes" && (
        <path
          d={shape}
          transform="translate(14,-40) scale(.8)"
          fill={`url(#${id})`}
          stroke="#343a32"
          strokeOpacity=".25"
          strokeWidth="1.5"
        />
      )}
      <path
        d={shape}
        fill={`url(#${id})`}
        stroke="#343a32"
        strokeOpacity=".25"
        strokeWidth="1.5"
        strokeLinejoin="round"
        filter={`url(#${id}shadow)`}
      />
      {generic && (
        <text x="100" y="115" textAnchor="middle" fontSize="12" fill="#334b2d">
          Generic {item.category.replace("_", " ")}
        </text>
      )}
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
