// Everything the one page says, in English and Portuguese. The page is
// src/views/Site.astro; the projects are in projects.ts, the pictures' credits
// in art.ts.

export type Lang = 'en' | 'pt';
export type T = Record<Lang, string>;

export const PATHS: Record<Lang, string> = { en: '/', pt: '/pt/' };

/** The page's sections, in order: the nav follows them. */
export const SECTIONS = ['overview', 'projects', 'about', 'contact'] as const;
export type Section = (typeof SECTIONS)[number];

export const NAV: Record<Section, T> = {
  overview: { en: 'Overview', pt: 'Início' },
  projects: { en: 'Projects', pt: 'Projetos' },
  about: { en: 'About', pt: 'Sobre' },
  contact: { en: 'Contact', pt: 'Contato' },
};

export const META: Record<Lang, { title: string; description: string }> = {
  en: {
    title: 'Eduardo de Bem — Full Stack Developer in Florianópolis',
    description:
      'Eduardo de Bem, full stack developer in Florianópolis, Brazil. TypeScript, Angular, React, Node.js and .NET; data pipelines for BMW Europe at Zallpy.',
  },
  pt: {
    title: 'Eduardo de Bem — Desenvolvedor Full Stack em Florianópolis',
    description:
      'Eduardo de Bem, desenvolvedor full stack em Florianópolis. TypeScript, Angular, React, Node.js e .NET; pipelines de dados para a BMW Europa na Zallpy.',
  },
};

export const UI = {
  role: { en: 'Full stack developer', pt: 'Desenvolvedor full stack' },
  place: { en: 'Florianópolis, Brazil', pt: 'Florianópolis, Brasil' },
  headline: { en: 'Software Built to Hold Up', pt: 'Software Feito para Durar' },
  lede: {
    en: 'I build web software end to end, from the interface people touch to the pipelines they never see. Right now, on BMW Europe at Zallpy. Before that, a financial platform I took from ten seconds to load to under one.',
    pt: 'Construo software para a web de ponta a ponta, da interface que as pessoas tocam aos pipelines que elas nunca veem. Agora, na BMW Europa pela Zallpy. Antes, uma plataforma financeira que levei de dez segundos para carregar a menos de um.',
  },
  ctaContact: { en: 'Get in touch', pt: 'Fale comigo' },
  ctaCv: { en: 'Download CV', pt: 'Baixar currículo' },
  workTitle: { en: 'Where I’ve worked', pt: 'Onde trabalhei' },
  projectsTitle: { en: 'Things I’ve Made', pt: 'Coisas que Fiz' },
  projectsLede: {
    en: 'Sites for people I know, and a couple of things for myself: a programming language, and a city that grows while you focus.',
    pt: 'Sites para pessoas que conheço, e algumas coisas para mim: uma linguagem de programação e uma cidade que cresce enquanto você foca.',
  },
  stackTitle: { en: 'What I work with', pt: 'Com o que trabalho' },
  aboutTitle: { en: 'About Me', pt: 'Sobre Mim' },
  contactTitle: { en: 'Get in Touch', pt: 'Fale Comigo' },
  contactLede: {
    en: 'For a role, a project, or a question about something I made, email is the quickest way.',
    pt: 'Para uma vaga, um projeto ou uma pergunta sobre algo que fiz, e-mail é o jeito mais rápido.',
  },
  copy: { en: 'Copy', pt: 'Copiar' },
  copied: { en: 'Copied', pt: 'Copiado' },
  visit: { en: 'Visit the site', pt: 'Visitar o site' },
  openApp: { en: 'Open the app', pt: 'Abrir o app' },
  readCode: { en: 'Read the code', pt: 'Ler o código' },
  menu: { en: 'Menu', pt: 'Menu' },
  scroll: { en: 'Scroll', pt: 'Role' },
  motto: { en: 'Built to last, as the Romans built.', pt: 'Feito para durar, como construíam os romanos.' },
  close: { en: 'Close', pt: 'Fechar' },
  explore: { en: 'Explore', pt: 'Explorar' },
  elsewhere: { en: 'Elsewhere', pt: 'Em outros lugares' },
  credits: { en: 'Pictures', pt: 'Imagens' },
  language: { en: 'Language', pt: 'Idioma' },
  notFound: { en: 'Nothing Here but Marble', pt: 'Só Mármore Aqui' },
  notFoundText: { en: 'This page doesn’t exist, or doesn’t any more.', pt: 'Esta página não existe, ou não existe mais.' },
  back: { en: 'Back to the start', pt: 'Voltar ao início' },
} satisfies Record<string, T>;

export interface Job {
  org: string;
  title: T;
  /** Where it sits in the story (no dates the site doesn't know). */
  when: T;
  summary: T;
  stack: string[];
}

export const WORK: Job[] = [
  {
    org: 'Zallpy · BMW Europe',
    title: { en: 'Data pipelines', pt: 'Pipelines de dados' },
    when: { en: 'Now', pt: 'Agora' },
    summary: {
      en: 'Back-end pipelines that pull data in, transform it and run the background jobs around it.',
      pt: 'Pipelines de back-end que trazem os dados, transformam e rodam os jobs em segundo plano em volta deles.',
    },
    stack: ['Node.js', 'PostgreSQL', 'BullMQ'],
  },
  {
    org: 'Zallpy · BMW USA',
    title: { en: 'A financial platform', pt: 'Uma plataforma financeira' },
    when: { en: 'Before that', pt: 'Antes disso' },
    summary: {
      en: 'The Angular front end, as micro frontends on top of .NET and MuleSoft services. The part I’m proudest of is the load time: from over ten seconds to under one.',
      pt: 'O front-end em Angular, como micro frontends sobre serviços em .NET e MuleSoft. A parte de que mais me orgulho é o tempo de carregamento: de mais de dez segundos para menos de um.',
    },
    stack: ['Angular', '.NET', 'MuleSoft'],
  },
  {
    org: 'Dema',
    title: { en: 'Social programs, found', pt: 'Programas sociais, encontrados' },
    when: { en: 'Also', pt: 'Também' },
    summary: {
      en: 'A platform that shows people in Brazil the social programs they can get, and suggests careers from a personality test and what’s on offer in their city.',
      pt: 'Uma plataforma que mostra às pessoas no Brasil os programas sociais a que têm direito e sugere carreiras a partir de um teste de personalidade e do que a cidade delas oferece.',
    },
    stack: ['React', 'NestJS', 'RabbitMQ', 'PostgreSQL'],
  },
  {
    org: 'eTopocart',
    title: { en: 'Geoprocessing for city halls', pt: 'Geoprocessamento para prefeituras' },
    when: { en: 'First job', pt: 'Primeiro emprego' },
    summary: {
      en: 'My first job as a developer, on a platform city halls around Brazil use: faster map views, tables that hold ten thousand rows without choking, and reports moved onto AWS Lambda.',
      pt: 'Meu primeiro emprego como desenvolvedor, numa plataforma usada por prefeituras de todo o Brasil: mapas mais rápidos, tabelas que aguentam dez mil linhas sem travar e relatórios levados para o AWS Lambda.',
    },
    stack: ['Angular', 'AWS Lambda', 'Maps'],
  },
];

export const STACK: { group: T; items: string[] }[] = [
  { group: { en: 'Front end', pt: 'Front-end' }, items: ['TypeScript', 'Angular', 'React', 'Astro', 'Tailwind CSS', 'WebGL · Three.js'] },
  { group: { en: 'Back end', pt: 'Back-end' }, items: ['Node.js', 'NestJS', '.NET', 'MuleSoft'] },
  { group: { en: 'Data & queues', pt: 'Dados e filas' }, items: ['PostgreSQL', 'SQL Server', 'RabbitMQ', 'BullMQ'] },
  { group: { en: 'Cloud', pt: 'Nuvem' }, items: ['AWS Lambda', 'API Gateway', 'Cloudflare Workers'] },
];

export const ABOUT: Record<Lang, string[]> = {
  en: [
    'I’m Eduardo, a full stack developer in Florianópolis. I started at Zallpy as a front-end intern in 2024 and I’m now a mid-level developer, working across the whole stack, mostly in TypeScript.',
    'In 2023 I took a year off and lived between the US and Europe, mostly to get my English where I wanted it. I’m finishing Computer Science at UNISUL this year, and I volunteered on TEKTAI, an augmented reality project for its students, which is where I learned WebGL.',
    'I played the violin for years. I don’t anymore, but I still listen to a lot of music.',
  ],
  pt: [
    'Sou o Eduardo, desenvolvedor full stack em Florianópolis. Entrei na Zallpy como estagiário de front-end em 2024 e hoje sou desenvolvedor pleno, trabalhando em toda a stack, principalmente em TypeScript.',
    'Em 2023 tirei um ano e morei entre os Estados Unidos e a Europa, principalmente para deixar meu inglês onde eu queria. Termino Ciência da Computação na UNISUL este ano, e fui voluntário no TEKTAI, um projeto de realidade aumentada para os estudantes de lá, onde aprendi WebGL.',
    'Toquei violino por anos. Não toco mais, mas ainda escuto muita música.',
  ],
};

export const NOTES: { head: T; items: T }[] = [
  { head: { en: 'Reading', pt: 'Leitura' }, items: { en: 'Sci-fi · Fantasy · Whatever catches me', pt: 'Ficção científica · Fantasia · O que me fisgar' } },
  { head: { en: 'Racing', pt: 'Corridas' }, items: { en: 'Formula 1 · Constructors over drivers', pt: 'Fórmula 1 · Construtores acima de pilotos' } },
  { head: { en: 'Fighting', pt: 'Lutas' }, items: { en: 'MMA · Boxing', pt: 'MMA · Boxe' } },
  { head: { en: 'Languages', pt: 'Línguas' }, items: { en: 'Portuguese · English · Spanish', pt: 'Português · Inglês · Espanhol' } },
];

export const CONTACT = {
  email: 'eduardogdebem@gmail.com',
  linkedin: 'https://linkedin.com/in/eduardogdebem',
  github: 'https://github.com/eduardodgdebem',
  based: { en: 'Florianópolis, Brazil · UTC−3', pt: 'Florianópolis, Brasil · UTC−3' },
};

export const t = (lang: Lang) => (v: T) => v[lang];
