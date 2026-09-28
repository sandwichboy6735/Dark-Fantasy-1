import { useStore } from '../store.js';
import { BELLS, CATS, PAGES, STAGE, TORCHES, isLit, objectiveTarget } from '../game/quest.js';
import { FenMap } from '../chapters/fen/FenMap.jsx';
import { PeakMap } from '../chapters/peak/PeakMap.jsx';
import { usePausedPlayer } from './usePausedPlayer.js';

export function MapView() {
  const chapter = useStore((s) => s.chapter);
  if (chapter === 2) return <FenMap />;
  if (chapter === 3) return <PeakMap />;
  return <VigilMap />;
}

// The pause-screen map, drawn in world metres with north up: the court and tavern
// at the bottom, the causeway climbing to the castle at the top.
function VigilMap() {
  const state = useStore((s) => s);
  const player = usePausedPlayer();
  const goal = objectiveTarget(state, player.x, player.z);
  const open = state.stage >= STAGE.CASTLE;
  const yawDeg = (-(player.yaw ?? 0) * 180) / Math.PI;

  return (
    <div className="map">
      <svg viewBox="-19 -155 70 185" role="img" aria-label="Map of the court, tavern, causeway and castle">
        <rect x="-19" y="-155" width="70" height="185" className="map-void" />
        {/* The castle: keep and bailey, walled off until the gate opens. */}
        <rect x="-13" y="-152" width="26" height="22" className={open ? 'map-land' : 'map-closed'} />
        <rect x="-11" y="-130" width="22" height="12" className={open ? 'map-land' : 'map-closed'} />
        <rect x="-16" y="-116" width="32" height="20" className="map-land" />
        {state.stage < STAGE.DONE && <rect x="-3.7" y="-96" width="7.4" height="92" className="map-bridge" />}
        <rect x="-14" y="-4" width="28" height="26" className="map-land" />
        <rect x="14" y="-8" width="34" height="34" className="map-yard" />
        <rect x="40" y="-1" width="8" height="22" className="map-building" />
        <text x="0" y="-139" className="map-label">NAVE</text>
        <text x="0" y="-104" className="map-label">GATE</text>
        <text x="0" y="12" className="map-label">COURT</text>
        <text x="31" y="12" className="map-label">TAVERN</text>
        {state.stage < STAGE.DONE && TORCHES.map((t) => (
          <circle key={t.id} cx={t.x} cy={t.z} r="1.6" className={isLit(t, state.lit) ? 'map-torch' : 'map-torch-out'} />
        ))}
        {state.stage >= STAGE.BELLS &&
          BELLS.filter((b) => !state.bells.includes(b.id)).map((b) => <circle key={b.id} cx={b.x} cy={b.z} r="1.8" className="map-bell" />)}
        {PAGES.filter((p) => state.pages.includes(p.id)).map((p) => (
          <rect key={p.id} x={p.x - 1.2} y={p.z - 1.5} width="2.4" height="3" className="map-page" />
        ))}
        {CATS.filter((c) => state.cats.includes(c.id)).map((c) => (
          <circle key={c.id} cx={c.x} cy={c.z} r="1.4" className="map-cat" />
        ))}
        {goal && <circle cx={goal.x} cy={goal.z} r="4" className="map-goal" />}
        <g transform={`translate(${player.x} ${player.z}) rotate(${yawDeg})`}>
          <polygon points="0,-4 3,3 -3,3" className="map-player" />
        </g>
      </svg>
      <ul className="map-key">
        <li><span className="dot you" /> YOU</li>
        <li><span className="dot goal" /> GOAL</li>
        <li><span className="dot bell" /> BELL</li>
        <li><span className="dot torch" /> TORCH</li>
        <li><span className="dot cat" /> CATS {state.cats.length}/{CATS.length}</li>
        <li><span className="dot page" /> PAGES {state.pages.length}/{PAGES.length}</li>
      </ul>
    </div>
  );
}
