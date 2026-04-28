import type { GameProject } from "@bg-maker/shared";
import type { ProjectFormValues } from "./project-form-modal";

export function getProjectFormValues(
  project: Pick<GameProject, "name" | "description" | "players" | "parameters" | "status" | "notes">
): ProjectFormValues {
  return {
    name: project.name,
    description: project.description,
    players: project.players,
    parameters: project.parameters.map((parameter) => ({ ...parameter })),
    status: project.status,
    notes: project.notes
  };
}
