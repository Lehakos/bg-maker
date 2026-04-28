import {
  type LayoutZone,
  type LayoutZoneContent,
  type TextZoneContent,
  type VisualZoneContent
} from "@bg-maker/shared";

export function createZone(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  content: LayoutZoneContent
): LayoutZone {
  return { id, name, x, y, width, height, content };
}

export function createTextContent(text: string): TextZoneContent {
  return {
    type: "text",
    source: { mode: "static" },
    text,
    fontSize: 14,
    bold: false,
    align: "center",
    color: "#1f2937"
  };
}

export function createVisualContent(visualType: "image" | "icon"): VisualZoneContent {
  return {
    type: "visual",
    source: { mode: "static" },
    visualType,
    dataUrl: "",
    fileName: "",
    fit: "contain",
    iconId: "sword",
    size: 28,
    color: "#0f766e",
    horizontalAlign: "center",
    verticalAlign: "center"
  };
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
