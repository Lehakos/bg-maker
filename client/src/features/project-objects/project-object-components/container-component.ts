import type {
  ProjectObjectContainer,
  ProjectObjectContainerEntry,
  ProjectObjectKind,
  ProjectObjectNode
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectContainer,
  projectObjectContainerEntryQuantityLimits
} from "@bg-maker/shared";

export function getProjectObjectContainerComponent(
  object: ProjectObjectNode
): ProjectObjectContainer {
  return normalizeProjectObjectContainerComponent(
    {
      ...getDefaultProjectObjectContainer(object.kind),
      ...object.components?.container
    },
    object.kind
  );
}

export function withProjectObjectContainerComponent(
  object: ProjectObjectNode,
  container: ProjectObjectContainer
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      container: normalizeProjectObjectContainerComponent(container, object.kind)
    }
  };
}

export function normalizeProjectObjectContainerComponent(
  container: Partial<ProjectObjectContainer>,
  kind: ProjectObjectKind
): ProjectObjectContainer {
  void kind;

  return {
    entries: normalizeProjectObjectContainerEntries(container.entries)
  };
}

function normalizeProjectObjectContainerEntries(
  entries: ProjectObjectContainer["entries"] | undefined
): ProjectObjectContainerEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  const quantityByObjectFileNodeId = new Map<string, number>();

  for (const entry of entries) {
    const objectFileNodeId =
      typeof entry?.objectFileNodeId === "string" ? entry.objectFileNodeId.trim() : "";

    if (!objectFileNodeId) {
      continue;
    }

    const quantity = normalizeQuantity(entry.quantity);
    quantityByObjectFileNodeId.set(
      objectFileNodeId,
      normalizeQuantity((quantityByObjectFileNodeId.get(objectFileNodeId) ?? 0) + quantity)
    );
  }

  return Array.from(quantityByObjectFileNodeId, ([objectFileNodeId, quantity]) => ({
    objectFileNodeId,
    quantity
  }));
}

function normalizeQuantity(value: unknown) {
  const normalizedValue = typeof value === "number" && Number.isFinite(value) ? value : 1;

  return Math.min(
    projectObjectContainerEntryQuantityLimits.max,
    Math.max(projectObjectContainerEntryQuantityLimits.min, Math.round(normalizedValue))
  );
}
