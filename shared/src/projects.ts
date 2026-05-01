export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  tableSetupsCount: number;
  objectsCount: number;
  playtestsCount: number;
};

export type ProjectFileNodeType = "folder" | "file";

export type ProjectFileKind = "tableSetup" | "object" | "image" | "document";

export const projectObjectKinds = ["group", "label", "image", "shape"] as const;

export type ProjectObjectKind = (typeof projectObjectKinds)[number];

export type ProjectObjectRectTransform = {
  height: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  x: number;
  y: number;
};

export type ProjectObjectComponents = {
  rectTransform?: ProjectObjectRectTransform;
};

export type ProjectObjectNode = {
  id: string;
  name: string;
  kind: ProjectObjectKind;
  visible: boolean;
  components?: ProjectObjectComponents;
  children?: ProjectObjectNode[];
};

export type ProjectFileNode = {
  id: string;
  name: string;
  type: ProjectFileNodeType;
  kind?: ProjectFileKind;
  children?: ProjectFileNode[];
  objectTree?: ProjectObjectNode[];
};

export type Project = ProjectSummary & {
  notes: string;
  fileTree: ProjectFileNode[];
};

export type ListProjectsResponse = {
  projects: ProjectSummary[];
};

export type GetProjectResponse = {
  project: Project;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
};

export type CreateProjectResponse = {
  project: Project;
};

export type UpdateProjectFileTreeRequest = {
  fileTree: ProjectFileNode[];
};

export type UpdateProjectFileTreeResponse = {
  project: Project;
};

export type ApiErrorResponse = {
  message: string;
};

const defaultProjectObjectSizes: Record<ProjectObjectKind, { height: number; width: number }> = {
  group: { height: 240, width: 320 },
  image: { height: 180, width: 240 },
  label: { height: 32, width: 160 },
  shape: { height: 120, width: 120 }
};

const defaultProjectObjectNames: Record<ProjectObjectKind, string> = {
  group: "New group",
  image: "New image",
  label: "New label",
  shape: "New shape"
};

export function getDefaultProjectObjectName(kind: ProjectObjectKind = "group") {
  return defaultProjectObjectNames[kind];
}

export function getDefaultProjectObjectRectTransform(
  kind: ProjectObjectKind = "group"
): ProjectObjectRectTransform {
  const size = defaultProjectObjectSizes[kind];

  return {
    height: size.height,
    pivotX: 0.5,
    pivotY: 0.5,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width: size.width,
    x: 0,
    y: 0
  };
}

export function createDefaultProjectObjectComponents(
  kind: ProjectObjectKind = "group"
): ProjectObjectComponents {
  return {
    rectTransform: getDefaultProjectObjectRectTransform(kind)
  };
}

export function createDefaultProjectObjectNode(
  id: string,
  kind: ProjectObjectKind = "group",
  name = getDefaultProjectObjectName(kind)
): ProjectObjectNode {
  return {
    id,
    name: name.trim() || getDefaultProjectObjectName(kind),
    kind,
    visible: true,
    children: [],
    components: createDefaultProjectObjectComponents(kind)
  };
}
