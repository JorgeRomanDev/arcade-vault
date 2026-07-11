const WINDOW_SIZE = 30;
const DROPPED_FRAME_THRESHOLD_MS = 33;

export interface FrameStats {
  fps: number;
  frameTimeMs: number;
  droppedFrames: number;
}

export function createFpsMonitor(): { tick: () => FrameStats } {
  const frameTimes: number[] = [];
  let lastTime: number | null = null;

  return {
    tick(): FrameStats {
      const now = performance.now();
      const frameTimeMs = lastTime === null ? 0 : now - lastTime;
      lastTime = now;

      frameTimes.push(frameTimeMs);
      if (frameTimes.length > WINDOW_SIZE) frameTimes.shift();

      const avgFrameTime =
        frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length;
      const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
      const droppedFrames = frameTimes.filter(
        (t) => t > DROPPED_FRAME_THRESHOLD_MS,
      ).length;

      return { fps, frameTimeMs, droppedFrames };
    },
  };
}

export function isDebugFpsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "fps";
}
