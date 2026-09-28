// Oil-painting look: a smoothed Kuwahara filter flattens detail into brush-like patches while
// keeping edges crisp, then a canvas weave is pressed into the paint.
import * as THREE from 'three';

function canvasWeave() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, s, s);
  let seed = 9; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let y = 0; y < s; y += 2) { ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`; ctx.fillRect(0, y, s, 1); }
  for (let x = 0; x < s; x += 2) { ctx.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`; ctx.fillRect(x, 0, 1, s); }
  for (let i = 0; i < 1400; i++) {
    const x = r() * s, y = r() * s, len = 6 + r() * 20, a = -0.6 + r() * 0.3;
    ctx.strokeStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${0.03 + r() * 0.04})`;
    ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function makePaintShader() {
  return {
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uAmount: { value: 0.55 }, tCanvas: { value: canvasWeave() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse, tCanvas; uniform vec2 uRes; uniform float uAmount; varying vec2 vUv;
      #define R 2
      vec3 fetch(vec2 o) { return min(texture2D(tDiffuse, vUv + o / uRes).rgb, vec3(3.0)); }
      void main() {
        vec3 orig = texture2D(tDiffuse, vUv).rgb;
        vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
        vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
        for (int j = 0; j <= R; j++) for (int i = 0; i <= R; i++) {
          vec3 c;
          c = fetch(vec2(-float(i), -float(j))); m0 += c; s0 += c * c;
          c = fetch(vec2( float(i), -float(j))); m1 += c; s1 += c * c;
          c = fetch(vec2(-float(i),  float(j))); m2 += c; s2 += c * c;
          c = fetch(vec2( float(i),  float(j))); m3 += c; s3 += c * c;
        }
        float n = float((R + 1) * (R + 1));
        vec3 L = vec3(0.299, 0.587, 0.114);
        m0 /= n; m1 /= n; m2 /= n; m3 /= n;
        float v0 = dot(abs(s0 / n - m0 * m0), L), v1 = dot(abs(s1 / n - m1 * m1), L);
        float v2 = dot(abs(s2 / n - m2 * m2), L), v3 = dot(abs(s3 / n - m3 * m3), L);
        float w0 = 1.0 / (0.0004 + v0 * v0 * 400.0), w1 = 1.0 / (0.0004 + v1 * v1 * 400.0);
        float w2 = 1.0 / (0.0004 + v2 * v2 * 400.0), w3 = 1.0 / (0.0004 + v3 * v3 * 400.0);
        vec3 painted = (m0 * w0 + m1 * w1 + m2 * w2 + m3 * w3) / (w0 + w1 + w2 + w3);
        // keep bright highlights (moon, lanterns) from being flattened
        painted = mix(painted, orig, smoothstep(1.2, 2.5, dot(orig, L)));
        vec3 c = mix(orig, painted, uAmount);
        float weave = texture2D(tCanvas, vUv * uRes / 256.0).r;
        c *= 1.0 + (weave - 0.5) * 0.22 * uAmount;
        gl_FragColor = vec4(c, 1.0);
      }`,
  };
}
