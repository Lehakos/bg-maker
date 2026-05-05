import type {
  ProjectFileNode,
  ProjectObjectNode,
  ProjectObjectTemplate,
  ProjectObjectVariableDefinition,
  ProjectObjectVariableValue,
  ProjectTableSetup,
  ProjectTableSetupItem,
  ProjectTableSetupLinkedObjectItem
} from "@bg-maker/shared";
import {
  getProjectObjectVariableDefaultValues,
  getProjectTableSetupItemId,
  resolveProjectObjectFileObjectTree,
  resolveProjectObjectTreeVariables,
  resolveProjectTableSetupItemObject
} from "@bg-maker/shared";
import {
  appendProjectFileNode,
  findProjectFileNode,
  findProjectFileNodeLocation,
  updateProjectFileNode
} from "../project-files/project-file-tree";
import {
  clearProjectObjectTreeActiveSides,
  cloneProjectObjectNode,
  findProjectObjectNode,
  getProjectObjectNodeRectTransform
} from "../project-objects/project-object-tree";
import { getProjectFileNodeTableSetup } from "../project-table-setup/project-table-setup";

export type ProjectVariantFileTreeResult = {
  fileTree: ProjectFileNode[];
  selectedFileNodeId?: string;
  selectedObjectId?: string;
  selectedTableSetupItemId?: string;
};

export type ParsedVariantImportRow = {
  errors: string[];
  name: string;
  rowNumber: number;
  values: Record<string, ProjectObjectVariableValue>;
};

export type ParsedVariantImportTable = {
  errors: string[];
  headers: string[];
  rows: ParsedVariantImportRow[];
};

export type ProjectVariantImageAssetReference = {
  fileName: string;
  folderPath: string;
  id: string;
  name: string;
  path: string;
};

export function createReusableObjectFromSelection({
  fileTree,
  name,
  objectFileNodeId,
  objectId
}: {
  fileTree: ProjectFileNode[];
  name: string;
  objectFileNodeId: string;
  objectId: string;
}): ProjectVariantFileTreeResult | null {
  const location = findProjectFileNodeLocation(fileTree, objectFileNodeId);
  const fileNode = location?.node;

  if (!location || fileNode?.type !== "file" || fileNode.kind !== "object" || fileNode.sourceRef) {
    return null;
  }

  const objectTree = fileNode.objectTree ?? [];
  const selectedObject = findProjectObjectNode(objectTree, objectId);

  if (!selectedObject) {
    return null;
  }

  const reusableName = normalizeVariantObjectName(name, selectedObject.name);
  const rootObject = objectTree[0];
  const selectedIsRoot = objectTree.length === 1 && rootObject?.id === selectedObject.id;
  const reusableObject = selectedIsRoot
    ? cloneProjectObjectForReusable(selectedObject, reusableName)
    : cloneProjectObjectForReusable(
        getDetachedProjectObjectNode(
          getResolvedObjectNodeForReusableChild(objectTree, fileNode.template, selectedObject.id) ??
            selectedObject
        ),
        reusableName
      );
  const reusableFileNode = createObjectFileNode({
    name: reusableName,
    object: reusableObject,
    template: selectedIsRoot ? fileNode.template : undefined
  });

  let nextFileTree = appendProjectFileNode(fileTree, location.parentId, reusableFileNode);

  if (selectedIsRoot) {
    nextFileTree = updateProjectFileNode(nextFileTree, fileNode.id, (node) => {
      if (node.kind !== "object") {
        return node;
      }

      const linkedNode = {
        ...node,
        sourceRef: {
          sourceObjectFileNodeId: reusableFileNode.id,
          values: {}
        }
      };
      delete linkedNode.objectTree;
      delete linkedNode.template;

      return linkedNode;
    });
  }

  return {
    fileTree: nextFileTree,
    selectedFileNodeId: fileNode.id,
    selectedObjectId: selectedIsRoot ? reusableObject.id : selectedObject.id
  };
}

export function saveTableLocalObjectAsReusable({
  fileTree,
  itemId,
  name,
  tableSetupFileNodeId
}: {
  fileTree: ProjectFileNode[];
  itemId: string;
  name: string;
  tableSetupFileNodeId: string;
}): ProjectVariantFileTreeResult | null {
  const location = findProjectFileNodeLocation(fileTree, tableSetupFileNodeId);
  const fileNode = location?.node;
  const tableSetup = getProjectFileNodeTableSetup(fileNode);
  const item = tableSetup?.items.find(
    (candidate): candidate is Extract<ProjectTableSetupItem, { type: "localObject" }> =>
      candidate.type === "localObject" && getProjectTableSetupItemId(candidate) === itemId
  );

  if (!location || fileNode?.kind !== "tableSetup" || !tableSetup || !item) {
    return null;
  }

  const reusableName = normalizeVariantObjectName(name, item.object.name);
  const reusableObject = cloneProjectObjectForReusable(
    getDetachedProjectObjectNode(item.object),
    reusableName
  );
  const reusableFileNode = createObjectFileNode({
    name: reusableName,
    object: reusableObject
  });
  const itemTransform = getProjectObjectNodeRectTransform(item.object);
  const linkedItem: ProjectTableSetupLinkedObjectItem = {
    id: item.object.id,
    locked: item.object.locked === true,
    name: item.object.name,
    sourceObjectFileNodeId: reusableFileNode.id,
    transform: {
      rotation: itemTransform.rotation,
      scaleX: itemTransform.scaleX,
      scaleY: itemTransform.scaleY,
      x: itemTransform.x,
      y: itemTransform.y
    },
    type: "linkedObject",
    values: {},
    visible: item.object.visible
  };
  const nextTableSetup = replaceTableSetupItem(tableSetup, itemId, linkedItem);
  const withUpdatedTableSetup = updateProjectFileNode(fileTree, fileNode.id, (node) =>
    node.kind === "tableSetup" ? { ...node, tableSetup: nextTableSetup } : node
  );

  return {
    fileTree: appendProjectFileNode(withUpdatedTableSetup, location.parentId, reusableFileNode),
    selectedFileNodeId: fileNode.id,
    selectedTableSetupItemId: linkedItem.id
  };
}

export function detachLinkedObjectFile({
  fileTree,
  objectFileNodeId
}: {
  fileTree: ProjectFileNode[];
  objectFileNodeId: string;
}): ProjectVariantFileTreeResult | null {
  const fileNode = findProjectFileNode(fileTree, objectFileNodeId);

  if (fileNode?.type !== "file" || fileNode.kind !== "object" || !fileNode.sourceRef) {
    return null;
  }

  const resolvedTree = resolveProjectObjectFileObjectTree(fileTree, fileNode);

  if (!resolvedTree.length) {
    return null;
  }

  const objectTree = resolvedTree.map((object, index) =>
    getDetachedProjectObjectNode(
      cloneProjectObjectNode(object, { name: index === 0 ? fileNode.name : object.name })
    )
  );
  const nextFileTree = updateProjectFileNode(fileTree, fileNode.id, (node) => {
    if (node.kind !== "object") {
      return node;
    }

    const detachedNode = {
      ...node,
      objectTree
    };
    delete detachedNode.sourceRef;

    return detachedNode;
  });

  return {
    fileTree: nextFileTree,
    selectedFileNodeId: fileNode.id,
    selectedObjectId: objectTree[0]?.id
  };
}

export function detachLinkedTableItem({
  fileTree,
  itemId,
  tableSetupFileNodeId
}: {
  fileTree: ProjectFileNode[];
  itemId: string;
  tableSetupFileNodeId: string;
}): ProjectVariantFileTreeResult | null {
  const fileNode = findProjectFileNode(fileTree, tableSetupFileNodeId);
  const tableSetup = getProjectFileNodeTableSetup(fileNode);
  const item = tableSetup?.items.find(
    (candidate): candidate is Extract<ProjectTableSetupItem, { type: "linkedObject" }> =>
      candidate.type === "linkedObject" && candidate.id === itemId
  );

  if (fileNode?.kind !== "tableSetup" || !tableSetup || !item) {
    return null;
  }

  const resolvedObject = resolveProjectTableSetupItemObject(fileTree, item);

  if (!resolvedObject) {
    return null;
  }

  const detachedObject = {
    ...getDetachedProjectObjectNode(cloneProjectObjectNode(resolvedObject, { name: item.name })),
    id: item.id
  };
  const nextTableSetup = replaceTableSetupItem(tableSetup, item.id, {
    object: detachedObject,
    type: "localObject"
  });
  const nextFileTree = updateProjectFileNode(fileTree, fileNode.id, (node) =>
    node.kind === "tableSetup" ? { ...node, tableSetup: nextTableSetup } : node
  );

  return {
    fileTree: nextFileTree,
    selectedFileNodeId: fileNode.id,
    selectedTableSetupItemId: item.id
  };
}

export function canImportVariantsFromObjectFile(
  fileTree: readonly ProjectFileNode[],
  node: ProjectFileNode | null | undefined
) {
  if (node?.type !== "file" || node.kind !== "object" || node.sourceRef) {
    return false;
  }

  if (!node.template?.variables.length) {
    return false;
  }

  const rootKind = resolveProjectObjectFileObjectTree(fileTree, node)[0]?.kind;

  return rootKind === "card" || rootKind === "token";
}

export function parseVariantImportTable({
  imageAssetReferences = [],
  sourceName,
  table,
  template
}: {
  imageAssetReferences?: readonly ProjectVariantImageAssetReference[];
  sourceName: string;
  table: string;
  template: ProjectObjectTemplate;
}): ParsedVariantImportTable {
  const records = parseDelimitedRecords(table);
  const errors: string[] = [];
  const [headers = [], ...dataRecords] = records;

  if (!headers.length || headers.every((header) => !header.trim())) {
    return {
      errors: ["Add a header row."],
      headers: [],
      rows: []
    };
  }

  const variableColumnIndexes = getVariantImportVariableColumnIndexes(headers, template.variables);
  const nameColumnIndex = getFirstHeaderIndex(headers, ["name", "title"]);
  const firstTextVariable = template.variables.find((variable) => variable.type === "text");
  const rows: ParsedVariantImportRow[] = [];

  for (const [recordIndex, record] of dataRecords.entries()) {
    if (record.every((value) => !value.trim())) {
      continue;
    }

    const rowNumber = recordIndex + 2;
    const values: Record<string, ProjectObjectVariableValue> = {};
    const rowErrors: string[] = [];

    for (const variable of template.variables) {
      const columnIndex = variableColumnIndexes.get(variable.id);
      const rawValue = columnIndex === undefined ? "" : (record[columnIndex] ?? "");
      const valueResult = parseProjectObjectVariableCsvValue({
        imageAssetReferences,
        rawValue,
        variable
      });

      values[variable.id] = valueResult.value;

      if (valueResult.error) {
        rowErrors.push(valueResult.error);
      }
    }

    const nameFromColumn = nameColumnIndex === undefined ? "" : (record[nameColumnIndex] ?? "");
    const nameFromVariable =
      firstTextVariable && typeof values[firstTextVariable.id] === "string"
        ? String(values[firstTextVariable.id])
        : "";

    rows.push({
      errors: rowErrors,
      name: normalizeVariantObjectName(
        nameFromColumn || nameFromVariable,
        `${sourceName} ${rows.length + 1}`
      ),
      rowNumber,
      values
    });
  }

  if (!rows.length) {
    errors.push("Add at least one data row.");
  }

  return {
    errors,
    headers,
    rows
  };
}

export function createLinkedObjectFilesFromVariantRows({
  fileTree,
  rows,
  sourceObjectFileNodeId
}: {
  fileTree: ProjectFileNode[];
  rows: readonly ParsedVariantImportRow[];
  sourceObjectFileNodeId: string;
}): ProjectVariantFileTreeResult | null {
  const location = findProjectFileNodeLocation(fileTree, sourceObjectFileNodeId);
  const sourceNode = location?.node;

  if (
    !location ||
    sourceNode?.type !== "file" ||
    sourceNode.kind !== "object" ||
    sourceNode.sourceRef ||
    !rows.length ||
    rows.some((row) => row.errors.length > 0)
  ) {
    return null;
  }

  let nextFileTree = fileTree;
  let lastCreatedFileNodeId: string | undefined;

  for (const row of rows) {
    const linkedFileNode = createLinkedObjectFileNode({
      name: row.name,
      sourceObjectFileNodeId: sourceNode.id,
      values: row.values
    });

    nextFileTree = appendProjectFileNode(nextFileTree, location.parentId, linkedFileNode);
    lastCreatedFileNodeId = linkedFileNode.id;
  }

  return {
    fileTree: nextFileTree,
    selectedFileNodeId: lastCreatedFileNodeId
  };
}

export function collectProjectImageAssetReferences(
  fileTree: readonly ProjectFileNode[],
  parentPath: readonly string[] = []
): ProjectVariantImageAssetReference[] {
  const imageAssetReferences: ProjectVariantImageAssetReference[] = [];

  for (const node of fileTree) {
    if (node.type === "folder") {
      imageAssetReferences.push(
        ...collectProjectImageAssetReferences(node.children ?? [], [...parentPath, node.name])
      );
      continue;
    }

    if (node.kind === "image" && node.imageAsset) {
      imageAssetReferences.push({
        fileName: node.imageAsset.fileName,
        folderPath: parentPath.join("/"),
        id: node.imageAsset.id,
        name: node.name,
        path: [...parentPath, node.name].join("/")
      });
    }
  }

  return imageAssetReferences;
}

function createObjectFileNode({
  name,
  object,
  template
}: {
  name: string;
  object: ProjectObjectNode;
  template?: ProjectObjectTemplate;
}): ProjectFileNode {
  return {
    id: crypto.randomUUID(),
    kind: "object",
    name: normalizeVariantObjectName(name, "Object"),
    objectTree: [object],
    ...(template ? { template } : {}),
    type: "file"
  };
}

function createLinkedObjectFileNode({
  name,
  sourceObjectFileNodeId,
  values
}: {
  name: string;
  sourceObjectFileNodeId: string;
  values: Record<string, ProjectObjectVariableValue>;
}): ProjectFileNode {
  return {
    id: crypto.randomUUID(),
    kind: "object",
    name: normalizeVariantObjectName(name, "Object"),
    sourceRef: {
      sourceObjectFileNodeId,
      values
    },
    type: "file"
  };
}

function cloneProjectObjectForReusable(object: ProjectObjectNode, name: string) {
  const cleanTree = clearProjectObjectTreeActiveSides([object]);
  const cleanObject = cleanTree[0] ?? object;

  return cloneProjectObjectNode(cleanObject, {
    name: normalizeVariantObjectName(name, cleanObject.name)
  });
}

function getResolvedObjectNodeForReusableChild(
  objectTree: ProjectObjectNode[],
  template: ProjectObjectTemplate | undefined,
  objectId: string
) {
  const resolvedTree = resolveProjectObjectTreeVariables(
    objectTree,
    template,
    getProjectObjectVariableDefaultValues(template)
  );

  return findProjectObjectNode(resolvedTree, objectId);
}

function getDetachedProjectObjectNode(object: ProjectObjectNode): ProjectObjectNode {
  const children = object.children?.map(getDetachedProjectObjectNode);
  const detachedObject = { ...object };
  delete detachedObject.bindings;

  return {
    ...detachedObject,
    ...(children ? { children } : {})
  };
}

function replaceTableSetupItem(
  tableSetup: ProjectTableSetup,
  itemId: string,
  nextItem: ProjectTableSetupItem
): ProjectTableSetup {
  return {
    ...tableSetup,
    items: tableSetup.items.map((item) =>
      getProjectTableSetupItemId(item) === itemId ? nextItem : item
    )
  };
}

function parseProjectObjectVariableCsvValue({
  imageAssetReferences,
  rawValue,
  variable
}: {
  imageAssetReferences: readonly ProjectVariantImageAssetReference[];
  rawValue: string;
  variable: ProjectObjectVariableDefinition;
}): { error?: string; value: ProjectObjectVariableValue } {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return { value: variable.defaultValue };
  }

  if (variable.type === "number") {
    const value = Number(trimmedValue);

    return Number.isFinite(value)
      ? { value }
      : { error: `${variable.name} must be a number.`, value: variable.defaultValue };
  }

  if (variable.type === "color") {
    return /^#[0-9a-fA-F]{6}$/.test(trimmedValue)
      ? { value: trimmedValue.toLowerCase() }
      : { error: `${variable.name} must be a #RRGGBB color.`, value: variable.defaultValue };
  }

  if (variable.type === "image") {
    return resolveProjectImageAssetCsvValue({
      imageAssetReferences,
      rawValue: trimmedValue,
      variable
    });
  }

  return { value: rawValue };
}

function resolveProjectImageAssetCsvValue({
  imageAssetReferences,
  rawValue,
  variable
}: {
  imageAssetReferences: readonly ProjectVariantImageAssetReference[];
  rawValue: string;
  variable: ProjectObjectVariableDefinition;
}): { error?: string; value: ProjectObjectVariableValue } {
  const idMatch = imageAssetReferences.find((imageAsset) => imageAsset.id === rawValue);

  if (idMatch) {
    return { value: idMatch.id };
  }

  const normalizedValue = normalizeImageAssetReferenceKey(rawValue);
  const pathMatches = getUniqueImageAssetReferences(
    imageAssetReferences.filter((imageAsset) =>
      getProjectImageAssetPathKeys(imageAsset).includes(normalizedValue)
    )
  );

  if (pathMatches.length === 1) {
    return { value: pathMatches[0]?.id ?? variable.defaultValue };
  }

  if (pathMatches.length > 1) {
    return {
      error: `${variable.name} matches multiple image assets; use an asset id.`,
      value: variable.defaultValue
    };
  }

  const nameMatches = getUniqueImageAssetReferences(
    imageAssetReferences.filter((imageAsset) =>
      getProjectImageAssetNameKeys(imageAsset).includes(normalizedValue)
    )
  );

  if (nameMatches.length === 1) {
    return { value: nameMatches[0]?.id ?? variable.defaultValue };
  }

  if (nameMatches.length > 1) {
    return {
      error: `${variable.name} matches multiple image assets; use an asset id or full path.`,
      value: variable.defaultValue
    };
  }

  return {
    error: `${variable.name} must reference an existing image asset id or path.`,
    value: variable.defaultValue
  };
}

function getProjectImageAssetPathKeys(imageAsset: ProjectVariantImageAssetReference) {
  const fileNamePath = imageAsset.folderPath
    ? `${imageAsset.folderPath}/${imageAsset.fileName}`
    : imageAsset.fileName;

  return [imageAsset.path, fileNamePath].map(normalizeImageAssetReferenceKey);
}

function getProjectImageAssetNameKeys(imageAsset: ProjectVariantImageAssetReference) {
  return [imageAsset.name, imageAsset.fileName].map(normalizeImageAssetReferenceKey);
}

function getUniqueImageAssetReferences(
  imageAssetReferences: readonly ProjectVariantImageAssetReference[]
) {
  const seenIds = new Set<string>();
  const uniqueReferences: ProjectVariantImageAssetReference[] = [];

  for (const imageAssetReference of imageAssetReferences) {
    if (seenIds.has(imageAssetReference.id)) {
      continue;
    }

    seenIds.add(imageAssetReference.id);
    uniqueReferences.push(imageAssetReference);
  }

  return uniqueReferences;
}

function parseDelimitedRecords(text: string) {
  const delimiter = getDelimitedTextDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
        continue;
      }

      if (character === '"') {
        quoted = false;
        continue;
      }

      field += character;
      continue;
    }

    if (character === '"') {
      quoted = true;
      continue;
    }

    if (character === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (character === "\r") {
      continue;
    }

    field += character;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((record) => record.some((value) => value.trim()));
}

function getDelimitedTextDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";

  return firstLine.includes("\t") ? "\t" : ",";
}

function getVariantImportVariableColumnIndexes(
  headers: readonly string[],
  variables: readonly ProjectObjectVariableDefinition[]
) {
  const headerByKey = new Map(headers.map((header, index) => [normalizeHeaderKey(header), index]));
  const columnIndexes = new Map<string, number>();

  for (const variable of variables) {
    const idIndex = headerByKey.get(normalizeHeaderKey(variable.id));
    const nameIndex = headerByKey.get(normalizeHeaderKey(variable.name));
    const columnIndex = idIndex ?? nameIndex;

    if (columnIndex !== undefined) {
      columnIndexes.set(variable.id, columnIndex);
    }
  }

  return columnIndexes;
}

function getFirstHeaderIndex(headers: readonly string[], keys: readonly string[]) {
  const normalizedKeys = new Set(keys.map(normalizeHeaderKey));

  return headers.findIndex((header) => normalizedKeys.has(normalizeHeaderKey(header))) === -1
    ? undefined
    : headers.findIndex((header) => normalizedKeys.has(normalizeHeaderKey(header)));
}

function normalizeHeaderKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeImageAssetReferenceKey(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "").toLowerCase();
}

function normalizeVariantObjectName(value: string, fallback: string) {
  return value.trim() || fallback.trim() || "Object";
}
