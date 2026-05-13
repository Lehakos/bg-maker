import type { ProjectImageAsset } from "./assets.js";
import type { ProjectGameConfig } from "./game.js";
import type {
  ProjectObjectNode,
  ProjectObjectRules,
  ProjectObjectSourceRef,
  ProjectObjectTemplate
} from "./objects.js";
import type { ProjectSummary } from "./summary.js";
import type { ProjectTableSetup } from "./table-setups.js";

export type ProjectFileNodeType = "folder" | "file";

export type ProjectFileKind = "tableSetup" | "object" | "image" | "document";

export type ProjectFileNode = {
  id: string;
  name: string;
  type: ProjectFileNodeType;
  kind?: ProjectFileKind;
  children?: ProjectFileNode[];
  imageAsset?: ProjectImageAsset;
  objectTree?: ProjectObjectNode[];
  rules?: ProjectObjectRules;
  sourceRef?: ProjectObjectSourceRef;
  tableSetup?: ProjectTableSetup;
  template?: ProjectObjectTemplate;
};

export type Project = ProjectSummary & {
  gameConfig: ProjectGameConfig;
  notes: string;
  fileTree: ProjectFileNode[];
};
