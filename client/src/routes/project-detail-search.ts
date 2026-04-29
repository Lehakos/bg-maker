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
  templateType: TemplateTypeFilter;
};

export type ProjectDetailSearchInput = Partial<ProjectDetailSearch> & SearchSchemaInput;

export const defaultProjectDetailSearch = {
  panel: "components",
  componentType: "all",
  collectionType: "all",
  templateType: "all",
  page: 1,
  pageSize: 10
} satisfies ProjectDetailSearch;

export function validateProjectDetailSearch(search: ProjectDetailSearchInput): ProjectDetailSearch {
  return {
    panel: pickValue(catalogPanels, search.panel, defaultProjectDetailSearch.panel),
    componentType: pickValue(
      ["all", ...componentTypes],
      search.componentType,
      defaultProjectDetailSearch.componentType
    ),
    collectionType: pickValue(
      ["all", ...collectionTypes],
      search.collectionType,
      defaultProjectDetailSearch.collectionType
    ),
    templateType: pickValue(
      ["all", ...templateCatalogTypes],
      search.templateType,
      defaultProjectDetailSearch.templateType
    ),
    page: parsePositiveInteger(search.page, defaultProjectDetailSearch.page),
    pageSize: pickNumberValue(
      tablePageSizeOptions,
      search.pageSize,
      defaultProjectDetailSearch.pageSize
    )
  };
}

export function serializeProjectDetailSearch(
  search: Partial<ProjectDetailSearch>
): ProjectDetailSearchInput {
  const normalizedSearch = validateProjectDetailSearch(search as ProjectDetailSearchInput);
  const serializedSearch = {} as ProjectDetailSearchInput;

  if (normalizedSearch.panel !== defaultProjectDetailSearch.panel) {
    serializedSearch.panel = normalizedSearch.panel;
  }

  if (normalizedSearch.page !== defaultProjectDetailSearch.page) {
    serializedSearch.page = normalizedSearch.page;
  }

  if (normalizedSearch.pageSize !== defaultProjectDetailSearch.pageSize) {
    serializedSearch.pageSize = normalizedSearch.pageSize;
  }

  switch (normalizedSearch.panel) {
    case "collections":
      if (normalizedSearch.collectionType !== defaultProjectDetailSearch.collectionType) {
        serializedSearch.collectionType = normalizedSearch.collectionType;
      }
      break;
    case "templates":
      if (normalizedSearch.templateType !== defaultProjectDetailSearch.templateType) {
        serializedSearch.templateType = normalizedSearch.templateType;
      }
      break;
    case "components":
    default:
      if (normalizedSearch.componentType !== defaultProjectDetailSearch.componentType) {
        serializedSearch.componentType = normalizedSearch.componentType;
      }
      break;
  }

  return serializedSearch;
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
