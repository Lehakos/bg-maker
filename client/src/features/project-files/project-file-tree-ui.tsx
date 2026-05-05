import type { ProjectFileNode } from "@bg-maker/shared";
import {
  Boxes,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  Link2,
  Rows3,
  type LucideProps
} from "lucide-react";

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

  if (node.kind === "object") {
    if (node.sourceRef) {
      return <Link2 {...iconProps} />;
    }

    return <Boxes {...iconProps} />;
  }

  return <FileText {...iconProps} />;
}
