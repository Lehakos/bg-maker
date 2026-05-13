import {
  getDefaultProjectObjectRectTransform,
  getProjectObjectIconSymbol
} from "./object-defaults.js";
import type {
  ProjectObjectComponents,
  ProjectObjectNode,
  ProjectObjectRules,
  ProjectObjectTemplate,
  ProjectObjectVariableBindingTarget,
  ProjectObjectVariableDefinition,
  ProjectObjectVariableType,
  ProjectObjectVariableValue
} from "./objects.js";
import type { ProjectFileNode } from "./project-files.js";
import type { ProjectTableSetupItem } from "./table-setups.js";

export function getProjectObjectVariableDefaultValues(
  template: ProjectObjectTemplate | undefined
): Record<string, ProjectObjectVariableValue> {
  const values: Record<string, ProjectObjectVariableValue> = {};

  for (const variable of template?.variables ?? []) {
    values[variable.id] = variable.defaultValue;
  }

  return values;
}

export function resolveProjectObjectFileObjectTree(
  fileTree: readonly ProjectFileNode[],
  fileNode: ProjectFileNode | null | undefined
): ProjectObjectNode[] {
  if (!fileNode || fileNode.type !== "file") {
    return [];
  }

  if (fileNode.kind === "object") {
    return resolveProjectObjectFileObjectTreeById(fileTree, fileNode.id, undefined, new Set());
  }

  return [];
}

export function resolveProjectObjectFileObjectTreeById(
  fileTree: readonly ProjectFileNode[],
  objectFileNodeId: string,
  overrideValues: Record<string, ProjectObjectVariableValue> = {},
  seenObjectFileNodeIds: Set<string> = new Set()
): ProjectObjectNode[] {
  const fileNode = findProjectFileNodeInTree(fileTree, objectFileNodeId);

  if (!fileNode || fileNode.type !== "file" || fileNode.kind !== "object") {
    return [];
  }

  if (seenObjectFileNodeIds.has(fileNode.id)) {
    return [];
  }

  seenObjectFileNodeIds.add(fileNode.id);

  if (fileNode.sourceRef) {
    return resolveProjectObjectFileObjectTreeById(
      fileTree,
      fileNode.sourceRef.sourceObjectFileNodeId,
      {
        ...fileNode.sourceRef.values,
        ...overrideValues
      },
      seenObjectFileNodeIds
    );
  }

  const template = fileNode.template;
  const values = {
    ...getProjectObjectVariableDefaultValues(template),
    ...overrideValues
  };

  return resolveProjectObjectTreeVariables(fileNode.objectTree ?? [], template, values);
}

export function resolveProjectObjectFileRules(
  fileTree: readonly ProjectFileNode[],
  fileNode: ProjectFileNode | null | undefined
): ProjectObjectRules | undefined {
  if (!fileNode || fileNode.type !== "file" || fileNode.kind !== "object") {
    return undefined;
  }

  return resolveProjectObjectFileRulesById(fileTree, fileNode.id, new Set());
}

export function resolveProjectObjectFileRulesById(
  fileTree: readonly ProjectFileNode[],
  objectFileNodeId: string,
  seenObjectFileNodeIds: Set<string> = new Set()
): ProjectObjectRules | undefined {
  const fileNode = findProjectFileNodeInTree(fileTree, objectFileNodeId);

  if (!fileNode || fileNode.type !== "file" || fileNode.kind !== "object") {
    return undefined;
  }

  if (fileNode.rules) {
    return fileNode.rules;
  }

  if (!fileNode.sourceRef || seenObjectFileNodeIds.has(fileNode.id)) {
    return undefined;
  }

  seenObjectFileNodeIds.add(fileNode.id);

  return resolveProjectObjectFileRulesById(
    fileTree,
    fileNode.sourceRef.sourceObjectFileNodeId,
    seenObjectFileNodeIds
  );
}

export function resolveProjectTableSetupItemObject(
  fileTree: readonly ProjectFileNode[],
  item: ProjectTableSetupItem
): ProjectObjectNode | null {
  if (item.type === "localObject") {
    return item.object;
  }

  const sourceRoot = resolveProjectObjectFileObjectTreeById(
    fileTree,
    item.sourceObjectFileNodeId,
    item.values,
    new Set()
  )[0];

  if (!sourceRoot) {
    return null;
  }

  const sourceRectTransform = {
    ...getDefaultProjectObjectRectTransform(sourceRoot.kind),
    ...sourceRoot.components?.rectTransform
  };

  return {
    ...sourceRoot,
    id: item.id,
    locked: item.locked === true,
    name: item.name,
    visible: item.visible,
    components: {
      ...sourceRoot.components,
      rectTransform: {
        ...sourceRectTransform,
        rotation: item.transform.rotation,
        scaleX: item.transform.scaleX,
        scaleY: item.transform.scaleY,
        x: item.transform.x,
        y: item.transform.y
      }
    }
  };
}

export function resolveProjectObjectTreeVariables(
  objectTree: readonly ProjectObjectNode[],
  template: ProjectObjectTemplate | undefined,
  values: Record<string, ProjectObjectVariableValue>
): ProjectObjectNode[] {
  const variableById = new Map(
    (template?.variables ?? []).map((variable) => [variable.id, variable])
  );

  return objectTree.map((object) =>
    resolveProjectObjectNodeVariables(object, variableById, values)
  );
}

export function findProjectFileNodeInTree(
  fileTree: readonly ProjectFileNode[],
  nodeId: string
): ProjectFileNode | undefined {
  for (const node of fileTree) {
    if (node.id === nodeId) {
      return node;
    }

    if (node.type === "folder") {
      const child = findProjectFileNodeInTree(node.children ?? [], nodeId);

      if (child) {
        return child;
      }
    }
  }

  return undefined;
}

function resolveProjectObjectNodeVariables(
  object: ProjectObjectNode,
  variableById: ReadonlyMap<string, ProjectObjectVariableDefinition>,
  values: Record<string, ProjectObjectVariableValue>
): ProjectObjectNode {
  const components = resolveProjectObjectNodeComponentVariables(object, variableById, values);
  const children = object.children?.map((child) =>
    resolveProjectObjectNodeVariables(child, variableById, values)
  );

  return {
    ...object,
    ...(components ? { components } : {}),
    ...(children ? { children } : {})
  };
}

function resolveProjectObjectNodeComponentVariables(
  object: ProjectObjectNode,
  variableById: ReadonlyMap<string, ProjectObjectVariableDefinition>,
  values: Record<string, ProjectObjectVariableValue>
): ProjectObjectComponents | undefined {
  let components = object.components;

  for (const binding of object.bindings ?? []) {
    const variable = variableById.get(binding.variableId);

    if (!variable || !isProjectObjectVariableTargetCompatible(variable.type, binding.target)) {
      continue;
    }

    const value = values[binding.variableId] ?? variable.defaultValue;
    components = getProjectObjectComponentsWithBoundValue(components, binding.target, value);
  }

  return components;
}

function isProjectObjectVariableTargetCompatible(
  type: ProjectObjectVariableType,
  target: ProjectObjectVariableBindingTarget
) {
  if (target === "text.content") {
    return type === "text" || type === "number";
  }

  if (target === "icon.symbol") {
    return type === "text";
  }

  if (
    target === "appearance.backgroundColor" ||
    target === "appearance.borderColor" ||
    target === "icon.color" ||
    target === "text.color"
  ) {
    return type === "color";
  }

  return type === "image";
}

function getProjectObjectComponentsWithBoundValue(
  components: ProjectObjectComponents | undefined,
  target: ProjectObjectVariableBindingTarget,
  value: ProjectObjectVariableValue
): ProjectObjectComponents | undefined {
  if (!components) {
    return components;
  }

  if (target === "appearance.backgroundColor" && components.appearance) {
    return {
      ...components,
      appearance: {
        ...components.appearance,
        backgroundColor: String(value)
      }
    };
  }

  if (target === "appearance.borderColor" && components.appearance) {
    return {
      ...components,
      appearance: {
        ...components.appearance,
        borderColor: String(value)
      }
    };
  }

  if (target === "image.assetId" && components.image) {
    return {
      ...components,
      image: {
        ...components.image,
        assetId: String(value)
      }
    };
  }

  if (target === "icon.color" && components.icon) {
    return {
      ...components,
      icon: {
        ...components.icon,
        color: String(value)
      }
    };
  }

  if (target === "icon.symbol" && components.icon) {
    const symbol = getProjectObjectIconSymbol(String(value));

    if (!symbol) {
      return components;
    }

    return {
      ...components,
      icon: {
        ...components.icon,
        symbol
      }
    };
  }

  if (target === "text.color" && components.text) {
    return {
      ...components,
      text: {
        ...components.text,
        color: String(value)
      }
    };
  }

  if (target === "text.content" && components.text) {
    return {
      ...components,
      text: {
        ...components.text,
        content: String(value)
      }
    };
  }

  return components;
}
