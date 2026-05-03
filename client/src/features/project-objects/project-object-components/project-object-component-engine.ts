import type {
  ProjectObjectAppearance,
  ProjectObjectBag,
  ProjectObjectCard,
  ProjectObjectContainer,
  ProjectObjectCounter,
  ProjectObjectDeck,
  ProjectObjectDie,
  ProjectObjectDoubleSide,
  ProjectObjectImage,
  ProjectObjectKind,
  ProjectObjectLayout,
  ProjectObjectNode,
  ProjectObjectRectTransform,
  ProjectObjectShape,
  ProjectObjectStackDisplay,
  ProjectObjectText,
  ProjectObjectZone
} from "@bg-maker/shared";
import { createDefaultProjectObjectNode, getDefaultProjectObjectName } from "@bg-maker/shared";
import {
  getProjectObjectAppearanceComponent,
  withProjectObjectAppearanceComponent
} from "./appearance-component";
import { getProjectObjectBagComponent, withProjectObjectBagComponent } from "./bag-component";
import { getProjectObjectCardComponent, withProjectObjectCardComponent } from "./card-component";
import {
  getProjectObjectCounterComponent,
  withProjectObjectCounterComponent
} from "./counter-component";
import {
  getProjectObjectContainerComponent,
  withProjectObjectContainerComponent
} from "./container-component";
import { getProjectObjectDeckComponent, withProjectObjectDeckComponent } from "./deck-component";
import { getProjectObjectDieComponent, withProjectObjectDieComponent } from "./die-component";
import {
  getProjectObjectDoubleSideComponent,
  withProjectObjectDoubleSideComponent
} from "./double-side-component";
import { getProjectObjectImageComponent, withProjectObjectImageComponent } from "./image-component";
import {
  getProjectObjectLayoutComponent,
  withProjectObjectLayoutComponent
} from "./layout-component";
import {
  getProjectObjectRectTransformComponent,
  withProjectObjectRectTransformComponent
} from "./rect-transform-component";
import { getProjectObjectShapeComponent, withProjectObjectShapeComponent } from "./shape-component";
import {
  getProjectObjectStackDisplayComponent,
  withProjectObjectStackDisplayComponent
} from "./stack-display-component";
import { getProjectObjectTextComponent, withProjectObjectTextComponent } from "./text-component";
import { getProjectObjectZoneComponent, withProjectObjectZoneComponent } from "./zone-component";

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

  getBag(object: ProjectObjectNode): ProjectObjectBag {
    return getProjectObjectBagComponent(object);
  }

  getCard(object: ProjectObjectNode): ProjectObjectCard {
    return getProjectObjectCardComponent(object);
  }

  getCounter(object: ProjectObjectNode): ProjectObjectCounter {
    return getProjectObjectCounterComponent(object);
  }

  getContainer(object: ProjectObjectNode): ProjectObjectContainer {
    return getProjectObjectContainerComponent(object);
  }

  getDeck(object: ProjectObjectNode): ProjectObjectDeck {
    return getProjectObjectDeckComponent(object);
  }

  getDie(object: ProjectObjectNode): ProjectObjectDie {
    return getProjectObjectDieComponent(object);
  }

  getDoubleSide(object: ProjectObjectNode): ProjectObjectDoubleSide {
    return getProjectObjectDoubleSideComponent(object);
  }

  getText(object: ProjectObjectNode): ProjectObjectText {
    return getProjectObjectTextComponent(object);
  }

  getImage(object: ProjectObjectNode): ProjectObjectImage {
    return getProjectObjectImageComponent(object);
  }

  getLayout(object: ProjectObjectNode): ProjectObjectLayout {
    return getProjectObjectLayoutComponent(object);
  }

  getShape(object: ProjectObjectNode): ProjectObjectShape {
    return getProjectObjectShapeComponent(object);
  }

  getStackDisplay(object: ProjectObjectNode): ProjectObjectStackDisplay {
    return getProjectObjectStackDisplayComponent(object);
  }

  getZone(object: ProjectObjectNode): ProjectObjectZone {
    return getProjectObjectZoneComponent(object);
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

  withBag(object: ProjectObjectNode, bag: ProjectObjectBag): ProjectObjectNode {
    return withProjectObjectBagComponent(object, bag);
  }

  withCard(object: ProjectObjectNode, card: ProjectObjectCard): ProjectObjectNode {
    return withProjectObjectCardComponent(object, card);
  }

  withCounter(object: ProjectObjectNode, counter: ProjectObjectCounter): ProjectObjectNode {
    return withProjectObjectCounterComponent(object, counter);
  }

  withContainer(
    object: ProjectObjectNode,
    container: ProjectObjectContainer
  ): ProjectObjectNode {
    return withProjectObjectContainerComponent(object, container);
  }

  withDeck(object: ProjectObjectNode, deck: ProjectObjectDeck): ProjectObjectNode {
    return withProjectObjectDeckComponent(object, deck);
  }

  withDie(object: ProjectObjectNode, die: ProjectObjectDie): ProjectObjectNode {
    return withProjectObjectDieComponent(object, die);
  }

  withDoubleSide(
    object: ProjectObjectNode,
    doubleSide: ProjectObjectDoubleSide
  ): ProjectObjectNode {
    return withProjectObjectDoubleSideComponent(object, doubleSide);
  }

  withText(object: ProjectObjectNode, text: ProjectObjectText): ProjectObjectNode {
    return withProjectObjectTextComponent(object, text);
  }

  withImage(object: ProjectObjectNode, image: ProjectObjectImage): ProjectObjectNode {
    return withProjectObjectImageComponent(object, image);
  }

  withLayout(object: ProjectObjectNode, layout: ProjectObjectLayout): ProjectObjectNode {
    return withProjectObjectLayoutComponent(object, layout);
  }

  withShape(object: ProjectObjectNode, shape: ProjectObjectShape): ProjectObjectNode {
    return withProjectObjectShapeComponent(object, shape);
  }

  withStackDisplay(
    object: ProjectObjectNode,
    stackDisplay: ProjectObjectStackDisplay
  ): ProjectObjectNode {
    return withProjectObjectStackDisplayComponent(object, stackDisplay);
  }

  withZone(object: ProjectObjectNode, zone: ProjectObjectZone): ProjectObjectNode {
    return withProjectObjectZoneComponent(object, zone);
  }

  private getDefaultObjectName(kind: ProjectObjectKind) {
    return getDefaultProjectObjectName(kind);
  }
}
