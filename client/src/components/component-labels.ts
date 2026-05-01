import type { ComponentCollectionType, ComponentType, ZoneChildType } from "@bg-maker/shared";

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

export const zoneChildTypeLabels: Record<ZoneChildType, string> = {
  zone: "Container",
  card: componentTypeLabels.card,
  tile: componentTypeLabels.tile,
  piece: componentTypeLabels.piece,
  mixed: "Mixed"
};
