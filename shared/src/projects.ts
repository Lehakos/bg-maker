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

export type ProjectObjectKind =
  | "group"
  | "card"
  | "deck"
  | "token"
  | "zone"
  | "counter"
  | "die"
  | "label"
  | "image";

export type ProjectObjectTransform = {
  rotation: number;
  scale: number;
  x: number;
  y: number;
};

export type ProjectObjectNode = {
  id: string;
  name: string;
  kind: ProjectObjectKind;
  visible: boolean;
  children?: ProjectObjectNode[];
  transform?: ProjectObjectTransform;
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
