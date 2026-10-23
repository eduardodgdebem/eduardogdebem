// What the orator on the Via Sacra says when the reader's citizen comes within
// earshot: Caesar and the emperors, Marcus Aurelius, and a few things overheard
// from further along in history (Red Rising, Sun Eater).

export interface Speech {
  text: string;
  by: string;
}

export const SPEECHES: Speech[] = [
  { text: 'Veni, vidi, vici.', by: 'Gaius Julius Caesar, after Zela' },
  { text: 'Alea iacta est. The die is cast.', by: 'Caesar at the Rubicon, as Suetonius tells it' },
  { text: 'Gallia est omnis divisa in partes tres.', by: 'Caesar, opening his Gallic War' },
  { text: 'I found Rome a city of brick, and left it a city of marble.', by: 'Augustus, as Suetonius has it' },
  { text: 'Festina lente. Make haste slowly.', by: 'Augustus’s favourite saying' },
  { text: 'A good shepherd shears his flock; he does not flay it.', by: 'Tiberius, to his governors' },
  { text: 'Vae, puto deus fio. Alas, I think I am becoming a god.', by: 'Vespasian, on his deathbed' },
  { text: 'Qualis artifex pereo! What an artist dies in me!', by: 'Nero, at the end' },
  { text: 'Incitatus for consul! At least the horse takes no bribes.', by: 'a supporter of Caligula’s horse' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', by: 'Marcus Aurelius, Meditations V.20' },
  { text: 'Waste no more time arguing what a good man should be. Be one.', by: 'Marcus Aurelius, Meditations X.16' },
  { text: 'Very little is needed to make a happy life.', by: 'Marcus Aurelius, Meditations VII.67' },
  { text: 'Watch the stars in their courses, and see yourself running with them.', by: 'Marcus Aurelius, Meditations VII.47' },
  { text: 'Loss is nothing but change, and change is Nature’s delight.', by: 'Marcus Aurelius, Meditations IX.35' },
  { text: 'Break the chains.', by: 'chalked behind the Curia, signed with a helmet' },
  { text: 'Per aspera ad astra. Ask any Red from Lykos.', by: 'overheard, a few centuries early' },
  { text: 'Hail, Reaper!', by: 'someone in the crowd, for no reason anyone can explain' },
  { text: 'A man named Marlowe will put out a sun one day. Mark it in your codex.', by: 'a prophecy, unsourced' },
  { text: 'The Chantry would burn that whole library. Read it while you may.', by: 'a warning, about the Bibliotheca' },
  { text: 'If a pale, many-eyed stranger asks you to dinner, decline.', by: 'practical advice regarding the Cielcin' },
];
