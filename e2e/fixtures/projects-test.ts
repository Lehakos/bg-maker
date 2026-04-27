import { expect, test as base } from "@playwright/test";
import { ProjectsPage } from "../page-objects/projects-page";
import { ProjectsApi } from "../support/projects-api";

type ProjectsFixtures = {
  projectsApi: ProjectsApi;
  projectsPage: ProjectsPage;
};

export const test = base.extend<ProjectsFixtures>({
  projectsPage: async ({ page }, use) => {
    await use(new ProjectsPage(page));
  },
  projectsApi: async ({ request }, use) => {
    const projectsApi = new ProjectsApi(request);

    await use(projectsApi);
    await projectsApi.cleanup();
  }
});

export { expect };
