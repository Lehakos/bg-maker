export type WorkspaceTool = "select" | "move" | "rotate" | "resize";

export const defaultCanvasScale = 2;
export const minCanvasScale = 0.5;
export const maxCanvasScale = 6;
export const canvasScaleStep = 0.25;

export function normalizeCanvasScale(value: number) {
  return clamp(
    Math.round(value / canvasScaleStep) * canvasScaleStep,
    minCanvasScale,
    maxCanvasScale
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
