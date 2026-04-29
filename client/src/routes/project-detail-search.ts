import {
  collectionTypes,
  componentTypes,
  type ComponentCollectionType,
  type ComponentType
} from "@bg-maker/shared";
import type { SearchSchemaInput } from "@tanstack/react-router";

export const projectDetailTabs = ["overview", "components", "layout", "sessions", "notes"] as const;

export type ProjectDetailTab = (typeof projectDetailTabs)[number];

export const catalogPanels = ["components", "collections", "templates"] as const;

export type CatalogPanel = (typeof catalogPanels)[number];

export const templateCatalogTypes = ["card", "tile", "piece"] as const;

export type TemplateCatalogType = (typeof templateCatalogTypes)[number];

export type ComponentTypeFilter = ComponentType | "all";

export type CollectionTypeFilter = ComponentCollectionType | "all";

export type TemplateTypeFilter = TemplateCatalogType | "all";

export const tablePageSizeOptions = [10, 25, 50] as const;

export type TablePageSize = (typeof tablePageSizeOptions)[number];

export type ProjectDetailSearch = {
  collectionType: CollectionTypeFilter;
  componentType: ComponentTypeFilter;
  page: number;
  pageSize: TablePageSize;
  panel: CatalogPanel;
  tab: ProjectDetailTab;
  templateType: TemplateTypeFilter;
};

export type ProjectDetailSearchInput = Partial<ProjectDetailSearch> & SearchSchemaInput;

export function validateProjectDetailSearch(search: ProjectDetailSearchInput): ProjectDetailSearch {
  return {
    tab: pickValue(projectDetailTabs, search.tab, "overview"),
    panel: pickValue(catalogPanels, search.panel, "components"),
    componentType: pickValue(["all", ...componentTypes], search.componentType, "all"),
    collectionType: pickValue(["all", ...collectionTypes], search.collectionType, "all"),
    templateType: pickValue(["all", ...templateCatalogTypes], search.templateType, "all"),
    page: parsePositiveInteger(search.page, 1),
    pageSize: pickNumberValue(tablePageSizeOptions, search.pageSize, 10)
  };
}

function pickValue<const T extends string>(
  allowedValues: readonly T[],
  value: unknown,
  fallback: T
) {
  return typeof value === "string" && allowedValues.includes(value as T) ? (value as T) : fallback;
}

function pickNumberValue<const T extends number>(
  allowedValues: readonly T[],
  value: unknown,
  fallback: T
) {
  const parsedValue = parsePositiveInteger(value, fallback);
  return allowedValues.includes(parsedValue as T) ? (parsedValue as T) : fallback;
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.floor(parsedValue);
}
