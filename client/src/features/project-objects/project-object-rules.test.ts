import type { ProjectFileNode, ProjectObjectRules } from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  createProjectObjectRuleCounterCondition,
  getProjectObjectFileEffectiveRules
} from "./project-object-rules";

describe("project object rules", () => {
  it("resolves sourceRef rules from template defaults unless concrete rules replace them", () => {
    const templateRules = createRules("Template play");
    const concreteRules = createRules("Concrete play");
    const sourceCard: ProjectFileNode = {
      id: "source-card",
      kind: "object",
      name: "Source card",
      objectTree: [],
      rules: templateRules,
      type: "file"
    };
    const linkedCard: ProjectFileNode = {
      id: "linked-card",
      kind: "object",
      name: "Linked card",
      objectTree: [],
      sourceRef: {
        sourceObjectFileNodeId: sourceCard.id,
        values: {}
      },
      type: "file"
    };
    const fileTree = [sourceCard, linkedCard];

    expect(getProjectObjectFileEffectiveRules(fileTree, linkedCard)?.playCards[0]?.label).toBe(
      "Template play"
    );

    const customizedLinkedCard = { ...linkedCard, rules: concreteRules };
    expect(
      getProjectObjectFileEffectiveRules([sourceCard, customizedLinkedCard], customizedLinkedCard)
        ?.playCards[0]?.label
    ).toBe("Concrete play");

    expect(
      getProjectObjectFileEffectiveRules([sourceCard, linkedCard], linkedCard)?.playCards[0]?.label
    ).toBe("Template play");
  });

  it("creates a counter condition draft before counters are configured", () => {
    expect(
      createProjectObjectRuleCounterCondition({ counters: [], players: [] }, () => "condition-1")
    ).toEqual({
      counterId: "",
      id: "condition-1",
      operator: "atLeast",
      target: "activePlayer",
      type: "counter",
      value: 0
    });
  });
});

function createRules(label: string): ProjectObjectRules {
  return {
    playCards: [
      {
        conditions: [],
        effects: [],
        id: `rule-${label}`,
        label
      }
    ]
  };
}
