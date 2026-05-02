import type {
  ProjectObjectSide,
  ProjectObjectDoubleSide,
  ProjectObjectNode,
  ProjectObjectSideComponents
} from "@bg-maker/shared";
import { getDefaultProjectObjectDoubleSide, projectObjectSides } from "@bg-maker/shared";

const objectSides = new Set(projectObjectSides);

export function getProjectObjectDoubleSideComponent(
  object: ProjectObjectNode
): ProjectObjectDoubleSide {
  return normalizeProjectObjectDoubleSide({
    ...getDefaultProjectObjectDoubleSide(object.kind),
    ...object.components?.doubleSide
  });
}

export function getProjectObjectActiveSide(object: ProjectObjectNode): ProjectObjectSide {
  return getProjectObjectDoubleSideComponent(object).activeSide;
}

export function normalizeProjectObjectDoubleSide(
  doubleSide: ProjectObjectDoubleSide
): ProjectObjectDoubleSide {
  return {
    ...doubleSide,
    activeSide: objectSides.has(doubleSide.activeSide) ? doubleSide.activeSide : "front"
  };
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
  const currentDoubleSide = getProjectObjectDoubleSideComponent(object);
  const nextDoubleSide = {
    ...currentDoubleSide,
    ...doubleSide,
    sideComponents: doubleSide.sideComponents ?? currentDoubleSide.sideComponents
  };

  return {
    ...object,
    components: {
      ...object.components,
      doubleSide: normalizeProjectObjectDoubleSide(nextDoubleSide)
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
