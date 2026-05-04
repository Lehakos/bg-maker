import type { ProjectFileNode, ProjectImageAsset } from "@bg-maker/shared";
import { ImageIcon, RefreshCw, Search, Upload } from "lucide-react";
import { type ChangeEvent, useMemo, useState } from "react";
import {
  appendProjectImageAssetFileNodes,
  rememberTemporaryProjectImageAssetUrl,
  replaceProjectImageAssetFileNode
} from "../project-assets/project-image-assets";
import {
  replaceProjectImageAsset,
  uploadProjectImageAsset
} from "../project-workspace/project-api";
import { cx } from "../project-workspace/project-workspace-css";
import {
  projectImageAssetDragMimeType,
  serializeProjectImageAssetDragPayload
} from "./project-drag-payloads";
import {
  collectProjectAssetBrowserItems,
  filterProjectAssetBrowserItems,
  type ProjectAssetBrowserItem
} from "./project-library";

type AssetBrowserPanelProps = {
  className?: string;
  fileTree: ProjectFileNode[];
  projectId: string;
  saving: boolean;
  selectedNodeId: string | null;
  onFileTreeChange: (fileTree: ProjectFileNode[]) => void;
  onSelectNode: (nodeId: string | null) => void;
};

export function AssetBrowserPanel({
  className,
  fileTree,
  projectId,
  saving,
  selectedNodeId,
  onFileTreeChange,
  onSelectNode
}: AssetBrowserPanelProps) {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null);
  const [replaceErrors, setReplaceErrors] = useState<Record<string, string>>({});
  const items = useMemo(
    () => collectProjectAssetBrowserItems(projectId, fileTree),
    [fileTree, projectId]
  );
  const visibleItems = useMemo(
    () => filterProjectAssetBrowserItems(items, { search }),
    [items, search]
  );

  async function handleBulkUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";

    if (!files.length) {
      return;
    }

    setUploading(true);
    setUploadErrors([]);

    const uploadedAssets: ProjectImageAsset[] = [];
    const nextUploadErrors: string[] = [];

    for (const file of files) {
      try {
        const imageAsset = await uploadProjectImageAsset(projectId, file);
        rememberTemporaryProjectImageAssetUrl(imageAsset.id, file);
        uploadedAssets.push(imageAsset);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Image upload failed";
        nextUploadErrors.push(`${file.name}: ${message}`);
      }
    }

    if (uploadedAssets.length) {
      const { fileNodes, fileTree: nextFileTree } = appendProjectImageAssetFileNodes(
        fileTree,
        uploadedAssets
      );
      const lastFileNode = fileNodes.at(-1);

      onFileTreeChange(nextFileTree);

      if (lastFileNode) {
        onSelectNode(lastFileNode.id);
      }
    }

    setUploadErrors(nextUploadErrors);
    setUploading(false);
  }

  async function handleReplaceAsset(item: ProjectAssetBrowserItem, file: File | null) {
    if (!file) {
      return;
    }

    setReplacingAssetId(item.asset.id);
    setReplaceErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[item.asset.id];
      return nextErrors;
    });

    try {
      const imageAsset = await replaceProjectImageAsset(projectId, item.asset.id, file);
      rememberTemporaryProjectImageAssetUrl(imageAsset.id, file);
      const nextFileTree = replaceProjectImageAssetFileNode(fileTree, imageAsset);

      onFileTreeChange(nextFileTree);
      onSelectNode(item.fileNodeId);
    } catch (error) {
      setReplaceErrors((currentErrors) => ({
        ...currentErrors,
        [item.asset.id]: error instanceof Error ? error.message : "Image replace failed"
      }));
    } finally {
      setReplacingAssetId(null);
    }
  }

  return (
    <section
      className={cx("flex min-h-0 flex-col overflow-hidden bg-white text-slate-700", className)}
    >
      <div className="shrink-0 space-y-2 border-b border-slate-200 bg-slate-50 p-2">
        <label className="relative block">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
            size={15}
          />
          <input
            aria-label="Search assets"
            className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Search assets"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </label>
        <label
          className={cx(
            "flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:text-sky-700",
            (saving || uploading) && "cursor-not-allowed opacity-60"
          )}
        >
          <Upload size={15} />
          <span>{uploading ? "Uploading..." : "Upload images"}</span>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={saving || uploading}
            multiple
            type="file"
            onChange={handleBulkUpload}
          />
        </label>
        {uploadErrors.length ? (
          <div className="space-y-1 rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
            {uploadErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleItems.length ? (
          <div className="grid grid-cols-2 gap-2">
            {visibleItems.map((item) => (
              <AssetBrowserCard
                key={item.fileNodeId}
                disabled={saving || replacingAssetId === item.asset.id}
                error={replaceErrors[item.asset.id] ?? null}
                item={item}
                replacing={replacingAssetId === item.asset.id}
                selected={selectedNodeId === item.fileNodeId}
                onReplaceAsset={handleReplaceAsset}
                onSelectNode={onSelectNode}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-32 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-medium text-slate-500">
            No assets
          </div>
        )}
      </div>
    </section>
  );
}

type AssetBrowserCardProps = {
  disabled: boolean;
  error: string | null;
  item: ProjectAssetBrowserItem;
  replacing: boolean;
  selected: boolean;
  onReplaceAsset: (item: ProjectAssetBrowserItem, file: File | null) => void;
  onSelectNode: (nodeId: string | null) => void;
};

function AssetBrowserCard({
  disabled,
  error,
  item,
  replacing,
  selected,
  onReplaceAsset,
  onSelectNode
}: AssetBrowserCardProps) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-md border bg-white p-1.5 transition-colors",
        selected
          ? "border-sky-500 bg-sky-50 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)]"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      )}
      draggable
      onClick={() => onSelectNode(item.fileNodeId)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(
          projectImageAssetDragMimeType,
          serializeProjectImageAssetDragPayload(item.asset.id)
        );
      }}
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100">
        {item.url ? (
          <img
            alt={item.name}
            className="h-full w-full object-cover"
            draggable={false}
            src={item.url}
          />
        ) : (
          <ImageIcon className="text-slate-400" size={24} />
        )}
      </div>
      <div className="mt-1 min-w-0">
        <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
        <p className="truncate text-[11px] text-slate-500">{item.parentPath || "Project"}</p>
      </div>
      <label
        className={cx(
          "mt-1 flex h-7 cursor-pointer items-center justify-center gap-1 rounded border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-600 hover:border-sky-300 hover:text-sky-700",
          disabled && "cursor-not-allowed opacity-60"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <RefreshCw size={12} />
        <span>{replacing ? "Replacing..." : "Replace"}</span>
        <input
          aria-label={`Replace ${item.name}`}
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            event.currentTarget.value = "";
            onReplaceAsset(item, file);
          }}
        />
      </label>
      {error ? (
        <p className="mt-1 rounded border border-red-100 bg-red-50 px-1.5 py-1 text-[11px] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
