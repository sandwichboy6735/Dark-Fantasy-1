import { RETRO } from './config.js';

// Shared by every patched material, so one update after a resize reaches them all.
export const jitterUniforms = {
  // View-space size of one internal pixel at a depth of 1 unit.
  uJitterStep: { value: 0.01 },
};

// One internal pixel covers (2 * tan(fov / 2) / lines) view units per unit of depth.
export function updateJitter(camera, internalHeight) {
  const halfFov = (camera.fov * Math.PI) / 360;
  jitterUniforms.uJitterStep.value = ((2 * Math.tan(halfFov)) / internalHeight) * RETRO.jitterStrength;
}

const SNAP_GLSL = /* glsl */ `
#include <project_vertex>
if (uJitterStep > 0.0) {
  // The PlayStation had no sub-pixel precision: vertices landed on whole pixels.
  // Round the view-space position to a grid whose cell grows with camera
  // distance, so the snap is always one low-res pixel on screen.
  float camDist = max(-mvPosition.z, 1e-3);
  float cell = uJitterStep * camDist;
  vec4 snapped = mvPosition;
  snapped.xy = floor(snapped.xy / cell + 0.5) * cell;
  gl_Position = projectionMatrix * snapped;
}
`;

// Patches any built-in material (Lambert, Phong, Basic, Normal...) in place.
export function applyVertexJitter(material) {
  if (material.userData.psxJitter) return material;
  material.userData.psxJitter = true;

  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uJitterStep = jitterUniforms.uJitterStep;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uJitterStep;')
      .replace('#include <project_vertex>', SNAP_GLSL);
  };
  const previousKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${previousKey()}|psx-jitter`;
  return material;
}
