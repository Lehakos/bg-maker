import type {
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectSide,
  ProjectObjectVariableBinding,
  ProjectObjectVariableBindingTarget
} from "@bg-maker/shared";
import {
  createDefaultProjectObjectNode,
  projectObjectKinds as sharedProjectObjectKinds,
  projectObjectVariableBindingTargets,
  projectObjectSides
} from "@bg-maker/shared";
import { normalizeProjectObjectComponents } from "./project-object-components-normalizer.js";
import { ProjectValidationError } from "./project-validation-error.js";

const maxProjectObjectTreeDepth = 24;
const maxProjectObjectTreeNodes = 1000;
const projectObjectKinds = new Set<ProjectObjectKind>(sharedProjectObjectKinds);
const projectObjectSideSet = new Set<ProjectObjectSide>(projectObjectSides);
const projectObjectVariableBindingTargetSet = new Set<ProjectObjectVariableBindingTarget>(
  projectObjectVariableBindingTargets
);

export function ensureProjectObjectFileRoot(
  objectTree: ProjectObjectNode[],
  fileNodeId: string,
  fileNodeName: string
): ProjectObjectNode[] {
  if (objectTree.length > 0) {
    return objectTree;
  }

  return [createDefaultProjectObjectNode(`${fileNodeId}:root`, "group", fileNodeName)];
}

export function normalizeProjectObjectTree(value: unknown): ProjectObjectNode[] {
  if (!Array.isArray(value)) {
    throw new ProjectValidationError("Project object tree must be an array");
  }

  const nodeIds = new Set<string>();
  const nodeCount = { value: 0 };

  return value.map((node) => normalizeProjectObjectNode(node, 0, nodeIds, nodeCount));
}

function normalizeProjectObjectNode(
  value: unknown,
  depth: number,
  nodeIds: Set<string>,
  nodeCount: { value: number }
): ProjectObjectNode {
  if (!value || typeof value !== "object") {
    throw new ProjectValidationError("Project object tree nodes must be objects");
  }

  if (depth > maxProjectObjectTreeDepth) {
    throw new ProjectValidationError("Project object tree is too deeply nested");
  }

  nodeCount.value += 1;

  if (nodeCount.value > maxProjectObjectTreeNodes) {
    throw new ProjectValidationError("Project object tree has too many nodes");
  }

  const record = value as Partial<Record<keyof ProjectObjectNode, unknown>>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (!id) {
    throw new ProjectValidationError("Project object tree node id is required");
  }

  if (nodeIds.has(id)) {
    throw new ProjectValidationError("Project object tree node ids must be unique");
  }

  if (!name) {
    throw new ProjectValidationError("Project object tree node name is required");
  }

  nodeIds.add(id);

  const kind = projectObjectKinds.has(record.kind as ProjectObjectKind)
    ? (record.kind as ProjectObjectKind)
    : "group";
  const parentSide = projectObjectSideSet.has(record.parentSide as ProjectObjectSide)
    ? (record.parentSide as ProjectObjectSide)
    : undefined;

  return {
    ...(parentSide ? { parentSide } : {}),
    id,
    name,
    kind,
    visible: record.visible !== false,
    ...normalizeProjectObjectVariableBindings(record.bindings),
    components: normalizeProjectObjectComponents(record.components, kind, name),
    children: Array.isArray(record.children)
      ? record.children.map((child) =>
          normalizeProjectObjectNode(child, depth + 1, nodeIds, nodeCount)
        )
      : []
  };
}

function normalizeProjectObjectVariableBindings(value: unknown): {
  bindings?: ProjectObjectVariableBinding[];
} {
  if (!Array.isArray(value)) {
    return {};
  }

  const bindings: ProjectObjectVariableBinding[] = [];
  const bindingKeys = new Set<string>();

  for (const binding of value) {
    const record =
      binding && typeof binding === "object" ? (binding as Record<string, unknown>) : {};
    const variableId = typeof record.variableId === "string" ? record.variableId.trim() : "";
    const target = projectObjectVariableBindingTargetSet.has(
      record.target as ProjectObjectVariableBindingTarget
    )
      ? (record.target as ProjectObjectVariableBindingTarget)
      : undefined;

    if (!variableId || !target) {
      continue;
    }

    const bindingKey = `${target}:${variableId}`;

    if (bindingKeys.has(bindingKey)) {
      continue;
    }

    bindingKeys.add(bindingKey);
    bindings.push({ variableId, target });
  }

  return bindings.length ? { bindings } : {};
}
