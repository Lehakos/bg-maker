import type { ProjectObjectDeck, ProjectObjectNode } from "@bg-maker/shared";
import {
  getDefaultProjectObjectDeck,
  getDefaultProjectObjectRectTransform,
  getProjectObjectCardSizePreset,
  getProjectObjectRectTransformWithCardSizePreset,
  projectObjectCardCustomSizePresetId
} from "@bg-maker/shared";

export function getProjectObjectDeckComponent(object: ProjectObjectNode): ProjectObjectDeck {
  return normalizeProjectObjectDeckComponent({
    ...getDefaultProjectObjectDeck(),
    ...object.components?.deck
  });
}

export function withProjectObjectDeckComponent(
  object: ProjectObjectNode,
  deck: ProjectObjectDeck
): ProjectObjectNode {
  const nextDeck = normalizeProjectObjectDeckComponent(deck);
  const nextObject = {
    ...object,
    components: {
      ...object.components,
      deck: nextDeck
    }
  };

  if (object.kind !== "deck") {
    return nextObject;
  }

  const rectTransform = {
    ...getDefaultProjectObjectRectTransform(object.kind),
    ...nextObject.components.rectTransform
  };

  return {
    ...nextObject,
    components: {
      ...nextObject.components,
      rectTransform: getProjectObjectRectTransformWithCardSizePreset(rectTransform, nextDeck)
    }
  };
}

export function normalizeProjectObjectDeckComponent(
  deck: Partial<ProjectObjectDeck>
): ProjectObjectDeck {
  const defaultDeck = getDefaultProjectObjectDeck();
  const sizePreset =
    deck.sizePreset === projectObjectCardCustomSizePresetId ||
    Boolean(getProjectObjectCardSizePreset(deck.sizePreset ?? ""))
      ? (deck.sizePreset as ProjectObjectDeck["sizePreset"])
      : defaultDeck.sizePreset;

  return {
    sizePreset
  };
}
