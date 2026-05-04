import type {
  ProjectObjectIcon,
  ProjectObjectIconStyle,
  ProjectObjectIconSymbol
} from "@bg-maker/shared";
import { getProjectObjectIconSymbol, projectObjectIconStyles } from "@bg-maker/shared";
import { isHexColor } from "./inspector-state-utils";

export type IconFieldKey = keyof ProjectObjectIcon;
export type IconDraft = {
  color: string;
  style: ProjectObjectIconStyle;
  symbol: ProjectObjectIconSymbol;
};

const iconStyles = new Set<ProjectObjectIconStyle>(projectObjectIconStyles);

export function createIconDraft(icon: ProjectObjectIcon): IconDraft {
  return {
    color: icon.color,
    style: icon.style,
    symbol: icon.symbol
  };
}

export function getIconWithDraftField(
  icon: ProjectObjectIcon,
  fieldKey: IconFieldKey,
  value: string
): ProjectObjectIcon | null {
  const nextIcon = createNextIcon(icon, fieldKey, value);

  if (!nextIcon) {
    return null;
  }

  return areIconsEqual(icon, nextIcon) ? null : nextIcon;
}

function createNextIcon(
  icon: ProjectObjectIcon,
  fieldKey: IconFieldKey,
  value: string
): ProjectObjectIcon | null {
  if (fieldKey === "color") {
    return isHexColor(value) ? { ...icon, color: value.toLowerCase() } : null;
  }

  if (fieldKey === "style") {
    return iconStyles.has(value as ProjectObjectIconStyle)
      ? { ...icon, style: value as ProjectObjectIconStyle }
      : null;
  }

  if (fieldKey === "symbol") {
    const symbol = getProjectObjectIconSymbol(value);

    return symbol ? { ...icon, symbol } : null;
  }

  return null;
}

function areIconsEqual(left: ProjectObjectIcon, right: ProjectObjectIcon) {
  return (
    left.color === right.color &&
    left.style === right.style &&
    left.symbol === right.symbol
  );
}
