import axios from "axios";
import {
  apiPaths,
  type CardTemplate,
  type ComponentCollection,
  type CreateCardTemplateInput,
  type CreateComponentCollectionInput,
  type CreateGameComponentInput,
  type CreateGameProjectInput,
  type CreatePieceTemplateInput,
  type GameComponent,
  type GameProject,
  type GameProjectSummary,
  type HealthResponse,
  type PieceTemplate,
  type UpdateCardTemplateInput,
  type UpdateComponentCollectionInput,
  type UpdateGameComponentInput,
  type UpdateGameProjectInput,
  type UpdatePieceTemplateInput
} from "@bg-maker/shared";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? ""
});

export async function getHealth() {
  const response = await http.get<HealthResponse>(apiPaths.health);
  return response.data;
}

export async function getProjects() {
  const response = await http.get<GameProjectSummary[]>(apiPaths.projects);
  return response.data;
}

export async function createProject(input: CreateGameProjectInput) {
  const response = await http.post<GameProject>(apiPaths.projects, input);
  return response.data;
}

export async function getProject(projectId: string) {
  const response = await http.get<GameProject>(apiPaths.project(projectId));
  return response.data;
}

export async function updateProject(projectId: string, input: UpdateGameProjectInput) {
  const response = await http.patch<GameProject>(apiPaths.project(projectId), input);
  return response.data;
}

export async function deleteProject(projectId: string) {
  await http.delete(apiPaths.project(projectId));
}

export async function getComponents(projectId: string) {
  const response = await http.get<GameComponent[]>(apiPaths.components(projectId));
  return response.data;
}

export async function getCardTemplates(projectId: string) {
  const response = await http.get<CardTemplate[]>(apiPaths.cardTemplates(projectId));
  return response.data;
}

export async function getPieceTemplates(projectId: string) {
  const response = await http.get<PieceTemplate[]>(apiPaths.pieceTemplates(projectId));
  return response.data;
}

export async function getCollections(projectId: string) {
  const response = await http.get<ComponentCollection[]>(apiPaths.collections(projectId));
  return response.data;
}

export async function createCardTemplate(projectId: string, input: CreateCardTemplateInput) {
  const response = await http.post<CardTemplate>(apiPaths.cardTemplates(projectId), input);
  return response.data;
}

export async function updateCardTemplate(
  projectId: string,
  templateId: string,
  input: UpdateCardTemplateInput
) {
  const response = await http.patch<CardTemplate>(
    apiPaths.cardTemplate(projectId, templateId),
    input
  );
  return response.data;
}

export async function deleteCardTemplate(projectId: string, templateId: string) {
  await http.delete(apiPaths.cardTemplate(projectId, templateId));
}

export async function createPieceTemplate(projectId: string, input: CreatePieceTemplateInput) {
  const response = await http.post<PieceTemplate>(apiPaths.pieceTemplates(projectId), input);
  return response.data;
}

export async function updatePieceTemplate(
  projectId: string,
  templateId: string,
  input: UpdatePieceTemplateInput
) {
  const response = await http.patch<PieceTemplate>(
    apiPaths.pieceTemplate(projectId, templateId),
    input
  );
  return response.data;
}

export async function deletePieceTemplate(projectId: string, templateId: string) {
  await http.delete(apiPaths.pieceTemplate(projectId, templateId));
}

export async function createCollection(projectId: string, input: CreateComponentCollectionInput) {
  const response = await http.post<ComponentCollection>(apiPaths.collections(projectId), input);
  return response.data;
}

export async function updateCollection(
  projectId: string,
  collectionId: string,
  input: UpdateComponentCollectionInput
) {
  const response = await http.patch<ComponentCollection>(
    apiPaths.collection(projectId, collectionId),
    input
  );
  return response.data;
}

export async function deleteCollection(projectId: string, collectionId: string) {
  await http.delete(apiPaths.collection(projectId, collectionId));
}

export async function createComponent(projectId: string, input: CreateGameComponentInput) {
  const response = await http.post<GameComponent>(apiPaths.components(projectId), input);
  return response.data;
}

export async function updateComponent(
  projectId: string,
  componentId: string,
  input: UpdateGameComponentInput
) {
  const response = await http.patch<GameComponent>(
    apiPaths.component(projectId, componentId),
    input
  );
  return response.data;
}

export async function deleteComponent(projectId: string, componentId: string) {
  await http.delete(apiPaths.component(projectId, componentId));
}

export function getApiErrorMessage(error: unknown) {
  if (
    axios.isAxiosError<{ error?: string }>(error) &&
    typeof error.response?.data?.error === "string"
  ) {
    return error.response.data.error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}
