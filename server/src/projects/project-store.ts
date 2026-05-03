import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Project } from "@bg-maker/shared";
import { normalizeStoredProject } from "./project-file-tree-normalizer.js";
import { isNodeError } from "./project-normalization-utils.js";

export type ProjectStoreData = {
  projects: Project[];
};

export class ProjectStore {
  constructor(private readonly storePath: string) {}

  async read(): Promise<ProjectStoreData> {
    try {
      const rawStore = await readFile(this.storePath, "utf8");
      const parsedStore = JSON.parse(rawStore) as Partial<ProjectStoreData>;

      return {
        projects: Array.isArray(parsedStore.projects)
          ? parsedStore.projects.map(normalizeStoredProject).filter((project) => project !== null)
          : []
      };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { projects: [] };
      }

      throw error;
    }
  }

  async write(store: ProjectStoreData): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });

    const temporaryStorePath = `${this.storePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
    await writeFile(temporaryStorePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(temporaryStorePath, this.storePath);
  }
}
