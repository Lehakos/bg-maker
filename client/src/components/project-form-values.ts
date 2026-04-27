import type { GameProject } from "@bg-maker/shared";
import type { ProjectFormValues } from "./project-form-modal";

export function getProjectFormValues(
  project: Pick<GameProject, "name" | "description" | "players" | "status" | "notes">
): ProjectFormValues {
  return {
    name: project.name,
    description: project.description,
    players: project.players,
    status: project.status,
    notes: project.notes
  };
}
