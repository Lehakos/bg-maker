import type { ProjectFileNode, ProjectObjectKind, ProjectObjectNode } from "@bg-maker/shared";
import {
  Boxes,
  Circle,
  Component,
  Dices,
  Hash,
  Image,
  Rows3,
  Scan,
  Square,
  Type,
  type LucideProps
} from "lucide-react";
import { BagIcon, CardIcon, DeckIcon, MeepleIcon } from "./project-object-icons";

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
    return <CardIcon {...iconProps} />;
  }

  if (kind === "token") {
    return <Circle {...iconProps} />;
  }

  if (kind === "counter") {
    return <Hash {...iconProps} />;
  }

  if (kind === "deck") {
    return <DeckIcon {...iconProps} />;
  }

  if (kind === "bag") {
    return <BagIcon {...iconProps} />;
  }

  if (kind === "meeple") {
    return <MeepleIcon {...iconProps} />;
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

  if (kind === "zone") {
    return <Scan {...iconProps} />;
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
