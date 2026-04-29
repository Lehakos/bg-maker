import type { ComponentCollectionType, ComponentType } from "@bg-maker/shared";

export const componentTypeLabels: Record<ComponentType, string> = {
  card: "Card",
  tile: "Tile",
  piece: "Piece",
  die: "Die"
};

export const collectionTypeLabels: Record<ComponentCollectionType, string> = {
  deck: "Deck",
  bag: "Bag",
  custom: "Custom"
};
