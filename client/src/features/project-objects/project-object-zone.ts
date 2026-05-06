import type {
  ProjectFileNode,
  ProjectObjectLayout,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectZone
} from "@bg-maker/shared";
import {
  normalizeProjectObjectZoneSlots,
  resolveProjectObjectFileObjectTree
} from "@bg-maker/shared";
import {
  getProjectObjectNodeAppearance,
  getProjectObjectNodeLayout,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeZone
} from "./project-object-tree";

export type ProjectObjectZoneReference = {
  fileNode: ProjectFileNode & {
    kind: "object";
    objectTree?: ProjectObjectNode[];
    type: "file";
  };
  object: ProjectObjectNode;
};

export type ProjectObjectZoneSlotRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function resolveProjectObjectZoneReference(
  fileTree: readonly ProjectFileNode[],
  zone: ProjectObjectZone
): ProjectObjectZoneReference | null {
  if (zone.mode !== "slots" || !zone.sizeReferenceObjectFileId) {
    return null;
  }

  for (const node of fileTree) {
    const reference = resolveProjectObjectZoneReferenceInNode(
      node,
      zone.sizeReferenceObjectFileId,
      fileTree
    );

    if (reference) {
      return reference;
    }
  }

  return null;
}

export function getProjectObjectZoneReferenceRectTransform(
  fileTree: readonly ProjectFileNode[],
  zone: ProjectObjectZone
): ProjectObjectRectTransform | null {
  const reference = resolveProjectObjectZoneReference(fileTree, zone);

  return reference ? getProjectObjectNodeRectTransform(reference.object) : null;
}

export function getEffectiveProjectObjectRectTransform(
  object: ProjectObjectNode,
  fileTree: readonly ProjectFileNode[]
): ProjectObjectRectTransform {
  const rectTransform = getProjectObjectNodeRectTransform(object);

  if (object.kind !== "zone") {
    return rectTransform;
  }

  const zone = getProjectObjectNodeZone(object);

  if (zone.mode !== "slots") {
    return rectTransform;
  }

  const referenceRectTransform = getProjectObjectZoneReferenceRectTransform(fileTree, zone);

  if (!referenceRectTransform) {
    return rectTransform;
  }

  return {
    ...rectTransform,
    ...getProjectObjectZoneSize(
      referenceRectTransform,
      zone,
      getProjectObjectNodeLayout(object),
      getProjectObjectNodeAppearance(object).padding
    )
  };
}

export function getProjectObjectZoneSlotRects(
  fileTree: readonly ProjectFileNode[],
  object: ProjectObjectNode
): ProjectObjectZoneSlotRect[] {
  if (object.kind !== "zone") {
    return [];
  }

  const zone = getProjectObjectNodeZone(object);

  if (zone.mode !== "slots") {
    return [];
  }

  const referenceRectTransform = getProjectObjectZoneReferenceRectTransform(fileTree, zone);

  if (!referenceRectTransform) {
    return [];
  }

  return getProjectObjectZoneSlotRectsForSize(
    {
      height: referenceRectTransform.height,
      width: referenceRectTransform.width
    },
    zone,
    getProjectObjectNodeLayout(object),
    getProjectObjectNodeAppearance(object).padding
  );
}

export function getProjectObjectZoneSize(
  slotSize: Pick<ProjectObjectRectTransform, "height" | "width">,
  zone: ProjectObjectZone,
  layout: ProjectObjectLayout,
  padding: number
) {
  const slots = normalizeProjectObjectZoneSlots(zone.slots);
  const gap = normalizeGap(layout.gap);
  const normalizedPadding = normalizePadding(padding);
  const layoutMode = getZoneLayoutMode(layout.mode);

  if (layoutMode === "horizontal") {
    return {
      height: normalizedPadding * 2 + slotSize.height,
      width: normalizedPadding * 2 + slotSize.width * slots + gap * Math.max(0, slots - 1)
    };
  }

  if (layoutMode === "vertical") {
    return {
      height: normalizedPadding * 2 + slotSize.height * slots + gap * Math.max(0, slots - 1),
      width: normalizedPadding * 2 + slotSize.width
    };
  }

  const columns = getZoneGridColumns(layout.columns, slots);
  const rows = Math.ceil(slots / columns);

  return {
    height: normalizedPadding * 2 + slotSize.height * rows + gap * Math.max(0, rows - 1),
    width: normalizedPadding * 2 + slotSize.width * columns + gap * Math.max(0, columns - 1)
  };
}

export function getProjectObjectZoneSlotRectsForSize(
  slotSize: Pick<ProjectObjectRectTransform, "height" | "width">,
  zone: ProjectObjectZone,
  layout: ProjectObjectLayout,
  padding: number
): ProjectObjectZoneSlotRect[] {
  if (zone.mode !== "slots") {
    return [];
  }

  const slots = normalizeProjectObjectZoneSlots(zone.slots);
  const gap = normalizeGap(layout.gap);
  const normalizedPadding = normalizePadding(padding);
  const layoutMode = getZoneLayoutMode(layout.mode);
  const columns =
    layoutMode === "horizontal"
      ? slots
      : layoutMode === "vertical"
        ? 1
        : getZoneGridColumns(layout.columns, slots);

  return Array.from({ length: slots }, (_, index) => {
    const columnIndex = index % columns;
    const rowIndex = Math.floor(index / columns);

    return {
      height: slotSize.height,
      width: slotSize.width,
      x: normalizedPadding + columnIndex * (slotSize.width + gap),
      y: normalizedPadding + rowIndex * (slotSize.height + gap)
    };
  });
}

function resolveProjectObjectZoneReferenceInNode(
  node: ProjectFileNode,
  sizeReferenceObjectFileId: string,
  fileTree: readonly ProjectFileNode[]
): ProjectObjectZoneReference | null {
  if (node.type === "folder") {
    for (const child of node.children ?? []) {
      const reference = resolveProjectObjectZoneReferenceInNode(
        child,
        sizeReferenceObjectFileId,
        fileTree
      );

      if (reference) {
        return reference;
      }
    }

    return null;
  }

  if (node.id !== sizeReferenceObjectFileId || node.kind !== "object") {
    return null;
  }

  const rootObject = resolveProjectObjectFileObjectTree(fileTree, node)[0];

  if (!rootObject || rootObject.kind === "zone") {
    return null;
  }

  return {
    fileNode: node as ProjectObjectZoneReference["fileNode"],
    object: rootObject
  };
}

function getZoneLayoutMode(mode: ProjectObjectLayout["mode"]) {
  return mode === "free" ? "grid" : mode;
}

function getZoneGridColumns(columns: number, slots: number) {
  const normalizedColumns = Number.isFinite(columns) ? Math.round(columns) : 1;

  return Math.min(slots, Math.max(1, normalizedColumns));
}

function normalizeGap(gap: number) {
  return Number.isFinite(gap) ? Math.max(0, gap) : 0;
}

function normalizePadding(padding: number) {
  return Number.isFinite(padding) ? Math.max(0, padding) : 0;
}
