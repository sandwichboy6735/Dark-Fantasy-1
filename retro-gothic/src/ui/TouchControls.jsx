import { useRef, useState } from 'react';
import { pressBang, pressTalk, store, useStore } from '../store.js';
import { bangAvailable } from '../game/quest.js';
import { verbFor } from './verbs.js';
import { addLook, input } from '../player/input.js';

const STICK_RADIUS = 56;
const TOUCH_LOOK = 3.4; // turn per pixel dragged, relative to a mouse
let lookedOnce = false; // hide the "drag here to look" label once you have

// Phones and tablets: a floating stick on the left of the screen, drag anywhere
// else to look, a TALK button when someone is under the crosshair.
export function TouchControls() {
  const target = useStore((s) => s.target);
  const talking = useStore((s) => s.talking);
  const bangers = useStore((s) => s.bangers);
  const verb = useStore((s) => (target ? verbFor(target, s) : ''));
  const showBang = useStore(bangAvailable);
  const stickPointer = useRef(null);
  const lookPointers = useRef(new Map());
  const [stick, setStick] = useState(null); // { x, y, dx, dy } in screen pixels
  const [sneak, setSneak] = useState(input.sneak);
  const [looked, setLooked] = useState(lookedOnce);

  const onDown = (e) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Not a capturable pointer; moves still arrive while it stays on the layer.
    }
    if (stickPointer.current === null && e.clientX < window.innerWidth * 0.45) {
      stickPointer.current = e.pointerId;
      setStick({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
    } else {
      lookPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
  };

  const onMove = (e) => {
    if (e.pointerId === stickPointer.current) {
      setStick((s) => {
        let dx = e.clientX - s.x;
        let dy = e.clientY - s.y;
        const len = Math.hypot(dx, dy);
        if (len > STICK_RADIUS) {
          dx *= STICK_RADIUS / len;
          dy *= STICK_RADIUS / len;
        }
        input.moveX = dx / STICK_RADIUS;
        input.moveY = dy / STICK_RADIUS;
        return { ...s, dx, dy };
      });
      return;
    }
    const last = lookPointers.current.get(e.pointerId);
    if (!last) return;
    addLook((e.clientX - last.x) * TOUCH_LOOK, (e.clientY - last.y) * TOUCH_LOOK);
    if (!lookedOnce && Math.abs(e.clientX - last.x) > 2) {
      lookedOnce = true;
      setLooked(true);
    }
    lookPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onUp = (e) => {
    if (e.pointerId === stickPointer.current) {
      stickPointer.current = null;
      input.moveX = 0;
      input.moveY = 0;
      setStick(null);
    }
    lookPointers.current.delete(e.pointerId);
  };

  const tap = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <>
      <div className="touch-layer" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      {stick && (
        <div className="stick" style={{ left: stick.x, top: stick.y }}>
          <div className="knob" style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
        </div>
      )}
      {!stick && <div className="stick-hint">MOVE</div>}
      {!looked && <div className="look-hint">DRAG HERE TO LOOK</div>}
      {(target || talking) && (
        <button type="button" className={`touch-button talk${talking ? '' : ' ready'}`} onPointerDown={tap(pressTalk)}>
          {talking ? (
            'NEXT'
          ) : (
            <>
              {verb.split(' ')[0]}
              <small>{target.name.split(',')[0]}</small>
            </>
          )}
        </button>
      )}
      {showBang && (
        <button type="button" className="touch-button bang" onPointerDown={tap(pressBang)}>
          BANG x{bangers}
        </button>
      )}
      <button
        type="button"
        className={`touch-button sneak${sneak ? ' on' : ''}`}
        onPointerDown={tap(() => {
          input.sneak = !input.sneak;
          setSneak(input.sneak);
        })}
      >
        SNEAK
      </button>
      <button type="button" className="touch-button pause" onPointerDown={tap(() => store.set({ playing: false }))}>
        II
      </button>
    </>
  );
}
