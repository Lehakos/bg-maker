import axios from "axios";
import { apiPaths, type GamePrototypeSummary, type HealthResponse } from "@bg-maker/shared";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? ""
});

export async function getHealth() {
  const response = await http.get<HealthResponse>(apiPaths.health);
  return response.data;
}

export async function getPrototypes() {
  const response = await http.get<GamePrototypeSummary[]>(apiPaths.prototypes);
  return response.data;
}
