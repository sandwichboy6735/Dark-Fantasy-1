import { useCallback, useEffect, useRef, useState } from 'react';
import { pressBang, pressTalk, store, talkButton, useStore } from '../store.js';
import {
  CATS,
  CHAPTER_TITLES,
  DIFFICULTY,
  LAST_CHAPTER,
  PAGES,
  ROMAN,
  TORCHES,
  bangAvailable,
  chapterQuest,
  endConversation,
  hasProgress,
  linesFor,
  newGame,
  objective,
  objectiveHint,
  questSteps,
  rankFor,
  saveGame,
  scoreRun,
  travelTo,
  STAGE,
} from '../game/quest.js';
import { MapView } from './MapView.jsx';
import { live } from '../game/live.js';
import { sfx, startAudio, toggleMute } from '../game/audio.js';
import { IS_TOUCH, addLook } from '../player/input.js';
import { TouchControls } from './TouchControls.jsx';
import { verbFor } from './verbs.js';

const TYPE_SPEED_MS = 28;
const BUTTON = IS_TOUCH ? 'TALK' : 'E';

// Retro text box: the speaker's name on a tab, text typed out a letter at a
// time. E / TALK finishes the line, then shows the next one, and after the last
// one closes the box. What they say is fixed when the conversation opens;
// opening it may move the story on.
function Dialogue({ target }) {
  const [lines] = useState(() => linesFor(target));
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const text = lines[Math.min(index, lines.length - 1)];
  const state = useRef({});
  state.current = { shown, length: text.length, last: index >= lines.length - 1 };

  useEffect(() => {
    setShown(0);
    const timer = setInterval(
      () =>
        setShown((n) => {
          if (n < text.length && n % 3 === 0) sfx.blip();
          return Math.min(n + 1, text.length);
        }),
      TYPE_SPEED_MS,
    );
    return () => clearInterval(timer);
  }, [text]);

  useEffect(() => {
    const advance = () => {
      const { shown: s, length, last } = state.current;
      if (s < length) setShown(length);
      else if (last) endConversation();
      else setIndex((i) => i + 1);
    };
    talkButton.addEventListener('press', advance);
    return () => talkButton.removeEventListener('press', advance);
  }, []);

  const done = shown >= text.length;
  return (
    <div className="dialogue" style={{ '--accent': target.accent ?? '#f0c060' }}>
      <div className="speaker">{target.name}</div>
      <p>{text.slice(0, shown)}</p>
      {done && (
        <div className="more">
          {Math.min(index, lines.length - 1) + 1}/{lines.length} <span className="key">{BUTTON}</span> {index >= lines.length - 1 ? 'CLOSE' : 'NEXT'}
        </div>
      )}
    </div>
  );
}

// "E  TALK TO GRUBNIK": what you can do with whatever you're facing right now.
function Prompt({ target }) {
  const verb = useStore((s) => verbFor(target, s));
  return (
    <div className="prompt">
      <span className="key">{BUTTON}</span> {verb}
    </div>
  );
}

// A big banner whenever the objective changes, so you never miss the next step.
function ObjectiveBanner({ goal }) {
  const first = useRef(true);
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    setShown(goal);
    const timer = setTimeout(() => setShown(null), 4500);
    return () => clearTimeout(timer);
  }, [goal]);
  if (!shown) return null;
  return (
    <div className="objective-banner" key={shown}>
      <small>NEW OBJECTIVE</small>
      {shown}
    </div>
  );
}

// Every step of the story, ticked off, plus the optional extras.
function Journal() {
  const state = useStore((s) => s);
  return (
    <div className="journal">
      <h3>
        CHAPTER {ROMAN[state.chapter]}: {CHAPTER_TITLES[state.chapter].toUpperCase()}
      </h3>
      <ol>
        {questSteps(state).map((step) => (
          <li key={step.text} className={step.state}>
            <span className="tick">{step.state === 'done' ? '✓' : step.state === 'now' ? '▶' : '·'}</span>
            {step.text}
          </li>
        ))}
      </ol>
      <p className="now-hint">{objectiveHint(state, BUTTON)}</p>
      <p className="extras">
        EXTRAS:{' '}
        {state.chapter > 1
          ? chapterQuest(state.chapter).extras(state)
          : `torches ${state.lit.length}/${TORCHES.filter((t) => !t.startsLit).length} · cats ${state.cats.length}/${CATS.length} · pages ${state.pages.length}/${PAGES.length}`}
      </p>
    </div>
  );
}

function Notice() {
  const notice = useStore((s) => s.notice);
  if (!notice) return null;
  return (
    <div className="notice" key={notice.id}>
      {notice.text}
    </div>
  );
}

const chooseDifficulty = (difficulty) => {
  store.set({ difficulty, intro: false });
  saveGame();
};

// Arriving in chapter II or III: what the chapter is about and what can hurt you.
// Any press of E / TALK (or a tap) starts it.
function ChapterCard({ chapter }) {
  const intro = chapterQuest(chapter).intro;
  useEffect(() => {
    const close = () => store.set({ intro: false });
    const timer = setTimeout(() => talkButton.addEventListener('press', close), 600);
    return () => {
      clearTimeout(timer);
      talkButton.removeEventListener('press', close);
    };
  }, []);
  const words = (parts) => parts.map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
  return (
    <div className="goal-card chapter-card" onPointerDown={() => store.set({ intro: false })}>
      <div className="panel">
        <p className="chapter-number">CHAPTER {ROMAN[chapter]}</p>
        <h2>{intro.title}</h2>
        <p className="lead">{intro.lead}</p>
        <ol>
          {intro.steps.map((step, i) => (
            <li key={i}>{words(step)}</li>
          ))}
        </ol>
        <p className="danger">{words(intro.danger)}</p>
        <p className="blink">{IS_TOUCH ? 'TAP' : 'PRESS E'} TO BEGIN</p>
      </div>
    </div>
  );
}

// Shown when a new game starts: what you're here to do, what can hurt you, and
// how forgiving you'd like it to be.
function GoalCard() {
  useEffect(() => {
    const close = () => chooseDifficulty('normal');
    const onKey = (e) => {
      if (e.code === 'Digit1') chooseDifficulty('easy');
      if (e.code === 'Digit2') chooseDifficulty('normal');
    };
    const timer = setTimeout(() => talkButton.addEventListener('press', close), 400);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      talkButton.removeEventListener('press', close);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  const pick = (difficulty) => (e) => {
    e.stopPropagation();
    chooseDifficulty(difficulty);
  };
  return (
    <div className="goal-card">
      <div className="panel">
        <h2>YOUR QUEST</h2>
        <p className="lead">For a hundred years a giant Eye has watched this land. Close it.</p>
        <ol>
          <li>Follow the <b className="gold">gold arrow</b> at the top of the screen to the tavern.</li>
          <li>
            A big <b>!</b> floats over whoever you need. Walk up to them and press <b>{BUTTON}</b> to talk. Keep pressing it to read on.
          </li>
          <li>The quest line at the top always says what to do next. Pause any time for your quest journal and a map.</li>
        </ol>
        <p className="danger">
          <b>DANGER:</b> blue searchlights from the Eye sweep the causeway. Stand in one too long and it <b>sees you</b>. Torchlight keeps
          you hidden, so relight the dead torches as you go.
        </p>
        <div className="difficulty">
          <button type="button" onPointerDown={pick('easy')}>
            <b>{DIFFICULTY.easy.label.toUpperCase()}</b>
            <span>Easier: slower dread and Watchers</span>
          </button>
          <button type="button" className="main" onPointerDown={pick('normal')}>
            <b>{DIFFICULTY.normal.label.toUpperCase()}</b>
            <span>The intended challenge</span>
          </button>
        </div>
        {!IS_TOUCH && <p className="hint">1 / 2 TO CHOOSE, OR E FOR VIGIL</p>}
      </div>
    </div>
  );
}

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

// Per-frame HUD: the objective arrow, the dread and foam meters, the blue vignette
// and the black-out after being seen. Written straight to the DOM every frame.
function LiveHud() {
  const refs = useRef({});
  const bind = (name) => (el) => {
    refs.current[name] = el;
  };
  const stage = useStore((s) => s.stage);
  const spilled = useStore((s) => s.spilled);
  const chapter = useStore((s) => s.chapter);
  const showFoam = chapter === 1 && stage === STAGE.TOAST && !spilled;
  const showWarmth = chapter === 3;

  useEffect(() => {
    let frame;
    const tick = () => {
      const r = refs.current;
      const m = live.marker;
      if (r.marker) {
        r.marker.style.visibility = m ? 'visible' : 'hidden';
        if (m) {
          r.arrow.style.transform = `rotate(${-m.angle}rad)`;
          r.distance.textContent = `${Math.round(m.distance)} m`;
        }
      }
      if (r.dread) {
        r.dread.style.visibility = live.dread > 0.01 ? 'visible' : 'hidden';
        r.dreadFill.style.width = `${live.dread * 100}%`;
      }
      if (r.foamFill) r.foamFill.style.width = `${live.foam * 100}%`;
      if (r.foam) r.foam.classList.toggle('warn', live.running);
      if (r.warmthFill) r.warmthFill.style.width = `${live.warmth * 100}%`;
      if (r.warmth) r.warmth.classList.toggle('warn', live.warmth < 0.3);
      if (r.frost) r.frost.style.opacity = store.get().chapter === 3 ? String(Math.max(0, 0.6 - live.warmth) * 1.4) : '0';
      const other = store.get().chapter > 1;
      const escaping = Boolean(live.escape) && store.get().stage === STAGE.ESCAPE && !other;
      if (r.vignette) {
        r.vignette.style.opacity = String(live.hunted > 0 || escaping ? 0.8 : Math.min(1, live.dread * 1.2));
        r.vignette.classList.toggle('hunted', live.hunted > 0 || escaping);
      }
      if (r.sneak) r.sneak.style.visibility = live.sneaking ? 'visible' : 'hidden';
      if (r.fade) r.fade.style.opacity = String(live.fade);
      if (r.status && other) {
        const st = live.status;
        r.status.textContent = st?.text ?? '';
        r.status.className = `gaze-status${st?.alarm ? ' alarm' : ''}${st?.hunted ? ' hunted' : ''}`;
        if (r.vignette) {
          r.vignette.style.opacity = st?.hunted ? '0.8' : '0';
          r.vignette.classList.toggle('hunted', Boolean(st?.hunted));
        }
      } else if (r.status) {
        const hunted = live.hunted > 0 || escaping;
        const exposed = live.inGaze && !live.safe;
        const fallsIn = escaping ? Math.ceil(live.escape.fallAt - live.gameTime) : 0;
        const text = escaping
          ? fallsIn > 0
            ? `THE CAUSEWAY FALLS IN ${fallsIn}... RUN!`
            : live.gameTime < live.stunUntil
              ? 'HIT BY FALLING STONE! GET UP!'
              : 'RUN! THE CAUSEWAY IS FALLING BEHIND YOU!'
          : live.hunted > 0
          ? 'A WATCHER IS HUNTING YOU! RUN FOR THE LIGHT!'
          : exposed
            ? 'THE EYE IS LOOKING. MOVE!'
            : live.inGaze && live.safe
              ? 'HIDDEN IN THE LIGHT'
              : '';
        r.status.textContent = text;
        r.status.className = `gaze-status${hunted ? ' alarm hunted' : exposed ? ' alarm' : ''}`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div className="vignette" ref={bind('vignette')} />
      <div className="frost" ref={bind('frost')} />
      <div className="fade" ref={bind('fade')} />
      <div className="marker" ref={bind('marker')}>
        <div className="arrow-up" ref={bind('arrow')} />
        <span ref={bind('distance')} />
      </div>
      <div className="meters">
        <div className="meter dread" ref={bind('dread')}>
          <span>DREAD</span>
          <div className="bar">
            <div ref={bind('dreadFill')} />
          </div>
        </div>
        {showWarmth && (
          <div className="meter warmth" ref={bind('warmth')}>
            <span>WARMTH</span>
            <div className="bar">
              <div ref={bind('warmthFill')} />
            </div>
          </div>
        )}
        {showFoam && (
          <div className="meter foam" ref={bind('foam')}>
            <span>FOAM</span>
            <div className="bar">
              <div ref={bind('foamFill')} />
            </div>
          </div>
        )}
      </div>
      <div className="gaze-status" ref={bind('status')} />
      <div className="sneak-badge" ref={bind('sneak')}>SNEAKING</div>
      <Pockets />
    </>
  );
}

// Bottom right: bangers left, and whatever you've been collecting in this chapter.
function Pockets() {
  const bangers = useStore((s) => s.bangers);
  const showBangers = useStore(bangAvailable);
  const chapter = useStore((s) => s.chapter);
  const cats = useStore((s) => (s.chapter === 1 ? s.cats.length : 0));
  const pages = useStore((s) => (s.chapter === 1 ? s.pages.length : 0));
  const extras = useStore((s) => (s.chapter > 1 ? chapterQuest(s.chapter).pockets(s) : null));
  const mode = useStore((s) => s.mode);
  return (
    <div className="pockets">
      {showBangers && (
        <div className={`pocket${bangers === 0 ? ' empty' : ''}`}>
          <span className="banger-icon" /> BANGERS x{bangers}
          {mode !== 'touch' && <span className="key">F</span>}
        </div>
      )}
      {cats > 0 && (
        <div className="pocket">
          <span className="cat-icon" /> CATS {cats}/{CATS.length}
        </div>
      )}
      {pages > 0 && (
        <div className="pocket">
          <span className="page-icon" /> PAGES {pages}/{PAGES.length}
        </div>
      )}
      {chapter > 1 &&
        extras
          .split('|')
          .filter(Boolean)
          .map((text) => (
            <div key={text} className="pocket">
              {text}
            </div>
          ))}
    </div>
  );
}

// After a chapter: E (or the button) goes on to the next one, 2 stays to wander.
function useEndingInput(next, stay) {
  useEffect(() => {
    const onKey = (e) => e.code === 'Digit2' && stay();
    // Ignore the press that finished the chapter; let the card sit for a moment.
    const timer = setTimeout(() => {
      talkButton.addEventListener('press', next);
      window.addEventListener('keydown', onKey);
    }, 1500);
    return () => {
      clearTimeout(timer);
      talkButton.removeEventListener('press', next);
      window.removeEventListener('keydown', onKey);
    };
  }, [next, stay]);
}

function Rank({ result }) {
  return (
    <div className="rank">
      <span className={`letter rank-${result.rank}`}>{result.rank}</span>
      <span className="rank-title">
        {result.title}
        <br />
        <small>{(DIFFICULTY[store.get().difficulty] ?? DIFFICULTY.normal).label.toUpperCase()} DIFFICULTY</small>
      </span>
    </div>
  );
}

function EndingButtons({ nextLabel, next, stay, stayLabel = 'STAY A WHILE' }) {
  const act = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };
  return (
    <div className="ending-buttons">
      <button type="button" className="main" onPointerDown={act(next)}>
        {nextLabel}
        {!IS_TOUCH && <small>E</small>}
      </button>
      <button type="button" onPointerDown={act(stay)}>
        {stayLabel}
        {!IS_TOUCH && <small>2</small>}
      </button>
    </div>
  );
}

const stayHere = () => store.set({ ending: false });

// Chapter I, the Vigil.
function VigilEnding() {
  const [result] = useState(() => scoreRun(store.get(), store.get().records[1]?.time ?? live.playTime));
  const next = useCallback(() => travelTo(2), []);
  useEndingInput(next, stayHere);
  const state = store.get();
  return (
    <div className="ending">
      <div className="panel">
        <p className="chapter-number">CHAPTER I COMPLETE</p>
        <h2>THE EYE CLOSES</h2>
        <p>The Great Bell rang, the Eye slept, and the causeway fell into the abyss a heartbeat behind you. The stars are back. The goblins will sing about you until at least Tuesday.</p>
        <div className="result">
          <Rank result={result} />
          <table className="stats">
            <tbody>
              <tr><td>TIME</td><td>{formatTime(state.records[1]?.time ?? live.playTime)}</td></tr>
              <tr><td>TIMES CAUGHT</td><td>{state.seen}</td></tr>
              <tr><td>TORCHES RELIT</td><td>{state.lit.length} / {TORCHES.filter((t) => !t.startsLit).length}</td></tr>
              <tr><td>ESCAPE</td><td>{formatTime(live.escapeTime)}</td></tr>
              <tr><td>CATS PETTED</td><td>{state.cats.length} / {CATS.length}</td></tr>
              <tr><td>DIARY PAGES</td><td>{state.pages.length} / {PAGES.length}</td></tr>
              <tr><td>SCORE</td><td>{result.score}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="thanks">But not every star made it home...</p>
        <EndingButtons nextLabel="ON TO CHAPTER II" next={next} stay={stayHere} />
      </div>
    </div>
  );
}

// Chapter II (and any other middle chapter): its own story, rank and stats.
function ChapterEnding({ chapter }) {
  const quest = chapterQuest(chapter);
  const [result] = useState(() => quest.score(store.get(), store.get().records[chapter]?.time ?? 0));
  const next = useCallback(() => travelTo(chapter + 1), [chapter]);
  useEndingInput(next, stayHere);
  const state = store.get();
  const ending = quest.ending;
  return (
    <div className="ending">
      <div className="panel">
        <p className="chapter-number">CHAPTER {ROMAN[chapter]} COMPLETE</p>
        <h2>{ending.title}</h2>
        <p>{ending.text}</p>
        <div className="result">
          <Rank result={result} />
          <table className="stats">
            <tbody>
              <tr><td>TIME</td><td>{formatTime(state.records[chapter]?.time ?? 0)}</td></tr>
              {ending.rows(state).map(([label, value]) => (
                <tr key={label}><td>{label}</td><td>{value}</td></tr>
              ))}
              <tr><td>SCORE</td><td>{result.score}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="thanks">{ending.teaser}</p>
        <EndingButtons nextLabel={`ON TO CHAPTER ${ROMAN[chapter + 1]}`} next={next} stay={stayHere} />
      </div>
    </div>
  );
}

// The last chapter: the sun comes up, and every chapter's rank together.
function FinalEnding() {
  const quest = chapterQuest(LAST_CHAPTER);
  const state = store.get();
  const records = state.records;
  const [result] = useState(() => quest.score(state, records[LAST_CHAPTER]?.time ?? 0));
  const home = useCallback(() => travelTo(1), []);
  useEndingInput(home, stayHere);
  const chapters = [1, 2, 3].filter((n) => records[n]);
  const total = chapters.reduce((sum, n) => sum + records[n].score, 0);
  const overall = chapters.length === 3 ? rankFor(total / 3) : null;
  return (
    <div className="ending final">
      <div className="panel">
        <p className="chapter-number">THE END</p>
        <h2>{quest.ending.title}</h2>
        <p>{quest.ending.text}</p>
        <div className="result">
          <Rank result={result} />
          <table className="stats">
            <tbody>
              {chapters.map((n) => (
                <tr key={n}>
                  <td>{ROMAN[n]}. {CHAPTER_TITLES[n].toUpperCase()}</td>
                  <td>
                    <span className={`mini-rank rank-${records[n].rank}`}>{records[n].rank}</span> {formatTime(records[n].time)}
                  </td>
                </tr>
              ))}
              <tr><td>TOTAL TIME</td><td>{formatTime(chapters.reduce((sum, n) => sum + records[n].time, 0))}</td></tr>
              <tr><td>TIMES CAUGHT</td><td>{chapters.reduce((sum, n) => sum + records[n].seen, 0)}</td></tr>
              {overall && (
                <tr><td>JOURNEY</td><td><span className={`mini-rank rank-${overall}`}>{overall}</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="thanks">Thank you for playing The Vigil &amp; the Tankard.</p>
        <EndingButtons nextLabel="HOME TO THE TANKARD" next={home} stay={stayHere} stayLabel="WATCH THE SUNRISE" />
      </div>
    </div>
  );
}

function Ending() {
  const chapter = useStore((s) => s.chapter);
  if (chapter === 1) return <VigilEnding />;
  if (chapter === LAST_CHAPTER) return <FinalEnding />;
  return <ChapterEnding chapter={chapter} />;
}

// Keyboard and mouse bindings that aren't movement.
function useGlobalInput() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyE') pressTalk();
      if ((e.code === 'KeyF' || e.code === 'KeyQ') && store.get().playing) pressBang();
      if (e.code === 'KeyM') toggleMute();
      // Pointer lock releases on Esc by itself; the other modes pause here.
      if (e.code === 'Escape' && store.get().mode !== 'lock') store.set({ playing: false });
    };
    const onMouseDown = (e) => {
      if (e.button === 0 && store.get().playing && store.get().mode === 'lock') pressTalk();
    };
    // Look with the locked mouse or, where pointer lock is blocked (some frames), by dragging.
    const onMouseMove = (e) => {
      const { playing, mode } = store.get();
      if (!playing) return;
      const looking = (mode === 'lock' && document.pointerLockElement) || (mode === 'drag' && e.buttons & 1);
      // Chrome sometimes reports one huge jump just after locking; drop it.
      if (looking && Math.abs(e.movementX) < 250 && Math.abs(e.movementY) < 250) addLook(e.movementX, e.movementY);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);
}

// The title card doubles as the pause screen. Clicking it asks for pointer lock
// (PointerLockControls listens on #enter); if that's refused we fall back to
// drag-to-look, and touch screens go straight to touch controls.
function TitleScreen({ playing }) {
  const [started, setStarted] = useState(false);
  const [saved] = useState(hasProgress);
  const mode = useStore((s) => s.mode);
  const pausedAt = useRef(0);

  useEffect(() => {
    if (playing) setStarted(true);
    else pausedAt.current = performance.now();
  }, [playing]);

  useEffect(() => {
    const fallback = () => store.set({ playing: true, mode: 'drag' });
    document.addEventListener('pointerlockerror', fallback);
    return () => document.removeEventListener('pointerlockerror', fallback);
  }, []);

  const start = () => {
    // A tap on the pause button is followed by a click on this screen; ignore it.
    if (performance.now() - pausedAt.current < 500) return;
    startAudio();
    if (IS_TOUCH) {
      store.set({ playing: true, mode: 'touch' });
    } else if (mode === 'drag') {
      store.set({ playing: true });
    } else {
      // Some browsers refuse the lock without firing pointerlockerror.
      setTimeout(() => !store.get().playing && store.set({ playing: true, mode: 'drag' }), 600);
    }
  };

  const restart = (e) => {
    newGame();
    start();
    if (IS_TOUCH || mode === 'drag') e.stopPropagation();
  };

  const prompt = started ? 'PAUSED - CLICK TO RESUME' : saved ? 'CLICK TO CONTINUE' : 'CLICK TO BEGIN';
  const chapter = useStore((s) => s.chapter);
  const unlocked = useStore((s) => s.unlocked);
  // Pick a chapter you've reached; the click goes on to start the game.
  const pickChapter = (n) => () => {
    if (n !== store.get().chapter) travelTo(n);
  };
  return (
    <div id="enter" className={playing ? 'hidden' : ''} onClick={start}>
      <div className="panel">
        <h1>
          THE VIGIL
          <br />
          <small>&amp;</small>
          <br />
          THE TANKARD
        </h1>
        {(started || saved) && (
          <p className="chapter-line">
            CHAPTER {ROMAN[chapter]}: {CHAPTER_TITLES[chapter].toUpperCase()}
          </p>
        )}
        <p className="blink">{IS_TOUCH ? prompt.replace('CLICK', 'TAP') : prompt}</p>
        {unlocked > 1 && (
          <div className="chapters">
            {[1, 2, 3].map((n) =>
              n <= unlocked ? (
                <button key={n} type="button" className={n === chapter ? 'here' : ''} onClick={pickChapter(n)}>
                  <b>{ROMAN[n]}</b> {CHAPTER_TITLES[n].toUpperCase()}
                </button>
              ) : (
                <button key={n} type="button" disabled>
                  <b>{ROMAN[n]}</b> ???
                </button>
              ),
            )}
          </div>
        )}
        {started && <Journal />}
        {started && <MapView />}
        {saved && !started && (
          <button type="button" className="anew" onClick={restart}>
            BEGIN ANEW
          </button>
        )}
        {IS_TOUCH ? (
          <table>
            <tbody>
              <tr><td>LEFT THUMB</td><td>WALK</td></tr>
              <tr><td>DRAG RIGHT</td><td>LOOK</td></tr>
              <tr><td>TALK</td><td>WHEN SOMEONE IS CLOSE</td></tr>
              <tr><td>BANG</td><td>THROW A BANGER</td></tr>
              <tr><td>SNEAK</td><td>CROUCH, HARDER TO SPOT</td></tr>
              <tr><td>II</td><td>PAUSE AND MAP</td></tr>
            </tbody>
          </table>
        ) : (
          <table>
            <tbody>
              <tr><td>W A S D</td><td>WALK</td></tr>
              <tr><td>SHIFT</td><td>RUN</td></tr>
              <tr><td>MOUSE</td><td>{mode === 'drag' ? 'DRAG TO LOOK' : 'LOOK'}</td></tr>
              <tr><td>E / CLICK</td><td>TALK</td></tr>
              <tr><td>F</td><td>THROW BANGER</td></tr>
              <tr><td>C (HOLD)</td><td>SNEAK</td></tr>
              <tr><td>M</td><td>MUTE</td></tr>
              <tr><td>ESC</td><td>PAUSE AND MAP</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function Overlay() {
  const playing = useStore((s) => s.playing);
  const mode = useStore((s) => s.mode);
  const target = useStore((s) => s.target);
  const zone = useStore((s) => s.zone);
  const ending = useStore((s) => s.ending);
  const goal = useStore((s) => objective(s));
  const hint = useStore((s) => objectiveHint(s, BUTTON));
  const intro = useStore((s) => s.intro);
  const talking = useStore((s) => s.talking);
  const chapter = useStore((s) => s.chapter);
  useGlobalInput();

  // E / TALK on whatever you're facing opens a conversation (the open one handles its own presses).
  useEffect(() => {
    const open = () => {
      const s = store.get();
      if (s.talking || !s.target || s.intro || s.ending || !s.playing) return;
      if (performance.now() - live.talkClosedAt < 300) return;
      store.set({ talking: s.target });
    };
    talkButton.addEventListener('press', open);
    return () => talkButton.removeEventListener('press', open);
  }, []);

  return (
    <div className="hud">
      {playing && mode === 'touch' && <TouchControls />}
      <LiveHud />
      <div className={`crosshair${target ? ' hot' : ''}`} />
      {zone && (
        <div className="zone" key={zone}>
          {zone}
        </div>
      )}
      <div className="top-stack">
        <div className="objective" key={goal}>
          <span className="label">QUEST</span>
          {goal}
          <small className="hint">{hint}</small>
        </div>
        <Notice />
      </div>
      <ObjectiveBanner goal={goal} />
      {talking && !ending && !intro && <Dialogue key={talking.id ?? talking.name} target={talking} />}
      {target && !talking && !ending && !intro && playing && mode !== 'touch' && <Prompt target={target} />}
      {playing && intro && !ending && (chapter > 1 ? <ChapterCard chapter={chapter} /> : <GoalCard />)}
      {ending && <Ending />}
      <TitleScreen playing={playing} />
    </div>
  );
}
