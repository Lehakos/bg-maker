import type {
  ProjectFileNode,
  ProjectGameConfig,
  ProjectObjectPlayCardRule,
  ProjectObjectRuleCondition,
  ProjectObjectRuleConditionConnector,
  ProjectObjectRuleEffect,
  ProjectObjectRules
} from "@bg-maker/shared";
import { resolveProjectObjectFileRules } from "@bg-maker/shared";

export function createProjectObjectPlayCardRule(
  createId: () => string = () => crypto.randomUUID()
): ProjectObjectPlayCardRule {
  return {
    conditions: [],
    effects: [],
    id: createId(),
    label: "Play card"
  };
}

export function createProjectObjectRuleCondition(
  gameConfig: ProjectGameConfig,
  createId: () => string = () => crypto.randomUUID(),
  connector?: ProjectObjectRuleConditionConnector
): ProjectObjectRuleCondition {
  const counter = gameConfig.counters[0];

  return counter
    ? createProjectObjectRuleCounterCondition(gameConfig, createId, connector)
    : {
        ...(connector ? { connector } : {}),
        id: createId(),
        owner: "activePlayer",
        role: "Hand",
        type: "cardInZoneRole"
      };
}

export function createProjectObjectRuleCounterCondition(
  gameConfig: ProjectGameConfig,
  createId: () => string = () => crypto.randomUUID(),
  connector?: ProjectObjectRuleConditionConnector
): ProjectObjectRuleCondition {
  const counter = gameConfig.counters[0];

  return {
    ...(connector ? { connector } : {}),
    counterId: counter?.id ?? "",
    id: createId(),
    operator: "atLeast",
    target: counter?.scope === "shared" ? "shared" : "activePlayer",
    type: "counter",
    value: counter?.defaultValue ?? 0
  };
}

export function createProjectObjectRuleEffect(
  gameConfig: ProjectGameConfig,
  createId: () => string = () => crypto.randomUUID()
): ProjectObjectRuleEffect {
  const counter = gameConfig.counters[0];

  return counter
    ? {
        amount: counter.step,
        counterId: counter.id,
        id: createId(),
        target: counter.scope === "shared" ? "shared" : "activePlayer",
        type: "modifyCounter"
      }
    : {
        id: createId(),
        owner: "activePlayer",
        role: "Discard",
        side: "front",
        type: "moveThisCardToZoneRole"
      };
}

export function getProjectObjectRulesWithPlayCardRules(
  rules: ProjectObjectRules | undefined,
  playCards: ProjectObjectPlayCardRule[]
): ProjectObjectRules | undefined {
  if (!playCards.length) {
    return undefined;
  }

  return {
    ...(rules ?? {}),
    playCards
  };
}

export function getProjectObjectFileEffectiveRules(
  fileTree: readonly ProjectFileNode[],
  fileNode: ProjectFileNode | null | undefined
): ProjectObjectRules | undefined {
  return resolveProjectObjectFileRules(fileTree, fileNode);
}

export function cloneProjectObjectRules(rules: ProjectObjectRules | undefined): ProjectObjectRules {
  return {
    playCards:
      rules?.playCards.map((rule) => ({
        ...rule,
        conditions: rule.conditions.map((condition) => ({ ...condition })),
        effects: rule.effects.map((effect) => ({ ...effect }))
      })) ?? []
  };
}
