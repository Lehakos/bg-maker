import type {
  ProjectObjectSide,
  ProjectObjectDoubleSide,
  ProjectObjectNode,
  ProjectObjectSideComponents
} from "@bg-maker/shared";
import { getDefaultProjectObjectDoubleSide, projectObjectSides } from "@bg-maker/shared";

const objectSides = new Set(projectObjectSides);

type ProjectObjectDoubleSideWithActiveSide = ProjectObjectDoubleSide & {
  activeSide?: ProjectObjectSide;
};

export function getProjectObjectDoubleSideComponent(
  object: ProjectObjectNode
): ProjectObjectDoubleSide {
  return normalizeProjectObjectDoubleSide({
    ...getDefaultProjectObjectDoubleSide(object.kind),
    ...object.components?.doubleSide
  });
}

export function getProjectObjectActiveSide(object: ProjectObjectNode): ProjectObjectSide {
  return normalizeProjectObjectActiveSide(
    (object.components?.doubleSide as ProjectObjectDoubleSideWithActiveSide | undefined)
      ?.activeSide
  );
}

export function normalizeProjectObjectDoubleSide(
  doubleSide: ProjectObjectDoubleSide
): ProjectObjectDoubleSide {
  const activeSide = (doubleSide as ProjectObjectDoubleSideWithActiveSide).activeSide;
  const normalizedDoubleSide: ProjectObjectDoubleSideWithActiveSide = { ...doubleSide };

  if (activeSide) {
    normalizedDoubleSide.activeSide = normalizeProjectObjectActiveSide(activeSide);
  }

  return normalizedDoubleSide;
}

function normalizeProjectObjectActiveSide(side: ProjectObjectSide | undefined): ProjectObjectSide {
  return objectSides.has(side as ProjectObjectSide) ? (side as ProjectObjectSide) : "front";
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
