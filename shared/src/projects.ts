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

export type Project = ProjectSummary & {
  notes: string;
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

export type ApiErrorResponse = {
  message: string;
};
