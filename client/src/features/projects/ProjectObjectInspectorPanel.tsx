import type {
  ProjectFileNode,
  ProjectObjectAppearance,
  ProjectObjectImage,
  ProjectObjectNode,
  ProjectObjectText,
  ProjectObjectTextAlign,
  ProjectObjectTextVerticalAlign
} from "@bg-maker/shared";
import {
  Box,
  Eye,
  EyeOff,
  ImagePlus,
  Palette,
  Shapes,
  SlidersHorizontal,
  Type
} from "lucide-react";
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import { uploadProjectImageAsset } from "./project-api";
import {
  appendProjectImageAssetFileNode,
  getProjectImageAssetOptionById,
  getProjectImageAssetOptions,
  rememberTemporaryProjectImageAssetUrl
} from "./project-image-assets";
import {
  getProjectObjectNodeAppearance,
  getProjectObjectNodeImage,
  getProjectObjectNodeRectTransform,
  getProjectObjectNodeShape,
  getProjectObjectNodeText,
  renameProjectObjectNode,
  setProjectObjectNodeAppearance,
  setProjectObjectNodeImage,
  setProjectObjectNodeRectTransform,
  setProjectObjectNodeShape,
  setProjectObjectNodeText,
  setProjectObjectNodeVisibility,
  updateProjectFileNodeObjectTree
} from "./project-object-tree";
import { ProjectObjectKindIcon } from "./project-object-tree-ui";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "./project-object-tree-labels";
import {
  createRectTransformDraft,
  createAppearanceDraft,
  createImageDraft,
  createTextDraft,
  formatAppearanceNumberValue,
  formatImageNumberValue,
  formatRectTransformValue,
  formatTextNumberValue,
  getAppearanceWithDraftField,
  getImageWithDraftField,
  getRectTransformWithDraftField,
  getShapeWithVariant,
  getTextWithDraftField,
  imageNumberFieldSettings,
  normalizeRectTransformValue,
  normalizeAppearanceNumberValue,
  normalizeImageNumberValue,
  normalizeTextNumberValue,
  parseRectTransformDraftValue,
  appearanceNumberFieldSettings,
  rectTransformFieldSettings,
  textNumberFieldSettings,
  type AppearanceDraft,
  type AppearanceFieldKey,
  type ImageDraft,
  type ImageFieldKey,
  type RectTransformDraft,
  type RectTransformFieldKey,
  type TextDraft,
  type TextFieldKey
} from "./project-object-inspector-state";

type ProjectObjectInspectorPanelProps = {
  contentFileNode: ProjectFileNode | null;
  fileTree: ProjectFileNode[];
  projectId: string;
  selectedObject: ProjectObjectNode | null;
  onFileTreeChange: (fileTree: ProjectFileNode[]) => void;
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
  { key: "width", label: "Width" },
  { key: "height", label: "Height" }
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

type AppearanceNumberFieldDefinition = {
  key: keyof typeof appearanceNumberFieldSettings;
  label: string;
};

type TextNumberFieldDefinition = {
  key: keyof typeof textNumberFieldSettings;
  label: string;
};

type ImageNumberFieldDefinition = {
  key: keyof typeof imageNumberFieldSettings;
  label: string;
};

const appearanceNumberFields: readonly AppearanceNumberFieldDefinition[] = [
  { key: "borderRadius", label: "Radius" },
  { key: "padding", label: "Padding" },
  { key: "opacity", label: "Opacity" }
];

const appearanceFillOpacityField = {
  key: "backgroundOpacity",
  label: "Fill opacity"
} as const satisfies AppearanceNumberFieldDefinition;

const appearanceBorderWidthField = {
  key: "borderWidth",
  label: "Border width"
} as const satisfies AppearanceNumberFieldDefinition;

const textNumberFields: readonly TextNumberFieldDefinition[] = [
  { key: "fontSize", label: "Size" },
  { key: "fontWeight", label: "Weight" },
  { key: "lineHeight", label: "Line" }
];

const imageNumberFields: readonly ImageNumberFieldDefinition[] = [
  { key: "positionX", label: "Pos X" },
  { key: "positionY", label: "Pos Y" }
];

const appearanceFillColorField = {
  key: "backgroundColor",
  label: "Fill"
} as const satisfies {
  key: Extract<AppearanceFieldKey, "backgroundColor">;
  label: string;
};

const appearanceBorderColorField = {
  key: "borderColor",
  label: "Border"
} as const satisfies {
  key: Extract<AppearanceFieldKey, "borderColor">;
  label: string;
};

const textColorFields = [{ key: "color", label: "Color" }] as const satisfies readonly {
  key: Extract<TextFieldKey, "color">;
  label: string;
}[];

const borderStyleOptions = [
  { label: "None", value: "none" },
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" }
] as const;

const textAlignOptions = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" }
] as const satisfies readonly { label: string; value: ProjectObjectTextAlign }[];

const textVerticalAlignOptions = [
  { label: "Top", value: "top" },
  { label: "Middle", value: "middle" },
  { label: "Bottom", value: "bottom" }
] as const satisfies readonly { label: string; value: ProjectObjectTextVerticalAlign }[];

const imageFitOptions = [
  { label: "Contain", value: "contain" },
  { label: "Cover", value: "cover" },
  { label: "Fill", value: "fill" },
  { label: "Scale down", value: "scaleDown" }
] as const;

const shapeVariantOptions = [
  { label: "Rectangle", value: "rectangle" },
  { label: "Ellipse", value: "ellipse" },
  { label: "Diamond", value: "diamond" },
  { label: "Triangle", value: "triangle" }
] as const;

export function ProjectObjectInspectorPanel({
  contentFileNode,
  fileTree,
  projectId,
  selectedObject,
  onFileTreeChange,
  onObjectTreeChange
}: ProjectObjectInspectorPanelProps) {
  const objectTree = useMemo(
    () => contentFileNode?.objectTree ?? [],
    [contentFileNode?.objectTree]
  );
  const imageAssets = useMemo(
    () => getProjectImageAssetOptions(projectId, fileTree),
    [fileTree, projectId]
  );
  const rectTransform = useMemo(
    () => (selectedObject ? getProjectObjectNodeRectTransform(selectedObject) : null),
    [selectedObject]
  );
  const appearance = useMemo(
    () => (selectedObject ? getProjectObjectNodeAppearance(selectedObject) : null),
    [selectedObject]
  );
  const text = useMemo(
    () => (selectedObject?.kind === "label" ? getProjectObjectNodeText(selectedObject) : null),
    [selectedObject]
  );
  const image = useMemo(
    () => (selectedObject?.kind === "image" ? getProjectObjectNodeImage(selectedObject) : null),
    [selectedObject]
  );
  const shape = useMemo(
    () => (selectedObject?.kind === "shape" ? getProjectObjectNodeShape(selectedObject) : null),
    [selectedObject]
  );
  const [nameDraft, setNameDraft] = useState("");
  const [rectTransformDraft, setRectTransformDraft] = useState<RectTransformDraft>(() =>
    createRectTransformDraft(rectTransform)
  );
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>(() =>
    appearance
      ? createAppearanceDraft(appearance)
      : createAppearanceDraft(getFallbackAppearanceDraftValue())
  );
  const [textDraft, setTextDraft] = useState<TextDraft>(() =>
    text ? createTextDraft(text) : createTextDraft(getFallbackTextDraftValue())
  );
  const [imageDraft, setImageDraft] = useState<ImageDraft>(() =>
    image ? createImageDraft(image) : createImageDraft(getFallbackImageDraftValue())
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- Draft fields must reset when the selected object changes. */
  useEffect(() => {
    setNameDraft(selectedObject?.name ?? "");
  }, [selectedObject?.id, selectedObject?.name]);

  useEffect(() => {
    setRectTransformDraft(createRectTransformDraft(rectTransform));
  }, [rectTransform, selectedObject?.id]);

  useEffect(() => {
    if (appearance) {
      setAppearanceDraft(createAppearanceDraft(appearance));
    }
  }, [appearance, selectedObject?.id]);

  useEffect(() => {
    if (text) {
      setTextDraft(createTextDraft(text));
    }
  }, [selectedObject?.id, text]);

  useEffect(() => {
    if (image) {
      setImageDraft(createImageDraft(image));
      setImageUploadError(null);
    }
  }, [image, selectedObject?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  function updateAppearanceDraft(fieldKey: AppearanceFieldKey, value: string) {
    setAppearanceDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeAppearanceField(fieldKey, value);
  }

  function resetAppearanceDraft(fieldKey: AppearanceFieldKey) {
    if (!appearance) {
      return;
    }

    const nextDraft = createAppearanceDraft(appearance);

    setAppearanceDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: nextDraft[fieldKey]
    }));
  }

  function updateObjectTreeAppearanceField(fieldKey: AppearanceFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !appearance) {
      return;
    }

    const nextAppearance = getAppearanceWithDraftField(appearance, fieldKey, value);

    if (!nextAppearance) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeAppearance(
      objectTree,
      selectedObject.id,
      nextAppearance
    );

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitAppearanceNumberField(
    fieldKey: keyof typeof appearanceNumberFieldSettings,
    value = appearanceDraft[fieldKey]
  ) {
    if (!appearance) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetAppearanceDraft(fieldKey);
      return;
    }

    updateObjectTreeAppearanceField(fieldKey, value);
    setAppearanceDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatAppearanceNumberValue(
        normalizeAppearanceNumberValue(fieldKey, parsedValue),
        fieldKey
      )
    }));
  }

  function updateTextDraft(fieldKey: TextFieldKey, value: string) {
    setTextDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeTextField(fieldKey, value);
  }

  function resetTextDraft(fieldKey: TextFieldKey) {
    if (!text) {
      return;
    }

    setTextDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: String(text[fieldKey])
    }));
  }

  function updateObjectTreeTextField(fieldKey: TextFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !text) {
      return;
    }

    const nextText = getTextWithDraftField(text, fieldKey, value);

    if (!nextText) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeText(objectTree, selectedObject.id, nextText);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitTextNumberField(
    fieldKey: keyof typeof textNumberFieldSettings,
    value = textDraft[fieldKey]
  ) {
    if (!text) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetTextDraft(fieldKey);
      return;
    }

    updateObjectTreeTextField(fieldKey, value);
    setTextDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatTextNumberValue(normalizeTextNumberValue(fieldKey, parsedValue), fieldKey)
    }));
  }

  function updateImageDraft(fieldKey: ImageFieldKey, value: string) {
    setImageDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: value
    }));
    updateObjectTreeImageField(fieldKey, value);
  }

  function resetImageDraft(fieldKey: ImageFieldKey) {
    if (!image) {
      return;
    }

    setImageDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: String(image[fieldKey])
    }));
  }

  function updateObjectTreeImageField(fieldKey: ImageFieldKey, value: string) {
    if (!contentFileNode || !selectedObject || !image) {
      return;
    }

    const nextImage = getImageWithDraftField(image, fieldKey, value);

    if (!nextImage) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeImage(objectTree, selectedObject.id, nextImage);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  function commitImageNumberField(
    fieldKey: keyof typeof imageNumberFieldSettings,
    value = imageDraft[fieldKey]
  ) {
    if (!image) {
      return;
    }

    const parsedValue = parseRectTransformDraftValue(value);

    if (parsedValue === null) {
      resetImageDraft(fieldKey);
      return;
    }

    updateObjectTreeImageField(fieldKey, value);
    setImageDraft((currentDraft) => ({
      ...currentDraft,
      [fieldKey]: formatImageNumberValue(normalizeImageNumberValue(fieldKey, parsedValue), fieldKey)
    }));
  }

  function updateShapeVariant(value: string) {
    if (!contentFileNode || !selectedObject || !shape) {
      return;
    }

    const nextShape = getShapeWithVariant(shape, value);

    if (!nextShape) {
      return;
    }

    const nextObjectTree = setProjectObjectNodeShape(objectTree, selectedObject.id, nextShape);

    if (nextObjectTree !== objectTree) {
      onObjectTreeChange(contentFileNode.id, nextObjectTree);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file || !contentFileNode || !selectedObject || !image) {
      return;
    }

    setUploadingImage(true);
    setImageUploadError(null);

    try {
      const imageAsset = await uploadProjectImageAsset(projectId, file);
      rememberTemporaryProjectImageAssetUrl(imageAsset.id, file);
      const nextImage: ProjectObjectImage = {
        ...image,
        assetId: imageAsset.id
      };
      const nextObjectTree = setProjectObjectNodeImage(objectTree, selectedObject.id, nextImage);
      const fileTreeWithObject = updateProjectFileNodeObjectTree(
        fileTree,
        contentFileNode.id,
        nextObjectTree
      );
      const { fileTree: fileTreeWithImageAsset } = appendProjectImageAssetFileNode(
        fileTreeWithObject,
        imageAsset
      );

      onFileTreeChange(fileTreeWithImageAsset);
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  const selectedImageAsset = image?.assetId
    ? getProjectImageAssetOptionById(imageAssets, image.assetId)
    : undefined;

  return (
    <aside className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden border-b border-slate-200 bg-white text-slate-700">
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

          {appearance ? (
            <InspectorSection icon={<Palette size={15} />} title="Appearance">
              <div className="grid grid-cols-2 gap-2">
                <InspectorColorField
                  field={appearanceFillColorField}
                  value={appearanceDraft.backgroundColor}
                  onChange={updateAppearanceDraft}
                />
                <InspectorBehaviorNumberField
                  field={appearanceFillOpacityField}
                  settings={appearanceNumberFieldSettings.backgroundOpacity}
                  value={appearanceDraft.backgroundOpacity}
                  onCommit={commitAppearanceNumberField}
                  onDraftChange={updateAppearanceDraft}
                  onReset={resetAppearanceDraft}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InspectorColorField
                  field={appearanceBorderColorField}
                  value={appearanceDraft.borderColor}
                  onChange={updateAppearanceDraft}
                />
                <InspectorBehaviorNumberField
                  field={appearanceBorderWidthField}
                  settings={appearanceNumberFieldSettings.borderWidth}
                  value={appearanceDraft.borderWidth}
                  onCommit={commitAppearanceNumberField}
                  onDraftChange={updateAppearanceDraft}
                  onReset={resetAppearanceDraft}
                />
              </div>
              <InspectorSelectField
                label="Border style"
                value={appearanceDraft.borderStyle}
                options={borderStyleOptions}
                onChange={(value) => updateAppearanceDraft("borderStyle", value)}
              />
              <AppearanceNumberGrid
                fields={appearanceNumberFields}
                value={appearanceDraft}
                onCommit={commitAppearanceNumberField}
                onDraftChange={updateAppearanceDraft}
                onReset={resetAppearanceDraft}
              />
            </InspectorSection>
          ) : null}

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

          {text ? (
            <InspectorSection icon={<Type size={15} />} title="Text">
              <InspectorTextareaField
                label="Content"
                value={textDraft.content}
                onChange={(value) => updateTextDraft("content", value)}
              />
              <InspectorColorGrid
                fields={textColorFields}
                value={textDraft}
                onChange={updateTextDraft}
              />
              <div className="grid grid-cols-2 gap-2">
                <InspectorSelectField
                  label="Align"
                  value={textDraft.textAlign}
                  options={textAlignOptions}
                  onChange={(value) => updateTextDraft("textAlign", value)}
                />
                <InspectorSelectField
                  label="Vertical"
                  value={textDraft.verticalAlign}
                  options={textVerticalAlignOptions}
                  onChange={(value) => updateTextDraft("verticalAlign", value)}
                />
              </div>
              <TextNumberGrid
                fields={textNumberFields}
                value={textDraft}
                onCommit={commitTextNumberField}
                onDraftChange={updateTextDraft}
                onReset={resetTextDraft}
              />
            </InspectorSection>
          ) : null}

          {image ? (
            <InspectorSection icon={<ImagePlus size={15} />} title="Image">
              <InspectorSelectField
                label="Asset"
                value={imageDraft.assetId}
                options={[
                  { label: "No image", value: "" },
                  ...imageAssets.map((imageAsset) => ({
                    label: imageAsset.name,
                    value: imageAsset.asset.id
                  }))
                ]}
                onChange={(value) => updateImageDraft("assetId", value)}
              />
              {image.assetId && !selectedImageAsset ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                  Selected image is no longer in the file tree.
                </p>
              ) : null}
              <label className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 text-sm font-medium text-slate-700 hover:border-sky-400 hover:bg-sky-50">
                <input
                  accept="image/gif,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingImage}
                  type="file"
                  onChange={handleImageUpload}
                />
                {uploadingImage ? "Uploading..." : "Upload image"}
              </label>
              {imageUploadError ? (
                <p className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                  {imageUploadError}
                </p>
              ) : null}
              <InspectorSelectField
                label="Fit"
                value={imageDraft.fit}
                options={imageFitOptions}
                onChange={(value) => updateImageDraft("fit", value)}
              />
              <ImageNumberGrid
                fields={imageNumberFields}
                value={imageDraft}
                onCommit={commitImageNumberField}
                onDraftChange={updateImageDraft}
                onReset={resetImageDraft}
              />
            </InspectorSection>
          ) : null}

          {shape ? (
            <InspectorSection icon={<Shapes size={15} />} title="Shape">
              <InspectorSelectField
                label="Variant"
                value={shape.variant}
                options={shapeVariantOptions}
                onChange={updateShapeVariant}
              />
            </InspectorSection>
          ) : null}
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

type InspectorTextareaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function InspectorTextareaField({ label, value, onChange }: InspectorTextareaFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      <span>{label}</span>
      <textarea
        className="mt-1 min-h-20 w-full resize-y rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

type InspectorColorGridProps<TField extends string> = {
  fields: readonly { key: TField; label: string }[];
  value: Record<TField, string>;
  onChange: (fieldKey: TField, value: string) => void;
};

function InspectorColorGrid<TField extends string>({
  fields,
  value,
  onChange
}: InspectorColorGridProps<TField>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorColorField
          key={field.key}
          field={field}
          value={value[field.key]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

type InspectorColorFieldProps<TField extends string> = {
  field: { key: TField; label: string };
  value: string;
  onChange: (fieldKey: TField, value: string) => void;
};

function InspectorColorField<TField extends string>({
  field,
  value,
  onChange
}: InspectorColorFieldProps<TField>) {
  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{field.label}</span>
      <span className="mt-1 flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2">
        <input
          className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          type="color"
          value={value}
          onChange={(event) => onChange(field.key, event.currentTarget.value)}
        />
        <span className="truncate text-xs tabular-nums text-slate-600">{value}</span>
      </span>
    </label>
  );
}

type InspectorSelectFieldProps<TValue extends string> = {
  label: string;
  options: readonly { label: string; value: TValue }[];
  value: TValue;
  onChange: (value: TValue) => void;
};

function InspectorSelectField<TValue extends string>({
  label,
  options,
  value,
  onChange
}: InspectorSelectFieldProps<TValue>) {
  return (
    <label className="block min-w-0 text-xs font-medium text-slate-500">
      <span>{label}</span>
      <select
        className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-950 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as TValue)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type AppearanceNumberGridProps = {
  fields: readonly AppearanceNumberFieldDefinition[];
  value: AppearanceDraft;
  onCommit: (fieldKey: keyof typeof appearanceNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: AppearanceFieldKey, value: string) => void;
  onReset: (fieldKey: AppearanceFieldKey) => void;
};

function AppearanceNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: AppearanceNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={appearanceNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type TextNumberGridProps = {
  fields: readonly TextNumberFieldDefinition[];
  value: TextDraft;
  onCommit: (fieldKey: keyof typeof textNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: TextFieldKey, value: string) => void;
  onReset: (fieldKey: TextFieldKey) => void;
};

function TextNumberGrid({ fields, value, onCommit, onDraftChange, onReset }: TextNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={textNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type ImageNumberGridProps = {
  fields: readonly ImageNumberFieldDefinition[];
  value: ImageDraft;
  onCommit: (fieldKey: keyof typeof imageNumberFieldSettings, value: string) => void;
  onDraftChange: (fieldKey: ImageFieldKey, value: string) => void;
  onReset: (fieldKey: ImageFieldKey) => void;
};

function ImageNumberGrid({
  fields,
  value,
  onCommit,
  onDraftChange,
  onReset
}: ImageNumberGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <InspectorBehaviorNumberField
          key={field.key}
          field={field}
          settings={imageNumberFieldSettings[field.key]}
          value={value[field.key]}
          onCommit={onCommit}
          onDraftChange={onDraftChange}
          onReset={onReset}
        />
      ))}
    </div>
  );
}

type BehaviorNumberFieldDefinition<TFieldKey extends string> = {
  key: TFieldKey;
  label: string;
};

type InspectorBehaviorNumberFieldProps<TFieldKey extends string> = {
  field: BehaviorNumberFieldDefinition<TFieldKey>;
  settings: { max: number; min: number; step: number };
  value: string;
  onCommit: (fieldKey: TFieldKey, value: string) => void;
  onDraftChange: (fieldKey: TFieldKey, value: string) => void;
  onReset: (fieldKey: TFieldKey) => void;
};

function InspectorBehaviorNumberField<TFieldKey extends string>({
  field,
  settings,
  value,
  onCommit,
  onDraftChange,
  onReset
}: InspectorBehaviorNumberFieldProps<TFieldKey>) {
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

function getFallbackAppearanceDraftValue(): ProjectObjectAppearance {
  return {
    backgroundColor: "#ffffff",
    backgroundOpacity: 1,
    borderColor: "#cbd5e1",
    borderRadius: 0,
    borderStyle: "none",
    borderWidth: 0,
    opacity: 1,
    padding: 0
  };
}

function getFallbackTextDraftValue(): ProjectObjectText {
  return {
    color: "#0f172a",
    content: "",
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.2,
    textAlign: "center",
    verticalAlign: "middle"
  };
}

function getFallbackImageDraftValue(): ProjectObjectImage {
  return {
    assetId: "",
    fit: "contain",
    positionX: 50,
    positionY: 50
  };
}
