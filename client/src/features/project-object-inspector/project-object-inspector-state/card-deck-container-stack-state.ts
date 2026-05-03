import type {
  ProjectObjectCard,
  ProjectObjectCardSizePresetValue,
  ProjectObjectBag,
  ProjectObjectBagAppearanceVariant,
  ProjectObjectContainer,
  ProjectObjectDeck,
  ProjectObjectStackDisplay
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectBag,
  getDefaultProjectObjectStackDisplay,
  projectObjectBagAppearanceVariants,
  projectObjectCardCustomSizePresetId,
  projectObjectCardSizePresets,
  projectObjectContainerEntryQuantityLimits,
  projectObjectStackDisplayOffsetLimits,
  projectObjectStackDisplayVisibleItemCountLimits
} from "@bg-maker/shared";
import { clamp, parseRectTransformDraftValue, roundTo } from "./inspector-state-utils";

export type CardFieldKey = keyof ProjectObjectCard;
export type CardDraft = {
  sizePreset: ProjectObjectCardSizePresetValue;
};

export type DeckFieldKey = keyof ProjectObjectDeck;
export type DeckDraft = {
  sizePreset: ProjectObjectCardSizePresetValue;
};

export type BagFieldKey = keyof ProjectObjectBag;
export type BagDraft = {
  appearanceVariant: ProjectObjectBagAppearanceVariant;
};

export type StackDisplayFieldKey = keyof ProjectObjectStackDisplay;
export type StackDisplayNumberFieldKey = Extract<
  StackDisplayFieldKey,
  "stackOffsetX" | "stackOffsetY" | "visibleItemCount"
>;
export type StackDisplayDraft = {
  showCount: boolean;
  stackOffsetX: string;
  stackOffsetY: string;
  visibleItemCount: string;
};

export const stackDisplayNumberFieldSettings = {
  stackOffsetX: {
    decimals: 0,
    max: projectObjectStackDisplayOffsetLimits.max,
    min: projectObjectStackDisplayOffsetLimits.min,
    step: 1
  },
  stackOffsetY: {
    decimals: 0,
    max: projectObjectStackDisplayOffsetLimits.max,
    min: projectObjectStackDisplayOffsetLimits.min,
    step: 1
  },
  visibleItemCount: {
    decimals: 0,
    max: projectObjectStackDisplayVisibleItemCountLimits.max,
    min: projectObjectStackDisplayVisibleItemCountLimits.min,
    step: 1
  }
} as const satisfies Record<
  StackDisplayNumberFieldKey,
  { decimals: number; max: number; min: number; step: number }
>;

const cardSizePresetValues = new Set<ProjectObjectCardSizePresetValue>([
  projectObjectCardCustomSizePresetId,
  ...projectObjectCardSizePresets.map((preset) => preset.id)
]);
const bagAppearanceVariantValues = new Set<ProjectObjectBagAppearanceVariant>(
  projectObjectBagAppearanceVariants
);

export function createCardDraft(card: ProjectObjectCard): CardDraft {
  return {
    sizePreset: card.sizePreset
  };
}

export function createDeckDraft(deck: ProjectObjectDeck): DeckDraft {
  return {
    sizePreset: deck.sizePreset
  };
}

export function createBagDraft(bag: ProjectObjectBag): BagDraft {
  return {
    appearanceVariant: bag.appearanceVariant
  };
}

export function createStackDisplayDraft(
  stackDisplay: ProjectObjectStackDisplay
): StackDisplayDraft {
  return {
    showCount: stackDisplay.showCount,
    stackOffsetX: formatStackDisplayNumberValue(stackDisplay.stackOffsetX, "stackOffsetX"),
    stackOffsetY: formatStackDisplayNumberValue(stackDisplay.stackOffsetY, "stackOffsetY"),
    visibleItemCount: formatStackDisplayNumberValue(
      stackDisplay.visibleItemCount,
      "visibleItemCount"
    )
  };
}

export function getCardWithDraftField(
  card: ProjectObjectCard,
  fieldKey: CardFieldKey,
  value: string
) {
  const nextCard = createNextCard(card, fieldKey, value);

  if (!nextCard) {
    return null;
  }

  return areCardsEqual(card, nextCard) ? null : nextCard;
}

export function getDeckWithDraftField(
  deck: ProjectObjectDeck,
  fieldKey: DeckFieldKey,
  value: string | boolean
) {
  const nextDeck = createNextDeck(deck, fieldKey, value);

  if (!nextDeck) {
    return null;
  }

  return areDecksEqual(deck, nextDeck) ? null : nextDeck;
}

export function getBagWithDraftField(
  bag: ProjectObjectBag,
  fieldKey: BagFieldKey,
  value: string
) {
  const nextBag = createNextBag(bag, fieldKey, value);

  if (!nextBag) {
    return null;
  }

  return areBagsEqual(bag, nextBag) ? null : nextBag;
}

export function getStackDisplayWithDraftField(
  stackDisplay: ProjectObjectStackDisplay,
  fieldKey: StackDisplayFieldKey,
  value: string | boolean
) {
  const nextStackDisplay = createNextStackDisplay(stackDisplay, fieldKey, value);

  if (!nextStackDisplay) {
    return null;
  }

  return areStackDisplaysEqual(stackDisplay, nextStackDisplay) ? null : nextStackDisplay;
}

export function getContainerWithAddedEntry(
  container: ProjectObjectContainer,
  objectFileNodeId: string
) {
  const normalizedObjectFileNodeId = objectFileNodeId.trim();

  if (!normalizedObjectFileNodeId) {
    return null;
  }

  const currentEntryIndex = container.entries.findIndex(
    (entry) => entry.objectFileNodeId === normalizedObjectFileNodeId
  );
  const entries =
    currentEntryIndex === -1
      ? [...container.entries, { objectFileNodeId: normalizedObjectFileNodeId, quantity: 1 }]
      : container.entries.map((entry, index) =>
          index === currentEntryIndex
            ? {
                ...entry,
                quantity: normalizeContainerEntryQuantityValue(entry.quantity + 1)
              }
            : entry
        );
  const nextContainer = normalizeContainer({
    ...container,
    entries
  });

  return areContainersEqual(container, nextContainer) ? null : nextContainer;
}

export function getContainerWithRemovedEntry(
  container: ProjectObjectContainer,
  entryIndex: number
) {
  if (entryIndex < 0 || entryIndex >= container.entries.length) {
    return null;
  }

  const nextContainer = normalizeContainer({
    ...container,
    entries: container.entries.filter((_, index) => index !== entryIndex)
  });

  return areContainersEqual(container, nextContainer) ? null : nextContainer;
}

export function getContainerWithMovedEntry(
  container: ProjectObjectContainer,
  entryIndex: number,
  direction: -1 | 1
) {
  const targetIndex = entryIndex + direction;

  if (
    entryIndex < 0 ||
    entryIndex >= container.entries.length ||
    targetIndex < 0 ||
    targetIndex >= container.entries.length
  ) {
    return null;
  }

  const entries = [...container.entries];
  const [entry] = entries.splice(entryIndex, 1);

  if (!entry) {
    return null;
  }

  entries.splice(targetIndex, 0, entry);

  return normalizeContainer({
    ...container,
    entries
  });
}

export function getContainerWithEntryObjectFileNodeId(
  container: ProjectObjectContainer,
  entryIndex: number,
  objectFileNodeId: string
) {
  const normalizedObjectFileNodeId = objectFileNodeId.trim();

  if (
    !normalizedObjectFileNodeId ||
    entryIndex < 0 ||
    entryIndex >= container.entries.length
  ) {
    return null;
  }

  const nextContainer = normalizeContainer({
    ...container,
    entries: container.entries.map((entry, index) =>
      index === entryIndex
        ? {
            ...entry,
            objectFileNodeId: normalizedObjectFileNodeId
          }
        : entry
    )
  });

  return areContainersEqual(container, nextContainer) ? null : nextContainer;
}

export function getContainerWithEntryQuantityDraftField(
  container: ProjectObjectContainer,
  entryIndex: number,
  value: string
) {
  const parsedValue = parseRectTransformDraftValue(value);

  if (parsedValue === null || entryIndex < 0 || entryIndex >= container.entries.length) {
    return null;
  }

  const nextContainer = normalizeContainer({
    ...container,
    entries: container.entries.map((entry, index) =>
      index === entryIndex
        ? {
            ...entry,
            quantity: normalizeContainerEntryQuantityValue(parsedValue)
          }
        : entry
    )
  });

  return areContainersEqual(container, nextContainer) ? null : nextContainer;
}

export function normalizeStackDisplayNumberValue(
  fieldKey: keyof typeof stackDisplayNumberFieldSettings,
  value: number
) {
  const { decimals, max, min } = stackDisplayNumberFieldSettings[fieldKey];

  return roundTo(clamp(value, min, max), decimals);
}

export function normalizeContainerEntryQuantityValue(value: number) {
  return roundTo(
    clamp(
      value,
      projectObjectContainerEntryQuantityLimits.min,
      projectObjectContainerEntryQuantityLimits.max
    ),
    0
  );
}

export function formatStackDisplayNumberValue(
  value: number,
  fieldKey: keyof typeof stackDisplayNumberFieldSettings
) {
  const { decimals } = stackDisplayNumberFieldSettings[fieldKey];

  return String(roundTo(value, decimals));
}

export function formatContainerEntryQuantityValue(value: number) {
  return String(normalizeContainerEntryQuantityValue(value));
}

function createNextCard(
  card: ProjectObjectCard,
  fieldKey: CardFieldKey,
  value: string
): ProjectObjectCard | null {
  if (fieldKey === "sizePreset") {
    return cardSizePresetValues.has(value as ProjectObjectCardSizePresetValue)
      ? { ...card, sizePreset: value as ProjectObjectCardSizePresetValue }
      : null;
  }

  return null;
}

function createNextDeck(
  deck: ProjectObjectDeck,
  fieldKey: DeckFieldKey,
  value: string | boolean
): ProjectObjectDeck | null {
  if (fieldKey === "sizePreset") {
    return typeof value === "string" &&
      cardSizePresetValues.has(value as ProjectObjectCardSizePresetValue)
      ? { ...deck, sizePreset: value as ProjectObjectCardSizePresetValue }
      : null;
  }

  return null;
}

function createNextBag(
  bag: ProjectObjectBag,
  fieldKey: BagFieldKey,
  value: string
): ProjectObjectBag | null {
  if (fieldKey === "appearanceVariant") {
    return bagAppearanceVariantValues.has(value as ProjectObjectBagAppearanceVariant)
      ? normalizeBag({ ...bag, appearanceVariant: value as ProjectObjectBagAppearanceVariant })
      : null;
  }

  return null;
}

function createNextStackDisplay(
  stackDisplay: ProjectObjectStackDisplay,
  fieldKey: StackDisplayFieldKey,
  value: string | boolean
): ProjectObjectStackDisplay | null {
  if (fieldKey === "showCount") {
    return typeof value === "boolean" ? { ...stackDisplay, showCount: value } : null;
  }

  const parsedValue = typeof value === "string" ? parseRectTransformDraftValue(value) : null;

  if (parsedValue === null) {
    return null;
  }

  return normalizeStackDisplay({
    ...stackDisplay,
    [fieldKey]: normalizeStackDisplayNumberValue(fieldKey, parsedValue)
  });
}

function normalizeStackDisplay(
  stackDisplay: ProjectObjectStackDisplay
): ProjectObjectStackDisplay {
  const defaultStackDisplay = getDefaultProjectObjectStackDisplay();

  return {
    ...stackDisplay,
    showCount:
      typeof stackDisplay.showCount === "boolean"
        ? stackDisplay.showCount
        : defaultStackDisplay.showCount,
    stackOffsetX: normalizeStackDisplayNumberValue("stackOffsetX", stackDisplay.stackOffsetX),
    stackOffsetY: normalizeStackDisplayNumberValue("stackOffsetY", stackDisplay.stackOffsetY),
    visibleItemCount: normalizeStackDisplayNumberValue(
      "visibleItemCount",
      stackDisplay.visibleItemCount
    )
  };
}

function normalizeBag(bag: ProjectObjectBag): ProjectObjectBag {
  const defaultBag = getDefaultProjectObjectBag();

  return {
    ...bag,
    appearanceVariant: bagAppearanceVariantValues.has(bag.appearanceVariant)
      ? bag.appearanceVariant
      : defaultBag.appearanceVariant
  };
}

function normalizeContainer(container: ProjectObjectContainer): ProjectObjectContainer {
  return {
    ...container,
    entries: normalizeContainerEntries(container.entries)
  };
}

function normalizeContainerEntries(entries: ProjectObjectContainer["entries"]) {
  const quantityByObjectFileNodeId = new Map<string, number>();

  for (const entry of entries) {
    const objectFileNodeId = entry.objectFileNodeId.trim();

    if (!objectFileNodeId) {
      continue;
    }

    quantityByObjectFileNodeId.set(
      objectFileNodeId,
      normalizeContainerEntryQuantityValue(
        (quantityByObjectFileNodeId.get(objectFileNodeId) ?? 0) + entry.quantity
      )
    );
  }

  return Array.from(quantityByObjectFileNodeId, ([objectFileNodeId, quantity]) => ({
    objectFileNodeId,
    quantity
  }));
}

function areCardsEqual(left: ProjectObjectCard, right: ProjectObjectCard) {
  return left.sizePreset === right.sizePreset;
}

function areDecksEqual(left: ProjectObjectDeck, right: ProjectObjectDeck) {
  return left.sizePreset === right.sizePreset;
}

function areBagsEqual(left: ProjectObjectBag, right: ProjectObjectBag) {
  return left.appearanceVariant === right.appearanceVariant;
}

function areStackDisplaysEqual(
  left: ProjectObjectStackDisplay,
  right: ProjectObjectStackDisplay
) {
  return (
    left.showCount === right.showCount &&
    left.stackOffsetX === right.stackOffsetX &&
    left.stackOffsetY === right.stackOffsetY &&
    left.visibleItemCount === right.visibleItemCount
  );
}

function areContainersEqual(left: ProjectObjectContainer, right: ProjectObjectContainer) {
  return areContainerEntriesEqual(left.entries, right.entries);
}

function areContainerEntriesEqual(
  left: readonly ProjectObjectContainer["entries"][number][],
  right: readonly ProjectObjectContainer["entries"][number][]
) {
  return (
    left.length === right.length &&
    left.every((leftEntry, index) => {
      const rightEntry = right[index];

      return (
        Boolean(rightEntry) &&
        leftEntry.objectFileNodeId === rightEntry.objectFileNodeId &&
        leftEntry.quantity === rightEntry.quantity
      );
    })
  );
}
