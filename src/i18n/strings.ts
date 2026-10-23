// The book's text in English (as rendered) and Portuguese (swapped in on the
// page by the language toggle in Codex.astro). Latin stays Latin in both:
// banderoles, inscriptions, running heads, rubrics. Posts aren't translated.
// Values marked `html` in use (data-i18n-html) may hold the book's own markup.

const EN = {
  'lang.toggle': 'Language',

  'link.email': 'Email',
  'link.contact': 'Contact',
  'link.cv': 'CV',

  'home.role': 'Full stack developer · Florianópolis, Brazil',
  'home.lede':
    '<span class="initial">I</span> work at Zallpy, where right now I’m writing data pipelines for BMW Europe in Node.js and PostgreSQL. Before that I built the Angular front end of a BMW USA financial platform and got its load time from over ten seconds to under one.',
  'home.more':
    'I started out at eTopocart, on maps and very large tables for city halls. I’m finishing Computer Science at UNISUL in MMXXVI. I played the violin for years; now I only listen.',
  'home.index.notes': 'Field notes',
  'home.index.notes.pg': 'all',
  'home.index.author': 'Of the author, at length',
  'home.index.author.pg': 'about',
  'home.index.workshop': 'Workshop',
  'home.index.letters': 'Correspondence',
  'home.index.letters.pg': 'contact',
  'home.hint':
    '<kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd> to walk · <kbd>Enter</kbd> at a door to go in · or click a building',
  'home.touch': 'Tap the street to walk there, or a building to go in.',
  'home.door.key': 'Press Enter to go in.',
  'home.door.touch': 'Tap its label to go in.',
  'home.act': 'Tap here to go in ›',
  'place.forum': 'walk the street, and go in at a door to turn the page.',
  'place.bibliotheca': 'the library, where the field notes are kept.',
  'place.bibliotheca.page': 'Field notes',
  'place.fabrica': 'the forge: the workshop, on GitHub.',
  'place.fabrica.page': 'Workshop · GitHub',
  'place.statua': 'the author, in stone and at length.',
  'place.statua.page': 'Of the author',

  'notes.title': 'Field notes',
  'notes.intro': 'What I built, read and learned, written down as I go.',
  'notes.subjects': 'Subjects:',
  'notes.all': 'all',
  'notes.empty': 'Nothing written on this yet.',
  'library.note': 'the reading room; every red-tagged roll is a chapter.',
  'library.hint':
    '<kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd> to walk · <kbd>Enter</kbd> at a roll to read it · or click one',
  'library.touch': 'Tap the floor to walk there, or a roll to read it.',
  'library.read': 'Tap here to read it ›',
  'exitus.page': 'back out to the Via Sacra',
  'exitus.key': 'press Enter',
  'exitus.act': 'Tap here to leave ›',
  'cogitator.page': 'a thinker, some eighteen centuries early',
  'cogitator.by': 'after Rodin',

  'about.all': 'All contact details ↓',
  'about.p1':
    'Hi, I’m Eduardo, a full stack developer in Florianópolis. I work at Zallpy, where I started as a front-end intern in 2024 and I’m now a mid-level developer. These days I’m on a BMW Europe project, writing the back-end pipelines that pull data in, transform it and run the background jobs around it, in Node.js, PostgreSQL and BullMQ.',
  'about.p2':
    'Before that I was on BMW USA’s financial platform, building the Angular front end as micro frontends on top of .NET and MuleSoft services. The part I’m proudest of is the load time: it went from over ten seconds to under one. I also built Dema, a platform in React, NestJS, RabbitMQ and PostgreSQL that shows people in Brazil the social programs they can get, and suggests careers from a personality test and what’s on offer in their city.',
  'about.p3':
    'My first job as a developer was at eTopocart in Criciúma, on a geoprocessing platform that city halls around Brazil use. It was mostly maps and a lot of data: I made the map views render faster, built tables that hold more than ten thousand rows without choking, and moved report generation onto AWS Lambda.',
  'about.p4':
    'In 2023 I took a year off and lived between the US and Europe, mostly to get my English where I wanted it. I’m finishing Computer Science at UNISUL this year. Until July I also volunteered on TEKTAI, an augmented reality project for students there, which is where I learned enough WebGL to draw the plates in this book.',
  'about.p5': 'I played the violin for years. I don’t anymore, but I still listen to a lot of music.',
  'about.stack.head': 'What I work with',
  'about.stack':
    'Mostly TypeScript: Angular or React on the front, Node.js, NestJS or .NET on the back. PostgreSQL and SQL Server for data, RabbitMQ and BullMQ for queues, AWS Lambda and API Gateway when it runs in the cloud. I’m happy to learn whatever else a project needs.',
  'note.currently': 'Currently',
  'note.currently.items': 'Full stack at Zallpy · Data pipelines for BMW Europe · Finishing CS at UNISUL',
  'note.reading': 'Reading',
  'note.reading.items': 'Sci-fi · Fantasy · Whatever catches me',
  'note.racing': 'Racing',
  'note.racing.items': 'Formula 1 · Constructor standings > driver standings',
  'note.fighting': 'Fighting',
  'note.fighting.items': 'MMA · Boxing · Combat sports in general',
  'note.music': 'Music',
  'note.music.items': 'Played the violin for years · Still listens',
  'note.tongues': 'Tongues',
  'note.tongues.items': 'Portuguese — native · English — advanced · Spanish — intermediate',
  'letters.head': 'Correspondence',
  'letters.intro': 'For a role, a project, or a question about something I wrote, email is the quickest way to reach me.',
  'letters.based': 'Based in',
  'letters.based.value': 'Florianópolis, Brazil · UTC−3',
  'letters.speaks': 'Speaks',
  'letters.speaks.value': 'Portuguese, English, Spanish',
  'letters.copy': 'Copy',
  'letters.copied': 'Copied',
  'letters.copy.key': 'Press ⌘C',
  'letters.write': 'Write to me',
  'letters.cv': 'CV',
  'letters.cv.value': 'Download it (PDF, in English)',
  'plaza.note': 'the author’s square; a monument for each of his concerns.',
  'plaza.hint':
    '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to walk · up to a monument to read it · <kbd>Enter</kbd> to turn it',
  'plaza.touch': 'Tap the square to walk there; walk up to a monument to read it.',
  'plaza.turn': 'Tap here to turn it ›',
  'statua.by': 'the author, in stone',
  'capsa.page': 'bigger on the inside, apparently',
  'capsa.by': 'it wasn’t here a moment ago',
  'medicus.by': 'a traveller',

  'missing.title': 'This page isn’t in the book',
  'missing.text': 'The leaf you were looking for has been torn out, or was never bound in. The way back is below.',
  'missing.home': 'Back to the index',
  'missing.notes': 'The field notes',
  'missing.author': 'Of the author',
};

export type StringKey = keyof typeof EN;

const PT: Record<StringKey, string> = {
  'lang.toggle': 'Idioma',

  'link.email': 'E-mail',
  'link.contact': 'Contato',
  'link.cv': 'Currículo',

  'home.role': 'Desenvolvedor full stack · Florianópolis, Brasil',
  'home.lede':
    '<span class="initial">T</span>rabalho na Zallpy, onde agora escrevo pipelines de dados para a BMW Europa em Node.js e PostgreSQL. Antes disso, construí o front-end em Angular de uma plataforma financeira da BMW USA e baixei o tempo de carregamento de mais de dez segundos para menos de um.',
  'home.more':
    'Comecei na eTopocart, com mapas e tabelas enormes para prefeituras. Termino Ciência da Computação na UNISUL em MMXXVI. Toquei violino por anos; hoje só escuto.',
  'home.index.notes': 'Notas de campo',
  'home.index.notes.pg': 'todas',
  'home.index.author': 'Do autor, por extenso',
  'home.index.author.pg': 'sobre',
  'home.index.workshop': 'Oficina',
  'home.index.letters': 'Correspondência',
  'home.index.letters.pg': 'contato',
  'home.hint':
    '<kbd>←</kbd><kbd>→</kbd> ou <kbd>A</kbd><kbd>D</kbd> para andar · <kbd>Enter</kbd> numa porta para entrar · ou clique num prédio',
  'home.touch': 'Toque na rua para andar até lá, ou num prédio para entrar.',
  'home.door.key': 'Aperte Enter para entrar.',
  'home.door.touch': 'Toque na etiqueta para entrar.',
  'home.act': 'Toque aqui para entrar ›',
  'place.forum': 'ande pela rua e entre por uma porta para virar a página.',
  'place.bibliotheca': 'a biblioteca, onde ficam as notas de campo.',
  'place.bibliotheca.page': 'Notas de campo',
  'place.fabrica': 'a forja: a oficina, no GitHub.',
  'place.fabrica.page': 'Oficina · GitHub',
  'place.statua': 'o autor, em pedra e por extenso.',
  'place.statua.page': 'Do autor',

  'notes.title': 'Notas de campo',
  'notes.intro': 'O que construí, li e aprendi, anotado pelo caminho.',
  'notes.subjects': 'Assuntos:',
  'notes.all': 'todos',
  'notes.empty': 'Nada escrito sobre isso ainda.',
  'library.note': 'a sala de leitura; cada rolo de etiqueta vermelha é um capítulo.',
  'library.hint':
    '<kbd>←</kbd><kbd>→</kbd> ou <kbd>A</kbd><kbd>D</kbd> para andar · <kbd>Enter</kbd> num rolo para lê-lo · ou clique num',
  'library.touch': 'Toque no chão para andar até lá, ou num rolo para lê-lo.',
  'library.read': 'Toque aqui para ler ›',
  'exitus.page': 'de volta à Via Sacra',
  'exitus.key': 'aperte Enter',
  'exitus.act': 'Toque aqui para sair ›',
  'cogitator.page': 'um pensador, uns dezoito séculos adiantado',
  'cogitator.by': 'segundo Rodin',

  'about.all': 'Todos os contatos ↓',
  'about.p1':
    'Oi, eu sou o Eduardo, desenvolvedor full stack em Florianópolis. Trabalho na Zallpy, onde entrei como estagiário de front-end em 2024 e hoje sou desenvolvedor pleno. Agora estou num projeto da BMW Europa, escrevendo os pipelines de back-end que trazem os dados, transformam e rodam os jobs em segundo plano em volta deles, em Node.js, PostgreSQL e BullMQ.',
  'about.p2':
    'Antes disso eu estava na plataforma financeira da BMW USA, construindo o front-end em Angular como micro frontends sobre serviços em .NET e MuleSoft. A parte de que mais me orgulho é o tempo de carregamento: foi de mais de dez segundos para menos de um. Também construí o Dema, uma plataforma em React, NestJS, RabbitMQ e PostgreSQL que mostra às pessoas no Brasil os programas sociais a que elas têm direito e sugere carreiras a partir de um teste de personalidade e do que a cidade delas oferece.',
  'about.p3':
    'Meu primeiro emprego como desenvolvedor foi na eTopocart, em Criciúma, numa plataforma de geoprocessamento usada por prefeituras de todo o Brasil. Era quase tudo mapas e muitos dados: deixei as telas de mapa mais rápidas, fiz tabelas que aguentam mais de dez mil linhas sem travar e passei a geração de relatórios para o AWS Lambda.',
  'about.p4':
    'Em 2023 tirei um ano e morei entre os Estados Unidos e a Europa, principalmente para deixar meu inglês onde eu queria. Termino Ciência da Computação na UNISUL este ano. Até julho também fui voluntário no TEKTAI, um projeto de realidade aumentada para estudantes de lá, e foi onde aprendi WebGL o suficiente para desenhar as gravuras deste livro.',
  'about.p5': 'Toquei violino por anos. Não toco mais, mas ainda escuto muita música.',
  'about.stack.head': 'Com o que eu trabalho',
  'about.stack':
    'Principalmente TypeScript: Angular ou React no front, Node.js, NestJS ou .NET no back. PostgreSQL e SQL Server para dados, RabbitMQ e BullMQ para filas, AWS Lambda e API Gateway quando roda na nuvem. Aprendo com gosto o que mais um projeto precisar.',
  'note.currently': 'Atualmente',
  'note.currently.items': 'Full stack na Zallpy · Pipelines de dados para a BMW Europa · Terminando Ciência da Computação na UNISUL',
  'note.reading': 'Leitura',
  'note.reading.items': 'Ficção científica · Fantasia · O que me fisgar',
  'note.racing': 'Corridas',
  'note.racing.items': 'Fórmula 1 · Campeonato de construtores > de pilotos',
  'note.fighting': 'Lutas',
  'note.fighting.items': 'MMA · Boxe · Esportes de combate em geral',
  'note.music': 'Música',
  'note.music.items': 'Toquei violino por anos · Ainda escuto',
  'note.tongues': 'Línguas',
  'note.tongues.items': 'Português — nativo · Inglês — avançado · Espanhol — intermediário',
  'letters.head': 'Correspondência',
  'letters.intro': 'Para uma vaga, um projeto ou uma pergunta sobre algo que escrevi, e-mail é o jeito mais rápido de falar comigo.',
  'letters.based': 'Moro em',
  'letters.based.value': 'Florianópolis, Brasil · UTC−3',
  'letters.speaks': 'Falo',
  'letters.speaks.value': 'Português, inglês, espanhol',
  'letters.copy': 'Copiar',
  'letters.copied': 'Copiado',
  'letters.copy.key': 'Aperte ⌘C',
  'letters.write': 'Escreva para mim',
  'letters.cv': 'Currículo',
  'letters.cv.value': 'Baixar (PDF, em inglês)',
  'plaza.note': 'a praça do autor; um monumento para cada um dos seus interesses.',
  'plaza.hint':
    '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> ou <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> para andar · chegue num monumento para lê-lo · <kbd>Enter</kbd> para girá-lo',
  'plaza.touch': 'Toque na praça para andar até lá; chegue perto de um monumento para lê-lo.',
  'plaza.turn': 'Toque aqui para girá-lo ›',
  'statua.by': 'o autor, em pedra',
  'capsa.page': 'maior por dentro, ao que parece',
  'capsa.by': 'não estava aqui um minuto atrás',
  'medicus.by': 'um viajante',

  'missing.title': 'Esta página não está no livro',
  'missing.text': 'A folha que você procurava foi arrancada, ou nunca foi encadernada. O caminho de volta está aqui embaixo.',
  'missing.home': 'Voltar ao índice',
  'missing.notes': 'As notas de campo',
  'missing.author': 'Do autor',
};

export type Lang = 'en' | 'pt';
export const STRINGS: Record<Lang, Record<StringKey, string>> = { en: EN, pt: PT };

/** The English, as the pages render it before any switch. */
export const en = (key: StringKey) => EN[key];
