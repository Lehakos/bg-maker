import {
  createDefaultProjectObjectNode,
  getDefaultProjectObjectText,
  getDefaultProjectTableSetup,
  type ProjectFileNode
} from "@bg-maker/shared";
import { describe, expect, it } from "vitest";
import {
  createSetProjectObjectSideSelectionCommand,
  createReplaceProjectFileTreeCommand,
  createUpdateProjectObjectTreeCommand
} from "./project-editor-commands";
import {
  createProjectWorkspaceStore,
  getProjectWorkspaceSelection
} from "./project-workspace-store";
import {
  findProjectObjectNode,
  getProjectObjectNodeActiveSide,
  getProjectObjectNodeVisibleChildren
} from "../project-objects/project-object-tree";

const initialFileTree: ProjectFileNode[] = [
  {
    id: "objects",
    name: "Objects",
    type: "folder",
    children: [
      {
        id: "object-file",
        name: "Token",
        type: "file",
        kind: "object",
        objectTree: [
          {
            id: "root",
            name: "Root",
            kind: "group",
            visible: true,
            components: {
              appearance: {
                backgroundColor: "#ffffff",
                backgroundOpacity: 1,
                borderColor: "#000000",
                borderRadius: 0,
                borderStyle: "none",
                borderWidth: 0,
                opacity: 1,
                padding: 0
              },
              rectTransform: {
                height: 100,
                pivotX: 0.5,
                pivotY: 0.5,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                width: 100,
                x: 0,
                y: 0
              }
            },
            children: [
              {
                id: "child",
                name: "Child",
                kind: "label",
                visible: true,
                components: {
                  appearance: {
                    backgroundColor: "#ffffff",
                    backgroundOpacity: 1,
                    borderColor: "#000000",
                    borderRadius: 0,
                    borderStyle: "none",
                    borderWidth: 0,
                    opacity: 1,
                    padding: 0
                  },
                  rectTransform: {
                    height: 10,
                    pivotX: 0.5,
                    pivotY: 0.5,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    width: 10,
                    x: 0,
                    y: 0
                  },
                  text: {
                    ...getDefaultProjectObjectText("label"),
                    color: "#000000",
                    content: "Child",
                    fontSize: 12,
                    fontStyle: "normal",
                    fontWeight: 400,
                    lineHeight: 1.2,
                    textAlign: "center",
                    verticalAlign: "middle"
                  }
                },
                children: []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "table-setups",
    name: "Table setups",
    type: "folder",
    children: []
  }
];

describe("project workspace store", () => {
  it("initializes sorted file tree selection and selects object roots by default", () => {
    const store = createProjectWorkspaceStore({
      initialFileTree,
      projectId: "project-1",
      saveFileTree: () => undefined
    });

    expect(store.getState().fileTree[0]?.id).toBe("objects");
    store.getState().setSelectedNodeId("object-file");

    expect(getProjectWorkspaceSelection(store.getState())).toMatchObject({
      effectiveSelectedNodeId: "object-file",
      selectedObjectId: "root"
    });
  });

  it("keeps object side selection as workspace UI state", () => {
    const cardFileTree: ProjectFileNode[] = [
      {
        id: "card-file",
        kind: "object",
        name: "Card",
        objectTree: [
          {
            children: [
              {
                id: "front-label",
                kind: "label",
                name: "Front label",
                parentSide: "front",
                visible: true
              },
              {
                id: "back-label",
                kind: "label",
                name: "Back label",
                parentSide: "back",
                visible: true
              }
            ],
            id: "card-root",
            kind: "card",
            name: "Card",
            visible: true
          }
        ],
        type: "file"
      }
    ];
    const savedFileTrees: ProjectFileNode[][] = [];
    const store = createProjectWorkspaceStore({
      initialFileTree: cardFileTree,
      projectId: "project-1",
      saveFileTree: (fileTree) => savedFileTrees.push(fileTree)
    });

    store.getState().setSelectedNodeId("card-file");
    store.getState().executeCommand(
      createSetProjectObjectSideSelectionCommand({
        after: "back",
        before: "front",
        fileNodeId: "card-file",
        objectId: "card-root"
      })
    );

    const selection = getProjectWorkspaceSelection(store.getState());

    expect(getProjectObjectNodeActiveSide(selection.selectedProjectObject!)).toBe("back");
    expect(
      getProjectObjectNodeVisibleChildren(selection.selectedProjectObject!).map((child) => child.id)
    ).toEqual(["back-label"]);
    expect(
      findProjectObjectNode(store.getState().fileTree[0]?.objectTree ?? [], "card-root")?.components
        ?.doubleSide
    ).toBeUndefined();
    expect(savedFileTrees).toEqual([]);

    store.getState().undo();
    expect(
      getProjectObjectNodeVisibleChildren(
        getProjectWorkspaceSelection(store.getState()).selectedProjectObject!
      ).map((child) => child.id)
    ).toEqual(["front-label"]);

    store.getState().redo();
    expect(
      getProjectObjectNodeVisibleChildren(
        getProjectWorkspaceSelection(store.getState()).selectedProjectObject!
      ).map((child) => child.id)
    ).toEqual(["back-label"]);
  });

  it("keeps selected objects scoped to the currently selected file node", () => {
    const store = createProjectWorkspaceStore({
      initialFileTree,
      projectId: "project-1",
      saveFileTree: () => undefined
    });

    store.getState().setSelectedNodeId("object-file");
    store.getState().selectObject("child");
    expect(getProjectWorkspaceSelection(store.getState()).selectedObjectId).toBe("child");

    store.getState().setSelectedNodeId("objects");
    expect(getProjectWorkspaceSelection(store.getState()).selectedObjectId).toBeNull();

    store.getState().setSelectedNodeId("object-file");
    expect(getProjectWorkspaceSelection(store.getState()).selectedObjectId).toBe("child");
  });

  it("stores table setup multi-selection and workspace clipboard state", () => {
    const tableFileTree: ProjectFileNode[] = [
      {
        id: "setup-file",
        kind: "tableSetup",
        name: "Setup",
        tableSetup: {
          backgroundColor: "#6f8b70",
          grid: { size: 50, snap: false, visible: true },
          height: 600,
          items: [
            {
              id: "linked-1",
              name: "Linked 1",
              sourceObjectFileNodeId: "object-file",
              transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
              type: "linkedObject",
              values: {},
              visible: true
            },
            {
              id: "linked-2",
              name: "Linked 2",
              sourceObjectFileNodeId: "object-file",
              transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 50, y: 0 },
              type: "linkedObject",
              values: {},
              visible: true
            }
          ],
          width: 900
        },
        type: "file"
      }
    ];
    const store = createProjectWorkspaceStore({
      initialFileTree: tableFileTree,
      projectId: "project-1",
      saveFileTree: () => undefined
    });

    store.getState().setSelectedNodeId("setup-file");
    store.getState().selectObjects(["linked-1", "linked-2"], "linked-2");
    store.getState().setClipboard({
      items: tableFileTree[0]!.tableSetup!.items,
      type: "tableSetupItems"
    });

    expect(getProjectWorkspaceSelection(store.getState())).toMatchObject({
      selectedObjectId: "linked-2",
      selectedObjectIds: ["linked-1", "linked-2"]
    });
    expect(store.getState().clipboard).toMatchObject({
      type: "tableSetupItems"
    });
  });

  it("opens, activates, closes, and prunes workspace tabs", () => {
    const store = createProjectWorkspaceStore({
      initialFileTree,
      projectId: "project-1",
      saveFileTree: () => undefined
    });

    store.getState().openWorkspaceNode("object-file");
    expect(store.getState().openTabIds).toEqual(["object-file"]);
    expect(getProjectWorkspaceSelection(store.getState()).effectiveSelectedNodeId).toBe(
      "object-file"
    );

    store.getState().openWorkspaceNode("objects");
    expect(store.getState().openTabIds).toEqual(["object-file"]);
    expect(getProjectWorkspaceSelection(store.getState()).effectiveSelectedNodeId).toBe("objects");

    store.getState().openWorkspaceNode("object-file");
    store.getState().closeWorkspaceTab("object-file");
    expect(store.getState().openTabIds).toEqual([]);
    expect(getProjectWorkspaceSelection(store.getState()).effectiveSelectedNodeId).toBe("objects");

    store.getState().openWorkspaceNode("object-file");
    const beforeFileTree = store.getState().fileTree;
    const withoutObjectFile = beforeFileTree.map((node) =>
      node.id === "objects" ? { ...node, children: [] } : node
    );

    store.getState().executeCommand(
      createReplaceProjectFileTreeCommand({
        after: withoutObjectFile,
        before: beforeFileTree,
        label: "Delete selected object file"
      })
    );

    expect(store.getState().openTabIds).toEqual([]);
  });

  it("closes workspace tab groups while keeping the active selection sensible", () => {
    const tabFileTree: ProjectFileNode[] = [
      {
        id: "workspace",
        name: "Workspace",
        type: "folder",
        children: [
          {
            id: "object-a",
            kind: "object",
            name: "Object A",
            objectTree: [],
            type: "file"
          },
          {
            id: "object-b",
            kind: "object",
            name: "Object B",
            objectTree: [],
            type: "file"
          },
          {
            id: "object-c",
            kind: "object",
            name: "Object C",
            objectTree: [],
            type: "file"
          },
          {
            id: "setup",
            kind: "tableSetup",
            name: "Setup",
            tableSetup: {
              backgroundColor: "#6f8b70",
              grid: { size: 50, snap: false, visible: true },
              height: 600,
              items: [],
              width: 900
            },
            type: "file"
          }
        ]
      }
    ];
    const store = createProjectWorkspaceStore({
      initialFileTree: tabFileTree,
      projectId: "project-tabs",
      saveFileTree: () => undefined
    });

    store.getState().openWorkspaceNode("object-a");
    store.getState().openWorkspaceNode("object-b");
    store.getState().openWorkspaceNode("object-c");
    store.getState().openWorkspaceNode("setup");
    expect(store.getState().openTabIds).toEqual(["object-a", "object-b", "object-c", "setup"]);

    store.getState().openWorkspaceNode("object-c");
    store.getState().closeWorkspaceTabsToRight("object-b");
    expect(store.getState().openTabIds).toEqual(["object-a", "object-b"]);
    expect(getProjectWorkspaceSelection(store.getState()).effectiveSelectedNodeId).toBe("object-b");

    store.getState().openWorkspaceNode("object-c");
    store.getState().openWorkspaceNode("setup");
    store.getState().closeOtherWorkspaceTabs("object-c");
    expect(store.getState().openTabIds).toEqual(["object-c"]);
    expect(getProjectWorkspaceSelection(store.getState()).effectiveSelectedNodeId).toBe("object-c");

    store.getState().closeOtherWorkspaceTabs("missing");
    expect(store.getState().openTabIds).toEqual(["object-c"]);

    store.getState().openWorkspaceNode("object-a");
    store.getState().openWorkspaceNode("object-b");
    store.getState().closeAllWorkspaceTabs();
    expect(store.getState().openTabIds).toEqual([]);
    expect(getProjectWorkspaceSelection(store.getState()).effectiveSelectedNodeId).toBe(
      "workspace"
    );
  });

  it("opens linked table setup sources in object tabs", () => {
    const tableFileTree: ProjectFileNode[] = [
      ...initialFileTree,
      {
        id: "setup-file",
        kind: "tableSetup",
        name: "Setup",
        tableSetup: {
          backgroundColor: "#6f8b70",
          grid: { size: 50, snap: false, visible: true },
          height: 600,
          items: [
            {
              id: "linked-1",
              name: "Linked 1",
              sourceObjectFileNodeId: "object-file",
              transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
              type: "linkedObject",
              values: {},
              visible: true
            }
          ],
          width: 900
        },
        type: "file"
      }
    ];
    const store = createProjectWorkspaceStore({
      initialFileTree: tableFileTree,
      projectId: "project-1",
      saveFileTree: () => undefined
    });

    store.getState().openWorkspaceNode("setup-file");
    store.getState().selectTableSetupItems(["linked-1"], "linked-1");
    store.getState().openObjectForEditing({ fileNodeId: "object-file" });

    expect(store.getState().openTabIds).toEqual(["setup-file", "object-file"]);
    expect(getProjectWorkspaceSelection(store.getState())).toMatchObject({
      effectiveSelectedNodeId: "object-file",
      selectedObjectId: "root"
    });
  });

  it("selects nested objects inside local table setup items while keeping table item canvas focus", () => {
    const tableFileTree: ProjectFileNode[] = [
      {
        id: "setup-file",
        kind: "tableSetup",
        name: "Setup",
        tableSetup: {
          backgroundColor: "#6f8b70",
          grid: { size: 50, snap: false, visible: true },
          height: 600,
          items: [
            {
              object: {
                children: [
                  {
                    id: "local-child",
                    kind: "label",
                    name: "Local child",
                    visible: true
                  }
                ],
                id: "local-root",
                kind: "group",
                name: "Local root",
                visible: true
              },
              type: "localObject"
            }
          ],
          width: 900
        },
        type: "file"
      }
    ];
    const store = createProjectWorkspaceStore({
      initialFileTree: tableFileTree,
      projectId: "project-1",
      saveFileTree: () => undefined
    });

    store.getState().openWorkspaceNode("setup-file");
    store.getState().selectTableSetupLocalObject("local-root", "local-child");
    const selection = getProjectWorkspaceSelection(store.getState());

    expect(selection).toMatchObject({
      selectedObjectId: "local-child",
      selectedViewportObjectId: "local-root"
    });
    expect(selection.selectedProjectObject?.name).toBe("Local child");
    expect(selection.selectedTableSetupLocalItem?.object.id).toBe("local-root");

    store.getState().selectTableSetupItems(["local-root"], "local-root");
    const tableItemSelection = getProjectWorkspaceSelection(store.getState());

    expect(tableItemSelection).toMatchObject({
      selectedObjectId: "local-root",
      selectedViewportObjectId: "local-root"
    });
    expect(tableItemSelection.selectedProjectObject?.name).toBe("Local root");
    expect(tableItemSelection.selectedTableSetupItem?.type).toBe("localObject");
    expect(tableItemSelection.selectedTableSetupLocalItem).toBeNull();
  });

  it("reconciles selected files and objects after file tree mutations", () => {
    const store = createProjectWorkspaceStore({
      initialFileTree,
      projectId: "project-1",
      saveFileTree: () => undefined
    });

    store.getState().setSelectedNodeId("object-file");
    store.getState().selectObject("child");

    const selectedContentFileNode = getProjectWorkspaceSelection(
      store.getState()
    ).selectedContentFileNode;
    const beforeObjectTree = selectedContentFileNode?.objectTree ?? [];
    const rootOnlyObjectTree = beforeObjectTree.map((node) =>
      node.id === "root" ? { ...node, children: [] } : node
    );

    store.getState().executeCommand(
      createUpdateProjectObjectTreeCommand({
        after: rootOnlyObjectTree,
        before: beforeObjectTree,
        fileNodeId: "object-file",
        label: "Delete child object"
      })
    );

    expect(getProjectWorkspaceSelection(store.getState())).toMatchObject({
      effectiveSelectedNodeId: "object-file",
      selectedObjectId: "root"
    });

    const beforeFileTree = store.getState().fileTree;
    const withoutObjectFile = beforeFileTree.map((node) =>
      node.id === "objects" ? { ...node, children: [] } : node
    );

    store.getState().executeCommand(
      createReplaceProjectFileTreeCommand({
        after: withoutObjectFile,
        before: beforeFileTree,
        label: "Delete selected object file"
      })
    );

    expect(getProjectWorkspaceSelection(store.getState())).toMatchObject({
      effectiveSelectedNodeId: "objects",
      selectedObjectId: null
    });

    store.getState().undo();
    expect(getProjectWorkspaceSelection(store.getState())).toMatchObject({
      effectiveSelectedNodeId: "object-file",
      selectedObjectId: "root"
    });

    store.getState().undo();
    expect(getProjectWorkspaceSelection(store.getState())).toMatchObject({
      effectiveSelectedNodeId: "object-file",
      selectedObjectId: "child"
    });
  });

  it("executes, undoes, redoes, and saves file tree commands", () => {
    const savedFileTrees: ProjectFileNode[][] = [];
    const store = createProjectWorkspaceStore({
      initialFileTree,
      projectId: "project-1",
      saveFileTree: (fileTree) => savedFileTrees.push(fileTree)
    });
    const before = store.getState().fileTree;
    const after = [
      ...before,
      {
        id: "notes",
        name: "Notes",
        type: "folder" as const,
        children: []
      }
    ];

    store.getState().executeCommand(
      createReplaceProjectFileTreeCommand({
        after,
        before,
        label: "Add notes folder"
      })
    );

    expect(store.getState()).toMatchObject({
      canRedo: false,
      canUndo: true,
      fileTree: after
    });
    expect(savedFileTrees).toEqual([after]);

    store.getState().undo();
    expect(store.getState()).toMatchObject({
      canRedo: true,
      canUndo: false,
      fileTree: before
    });
    expect(savedFileTrees).toEqual([after, before]);

    store.getState().redo();
    expect(store.getState()).toMatchObject({
      canRedo: false,
      canUndo: true,
      fileTree: after
    });
    expect(savedFileTrees).toEqual([after, before, after]);
  });

  it("runs playtest actions without saving the editor file tree", () => {
    const card = createDefaultProjectObjectNode("card-root", "card", "Card");
    const deck = createDefaultProjectObjectNode("deck-root", "deck", "Deck");
    deck.components = {
      ...deck.components,
      container: {
        entries: [{ objectFileNodeId: "card-file", quantity: 1 }]
      }
    };
    const playtestFileTree: ProjectFileNode[] = [
      {
        id: "objects",
        name: "Objects",
        type: "folder",
        children: [
          { id: "card-file", kind: "object", name: "Card", objectTree: [card], type: "file" },
          { id: "deck-file", kind: "object", name: "Deck", objectTree: [deck], type: "file" }
        ]
      },
      {
        id: "setup-file",
        kind: "tableSetup",
        name: "Setup",
        tableSetup: {
          ...getDefaultProjectTableSetup(),
          items: [
            {
              id: "deck-item",
              name: "Deck",
              sourceObjectFileNodeId: "deck-file",
              transform: { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
              type: "linkedObject",
              values: {},
              visible: true
            }
          ]
        },
        type: "file"
      }
    ];
    const savedFileTrees: ProjectFileNode[][] = [];
    const store = createProjectWorkspaceStore({
      initialFileTree: playtestFileTree,
      projectId: "project-playtest",
      saveFileTree: (fileTree) => savedFileTrees.push(fileTree)
    });

    store.getState().startPlaytest("setup-file");
    expect(store.getState().workspaceMode).toBe("playtest");
    expect(store.getState().playtestSession?.itemsById["deck-item"]?.contents).toHaveLength(1);

    const result = store
      .getState()
      .executePlaytestAction({ itemId: "deck-item", type: "drawFromContainer" });

    expect(result?.status).toBe("applied");
    expect(store.getState().playtestSession?.itemsById["deck-item"]?.contents).toHaveLength(0);
    expect(savedFileTrees).toEqual([]);

    store.getState().undo();
    expect(store.getState().playtestSession?.itemsById["deck-item"]?.contents).toHaveLength(1);
    expect(savedFileTrees).toEqual([]);

    store.getState().stopPlaytest();
    expect(store.getState().workspaceMode).toBe("edit");
    expect(store.getState().playtestSession).toBeNull();
  });
});
