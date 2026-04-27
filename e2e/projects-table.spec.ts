import { expect, test } from "./fixtures/projects-test";

test.describe("project table row actions", () => {
  test("shows row actions on hover", async ({ projectsApi, projectsPage }) => {
    const project = await projectsApi.create({
      name: uniqueProjectName("Hover Project"),
      players: "2-3",
      status: "testing"
    });
    const projectRow = projectsPage.projectRow(project);
    const projectActions = projectsPage.projectActions(project.id);

    await projectsPage.goto();

    await expect(projectsPage.recentProjectsHeading).toBeVisible();
    await expect(projectRow).toBeVisible();
    await expect(projectActions).toHaveCSS("opacity", "0");

    await projectsPage.hoverProject(project);

    await expect(projectActions).toHaveCSS("opacity", "1");
  });

  test("opens the edit modal and saves changes", async ({ projectsApi, projectsPage }) => {
    const project = await projectsApi.create({
      name: uniqueProjectName("Editable Project"),
      description: "Before edit",
      players: "1-2",
      status: "draft"
    });
    const updatedProjectName = uniqueProjectName("Renamed Project");

    await projectsPage.goto();
    await projectsPage.hoverProject(project);
    await projectsPage.openProjectEditor(project.name);

    await expect(projectsPage.form.dialog).toBeVisible();
    await expect(projectsPage.form.nameInput).toHaveValue(project.name);

    await projectsPage.form.fill({
      name: updatedProjectName,
      description: "After edit"
    });
    await projectsPage.form.saveChanges();

    await expect(projectsPage.form.dialog).toBeHidden();
    await expect(
      projectsPage.projectRow({
        name: updatedProjectName,
        players: project.players,
        status: project.status
      })
    ).toBeVisible();
    await expect(projectsPage.projectRow(project)).toHaveCount(0);
  });

  test("deletes a project after confirmation", async ({ projectsApi, projectsPage }) => {
    const project = await projectsApi.create({
      name: uniqueProjectName("Disposable Project"),
      players: "3-4",
      status: "ready"
    });

    await projectsPage.goto();
    await projectsPage.hoverProject(project);
    projectsPage.acceptNextDeleteConfirmation(project.name);

    await projectsPage.deleteProject(project.name);

    await expect(projectsPage.projectRow(project)).toHaveCount(0);
  });
});

function uniqueProjectName(prefix: string) {
  return `${prefix} ${Date.now()}`;
}
