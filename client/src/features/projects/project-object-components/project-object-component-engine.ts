import type {
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectRectTransform
} from "@bg-maker/shared";
import { createDefaultProjectObjectComponents } from "@bg-maker/shared";
import {
  getProjectObjectRectTransformComponent,
  withProjectObjectRectTransformComponent
} from "./rect-transform-component";

export class ProjectObjectComponentEngine {
  createNode(
    kind: ProjectObjectKind = "group",
    name = this.getDefaultObjectName(kind)
  ): ProjectObjectNode {
    return {
      id: crypto.randomUUID(),
      name: name.trim() || this.getDefaultObjectName(kind),
      kind,
      visible: true,
      children: [],
      components: createDefaultProjectObjectComponents(kind)
    };
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
    if (kind === "card") {
      return "New card";
    }

    if (kind === "deck") {
      return "New deck";
    }

    if (kind === "token") {
      return "New token";
    }

    if (kind === "zone") {
      return "New zone";
    }

    if (kind === "counter") {
      return "New counter";
    }

    if (kind === "die") {
      return "New die";
    }

    if (kind === "label") {
      return "New label";
    }

    if (kind === "image") {
      return "New image";
    }

    return "New group";
  }
}
