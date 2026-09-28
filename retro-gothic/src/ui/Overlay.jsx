import { useEffect, useRef, useState } from 'react';
import { pressBang, pressTalk, store, talkButton, useStore } from '../store.js';
import { CATS, DIFFICULTY, PAGES, TORCHES, advanceQuest, hasProgress, linesFor, loadGame, newGame, objective, saveGame, scoreRun, STAGE } from '../game/quest.js';
import { MapView } from './MapView.jsx';
import { live } from '../game/live.js';
import { sfx, startAudio, toggleMute } from '../game/audio.js';
import { IS_TOUCH, addLook } from '../player/input.js';
import { TouchControls } from './TouchControls.jsx';

const TYPE_SPEED_MS = 28;

loadGame();

// Retro text box: the speaker's name on a tab, text typed out a letter at a
// time. Talk (E, click, TALK) finishes the line, then moves to the next one.
// What they say is fixed when the conversation opens; opening it may move the story on.
function Dialogue({ target }) {
  const [lines] = useState(() => linesFor(target));
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const text = lines[index % lines.length];
  const state = useRef({});
  state.current = { shown, length: text.length };

  useEffect(() => advanceQuest(target.id), [target.id]);

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
      const { shown: s, length } = state.current;
      if (s < length) setShown(length);
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
          {(index % lines.length) + 1}/{lines.length} <span className="arrow" /> {IS_TOUCH ? 'TALK' : 'E'}
        </div>
      )}
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
          <li>Talk to <b>Grubnik</b>, the goblin behind the tavern bar.</li>
          <li>Follow the <b className="gold">gold arrow</b> at the top of the screen.</li>
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
  const showFoam = stage === STAGE.TOAST && !spilled;

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
      const escaping = Boolean(live.escape) && store.get().stage === STAGE.ESCAPE;
      if (r.vignette) {
        r.vignette.style.opacity = String(live.hunted > 0 || escaping ? 0.8 : Math.min(1, live.dread * 1.2));
        r.vignette.classList.toggle('hunted', live.hunted > 0 || escaping);
      }
      if (r.sneak) r.sneak.style.visibility = live.sneaking ? 'visible' : 'hidden';
      if (r.fade) r.fade.style.opacity = String(live.fade);
      if (r.status) {
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

// Bottom right: bangers left, and cats petted once you've found one.
function Pockets() {
  const bangers = useStore((s) => s.bangers);
  const stage = useStore((s) => s.stage);
  const cats = useStore((s) => s.cats.length);
  const pages = useStore((s) => s.pages.length);
  const mode = useStore((s) => s.mode);
  return (
    <div className="pockets">
      {stage >= STAGE.BELLS && (
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
    </div>
  );
}

function Ending() {
  const [result] = useState(() => scoreRun(store.get(), live.playTime));
  useEffect(() => {
    const close = () => store.set({ ending: false });
    // Ignore the press that raised the Toast; let the card sit for a moment.
    const timer = setTimeout(() => talkButton.addEventListener('press', close), 1500);
    return () => {
      clearTimeout(timer);
      talkButton.removeEventListener('press', close);
    };
  }, []);
  return (
    <div className="ending">
      <div className="panel">
        <h2>THE EYE CLOSES</h2>
        <p>The Great Bell rang, the Eye slept, and the causeway fell into the abyss a heartbeat behind you. The stars are back. The goblins will sing about you until at least Tuesday.</p>
        <div className="rank">
          <span className={`letter rank-${result.rank}`}>{result.rank}</span>
          <span className="rank-title">
            {result.title}
            <br />
            <small>{(DIFFICULTY[store.get().difficulty] ?? DIFFICULTY.normal).label.toUpperCase()} DIFFICULTY</small>
          </span>
        </div>
        <table className="stats">
          <tbody>
            <tr><td>TIME</td><td>{formatTime(live.playTime)}</td></tr>
            <tr><td>TIMES CAUGHT</td><td>{store.get().seen}</td></tr>
            <tr><td>TORCHES RELIT</td><td>{store.get().lit.length} / {TORCHES.filter((t) => !t.startsLit).length}</td></tr>
            <tr><td>ESCAPE</td><td>{formatTime(live.escapeTime)}</td></tr>
            <tr><td>CATS PETTED</td><td>{store.get().cats.length} / {CATS.length}</td></tr>
            <tr><td>DIARY PAGES</td><td>{store.get().pages.length} / {PAGES.length}</td></tr>
            <tr><td>SCORE</td><td>{result.score}</td></tr>
          </tbody>
        </table>
        <p className="thanks">Thank you for playing. Wander as long as you like.</p>
        <p className="blink">{IS_TOUCH ? 'TAP TALK' : 'PRESS E'} TO CONTINUE</p>
      </div>
    </div>
  );
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
        <p className="blink">{IS_TOUCH ? prompt.replace('CLICK', 'TAP') : prompt}</p>
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
  const intro = useStore((s) => s.intro);
  useGlobalInput();

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
      <div className="objective" key={goal}>
        <span className="label">QUEST</span>
        {goal}
      </div>
      <Notice />
      {target && !ending && !intro && <Dialogue key={target.id} target={target} />}
      {playing && intro && !ending && <GoalCard />}
      {ending && <Ending />}
      <TitleScreen playing={playing} />
    </div>
  );
}
