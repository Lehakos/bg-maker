import { randomUUID } from "node:crypto";
import {
  getTileTemplateFields,
  type CreateTileTemplateInput,
  type TileTemplate,
  type UpdateTileTemplateInput
} from "@bg-maker/shared";
import { parseTileLayout, resolveStoredTile } from "./component-service.js";
import {
  getProjectComponents,
  getProjectTileTemplates,
  projects,
  setProjectComponents,
  setProjectTileTemplates
} from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function listTileTemplates(projectId: string): ServiceResult<TileTemplate[]> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  return ok(getProjectTileTemplates(projectId));
}

export function createTileTemplate(projectId: string, value: unknown): ServiceResult<TileTemplate> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const input = parseCreateTileTemplateInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const timestamp = new Date().toISOString();
  const template: TileTemplate = {
    id: randomUUID(),
    projectId,
    name: input.value.name,
    layout: input.value.layout,
    fields: getTileTemplateFields(input.value.layout),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectTileTemplates(projectId, [...getProjectTileTemplates(projectId), template]);
  touchProject(projectId);

  return ok(template);
}

export function updateTileTemplate(
  projectId: string,
  templateId: string,
  value: unknown
): ServiceResult<TileTemplate> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const templates = getProjectTileTemplates(projectId);
  const currentTemplate = templates.find((template) => template.id === templateId);

  if (!currentTemplate) {
    return fail(404, "Tile template not found");
  }

  const input = parseUpdateTileTemplateInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const updatedTemplate: TileTemplate = {
    ...currentTemplate,
    ...input.value,
    fields: getTileTemplateFields(input.value.layout ?? currentTemplate.layout),
    updatedAt: new Date().toISOString()
  };

  setProjectTileTemplates(
    projectId,
    templates.map((template) => (template.id === updatedTemplate.id ? updatedTemplate : template))
  );
  refreshTilesUsingTemplate(projectId, updatedTemplate.id);
  touchProject(projectId);

  return ok(updatedTemplate);
}

export function deleteTileTemplate(projectId: string, templateId: string): ServiceResult<void> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const templates = getProjectTileTemplates(projectId);
  const template = templates.find((item) => item.id === templateId);

  if (!template) {
    return fail(404, "Tile template not found");
  }

  const isUsedByTile = getProjectComponents(projectId).some(
    (component) => component.type === "tile" && component.templateId === templateId
  );

  if (isUsedByTile) {
    return fail(400, "Tile template is used by a tile");
  }

  setProjectTileTemplates(
    projectId,
    templates.filter((item) => item.id !== templateId)
  );
  touchProject(projectId);

  return ok(undefined);
}

function parseCreateTileTemplateInput(
  value: unknown,
  projectId: string
): ParseResult<CreateTileTemplateInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const name = readRequiredString(value.name, "Tile template name");
  const layout = parseTileLayout(value.layout, projectId);

  if (!name.ok) {
    return name;
  }

  if (!layout.ok) {
    return layout;
  }

  return { ok: true, value: { name: name.value, layout: layout.value } };
}

function parseUpdateTileTemplateInput(
  value: unknown,
  projectId: string
): ParseResult<UpdateTileTemplateInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const input: UpdateTileTemplateInput = {};

  if (value.name !== undefined) {
    const name = readRequiredString(value.name, "Tile template name");

    if (!name.ok) {
      return name;
    }

    input.name = name.value;
  }

  if (value.layout !== undefined) {
    const layout = parseTileLayout(value.layout, projectId);

    if (!layout.ok) {
      return layout;
    }

    input.layout = layout.value;
  }

  return { ok: true, value: input };
}

function refreshTilesUsingTemplate(projectId: string, templateId: string) {
  setProjectComponents(
    projectId,
    getProjectComponents(projectId).map((component) =>
      component.type === "tile" && component.templateId === templateId
        ? resolveStoredTile(component)
        : component
    )
  );
}

function readRequiredString(value: unknown, label: string): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { ok: false, error: `${label} must not be empty` };
  }

  return { ok: true, value: trimmedValue };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
