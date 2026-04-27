export const projectStatuses = ["draft", "testing", "ready"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export type GameProject = {
  id: string;
  name: string;
  description: string;
  players: string;
  status: ProjectStatus;
  notes: string;
  componentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GameProjectSummary = Pick<
  GameProject,
  "id" | "name" | "players" | "status" | "componentCount" | "updatedAt"
>;

export type CreateGameProjectInput = {
  name: string;
  description?: string;
  players?: string;
  status?: ProjectStatus;
  notes?: string;
};

export type UpdateGameProjectInput = Partial<CreateGameProjectInput>;
