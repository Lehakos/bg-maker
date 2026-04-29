import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { DashboardRoute } from "./routes/dashboard";
import { ProjectDetailRoute } from "./routes/project-detail";
import { RootLayout } from "./routes/root";

const rootRoute = createRootRoute({
  component: RootLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardRoute
});

const projectOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId",
  component: ProjectDetailRoute
});

const projectComponentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId/components",
  component: ProjectDetailRoute
});

const projectLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId/layout",
  component: ProjectDetailRoute
});

const projectSessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId/sessions",
  component: ProjectDetailRoute
});

const projectNotesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId/notes",
  component: ProjectDetailRoute
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectOverviewRoute,
  projectComponentsRoute,
  projectLayoutRoute,
  projectSessionsRoute,
  projectNotesRoute
]);

export const router = createRouter({
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
