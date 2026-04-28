import { randomUUID } from "node:crypto";
import type {
  ComponentCollection,
  ComponentCollectionItem,
  CreateComponentCollectionInput,
  UpdateComponentCollectionInput
} from "@bg-maker/shared";
import {
  getProjectCollections,
  getProjectComponents,
  projects,
  setProjectCollections
} from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type CommonCollectionFields = {
  name: string;
  description: string;
  tags: string[];
  notes: string;
  items: ComponentCollectionItem[];
};

export function listCollections(projectId: string): ServiceResult<ComponentCollection[]> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  return ok(getProjectCollections(projectId));
}

export function createCollection(
  projectId: string,
  value: unknown
): ServiceResult<ComponentCollection> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const input = parseCreateCollectionInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const timestamp = new Date().toISOString();
  const collection: ComponentCollection = {
    id: randomUUID(),
    projectId,
    ...input.value,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectCollections(projectId, [...getProjectCollections(projectId), collection]);
  touchProject(projectId);

  return ok(collection);
}

export function updateCollection(
  projectId: string,
  collectionId: string,
  value: unknown
): ServiceResult<ComponentCollection> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const collections = getProjectCollections(projectId);
  const currentCollection = collections.find((collection) => collection.id === collectionId);

  if (!currentCollection) {
    return fail(404, "Collection not found");
  }

  const input = parseUpdateCollectionInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const updatedCollection: ComponentCollection = {
    ...currentCollection,
    ...input.value,
    updatedAt: new Date().toISOString()
  };

  setProjectCollections(
    projectId,
    collections.map((collection) =>
      collection.id === updatedCollection.id ? updatedCollection : collection
    )
  );
  touchProject(projectId);

  return ok(updatedCollection);
}

export function deleteCollection(projectId: string, collectionId: string): ServiceResult<void> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const collections = getProjectCollections(projectId);
  const collection = collections.find((item) => item.id === collectionId);

  if (!collection) {
    return fail(404, "Collection not found");
  }

  setProjectCollections(
    projectId,
    collections.filter((item) => item.id !== collectionId)
  );
  touchProject(projectId);

  return ok(undefined);
}

function parseCreateCollectionInput(
  value: unknown,
  projectId: string
): ParseResult<CreateComponentCollectionInput & CommonCollectionFields> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const input = parseCollectionFields(value, projectId);

  if (!input.ok) {
    return input;
  }

  if (!input.value.name) {
    return { ok: false, error: "Collection name must not be empty" };
  }

  return {
    ok: true,
    value: {
      name: input.value.name,
      description: input.value.description ?? "",
      tags: input.value.tags ?? [],
      notes: input.value.notes ?? "",
      items: input.value.items ?? []
    }
  };
}

function parseUpdateCollectionInput(
  value: unknown,
  projectId: string
): ParseResult<UpdateComponentCollectionInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const input = parseCollectionFields(value, projectId);

  if (!input.ok) {
    return input;
  }

  return { ok: true, value: input.value };
}

function parseCollectionFields(
  value: Record<string, unknown>,
  projectId: string
): ParseResult<Partial<CommonCollectionFields>> {
  const name = readOptionalString(value.name);
  const description = readOptionalString(value.description);
  const notes = readOptionalString(value.notes);
  const tags = readOptionalStringArray(value.tags, "Collection tags");
  const items = readOptionalCollectionItems(value.items, projectId);

  if (value.name !== undefined && !name) {
    return { ok: false, error: "Collection name must not be empty" };
  }

  if (!tags.ok) {
    return tags;
  }

  if (!items.ok) {
    return items;
  }

  return {
    ok: true,
    value: {
      name,
      description,
      notes,
      tags: tags.value,
      items: items.value
    }
  };
}

function readOptionalCollectionItems(
  value: unknown,
  projectId: string
): ParseResult<ComponentCollectionItem[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Collection items must be an array" };
  }

  const items: ComponentCollectionItem[] = [];
  const seenComponentIds = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) {
      return { ok: false, error: "Collection item entries must be objects" };
    }

    const componentId = readOptionalString(item.componentId);

    if (!componentId) {
      return { ok: false, error: "Collection item component id must not be empty" };
    }

    if (seenComponentIds.has(componentId)) {
      return { ok: false, error: "Collection cannot include the same component twice" };
    }

    const quantity = readOptionalInteger(item.quantity, "Collection item quantity", { min: 1 });

    if (!quantity.ok) {
      return quantity;
    }

    const component = getProjectComponents(projectId).find((entry) => entry.id === componentId);

    if (!component) {
      return { ok: false, error: "Collection items must reference components in the same project" };
    }

    seenComponentIds.add(componentId);
    items.push({ componentId, quantity: quantity.value ?? 1 });
  }

  return { ok: true, value: items };
}

function readOptionalStringArray(value: unknown, label: string): ParseResult<string[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: `${label} must be an array` };
  }

  const strings: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: `${label} must only contain strings` };
    }

    const trimmed = item.trim();

    if (trimmed.length > 0 && !strings.includes(trimmed)) {
      strings.push(trimmed);
    }
  }

  return { ok: true, value: strings };
}

function readOptionalInteger(
  value: unknown,
  label: string,
  range: { min?: number; max?: number } = {}
): ParseResult<number | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, error: `${label} must be an integer` };
  }

  if (range.min !== undefined && value < range.min) {
    return { ok: false, error: `${label} must be at least ${range.min}` };
  }

  if (range.max !== undefined && value > range.max) {
    return { ok: false, error: `${label} must be at most ${range.max}` };
  }

  return { ok: true, value };
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
