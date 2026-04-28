export const projectStatuses = ["draft", "testing", "ready"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const projectParameterTypes = ["color", "text", "number"] as const;

export type ProjectParameterType = (typeof projectParameterTypes)[number];

export type ProjectParameter = {
  key: string;
  label: string;
  type: ProjectParameterType;
  value: string;
};

export type ProjectColorReference = {
  key: string;
  source: "project";
};

export type ProjectColorValue = string | ProjectColorReference;

export const defaultProjectParameters: ProjectParameter[] = [
  { key: "player_1_color", label: "Player 1 color", type: "color", value: "#dc2626" },
  { key: "player_2_color", label: "Player 2 color", type: "color", value: "#2563eb" },
  { key: "player_3_color", label: "Player 3 color", type: "color", value: "#16a34a" },
  { key: "player_4_color", label: "Player 4 color", type: "color", value: "#f59e0b" }
];

export type GameProject = {
  id: string;
  name: string;
  description: string;
  players: string;
  parameters: ProjectParameter[];
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
  parameters?: ProjectParameter[];
  status?: ProjectStatus;
  notes?: string;
};

export type UpdateGameProjectInput = Partial<CreateGameProjectInput>;

export function createDefaultProjectParameters(): ProjectParameter[] {
  return defaultProjectParameters.map((parameter) => ({ ...parameter }));
}

export function getProjectColorParameters(parameters: ProjectParameter[] = []) {
  return parameters.filter((parameter) => parameter.type === "color");
}

export function isProjectColorReference(value: unknown): value is ProjectColorReference {
  return (
    typeof value === "object" &&
    value !== null &&
    "source" in value &&
    "key" in value &&
    (value as ProjectColorReference).source === "project" &&
    typeof (value as ProjectColorReference).key === "string"
  );
}

export function createProjectColorReference(key: string): ProjectColorReference {
  return { source: "project", key };
}

export function resolveProjectColorValue(
  value: ProjectColorValue,
  parameters: ProjectParameter[] = [],
  fallback = "#1f2937"
) {
  if (typeof value === "string") {
    return value;
  }

  const parameter = parameters.find(
    (item) => item.type === "color" && item.key === value.key
  );

  return parameter?.value ?? fallback;
}
