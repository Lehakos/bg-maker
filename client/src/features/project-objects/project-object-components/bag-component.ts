import type {
  ProjectObjectBag,
  ProjectObjectBagAppearanceVariant,
  ProjectObjectNode
} from "@bg-maker/shared";
import {
  getDefaultProjectObjectBag,
  projectObjectBagAppearanceVariants
} from "@bg-maker/shared";

const projectObjectBagAppearanceVariantSet = new Set<ProjectObjectBagAppearanceVariant>(
  projectObjectBagAppearanceVariants
);

export function getProjectObjectBagComponent(object: ProjectObjectNode): ProjectObjectBag {
  return normalizeProjectObjectBagComponent({
    ...getDefaultProjectObjectBag(),
    ...object.components?.bag
  });
}

export function withProjectObjectBagComponent(
  object: ProjectObjectNode,
  bag: ProjectObjectBag
): ProjectObjectNode {
  return {
    ...object,
    components: {
      ...object.components,
      bag: normalizeProjectObjectBagComponent(bag)
    }
  };
}

export function normalizeProjectObjectBagComponent(
  bag: Partial<ProjectObjectBag>
): ProjectObjectBag {
  const defaultBag = getDefaultProjectObjectBag();
  const appearanceVariant = projectObjectBagAppearanceVariantSet.has(
    bag.appearanceVariant as ProjectObjectBagAppearanceVariant
  )
    ? (bag.appearanceVariant as ProjectObjectBagAppearanceVariant)
    : defaultBag.appearanceVariant;

  return {
    appearanceVariant
  };
}
