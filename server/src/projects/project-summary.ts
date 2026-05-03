import type { Project, ProjectSummary } from "@bg-maker/shared";

export function toProjectSummary(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    tableSetupsCount: project.tableSetupsCount,
    objectsCount: project.objectsCount,
    playtestsCount: project.playtestsCount
  };
}
