import type { ProjectGameConfig, ProjectGameCounterScope } from "@bg-maker/shared";
import { Plus, Settings, Trash2, X } from "lucide-react";
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
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/40 p-4">
      <section className="flex max-h-[min(760px,calc(100vh-32px))] w-[min(720px,calc(100vw-32px))] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl shadow-slate-950/25">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
              <Settings size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-950">Game settings</h2>
              <p className="truncate text-xs font-medium text-slate-500">
                {saving ? "Saving..." : "Players and logical counters"}
              </p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-normal text-slate-500">
                Players
              </h3>
              <button
                className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                type="button"
                onClick={() => onChange(getProjectGameConfigWithAddedPlayer(gameConfig))}
              >
                <Plus size={14} />
                Add player
              </button>
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
                  <input
                    aria-label="Player name"
                    className="h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
                  <button
                    aria-label={`Remove ${player.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-white text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    type="button"
                    onClick={() =>
                      onChange(getProjectGameConfigWithRemovedPlayer(gameConfig, player.id))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-normal text-slate-500">
                Counters
              </h3>
              <button
                className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                type="button"
                onClick={() => onChange(getProjectGameConfigWithAddedCounter(gameConfig))}
              >
                <Plus size={14} />
                Add counter
              </button>
            </div>
            {gameConfig.counters.length ? (
              <div className="space-y-2">
                {gameConfig.counters.map((counter) => (
                  <div
                    key={counter.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_7rem_2rem] gap-2">
                      <input
                        aria-label="Counter label"
                        className="h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
                      <select
                        aria-label="Counter scope"
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        value={counter.scope}
                        onChange={(event) =>
                          updateCounterScope(event.currentTarget.value, counter.id)
                        }
                      >
                        <option value="player">Per player</option>
                        <option value="shared">Shared</option>
                      </select>
                      <button
                        aria-label={`Remove ${counter.label}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-white text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        type="button"
                        onClick={() =>
                          onChange(getProjectGameConfigWithRemovedCounter(gameConfig, counter.id))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {(["defaultValue", "minValue", "maxValue", "step"] as const).map((field) => (
                        <label key={field} className="block">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-normal text-slate-500">
                            {getCounterNumberLabel(field)}
                          </span>
                          <input
                            className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            type="number"
                            value={counter[field]}
                            onChange={(event) =>
                              updateCounterNumber(
                                counter.id,
                                field,
                                Number(event.currentTarget.value)
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-medium text-slate-500">
                No counters yet.
              </p>
            )}
          </section>
        </div>
      </section>
    </div>
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
