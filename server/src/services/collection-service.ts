import { randomUUID } from "node:crypto";
import {
  collectionTypes,
  collectionTypeAllowsComponent,
  type ComponentCollection,
  type ComponentCollectionType,
  type ComponentCollectionItem,
  type CreateComponentCollectionInput,
  type GameComponent,
  type UpdateComponentCollectionInput
} from "@bg-maker/shared";
import {
  getProjectCollections,
  getProjectComponents,
  projects,
  setProjectCollections
} from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";
import { tableSetupUsesCollection } from "./table-setup-service.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type CommonCollectionFields = {
  type: ComponentCollectionType;
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

  const input = parseUpdateCollectionInput(value, projectId, currentCollection);

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

  if (tableSetupUsesCollection(projectId, collection.id)) {
    return fail(400, "Collection is used by table setup");
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

  if (!input.value.type) {
    return { ok: false, error: "Collection type is required" };
  }

  return {
    ok: true,
    value: {
      type: input.value.type,
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
  projectId: string,
  currentCollection: ComponentCollection
): ParseResult<UpdateComponentCollectionInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const input = parseCollectionFields(value, projectId, currentCollection);

  if (!input.ok) {
    return input;
  }

  return { ok: true, value: input.value };
}

function parseCollectionFields(
  value: Record<string, unknown>,
  projectId: string,
  currentCollection?: ComponentCollection
): ParseResult<Partial<CommonCollectionFields>> {
  const type = readOptionalCollectionType(value.type);
  const name = readOptionalString(value.name);
  const description = readOptionalString(value.description);
  const notes = readOptionalString(value.notes);
  const tags = readOptionalStringArray(value.tags, "Collection tags");

  if (!type.ok) {
    return type;
  }

  const nextType = type.value ?? currentCollection?.type;
  const items = readOptionalCollectionItems(value.items, projectId, nextType);

  if (value.name !== undefined && !name) {
    return { ok: false, error: "Collection name must not be empty" };
  }

  if (!tags.ok) {
    return tags;
  }

  if (!items.ok) {
    return items;
  }

  if (currentCollection && type.value && items.value === undefined) {
    const currentItems = validateCollectionItemsForType(
      currentCollection.items,
      projectId,
      type.value
    );

    if (!currentItems.ok) {
      return currentItems;
    }
  }

  return {
    ok: true,
    value: {
      type: type.value,
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
  projectId: string,
  collectionType?: ComponentCollectionType
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

    const typeError = getCollectionItemTypeError(collectionType, component);

    if (typeError) {
      return { ok: false, error: typeError };
    }

    seenComponentIds.add(componentId);
    items.push({ componentId, quantity: quantity.value ?? 1 });
  }

  return { ok: true, value: items };
}

function validateCollectionItemsForType(
  items: ComponentCollectionItem[],
  projectId: string,
  collectionType: ComponentCollectionType
): ParseResult<undefined> {
  const components = getProjectComponents(projectId);

  for (const item of items) {
    const component = components.find((entry) => entry.id === item.componentId);

    if (!component) {
      return { ok: false, error: "Collection items must reference components in the same project" };
    }

    const typeError = getCollectionItemTypeError(collectionType, component);

    if (typeError) {
      return { ok: false, error: typeError };
    }
  }

  return { ok: true, value: undefined };
}

function getCollectionItemTypeError(
  collectionType: ComponentCollectionType | undefined,
  component: GameComponent
) {
  if (!collectionType || collectionType === "custom") {
    return null;
  }

  if (collectionType === "deck" && !collectionTypeAllowsComponent(collectionType, component.type)) {
    return "Deck collections can only include cards";
  }

  if (collectionType === "bag" && !collectionTypeAllowsComponent(collectionType, component.type)) {
    return "Bag collections can only include tiles, pieces, or dice";
  }

  return null;
}

function readOptionalCollectionType(
  value: unknown
): ParseResult<ComponentCollectionType | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (typeof value !== "string" || !collectionTypes.includes(value as ComponentCollectionType)) {
    return { ok: false, error: "Collection type is invalid" };
  }

  return { ok: true, value: value as ComponentCollectionType };
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
