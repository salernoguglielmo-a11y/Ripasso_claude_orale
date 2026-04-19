import { useEffect, useMemo, useState } from 'react';
import { cards } from './data/cards';
import { Subject, StudyStatus, TopicCard } from './types';

const STORAGE_KEY = 'ripasso-orale-smart-progress';

const subjectLabels: Record<Subject, string> = {
  penale: 'Diritto penale',
  civile: 'Diritto civile',
  proc_penale: 'Procedura penale',
};

function App() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<TopicCard | null>(cards[0] ?? null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StudyStatus | 'all'>('all');
  const [progress, setProgress] = useState<Record<string, { reviewedToday: boolean; status: StudyStatus }>>({});
  const [oralMode, setOralMode] = useState(false);
  const [questionPool, setQuestionPool] = useState<string[]>([]);
  const [activeQuestion, setActiveQuestion] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setProgress(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (!oralMode || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [oralMode, secondsLeft]);

  const hydratedCards = useMemo(
    () =>
      cards.map((card) => ({
        ...card,
        status: progress[card.id]?.status ?? card.status,
      })),
    [progress],
  );

  const filteredCards = useMemo(() => {
    return hydratedCards.filter((card) => {
      const matchesSubject = selectedSubject === 'all' || card.subject === selectedSubject;
      const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
      const haystack = [
        card.topic,
        card.area,
        card.definition,
        card.ratio,
        card.oralAnswerShort,
        card.oralAnswerExtended,
      ]
        .join(' ')
        .toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      return matchesSubject && matchesStatus && matchesQuery;
    });
  }, [hydratedCards, query, selectedSubject, statusFilter]);

  const suggestedToday = useMemo(() => {
    return [...hydratedCards]
      .sort((a, b) => b.priority - a.priority)
      .filter((card) => !progress[card.id]?.reviewedToday)
      .slice(0, 5);
  }, [hydratedCards, progress]);

  const counts = useMemo(() => {
    return {
      total: hydratedCards.length,
      reviewed: Object.values(progress).filter((item) => item.reviewedToday).length,
      strong: hydratedCards.filter((card) => card.status === 'solido').length,
    };
  }, [hydratedCards, progress]);

  const startOralMode = () => {
    const source = filteredCards.flatMap((card) => card.classicQuestions.map((question) => `${card.topic}: ${question}`));
    const fallback = filteredCards.flatMap((card) => card.trapQuestions.map((question) => `${card.topic}: ${question}`));
    const pool = source.length > 0 ? source : fallback;
    setQuestionPool(pool);
    setActiveQuestion(pool[0] ?? 'Nessuna domanda disponibile con i filtri attuali.');
    setSecondsLeft(60);
    setOralMode(true);
  };

  const nextQuestion = () => {
    if (questionPool.length === 0) return;
    const next = questionPool[Math.floor(Math.random() * questionPool.length)];
    setActiveQuestion(next);
    setSecondsLeft(60);
  };

  const markReviewed = (card: TopicCard) => {
    setProgress((current) => ({
      ...current,
      [card.id]: {
        reviewedToday: true,
        status: current[card.id]?.status ?? card.status,
      },
    }));
  };

  const updateStatus = (card: TopicCard, status: StudyStatus) => {
    setProgress((current) => ({
      ...current,
      [card.id]: {
        reviewedToday: current[card.id]?.reviewedToday ?? false,
        status,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Ripasso orale</p>
              <h1 className="mt-1 text-3xl font-bold">Esame avvocato · penale, civile, procedura penale</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Banca dati di studio con schede ragionate, filtri, simulazione orale e tracciamento del ripasso.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <StatCard label="Schede" value={String(counts.total)} />
              <StatCard label="Ripassate oggi" value={String(counts.reviewed)} />
              <StatCard label="Solide" value={String(counts.strong)} />
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2">
              <SubjectButton active={selectedSubject === 'all'} label="Tutte" onClick={() => setSelectedSubject('all')} />
              {(Object.keys(subjectLabels) as Subject[]).map((subject) => (
                <SubjectButton
                  key={subject}
                  active={selectedSubject === subject}
                  label={subjectLabels[subject]}
                  onClick={() => setSelectedSubject(subject)}
                />
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca topic, definizioni, risposte orali..."
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-0 transition focus:border-slate-500"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StudyStatus | 'all')}
                className="rounded-2xl border border-slate-300 px-4 py-3"
              >
                <option value="all">Tutti gli stati</option>
                <option value="non iniziato">Non iniziato</option>
                <option value="in studio">In studio</option>
                <option value="da consolidare">Da consolidare</option>
                <option value="solido">Solido</option>
              </select>
              <button
                onClick={startOralMode}
                className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Simulazione orale
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Oggi ripassa questo</h2>
            <div className="mt-3 space-y-2">
              {suggestedToday.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className="block w-full rounded-2xl border border-amber-200 bg-white px-3 py-3 text-left text-sm hover:border-amber-400"
                >
                  <div className="font-semibold">{card.topic}</div>
                  <div className="mt-1 text-slate-600">{subjectLabels[card.subject]} · priorità {card.priority}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {oralMode && (
          <section className="mb-6 rounded-3xl border border-slate-900 bg-slate-900 p-5 text-white shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-300">Modalità interrogazione</p>
                <h2 className="mt-1 text-xl font-semibold">{activeQuestion}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-lg font-bold">{secondsLeft}s</div>
                <button onClick={nextQuestion} className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900">Nuova domanda</button>
                <button onClick={() => setOralMode(false)} className="rounded-2xl border border-white/30 px-4 py-3">Chiudi</button>
              </div>
            </div>
          </section>
        )}

        <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Schede</h2>
            <div className="space-y-3 overflow-y-auto lg:max-h-[70vh]">
              {filteredCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${selectedCard?.id === card.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400'}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge label={subjectLabels[card.subject]} />
                    <Badge label={`priorità ${card.priority}`} />
                    <Badge label={card.status} />
                  </div>
                  <div className="mt-2 font-semibold">{card.topic}</div>
                  <div className="mt-1 text-sm text-slate-600">{card.area}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {selectedCard ? (
              <>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge label={subjectLabels[selectedCard.subject]} />
                      <Badge label={`frequenza ${selectedCard.examFrequency}`} />
                      <Badge label={`difficoltà ${selectedCard.difficulty}`} />
                    </div>
                    <h2 className="mt-3 text-2xl font-bold">{selectedCard.topic}</h2>
                    <p className="mt-2 text-sm text-slate-600">{selectedCard.area}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => markReviewed(selectedCard)} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Segna come ripassata oggi</button>
                    <select
                      value={selectedCard.status}
                      onChange={(event) => updateStatus(selectedCard, event.target.value as StudyStatus)}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                    >
                      <option value="non iniziato">Non iniziato</option>
                      <option value="in studio">In studio</option>
                      <option value="da consolidare">Da consolidare</option>
                      <option value="solido">Solido</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <ContentSection title="Definizione" content={selectedCard.definition} />
                  <ContentSection title="Ratio" content={selectedCard.ratio} />
                  <ListSection title="Norme essenziali" items={selectedCard.keyNorms} />
                  <ListSection title="Elementi costitutivi" items={selectedCard.coreElements} />
                  <ListSection title="Distinzioni" items={selectedCard.distinctions} />
                  <ListSection title="Errori frequenti" items={selectedCard.commonMistakes} />
                  <ContentSection title="Risposta orale breve" content={selectedCard.oralAnswerShort} />
                  <ContentSection title="Risposta orale estesa" content={selectedCard.oralAnswerExtended} />
                  <ListSection title="Domande classiche" items={selectedCard.classicQuestions} />
                  <ListSection title="Domande-trabocchetto" items={selectedCard.trapQuestions} />
                  <ContentSection title="Mini-caso" content={selectedCard.miniCase} />
                  <ContentSection title="Nota giurisprudenziale" content={selectedCard.jurisprudenceNotes} />
                  <ListSection title="Checklist finale" items={selectedCard.checklist} />
                  <ListSection title="Collegamenti" items={selectedCard.linksToOtherCards} />
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold">Flashcard</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedCard.flashcards.map((flashcard) => (
                      <div key={flashcard.q} className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900">Q. {flashcard.q}</div>
                        <div className="mt-2 text-sm text-slate-600">A. {flashcard.a}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p>Seleziona una scheda.</p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function SubjectButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${active ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`}
    >
      {label}
    </button>
  );
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{label}</span>;
}

function ContentSection({ title, content }: { title: string; content: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-700">{content}</p>
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default App;
