export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  tableSetupsCount: number;
  objectsCount: number;
  playtestsCount: number;
};

export type ProjectFileNodeType = "folder" | "file";

export type ProjectFileKind = "tableSetup" | "object" | "image" | "document";

export const projectObjectKinds = ["group", "label", "image", "shape"] as const;

export type ProjectObjectKind = (typeof projectObjectKinds)[number];

export const projectImageAssetContentTypes = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export type ProjectImageAssetContentType = (typeof projectImageAssetContentTypes)[number];

export type ProjectImageAsset = {
  id: string;
  fileName: string;
  contentType: ProjectImageAssetContentType;
  byteSize: number;
  createdAt: string;
};

export type ProjectObjectBorderStyle = "none" | "solid" | "dashed" | "dotted";

export type ProjectObjectAppearance = {
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderRadius: number;
  borderStyle: ProjectObjectBorderStyle;
  borderWidth: number;
  opacity: number;
  padding: number;
};

export type ProjectObjectTextAlign = "center" | "left" | "right";

export type ProjectObjectTextVerticalAlign = "bottom" | "middle" | "top";

export type ProjectObjectText = {
  color: string;
  content: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  textAlign: ProjectObjectTextAlign;
  verticalAlign: ProjectObjectTextVerticalAlign;
};

export type ProjectObjectImageFit = "contain" | "cover" | "fill" | "scaleDown";

export type ProjectObjectImage = {
  assetId: string;
  fit: ProjectObjectImageFit;
  positionX: number;
  positionY: number;
};

export type ProjectObjectShapeVariant = "diamond" | "ellipse" | "rectangle" | "triangle";

export type ProjectObjectShape = {
  variant: ProjectObjectShapeVariant;
};

export type ProjectObjectRectTransform = {
  height: number;
  pivotX: number;
  pivotY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  x: number;
  y: number;
};

export type ProjectObjectComponents = {
  appearance?: ProjectObjectAppearance;
  image?: ProjectObjectImage;
  rectTransform?: ProjectObjectRectTransform;
  shape?: ProjectObjectShape;
  text?: ProjectObjectText;
};

export type ProjectObjectNode = {
  id: string;
  name: string;
  kind: ProjectObjectKind;
  visible: boolean;
  components?: ProjectObjectComponents;
  children?: ProjectObjectNode[];
};

export type ProjectFileNode = {
  id: string;
  name: string;
  type: ProjectFileNodeType;
  kind?: ProjectFileKind;
  children?: ProjectFileNode[];
  imageAsset?: ProjectImageAsset;
  objectTree?: ProjectObjectNode[];
};

export type Project = ProjectSummary & {
  notes: string;
  fileTree: ProjectFileNode[];
};

export type ListProjectsResponse = {
  projects: ProjectSummary[];
};

export type GetProjectResponse = {
  project: Project;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
};

export type CreateProjectResponse = {
  project: Project;
};

export type UpdateProjectFileTreeRequest = {
  fileTree: ProjectFileNode[];
};

export type UpdateProjectFileTreeResponse = {
  project: Project;
};

export type UploadProjectImageAssetResponse = {
  imageAsset: ProjectImageAsset;
};

export type ApiErrorResponse = {
  message: string;
};

const defaultProjectObjectSizes: Record<ProjectObjectKind, { height: number; width: number }> = {
  group: { height: 240, width: 320 },
  image: { height: 180, width: 240 },
  label: { height: 32, width: 160 },
  shape: { height: 120, width: 120 }
};

const defaultProjectObjectNames: Record<ProjectObjectKind, string> = {
  group: "New group",
  image: "New image",
  label: "New label",
  shape: "New shape"
};

const defaultProjectObjectAppearances: Record<ProjectObjectKind, ProjectObjectAppearance> = {
  group: {
    backgroundColor: "#f0fdfa",
    backgroundOpacity: 1,
    borderColor: "#14b8a6",
    borderRadius: 6,
    borderStyle: "dashed",
    borderWidth: 2,
    opacity: 1,
    padding: 0
  },
  image: {
    backgroundColor: "#f8fafc",
    backgroundOpacity: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    borderStyle: "solid",
    borderWidth: 1,
    opacity: 1,
    padding: 0
  },
  label: {
    backgroundColor: "#ffffff",
    backgroundOpacity: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    borderStyle: "none",
    borderWidth: 0,
    opacity: 1,
    padding: 6
  },
  shape: {
    backgroundColor: "#d1fae5",
    backgroundOpacity: 1,
    borderColor: "#10b981",
    borderRadius: 6,
    borderStyle: "solid",
    borderWidth: 1,
    opacity: 1,
    padding: 8
  }
};

export function getDefaultProjectObjectName(kind: ProjectObjectKind = "group") {
  return defaultProjectObjectNames[kind];
}

export function getDefaultProjectObjectRectTransform(
  kind: ProjectObjectKind = "group"
): ProjectObjectRectTransform {
  const size = defaultProjectObjectSizes[kind];

  return {
    height: size.height,
    pivotX: 0.5,
    pivotY: 0.5,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width: size.width,
    x: 0,
    y: 0
  };
}

export function getDefaultProjectObjectAppearance(
  kind: ProjectObjectKind = "group"
): ProjectObjectAppearance {
  return {
    ...defaultProjectObjectAppearances[kind]
  };
}

export function getDefaultProjectObjectText(
  kind: ProjectObjectKind = "label",
  content = getDefaultProjectObjectName(kind)
): ProjectObjectText {
  return {
    color: "#0f172a",
    content: kind === "label" ? content : "",
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.2,
    textAlign: "center",
    verticalAlign: "middle"
  };
}

export function getDefaultProjectObjectImage(): ProjectObjectImage {
  return {
    assetId: "",
    fit: "contain",
    positionX: 50,
    positionY: 50
  };
}

export function getDefaultProjectObjectShape(): ProjectObjectShape {
  return {
    variant: "rectangle"
  };
}

export function createDefaultProjectObjectComponents(
  kind: ProjectObjectKind = "group",
  name = getDefaultProjectObjectName(kind)
): ProjectObjectComponents {
  const components: ProjectObjectComponents = {
    appearance: getDefaultProjectObjectAppearance(kind),
    rectTransform: getDefaultProjectObjectRectTransform(kind)
  };

  if (kind === "label") {
    components.text = getDefaultProjectObjectText(kind, name);
  }

  if (kind === "image") {
    components.image = getDefaultProjectObjectImage();
  }

  if (kind === "shape") {
    components.shape = getDefaultProjectObjectShape();
  }

  return components;
}

export function createDefaultProjectObjectNode(
  id: string,
  kind: ProjectObjectKind = "group",
  name = getDefaultProjectObjectName(kind)
): ProjectObjectNode {
  return {
    id,
    name: name.trim() || getDefaultProjectObjectName(kind),
    kind,
    visible: true,
    children: [],
    components: createDefaultProjectObjectComponents(kind, name)
  };
}
