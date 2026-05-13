import {
  doesProjectObjectClipChildren,
  hasProjectObjectLayout,
  projectObjectKinds,
  type ProjectFileNode,
  type ProjectObjectKind,
  type ProjectObjectNode,
  type ProjectObjectRectTransform
} from "@bg-maker/shared";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BoxSelect, Link2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import { PanelShell } from "../../components/PanelShell";
import { PanelToolbar } from "../../components/PanelToolbar";
import { PanelEmptyState } from "../../components/PanelSurfaces";
import { SearchInput } from "../../components/SearchInput";
import { SelectableSurface } from "../../components/SelectableSurface";
import { getProjectImageAssetOptions } from "../project-assets/project-image-assets";
import { getProjectObjectLayoutRectTransformOverrides } from "../project-objects/project-object-layout";
import { ProjectObjectSurface } from "../project-objects/ProjectObjectSurface";
import {
  getProjectObjectNodeAppearance,
  getProjectObjectNodeLayout,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeVisibleChildren
} from "../project-objects/project-object-tree";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "../project-objects/project-object-tree-labels";
import { ProjectObjectKindIcon } from "../project-objects/project-object-tree-ui";
import { getEffectiveProjectObjectRectTransform } from "../project-objects/project-object-zone";
import { cx } from "../project-workspace/project-workspace-css";
import {
  projectObjectFileDragMimeType,
  serializeProjectObjectFileDragPayload
} from "./project-drag-payloads";
import {
  collectProjectObjectLibraryItems,
  filterProjectObjectLibraryItems,
  type ProjectObjectLibraryItem
} from "./project-library";

type ObjectLibraryPanelProps = {
  className?: string;
  fileTree: ProjectFileNode[];
  projectId: string;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
};

export function ObjectLibraryPanel({
  className,
  fileTree,
  projectId,
  selectedNodeId,
  onSelectNode
}: ObjectLibraryPanelProps) {
  const [search, setSearch] = useState("");
  const [rootKind, setRootKind] = useState<ProjectObjectKind | "all">("all");
  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const items = useMemo(() => collectProjectObjectLibraryItems(fileTree), [fileTree]);
  const visibleItems = useMemo(
    () => filterProjectObjectLibraryItems(items, { rootKind, search }),
    [items, rootKind, search]
  );
  // TanStack Virtual intentionally returns imperative helpers that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const objectVirtualizer = useVirtualizer({
    count: visibleItems.length,
    estimateSize: () => 104,
    getScrollElement: () => scrollParentRef.current,
    overscan: 8
  });
  const imageAssets = useMemo(
    () => getProjectImageAssetOptions(projectId, fileTree),
    [fileTree, projectId]
  );
  const imageAssetById = useMemo(
    () => new Map(imageAssets.map((imageAsset) => [imageAsset.asset.id, imageAsset])),
    [imageAssets]
  );

  return (
    <PanelShell className={className}>
      <PanelToolbar>
        <SearchInput
          aria-label="Search object library"
          placeholder="Search objects"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <label className="block text-xs font-medium text-slate-500">
          <span className="sr-only">Object type</span>
          <select
            aria-label="Object type"
            className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            value={rootKind}
            onChange={(event) =>
              setRootKind(event.currentTarget.value as ProjectObjectKind | "all")
            }
          >
            <option value="all">All types</option>
            {projectObjectKinds.map((kind) => (
              <option key={kind} value={kind}>
                {getProjectObjectKindLabel(kind)}
              </option>
            ))}
          </select>
        </label>
      </PanelToolbar>

      <div ref={scrollParentRef} className="min-h-0 flex-1 overflow-auto p-2">
        {visibleItems.length ? (
          <div className="relative" style={{ height: `${objectVirtualizer.getTotalSize()}px` }}>
            {objectVirtualizer.getVirtualItems().map((virtualItem) => {
              const item = visibleItems[virtualItem.index];

              if (!item) {
                return null;
              }

              return (
                <div
                  key={item.fileNodeId}
                  ref={objectVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-2"
                  data-index={virtualItem.index}
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <ObjectLibraryCard
                    fileTree={fileTree}
                    imageAssetById={imageAssetById}
                    item={item}
                    selected={selectedNodeId === item.fileNodeId}
                    onSelectNode={onSelectNode}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <PanelEmptyState fullHeight>No objects</PanelEmptyState>
        )}
      </div>
    </PanelShell>
  );
}

type ObjectLibraryCardProps = {
  fileTree: ProjectFileNode[];
  imageAssetById: Map<string, ReturnType<typeof getProjectImageAssetOptions>[number]>;
  item: ProjectObjectLibraryItem;
  selected: boolean;
  onSelectNode: (nodeId: string | null) => void;
};

function ObjectLibraryCard({
  fileTree,
  imageAssetById,
  item,
  selected,
  onSelectNode
}: ObjectLibraryCardProps) {
  const rootObject = item.objectTree[0];

  return (
    <SelectableSurface
      className="grid min-h-24 w-full grid-cols-[88px_minmax(0,1fr)] gap-2 p-2 text-left"
      draggable
      selected={selected}
      onClick={() => onSelectNode(item.fileNodeId)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(
          projectObjectFileDragMimeType,
          serializeProjectObjectFileDragPayload(item.fileNodeId)
        );
      }}
    >
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100">
        {rootObject ? (
          <ObjectThumbnail
            fileTree={fileTree}
            imageAssetById={imageAssetById}
            object={rootObject}
          />
        ) : (
          <BoxSelect className="text-slate-400" size={24} />
        )}
      </div>
      <span className="flex min-w-0 flex-col justify-center">
        <span className="flex min-w-0 items-center gap-1.5">
          {item.linked ? <Link2 className="shrink-0 text-sky-700" size={14} /> : null}
          {item.rootKind ? (
            <ProjectObjectKindIcon
              className={cx("shrink-0", getProjectObjectKindIconClassName(item.rootKind))}
              kind={item.rootKind}
              size={15}
            />
          ) : null}
          <span className="truncate text-sm font-semibold text-slate-900">{item.name}</span>
        </span>
        <span className="mt-1 truncate text-xs text-slate-500">{item.parentPath || "Project"}</span>
        <span className="mt-1 truncate text-[11px] font-medium text-slate-400">
          {item.rootKind ? getProjectObjectKindLabel(item.rootKind) : "Object"}
        </span>
      </span>
    </SelectableSurface>
  );
}

type ObjectThumbnailProps = {
  fileTree: ProjectFileNode[];
  imageAssetById: Map<string, ReturnType<typeof getProjectImageAssetOptions>[number]>;
  object: ProjectObjectLibraryItem["objectTree"][number];
};

function ObjectThumbnail({ fileTree, imageAssetById, object }: ObjectThumbnailProps) {
  const rectTransform = getProjectObjectNodeRectTransform(object);
  const scale = Math.min(
    1,
    72 / Math.max(1, rectTransform.width),
    64 / Math.max(1, rectTransform.height)
  );

  return (
    <div
      className="relative shrink-0"
      style={{
        height: rectTransform.height,
        transformOrigin: "center",
        transform: `scale(${scale})`,
        width: rectTransform.width
      }}
    >
      <ObjectThumbnailFrame
        fileTree={fileTree}
        imageAssetById={imageAssetById}
        object={object}
        root
        siblingIndex={0}
      />
    </div>
  );
}

type ObjectThumbnailFrameProps = {
  fileTree: ProjectFileNode[];
  imageAssetById: Map<string, ReturnType<typeof getProjectImageAssetOptions>[number]>;
  object: ProjectObjectNode;
  rectTransformOverride?: ProjectObjectRectTransform;
  root?: boolean;
  siblingIndex: number;
};

function ObjectThumbnailFrame({
  fileTree,
  imageAssetById,
  object,
  rectTransformOverride,
  root = false,
  siblingIndex
}: ObjectThumbnailFrameProps) {
  const rectTransform =
    rectTransformOverride ?? getEffectiveProjectObjectRectTransform(object, fileTree);
  const children = getProjectObjectNodeVisibleChildren(object);
  const appearance = getProjectObjectNodeAppearance(object);
  const clipsChildren = doesProjectObjectClipChildren(object.kind);
  const childRectTransformOverrides = hasProjectObjectLayout(object.kind)
    ? getProjectObjectLayoutRectTransformOverrides(
        rectTransform,
        children,
        getProjectObjectNodeLayout(object),
        appearance.padding,
        (child) => getEffectiveProjectObjectRectTransform(child, fileTree)
      )
    : new Map<string, ProjectObjectRectTransform>();

  if (!object.visible) {
    return null;
  }

  return (
    <div
      className={root ? "relative h-full w-full" : "absolute overflow-visible"}
      style={getObjectThumbnailFrameStyle(rectTransform, root, siblingIndex)}
    >
      <ProjectObjectSurface fileTree={fileTree} imageAssetById={imageAssetById} object={object} />
      <div
        className={cx("absolute inset-0", clipsChildren ? "overflow-hidden" : "overflow-visible")}
        style={{ borderRadius: `${appearance.borderRadius}px` }}
      >
        {children.map((child, index) => (
          <ObjectThumbnailFrame
            key={child.id}
            fileTree={fileTree}
            imageAssetById={imageAssetById}
            object={child}
            rectTransformOverride={childRectTransformOverrides.get(child.id)}
            siblingIndex={index}
          />
        ))}
      </div>
    </div>
  );
}

function getObjectThumbnailFrameStyle(
  rectTransform: ProjectObjectRectTransform,
  root: boolean,
  siblingIndex: number
): CSSProperties {
  return {
    height: `${rectTransform.height}px`,
    left: root ? undefined : `${rectTransform.x}px`,
    top: root ? undefined : `${rectTransform.y}px`,
    transform: `rotate(${rectTransform.rotation}deg) scale(${rectTransform.scaleX}, ${rectTransform.scaleY})`,
    transformOrigin: `${rectTransform.pivotX * 100}% ${rectTransform.pivotY * 100}%`,
    width: `${rectTransform.width}px`,
    zIndex: siblingIndex + 1
  };
}
