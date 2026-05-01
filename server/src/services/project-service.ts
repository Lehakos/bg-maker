import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CreateProjectRequest, Project, ProjectSummary } from "@bg-maker/shared";

type ProjectStoreData = {
  projects: Project[];
};

type ProjectServiceOptions = {
  storePath?: string;
};

const defaultDataDirectory = join(process.cwd(), ".bg-maker");

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
      notes: ""
    };

    const store = await this.readStore();
    await this.writeStore({
      projects: [project, ...store.projects]
    });

    return project;
  }

  private async readStore(): Promise<ProjectStoreData> {
    try {
      const rawStore = await readFile(this.storePath, "utf8");
      const parsedStore = JSON.parse(rawStore) as Partial<ProjectStoreData>;

      return {
        projects: Array.isArray(parsedStore.projects) ? parsedStore.projects.filter(isProject) : []
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

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") {
    return false;
  }

  const project = value as Partial<Record<keyof Project, unknown>>;

  return (
    typeof project.id === "string" &&
    typeof project.name === "string" &&
    typeof project.description === "string" &&
    typeof project.createdAt === "string" &&
    typeof project.updatedAt === "string" &&
    typeof project.tableSetupsCount === "number" &&
    typeof project.objectsCount === "number" &&
    typeof project.playtestsCount === "number" &&
    typeof project.notes === "string"
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
