import { useState } from "react";
import {
  createDefaultCardLayout,
  createDefaultPieceLayout,
  getDefaultCardFieldValues,
  getDefaultPieceFieldValues,
  getFirstCardSideText,
  getFirstPieceFaceText,
  resolveCardLayout,
  resolvePieceLayout,
  type TemplateFieldValues,
  type CardLayout,
  type CardTemplate,
  type ComponentCollection,
  type ComponentCollectionItem,
  type ComponentType,
  type CreateComponentCollectionInput,
  type CreateGameComponentInput,
  type CreatePieceTemplateInput,
  type GameComponent,
  type PieceAppearance,
  type PieceFormFactor,
  type PieceLayout,
  type PieceShape,
  type ProjectColorValue,
  type PieceTemplate,
  type TileShape,
  type UpdateComponentCollectionInput,
  type UpdateGameComponentInput,
  type UpdatePieceTemplateInput
} from "@bg-maker/shared";

export type ComponentFormType = ComponentType | "cardTemplate" | "pieceTemplate" | "collection";

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
      collection: (CreateComponentCollectionInput | UpdateComponentCollectionInput) & {
        id?: string;
        name: string;
      };
      kind: "collection";
    };

export type ComponentFormValues = {
  type: ComponentFormType;
  name: string;
  quantity: number;
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
  tileShape: TileShape;
  tileFaceLabel: string;
  tileColor: ProjectColorValue;
  tileEdgeLabelsText: string;
  collectionItems: ComponentCollectionItem[];
  sides: number;
};

const defaultPieceLayout = createDefaultPieceLayout();

const defaultValues: ComponentFormValues = {
  type: "card",
  name: "",
  quantity: 1,
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
  tileShape: "square",
  tileFaceLabel: "",
  tileColor: "#e2e8f0",
  tileEdgeLabelsText: "",
  collectionItems: [],
  sides: 6
};

export function useComponentForm(
  component?: GameComponent,
  cardTemplates: CardTemplate[] = [],
  pieceTemplates: PieceTemplate[] = [],
  cardTemplate?: CardTemplate,
  pieceTemplate?: PieceTemplate,
  collection?: ComponentCollection,
  formKind: "cardTemplate" | "collection" | "component" | "pieceTemplate" = "component"
) {
  const [values, setValues] = useState<ComponentFormValues>(() =>
    getComponentFormValues(
      component,
      cardTemplates,
      pieceTemplates,
      cardTemplate,
      pieceTemplate,
      collection,
      formKind
    )
  );
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

    if (values.type === "collection") {
      return {
        kind: "collection",
        collection: {
          id: collection?.id,
          name: values.name.trim(),
          description: values.description.trim(),
          tags: parseTags(values.tagsText),
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

  function setDieSides(sides: number) {
    setValues((currentValues) => ({
      ...currentValues,
      sides
    }));
  }

  return {
    buildSubmitValues,
    nameIsEmpty,
    removeCollectionItem,
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

function getComponentFormValues(
  component?: GameComponent,
  cardTemplates: CardTemplate[] = [],
  pieceTemplates: PieceTemplate[] = [],
  cardTemplate?: CardTemplate,
  pieceTemplate?: PieceTemplate,
  collection?: ComponentCollection,
  formKind: "cardTemplate" | "collection" | "component" | "pieceTemplate" = "component"
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

  if (collection) {
    return {
      ...defaultValues,
      type: "collection",
      name: collection.name,
      description: collection.description,
      tagsText: collection.tags.join(", "),
      notes: collection.notes,
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

  if (formKind === "collection") {
    return {
      ...defaultValues,
      type: "collection",
      name: "",
      collectionItems: []
    };
  }

  if (!component) {
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

    return defaultValues;
  }

  const common = {
    ...defaultValues,
    type: component.type,
    name: component.name,
    quantity: component.quantity,
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

    case "tile":
      return {
        ...common,
        tileShape: component.shape,
        tileFaceLabel: component.faceLabel,
        tileColor: component.color,
        tileEdgeLabelsText: component.edgeLabels.join(", ")
      };

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

function buildComponentPayload(values: ComponentFormValues): CreateGameComponentInput {
  const base = {
    name: values.name.trim(),
    quantity: values.quantity,
    description: values.description.trim(),
    tags: parseTags(values.tagsText),
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

    case "tile":
      return {
        ...base,
        type: "tile",
        shape: values.tileShape,
        faceLabel: values.tileFaceLabel.trim(),
        color: values.tileColor,
        edgeLabels: parseTileEdgeLabels(values.tileEdgeLabelsText, values.tileShape)
      };

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
  const faces = values.pieceLayout.faces.length > 0 ? values.pieceLayout.faces : fallbackLayout.faces;

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
        content: { ...zone.content, source: zone.content.source ? { ...zone.content.source } : undefined }
      }))
    }))
  };
}

function getPieceTemplateFormFields(layout: PieceLayout) {
  return {
    pieceLayout: layout,
    pieceAppearance: { ...layout.appearance },
    pieceFormFactor: layout.formFactor,
    pieceShape: layout.shape,
    pieceWidthMm: layout.sizeMm.widthMm,
    pieceHeightMm: layout.sizeMm.heightMm,
    pieceDepthMm: layout.sizeMm.depthMm,
    pieceTwoSided: layout.faces.length > 1,
    pieceFaceText: getFirstPieceFaceText(layout)
  };
}

function parseTileEdgeLabels(value: string, shape: TileShape) {
  const expectedCount = shape === "square" ? 4 : 6;
  const labels = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return Array.from({ length: expectedCount }, (_item, index) => labels[index] ?? "");
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag, index, tags) => tag.length > 0 && tags.indexOf(tag) === index);
}
