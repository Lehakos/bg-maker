import type {
  ProjectObjectCardSide,
  ProjectObjectDoubleSide,
  ProjectObjectNode,
  ProjectObjectSideComponents
} from "@bg-maker/shared";
import { getDefaultProjectObjectDoubleSide } from "@bg-maker/shared";
import { getProjectObjectCardComponent } from "./card-component";

export function getProjectObjectDoubleSideComponent(
  object: ProjectObjectNode
): ProjectObjectDoubleSide {
  return {
    ...getDefaultProjectObjectDoubleSide(object.kind),
    ...object.components?.doubleSide
  };
}

export function getProjectObjectActiveSide(object: ProjectObjectNode): ProjectObjectCardSide {
  return object.kind === "card" ? getProjectObjectCardComponent(object).activeSide : "front";
}

export function getProjectObjectSideComponent<
  TComponentKey extends keyof ProjectObjectSideComponents
>(
  object: ProjectObjectNode,
  componentKey: TComponentKey
): ProjectObjectSideComponents[TComponentKey] | undefined {
  const doubleSide = getProjectObjectDoubleSideComponent(object);

  if (!doubleSide.enabled) {
    return undefined;
  }

  return doubleSide.sideComponents?.[getProjectObjectActiveSide(object)]?.[componentKey];
}

export function withProjectObjectDoubleSideComponent(
  object: ProjectObjectNode,
  doubleSide: ProjectObjectDoubleSide
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      doubleSide
    }
  };
}

export function withProjectObjectSideComponent<
  TComponentKey extends keyof ProjectObjectSideComponents
>(
  object: ProjectObjectNode,
  componentKey: TComponentKey,
  component: NonNullable<ProjectObjectSideComponents[TComponentKey]>
): ProjectObjectNode {
  const doubleSide = getProjectObjectDoubleSideComponent(object);
  const activeSide = getProjectObjectActiveSide(object);

  return withProjectObjectDoubleSideComponent(object, {
    ...doubleSide,
    sideComponents: {
      ...doubleSide.sideComponents,
      [activeSide]: {
        ...doubleSide.sideComponents?.[activeSide],
        [componentKey]: component
      }
    }
  });
}
