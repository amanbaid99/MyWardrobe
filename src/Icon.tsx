const paths: Record<string, string> = {
  wardrobe: "M5 3h14v18H5z M12 3v18 M8 12v2 M16 12v2",
  outfits: "m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z",
  preferences: "M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  close: "m6 6 12 12M6 18 18 6",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3",
  edit: "m15 4 5 5-12 12H3v-5zM12 7l5 5",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  check: "m5 12 4 4L20 5",
  archive: "M3 4h18v5H3zM5 9v12h14V9M10 13h4",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
  info: "M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  thumbsup: "M7 10v11H3V10h4m0 0 5-7c2-1 3 1 2 4l-1 3h6c2 0 2 2 1 5l-2 6H7",
  thumbsdown: "M7 14V3H3v11h4m0 0 5 7c2 1 3-1 2-4l-1-3h6c2 0 2-2 1-5l-2-6H7",
};
export function Icon({ name }: { name: string }) {
  return (
    <svg
      className="icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}
