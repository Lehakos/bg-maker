import { randomUUID } from "node:crypto";
import {
  cardIconIds,
  cardImageFits,
  cardLayoutSides,
  cardSizePresetDimensions,
  cardSizePresets,
  cardTextAlignments,
  cardVisualHorizontalAlignments,
  cardVisualVerticalAlignments,
  componentTypes,
  createDefaultCardLayout,
  createDefaultPieceLayout,
  createDefaultTileLayout,
  getCardTemplateFields,
  getDefaultCardFieldValues,
  getDefaultPieceFieldValues,
  getDefaultTileFieldValues,
  getFirstCardSideText,
  getFirstPieceFaceText,
  getFirstTileSideText,
  getPieceTemplateFields,
  getTileTemplateFields,
  pieceFormFactors,
  pieceShapes,
  resolveCardLayout,
  resolvePieceLayout,
  resolveTileLayout,
  isProjectColorReference,
  tileLayoutSides,
  tileShapes,
  type LayoutContentSource,
  type ProjectColorValue,
  type TemplateFieldValue,
  type TemplateFieldValues,
  type TemplateImageFieldValue,
  type CardImageFit,
  type CardLayout,
  type CardLayoutPadding,
  type CardLayoutSide,
  type CardLayoutSize,
  type LayoutZone,
  type CardSideLayout,
  type CardTemplate,
  type CardTemplateFieldType,
  type CardTextAlignment,
  type CardIconId,
  type CardVisualHorizontalAlignment,
  type CardVisualVerticalAlignment,
  type LayoutZoneContent,
  type CreateGameComponentInput,
  type GameComponent,
  type PieceFormFactor,
  type PieceAppearance,
  type PieceCustomShape,
  type PieceLayout,
  type PieceLayoutFace,
  type PieceLayoutSize,
  type PieceShapePoint,
  type PieceShape,
  type PieceTemplate,
  type TileAppearance,
  type TileCustomShape,
  type TileLayout,
  type TileLayoutSide,
  type TileLayoutSize,
  type TileShapePoint,
  type TileSideLayout,
  type TileShape,
  type TileTemplate,
  type UpdateGameComponentInput
} from "@bg-maker/shared";
import {
  getProjectCardTemplates,
  getProjectCollections,
  getProjectComponents,
  getProjectPieceTemplates,
  getProjectTileTemplates,
  projects,
  setProjectCardTemplates,
  setProjectComponents,
  setProjectPieceTemplates,
  setProjectTileTemplates
} from "./in-memory-store.js";
import { touchProject } from "./project-service.js";
import { fail, ok, type ServiceResult } from "./service-result.js";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

type CommonComponentInput = {
  name: string;
  quantity: number;
  description: string;
  tags: string[];
  notes: string;
};

type CommonComponentFields = Partial<CommonComponentInput>;

type CardFields = {
  frontText: string;
  backText: string;
  templateId: string;
  fieldValues: TemplateFieldValues;
  layout: CardLayout;
};

type TileFields = {
  labelText: string;
  templateId: string;
  fieldValues: TemplateFieldValues;
  layout: TileLayout;
};

type DieFields = {
  sides: number;
  faceLabels: string[];
};

type PieceFields = {
  labelText: string;
  templateId: string;
  appearance: PieceAppearance;
  fieldValues: TemplateFieldValues;
  layout: PieceLayout;
};

export function listComponents(projectId: string): ServiceResult<GameComponent[]> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  return ok(getProjectComponents(projectId).map((component) => resolveComponentForRead(component)));
}

export function createComponent(projectId: string, value: unknown): ServiceResult<GameComponent> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const input = parseCreateComponentInput(value, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  let componentInput = input.value;

  if (componentInput.type === "card") {
    const cardInput = componentInput as typeof componentInput & {
      layout: CardLayout;
      type: "card";
    };

    if (!cardInput.templateId) {
      const template = createFallbackCardTemplate(projectId, cardInput.name, cardInput.layout);
      cardInput.templateId = template.id;
    }

    componentInput = resolveCardInput(cardInput, projectId);
  }

  if (componentInput.type === "tile") {
    const tileInput = componentInput as typeof componentInput & {
      layout: TileLayout;
      type: "tile";
    };

    if (!tileInput.templateId) {
      const template = createFallbackTileTemplate(projectId, tileInput.name, tileInput.layout);
      tileInput.templateId = template.id;
    }

    componentInput = resolveTileInput(tileInput, projectId);
  }

  if (componentInput.type === "piece") {
    const pieceInput = componentInput as typeof componentInput & {
      layout: PieceLayout;
      type: "piece";
    };

    if (!pieceInput.templateId) {
      const template = createFallbackPieceTemplate(projectId, pieceInput.name, pieceInput.layout);
      pieceInput.templateId = template.id;
    }

    componentInput = resolvePieceInput(pieceInput, projectId);
  }

  const timestamp = new Date().toISOString();
  const component: GameComponent = {
    id: randomUUID(),
    projectId,
    ...componentInput,
    createdAt: timestamp,
    updatedAt: timestamp
  } as GameComponent;

  setProjectComponents(projectId, [...getProjectComponents(projectId), component]);
  touchProject(projectId);

  return ok(component);
}

export function updateComponent(
  projectId: string,
  componentId: string,
  value: unknown
): ServiceResult<GameComponent> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const components = getProjectComponents(projectId);
  const currentComponent = components.find((component) => component.id === componentId);

  if (!currentComponent) {
    return fail(404, "Component not found");
  }

  const input = parseUpdateComponentInput(value, currentComponent, projectId);

  if (!input.ok) {
    return fail(400, input.error);
  }

  const resolvedInput =
    currentComponent.type === "card"
      ? resolveCardUpdateInput(currentComponent, input.value)
      : currentComponent.type === "tile"
        ? resolveTileUpdateInput(currentComponent, input.value)
        : currentComponent.type === "piece"
          ? resolvePieceUpdateInput(currentComponent, input.value)
          : input.value;

  const updatedComponent: GameComponent = {
    ...currentComponent,
    ...resolvedInput,
    updatedAt: new Date().toISOString()
  } as GameComponent;

  setProjectComponents(
    projectId,
    components.map((component) =>
      component.id === updatedComponent.id ? updatedComponent : component
    )
  );
  touchProject(projectId);

  return ok(updatedComponent);
}

export function deleteComponent(projectId: string, componentId: string): ServiceResult<undefined> {
  if (!projects.has(projectId)) {
    return fail(404, "Project not found");
  }

  const components = getProjectComponents(projectId);
  const component = components.find((item) => item.id === componentId);

  if (!component) {
    return fail(404, "Component not found");
  }

  if (
    getProjectCollections(projectId).some((collection) =>
      collection.items.some((entry) => entry.componentId === component.id)
    )
  ) {
    return fail(400, "Component is used by a collection");
  }

  setProjectComponents(
    projectId,
    components.filter((item) => item.id !== component.id)
  );
  touchProject(projectId);

  return ok(undefined);
}

export function resolveComponentForRead(component: GameComponent): GameComponent {
  if (component.type === "card") {
    return resolveStoredCard(component);
  }

  if (component.type === "tile") {
    return resolveStoredTile(component);
  }

  if (component.type === "piece") {
    return resolveStoredPiece(component);
  }

  return component;
}

export function resolveStoredCard(
  component: Extract<GameComponent, { type: "card" }>
): Extract<GameComponent, { type: "card" }> {
  const template = getProjectCardTemplates(component.projectId).find(
    (item) => item.id === component.templateId
  );
  const layout = resolveCardLayout(
    template?.layout ?? component.layout,
    component.fieldValues,
    getProjectParameters(component.projectId)
  );

  return {
    ...component,
    layout,
    frontText: getFirstCardSideText(layout.sides.front),
    backText: getFirstCardSideText(layout.sides.back)
  };
}

export function resolveStoredTile(
  component: Extract<GameComponent, { type: "tile" }>
): Extract<GameComponent, { type: "tile" }> {
  const template = getProjectTileTemplates(component.projectId).find(
    (item) => item.id === component.templateId
  );
  const layout = resolveTileLayout(
    template?.layout ?? component.layout,
    component.fieldValues,
    getProjectParameters(component.projectId)
  );

  return {
    ...component,
    layout,
    labelText: getFirstTileSideText(layout)
  };
}

export function resolveStoredPiece(
  component: Extract<GameComponent, { type: "piece" }>
): Extract<GameComponent, { type: "piece" }> {
  const template = getProjectPieceTemplates(component.projectId).find(
    (item) => item.id === component.templateId
  );
  const layout = resolvePieceLayout(
    template?.layout ?? component.layout,
    component.fieldValues,
    component.appearance ?? component.layout.appearance,
    getProjectParameters(component.projectId)
  );

  return {
    ...component,
    layout,
    labelText: getFirstPieceFaceText(layout)
  };
}

function createFallbackCardTemplate(projectId: string, cardName: string, layout: CardLayout) {
  const timestamp = new Date().toISOString();
  const template: CardTemplate = {
    id: randomUUID(),
    projectId,
    name: `${cardName} template`,
    layout,
    fields: getCardTemplateFields(layout),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectCardTemplates(projectId, [...getProjectCardTemplates(projectId), template]);

  return template;
}

function createFallbackTileTemplate(projectId: string, tileName: string, layout: TileLayout) {
  const timestamp = new Date().toISOString();
  const template: TileTemplate = {
    id: randomUUID(),
    projectId,
    name: `${tileName} template`,
    layout,
    fields: getTileTemplateFields(layout),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectTileTemplates(projectId, [...getProjectTileTemplates(projectId), template]);

  return template;
}

function createFallbackPieceTemplate(projectId: string, pieceName: string, layout: PieceLayout) {
  const timestamp = new Date().toISOString();
  const template: PieceTemplate = {
    id: randomUUID(),
    projectId,
    name: `${pieceName} template`,
    layout,
    fields: getPieceTemplateFields(layout),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  setProjectPieceTemplates(projectId, [...getProjectPieceTemplates(projectId), template]);

  return template;
}

function getProjectParameters(projectId: string) {
  return projects.get(projectId)?.parameters ?? [];
}

function resolveCardInput<
  T extends CreateGameComponentInput & CommonComponentInput & { layout: CardLayout; type: "card" }
>(input: T, projectId: string): T {
  const layout = resolveCardLayout(
    input.layout ?? createDefaultCardLayout(),
    input.fieldValues,
    getProjectParameters(projectId)
  );

  return {
    ...input,
    fieldValues: input.fieldValues ?? {},
    layout,
    frontText: getFirstCardSideText(layout.sides.front),
    backText: getFirstCardSideText(layout.sides.back)
  };
}

function resolveCardUpdateInput(
  currentComponent: Extract<GameComponent, { type: "card" }>,
  input: UpdateGameComponentInput
): UpdateGameComponentInput {
  const template = getProjectCardTemplates(currentComponent.projectId).find(
    (item) => item.id === (input.templateId ?? currentComponent.templateId)
  );
  const fieldValues = input.fieldValues ?? currentComponent.fieldValues;
  const layout = resolveCardLayout(
    (input.layout as CardLayout | undefined) ?? template?.layout ?? currentComponent.layout,
    fieldValues,
    getProjectParameters(currentComponent.projectId)
  );

  return {
    ...input,
    fieldValues,
    layout,
    frontText: getFirstCardSideText(layout.sides.front),
    backText: getFirstCardSideText(layout.sides.back)
  };
}

function resolveTileInput<
  T extends CreateGameComponentInput & CommonComponentInput & { layout: TileLayout; type: "tile" }
>(input: T, projectId: string): T {
  const layout = resolveTileLayout(
    input.layout ?? createDefaultTileLayout(),
    input.fieldValues,
    getProjectParameters(projectId)
  );

  return {
    ...input,
    fieldValues: input.fieldValues ?? {},
    layout,
    labelText: getFirstTileSideText(layout)
  };
}

function resolveTileUpdateInput(
  currentComponent: Extract<GameComponent, { type: "tile" }>,
  input: UpdateGameComponentInput
): UpdateGameComponentInput {
  const template = getProjectTileTemplates(currentComponent.projectId).find(
    (item) => item.id === (input.templateId ?? currentComponent.templateId)
  );
  const fieldValues = input.fieldValues ?? currentComponent.fieldValues;
  const layout = resolveTileLayout(
    (input.layout as TileLayout | undefined) ?? template?.layout ?? currentComponent.layout,
    fieldValues,
    getProjectParameters(currentComponent.projectId)
  );

  return {
    ...input,
    fieldValues,
    layout,
    labelText: getFirstTileSideText(layout)
  };
}

function resolvePieceInput<
  T extends CreateGameComponentInput & CommonComponentInput & { layout: PieceLayout; type: "piece" }
>(input: T, projectId: string): T {
  const layout = resolvePieceLayout(
    input.layout ?? createDefaultPieceLayout(),
    input.fieldValues,
    input.appearance,
    getProjectParameters(projectId)
  );

  return {
    ...input,
    appearance: input.appearance ?? layout.appearance,
    fieldValues: input.fieldValues ?? {},
    layout,
    labelText: getFirstPieceFaceText(layout)
  };
}

function resolvePieceUpdateInput(
  currentComponent: Extract<GameComponent, { type: "piece" }>,
  input: UpdateGameComponentInput
): UpdateGameComponentInput {
  const template = getProjectPieceTemplates(currentComponent.projectId).find(
    (item) => item.id === (input.templateId ?? currentComponent.templateId)
  );
  const fieldValues = input.fieldValues ?? currentComponent.fieldValues;
  const layout = resolvePieceLayout(
    (input.layout as PieceLayout | undefined) ?? template?.layout ?? currentComponent.layout,
    fieldValues,
    input.appearance ?? currentComponent.appearance ?? currentComponent.layout.appearance,
    getProjectParameters(currentComponent.projectId)
  );

  return {
    ...input,
    appearance: input.appearance ?? currentComponent.appearance ?? layout.appearance,
    fieldValues,
    layout,
    labelText: getFirstPieceFaceText(layout)
  };
}

function parseCreateComponentInput(
  value: unknown,
  projectId: string
): ParseResult<CreateGameComponentInput & CommonComponentInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  if (!isComponentType(value.type)) {
    return { ok: false, error: "Component type is invalid" };
  }

  const common = parseCommonComponentFields(value);

  if (!common.ok) {
    return common;
  }

  if (!common.value.name) {
    return { ok: false, error: "Component name must not be empty" };
  }

  const base: CommonComponentInput = {
    name: common.value.name,
    quantity: common.value.quantity ?? 1,
    description: common.value.description ?? "",
    tags: common.value.tags ?? [],
    notes: common.value.notes ?? ""
  };

  switch (value.type) {
    case "card": {
      const card = parseCardFields(value, projectId);
      return card.ok ? { ok: true, value: { ...base, type: "card", ...card.value } } : card;
    }

    case "tile": {
      const tile = parseTileFields(value, projectId);
      return tile.ok ? { ok: true, value: { ...base, type: "tile", ...tile.value } } : tile;
    }

    case "piece": {
      const piece = parsePieceFields(value, projectId);
      return piece.ok ? { ok: true, value: { ...base, type: "piece", ...piece.value } } : piece;
    }

    case "die": {
      const die = parseDieFields(value);
      return die.ok ? { ok: true, value: { ...base, type: "die", ...die.value } } : die;
    }
  }
}

function parseUpdateComponentInput(
  value: unknown,
  currentComponent: GameComponent,
  projectId: string
): ParseResult<UpdateGameComponentInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  if (value.type !== undefined) {
    return { ok: false, error: "Component type cannot be changed" };
  }

  const common = parseCommonComponentFields(value);

  if (!common.ok) {
    return common;
  }

  const input: UpdateGameComponentInput = {};

  if (common.value.name !== undefined) {
    input.name = common.value.name;
  }

  if (common.value.quantity !== undefined) {
    input.quantity = common.value.quantity;
  }

  if (common.value.description !== undefined) {
    input.description = common.value.description;
  }

  if (common.value.tags !== undefined) {
    input.tags = common.value.tags;
  }

  if (common.value.notes !== undefined) {
    input.notes = common.value.notes;
  }

  switch (currentComponent.type) {
    case "card": {
      const card = parseCardFields(value, projectId, currentComponent);
      return card.ok ? { ok: true, value: { ...input, ...card.value } } : card;
    }

    case "tile": {
      const tile = parseTileFields(value, projectId, currentComponent);
      return tile.ok ? { ok: true, value: { ...input, ...tile.value } } : tile;
    }

    case "piece": {
      const piece = parsePieceFields(value, projectId, currentComponent);
      return piece.ok ? { ok: true, value: { ...input, ...piece.value } } : piece;
    }

    case "die": {
      const die = parseDieFields(value, currentComponent);
      return die.ok ? { ok: true, value: { ...input, ...die.value } } : die;
    }
  }
}

function parseCommonComponentFields(
  value: Record<string, unknown>
): ParseResult<CommonComponentFields> {
  const name = readOptionalString(value.name);
  const description = readOptionalString(value.description);
  const notes = readOptionalString(value.notes);
  const quantity = readOptionalInteger(value.quantity, "Component quantity", { min: 1 });
  const tags = readOptionalStringArray(value.tags, "Component tags");

  if (value.name !== undefined && !name) {
    return { ok: false, error: "Component name must not be empty" };
  }

  if (!quantity.ok) {
    return quantity;
  }

  if (!tags.ok) {
    return tags;
  }

  return {
    ok: true,
    value: {
      name,
      description,
      notes,
      quantity: quantity.value,
      tags: tags.value
    }
  };
}

function parseCardFields(
  value: Record<string, unknown>,
  projectId: string,
  currentComponent?: Extract<GameComponent, { type: "card" }>
): ParseResult<CardFields> {
  const frontText = readOptionalString(value.frontText);
  const backText = readOptionalString(value.backText);
  const layout = parseOptionalCardLayout(value.layout, projectId);
  const templateId = readOptionalString(value.templateId);

  if (!layout.ok) {
    return layout;
  }

  const selectedTemplateId = templateId ?? currentComponent?.templateId;
  const template = selectedTemplateId
    ? getProjectCardTemplates(projectId).find((item) => item.id === selectedTemplateId)
    : undefined;

  if (selectedTemplateId && !template && value.layout === undefined) {
    return { ok: false, error: "Card template not found" };
  }

  const templateLayout =
    layout.value ??
    template?.layout ??
    (currentComponent?.templateId
      ? getProjectCardTemplates(projectId).find((item) => item.id === currentComponent.templateId)
          ?.layout
      : undefined) ??
    currentComponent?.layout ??
    createDefaultCardLayout({
      frontText: value.frontText === undefined ? currentComponent?.frontText : frontText,
      backText: value.backText === undefined ? currentComponent?.backText : backText
    });
  const fieldValues = parseOptionalCardFieldValues(value.fieldValues, templateLayout);

  if (!fieldValues.ok) {
    return fieldValues;
  }

  const resolvedFieldValues =
    fieldValues.value ?? currentComponent?.fieldValues ?? getDefaultCardFieldValues(templateLayout);
  const resolvedLayout = resolveCardLayout(
    templateLayout,
    resolvedFieldValues,
    getProjectParameters(projectId)
  );

  return {
    ok: true,
    value: {
      frontText:
        layout.value !== undefined || fieldValues.value !== undefined || template !== undefined
          ? getFirstCardSideText(resolvedLayout.sides.front)
          : value.frontText === undefined
            ? (currentComponent?.frontText ?? "")
            : (frontText ?? ""),
      backText:
        layout.value !== undefined || fieldValues.value !== undefined || template !== undefined
          ? getFirstCardSideText(resolvedLayout.sides.back)
          : value.backText === undefined
            ? (currentComponent?.backText ?? "")
            : (backText ?? ""),
      templateId: selectedTemplateId ?? currentComponent?.templateId ?? "",
      fieldValues: resolvedFieldValues,
      layout: resolvedLayout
    }
  };
}

const cardImageDataUrlMaxBytes = 1024 * 1024;
const maxCardLayoutZones = 16;
const cardSizeRange = { min: 20, max: 300 };

function parseOptionalCardFieldValues(
  value: unknown,
  layout: CardLayout
): ParseResult<TemplateFieldValues | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "Card field values must be an object" };
  }

  const fields = getCardTemplateFields(layout);
  const values: TemplateFieldValues = {};

  for (const field of fields) {
    const fieldValue = value[field.key];

    if (fieldValue === undefined) {
      continue;
    }

    const parsedValue = parseCardFieldValue(field.type, fieldValue, field.label);

    if (!parsedValue.ok) {
      return parsedValue;
    }

    values[field.key] = parsedValue.value;
  }

  return { ok: true, value: { ...getDefaultCardFieldValues(layout), ...values } };
}

function parseOptionalTileFieldValues(
  value: unknown,
  layout: TileLayout
): ParseResult<TemplateFieldValues | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "Tile field values must be an object" };
  }

  const fields = getTileTemplateFields(layout);
  const values: TemplateFieldValues = {};

  for (const field of fields) {
    const fieldValue = value[field.key];

    if (fieldValue === undefined) {
      continue;
    }

    const parsedValue = parseCardFieldValue(field.type, fieldValue, field.label);

    if (!parsedValue.ok) {
      return parsedValue;
    }

    values[field.key] = parsedValue.value;
  }

  return { ok: true, value: { ...getDefaultTileFieldValues(layout), ...values } };
}

function parseOptionalPieceFieldValues(
  value: unknown,
  layout: PieceLayout
): ParseResult<TemplateFieldValues | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "Piece field values must be an object" };
  }

  const fields = getPieceTemplateFields(layout);
  const values: TemplateFieldValues = {};

  for (const field of fields) {
    const fieldValue = value[field.key];

    if (fieldValue === undefined) {
      continue;
    }

    const parsedValue = parseCardFieldValue(field.type, fieldValue, field.label);

    if (!parsedValue.ok) {
      return parsedValue;
    }

    values[field.key] = parsedValue.value;
  }

  return { ok: true, value: { ...getDefaultPieceFieldValues(layout), ...values } };
}

function parseCardFieldValue(
  type: CardTemplateFieldType,
  value: unknown,
  label: string
): ParseResult<TemplateFieldValue> {
  switch (type) {
    case "text": {
      const text = readRequiredString(value, `Card field ${label}`, {
        allowEmpty: true,
        trim: false
      });
      return text.ok ? { ok: true, value: text.value } : text;
    }

    case "number": {
      const number = readRequiredNumber(value, `Card field ${label}`);
      return number.ok ? { ok: true, value: number.value } : number;
    }

    case "icon": {
      const icon = readRequiredIconId(value);
      return icon.ok ? { ok: true, value: icon.value } : icon;
    }

    case "image":
      return parseCardImageFieldValue(value);
  }
}

function parseCardImageFieldValue(value: unknown): ParseResult<TemplateImageFieldValue> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card image field value must be an object" };
  }

  const dataUrl = readOptionalImageDataUrl(value.dataUrl);
  const fileName = readRequiredString(value.fileName, "Card image field file name", {
    allowEmpty: true
  });
  const fit =
    value.fit === undefined
      ? ({ ok: true, value: undefined } as ParseResult<CardImageFit | undefined>)
      : readRequiredImageFit(value.fit);

  if (!dataUrl.ok) {
    return dataUrl;
  }

  if (!fileName.ok) {
    return fileName;
  }

  if (!fit.ok) {
    return fit;
  }

  return {
    ok: true,
    value: {
      dataUrl: dataUrl.value,
      fileName: fileName.value,
      fit: fit.value
    }
  };
}

export function parseOptionalCardLayout(
  value: unknown,
  projectId?: string
): ParseResult<CardLayout | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  return parseCardLayout(value, projectId);
}

export function parseCardLayout(value: unknown, projectId?: string): ParseResult<CardLayout> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card layout must be an object" };
  }

  if (value.version !== 1) {
    return { ok: false, error: "Card layout version is invalid" };
  }

  const size = parseCardLayoutSize(value.size);

  if (!size.ok) {
    return size;
  }

  if (!isRecord(value.sides)) {
    return { ok: false, error: "Card layout sides must be an object" };
  }

  const sides = {} as Record<CardLayoutSide, CardSideLayout>;

  for (const side of cardLayoutSides) {
    const parsedSide = parseCardSideLayout(value.sides[side], size.value, projectId);

    if (!parsedSide.ok) {
      return parsedSide;
    }

    sides[side] = parsedSide.value;
  }

  return {
    ok: true,
    value: {
      version: 1,
      size: size.value,
      sides
    }
  };
}

export function parseOptionalTileLayout(
  value: unknown,
  projectId?: string
): ParseResult<TileLayout | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  return parseTileLayout(value, projectId);
}

export function parseTileLayout(value: unknown, projectId?: string): ParseResult<TileLayout> {
  if (!isRecord(value)) {
    return { ok: false, error: "Tile layout must be an object" };
  }

  if (value.version !== 1) {
    return { ok: false, error: "Tile layout version is invalid" };
  }

  const shape = readRequiredTileShape(value.shape);
  const sizeMm = parseTileLayoutSize(value.sizeMm);
  const appearance = parseTileAppearance(value.appearance, projectId);
  const rotationDeg = readOptionalInteger(value.rotationDeg, "Tile rotation", {
    min: 0,
    max: 359
  });
  const customShape =
    value.shape === "custom"
      ? parseRequiredTileCustomShape(value.customShape)
      : parseOptionalPresetTileCustomShape(value.customShape);

  if (!shape.ok) {
    return shape;
  }

  if (!sizeMm.ok) {
    return sizeMm;
  }

  if (!appearance.ok) {
    return appearance;
  }

  if (!rotationDeg.ok) {
    return rotationDeg;
  }

  if (!customShape.ok) {
    return customShape;
  }

  if (!isRecord(value.sides)) {
    return { ok: false, error: "Tile layout sides must be an object" };
  }

  const sides = {} as Record<TileLayoutSide, TileSideLayout>;

  for (const side of tileLayoutSides) {
    const parsedSide = parseTileSideLayout(value.sides[side], sizeMm.value, projectId);

    if (!parsedSide.ok) {
      return parsedSide;
    }

    sides[side] = parsedSide.value;
  }

  return {
    ok: true,
    value: {
      version: 1,
      shape: shape.value,
      sizeMm: sizeMm.value,
      appearance: appearance.value,
      rotationDeg: normalizeRotation(rotationDeg.value ?? 0),
      customShape: customShape.value,
      sides
    }
  };
}

export function parseOptionalPieceLayout(
  value: unknown,
  projectId?: string
): ParseResult<PieceLayout | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  return parsePieceLayout(value, projectId);
}

export function parsePieceLayout(value: unknown, projectId?: string): ParseResult<PieceLayout> {
  if (!isRecord(value)) {
    return { ok: false, error: "Piece layout must be an object" };
  }

  if (value.version !== 1) {
    return { ok: false, error: "Piece layout version is invalid" };
  }

  const formFactor = readRequiredPieceFormFactor(value.formFactor);
  const shape = readRequiredPieceShape(value.shape);
  const sizeMm = parsePieceLayoutSize(value.sizeMm);
  const appearance = parsePieceAppearance(value.appearance, projectId);
  const customShape =
    value.shape === "custom"
      ? parseRequiredPieceCustomShape(value.customShape)
      : parseOptionalPresetPieceCustomShape(value.customShape);
  const faces = parsePieceLayoutFaces(value.faces, projectId);

  if (!formFactor.ok) {
    return formFactor;
  }

  if (!shape.ok) {
    return shape;
  }

  if (!sizeMm.ok) {
    return sizeMm;
  }

  if (!appearance.ok) {
    return appearance;
  }

  if (!customShape.ok) {
    return customShape;
  }

  if (!faces.ok) {
    return faces;
  }

  return {
    ok: true,
    value: {
      version: 1,
      formFactor: formFactor.value,
      shape: shape.value,
      sizeMm: sizeMm.value,
      appearance: appearance.value,
      customShape: customShape.value,
      faces: faces.value
    }
  };
}

function parseCardLayoutSize(value: unknown): ParseResult<CardLayoutSize> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card size must be an object" };
  }

  if (!isCardSizePreset(value.preset)) {
    return { ok: false, error: "Card size preset is invalid" };
  }

  if (value.preset !== "custom") {
    return {
      ok: true,
      value: {
        preset: value.preset,
        ...cardSizePresetDimensions[value.preset]
      }
    };
  }

  const width = readRequiredNumber(value.widthMm, "Card width", cardSizeRange);
  const height = readRequiredNumber(value.heightMm, "Card height", cardSizeRange);

  if (!width.ok) {
    return width;
  }

  if (!height.ok) {
    return height;
  }

  return {
    ok: true,
    value: {
      preset: "custom",
      widthMm: width.value,
      heightMm: height.value
    }
  };
}

function parseTileLayoutSize(value: unknown): ParseResult<TileLayoutSize> {
  if (!isRecord(value)) {
    return { ok: false, error: "Tile size must be an object" };
  }

  const width = readRequiredNumber(value.widthMm, "Tile width", { min: 1, max: 300 });
  const height = readRequiredNumber(value.heightMm, "Tile height", { min: 1, max: 300 });

  if (!width.ok) {
    return width;
  }

  if (!height.ok) {
    return height;
  }

  return {
    ok: true,
    value: {
      widthMm: width.value,
      heightMm: height.value
    }
  };
}

function parsePieceLayoutSize(value: unknown): ParseResult<PieceLayoutSize> {
  if (!isRecord(value)) {
    return { ok: false, error: "Piece size must be an object" };
  }

  const width = readRequiredNumber(value.widthMm, "Piece width", { min: 1, max: 300 });
  const height = readRequiredNumber(value.heightMm, "Piece height", { min: 1, max: 300 });
  const depth = readRequiredNumber(value.depthMm, "Piece depth", { min: 0, max: 300 });

  if (!width.ok) {
    return width;
  }

  if (!height.ok) {
    return height;
  }

  if (!depth.ok) {
    return depth;
  }

  return {
    ok: true,
    value: {
      widthMm: width.value,
      heightMm: height.value,
      depthMm: depth.value
    }
  };
}

function parseTileAppearance(value: unknown, projectId?: string): ParseResult<TileAppearance> {
  if (!isRecord(value)) {
    return { ok: false, error: "Tile appearance must be an object" };
  }

  const fillColor = readRequiredProjectColorValue(value.fillColor, "Tile fill color", projectId);
  const strokeColor = readRequiredProjectColorValue(
    value.strokeColor,
    "Tile stroke color",
    projectId
  );

  if (!fillColor.ok) {
    return fillColor;
  }

  if (!strokeColor.ok) {
    return strokeColor;
  }

  return {
    ok: true,
    value: {
      fillColor: fillColor.value,
      strokeColor: strokeColor.value
    }
  };
}

function parsePieceAppearance(value: unknown, projectId?: string): ParseResult<PieceAppearance> {
  if (!isRecord(value)) {
    return { ok: false, error: "Piece appearance must be an object" };
  }

  const fillColor = readRequiredProjectColorValue(value.fillColor, "Piece fill color", projectId);
  const strokeColor = readRequiredProjectColorValue(
    value.strokeColor,
    "Piece stroke color",
    projectId
  );

  if (!fillColor.ok) {
    return fillColor;
  }

  if (!strokeColor.ok) {
    return strokeColor;
  }

  return {
    ok: true,
    value: {
      fillColor: fillColor.value,
      strokeColor: strokeColor.value
    }
  };
}

function parseOptionalPieceAppearance(
  value: unknown,
  projectId?: string
): ParseResult<Partial<PieceAppearance> | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "Piece appearance must be an object" };
  }

  const appearance: Partial<PieceAppearance> = {};

  if (value.fillColor !== undefined) {
    const fillColor = readRequiredProjectColorValue(value.fillColor, "Piece fill color", projectId);

    if (!fillColor.ok) {
      return fillColor;
    }

    appearance.fillColor = fillColor.value;
  }

  if (value.strokeColor !== undefined) {
    const strokeColor = readRequiredProjectColorValue(
      value.strokeColor,
      "Piece stroke color",
      projectId
    );

    if (!strokeColor.ok) {
      return strokeColor;
    }

    appearance.strokeColor = strokeColor.value;
  }

  return { ok: true, value: appearance };
}

function parseOptionalPresetPieceCustomShape(value: unknown): ParseResult<undefined> {
  if (value !== undefined) {
    return { ok: false, error: "Piece custom shape can only be used with custom shape" };
  }

  return { ok: true, value: undefined };
}

function parseOptionalPresetTileCustomShape(value: unknown): ParseResult<undefined> {
  if (value !== undefined) {
    return { ok: false, error: "Tile custom shape can only be used with custom shape" };
  }

  return { ok: true, value: undefined };
}

function parseRequiredPieceCustomShape(value: unknown): ParseResult<PieceCustomShape> {
  if (!isRecord(value)) {
    return { ok: false, error: "Piece custom shape must be an object" };
  }

  if (!Array.isArray(value.points)) {
    return { ok: false, error: "Piece custom shape points must be an array" };
  }

  if (value.points.length < 3) {
    return { ok: false, error: "Piece custom shape must include at least 3 points" };
  }

  if (value.points.length > 64) {
    return { ok: false, error: "Piece custom shape can include at most 64 points" };
  }

  const points: PieceShapePoint[] = [];

  for (const item of value.points) {
    if (!isRecord(item)) {
      return { ok: false, error: "Piece custom shape points must be objects" };
    }

    const x = readRequiredNumber(item.x, "Piece custom shape point x", { min: 0, max: 100 });
    const y = readRequiredNumber(item.y, "Piece custom shape point y", { min: 0, max: 100 });

    if (!x.ok) {
      return x;
    }

    if (!y.ok) {
      return y;
    }

    points.push({ x: x.value, y: y.value });
  }

  return { ok: true, value: { points } };
}

function parseRequiredTileCustomShape(value: unknown): ParseResult<TileCustomShape> {
  if (!isRecord(value)) {
    return { ok: false, error: "Tile custom shape must be an object" };
  }

  if (!Array.isArray(value.points)) {
    return { ok: false, error: "Tile custom shape points must be an array" };
  }

  if (value.points.length < 3) {
    return { ok: false, error: "Tile custom shape must include at least 3 points" };
  }

  if (value.points.length > 64) {
    return { ok: false, error: "Tile custom shape can include at most 64 points" };
  }

  const points: TileShapePoint[] = [];

  for (const item of value.points) {
    if (!isRecord(item)) {
      return { ok: false, error: "Tile custom shape points must be objects" };
    }

    const x = readRequiredNumber(item.x, "Tile custom shape point x", { min: 0, max: 100 });
    const y = readRequiredNumber(item.y, "Tile custom shape point y", { min: 0, max: 100 });

    if (!x.ok) {
      return x;
    }

    if (!y.ok) {
      return y;
    }

    points.push({ x: x.value, y: y.value });
  }

  return { ok: true, value: { points } };
}

function parsePieceLayoutFaces(value: unknown, projectId?: string): ParseResult<PieceLayoutFace[]> {
  if (!Array.isArray(value)) {
    return { ok: false, error: "Piece layout faces must be an array" };
  }

  if (value.length < 1 || value.length > 2) {
    return { ok: false, error: "Piece layout must include one or two faces" };
  }

  const faces: PieceLayoutFace[] = [];
  const faceIds = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) {
      return { ok: false, error: "Piece layout faces must be objects" };
    }

    const id = readRequiredString(item.id, "Piece face id");
    const name = readRequiredString(item.name, "Piece face name");
    const zones = parseCardZones(item.zones, {
      allowEmpty: true,
      label: "Piece layout",
      projectId
    });

    if (!id.ok) {
      return id;
    }

    if (!name.ok) {
      return name;
    }

    if (!zones.ok) {
      return zones;
    }

    if (faceIds.has(id.value)) {
      return { ok: false, error: "Piece layout face ids must be unique" };
    }

    faceIds.add(id.value);
    faces.push({
      id: id.value,
      name: name.value,
      zones: zones.value
    });
  }

  return { ok: true, value: faces };
}

function parseCardLayoutPadding(
  value: unknown,
  size: CardLayoutSize
): ParseResult<CardLayoutPadding> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card padding must be an object" };
  }

  const top = readRequiredNumber(value.topMm, "Card padding top", { min: 0 });
  const right = readRequiredNumber(value.rightMm, "Card padding right", { min: 0 });
  const bottom = readRequiredNumber(value.bottomMm, "Card padding bottom", { min: 0 });
  const left = readRequiredNumber(value.leftMm, "Card padding left", { min: 0 });

  if (!top.ok) {
    return top;
  }

  if (!right.ok) {
    return right;
  }

  if (!bottom.ok) {
    return bottom;
  }

  if (!left.ok) {
    return left;
  }

  if (left.value + right.value >= size.widthMm) {
    return { ok: false, error: "Card horizontal padding must leave room for zones" };
  }

  if (top.value + bottom.value >= size.heightMm) {
    return { ok: false, error: "Card vertical padding must leave room for zones" };
  }

  return {
    ok: true,
    value: {
      topMm: top.value,
      rightMm: right.value,
      bottomMm: bottom.value,
      leftMm: left.value
    }
  };
}

function parseCardSideLayout(
  value: unknown,
  size: CardLayoutSize,
  projectId?: string
): ParseResult<CardSideLayout> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card side layout must be an object" };
  }

  const padding = parseCardLayoutPadding(value.paddingMm, size);

  if (!padding.ok) {
    return padding;
  }

  const zones = parseCardZones(value.zones, { projectId });

  if (!zones.ok) {
    return zones;
  }

  return {
    ok: true,
    value: {
      paddingMm: padding.value,
      zones: zones.value
    }
  };
}

function parseTileSideLayout(
  value: unknown,
  size: TileLayoutSize,
  projectId?: string
): ParseResult<TileSideLayout> {
  if (!isRecord(value)) {
    return { ok: false, error: "Tile side layout must be an object" };
  }

  const padding = parseCardLayoutPadding(value.paddingMm, {
    preset: "custom",
    widthMm: size.widthMm,
    heightMm: size.heightMm
  });

  if (!padding.ok) {
    return padding;
  }

  const zones = parseCardZones(value.zones, { label: "Tile layout", projectId });

  if (!zones.ok) {
    return zones;
  }

  return {
    ok: true,
    value: {
      paddingMm: padding.value,
      zones: zones.value
    }
  };
}

function parseCardZones(
  value: unknown,
  options: { allowEmpty?: boolean; label?: string; projectId?: string } = {}
): ParseResult<LayoutZone[]> {
  const label = options.label ?? "Card layout";

  if (!Array.isArray(value)) {
    return { ok: false, error: `${label} zones must be an array` };
  }

  if (!options.allowEmpty && value.length === 0) {
    return { ok: false, error: "Card layout must include at least one zone per side" };
  }

  if (value.length > maxCardLayoutZones) {
    return { ok: false, error: `${label} can include at most ${maxCardLayoutZones} zones` };
  }

  const zones: LayoutZone[] = [];
  const zoneIds = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) {
      return { ok: false, error: "Card layout zones must be objects" };
    }

    const id = readRequiredString(item.id, "Card zone id");
    const name = readRequiredString(item.name, "Card zone name");
    const x = readRequiredNumber(item.x, "Card zone x", { min: 0, max: 100 });
    const y = readRequiredNumber(item.y, "Card zone y", { min: 0, max: 100 });
    const width = readRequiredNumber(item.width, "Card zone width", { min: 1, max: 100 });
    const height = readRequiredNumber(item.height, "Card zone height", { min: 1, max: 100 });
    const content = parseCardZoneContent(item.content, options.projectId);

    if (!id.ok) {
      return id;
    }

    if (!name.ok) {
      return name;
    }

    if (!x.ok) {
      return x;
    }

    if (!y.ok) {
      return y;
    }

    if (!width.ok) {
      return width;
    }

    if (!height.ok) {
      return height;
    }

    if (!content.ok) {
      return content;
    }

    if (zoneIds.has(id.value)) {
      return { ok: false, error: "Card layout zone ids must be unique" };
    }

    if (x.value + width.value > 100 || y.value + height.value > 100) {
      return { ok: false, error: "Card zone must stay within card bounds" };
    }

    zoneIds.add(id.value);
    zones.push({
      id: id.value,
      name: name.value,
      x: x.value,
      y: y.value,
      width: width.value,
      height: height.value,
      content: content.value
    });
  }

  return { ok: true, value: zones };
}

function parseCardZoneContent(value: unknown, projectId?: string): ParseResult<LayoutZoneContent> {
  if (!isRecord(value)) {
    return { ok: false, error: "Card zone content must be an object" };
  }

  const source = parseOptionalCardContentSource(value.source);

  if (!source.ok) {
    return source;
  }

  switch (value.type) {
    case "text": {
      const text = readRequiredString(value.text, "Card text", { allowEmpty: true, trim: false });
      const fontSize = readRequiredInteger(value.fontSize, "Card text font size", {
        min: 8,
        max: 72
      });
      const bold = readRequiredBoolean(value.bold, "Card text bold");
      const align = readRequiredTextAlignment(value.align);
      const color = readRequiredProjectColorValue(value.color, "Card text color", projectId);

      if (!text.ok) {
        return text;
      }

      if (!fontSize.ok) {
        return fontSize;
      }

      if (!bold.ok) {
        return bold;
      }

      if (!align.ok) {
        return align;
      }

      if (!color.ok) {
        return color;
      }

      return {
        ok: true,
        value: {
          type: "text",
          source: source.value ?? { mode: "static" },
          text: text.value,
          fontSize: fontSize.value,
          bold: bold.value,
          align: align.value,
          color: color.value
        }
      };
    }

    case "visual": {
      if (value.visualType !== "image" && value.visualType !== "icon") {
        return { ok: false, error: "Card visual type is invalid" };
      }

      const dataUrl = readOptionalImageDataUrl(value.dataUrl);
      const fileName = readRequiredString(value.fileName, "Card image file name", {
        allowEmpty: true
      });
      const fit = readRequiredImageFit(value.fit);
      const iconId = readRequiredIconId(value.iconId);
      const size = readRequiredInteger(value.size, "Card icon size", { min: 8, max: 96 });
      const color = readRequiredProjectColorValue(value.color, "Card icon color", projectId);
      const horizontalAlign = readRequiredVisualHorizontalAlignment(value.horizontalAlign);
      const verticalAlign = readRequiredVisualVerticalAlignment(value.verticalAlign);

      if (!dataUrl.ok) {
        return dataUrl;
      }

      if (!fileName.ok) {
        return fileName;
      }

      if (!fit.ok) {
        return fit;
      }

      if (!iconId.ok) {
        return iconId;
      }

      if (!size.ok) {
        return size;
      }

      if (!color.ok) {
        return color;
      }

      if (!horizontalAlign.ok) {
        return horizontalAlign;
      }

      if (!verticalAlign.ok) {
        return verticalAlign;
      }

      return {
        ok: true,
        value: {
          type: "visual",
          source: source.value ?? { mode: "static" },
          visualType: value.visualType,
          dataUrl: dataUrl.value,
          fileName: fileName.value,
          fit: fit.value,
          iconId: iconId.value,
          size: size.value,
          color: color.value,
          horizontalAlign: horizontalAlign.value,
          verticalAlign: verticalAlign.value
        }
      };
    }

    default:
      return { ok: false, error: "Card zone content type is invalid" };
  }
}

function parseOptionalCardContentSource(
  value: unknown
): ParseResult<LayoutContentSource | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "Card content source must be an object" };
  }

  if (value.mode === "static") {
    return { ok: true, value: { mode: "static" } };
  }

  if (value.mode !== "field") {
    return { ok: false, error: "Card content source mode is invalid" };
  }

  const fieldKey = readRequiredString(value.fieldKey, "Card content field key");

  if (!fieldKey.ok) {
    return fieldKey;
  }

  if (!/^[a-z][a-z0-9_]*$/i.test(fieldKey.value)) {
    return {
      ok: false,
      error: "Card content field key must contain only letters, numbers, and underscores"
    };
  }

  return { ok: true, value: { mode: "field", fieldKey: fieldKey.value } };
}

function parseDieFields(
  value: Record<string, unknown>,
  currentComponent?: Extract<GameComponent, { type: "die" }>
): ParseResult<DieFields> {
  const sides = readOptionalInteger(value.sides, "Die sides", { min: 2, max: 100 });

  if (!sides.ok) {
    return sides;
  }

  const resolvedSides = sides.value ?? currentComponent?.sides ?? 6;
  const faceLabels = readOptionalStringArray(value.faceLabels, "Die face labels");

  if (!faceLabels.ok) {
    return faceLabels;
  }

  if (faceLabels.value !== undefined && faceLabels.value.length !== resolvedSides) {
    return { ok: false, error: "Die face labels must match side count" };
  }

  return {
    ok: true,
    value: {
      sides: resolvedSides,
      faceLabels:
        faceLabels.value ??
        (currentComponent?.sides === resolvedSides
          ? currentComponent.faceLabels
          : buildDefaultFaceLabels(resolvedSides))
    }
  };
}

function parseTileFields(
  value: Record<string, unknown>,
  projectId: string,
  currentComponent?: Extract<GameComponent, { type: "tile" }>
): ParseResult<TileFields> {
  const layout = parseOptionalTileLayout(value.layout, projectId);
  const templateId = readOptionalString(value.templateId);

  if (!layout.ok) {
    return layout;
  }

  const selectedTemplateId = templateId ?? currentComponent?.templateId;
  const template = selectedTemplateId
    ? getProjectTileTemplates(projectId).find((item) => item.id === selectedTemplateId)
    : undefined;

  if (selectedTemplateId && !template && value.layout === undefined) {
    return { ok: false, error: "Tile template not found" };
  }

  const templateLayout =
    layout.value ??
    template?.layout ??
    (currentComponent?.templateId
      ? getProjectTileTemplates(projectId).find((item) => item.id === currentComponent.templateId)
          ?.layout
      : undefined) ??
    currentComponent?.layout ??
    createDefaultTileLayout();
  const fieldValues = parseOptionalTileFieldValues(value.fieldValues, templateLayout);

  if (!fieldValues.ok) {
    return fieldValues;
  }

  const resolvedFieldValues =
    fieldValues.value ?? currentComponent?.fieldValues ?? getDefaultTileFieldValues(templateLayout);
  const resolvedLayout = resolveTileLayout(
    templateLayout,
    resolvedFieldValues,
    getProjectParameters(projectId)
  );

  return {
    ok: true,
    value: {
      labelText: getFirstTileSideText(resolvedLayout),
      templateId: selectedTemplateId ?? currentComponent?.templateId ?? "",
      fieldValues: resolvedFieldValues,
      layout: resolvedLayout
    }
  };
}

function parsePieceFields(
  value: Record<string, unknown>,
  projectId: string,
  currentComponent?: Extract<GameComponent, { type: "piece" }>
): ParseResult<PieceFields> {
  const layout = parseOptionalPieceLayout(value.layout, projectId);
  const templateId = readOptionalString(value.templateId);
  const appearance = parseOptionalPieceAppearance(value.appearance, projectId);

  if (!layout.ok) {
    return layout;
  }

  if (!appearance.ok) {
    return appearance;
  }

  const selectedTemplateId = templateId ?? currentComponent?.templateId;
  const template = selectedTemplateId
    ? getProjectPieceTemplates(projectId).find((item) => item.id === selectedTemplateId)
    : undefined;

  if (selectedTemplateId && !template && value.layout === undefined) {
    return { ok: false, error: "Piece template not found" };
  }

  const templateLayout =
    layout.value ??
    template?.layout ??
    (currentComponent?.templateId
      ? getProjectPieceTemplates(projectId).find((item) => item.id === currentComponent.templateId)
          ?.layout
      : undefined) ??
    currentComponent?.layout ??
    createDefaultPieceLayout();
  const fieldValues = parseOptionalPieceFieldValues(value.fieldValues, templateLayout);

  if (!fieldValues.ok) {
    return fieldValues;
  }

  const resolvedFieldValues =
    fieldValues.value ??
    currentComponent?.fieldValues ??
    getDefaultPieceFieldValues(templateLayout);
  const resolvedAppearance = {
    ...templateLayout.appearance,
    ...(currentComponent?.appearance ?? currentComponent?.layout.appearance ?? {}),
    ...(appearance.value ?? {})
  };
  const resolvedLayout = resolvePieceLayout(
    templateLayout,
    resolvedFieldValues,
    resolvedAppearance,
    getProjectParameters(projectId)
  );

  return {
    ok: true,
    value: {
      labelText: getFirstPieceFaceText(resolvedLayout),
      templateId: selectedTemplateId ?? currentComponent?.templateId ?? "",
      appearance: resolvedAppearance,
      fieldValues: resolvedFieldValues,
      layout: resolvedLayout
    }
  };
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

function readRequiredString(
  value: unknown,
  label: string,
  options: { allowEmpty?: boolean; trim?: boolean } = {}
): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }

  const resolvedValue = options.trim === false ? value : value.trim();

  if (!options.allowEmpty && resolvedValue.length === 0) {
    return { ok: false, error: `${label} must not be empty` };
  }

  return { ok: true, value: resolvedValue };
}

function readRequiredNumber(
  value: unknown,
  label: string,
  range: { min?: number; max?: number } = {}
): ParseResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${label} must be a number` };
  }

  if (range.min !== undefined && value < range.min) {
    return { ok: false, error: `${label} must be at least ${range.min}` };
  }

  if (range.max !== undefined && value > range.max) {
    return { ok: false, error: `${label} must be at most ${range.max}` };
  }

  return { ok: true, value };
}

function readRequiredInteger(
  value: unknown,
  label: string,
  range: { min?: number; max?: number } = {}
): ParseResult<number> {
  const number = readRequiredNumber(value, label, range);

  if (!number.ok) {
    return number;
  }

  if (!Number.isInteger(number.value)) {
    return { ok: false, error: `${label} must be an integer` };
  }

  return number;
}

function readRequiredBoolean(value: unknown, label: string): ParseResult<boolean> {
  if (typeof value !== "boolean") {
    return { ok: false, error: `${label} must be a boolean` };
  }

  return { ok: true, value };
}

function normalizeRotation(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

function readRequiredTileShape(value: unknown): ParseResult<TileShape> {
  if (!tileShapes.includes(value as TileShape)) {
    return { ok: false, error: "Tile shape is invalid" };
  }

  return { ok: true, value: value as TileShape };
}

function readRequiredPieceFormFactor(value: unknown): ParseResult<PieceFormFactor> {
  if (!pieceFormFactors.includes(value as PieceFormFactor)) {
    return { ok: false, error: "Piece form factor is invalid" };
  }

  return { ok: true, value: value as PieceFormFactor };
}

function readRequiredPieceShape(value: unknown): ParseResult<PieceShape> {
  if (!pieceShapes.includes(value as PieceShape)) {
    return { ok: false, error: "Piece shape is invalid" };
  }

  return { ok: true, value: value as PieceShape };
}

function readRequiredTextAlignment(value: unknown): ParseResult<CardTextAlignment> {
  if (!cardTextAlignments.includes(value as CardTextAlignment)) {
    return { ok: false, error: "Card text alignment is invalid" };
  }

  return { ok: true, value: value as CardTextAlignment };
}

function readRequiredImageFit(value: unknown): ParseResult<CardImageFit> {
  if (!cardImageFits.includes(value as CardImageFit)) {
    return { ok: false, error: "Card image fit is invalid" };
  }

  return { ok: true, value: value as CardImageFit };
}

function readRequiredVisualHorizontalAlignment(
  value: unknown
): ParseResult<CardVisualHorizontalAlignment> {
  if (!cardVisualHorizontalAlignments.includes(value as CardVisualHorizontalAlignment)) {
    return { ok: false, error: "Card visual horizontal position is invalid" };
  }

  return { ok: true, value: value as CardVisualHorizontalAlignment };
}

function readRequiredVisualVerticalAlignment(
  value: unknown
): ParseResult<CardVisualVerticalAlignment> {
  if (!cardVisualVerticalAlignments.includes(value as CardVisualVerticalAlignment)) {
    return { ok: false, error: "Card visual vertical position is invalid" };
  }

  return { ok: true, value: value as CardVisualVerticalAlignment };
}

function readRequiredIconId(value: unknown): ParseResult<CardIconId> {
  if (!cardIconIds.includes(value as CardIconId)) {
    return { ok: false, error: "Card icon id is invalid" };
  }

  return { ok: true, value: value as CardIconId };
}

function readRequiredHexColor(value: unknown, label: string): ParseResult<string> {
  const color = readRequiredString(value, label);

  if (!color.ok) {
    return color;
  }

  if (!/^#[\da-f]{3}([\da-f]{3})?$/i.test(color.value)) {
    return { ok: false, error: `${label} must be a hex color` };
  }

  return color;
}

function readRequiredProjectColorValue(
  value: unknown,
  label: string,
  projectId?: string
): ParseResult<ProjectColorValue> {
  if (isProjectColorReference(value)) {
    const key = readRequiredString(value.key, `${label} project parameter key`);

    if (!key.ok) {
      return key;
    }

    const parameter = projectId
      ? getProjectParameters(projectId).find((item) => item.key === key.value)
      : undefined;

    if (projectId && !parameter) {
      return { ok: false, error: `${label} project color parameter not found` };
    }

    if (parameter && parameter.type !== "color") {
      return { ok: false, error: `${label} project parameter must be a color` };
    }

    return { ok: true, value: { source: "project", key: key.value } };
  }

  return readRequiredHexColor(value, label);
}

function readOptionalImageDataUrl(value: unknown): ParseResult<string> {
  const dataUrl = readRequiredString(value, "Card image data URL", { allowEmpty: true });

  if (!dataUrl.ok) {
    return dataUrl;
  }

  if (dataUrl.value.length === 0) {
    return { ok: true, value: "" };
  }

  const match = /^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);base64,([a-z\d+/=]+)$/i.exec(
    dataUrl.value
  );

  if (!match) {
    return { ok: false, error: "Card image data URL must be a base64 image data URL" };
  }

  if (Buffer.byteLength(match[1], "base64") > cardImageDataUrlMaxBytes) {
    return { ok: false, error: "Card image data URL must be 1 MB or smaller" };
  }

  return dataUrl;
}

function buildDefaultFaceLabels(sides: number) {
  return Array.from({ length: sides }, (_item, index) => String(index + 1));
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComponentType(value: unknown): value is CreateGameComponentInput["type"] {
  return componentTypes.includes(value as CreateGameComponentInput["type"]);
}

function isCardSizePreset(value: unknown): value is CardLayoutSize["preset"] {
  return cardSizePresets.includes(value as CardLayoutSize["preset"]);
}
