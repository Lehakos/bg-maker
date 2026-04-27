import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput
} from "@mantine/core";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  cardIconIds,
  componentTypes,
  componentVisibilities,
  createDefaultCardLayout,
  getCardTemplateFields,
  getDefaultCardFieldValues,
  type CardFieldValue,
  type CardImageFieldValue,
  type CardTemplate,
  type ComponentVisibility,
  type DeckCardEntry,
  type GameComponent
} from "@bg-maker/shared";
import { componentTypeLabels } from "./component-labels";
import { CardLayoutEditor } from "./card-layout-editor";
import {
  readNumber,
  useComponentForm,
  type ComponentFormType,
  type ComponentFormSubmitValues,
  type ComponentFormValues
} from "../hooks/use-component-form";

export type { ComponentFormSubmitValues } from "../hooks/use-component-form";

type ComponentFormModalProps = {
  availableCards: GameComponent[];
  cardTemplates: CardTemplate[];
  component?: GameComponent;
  error?: string | null;
  loading?: boolean;
  mode: "create" | "edit";
  opened: boolean;
  template?: CardTemplate;
  templateMode?: "create" | "edit";
  onClose: () => void;
  onSubmit: (values: ComponentFormSubmitValues) => void;
};

const visibilityOptions = componentVisibilities.map((visibility) => ({
  value: visibility,
  label: visibility === "visible" ? "Visible" : "Hidden"
}));

const componentFormTypeLabels: Record<ComponentFormType, string> = {
  ...componentTypeLabels,
  cardTemplate: "Card template"
};

const typeOptions = componentTypes.map((type) => ({ value: type, label: componentTypeLabels[type] }));

export function ComponentFormModal({
  availableCards,
  cardTemplates,
  component,
  error,
  loading = false,
  mode,
  opened,
  template,
  templateMode,
  onClose,
  onSubmit
}: ComponentFormModalProps) {
  const isTemplateModal = templateMode !== undefined;
  const isCardModal = component?.type === "card" || isTemplateModal;
  const title =
    templateMode === "create"
      ? "New card template"
      : templateMode === "edit"
        ? "Edit card template"
        : mode === "create"
          ? "New component"
          : "Edit component";

  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      radius={8}
      size={isCardModal || mode === "create" ? "xl" : "lg"}
      title={title}
    >
      {opened ? (
        <ComponentFormContent
          key={template?.id ?? component?.id ?? "new"}
          availableCards={availableCards}
          cardTemplates={cardTemplates}
          component={component}
          error={error}
          loading={loading}
          mode={mode}
          template={template}
          templateMode={templateMode}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </Modal>
  );
}

function getValuesForTypeSelection(
  currentValues: ComponentFormValues,
  value: string,
  cardTemplates: CardTemplate[]
): ComponentFormValues {
  const nextType = (typeOptions.some((option) => option.value === value) ? value : "card") as
    | "card"
    | "coin"
    | "deck"
    | "die"
    | "marker"
    | "token";

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

  return {
    ...currentValues,
    type: nextType
  };
}

function ComponentFormContent({
  availableCards,
  cardTemplates,
  component,
  error,
  loading = false,
  mode,
  template,
  templateMode,
  onClose,
  onSubmit
}: Omit<ComponentFormModalProps, "opened">) {
  const {
    buildSubmitValues,
    nameIsEmpty,
    removeDeckCard,
    setDieSides,
    setValues,
    updateDeckCard,
    values
  } = useComponentForm(
    component,
    cardTemplates,
    template,
    templateMode !== undefined ? "cardTemplate" : "component"
  );
  const cardOptions = availableCards
    .filter((item) => item.type === "card")
    .map((card) => ({ value: card.id, label: card.name }));
  const isCardTemplateForm = values.type === "cardTemplate";
  const cardTemplateIsMissing = values.type === "card" && !values.cardTemplateId;
  const submitDisabled = nameIsEmpty || cardTemplateIsMissing;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        const submitValues = buildSubmitValues(mode);

        if (!submitValues) {
          return;
        }

        onSubmit(submitValues);
      }}
    >
      <Stack gap="md">
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
            label={isCardTemplateForm ? "Template name" : "Name"}
            placeholder={isCardTemplateForm ? "Action card template" : "Strike card"}
            required
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.currentTarget.value })}
          />
          {mode === "create" && !isCardTemplateForm ? (
            <Select
              allowDeselect={false}
              data={typeOptions}
              disabled={loading}
              label="Type"
              value={values.type}
              onChange={(value) =>
                setValues(getValuesForTypeSelection(values, value ?? "card", cardTemplates))
              }
            />
          ) : (
            <Stack gap={6}>
              <Text size="sm" fw={500}>
                Type
              </Text>
              <Badge color="teal" radius={8} size="lg" variant="light">
                {componentFormTypeLabels[values.type]}
              </Badge>
            </Stack>
          )}
        </Group>

        {isCardTemplateForm ? null : (
          <Group grow align="flex-start">
            <NumberInput
              allowDecimal={false}
              allowNegative={false}
              disabled={loading}
              label="Quantity"
              min={1}
              value={values.quantity}
              onChange={(value) => setValues({ ...values, quantity: readNumber(value, 1) })}
            />
            <TextInput
              disabled={loading}
              label="Tags"
              placeholder="starter, enemy, market"
              value={values.tagsText}
              onChange={(event) => setValues({ ...values, tagsText: event.currentTarget.value })}
            />
          </Group>
        )}

        {isCardTemplateForm ? null : (
          <Textarea
            disabled={loading}
            label="Description"
            minRows={2}
            placeholder="What this component represents"
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.currentTarget.value })}
          />
        )}

        <TypeSpecificFields
          cardOptions={cardOptions}
          cardTemplates={cardTemplates}
          loading={loading ?? false}
          removeDeckCard={removeDeckCard}
          setDieSides={setDieSides}
          values={values}
          setValues={setValues}
          updateDeckCard={updateDeckCard}
        />

        {isCardTemplateForm ? null : (
          <Textarea
            disabled={loading}
            label="Notes"
            minRows={3}
            placeholder="Component behavior, balance notes, setup reminders"
            value={values.notes}
            onChange={(event) => setValues({ ...values, notes: event.currentTarget.value })}
          />
        )}

        <Group justify="flex-end">
          <Button type="button" variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={submitDisabled} radius={8}>
            {mode === "create"
              ? isCardTemplateForm
                ? "Create template"
                : "Create component"
              : "Save changes"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function TypeSpecificFields({
  cardOptions,
  cardTemplates,
  loading,
  removeDeckCard,
  setDieSides,
  setValues,
  updateDeckCard,
  values
}: {
  cardOptions: { value: string; label: string }[];
  cardTemplates: CardTemplate[];
  loading: boolean;
  removeDeckCard: (index: number) => void;
  setDieSides: (sides: number) => void;
  setValues: (values: ComponentFormValues) => void;
  updateDeckCard: (index: number, patch: Partial<DeckCardEntry>) => void;
  values: ComponentFormValues;
}) {
  switch (values.type) {
    case "card": {
      const templateOptions = cardTemplates.map((template) => ({
        value: template.id,
        label: template.name
      }));

      return (
        <Stack gap="md">
          <Group grow align="flex-start">
            <Select
              allowDeselect={false}
              data={visibilityOptions}
              disabled={loading}
              label="Default visibility"
              value={values.defaultVisibility}
              onChange={(value) =>
                setValues({
                  ...values,
                  defaultVisibility: (value ?? "visible") as ComponentVisibility
                })
              }
            />
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
          </Group>

          {templateOptions.length === 0 ? (
            <Alert color="yellow" icon={<AlertTriangle size={16} />} radius={8} variant="light">
              Create a card template first, then add cards from that template.
            </Alert>
          ) : (
            <CardFieldValueFields loading={loading} values={values} setValues={setValues} />
          )}
        </Stack>
      );
    }

    case "cardTemplate": {
      return (
        <Stack gap="md">
          <CardLayoutEditor
            disabled={loading}
            layout={values.layout}
            onChange={(layout) => setValues({ ...values, layout })}
          />
        </Stack>
      );
    }

    case "deck":
      return (
        <Stack gap="md">
          <Group grow align="flex-start">
            <Select
              allowDeselect={false}
              data={visibilityOptions}
              disabled={loading}
              label="Default visibility"
              value={values.defaultVisibility}
              onChange={(value) =>
                setValues({
                  ...values,
                  defaultVisibility: (value ?? "hidden") as ComponentVisibility
                })
              }
            />
            <Checkbox
              checked={values.shuffleOnSetup}
              disabled={loading}
              label="Shuffle on setup"
              mt={30}
              onChange={(event) =>
                setValues({ ...values, shuffleOnSetup: event.currentTarget.checked })
              }
            />
          </Group>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Cards
              </Text>
              <Button
                leftSection={<Plus size={14} />}
                size="xs"
                variant="light"
                disabled={loading || cardOptions.length === 0}
                onClick={() =>
                  setValues({
                    ...values,
                    deckCards: [
                      ...values.deckCards,
                      { cardId: cardOptions[0]?.value ?? "", quantity: 1 }
                    ]
                  })
                }
              >
                Add card
              </Button>
            </Group>
            {values.deckCards.length === 0 ? (
              <Text c="dimmed" size="sm">
                No cards in this deck
              </Text>
            ) : (
              values.deckCards.map((entry, index) => (
                <Group key={`${entry.cardId}-${index}`} align="flex-end" gap="sm" wrap="nowrap">
                  <Select
                    data={cardOptions}
                    disabled={loading}
                    label={index === 0 ? "Card" : undefined}
                    placeholder="Choose card"
                    value={entry.cardId}
                    onChange={(value) => updateDeckCard(index, { cardId: value ?? "" })}
                  />
                  <NumberInput
                    allowDecimal={false}
                    allowNegative={false}
                    disabled={loading}
                    label={index === 0 ? "Card quantity" : undefined}
                    min={1}
                    w={130}
                    value={entry.quantity}
                    onChange={(value) => updateDeckCard(index, { quantity: readNumber(value, 1) })}
                  />
                  <ActionIcon
                    aria-label="Remove card from deck"
                    color="red"
                    disabled={loading}
                    mb={2}
                    radius={8}
                    variant="subtle"
                    onClick={() => removeDeckCard(index)}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              ))
            )}
          </Stack>
        </Stack>
      );

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

    case "coin":
      return (
        <Group grow align="flex-start">
          <TextInput
            disabled={loading}
            label="Heads label"
            value={values.headsLabel}
            onChange={(event) => setValues({ ...values, headsLabel: event.currentTarget.value })}
          />
          <TextInput
            disabled={loading}
            label="Tails label"
            value={values.tailsLabel}
            onChange={(event) => setValues({ ...values, tailsLabel: event.currentTarget.value })}
          />
        </Group>
      );

    case "marker":
      return (
        <Textarea
          disabled={loading}
          label="Usage"
          minRows={3}
          placeholder="Tracks, status marker, first player marker"
          value={values.usage}
          onChange={(event) => setValues({ ...values, usage: event.currentTarget.value })}
        />
      );

    case "token":
      return (
        <Group grow align="flex-start">
          <TextInput
            disabled={loading}
            label="Value label"
            placeholder="1 VP, 5 coins, wound"
            value={values.valueLabel}
            onChange={(event) => setValues({ ...values, valueLabel: event.currentTarget.value })}
          />
          <Checkbox
            checked={values.stackable}
            disabled={loading}
            label="Stackable"
            mt={30}
            onChange={(event) => setValues({ ...values, stackable: event.currentTarget.checked })}
          />
        </Group>
      );
  }
}

function CardFieldValueFields({
  loading,
  setValues,
  values
}: {
  loading: boolean;
  setValues: (values: ComponentFormValues) => void;
  values: ComponentFormValues;
}) {
  const fields = getCardTemplateFields(values.layout);

  if (fields.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No per-card fields in this template
      </Text>
    );
  }

  function updateFieldValue(key: string, value: CardFieldValue) {
    setValues({
      ...values,
      cardFieldValues: {
        ...values.cardFieldValues,
        [key]: value
      }
    });
  }

  return (
    <Stack gap="sm">
      <Text size="sm" fw={500}>
        Per-card values
      </Text>
      {fields.map((field) => {
        const value = values.cardFieldValues[field.key];

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
  return new Promise<CardImageFieldValue>((resolve, reject) => {
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

function isCardImageFieldValue(value: unknown): value is CardImageFieldValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "dataUrl" in value &&
    "fileName" in value &&
    typeof (value as CardImageFieldValue).dataUrl === "string" &&
    typeof (value as CardImageFieldValue).fileName === "string"
  );
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
