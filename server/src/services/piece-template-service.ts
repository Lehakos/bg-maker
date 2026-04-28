import { randomUUID } from "node:crypto";
import {
  getPieceTemplateFields,
  type CreatePieceTemplateInput,
  type PieceTemplate,
  type UpdatePieceTemplateInput
} from "@bg-maker/shared";
import { parsePieceLayout, resolveStoredPiece } from "./component-service.js";
import {
  getProjectComponents,
  getProjectPieceTemplates,
  projects,
  setProjectComponents,
  setProjectPieceTemplates
} from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function listPieceTemplates(projectId: string): ServiceResult<PieceTemplate[]> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  return ok(getProjectPieceTemplates(projectId));
}

export function createPieceTemplate(
  projectId: string,
  value: unknown
): ServiceResult<PieceTemplate> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const input = parseCreatePieceTemplateInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const timestamp = new Date().toISOString();
  const template: PieceTemplate = {
    id: randomUUID(),
    projectId,
    name: input.value.name,
    layout: input.value.layout,
    fields: getPieceTemplateFields(input.value.layout),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectPieceTemplates(projectId, [...getProjectPieceTemplates(projectId), template]);
  touchProject(projectId);

  return ok(template);
}

export function updatePieceTemplate(
  projectId: string,
  templateId: string,
  value: unknown
): ServiceResult<PieceTemplate> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const templates = getProjectPieceTemplates(projectId);
  const currentTemplate = templates.find((template) => template.id === templateId);

  if (!currentTemplate) {
    return fail(404, "Piece template not found");
  }

  const input = parseUpdatePieceTemplateInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const updatedTemplate: PieceTemplate = {
    ...currentTemplate,
    ...input.value,
    fields: getPieceTemplateFields(input.value.layout ?? currentTemplate.layout),
    updatedAt: new Date().toISOString()
  };

  setProjectPieceTemplates(
    projectId,
    templates.map((template) => (template.id === updatedTemplate.id ? updatedTemplate : template))
  );
  refreshPiecesUsingTemplate(projectId, updatedTemplate.id);
  touchProject(projectId);

  return ok(updatedTemplate);
}

export function deletePieceTemplate(projectId: string, templateId: string): ServiceResult<void> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const templates = getProjectPieceTemplates(projectId);
  const template = templates.find((item) => item.id === templateId);

  if (!template) {
    return fail(404, "Piece template not found");
  }

  const isUsedByPiece = getProjectComponents(projectId).some(
    (component) => component.type === "piece" && component.templateId === templateId
  );

  if (isUsedByPiece) {
    return fail(400, "Piece template is used by a piece");
  }

  setProjectPieceTemplates(
    projectId,
    templates.filter((item) => item.id !== templateId)
  );
  touchProject(projectId);

  return ok(undefined);
}

function parseCreatePieceTemplateInput(
  value: unknown,
  projectId: string
): ParseResult<CreatePieceTemplateInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const name = readRequiredString(value.name, "Piece template name");
  const layout = parsePieceLayout(value.layout, projectId);

  if (!name.ok) {
    return name;
  }

  if (!layout.ok) {
    return layout;
  }

  return { ok: true, value: { name: name.value, layout: layout.value } };
}

function parseUpdatePieceTemplateInput(
  value: unknown,
  projectId: string
): ParseResult<UpdatePieceTemplateInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const input: UpdatePieceTemplateInput = {};

  if (value.name !== undefined) {
    const name = readRequiredString(value.name, "Piece template name");

    if (!name.ok) {
      return name;
    }

    input.name = name.value;
  }

  if (value.layout !== undefined) {
    const layout = parsePieceLayout(value.layout, projectId);

    if (!layout.ok) {
      return layout;
    }

    input.layout = layout.value;
  }

  return { ok: true, value: input };
}

function refreshPiecesUsingTemplate(projectId: string, templateId: string) {
  setProjectComponents(
    projectId,
    getProjectComponents(projectId).map((component) =>
      component.type === "piece" && component.templateId === templateId
        ? resolveStoredPiece(component)
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
