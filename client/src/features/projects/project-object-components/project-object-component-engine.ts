import type {
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import { createDefaultProjectObjectNode, getDefaultProjectObjectName } from "@bg-maker/shared";
import {
  getProjectObjectRectTransformComponent,
  withProjectObjectRectTransformComponent
} from "./rect-transform-component";

export class ProjectObjectComponentEngine {
  createNode(
    kind: ProjectObjectKind = "group",
    name = this.getDefaultObjectName(kind)
  ): ProjectObjectNode {
    return createDefaultProjectObjectNode(crypto.randomUUID(), kind, name);
  }

  getRectTransform(object: ProjectObjectNode): ProjectObjectRectTransform {
    return getProjectObjectRectTransformComponent(object);
  }

  withRectTransform(
    object: ProjectObjectNode,
    rectTransform: ProjectObjectRectTransform
  ): ProjectObjectNode {
    return withProjectObjectRectTransformComponent(object, rectTransform);
  }

  private getDefaultObjectName(kind: ProjectObjectKind) {
    return getDefaultProjectObjectName(kind);
  }
}
