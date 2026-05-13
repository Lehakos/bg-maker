import type {
  ProjectGameConfig,
  ProjectObjectKind,
  ProjectTableSetupItemGameBinding
} from "@bg-maker/shared";
import { Link2 } from "lucide-react";
import { FormInput, FormSelect, PanelActionButton } from "../../components";
import { InfoTip } from "../../components/InfoTip";
import { InspectorFieldGrid, InspectorSection } from "./inspector-ui";

type ProjectTableSetupGameBindingSectionProps = {
  gameBinding?: ProjectTableSetupItemGameBinding;
  gameConfig: ProjectGameConfig;
  objectKind?: ProjectObjectKind;
  onChange: (gameBinding: ProjectTableSetupItemGameBinding | undefined) => void;
};

export function ProjectTableSetupGameBindingSection({
  gameBinding,
  gameConfig,
  objectKind,
  onChange
}: ProjectTableSetupGameBindingSectionProps) {
  const supportsRole =
    objectKind === "zone" ||
    objectKind === "deck" ||
    objectKind === "bag" ||
    objectKind === "stack";
  const supportsCounter = objectKind === "counter" || objectKind === "scoreTrack";
  const selectedCounter = gameBinding?.counterId
    ? gameConfig.counters.find((counter) => counter.id === gameBinding.counterId)
    : null;

  if (!supportsRole && !supportsCounter) {
    return null;
  }

  return (
    <InspectorSection
      icon={<Link2 size={15} />}
      info="Tell the game what this table item represents, so card rules can use names like Hand, Deck, Discard, or Victory points."
      infoAlign="start"
      title="Game binding"
    >
      {supportsRole ? (
        <InspectorFieldGrid>
          <label className="block">
            <span className="mb-1 flex min-h-5 items-center gap-1.5 text-[10px] font-bold uppercase tracking-normal text-slate-500">
              Role
              <InfoTip align="start">
                Name this place for card rules. Use the same name in effects and conditions, for
                example Hand, Deck, Play area, or Discard.
              </InfoTip>
            </span>
            <FormInput
              className="w-full text-slate-900"
              placeholder="Hand"
              value={gameBinding?.role ?? ""}
              onChange={(event) =>
                onChange({
                  ...(gameBinding ?? {}),
                  role: event.currentTarget.value
                })
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 flex min-h-5 items-center gap-1.5 text-[10px] font-bold uppercase tracking-normal text-slate-500">
              Owner
              <InfoTip align="end">
                Choose who this place belongs to. Use a player for personal hands or decks, or
                Shared for the common table.
              </InfoTip>
            </span>
            <FormSelect
              className="w-full text-xs font-semibold text-slate-700"
              value={ownerSelectValue(gameBinding?.owner)}
              onChange={(event) =>
                onChange({
                  ...(gameBinding ?? {}),
                  owner: ownerFromSelectValue(event.currentTarget.value)
                })
              }
            >
              <option value="shared">Shared</option>
              {gameConfig.players.map((player) => (
                <option key={player.id} value={`player:${player.id}`}>
                  {player.name}
                </option>
              ))}
            </FormSelect>
          </label>
        </InspectorFieldGrid>
      ) : null}

      {supportsCounter ? (
        <InspectorFieldGrid>
          <label className="block">
            <span className="mb-1 flex min-h-5 items-center gap-1.5 text-[10px] font-bold uppercase tracking-normal text-slate-500">
              Counter
              <InfoTip align="start">
                Choose which game value this object shows, such as Victory points, Coins, Health, or
                Round.
              </InfoTip>
            </span>
            <FormSelect
              className="w-full text-xs font-semibold text-slate-700"
              value={gameBinding?.counterId ?? ""}
              onChange={(event) => {
                const nextCounter = gameConfig.counters.find(
                  (counter) => counter.id === event.currentTarget.value
                );

                onChange({
                  ...(gameBinding ?? {}),
                  counterId: event.currentTarget.value,
                  counterOwner: getDefaultCounterOwner(nextCounter?.scope, gameConfig)
                });
              }}
            >
              <option value="">No counter</option>
              {gameConfig.counters.map((counter) => (
                <option key={counter.id} value={counter.id}>
                  {counter.label}
                </option>
              ))}
            </FormSelect>
          </label>
          <label className="block">
            <span className="mb-1 flex min-h-5 items-center gap-1.5 text-[10px] font-bold uppercase tracking-normal text-slate-500">
              Target
              <InfoTip align="end">
                Choose whose value is shown here: one player or the shared game value.
              </InfoTip>
            </span>
            <FormSelect
              className="w-full text-xs font-semibold text-slate-700"
              value={ownerSelectValue(gameBinding?.counterOwner)}
              onChange={(event) =>
                onChange({
                  ...(gameBinding ?? {}),
                  counterOwner: ownerFromSelectValue(event.currentTarget.value)
                })
              }
            >
              <option value="shared" disabled={selectedCounter?.scope === "player"}>
                Shared
              </option>
              {gameConfig.players.map((player) => (
                <option
                  key={player.id}
                  disabled={selectedCounter?.scope === "shared"}
                  value={`player:${player.id}`}
                >
                  {player.name}
                </option>
              ))}
            </FormSelect>
          </label>
        </InspectorFieldGrid>
      ) : null}
      <PanelActionButton className="w-full" variant="danger" onClick={() => onChange(undefined)}>
        Clear binding
      </PanelActionButton>
    </InspectorSection>
  );
}

function ownerSelectValue(owner: ProjectTableSetupItemGameBinding["owner"] | undefined) {
  return owner?.type === "player" ? `player:${owner.playerId}` : "shared";
}

function ownerFromSelectValue(value: string): ProjectTableSetupItemGameBinding["owner"] {
  if (value.startsWith("player:")) {
    return { type: "player", playerId: value.slice("player:".length) };
  }

  return { type: "shared" };
}

function getDefaultCounterOwner(
  scope: "player" | "shared" | undefined,
  gameConfig: ProjectGameConfig
): ProjectTableSetupItemGameBinding["counterOwner"] {
  if (scope === "player") {
    const firstPlayer = gameConfig.players[0];

    return firstPlayer ? { type: "player", playerId: firstPlayer.id } : undefined;
  }

  return { type: "shared" };
}
