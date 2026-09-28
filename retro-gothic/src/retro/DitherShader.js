import { Vector2, Vector3 } from 'three';

// Final pass: linear -> sRGB and a light grade, then an 8x8 ordered (Bayer) dither while the colour
// is cut down to a fixed number of bits per channel (RGB565 by default).
// The Bayer cell is taken on the low-res grid, so each dither dot is one fat pixel.
export const DitherShader = {
  name: 'BayerDitherShader',

  uniforms: {
    tDiffuse: { value: null },
    uLowRes: { value: new Vector2(320, 240) },
    uLevels: { value: new Vector3(31, 63, 31) },
    uStrength: { value: 1 },
    uExposure: { value: 1 },
    uLift: { value: 0 },
    uGamma: { value: 1 },
    uSaturation: { value: 1 },
    uBloom: { value: 0 },
    uBloomThreshold: { value: 0.6 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uLowRes;
    uniform vec3 uLevels;
    uniform float uStrength;
    uniform float uExposure;
    uniform float uLift;
    uniform float uGamma;
    uniform float uSaturation;
    uniform float uBloom;
    uniform float uBloomThreshold;
    varying vec2 vUv;

    const int BAYER8[64] = int[64](
       0, 32,  8, 40,  2, 34, 10, 42,
      48, 16, 56, 24, 50, 18, 58, 26,
      12, 44,  4, 36, 14, 46,  6, 38,
      60, 28, 52, 20, 62, 30, 54, 22,
       3, 35, 11, 43,  1, 33,  9, 41,
      51, 19, 59, 27, 49, 17, 57, 25,
      15, 47,  7, 39, 13, 45,  5, 37,
      63, 31, 55, 23, 61, 29, 53, 21
    );

    vec3 linearToSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    vec3 lowRes(vec2 cell) {
      return texture2D(tDiffuse, (cell + 0.5) / uLowRes).rgb * uExposure;
    }

    // Only the bright part of a colour feeds the glow.
    vec3 brightPart(vec3 c) {
      float peak = max(c.r, max(c.g, c.b));
      return c * smoothstep(uBloomThreshold, uBloomThreshold + 0.5, peak);
    }

    void main() {
      vec2 cell = floor(vUv * uLowRes);
      vec3 linear = lowRes(cell);

      // Glow: bright neighbours within a few low-res pixels bleed a little light
      // into this one. Three rings, each turned against the last so the halo comes
      // out round rather than star-shaped, fading with distance.
      if (uBloom > 0.0) {
        vec3 glow = vec3(0.0);
        for (int ring = 0; ring < 3; ring++) {
          float radius = 1.5 + float(ring) * 1.75;
          float weight = 0.07 / (1.0 + float(ring) * 0.9);
          for (int i = 0; i < 8; i++) {
            float a = (float(i) + float(ring) * 0.333) * 0.785398;
            glow += brightPart(lowRes(cell + floor(vec2(cos(a), sin(a)) * radius + 0.5))) * weight;
          }
        }
        linear += glow * uBloom;
      }
      vec3 color = linearToSRGB(clamp(linear, 0.0, 1.0));
      // Grade: open up the mid-tones, lift the blacks, a little more colour.
      color = pow(color, vec3(uGamma));
      color = uLift + color * (1.0 - uLift);
      float grey = dot(color, vec3(0.299, 0.587, 0.114));
      color = clamp(mix(vec3(grey), color, uSaturation), 0.0, 1.0);

      ivec2 p = ivec2(mod(cell, 8.0));
      float threshold = (float(BAYER8[p.y * 8 + p.x]) + 0.5) / 64.0;
      threshold = 0.5 + (threshold - 0.5) * uStrength;

      vec3 quantised = floor(color * uLevels + threshold) / uLevels;
      gl_FragColor = vec4(clamp(quantised, 0.0, 1.0), 1.0);
    }
  `,
};
