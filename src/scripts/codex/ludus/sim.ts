// The battle in the arena, as a simulation with nothing to draw: the Roman
// plan against a Gallic host, stepped at a fixed rate. It is deterministic
// (the same plan always fights the same battle), so a plan can be shared as a
// link. It works at the level of cohorts; ludus.ts draws each cohort's men.
//
// Four kinds a side, each beating one and losing to another: infantry,
// missile troops, cavalry, spears. Formations trade speed for staying power.
// Flank and rear attacks hurt more and shake morale; a cohort whose morale
// breaks runs for its own end of the arena and is out of the fight.

export type Side = 'roma' | 'gallia';
export type Kind = 'legionarius' | 'sagittarius' | 'eques' | 'triarius' | 'gallus' | 'funditor' | 'equesGallus' | 'hastatus';
export type Formation = 'acies' | 'testudo' | 'cuneus' | 'orbis';
type Role = 'infantry' | 'missile' | 'cavalry' | 'spear';

interface Stats {
  role: Role;
  men: number;
  hp: number; // per man
  atk: number;
  def: number; // damage taken ×
  speed: number;
  charge: number; // damage × on first contact
  range?: number;
  shot?: number; // missile damage per man per volley
  morale: number;
  steady: number; // morale lost ×
}

export const STATS: Record<Kind, Stats> = {
  legionarius: { role: 'infantry', men: 12, hp: 10, atk: 2.6, def: 0.7, speed: 1.1, charge: 1.25, morale: 100, steady: 0.8 },
  sagittarius: { role: 'missile', men: 12, hp: 6, atk: 1.0, def: 1.2, speed: 1.2, charge: 1, range: 9, shot: 0.5, morale: 70, steady: 1.1 },
  eques: { role: 'cavalry', men: 8, hp: 13, atk: 3.0, def: 0.8, speed: 2.6, charge: 2.2, morale: 85, steady: 0.9 },
  triarius: { role: 'spear', men: 12, hp: 10, atk: 1.7, def: 0.75, speed: 0.9, charge: 1, morale: 95, steady: 0.8 },
  // The Gauls hit hard at first, and crack once it goes against them.
  gallus: { role: 'infantry', men: 12, hp: 8.5, atk: 2.8, def: 1.0, speed: 1.4, charge: 1.9, morale: 95, steady: 1.35 },
  funditor: { role: 'missile', men: 10, hp: 5, atk: 0.7, def: 1.25, speed: 1.3, charge: 1, range: 8, shot: 0.4, morale: 55, steady: 1.5 },
  equesGallus: { role: 'cavalry', men: 8, hp: 10, atk: 3.0, def: 0.95, speed: 2.8, charge: 2.0, morale: 80, steady: 1.35 },
  hastatus: { role: 'spear', men: 12, hp: 7, atk: 1.6, def: 1.05, speed: 1.0, charge: 1, morale: 65, steady: 1.5 },
};

/** What a Roman cohort costs, in denarii. */
export const COST: Partial<Record<Kind, number>> = { legionarius: 4, sagittarius: 2, eques: 5, triarius: 3 };
export const BUDGET = 24;
export const MAX_COHORTS = 8;

export const ROMAN_KINDS = ['legionarius', 'sagittarius', 'eques', 'triarius'] as const;
export type RomanKind = (typeof ROMAN_KINDS)[number];

const FORM = {
  acies: { speed: 1, atk: 1, def: 1, missile: 1, flank: 1, chargeBonus: 1 },
  testudo: { speed: 0.55, atk: 0.8, def: 0.85, missile: 0.3, flank: 1.1, chargeBonus: 1 },
  cuneus: { speed: 1.05, atk: 1.05, def: 1.1, missile: 1.1, flank: 1.3, chargeBonus: 1.5 },
  orbis: { speed: 0, atk: 0.9, def: 0.8, missile: 1, flank: 0, chargeBonus: 1 },
} satisfies Record<Formation, Record<string, number>>;

/** Which formations each kind may take (missile troops fight only in line). */
export const ALLOWED: Record<RomanKind, Formation[]> = {
  legionarius: ['acies', 'testudo', 'cuneus', 'orbis'],
  sagittarius: ['acies'],
  eques: ['acies', 'cuneus'],
  triarius: ['acies', 'orbis'],
};

/** Attacker role against defender role. */
const COUNTER: Record<Role, Partial<Record<Role, number>>> = {
  cavalry: { missile: 1.8, spear: 0.5 },
  spear: { cavalry: 2.2 },
  infantry: { spear: 1.15, missile: 1.3 },
  missile: { infantry: 0.7, cavalry: 0.7, spear: 0.7, missile: 0.9 },
};

/* ── The field: the arena's sand, and where each side may stand ── */

export const FIELD = { rx: 14, rz: 9.5 };

/** The fifteen places a Roman cohort can be set: three lines of five, on the near half. */
export const SLOTS = [3.6, 5.6, 7.4].flatMap((z) => [-8, -4, 0, 4, 8].map((x) => ({ x, z })));

export interface Placed {
  kind: RomanKind;
  formation: Formation;
}
export type Plan = (Placed | null)[];

/** The Gallic host: warbands in the centre, slingers behind, horse on the wings, a levy in reserve. */
export const GAULS: { kind: Kind; x: number; z: number }[] = [
  { kind: 'gallus', x: -5.4, z: -4.4 },
  { kind: 'gallus', x: -1.8, z: -4.6 },
  { kind: 'gallus', x: 1.8, z: -4.6 },
  { kind: 'gallus', x: 5.4, z: -4.4 },
  { kind: 'funditor', x: -3, z: -7.3 },
  { kind: 'funditor', x: 3, z: -7.3 },
  { kind: 'equesGallus', x: -9.5, z: -4.8 },
  { kind: 'equesGallus', x: 9.5, z: -4.8 },
  { kind: 'hastatus', x: 0, z: -7.8 },
];

/* ── Plans ── */

export const cost = (plan: Plan) => plan.reduce((n, p) => n + (p ? COST[p.kind]! : 0), 0);
export const count = (plan: Plan) => plan.filter(Boolean).length;

const KIND_CODE: Record<RomanKind, string> = { legionarius: 'L', sagittarius: 'A', eques: 'E', triarius: 'T' };
const FORM_CODE: Record<Formation, string> = { acies: 'a', testudo: 't', cuneus: 'c', orbis: 'o' };

/** A plan as fifteen pairs of letters, for a link. */
export const encode = (plan: Plan) => plan.map((p) => (p ? KIND_CODE[p.kind] + FORM_CODE[p.formation] : '..')).join('');

export function decode(code: string): Plan | null {
  if (code.length !== SLOTS.length * 2) return null;
  const kinds = Object.fromEntries(Object.entries(KIND_CODE).map(([k, v]) => [v, k])) as Record<string, RomanKind>;
  const forms = Object.fromEntries(Object.entries(FORM_CODE).map(([k, v]) => [v, k])) as Record<string, Formation>;
  const plan: Plan = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const [k, f] = code.slice(i * 2, i * 2 + 2);
    if (k === '.') plan.push(null);
    else if (kinds[k] && forms[f] && ALLOWED[kinds[k]].includes(forms[f])) plan.push({ kind: kinds[k], formation: forms[f] });
    else return null;
  }
  return cost(plan) <= BUDGET && count(plan) <= MAX_COHORTS ? plan : null;
}

/** The four classic deployments (slot = row * 5 + column, front row first). */
export const PRESETS: Record<'triplex' | 'testudo' | 'cuneus' | 'orbis', [number, RomanKind, Formation][]> = {
  triplex: [[1, 'legionarius', 'acies'], [2, 'legionarius', 'acies'], [3, 'legionarius', 'acies'], [6, 'sagittarius', 'acies'], [8, 'sagittarius', 'acies'], [9, 'eques', 'acies'], [12, 'triarius', 'acies']],
  testudo: [[1, 'legionarius', 'testudo'], [2, 'legionarius', 'testudo'], [3, 'legionarius', 'testudo'], [7, 'legionarius', 'testudo'], [11, 'sagittarius', 'acies'], [13, 'sagittarius', 'acies'], [12, 'triarius', 'acies']],
  cuneus: [[2, 'legionarius', 'cuneus'], [6, 'legionarius', 'cuneus'], [8, 'legionarius', 'cuneus'], [0, 'eques', 'cuneus'], [4, 'eques', 'cuneus'], [12, 'sagittarius', 'acies']],
  orbis: [[6, 'legionarius', 'orbis'], [7, 'legionarius', 'orbis'], [8, 'legionarius', 'orbis'], [2, 'triarius', 'orbis'], [11, 'sagittarius', 'acies'], [12, 'sagittarius', 'acies'], [13, 'sagittarius', 'acies']],
};

export function preset(name: keyof typeof PRESETS): Plan {
  const plan: Plan = SLOTS.map(() => null);
  for (const [slot, kind, formation] of PRESETS[name]) plan[slot] = { kind, formation };
  return plan;
}

/* ── The battle ── */

export type State = 'ready' | 'advance' | 'fight' | 'fallback' | 'rout' | 'gone';

export interface Cohort {
  id: number;
  side: Side;
  kind: Kind;
  formation: Formation;
  /** Its number on its side (I, II…), for the log. */
  n: number;
  x: number;
  z: number;
  /** Facing, as a unit vector on the ground. */
  fx: number;
  fz: number;
  hp: number;
  men: number;
  maxMen: number;
  morale: number;
  state: State;
  target: number;
  reload: number;
  charged: boolean;
  chargeT: number;
  fallbackT: number;
  /** Who it has already met, so a meeting is logged once. */
  met: Set<number>;
}

export type Event =
  | { t: number; type: 'start' }
  | { t: number; type: 'contact' | 'flank' | 'rear'; a: number; b: number }
  | { t: number; type: 'broken' | 'destroyed'; a: number }
  | { t: number; type: 'horn'; call: Horn }
  | { t: number; type: 'end'; result: Result };

export type Horn = 'signum' | 'receptui';
export type Result = 'vicisti' | 'victus' | 'aequum';

/** A volley in flight, for the drawing: from one cohort at another. */
export interface Volley {
  t: number;
  from: { x: number; z: number };
  to: { x: number; z: number };
  side: Side;
}

export const STEP = 0.05;
const DEPLOY = 2; // seconds before the lines move
export const LIMIT = 75; // the editor stops the games
const RADIUS: Record<Role, number> = { infantry: 0.75, missile: 0.7, cavalry: 0.85, spear: 0.75 };
// How fast men fall: a battle should take about a minute.
const PACE = 0.25;
// Morale lost for each man who falls (× the cohort's steadiness and the shock of the blow).
const DREAD = 11;

export interface Battle {
  t: number;
  cohorts: Cohort[];
  events: Event[];
  volleys: Volley[];
  result: Result | null;
  horn: Horn | null;
  hornT: number;
  step(): void;
  sound(call: Horn): boolean;
}

export function battle(plan: Plan): Battle {
  const cohorts: Cohort[] = [];
  const add = (side: Side, kind: Kind, formation: Formation, x: number, z: number, n: number) => {
    const s = STATS[kind];
    cohorts.push({
      id: cohorts.length, side, kind, formation, n, x, z,
      fx: 0, fz: side === 'roma' ? -1 : 1,
      hp: s.men * s.hp, men: s.men, maxMen: s.men, morale: s.morale,
      state: 'ready', target: -1, reload: 0.6 + cohorts.length * 0.17, charged: false, chargeT: 0, fallbackT: 0, met: new Set(),
    });
  };
  let n = 0;
  plan.forEach((p, i) => p && add('roma', p.kind, p.formation, SLOTS[i].x, SLOTS[i].z, ++n));
  GAULS.forEach((g, i) => add('gallia', g.kind, 'acies', g.x, g.z, i + 1));

  const b: Battle = {
    t: 0,
    cohorts,
    events: [{ t: 0, type: 'start' }],
    volleys: [],
    result: null,
    horn: null,
    hornT: 0,
    step: () => step(b),
    sound: (call) => {
      if (b.horn || b.result || b.t < DEPLOY) return false;
      b.horn = call;
      b.hornT = b.t;
      b.events.push({ t: b.t, type: 'horn', call });
      for (const c of cohorts) {
        if (c.side !== 'roma' || c.state === 'gone') continue;
        if (call === 'signum') c.morale = Math.min(STATS[c.kind].morale * 1.2, c.morale + 20);
        else {
          // Fall back and re-form: even the broken rally, if any are left.
          c.morale = Math.max(c.morale + 25, 55);
          c.state = 'fallback';
          c.fallbackT = 3.5;
        }
      }
      return true;
    },
  };
  return b;
}

const alive = (c: Cohort) => c.state !== 'gone' && c.state !== 'rout';
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const inField = (x: number, z: number, k = 1) => (x / (FIELD.rx * k)) ** 2 + (z / (FIELD.rz * k)) ** 2 <= 1;

/** How a blow lands, by where it comes from: 1 from the front, more from the side, most from behind. */
function angleOf(target: Cohort, from: Cohort) {
  const dx = from.x - target.x;
  const dz = from.z - target.z;
  const d = Math.hypot(dx, dz) || 1;
  return (dx * target.fx + dz * target.fz) / d; // 1 = in front, -1 = behind
}

function step(b: Battle) {
  if (b.result) return;
  b.t += STEP;
  const { cohorts } = b;
  if (b.t < DEPLOY) return;
  const surge = b.horn === 'signum' && b.t - b.hornT < 10;

  for (const c of cohorts) {
    if (c.state === 'gone') continue;
    const s = STATS[c.kind];
    const f = FORM[c.formation];
    const home = c.side === 'roma' ? 1 : -1;
    const boost = c.side === 'roma' && surge ? 1.35 : 1;

    // Broken: run for home, and out.
    if (c.state === 'rout') {
      c.z += home * s.speed * 1.3 * STEP;
      c.fx = 0;
      c.fz = home;
      if (!inField(c.x, c.z, 0.97)) c.state = 'gone';
      continue;
    }
    if (c.state === 'fallback') {
      c.z += home * s.speed * STEP;
      c.fallbackT -= STEP;
      if (c.fallbackT <= 0 || !inField(c.x, c.z, 0.9)) c.state = 'advance';
      continue;
    }

    // The nearest enemy still standing (horse would rather ride down archers).
    const foes = cohorts.filter((o) => o.side !== c.side && alive(o));
    if (!foes.length) continue;
    let target = foes.reduce((a, o) => (dist(c, o) < dist(c, a) ? o : a));
    if (s.role === 'cavalry') {
      const soft = foes.filter((o) => STATS[o.kind].role === 'missile' && dist(c, o) < 16);
      if (soft.length) target = soft.reduce((a, o) => (dist(c, o) < dist(c, a) ? o : a));
    }
    c.target = target.id;
    const reach = RADIUS[s.role] + RADIUS[STATS[target.kind].role];
    const d = dist(c, target);

    // Turn toward it.
    const tx = (target.x - c.x) / (d || 1);
    const tz = (target.z - c.z) / (d || 1);
    c.fx += (tx - c.fx) * 0.15;
    c.fz += (tz - c.fz) * 0.15;
    const fl = Math.hypot(c.fx, c.fz) || 1;
    c.fx /= fl;
    c.fz /= fl;

    // In contact with anyone? Then fight them, missile troops included.
    const touching = foes.find((o) => dist(c, o) < RADIUS[s.role] + RADIUS[STATS[o.kind].role] + 0.05);
    if (touching) {
      c.state = 'fight';
      strike(b, c, touching, boost);
    } else if (s.range && d < s.range) {
      // Loose a volley, from where it stands.
      c.state = 'advance';
      c.reload -= STEP;
      if (c.reload <= 0) {
        c.reload = 2.2;
        const shaken = FORM[target.formation].missile;
        hurt(b, target, (s.shot ?? 0) * c.men * shaken * boost * PACE * 2.2, 0.6);
        b.volleys.push({ t: b.t, from: { x: c.x, z: c.z }, to: { x: target.x, z: target.z }, side: c.side });
      }
    } else if (d > reach) {
      c.state = 'advance';
      let speed = s.speed * f.speed * boost;
      // Archers keep their distance; a ring stands where it was put.
      if (s.range) speed *= 0.7;
      let gx = tx;
      let gz = tz;
      // Horse swings wide, to come in from the side.
      if (s.role === 'cavalry' && d > 4) {
        const side = Math.sign(c.x - target.x) || 1;
        gx = tx + side * 0.6;
        const gl = Math.hypot(gx, gz);
        gx /= gl;
        gz /= gl;
      }
      c.x += gx * speed * STEP;
      c.z += gz * speed * STEP;
    }

    // Morale steadies out of the press.
    if (c.state !== 'fight') c.morale = Math.min(s.morale, c.morale + 2 * STEP);
    if (c.chargeT > 0) c.chargeT -= STEP;
  }

  // Cohorts of one side don't stand in each other: push apart.
  for (let i = 0; i < cohorts.length; i++) {
    const a = cohorts[i];
    if (a.state === 'gone') continue;
    for (let j = i + 1; j < cohorts.length; j++) {
      const o = cohorts[j];
      if (o.state === 'gone') continue;
      const min = RADIUS[STATS[a.kind].role] + RADIUS[STATS[o.kind].role] - (a.side === o.side ? 0 : 0.1);
      const d = dist(a, o);
      if (d >= min || d === 0) continue;
      const push = (min - d) / 2;
      const nx = (o.x - a.x) / d;
      const nz = (o.z - a.z) / d;
      if (a.formation !== 'orbis') {
        a.x -= nx * push;
        a.z -= nz * push;
      }
      if (o.formation !== 'orbis') {
        o.x += nx * push;
        o.z += nz * push;
      }
    }
  }
  // Keep everyone fighting on the sand.
  for (const c of cohorts) {
    if (c.state === 'gone' || c.state === 'rout') continue;
    const k = Math.sqrt((c.x / FIELD.rx) ** 2 + (c.z / FIELD.rz) ** 2);
    if (k > 0.94) {
      c.x *= 0.94 / k;
      c.z *= 0.94 / k;
    }
  }

  // The end: one side gone, or time.
  const standing = (side: Side) => cohorts.filter((c) => c.side === side && alive(c));
  const strength = (side: Side) => cohorts.filter((c) => c.side === side && alive(c)).reduce((n, c) => n + c.hp, 0);
  let result: Result | null = null;
  if (!standing('gallia').length) result = 'vicisti';
  else if (!standing('roma').length) result = 'victus';
  else if (b.t >= LIMIT) {
    const r = strength('roma');
    const g = strength('gallia');
    result = Math.abs(r - g) < 0.08 * (r + g) ? 'aequum' : r > g ? 'vicisti' : 'victus';
  }
  if (result) {
    b.result = result;
    b.events.push({ t: b.t, type: 'end', result });
  }
}

function strike(b: Battle, c: Cohort, target: Cohort, boost: number) {
  const s = STATS[c.kind];
  const ts = STATS[target.kind];
  const facing = angleOf(target, c);
  const from = facing < -0.35 ? 'rear' : facing < 0.45 ? 'flank' : 'front';
  const tf = FORM[target.formation];
  const flank = from === 'front' ? 1 : (from === 'rear' ? 1.6 : 1.3) * (tf.flank || 1);
  const ignoresFlank = tf.flank === 0;
  // A charge lands harder, once.
  if (!c.met.has(target.id)) {
    c.met.add(target.id);
    if (!c.charged) {
      c.charged = true;
      c.chargeT = 1.5;
    }
    b.events.push({ t: b.t, type: from === 'front' || ignoresFlank ? 'contact' : from, a: c.id, b: target.id });
  }
  const charge = c.chargeT > 0 ? s.charge * FORM[c.formation].chargeBonus : 1;
  const counter = COUNTER[s.role][ts.role] ?? 1;
  const dmg = s.atk * Math.sqrt(c.men) * counter * FORM[c.formation].atk * (ignoresFlank ? 1 : flank) * charge * boost * PACE * STEP;
  hurt(b, target, dmg, ignoresFlank ? 1 : flank);
}

/** Damage a cohort: men fall, and morale with them; it may break. */
function hurt(b: Battle, c: Cohort, raw: number, shock: number) {
  if (c.state === 'gone') return;
  const s = STATS[c.kind];
  c.hp -= raw * s.def * FORM[c.formation].def;
  const before = c.men;
  c.men = Math.max(0, Math.ceil(c.hp / s.hp));
  if (c.men < before) c.morale -= (before - c.men) * DREAD * s.steady * shock;
  if (c.hp <= 0) {
    c.state = 'gone';
    c.men = 0;
    b.events.push({ t: b.t, type: 'destroyed', a: c.id });
  } else if (c.morale < 12 && c.state !== 'rout') {
    c.state = 'rout';
    b.events.push({ t: b.t, type: 'broken', a: c.id });
  }
}
