import { useState } from "react";
import {
  type ComponentType,
  type ComponentVisibility,
  type CreateGameComponentInput,
  type DeckCardEntry,
  type GameComponent,
  type UpdateGameComponentInput
} from "@bg-maker/shared";

export type ComponentFormSubmitValues = CreateGameComponentInput | UpdateGameComponentInput;

export type ComponentFormValues = {
  type: ComponentType;
  name: string;
  quantity: number;
  description: string;
  tagsText: string;
  notes: string;
  frontText: string;
  backText: string;
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

export function useComponentForm(component?: GameComponent) {
  const [values, setValues] = useState<ComponentFormValues>(() =>
    getComponentFormValues(component)
  );
  const nameIsEmpty = values.name.trim().length === 0;

  function buildSubmitValues(mode: "create" | "edit"): ComponentFormSubmitValues | null {
    if (nameIsEmpty) {
      return null;
    }

    const payload = buildComponentPayload(values);

    if (mode === "edit") {
      const { type, ...updatePayload } = payload;
      void type;
      return updatePayload;
    }

    return payload;
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

function getComponentFormValues(component?: GameComponent): ComponentFormValues {
  if (!component) {
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
    case "card":
      return {
        ...common,
        frontText: component.frontText,
        backText: component.backText,
        defaultVisibility: component.defaultVisibility
      };

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
    type: values.type,
    name: values.name.trim(),
    quantity: values.quantity,
    description: values.description.trim(),
    tags: parseTags(values.tagsText),
    notes: values.notes.trim()
  };

  switch (values.type) {
    case "card":
      return {
        ...base,
        type: "card",
        frontText: values.frontText.trim(),
        backText: values.backText.trim(),
        defaultVisibility: values.defaultVisibility
      };

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
  }
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag, index, tags) => tag.length > 0 && tags.indexOf(tag) === index);
}
