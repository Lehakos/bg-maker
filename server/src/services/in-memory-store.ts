import type {
  CardTemplate,
  ComponentCollection,
  GameComponent,
  GameProject,
  PieceTemplate,
  TileTemplate
} from "@bg-maker/shared";
import { createDefaultProjectParameters } from "@bg-maker/shared";

export const seedProjects: GameProject[] = [
  {
    id: "solo-dungeon",
    name: "Solo Dungeon",
    description: "Compact solo card crawl project.",
    players: "1",
    parameters: createDefaultProjectParameters(),
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
    parameters: createDefaultProjectParameters(),
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

export const projectCardTemplates = new Map<string, CardTemplate[]>(
  seedProjects.map((project) => [project.id, []])
);

export const projectPieceTemplates = new Map<string, PieceTemplate[]>(
  seedProjects.map((project) => [project.id, []])
);

export const projectTileTemplates = new Map<string, TileTemplate[]>(
  seedProjects.map((project) => [project.id, []])
);

export const projectCollections = new Map<string, ComponentCollection[]>(
  seedProjects.map((project) => [project.id, []])
);

export function getProjectComponents(projectId: string) {
  return projectComponents.get(projectId) ?? [];
}

export function setProjectComponents(projectId: string, components: GameComponent[]) {
  projectComponents.set(projectId, components);
}

export function getProjectCardTemplates(projectId: string) {
  return projectCardTemplates.get(projectId) ?? [];
}

export function setProjectCardTemplates(projectId: string, templates: CardTemplate[]) {
  projectCardTemplates.set(projectId, templates);
}

export function getProjectPieceTemplates(projectId: string) {
  return projectPieceTemplates.get(projectId) ?? [];
}

export function setProjectPieceTemplates(projectId: string, templates: PieceTemplate[]) {
  projectPieceTemplates.set(projectId, templates);
}

export function getProjectTileTemplates(projectId: string) {
  return projectTileTemplates.get(projectId) ?? [];
}

export function setProjectTileTemplates(projectId: string, templates: TileTemplate[]) {
  projectTileTemplates.set(projectId, templates);
}

export function getProjectCollections(projectId: string) {
  return projectCollections.get(projectId) ?? [];
}

export function setProjectCollections(projectId: string, collections: ComponentCollection[]) {
  projectCollections.set(projectId, collections);
}
