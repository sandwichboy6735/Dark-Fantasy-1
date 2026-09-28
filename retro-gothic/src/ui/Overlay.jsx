import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.js';

const TYPE_SPEED_MS = 28;

// Retro text box: the speaker's name on a tab, text typed out a letter at a
// time. E or a click finishes the line, then moves to the next one.
function Dialogue({ target }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const text = target.lines[index % target.lines.length];
  const state = useRef({});
  state.current = { shown, length: text.length };

  useEffect(() => {
    setShown(0);
    const timer = setInterval(() => setShown((n) => Math.min(n + 1, text.length)), TYPE_SPEED_MS);
    return () => clearInterval(timer);
  }, [text]);

  useEffect(() => {
    const advance = () => {
      const { shown: s, length } = state.current;
      if (s < length) setShown(length);
      else setIndex((i) => i + 1);
    };
    const onKey = (e) => e.code === 'KeyE' && !e.repeat && advance();
    const onClick = (e) => document.pointerLockElement && e.button === 0 && advance();
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, []);

  const done = shown >= text.length;
  return (
    <div className="dialogue" style={{ '--accent': target.accent ?? '#f0c060' }}>
      <div className="speaker">{target.name}</div>
      <p>{text.slice(0, shown)}</p>
      {done && (
        <div className="more">
          {(index % target.lines.length) + 1}/{target.lines.length} <span className="arrow" /> E
        </div>
      )}
    </div>
  );
}

export function Overlay() {
  const locked = useStore((s) => s.locked);
  const target = useStore((s) => s.target);
  const zone = useStore((s) => s.zone);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (locked) setStarted(true);
  }, [locked]);

  return (
    <div className="hud">
      <div className={`crosshair${target ? ' hot' : ''}`} />
      {zone && (
        <div className="zone" key={zone}>
          {zone}
        </div>
      )}
      {target && <Dialogue key={target.id} target={target} />}

      {/* Always mounted: PointerLockControls binds its click handler to #enter once. */}
      <div id="enter" className={locked ? 'hidden' : ''}>
        <div className="panel">
          <h1>
            THE VIGIL
            <br />
            <small>&amp;</small>
            <br />
            THE TANKARD
          </h1>
          <p className="blink">{started ? 'PAUSED - CLICK TO RESUME' : 'CLICK TO ENTER'}</p>
          <table>
            <tbody>
              <tr><td>W A S D</td><td>WALK</td></tr>
              <tr><td>SHIFT</td><td>RUN</td></tr>
              <tr><td>MOUSE</td><td>LOOK</td></tr>
              <tr><td>E / CLICK</td><td>TALK</td></tr>
              <tr><td>ESC</td><td>RELEASE MOUSE</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
