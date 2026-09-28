import { useRef, useState } from 'react';
import { pressBang, pressTalk, store, useStore } from '../store.js';
import { STAGE } from '../game/quest.js';
import { addLook, input } from '../player/input.js';

const STICK_RADIUS = 56;

// Phones and tablets: a floating stick on the left of the screen, drag anywhere
// else to look, a TALK button when someone is under the crosshair.
export function TouchControls() {
  const target = useStore((s) => s.target);
  const stage = useStore((s) => s.stage);
  const stickPointer = useRef(null);
  const lookPointers = useRef(new Map());
  const [stick, setStick] = useState(null); // { x, y, dx, dy } in screen pixels
  const [sneak, setSneak] = useState(input.sneak);

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
    addLook((e.clientX - last.x) * 2.2, (e.clientY - last.y) * 2.2);
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
      {target && (
        <button type="button" className="touch-button talk" onPointerDown={tap(pressTalk)}>
          TALK
        </button>
      )}
      {stage >= STAGE.BELLS && (
        <button type="button" className="touch-button bang" onPointerDown={tap(pressBang)}>
          BANG
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
