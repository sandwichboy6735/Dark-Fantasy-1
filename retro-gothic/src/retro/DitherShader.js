import { Vector2, Vector3 } from 'three';

// Final pass: linear -> sRGB, then an 8x8 ordered (Bayer) dither while the colour
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

    void main() {
      vec2 cell = floor(vUv * uLowRes);
      vec3 linear = texture2D(tDiffuse, (cell + 0.5) / uLowRes).rgb * uExposure;
      vec3 color = linearToSRGB(clamp(linear, 0.0, 1.0));

      ivec2 p = ivec2(mod(cell, 8.0));
      float threshold = (float(BAYER8[p.y * 8 + p.x]) + 0.5) / 64.0;
      threshold = 0.5 + (threshold - 0.5) * uStrength;

      vec3 quantised = floor(color * uLevels + threshold) / uLevels;
      gl_FragColor = vec4(clamp(quantised, 0.0, 1.0), 1.0);
    }
  `,
};
