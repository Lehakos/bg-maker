import type { ProjectGameConfig, ProjectGameCounterScope } from "@bg-maker/shared";
import { Plus, Settings, Trash2 } from "lucide-react";
import {
  FormInput,
  FormSelect,
  IconButton,
  ModalShell,
  PanelActionButton,
  PanelEmptyState
} from "../../components";
import {
  getProjectGameConfigWithAddedCounter,
  getProjectGameConfigWithAddedPlayer,
  getProjectGameConfigWithRemovedCounter,
  getProjectGameConfigWithRemovedPlayer,
  getProjectGameConfigWithUpdatedCounter,
  getProjectGameConfigWithUpdatedPlayer,
  normalizeProjectGameCounterNumberField,
  normalizeProjectGameCounterScope
} from "./project-game-config";

type ProjectGameSettingsModalProps = {
  gameConfig: ProjectGameConfig;
  open: boolean;
  saving: boolean;
  onChange: (gameConfig: ProjectGameConfig) => void;
  onClose: () => void;
};

export function ProjectGameSettingsModal({
  gameConfig,
  open,
  saving,
  onChange,
  onClose
}: ProjectGameSettingsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <ModalShell
      bodyClassName="space-y-5"
      icon={<Settings size={16} />}
      subtitle={saving ? "Saving..." : "Players and logical counters"}
      testId="game-settings-modal"
      title="Game settings"
      onClose={onClose}
    >
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-normal text-slate-500">Players</h3>
          <PanelActionButton
            size="field"
            tone="emerald"
            onClick={() => onChange(getProjectGameConfigWithAddedPlayer(gameConfig))}
          >
            <Plus size={14} />
            Add player
          </PanelActionButton>
        </div>
        <div className="space-y-2">
          {gameConfig.players.map((player) => (
            <div
              key={player.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
            >
              <input
                aria-label={`${player.name} color`}
                className="h-8 w-10 rounded border border-slate-200 bg-white"
                type="color"
                value={player.color}
                onChange={(event) =>
                  onChange(
                    getProjectGameConfigWithUpdatedPlayer(gameConfig, player.id, (current) => ({
                      ...current,
                      color: event.currentTarget.value
                    }))
                  )
                }
              />
              <FormInput
                aria-label="Player name"
                tone="emerald"
                value={player.name}
                onChange={(event) =>
                  onChange(
                    getProjectGameConfigWithUpdatedPlayer(gameConfig, player.id, (current) => ({
                      ...current,
                      name: event.currentTarget.value
                    }))
                  )
                }
              />
              <IconButton
                aria-label={`Remove ${player.name}`}
                icon={<Trash2 size={14} />}
                variant="danger"
                onClick={() =>
                  onChange(getProjectGameConfigWithRemovedPlayer(gameConfig, player.id))
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-normal text-slate-500">Counters</h3>
          <PanelActionButton
            size="field"
            tone="emerald"
            onClick={() => onChange(getProjectGameConfigWithAddedCounter(gameConfig))}
          >
            <Plus size={14} />
            Add counter
          </PanelActionButton>
        </div>
        {gameConfig.counters.length ? (
          <div className="space-y-2">
            {gameConfig.counters.map((counter) => (
              <div key={counter.id} className="rounded-md border border-slate-200 bg-slate-50 p-2">
                <div className="grid grid-cols-[minmax(0,1fr)_7rem_2rem] gap-2">
                  <FormInput
                    aria-label="Counter label"
                    tone="emerald"
                    value={counter.label}
                    onChange={(event) =>
                      onChange(
                        getProjectGameConfigWithUpdatedCounter(
                          gameConfig,
                          counter.id,
                          (current) => ({ ...current, label: event.currentTarget.value })
                        )
                      )
                    }
                  />
                  <FormSelect
                    aria-label="Counter scope"
                    className="text-xs font-semibold text-slate-700"
                    tone="emerald"
                    value={counter.scope}
                    onChange={(event) => updateCounterScope(event.currentTarget.value, counter.id)}
                  >
                    <option value="player">Per player</option>
                    <option value="shared">Shared</option>
                  </FormSelect>
                  <IconButton
                    aria-label={`Remove ${counter.label}`}
                    icon={<Trash2 size={14} />}
                    variant="danger"
                    onClick={() =>
                      onChange(getProjectGameConfigWithRemovedCounter(gameConfig, counter.id))
                    }
                  />
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(["defaultValue", "minValue", "maxValue", "step"] as const).map((field) => (
                    <label key={field} className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-normal text-slate-500">
                        {getCounterNumberLabel(field)}
                      </span>
                      <FormInput
                        className="w-full"
                        tone="emerald"
                        type="number"
                        value={counter[field]}
                        onChange={(event) =>
                          updateCounterNumber(counter.id, field, Number(event.currentTarget.value))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PanelEmptyState spacious>No counters yet.</PanelEmptyState>
        )}
      </section>
    </ModalShell>
  );

  function updateCounterScope(value: string, counterId: string) {
    onChange(
      getProjectGameConfigWithUpdatedCounter(gameConfig, counterId, (counter) => ({
        ...counter,
        scope: normalizeProjectGameCounterScope(value) as ProjectGameCounterScope
      }))
    );
  }

  function updateCounterNumber(
    counterId: string,
    field: "defaultValue" | "maxValue" | "minValue" | "step",
    value: number
  ) {
    onChange(
      getProjectGameConfigWithUpdatedCounter(gameConfig, counterId, (counter) => ({
        ...counter,
        [field]: normalizeProjectGameCounterNumberField(field, value)
      }))
    );
  }
}

function getCounterNumberLabel(field: "defaultValue" | "maxValue" | "minValue" | "step") {
  if (field === "defaultValue") {
    return "Default";
  }

  if (field === "minValue") {
    return "Min";
  }

  if (field === "maxValue") {
    return "Max";
  }

  return "Step";
}
