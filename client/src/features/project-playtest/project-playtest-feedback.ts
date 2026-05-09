import type { PlaytestActionResultReason } from "./project-playtest";

export function getPlaytestActionFeedbackMessage(reason: PlaytestActionResultReason) {
  if (reason === "emptySource") {
    return "Nothing to draw.";
  }

  if (reason === "missingSourceOrTarget") {
    return "Source or target is missing.";
  }

  if (reason === "notInteractable") {
    return "Item is not interactable.";
  }

  if (reason === "notMovable") {
    return "Item cannot be moved.";
  }

  if (reason === "removeBlocked") {
    return "This zone does not allow removing items.";
  }

  if (reason === "slotOccupied") {
    return "That slot is occupied.";
  }

  if (reason === "zoneFull") {
    return "Zone has no empty slots.";
  }

  if (reason === "zoneRejectedItem") {
    return "Zone does not accept this item.";
  }

  return "Nothing changed.";
}
