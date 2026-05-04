import type {
  ProjectFileNode,
  ProjectImageAsset,
  ProjectObjectKind,
  ProjectObjectNode
} from "@bg-maker/shared";
import { resolveProjectObjectFileObjectTree } from "@bg-maker/shared";
import { getProjectImageAssetUrl } from "../project-assets/project-image-assets";

export type ProjectObjectLibraryItem = {
  fileNode: ProjectFileNode & { kind: "object"; type: "file" };
  fileNodeId: string;
  linked: boolean;
  name: string;
  objectTree: ProjectObjectNode[];
  parentPath: string;
  path: string;
  rootKind?: ProjectObjectKind;
  searchText: string;
};

export type ProjectAssetBrowserItem = {
  asset: ProjectImageAsset;
  fileNode: ProjectFileNode & { kind: "image"; type: "file" };
  fileNodeId: string;
  name: string;
  parentPath: string;
  path: string;
  searchText: string;
  url: string;
};

export type ProjectObjectLibraryFilter = {
  rootKind?: ProjectObjectKind | "all";
  search?: string;
};

export type ProjectAssetBrowserFilter = {
  search?: string;
};

export function collectProjectObjectLibraryItems(
  fileTree: readonly ProjectFileNode[]
): ProjectObjectLibraryItem[] {
  const items: ProjectObjectLibraryItem[] = [];

  collectObjectLibraryItemsInNodes(fileTree, fileTree, [], items);

  return items;
}

export function collectProjectAssetBrowserItems(
  projectId: string,
  fileTree: readonly ProjectFileNode[]
): ProjectAssetBrowserItem[] {
  const items: ProjectAssetBrowserItem[] = [];

  collectAssetBrowserItemsInNodes(projectId, fileTree, [], items);

  return items;
}

export function filterProjectObjectLibraryItems(
  items: readonly ProjectObjectLibraryItem[],
  filter: ProjectObjectLibraryFilter
) {
  const searchTokens = getSearchTokens(filter.search ?? "");
  const rootKind = filter.rootKind ?? "all";

  return items.filter((item) => {
    if (rootKind !== "all" && item.rootKind !== rootKind) {
      return false;
    }

    return searchTokens.every((token) => item.searchText.includes(token));
  });
}

export function filterProjectAssetBrowserItems(
  items: readonly ProjectAssetBrowserItem[],
  filter: ProjectAssetBrowserFilter
) {
  const searchTokens = getSearchTokens(filter.search ?? "");

  return searchTokens.length
    ? items.filter((item) => searchTokens.every((token) => item.searchText.includes(token)))
    : [...items];
}

function collectObjectLibraryItemsInNodes(
  rootFileTree: readonly ProjectFileNode[],
  nodes: readonly ProjectFileNode[],
  path: readonly string[],
  items: ProjectObjectLibraryItem[]
) {
  for (const node of nodes) {
    if (node.type === "folder") {
      collectObjectLibraryItemsInNodes(
        rootFileTree,
        node.children ?? [],
        [...path, node.name],
        items
      );
      continue;
    }

    if (node.kind !== "object") {
      continue;
    }

    const objectTree = resolveProjectObjectFileObjectTree(rootFileTree, node);
    const rootKind = objectTree[0]?.kind;
    const fullPath = [...path, node.name].join(" / ");

    items.push({
      fileNode: node as ProjectObjectLibraryItem["fileNode"],
      fileNodeId: node.id,
      linked: Boolean(node.sourceRef),
      name: node.name,
      objectTree,
      parentPath: path.join(" / "),
      path: fullPath,
      rootKind,
      searchText: normalizeSearch([node.name, fullPath, rootKind ?? ""].join(" "))
    });
  }
}

function collectAssetBrowserItemsInNodes(
  projectId: string,
  nodes: readonly ProjectFileNode[],
  path: readonly string[],
  items: ProjectAssetBrowserItem[]
) {
  for (const node of nodes) {
    if (node.type === "folder") {
      collectAssetBrowserItemsInNodes(projectId, node.children ?? [], [...path, node.name], items);
      continue;
    }

    if (node.kind !== "image" || !node.imageAsset) {
      continue;
    }

    const fullPath = [...path, node.name].join(" / ");

    items.push({
      asset: node.imageAsset,
      fileNode: node as ProjectAssetBrowserItem["fileNode"],
      fileNodeId: node.id,
      name: node.name,
      parentPath: path.join(" / "),
      path: fullPath,
      searchText: normalizeSearch([node.name, node.imageAsset.fileName, fullPath].join(" ")),
      url: getProjectImageAssetUrl(projectId, node.imageAsset.id)
    });
  }
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getSearchTokens(value: string) {
  return normalizeSearch(value).split(/\s+/).filter(Boolean);
}
