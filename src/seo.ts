// What search engines are told about the author: one Person, used as the
// home page's subject and the about page's main entity. Facts only, as on the
// pages themselves (src/pages/about.astro).

export const SITE_URL = 'https://eduardogdebem.com';

export const PERSON = {
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: 'Eduardo de Bem',
  givenName: 'Eduardo',
  familyName: 'de Bem',
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/og.jpg`,
  email: 'mailto:eduardogdebem@gmail.com',
  jobTitle: 'Full-Stack Developer',
  worksFor: { '@type': 'Organization', name: 'Zallpy' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'UNISUL' },
  address: { '@type': 'PostalAddress', addressLocality: 'Florianópolis', addressRegion: 'SC', addressCountry: 'BR' },
  knowsLanguage: ['pt-BR', 'en', 'es'],
  knowsAbout: ['TypeScript', 'Angular', 'React', 'Node.js', 'NestJS', '.NET', 'PostgreSQL', 'RabbitMQ', 'AWS', 'WebGL'],
  sameAs: ['https://linkedin.com/in/eduardogdebem', 'https://github.com/eduardodgdebem'],
};

export const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: 'Eduardo de Bem',
  inLanguage: ['en', 'pt-BR'],
  publisher: { '@id': PERSON['@id'] },
};
