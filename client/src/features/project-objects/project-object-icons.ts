import { createLucideIcon } from "lucide-react";

export const CardIcon = createLucideIcon("Card", [
  ["rect", { x: "4", y: "2", width: "16", height: "20", rx: "2", key: "card-front" }]
]);

export const DeckIcon = createLucideIcon("Deck", [
  ["path", { d: "M14.5 4h-7A2.5 2.5 0 0 0 5 6.5v10A2.5 2.5 0 0 0 7.5 19", key: "deck-back" }],
  ["rect", { x: "8", y: "7", width: "12", height: "15", rx: "2.5", key: "deck-front" }]
]);

export const BagIcon = createLucideIcon("Bag", [
  ["path", { d: "M8.5 6.5C9 4.2 10.2 3 12 3s3 1.2 3.5 3.5", key: "bag-tie" }],
  ["path", { d: "M7.5 7.5c2.8 1.4 6.2 1.4 9 0", key: "bag-mouth" }],
  [
    "path",
    {
      d: "M7.5 8.5C5.9 10.7 5 14 5 16.8 5 20.2 7.4 22 12 22s7-1.8 7-5.2c0-2.8-.9-6.1-2.5-8.3",
      key: "bag-body"
    }
  ],
  ["path", { d: "M8.5 11c2.3 1.2 4.7 1.2 7 0", key: "bag-fold" }]
]);

export const BoxIcon = createLucideIcon("Box", [
  ["path", { d: "m4 8 8-4 8 4-8 4-8-4Z", key: "box-top" }],
  ["path", { d: "M4 8v8l8 4 8-4V8", key: "box-sides" }],
  ["path", { d: "M12 12v8", key: "box-front" }]
]);
