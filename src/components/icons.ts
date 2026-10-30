// Small interface icons: plain strokes on a 24 × 24 grid, drawn in
// currentColor so they take the colour of the text round them.

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  stack: svg('<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>'),
  cv: svg('<path d="M6.5 3.5h8l3 3v14h-11z"/><path d="M14.5 3.5v3h3M9 11h6M9 14.5h6M9 18h4"/>'),
  external: svg('<path d="M14 4.5h5.5V10M19.5 4.5l-9 9M17 13.5v6H4.5V7h6"/>'),
  github: svg('<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
  linkedin: svg('<rect x="3.5" y="3.5" width="17" height="17"/><path d="M8 10.5v6M8 7.5v.1M12 16.5v-6M12 13c0-1.6 1-2.6 2.4-2.6S16.5 11.4 16.5 13v3.5"/>'),
  copy: svg('<rect x="8.5" y="8.5" width="11" height="11"/><path d="M15.5 8.5v-4h-11v11h4"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  download: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
} as const;
