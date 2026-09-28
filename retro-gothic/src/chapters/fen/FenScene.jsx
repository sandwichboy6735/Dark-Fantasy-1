import { useMemo } from 'react';
import { store } from '../../store.js';
import { NightSky } from '../NightSky.jsx';
import { Particles } from '../Particles.jsx';
import { Cart } from '../Cart.jsx';
import { rattlecart } from '../rattlecart.js';
import { FEN } from './quest.js';
import { FenWorld } from './FenWorld.jsx';
import { FenActors } from './FenActors.jsx';
import { fenColliders } from './layout.js';
import './rules.js';

export const FEN_FOG = '#16211d';

// Fireflies drifting over the water, and midges.
const FEN_AIR = [
  { color: '#d8ff6a', speed: 0.1, bob: 0.8, share: 1 },
  { color: '#3a4a3a', speed: -0.2, bob: 0.3, share: 2 },
];

const CART = { position: [-6, 0, 18], rotation: Math.PI / 2 };
fenColliders.box(-7.3, -1.2, 16.8, 19.2);

const skyLevels = () => ({ stars: store.get().fen.stage >= FEN.DONE ? 1 : 0.25 });

// Chapter II: the whole Drowned Fen.
export function FenScene() {
  const goblin = useMemo(() => rattlecart(2, [-3, 0, 15.5], 2.6), []);
  return (
    <>
      <fog attach="fog" args={[FEN_FOG, 14, 150]} />
      <ambientLight color="#40605a" intensity={0.7} />
      <directionalLight color="#b8d8c0" intensity={0.45} position={[40, 60, -200]} />
      <NightSky top="#03070a" horizon="#16241f" fog={FEN_FOG} moonDir={[0.25, 0.22, -1]} moonColor="#dfe8c8" moonSize={0.9988} levels={skyLevels} />
      <FenWorld />
      <FenActors />
      <Cart {...CART} goblin={goblin} />
      <Particles count={110} radius={18} height={8} size={0.07} kinds={FEN_AIR} wind={0.1} glow />
    </>
  );
}
