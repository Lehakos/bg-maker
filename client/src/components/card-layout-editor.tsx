import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  ColorInput,
  FileInput,
  Group,
  NumberInput,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Tooltip
} from "@mantine/core";
import {
  AlertTriangle,
  Coins,
  Heart,
  Image as ImageIcon,
  Plus,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sword,
  Trash2,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  cardIconIds,
  cardImageFits,
  cardSizePresetDimensions,
  cardSizePresets,
  cardTextAlignments,
  cardVisualHorizontalAlignments,
  cardVisualVerticalAlignments,
  resolveCardLayout,
  type LayoutContentSource,
  type TemplateFieldValues,
  type CardIconId,
  type CardImageFit,
  type CardLayout,
  type CardLayoutPadding,
  type CardLayoutSide,
  type CardLayoutSize,
  type LayoutZone,
  type CardSideLayout,
  type CardTextAlignment,
  type TextZoneContent,
  type CardVisualHorizontalAlignment,
  type CardVisualVerticalAlignment,
  type VisualZoneContent,
  type LayoutZoneContent
} from "@bg-maker/shared";
import { createId, createTextContent, createVisualContent, createZone } from "./layout-zone-utils";
import "./card-layout-editor.css";
import "./template-editor.css";

type CardLayoutEditorProps = {
  disabled?: boolean;
  fieldValues?: TemplateFieldValues;
  layout: CardLayout;
  onChange: (layout: CardLayout) => void;
};

type CardZoneTemplateId = "classic" | "split" | "full-art" | "custom";

const imageMaxBytes = 1024 * 1024;
const zoneResizeHandleHitSize = 34;

const sizeOptions = cardSizePresets.map((preset) => ({
  value: preset,
  label:
    preset === "custom"
      ? "Custom"
      : `${titleCase(preset)} (${cardSizePresetDimensions[preset].widthMm} x ${
          cardSizePresetDimensions[preset].heightMm
        } mm)`
}));

const zoneTemplateOptions: { value: CardZoneTemplateId; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "split", label: "Split" },
  { value: "full-art", label: "Full Art" },
  { value: "custom", label: "Custom" }
];

const zoneContentTypeOptions = [
  { value: "text", label: "Text" },
  { value: "visual", label: "Visual" }
];

const contentSourceOptions = [
  { value: "static", label: "Fixed" },
  { value: "field", label: "Per-component" }
];

const colorSwatchPalette = [
  "#1f2937",
  "#0f766e",
  "#0ea5e9",
  "#9333ea",
  "#dc2626",
  "#f59e0b",
  "#16a34a",
  "#f8fafc"
];

const visualTypeOptions = [
  { value: "image", label: "Image" },
  { value: "icon", label: "Icon" }
];

const alignmentOptions = cardTextAlignments.map((alignment) => ({
  value: alignment,
  label: titleCase(alignment)
}));

const imageFitOptions = cardImageFits.map((fit) => ({
  value: fit,
  label: titleCase(fit)
}));

const visualHorizontalPositionOptions = cardVisualHorizontalAlignments.map((alignment) => ({
  value: alignment,
  label: titleCase(alignment)
}));

const visualVerticalPositionOptions = cardVisualVerticalAlignments.map((alignment) => ({
  value: alignment,
  label: titleCase(alignment)
}));

const iconOptions = cardIconIds.map((iconId) => ({
  value: iconId,
  label: titleCase(iconId)
}));

const iconComponents: Record<CardIconId, LucideIcon> = {
  sword: Sword,
  shield: Shield,
  heart: Heart,
  star: Star,
  zap: Zap,
  coins: Coins,
  skull: Skull,
  sparkles: Sparkles
};

export function CardLayoutEditor({
  disabled = false,
  fieldValues = {},
  layout,
  onChange
}: CardLayoutEditorProps) {
  const [selectedSide, setSelectedSide] = useState<CardLayoutSide>("front");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneTemplate, setZoneTemplate] = useState<CardZoneTemplateId>("classic");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [controlsTab, setControlsTab] = useState<"layout" | "zones">("layout");

  const sideLayout = layout.sides[selectedSide];
  const selectedZone = sideLayout.zones.find((zone) => zone.id === selectedZoneId);
  const activeZone = selectedZone ?? sideLayout.zones[0] ?? null;

  const zoneOptions = sideLayout.zones.map((zone) => ({
    value: zone.id,
    label: `${zone.name} (${getZoneContentLabel(zone.content)})`
  }));

  function updateLayout(patch: Partial<CardLayout>) {
    onChange({ ...layout, ...patch });
  }

  function updateSide(updater: (side: typeof sideLayout) => typeof sideLayout) {
    onChange({
      ...layout,
      sides: {
        ...layout.sides,
        [selectedSide]: updater(sideLayout)
      }
    });
  }

  function updateSizePreset(value: string | null) {
    const preset = (value ?? "poker") as CardLayoutSize["preset"];

    if (preset === "custom") {
      const size = {
        preset,
        widthMm: layout.size.widthMm,
        heightMm: layout.size.heightMm
      };

      updateLayout({
        size,
        sides: normalizeSidePaddings(layout.sides, size)
      });
      return;
    }

    const size = {
      preset,
      ...cardSizePresetDimensions[preset]
    };

    updateLayout({
      size,
      sides: normalizeSidePaddings(layout.sides, size)
    });
  }

  function updateCustomSize(patch: Partial<Pick<CardLayoutSize, "heightMm" | "widthMm">>) {
    const size = {
      ...layout.size,
      preset: "custom" as const,
      ...patch
    };

    updateLayout({
      size,
      sides: normalizeSidePaddings(layout.sides, size)
    });
  }

  function updatePadding(patch: Partial<CardLayoutPadding>) {
    updateSide((currentSide) => ({
      ...currentSide,
      paddingMm: normalizePaddingMm({ ...currentSide.paddingMm, ...patch }, layout.size)
    }));
  }

  function applyZoneTemplate(templateId: CardZoneTemplateId) {
    const zones = buildTemplateZones(selectedSide, templateId);

    updateSide((currentSide) => ({
      ...currentSide,
      zones
    }));
    setZoneTemplate(templateId);
    setSelectedZoneId(zones[0].id);
  }

  function addZone() {
    const zone: LayoutZone = {
      id: createId(`${selectedSide}-zone`),
      name: "Custom zone",
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      content: createTextContent("New text")
    };

    updateSide((currentSide) => ({
      ...currentSide,
      zones: [...currentSide.zones, zone]
    }));
    setSelectedZoneId(zone.id);
    setZoneTemplate("custom");
  }

  function updateZone(zoneId: string, patch: Partial<LayoutZone>) {
    updateSide((currentSide) => ({
      ...currentSide,
      zones: currentSide.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone))
    }));
    setZoneTemplate("custom");
  }

  function updateZoneContent(zoneId: string, content: LayoutZoneContent) {
    updateZone(zoneId, { content });
  }

  function removeZone(zoneId: string) {
    if (sideLayout.zones.length <= 1) {
      return;
    }

    const zones = sideLayout.zones.filter((zone) => zone.id !== zoneId);

    updateSide((currentSide) => ({
      ...currentSide,
      zones
    }));
    setSelectedZoneId(zones[0].id);
    setZoneTemplate("custom");
  }

  return (
    <SimpleGrid className="template-editor-shell" cols={{ base: 1, md: 2 }} spacing="lg">
      <Stack className="template-editor-controls" gap="lg">
        <Tabs
          radius={8}
          value={controlsTab}
          onChange={(value) => setControlsTab((value ?? "layout") as "layout" | "zones")}
        >
          <Tabs.List grow>
            <Tabs.Tab value="layout">Layout</Tabs.Tab>
            <Tabs.Tab value="zones">Zones</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="layout" pt="md">
            <Stack gap="lg">
              <Stack className="template-editor-section" gap="sm">
                <Text className="template-editor-section-title">Card</Text>
                <Select
                  allowDeselect={false}
                  data={sizeOptions}
                  disabled={disabled}
                  label="Card size"
                  value={layout.size.preset}
                  onChange={updateSizePreset}
                />

                {layout.size.preset === "custom" ? (
                  <Group grow align="flex-start">
                    <NumberInput
                      allowDecimal
                      allowNegative={false}
                      disabled={disabled}
                      label="Width"
                      max={300}
                      min={20}
                      suffix=" mm"
                      value={layout.size.widthMm}
                      onChange={(value) =>
                        updateCustomSize({ widthMm: readFormNumber(value, layout.size.widthMm) })
                      }
                    />
                    <NumberInput
                      allowDecimal
                      allowNegative={false}
                      disabled={disabled}
                      label="Height"
                      max={300}
                      min={20}
                      suffix=" mm"
                      value={layout.size.heightMm}
                      onChange={(value) =>
                        updateCustomSize({ heightMm: readFormNumber(value, layout.size.heightMm) })
                      }
                    />
                  </Group>
                ) : null}
              </Stack>

              <Stack className="template-editor-section" gap="sm">
                <Text className="template-editor-section-title">
                  {titleCase(selectedSide)} side
                </Text>
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Padding
                  </Text>
                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                    <NumberInput
                      allowDecimal
                      allowNegative={false}
                      aria-label="Padding top"
                      disabled={disabled}
                      label="Top"
                      min={0}
                      suffix=" mm"
                      value={sideLayout.paddingMm.topMm}
                      onChange={(value) =>
                        updatePadding({ topMm: readFormNumber(value, sideLayout.paddingMm.topMm) })
                      }
                    />
                    <NumberInput
                      allowDecimal
                      allowNegative={false}
                      aria-label="Padding right"
                      disabled={disabled}
                      label="Right"
                      min={0}
                      suffix=" mm"
                      value={sideLayout.paddingMm.rightMm}
                      onChange={(value) =>
                        updatePadding({
                          rightMm: readFormNumber(value, sideLayout.paddingMm.rightMm)
                        })
                      }
                    />
                    <NumberInput
                      allowDecimal
                      allowNegative={false}
                      aria-label="Padding bottom"
                      disabled={disabled}
                      label="Bottom"
                      min={0}
                      suffix=" mm"
                      value={sideLayout.paddingMm.bottomMm}
                      onChange={(value) =>
                        updatePadding({
                          bottomMm: readFormNumber(value, sideLayout.paddingMm.bottomMm)
                        })
                      }
                    />
                    <NumberInput
                      allowDecimal
                      allowNegative={false}
                      aria-label="Padding left"
                      disabled={disabled}
                      label="Left"
                      min={0}
                      suffix=" mm"
                      value={sideLayout.paddingMm.leftMm}
                      onChange={(value) =>
                        updatePadding({
                          leftMm: readFormNumber(value, sideLayout.paddingMm.leftMm)
                        })
                      }
                    />
                  </SimpleGrid>
                </Stack>
              </Stack>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="zones" pt="md">
            <Stack gap="lg">
              <Stack className="template-editor-section" gap="sm">
                <Group align="flex-end" wrap="nowrap">
                  <Select
                    allowDeselect={false}
                    data={zoneTemplateOptions}
                    disabled={disabled}
                    label="Zone template"
                    value={zoneTemplate}
                    onChange={(value) =>
                      applyZoneTemplate((value ?? "classic") as CardZoneTemplateId)
                    }
                  />
                  <Button
                    disabled={disabled}
                    leftSection={<Plus size={14} />}
                    radius={8}
                    variant="light"
                    onClick={addZone}
                  >
                    Add zone
                  </Button>
                </Group>
              </Stack>

              <Stack className="template-editor-section" gap="sm">
                <Text className="template-editor-section-title">Selected zone</Text>
                <Group align="flex-end" wrap="nowrap">
                  <Select
                    allowDeselect={false}
                    data={zoneOptions}
                    disabled={disabled || zoneOptions.length === 0}
                    label="Selected zone"
                    value={activeZone?.id ?? null}
                    onChange={(value) => setSelectedZoneId(value)}
                  />
                  <Tooltip label="Remove zone" withArrow>
                    <ActionIcon
                      aria-label="Remove zone"
                      color="red"
                      disabled={disabled || !activeZone || sideLayout.zones.length <= 1}
                      mb={2}
                      radius={8}
                      size={36}
                      variant="subtle"
                      onClick={() => activeZone && removeZone(activeZone.id)}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {activeZone ? (
                  <ZoneControls
                    disabled={disabled}
                    uploadError={uploadError}
                    zone={activeZone}
                    onChange={(patch) => updateZone(activeZone.id, patch)}
                    onContentChange={(content) => updateZoneContent(activeZone.id, content)}
                    onUploadError={setUploadError}
                  />
                ) : null}
              </Stack>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Stack className="template-editor-preview-rail" gap="md">
        <Tabs
          radius={8}
          value={selectedSide}
          onChange={(value) => {
            const side = (value ?? "front") as CardLayoutSide;
            setSelectedSide(side);
            setSelectedZoneId(null);
          }}
        >
          <Tabs.List grow>
            <Tabs.Tab value="front">Front</Tabs.Tab>
            <Tabs.Tab value="back">Back</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <InteractiveCardPreview
          disabled={disabled}
          fieldValues={fieldValues}
          layout={layout}
          selectedZoneId={activeZone?.id ?? null}
          side={selectedSide}
          onSelectZone={(zoneId) => {
            setSelectedZoneId(zoneId);
            setControlsTab("zones");
          }}
          onUpdateZone={updateZone}
        />
      </Stack>
    </SimpleGrid>
  );
}

export function ZoneControls({
  disabled,
  onChange,
  onContentChange,
  onUploadError,
  uploadError,
  zone
}: {
  disabled: boolean;
  onChange: (patch: Partial<LayoutZone>) => void;
  onContentChange: (content: LayoutZoneContent) => void;
  onUploadError: (error: string | null) => void;
  uploadError: string | null;
  zone: LayoutZone;
}) {
  function setContentType(type: "text" | "visual") {
    onContentChange(type === "text" ? createTextContent(zone.name) : createVisualContent("image"));
  }

  function updateContentSource(source: LayoutContentSource) {
    onContentChange({ ...zone.content, source } as LayoutZoneContent);
  }

  const sourceMode = zone.content.source?.mode ?? "static";

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          disabled={disabled}
          label="Zone name"
          value={zone.name}
          onChange={(event) => onChange({ name: event.currentTarget.value })}
        />
        <Select
          allowDeselect={false}
          data={zoneContentTypeOptions}
          disabled={disabled}
          label="Content type"
          value={zone.content.type}
          onChange={(value) => setContentType((value ?? "text") as "text" | "visual")}
        />
        <NumberInput
          allowDecimal
          allowNegative={false}
          disabled={disabled}
          label="Zone X"
          max={100}
          min={0}
          suffix=" %"
          value={zone.x}
          onChange={(value) => onChange({ x: readFormNumber(value, 0) })}
        />
        <NumberInput
          allowDecimal
          allowNegative={false}
          disabled={disabled}
          label="Zone Y"
          max={100}
          min={0}
          suffix=" %"
          value={zone.y}
          onChange={(value) => onChange({ y: readFormNumber(value, 0) })}
        />
        <NumberInput
          allowDecimal
          allowNegative={false}
          disabled={disabled}
          label="Zone width"
          max={100}
          min={1}
          suffix=" %"
          value={zone.width}
          onChange={(value) => onChange({ width: readFormNumber(value, 1) })}
        />
        <NumberInput
          allowDecimal
          allowNegative={false}
          disabled={disabled}
          label="Zone height"
          max={100}
          min={1}
          suffix=" %"
          value={zone.height}
          onChange={(value) => onChange({ height: readFormNumber(value, 1) })}
        />
      </SimpleGrid>

      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Content source
        </Text>
        <SegmentedControl
          aria-label="Content source"
          data={contentSourceOptions}
          disabled={disabled}
          fullWidth
          value={sourceMode}
          onChange={(value) =>
            updateContentSource(
              value === "field"
                ? {
                    mode: "field",
                    fieldKey:
                      zone.content.source?.mode === "field"
                        ? zone.content.source.fieldKey
                        : normalizeFieldKey(zone.name)
                  }
                : { mode: "static" }
            )
          }
        />
        <Text c="dimmed" size="xs">
          {sourceMode === "field"
            ? "Each component using this template fills this in."
            : "The same value is used on every component."}
        </Text>
        {zone.content.source?.mode === "field" ? (
          <TextInput
            disabled={disabled}
            label="Field key"
            value={zone.content.source.fieldKey}
            onChange={(event) =>
              updateContentSource({
                mode: "field",
                fieldKey: normalizeFieldKey(event.currentTarget.value)
              })
            }
          />
        ) : null}
      </Stack>

      {zone.content.type === "text" ? (
        <TextContentControls
          content={zone.content}
          disabled={disabled}
          onChange={(content) => onContentChange(content)}
        />
      ) : (
        <VisualContentControls
          content={zone.content}
          disabled={disabled}
          onChange={(content) => onContentChange(content)}
          onUploadError={onUploadError}
        />
      )}

      {uploadError ? (
        <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
          {uploadError}
        </Alert>
      ) : null}
    </Stack>
  );
}

function TextContentControls({
  content,
  disabled,
  onChange
}: {
  content: TextZoneContent;
  disabled: boolean;
  onChange: (content: TextZoneContent) => void;
}) {
  return (
    <Stack gap="sm">
      <Textarea
        disabled={disabled}
        label="Text content"
        minRows={3}
        value={content.text}
        onChange={(event) => onChange({ ...content, text: event.currentTarget.value })}
      />
      <Group grow align="flex-start">
        <NumberInput
          allowDecimal={false}
          allowNegative={false}
          disabled={disabled}
          label="Font size"
          max={72}
          min={8}
          suffix=" px"
          value={content.fontSize}
          onChange={(value) =>
            onChange({ ...content, fontSize: readFormNumber(value, content.fontSize) })
          }
        />
        <ColorInput
          disabled={disabled}
          format="hex"
          label="Text color"
          swatches={colorSwatchPalette}
          value={content.color}
          onChange={(value) => onChange({ ...content, color: value })}
        />
      </Group>
      <Group justify="space-between" align="center">
        <SegmentedControl
          data={alignmentOptions}
          disabled={disabled}
          value={content.align}
          onChange={(value) => onChange({ ...content, align: value as CardTextAlignment })}
        />
        <Checkbox
          checked={content.bold}
          disabled={disabled}
          label="Bold"
          onChange={(event) => onChange({ ...content, bold: event.currentTarget.checked })}
        />
      </Group>
    </Stack>
  );
}

function VisualContentControls({
  content,
  disabled,
  onChange,
  onUploadError
}: {
  content: VisualZoneContent;
  disabled: boolean;
  onChange: (content: VisualZoneContent) => void;
  onUploadError: (error: string | null) => void;
}) {
  return (
    <Stack gap="sm">
      <Select
        allowDeselect={false}
        data={visualTypeOptions}
        disabled={disabled}
        label="Visual type"
        value={content.visualType}
        onChange={(value) =>
          onChange({ ...content, visualType: (value ?? "image") as "image" | "icon" })
        }
      />
      <Group grow align="flex-start">
        <Select
          allowDeselect={false}
          data={visualHorizontalPositionOptions}
          disabled={disabled}
          label="Horizontal position"
          value={content.horizontalAlign}
          onChange={(value) =>
            onChange({
              ...content,
              horizontalAlign: (value ?? "center") as CardVisualHorizontalAlignment
            })
          }
        />
        <Select
          allowDeselect={false}
          data={visualVerticalPositionOptions}
          disabled={disabled}
          label="Vertical position"
          value={content.verticalAlign}
          onChange={(value) =>
            onChange({
              ...content,
              verticalAlign: (value ?? "center") as CardVisualVerticalAlignment
            })
          }
        />
      </Group>

      {content.visualType === "image" ? (
        <ImageContentControls
          content={content}
          disabled={disabled}
          onChange={onChange}
          onUploadError={onUploadError}
        />
      ) : (
        <IconContentControls content={content} disabled={disabled} onChange={onChange} />
      )}
    </Stack>
  );
}

function ImageContentControls({
  content,
  disabled,
  onChange,
  onUploadError
}: {
  content: VisualZoneContent;
  disabled: boolean;
  onChange: (content: VisualZoneContent) => void;
  onUploadError: (error: string | null) => void;
}) {
  function uploadImage(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      onUploadError("Image file must be an image");
      return;
    }

    if (file.size > imageMaxBytes) {
      onUploadError("Image file must be 1 MB or smaller");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        onUploadError("Could not read image file");
        return;
      }

      onChange({
        ...content,
        dataUrl: reader.result,
        fileName: file.name
      });
      onUploadError(null);
    };
    reader.onerror = () => onUploadError("Could not read image file");
    reader.readAsDataURL(file);
  }

  return (
    <Stack gap="sm">
      <FileInput
        accept="image/*"
        disabled={disabled}
        label="Image file"
        leftSection={<ImageIcon size={14} />}
        placeholder={content.fileName || "Choose image"}
        onChange={uploadImage}
      />
      <Select
        allowDeselect={false}
        data={imageFitOptions}
        disabled={disabled}
        label="Image fit"
        value={content.fit}
        onChange={(value) => onChange({ ...content, fit: (value ?? "contain") as CardImageFit })}
      />
      <Text size="sm" c="dimmed">
        {content.fileName || "No image selected"}
      </Text>
    </Stack>
  );
}

function IconContentControls({
  content,
  disabled,
  onChange
}: {
  content: VisualZoneContent;
  disabled: boolean;
  onChange: (content: VisualZoneContent) => void;
}) {
  return (
    <Group grow align="flex-start">
      <Select
        allowDeselect={false}
        data={iconOptions}
        disabled={disabled}
        label="Icon"
        value={content.iconId}
        onChange={(value) => onChange({ ...content, iconId: (value ?? "sword") as CardIconId })}
      />
      <NumberInput
        allowDecimal={false}
        allowNegative={false}
        disabled={disabled}
        label="Icon size"
        max={96}
        min={8}
        suffix=" px"
        value={content.size}
        onChange={(value) => onChange({ ...content, size: readFormNumber(value, content.size) })}
      />
      <ColorInput
        disabled={disabled}
        format="hex"
        label="Icon color"
        swatches={colorSwatchPalette}
        value={content.color}
        onChange={(value) => onChange({ ...content, color: value })}
      />
    </Group>
  );
}

function InteractiveCardPreview({
  disabled,
  fieldValues,
  layout,
  onSelectZone,
  onUpdateZone,
  selectedZoneId,
  side
}: {
  disabled: boolean;
  fieldValues: TemplateFieldValues;
  layout: CardLayout;
  selectedZoneId: string | null;
  side: CardLayoutSide;
  onSelectZone: (zoneId: string) => void;
  onUpdateZone: (zoneId: string, patch: Partial<LayoutZone>) => void;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewLayout = useMemo(
    () => resolveCardLayout(layout, fieldValues),
    [fieldValues, layout]
  );
  const sideLayout = previewLayout.sides[side];

  function startZoneInteraction(
    event: ReactPointerEvent<HTMLElement>,
    zone: LayoutZone,
    mode: "move" | "resize"
  ) {
    if (disabled) {
      return;
    }

    const startPoint = getPointerPercent(event);

    if (!startPoint) {
      return;
    }

    const interactionTarget = event.currentTarget;
    const pointerId = event.pointerId;
    const startX = startPoint.x;
    const startY = startPoint.y;

    event.preventDefault();
    event.stopPropagation();
    interactionTarget.setPointerCapture(pointerId);
    onSelectZone(zone.id);

    function handlePointerMove(pointerEvent: PointerEvent) {
      const currentPoint = getPointerPercent(pointerEvent);

      if (!currentPoint) {
        return;
      }

      const deltaX = currentPoint.x - startX;
      const deltaY = currentPoint.y - startY;

      updateZoneFromDelta(zone, mode, deltaX, deltaY);
    }

    function handlePointerEnd(pointerEvent: PointerEvent) {
      if (interactionTarget.hasPointerCapture(pointerEvent.pointerId)) {
        interactionTarget.releasePointerCapture(pointerEvent.pointerId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
  }

  function getPointerPercent(event: Pick<PointerEvent | ReactPointerEvent, "clientX" | "clientY">) {
    const rect = previewRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    };
  }

  function getZoneAtPoint(point: { x: number; y: number }) {
    return sideLayout.zones
      .slice()
      .reverse()
      .find((zone) => pointIsInsideZone(point, zone));
  }

  function getInteractionZoneAtPoint(point: { x: number; y: number }) {
    const selectedZone = selectedZoneId
      ? sideLayout.zones.find((zone) => zone.id === selectedZoneId)
      : null;

    if (selectedZone && pointIsInsideZone(point, selectedZone)) {
      return selectedZone;
    }

    return getZoneAtPoint(point);
  }

  function pointIsInsideZone(point: { x: number; y: number }, zone: LayoutZone) {
    return (
      point.x >= zone.x &&
      point.x <= zone.x + zone.width &&
      point.y >= zone.y &&
      point.y <= zone.y + zone.height
    );
  }

  function pointIsInResizeCorner(point: { x: number; y: number }, zone: LayoutZone) {
    const rect = previewRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) {
      return false;
    }

    const thresholdX = (zoneResizeHandleHitSize / rect.width) * 100;
    const thresholdY = (zoneResizeHandleHitSize / rect.height) * 100;

    return (
      point.x >= zone.x + zone.width - thresholdX && point.y >= zone.y + zone.height - thresholdY
    );
  }

  function updateZoneFromDelta(
    zone: LayoutZone,
    mode: "move" | "resize",
    deltaX: number,
    deltaY: number
  ) {
    if (mode === "move") {
      onUpdateZone(zone.id, {
        x: roundPercent(clamp(zone.x + deltaX, 0, 100 - zone.width)),
        y: roundPercent(clamp(zone.y + deltaY, 0, 100 - zone.height))
      });
      return;
    }

    onUpdateZone(zone.id, {
      width: roundPercent(clamp(zone.width + deltaX, 1, 100 - zone.x)),
      height: roundPercent(clamp(zone.height + deltaY, 1, 100 - zone.y))
    });
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text fw={600}>Preview</Text>
        <Text c="dimmed" size="sm">
          {layout.size.widthMm} x {layout.size.heightMm} mm
        </Text>
      </Group>
      <Box className="card-preview-shell">
        <Box
          className="card-preview"
          style={{ aspectRatio: `${layout.size.widthMm} / ${layout.size.heightMm}` }}
        >
          <Box
            ref={previewRef}
            className="card-preview-safe-area"
            style={getPaddingAreaStyle(layout.size, sideLayout.paddingMm)}
            onPointerDown={(event) => {
              const point = getPointerPercent(event);

              if (!point) {
                return;
              }

              const zone = getInteractionZoneAtPoint(point);

              if (!zone) {
                return;
              }

              startZoneInteraction(
                event,
                zone,
                pointIsInResizeCorner(point, zone) ? "resize" : "move"
              );
            }}
          >
            {sideLayout.zones.map((zone) => (
              <Box
                key={zone.id}
                aria-label={`Card zone ${zone.name}`}
                className="card-preview-zone"
                data-selected={zone.id === selectedZoneId ? "true" : undefined}
                data-zone-name={zone.name}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectZone(zone.id);
                }}
              >
                <Text className="card-preview-zone-label">{zone.name}</Text>
                <Box className="card-preview-content">
                  <LayoutZoneContentPreview content={zone.content} />
                </Box>
                <Box aria-hidden className="card-preview-zone-resize-handle" />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}

export function CardPreview({
  compact = false,
  fieldValues = {},
  layout,
  side = "front",
  title = "Final preview"
}: {
  compact?: boolean;
  fieldValues?: TemplateFieldValues;
  layout: CardLayout;
  side?: CardLayoutSide;
  title?: string;
}) {
  const previewLayout = useMemo(
    () => resolveCardLayout(layout, fieldValues),
    [fieldValues, layout]
  );
  const sideLayout = previewLayout.sides[side];

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text fw={600}>{title}</Text>
        <Text c="dimmed" size="sm">
          {layout.size.widthMm} x {layout.size.heightMm} mm
        </Text>
      </Group>
      <Box className={`card-preview-shell${compact ? " card-preview-shell--compact" : ""}`}>
        <Box
          className="card-preview card-final-preview"
          style={{ aspectRatio: `${layout.size.widthMm} / ${layout.size.heightMm}` }}
        >
          <Box
            className="card-preview-safe-area card-preview-safe-area-readonly"
            style={getPaddingAreaStyle(layout.size, sideLayout.paddingMm)}
          >
            {sideLayout.zones.map((zone) => (
              <Box
                key={zone.id}
                className="layout-preview-zone"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`
                }}
              >
                <Box className="card-preview-content card-final-preview-content">
                  <LayoutZoneContentPreview content={zone.content} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}

export function LayoutZoneContentPreview({ content }: { content: LayoutZoneContent }) {
  if (content.type === "text") {
    return (
      <Text
        className="card-preview-text"
        style={{
          color: content.color,
          fontSize: content.fontSize,
          fontWeight: content.bold ? 700 : 400,
          textAlign: content.align
        }}
      >
        {content.text || "Text"}
      </Text>
    );
  }

  const visualPositionStyle = {
    alignItems: getVisualAlignItems(content.verticalAlign),
    justifyContent: getVisualJustifyContent(content.horizontalAlign)
  };

  if (content.visualType === "image") {
    return content.dataUrl ? (
      <Box className="card-preview-visual" style={visualPositionStyle}>
        <img
          alt=""
          className="card-preview-image"
          src={content.dataUrl}
          style={{
            objectFit: content.fit,
            objectPosition: `${content.horizontalAlign} ${content.verticalAlign}`
          }}
        />
      </Box>
    ) : (
      <Box className="card-preview-visual" style={visualPositionStyle}>
        <ImageIcon color="#94a3b8" size={content.size} />
      </Box>
    );
  }

  const Icon = iconComponents[content.iconId];

  return (
    <Box className="card-preview-visual" style={visualPositionStyle}>
      <Icon color={content.color} size={content.size} />
    </Box>
  );
}

function buildTemplateZones(side: CardLayoutSide, templateId: CardZoneTemplateId): LayoutZone[] {
  switch (templateId) {
    case "classic":
      return [
        createZone(`${side}-title`, "Title", 0, 0, 100, 12, createTextContent("")),
        createZone(`${side}-art`, "Art", 0, 16, 100, 40, createVisualContent("image")),
        createZone(`${side}-body`, "Body", 0, 60, 100, 30, createTextContent("")),
        createZone(`${side}-footer`, "Footer", 0, 94, 100, 6, createTextContent(""))
      ];

    case "split":
      return [
        createZone(`${side}-top`, "Top", 0, 0, 100, 14, createTextContent("")),
        createZone(`${side}-left`, "Left", 0, 18, 48, 66, createTextContent("")),
        createZone(`${side}-right`, "Right", 52, 18, 48, 66, createVisualContent("image")),
        createZone(`${side}-bottom`, "Bottom", 0, 88, 100, 12, createTextContent(""))
      ];

    case "full-art":
      return [
        createZone(`${side}-art`, "Art", 0, 0, 100, 100, createVisualContent("image")),
        createZone(`${side}-title`, "Title", 7, 6, 86, 12, createTextContent("")),
        createZone(`${side}-text`, "Text", 7, 72, 86, 22, createTextContent(""))
      ];

    case "custom":
      return [createZone(`${side}-custom`, "Custom", 0, 0, 100, 100, createTextContent(""))];
  }
}

function getVisualJustifyContent(alignment: CardVisualHorizontalAlignment) {
  switch (alignment) {
    case "left":
      return "flex-start";

    case "right":
      return "flex-end";

    case "center":
      return "center";
  }
}

function getVisualAlignItems(alignment: CardVisualVerticalAlignment) {
  switch (alignment) {
    case "top":
      return "flex-start";

    case "bottom":
      return "flex-end";

    case "center":
      return "center";
  }
}

function getPaddingAreaStyle(size: CardLayoutSize, padding: CardLayoutPadding) {
  return {
    top: `${(padding.topMm / size.heightMm) * 100}%`,
    right: `${(padding.rightMm / size.widthMm) * 100}%`,
    bottom: `${(padding.bottomMm / size.heightMm) * 100}%`,
    left: `${(padding.leftMm / size.widthMm) * 100}%`
  };
}

function normalizeSidePaddings(
  sides: Record<CardLayoutSide, CardSideLayout>,
  size: Pick<CardLayoutSize, "heightMm" | "widthMm">
) {
  return {
    front: {
      ...sides.front,
      paddingMm: normalizePaddingMm(sides.front.paddingMm, size)
    },
    back: {
      ...sides.back,
      paddingMm: normalizePaddingMm(sides.back.paddingMm, size)
    }
  };
}

function normalizePaddingMm(
  padding: CardLayoutPadding,
  size: Pick<CardLayoutSize, "heightMm" | "widthMm">
): CardLayoutPadding {
  const horizontal = normalizePaddingPair(padding.leftMm, padding.rightMm, size.widthMm);
  const vertical = normalizePaddingPair(padding.topMm, padding.bottomMm, size.heightMm);

  return {
    topMm: vertical.start,
    rightMm: horizontal.end,
    bottomMm: vertical.end,
    leftMm: horizontal.start
  };
}

function normalizePaddingPair(start: number, end: number, total: number) {
  const safeTotal = Math.max(1, total);
  const maxCombined = Math.max(0, safeTotal - 1);
  const normalizedStart = Math.max(0, Number.isFinite(start) ? start : 0);
  const normalizedEnd = Math.max(0, Number.isFinite(end) ? end : 0);
  const combined = normalizedStart + normalizedEnd;

  if (combined <= maxCombined) {
    return {
      start: roundMm(normalizedStart),
      end: roundMm(normalizedEnd)
    };
  }

  const scale = combined === 0 ? 0 : maxCombined / combined;

  return {
    start: roundMm(normalizedStart * scale),
    end: roundMm(normalizedEnd * scale)
  };
}

function roundMm(value: number) {
  return Math.round(value * 10) / 10;
}

function getZoneContentLabel(content: LayoutZoneContent) {
  return content.type === "text" ? "Text" : titleCase(content.visualType);
}

function normalizeFieldKey(value: string) {
  const normalized = value
    .trim()
    .replace(/[^a-z0-9_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return /^[a-z]/.test(normalized) ? normalized : `field_${normalized || "value"}`;
}

function readFormNumber(value: number | string, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
