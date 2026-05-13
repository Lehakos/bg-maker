import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import {
  type CreateProjectRequest,
  getDefaultProjectGameConfig,
  type Project,
  type ProjectImageAsset,
  type ProjectSummary
} from "@bg-maker/shared";
import {
  createDefaultProjectFileTree,
  normalizeProjectGameConfig,
  normalizeProjectFileTree
} from "./project-file-tree-normalizer.js";
import {
  findProjectImageAsset,
  getRemovedProjectImageAssetIds,
  maxProjectImageAssetBytes,
  normalizeProjectImageAssetFileName,
  optimizeProjectImageAsset,
  isSafeProjectImageAssetId,
  type CreateProjectImageAssetRequest,
  type ProjectImageAssetContent
} from "./project-image-assets.js";
import { ProjectImageAssetFileStore } from "./project-image-asset-file-store.js";
import { isNodeError } from "./project-normalization-utils.js";
import { ProjectStore } from "./project-store.js";
import { toProjectSummary } from "./project-summary.js";
import { ProjectValidationError } from "./project-validation-error.js";

type ProjectServiceOptions = {
  storePath?: string;
};

const defaultDataDirectory = join(process.cwd(), ".bg-maker");

export { maxProjectImageAssetBytes, ProjectValidationError };
export type { CreateProjectImageAssetRequest, ProjectImageAssetContent };

export class ProjectService {
  private readonly store: ProjectStore;
  private readonly imageAssetFileStore: ProjectImageAssetFileStore;

  constructor(
    private readonly storePath: string,
    private readonly imageAssetDirectory = join(dirname(storePath), "image-assets")
  ) {
    this.store = new ProjectStore(storePath);
    this.imageAssetFileStore = new ProjectImageAssetFileStore(imageAssetDirectory);
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const store = await this.store.read();

    return store.projects
      .map(toProjectSummary)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getProject(projectId: string): Promise<Project | null> {
    const store = await this.store.read();

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
      gameConfig: getDefaultProjectGameConfig(),
      notes: "",
      fileTree: createDefaultProjectFileTree()
    };

    const store = await this.store.read();
    await this.store.write({
      projects: [project, ...store.projects]
    });

    return project;
  }

  async updateProjectFileTree(projectId: string, fileTree: unknown): Promise<Project | null> {
    const normalizedFileTree = normalizeProjectFileTree(fileTree);
    const store = await this.store.read();
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

    await this.store.write({ projects });
    await Promise.all(
      removedImageAssetIds.map((assetId) =>
        this.imageAssetFileStore.removeProjectImageAsset(project.id, assetId)
      )
    );

    return updatedProject;
  }

  async updateProjectGameConfig(
    projectId: string,
    gameConfig: unknown
  ): Promise<Project | null> {
    const normalizedGameConfig = normalizeProjectGameConfig(gameConfig);
    const store = await this.store.read();
    const projectIndex = store.projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      return null;
    }

    const project = store.projects[projectIndex];
    const updatedProject: Project = {
      ...project,
      gameConfig: normalizedGameConfig,
      updatedAt: new Date().toISOString()
    };
    const projects = [...store.projects];
    projects[projectIndex] = updatedProject;

    await this.store.write({ projects });

    return updatedProject;
  }

  async createProjectImageAsset(
    projectId: string,
    request: CreateProjectImageAssetRequest
  ): Promise<ProjectImageAsset | null> {
    const store = await this.store.read();
    const project = store.projects.find((item) => item.id === projectId);

    if (!project) {
      return null;
    }

    validateProjectImageAssetRequest(request);
    const optimizedImageAsset = await optimizeProjectImageAsset(request);
    const imageAsset: ProjectImageAsset = {
      id: randomUUID(),
      fileName: normalizeProjectImageAssetFileName(request.fileName),
      contentType: optimizedImageAsset.contentType,
      byteSize: optimizedImageAsset.data.byteLength,
      createdAt: new Date().toISOString()
    };

    await this.imageAssetFileStore.writeProjectImageAsset(
      project.id,
      imageAsset.id,
      optimizedImageAsset.data
    );

    return imageAsset;
  }

  async replaceProjectImageAsset(
    projectId: string,
    assetId: string,
    request: CreateProjectImageAssetRequest
  ): Promise<ProjectImageAsset | null> {
    if (!isSafeProjectImageAssetId(assetId)) {
      return null;
    }

    const store = await this.store.read();
    const project = store.projects.find((item) => item.id === projectId);

    if (!project) {
      return null;
    }

    const existingImageAsset = findProjectImageAsset(project.fileTree, assetId);

    if (!existingImageAsset) {
      return null;
    }

    validateProjectImageAssetRequest(request);
    const optimizedImageAsset = await optimizeProjectImageAsset(request);
    const imageAsset: ProjectImageAsset = {
      ...existingImageAsset,
      fileName: normalizeProjectImageAssetFileName(request.fileName),
      contentType: optimizedImageAsset.contentType,
      byteSize: optimizedImageAsset.data.byteLength
    };

    await this.imageAssetFileStore.writeProjectImageAsset(
      project.id,
      imageAsset.id,
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

    const store = await this.store.read();
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
        data: await this.imageAssetFileStore.readProjectImageAsset(project.id, imageAsset.id),
        imageAsset
      };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }
}

export function createProjectService(options: ProjectServiceOptions = {}) {
  const storePath =
    options.storePath ??
    process.env.BGM_PROJECT_STORE_PATH ??
    join(process.env.BGM_DATA_DIR ?? defaultDataDirectory, "projects.json");

  return new ProjectService(storePath);
}

function validateProjectImageAssetRequest(request: CreateProjectImageAssetRequest) {
  if (!Buffer.isBuffer(request.data) || request.data.byteLength === 0) {
    throw new ProjectValidationError("Image asset data is required");
  }

  if (request.data.byteLength > maxProjectImageAssetBytes) {
    throw new ProjectValidationError("Image asset is too large");
  }
}
