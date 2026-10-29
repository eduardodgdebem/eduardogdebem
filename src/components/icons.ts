// Small interface icons for the plates and the game: plain ink strokes on a
// 24 × 24 grid, drawn in currentColor so they take the page's ink or rubric.

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  info: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.6v.1" stroke-width="2.2"/>'),
  // The page's sections.
  overview: svg('<rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/>'),
  work: svg('<rect x="3.5" y="7.5" width="17" height="12"/><path d="M9 7.5V4.5h6v3M3.5 12.5h17"/>'),
  projects: svg('<path d="M4 20l9-9M13.5 4.5l6 6-3 3-6-6z"/><path d="M11.5 6.5l6 6"/>'),
  stack: svg('<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>'),
  about: svg('<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>'),
  contact: svg('<rect x="3.5" y="5.5" width="17" height="13"/><path d="M3.5 6l8.5 7 8.5-7"/>'),
  cv: svg('<path d="M6.5 3.5h8l3 3v14h-11z"/><path d="M14.5 3.5v3h3M9 11h6M9 14.5h6M9 18h4"/>'),
  globe: svg('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>'),
  external: svg('<path d="M14 4.5h5.5V10M19.5 4.5l-9 9M17 13.5v6H4.5V7h6"/>'),
  // Links and the terminal.
  github: svg('<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
  linkedin: svg('<rect x="3.5" y="3.5" width="17" height="17"/><path d="M8 10.5v6M8 7.5v.1M12 16.5v-6M12 13c0-1.6 1-2.6 2.4-2.6S16.5 11.4 16.5 13v3.5"/>'),
  mail: svg('<rect x="3.5" y="5.5" width="17" height="13"/><path d="M3.5 6l8.5 7 8.5-7"/>'),
  copy: svg('<rect x="8.5" y="8.5" width="11" height="11"/><path d="M15.5 8.5v-4h-11v11h4"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  download: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  shrink: svg('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  // Units.
  legionarius: svg('<path d="M12 3l1.6 2.2v9.3h-3.2V5.2z"/><path d="M8.5 14.5h7M12 14.5V20"/><circle cx="12" cy="20.5" r="0.6"/>'),
  sagittarius: svg('<path d="M7 3c6 3.5 6 14.5 0 18"/><path d="M7 3v18"/><path d="M5 12h13M15.5 9.5L18 12l-2.5 2.5"/>'),
  eques: svg('<path d="M6 20c0-4 1-7 3.5-9L8 6l3 1.5c2.5-1.5 5-1 6.5 1.5l1.5 3-2 1-1.5-1.5c-1 2-2 3.5-2 8.5"/><circle cx="15.5" cy="8.5" r="0.6"/>'),
  triarius: svg('<path d="M12 2.5l1.8 3.5h-3.6z"/><path d="M12 6v15"/><circle cx="8" cy="14.5" r="3.5"/>'),
  // Formations.
  acies: svg('<path d="M4 9h16M4 15h16"/><path d="M4 9v0M8 9v0M12 9v0M16 9v0M20 9v0" stroke-width="3"/>'),
  testudo: svg('<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 12h16M9.3 5v14M14.7 5v14"/>'),
  cuneus: svg('<path d="M12 4L20 19H4z"/><path d="M12 9.5L16.5 17h-9z"/>'),
  orbis: svg('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/>'),
  // The game.
  coin: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5.2"/><path d="M12 9v6"/>'),
  fight: svg('<path d="M5 4l9.5 9.5M19 4L9.5 13.5"/><path d="M12.5 15.5l3 3M11.5 15.5l-3 3M4 4h3v3M20 4h-3v3"/>'),
  horn: svg('<path d="M4 15.5c3-1 6-4 7.5-8.5l8.5 6.5c-4 1-8.5 3-11 6.5z"/><path d="M4 15.5c0 1.2.8 2 2 2"/><path d="M15 9.5c1.5-.3 2.6.3 3 1.5"/>'),
  trash: svg('<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>'),
  again: svg('<path d="M19 12a7 7 0 1 1-2-4.9"/><path d="M19 4v4h-4"/>'),
} as const;

export type IconName = keyof typeof ICONS;
