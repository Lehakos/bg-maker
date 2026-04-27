import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { DashboardRoute } from "./routes/dashboard";
import { RootLayout } from "./routes/root";

const rootRoute = createRootRoute({
  component: RootLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardRoute
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
