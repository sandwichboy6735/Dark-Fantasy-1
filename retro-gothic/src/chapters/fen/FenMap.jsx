import { useStore } from '../../store.js';
import { objectiveTarget } from '../../game/quest.js';
import { usePausedPlayer } from '../../ui/usePausedPlayer.js';
import { BOARDWALKS, CHAPEL, ISLANDS, TOWER } from './layout.js';
import { LANTERNS, STARS, TOADS, lanternLit } from './quest.js';

// The pause-screen map of the fen: islands, boardwalks (with their gaps), the
// witch-lights, the stars still out there and the toads you've kissed.
export function FenMap() {
  const state = useStore((s) => s);
  const player = usePausedPlayer();
  const f = state.fen;
  const goal = objectiveTarget(state, player.x, player.z);
  const yawDeg = (-(player.yaw ?? 0) * 180) / Math.PI;
  return (
    <div className="map">
      <svg viewBox="-42 -102 84 134" role="img" aria-label="Map of the Drowned Fen">
        <rect x="-42" y="-102" width="84" height="134" className="map-water" />
        {ISLANDS.map((i) => (
          <circle key={i.id} cx={i.x} cy={i.z} r={i.r} className="map-land" />
        ))}
        {BOARDWALKS.map((w, n) => {
          const [ax, az] = w.a;
          const [bx, bz] = w.b;
          const at = (t) => [ax + (bx - ax) * t, az + (bz - az) * t];
          const cuts = [0, ...(w.gaps ?? []).flat(), 1];
          const parts = [];
          for (let i = 0; i < cuts.length; i += 2) parts.push([at(cuts[i]), at(cuts[i + 1])]);
          return parts.map(([p, q], i) => <line key={`${n}-${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className="map-boardwalk" />);
        })}
        <rect x={CHAPEL.minX} y={CHAPEL.minZ} width={CHAPEL.maxX - CHAPEL.minX} height={CHAPEL.maxZ - CHAPEL.minZ} className="map-building" />
        <circle cx={TOWER.x} cy={TOWER.z} r={TOWER.core} className="map-building" />
        <text x="0" y="16" className="map-label">LANDING</text>
        <text x="0" y="-66" className="map-label">CHAPEL</text>
        {LANTERNS.map((l) => (
          <circle key={l.id} cx={l.x} cy={l.z} r="1.6" className={lanternLit(l, f.lit) ? 'map-witchlight' : 'map-torch-out'} />
        ))}
        {f.stage < 2 && STARS.filter((s) => !f.stars.includes(s.id)).map((s) => <circle key={s.id} cx={s.x} cy={s.z} r="1.8" className="map-bell" />)}
        {TOADS.filter((t) => f.toads.includes(t.id)).map((t) => (
          <circle key={t.id} cx={t.x} cy={t.z} r="1.4" className="map-toad" />
        ))}
        {goal && <circle cx={goal.x} cy={goal.z} r="4" className="map-goal" />}
        <g transform={`translate(${player.x} ${player.z}) rotate(${yawDeg})`}>
          <polygon points="0,-4 3,3 -3,3" className="map-player" />
        </g>
      </svg>
      <ul className="map-key">
        <li><span className="dot you" /> YOU</li>
        <li><span className="dot goal" /> GOAL</li>
        <li><span className="dot bell" /> STAR</li>
        <li><span className="dot witchlight" /> WITCH-LIGHT</li>
        <li><span className="dot toad" /> TOADS {f.toads.length}/{TOADS.length}</li>
      </ul>
    </div>
  );
}
