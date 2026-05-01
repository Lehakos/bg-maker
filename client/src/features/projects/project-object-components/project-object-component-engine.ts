import type {
  ProjectObjectAppearance,
  ProjectObjectImage,
  ProjectObjectKind,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectText
} from "@bg-maker/shared";
import { createDefaultProjectObjectNode, getDefaultProjectObjectName } from "@bg-maker/shared";
import {
  getProjectObjectAppearanceComponent,
  withProjectObjectAppearanceComponent
} from "./appearance-component";
import { getProjectObjectImageComponent, withProjectObjectImageComponent } from "./image-component";
import {
  getProjectObjectRectTransformComponent,
  withProjectObjectRectTransformComponent
} from "./rect-transform-component";
import { getProjectObjectShapeComponent, withProjectObjectShapeComponent } from "./shape-component";
import { getProjectObjectTextComponent, withProjectObjectTextComponent } from "./text-component";

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

  getAppearance(object: ProjectObjectNode): ProjectObjectAppearance {
    return getProjectObjectAppearanceComponent(object);
  }

  getText(object: ProjectObjectNode): ProjectObjectText {
    return getProjectObjectTextComponent(object);
  }

  getImage(object: ProjectObjectNode): ProjectObjectImage {
    return getProjectObjectImageComponent(object);
  }

  getShape(object: ProjectObjectNode): ProjectObjectShape {
    return getProjectObjectShapeComponent(object);
  }

  withRectTransform(
    object: ProjectObjectNode,
    rectTransform: ProjectObjectRectTransform
  ): ProjectObjectNode {
    return withProjectObjectRectTransformComponent(object, rectTransform);
  }

  withAppearance(
    object: ProjectObjectNode,
    appearance: ProjectObjectAppearance
  ): ProjectObjectNode {
    return withProjectObjectAppearanceComponent(object, appearance);
  }

  withText(object: ProjectObjectNode, text: ProjectObjectText): ProjectObjectNode {
    return withProjectObjectTextComponent(object, text);
  }

  withImage(object: ProjectObjectNode, image: ProjectObjectImage): ProjectObjectNode {
    return withProjectObjectImageComponent(object, image);
  }

  withShape(object: ProjectObjectNode, shape: ProjectObjectShape): ProjectObjectNode {
    return withProjectObjectShapeComponent(object, shape);
  }

  private getDefaultObjectName(kind: ProjectObjectKind) {
    return getDefaultProjectObjectName(kind);
  }
}
