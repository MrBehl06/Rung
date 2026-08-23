import { useEffect, useRef } from 'react';
import { SPRINTS } from '../data/sprints';
import { useReveal } from '../hooks/useReveal';
import { SpotlightCard } from '../components/SpotlightCard';
import { Waves } from '../components/Waves';

interface Feature {
  k: string;
  t: string;
  d: string;
  shot: string;
  alt: string;
  /** ink band rather than white */
  dark?: boolean;
  /** image left of the text instead of right */
  flip?: boolean;
}

const FEATURES: Feature[] = [
  {
    k: 'Sprints',
    t: 'Pick what you are preparing for',
    d: 'High Level Design, Low Level Design and Blind 75 ship in. Join the ones you need and leave the rest — leaving quiets a track everywhere without deleting a single topic, note or point you earned.',
    shot: 'sprints',
    alt: 'The Sprints hub, showing three sprints with progress and a locked track',
    dark: true,
  },
  {
    k: 'Review',
    t: 'Remember it in six weeks, not six days',
    d: 'Everything you finish comes back on a spaced ladder — 1 day, 3, 7, 14, 30, 60, 120. Recall it cleanly and it climbs a rung. Fumble it and it drops to the bottom and returns tomorrow.',
    shot: 'review',
    alt: 'The review queue with the spaced-repetition ladder for each topic',
    flip: true,
  },
  {
    k: 'Calendar',
    t: 'A plan you actually wrote',
    d: 'Write on any day. A line starting with a dash becomes something you can tick off, and today’s unfinished lines follow you to the home screen. Past days shade by what you did; future days show what is coming due.',
    shot: 'calendar',
    alt: 'A month grid shaded by activity, with the streak band above it',
    dark: true,
  },
  {
    k: 'Topics',
    t: 'Everything about one idea, in one place',
    d: 'Notes that autosave, the blogs and videos that finally made it click, its review schedule and its history — all behind one click, all searchable from the list and the command bar.',
    shot: 'resources',
    alt: 'A topic drawer showing notes and three saved resource links',
    flip: true,
  },
  {
    k: 'Streaks',
    t: 'A weekly target, not a guilt trip',
    d: 'Aim for five days out of seven. Miss a Tuesday and nothing breaks — the week still lands. Your run is there too, quietly, for the stretches when it is going well.',
    shot: 'sprint',
    alt: 'A sprint page showing topic cards grouped by track',
    dark: true,
  },
  {
    k: 'Saved',
    t: 'Star it now, find it later',
    d: 'Flag anything from any sprint and it collects in one place, so the ten topics you keep meaning to redo stop getting lost among two hundred you already know.',
    shot: 'saved',
    alt: 'The Saved page listing starred topics grouped by sprint',
    flip: true,
  },
];

interface Step { t: string; d: string; note: string }

const STEPS: Step[] = [
  {
    t: 'Join a sprint',
    d: 'Or all three. Nothing is locked, and you can change your mind whenever you like.',
    note: '189 topics waiting',
  },
  {
    t: 'Work through it',
    d: 'Tick topics off as you go. Notes, links and difficulty ride along with each one.',
    note: 'Notes autosave',
  },
  {
    t: 'Let it come back',
    d: 'Review resurfaces each topic right before you would have forgotten it. You just show up.',
    note: '1d → 120d ladder',
  },
];

function Band({ f }: { f: Feature }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className={`lp-band lp-reveal ${f.dark ? 'ink' : ''} ${f.flip ? 'flip' : ''}`}>
      <div className="lp-band-in">
        <div className="lp-band-txt">
          <span className="lp-k">{f.k}</span>
          <h2>{f.t}</h2>
          <p>{f.d}</p>
        </div>
        <div className="lp-shot">
          <img src={`/shots/${f.shot}.webp`} alt={f.alt} loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  );
}

export function Landing({ onOpen }: { onOpen: () => void }) {
  const navRef = useRef<HTMLElement>(null);
  const stepsRef = useReveal<HTMLElement>();
  const privacyRef = useReveal<HTMLElement>();
  const total = SPRINTS.reduce((n, s) => n + s.categories.reduce((m, c) => m + c.rows.length, 0), 0);

  // the nav only earns a border once there is content behind it
  useEffect(() => {
    const onScroll = () => navRef.current?.classList.toggle('stuck', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp">
      <header className="lp-nav" ref={navRef}>
        <div className="lp-nav-in">
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
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-waves" aria-hidden="true">
          <Waves
            lineColor="var(--wave)"
            backgroundColor="transparent"
            waveSpeedX={0.008}
            waveSpeedY={0.004}
            waveAmpX={26}
            waveAmpY={14}
            xGap={13}
            yGap={34}
          />
        </div>

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

        <div className="lp-hero-shot">
          <img
            src="/shots/sprint.webp"
            alt="A sprint page in Rung, showing topic cards grouped by track"
            width={1280}
            height={820}
            decoding="async"
          />
        </div>
      </section>


      {FEATURES.map((f) => (
        <Band key={f.k} f={f} />
      ))}

      <section className="lp-steps lp-reveal ink" ref={stepsRef}>
        <div className="lp-steps-in">
          <div className="lp-steps-head">
            <span className="lp-k">How it goes</span>
            <h2>Three steps, then it runs itself.</h2>
          </div>
          <ol className="lp-step-grid">
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <SpotlightCard>
                  <span className="lp-step-n">{String(i + 1).padStart(2, '0')}</span>
                  <b>{s.t}</b>
                  <p>{s.d}</p>
                  <span className="lp-step-note">{s.note}</span>
                </SpotlightCard>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-privacy lp-reveal" ref={privacyRef}>
        <div className="lp-privacy-in">
          <div className="lp-privacy-txt">
            <span className="lp-k">Private by construction</span>
            <h2>There is no server to trust.</h2>
            <p>
              No account, no sign-in, no analytics, no network calls. Everything lives in this
              browser’s storage, which means it works on a plane and it is yours to export as a
              single JSON file whenever you want it somewhere else.
            </p>
          </div>
          <ul className="lp-facts">
            <li>
              <b>0</b>
              <span>network requests</span>
            </li>
            <li>
              <b>0</b>
              <span>accounts to make</span>
            </li>
            <li>
              <b>1</b>
              <span>file to export it all</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="lp-end">
        <h2>Start where you are.</h2>
        <button className="btn primary lp-cta" onClick={onOpen}>
          Open Rung
        </button>
        <span className="lp-note">It takes one click. Nothing to set up.</span>
      </section>

      <footer className="lp-foot">
        <div className="lp-foot-in">
          <span>Rung · one rung at a time</span>
          <span>Your data never leaves this browser.</span>
        </div>
      </footer>
    </div>
  );
}
