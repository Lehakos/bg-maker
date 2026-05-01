import { apiPaths, type ProjectFileNode, type ProjectImageAsset } from "@bg-maker/shared";
import { appendProjectFileNode, createProjectFileNode } from "./project-file-tree";

export type ProjectImageAssetOption = {
  asset: ProjectImageAsset;
  fileNodeId: string;
  name: string;
  url: string;
};

const temporaryImageAssetUrls = new Map<string, string>();

export function appendProjectImageAssetFileNode(
  fileTree: ProjectFileNode[],
  imageAsset: ProjectImageAsset
) {
  const fileNode = createProjectFileNode("image", imageAsset.fileName, { imageAsset });
  const parentId = findProjectImagesFolderId(fileTree);

  return {
    fileNode,
    fileTree: appendProjectFileNode(fileTree, parentId, fileNode)
  };
}

export function getProjectImageAssetOptions(
  projectId: string,
  fileTree: ProjectFileNode[]
): ProjectImageAssetOption[] {
  const imageAssets: ProjectImageAssetOption[] = [];

  collectProjectImageAssetOptions(projectId, fileTree, imageAssets);

  return imageAssets;
}

export function getProjectImageAssetOptionById(
  imageAssets: ProjectImageAssetOption[],
  assetId: string
) {
  return imageAssets.find((imageAsset) => imageAsset.asset.id === assetId);
}

export function getProjectImageAssetUrl(projectId: string, assetId: string) {
  return temporaryImageAssetUrls.get(assetId) ?? apiPaths.projectImageAsset(projectId, assetId);
}

export function rememberTemporaryProjectImageAssetUrl(assetId: string, file: File) {
  const existingUrl = temporaryImageAssetUrls.get(assetId);

  if (existingUrl) {
    URL.revokeObjectURL(existingUrl);
  }

  temporaryImageAssetUrls.set(assetId, URL.createObjectURL(file));
}

function collectProjectImageAssetOptions(
  projectId: string,
  fileTree: ProjectFileNode[],
  imageAssets: ProjectImageAssetOption[]
) {
  fileTree.forEach((node) => {
    if (node.type === "folder") {
      collectProjectImageAssetOptions(projectId, node.children ?? [], imageAssets);
      return;
    }

    if (node.kind !== "image" || !node.imageAsset) {
      return;
    }

    imageAssets.push({
      asset: node.imageAsset,
      fileNodeId: node.id,
      name: node.name,
      url: getProjectImageAssetUrl(projectId, node.imageAsset.id)
    });
  });
}

function findProjectImagesFolderId(fileTree: ProjectFileNode[]) {
  const explicitFolder = findProjectFolderId(fileTree, (node) => node.id === "images");

  if (explicitFolder) {
    return explicitFolder;
  }

  return findProjectFolderId(fileTree, (node) => node.name.trim().toLowerCase() === "images");
}

function findProjectFolderId(
  fileTree: ProjectFileNode[],
  matches: (node: ProjectFileNode) => boolean
): string | null {
  for (const node of fileTree) {
    if (node.type !== "folder") {
      continue;
    }

    if (matches(node)) {
      return node.id;
    }

    const childFolderId = findProjectFolderId(node.children ?? [], matches);

    if (childFolderId) {
      return childFolderId;
    }
  }

  return null;
}
