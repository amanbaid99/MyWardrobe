import { useId, type ReactNode } from "react";
import { colours, type Item } from "./domain";

type GarmentItem = Pick<
  Item,
  "category" | "primary_colour" | "subcategory" | "pattern"
> &
  Partial<Pick<Item, "sleeve_length">>;

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Lighten (amount > 0) or darken (amount < 0) a hex colour. */
export function shade(hex: string, amount: number) {
  const rgb = hexToRgb(hex).map((c) =>
    Math.round(
      amount < 0 ? c * (1 + amount) : c + (255 - c) * Math.min(amount, 1),
    ),
  );
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
export const garmentFill = (colour: string) =>
  colours[colour] || colours.unknown;

const defaultSleeve: Record<string, string> = {
  "t-shirt": "half",
  polo: "half",
  vest: "sleeveless",
};

/**
 * Deterministic flat-lay illustration of a garment, drawn from its saved
 * details only. No photos are stored or rendered.
 */
export function Garment({ item }: { item: GarmentItem }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fill = garmentFill(item.primary_colour);
  const dark = luminance(fill) < 0.32;
  const outline = dark ? shade(fill, -0.45) : shade(fill, -0.38);
  const detail = dark ? shade(fill, 0.32) : shade(fill, -0.42);
  const subtype = item.subcategory.toLowerCase();
  const paint = `url(#${uid}p)`;
  const shadeFill = `url(#${uid}g)`;
  const base = {
    fill: paint,
    stroke: outline,
    strokeWidth: 1.6,
    strokeLinejoin: "round" as const,
  };
  const line = {
    fill: "none",
    stroke: detail,
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    opacity: 0.75,
  };
  /** Body shape with a soft light-to-shadow overlay. */
  const body = (d: string, extra: Record<string, unknown> = {}) => (
    <>
      <path d={d} {...base} {...extra} />
      <path d={d} fill={shadeFill} pointerEvents="none" />
    </>
  );
  const buttons = (x: number, ys: number[], r = 1.9) =>
    ys.map((y) => (
      <circle
        key={`${x}-${y}`}
        cx={x}
        cy={y}
        r={r}
        fill={detail}
        opacity=".8"
      />
    ));

  let art: ReactNode;
  let pair = false;

  const topBody = (sleeve: string, bottom = 168) =>
    sleeve === "sleeveless"
      ? `M74 36 Q68 58 60 70 L60 ${bottom} Q100 ${bottom + 6} 140 ${bottom} L140 70 Q132 58 126 36 Q100 54 74 36Z`
      : sleeve === "half"
        ? `M72 36 L52 43 L26 70 L43 90 L59 78 L59 ${bottom} Q100 ${bottom + 6} 141 ${bottom} L141 78 L157 90 L174 70 L148 43 L128 36 Q100 54 72 36Z`
        : `M72 36 L51 44 L36 98 L29 158 L47 162 L59 106 L59 ${bottom} Q100 ${bottom + 6} 141 ${bottom} L141 106 L153 162 L171 158 L164 98 L149 44 L128 36 Q100 54 72 36Z`;
  const sleeve =
    item.sleeve_length && item.sleeve_length !== "unknown"
      ? item.sleeve_length
      : defaultSleeve[subtype] || "full";

  switch (item.category) {
    case "top": {
      const s = subtype === "vest" ? "sleeveless" : sleeve;
      const long = subtype === "kurta";
      const hem = long ? 190 : 168;
      art = (
        <>
          {subtype === "hoodie" && (
            <path
              d="M70 40 Q70 8 100 8 Q130 8 130 40 Q100 58 70 40Z"
              {...base}
            />
          )}
          {body(topBody(s, hem))}
          {subtype === "shirt" || subtype === "blouse" ? (
            <>
              {subtype === "shirt" && (
                <path
                  d="M76 34 L90 60 L100 46 L110 60 L124 34 Q100 50 76 34Z"
                  {...base}
                />
              )}
              <path
                d={`M100 ${subtype === "shirt" ? 48 : 54}V${hem}`}
                {...line}
              />
              {buttons(
                104,
                subtype === "shirt" ? [66, 88, 110, 132, 154] : [70, 94, 118],
              )}
              {subtype === "shirt" && (
                <path d="M114 78h16v15q-8 4-16 0Z" {...line} />
              )}
              {subtype === "blouse" && (
                <path
                  d="M80 38 Q100 64 120 38 M92 60 Q100 70 108 60"
                  {...line}
                />
              )}
            </>
          ) : subtype === "polo" ? (
            <>
              <path
                d="M76 34 L88 54 L100 46 L112 54 L124 34 Q100 48 76 34Z"
                {...base}
              />
              <path d="M100 46V80" {...line} />
              {buttons(104, [56, 70])}
              <path d="M44 86 L58 76 M156 86 L142 76" {...line} />
            </>
          ) : subtype === "hoodie" ? (
            <>
              <path d="M76 132 L124 132 L132 162 L68 162Z" {...line} />
              <path d="M92 44 V74 M108 44 V74" {...line} />
              <circle cx="92" cy="76" r="2.2" fill={detail} />
              <circle cx="108" cy="76" r="2.2" fill={detail} />
              <path
                d="M60 158H140 M30 150 L48 154 M170 150 L152 154"
                {...line}
              />
            </>
          ) : subtype === "sweater" ? (
            <>
              <path d="M72 36 Q100 62 128 36 M76 40 Q100 66 124 40" {...line} />
              <path d="M60 156H140" {...line} />
              {[68, 80, 92, 104, 116, 128].map((x) => (
                <path key={x} d={`M${x} 158V168`} {...line} opacity=".45" />
              ))}
              <path d="M30 150 L48 154 M170 150 L152 154" {...line} />
            </>
          ) : subtype === "kurta" ? (
            <>
              <path
                d="M84 40 Q100 50 116 40 L116 34 Q100 44 84 34Z"
                {...base}
              />
              <path d="M100 46V100" {...line} />
              {buttons(104, [56, 70, 84])}
              <path
                d={`M60 ${hem - 34}V${hem} M140 ${hem - 34}V${hem}`}
                {...line}
              />
            </>
          ) : (
            <path d="M72 36 Q100 58 128 36 M74 40 Q100 61 126 40" {...line} />
          )}
        </>
      );
      break;
    }
    case "outerwear": {
      if (subtype === "coat") {
        art = (
          <>
            {body(
              "M72 30 L50 38 L36 98 L30 168 L48 172 L58 108 L58 190 L142 190 L142 108 L152 172 L170 168 L164 98 L150 38 L128 30 Q100 44 72 30Z",
            )}
            <path d="M72 30 L100 98 L128 30 M84 34 L100 78 L116 34" {...line} />
            <path
              d="M58 112H142"
              stroke={detail}
              strokeWidth="6"
              opacity=".35"
            />
            {buttons(88, [124, 148])}
            {buttons(112, [124, 148])}
            <path d="M100 98V190" {...line} />
          </>
        );
      } else if (subtype === "blazer") {
        art = (
          <>
            {body(
              "M72 32 L51 40 L36 98 L30 160 L48 164 L59 106 L60 172 Q100 178 140 172 L141 106 L152 164 L170 160 L164 98 L149 40 L128 32 Q100 46 72 32Z",
            )}
            <path
              d="M72 32 L84 72 L78 80 L100 120 L122 80 L116 72 L128 32"
              {...base}
              fill={shadeFill}
            />
            <path
              d="M72 32 L84 72 L78 80 L100 120 L122 80 L116 72 L128 32"
              {...line}
            />
            <path d="M100 120V174" {...line} />
            {buttons(104, [132, 150])}
            <path d="M68 140h20 M112 140h20 M116 70h14" {...line} />
          </>
        );
      } else if (subtype === "cardigan") {
        art = (
          <>
            {body(topBody("full"))}
            <path d="M72 36 L100 100 L128 36" {...line} />
            <path d="M100 100V172" {...line} />
            {buttons(104, [112, 130, 148])}
            <path d="M60 158H140 M30 150 L48 154 M170 150 L152 154" {...line} />
          </>
        );
      } else {
        art = (
          <>
            {body(topBody("full"))}
            <path d="M80 30 Q100 40 120 30 L124 40 Q100 52 76 40Z" {...base} />
            <path
              d="M100 48V172"
              stroke={detail}
              strokeWidth="2"
              opacity=".7"
            />
            <path d="M70 128h18 M112 128h18 M60 160H140" {...line} />
            <path d="M30 150 L48 154 M170 150 L152 154" {...line} />
          </>
        );
      }
      break;
    }
    case "bottom": {
      if (subtype === "shorts") {
        art = (
          <>
            {body("M58 40 L142 40 L150 128 L108 132 L100 84 L92 132 L50 128Z")}
            <path d="M58 52H142 M100 52V82" {...line} />
            <path d="M62 58 Q70 76 86 76 M138 58 Q130 76 114 76" {...line} />
            <path d="M52 120 L91 124 M148 120 L109 124" {...line} />
          </>
        );
      } else if (subtype === "skirt") {
        art = (
          <>
            {body("M68 36 L132 36 L162 172 Q100 186 38 172Z")}
            <path d="M68 50H132" {...line} />
            <path
              d="M84 52 L74 176 M100 52V180 M116 52 L126 176"
              {...line}
              opacity=".4"
            />
          </>
        );
      } else {
        const jeans = subtype === "jeans";
        const stitch = jeans ? "#d9a441" : detail;
        art = (
          <>
            {body("M60 28 L140 28 L148 188 L110 188 L100 76 L90 188 L52 188Z")}
            <path d="M60 41H140" {...line} />
            {[70, 100, 130].map((x) => (
              <path key={x} d={`M${x} 28V42`} {...line} />
            ))}
            <path
              d="M64 46 Q72 66 88 66 M136 46 Q128 66 112 66"
              {...line}
              stroke={stitch}
              strokeDasharray={jeans ? "3 3" : undefined}
              opacity={jeans ? 0.9 : 0.75}
            />
            <path
              d={jeans ? "M100 42V70 Q100 78 92 78" : "M100 42V74"}
              {...line}
              stroke={stitch}
              strokeDasharray={jeans ? "3 3" : undefined}
            />
            {!jeans && (
              <path
                d="M74 80 L71 186 M126 80 L129 186"
                {...line}
                opacity=".35"
              />
            )}
          </>
        );
      }
      break;
    }
    case "one_piece": {
      if (subtype === "jumpsuit") {
        art = (
          <>
            {body(
              "M76 24 L88 24 Q100 40 112 24 L124 24 L132 96 L142 190 L108 190 L100 120 L92 190 L58 190 L68 96Z",
            )}
            <path
              d="M68 96H132"
              stroke={detail}
              strokeWidth="5"
              opacity=".35"
            />
            <path d="M100 38V96" {...line} />
            {buttons(104, [50, 66, 82])}
          </>
        );
      } else {
        art = (
          <>
            {body(
              "M78 22 L88 22 Q100 38 112 22 L122 22 L128 68 Q132 84 126 96 L166 180 Q100 196 34 180 L74 96 Q68 84 72 68Z",
            )}
            <path d="M74 96 Q100 102 126 96" {...line} />
            <path
              d="M88 104 L70 182 M112 104 L130 182 M100 104V186"
              {...line}
              opacity=".35"
            />
          </>
        );
      }
      break;
    }
    case "shoes": {
      pair = true;
      const sole = shade(fill, luminance(fill) > 0.8 ? -0.12 : -0.5);
      const shoe =
        subtype === "boots"
          ? {
              upper:
                "M50 46 L94 46 L96 110 Q122 118 152 126 Q176 132 176 150 L44 150 L46 104Z",
              sole: "M42 150 L178 150 Q180 162 168 164 L46 164 Q40 162 42 150Z",
              extra: (
                <>
                  <path d="M50 58H94 M96 110 L84 116" {...line} />
                  <path d="M72 46 L72 34 Q80 30 84 36 L84 46" {...base} />
                  {[66, 80, 94].map((y) => (
                    <path key={y} d={`M64 ${y}h24`} {...line} />
                  ))}
                </>
              ),
            }
          : subtype === "heels"
            ? {
                upper:
                  "M44 98 Q56 92 70 106 Q100 132 146 138 Q172 142 172 154 L158 156 Q110 154 82 142 L66 140 Q48 128 44 98Z",
                sole: "M60 140 L68 140 L60 176 L52 176Z",
                extra: <path d="M70 108 Q96 130 140 138" {...line} />,
              }
            : subtype === "sandals" || subtype === "slippers"
              ? {
                  upper:
                    subtype === "slippers"
                      ? "M88 116 Q110 104 150 116 L156 146 L84 146Z"
                      : "M70 118 Q76 104 90 112 L92 146 L80 146Z M112 112 Q132 104 150 120 L152 146 L116 146Z",
                  sole: "M30 146 L176 146 Q184 156 172 160 L38 160 Q24 156 30 146Z",
                  extra: <path d="M40 146 L170 146" {...line} />,
                }
              : subtype === "clogs"
                ? {
                    upper: "M40 146 Q36 104 82 98 L128 98 Q170 104 174 146Z",
                    sole: "M36 146 L178 146 Q180 160 166 162 L48 162 Q34 160 36 146Z",
                    extra: (
                      <>
                        {[96, 112, 128, 144].map((x) => (
                          <circle
                            key={x}
                            cx={x}
                            cy="114"
                            r="3"
                            fill={detail}
                            opacity=".6"
                          />
                        ))}
                        <path d="M60 100 Q40 120 50 146" {...line} />
                      </>
                    ),
                  }
                : subtype === "loafers" ||
                    subtype === "flats" ||
                    subtype === "formal-shoes"
                  ? {
                      upper:
                        subtype === "flats"
                          ? "M32 148 Q34 126 58 124 L120 126 Q160 130 176 144 L176 150 L32 150Z"
                          : "M32 148 Q32 116 58 112 L84 112 Q104 120 130 124 Q166 130 176 142 L176 150 L32 150Z",
                      sole: "M30 150 L180 150 Q182 158 172 160 L36 160 Q28 158 30 150Z",
                      extra:
                        subtype === "loafers" ? (
                          <path
                            d="M92 118 Q112 112 136 126 M98 126 L132 132"
                            {...line}
                          />
                        ) : subtype === "formal-shoes" ? (
                          <>
                            <path d="M84 112 Q100 128 128 126" {...line} />
                            <path
                              d="M96 116 L106 112 M102 120 L112 116 M108 124 L118 120"
                              {...line}
                            />
                          </>
                        ) : (
                          <path d="M64 128 Q100 138 146 132" {...line} />
                        ),
                    }
                  : {
                      upper:
                        "M30 142 Q28 104 52 98 L84 94 Q96 110 120 116 L158 124 Q178 128 178 146 L178 148 L30 148Z",
                      sole: "M26 148 L182 148 Q184 162 172 164 L36 164 Q22 162 26 148Z",
                      extra: (
                        <>
                          <path
                            d="M88 100 L100 96 M94 108 L106 104 M100 115 L112 110"
                            {...line}
                            strokeWidth="2.4"
                          />
                          <path
                            d="M140 122 Q150 134 178 138 M50 104 Q60 126 54 146"
                            {...line}
                          />
                        </>
                      ),
                    };
      const one = (
        <>
          {body(shoe.upper)}
          <path
            d={shoe.sole}
            fill={
              subtype === "sneakers" || subtype === "other" ? "#f4f2ec" : sole
            }
            stroke={outline}
            strokeWidth="1.4"
          />
          {shoe.extra}
        </>
      );
      art = (
        <>
          <g
            transform="translate(-10,-22)"
            style={{ filter: "brightness(.84)" }}
          >
            {one}
          </g>
          {one}
        </>
      );
      break;
    }
    case "accessory": {
      switch (subtype) {
        case "bag":
          art = (
            <>
              <path
                d="M70 84 Q70 34 100 34 Q130 34 130 84"
                fill="none"
                stroke={outline}
                strokeWidth="7"
              />
              {body("M46 80 L154 80 L164 176 Q100 184 36 176Z")}
              <path d="M46 98H154" {...line} />
            </>
          );
          break;
        case "scarf":
          art = (
            <>
              {body("M62 40 Q100 56 138 40 L134 72 Q100 86 66 72Z")}
              {body("M106 70 L130 72 L140 176 L112 180Z")}
              {body("M78 72 L100 76 L92 160 L66 156Z")}
              <path
                d="M114 180 L114 190 M122 179 L122 189 M130 178 L130 188 M70 156 L68 166 M78 158 L76 168 M86 159 L84 169"
                {...line}
              />
            </>
          );
          break;
        case "hat":
          art = (
            <>
              {body(
                "M22 130 Q100 160 178 130 Q170 116 150 118 L64 118 Q30 116 22 130Z",
              )}
              {body("M62 120 L70 70 Q100 50 130 70 L138 120 Q100 130 62 120Z")}
              <path
                d="M64 108 Q100 118 136 108"
                stroke={detail}
                strokeWidth="6"
                opacity=".4"
                fill="none"
              />
            </>
          );
          break;
        case "watch":
          art = (
            <>
              {body(
                "M84 20 L116 20 L114 70 L86 70Z M86 130 L114 130 L116 182 L84 182Z",
              )}
              <circle
                cx="100"
                cy="100"
                r="34"
                fill="#c9ccd0"
                stroke={outline}
                strokeWidth="2"
              />
              <circle
                cx="100"
                cy="100"
                r="27"
                fill="#fbfaf7"
                stroke={outline}
                strokeWidth="1.2"
              />
              <path
                d="M100 100V82 M100 100L112 106"
                stroke="#2b2d2f"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <rect x="134" y="96" width="6" height="8" rx="2" fill="#c9ccd0" />
            </>
          );
          break;
        case "socks":
          pair = true;
          art = (
            <>
              <g
                transform="translate(-16,-8)"
                style={{ filter: "brightness(.85)" }}
              >
                {body(
                  "M70 30 L104 30 L104 120 Q104 132 116 140 L140 152 Q156 162 148 176 Q140 188 124 180 L80 156 Q70 150 70 136Z",
                )}
              </g>
              {body(
                "M84 40 L118 40 L118 126 Q118 138 130 146 L154 158 Q170 168 162 182 Q154 194 138 186 L94 162 Q84 156 84 142Z",
              )}
              <path d="M84 52H118 M84 60H118" {...line} />
            </>
          );
          break;
        case "underwear":
          art = (
            <>
              {body(
                "M40 64 L160 64 L156 92 Q122 106 112 148 L88 148 Q78 106 44 92Z",
              )}
              <path
                d="M40 76H160"
                stroke={detail}
                strokeWidth="5"
                opacity=".4"
              />
            </>
          );
          break;
        case "handkerchief":
          art = (
            <>
              {body("M40 48 L160 48 L160 160 L40 160Z")}
              <path d="M50 58H150V150H50Z" {...line} strokeDasharray="4 3" />
              <path d="M40 48 L100 104" {...line} opacity=".3" />
            </>
          );
          break;
        case "eyewear":
          art = (
            <>
              <path
                d="M20 92 L40 86 M180 92 L160 86"
                stroke={outline}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <rect
                x="34"
                y="82"
                width="56"
                height="44"
                rx="18"
                fill={paint}
                stroke={outline}
                strokeWidth="4"
                fillOpacity=".55"
              />
              <rect
                x="110"
                y="82"
                width="56"
                height="44"
                rx="18"
                fill={paint}
                stroke={outline}
                strokeWidth="4"
                fillOpacity=".55"
              />
              <path
                d="M90 96 Q100 88 110 96"
                fill="none"
                stroke={outline}
                strokeWidth="4"
              />
              <path
                d="M44 92 L58 106 M120 92 L134 106"
                stroke="#fff"
                strokeWidth="3"
                opacity=".5"
                strokeLinecap="round"
              />
            </>
          );
          break;
        default:
          art = (
            <>
              <path
                d="M30 120 Q22 120 22 104 Q22 88 30 88"
                fill="none"
                stroke={outline}
                strokeWidth="1.6"
              />
              {body(
                "M30 88 L176 88 Q182 88 182 94 L182 114 Q182 120 176 120 L30 120Z",
              )}
              <rect
                x="22"
                y="80"
                width="38"
                height="48"
                rx="6"
                fill="none"
                stroke="#b9b4a9"
                strokeWidth="6"
              />
              <path
                d="M40 104 H62"
                stroke="#b9b4a9"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {[110, 126, 142, 158].map((x) => (
                <circle
                  key={x}
                  cx={x}
                  cy="104"
                  r="3"
                  fill={detail}
                  opacity=".7"
                />
              ))}
            </>
          );
      }
      break;
    }
    case "fragrance": {
      const tall = subtype === "cologne" || subtype === "body-mist";
      const liquid = shade(fill, 0.15);
      art = tall ? (
        <>
          <rect x="88" y="16" width="24" height="26" rx="4" fill="#2f3133" />
          <rect x="94" y="40" width="12" height="10" fill="#b8b6b0" />
          <rect
            x="70"
            y="50"
            width="60"
            height="134"
            rx="14"
            fill="#fff"
            fillOpacity=".5"
            stroke={outline}
            strokeWidth="1.6"
          />
          <rect x="74" y="74" width="52" height="106" rx="10" fill={liquid} />
          <rect
            x="80"
            y="104"
            width="40"
            height="30"
            rx="3"
            fill="#fbfaf7"
            opacity=".9"
          />
          <path
            d="M80 60 V170"
            stroke="#fff"
            strokeWidth="4"
            opacity=".45"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <rect
            x="84"
            y="28"
            width="32"
            height="30"
            rx="5"
            fill="#c5a344"
            stroke={shade("#c5a344", -0.3)}
          />
          <rect x="94" y="56" width="12" height="12" fill="#b8b6b0" />
          <rect
            x="46"
            y="66"
            width="108"
            height="112"
            rx="22"
            fill="#fff"
            fillOpacity=".5"
            stroke={outline}
            strokeWidth="1.6"
          />
          <rect x="52" y="86" width="96" height="86" rx="16" fill={liquid} />
          <rect
            x="70"
            y="106"
            width="60"
            height="34"
            rx="4"
            fill="#fbfaf7"
            opacity=".9"
          />
          <path
            d="M60 80 V164"
            stroke="#fff"
            strokeWidth="5"
            opacity=".45"
            strokeLinecap="round"
          />
        </>
      );
      break;
    }
  }

  const patternPath =
    item.pattern === "striped"
      ? "M0 3H12 M0 9H12"
      : item.pattern === "checked"
        ? "M0 4H12 M4 0V12"
        : "";
  return (
    <svg
      className="garment-art"
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${item.primary_colour.replaceAll("_", " ")} ${item.subcategory}`}
    >
      <defs>
        <pattern
          id={`${uid}p`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="12" height="12" fill={fill} />
          {patternPath && (
            <path
              d={patternPath}
              stroke={dark ? "#fff" : shade(fill, -0.35)}
              strokeOpacity={dark ? 0.28 : 0.45}
              strokeWidth="2"
            />
          )}
          {item.pattern === "other" && (
            <circle
              cx="6"
              cy="6"
              r="1.8"
              fill={dark ? "#fff" : shade(fill, -0.4)}
              opacity=".45"
            />
          )}
        </pattern>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".14" />
        </linearGradient>
      </defs>
      <ellipse
        cx="100"
        cy={pair ? 172 : 194}
        rx="64"
        ry="5"
        fill="#000"
        opacity=".07"
      />
      {art}
    </svg>
  );
}
