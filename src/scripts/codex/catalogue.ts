import type { PlateId } from './models';

// Every plate in the codex, numbered as the book prints them. The first three
// cycle on the home page; the rest each belong to one page or subject.
export const CATALOGUE: Record<PlateId, { numeral: string; latin: string; note: string }> = {
  galea: { numeral: 'I', latin: 'Galea', note: 'the legionary’s helmet, with its crest of horsehair.' },
  fides: { numeral: 'II', latin: 'Fides', note: 'the violin and its bow. Played for years; still heard.' },
  currus: { numeral: 'III', latin: 'Currus', note: 'the chariot, as it is raced in our age.' },
  stilus: { numeral: 'IV', latin: 'Stilus', note: 'the open roll, the ink, the quill: notes kept as Caesar kept his.' },
  sigillum: { numeral: 'V', latin: 'Sigillum', note: 'the author’s seal, pressed in wax and set in laurel.' },
  machina: { numeral: 'VI', latin: 'Machina', note: 'wheels that reckon, after the one raised off Antikythera.' },
  liber: { numeral: 'VII', latin: 'Liber', note: 'an open book, a page in mid-turn: notes on what others wrote.' },
  hora: { numeral: 'VIII', latin: 'Hora', note: 'the sand half run. Time spent thinking.' },
  circinus: { numeral: 'IX', latin: 'Circinus', note: 'the dividers: measure before you cut.' },
};

// Subjects (post tags) and the plate each is illustrated with, plus the Latin
// lettered on a subject page's banderole.
const SUBJECTS: Record<string, { plate: PlateId; latin: string }> = {
  dev: { plate: 'machina', latin: 'De machinis' },
  notes: { plate: 'liber', latin: 'De libris' },
  thoughts: { plate: 'hora', latin: 'De cogitationibus' },
  tools: { plate: 'circinus', latin: 'De instrumentis' },
};

/** Plate for a field note or subject page, chosen by its first known subject. */
export function plateForTags(tags: string[] = []): PlateId {
  for (const t of tags) if (SUBJECTS[t]) return SUBJECTS[t].plate;
  return 'liber';
}

/** Banderole lettering for a subject page. */
export const subjectBanner = (tag: string) => SUBJECTS[tag]?.latin ?? `De ${tag}`;
