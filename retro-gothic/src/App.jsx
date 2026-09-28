import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { RetroPipeline } from './retro/RetroPipeline.jsx';
import { FOG_COLOR, Sky } from './world/Sky.jsx';
import { Terrain } from './world/Terrain.jsx';
import { Bridge } from './world/Bridge.jsx';
import { Castle } from './world/Castle.jsx';
import { Guards } from './world/Guards.jsx';
import { Tavern } from './world/Tavern.jsx';
import { Goblins } from './world/Goblin.jsx';
import { Bells, HeldTankard, VigilStone } from './world/Quest.jsx';
import { Gaze } from './world/Gaze.jsx';
import { Watchers } from './world/Watchers.jsx';
import { Bangers } from './world/Bangers.jsx';
import { Cats } from './world/Cats.jsx';
import { Embers } from './world/Embers.jsx';
import { Pages } from './world/Pages.jsx';
import { Debris } from './world/Debris.jsx';
import { Fireworks } from './world/Fireworks.jsx';
import { QuestMarker } from './world/QuestMarker.jsx';
import { Player } from './player/Player.jsx';
import { Overlay } from './ui/Overlay.jsx';
import { useStore } from './store.js';
import { STAGE, morning } from './game/quest.js';
import { NightSky } from './chapters/NightSky.jsx';
import { collidersOf } from './world/layout.js';
import { Cart } from './chapters/Cart.jsx';
import { rattlecart } from './chapters/rattlecart.js';
import { FenScene } from './chapters/fen/FenScene.jsx';
import { PeakScene } from './chapters/peak/PeakScene.jsx';

const KEYS = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA'] },
  { name: 'right', keys: ['KeyD'] },
  { name: 'turnLeft', keys: ['ArrowLeft'] },
  { name: 'turnRight', keys: ['ArrowRight'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'sneak', keys: ['KeyC', 'ControlLeft'] },
];

// Rattlecart's cart waits in the court once the Eye is closed, to take you on to
// the Drowned Fen.
const VIGIL_RATTLECART = rattlecart(1, [-6, 0, 17.2], -2.4);
function VigilCart() {
  const here = useStore((s) => s.stage >= STAGE.DONE && s.unlocked >= 2);
  useEffect(() => {
    if (!here) return undefined;
    const court = collidersOf(1);
    const box = court.box(-11.4, -5.1, 18.4, 20.6);
    return () => court.remove(box);
  }, [here]);
  return here ? <Cart position={[-10, 0, 19.5]} rotation={Math.PI / 2} goblin={VIGIL_RATTLECART} /> : null;
}

// After the Frostspire, the sun is up over the Tankard too.
const MORNING_FOG = '#c09888';
const morningSky = () => ({ stars: 0, dawn: 1 });
function VigilSky() {
  const sunUp = useStore(morning);
  if (sunUp) {
    return (
      <>
        <fog attach="fog" args={[MORNING_FOG, 40, 320]} />
        <ambientLight color="#ffe0c8" intensity={1.9} />
        <directionalLight color="#ffc080" intensity={2.8} position={[240, 90, -180]} />
        <NightSky top="#10183a" horizon="#8a6a70" fog={MORNING_FOG} sunDir={[0.8, 0.28, -0.6]} levels={morningSky} />
      </>
    );
  }
  return (
    <>
      <fog attach="fog" args={[FOG_COLOR, 40, 260]} />
      {/* A soft violet fill so nothing sinks to black; the torches and lanterns do the rest. */}
      <ambientLight color="#5a5290" intensity={1.7} />
      <Sky />
    </>
  );
}

// Chapter I: the court, the causeway, the castle and the Grinning Tankard.
function VigilScene() {
  return (
    <>
      <VigilSky />
      <Terrain />
      <Bridge />
      <Castle />
      <Guards />
      <Tavern />
      <Goblins />
      <Bells />
      <VigilStone />
      <Gaze />
      <Watchers />
      <Cats />
      <Pages />
      <Debris />
      <Fireworks />
      <Embers />
      <HeldTankard />
      <VigilCart />
    </>
  );
}

// Only the current chapter's world is mounted; the others are built again when you travel.
function World() {
  const chapter = useStore((s) => s.chapter);
  if (chapter === 2) return <FenScene />;
  if (chapter === 3) return <PeakScene />;
  return <VigilScene />;
}

export default function App() {
  return (
    <KeyboardControls map={KEYS}>
      <Overlay />
      <Canvas
        dpr={1}
        flat
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        camera={{ fov: 70, near: 0.1, far: 1200 }}
      >
        <color attach="background" args={['#05040a']} />
        <World />
        <QuestMarker />
        <Player />
        <Bangers />
        <RetroPipeline />
      </Canvas>
    </KeyboardControls>
  );
}
