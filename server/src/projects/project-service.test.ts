import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  projectObjectContainerEntryQuantityLimits,
  projectObjectCounterAffixMaxLength,
  projectObjectDieFaceLabelMaxLength,
  projectObjectStackDisplayVisibleItemCountLimits,
  type Project
} from "@bg-maker/shared";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  maxProjectImageAssetBytes,
  ProjectService,
  ProjectValidationError
} from "./project-service.js";

let testDirectory: string;
let storePath: string;
let projectService: ProjectService;

beforeEach(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), "bg-maker-project-service-"));
  storePath = join(testDirectory, "projects.json");
  projectService = new ProjectService(storePath);
});

afterEach(async () => {
  await rm(testDirectory, { force: true, recursive: true });
});

describe("ProjectService", () => {
  it("creates projects with trimmed input and the default file tree", async () => {
    const project = await projectService.createProject({
      description: "  Prototype night  ",
      name: "  Table Quest  "
    });

    expect(project).toMatchObject({
      description: "Prototype night",
      fileTree: [
        { children: [], id: "table-setups", name: "Table setups", type: "folder" },
        { children: [], id: "objects", name: "Objects", type: "folder" },
        { children: [], id: "assets", name: "Assets", type: "folder" }
      ],
      name: "Table Quest",
      notes: "",
      objectsCount: 0,
      playtestsCount: 0,
      tableSetupsCount: 0
    });
    expect(project.id).toEqual(expect.any(String));
    expect(Date.parse(project.createdAt)).not.toBeNaN();
    expect(Date.parse(project.updatedAt)).not.toBeNaN();
    expect(await projectService.getProject(project.id)).toEqual(project);
  });

  it("rejects blank project names", async () => {
    await expect(projectService.createProject({ name: "   " })).rejects.toThrow(
      new ProjectValidationError("Project name is required")
    );
  });

  it("lists project summaries sorted by updated date descending", async () => {
    await writeStore([
      createStoredProject({ id: "older", name: "Older", updatedAt: "2026-01-01T00:00:00.000Z" }),
      createStoredProject({ id: "newer", name: "Newer", updatedAt: "2026-03-01T00:00:00.000Z" })
    ]);

    await expect(projectService.listProjects()).resolves.toEqual([
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        description: "",
        id: "newer",
        name: "Newer",
        objectsCount: 0,
        playtestsCount: 0,
        tableSetupsCount: 0,
        updatedAt: "2026-03-01T00:00:00.000Z"
      },
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        description: "",
        id: "older",
        name: "Older",
        objectsCount: 0,
        playtestsCount: 0,
        tableSetupsCount: 0,
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ]);
  });

  it("normalizes stored projects and drops invalid store entries", async () => {
    await writeFile(
      storePath,
      JSON.stringify({
        projects: [
          createStoredProject({
            fileTree: [
              { id: "bad-file", kind: "unknown", name: "Bad file", type: "file" }
            ] as unknown as Project["fileTree"],
            id: "valid"
          }),
          { id: "invalid", name: "Missing required project fields" }
        ]
      }),
      "utf8"
    );

    await expect(projectService.listProjects()).resolves.toHaveLength(1);
    await expect(projectService.getProject("valid")).resolves.toMatchObject({
      fileTree: [
        { id: "bad-file", kind: "document", name: "Bad file", type: "file" },
        { children: [], id: "assets", name: "Assets", type: "folder" }
      ],
      id: "valid"
    });
    await expect(projectService.getProject("invalid")).resolves.toBeNull();
  });

  it("updates and normalizes project file trees", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const fileTree = [
      {
        children: [
          {
            id: " object-file ",
            kind: "object",
            name: " Object file ",
            objectTree: [
              {
                children: [
                  {
                    id: " shape-1 ",
                    kind: "shape",
                    name: " Shape 1 ",
                    components: {
                      appearance: {
                        backgroundColor: "#ABCDEF",
                        backgroundOpacity: -1,
                        borderColor: "red",
                        borderRadius: -1,
                        borderStyle: "dotted",
                        borderWidth: 2000,
                        opacity: 2,
                        padding: -4
                      },
                      rectTransform: {
                        rotation: 5000,
                        scaleX: 99,
                        scaleY: 99,
                        x: -12000,
                        y: Number.POSITIVE_INFINITY
                      },
                      shape: {
                        polygonPoints: [
                          { x: -1, y: 101 },
                          { x: 50.5, y: 25.25 },
                          "bad point",
                          { x: 40, y: 40 },
                          { x: Number.NaN, y: 0 }
                        ],
                        variant: "polygon"
                      }
                    },
                    visible: false
                  }
                ],
                id: " group-1 ",
                kind: "unknown",
                name: " Group 1 ",
                components: {
                  layout: {
                    alignItems: "center",
                    columns: 99,
                    gap: -4,
                    justifyContent: "spaceBetween",
                    mode: "horizontal",
                    padding: 2000
                  }
                },
                visible: true
              }
            ],
            type: "file"
          },
          {
            id: "image-file",
            imageAsset: {
              id: "asset-1",
              byteSize: 321,
              contentType: "image/png",
              createdAt: "2026-01-02T00:00:00.000Z",
              fileName: " token.png "
            },
            kind: "image",
            name: "Image file",
            objectTree: [{ id: "ignored-object", name: "Ignored", type: "group" }],
            type: "file"
          },
          {
            id: "empty-object-file",
            kind: "object",
            name: "Empty object file",
            objectTree: [],
            type: "file"
          }
        ],
        id: " folder-1 ",
        name: " Folder 1 ",
        type: "folder"
      }
    ];

    const updatedProject = await projectService.updateProjectFileTree("project-1", fileTree);

    expect(updatedProject).toMatchObject({
      fileTree: [
        {
          children: [
            {
              id: "object-file",
              kind: "object",
              name: "Object file",
              objectTree: [
                {
                  children: [
                    {
                      id: "shape-1",
                      kind: "shape",
                      name: "Shape 1",
                      components: {
                        appearance: {
                          backgroundColor: "#abcdef",
                          backgroundOpacity: 0,
                          borderColor: "#10b981",
                          borderRadius: 0,
                          borderStyle: "dotted",
                          borderWidth: 1000,
                          opacity: 1,
                          padding: 0
                        },
                        rectTransform: {
                          height: 120,
                          pivotX: 0.5,
                          pivotY: 0.5,
                          rotation: 3600,
                          scaleX: 8,
                          scaleY: 8,
                          width: 120,
                          x: -10000,
                          y: 0
                        },
                        shape: {
                          polygonPoints: [
                            { x: 0, y: 100 },
                            { x: 50.5, y: 25.25 },
                            { x: 40, y: 40 }
                          ],
                          variant: "polygon"
                        }
                      },
                      visible: false
                    }
                  ],
                  id: "group-1",
                  kind: "group",
                  name: "Group 1",
                  components: {
                    layout: {
                      alignItems: "center",
                      columns: 24,
                      gap: 0,
                      justifyContent: "spaceBetween",
                      mode: "horizontal"
                    }
                  },
                  visible: true
                }
              ],
              type: "file"
            },
            {
              id: "image-file",
              imageAsset: {
                id: "asset-1",
                byteSize: 321,
                contentType: "image/png",
                createdAt: "2026-01-02T00:00:00.000Z",
                fileName: "token.png"
              },
              kind: "image",
              name: "Image file",
              type: "file"
            },
            {
              id: "empty-object-file",
              kind: "object",
              name: "Empty object file",
              objectTree: [
                {
                  children: [],
                  components: {
                    rectTransform: {
                      height: 240,
                      pivotX: 0.5,
                      pivotY: 0.5,
                      rotation: 0,
                      scaleX: 1,
                      scaleY: 1,
                      width: 320,
                      x: 0,
                      y: 0
                    }
                  },
                  id: "empty-object-file:root",
                  kind: "group",
                  name: "Empty object file",
                  visible: true
                }
              ],
              type: "file"
            }
          ],
          id: "folder-1",
          name: "Folder 1",
          type: "folder"
        },
        {
          children: [],
          id: "assets",
          name: "Assets",
          type: "folder"
        }
      ],
      id: "project-1"
    });
    expect(updatedProject?.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
    await expect(readStoredProjects()).resolves.toEqual([updatedProject]);
  });

  it("normalizes reusable object templates, bindings, source refs, and linked values", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        id: "template-file",
        kind: "object",
        name: "Character Card",
        template: {
          variables: [
            { id: " title ", name: " Title ", type: "text", defaultValue: "Hero" },
            { id: "power", name: "", type: "number", defaultValue: Number.NaN },
            { id: "accent", name: "Accent", type: "color", defaultValue: "red" },
            { id: "title", name: "Duplicate", type: "image", defaultValue: "asset-1" }
          ]
        },
        objectTree: [
          {
            bindings: [
              { target: "text.content", variableId: " title " },
              { target: "text.content", variableId: " title " },
              { target: "missing.target", variableId: "bad" },
              { target: "text.color", variableId: "" }
            ],
            id: "label-1",
            kind: "label",
            name: "Title",
            visible: true
          }
        ],
        type: "file"
      },
      {
        id: "linked-file",
        kind: "object",
        name: "Warrior Card",
        objectTree: [{ id: "ignored", kind: "label", name: "Ignored", visible: true }],
        sourceRef: {
          sourceObjectFileNodeId: " template-file ",
          values: {
            power: 6,
            title: "Captain"
          }
        },
        type: "file"
      }
    ]);

    const templateFile = updatedProject?.fileTree.find((node) => node.id === "template-file");
    const linkedFile = updatedProject?.fileTree.find((node) => node.id === "linked-file");

    expect(templateFile).toMatchObject({
      id: "template-file",
      kind: "object",
      template: {
        variables: [
          { id: "title", name: "Title", type: "text", defaultValue: "Hero" },
          { id: "power", name: "Property", type: "number", defaultValue: 0 },
          { id: "accent", name: "Accent", type: "color", defaultValue: "#000000" }
        ]
      },
      objectTree: [
        {
          bindings: [{ target: "text.content", variableId: "title" }],
          id: "label-1",
          kind: "label"
        }
      ]
    });
    expect(linkedFile).toMatchObject({
      id: "linked-file",
      kind: "object",
      sourceRef: {
        sourceObjectFileNodeId: "template-file",
        values: {
          power: 6,
          title: "Captain"
        }
      }
    });
    expect(linkedFile).not.toHaveProperty("objectTree");
  });

  it("normalizes card components and locks preset dimensions", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        id: "object-file",
        kind: "object",
        name: "Object file",
        objectTree: [
          {
            id: "card-1",
            kind: "card",
            name: "Card 1",
            children: [
              {
                parentSide: "back",
                id: "back-label",
                kind: "label",
                name: "Back label",
                visible: true
              }
            ],
            components: {
              card: { sizePreset: "bridge" },
              doubleSide: {
                activeSide: "back",
                enabled: false,
                sideComponents: {
                  back: {
                    appearance: {
                      backgroundColor: "#ABCDEF",
                      backgroundOpacity: -1,
                      borderStyle: "dashed"
                    },
                    layout: { columns: 0, mode: "grid" },
                    text: { content: "ignored on cards" }
                  }
                }
              },
              rectTransform: {
                height: 200,
                scaleX: 2,
                scaleY: 3,
                width: 200,
                x: 12,
                y: 24
              }
            },
            visible: true
          },
          {
            id: "card-2",
            kind: "card",
            name: "Card 2",
            components: {
              card: { sizePreset: "custom" },
              rectTransform: {
                height: 123,
                scaleX: 2,
                scaleY: 3,
                width: 77
              }
            },
            visible: true
          }
        ],
        type: "file"
      }
    ]);

    expect(updatedProject?.fileTree[0]?.objectTree).toMatchObject([
      {
        id: "card-1",
        kind: "card",
        children: [
          {
            parentSide: "back",
            id: "back-label",
            kind: "label"
          }
        ],
        components: {
          card: { sizePreset: "bridge" },
          doubleSide: {
            enabled: false,
            sideComponents: {
              back: {
                appearance: {
                  backgroundColor: "#abcdef",
                  backgroundOpacity: 0,
                  borderStyle: "dashed"
                },
                layout: {
                  columns: 1,
                  mode: "grid"
                }
              }
            }
          },
          layout: {
            mode: "free"
          },
          rectTransform: {
            height: 89,
            scaleX: 1,
            scaleY: 1,
            width: 57,
            x: 12,
            y: 24
          }
        }
      },
      {
        id: "card-2",
        kind: "card",
        components: {
          card: { sizePreset: "custom" },
          doubleSide: { enabled: true },
          rectTransform: {
            height: 123,
            scaleX: 2,
            scaleY: 3,
            width: 77
          }
        }
      }
    ]);
  });

  it("normalizes deck components as a card-only container stack", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        id: "object-file",
        kind: "object",
        name: "Object file",
        objectTree: [
          {
            id: "deck-1",
            kind: "deck",
            name: "Deck 1",
            components: {
              container: {
                entries: [
                  { objectFileNodeId: " card-file-1 ", quantity: 2 },
                  { objectFileNodeId: "card-file-1", quantity: 9999 },
                  { objectFileNodeId: "card-file-2", quantity: 3 },
                  { objectFileNodeId: "", quantity: 4 }
                ]
              },
              deck: {
                sizePreset: "bridge"
              },
              rectTransform: {
                height: 200,
                scaleX: 2,
                scaleY: 3,
                width: 200
              },
              stackDisplay: {
                showCount: false,
                stackOffsetX: 99,
                stackOffsetY: -99,
                visibleItemCount: 99
              }
            },
            visible: true
          }
        ],
        type: "file"
      }
    ]);

    expect(updatedProject?.fileTree[0]?.objectTree).toMatchObject([
      {
        id: "deck-1",
        kind: "deck",
        components: {
          container: {
            entries: [
              {
                objectFileNodeId: "card-file-1",
                quantity: projectObjectContainerEntryQuantityLimits.max
              },
              {
                objectFileNodeId: "card-file-2",
                quantity: 3
              }
            ]
          },
          deck: {
            sizePreset: "bridge"
          },
          rectTransform: {
            height: 89,
            scaleX: 1,
            scaleY: 1,
            width: 57
          },
          stackDisplay: {
            showCount: false,
            stackOffsetX: 24,
            stackOffsetY: -24,
            visibleItemCount: projectObjectStackDisplayVisibleItemCountLimits.max
          }
        }
      }
    ]);
  });

  it("normalizes bag components as a free-sized token container", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        id: "object-file",
        kind: "object",
        name: "Object file",
        objectTree: [
          {
            id: "bag-1",
            kind: "bag",
            name: "Bag 1",
            components: {
              bag: {
                appearanceVariant: "box"
              },
              container: {
                entries: [
                  { objectFileNodeId: " token-file-1 ", quantity: 2 },
                  { objectFileNodeId: "token-file-1", quantity: 9999 },
                  { objectFileNodeId: "", quantity: 4 }
                ]
              },
              rectTransform: {
                height: 200,
                scaleX: 2,
                scaleY: 3,
                width: 200
              },
              stackDisplay: {
                showCount: false,
                stackOffsetX: 99,
                stackOffsetY: -99,
                visibleItemCount: 99
              }
            },
            visible: true
          }
        ],
        type: "file"
      }
    ]);

    expect(updatedProject?.fileTree[0]?.objectTree).toMatchObject([
      {
        id: "bag-1",
        kind: "bag",
        components: {
          bag: {
            appearanceVariant: "box"
          },
          container: {
            entries: [
              {
                objectFileNodeId: "token-file-1",
                quantity: projectObjectContainerEntryQuantityLimits.max
              }
            ]
          },
          rectTransform: {
            height: 200,
            scaleX: 2,
            scaleY: 3,
            width: 200
          }
        }
      }
    ]);
    expect(updatedProject?.fileTree[0]?.objectTree?.[0]?.components).not.toHaveProperty("deck");
    expect(updatedProject?.fileTree[0]?.objectTree?.[0]?.components).not.toHaveProperty(
      "stackDisplay"
    );
  });

  it("normalizes meeple components as a free-sized visual piece", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        id: "object-file",
        kind: "object",
        name: "Object file",
        objectTree: [
          {
            id: "meeple-1",
            kind: "meeple",
            name: "Meeple 1",
            components: {
              meeple: {
                visualVariant: "paw"
              },
              rectTransform: {
                height: 120,
                scaleX: 2,
                scaleY: 1.5,
                width: 90
              },
              shape: {
                variant: "triangle"
              }
            },
            visible: true
          },
          {
            id: "meeple-2",
            kind: "meeple",
            name: "Meeple 2",
            components: {
              meeple: {
                visualVariant: "cylinder"
              }
            },
            visible: true
          }
        ],
        type: "file"
      }
    ]);

    expect(updatedProject?.fileTree[0]?.objectTree).toMatchObject([
      {
        id: "meeple-1",
        kind: "meeple",
        components: {
          meeple: {
            visualVariant: "meeple"
          },
          rectTransform: {
            height: 120,
            scaleX: 2,
            scaleY: 1.5,
            width: 90
          }
        }
      },
      {
        id: "meeple-2",
        kind: "meeple",
        components: {
          meeple: {
            visualVariant: "cylinder"
          },
          rectTransform: {
            height: 80,
            width: 80
          }
        }
      }
    ]);
    expect(updatedProject?.fileTree[0]?.objectTree?.[0]?.components).not.toHaveProperty("shape");
    expect(updatedProject?.fileTree[0]?.objectTree?.[0]?.components).not.toHaveProperty(
      "doubleSide"
    );
  });

  it("normalizes die components and face customization", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        id: "object-file",
        kind: "object",
        name: "Object file",
        objectTree: [
          {
            id: "die-1",
            kind: "die",
            name: "Die 1",
            components: {
              die: {
                activeFace: 99,
                faceCount: 3.7,
                faces: [
                  {
                    imageAssetId: " asset-1 ",
                    label: "A".repeat(projectObjectDieFaceLabelMaxLength + 10),
                    mode: "image"
                  },
                  {
                    imageAssetId: "bad/asset",
                    label: "Two",
                    mode: "symbol"
                  }
                ]
              }
            },
            visible: true
          }
        ],
        type: "file"
      }
    ]);
    const normalizedDie = updatedProject?.fileTree[0]?.objectTree?.[0]?.components?.die;

    expect(normalizedDie).toMatchObject({
      activeFace: 4,
      faceCount: 4,
      faces: [
        { imageAssetId: "asset-1", mode: "image" },
        { imageAssetId: "", label: "Two", mode: "text" },
        { imageAssetId: "", label: "3", mode: "text" },
        { imageAssetId: "", label: "4", mode: "text" }
      ]
    });
    expect(normalizedDie?.faces[0]?.label).toHaveLength(projectObjectDieFaceLabelMaxLength);
  });

  it("normalizes counter components without storing runtime value", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        id: "object-file",
        kind: "object",
        name: "Object file",
        objectTree: [
          {
            id: "counter-1",
            kind: "counter",
            name: "Counter 1",
            components: {
              counter: {
                boundsMode: "clamp",
                defaultValue: 50,
                displayMode: "valueAndMax",
                maxValue: 12,
                minValue: 2,
                prefix: "$".repeat(projectObjectCounterAffixMaxLength + 10),
                step: 0,
                suffix: " VP"
              }
            },
            visible: true
          },
          {
            id: "counter-2",
            kind: "counter",
            name: "Counter 2",
            components: {
              counter: {
                boundsMode: "none",
                defaultValue: 50,
                displayMode: "bad",
                maxValue: 10,
                minValue: 20,
                step: 2
              }
            },
            visible: true
          }
        ],
        type: "file"
      }
    ]);

    const normalizedCounters = updatedProject?.fileTree[0]?.objectTree?.map(
      (node) => node.components?.counter
    );

    expect(normalizedCounters?.[0]).toMatchObject({
      boundsMode: "clamp",
      defaultValue: 12,
      displayMode: "valueAndMax",
      maxValue: 12,
      minValue: 2,
      step: 1,
      suffix: " VP"
    });
    expect(normalizedCounters?.[0]?.prefix).toHaveLength(projectObjectCounterAffixMaxLength);
    expect(normalizedCounters?.[0]).not.toHaveProperty("value");
    expect(normalizedCounters?.[1]).toMatchObject({
      boundsMode: "none",
      defaultValue: 50,
      displayMode: "value",
      maxValue: 20,
      minValue: 20,
      step: 2
    });
  });

  it("normalizes token components as a two-sided shape container", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        id: "object-file",
        kind: "object",
        name: "Object file",
        objectTree: [
          {
            children: [
              {
                parentSide: "back",
                id: "token-back-label",
                kind: "label",
                name: "Back",
                visible: true
              }
            ],
            components: {
              doubleSide: {
                activeSide: "sideways",
                sideComponents: {
                  back: {
                    shape: { variant: "triangle" }
                  },
                  front: {
                    shape: { variant: "diamond" }
                  }
                }
              },
              shape: { variant: "hexagon" }
            },
            id: "token-1",
            kind: "token",
            name: "Token 1",
            visible: true
          },
          {
            components: {},
            id: "token-2",
            kind: "token",
            name: "Token 2",
            visible: true
          }
        ],
        type: "file"
      }
    ]);

    expect(updatedProject?.fileTree[0]?.objectTree).toMatchObject([
      {
        children: [
          {
            parentSide: "back",
            id: "token-back-label",
            kind: "label"
          }
        ],
        components: {
          doubleSide: { enabled: true },
          shape: { variant: "hexagon" }
        },
        id: "token-1",
        kind: "token"
      },
      {
        components: {
          doubleSide: { enabled: true },
          shape: { variant: "ellipse" }
        },
        id: "token-2",
        kind: "token"
      }
    ]);
    expect(
      updatedProject?.fileTree[0]?.objectTree?.[0]?.components?.doubleSide?.sideComponents
    ).toBeUndefined();
  });

  it("restores the protected Assets folder as a root folder", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    const updatedProject = await projectService.updateProjectFileTree("project-1", [
      {
        children: [
          {
            children: [{ id: "asset-file", kind: "image", name: "Token", type: "file" }],
            id: "assets",
            name: "Renamed assets",
            type: "folder"
          }
        ],
        id: "folder-1",
        name: "Folder 1",
        type: "folder"
      }
    ]);

    expect(updatedProject?.fileTree).toMatchObject([
      { children: [], id: "folder-1", name: "Folder 1", type: "folder" },
      {
        children: [{ id: "asset-file", kind: "image", name: "Token", type: "file" }],
        id: "assets",
        name: "Assets",
        type: "folder"
      }
    ]);
  });

  it("stores image asset bytes and only serves assets present in the file tree", async () => {
    const project = await projectService.createProject({ name: "Assets" });
    const uploadData = await createTestPngBuffer();
    const imageAsset = await projectService.createProjectImageAsset(project.id, {
      contentType: "image/png",
      data: uploadData,
      fileName: " token.png "
    });
    const imageAssetPath = join(testDirectory, "image-assets", project.id, imageAsset!.id);

    expect(imageAsset).toMatchObject({
      contentType: "image/webp",
      fileName: "token.png"
    });
    expect(imageAsset?.byteSize).toBeLessThan(uploadData.byteLength);
    expect(await projectService.getProjectImageAsset(project.id, imageAsset!.id)).toBeNull();

    await projectService.updateProjectFileTree(project.id, [
      {
        children: [
          {
            id: "image-file",
            imageAsset: imageAsset!,
            kind: "image",
            name: "Token",
            type: "file"
          }
        ],
        id: "assets",
        name: "Assets",
        type: "folder"
      }
    ]);

    const loadedImageAsset = await projectService.getProjectImageAsset(project.id, imageAsset!.id);

    expect(loadedImageAsset?.data.byteLength).toBe(imageAsset?.byteSize);
    expect(loadedImageAsset?.imageAsset).toEqual(imageAsset);
    expect((await sharp(loadedImageAsset!.data).metadata()).format).toBe("webp");

    await projectService.updateProjectFileTree(project.id, [
      { children: [], id: "assets", name: "Assets", type: "folder" }
    ]);

    expect(await projectService.getProjectImageAsset(project.id, imageAsset!.id)).toBeNull();
    await expect(readFile(imageAssetPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects invalid image asset uploads", async () => {
    const project = await projectService.createProject({ name: "Assets" });

    await expect(
      projectService.createProjectImageAsset(project.id, {
        contentType: "image/svg+xml",
        data: Buffer.from("svg"),
        fileName: "bad.svg"
      })
    ).rejects.toThrow(new ProjectValidationError("Unsupported image content type"));
    await expect(
      projectService.createProjectImageAsset(project.id, {
        contentType: "image/gif",
        data: Buffer.from("gif"),
        fileName: "bad.gif"
      })
    ).rejects.toThrow(new ProjectValidationError("Unsupported image content type"));
    await expect(
      projectService.createProjectImageAsset(project.id, {
        contentType: "image/png",
        data: Buffer.from("not an image"),
        fileName: "bad.png"
      })
    ).rejects.toThrow(new ProjectValidationError("Invalid image asset data"));
    await expect(
      projectService.createProjectImageAsset(project.id, {
        contentType: "image/png",
        data: Buffer.alloc(maxProjectImageAssetBytes + 1),
        fileName: "huge.png"
      })
    ).rejects.toThrow(new ProjectValidationError("Image asset is too large"));
    await expect(
      projectService.createProjectImageAsset("missing", {
        contentType: "image/png",
        data: Buffer.from("image"),
        fileName: "token.png"
      })
    ).resolves.toBeNull();
  });

  it("returns null for missing projects without writing a matching project", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    await expect(projectService.updateProjectFileTree("missing-project", [])).resolves.toBeNull();
    await expect(readStoredProjects()).resolves.toHaveLength(1);
  });

  it("rejects invalid file tree updates", async () => {
    await writeStore([createStoredProject({ id: "project-1" })]);

    await expect(projectService.updateProjectFileTree("project-1", null)).rejects.toThrow(
      new ProjectValidationError("Project file tree must be an array")
    );
    await expect(
      projectService.updateProjectFileTree("project-1", [
        { id: "duplicate", name: "One", type: "folder" },
        { id: "duplicate", name: "Two", type: "folder" }
      ])
    ).rejects.toThrow(new ProjectValidationError("Project file tree node ids must be unique"));
    await expect(
      projectService.updateProjectFileTree("project-1", [
        {
          id: "object-file",
          kind: "object",
          name: "Object file",
          objectTree: [
            { id: "duplicate-object", name: "One" },
            { id: "duplicate-object", name: "Two" }
          ],
          type: "file"
        }
      ])
    ).rejects.toThrow(new ProjectValidationError("Project object tree node ids must be unique"));
  });
});

async function writeStore(projects: Project[]) {
  await writeFile(storePath, JSON.stringify({ projects }, null, 2), "utf8");
}

async function readStoredProjects() {
  const rawStore = await readFile(storePath, "utf8");
  const parsedStore = JSON.parse(rawStore) as { projects: Project[] };

  return parsedStore.projects;
}

async function createTestPngBuffer() {
  return await sharp({
    create: {
      background: { alpha: 1, b: 48, g: 32, r: 224 },
      channels: 4,
      height: 96,
      width: 96
    }
  })
    .png({ compressionLevel: 0 })
    .toBuffer();
}

function createStoredProject(overrides: Partial<Project> = {}): Project {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    description: "",
    fileTree: [],
    id: "project-1",
    name: "Project",
    notes: "",
    objectsCount: 0,
    playtestsCount: 0,
    tableSetupsCount: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}
