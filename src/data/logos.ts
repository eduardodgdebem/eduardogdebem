// A small mark beside each item in the stack: the brand's own logo where
// simple-icons has it (filled, in currentColor), or a plain line icon where
// it doesn't (MuleSoft, SQL Server, BullMQ and AWS aren't in it).
import { siAngular, siAstro, siCloudflareworkers, siDotnet, siNestjs, siNodedotjs, siPostgresql, siRabbitmq, siReact, siTailwindcss, siThreedotjs, siTypescript } from 'simple-icons';

const filled = (path: string) => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;
const line = (body: string) =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const LOGOS: Record<string, string> = {
  TypeScript: filled(siTypescript.path),
  Angular: filled(siAngular.path),
  React: filled(siReact.path),
  Astro: filled(siAstro.path),
  'Tailwind CSS': filled(siTailwindcss.path),
  'WebGL · Three.js': filled(siThreedotjs.path),
  'Node.js': filled(siNodedotjs.path),
  NestJS: filled(siNestjs.path),
  '.NET': filled(siDotnet.path),
  PostgreSQL: filled(siPostgresql.path),
  RabbitMQ: filled(siRabbitmq.path),
  'Cloudflare Workers': filled(siCloudflareworkers.path),
  // An integration bus: services joined through one hub.
  MuleSoft: line('<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="5.5" r="2"/><circle cx="19.5" cy="5.5" r="2"/><circle cx="4.5" cy="18.5" r="2"/><circle cx="19.5" cy="18.5" r="2"/><path d="M6 7l3.8 3M18 7l-3.8 3M6 17l3.8-3M18 17l-3.8-3"/>'),
  // A database.
  'SQL Server': line('<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>'),
  // A queue of jobs.
  BullMQ: line('<rect x="3.5" y="8" width="4.5" height="8"/><rect x="9.75" y="8" width="4.5" height="8"/><rect x="16" y="8" width="4.5" height="8"/><path d="M3.5 19.5h17"/>'),
  // A function.
  'AWS Lambda': line('<path d="M6.5 4.5h3l7 15h2.5M11.5 10l-5 9.5"/>'),
  // A gate in front of services.
  'API Gateway': line('<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6M4 20h16"/>'),
};
