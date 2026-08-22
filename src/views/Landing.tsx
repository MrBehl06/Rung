import { SPRINTS } from '../data/sprints';
import { useReveal } from '../hooks/useReveal';

/** every feature the app actually has, in the order you meet them */
const FEATURES = [
  {
    k: 'Sprints',
    t: 'Pick what you are preparing for',
    d: 'High Level Design, Low Level Design and Blind 75 ship in. Join what you need and leave what you do not — leaving quiets a track without deleting a thing.',
  },
  {
    k: 'Review',
    t: 'Remember it in six weeks, not six days',
    d: 'Everything you finish returns on a spaced ladder: 1 day, 3, 7, 14, 30, 60, 120. Recall it cleanly and it moves out. Fumble it and it comes straight back.',
  },
  {
    k: 'Calendar',
    t: 'A plan you actually wrote',
    d: 'Write on any day. A line starting with a dash becomes something you can tick off. Today’s unfinished lines follow you to the home screen.',
  },
  {
    k: 'Resources',
    t: 'The blog you meant to reread',
    d: 'Attach links to any topic. They sit beside your notes, so the article that finally made sharding click is one click away next time.',
  },
  {
    k: 'Streaks',
    t: 'A weekly target, not a guilt trip',
    d: 'Aim for five days out of seven. Miss a Tuesday and nothing breaks — the week still lands. Your run is there too, quietly, when it is going well.',
  },
  {
    k: 'Saved',
    t: 'Star it now, find it later',
    d: 'Flag anything from any sprint and it collects in one place, so the ten topics you keep meaning to redo stop getting lost among two hundred.',
  },
];

const STEPS = [
  ['Join a sprint', 'Or all three. You can change your mind whenever.'],
  ['Work through it', 'Tick topics off. Notes, links and difficulty ride along.'],
  ['Let it come back', 'Review resurfaces things right before you would forget.'],
];

function Feature({ k, t, d }: { k: string; t: string; d: string }) {
  const ref = useReveal<HTMLElement>();
  return (
    <article ref={ref} className="lp-reveal">
      <span className="lp-k">{k}</span>
      <h2>{t}</h2>
      <p>{d}</p>
    </article>
  );
}

export function Landing({ onOpen }: { onOpen: () => void }) {
  const stepsRef = useReveal<HTMLElement>();
  const total = SPRINTS.reduce(
    (n, s) => n + s.categories.reduce((m, c) => m + c.rows.length, 0),
    0,
  );

  return (
    <div className="lp">
      <header className="lp-nav">
        <span className="lp-brand">
          <span className="lp-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17">
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
                <path d="M6.5 3.5L5 20.5M17.5 3.5L19 20.5" />
                <path d="M6.9 8.5h10.2M6.5 13.5h11M6.1 18.5h11.8" />
              </g>
            </svg>
          </span>
          Rung
        </span>
        <button className="btn primary" onClick={onOpen}>
          Open
        </button>
      </header>

      <section className="lp-hero">
        <h1 className="lp-h1">
          <span>Interview prep,</span>
          <span>one rung at a time.</span>
        </h1>
        <p className="lp-sub">
          {total} topics across system design and data structures. Track what you have covered,
          get it back before you forget it, and plan the day you are actually going to have.
        </p>
        <button className="btn primary lp-cta" onClick={onOpen}>
          Open Rung
        </button>
        <span className="lp-note">Free · no account · works offline</span>
      </section>

      <section className="lp-sprints" aria-label="What ships in">
        {SPRINTS.map((s) => {
          const n = s.categories.reduce((m, c) => m + c.rows.length, 0);
          return (
            <span className="lp-chip" key={s.id}>
              <b>{s.name}</b>
              <em>{n}</em>
            </span>
          );
        })}
      </section>

      <section className="lp-points">
        {FEATURES.map((f) => (
          <Feature key={f.k} {...f} />
        ))}
      </section>

      <section className="lp-steps lp-reveal" ref={stepsRef}>
        <ol>
          {STEPS.map(([t, d], i) => (
            <li key={t}>
              <span className="lp-step-n">{i + 1}</span>
              <b>{t}</b>
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-end">
        <h2>Start where you are.</h2>
        <button className="btn primary lp-cta" onClick={onOpen}>
          Open Rung
        </button>
      </section>

      <footer className="lp-foot">
        <span>Rung</span>
        <span>Your data never leaves this browser.</span>
      </footer>
    </div>
  );
}
