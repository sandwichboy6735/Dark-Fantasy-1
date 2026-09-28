// Every knob of the retro look lives here.
export const RETRO = {
  // The scene is rendered at this many lines and blown up with nearest-neighbour
  // sampling. Width follows the window's aspect ratio (240 lines = 320x240 at 4:3).
  internalHeight: 240,

  // Bits per channel after dithering. [5, 6, 5] is 16-bit RGB565 colour.
  // [5, 5, 5] is the PlayStation's 15-bit mode, [8, 8, 8] is 24/32-bit true colour.
  colorBits: [5, 6, 5],

  // 0 = plain rounding (banding), 1 = full 8x8 Bayer dither.
  ditherStrength: 1,

  // Linear exposure applied before the colour is quantised.
  exposure: 1.15,

  // 1 = vertices snap to one internal pixel, 2 = two pixels, 0 = off.
  jitterStrength: 1,

  // Outline strengths used by RenderPixelatedPass.
  normalEdgeStrength: 0.25,
  depthEdgeStrength: 0.35,
};

// RenderPixelatedPass renders at (buffer size / pixelSize). Picking the pixel
// size from the buffer height pins the internal image at RETRO.internalHeight lines.
export function pixelSizeFor(bufferHeight) {
  return Math.max(1, bufferHeight / RETRO.internalHeight);
}
