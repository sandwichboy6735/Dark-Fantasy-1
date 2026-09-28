// Volumetric-looking air: height fog that pools in valleys, drifting ground mist marched through
// the depth buffer, a glow around the moon and god-ray shafts spilling past trees and towers.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const NOISE = /* glsl */`
  float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
  float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm3(vec3 p){ return n3(p) * 0.55 + n3(p * 2.1 + 3.1) * 0.3 + n3(p * 4.3 + 7.7) * 0.15; }
`;

export class AtmospherePass extends Pass {
  constructor(camera, quality) {
    super();
    this.camera = camera;
    this.uniforms = {
      tDiffuse: { value: null }, tDepth: { value: null },
      uProjInv: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() },
      uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Vector3(0, 1, 0) }, uLightScreen: { value: new THREE.Vector2() },
      uFog: { value: new THREE.Color(0.05, 0.06, 0.15) }, uGlow: { value: new THREE.Color(0.4, 0.5, 1.0) },
      uDensity: { value: 0.0016 }, uBase: { value: 20 }, uFalloff: { value: 0.018 }, uMist: { value: 1 },
      uTime: { value: 0 }, uShafts: { value: quality === 'fast' ? 0 : 1 }, uLightOn: { value: 1 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: NOISE + /* glsl */`
        uniform sampler2D tDiffuse, tDepth; uniform mat4 uProjInv, uViewInv;
        uniform vec3 uCam, uLight, uFog, uGlow; uniform vec2 uLightScreen;
        uniform float uDensity, uBase, uFalloff, uMist, uTime, uShafts, uLightOn;
        varying vec2 vUv;
        vec3 worldAt(vec2 uv, float d) {
          vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); v /= v.w;
          return (uViewInv * v).xyz;
        }
        void main() {
          vec3 col = texture2D(tDiffuse, vUv).rgb;
          float d = texture2D(tDepth, vUv).x;
          bool sky = d >= 0.99999;
          vec3 wp = worldAt(vUv, sky ? 0.9999 : d);
          vec3 ray = wp - uCam; float dist = length(ray); vec3 dir = ray / dist;
          if (sky) dist = 2600.0;
          // analytic exponential height fog
          float a = uDensity * exp(-uFalloff * (uCam.y - uBase));
          float ry = dir.y * dist * uFalloff;
          float fog = a * dist * (abs(ry) > 1e-4 ? (1.0 - exp(-ry)) / ry : 1.0);
          // drifting ground mist: a few noisy samples along the first 160 m of the ray
          float mist = 0.0;
          if (uMist > 0.0) {
            float md = min(dist, 160.0);
            for (int i = 0; i < 6; i++) {
              float t = (float(i) + 0.5) / 6.0 * md;
              vec3 p = uCam + dir * t;
              float hNorm = clamp((p.y - uBase + 6.0) / 14.0, 0.0, 1.0);
              float n = fbm3(p * 0.045 + vec3(uTime * 0.02, 0.0, uTime * 0.012));
              mist += smoothstep(0.42, 0.8, n) * (1.0 - hNorm) * (md / 6.0);
            }
            mist *= 0.0065 * uMist;
          }
          float T = exp(-(fog + mist));
          float mu = max(dot(dir, uLight), 0.0);
          vec3 scatter = mix(uFog, uGlow, pow(mu, 8.0) * 0.45 + pow(mu, 40.0) * 0.35 * uLightOn);
          if (sky) T = mix(1.0, T, 0.6);
          col = col * T + scatter * (1.0 - T);
          // god rays: march toward the light on screen, collecting unblocked sky
          if (uShafts > 0.0 && uLightOn > 0.0) {
            vec2 dl = (uLightScreen - vUv) / 28.0;
            vec2 uv = vUv; float acc = 0.0, w = 1.0;
            for (int i = 0; i < 28; i++) {
              uv += dl;
              if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
              float s = step(0.99999, texture2D(tDepth, uv).x);
              acc += s * w; w *= 0.965;
            }
            float facing = smoothstep(0.2, 0.95, mu);
            col += uGlow * (acc / 28.0) * 0.3 * facing * uShafts;
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  update(camera, light, lightOn, fog, glow, time) {
    camera.updateMatrixWorld();
    this.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    this.uniforms.uViewInv.value.copy(camera.matrixWorld);
    this.uniforms.uCam.value.copy(camera.position);
    this.uniforms.uLight.value.copy(light);
    const p = camera.position.clone().addScaledVector(light, 1000).project(camera);
    this.uniforms.uLightScreen.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    this.uniforms.uLightOn.value = p.z < 1 ? lightOn : 0;
    this.uniforms.uFog.value.copy(fog);
    this.uniforms.uGlow.value.copy(glow);
    this.uniforms.uTime.value = time;
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}
