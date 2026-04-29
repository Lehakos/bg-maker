import { useRef, useState } from "react";
import {
  createDefaultCardLayout,
  createDefaultPieceLayout,
  createDefaultTileLayout,
  collectionTypeAllowsComponent,
  getDefaultCardFieldValues,
  getDefaultPieceFieldValues,
  getDefaultTileFieldValues,
  getFirstCardSideText,
  getFirstPieceFaceText,
  getFirstTileSideText,
  normalizeIntegerDegrees,
  parseTagsText,
  resolveCardLayout,
  resolvePieceLayout,
  resolveTileLayout,
  type TemplateFieldValues,
  type CardLayout,
  type CardTemplate,
  type ComponentCollection,
  type ComponentCollectionItem,
  type ComponentCollectionType,
  type ComponentType,
  type CreateComponentCollectionInput,
  type CreateGameComponentInput,
  type CreatePieceTemplateInput,
  type CreateTileTemplateInput,
  type GameComponent,
  type PieceAppearance,
  type PieceFormFactor,
  type PieceLayout,
  type PieceShape,
  type PieceTemplate,
  type TileLayout,
  type TileShape,
  type TileTemplate,
  type UpdateGameComponentInput,
  type UpdatePieceTemplateInput,
  type UpdateTileTemplateInput
} from "@bg-maker/shared";

export type ComponentFormType =
  | ComponentType
  | "cardTemplate"
  | "collection"
  | "pieceTemplate"
  | "tileTemplate";

export type TemplateFormType = Extract<
  ComponentFormType,
  "cardTemplate" | "pieceTemplate" | "tileTemplate"
>;

export type ComponentFormSubmitValues =
  | {
      kind: "component";
      component: CreateGameComponentInput | UpdateGameComponentInput;
    }
  | {
      kind: "cardTemplate";
      cardTemplate: {
        id?: string;
        layout: CardLayout;
        name: string;
      };
    }
  | {
      kind: "pieceTemplate";
      pieceTemplate: (CreatePieceTemplateInput | UpdatePieceTemplateInput) & {
        id?: string;
        layout: PieceLayout;
        name: string;
      };
    }
  | {
      kind: "tileTemplate";
      tileTemplate: (CreateTileTemplateInput | UpdateTileTemplateInput) & {
        id?: string;
        layout: TileLayout;
        name: string;
      };
    }
  | {
      collection: CreateComponentCollectionInput & {
        id?: string;
        name: string;
      };
      kind: "collection";
    };

export type ComponentFormValues = {
  type: ComponentFormType;
  name: string;
  description: string;
  tagsText: string;
  notes: string;
  frontText: string;
  backText: string;
  cardTemplateId: string;
  cardTemplateName: string;
  cardFieldValues: TemplateFieldValues;
  layout: CardLayout;
  pieceTemplateId: string;
  pieceTemplateName: string;
  pieceFieldValues: TemplateFieldValues;
  pieceAppearance: PieceAppearance;
  pieceLayout: PieceLayout;
  pieceFormFactor: PieceFormFactor;
  pieceShape: PieceShape;
  pieceWidthMm: number;
  pieceHeightMm: number;
  pieceDepthMm: number;
  pieceTwoSided: boolean;
  pieceFaceText: string;
  tileTemplateId: string;
  tileTemplateName: string;
  tileFieldValues: TemplateFieldValues;
  tileLayout: TileLayout;
  tileShape: TileShape;
  tileWidthMm: number;
  tileHeightMm: number;
  collectionType: ComponentCollectionType;
  collectionItems: ComponentCollectionItem[];
  sides: number;
};

const defaultPieceLayout = createDefaultPieceLayout();
const defaultTileLayout = createDefaultTileLayout();

const defaultValues: ComponentFormValues = {
  type: "card",
  name: "",
  description: "",
  tagsText: "",
  notes: "",
  frontText: "",
  backText: "",
  cardTemplateId: "",
  cardTemplateName: "Default card",
  cardFieldValues: {},
  layout: createDefaultCardLayout(),
  pieceTemplateId: "",
  pieceTemplateName: "Default piece",
  pieceFieldValues: {},
  pieceAppearance: defaultPieceLayout.appearance,
  pieceLayout: defaultPieceLayout,
  pieceFormFactor: defaultPieceLayout.formFactor,
  pieceShape: defaultPieceLayout.shape,
  pieceWidthMm: defaultPieceLayout.sizeMm.widthMm,
  pieceHeightMm: defaultPieceLayout.sizeMm.heightMm,
  pieceDepthMm: defaultPieceLayout.sizeMm.depthMm,
  pieceTwoSided: defaultPieceLayout.faces.length > 1,
  pieceFaceText: "",
  tileTemplateId: "",
  tileTemplateName: "Default tile",
  tileFieldValues: {},
  tileLayout: defaultTileLayout,
  tileShape: defaultTileLayout.shape,
  tileWidthMm: defaultTileLayout.sizeMm.widthMm,
  tileHeightMm: defaultTileLayout.sizeMm.heightMm,
  collectionType: "deck",
  collectionItems: [],
  sides: 6
};

export function useComponentForm(
  component?: GameComponent,
  cardTemplates: CardTemplate[] = [],
  pieceTemplates: PieceTemplate[] = [],
  tileTemplates: TileTemplate[] = [],
  cardTemplate?: CardTemplate,
  pieceTemplate?: PieceTemplate,
  tileTemplate?: TileTemplate,
  collection?: ComponentCollection,
  formKind:
    | "cardTemplate"
    | "collection"
    | "component"
    | "pieceTemplate"
    | "tileTemplate" = "component",
  initialComponentType?: ComponentType
) {
  const [values, setValues] = useState<ComponentFormValues>(() =>
    getComponentFormValues(
      component,
      cardTemplates,
      pieceTemplates,
      tileTemplates,
      cardTemplate,
      pieceTemplate,
      tileTemplate,
      collection,
      formKind,
      initialComponentType
    )
  );
  const cachedValuesByTypeRef = useRef<Partial<Record<ComponentFormType, ComponentFormValues>>>({});
  const cachedCollectionItemsByTypeRef = useRef<
    Partial<Record<ComponentCollectionType, ComponentCollectionItem[]>>
  >({});
  const nameIsEmpty = values.name.trim().length === 0;

  function buildSubmitValues(mode: "create" | "edit"): ComponentFormSubmitValues | null {
    if (nameIsEmpty) {
      return null;
    }

    if (values.type === "cardTemplate") {
      return {
        kind: "cardTemplate",
        cardTemplate: {
          id: values.cardTemplateId || undefined,
          name: values.name.trim(),
          layout: values.layout
        }
      };
    }

    if (values.type === "pieceTemplate") {
      return {
        kind: "pieceTemplate",
        pieceTemplate: {
          id: values.pieceTemplateId || undefined,
          name: values.name.trim(),
          layout: buildPieceTemplateLayout(values)
        }
      };
    }

    if (values.type === "tileTemplate") {
      return {
        kind: "tileTemplate",
        tileTemplate: {
          id: values.tileTemplateId || undefined,
          name: values.name.trim(),
          layout: buildTileTemplateLayout(values)
        }
      };
    }

    if (values.type === "collection") {
      return {
        kind: "collection",
        collection: {
          id: collection?.id,
          type: values.collectionType,
          name: values.name.trim(),
          description: values.description.trim(),
          tags: parseTagsText(values.tagsText),
          notes: values.notes.trim(),
          items: values.collectionItems.filter((item) => item.componentId.length > 0)
        }
      };
    }

    if (values.type === "card" && !values.cardTemplateId) {
      return null;
    }

    if (values.type === "piece" && !values.pieceTemplateId) {
      return null;
    }

    if (values.type === "tile" && !values.tileTemplateId) {
      return null;
    }

    const payload = buildComponentPayload(values);

    if (mode === "edit") {
      const { type, ...updatePayload } = payload;
      void type;

      return {
        kind: "component",
        component: updatePayload
      };
    }

    return {
      kind: "component",
      component: payload
    };
  }

  function updateCollectionItem(index: number, patch: Partial<ComponentCollectionItem>) {
    setValues((currentValues) => ({
      ...currentValues,
      collectionItems: currentValues.collectionItems.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry
      )
    }));
  }

  function removeCollectionItem(index: number) {
    setValues((currentValues) => ({
      ...currentValues,
      collectionItems: currentValues.collectionItems.filter(
        (_entry, entryIndex) => entryIndex !== index
      )
    }));
  }

  function selectCollectionType(
    collectionType: ComponentCollectionType,
    seedItems: ComponentCollectionItem[] = []
  ) {
    setValues((currentValues) => {
      if (currentValues.collectionType === collectionType) {
        return currentValues;
      }

      cachedCollectionItemsByTypeRef.current[currentValues.collectionType] =
        currentValues.collectionItems;

      return {
        ...currentValues,
        collectionType,
        collectionItems: cachedCollectionItemsByTypeRef.current[collectionType] ?? seedItems
      };
    });
  }

  function setDieSides(sides: number) {
    setValues((currentValues) => ({
      ...currentValues,
      sides
    }));
  }

  function selectType(type: ComponentFormType) {
    setValues((currentValues) => {
      if (currentValues.type === type) {
        return currentValues;
      }

      cachedValuesByTypeRef.current[currentValues.type] = currentValues;

      const cachedValues = cachedValuesByTypeRef.current[type];
      const targetValues =
        cachedValues ?? getNewFormValuesForType(type, cardTemplates, pieceTemplates, tileTemplates);

      return withCurrentCommonValues(currentValues, targetValues);
    });
  }

  return {
    buildSubmitValues,
    nameIsEmpty,
    removeCollectionItem,
    selectCollectionType,
    selectType,
    setDieSides,
    setValues,
    updateCollectionItem,
    values
  };
}

export function readNumber(value: number | string, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function getCompatibleCollectionItems(
  items: ComponentCollectionItem[],
  collectionType: ComponentCollectionType,
  components: GameComponent[]
) {
  const allowedComponentIds = new Set(
    components
      .filter((component) => collectionTypeAllowsComponent(collectionType, component.type))
      .map((component) => component.id)
  );

  return items.filter((item) => allowedComponentIds.has(item.componentId));
}

export function getPieceFormStateFromLayout(layout: PieceLayout): Partial<ComponentFormValues> {
  return {
    pieceLayout: layout,
    pieceFormFactor: layout.formFactor,
    pieceShape: layout.shape,
    pieceWidthMm: layout.sizeMm.widthMm,
    pieceHeightMm: layout.sizeMm.heightMm,
    pieceDepthMm: layout.sizeMm.depthMm,
    pieceTwoSided: layout.formFactor !== "solid" && layout.faces.length > 1,
    pieceFaceText: getFirstPieceFaceText(layout)
  };
}

export function getTileFormStateFromLayout(layout: TileLayout): Partial<ComponentFormValues> {
  return {
    tileLayout: layout,
    tileShape: layout.shape,
    tileWidthMm: layout.sizeMm.widthMm,
    tileHeightMm: layout.sizeMm.heightMm
  };
}

function getComponentFormValues(
  component?: GameComponent,
  cardTemplates: CardTemplate[] = [],
  pieceTemplates: PieceTemplate[] = [],
  tileTemplates: TileTemplate[] = [],
  cardTemplate?: CardTemplate,
  pieceTemplate?: PieceTemplate,
  tileTemplate?: TileTemplate,
  collection?: ComponentCollection,
  formKind:
    | "cardTemplate"
    | "collection"
    | "component"
    | "pieceTemplate"
    | "tileTemplate" = "component",
  initialComponentType?: ComponentType
): ComponentFormValues {
  if (cardTemplate) {
    return {
      ...defaultValues,
      type: "cardTemplate",
      name: cardTemplate.name,
      cardTemplateId: cardTemplate.id,
      cardTemplateName: cardTemplate.name,
      layout: cardTemplate.layout
    };
  }

  if (pieceTemplate) {
    return {
      ...defaultValues,
      type: "pieceTemplate",
      name: pieceTemplate.name,
      pieceTemplateId: pieceTemplate.id,
      pieceTemplateName: pieceTemplate.name,
      ...getPieceTemplateFormFields(pieceTemplate.layout)
    };
  }

  if (tileTemplate) {
    return {
      ...defaultValues,
      type: "tileTemplate",
      name: tileTemplate.name,
      tileTemplateId: tileTemplate.id,
      tileTemplateName: tileTemplate.name,
      tileFieldValues: {},
      ...getTileTemplateFormFields(tileTemplate.layout)
    };
  }

  if (collection) {
    return {
      ...defaultValues,
      type: "collection",
      name: collection.name,
      description: collection.description,
      tagsText: collection.tags.join(", "),
      notes: collection.notes,
      collectionType: collection.type,
      collectionItems: collection.items
    };
  }

  if (formKind === "cardTemplate") {
    return {
      ...defaultValues,
      type: "cardTemplate",
      name: "",
      cardTemplateId: "",
      cardTemplateName: "",
      cardFieldValues: {},
      layout: createDefaultCardLayout()
    };
  }

  if (formKind === "pieceTemplate") {
    const layout = createDefaultPieceLayout();

    return {
      ...defaultValues,
      type: "pieceTemplate",
      name: "",
      pieceTemplateId: "",
      pieceTemplateName: "",
      pieceFieldValues: {},
      ...getPieceTemplateFormFields(layout)
    };
  }

  if (formKind === "tileTemplate") {
    const layout = createDefaultTileLayout();

    return {
      ...defaultValues,
      type: "tileTemplate",
      name: "",
      tileTemplateId: "",
      tileTemplateName: "",
      tileFieldValues: {},
      ...getTileTemplateFormFields(layout)
    };
  }

  if (formKind === "collection") {
    return {
      ...defaultValues,
      type: "collection",
      name: "",
      collectionType: "deck",
      collectionItems: []
    };
  }

  if (!component) {
    if (initialComponentType) {
      return getNewComponentFormValuesForType(
        initialComponentType,
        cardTemplates,
        pieceTemplates,
        tileTemplates
      );
    }

    const template = cardTemplates[0];

    if (template) {
      return {
        ...defaultValues,
        cardTemplateId: template.id,
        cardTemplateName: template.name,
        cardFieldValues: getDefaultCardFieldValues(template.layout),
        layout: template.layout
      };
    }

    const piece = pieceTemplates[0];

    if (piece) {
      return {
        ...defaultValues,
        type: "piece",
        pieceTemplateId: piece.id,
        pieceTemplateName: piece.name,
        pieceFieldValues: getDefaultPieceFieldValues(piece.layout),
        ...getPieceTemplateFormFields(piece.layout)
      };
    }

    const tile = tileTemplates[0];

    if (tile) {
      return {
        ...defaultValues,
        type: "tile",
        tileTemplateId: tile.id,
        tileTemplateName: tile.name,
        tileFieldValues: getDefaultTileFieldValues(tile.layout),
        ...getTileTemplateFormFields(tile.layout)
      };
    }

    return defaultValues;
  }

  const common = {
    ...defaultValues,
    type: component.type,
    name: component.name,
    description: component.description,
    tagsText: component.tags.join(", "),
    notes: component.notes
  };

  switch (component.type) {
    case "card": {
      const template = cardTemplates.find((item) => item.id === component.templateId);
      const layout =
        template?.layout ??
        component.layout ??
        createDefaultCardLayout({
          frontText: component.frontText,
          backText: component.backText
        });

      return {
        ...common,
        frontText: component.frontText,
        backText: component.backText,
        cardTemplateId: component.templateId,
        cardTemplateName: template?.name ?? "Default card",
        cardFieldValues: {
          ...getDefaultCardFieldValues(layout),
          ...component.fieldValues
        },
        layout
      };
    }

    case "tile": {
      const template = tileTemplates.find((item) => item.id === component.templateId);
      const layout = template?.layout ?? component.layout ?? createDefaultTileLayout();

      return {
        ...common,
        tileTemplateId: component.templateId,
        tileTemplateName: template?.name ?? "Default tile",
        tileFieldValues: {
          ...getDefaultTileFieldValues(layout),
          ...component.fieldValues
        },
        ...getTileTemplateFormFields(layout)
      };
    }

    case "piece": {
      const template = pieceTemplates.find((item) => item.id === component.templateId);
      const layout = template?.layout ?? component.layout ?? createDefaultPieceLayout();
      const appearance = {
        ...layout.appearance,
        ...(component.appearance ?? {})
      };

      return {
        ...common,
        pieceTemplateId: component.templateId,
        pieceTemplateName: template?.name ?? "Default piece",
        pieceFieldValues: {
          ...getDefaultPieceFieldValues(layout),
          ...component.fieldValues
        },
        pieceAppearance: appearance,
        pieceLayout: layout
      };
    }

    case "die":
      return {
        ...common,
        sides: component.sides
      };
  }
}

function getNewComponentFormValuesForType(
  type: ComponentType,
  cardTemplates: CardTemplate[],
  pieceTemplates: PieceTemplate[],
  tileTemplates: TileTemplate[]
): ComponentFormValues {
  if (type === "card") {
    const template = cardTemplates[0];

    if (!template) {
      return { ...defaultValues, type: "card" };
    }

    return {
      ...defaultValues,
      type: "card",
      cardTemplateId: template.id,
      cardTemplateName: template.name,
      cardFieldValues: getDefaultCardFieldValues(template.layout),
      layout: template.layout
    };
  }

  if (type === "piece") {
    const piece = pieceTemplates[0];

    if (!piece) {
      return { ...defaultValues, type: "piece" };
    }

    return {
      ...defaultValues,
      type: "piece",
      pieceTemplateId: piece.id,
      pieceTemplateName: piece.name,
      pieceFieldValues: getDefaultPieceFieldValues(piece.layout),
      ...getPieceTemplateFormFields(piece.layout)
    };
  }

  if (type === "tile") {
    const tile = tileTemplates[0];

    if (!tile) {
      return { ...defaultValues, type: "tile" };
    }

    return {
      ...defaultValues,
      type: "tile",
      tileTemplateId: tile.id,
      tileTemplateName: tile.name,
      tileFieldValues: getDefaultTileFieldValues(tile.layout),
      ...getTileTemplateFormFields(tile.layout)
    };
  }

  return {
    ...defaultValues,
    type: "die"
  };
}

function getNewTemplateFormValuesForType(type: TemplateFormType): ComponentFormValues {
  if (type === "cardTemplate") {
    return {
      ...defaultValues,
      type: "cardTemplate",
      cardTemplateId: "",
      cardTemplateName: "",
      cardFieldValues: {},
      layout: createDefaultCardLayout()
    };
  }

  if (type === "pieceTemplate") {
    const layout = createDefaultPieceLayout();

    return {
      ...defaultValues,
      type: "pieceTemplate",
      pieceTemplateId: "",
      pieceTemplateName: "",
      pieceFieldValues: {},
      ...getPieceTemplateFormFields(layout)
    };
  }

  const layout = createDefaultTileLayout();

  return {
    ...defaultValues,
    type: "tileTemplate",
    tileTemplateId: "",
    tileTemplateName: "",
    tileFieldValues: {},
    ...getTileTemplateFormFields(layout)
  };
}

function getNewFormValuesForType(
  type: ComponentFormType,
  cardTemplates: CardTemplate[],
  pieceTemplates: PieceTemplate[],
  tileTemplates: TileTemplate[]
): ComponentFormValues {
  switch (type) {
    case "card":
    case "die":
    case "piece":
    case "tile":
      return getNewComponentFormValuesForType(type, cardTemplates, pieceTemplates, tileTemplates);
    case "cardTemplate":
    case "pieceTemplate":
    case "tileTemplate":
      return getNewTemplateFormValuesForType(type);
    case "collection":
      return {
        ...defaultValues,
        type: "collection",
        name: "",
        collectionType: "deck",
        collectionItems: []
      };
  }
}

function withCurrentCommonValues(
  currentValues: ComponentFormValues,
  targetValues: ComponentFormValues
): ComponentFormValues {
  return {
    ...targetValues,
    name: currentValues.name,
    description: currentValues.description,
    tagsText: currentValues.tagsText,
    notes: currentValues.notes
  };
}

function buildComponentPayload(values: ComponentFormValues): CreateGameComponentInput {
  const base = {
    name: values.name.trim(),
    description: values.description.trim(),
    tags: parseTagsText(values.tagsText),
    notes: values.notes.trim()
  };

  switch (values.type) {
    case "card": {
      const resolvedLayout = resolveCardLayout(values.layout, values.cardFieldValues);

      return {
        ...base,
        type: "card",
        frontText: getFirstCardSideText(resolvedLayout.sides.front),
        backText: getFirstCardSideText(resolvedLayout.sides.back),
        templateId: values.cardTemplateId,
        fieldValues: values.cardFieldValues
      };
    }

    case "tile": {
      const resolvedLayout = resolveTileLayout(values.tileLayout, values.tileFieldValues);

      return {
        ...base,
        type: "tile",
        labelText: getFirstTileSideText(resolvedLayout),
        templateId: values.tileTemplateId,
        fieldValues: values.tileFieldValues
      };
    }

    case "piece": {
      const resolvedLayout = resolvePieceLayout(
        values.pieceLayout,
        values.pieceFieldValues,
        values.pieceAppearance
      );

      return {
        ...base,
        type: "piece",
        labelText: getFirstPieceFaceText(resolvedLayout),
        templateId: values.pieceTemplateId,
        appearance: values.pieceAppearance,
        fieldValues: values.pieceFieldValues
      };
    }

    case "die":
      return {
        ...base,
        type: "die",
        sides: values.sides
      };

    case "cardTemplate":
    case "collection":
    case "pieceTemplate":
    case "tileTemplate":
      throw new Error("Non-component form values are submitted through their own APIs");
  }
}

function buildPieceTemplateLayout(values: ComponentFormValues): PieceLayout {
  const fallbackLayout = createDefaultPieceLayout({
    faceText: values.pieceFaceText,
    formFactor: values.pieceFormFactor,
    shape: values.pieceShape,
    twoSided: values.pieceTwoSided && values.pieceFormFactor !== "solid"
  });
  const allowTwoSided = values.pieceFormFactor !== "solid" && values.pieceTwoSided;
  const faces =
    values.pieceLayout.faces.length > 0 ? values.pieceLayout.faces : fallbackLayout.faces;

  return {
    ...values.pieceLayout,
    formFactor: values.pieceFormFactor,
    shape: values.pieceShape,
    sizeMm: {
      widthMm: values.pieceWidthMm,
      heightMm: values.pieceHeightMm,
      depthMm: values.pieceDepthMm
    },
    appearance: { ...values.pieceLayout.appearance },
    customShape:
      values.pieceShape === "custom" && values.pieceLayout.customShape
        ? {
            points: values.pieceLayout.customShape.points.map((point) => ({ ...point }))
          }
        : undefined,
    faces: (allowTwoSided ? faces.slice(0, 2) : faces.slice(0, 1)).map((face) => ({
      ...face,
      zones: face.zones.map((zone) => ({
        ...zone,
        content: {
          ...zone.content,
          source: zone.content.source ? { ...zone.content.source } : undefined
        }
      }))
    }))
  };
}

function buildTileTemplateLayout(values: ComponentFormValues): TileLayout {
  const fallbackLayout = createDefaultTileLayout({
    shape: values.tileShape,
    size: {
      widthMm: values.tileWidthMm,
      heightMm: values.tileHeightMm
    }
  });

  return {
    ...values.tileLayout,
    shape: values.tileShape,
    sizeMm: {
      widthMm: values.tileWidthMm,
      heightMm: values.tileHeightMm
    },
    rotationDeg: normalizeIntegerDegrees(values.tileLayout.rotationDeg ?? 0),
    appearance: { ...values.tileLayout.appearance },
    customShape:
      values.tileShape === "custom" && values.tileLayout.customShape
        ? {
            points: values.tileLayout.customShape.points.map((point) => ({ ...point }))
          }
        : undefined,
    sides: {
      front: cloneTileSide(values.tileLayout.sides.front ?? fallbackLayout.sides.front),
      back: cloneTileSide(values.tileLayout.sides.back ?? fallbackLayout.sides.back)
    }
  };
}

function getPieceTemplateFormFields(layout: PieceLayout) {
  return {
    ...getPieceFormStateFromLayout(layout),
    pieceAppearance: { ...layout.appearance }
  };
}

function getTileTemplateFormFields(layout: TileLayout) {
  return getTileFormStateFromLayout(layout);
}

function cloneTileSide(side: TileLayout["sides"]["front"]) {
  return {
    ...side,
    paddingMm: { ...side.paddingMm },
    zones: side.zones.map((zone) => ({
      ...zone,
      content: {
        ...zone.content,
        source: zone.content.source ? { ...zone.content.source } : undefined
      }
    }))
  };
}
