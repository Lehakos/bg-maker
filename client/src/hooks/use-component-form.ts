import { useState } from "react";
import {
  createDefaultCardLayout,
  getDefaultCardFieldValues,
  getFirstCardSideText,
  resolveCardLayout,
  type CardFieldValues,
  type CardLayout,
  type CardTemplate,
  type ComponentType,
  type ComponentVisibility,
  type CreateGameComponentInput,
  type DeckCardEntry,
  type GameComponent,
  type UpdateGameComponentInput
} from "@bg-maker/shared";

export type ComponentFormType = ComponentType | "cardTemplate";

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
  cardFieldValues: CardFieldValues;
  layout: CardLayout;
  defaultVisibility: ComponentVisibility;
  deckCards: DeckCardEntry[];
  shuffleOnSetup: boolean;
  sides: number;
  headsLabel: string;
  tailsLabel: string;
  usage: string;
  stackable: boolean;
  valueLabel: string;
};

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
  defaultVisibility: "visible",
  deckCards: [],
  shuffleOnSetup: true,
  sides: 6,
  headsLabel: "Heads",
  tailsLabel: "Tails",
  usage: "",
  stackable: true,
  valueLabel: ""
};

export function useComponentForm(
  component?: GameComponent,
  cardTemplates: CardTemplate[] = [],
  cardTemplate?: CardTemplate,
  formKind: "cardTemplate" | "component" = "component"
) {
  const [values, setValues] = useState<ComponentFormValues>(() =>
    getComponentFormValues(component, cardTemplates, cardTemplate, formKind)
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

    if (values.type === "card" && !values.cardTemplateId) {
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

  function updateDeckCard(index: number, patch: Partial<DeckCardEntry>) {
    setValues((currentValues) => ({
      ...currentValues,
      deckCards: currentValues.deckCards.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry
      )
    }));
  }

  function removeDeckCard(index: number) {
    setValues((currentValues) => ({
      ...currentValues,
      deckCards: currentValues.deckCards.filter((_entry, entryIndex) => entryIndex !== index)
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
    removeDeckCard,
    setDieSides,
    setValues,
    updateDeckCard,
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
  cardTemplate?: CardTemplate,
  formKind: "cardTemplate" | "component" = "component"
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

  if (!component) {
    const template = cardTemplates[0];

    return template
      ? {
          ...defaultValues,
          cardTemplateId: template.id,
          cardTemplateName: template.name,
          cardFieldValues: getDefaultCardFieldValues(template.layout),
          layout: template.layout
        }
      : defaultValues;
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
        layout,
        defaultVisibility: component.defaultVisibility
      };
    }

    case "deck":
      return {
        ...common,
        defaultVisibility: component.defaultVisibility,
        deckCards: component.cards,
        shuffleOnSetup: component.shuffleOnSetup
      };

    case "die":
      return {
        ...common,
        sides: component.sides
      };

    case "coin":
      return {
        ...common,
        headsLabel: component.headsLabel,
        tailsLabel: component.tailsLabel
      };

    case "marker":
      return {
        ...common,
        usage: component.usage
      };

    case "token":
      return {
        ...common,
        stackable: component.stackable,
        valueLabel: component.valueLabel
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
        fieldValues: values.cardFieldValues,
        defaultVisibility: values.defaultVisibility
      };
    }

    case "deck":
      return {
        ...base,
        type: "deck",
        cards: values.deckCards.filter((entry) => entry.cardId.length > 0),
        shuffleOnSetup: values.shuffleOnSetup,
        defaultVisibility: values.defaultVisibility
      };

    case "die":
      return {
        ...base,
        type: "die",
        sides: values.sides
      };

    case "coin":
      return {
        ...base,
        type: "coin",
        headsLabel: values.headsLabel.trim(),
        tailsLabel: values.tailsLabel.trim()
      };

    case "marker":
      return {
        ...base,
        type: "marker",
        usage: values.usage.trim()
      };

    case "token":
      return {
        ...base,
        type: "token",
        stackable: values.stackable,
        valueLabel: values.valueLabel.trim()
      };

    case "cardTemplate":
      throw new Error("Card templates are submitted through the card template API");
  }
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag, index, tags) => tag.length > 0 && tags.indexOf(tag) === index);
}
