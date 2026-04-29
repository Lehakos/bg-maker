import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  FileInput,
  Group,
  Menu,
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
  ChevronDown,
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
  Type as TypeIcon,
  Zap,
  type LucideIcon
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  cardIconIds,
  cardImageFits,
  cardSizePresetDimensions,
  cardSizePresets,
  cardTextAlignments,
  cardVisualHorizontalAlignments,
  cardVisualVerticalAlignments,
  resolveCardLayout,
  resolveProjectColorValue,
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
  type ProjectParameter,
  type VisualZoneContent,
  type LayoutZoneContent
} from "@bg-maker/shared";
import {
  createContentForZoneKind,
  createDefaultLayoutZone,
  createTextContent,
  createVisualContent,
  createZone,
  getZoneContentKind,
  getZoneContentLabel,
  zoneContentKindLabels,
  type ZoneContentKind
} from "./layout-zone-utils";
import { ProjectColorValueInput } from "./project-color-value-input";
import { useZoneEditor, type ZoneEditorState } from "./use-zone-editor";
import "./card-layout-editor.css";
import "./template-editor.css";

type CardLayoutEditorProps = {
  disabled?: boolean;
  fieldValues?: TemplateFieldValues;
  layout: CardLayout;
  projectParameters?: ProjectParameter[];
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

const zoneContentTypeOptions = (["text", "image", "icon"] as const).map((kind) => ({
  value: kind,
  label: zoneContentKindLabels[kind]
}));

const zoneAddOptions: { icon: LucideIcon; label: string; value: ZoneContentKind }[] = [
  { value: "text", label: "Text", icon: TypeIcon },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "icon", label: "Icon", icon: Star }
];

const zoneLayoutPresets: {
  label: string;
  patch: Pick<LayoutZone, "height" | "width" | "x" | "y">;
  value: string;
}[] = [
  { value: "full", label: "Full", patch: { x: 0, y: 0, width: 100, height: 100 } },
  { value: "top", label: "Top", patch: { x: 0, y: 0, width: 100, height: 14 } },
  { value: "center", label: "Center", patch: { x: 12, y: 38, width: 76, height: 24 } },
  { value: "bottom", label: "Bottom", patch: { x: 0, y: 84, width: 100, height: 16 } },
  { value: "art", label: "Art", patch: { x: 8, y: 16, width: 84, height: 52 } },
  { value: "inset", label: "Inset", patch: { x: 8, y: 8, width: 84, height: 84 } }
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
  projectParameters = [],
  onChange
}: CardLayoutEditorProps) {
  const [selectedSide, setSelectedSide] = useState<CardLayoutSide>("front");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneTemplate, setZoneTemplate] = useState<CardZoneTemplateId>("classic");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [controlsTab, setControlsTab] = useState<"layout" | "zones">("layout");

  const sideLayout = layout.sides[selectedSide];
  const zoneEditor = useZoneEditor({
    selectedZoneId,
    zones: sideLayout.zones,
    onSelectedZoneIdChange: setSelectedZoneId
  });
  const activeZone = zoneEditor.activeZone;

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

  function addZone(kind: ZoneContentKind) {
    const zone = createDefaultLayoutZone(`${selectedSide}-zone`, kind);

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
              </Stack>

              <Stack className="template-editor-section" gap="sm">
                <ZoneEditorPanel
                  disabled={disabled}
                  editor={zoneEditor}
                  projectParameters={projectParameters}
                  title="Zones"
                  uploadError={uploadError}
                  onAddZone={addZone}
                  onRemoveZone={removeZone}
                  onUpdateZone={updateZone}
                  onUploadError={setUploadError}
                />
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
          projectParameters={projectParameters}
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

export function ZoneEditorPanel({
  disabled = false,
  editor,
  projectParameters,
  title,
  uploadError,
  onAddZone,
  onRemoveZone,
  onUpdateZone,
  onUploadError
}: {
  disabled?: boolean;
  editor: ZoneEditorState;
  projectParameters: ProjectParameter[];
  title?: string;
  uploadError: string | null;
  onAddZone: (kind: ZoneContentKind) => void;
  onRemoveZone: (zoneId: string) => void;
  onUpdateZone: (zoneId: string, patch: Partial<LayoutZone>) => void;
  onUploadError: (error: string | null) => void;
}) {
  const { activeZone, zones, onSelectedZoneIdChange } = editor;
  const heading = title ?? "Zones";

  return (
    <>
      <Group align="center" justify="space-between" wrap="nowrap">
        <Text className="template-editor-section-title">{heading}</Text>
        <Group gap="xs" wrap="nowrap">
          <ZoneAddMenu disabled={disabled} onAddZone={onAddZone} />
          <Tooltip label="Remove zone" withArrow>
            <ActionIcon
              aria-label="Remove zone"
              color="red"
              disabled={disabled || !activeZone || zones.length <= 1}
              radius={8}
              size={36}
              variant="subtle"
              onClick={() => activeZone && onRemoveZone(activeZone.id)}
            >
              <Trash2 size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <ZoneList
        activeZoneId={activeZone?.id ?? null}
        disabled={disabled}
        zones={zones}
        onSelectZone={onSelectedZoneIdChange}
      />

      {activeZone ? (
        <ZoneControls
          disabled={disabled}
          projectParameters={projectParameters}
          uploadError={uploadError}
          zone={activeZone}
          onChange={(patch) => onUpdateZone(activeZone.id, patch)}
          onContentChange={(content) => onUpdateZone(activeZone.id, { content })}
          onUploadError={onUploadError}
        />
      ) : null}
    </>
  );
}

function ZoneAddMenu({
  disabled,
  onAddZone
}: {
  disabled: boolean;
  onAddZone: (kind: ZoneContentKind) => void;
}) {
  return (
    <Menu position="bottom-end" shadow="md" width={180}>
      <Menu.Target>
        <Button
          disabled={disabled}
          leftSection={<Plus size={14} />}
          radius={8}
          rightSection={<ChevronDown aria-hidden size={14} />}
          type="button"
          variant="light"
        >
          Add zone
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {zoneAddOptions.map((option) => {
          const Icon = option.icon;

          return (
            <Menu.Item
              key={option.value}
              leftSection={<Icon size={14} />}
              onClick={() => onAddZone(option.value)}
            >
              {option.label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

function ZoneList({
  activeZoneId,
  disabled,
  zones,
  onSelectZone
}: {
  activeZoneId: string | null;
  disabled: boolean;
  zones: LayoutZone[];
  onSelectZone: (zoneId: string | null) => void;
}) {
  if (zones.length === 0) {
    return (
      <Box className="zone-list zone-list--empty">
        <Text c="dimmed" size="sm">
          No zones
        </Text>
      </Box>
    );
  }

  return (
    <Box aria-label="Zones" className="zone-list" role="listbox">
      {zones.map((zone) => (
        <button
          key={zone.id}
          aria-selected={zone.id === activeZoneId}
          className="zone-list-item"
          data-selected={zone.id === activeZoneId ? "true" : undefined}
          disabled={disabled}
          role="option"
          type="button"
          onClick={() => onSelectZone(zone.id)}
        >
          <span className="zone-list-item-icon">
            <ZoneTypeIcon content={zone.content} />
          </span>
          <span className="zone-list-item-copy">
            <span className="zone-list-item-title">{zone.name || "Untitled zone"}</span>
            <span className="zone-list-item-meta">{getZoneContentLabel(zone.content)}</span>
          </span>
        </button>
      ))}
    </Box>
  );
}

function ZoneTypeIcon({ content }: { content: LayoutZoneContent }) {
  const kind = getZoneContentKind(content);

  if (kind === "text") {
    return <TypeIcon size={16} />;
  }

  if (kind === "image") {
    return <ImageIcon size={16} />;
  }

  return <Star size={16} />;
}

export function ZoneControls({
  disabled,
  onChange,
  onContentChange,
  onUploadError,
  projectParameters,
  uploadError,
  zone
}: {
  disabled: boolean;
  onChange: (patch: Partial<LayoutZone>) => void;
  onContentChange: (content: LayoutZoneContent) => void;
  onUploadError: (error: string | null) => void;
  projectParameters?: ProjectParameter[];
  uploadError: string | null;
  zone: LayoutZone;
}) {
  const contentDraftsRef = useRef<
    Record<string, Partial<Record<ZoneContentKind, LayoutZoneContent>>>
  >({});
  const contentKind = getZoneContentKind(zone.content);

  useEffect(() => {
    const zoneDrafts = (contentDraftsRef.current[zone.id] ??= {});
    zoneDrafts[contentKind] = zone.content;
  }, [contentKind, zone.content, zone.id]);

  function setContentKind(kind: ZoneContentKind) {
    const zoneDrafts = (contentDraftsRef.current[zone.id] ??= {});
    zoneDrafts[contentKind] = zone.content;

    if (kind !== "image") {
      onUploadError(null);
    }

    onContentChange(zoneDrafts[kind] ?? createContentForZoneKind(kind, zone.name));
  }

  function updateContentSource(source: LayoutContentSource) {
    onContentChange({ ...zone.content, source } as LayoutZoneContent);
  }

  const sourceMode = zone.content.source?.mode ?? "static";

  return (
    <Stack gap="md">
      <Stack className="zone-controls-group" gap="sm">
        <Text className="zone-controls-group-title">Layout</Text>
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
          {zoneLayoutPresets.map((preset) => (
            <Button
              key={preset.value}
              className="zone-layout-preset-button"
              disabled={disabled}
              justify="flex-start"
              leftSection={<ZoneLayoutPresetIcon patch={preset.patch} />}
              radius={8}
              size="xs"
              type="button"
              variant="light"
              onClick={() => onChange(preset.patch)}
            >
              {preset.label}
            </Button>
          ))}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <NumberInput
            allowDecimal
            allowNegative={false}
            disabled={disabled}
            label="Left"
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
            label="Top"
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
            label="Width"
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
            label="Height"
            max={100}
            min={1}
            suffix=" %"
            value={zone.height}
            onChange={(value) => onChange({ height: readFormNumber(value, 1) })}
          />
        </SimpleGrid>
      </Stack>

      <Stack className="zone-controls-group" gap="sm">
        <Text className="zone-controls-group-title">Content</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            disabled={disabled}
            label="Name"
            value={zone.name}
            onChange={(event) => onChange({ name: event.currentTarget.value })}
          />
          <Select
            allowDeselect={false}
            aria-label="Content type"
            data={zoneContentTypeOptions}
            disabled={disabled}
            label="Type"
            value={contentKind}
            onChange={(value) => setContentKind((value ?? "text") as ZoneContentKind)}
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

      <Stack className="zone-controls-group" gap="sm">
        <Text className="zone-controls-group-title">Style</Text>
        {zone.content.type === "text" ? (
          <TextStyleControls
            content={zone.content}
            disabled={disabled}
            projectParameters={projectParameters ?? []}
            onChange={(content) => onContentChange(content)}
          />
        ) : (
          <VisualStyleControls
            content={zone.content}
            disabled={disabled}
            projectParameters={projectParameters ?? []}
            onChange={(content) => onContentChange(content)}
          />
        )}
      </Stack>
    </Stack>
  );
}

function ZoneLayoutPresetIcon({
  patch
}: {
  patch: Pick<LayoutZone, "height" | "width" | "x" | "y">;
}) {
  return (
    <span aria-hidden className="zone-layout-preset-icon">
      <span
        className="zone-layout-preset-icon-area"
        style={{
          height: `${patch.height}%`,
          left: `${patch.x}%`,
          top: `${patch.y}%`,
          width: `${patch.width}%`
        }}
      />
    </span>
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
    <Textarea
      disabled={disabled}
      label="Text content"
      minRows={3}
      value={content.text}
      onChange={(event) => onChange({ ...content, text: event.currentTarget.value })}
    />
  );
}

function TextStyleControls({
  content,
  disabled,
  projectParameters,
  onChange
}: {
  content: TextZoneContent;
  disabled: boolean;
  projectParameters: ProjectParameter[];
  onChange: (content: TextZoneContent) => void;
}) {
  return (
    <Stack gap="sm">
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
        <ProjectColorValueInput
          disabled={disabled}
          label="Text color"
          projectParameters={projectParameters}
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
  return content.visualType === "image" ? (
    <ImageContentControls
      content={content}
      disabled={disabled}
      onChange={onChange}
      onUploadError={onUploadError}
    />
  ) : (
    <IconContentControls content={content} disabled={disabled} onChange={onChange} />
  );
}

function VisualStyleControls({
  content,
  disabled,
  projectParameters,
  onChange
}: {
  content: VisualZoneContent;
  disabled: boolean;
  projectParameters: ProjectParameter[];
  onChange: (content: VisualZoneContent) => void;
}) {
  return (
    <Stack gap="sm">
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
        <Select
          allowDeselect={false}
          data={imageFitOptions}
          disabled={disabled}
          label="Image fit"
          value={content.fit}
          onChange={(value) => onChange({ ...content, fit: (value ?? "contain") as CardImageFit })}
        />
      ) : (
        <Group grow align="flex-start">
          <NumberInput
            allowDecimal={false}
            allowNegative={false}
            disabled={disabled}
            label="Icon size"
            max={96}
            min={8}
            suffix=" px"
            value={content.size}
            onChange={(value) =>
              onChange({ ...content, size: readFormNumber(value, content.size) })
            }
          />
          <ProjectColorValueInput
            disabled={disabled}
            label="Icon color"
            projectParameters={projectParameters}
            swatches={colorSwatchPalette}
            value={content.color}
            onChange={(value) => onChange({ ...content, color: value })}
          />
        </Group>
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
    <Select
      allowDeselect={false}
      data={iconOptions}
      disabled={disabled}
      label="Icon"
      value={content.iconId}
      onChange={(value) => onChange({ ...content, iconId: (value ?? "sword") as CardIconId })}
    />
  );
}

function InteractiveCardPreview({
  disabled,
  fieldValues,
  layout,
  onSelectZone,
  onUpdateZone,
  projectParameters,
  selectedZoneId,
  side
}: {
  disabled: boolean;
  fieldValues: TemplateFieldValues;
  layout: CardLayout;
  projectParameters: ProjectParameter[];
  selectedZoneId: string | null;
  side: CardLayoutSide;
  onSelectZone: (zoneId: string) => void;
  onUpdateZone: (zoneId: string, patch: Partial<LayoutZone>) => void;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewLayout = useMemo(
    () => resolveCardLayout(layout, fieldValues, projectParameters),
    [fieldValues, layout, projectParameters]
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
  projectParameters = [],
  showHeader = true,
  side = "front",
  title = "Final preview"
}: {
  compact?: boolean;
  fieldValues?: TemplateFieldValues;
  layout: CardLayout;
  projectParameters?: ProjectParameter[];
  showHeader?: boolean;
  side?: CardLayoutSide;
  title?: string;
}) {
  const previewLayout = useMemo(
    () => resolveCardLayout(layout, fieldValues, projectParameters),
    [fieldValues, layout, projectParameters]
  );
  const sideLayout = previewLayout.sides[side];

  return (
    <Stack gap="sm">
      {showHeader ? (
        <Group justify="space-between" align="center">
          <Text fw={600}>{title}</Text>
          <Text c="dimmed" size="sm">
            {layout.size.widthMm} x {layout.size.heightMm} mm
          </Text>
        </Group>
      ) : null}
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
    const color = resolveProjectColorValue(content.color, [], "#1f2937");

    return (
      <Text
        className="card-preview-text"
        style={{
          color,
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
  const color = resolveProjectColorValue(content.color, [], "#0f766e");

  return (
    <Box className="card-preview-visual" style={visualPositionStyle}>
      <Icon color={color} size={content.size} />
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
