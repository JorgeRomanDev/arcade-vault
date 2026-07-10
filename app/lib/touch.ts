export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(pointer: coarse)").matches) return true;
  return "ontouchstart" in window;
}

export function dispatchKey(
  type: "keydown" | "keyup",
  key: string,
  code: string,
) {
  window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }));
}
