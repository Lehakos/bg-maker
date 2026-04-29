import type {
  CardTemplate,
  ComponentCollection,
  GameComponent,
  GameProject,
  PieceTemplate,
  TableSetup,
  TileTemplate
} from "@bg-maker/shared";
import { seedDatasets } from "./seed-data.js";

export const seedProjects: GameProject[] = seedDatasets.map((dataset) => dataset.project);

export const projects = new Map<string, GameProject>(
  seedProjects.map((project) => [project.id, project])
);

export const projectComponents = new Map<string, GameComponent[]>(
  seedDatasets.map((dataset) => [dataset.project.id, dataset.components])
);

export const projectCardTemplates = new Map<string, CardTemplate[]>(
  seedDatasets.map((dataset) => [dataset.project.id, dataset.cardTemplates])
);

export const projectPieceTemplates = new Map<string, PieceTemplate[]>(
  seedDatasets.map((dataset) => [dataset.project.id, dataset.pieceTemplates])
);

export const projectTileTemplates = new Map<string, TileTemplate[]>(
  seedDatasets.map((dataset) => [dataset.project.id, dataset.tileTemplates])
);

export const projectCollections = new Map<string, ComponentCollection[]>(
  seedDatasets.map((dataset) => [dataset.project.id, dataset.collections])
);

export const projectTableSetups = new Map<string, TableSetup>(
  seedDatasets.flatMap((dataset) =>
    dataset.tableSetup ? [[dataset.project.id, dataset.tableSetup]] : []
  )
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

export function getProjectTableSetup(projectId: string) {
  return projectTableSetups.get(projectId);
}

export function setProjectTableSetup(projectId: string, setup: TableSetup) {
  projectTableSetups.set(projectId, setup);
}
