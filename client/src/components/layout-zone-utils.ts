import {
  type LayoutZone,
  type LayoutZoneContent,
  type TextZoneContent,
  type VisualZoneContent
} from "@bg-maker/shared";

export type ZoneContentKind = "text" | "image" | "icon";

export const zoneContentKindLabels: Record<ZoneContentKind, string> = {
  text: "Text",
  image: "Image",
  icon: "Icon"
};

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

export function createContentForZoneKind(kind: ZoneContentKind, text = "New text") {
  return kind === "text" ? createTextContent(text) : createVisualContent(kind);
}

export function createDefaultLayoutZone(prefix: string, kind: ZoneContentKind): LayoutZone {
  switch (kind) {
    case "text":
      return createZone(
        createId(`${prefix}-text`),
        "Text",
        0,
        0,
        100,
        20,
        createTextContent("New text")
      );

    case "image":
      return createZone(
        createId(`${prefix}-image`),
        "Image",
        10,
        12,
        80,
        56,
        createVisualContent("image")
      );

    case "icon":
      return createZone(
        createId(`${prefix}-icon`),
        "Icon",
        35,
        35,
        30,
        30,
        createVisualContent("icon")
      );
  }
}

export function getZoneContentKind(content: LayoutZoneContent): ZoneContentKind {
  return content.type === "text" ? "text" : content.visualType;
}

export function getZoneContentLabel(content: LayoutZoneContent) {
  return zoneContentKindLabels[getZoneContentKind(content)];
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
