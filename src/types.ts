export type Subject = 'penale' | 'civile' | 'proc_penale';
export type ExamFrequency = 'alta' | 'media' | 'bassa';
export type Difficulty = 'base' | 'intermedia' | 'alta';
export type StudyStatus = 'non iniziato' | 'in studio' | 'da consolidare' | 'solido';

export interface Flashcard {
  q: string;
  a: string;
}

export interface TopicCard {
  id: string;
  subject: Subject;
  area: string;
  topic: string;
  slug: string;
  priority: 1 | 2 | 3 | 4 | 5;
  examFrequency: ExamFrequency;
  difficulty: Difficulty;
  status: StudyStatus;
  definition: string;
  ratio: string;
  keyNorms: string[];
  coreElements: string[];
  distinctions: string[];
  oralAnswerShort: string;
  oralAnswerExtended: string;
  classicQuestions: string[];
  trapQuestions: string[];
  miniCase: string;
  jurisprudenceNotes: string;
  linksToOtherCards: string[];
  commonMistakes: string[];
  flashcards: Flashcard[];
  checklist: string[];
}
