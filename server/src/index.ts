import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  APP_NAME,
  apiPaths,
  projectStatuses,
  type GameProject,
  type GameProjectSummary,
  type HealthResponse,
  type ProjectStatus,
  type UpdateGameProjectInput
} from "@bg-maker/shared";

type ProjectRouteParams = {
  projectId: string;
};

type ErrorResponse = {
  error: string;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

type ProjectInput = {
  name: string;
  description: string;
  players: string;
  status: ProjectStatus;
  notes: string;
};

type ProjectFields = {
  name?: string;
  description?: string;
  players?: string;
  status?: ProjectStatus;
  notes?: string;
};

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

app.get<{ Reply: HealthResponse }>(apiPaths.health, async () => ({
  appName: APP_NAME,
  status: "ok",
  timestamp: new Date().toISOString()
}));

const seedProjects: GameProject[] = [
  {
    id: "solo-dungeon",
    name: "Solo Dungeon",
    description: "Compact solo card crawl project.",
    players: "1",
    status: "draft",
    notes: "Focus on fast setup and short playtest loops.",
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
    createdAt: "2026-04-22T12:00:00.000Z",
    updatedAt: "2026-04-24T15:30:00.000Z"
  }
];

const projects = new Map<string, GameProject>(seedProjects.map((project) => [project.id, project]));

app.get<{ Reply: GameProjectSummary[] }>(apiPaths.projects, async () =>
  Array.from(projects.values())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(toProjectSummary)
);

app.post<{ Body: unknown; Reply: GameProject | ErrorResponse }>(
  apiPaths.projects,
  async (request, reply) => {
    const input = parseCreateProjectInput(request.body);

    if (!input.ok) {
      return reply.code(400).send({ error: input.error });
    }

    const timestamp = new Date().toISOString();
    const project: GameProject = {
      id: randomUUID(),
      ...input.value,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    projects.set(project.id, project);

    return reply.code(201).send(project);
  }
);

app.get<{ Params: ProjectRouteParams; Reply: GameProject | ErrorResponse }>(
  apiPaths.project(":projectId"),
  async (request, reply) => {
    const project = projects.get(request.params.projectId);

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    return project;
  }
);

app.patch<{
  Body: unknown;
  Params: ProjectRouteParams;
  Reply: GameProject | ErrorResponse;
}>(apiPaths.project(":projectId"), async (request, reply) => {
  const currentProject = projects.get(request.params.projectId);

  if (!currentProject) {
    return reply.code(404).send({ error: "Project not found" });
  }

  const input = parseUpdateProjectInput(request.body);

  if (!input.ok) {
    return reply.code(400).send({ error: input.error });
  }

  const updatedProject: GameProject = {
    ...currentProject,
    ...input.value,
    updatedAt: new Date().toISOString()
  };

  projects.set(updatedProject.id, updatedProject);

  return updatedProject;
});

app.delete<{ Params: ProjectRouteParams; Reply: ErrorResponse | undefined }>(
  apiPaths.project(":projectId"),
  async (request, reply) => {
    if (!projects.has(request.params.projectId)) {
      return reply.code(404).send({ error: "Project not found" });
    }

    projects.delete(request.params.projectId);

    return reply.code(204).send(undefined);
  }
);

function toProjectSummary(project: GameProject): GameProjectSummary {
  return {
    id: project.id,
    name: project.name,
    players: project.players,
    status: project.status,
    updatedAt: project.updatedAt
  };
}

function parseCreateProjectInput(value: unknown): Result<ProjectInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const fields = parseProjectFields(value);

  if (!fields.ok) {
    return fields;
  }

  if (!fields.value.name) {
    return { ok: false, error: "Project name must not be empty" };
  }

  return {
    ok: true,
    value: {
      name: fields.value.name,
      description: fields.value.description ?? "",
      players: fields.value.players ?? "1-4",
      status: fields.value.status ?? "draft",
      notes: fields.value.notes ?? ""
    }
  };
}

function parseUpdateProjectInput(value: unknown): Result<UpdateGameProjectInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const fields = parseProjectFields(value);

  if (!fields.ok) {
    return fields;
  }

  const input: UpdateGameProjectInput = {};

  if (fields.value.name !== undefined) {
    input.name = fields.value.name;
  }

  if (fields.value.description !== undefined) {
    input.description = fields.value.description;
  }

  if (fields.value.players !== undefined) {
    input.players = fields.value.players;
  }

  if (fields.value.notes !== undefined) {
    input.notes = fields.value.notes;
  }

  if (fields.value.status !== undefined) {
    input.status = fields.value.status;
  }

  return { ok: true, value: input };
}

function parseProjectFields(value: Record<string, unknown>): Result<ProjectFields> {
  const name = readOptionalString(value.name);
  const description = readOptionalString(value.description);
  const players = readOptionalString(value.players);
  const notes = readOptionalString(value.notes);

  if (value.name !== undefined && !name) {
    return { ok: false, error: "Project name must not be empty" };
  }

  if (value.status !== undefined && !isProjectStatus(value.status)) {
    return { ok: false, error: "Project status is invalid" };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      players,
      notes,
      status: isProjectStatus(value.status) ? value.status : undefined
    }
  };
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus);
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
