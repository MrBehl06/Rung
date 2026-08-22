import { SPRINTS } from '../data/sprints';

const POINTS = [
  {
    k: 'Sprints',
    t: 'Pick what you are preparing for',
    d: 'HLD, LLD and Blind 75 ship in. Join what you need, leave what you do not — nothing is deleted either way.',
  },
  {
    k: 'Review',
    t: 'Remember it in six weeks',
    d: 'Every topic you finish comes back on a spaced ladder. Recall it cleanly and it moves out; fumble it and it comes back sooner.',
  },
  {
    k: 'Calendar',
    t: 'A plan you actually wrote',
    d: 'Write on any day. Lines starting with a dash become things you can tick off. Today’s plan follows you to the home screen.',
  },
  {
    k: 'Private',
    t: 'Stays on your machine',
    d: 'No account, no server, no analytics. Everything lives in this browser, and you can export it whenever you like.',
  },
];

export function Landing({ onOpen }: { onOpen: () => void }) {
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
        <h1>
          Interview prep,
          <br />
          one rung at a time.
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

      <section className="lp-points">
        {POINTS.map((p) => (
          <article key={p.k}>
            <span className="lp-k">{p.k}</span>
            <h2>{p.t}</h2>
            <p>{p.d}</p>
          </article>
        ))}
      </section>

      <footer className="lp-foot">
        <span>Rung</span>
        <span>Your data never leaves this browser.</span>
      </footer>
    </div>
  );
}
