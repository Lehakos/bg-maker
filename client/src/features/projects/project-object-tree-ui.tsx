import type { ProjectFileNode, ProjectObjectKind, ProjectObjectNode } from "@bg-maker/shared";
import {
  Boxes,
  Component,
  CreditCard,
  Image,
  Rows3,
  Square,
  Type,
  type LucideProps
} from "lucide-react";

type ProjectObjectKindIconProps = LucideProps & {
  kind: ProjectObjectKind;
};

type ProjectObjectNodeIconProps = LucideProps & {
  object: ProjectObjectNode;
};

type ProjectObjectTreeRootIconProps = LucideProps & {
  node: ProjectFileNode;
};

export function ProjectObjectKindIcon({ kind, ...iconProps }: ProjectObjectKindIconProps) {
  if (kind === "card") {
    return <CreditCard {...iconProps} />;
  }

  if (kind === "label") {
    return <Type {...iconProps} />;
  }

  if (kind === "image") {
    return <Image {...iconProps} />;
  }

  if (kind === "shape") {
    return <Square {...iconProps} />;
  }

  return <Component {...iconProps} />;
}

export function ProjectObjectNodeIcon({ object, ...iconProps }: ProjectObjectNodeIconProps) {
  return <ProjectObjectKindIcon kind={object.kind} {...iconProps} />;
}

export function ProjectObjectTreeRootIcon({ node, ...iconProps }: ProjectObjectTreeRootIconProps) {
  if (node.kind === "tableSetup") {
    return <Rows3 {...iconProps} />;
  }

  return <Boxes {...iconProps} />;
}
