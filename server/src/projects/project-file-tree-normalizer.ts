import type {
  Project,
  ProjectFileKind,
  ProjectFileNode,
  ProjectObjectSourceRef,
  ProjectObjectTemplate,
  ProjectObjectVariableDefinition,
  ProjectObjectVariableType,
  ProjectObjectVariableValue,
  ProjectTableSetup,
  ProjectTableSetupItem,
  ProjectTableSetupItemTransform
} from "@bg-maker/shared";
import {
  getDefaultProjectTableSetup,
  getDefaultProjectTableSetupGrid,
  getDefaultProjectTableSetupItemTransform,
  getDefaultProjectObjectVariableValue,
  projectAssetsFolderId,
  projectAssetsFolderName,
  projectObjectVariableTypes,
  projectTableSetupGridSizeLimits,
  projectTableSetupSizeLimits
} from "@bg-maker/shared";
import { normalizeProjectImageAsset } from "./project-image-assets.js";
import {
  ensureProjectObjectFileRoot,
  normalizeProjectObjectTree
} from "./project-object-tree-normalizer.js";
import { ProjectValidationError } from "./project-validation-error.js";
import {
  normalizeFiniteNumber,
  normalizeHexColor,
  normalizeIntegerNumber
} from "./project-normalization-utils.js";

const maxProjectFileTreeDepth = 12;
const maxProjectFileTreeNodes = 500;
const maxProjectObjectSourceValueCount = 100;
const maxProjectObjectVariableCount = 100;
const maxProjectObjectVariableNameLength = 80;
const maxProjectObjectVariableTextValueLength = 2000;
const maxProjectTableSetupItemCount = 1000;
const projectFileKinds = new Set<ProjectFileKind>(["tableSetup", "object", "image", "document"]);
const projectObjectVariableTypeSet = new Set<ProjectObjectVariableType>(projectObjectVariableTypes);

export function normalizeStoredProject(value: unknown): Project | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const project = value as Partial<Record<keyof Project, unknown>>;
  const {
    id,
    name,
    description,
    createdAt,
    updatedAt,
    tableSetupsCount,
    objectsCount,
    playtestsCount,
    notes,
    fileTree
  } = project;

  const hasProjectShape =
    typeof id === "string" &&
    typeof name === "string" &&
    typeof description === "string" &&
    typeof createdAt === "string" &&
    typeof updatedAt === "string" &&
    typeof tableSetupsCount === "number" &&
    typeof objectsCount === "number" &&
    typeof playtestsCount === "number" &&
    typeof notes === "string";

  if (!hasProjectShape) {
    return null;
  }

  return {
    id,
    name,
    description,
    createdAt,
    updatedAt,
    tableSetupsCount,
    objectsCount,
    playtestsCount,
    notes,
    fileTree: Array.isArray(fileTree)
      ? normalizeStoredProjectFileTree(fileTree)
      : createDefaultProjectFileTree()
  };
}

export function createDefaultProjectFileTree(): ProjectFileNode[] {
  return [
    {
      id: "table-setups",
      name: "Table setups",
      type: "folder",
      children: []
    },
    {
      id: "objects",
      name: "Objects",
      type: "folder",
      children: []
    },
    {
      id: projectAssetsFolderId,
      name: projectAssetsFolderName,
      type: "folder",
      children: []
    }
  ];
}

export function normalizeProjectFileTree(value: unknown): ProjectFileNode[] {
  if (!Array.isArray(value)) {
    throw new ProjectValidationError("Project file tree must be an array");
  }

  const nodeIds = new Set<string>();
  const nodeCount = { value: 0 };

  return ensureProjectAssetsFolder(
    value.map((node) => normalizeProjectFileNode(node, 0, nodeIds, nodeCount))
  );
}

function normalizeStoredProjectFileTree(value: unknown): ProjectFileNode[] {
  try {
    return normalizeProjectFileTree(value);
  } catch {
    return [];
  }
}

function ensureProjectAssetsFolder(fileTree: ProjectFileNode[]): ProjectFileNode[] {
  const { assetsNode, fileTree: fileTreeWithoutAssets } = extractProjectAssetsFolder(fileTree);

  if (assetsNode && assetsNode.type !== "folder") {
    throw new ProjectValidationError("Project assets folder is invalid");
  }

  return [
    ...fileTreeWithoutAssets,
    {
      id: projectAssetsFolderId,
      name: projectAssetsFolderName,
      type: "folder",
      children: assetsNode?.children ?? []
    }
  ];
}

function extractProjectAssetsFolder(fileTree: ProjectFileNode[]): {
  assetsNode?: ProjectFileNode;
  fileTree: ProjectFileNode[];
} {
  let assetsNode: ProjectFileNode | undefined;
  const nextFileTree = fileTree.reduce<ProjectFileNode[]>((nodes, node) => {
    if (node.id === projectAssetsFolderId) {
      assetsNode = node;
      return nodes;
    }

    if (node.type === "folder") {
      const extractedChildren = extractProjectAssetsFolder(node.children ?? []);

      if (extractedChildren.assetsNode) {
        assetsNode = extractedChildren.assetsNode;
      }

      nodes.push({
        ...node,
        children: extractedChildren.fileTree
      });

      return nodes;
    }

    nodes.push(node);

    return nodes;
  }, []);

  return {
    assetsNode,
    fileTree: nextFileTree
  };
}

function normalizeProjectFileNode(
  value: unknown,
  depth: number,
  nodeIds: Set<string>,
  nodeCount: { value: number }
): ProjectFileNode {
  if (!value || typeof value !== "object") {
    throw new ProjectValidationError("Project file tree nodes must be objects");
  }

  if (depth > maxProjectFileTreeDepth) {
    throw new ProjectValidationError("Project file tree is too deeply nested");
  }

  nodeCount.value += 1;

  if (nodeCount.value > maxProjectFileTreeNodes) {
    throw new ProjectValidationError("Project file tree has too many nodes");
  }

  const record = value as Partial<Record<keyof ProjectFileNode, unknown>>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (!id) {
    throw new ProjectValidationError("Project file tree node id is required");
  }

  if (nodeIds.has(id)) {
    throw new ProjectValidationError("Project file tree node ids must be unique");
  }

  if (!name) {
    throw new ProjectValidationError("Project file tree node name is required");
  }

  if (record.type !== "folder" && record.type !== "file") {
    throw new ProjectValidationError("Project file tree node type is invalid");
  }

  nodeIds.add(id);

  if (record.type === "folder") {
    const children = Array.isArray(record.children)
      ? record.children.map((child) =>
          normalizeProjectFileNode(child, depth + 1, nodeIds, nodeCount)
        )
      : [];

    return {
      id,
      name,
      type: "folder",
      children
    };
  }

  const kind = projectFileKinds.has(record.kind as ProjectFileKind)
    ? (record.kind as ProjectFileKind)
    : "document";
  const sourceRef = kind === "object" ? normalizeProjectObjectSourceRef(record.sourceRef) : null;
  const objectTree =
    kind === "tableSetup"
      ? {
          tableSetup: normalizeProjectTableSetup(record.tableSetup)
        }
      : kind === "object" && sourceRef
        ? {
            sourceRef
          }
        : kind === "object"
          ? {
              objectTree: ensureProjectObjectFileRoot(
                Array.isArray(record.objectTree)
                  ? normalizeProjectObjectTree(record.objectTree)
                  : [],
                id,
                name
              ),
              ...normalizeProjectObjectTemplateField(record.template)
            }
          : {};
  const imageAsset = kind === "image" ? normalizeProjectImageAsset(record.imageAsset) : undefined;

  return {
    id,
    name,
    type: "file",
    kind,
    ...(imageAsset ? { imageAsset } : {}),
    ...objectTree
  };
}

function normalizeProjectTableSetup(value: unknown): ProjectTableSetup {
  const defaultTableSetup = getDefaultProjectTableSetup();
  const defaultGrid = getDefaultProjectTableSetupGrid();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const grid =
    record.grid && typeof record.grid === "object" ? (record.grid as Record<string, unknown>) : {};

  return {
    backgroundColor: normalizeHexColor(record.backgroundColor, defaultTableSetup.backgroundColor),
    grid: {
      size: normalizeIntegerNumber(grid.size, defaultGrid.size, projectTableSetupGridSizeLimits),
      snap: grid.snap === true,
      visible: grid.visible !== false
    },
    height: normalizeIntegerNumber(
      record.height,
      defaultTableSetup.height,
      projectTableSetupSizeLimits
    ),
    items: normalizeProjectTableSetupItems(record.items),
    width: normalizeIntegerNumber(
      record.width,
      defaultTableSetup.width,
      projectTableSetupSizeLimits
    )
  };
}

function normalizeProjectTableSetupItems(value: unknown): ProjectTableSetupItem[] {
  const items = Array.isArray(value) ? value : [];
  const itemIds = new Set<string>();
  const normalizedItems: ProjectTableSetupItem[] = [];

  for (const item of items.slice(0, maxProjectTableSetupItemCount)) {
    const normalizedItem = normalizeProjectTableSetupItem(item);

    if (!normalizedItem) {
      continue;
    }

    const itemId =
      normalizedItem.type === "linkedObject" ? normalizedItem.id : normalizedItem.object.id;

    if (itemIds.has(itemId)) {
      continue;
    }

    itemIds.add(itemId);
    normalizedItems.push(normalizedItem);
  }

  return normalizedItems;
}

function normalizeProjectTableSetupItem(value: unknown): ProjectTableSetupItem | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  if (record.type === "linkedObject") {
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const sourceObjectFileNodeId =
      typeof record.sourceObjectFileNodeId === "string" ? record.sourceObjectFileNodeId.trim() : "";

    if (!id || !sourceObjectFileNodeId) {
      return null;
    }

    return {
      id,
      name: name || "Linked object",
      sourceObjectFileNodeId,
      transform: normalizeProjectTableSetupItemTransform(record.transform),
      type: "linkedObject",
      values: normalizeLooseProjectObjectVariableValues(record.values),
      visible: record.visible !== false
    };
  }

  if (record.type === "localObject") {
    try {
      const objectTree = normalizeProjectObjectTree([record.object]);
      const object = objectTree[0];

      return object ? { object, type: "localObject" } : null;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeProjectTableSetupItemTransform(value: unknown): ProjectTableSetupItemTransform {
  const defaultTransform = getDefaultProjectTableSetupItemTransform();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    rotation: normalizeFiniteNumber(record.rotation, defaultTransform.rotation, {
      max: 360000,
      min: -360000
    }),
    scaleX: normalizeFiniteNumber(record.scaleX, defaultTransform.scaleX, {
      max: 100,
      min: 0.01
    }),
    scaleY: normalizeFiniteNumber(record.scaleY, defaultTransform.scaleY, {
      max: 100,
      min: 0.01
    }),
    x: normalizeFiniteNumber(record.x, defaultTransform.x, {
      max: 100000,
      min: -100000
    }),
    y: normalizeFiniteNumber(record.y, defaultTransform.y, {
      max: 100000,
      min: -100000
    })
  };
}

function normalizeProjectObjectTemplateField(value: unknown): {
  template?: ProjectObjectTemplate;
} {
  const template = normalizeProjectObjectTemplate(value);

  return template.variables.length ? { template } : {};
}

function normalizeProjectObjectTemplate(value: unknown): ProjectObjectTemplate {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const variables = normalizeProjectObjectVariableDefinitions(record.variables);

  return {
    variables
  };
}

function normalizeProjectObjectVariableDefinitions(
  value: unknown
): ProjectObjectVariableDefinition[] {
  const variables = Array.isArray(value) ? value : [];
  const variableIds = new Set<string>();
  const normalizedVariables: ProjectObjectVariableDefinition[] = [];

  for (const variable of variables.slice(0, maxProjectObjectVariableCount)) {
    const record =
      variable && typeof variable === "object" ? (variable as Record<string, unknown>) : {};
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const type = projectObjectVariableTypeSet.has(record.type as ProjectObjectVariableType)
      ? (record.type as ProjectObjectVariableType)
      : "text";

    if (!id || variableIds.has(id)) {
      continue;
    }

    variableIds.add(id);
    normalizedVariables.push({
      id,
      name: (name || "Property").slice(0, maxProjectObjectVariableNameLength),
      type,
      defaultValue: normalizeProjectObjectVariableValue(record.defaultValue, type)
    });
  }

  return normalizedVariables;
}

function normalizeProjectObjectSourceRef(value: unknown): ProjectObjectSourceRef | null {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sourceObjectFileNodeId =
    typeof record.sourceObjectFileNodeId === "string" ? record.sourceObjectFileNodeId.trim() : "";

  if (!sourceObjectFileNodeId) {
    return null;
  }

  return {
    sourceObjectFileNodeId,
    values: normalizeLooseProjectObjectVariableValues(record.values)
  };
}

function normalizeLooseProjectObjectVariableValues(
  value: unknown
): Record<string, ProjectObjectVariableValue> {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const values: Record<string, ProjectObjectVariableValue> = {};

  for (const [key, rawValue] of Object.entries(record).slice(0, maxProjectObjectSourceValueCount)) {
    const variableId = key.trim();

    if (!variableId) {
      continue;
    }

    values[variableId] =
      typeof rawValue === "number"
        ? normalizeFiniteNumber(rawValue, 0, {
            max: Number.MAX_SAFE_INTEGER,
            min: -Number.MAX_SAFE_INTEGER
          })
        : String(rawValue ?? "").slice(0, maxProjectObjectVariableTextValueLength);
  }

  return values;
}

function normalizeProjectObjectVariableValue(
  value: unknown,
  type: ProjectObjectVariableType
): ProjectObjectVariableValue {
  if (type === "number") {
    return normalizeFiniteNumber(value, Number(getDefaultProjectObjectVariableValue(type)), {
      max: Number.MAX_SAFE_INTEGER,
      min: -Number.MAX_SAFE_INTEGER
    });
  }

  if (type === "color") {
    return normalizeHexColor(value, String(getDefaultProjectObjectVariableValue(type)));
  }

  return String(value ?? getDefaultProjectObjectVariableValue(type)).slice(
    0,
    maxProjectObjectVariableTextValueLength
  );
}
