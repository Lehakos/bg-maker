import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  CreateProjectRequest,
  Project,
  ProjectFileKind,
  ProjectFileNode,
  ProjectImageAsset,
  ProjectImageAssetContentType,
  ProjectObjectAppearance,
  ProjectObjectBorderStyle,
  ProjectObjectCard,
  ProjectObjectCardSide,
  ProjectObjectCardSizePresetValue,
  ProjectObjectImage,
  ProjectObjectImageFit,
  ProjectObjectKind,
  ProjectObjectLayout,
  ProjectObjectLayoutAlignment,
  ProjectObjectLayoutJustification,
  ProjectObjectLayoutMode,
  ProjectObjectNode,
  ProjectObjectComponents,
  ProjectObjectDoubleSide,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectShapePoint,
  ProjectObjectShapeVariant,
  ProjectObjectSideComponents,
  ProjectObjectText,
  ProjectObjectTextAlign,
  ProjectObjectTextFontStyle,
  ProjectObjectTextVerticalAlign,
  ProjectSummary
} from "@bg-maker/shared";
import {
  createDefaultProjectObjectNode,
  getDefaultProjectObjectAppearance,
  getDefaultProjectObjectCard,
  getDefaultProjectObjectDoubleSide,
  getDefaultProjectObjectImage,
  getDefaultProjectObjectLayout,
  getDefaultProjectObjectRectTransform,
  getDefaultProjectObjectShape,
  getDefaultProjectObjectShapePolygonPoints,
  getDefaultProjectObjectText,
  getProjectObjectCardSizePreset,
  getProjectObjectRectTransformWithCardSizePreset,
  projectAssetsFolderId,
  projectAssetsFolderName,
  projectObjectCardCustomSizePresetId,
  projectObjectCardSides,
  projectImageAssetContentTypes,
  projectObjectKinds as sharedProjectObjectKinds,
  projectObjectShapePolygonCoordinateLimits,
  projectObjectShapePolygonPointCountLimits
} from "@bg-maker/shared";
import sharp from "sharp";

type ProjectStoreData = {
  projects: Project[];
};

type ProjectServiceOptions = {
  storePath?: string;
};

export type CreateProjectImageAssetRequest = {
  contentType: string;
  data: Buffer;
  fileName: string;
};

export type ProjectImageAssetContent = {
  data: Buffer;
  imageAsset: ProjectImageAsset;
};

type OptimizedProjectImageAsset = {
  contentType: ProjectImageAssetContentType;
  data: Buffer;
};

const defaultDataDirectory = join(process.cwd(), ".bg-maker");
export const maxProjectImageAssetBytes = 10 * 1024 * 1024;
const maxProjectImageAssetDimension = 4096;
const maxProjectFileTreeDepth = 12;
const maxProjectFileTreeNodes = 500;
const maxProjectObjectTreeDepth = 24;
const maxProjectObjectTreeNodes = 1000;
const maxProjectObjectAppearanceSize = 1000;
const maxProjectObjectCoordinate = 10000;
const maxProjectObjectDimension = 10000;
const maxProjectObjectLayoutColumns = 24;
const maxProjectObjectLayoutGap = 10000;
const maxProjectObjectOpacity = 1;
const maxProjectObjectRotation = 3600;
const maxProjectObjectScale = 8;
const maxProjectTextContentLength = 2000;
const maxProjectTextFontSize = 512;
const maxProjectTextFontWeight = 900;
const maxProjectTextLineHeight = 4;
const minProjectTextFontSize = 1;
const minProjectTextFontWeight = 100;
const minProjectTextLineHeight = 0.5;
const minProjectObjectDimension = 1;
const minProjectObjectOpacity = 0;
const minProjectObjectScale = 0.1;
const optimizedProjectImageAssetContentType = "image/webp";
const projectImageAssetContentTypeSet = new Set<ProjectImageAssetContentType>(
  projectImageAssetContentTypes
);
const projectObjectBorderStyles = new Set<ProjectObjectBorderStyle>([
  "none",
  "solid",
  "dashed",
  "dotted"
]);
const projectObjectImageFits = new Set<ProjectObjectImageFit>([
  "contain",
  "cover",
  "fill",
  "scaleDown"
]);
const projectFileKinds = new Set<ProjectFileKind>(["tableSetup", "object", "image", "document"]);
const projectObjectKinds = new Set<ProjectObjectKind>(sharedProjectObjectKinds);
const projectObjectCardSideSet = new Set<ProjectObjectCardSide>(projectObjectCardSides);
const projectObjectLayoutAlignments = new Set<ProjectObjectLayoutAlignment>([
  "center",
  "end",
  "start"
]);
const projectObjectLayoutJustifications = new Set<ProjectObjectLayoutJustification>([
  "center",
  "end",
  "spaceBetween",
  "start"
]);
const projectObjectLayoutModes = new Set<ProjectObjectLayoutMode>([
  "free",
  "grid",
  "horizontal",
  "vertical"
]);
const projectObjectShapeVariants = new Set<ProjectObjectShapeVariant>([
  "diamond",
  "ellipse",
  "hexagon",
  "polygon",
  "rectangle",
  "triangle"
]);
const projectObjectTextAligns = new Set<ProjectObjectTextAlign>(["center", "left", "right"]);
const projectObjectTextFontStyles = new Set<ProjectObjectTextFontStyle>(["italic", "normal"]);
const projectObjectTextVerticalAligns = new Set<ProjectObjectTextVerticalAlign>([
  "bottom",
  "middle",
  "top"
]);

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export class ProjectService {
  constructor(
    private readonly storePath: string,
    private readonly imageAssetDirectory = join(dirname(storePath), "image-assets")
  ) {}

  async listProjects(): Promise<ProjectSummary[]> {
    const store = await this.readStore();

    return store.projects
      .map(toProjectSummary)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getProject(projectId: string): Promise<Project | null> {
    const store = await this.readStore();

    return store.projects.find((project) => project.id === projectId) ?? null;
  }

  async createProject(request: CreateProjectRequest): Promise<Project> {
    const name = request.name.trim();

    if (!name) {
      throw new ProjectValidationError("Project name is required");
    }

    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name,
      description: request.description?.trim() ?? "",
      createdAt: now,
      updatedAt: now,
      tableSetupsCount: 0,
      objectsCount: 0,
      playtestsCount: 0,
      notes: "",
      fileTree: createDefaultProjectFileTree()
    };

    const store = await this.readStore();
    await this.writeStore({
      projects: [project, ...store.projects]
    });

    return project;
  }

  async updateProjectFileTree(projectId: string, fileTree: unknown): Promise<Project | null> {
    const normalizedFileTree = normalizeProjectFileTree(fileTree);
    const store = await this.readStore();
    const projectIndex = store.projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      return null;
    }

    const project = store.projects[projectIndex];
    const removedImageAssetIds = getRemovedProjectImageAssetIds(
      project.fileTree,
      normalizedFileTree
    );
    const updatedProject: Project = {
      ...project,
      fileTree: normalizedFileTree,
      updatedAt: new Date().toISOString()
    };
    const projects = [...store.projects];
    projects[projectIndex] = updatedProject;

    await this.writeStore({ projects });
    await Promise.all(
      removedImageAssetIds.map((assetId) =>
        rm(this.getProjectImageAssetPath(project.id, assetId), { force: true })
      )
    );

    return updatedProject;
  }

  async createProjectImageAsset(
    projectId: string,
    request: CreateProjectImageAssetRequest
  ): Promise<ProjectImageAsset | null> {
    const store = await this.readStore();
    const project = store.projects.find((item) => item.id === projectId);

    if (!project) {
      return null;
    }

    if (!Buffer.isBuffer(request.data) || request.data.byteLength === 0) {
      throw new ProjectValidationError("Image asset data is required");
    }

    if (request.data.byteLength > maxProjectImageAssetBytes) {
      throw new ProjectValidationError("Image asset is too large");
    }

    const optimizedImageAsset = await optimizeProjectImageAsset(request);
    const imageAsset: ProjectImageAsset = {
      id: randomUUID(),
      fileName: normalizeProjectImageAssetFileName(request.fileName),
      contentType: optimizedImageAsset.contentType,
      byteSize: optimizedImageAsset.data.byteLength,
      createdAt: new Date().toISOString()
    };

    await mkdir(this.getProjectImageAssetDirectory(project.id), { recursive: true });
    await writeFile(
      this.getProjectImageAssetPath(project.id, imageAsset.id),
      optimizedImageAsset.data
    );

    return imageAsset;
  }

  async getProjectImageAsset(
    projectId: string,
    assetId: string
  ): Promise<ProjectImageAssetContent | null> {
    if (!isSafeProjectImageAssetId(assetId)) {
      return null;
    }

    const store = await this.readStore();
    const project = store.projects.find((item) => item.id === projectId);

    if (!project) {
      return null;
    }

    const imageAsset = findProjectImageAsset(project.fileTree, assetId);

    if (!imageAsset) {
      return null;
    }

    try {
      return {
        data: await readFile(this.getProjectImageAssetPath(project.id, imageAsset.id)),
        imageAsset
      };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  private async readStore(): Promise<ProjectStoreData> {
    try {
      const rawStore = await readFile(this.storePath, "utf8");
      const parsedStore = JSON.parse(rawStore) as Partial<ProjectStoreData>;

      return {
        projects: Array.isArray(parsedStore.projects)
          ? parsedStore.projects.map(normalizeProject).filter((project) => project !== null)
          : []
      };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { projects: [] };
      }

      throw error;
    }
  }

  private async writeStore(store: ProjectStoreData): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });

    const temporaryStorePath = `${this.storePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
    await writeFile(temporaryStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(temporaryStorePath, this.storePath);
  }

  private getProjectImageAssetDirectory(projectId: string) {
    return join(this.imageAssetDirectory, projectId);
  }

  private getProjectImageAssetPath(projectId: string, assetId: string) {
    return join(this.getProjectImageAssetDirectory(projectId), assetId);
  }
}

export function createProjectService(options: ProjectServiceOptions = {}) {
  const storePath =
    options.storePath ??
    process.env.BGM_PROJECT_STORE_PATH ??
    join(process.env.BGM_DATA_DIR ?? defaultDataDirectory, "projects.json");

  return new ProjectService(storePath);
}

function toProjectSummary(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    tableSetupsCount: project.tableSetupsCount,
    objectsCount: project.objectsCount,
    playtestsCount: project.playtestsCount
  };
}

function normalizeProject(value: unknown): Project | null {
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

function normalizeStoredProjectFileTree(value: unknown): ProjectFileNode[] {
  try {
    return normalizeProjectFileTree(value);
  } catch {
    return [];
  }
}

function createDefaultProjectFileTree(): ProjectFileNode[] {
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

function normalizeProjectFileTree(value: unknown): ProjectFileNode[] {
  if (!Array.isArray(value)) {
    throw new ProjectValidationError("Project file tree must be an array");
  }

  const nodeIds = new Set<string>();
  const nodeCount = { value: 0 };

  return ensureProjectAssetsFolder(
    value.map((node) => normalizeProjectFileNode(node, 0, nodeIds, nodeCount))
  );
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
  const objectTree =
    kind === "tableSetup"
      ? {
          objectTree: Array.isArray(record.objectTree)
            ? normalizeProjectObjectTree(record.objectTree)
            : []
        }
      : kind === "object"
        ? {
            objectTree: ensureProjectObjectFileRoot(
              Array.isArray(record.objectTree) ? normalizeProjectObjectTree(record.objectTree) : [],
              id,
              name
            )
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

function ensureProjectObjectFileRoot(
  objectTree: ProjectObjectNode[],
  fileNodeId: string,
  fileNodeName: string
): ProjectObjectNode[] {
  if (objectTree.length > 0) {
    return objectTree;
  }

  return [createDefaultProjectObjectNode(`${fileNodeId}:root`, "group", fileNodeName)];
}

function normalizeProjectObjectTree(value: unknown): ProjectObjectNode[] {
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
  const cardSide = projectObjectCardSideSet.has(record.cardSide as ProjectObjectCardSide)
    ? (record.cardSide as ProjectObjectCardSide)
    : undefined;

  return {
    ...(cardSide ? { cardSide } : {}),
    id,
    name,
    kind,
    visible: record.visible !== false,
    components: normalizeProjectObjectComponents(record.components, kind, name),
    children: Array.isArray(record.children)
      ? record.children.map((child) =>
          normalizeProjectObjectNode(child, depth + 1, nodeIds, nodeCount)
        )
      : []
  };
}

function normalizeProjectObjectComponents(value: unknown, kind: ProjectObjectKind, name: string) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rectTransform = normalizeProjectObjectRectTransform(record.rectTransform, kind);
  const components: ProjectObjectComponents = {
    appearance: normalizeProjectObjectAppearance(record.appearance, kind),
    rectTransform
  };

  if (kind === "card" || hasOwnRecordKey(record, "doubleSide")) {
    components.doubleSide = normalizeProjectObjectDoubleSide(record.doubleSide, kind, name);
  }

  if (kind === "group") {
    return {
      ...components,
      layout: normalizeProjectObjectLayout(record.layout)
    };
  }

  if (kind === "card") {
    const card = normalizeProjectObjectCard(record.card);

    return {
      ...components,
      card,
      layout: normalizeProjectObjectLayout(record.layout),
      rectTransform: getProjectObjectRectTransformWithCardSizePreset(rectTransform, card)
    };
  }

  if (kind === "label") {
    return {
      ...components,
      text: normalizeProjectObjectText(record.text, kind, name)
    };
  }

  if (kind === "image") {
    return {
      ...components,
      image: normalizeProjectObjectImage(record.image)
    };
  }

  if (kind === "shape") {
    return {
      ...components,
      shape: normalizeProjectObjectShape(record.shape)
    };
  }

  return components;
}

function normalizeProjectObjectRectTransform(
  value: unknown,
  kind: ProjectObjectKind
): ProjectObjectRectTransform {
  const defaultRectTransform = getDefaultProjectObjectRectTransform(kind);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    height: normalizeFiniteNumber(record.height, defaultRectTransform.height, {
      max: maxProjectObjectDimension,
      min: minProjectObjectDimension
    }),
    pivotX: normalizeFiniteNumber(record.pivotX, defaultRectTransform.pivotX, {
      max: 1,
      min: 0
    }),
    pivotY: normalizeFiniteNumber(record.pivotY, defaultRectTransform.pivotY, {
      max: 1,
      min: 0
    }),
    rotation: normalizeFiniteNumber(record.rotation, defaultRectTransform.rotation, {
      max: maxProjectObjectRotation,
      min: -maxProjectObjectRotation
    }),
    scaleX: normalizeFiniteNumber(record.scaleX, defaultRectTransform.scaleX, {
      max: maxProjectObjectScale,
      min: minProjectObjectScale
    }),
    scaleY: normalizeFiniteNumber(record.scaleY, defaultRectTransform.scaleY, {
      max: maxProjectObjectScale,
      min: minProjectObjectScale
    }),
    width: normalizeFiniteNumber(record.width, defaultRectTransform.width, {
      max: maxProjectObjectDimension,
      min: minProjectObjectDimension
    }),
    x: normalizeFiniteNumber(record.x, defaultRectTransform.x, {
      max: maxProjectObjectCoordinate,
      min: -maxProjectObjectCoordinate
    }),
    y: normalizeFiniteNumber(record.y, defaultRectTransform.y, {
      max: maxProjectObjectCoordinate,
      min: -maxProjectObjectCoordinate
    })
  };
}

function normalizeProjectObjectAppearance(
  value: unknown,
  kind: ProjectObjectKind
): ProjectObjectAppearance {
  const defaultAppearance = getDefaultProjectObjectAppearance(kind);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    backgroundColor: normalizeHexColor(record.backgroundColor, defaultAppearance.backgroundColor),
    backgroundOpacity: normalizeFiniteNumber(
      record.backgroundOpacity,
      typeof record.backgroundVisible === "boolean"
        ? Number(record.backgroundVisible)
        : defaultAppearance.backgroundOpacity,
      {
        max: maxProjectObjectOpacity,
        min: minProjectObjectOpacity
      }
    ),
    borderColor: normalizeHexColor(record.borderColor, defaultAppearance.borderColor),
    borderRadius: normalizeFiniteNumber(record.borderRadius, defaultAppearance.borderRadius, {
      max: maxProjectObjectAppearanceSize,
      min: 0
    }),
    borderStyle: projectObjectBorderStyles.has(record.borderStyle as ProjectObjectBorderStyle)
      ? (record.borderStyle as ProjectObjectBorderStyle)
      : defaultAppearance.borderStyle,
    borderWidth: normalizeFiniteNumber(record.borderWidth, defaultAppearance.borderWidth, {
      max: maxProjectObjectAppearanceSize,
      min: 0
    }),
    opacity: normalizeFiniteNumber(record.opacity, defaultAppearance.opacity, {
      max: maxProjectObjectOpacity,
      min: minProjectObjectOpacity
    }),
    padding: normalizeFiniteNumber(record.padding, defaultAppearance.padding, {
      max: maxProjectObjectAppearanceSize,
      min: 0
    })
  };
}

function normalizeProjectObjectLayout(value: unknown): ProjectObjectLayout {
  const defaultLayout = getDefaultProjectObjectLayout();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    alignItems: projectObjectLayoutAlignments.has(record.alignItems as ProjectObjectLayoutAlignment)
      ? (record.alignItems as ProjectObjectLayoutAlignment)
      : defaultLayout.alignItems,
    columns: normalizeFiniteNumber(record.columns, defaultLayout.columns, {
      max: maxProjectObjectLayoutColumns,
      min: 1
    }),
    gap: normalizeFiniteNumber(record.gap, defaultLayout.gap, {
      max: maxProjectObjectLayoutGap,
      min: 0
    }),
    justifyContent: projectObjectLayoutJustifications.has(
      record.justifyContent as ProjectObjectLayoutJustification
    )
      ? (record.justifyContent as ProjectObjectLayoutJustification)
      : defaultLayout.justifyContent,
    mode: projectObjectLayoutModes.has(record.mode as ProjectObjectLayoutMode)
      ? (record.mode as ProjectObjectLayoutMode)
      : defaultLayout.mode
  };
}

function normalizeProjectObjectCard(value: unknown): ProjectObjectCard {
  const defaultCard = getDefaultProjectObjectCard();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sizePreset =
    typeof record.sizePreset === "string" &&
    (record.sizePreset === projectObjectCardCustomSizePresetId ||
      getProjectObjectCardSizePreset(record.sizePreset))
      ? (record.sizePreset as ProjectObjectCardSizePresetValue)
      : defaultCard.sizePreset;
  const activeSide = projectObjectCardSideSet.has(record.activeSide as ProjectObjectCardSide)
    ? (record.activeSide as ProjectObjectCardSide)
    : defaultCard.activeSide;

  return {
    activeSide,
    sizePreset
  };
}

function normalizeProjectObjectDoubleSide(
  value: unknown,
  kind: ProjectObjectKind,
  name: string
): ProjectObjectDoubleSide {
  const defaultDoubleSide = getDefaultProjectObjectDoubleSide(kind);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sideComponents = normalizeProjectObjectSideComponentOverrides(
    record.sideComponents,
    kind,
    name
  );
  const doubleSide: ProjectObjectDoubleSide = {
    enabled: typeof record.enabled === "boolean" ? record.enabled : defaultDoubleSide.enabled
  };

  if (sideComponents) {
    doubleSide.sideComponents = sideComponents;
  }

  return doubleSide;
}

function normalizeProjectObjectSideComponentOverrides(
  value: unknown,
  kind: ProjectObjectKind,
  name: string
): ProjectObjectDoubleSide["sideComponents"] {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sideComponents: Partial<Record<ProjectObjectCardSide, ProjectObjectSideComponents>> = {};

  for (const side of projectObjectCardSides) {
    const sideRecord = record[side];

    if (!sideRecord || typeof sideRecord !== "object") {
      continue;
    }

    const normalizedSideComponents = normalizeProjectObjectSideComponents(
      sideRecord as Record<string, unknown>,
      kind,
      name
    );

    if (Object.keys(normalizedSideComponents).length) {
      sideComponents[side] = normalizedSideComponents;
    }
  }

  return Object.keys(sideComponents).length ? sideComponents : undefined;
}

function normalizeProjectObjectSideComponents(
  record: Record<string, unknown>,
  kind: ProjectObjectKind,
  name: string
): ProjectObjectSideComponents {
  const components: ProjectObjectSideComponents = {};

  if (hasOwnRecordKey(record, "appearance")) {
    components.appearance = normalizeProjectObjectAppearance(record.appearance, kind);
  }

  if ((kind === "group" || kind === "card") && hasOwnRecordKey(record, "layout")) {
    components.layout = normalizeProjectObjectLayout(record.layout);
  }

  if (kind === "label" && hasOwnRecordKey(record, "text")) {
    components.text = normalizeProjectObjectText(record.text, kind, name);
  }

  if (kind === "image" && hasOwnRecordKey(record, "image")) {
    components.image = normalizeProjectObjectImage(record.image);
  }

  if (kind === "shape" && hasOwnRecordKey(record, "shape")) {
    components.shape = normalizeProjectObjectShape(record.shape);
  }

  return components;
}

function normalizeProjectObjectText(
  value: unknown,
  kind: ProjectObjectKind,
  name: string
): ProjectObjectText {
  const defaultText = getDefaultProjectObjectText(kind, name);
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const content = typeof record.content === "string" ? record.content : defaultText.content;

  return {
    color: normalizeHexColor(record.color, defaultText.color),
    content: content.slice(0, maxProjectTextContentLength),
    fontSize: normalizeFiniteNumber(record.fontSize, defaultText.fontSize, {
      max: maxProjectTextFontSize,
      min: minProjectTextFontSize
    }),
    fontStyle: projectObjectTextFontStyles.has(record.fontStyle as ProjectObjectTextFontStyle)
      ? (record.fontStyle as ProjectObjectTextFontStyle)
      : defaultText.fontStyle,
    fontWeight: normalizeFiniteNumber(record.fontWeight, defaultText.fontWeight, {
      max: maxProjectTextFontWeight,
      min: minProjectTextFontWeight
    }),
    lineHeight: normalizeFiniteNumber(record.lineHeight, defaultText.lineHeight, {
      max: maxProjectTextLineHeight,
      min: minProjectTextLineHeight
    }),
    textAlign: projectObjectTextAligns.has(record.textAlign as ProjectObjectTextAlign)
      ? (record.textAlign as ProjectObjectTextAlign)
      : defaultText.textAlign,
    verticalAlign: projectObjectTextVerticalAligns.has(
      record.verticalAlign as ProjectObjectTextVerticalAlign
    )
      ? (record.verticalAlign as ProjectObjectTextVerticalAlign)
      : defaultText.verticalAlign
  };
}

function normalizeProjectObjectImage(value: unknown): ProjectObjectImage {
  const defaultImage = getDefaultProjectObjectImage();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const assetId = typeof record.assetId === "string" ? record.assetId.trim() : "";

  return {
    assetId: isSafeProjectImageAssetId(assetId) ? assetId : defaultImage.assetId,
    fit: projectObjectImageFits.has(record.fit as ProjectObjectImageFit)
      ? (record.fit as ProjectObjectImageFit)
      : defaultImage.fit,
    positionX: normalizeFiniteNumber(record.positionX, defaultImage.positionX, {
      max: 100,
      min: 0
    }),
    positionY: normalizeFiniteNumber(record.positionY, defaultImage.positionY, {
      max: 100,
      min: 0
    })
  };
}

function normalizeProjectObjectShape(value: unknown): ProjectObjectShape {
  const defaultShape = getDefaultProjectObjectShape();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    polygonPoints: normalizeProjectObjectShapePolygonPoints(
      record.polygonPoints,
      defaultShape.polygonPoints ?? getDefaultProjectObjectShapePolygonPoints()
    ),
    variant: projectObjectShapeVariants.has(record.variant as ProjectObjectShapeVariant)
      ? (record.variant as ProjectObjectShapeVariant)
      : defaultShape.variant
  };
}

function normalizeProjectObjectShapePolygonPoints(
  value: unknown,
  fallback: readonly ProjectObjectShapePoint[]
): ProjectObjectShapePoint[] {
  if (!Array.isArray(value)) {
    return cloneProjectObjectShapePolygonPoints(fallback);
  }

  const points = value
    .slice(0, projectObjectShapePolygonPointCountLimits.max)
    .map(normalizeProjectObjectShapePolygonPoint)
    .filter((point): point is ProjectObjectShapePoint => Boolean(point));

  return points.length >= projectObjectShapePolygonPointCountLimits.min
    ? points
    : cloneProjectObjectShapePolygonPoints(fallback);
}

function normalizeProjectObjectShapePolygonPoint(
  value: unknown
): ProjectObjectShapePoint | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.x !== "number" ||
    !Number.isFinite(record.x) ||
    typeof record.y !== "number" ||
    !Number.isFinite(record.y)
  ) {
    return undefined;
  }

  return {
    x: normalizeFiniteNumber(record.x, 0, projectObjectShapePolygonCoordinateLimits),
    y: normalizeFiniteNumber(record.y, 0, projectObjectShapePolygonCoordinateLimits)
  };
}

function cloneProjectObjectShapePolygonPoints(
  points: readonly ProjectObjectShapePoint[]
): ProjectObjectShapePoint[] {
  return points.map((point) => ({ ...point }));
}

function normalizeProjectImageAsset(value: unknown): ProjectImageAsset | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const fileName = normalizeProjectImageAssetFileName(
    typeof record.fileName === "string" ? record.fileName : ""
  );
  const contentType = normalizeProjectImageAssetContentType(record.contentType);
  const byteSize =
    typeof record.byteSize === "number" && Number.isFinite(record.byteSize) && record.byteSize > 0
      ? Math.min(Math.round(record.byteSize), maxProjectImageAssetBytes)
      : 0;
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";

  if (!isSafeProjectImageAssetId(id) || !contentType || byteSize <= 0 || !createdAt) {
    return undefined;
  }

  return {
    id,
    fileName,
    contentType,
    byteSize,
    createdAt
  };
}

async function optimizeProjectImageAsset(
  request: CreateProjectImageAssetRequest
): Promise<OptimizedProjectImageAsset> {
  const declaredContentType = normalizeProjectImageAssetContentType(request.contentType);

  if (!declaredContentType) {
    throw new ProjectValidationError("Unsupported image content type");
  }

  const metadata = await getProjectImageAssetMetadata(request.data);
  const sourceContentType = getProjectImageAssetContentTypeFromSharpFormat(metadata.format);

  if (!sourceContentType) {
    throw new ProjectValidationError("Unsupported image content type");
  }

  return {
    contentType: optimizedProjectImageAssetContentType,
    data: await encodeProjectImageAsset(request.data)
  };
}

async function getProjectImageAssetMetadata(data: Buffer) {
  try {
    return await sharp(data).metadata();
  } catch {
    throw new ProjectValidationError("Invalid image asset data");
  }
}

async function encodeProjectImageAsset(data: Buffer): Promise<Buffer> {
  try {
    const image = sharp(data).rotate().resize({
      fit: "inside",
      height: maxProjectImageAssetDimension,
      width: maxProjectImageAssetDimension,
      withoutEnlargement: true
    });

    return await image.webp({ effort: 4, quality: 82 }).toBuffer();
  } catch {
    throw new ProjectValidationError("Invalid image asset data");
  }
}

function getProjectImageAssetContentTypeFromSharpFormat(
  format: string | undefined
): ProjectImageAssetContentType | null {
  if (format === "jpeg" || format === "jpg") {
    return "image/jpeg";
  }

  if (format === "png") {
    return "image/png";
  }

  if (format === "webp") {
    return "image/webp";
  }

  return null;
}

function normalizeFiniteNumber(
  value: unknown,
  fallback: number,
  bounds: { max: number; min: number }
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(bounds.max, Math.max(bounds.min, value));
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();

  return /^#[0-9a-fA-F]{6}$/.test(trimmedValue) ? trimmedValue.toLowerCase() : fallback;
}

function hasOwnRecordKey(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeProjectImageAssetContentType(
  value: unknown
): ProjectImageAssetContentType | null {
  if (typeof value !== "string") {
    return null;
  }

  const contentType = value.split(";")[0]?.trim().toLowerCase();

  return projectImageAssetContentTypeSet.has(contentType as ProjectImageAssetContentType)
    ? (contentType as ProjectImageAssetContentType)
    : null;
}

function normalizeProjectImageAssetFileName(value: string) {
  const trimmedValue = value.trim().replaceAll(/[\\/]/g, "");

  return trimmedValue.slice(0, 180) || "image";
}

function isSafeProjectImageAssetId(assetId: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(assetId);
}

function findProjectImageAsset(
  fileTree: ProjectFileNode[],
  assetId: string
): ProjectImageAsset | null {
  for (const node of fileTree) {
    if (node.type === "folder") {
      const imageAsset = findProjectImageAsset(node.children ?? [], assetId);

      if (imageAsset) {
        return imageAsset;
      }
    }

    if (node.type === "file" && node.kind === "image" && node.imageAsset?.id === assetId) {
      return node.imageAsset;
    }
  }

  return null;
}

function getRemovedProjectImageAssetIds(
  previousFileTree: ProjectFileNode[],
  nextFileTree: ProjectFileNode[]
) {
  const nextAssetIds = collectProjectImageAssetIds(nextFileTree);

  return [...collectProjectImageAssetIds(previousFileTree)].filter(
    (assetId) => !nextAssetIds.has(assetId)
  );
}

function collectProjectImageAssetIds(fileTree: ProjectFileNode[]) {
  const assetIds = new Set<string>();
  collectProjectImageAssetIdsInNodes(fileTree, assetIds);

  return assetIds;
}

function collectProjectImageAssetIdsInNodes(fileTree: ProjectFileNode[], assetIds: Set<string>) {
  fileTree.forEach((node) => {
    if (node.type === "folder") {
      collectProjectImageAssetIdsInNodes(node.children ?? [], assetIds);
      return;
    }

    if (node.kind === "image" && node.imageAsset) {
      assetIds.add(node.imageAsset.id);
    }
  });
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
