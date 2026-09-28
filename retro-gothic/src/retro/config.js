// Every knob of the retro look lives here.
export const RETRO = {
  // The scene is rendered at this many lines and blown up with nearest-neighbour
  // sampling. Width follows the window's aspect ratio (240 lines = 320x240 at 4:3;
  // 336 is cleaner while still chunky).
  internalHeight: 336,

  // Bits per channel after dithering. [5, 6, 5] is 16-bit RGB565 colour.
  // [5, 5, 5] is the PlayStation's 15-bit mode, [8, 8, 8] is 24/32-bit true colour.
  colorBits: [5, 6, 5],

  // 0 = plain rounding (banding), 1 = full 8x8 Bayer dither.
  ditherStrength: 0.4,

  // Linear exposure applied before the colour is quantised.
  exposure: 1.5,

  // Final grade, in sRGB: `lift` raises the blacks so shadows keep some detail,
  // `gamma` below 1 opens up the mid-tones, `saturation` above 1 adds colour.
  lift: 0.03,
  gamma: 0.86,
  saturation: 1.15,

  // A soft glow around anything brighter than `bloomThreshold` (flames, lanterns,
  // magic, the Eye), spread over a few low-res pixels. 0 turns it off.
  bloom: 0.6,
  bloomThreshold: 0.8,

  // 1 = vertices snap to one internal pixel, 2 = two pixels, 0 = off.
  jitterStrength: 0.35,

  // Outline strengths used by RenderPixelatedPass.
  normalEdgeStrength: 0.16,
  depthEdgeStrength: 0.22,
};

// RenderPixelatedPass renders at (buffer size / pixelSize). Picking the pixel size
// from the shorter side keeps it at RETRO.internalHeight pixels: 240 lines on a wide
// screen, 240 columns on a phone held upright (never a 110-pixel-wide sliver).
export function pixelSizeFor(bufferWidth, bufferHeight) {
  return Math.max(1, Math.min(bufferWidth, bufferHeight) / RETRO.internalHeight);
}

// Vertical field of view: 70 degrees on wide screens, opened up on tall ones so the
// horizontal view never drops below about 75 degrees.
export function fovFor(aspect) {
  const minHorizontal = (75 * Math.PI) / 180;
  const vertical = 2 * Math.atan(Math.tan(minHorizontal / 2) / aspect);
  return Math.min(105, Math.max(70, (vertical * 180) / Math.PI));
}
