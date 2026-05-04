import type {
  ProjectObjectNode,
  ProjectObjectSourceRef,
  ProjectObjectTemplate,
  ProjectObjectVariableBindingTarget,
  ProjectObjectVariableDefinition,
  ProjectObjectVariableType,
  ProjectObjectVariableValue
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectTemplate,
  getDefaultProjectObjectVariableValue
} from "@bg-maker/shared";

export function createProjectObjectVariable(
  type: ProjectObjectVariableType = "text"
): ProjectObjectVariableDefinition {
  return {
    id: crypto.randomUUID(),
    name: "Property",
    type,
    defaultValue: getDefaultProjectObjectVariableValue(type)
  };
}

export function ensureProjectObjectTemplate(
  template: ProjectObjectTemplate | undefined
): ProjectObjectTemplate {
  return template ?? getDefaultProjectObjectTemplate();
}

export function getProjectObjectTemplateWithAddedVariable(
  template: ProjectObjectTemplate | undefined,
  type: ProjectObjectVariableType = "text"
): ProjectObjectTemplate {
  const currentTemplate = ensureProjectObjectTemplate(template);

  return {
    ...currentTemplate,
    variables: [...currentTemplate.variables, createProjectObjectVariable(type)]
  };
}

export function getProjectObjectTemplateWithUpdatedVariable(
  template: ProjectObjectTemplate | undefined,
  variableId: string,
  updateVariable: (variable: ProjectObjectVariableDefinition) => ProjectObjectVariableDefinition
): ProjectObjectTemplate {
  const currentTemplate = ensureProjectObjectTemplate(template);
  const variables = currentTemplate.variables.map((variable) => {
    if (variable.id !== variableId) {
      return variable;
    }

    const nextVariable = updateVariable(variable);

    return {
      ...nextVariable,
      defaultValue: normalizeProjectObjectVariableValue(
        nextVariable.defaultValue,
        nextVariable.type
      )
    };
  });

  return {
    variables
  };
}

export function getProjectObjectTemplateWithRemovedVariable(
  template: ProjectObjectTemplate | undefined,
  variableId: string
): ProjectObjectTemplate {
  const currentTemplate = ensureProjectObjectTemplate(template);

  return {
    variables: currentTemplate.variables.filter((variable) => variable.id !== variableId)
  };
}

export function getProjectObjectSourceRefWithValue(
  sourceRef: ProjectObjectSourceRef,
  variable: ProjectObjectVariableDefinition,
  value: string
): ProjectObjectSourceRef {
  return {
    ...sourceRef,
    values: {
      ...sourceRef.values,
      [variable.id]: normalizeProjectObjectVariableValue(value, variable.type)
    }
  };
}

export function getProjectObjectLinkedFileDefaultName(sourceName: string) {
  const normalizedName = sourceName.trim() || "Object";
  const templateSuffixMatch = normalizedName.match(/^(.*?)(?:\s+template)$/i);
  const nameWithoutTemplateSuffix = templateSuffixMatch?.[1]?.trim();

  return nameWithoutTemplateSuffix || `${normalizedName} object`;
}

export function getProjectObjectNodeVariableBinding(
  object: ProjectObjectNode,
  target: ProjectObjectVariableBindingTarget
) {
  return object.bindings?.find((binding) => binding.target === target)?.variableId ?? "";
}

export function setProjectObjectNodeVariableBinding(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  target: ProjectObjectVariableBindingTarget,
  variableId: string
): ProjectObjectNode[] {
  const result = setProjectObjectNodeVariableBindingInChildren(
    objectTree,
    nodeId,
    target,
    variableId
  );

  return result.changed ? result.nodes : objectTree;
}

export function getCompatibleProjectObjectVariables(
  template: ProjectObjectTemplate | undefined,
  target: ProjectObjectVariableBindingTarget
) {
  return (template?.variables ?? []).filter((variable) =>
    isProjectObjectVariableTargetCompatible(variable.type, target)
  );
}

export function getProjectObjectVariableInputValue(
  variable: ProjectObjectVariableDefinition,
  values: Record<string, ProjectObjectVariableValue>
) {
  return String(values[variable.id] ?? variable.defaultValue);
}

export function normalizeProjectObjectVariableValue(
  value: string | number,
  type: ProjectObjectVariableType
): ProjectObjectVariableValue {
  if (type === "number") {
    const numberValue = typeof value === "number" ? value : Number(value);

    return Number.isFinite(numberValue) ? numberValue : getDefaultProjectObjectVariableValue(type);
  }

  if (type === "color") {
    const colorValue = String(value).trim();

    return /^#[0-9a-fA-F]{6}$/.test(colorValue)
      ? colorValue.toLowerCase()
      : getDefaultProjectObjectVariableValue(type);
  }

  return String(value);
}

function setProjectObjectNodeVariableBindingInChildren(
  objectTree: ProjectObjectNode[],
  nodeId: string,
  target: ProjectObjectVariableBindingTarget,
  variableId: string
): { changed: boolean; nodes: ProjectObjectNode[] } {
  let changed = false;
  const nodes = objectTree.map((object) => {
    if (object.id === nodeId) {
      changed = true;
      return getProjectObjectNodeWithVariableBinding(object, target, variableId);
    }

    const childResult = setProjectObjectNodeVariableBindingInChildren(
      object.children ?? [],
      nodeId,
      target,
      variableId
    );

    if (childResult.changed) {
      changed = true;
      return {
        ...object,
        children: childResult.nodes
      };
    }

    return object;
  });

  return { changed, nodes };
}

function getProjectObjectNodeWithVariableBinding(
  object: ProjectObjectNode,
  target: ProjectObjectVariableBindingTarget,
  variableId: string
): ProjectObjectNode {
  const nextBindings = [
    ...(object.bindings ?? []).filter((binding) => binding.target !== target),
    ...(variableId ? [{ target, variableId }] : [])
  ];

  return {
    ...object,
    ...(nextBindings.length ? { bindings: nextBindings } : { bindings: undefined })
  };
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
