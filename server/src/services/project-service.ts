import { randomUUID } from "node:crypto";
import {
  projectStatuses,
  type GameProject,
  type GameProjectSummary,
  type ProjectStatus,
  type UpdateGameProjectInput
} from "@bg-maker/shared";
import {
  projectCardTemplates,
  projectCollections,
  projectComponents,
  projectPieceTemplates,
  projects
} from "./in-memory-store.js";
import { fail, ok, type ServiceResult } from "./service-result.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type ProjectInput = {
  name: string;
  description: string;
  players: string;
  status: ProjectStatus;
  notes: string;
};

type ProjectFields = {
  name?: string;
  description?: string;
  players?: string;
  status?: ProjectStatus;
  notes?: string;
};

export function listProjects() {
  return Array.from(projects.values())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(toProjectSummary);
}

export function createProject(value: unknown): ServiceResult<GameProject> {
  const input = parseCreateProjectInput(value);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const timestamp = new Date().toISOString();
  const project: GameProject = {
    id: randomUUID(),
    ...input.value,
    componentCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  projects.set(project.id, project);
  projectComponents.set(project.id, []);
  projectCardTemplates.set(project.id, []);
  projectPieceTemplates.set(project.id, []);
  projectCollections.set(project.id, []);

  return ok(project);
}

export function getProject(projectId: string): ServiceResult<GameProject> {
  const project = projects.get(projectId);

  if (!project) {
    return fail(404, "Project not found");
  }

  return ok(project);
}

export function updateProject(projectId: string, value: unknown): ServiceResult<GameProject> {
  const currentProject = projects.get(projectId);

  if (!currentProject) {
    return fail(404, "Project not found");
  }

  const input = parseUpdateProjectInput(value);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const updatedProject: GameProject = {
    ...currentProject,
    ...input.value,
    updatedAt: new Date().toISOString()
  };

  projects.set(updatedProject.id, updatedProject);

  return ok(updatedProject);
}

export function deleteProject(projectId: string): ServiceResult<undefined> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  projects.delete(projectId);
  projectComponents.delete(projectId);
  projectCardTemplates.delete(projectId);
  projectPieceTemplates.delete(projectId);
  projectCollections.delete(projectId);

  return ok(undefined);
}

export function touchProject(projectId: string) {
  const project = projects.get(projectId);

  if (!project) {
    return;
  }

  projects.set(projectId, {
    ...project,
    componentCount: projectComponents.get(projectId)?.length ?? 0,
    updatedAt: new Date().toISOString()
  });
}

function toProjectSummary(project: GameProject): GameProjectSummary {
  return {
    id: project.id,
    name: project.name,
    players: project.players,
    status: project.status,
    componentCount: project.componentCount,
    updatedAt: project.updatedAt
  };
}

function parseCreateProjectInput(value: unknown): ParseResult<ProjectInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const fields = parseProjectFields(value);

  if (!fields.ok) {
    return fields;
  }

  if (!fields.value.name) {
    return { ok: false, error: "Project name must not be empty" };
  }

  return {
    ok: true,
    value: {
      name: fields.value.name,
      description: fields.value.description ?? "",
      players: fields.value.players ?? "1-4",
      status: fields.value.status ?? "draft",
      notes: fields.value.notes ?? ""
    }
  };
}

function parseUpdateProjectInput(value: unknown): ParseResult<UpdateGameProjectInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const fields = parseProjectFields(value);

  if (!fields.ok) {
    return fields;
  }

  const input: UpdateGameProjectInput = {};

  if (fields.value.name !== undefined) {
    input.name = fields.value.name;
  }

  if (fields.value.description !== undefined) {
    input.description = fields.value.description;
  }

  if (fields.value.players !== undefined) {
    input.players = fields.value.players;
  }

  if (fields.value.notes !== undefined) {
    input.notes = fields.value.notes;
  }

  if (fields.value.status !== undefined) {
    input.status = fields.value.status;
  }

  return { ok: true, value: input };
}

function parseProjectFields(value: Record<string, unknown>): ParseResult<ProjectFields> {
  const name = readOptionalString(value.name);
  const description = readOptionalString(value.description);
  const players = readOptionalString(value.players);
  const notes = readOptionalString(value.notes);

  if (value.name !== undefined && !name) {
    return { ok: false, error: "Project name must not be empty" };
  }

  if (value.status !== undefined && !isProjectStatus(value.status)) {
    return { ok: false, error: "Project status is invalid" };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      players,
      notes,
      status: isProjectStatus(value.status) ? value.status : undefined
    }
  };
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus);
}
