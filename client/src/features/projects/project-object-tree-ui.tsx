import type { ProjectFileNode, ProjectObjectKind, ProjectObjectNode } from "@bg-maker/shared";
import {
  Boxes,
  Circle,
  Component,
  Dices,
  Hash,
  Image,
  Layers3,
  RectangleHorizontal,
  Rows3,
  SquareDashed,
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
    return <RectangleHorizontal {...iconProps} />;
  }

  if (kind === "deck") {
    return <Layers3 {...iconProps} />;
  }

  if (kind === "token") {
    return <Circle {...iconProps} />;
  }

  if (kind === "zone") {
    return <SquareDashed {...iconProps} />;
  }

  if (kind === "counter") {
    return <Hash {...iconProps} />;
  }

  if (kind === "die") {
    return <Dices {...iconProps} />;
  }

  if (kind === "label") {
    return <Type {...iconProps} />;
  }

  if (kind === "image") {
    return <Image {...iconProps} />;
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
