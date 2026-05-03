import { createLucideIcon } from "lucide-react";

export const CardIcon = createLucideIcon("Card", [
  ["rect", { x: "4", y: "2", width: "16", height: "20", rx: "2", key: "card-front" }]
]);

export const DeckIcon = createLucideIcon("Deck", [
  ["path", { d: "M14.5 4h-7A2.5 2.5 0 0 0 5 6.5v10A2.5 2.5 0 0 0 7.5 19", key: "deck-back" }],
  ["rect", { x: "8", y: "7", width: "12", height: "15", rx: "2.5", key: "deck-front" }]
]);
