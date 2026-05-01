import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project } from "@bg-maker/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectService, ProjectValidationError } from "./project-service.js";

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
        { children: [], id: "images", name: "Images", type: "folder" }
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
      fileTree: [{ id: "bad-file", kind: "document", name: "Bad file", type: "file" }],
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
                    id: " card-1 ",
                    kind: "card",
                    name: " Card 1 ",
                    components: {
                      rectTransform: {
                        rotation: 5000,
                        scaleX: 99,
                        scaleY: 99,
                        x: -12000,
                        y: Number.POSITIVE_INFINITY
                      }
                    },
                    visible: false
                  }
                ],
                id: " group-1 ",
                kind: "unknown",
                name: " Group 1 ",
                visible: true
              }
            ],
            type: "file"
          },
          {
            id: "image-file",
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
                      id: "card-1",
                      kind: "card",
                      name: "Card 1",
                      components: {
                        rectTransform: {
                          height: 350,
                          pivotX: 0.5,
                          pivotY: 0.5,
                          rotation: 3600,
                          scaleX: 8,
                          scaleY: 8,
                          width: 250,
                          x: -10000,
                          y: 0
                        }
                      },
                      visible: false
                    }
                  ],
                  id: "group-1",
                  kind: "group",
                  name: "Group 1",
                  visible: true
                }
              ],
              type: "file"
            },
            {
              id: "image-file",
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
        }
      ],
      id: "project-1"
    });
    expect(updatedProject?.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
    await expect(readStoredProjects()).resolves.toEqual([updatedProject]);
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
