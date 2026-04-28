import { randomUUID } from "node:crypto";
import {
  getCardTemplateFields,
  type CardTemplate,
  type CreateCardTemplateInput,
  type UpdateCardTemplateInput
} from "@bg-maker/shared";
import { parseCardLayout } from "./component-service.js";
import {
  getProjectCardTemplates,
  getProjectComponents,
  projects,
  setProjectCardTemplates,
  setProjectComponents
} from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";
import { resolveStoredCard } from "./component-service.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function listCardTemplates(projectId: string): ServiceResult<CardTemplate[]> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  return ok(getProjectCardTemplates(projectId));
}

export function createCardTemplate(
  projectId: string,
  value: unknown
): ServiceResult<CardTemplate> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const input = parseCreateCardTemplateInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const timestamp = new Date().toISOString();
  const template: CardTemplate = {
    id: randomUUID(),
    projectId,
    name: input.value.name,
    layout: input.value.layout,
    fields: getCardTemplateFields(input.value.layout),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectCardTemplates(projectId, [...getProjectCardTemplates(projectId), template]);
  touchProject(projectId);

  return ok(template);
}

export function updateCardTemplate(
  projectId: string,
  templateId: string,
  value: unknown
): ServiceResult<CardTemplate> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const templates = getProjectCardTemplates(projectId);
  const currentTemplate = templates.find((template) => template.id === templateId);

  if (!currentTemplate) {
    return fail(404, "Card template not found");
  }

  const input = parseUpdateCardTemplateInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const updatedTemplate: CardTemplate = {
    ...currentTemplate,
    ...input.value,
    fields: getCardTemplateFields(input.value.layout ?? currentTemplate.layout),
    updatedAt: new Date().toISOString()
  };

  setProjectCardTemplates(
    projectId,
    templates.map((template) => (template.id === updatedTemplate.id ? updatedTemplate : template))
  );
  refreshCardsUsingTemplate(projectId, updatedTemplate.id);
  touchProject(projectId);

  return ok(updatedTemplate);
}

export function deleteCardTemplate(
  projectId: string,
  templateId: string
): ServiceResult<void> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const templates = getProjectCardTemplates(projectId);
  const template = templates.find((item) => item.id === templateId);

  if (!template) {
    return fail(404, "Card template not found");
  }

  const isUsedByCard = getProjectComponents(projectId).some(
    (component) => component.type === "card" && component.templateId === templateId
  );

  if (isUsedByCard) {
    return fail(400, "Card template is used by a card");
  }

  setProjectCardTemplates(
    projectId,
    templates.filter((item) => item.id !== templateId)
  );
  touchProject(projectId);

  return ok(undefined);
}

function parseCreateCardTemplateInput(
  value: unknown,
  projectId: string
): ParseResult<CreateCardTemplateInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const name = readRequiredString(value.name, "Card template name");
  const layout = parseCardLayout(value.layout, projectId);

  if (!name.ok) {
    return name;
  }

  if (!layout.ok) {
    return layout;
  }

  return { ok: true, value: { name: name.value, layout: layout.value } };
}

function parseUpdateCardTemplateInput(
  value: unknown,
  projectId: string
): ParseResult<UpdateCardTemplateInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const input: UpdateCardTemplateInput = {};

  if (value.name !== undefined) {
    const name = readRequiredString(value.name, "Card template name");

    if (!name.ok) {
      return name;
    }

    input.name = name.value;
  }

  if (value.layout !== undefined) {
    const layout = parseCardLayout(value.layout, projectId);

    if (!layout.ok) {
      return layout;
    }

    input.layout = layout.value;
  }

  return { ok: true, value: input };
}

function refreshCardsUsingTemplate(projectId: string, templateId: string) {
  setProjectComponents(
    projectId,
    getProjectComponents(projectId).map((component) =>
      component.type === "card" && component.templateId === templateId
        ? resolveStoredCard(component)
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
