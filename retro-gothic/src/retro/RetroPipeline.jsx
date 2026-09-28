import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RETRO, fovFor, pixelSizeFor } from './config.js';
import { DitherShader } from './DitherShader.js';
import { applyVertexJitter, updateJitter } from './vertexJitter.js';

// Takes over rendering from R3F:
//   RenderPixelatedPass  scene -> ~320x240 target (nearest filtered), upscaled to the window
//   Bayer dither pass    sRGB conversion + 8x8 ordered dither down to RETRO.colorBits
export function RetroPipeline() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const { composer, pixelPass, ditherPass } = useMemo(() => {
    const composer = new EffectComposer(gl);
    const pixelPass = new RenderPixelatedPass(1, scene, camera, {
      normalEdgeStrength: RETRO.normalEdgeStrength,
      depthEdgeStrength: RETRO.depthEdgeStrength,
    });
    // The pass draws a normal buffer with its own MeshNormalMaterial; jitter it too,
    // or its outlines would trail behind the wobbling geometry.
    if (pixelPass._normalMaterial) applyVertexJitter(pixelPass._normalMaterial);

    const ditherPass = new ShaderPass(DitherShader);
    const [r, g, b] = RETRO.colorBits;
    ditherPass.uniforms.uLevels.value.set(2 ** r - 1, 2 ** g - 1, 2 ** b - 1);
    ditherPass.uniforms.uStrength.value = RETRO.ditherStrength;
    ditherPass.uniforms.uExposure.value = RETRO.exposure;

    composer.addPass(pixelPass);
    composer.addPass(ditherPass);
    return { composer, pixelPass, ditherPass };
  }, [gl, scene, camera]);

  useEffect(
    () => () => {
      pixelPass.dispose();
      ditherPass.dispose();
      composer.dispose();
    },
    [composer, pixelPass, ditherPass],
  );

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const bufferWidth = Math.floor(size.width * dpr);
    const bufferHeight = Math.floor(size.height * dpr);
    pixelPass.pixelSize = pixelSizeFor(bufferWidth, bufferHeight);
    camera.fov = fovFor(size.width / size.height);
    camera.updateProjectionMatrix();
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);

    const lowW = (bufferWidth / pixelPass.pixelSize) | 0;
    const lowH = (bufferHeight / pixelPass.pixelSize) | 0;
    ditherPass.uniforms.uLowRes.value.set(lowW, lowH);
    updateJitter(camera, lowH);
  }, [gl, camera, size, composer, pixelPass, ditherPass]);

  // A positive priority tells R3F we render the frame ourselves.
  useFrame((_, delta) => composer.render(delta), 1);

  return null;
}
