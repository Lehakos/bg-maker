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

export const MeepleIcon = createLucideIcon("Meeple", [
  ["circle", { cx: "12", cy: "4.8", r: "2.5", key: "meeple-head" }],
  [
    "path",
    {
      d: "M8.5 8.5 5 13h4l-1.8 9.5h9.6L15 13h4l-3.5-4.5h-7Z",
      key: "meeple-body"
    }
  ]
]);

export const PawnIcon = createLucideIcon("Pawn", [
  ["circle", { cx: "12", cy: "5.5", r: "2.5", key: "pawn-head" }],
  ["path", { d: "M9 9h6l1.8 8h2.2v5.5H5V17h2.2L9 9Z", key: "pawn-body" }]
]);

export const CubePieceIcon = createLucideIcon("CubePiece", [
  ["path", { d: "m5 8 7-4 7 4-7 4-7-4Z", key: "cube-top" }],
  ["path", { d: "M5 8v8l7 4 7-4V8", key: "cube-sides" }],
  ["path", { d: "M12 12v8", key: "cube-front" }]
]);

export const CylinderPieceIcon = createLucideIcon("CylinderPiece", [
  ["ellipse", { cx: "12", cy: "6", rx: "6", ry: "3", key: "cylinder-top" }],
  ["path", { d: "M6 6v10c0 1.7 2.7 3 6 3s6-1.3 6-3V6", key: "cylinder-body" }],
  ["path", { d: "M6 16c0 1.7 2.7 3 6 3s6-1.3 6-3", key: "cylinder-bottom" }]
]);

export const ConePieceIcon = createLucideIcon("ConePiece", [
  ["path", { d: "M12 4 5.5 18", key: "cone-left" }],
  ["path", { d: "M12 4 18.5 18", key: "cone-right" }],
  ["ellipse", { cx: "12", cy: "18", rx: "6.5", ry: "2.5", key: "cone-base" }]
]);

export const StandeeIcon = createLucideIcon("Standee", [
  ["rect", { x: "8", y: "3", width: "8", height: "14", rx: "1.5", key: "standee-card" }],
  ["path", { d: "M6 21h12", key: "standee-base" }],
  ["path", { d: "M9 17h6l1 4H8l1-4Z", key: "standee-feet" }]
]);
