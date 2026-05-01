import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { App } from "./app/App";
import { ProjectPickerPage } from "./features/projects/ProjectPickerPage";
import { ProjectWorkspacePage } from "./features/projects/ProjectWorkspacePage";
import { NotFoundPage } from "./routes/NotFoundPage";

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: NotFoundPage
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ProjectPickerPage
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "projects/$projectId",
  component: ProjectWorkspacePage
});

const routeTree = rootRoute.addChildren([indexRoute, projectRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
