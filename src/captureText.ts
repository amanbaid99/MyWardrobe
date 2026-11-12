export function captureBatches(text: string, size = 8): string[] {
  let section = "";
  const entries: string[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (
      /^(my wardrobe|tops\s*:.*|bottoms\s*:.*|footwear|accessories|perfumes?|fragrances?)$/i.test(
        line,
      )
    ) {
      section = line;
      continue;
    }
    entries.push(
      `${section ? `[${section}] ` : ""}${line.replace(/^[-•]\s*/, "")}`,
    );
  }
  if (!entries.length && text.trim()) entries.push(text.trim());
  if (entries.length > 160)
    throw new Error(
      "Analyse up to 160 lines at a time. Your text is still here.",
    );
  return Array.from({ length: Math.ceil(entries.length / size) }, (_, i) =>
    entries
      .slice(i * size, (i + 1) * size)
      .map((line, n) => `${n + 1}. ${line}`)
      .join("\n"),
  );
}
