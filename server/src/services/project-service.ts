import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  CreateProjectRequest,
  Project,
  ProjectFileKind,
  ProjectFileNode,
  ProjectSummary
} from "@bg-maker/shared";

type ProjectStoreData = {
  projects: Project[];
};

type ProjectServiceOptions = {
  storePath?: string;
};

const defaultDataDirectory = join(process.cwd(), ".bg-maker");
const maxProjectFileTreeDepth = 12;
const maxProjectFileTreeNodes = 500;
const projectFileKinds = new Set<ProjectFileKind>(["tableSetup", "object", "image", "document"]);

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export class ProjectService {
  constructor(private readonly storePath: string) {}

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
    const updatedProject: Project = {
      ...project,
      fileTree: normalizedFileTree,
      updatedAt: new Date().toISOString()
    };
    const projects = [...store.projects];
    projects[projectIndex] = updatedProject;

    await this.writeStore({ projects });

    return updatedProject;
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

    const temporaryStorePath = `${this.storePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporaryStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(temporaryStorePath, this.storePath);
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
      id: "images",
      name: "Images",
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

  return value.map((node) => normalizeProjectFileNode(node, 0, nodeIds, nodeCount));
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

  return {
    id,
    name,
    type: "file",
    kind: projectFileKinds.has(record.kind as ProjectFileKind)
      ? (record.kind as ProjectFileKind)
      : "document"
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
