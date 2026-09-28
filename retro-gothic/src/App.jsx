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
import { Player } from './player/Player.jsx';
import { Overlay } from './ui/Overlay.jsx';

const KEYS = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
];

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
        <fog attach="fog" args={[FOG_COLOR, 30, 230]} />
        {/* Barely any fill: the torches and lanterns do the lighting. */}
        <ambientLight color="#4a4270" intensity={0.5} />

        <Sky />
        <Terrain />
        <Bridge />
        <Castle />
        <Guards />
        <Tavern />
        <Goblins />
        <Bells />
        <VigilStone />
        <Player />
        <HeldTankard />
        <RetroPipeline />
      </Canvas>
    </KeyboardControls>
  );
}
