import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Checkbox,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Tabs,
  TagsInput,
  Text,
  Textarea,
  TextInput
} from "@mantine/core";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  cardIconIds,
  clonePieceCustomShape,
  cloneTileCustomShape,
  collectionTypes,
  collectionTypeAllowsComponent,
  componentTypes,
  createDefaultCardLayout,
  createDefaultTileLayout,
  defaultPieceCustomShape,
  defaultTileCustomShape,
  getCardTemplateFields,
  getDefaultCardFieldValues,
  getDefaultPieceFieldValues,
  getDefaultTileFieldValues,
  getPieceTemplateFields,
  getTileTemplateFields,
  isCardImageFieldValue,
  normalizeIntegerDegrees,
  parseTagsText,
  pieceFormFactors,
  resolveProjectColorValue,
  titleCase,
  type TemplateFieldValue,
  type TemplateFieldValues,
  type TemplateImageFieldValue,
  type CardTemplate,
  type CardTemplateField,
  type ComponentCollection,
  type ComponentCollectionItem,
  type ComponentCollectionType,
  type ComponentType,
  type GameComponent,
  type LayoutZone,
  type PieceAppearance,
  type PieceFormFactor,
  type PieceLayout,
  type PieceLayoutFace,
  type PieceShape,
  type PieceTemplate,
  type TileLayout,
  type TileLayoutSide,
  type ProjectParameter,
  type TileShape,
  type TileTemplate
} from "@bg-maker/shared";
import { collectionTypeLabels, componentTypeLabels } from "./component-labels";
import { CardLayoutEditor, CardPreview, ZoneEditorPanel } from "./card-layout-editor";
import {
  createDefaultLayoutZone,
  createTextContent,
  createZone,
  type ZoneContentKind
} from "./layout-zone-utils";
import { CustomPieceShapeEditor, PiecePreview, PieceShapePicker } from "./piece-preview";
import { ProjectColorValueInput } from "./project-color-value-input";
import { CustomTileShapeEditor, TilePreview, TileShapePicker } from "./tile-preview";
import { useZoneEditor } from "./use-zone-editor";
import {
  getCompatibleCollectionItems,
  getPieceFormStateFromLayout,
  getTileFormStateFromLayout,
  readNumber,
  useComponentForm,
  type ComponentFormType,
  type ComponentFormSubmitValues,
  type ComponentFormValues,
  type TemplateFormType
} from "../hooks/use-component-form";
import "./component-form-modal.css";
import "./form-modal.css";
import "./template-editor.css";

export type { ComponentFormSubmitValues } from "../hooks/use-component-form";

type ComponentFormKind =
  | "cardTemplate"
  | "collection"
  | "component"
  | "pieceTemplate"
  | "tileTemplate";

type ComponentFormModalProps = {
  availableComponents: GameComponent[];
  cardTemplates: CardTemplate[];
  collection?: ComponentCollection;
  component?: GameComponent;
  error?: string | null;
  formKind: ComponentFormKind;
  initialComponentType?: ComponentType;
  loading?: boolean;
  mode: "create" | "edit";
  opened: boolean;
  pieceTemplate?: PieceTemplate;
  pieceTemplates: PieceTemplate[];
  projectParameters: ProjectParameter[];
  template?: CardTemplate;
  tileTemplate?: TileTemplate;
  tileTemplates: TileTemplate[];
  onClose: () => void;
  onEditCardTemplate?: (template: CardTemplate) => void;
  onEditPieceTemplate?: (template: PieceTemplate) => void;
  onEditTileTemplate?: (template: TileTemplate) => void;
  onNewCardTemplate?: () => void;
  onNewPieceTemplate?: () => void;
  onNewTileTemplate?: () => void;
  onSubmit: (values: ComponentFormSubmitValues) => void;
};

const componentFormTypeLabels: Record<ComponentFormType, string> = {
  ...componentTypeLabels,
  cardTemplate: "Card template",
  collection: "Collection",
  pieceTemplate: "Piece template",
  tileTemplate: "Tile template"
};

const typeOptions = componentTypes.map((type) => ({
  value: type,
  label: componentTypeLabels[type]
}));
const templateTypeOptions: { label: string; value: TemplateFormType }[] = [
  { value: "cardTemplate", label: componentFormTypeLabels.cardTemplate },
  { value: "tileTemplate", label: componentFormTypeLabels.tileTemplate },
  { value: "pieceTemplate", label: componentFormTypeLabels.pieceTemplate }
];
const collectionTypeOptions = collectionTypes.map((type) => ({
  value: type,
  label: collectionTypeLabels[type]
}));
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
  initialComponentType,
  loading = false,
  mode,
  opened,
  pieceTemplate,
  pieceTemplates,
  projectParameters,
  template,
  tileTemplate,
  tileTemplates,
  onClose,
  onEditCardTemplate,
  onEditPieceTemplate,
  onEditTileTemplate,
  onNewCardTemplate,
  onNewPieceTemplate,
  onNewTileTemplate,
  onSubmit
}: ComponentFormModalProps) {
  const title = getModalTitle(formKind, mode);
  const isWideModal =
    formKind === "cardTemplate" ||
    formKind === "pieceTemplate" ||
    formKind === "tileTemplate" ||
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
          key={
            collection?.id ??
            pieceTemplate?.id ??
            tileTemplate?.id ??
            template?.id ??
            component?.id ??
            initialComponentType ??
            "new"
          }
          availableComponents={availableComponents}
          cardTemplates={cardTemplates}
          collection={collection}
          component={component}
          error={error}
          formKind={formKind}
          initialComponentType={initialComponentType}
          loading={loading}
          mode={mode}
          pieceTemplate={pieceTemplate}
          pieceTemplates={pieceTemplates}
          projectParameters={projectParameters}
          template={template}
          tileTemplate={tileTemplate}
          tileTemplates={tileTemplates}
          onClose={onClose}
          onEditCardTemplate={onEditCardTemplate}
          onEditPieceTemplate={onEditPieceTemplate}
          onEditTileTemplate={onEditTileTemplate}
          onNewCardTemplate={onNewCardTemplate}
          onNewPieceTemplate={onNewPieceTemplate}
          onNewTileTemplate={onNewTileTemplate}
          onSubmit={onSubmit}
        />
      ) : null}
    </Modal>
  );
}

function getModalTitle(formKind: ComponentFormKind, mode: "create" | "edit") {
  if (mode === "create" && isTemplateFormKind(formKind)) {
    return "New template";
  }

  const prefix = mode === "create" ? "New" : "Edit";

  switch (formKind) {
    case "cardTemplate":
      return `${prefix} card template`;
    case "pieceTemplate":
      return `${prefix} piece template`;
    case "tileTemplate":
      return `${prefix} tile template`;
    case "collection":
      return `${prefix} collection`;
    case "component":
      return `${prefix} component`;
  }
}

function ComponentFormContent({
  availableComponents,
  cardTemplates,
  collection,
  component,
  error,
  formKind,
  initialComponentType,
  loading = false,
  mode,
  pieceTemplate,
  pieceTemplates,
  projectParameters,
  template,
  tileTemplate,
  tileTemplates,
  onClose,
  onEditCardTemplate,
  onEditPieceTemplate,
  onEditTileTemplate,
  onNewCardTemplate,
  onNewPieceTemplate,
  onNewTileTemplate,
  onSubmit
}: Omit<ComponentFormModalProps, "opened">) {
  const {
    buildSubmitValues,
    nameIsEmpty,
    removeCollectionItem,
    selectCollectionType,
    selectType,
    setDieSides,
    setValues,
    updateCollectionItem,
    values
  } = useComponentForm(
    component,
    cardTemplates,
    pieceTemplates,
    tileTemplates,
    template,
    pieceTemplate,
    tileTemplate,
    collection,
    formKind,
    initialComponentType
  );
  const isComponentForm = formKind === "component";
  const isTemplateForm = isTemplateFormKind(formKind);
  const namePlaceholder = isTemplateForm
    ? getTemplateNamePlaceholder(values.type)
    : getNamePlaceholder(formKind);
  const cardTemplateIsMissing = values.type === "card" && !values.cardTemplateId;
  const pieceTemplateIsMissing = values.type === "piece" && !values.pieceTemplateId;
  const tileTemplateIsMissing = values.type === "tile" && !values.tileTemplateId;
  const submitDisabled =
    nameIsEmpty || cardTemplateIsMissing || pieceTemplateIsMissing || tileTemplateIsMissing;

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
            placeholder={namePlaceholder}
            required
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.currentTarget.value })}
          />
          {formKind === "collection" ? (
            <Select
              allowDeselect={false}
              data={collectionTypeOptions}
              disabled={loading}
              label="Collection type"
              value={values.collectionType}
              onChange={(value) => {
                const collectionType = readSelectOptionValue<ComponentCollectionType>(
                  collectionTypeOptions,
                  value,
                  "deck"
                );

                selectCollectionType(
                  collectionType,
                  getCompatibleCollectionItems(
                    values.collectionItems,
                    collectionType,
                    availableComponents
                  )
                );
              }}
            />
          ) : mode === "create" && isComponentForm ? (
            <Select
              allowDeselect={false}
              data={typeOptions}
              disabled={loading}
              label="Type"
              value={values.type}
              onChange={(value) =>
                selectType(readSelectOptionValue<ComponentType>(typeOptions, value, "card"))
              }
            />
          ) : mode === "create" && isTemplateForm ? (
            <Select
              allowDeselect={false}
              data={templateTypeOptions}
              disabled={loading}
              label="Type"
              value={values.type}
              onChange={(value) =>
                selectType(readSelectOptionValue(templateTypeOptions, value, "cardTemplate"))
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

        {isTemplateForm ? null : (
          <Group grow align="flex-start">
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

        {isTemplateForm ? null : (
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
          availableComponents={availableComponents}
          cardTemplates={cardTemplates}
          loading={loading}
          pieceTemplates={pieceTemplates}
          projectParameters={projectParameters}
          removeCollectionItem={removeCollectionItem}
          setDieSides={setDieSides}
          setValues={setValues}
          tileTemplates={tileTemplates}
          updateCollectionItem={updateCollectionItem}
          values={values}
          onEditCardTemplate={onEditCardTemplate}
          onEditPieceTemplate={onEditPieceTemplate}
          onEditTileTemplate={onEditTileTemplate}
          onNewCardTemplate={onNewCardTemplate}
          onNewPieceTemplate={onNewPieceTemplate}
          onNewTileTemplate={onNewTileTemplate}
        />

        {isTemplateForm ? null : (
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
    case "tileTemplate":
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
    case "tileTemplate":
      return "Terrain tile template";
    case "collection":
      return "Player deck";
    case "component":
      return "Strike card";
  }
}

function getTemplateNamePlaceholder(type: ComponentFormType) {
  switch (type) {
    case "cardTemplate":
      return "Action card template";
    case "pieceTemplate":
      return "Resource token template";
    case "tileTemplate":
      return "Terrain tile template";
    default:
      return "Template";
  }
}

function getCreateButtonLabel(formKind: ComponentFormKind) {
  switch (formKind) {
    case "cardTemplate":
    case "pieceTemplate":
    case "tileTemplate":
      return "Create template";
    case "collection":
      return "Create collection";
    case "component":
      return "Create component";
  }
}

function isTemplateFormKind(formKind: ComponentFormKind) {
  return formKind === "cardTemplate" || formKind === "pieceTemplate" || formKind === "tileTemplate";
}

function readSelectOptionValue<T extends string>(
  options: { value: T }[],
  value: string | null,
  fallback: T
) {
  return options.some((option) => option.value === value) ? (value as T) : fallback;
}

function MissingTemplateAlert({
  label,
  onCreateTemplate
}: {
  label: "card" | "piece" | "tile";
  onCreateTemplate?: () => void;
}) {
  const pluralLabel = label === "piece" ? "pieces" : `${label}s`;

  return (
    <Alert color="yellow" icon={<AlertTriangle size={16} />} radius={8} variant="light">
      <Group align="center" justify="space-between" gap="sm">
        <Text size="sm">
          Create a {label} template first, then add {pluralLabel} from that template.
        </Text>
        {onCreateTemplate ? (
          <Button
            leftSection={<Plus size={14} />}
            radius={8}
            size="xs"
            type="button"
            variant="light"
            onClick={onCreateTemplate}
          >
            Create {label} template
          </Button>
        ) : null}
      </Group>
    </Alert>
  );
}

function TypeSpecificFields({
  availableComponents,
  cardTemplates,
  loading,
  pieceTemplates,
  projectParameters,
  removeCollectionItem,
  setDieSides,
  setValues,
  tileTemplates,
  updateCollectionItem,
  values,
  onEditCardTemplate,
  onEditPieceTemplate,
  onEditTileTemplate,
  onNewCardTemplate,
  onNewPieceTemplate,
  onNewTileTemplate
}: {
  availableComponents: GameComponent[];
  cardTemplates: CardTemplate[];
  loading: boolean;
  pieceTemplates: PieceTemplate[];
  projectParameters: ProjectParameter[];
  removeCollectionItem: (index: number) => void;
  setDieSides: (sides: number) => void;
  setValues: Dispatch<SetStateAction<ComponentFormValues>>;
  tileTemplates: TileTemplate[];
  updateCollectionItem: (index: number, patch: Partial<ComponentCollectionItem>) => void;
  values: ComponentFormValues;
  onEditCardTemplate?: (template: CardTemplate) => void;
  onEditPieceTemplate?: (template: PieceTemplate) => void;
  onEditTileTemplate?: (template: TileTemplate) => void;
  onNewCardTemplate?: () => void;
  onNewPieceTemplate?: () => void;
  onNewTileTemplate?: () => void;
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
            <MissingTemplateAlert label="card" onCreateTemplate={onNewCardTemplate} />
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
                projectParameters={projectParameters}
                title="Final card"
              />
            </>
          )}
        </Stack>
      );
    }

    case "tile": {
      const templateOptions = tileTemplates.map((template) => ({
        value: template.id,
        label: template.name
      }));

      return (
        <Stack gap="md">
          <Select
            allowDeselect={false}
            data={templateOptions}
            disabled={loading || templateOptions.length === 0}
            label="Tile template"
            placeholder="Create a tile template first"
            value={values.tileTemplateId || null}
            onChange={(value) => {
              const template = tileTemplates.find((item) => item.id === value);

              if (!template) {
                setValues({
                  ...values,
                  tileTemplateId: "",
                  tileTemplateName: "",
                  tileFieldValues: {},
                  tileLayout: values.tileLayout
                });
                return;
              }

              setValues({
                ...values,
                tileTemplateId: template.id,
                tileTemplateName: template.name,
                tileFieldValues: getDefaultTileFieldValues(template.layout),
                ...getTileFormStateFromLayout(template.layout)
              });
            }}
          />

          {templateOptions.length === 0 ? (
            <MissingTemplateAlert label="tile" onCreateTemplate={onNewTileTemplate} />
          ) : (
            <>
              <FieldValueFields
                fields={getTileTemplateFields(values.tileLayout)}
                fieldValues={values.tileFieldValues}
                loading={loading}
                onChange={(fieldValues) => setValues({ ...values, tileFieldValues: fieldValues })}
                onEditTemplate={
                  onEditTileTemplate
                    ? () => {
                        const selectedTemplate = tileTemplates.find(
                          (item) => item.id === values.tileTemplateId
                        );

                        if (selectedTemplate) {
                          onEditTileTemplate(selectedTemplate);
                        }
                      }
                    : undefined
                }
              />
              <TilePreview
                compact
                fieldValues={values.tileFieldValues}
                layout={values.tileLayout}
                projectParameters={projectParameters}
                title="Final tile"
              />
            </>
          )}
        </Stack>
      );
    }

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
            <MissingTemplateAlert label="piece" onCreateTemplate={onNewPieceTemplate} />
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
                  <ProjectColorValueInput
                    disabled={loading}
                    label="Fill color"
                    projectParameters={projectParameters}
                    value={values.pieceAppearance.fillColor}
                    onChange={(fillColor) =>
                      setValues({
                        ...values,
                        pieceAppearance: { ...values.pieceAppearance, fillColor }
                      })
                    }
                  />
                  <ProjectColorValueInput
                    disabled={loading}
                    label="Stroke color"
                    projectParameters={projectParameters}
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
                projectParameters={projectParameters}
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
          projectParameters={projectParameters}
          onChange={(layout) => setValues({ ...values, layout })}
        />
      );

    case "pieceTemplate":
      return (
        <PieceTemplateFields
          loading={loading}
          projectParameters={projectParameters}
          setValues={setValues}
          values={values}
        />
      );

    case "tileTemplate":
      return (
        <TileTemplateFields
          loading={loading}
          projectParameters={projectParameters}
          setValues={setValues}
          values={values}
        />
      );

    case "collection": {
      const componentOptions = getCollectionComponentOptions(
        availableComponents,
        values.collectionType
      );

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
}

function getCollectionComponentOptions(
  components: GameComponent[],
  collectionType: ComponentCollectionType
) {
  return components
    .filter((component) => collectionTypeAllowsComponent(collectionType, component.type))
    .map((item) => ({
      value: item.id,
      label: `${item.name} (${componentTypeLabels[item.type]})`
    }));
}

function PieceTemplateFields({
  loading,
  projectParameters,
  setValues,
  values
}: {
  loading: boolean;
  projectParameters: ProjectParameter[];
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
  const zoneEditor = useZoneEditor({
    selectedZoneId,
    zones: selectedFace.zones,
    onSelectedZoneIdChange: setSelectedZoneId
  });
  const activeZone = zoneEditor.activeZone;
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
          ? clonePieceCustomShape(layout.customShape ?? defaultPieceCustomShape)
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

  function addZone(kind: ZoneContentKind) {
    const zone = createDefaultLayoutZone(`${selectedFace.id}-zone`, kind);

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
                fillColor={resolveProjectColorValue(
                  values.pieceLayout.appearance.fillColor,
                  projectParameters,
                  "#f8fafc"
                )}
                strokeColor={resolveProjectColorValue(
                  values.pieceLayout.appearance.strokeColor,
                  projectParameters,
                  "#0f766e"
                )}
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
                <ProjectColorValueInput
                  disabled={loading}
                  label="Fill color"
                  projectParameters={projectParameters}
                  swatches={pieceColorSwatches}
                  value={values.pieceLayout.appearance.fillColor}
                  onChange={(fillColor) =>
                    updatePieceLayout((layout) => ({
                      ...layout,
                      appearance: { ...layout.appearance, fillColor }
                    }))
                  }
                />
                <ProjectColorValueInput
                  disabled={loading}
                  label="Stroke color"
                  projectParameters={projectParameters}
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
                <ZoneEditorPanel
                  disabled={loading}
                  editor={zoneEditor}
                  projectParameters={projectParameters}
                  uploadError={uploadError}
                  onAddZone={addZone}
                  onRemoveZone={removeZone}
                  onUpdateZone={updateZone}
                  onUploadError={setUploadError}
                />
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
          projectParameters={projectParameters}
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

function TileTemplateFields({
  loading,
  projectParameters,
  setValues,
  values
}: {
  loading: boolean;
  projectParameters: ProjectParameter[];
  setValues: Dispatch<SetStateAction<ComponentFormValues>>;
  values: ComponentFormValues;
}) {
  const [selectedSideId, setSelectedSideId] = useState<TileLayoutSide>("front");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [controlsTab, setControlsTab] = useState<"physical" | "appearance" | "zones">("physical");
  const selectedSide =
    values.tileLayout.sides[selectedSideId] ??
    values.tileLayout.sides.front ??
    createTileSide(selectedSideId);
  const zoneEditor = useZoneEditor({
    selectedZoneId,
    zones: selectedSide.zones,
    onSelectedZoneIdChange: setSelectedZoneId
  });
  const activeZone = zoneEditor.activeZone;

  function updateTileLayout(updater: (layout: TileLayout) => TileLayout) {
    setValues((currentValues) => {
      const layout = updater(currentValues.tileLayout);

      return {
        ...currentValues,
        ...getTileFormStateFromLayout(layout)
      };
    });
  }

  function updateShape(shape: TileShape) {
    updateTileLayout((layout) => ({
      ...layout,
      shape,
      customShape:
        shape === "custom"
          ? cloneTileCustomShape(layout.customShape ?? defaultTileCustomShape)
          : undefined
    }));
  }

  function updateSide(
    sideId: TileLayoutSide,
    updater: (side: TileLayout["sides"]["front"]) => TileLayout["sides"]["front"]
  ) {
    updateTileLayout((layout) => ({
      ...layout,
      sides: {
        ...layout.sides,
        [sideId]: updater(layout.sides[sideId] ?? createTileSide(sideId))
      }
    }));
  }

  function updateZone(zoneId: string, patch: Partial<LayoutZone>) {
    updateSide(selectedSideId, (side) => ({
      ...side,
      zones: side.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone))
    }));
  }

  function addZone(kind: ZoneContentKind) {
    const zone = createDefaultLayoutZone(`${selectedSideId}-zone`, kind);

    updateSide(selectedSideId, (side) => ({
      ...side,
      zones: [...side.zones, zone]
    }));
    setSelectedZoneId(zone.id);
  }

  function removeZone(zoneId: string) {
    if (selectedSide.zones.length <= 1) {
      return;
    }

    const zones = selectedSide.zones.filter((zone) => zone.id !== zoneId);

    updateSide(selectedSideId, (side) => ({
      ...side,
      zones
    }));
    setSelectedZoneId(zones[0]?.id ?? null);
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
            <Tabs.Tab value="zones">Zones</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="physical" pt="md">
            <Stack className="template-editor-section" gap="sm">
              <TileShapePicker
                disabled={loading}
                fillColor={resolveProjectColorValue(
                  values.tileLayout.appearance.fillColor,
                  projectParameters,
                  "#f8fafc"
                )}
                strokeColor={resolveProjectColorValue(
                  values.tileLayout.appearance.strokeColor,
                  projectParameters,
                  "#0f766e"
                )}
                value={values.tileShape}
                onChange={updateShape}
              />

              {values.tileShape === "custom" ? (
                <CustomTileShapeEditor
                  customShape={values.tileLayout.customShape ?? defaultTileCustomShape}
                  disabled={loading}
                  onChange={(customShape) =>
                    updateTileLayout((layout) => ({
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
                  value={values.tileWidthMm}
                  onChange={(value) =>
                    updateTileLayout((layout) => ({
                      ...layout,
                      sizeMm: { ...layout.sizeMm, widthMm: readNumber(value, 50) }
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
                  value={values.tileHeightMm}
                  onChange={(value) =>
                    updateTileLayout((layout) => ({
                      ...layout,
                      sizeMm: { ...layout.sizeMm, heightMm: readNumber(value, 50) }
                    }))
                  }
                />
              </Group>
              <Stack gap={6}>
                <Text size="sm" fw={500}>
                  Rotation
                </Text>
                <Group align="center" gap="md" wrap="nowrap">
                  <Slider
                    aria-label="Rotation"
                    disabled={loading}
                    label={(value) => `${value} deg`}
                    max={359}
                    min={0}
                    step={1}
                    style={{ flex: 1 }}
                    value={values.tileLayout.rotationDeg}
                    onChange={(rotationDeg) =>
                      updateTileLayout((layout) => ({
                        ...layout,
                        rotationDeg: normalizeIntegerDegrees(rotationDeg)
                      }))
                    }
                  />
                  <NumberInput
                    allowDecimal={false}
                    allowNegative={false}
                    aria-label="Rotation degrees"
                    disabled={loading}
                    max={359}
                    min={0}
                    suffix=" deg"
                    value={values.tileLayout.rotationDeg}
                    w={120}
                    onChange={(value) =>
                      updateTileLayout((layout) => ({
                        ...layout,
                        rotationDeg: normalizeIntegerDegrees(readNumber(value, 0))
                      }))
                    }
                  />
                </Group>
              </Stack>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="appearance" pt="md">
            <Stack className="template-editor-section" gap="sm">
              <Group grow align="flex-start">
                <ProjectColorValueInput
                  disabled={loading}
                  label="Fill color"
                  projectParameters={projectParameters}
                  swatches={tileColorSwatches}
                  value={values.tileLayout.appearance.fillColor}
                  onChange={(fillColor) =>
                    updateTileLayout((layout) => ({
                      ...layout,
                      appearance: { ...layout.appearance, fillColor }
                    }))
                  }
                />
                <ProjectColorValueInput
                  disabled={loading}
                  label="Stroke color"
                  projectParameters={projectParameters}
                  swatches={tileColorSwatches}
                  value={values.tileLayout.appearance.strokeColor}
                  onChange={(strokeColor) =>
                    updateTileLayout((layout) => ({
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
              <ZoneEditorPanel
                disabled={loading}
                editor={zoneEditor}
                projectParameters={projectParameters}
                uploadError={uploadError}
                onAddZone={addZone}
                onRemoveZone={removeZone}
                onUpdateZone={updateZone}
                onUploadError={setUploadError}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Stack className="template-editor-preview-rail" gap="md">
        <TilePreview
          interactive
          layout={values.tileLayout}
          projectParameters={projectParameters}
          selectedSideId={selectedSideId}
          selectedZoneId={activeZone?.id ?? null}
          title="Template preview"
          onSelectedSideIdChange={(sideId) => {
            setSelectedSideId(sideId);
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

const tileColorSwatches = [
  "#f8fafc",
  "#e2e8f0",
  "#0f766e",
  "#1f2937",
  "#0ea5e9",
  "#9333ea",
  "#dc2626",
  "#f59e0b",
  "#16a34a"
];

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

function createTileSide(side: TileLayoutSide): TileLayout["sides"]["front"] {
  return createDefaultTileLayout().sides[side];
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
