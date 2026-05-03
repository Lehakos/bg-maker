import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export class ProjectImageAssetFileStore {
  constructor(private readonly imageAssetDirectory: string) {}

  async writeProjectImageAsset(projectId: string, assetId: string, data: Buffer) {
    await mkdir(this.getProjectImageAssetDirectory(projectId), { recursive: true });
    await writeFile(this.getProjectImageAssetPath(projectId, assetId), data);
  }

  async readProjectImageAsset(projectId: string, assetId: string) {
    return await readFile(this.getProjectImageAssetPath(projectId, assetId));
  }

  async removeProjectImageAsset(projectId: string, assetId: string) {
    await rm(this.getProjectImageAssetPath(projectId, assetId), { force: true });
  }

  private getProjectImageAssetDirectory(projectId: string) {
    return join(this.imageAssetDirectory, projectId);
  }

  private getProjectImageAssetPath(projectId: string, assetId: string) {
    return join(this.getProjectImageAssetDirectory(projectId), assetId);
  }
}
