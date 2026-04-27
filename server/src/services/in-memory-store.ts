import type { GameComponent, GameProject } from "@bg-maker/shared";

export const seedProjects: GameProject[] = [
  {
    id: "solo-dungeon",
    name: "Solo Dungeon",
    description: "Compact solo card crawl project.",
    players: "1",
    status: "draft",
    notes: "Focus on fast setup and short playtest loops.",
    componentCount: 0,
    createdAt: "2026-04-20T09:00:00.000Z",
    updatedAt: "2026-04-20T09:00:00.000Z"
  },
  {
    id: "market-race",
    name: "Market Race",
    description: "Light economy race with a shared market row.",
    players: "2-4",
    status: "testing",
    notes: "Needs stronger catch-up pressure after round three.",
    componentCount: 0,
    createdAt: "2026-04-22T12:00:00.000Z",
    updatedAt: "2026-04-24T15:30:00.000Z"
  }
];

export const projects = new Map<string, GameProject>(
  seedProjects.map((project) => [project.id, project])
);

export const projectComponents = new Map<string, GameComponent[]>(
  seedProjects.map((project) => [project.id, []])
);

export function getProjectComponents(projectId: string) {
  return projectComponents.get(projectId) ?? [];
}

export function setProjectComponents(projectId: string, components: GameComponent[]) {
  projectComponents.set(projectId, components);
}
