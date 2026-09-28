import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { store } from '../../store.js';
import { live } from '../../game/live.js';
import { NightSky } from '../NightSky.jsx';
import { Particles } from '../Particles.jsx';
import { Cart } from '../Cart.jsx';
import { rattlecart } from '../rattlecart.js';
import { PEAK } from './quest.js';
import { PeakWorld } from './PeakWorld.jsx';
import { HeldLantern, PeakActors } from './PeakActors.jsx';
import { peakColliders } from './layout.js';
import './rules.js';

const NIGHT_FOG = new THREE.Color('#1a2232');
const DAWN_FOG = new THREE.Color('#b08a88');
const NIGHT_AMBIENT = new THREE.Color('#6a7aa8');
const MOON_DIR = [-0.5, 0.4, -1];
const MOONLIGHT_FROM = [-0.3, 1, -0.4]; // higher than the moon looks, so the snow catches it
const DAWN_AMBIENT = new THREE.Color('#ffd0b0');
const SUN_DIR = [0.8, 0.08, -0.6];

// Snow, whipped sideways when the wind gusts.
const SNOW = [
  { color: '#e8f0ff', speed: -1.3, bob: 0.6, share: 3 },
  { color: '#a8b8d8', speed: -0.9, bob: 0.4, share: 1 },
];

const CART = { position: [7.5, 0, 15.5], rotation: -Math.PI / 2 };
peakColliders.box(3.4, 8.8, 14.3, 16.7);

const skyLevels = () => ({ stars: 1, aurora: store.get().peak.stage >= PEAK.DONE ? 0 : 1, dawn: live.dawn ?? 0 });

// Night into morning: the fog, the fill light and the sun follow live.dawn.
function Daylight() {
  const scene = useThree((s) => s.scene);
  const ambient = useRef();
  const sun = useRef();
  const moon = useRef();
  const colour = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const d = live.dawn ?? 0;
    if (scene.fog) {
      scene.fog.color.copy(colour.copy(NIGHT_FOG).lerp(DAWN_FOG, d));
      scene.fog.far = 150 + d * 150;
    }
    if (scene.background?.isColor) scene.background.copy(scene.fog.color);
    ambient.current.color.copy(colour.copy(NIGHT_AMBIENT).lerp(DAWN_AMBIENT, d));
    ambient.current.intensity = 1.9 + d * 0.9;
    moon.current.intensity = 2.2 * (1 - d);
    sun.current.intensity = d * 3.6;
  });
  return (
    <>
      <ambientLight ref={ambient} color={NIGHT_AMBIENT} intensity={1.9} />
      {/* Moonlight off the snow at night; the low morning sun at the end. */}
      <directionalLight ref={moon} color="#a8b8e8" intensity={2.2} position={MOONLIGHT_FROM.map((v) => v * 300)} />
      <directionalLight ref={sun} color="#ffb070" intensity={0} position={SUN_DIR.map((v) => v * 300)} />
    </>
  );
}

// Chapter III: the whole Frostspire.
export function PeakScene() {
  const goblin = useMemo(() => rattlecart(3, [5.2, 0, 12], -2.6), []);
  return (
    <>
      <fog attach="fog" args={[NIGHT_FOG.clone(), 18, 150]} />
      <Daylight />
      <NightSky top="#02040c" horizon="#18203a" fog={NIGHT_FOG} moonDir={MOON_DIR} moonColor="#e8eeff" moonSize={0.9992} sunDir={SUN_DIR} levels={skyLevels} />
      <PeakWorld />
      <PeakActors />
      <Cart {...CART} goblin={goblin} />
      <HeldLantern />
      <Particles count={160} radius={16} height={12} size={0.07} kinds={SNOW} wind={0.8} />
    </>
  );
}
