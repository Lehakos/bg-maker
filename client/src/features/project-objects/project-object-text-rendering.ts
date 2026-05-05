import type { CSSProperties } from "react";
import type { ProjectObjectText, ProjectObjectTextFontFamily } from "@bg-maker/shared";

export type ProjectObjectLabelTextStyle = CSSProperties & { fontSize: string };

export function getProjectObjectLabelTextStyle(
  text: ProjectObjectText
): ProjectObjectLabelTextStyle {
  return {
    color: text.color,
    fontFamily: getProjectObjectTextFontFamilyCssValue(text.fontFamily),
    fontSize: `${text.fontSize}px`,
    fontStyle: text.fontStyle,
    fontWeight: text.fontWeight,
    lineHeight: text.lineHeight,
    textShadow: getProjectObjectTextShadow(text),
    WebkitTextStroke: getProjectObjectTextOutline(text)
  };
}

export function getProjectObjectTextFontFamilyCssValue(fontFamily: ProjectObjectTextFontFamily) {
  if (fontFamily === "serif") {
    return "Georgia, Cambria, 'Times New Roman', serif";
  }

  if (fontFamily === "mono") {
    return "'SFMono-Regular', Consolas, 'Liberation Mono', monospace";
  }

  if (fontFamily === "rounded") {
    return "'Arial Rounded MT Bold', ui-rounded, system-ui, sans-serif";
  }

  if (fontFamily === "condensed") {
    return "'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif";
  }

  return "Inter, ui-sans-serif, system-ui, sans-serif";
}

export function getProjectObjectTextShadow(text: ProjectObjectText) {
  if (text.effect.mode !== "shadow") {
    return undefined;
  }

  const strength = Math.max(0, text.effect.strength);

  return `0 ${strength}px ${strength * 1.5}px ${text.effect.color}`;
}

export function getProjectObjectTextOutline(text: ProjectObjectText) {
  if (text.effect.mode !== "outline") {
    return undefined;
  }

  return `${Math.max(0, text.effect.strength)}px ${text.effect.color}`;
}
