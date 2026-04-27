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

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId",
  component: ProjectDetailRoute
});

const routeTree = rootRoute.addChildren([indexRoute, projectRoute]);

export const router = createRouter({
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
