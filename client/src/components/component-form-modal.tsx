import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Checkbox,
  ColorInput,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Tooltip
} from "@mantine/core";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  cardIconIds,
  componentTypes,
  createDefaultCardLayout,
  defaultPieceCustomShape,
  getCardTemplateFields,
  getDefaultCardFieldValues,
  getDefaultPieceFieldValues,
  getPieceTemplateFields,
  getFirstPieceFaceText,
  pieceFormFactors,
  tileShapes,
  type TemplateFieldValue,
  type TemplateFieldValues,
  type TemplateImageFieldValue,
  type CardTemplate,
  type CardTemplateField,
  type ComponentCollection,
  type ComponentCollectionItem,
  type GameComponent,
  type LayoutZone,
  type LayoutZoneContent,
  type PieceAppearance,
  type PieceCustomShape,
  type PieceFormFactor,
  type PieceLayout,
  type PieceLayoutFace,
  type PieceShape,
  type PieceTemplate,
  type TileShape
} from "@bg-maker/shared";
import { componentTypeLabels } from "./component-labels";
import { CardLayoutEditor, CardPreview, ZoneControls } from "./card-layout-editor";
import { createId, createTextContent, createZone } from "./layout-zone-utils";
import { CustomPieceShapeEditor, PiecePreview, PieceShapePicker } from "./piece-preview";
import {
  readNumber,
  useComponentForm,
  type ComponentFormType,
  type ComponentFormSubmitValues,
  type ComponentFormValues
} from "../hooks/use-component-form";
import "./component-form-modal.css";
import "./form-modal.css";
import "./template-editor.css";

export type { ComponentFormSubmitValues } from "../hooks/use-component-form";

type ComponentFormKind = "cardTemplate" | "collection" | "component" | "pieceTemplate";

type ComponentFormModalProps = {
  availableComponents: GameComponent[];
  cardTemplates: CardTemplate[];
  collection?: ComponentCollection;
  component?: GameComponent;
  error?: string | null;
  formKind: ComponentFormKind;
  loading?: boolean;
  mode: "create" | "edit";
  opened: boolean;
  pieceTemplate?: PieceTemplate;
  pieceTemplates: PieceTemplate[];
  template?: CardTemplate;
  onClose: () => void;
  onEditCardTemplate?: (template: CardTemplate) => void;
  onEditPieceTemplate?: (template: PieceTemplate) => void;
  onSubmit: (values: ComponentFormSubmitValues) => void;
};

const componentFormTypeLabels: Record<ComponentFormType, string> = {
  ...componentTypeLabels,
  cardTemplate: "Card template",
  collection: "Collection",
  pieceTemplate: "Piece template"
};

const typeOptions = componentTypes.map((type) => ({
  value: type,
  label: componentTypeLabels[type]
}));
const tileShapeOptions = tileShapes.map((shape) => ({ value: shape, label: titleCase(shape) }));
const pieceFormFactorOptions = pieceFormFactors.map((formFactor) => ({
  value: formFactor,
  label: titleCase(formFactor)
}));

export function ComponentFormModal({
  availableComponents,
  cardTemplates,
  collection,
  component,
  error,
  formKind,
  loading = false,
  mode,
  opened,
  pieceTemplate,
  pieceTemplates,
  template,
  onClose,
  onEditCardTemplate,
  onEditPieceTemplate,
  onSubmit
}: ComponentFormModalProps) {
  const title = getModalTitle(formKind, mode);
  const isWideModal =
    formKind === "cardTemplate" ||
    formKind === "pieceTemplate" ||
    formKind === "collection" ||
    mode === "create";

  return (
    <Modal
      centered
      classNames={{
        body: "app-form-modal-body",
        content: "app-form-modal-content",
        header: "app-form-modal-header"
      }}
      opened={opened}
      onClose={onClose}
      radius={8}
      size={isWideModal ? "xl" : "lg"}
      title={title}
    >
      {opened ? (
        <ComponentFormContent
          key={collection?.id ?? pieceTemplate?.id ?? template?.id ?? component?.id ?? "new"}
          availableComponents={availableComponents}
          cardTemplates={cardTemplates}
          collection={collection}
          component={component}
          error={error}
          formKind={formKind}
          loading={loading}
          mode={mode}
          pieceTemplate={pieceTemplate}
          pieceTemplates={pieceTemplates}
          template={template}
          onClose={onClose}
          onEditCardTemplate={onEditCardTemplate}
          onEditPieceTemplate={onEditPieceTemplate}
          onSubmit={onSubmit}
        />
      ) : null}
    </Modal>
  );
}

function getModalTitle(formKind: ComponentFormKind, mode: "create" | "edit") {
  const prefix = mode === "create" ? "New" : "Edit";

  switch (formKind) {
    case "cardTemplate":
      return `${prefix} card template`;
    case "pieceTemplate":
      return `${prefix} piece template`;
    case "collection":
      return `${prefix} collection`;
    case "component":
      return `${prefix} component`;
  }
}

function getValuesForTypeSelection(
  currentValues: ComponentFormValues,
  value: string,
  cardTemplates: CardTemplate[],
  pieceTemplates: PieceTemplate[]
): ComponentFormValues {
  const nextType = (typeOptions.some((option) => option.value === value) ? value : "card") as
    | "card"
    | "die"
    | "piece"
    | "tile";

  if (nextType === "card") {
    const template = cardTemplates[0];

    return {
      ...currentValues,
      type: "card",
      cardTemplateId: template?.id ?? "",
      cardTemplateName: template?.name ?? "",
      cardFieldValues: template ? getDefaultCardFieldValues(template.layout) : {},
      layout: template?.layout ?? createDefaultCardLayout()
    };
  }

  if (nextType === "piece") {
    const template = pieceTemplates[0];

    return {
      ...currentValues,
      type: "piece",
      pieceTemplateId: template?.id ?? "",
      pieceTemplateName: template?.name ?? "",
      pieceFieldValues: template ? getDefaultPieceFieldValues(template.layout) : {},
      pieceAppearance: template ? { ...template.layout.appearance } : currentValues.pieceAppearance,
      pieceLayout: template?.layout ?? currentValues.pieceLayout
    };
  }

  return {
    ...currentValues,
    type: nextType
  };
}

function ComponentFormContent({
  availableComponents,
  cardTemplates,
  collection,
  component,
  error,
  formKind,
  loading = false,
  mode,
  pieceTemplate,
  pieceTemplates,
  template,
  onClose,
  onEditCardTemplate,
  onEditPieceTemplate,
  onSubmit
}: Omit<ComponentFormModalProps, "opened">) {
  const {
    buildSubmitValues,
    nameIsEmpty,
    removeCollectionItem,
    setDieSides,
    setValues,
    updateCollectionItem,
    values
  } = useComponentForm(
    component,
    cardTemplates,
    pieceTemplates,
    template,
    pieceTemplate,
    collection,
    formKind
  );
  const componentOptions = availableComponents.map((item) => ({
    value: item.id,
    label: `${item.name} (${componentTypeLabels[item.type]})`
  }));
  const isComponentForm = formKind === "component";
  const cardTemplateIsMissing = values.type === "card" && !values.cardTemplateId;
  const pieceTemplateIsMissing = values.type === "piece" && !values.pieceTemplateId;
  const submitDisabled = nameIsEmpty || cardTemplateIsMissing || pieceTemplateIsMissing;

  return (
    <form
      className="app-form-modal-form"
      onSubmit={(event) => {
        event.preventDefault();

        const submitValues = buildSubmitValues(mode);

        if (!submitValues) {
          return;
        }

        onSubmit(submitValues);
      }}
    >
      <Stack className="app-form-modal-scroll" gap="md">
        {error ? (
          <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
            {error}
          </Alert>
        ) : null}

        <Group grow align="flex-start">
          <TextInput
            data-autofocus
            disabled={loading}
            error={nameIsEmpty && values.name.length > 0 ? "Name must not be empty" : undefined}
            label={getNameLabel(formKind)}
            placeholder={getNamePlaceholder(formKind)}
            required
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.currentTarget.value })}
          />
          {formKind === "cardTemplate" || formKind === "pieceTemplate" ? null : mode === "create" &&
            isComponentForm ? (
            <Select
              allowDeselect={false}
              data={typeOptions}
              disabled={loading}
              label="Type"
              value={values.type}
              onChange={(value) =>
                setValues(
                  getValuesForTypeSelection(values, value ?? "card", cardTemplates, pieceTemplates)
                )
              }
            />
          ) : (
            <Stack gap={6}>
              <Text size="sm" fw={500}>
                Type
              </Text>
              <div className="component-form-type-display">
                {componentFormTypeLabels[values.type]}
              </div>
            </Stack>
          )}
        </Group>

        {formKind === "cardTemplate" || formKind === "pieceTemplate" ? null : (
          <Group grow align="flex-start">
            {formKind === "component" ? (
              <NumberInput
                allowDecimal={false}
                allowNegative={false}
                disabled={loading}
                label="Quantity"
                min={1}
                value={values.quantity}
                onChange={(value) => setValues({ ...values, quantity: readNumber(value, 1) })}
              />
            ) : null}
            <TagsInput
              clearable
              disabled={loading}
              label="Tags"
              placeholder="starter, enemy, market"
              splitChars={[","]}
              value={parseTagsText(values.tagsText)}
              onChange={(tags) => setValues({ ...values, tagsText: tags.join(", ") })}
            />
          </Group>
        )}

        {formKind === "cardTemplate" || formKind === "pieceTemplate" ? null : (
          <Textarea
            disabled={loading}
            label="Description"
            minRows={2}
            placeholder="What this item represents"
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.currentTarget.value })}
          />
        )}

        <TypeSpecificFields
          cardTemplates={cardTemplates}
          componentOptions={componentOptions}
          loading={loading}
          pieceTemplates={pieceTemplates}
          removeCollectionItem={removeCollectionItem}
          setDieSides={setDieSides}
          setValues={setValues}
          updateCollectionItem={updateCollectionItem}
          values={values}
          onEditCardTemplate={onEditCardTemplate}
          onEditPieceTemplate={onEditPieceTemplate}
        />

        {formKind === "cardTemplate" || formKind === "pieceTemplate" ? null : (
          <Textarea
            disabled={loading}
            label="Notes"
            minRows={3}
            placeholder="Behavior, balance notes, setup reminders"
            value={values.notes}
            onChange={(event) => setValues({ ...values, notes: event.currentTarget.value })}
          />
        )}
      </Stack>

      <Group className="app-form-modal-footer" justify="flex-end">
        <Button type="button" variant="subtle" color="gray" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} disabled={submitDisabled} radius={8}>
          {mode === "create" ? getCreateButtonLabel(formKind) : "Save changes"}
        </Button>
      </Group>
    </form>
  );
}

function getNameLabel(formKind: ComponentFormKind) {
  switch (formKind) {
    case "cardTemplate":
    case "pieceTemplate":
      return "Template name";
    case "collection":
      return "Collection name";
    case "component":
      return "Name";
  }
}

function getNamePlaceholder(formKind: ComponentFormKind) {
  switch (formKind) {
    case "cardTemplate":
      return "Action card template";
    case "pieceTemplate":
      return "Resource token template";
    case "collection":
      return "Player deck";
    case "component":
      return "Strike card";
  }
}

function getCreateButtonLabel(formKind: ComponentFormKind) {
  switch (formKind) {
    case "cardTemplate":
    case "pieceTemplate":
      return "Create template";
    case "collection":
      return "Create collection";
    case "component":
      return "Create component";
  }
}

function TypeSpecificFields({
  cardTemplates,
  componentOptions,
  loading,
  pieceTemplates,
  removeCollectionItem,
  setDieSides,
  setValues,
  updateCollectionItem,
  values,
  onEditCardTemplate,
  onEditPieceTemplate
}: {
  cardTemplates: CardTemplate[];
  componentOptions: { value: string; label: string }[];
  loading: boolean;
  pieceTemplates: PieceTemplate[];
  removeCollectionItem: (index: number) => void;
  setDieSides: (sides: number) => void;
  setValues: Dispatch<SetStateAction<ComponentFormValues>>;
  updateCollectionItem: (index: number, patch: Partial<ComponentCollectionItem>) => void;
  values: ComponentFormValues;
  onEditCardTemplate?: (template: CardTemplate) => void;
  onEditPieceTemplate?: (template: PieceTemplate) => void;
}) {
  switch (values.type) {
    case "card": {
      const templateOptions = cardTemplates.map((template) => ({
        value: template.id,
        label: template.name
      }));

      return (
        <Stack gap="md">
          <Select
            allowDeselect={false}
            data={templateOptions}
            disabled={loading || templateOptions.length === 0}
            label="Card template"
            placeholder="Create a card template first"
            value={values.cardTemplateId || null}
            onChange={(value) => {
              const template = cardTemplates.find((item) => item.id === value);

              if (!template) {
                setValues({
                  ...values,
                  cardTemplateId: "",
                  cardTemplateName: "",
                  cardFieldValues: {},
                  layout: createDefaultCardLayout()
                });
                return;
              }

              setValues({
                ...values,
                cardTemplateId: template.id,
                cardTemplateName: template.name,
                cardFieldValues: getDefaultCardFieldValues(template.layout),
                layout: template.layout
              });
            }}
          />

          {templateOptions.length === 0 ? (
            <Alert color="yellow" icon={<AlertTriangle size={16} />} radius={8} variant="light">
              Create a card template first, then add cards from that template.
            </Alert>
          ) : (
            <>
              <FieldValueFields
                fields={getCardTemplateFields(values.layout)}
                fieldValues={values.cardFieldValues}
                loading={loading}
                onChange={(fieldValues) => setValues({ ...values, cardFieldValues: fieldValues })}
                onEditTemplate={
                  onEditCardTemplate
                    ? () => {
                        const selectedTemplate = cardTemplates.find(
                          (item) => item.id === values.cardTemplateId
                        );

                        if (selectedTemplate) {
                          onEditCardTemplate(selectedTemplate);
                        }
                      }
                    : undefined
                }
              />
              <CardPreview
                compact
                fieldValues={values.cardFieldValues}
                layout={values.layout}
                title="Final card"
              />
            </>
          )}
        </Stack>
      );
    }

    case "tile":
      return (
        <Stack gap="md">
          <Group grow align="flex-start">
            <Select
              allowDeselect={false}
              data={tileShapeOptions}
              disabled={loading}
              label="Shape"
              value={values.tileShape}
              onChange={(value) => {
                const shape = (value ?? "square") as TileShape;
                setValues({ ...values, tileShape: shape });
              }}
            />
            <ColorInput
              disabled={loading}
              label="Color"
              value={values.tileColor}
              onChange={(value) => setValues({ ...values, tileColor: value })}
            />
          </Group>
          <TextInput
            disabled={loading}
            label="Face label"
            placeholder="Field, city, forest"
            value={values.tileFaceLabel}
            onChange={(event) => setValues({ ...values, tileFaceLabel: event.currentTarget.value })}
          />
          <TextInput
            disabled={loading}
            label="Edge labels"
            placeholder={
              values.tileShape === "square" ? "north, east, south, west" : "n, ne, se, s, sw, nw"
            }
            value={values.tileEdgeLabelsText}
            onChange={(event) =>
              setValues({ ...values, tileEdgeLabelsText: event.currentTarget.value })
            }
          />
        </Stack>
      );

    case "piece": {
      const templateOptions = pieceTemplates.map((template) => ({
        value: template.id,
        label: template.name
      }));

      return (
        <Stack gap="md">
          <Select
            allowDeselect={false}
            data={templateOptions}
            disabled={loading || templateOptions.length === 0}
            label="Piece template"
            placeholder="Create a piece template first"
            value={values.pieceTemplateId || null}
            onChange={(value) => {
              const template = pieceTemplates.find((item) => item.id === value);

              if (!template) {
                setValues({
                  ...values,
                  pieceTemplateId: "",
                  pieceTemplateName: "",
                  pieceFieldValues: {},
                  pieceAppearance: values.pieceAppearance,
                  pieceLayout: values.pieceLayout
                });
                return;
              }

              setValues({
                ...values,
                pieceTemplateId: template.id,
                pieceTemplateName: template.name,
                pieceFieldValues: getDefaultPieceFieldValues(template.layout),
                pieceAppearance: { ...template.layout.appearance },
                pieceLayout: template.layout
              });
            }}
          />

          {templateOptions.length === 0 ? (
            <Alert color="yellow" icon={<AlertTriangle size={16} />} radius={8} variant="light">
              Create a piece template first, then add pieces from that template.
            </Alert>
          ) : (
            <>
              <FieldValueFields
                fields={getPieceTemplateFields(values.pieceLayout)}
                fieldValues={values.pieceFieldValues}
                loading={loading}
                onChange={(fieldValues) => setValues({ ...values, pieceFieldValues: fieldValues })}
                onEditTemplate={
                  onEditPieceTemplate
                    ? () => {
                        const selectedTemplate = pieceTemplates.find(
                          (item) => item.id === values.pieceTemplateId
                        );

                        if (selectedTemplate) {
                          onEditPieceTemplate(selectedTemplate);
                        }
                      }
                    : undefined
                }
              />
              <Stack className="template-editor-section" gap="sm">
                <Text className="template-editor-section-title">Piece color</Text>
                <Group grow align="flex-start">
                  <ColorInput
                    disabled={loading}
                    format="hex"
                    label="Fill color"
                    value={values.pieceAppearance.fillColor}
                    onChange={(fillColor) =>
                      setValues({
                        ...values,
                        pieceAppearance: { ...values.pieceAppearance, fillColor }
                      })
                    }
                  />
                  <ColorInput
                    disabled={loading}
                    format="hex"
                    label="Stroke color"
                    value={values.pieceAppearance.strokeColor}
                    onChange={(strokeColor) =>
                      setValues({
                        ...values,
                        pieceAppearance: { ...values.pieceAppearance, strokeColor }
                      })
                    }
                  />
                </Group>
              </Stack>
              <PiecePreview
                compact
                fieldValues={values.pieceFieldValues}
                layout={getPieceLayoutWithAppearance(values.pieceLayout, values.pieceAppearance)}
                title="Final piece"
              />
            </>
          )}
        </Stack>
      );
    }

    case "die":
      return (
        <NumberInput
          allowDecimal={false}
          allowNegative={false}
          disabled={loading}
          label="Sides"
          max={100}
          min={2}
          value={values.sides}
          onChange={(value) => {
            const sides = readNumber(value, 6);
            setDieSides(sides);
          }}
        />
      );

    case "cardTemplate":
      return (
        <CardLayoutEditor
          disabled={loading}
          layout={values.layout}
          onChange={(layout) => setValues({ ...values, layout })}
        />
      );

    case "pieceTemplate":
      return <PieceTemplateFields loading={loading} setValues={setValues} values={values} />;

    case "collection":
      return (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Items
            </Text>
            <Button
              leftSection={<Plus size={14} />}
              size="xs"
              type="button"
              variant="light"
              disabled={loading || componentOptions.length === 0}
              onClick={() =>
                setValues((currentValues) => ({
                  ...currentValues,
                  collectionItems: [
                    ...currentValues.collectionItems,
                    { componentId: componentOptions[0]?.value ?? "", quantity: 1 }
                  ]
                }))
              }
            >
              Add item
            </Button>
          </Group>
          {values.collectionItems.length === 0 ? (
            <Text c="dimmed" size="sm">
              No items in this collection
            </Text>
          ) : (
            values.collectionItems.map((entry, index) => (
              <Group key={`${entry.componentId}-${index}`} align="flex-end" gap="sm" wrap="nowrap">
                <Select
                  data={componentOptions}
                  disabled={loading}
                  label={index === 0 ? "Component" : undefined}
                  placeholder="Choose component"
                  value={entry.componentId}
                  onChange={(value) => updateCollectionItem(index, { componentId: value ?? "" })}
                />
                <NumberInput
                  allowDecimal={false}
                  allowNegative={false}
                  disabled={loading}
                  label={index === 0 ? "Quantity" : undefined}
                  min={1}
                  w={130}
                  value={entry.quantity}
                  onChange={(value) =>
                    updateCollectionItem(index, { quantity: readNumber(value, 1) })
                  }
                />
                <ActionIcon
                  aria-label="Remove item from collection"
                  color="red"
                  disabled={loading}
                  mb={2}
                  radius={8}
                  variant="subtle"
                  onClick={() => removeCollectionItem(index)}
                >
                  <Trash2 size={16} />
                </ActionIcon>
              </Group>
            ))
          )}
        </Stack>
      );
  }
}

function PieceTemplateFields({
  loading,
  setValues,
  values
}: {
  loading: boolean;
  setValues: Dispatch<SetStateAction<ComponentFormValues>>;
  values: ComponentFormValues;
}) {
  const [selectedFaceId, setSelectedFaceId] = useState(values.pieceLayout.faces[0]?.id ?? "front");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [controlsTab, setControlsTab] = useState<"physical" | "appearance" | "zones">("physical");
  const selectedFace =
    values.pieceLayout.faces.find((face) => face.id === selectedFaceId) ??
    values.pieceLayout.faces[0] ??
    createPieceFace("front", "Front");
  const activeZone =
    selectedZoneId && selectedFace.zones.some((zone) => zone.id === selectedZoneId)
      ? selectedFace.zones.find((zone) => zone.id === selectedZoneId)
      : selectedFace.zones[0];
  const zoneOptions = selectedFace.zones.map((zone) => ({
    value: zone.id,
    label: `${zone.name} (${getZoneContentLabel(zone.content)})`
  }));
  const hasFaceEditor = values.pieceFormFactor !== "solid";

  function updatePieceLayout(updater: (layout: PieceLayout) => PieceLayout) {
    setValues((currentValues) => {
      const layout = updater(currentValues.pieceLayout);

      return {
        ...currentValues,
        ...getPieceFormStateFromLayout(layout)
      };
    });
  }

  function updateFormFactor(formFactor: PieceFormFactor) {
    if (formFactor === "solid") {
      setSelectedFaceId("front");
      setSelectedZoneId(null);
    }

    updatePieceLayout((layout) => ({
      ...layout,
      formFactor,
      sizeMm: {
        ...layout.sizeMm,
        depthMm:
          formFactor === "solid"
            ? Math.max(layout.sizeMm.depthMm, 10)
            : layout.sizeMm.depthMm === 10
              ? 2
              : layout.sizeMm.depthMm
      },
      faces:
        formFactor === "solid"
          ? [layout.faces[0] ?? createPieceFace("front", "Front")]
          : layout.faces.length > 0
            ? layout.faces
            : [createPieceFace("front", "Front")]
    }));
  }

  function updateShape(shape: PieceShape) {
    updatePieceLayout((layout) => ({
      ...layout,
      shape,
      customShape:
        shape === "custom"
          ? cloneCustomShape(layout.customShape ?? defaultPieceCustomShape)
          : undefined
    }));
  }

  function updateTwoSided(twoSided: boolean) {
    if (!twoSided) {
      setSelectedFaceId("front");
      setSelectedZoneId(null);
    }

    updatePieceLayout((layout) => {
      const frontFace = layout.faces[0] ?? createPieceFace("front", "Front");
      const backFace = layout.faces[1] ?? createPieceFace("back", "Back");

      return {
        ...layout,
        faces: twoSided ? [frontFace, backFace] : [frontFace]
      };
    });
  }

  function updateFace(faceId: string, updater: (face: PieceLayoutFace) => PieceLayoutFace) {
    updatePieceLayout((layout) => ({
      ...layout,
      faces: layout.faces.map((face) => (face.id === faceId ? updater(face) : face))
    }));
  }

  function updateZone(zoneId: string, patch: Partial<LayoutZone>) {
    updateFace(selectedFace.id, (face) => ({
      ...face,
      zones: face.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone))
    }));
  }

  function updateZoneContent(zoneId: string, content: LayoutZoneContent) {
    updateZone(zoneId, { content });
  }

  function addZone() {
    const zone = createZone(
      createId(`${selectedFace.id}-zone`),
      "Custom zone",
      0,
      0,
      100,
      20,
      createTextContent("New text")
    );

    updateFace(selectedFace.id, (face) => ({
      ...face,
      zones: [...face.zones, zone]
    }));
    setSelectedZoneId(zone.id);
  }

  function removeZone(zoneId: string) {
    if (selectedFace.zones.length <= 1) {
      return;
    }

    const zones = selectedFace.zones.filter((zone) => zone.id !== zoneId);

    updateFace(selectedFace.id, (face) => ({
      ...face,
      zones
    }));
    setSelectedZoneId(zones[0]?.id ?? null);
  }

  function updateSolidFaceText(text: string) {
    updatePieceLayout((layout) => {
      const frontFace = updateFirstTextZone(
        layout.faces[0] ?? createPieceFace("front", "Front"),
        text
      );

      return {
        ...layout,
        faces: [frontFace]
      };
    });
  }

  return (
    <SimpleGrid className="template-editor-shell" cols={{ base: 1, md: 2 }} spacing="lg">
      <Stack className="template-editor-controls" gap="lg">
        <Tabs
          radius={8}
          value={controlsTab}
          onChange={(value) =>
            setControlsTab((value ?? "physical") as "physical" | "appearance" | "zones")
          }
        >
          <Tabs.List grow>
            <Tabs.Tab value="physical">Physical</Tabs.Tab>
            <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
            <Tabs.Tab value="zones">{hasFaceEditor ? "Zones" : "Label"}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="physical" pt="md">
            <Stack className="template-editor-section" gap="sm">
              <Select
                allowDeselect={false}
                data={pieceFormFactorOptions}
                disabled={loading}
                label="Form factor"
                value={values.pieceFormFactor}
                onChange={(value) => updateFormFactor((value ?? "flat") as PieceFormFactor)}
              />

              <PieceShapePicker
                disabled={loading}
                fillColor={values.pieceLayout.appearance.fillColor}
                strokeColor={values.pieceLayout.appearance.strokeColor}
                value={values.pieceShape}
                onChange={updateShape}
              />

              {values.pieceShape === "custom" ? (
                <CustomPieceShapeEditor
                  customShape={values.pieceLayout.customShape ?? defaultPieceCustomShape}
                  disabled={loading}
                  onChange={(customShape) =>
                    updatePieceLayout((layout) => ({
                      ...layout,
                      customShape
                    }))
                  }
                />
              ) : null}

              <Group grow align="flex-start">
                <NumberInput
                  allowDecimal
                  allowNegative={false}
                  disabled={loading}
                  label="Width"
                  min={1}
                  suffix=" mm"
                  value={values.pieceWidthMm}
                  onChange={(value) =>
                    updatePieceLayout((layout) => ({
                      ...layout,
                      sizeMm: { ...layout.sizeMm, widthMm: readNumber(value, 20) }
                    }))
                  }
                />
                <NumberInput
                  allowDecimal
                  allowNegative={false}
                  disabled={loading}
                  label="Height"
                  min={1}
                  suffix=" mm"
                  value={values.pieceHeightMm}
                  onChange={(value) =>
                    updatePieceLayout((layout) => ({
                      ...layout,
                      sizeMm: { ...layout.sizeMm, heightMm: readNumber(value, 20) }
                    }))
                  }
                />
                <NumberInput
                  allowDecimal
                  allowNegative={false}
                  disabled={loading}
                  label="Depth"
                  min={0}
                  suffix=" mm"
                  value={values.pieceDepthMm}
                  onChange={(value) =>
                    updatePieceLayout((layout) => ({
                      ...layout,
                      sizeMm: { ...layout.sizeMm, depthMm: readNumber(value, 2) }
                    }))
                  }
                />
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="appearance" pt="md">
            <Stack className="template-editor-section" gap="sm">
              <Group grow align="flex-start">
                <ColorInput
                  disabled={loading}
                  format="hex"
                  label="Fill color"
                  swatches={pieceColorSwatches}
                  value={values.pieceLayout.appearance.fillColor}
                  onChange={(fillColor) =>
                    updatePieceLayout((layout) => ({
                      ...layout,
                      appearance: { ...layout.appearance, fillColor }
                    }))
                  }
                />
                <ColorInput
                  disabled={loading}
                  format="hex"
                  label="Stroke color"
                  swatches={pieceColorSwatches}
                  value={values.pieceLayout.appearance.strokeColor}
                  onChange={(strokeColor) =>
                    updatePieceLayout((layout) => ({
                      ...layout,
                      appearance: { ...layout.appearance, strokeColor }
                    }))
                  }
                />
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="zones" pt="md">
            <Stack className="template-editor-section" gap="sm">
              {hasFaceEditor ? (
                <>
                  <Group align="flex-end" wrap="nowrap">
                    <Select
                      allowDeselect={false}
                      data={zoneOptions}
                      disabled={loading || zoneOptions.length === 0}
                      label="Selected zone"
                      value={activeZone?.id ?? null}
                      onChange={(value) => setSelectedZoneId(value)}
                    />
                    <Button
                      disabled={loading}
                      leftSection={<Plus size={14} />}
                      radius={8}
                      type="button"
                      variant="light"
                      onClick={addZone}
                    >
                      Add zone
                    </Button>
                    <Tooltip label="Remove zone" withArrow>
                      <ActionIcon
                        aria-label="Remove zone"
                        color="red"
                        disabled={loading || !activeZone || selectedFace.zones.length <= 1}
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
                      disabled={loading}
                      uploadError={uploadError}
                      zone={activeZone}
                      onChange={(patch) => updateZone(activeZone.id, patch)}
                      onContentChange={(content) => updateZoneContent(activeZone.id, content)}
                      onUploadError={setUploadError}
                    />
                  ) : null}
                </>
              ) : (
                <TextInput
                  disabled={loading}
                  label="Face text"
                  placeholder="Settlement, pawn, resource"
                  value={values.pieceFaceText}
                  onChange={(event) => updateSolidFaceText(event.currentTarget.value)}
                />
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Stack className="template-editor-preview-rail" gap="md">
        <PiecePreview
          interactive
          layout={values.pieceLayout}
          selectedFaceId={selectedFace.id}
          selectedZoneId={activeZone?.id ?? null}
          footerExtra={
            hasFaceEditor ? (
              <Checkbox
                checked={values.pieceTwoSided}
                disabled={loading}
                label="Two-sided (front and back)"
                onChange={(event) => updateTwoSided(event.currentTarget.checked)}
              />
            ) : null
          }
          title="Template preview"
          onSelectedFaceIdChange={(faceId) => {
            setSelectedFaceId(faceId);
            setSelectedZoneId(null);
          }}
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

const pieceColorSwatches = [
  "#f8fafc",
  "#0f766e",
  "#1f2937",
  "#0ea5e9",
  "#9333ea",
  "#dc2626",
  "#f59e0b",
  "#16a34a"
];

function getPieceFormStateFromLayout(layout: PieceLayout): Partial<ComponentFormValues> {
  return {
    pieceLayout: layout,
    pieceFormFactor: layout.formFactor,
    pieceShape: layout.shape,
    pieceWidthMm: layout.sizeMm.widthMm,
    pieceHeightMm: layout.sizeMm.heightMm,
    pieceDepthMm: layout.sizeMm.depthMm,
    pieceTwoSided: layout.formFactor !== "solid" && layout.faces.length > 1,
    pieceFaceText: getFirstPieceFaceText(layout)
  };
}

function getPieceLayoutWithAppearance(
  layout: PieceLayout,
  appearance: PieceAppearance
): PieceLayout {
  return {
    ...layout,
    appearance: { ...layout.appearance, ...appearance }
  };
}

function createPieceFace(id: "back" | "front" | string, name: string): PieceLayoutFace {
  return {
    id,
    name,
    zones: []
  };
}

function updateFirstTextZone(face: PieceLayoutFace, text: string): PieceLayoutFace {
  const firstTextZone = face.zones.find((zone) => zone.content.type === "text");

  if (!firstTextZone) {
    return {
      ...face,
      zones: [
        createZone(`${face.id}-label`, "Label", 0, 0, 100, 100, createTextContent(text)),
        ...face.zones
      ]
    };
  }

  return {
    ...face,
    zones: face.zones.map((zone) =>
      zone.id === firstTextZone.id && zone.content.type === "text"
        ? { ...zone, content: { ...zone.content, text } }
        : zone
    )
  };
}

function cloneCustomShape(customShape: PieceCustomShape): PieceCustomShape {
  return {
    points: customShape.points.map((point) => ({ ...point }))
  };
}

function getZoneContentLabel(content: LayoutZoneContent) {
  return content.type === "text" ? "Text" : titleCase(content.visualType);
}

function FieldValueFields({
  fields,
  fieldValues,
  loading,
  onChange,
  onEditTemplate
}: {
  fields: CardTemplateField[];
  fieldValues: TemplateFieldValues;
  loading: boolean;
  onChange: (values: TemplateFieldValues) => void;
  onEditTemplate?: () => void;
}) {
  if (fields.length === 0) {
    return (
      <div className="component-form-empty-fields">
        <Text c="dimmed" size="sm">
          This template has no per-component fields — every component looks identical.
        </Text>
        {onEditTemplate ? (
          <Anchor component="button" type="button" size="sm" onClick={onEditTemplate}>
            Edit template to add fields
          </Anchor>
        ) : null}
      </div>
    );
  }

  function updateFieldValue(key: string, value: TemplateFieldValue) {
    onChange({
      ...fieldValues,
      [key]: value
    });
  }

  return (
    <Stack gap="sm">
      <Text size="sm" fw={500}>
        Per-component values
      </Text>
      {fields.map((field) => {
        const value = fieldValues[field.key];

        switch (field.type) {
          case "text":
          case "number":
            return (
              <TextInput
                key={field.key}
                disabled={loading}
                label={field.label}
                value={value === undefined ? "" : String(value)}
                onChange={(event) => updateFieldValue(field.key, event.currentTarget.value)}
              />
            );

          case "icon":
            return (
              <Select
                key={field.key}
                allowDeselect={false}
                data={cardIconIds.map((iconId) => ({
                  value: iconId,
                  label: titleCase(iconId)
                }))}
                disabled={loading}
                label={field.label}
                value={typeof value === "string" ? value : "sword"}
                onChange={(nextValue) => updateFieldValue(field.key, nextValue ?? "sword")}
              />
            );

          case "image": {
            const imageValue = isCardImageFieldValue(value) ? value : null;

            return (
              <Stack key={field.key} gap={4}>
                <FileInput
                  accept="image/*"
                  disabled={loading}
                  label={field.label}
                  placeholder={imageValue?.fileName || "Choose image"}
                  onChange={(file) => {
                    if (!file) {
                      return;
                    }

                    void readImageFieldValue(file).then((image) =>
                      updateFieldValue(field.key, image)
                    );
                  }}
                />
                {imageValue ? (
                  <Text c="dimmed" size="xs">
                    {imageValue.fileName}
                  </Text>
                ) : null}
              </Stack>
            );
          }
        }
      })}
    </Stack>
  );
}

function readImageFieldValue(file: File) {
  return new Promise<TemplateImageFieldValue>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read image file"));
        return;
      }

      resolve({
        dataUrl: reader.result,
        fileName: file.name
      });
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function isCardImageFieldValue(value: unknown): value is TemplateImageFieldValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "dataUrl" in value &&
    "fileName" in value &&
    typeof (value as TemplateImageFieldValue).dataUrl === "string" &&
    typeof (value as TemplateImageFieldValue).fileName === "string"
  );
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseTagsText(value: string): string[] {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const part of value.split(",")) {
    const trimmed = part.trim();

    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    tags.push(trimmed);
  }

  return tags;
}
