import { expect, type APIRequestContext } from "@playwright/test";

type ProjectStatus = "draft" | "testing" | "ready";

type CreateProjectInput = {
  name: string;
  description?: string;
  players?: string;
  status?: ProjectStatus;
  notes?: string;
};

export type TestProject = {
  id: string;
  name: string;
  description: string;
  players: string;
  status: ProjectStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export class ProjectsApi {
  private readonly createdProjectIds = new Set<string>();

  constructor(private readonly request: APIRequestContext) {}

  async create(input: CreateProjectInput) {
    const response = await this.request.post("/api/projects", { data: input });

    expect(response.status()).toBe(201);

    const project = (await response.json()) as TestProject;
    this.createdProjectIds.add(project.id);

    return project;
  }

  async delete(projectId: string) {
    const response = await this.request.delete(`/api/projects/${projectId}`);

    expect([204, 404]).toContain(response.status());
    this.createdProjectIds.delete(projectId);
  }

  async cleanup() {
    const projectIds = Array.from(this.createdProjectIds);

    await Promise.all(projectIds.map((projectId) => this.delete(projectId)));
  }
}
