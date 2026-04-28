import { randomUUID } from "node:crypto";
import {
  createDefaultProjectParameters,
  projectParameterTypes,
  projectStatuses,
  type GameProject,
  type GameProjectSummary,
  type ProjectParameter,
  type ProjectParameterType,
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
  parameters: ProjectParameter[];
  status: ProjectStatus;
  notes: string;
};

type ProjectFields = {
  name?: string;
  description?: string;
  players?: string;
  parameters?: ProjectParameter[];
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
      parameters: fields.value.parameters ?? createDefaultProjectParameters(),
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

  if (fields.value.parameters !== undefined) {
    input.parameters = fields.value.parameters;
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
  const parameters = parseOptionalProjectParameters(value.parameters);

  if (value.name !== undefined && !name) {
    return { ok: false, error: "Project name must not be empty" };
  }

  if (value.status !== undefined && !isProjectStatus(value.status)) {
    return { ok: false, error: "Project status is invalid" };
  }

  if (!parameters.ok) {
    return parameters;
  }

  return {
    ok: true,
    value: {
      name,
      description,
      players,
      notes,
      parameters: parameters.value,
      status: isProjectStatus(value.status) ? value.status : undefined
    }
  };
}

function parseOptionalProjectParameters(
  value: unknown
): ParseResult<ProjectParameter[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Project parameters must be an array" };
  }

  if (value.length > 50) {
    return { ok: false, error: "Project can include at most 50 parameters" };
  }

  const parameters: ProjectParameter[] = [];
  const keys = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) {
      return { ok: false, error: "Project parameters must be objects" };
    }

    const key = readRequiredString(item.key, "Project parameter key");
    const label = readRequiredString(item.label, "Project parameter label");

    if (!key.ok) {
      return key;
    }

    if (!label.ok) {
      return label;
    }

    if (!/^[a-z][a-z0-9_]*$/i.test(key.value)) {
      return {
        ok: false,
        error: "Project parameter key must contain only letters, numbers, and underscores"
      };
    }

    if (keys.has(key.value)) {
      return { ok: false, error: "Project parameter keys must be unique" };
    }

    if (!isProjectParameterType(item.type)) {
      return { ok: false, error: "Project parameter type is invalid" };
    }

    const parsedValue = parseProjectParameterValue(item.value, item.type);

    if (!parsedValue.ok) {
      return parsedValue;
    }

    keys.add(key.value);
    parameters.push({
      key: key.value,
      label: label.value,
      type: item.type,
      value: parsedValue.value
    });
  }

  return { ok: true, value: parameters };
}

function parseProjectParameterValue(
  value: unknown,
  type: ProjectParameterType
): ParseResult<string> {
  const text = readRequiredString(value, "Project parameter value", { allowEmpty: type === "text" });

  if (!text.ok) {
    return text;
  }

  if (type === "color" && !/^#[\da-f]{3}([\da-f]{3})?$/i.test(text.value)) {
    return { ok: false, error: "Project color parameter value must be a hex color" };
  }

  if (type === "number" && !Number.isFinite(Number(text.value))) {
    return { ok: false, error: "Project number parameter value must be a number" };
  }

  return { ok: true, value: text.value };
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function readRequiredString(
  value: unknown,
  label: string,
  options: { allowEmpty?: boolean } = {}
): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }

  const trimmedValue = value.trim();

  if (!options.allowEmpty && trimmedValue.length === 0) {
    return { ok: false, error: `${label} must not be empty` };
  }

  return { ok: true, value: trimmedValue };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus);
}

function isProjectParameterType(value: unknown): value is ProjectParameterType {
  return projectParameterTypes.includes(value as ProjectParameterType);
}
