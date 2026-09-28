import { useStore } from '../../store.js';
import { objectiveTarget } from '../../game/quest.js';
import { usePausedPlayer } from '../../ui/usePausedPlayer.js';
import { ALCOVES, BASE_CAMP, COURTYARD, LEDGES, PATHS, halfWidth } from './layout.js';
import { BEACON, BRAZIERS, CAMPFIRES, CLIMBERS, fireLit } from './quest.js';

// The pause-screen map of the mountain, seen from above: the path zigzagging up
// from the camp to the monastery and the summit.
export function PeakMap() {
  const state = useStore((s) => s);
  const player = usePausedPlayer();
  const p = state.peak;
  const goal = objectiveTarget(state, player.x, player.z);
  const yawDeg = (-(player.yaw ?? 0) * 180) / Math.PI;
  const rect = (r, cls, key) => <rect key={key} x={r.minX} y={r.minZ} width={r.maxX - r.minX} height={r.maxZ - r.minZ} className={cls} />;
  return (
    <div className="map">
      <svg viewBox="-30 -142 72 164" role="img" aria-label="Map of the Frostspire">
        <rect x="-30" y="-142" width="72" height="164" className="map-void" />
        {rect(BASE_CAMP, 'map-snow', 'camp')}
        {rect(COURTYARD, 'map-snow', 'court')}
        {LEDGES.map((l) => (
          <circle key={l.id} cx={l.x} cy={l.z} r={l.r} className="map-snow" />
        ))}
        {PATHS.map((path) => (
          <line
            key={path.id}
            x1={path.a[0]}
            y1={path.a[1]}
            x2={path.b[0]}
            y2={path.b[1]}
            strokeWidth={halfWidth(path, 0) * 2}
            className={path.gated && p.stage < 3 ? 'map-path-closed' : 'map-path'}
          />
        ))}
        {ALCOVES.map((a, i) => rect(a, 'map-snow', `a${i}`))}
        <text x="0" y="12" className="map-label">CAMP</text>
        <text x="-12" y="-99" className="map-label">MONASTERY</text>
        <text x="-12" y="-138" className="map-label">SUMMIT</text>
        {CAMPFIRES.map((f) => (
          <circle key={f.id} cx={f.x} cy={f.z} r="1.8" className={fireLit(f, p.lit) ? 'map-torch' : 'map-torch-out'} />
        ))}
        {BRAZIERS.map((b) => (
          <rect key={b.id} x={b.x - 1.4} y={b.z - 1.4} width="2.8" height="2.8" className={p.braziers.includes(b.id) ? 'map-bell' : 'map-torch-out'} />
        ))}
        <circle cx={BEACON.x} cy={BEACON.z} r="2.2" className={p.stage >= 4 ? 'map-bell' : 'map-torch-out'} />
        {CLIMBERS.filter((c) => p.goblins.includes(c.id)).map((c) => (
          <circle key={c.id} cx={c.x} cy={c.z} r="1.4" className="map-toad" />
        ))}
        {goal && <circle cx={goal.x} cy={goal.z} r="4" className="map-goal" />}
        <g transform={`translate(${player.x} ${player.z}) rotate(${yawDeg})`}>
          <polygon points="0,-4 3,3 -3,3" className="map-player" />
        </g>
      </svg>
      <ul className="map-key">
        <li><span className="dot you" /> YOU</li>
        <li><span className="dot goal" /> GOAL</li>
        <li><span className="dot torch" /> CAMPFIRE</li>
        <li><span className="dot bell" /> BRAZIER</li>
        <li><span className="dot toad" /> CLIMBERS {p.goblins.length}/{CLIMBERS.length}</li>
      </ul>
    </div>
  );
}
