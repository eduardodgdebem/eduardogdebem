// What the orator on the Via Sacra says when the reader's citizen comes within
// earshot: Caesar and the emperors, Marcus Aurelius, and a few things overheard
// from further along in history (Red Rising, Sun Eater). Each in English and Portuguese.

export interface Speech {
  text: string;
  by: string;
  /** The same, in Portuguese (Latin stays Latin). */
  pt: { text: string; by: string };
}

export const SPEECHES: Speech[] = [
  { text: 'Veni, vidi, vici.', by: 'Gaius Julius Caesar, after Zela',
    pt: { text: 'Veni, vidi, vici.', by: 'Caio Júlio César, depois de Zela' } },
  { text: 'Alea iacta est. The die is cast.', by: 'Caesar at the Rubicon, as Suetonius tells it',
    pt: { text: 'Alea iacta est. A sorte está lançada.', by: 'César no Rubicão, segundo Suetônio' } },
  { text: 'Gallia est omnis divisa in partes tres.', by: 'Caesar, opening his Gallic War',
    pt: { text: 'Gallia est omnis divisa in partes tres.', by: 'César, abrindo a sua Guerra das Gálias' } },
  { text: 'I found Rome a city of brick, and left it a city of marble.', by: 'Augustus, as Suetonius has it',
    pt: { text: 'Encontrei Roma uma cidade de tijolos e a deixei uma cidade de mármore.', by: 'Augusto, segundo Suetônio' } },
  { text: 'Festina lente. Make haste slowly.', by: 'Augustus’s favourite saying',
    pt: { text: 'Festina lente. Apressa-te devagar.', by: 'o ditado preferido de Augusto' } },
  { text: 'A good shepherd shears his flock; he does not flay it.', by: 'Tiberius, to his governors',
    pt: { text: 'Um bom pastor tosquia o rebanho; não o esfola.', by: 'Tibério, aos seus governadores' } },
  { text: 'Vae, puto deus fio. Alas, I think I am becoming a god.', by: 'Vespasian, on his deathbed',
    pt: { text: 'Vae, puto deus fio. Ai, acho que estou virando um deus.', by: 'Vespasiano, no leito de morte' } },
  { text: 'Qualis artifex pereo! What an artist dies in me!', by: 'Nero, at the end',
    pt: { text: 'Qualis artifex pereo! Que artista morre comigo!', by: 'Nero, no fim' } },
  { text: 'Incitatus for consul! At least the horse takes no bribes.', by: 'a supporter of Caligula’s horse',
    pt: { text: 'Incitatus para cônsul! Pelo menos o cavalo não aceita propina.', by: 'um apoiador do cavalo de Calígula' } },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', by: 'Marcus Aurelius, Meditations V.20',
    pt: { text: 'O impedimento à ação faz a ação avançar. O que está no caminho se torna o caminho.', by: 'Marco Aurélio, Meditações V.20' } },
  { text: 'Waste no more time arguing what a good man should be. Be one.', by: 'Marcus Aurelius, Meditations X.16',
    pt: { text: 'Não perca mais tempo discutindo como deve ser um homem bom. Seja um.', by: 'Marco Aurélio, Meditações X.16' } },
  { text: 'Very little is needed to make a happy life.', by: 'Marcus Aurelius, Meditations VII.67',
    pt: { text: 'Muito pouco é preciso para uma vida feliz.', by: 'Marco Aurélio, Meditações VII.67' } },
  { text: 'Watch the stars in their courses, and see yourself running with them.', by: 'Marcus Aurelius, Meditations VII.47',
    pt: { text: 'Observe as estrelas em seus cursos e veja-se correndo com elas.', by: 'Marco Aurélio, Meditações VII.47' } },
  { text: 'Loss is nothing but change, and change is Nature’s delight.', by: 'Marcus Aurelius, Meditations IX.35',
    pt: { text: 'A perda não é nada além de mudança, e a mudança é o deleite da Natureza.', by: 'Marco Aurélio, Meditações IX.35' } },
  { text: 'Break the chains.', by: 'chalked behind the Curia, signed with a helmet',
    pt: { text: 'Quebre as correntes.', by: 'escrito a giz atrás da Cúria, assinado com um elmo' } },
  { text: 'Per aspera ad astra. Ask any Red from Lykos.', by: 'overheard, a few centuries early',
    pt: { text: 'Per aspera ad astra. Pergunte a qualquer Vermelho de Lykos.', by: 'ouvido por aí, alguns séculos adiantado' } },
  { text: 'Hail, Reaper!', by: 'someone in the crowd, for no reason anyone can explain',
    pt: { text: 'Salve, Ceifador!', by: 'alguém na multidão, sem motivo que alguém saiba explicar' } },
  { text: 'A man named Marlowe will put out a sun one day. Mark it in your codex.', by: 'a prophecy, unsourced',
    pt: { text: 'Um homem chamado Marlowe vai apagar um sol um dia. Anote no seu códice.', by: 'uma profecia, sem fonte' } },
  { text: 'The Chantry would burn that whole library. Read it while you may.', by: 'a warning, about the Bibliotheca',
    pt: { text: 'A Capela queimaria aquela biblioteca inteira. Leia enquanto pode.', by: 'um aviso, sobre a Bibliotheca' } },
  { text: 'If a pale, many-eyed stranger asks you to dinner, decline.', by: 'practical advice regarding the Cielcin',
    pt: { text: 'Se um estranho pálido e de muitos olhos te convidar para jantar, recuse.', by: 'conselho prático a respeito dos Cielcin' } },
];
