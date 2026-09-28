// Movement and look input that doesn't come from the keyboard or pointer lock:
// the touch joystick, touch look and mouse-drag look. Player.jsx drains it each frame.
export const input = {
  moveX: 0, // -1 left .. 1 right
  moveY: 0, // -1 forward .. 1 back
  lookX: 0, // accumulated pixels since the last frame
  lookY: 0,
  sneak: false, // the touch SNEAK toggle
};

export function addLook(dx, dy) {
  input.lookX += dx;
  input.lookY += dy;
}

export const IS_TOUCH = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
