import type { ProjectObjectCard, ProjectObjectNode } from "@bg-maker/shared";
import {
  getDefaultProjectObjectCard,
  getDefaultProjectObjectRectTransform,
  getProjectObjectCardSizePreset,
  getProjectObjectRectTransformWithCardSizePreset,
  projectObjectCardCustomSizePresetId
} from "@bg-maker/shared";

export function getProjectObjectCardComponent(object: ProjectObjectNode): ProjectObjectCard {
  const card = {
    ...getDefaultProjectObjectCard(),
    ...object.components?.card
  };

  return normalizeProjectObjectCard(card);
}

export function normalizeProjectObjectCard(card: ProjectObjectCard): ProjectObjectCard {
  const sizePreset =
    card.sizePreset === projectObjectCardCustomSizePresetId ||
    Boolean(getProjectObjectCardSizePreset(card.sizePreset))
      ? card.sizePreset
      : getDefaultProjectObjectCard().sizePreset;

  return {
    sizePreset
  };
}

export function withProjectObjectCardComponent(
  object: ProjectObjectNode,
  card: ProjectObjectCard
): ProjectObjectNode {
  const nextCard = normalizeProjectObjectCard(card);
  const nextObject = {
    ...object,
    components: {
      ...object.components,
      card: nextCard
    }
  };

  if (object.kind !== "card") {
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
      rectTransform: getProjectObjectRectTransformWithCardSizePreset(rectTransform, nextCard)
    }
  };
}
