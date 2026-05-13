import type {
  ProjectGameConfig,
  ProjectTableSetup,
  ProjectTableSetupGameBindingOwner,
  ProjectTableSetupItemGameBinding
} from "@bg-maker/shared";
import { getProjectTableSetupItemId } from "@bg-maker/shared";

export const projectTableSetupRolePresets = [
  "Deck",
  "Hand",
  "Play area",
  "Discard",
  "Market"
] as const;

export function getDefaultProjectTableSetupGameBindingOwner(
  gameConfig: ProjectGameConfig
): ProjectTableSetupGameBindingOwner {
  const firstPlayer = gameConfig.players[0];

  return firstPlayer ? { type: "player", playerId: firstPlayer.id } : { type: "shared" };
}

export function getProjectTableSetupWithItemGameBinding(
  tableSetup: ProjectTableSetup,
  itemId: string,
  gameBinding: ProjectTableSetupItemGameBinding | undefined
): ProjectTableSetup {
  let changed = false;
  const items = tableSetup.items.map((item) =>
    getProjectTableSetupItemId(item) === itemId
      ? ((changed = true),
        {
          ...item,
          ...(gameBinding && Object.keys(gameBinding).length
            ? { gameBinding }
            : { gameBinding: undefined })
        })
      : item
  );

  return changed ? { ...tableSetup, items } : tableSetup;
}

export function getProjectTableSetupGameBindingOwnerLabel(
  owner: ProjectTableSetupGameBindingOwner | undefined,
  gameConfig: ProjectGameConfig
) {
  if (!owner || owner.type === "shared") {
    return "Shared";
  }

  return (
    gameConfig.players.find((player) => player.id === owner.playerId)?.name ?? "Missing player"
  );
}
