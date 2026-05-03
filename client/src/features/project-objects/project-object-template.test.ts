import {
  resolveProjectObjectFileObjectTree,
  type ProjectFileNode,
  type ProjectObjectNode,
  type ProjectObjectTemplate,
  type ProjectObjectVariableBindingTarget
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";

const template: ProjectObjectTemplate = {
  variables: [
    { id: "title", name: "Title", type: "text", defaultValue: "Default title" },
    { id: "power", name: "Power", type: "number", defaultValue: 1 },
    { id: "portrait", name: "Portrait", type: "image", defaultValue: "asset-default" },
    { id: "accent", name: "Accent", type: "color", defaultValue: "#112233" }
  ]
};

function labelNode(id: string, variableId: string, target = "text.content"): ProjectObjectNode {
  return {
    id,
    name: id,
    kind: "label",
    visible: true,
    bindings: [{ variableId, target: target as ProjectObjectVariableBindingTarget }],
    components: {
      text: {
        color: "#000000",
        content: "Raw",
        fontSize: 16,
        fontStyle: "normal",
        fontWeight: 600,
        lineHeight: 1.2,
        textAlign: "center",
        verticalAlign: "middle"
      }
    }
  };
}

const sourceRoot: ProjectObjectNode = {
  id: "card-root",
  name: "Character Card",
  kind: "card",
  visible: true,
  components: {
    card: { sizePreset: "custom" },
    rectTransform: {
      height: 100,
      pivotX: 0.5,
      pivotY: 0.5,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      width: 70,
      x: 0,
      y: 0
    }
  },
  children: [
    labelNode("title-label", "title"),
    labelNode("power-label", "power"),
    labelNode("accent-label", "accent", "text.color"),
    {
      id: "portrait-image",
      name: "Portrait",
      kind: "image",
      visible: true,
      bindings: [{ variableId: "portrait", target: "image.assetId" }],
      components: {
        image: {
          assetId: "",
          fit: "cover",
          positionX: 50,
          positionY: 50
        }
      }
    }
  ]
};

function objectFile(
  id: string,
  node: Partial<ProjectFileNode> & { name?: string } = {}
): ProjectFileNode {
  return {
    id,
    kind: "object",
    name: node.name ?? id,
    type: "file",
    ...node
  };
}

describe("project object template resolver", () => {
  it("uses defaults and linked object values in precedence order", () => {
    const fileTree = [
      objectFile("character-card", {
        objectTree: [sourceRoot],
        template
      }),
      objectFile("custom-warrior", {
        sourceRef: {
          sourceObjectFileNodeId: "character-card",
          values: {
            accent: "#aa0000",
            portrait: "asset-warrior",
            title: "Warrior"
          }
        }
      })
    ];

    const defaultTree = resolveProjectObjectFileObjectTree(fileTree, fileTree[0]);
    const linkedTree = resolveProjectObjectFileObjectTree(fileTree, fileTree[1]);

    expect(defaultTree[0]?.children?.[0]?.components?.text?.content).toBe("Default title");
    expect(defaultTree[0]?.children?.[1]?.components?.text?.content).toBe("1");
    expect(defaultTree[0]?.children?.[2]?.components?.text?.color).toBe("#112233");
    expect(defaultTree[0]?.children?.[3]?.components?.image?.assetId).toBe("asset-default");

    expect(linkedTree[0]?.children?.[0]?.components?.text?.content).toBe("Warrior");
    expect(linkedTree[0]?.children?.[1]?.components?.text?.content).toBe("1");
    expect(linkedTree[0]?.children?.[2]?.components?.text?.color).toBe("#aa0000");
    expect(linkedTree[0]?.children?.[3]?.components?.image?.assetId).toBe("asset-warrior");
  });

  it("ignores invalid bindings and keeps linked objects attached to source layout changes", () => {
    const updatedSourceRoot = {
      ...sourceRoot,
      bindings: [{ variableId: "title", target: "image.assetId" }],
      components: {
        ...sourceRoot.components,
        rectTransform: {
          ...sourceRoot.components?.rectTransform,
          width: 90
        }
      }
    } as ProjectObjectNode;
    const fileTree = [
      objectFile("character-card", {
        objectTree: [updatedSourceRoot],
        template
      }),
      objectFile("custom-warrior", {
        sourceRef: {
          sourceObjectFileNodeId: "character-card",
          values: {
            title: "Scout"
          }
        }
      })
    ];

    const linkedTree = resolveProjectObjectFileObjectTree(fileTree, fileTree[1]);

    expect(linkedTree[0]?.components?.rectTransform?.width).toBe(90);
    expect(linkedTree[0]?.components?.image).toBeUndefined();
    expect(linkedTree[0]?.children?.[0]?.components?.text?.content).toBe("Scout");
  });
});
