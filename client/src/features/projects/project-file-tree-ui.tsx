import type { ProjectFileNode } from "@bg-maker/shared";
import { FileImage, FileText, Folder, FolderOpen, Rows3, type LucideProps } from "lucide-react";

type ProjectFileNodeIconProps = LucideProps & {
  node: ProjectFileNode;
};

export function ProjectFileNodeIcon({ node, ...iconProps }: ProjectFileNodeIconProps) {
  if (node.type === "folder") {
    return node.children?.length ? <FolderOpen {...iconProps} /> : <Folder {...iconProps} />;
  }

  if (node.kind === "image") {
    return <FileImage {...iconProps} />;
  }

  if (node.kind === "tableSetup") {
    return <Rows3 {...iconProps} />;
  }

  return <FileText {...iconProps} />;
}
