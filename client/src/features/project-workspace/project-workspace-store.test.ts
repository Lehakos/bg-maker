import type { ProjectFileNode } from "@bg-maker/shared";
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
      findProjectObjectNode(store.getState().fileTree[0]?.objectTree ?? [], "card-root")
        ?.components?.doubleSide
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
});
