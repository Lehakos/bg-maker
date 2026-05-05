import type {
  ProjectCompositionGuide,
  ProjectCompositionGuideAxis,
  ProjectCompositionSettings,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import { getDefaultProjectCompositionSettings } from "@bg-maker/shared";

export type CompositionBounds = {
  bottom: number;
  centerX: number;
  centerY: number;
  left: number;
  right: number;
  top: number;
};

export type CompositionPositionMode = "center" | "topLeft";

export type CompositionSnapTarget = {
  axis: "x" | "y";
  position: number;
  source: "guide" | "object";
};

export type CompositionSnapIndicator = {
  axis: "x" | "y";
  position: number;
};

export type CompositionClientRect = Pick<DOMRect, "height" | "left" | "top" | "width">;

export function getProjectCompositionSettings(
  composition: ProjectCompositionSettings | null | undefined
): ProjectCompositionSettings {
  const defaults = getDefaultProjectCompositionSettings();

  return {
    ...defaults,
    ...composition,
    guides: composition?.guides ?? []
  };
}

export function getProjectCompositionSettingsWithGuideAdded(
  composition: ProjectCompositionSettings,
  axis: ProjectCompositionGuideAxis,
  position: number
): ProjectCompositionSettings {
  return {
    ...composition,
    guides: [
      ...composition.guides,
      {
        axis,
        id: crypto.randomUUID(),
        locked: false,
        position: Math.round(position),
        visible: true
      }
    ]
  };
}

export function getProjectCompositionSettingsWithGuideUpdated(
  composition: ProjectCompositionSettings,
  guideId: string,
  update: Partial<Omit<ProjectCompositionGuide, "id">>
): ProjectCompositionSettings {
  return {
    ...composition,
    guides: composition.guides.map((guide) =>
      guide.id === guideId
        ? {
            ...guide,
            ...update,
            position:
              typeof update.position === "number" ? Math.round(update.position) : guide.position
          }
        : guide
    )
  };
}

export function getProjectCompositionSettingsWithGuideRemoved(
  composition: ProjectCompositionSettings,
  guideId: string
): ProjectCompositionSettings {
  return {
    ...composition,
    guides: composition.guides.filter((guide) => guide.id !== guideId)
  };
}

export function getProjectCompositionSettingsWithField(
  composition: ProjectCompositionSettings,
  fieldKey: keyof Omit<ProjectCompositionSettings, "guides">,
  value: boolean
): ProjectCompositionSettings {
  return composition[fieldKey] === value ? composition : { ...composition, [fieldKey]: value };
}

export function getCompositionBounds(
  rectTransform: ProjectObjectRectTransform,
  positionMode: CompositionPositionMode
): CompositionBounds {
  const width = rectTransform.width * Math.abs(rectTransform.scaleX);
  const height = rectTransform.height * Math.abs(rectTransform.scaleY);
  const left = positionMode === "center" ? rectTransform.x - width / 2 : rectTransform.x;
  const top = positionMode === "center" ? rectTransform.y - height / 2 : rectTransform.y;
  const right = left + width;
  const bottom = top + height;

  return {
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    left,
    right,
    top
  };
}

export function getGuideSnapTargets(
  composition: ProjectCompositionSettings | null | undefined
): CompositionSnapTarget[] {
  const settings = getProjectCompositionSettings(composition);

  if (!settings.snapToGuides) {
    return [];
  }

  const axisTargets: CompositionSnapTarget[] = [
    { axis: "x", position: 0, source: "guide" },
    { axis: "y", position: 0, source: "guide" }
  ];
  const guideTargets = settings.guides.flatMap((guide): CompositionSnapTarget[] => {
    if (!guide.visible) {
      return [];
    }

    return [
      {
        axis: guide.axis === "vertical" ? "x" : "y",
        position: guide.position,
        source: "guide" as const
      }
    ];
  });

  return [...axisTargets, ...guideTargets];
}

export function getObjectSnapTargets(
  frames: readonly {
    id: string;
    rectTransform: ProjectObjectRectTransform;
    positionMode: CompositionPositionMode;
  }[],
  selectedIds: ReadonlySet<string>
): CompositionSnapTarget[] {
  const targets: CompositionSnapTarget[] = [];

  for (const frame of frames) {
    if (selectedIds.has(frame.id)) {
      continue;
    }

    const bounds = getCompositionBounds(frame.rectTransform, frame.positionMode);

    targets.push(
      { axis: "x", position: bounds.left, source: "object" },
      { axis: "x", position: bounds.centerX, source: "object" },
      { axis: "x", position: bounds.right, source: "object" },
      { axis: "y", position: bounds.top, source: "object" },
      { axis: "y", position: bounds.centerY, source: "object" },
      { axis: "y", position: bounds.bottom, source: "object" }
    );
  }

  return targets;
}

export function getGuidePositionFromClientPoint(
  rect: CompositionClientRect,
  axis: ProjectCompositionGuideAxis,
  clientX: number,
  clientY: number,
  width: number,
  height: number
) {
  const scaleX = width / Math.max(1, rect.width);
  const scaleY = height / Math.max(1, rect.height);

  if (axis === "vertical") {
    return (clientX - rect.left) * scaleX - width / 2;
  }

  return (clientY - rect.top) * scaleY - height / 2;
}
