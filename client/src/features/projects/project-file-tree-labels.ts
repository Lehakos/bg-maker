import type { ProjectFileKind, ProjectFileNode } from "@bg-maker/shared";

export function getProjectFileNodeTypeLabel(node: ProjectFileNode) {
  if (node.type === "folder") {
    return "Папка";
  }

  return getProjectFileKindLabel(node.kind);
}

function getProjectFileKindLabel(kind: ProjectFileKind | undefined) {
  if (kind === "tableSetup") {
    return "Table setup";
  }

  if (kind === "object") {
    return "Object";
  }

  if (kind === "image") {
    return "Image";
  }

  return "Файл";
}
