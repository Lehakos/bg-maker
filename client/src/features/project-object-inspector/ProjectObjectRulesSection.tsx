import type {
  ProjectGameConfig,
  ProjectObjectPlayCardRule,
  ProjectObjectRuleCondition,
  ProjectObjectRuleConditionConnector,
  ProjectObjectRuleEffect,
  ProjectObjectSide
} from "@bg-maker/shared";
import { Brain, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  FormInput,
  FormSelect,
  InlineInput,
  InlineSelect,
  TypeSelect
} from "../../components/FormControls";
import { InlineEditorRow, RowRemoveButton } from "../../components/InlineEditorRow";
import { PanelActionButton } from "../../components/PanelActionButton";
import {
  PanelCard,
  PanelEmptyState,
  PanelNotice,
  PanelSubsectionLabel
} from "../../components/PanelSurfaces";
import {
  createProjectObjectRuleCondition,
  createProjectObjectRuleCounterCondition,
  createProjectObjectRuleEffect
} from "../project-objects/project-object-rules";
import { cx } from "./class-names";
import { InspectorSection } from "./inspector-ui";

const ruleSideOptions = [
  { label: "Front", value: "front" },
  { label: "Back", value: "back" }
] as const satisfies readonly { label: string; value: ProjectObjectSide }[];

type ProjectObjectRulesSectionProps = {
  customized: boolean;
  gameConfig: ProjectGameConfig;
  inherited: boolean;
  playCards: readonly ProjectObjectPlayCardRule[];
  roleOptions: readonly string[];
  onAddPlayCard: () => void;
  onCustomize: () => void;
  onOpenGameSettings?: () => void;
  onPlayCardChange: (rule: ProjectObjectPlayCardRule) => void;
  onPlayCardRemove: (ruleId: string) => void;
  onReset: () => void;
};

export function ProjectObjectRulesSection({
  customized,
  gameConfig,
  inherited,
  playCards,
  roleOptions,
  onAddPlayCard,
  onCustomize,
  onOpenGameSettings,
  onPlayCardChange,
  onPlayCardRemove,
  onReset
}: ProjectObjectRulesSectionProps) {
  return (
    <InspectorSection
      action={
        playCards.length && !inherited && customized ? (
          <PanelActionButton
            aria-label="Reset to template rules"
            iconOnly
            size="compact"
            title="Reset to template rules"
            onClick={onReset}
          >
            <RotateCcw size={12} />
          </PanelActionButton>
        ) : null
      }
      icon={<Brain size={15} />}
      info="Set when this card can be played and what happens after it is played."
      infoAlign="start"
      title="Rules"
    >
      {inherited ? (
        <PanelCard className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-slate-600">
          <span>This card uses the template's rules.</span>
          <PanelActionButton size="compact" onClick={onCustomize}>
            Customize
          </PanelActionButton>
        </PanelCard>
      ) : null}
      {playCards.length ? (
        <div className={cx("space-y-2", inherited ? "pointer-events-none opacity-70" : "")}>
          {playCards.map((playCard) => (
            <PanelCard key={playCard.id}>
              <div className="flex items-center gap-1.5">
                <FormInput
                  aria-label="Rule label"
                  className="flex-1 text-xs font-semibold text-slate-800"
                  value={playCard.label}
                  onChange={(event) =>
                    onPlayCardChange({ ...playCard, label: event.currentTarget.value })
                  }
                />
                {!inherited ? (
                  <RulePlayCardActions
                    canReset={false}
                    removeTitle={
                      playCards.length > 1 ? "Remove play card rule" : "Remove all play rules"
                    }
                    onRemove={() => onPlayCardRemove(playCard.id)}
                    onReset={onReset}
                  />
                ) : null}
              </div>
              <div className="mt-4">
                <RuleConditionsEditor
                  conditions={playCard.conditions}
                  gameConfig={gameConfig}
                  roleOptions={roleOptions}
                  onChange={(conditions) => onPlayCardChange({ ...playCard, conditions })}
                  onOpenGameSettings={onOpenGameSettings}
                />
              </div>
              <div className="mt-5">
                <RuleEffectsEditor
                  effects={playCard.effects}
                  gameConfig={gameConfig}
                  roleOptions={roleOptions}
                  onChange={(effects) => onPlayCardChange({ ...playCard, effects })}
                  onOpenGameSettings={onOpenGameSettings}
                />
              </div>
            </PanelCard>
          ))}
          {!inherited ? (
            <div className="flex justify-center">
              <PanelActionButton
                aria-label="Add rule"
                iconOnly
                title="Add rule"
                variant="primary"
                onClick={onAddPlayCard}
              >
                <Plus size={14} />
              </PanelActionButton>
            </div>
          ) : null}
        </div>
      ) : (
        <PanelEmptyState
          action={
            !inherited ? (
              <PanelActionButton size="compact" onClick={onAddPlayCard}>
                <Plus size={12} />
                Add rule
              </PanelActionButton>
            ) : null
          }
        >
          No play rules yet.
        </PanelEmptyState>
      )}
    </InspectorSection>
  );
}

function RulePlayCardActions({
  canReset,
  removeTitle = "Remove play card rule",
  onRemove,
  onReset
}: {
  canReset: boolean;
  removeTitle?: string;
  onRemove: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {canReset ? (
        <PanelActionButton
          aria-label="Reset to template rules"
          iconOnly
          size="compact"
          title="Reset to template rules"
          onClick={onReset}
        >
          <RotateCcw size={12} />
        </PanelActionButton>
      ) : null}
      <PanelActionButton
        iconOnly
        size="compact"
        title={removeTitle}
        variant="danger"
        onClick={onRemove}
      >
        <Trash2 size={12} />
      </PanelActionButton>
    </div>
  );
}

function RuleConditionsEditor({
  conditions,
  gameConfig,
  roleOptions,
  onChange,
  onOpenGameSettings
}: {
  conditions: ProjectObjectRuleCondition[];
  gameConfig: ProjectGameConfig;
  roleOptions: readonly string[];
  onChange: (conditions: ProjectObjectRuleCondition[]) => void;
  onOpenGameSettings?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-start gap-2">
        <PanelSubsectionLabel info="Add what must be true before the card can be played. With no conditions, the card can always be played.">
          Play if
        </PanelSubsectionLabel>
      </div>
      {conditions.length ? (
        <div className="space-y-1.5">
          {conditions.map((condition, conditionIndex) => (
            <div key={condition.id} className="space-y-1.5">
              {conditionIndex > 0 ? (
                <RuleConditionConnectorToggle
                  value={condition.connector ?? "and"}
                  onChange={(connector) =>
                    onChange(
                      normalizeRuleConditionConnectors(
                        conditions.map((candidate) =>
                          candidate.id === condition.id ? { ...candidate, connector } : candidate
                        )
                      )
                    )
                  }
                />
              ) : null}
              <RuleConditionRow
                condition={condition}
                gameConfig={gameConfig}
                roleOptions={roleOptions}
                onChange={(nextCondition) =>
                  onChange(
                    normalizeRuleConditionConnectors(
                      conditions.map((currentCondition) =>
                        currentCondition.id === condition.id ? nextCondition : currentCondition
                      )
                    )
                  )
                }
                onRemove={() =>
                  onChange(
                    normalizeRuleConditionConnectors(
                      conditions.filter((currentCondition) => currentCondition.id !== condition.id)
                    )
                  )
                }
                onOpenGameSettings={onOpenGameSettings}
              />
            </div>
          ))}
        </div>
      ) : (
        <PanelEmptyState className="p-2">
          <p className="mb-2 text-xs text-slate-500">
            No conditions. The card can always be played.
          </p>
          <PanelActionButton
            onClick={() => onChange([createProjectObjectRuleCondition(gameConfig)])}
          >
            <Plus size={12} />
            Add condition
          </PanelActionButton>
        </PanelEmptyState>
      )}
      {conditions.length ? (
        <PanelActionButton
          onClick={() =>
            onChange([
              ...conditions,
              createProjectObjectRuleCondition(
                gameConfig,
                () => crypto.randomUUID(),
                conditions.length ? "and" : undefined
              )
            ])
          }
        >
          <Plus size={12} />
          Add condition
        </PanelActionButton>
      ) : null}
    </div>
  );
}

function RuleConditionConnectorToggle({
  value,
  onChange
}: {
  value: ProjectObjectRuleConditionConnector;
  onChange: (value: ProjectObjectRuleConditionConnector) => void;
}) {
  return (
    <div className="flex items-center gap-2 pl-2">
      <span className="h-px flex-1 bg-slate-200" />
      <div
        aria-label="Condition connector"
        className="inline-flex h-7 shrink-0 rounded-md border border-slate-200 bg-white p-0.5"
        role="group"
      >
        {(
          [
            { label: "And", value: "and" },
            { label: "Or", value: "or" }
          ] as const satisfies readonly {
            label: string;
            value: ProjectObjectRuleConditionConnector;
          }[]
        ).map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              aria-pressed={selected}
              className={cx(
                "h-6 rounded px-2 text-[11px] font-semibold leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-100",
                selected
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}
              type="button"
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function normalizeRuleConditionConnectors(
  conditions: readonly ProjectObjectRuleCondition[]
): ProjectObjectRuleCondition[] {
  return conditions.map((condition, index) => {
    if (index === 0) {
      const firstCondition = { ...condition };
      delete firstCondition.connector;

      return firstCondition;
    }

    return {
      ...condition,
      connector: condition.connector ?? "and"
    };
  });
}

function RuleConditionRow({
  condition,
  gameConfig,
  roleOptions,
  onChange,
  onRemove,
  onOpenGameSettings
}: {
  condition: ProjectObjectRuleCondition;
  gameConfig: ProjectGameConfig;
  roleOptions: readonly string[];
  onChange: (condition: ProjectObjectRuleCondition) => void;
  onRemove: () => void;
  onOpenGameSettings?: () => void;
}) {
  const counter =
    condition.type === "counter"
      ? gameConfig.counters.find((candidate) => candidate.id === condition.counterId)
      : null;
  const hasCounters = gameConfig.counters.length > 0;
  const missingCounter =
    condition.type === "counter" && condition.counterId && !counter ? condition.counterId : null;
  const conditionTypeSelect = (
    <TypeSelect
      aria-label="Condition type"
      value={condition.type}
      onChange={(event) =>
        onChange(
          event.currentTarget.value === "counter"
            ? createProjectObjectRuleCounterCondition(
                gameConfig,
                () => condition.id,
                condition.connector
              )
            : {
                ...(condition.connector ? { connector: condition.connector } : {}),
                id: condition.id,
                owner: "activePlayer",
                role: "Hand",
                type: "cardInZoneRole"
              }
        )
      }
    >
      <option value="counter">Counter</option>
      <option value="cardInZoneRole">Location</option>
    </TypeSelect>
  );

  return (
    <InlineEditorRow
      action={
        <RowRemoveButton title="Remove condition" onClick={onRemove}>
          <Trash2 size={13} />
        </RowRemoveButton>
      }
      contentClassName="py-1.5"
      typeControl={conditionTypeSelect}
    >
      {condition.type === "counter" ? (
        <>
          <div className="flex flex-wrap items-center gap-1">
            <InlineSelect
              aria-label="Counter"
              className="min-w-28 flex-1"
              disabled={!hasCounters}
              value={condition.counterId}
              onChange={(event) => {
                const nextCounter = gameConfig.counters.find(
                  (candidate) => candidate.id === event.currentTarget.value
                );

                onChange({
                  ...condition,
                  counterId: event.currentTarget.value,
                  target: nextCounter?.scope === "shared" ? "shared" : "activePlayer"
                });
              }}
            >
              {!condition.counterId ? <option value="">No counter selected</option> : null}
              {missingCounter ? <option value={missingCounter}>Missing counter</option> : null}
              {gameConfig.counters.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </InlineSelect>
            <span className="shrink-0 text-[11px] font-medium text-slate-400">is</span>
            <InlineSelect
              aria-label="Counter comparison"
              className="w-24"
              value={condition.operator}
              onChange={(event) =>
                onChange({
                  ...condition,
                  operator:
                    event.currentTarget.value === "atMost"
                      ? "atMost"
                      : event.currentTarget.value === "equals"
                        ? "equals"
                        : "atLeast"
                })
              }
            >
              <option value="atLeast">at least</option>
              <option value="atMost">at most</option>
              <option value="equals">equal to</option>
            </InlineSelect>
            <InlineInput
              aria-label="Counter value"
              className="w-16"
              type="number"
              value={condition.value}
              onChange={(event) =>
                onChange({ ...condition, value: Number(event.currentTarget.value) })
              }
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="shrink-0 text-[11px] font-medium text-slate-400">for</span>
            <InlineSelect
              aria-label="Counter owner"
              className="min-w-28 flex-1"
              value={condition.target}
              onChange={(event) =>
                onChange({
                  ...condition,
                  target: event.currentTarget.value === "shared" ? "shared" : "activePlayer"
                })
              }
            >
              <option value="activePlayer" disabled={counter?.scope === "shared"}>
                Active player
              </option>
              <option value="shared" disabled={counter?.scope === "player"}>
                Shared value
              </option>
            </InlineSelect>
          </div>
          {!hasCounters ? (
            <RuleCounterSetupNotice onOpenGameSettings={onOpenGameSettings} />
          ) : missingCounter ? (
            <PanelNotice>
              This counter is missing. Pick another counter or add it again.
            </PanelNotice>
          ) : null}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <span className="shrink-0 text-[11px] font-medium text-slate-400">Card is in</span>
          <RoleSelect
            inline
            aria-label="Place name"
            className="min-w-28 flex-1"
            options={roleOptions}
            value={condition.role}
            onChange={(role) => onChange({ ...condition, role })}
          />
          <span className="shrink-0 text-[11px] font-medium text-slate-400">for</span>
          <InlineSelect
            aria-label="Place owner"
            className="min-w-28 flex-1"
            value={condition.owner}
            onChange={(event) =>
              onChange({
                ...condition,
                owner: event.currentTarget.value === "shared" ? "shared" : "activePlayer"
              })
            }
          >
            <option value="activePlayer">Active player</option>
            <option value="shared">Shared table</option>
          </InlineSelect>
        </div>
      )}
    </InlineEditorRow>
  );
}

function RuleEffectsEditor({
  effects,
  gameConfig,
  roleOptions,
  onChange,
  onOpenGameSettings
}: {
  effects: ProjectObjectRuleEffect[];
  gameConfig: ProjectGameConfig;
  roleOptions: readonly string[];
  onChange: (effects: ProjectObjectRuleEffect[]) => void;
  onOpenGameSettings?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-start gap-2">
        <PanelSubsectionLabel info="Add what happens after the card is played. Effects happen from top to bottom.">
          Then
        </PanelSubsectionLabel>
      </div>
      {effects.length ? (
        effects.map((effect) => (
          <RuleEffectRow
            key={effect.id}
            effect={effect}
            gameConfig={gameConfig}
            roleOptions={roleOptions}
            onChange={(nextEffect) =>
              onChange(
                effects.map((candidate) => (candidate.id === effect.id ? nextEffect : candidate))
              )
            }
            onRemove={() => onChange(effects.filter((candidate) => candidate.id !== effect.id))}
            onOpenGameSettings={onOpenGameSettings}
          />
        ))
      ) : (
        <PanelEmptyState>No effects. Playing the card will not change anything.</PanelEmptyState>
      )}
      <PanelActionButton
        onClick={() => onChange([...effects, createProjectObjectRuleEffect(gameConfig)])}
      >
        <Plus size={12} />
        Add effect
      </PanelActionButton>
    </div>
  );
}

function RuleEffectRow({
  effect,
  gameConfig,
  roleOptions,
  onChange,
  onRemove,
  onOpenGameSettings
}: {
  effect: ProjectObjectRuleEffect;
  gameConfig: ProjectGameConfig;
  roleOptions: readonly string[];
  onChange: (effect: ProjectObjectRuleEffect) => void;
  onRemove: () => void;
  onOpenGameSettings?: () => void;
}) {
  const counter =
    effect.type === "modifyCounter"
      ? gameConfig.counters.find((candidate) => candidate.id === effect.counterId)
      : null;
  const hasCounters = gameConfig.counters.length > 0;
  const missingCounter =
    effect.type === "modifyCounter" && effect.counterId && !counter ? effect.counterId : null;
  const effectTypeSelect = (
    <TypeSelect
      aria-label="Effect type"
      value={effect.type}
      onChange={(event) =>
        onChange(createEffectForType(effect.id, event.currentTarget.value, gameConfig))
      }
    >
      <option value="modifyCounter">Counter</option>
      <option value="moveThisCardToZoneRole">Move</option>
      <option value="drawCards">Draw</option>
    </TypeSelect>
  );

  return (
    <InlineEditorRow
      action={
        <RowRemoveButton title="Remove effect" onClick={onRemove}>
          <Trash2 size={13} />
        </RowRemoveButton>
      }
      typeControl={effectTypeSelect}
    >
      {effect.type === "modifyCounter" ? (
        <>
          <div className="flex flex-wrap items-center gap-1">
            <span className="shrink-0 text-[11px] font-medium text-slate-400">Change</span>
            <InlineSelect
              aria-label="Counter"
              className="min-w-28 flex-1"
              disabled={!hasCounters}
              value={effect.counterId}
              onChange={(event) => {
                const nextCounter = gameConfig.counters.find(
                  (candidate) => candidate.id === event.currentTarget.value
                );

                onChange({
                  ...effect,
                  counterId: event.currentTarget.value,
                  target: nextCounter?.scope === "shared" ? "shared" : "activePlayer"
                });
              }}
            >
              {!effect.counterId ? <option value="">No counter selected</option> : null}
              {missingCounter ? <option value={missingCounter}>Missing counter</option> : null}
              {gameConfig.counters.map((counter) => (
                <option key={counter.id} value={counter.id}>
                  {counter.label}
                </option>
              ))}
            </InlineSelect>
            <span className="shrink-0 text-[11px] font-medium text-slate-400">by</span>
            <InlineInput
              aria-label="Counter change"
              className="w-16"
              type="number"
              value={effect.amount}
              onChange={(event) =>
                onChange({ ...effect, amount: Number(event.currentTarget.value) })
              }
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="shrink-0 text-[11px] font-medium text-slate-400">for</span>
            <InlineSelect
              aria-label="Counter owner"
              className="min-w-28 flex-1"
              value={effect.target}
              onChange={(event) =>
                onChange({
                  ...effect,
                  target: event.currentTarget.value === "shared" ? "shared" : "activePlayer"
                })
              }
            >
              <option value="activePlayer" disabled={counter?.scope === "shared"}>
                Active player
              </option>
              <option value="shared" disabled={counter?.scope === "player"}>
                Shared value
              </option>
            </InlineSelect>
          </div>
          {!hasCounters ? (
            <RuleCounterSetupNotice onOpenGameSettings={onOpenGameSettings} />
          ) : missingCounter ? (
            <PanelNotice>
              This counter is missing. Pick another counter or add it again.
            </PanelNotice>
          ) : null}
        </>
      ) : effect.type === "moveThisCardToZoneRole" ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="shrink-0 text-[11px] font-medium text-slate-400">Move this card to</span>
          <RoleSelect
            inline
            aria-label="Target place"
            className="min-w-28 flex-1"
            options={roleOptions}
            value={effect.role}
            onChange={(role) => onChange({ ...effect, role })}
          />
          <span className="shrink-0 text-[11px] font-medium text-slate-400">for</span>
          <InlineSelect
            aria-label="Target place owner"
            className="min-w-28 flex-1"
            value={effect.owner}
            onChange={(event) =>
              onChange({
                ...effect,
                owner: event.currentTarget.value === "shared" ? "shared" : "activePlayer"
              })
            }
          >
            <option value="activePlayer">Active player</option>
            <option value="shared">Shared table</option>
          </InlineSelect>
          <span className="shrink-0 text-[11px] font-medium text-slate-400">side</span>
          <InlineSelect
            aria-label="Target side"
            className="min-w-24 flex-1"
            value={effect.side}
            onChange={(event) =>
              onChange({
                ...effect,
                side: event.currentTarget.value === "back" ? "back" : "front"
              })
            }
          >
            {ruleSideOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </InlineSelect>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <span className="shrink-0 text-[11px] font-medium text-slate-400">Draw</span>
          <InlineInput
            aria-label="Number of cards"
            className="w-14"
            type="number"
            value={effect.count}
            onChange={(event) =>
              onChange({ ...effect, count: Math.max(1, Number(event.currentTarget.value)) })
            }
          />
          <span className="shrink-0 text-[11px] font-medium text-slate-400">
            {effect.count === 1 ? "card from" : "cards from"}
          </span>
          <RoleSelect
            inline
            aria-label="Source place"
            className="min-w-24 flex-1"
            options={roleOptions}
            value={effect.sourceRole}
            onChange={(sourceRole) => onChange({ ...effect, sourceRole })}
          />
          <span className="shrink-0 text-[11px] font-medium text-slate-400">to</span>
          <RoleSelect
            inline
            aria-label="Target place"
            className="min-w-24 flex-1"
            options={roleOptions}
            value={effect.targetRole}
            onChange={(targetRole) => onChange({ ...effect, targetRole })}
          />
          <span className="shrink-0 text-[11px] font-medium text-slate-400">for</span>
          <InlineSelect
            aria-label="Draw owner"
            className="min-w-28 flex-1"
            value={effect.owner}
            onChange={(event) =>
              onChange({
                ...effect,
                owner: event.currentTarget.value === "shared" ? "shared" : "activePlayer"
              })
            }
          >
            <option value="activePlayer">Active player</option>
            <option value="shared">Shared table</option>
          </InlineSelect>
        </div>
      )}
    </InlineEditorRow>
  );
}

function RoleSelect({
  "aria-label": ariaLabel,
  className,
  inline = false,
  options,
  value,
  onChange
}: {
  "aria-label": string;
  className?: string;
  inline?: boolean;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const normalizedOptions = getRuleRoleSelectOptions(options, value);

  return (
    <FormSelect
      aria-label={ariaLabel}
      className={cx(inline ? "h-7 text-[12px]" : "text-xs font-semibold text-slate-700", className)}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {!value ? <option value="">Choose place</option> : null}
      {normalizedOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </FormSelect>
  );
}

function getRuleRoleSelectOptions(options: readonly string[], value: string) {
  const seen = new Set<string>();
  const normalizedOptions: string[] = [];

  for (const option of [...options, value]) {
    const trimmedOption = option.trim();
    const key = trimmedOption.toLowerCase();

    if (!trimmedOption || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedOptions.push(trimmedOption);
  }

  return normalizedOptions;
}

function RuleCounterSetupNotice({ onOpenGameSettings }: { onOpenGameSettings?: () => void }) {
  return (
    <PanelNotice>
      Add a counter in{" "}
      {onOpenGameSettings ? (
        <button
          className="rounded-sm font-semibold underline underline-offset-2 hover:text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          type="button"
          onClick={onOpenGameSettings}
        >
          Game Settings
        </button>
      ) : (
        "Game Settings"
      )}
      , then choose it here.
    </PanelNotice>
  );
}

function createEffectForType(
  id: string,
  type: string,
  gameConfig: ProjectGameConfig
): ProjectObjectRuleEffect {
  const counter = gameConfig.counters[0];

  if (type === "drawCards") {
    return {
      count: 1,
      id,
      owner: "activePlayer",
      sourceRole: "Deck",
      targetRole: "Hand",
      type: "drawCards"
    };
  }

  if (type === "moveThisCardToZoneRole") {
    return {
      id,
      owner: "activePlayer",
      role: "Discard",
      side: "front",
      type: "moveThisCardToZoneRole"
    };
  }

  return {
    amount: counter?.step ?? 1,
    counterId: counter?.id ?? "",
    id,
    target: counter?.scope === "shared" ? "shared" : "activePlayer",
    type: "modifyCounter"
  };
}
