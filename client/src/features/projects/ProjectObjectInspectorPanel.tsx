import type { ProjectFileNode, ProjectObjectNode } from "@bg-maker/shared";
import { Box, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  getProjectObjectNodeRectTransform,
  renameProjectObjectNode,
  setProjectObjectNodeRectTransform,
  setProjectObjectNodeVisibility
} from "./project-object-tree";
import { ProjectObjectKindIcon } from "./project-object-tree-ui";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "./project-object-tree-labels";
import {
  createRectTransformDraft,
  formatRectTransformValue,
  getRectTransformWithDraftField,
  normalizeRectTransformValue,
  parseRectTransformDraftValue,
  rectTransformFieldSettings,
  type RectTransformDraft,
  type RectTransformFieldKey
} from "./project-object-inspector-state";

type ProjectObjectInspectorPanelProps = {
  contentFileNode: ProjectFileNode | null;
  selectedObject: ProjectObjectNode | null;
  onObjectTreeChange: (fileNodeId: string, objectTree: ProjectObjectNode[]) => void;
};

type RectTransformFieldDefinition = {
  key: RectTransformFieldKey;
  label: string;
};

const positionFields: readonly RectTransformFieldDefinition[] = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" }
];

const sizeFields: readonly RectTransformFieldDefinition[] = [
  { key: "width", label: "W" },
  { key: "height", label: "H" }
];

const transformFields: readonly RectTransformFieldDefinition[] = [
  { key: "rotation", label: "Rotation" },
  { key: "scaleX", label: "Scale X" },
  { key: "scaleY", label: "Scale Y" }
];

const pivotFields: readonly RectTransformFieldDefinition[] = [
  { key: "pivotX", label: "Pivot X" },
  { key: "pivotY", label: "Pivot Y" }
];

export function ProjectObjectInspectorPanel({
  contentFileNode,
  selectedObject,
  onObjectTreeChange
}: ProjectObjectInspectorPanelProps) {
  const objectTree = useMemo(
    () => contentFileNode?.objectTree ?? [],
    [contentFileNode?.objectTree]
  );
  const rectTransform = useMemo(
    () => (selectedObject ? getProjectObjectNodeRectTransform(selectedObject) : null),
    [selectedObject]
  );
  const [nameDraft, setNameDraft] = useState("");
  const [rectTransformDraft, setRectTransformDraft] = useState<RectTransformDraft>(() =>
    createRectTransformDraft(rectTransform)
  );

  useEffect(() => {
    setNameDraft(selectedObject?.name ?? "");
  }, [selectedObject?.id, selectedObject?.name]);

  useEffect(() => {
    setRectTransformDraft(createRectTransformDraft(rectTransform));
  }, [rectTransform, selectedObject?.id]);

  function commitName(value = nameDraft) {
    if (!contentFileNode || !selectedObject) {
      return;
    }

    const nextName = value.trim();

    if (!nextName) {
      setNameDraft(selectedObject.name);
      return;
    }

    if (nextName === selectedObject.name) {
      return;
    }

    const nextObjectTree = renameProjectObjectNode(objectTree, selectedObject.id, nextName);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function resetNameDraft() {
    setNameDraft(selectedObject?.name ?? "");
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      resetNameDraft();
    }
  }

  function handleVisibilityChange(event: ChangeEvent<HTMLInputElement>) {
    if (!contentFileNode || !selectedObject) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeVisibility(
      objectTree,
      selectedObject.id,
      event.currentTarget.checked
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function updateRectTransformDraft(fieldKey: RectTransformFieldKey, value: string) {
    setRectTransformDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeRectTransformField(fieldKey, value);
  }

  function resetRectTransformDraft(fieldKey: RectTransformFieldKey) {
    if (!rectTransform) {
      return;
    }

    setRectTransformDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatRectTransformValue(rectTransform[fieldKey], fieldKey)
    }));
  }

  function updateObjectTreeRectTransformField(fieldKey: RectTransformFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !rectTransform) {
      return;
    }

    const nextRectTransform = getRectTransformWithDraftField(rectTransform, fieldKey, value);

    if (!nextRectTransform) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeRectTransform(
      objectTree,
      selectedObject.id,
      nextRectTransform
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitRectTransformField(
    fieldKey: RectTransformFieldKey,
    value = rectTransformDraft[fieldKey]
  ) {
    if (!contentFileNode || !selectedObject || !rectTransform) {
      return;
    }

    if (parseRectTransformDraftValue(value) === null) {
      resetRectTransformDraft(fieldKey);
      return;
    }

    updateObjectTreeRectTransformField(fieldKey, value);
    setRectTransformDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatRectTransformValue(
        normalizeRectTransformValue(fieldKey, Number(value)),
        fieldKey
      )
    }));
  }

  return (
    <aside className="flex min-h-[250px] shrink-0 flex-col border-b border-slate-200 bg-white text-slate-700">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-2">
        <SlidersHorizontal className="shrink-0 text-teal-700" size={15} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
            Inspector
          </h2>
          <p className="truncate text-[11px] leading-none text-slate-500">
            {selectedObject?.name ?? contentFileNode?.name ?? "No object selected"}
          </p>
        </div>
      </div>

      {contentFileNode && selectedObject && rectTransform ? (
        <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ProjectObjectKindIcon
                className={getProjectObjectKindIconClassName(selectedObject.kind)}
                kind={selectedObject.kind}
                size={18}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {getProjectObjectKindLabel(selectedObject.kind)}
                </p>
                <p className="truncate text-[11px] text-slate-500">{selectedObject.id}</p>
              </div>
            </div>

            <InspectorTextField
              label="Name"
              value={nameDraft}
              onBlur={commitName}
              onChange={setNameDraft}
              onKeyDown={handleNameKeyDown}
            />

            <label className="flex h-9 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700">
              <span className="flex min-w-0 items-center gap-2">
                {selectedObject.visible ? (
                  <Eye className="shrink-0 text-emerald-700" size={15} />
                ) : (
                  <EyeOff className="shrink-0 text-slate-500" size={15} />
                )}
                <span className="truncate">Visible</span>
              </span>
              <input
                checked={selectedObject.visible}
                className="h-4 w-4 accent-teal-700"
                type="checkbox"
                onChange={handleVisibilityChange}
              />
            </label>
          </section>

          <InspectorSection icon={<Box size={15} />} title="Frame">
            <InspectorNumberGrid
              fields={positionFields}
              rectTransformDraft={rectTransformDraft}
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
            <InspectorNumberGrid
              fields={sizeFields}
              rectTransformDraft={rectTransformDraft}
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
          </InspectorSection>

          <InspectorSection title="Transform">
            <InspectorNumberGrid
              fields={transformFields}
              rectTransformDraft={rectTransformDraft}
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
          </InspectorSection>

          <InspectorSection title="Pivot">
            <InspectorNumberGrid
              fields={pivotFields}
              rectTransformDraft={rectTransformDraft}
              onCommit={commitRectTransformField}
              onDraftChange={updateRectTransformDraft}
              onReset={resetRectTransformDraft}
            />
          </InspectorSection>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center text-xs text-slate-500">
          {contentFileNode
            ? "Select an object to inspect its properties"
            : "Select a table layout or object file"}
        </div>
      )}
    </aside>
  );
}

type InspectorSectionProps = {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
};

function InspectorSection({ children, icon, title }: InspectorSectionProps) {
  return (
    <section className="mt-4 border-t border-slate-200 pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

type InspectorTextFieldProps = {
  label: string;
  value: string;
  onBlur: (value: string) => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function InspectorTextField({
  label,
  value,
  onBlur,
  onChange,
  onKeyDown
}: InspectorTextFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onBlur={(event) => onBlur(event.currentTarget.value)}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

type InspectorNumberGridProps = {
  fields: readonly RectTransformFieldDefinition[];
  rectTransformDraft: RectTransformDraft;
  onCommit: (fieldKey: RectTransformFieldKey, value: string) => void;
  onDraftChange: (fieldKey: RectTransformFieldKey, value: string) => void;
  onReset: (fieldKey: RectTransformFieldKey) => void;
};

function InspectorNumberGrid({
  fields,
  rectTransformDraft,
  onCommit,
  onDraftChange,
  onReset
}: InspectorNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorNumberField
          key={field.key}
          field={field}
          value={rectTransformDraft[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type InspectorNumberFieldProps = {
  field: RectTransformFieldDefinition;
  value: string;
  onCommit: (fieldKey: RectTransformFieldKey, value: string) => void;
  onDraftChange: (fieldKey: RectTransformFieldKey, value: string) => void;
  onReset: (fieldKey: RectTransformFieldKey) => void;
};

function InspectorNumberField({
  field,
  value,
  onCommit,
  onDraftChange,
  onReset
}: InspectorNumberFieldProps) {
  const settings = rectTransformFieldSettings[field.key];

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onReset(field.key);
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onCommit(field.key, event.currentTarget.value);
  }

  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{field.label}</span>
      <input
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm tabular-nums text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        inputMode="decimal"
        max={settings.max}
        min={settings.min}
        step={settings.step}
        type="number"
        value={value}
        onBlur={handleBlur}
        onChange={(event) => onDraftChange(field.key, event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
    </label>
  );
}
