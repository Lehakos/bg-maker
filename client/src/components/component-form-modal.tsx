import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
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
  componentTypes,
  componentVisibilities,
  type ComponentType,
  type ComponentVisibility,
  type DeckCardEntry,
  type GameComponent
} from "@bg-maker/shared";
import { componentTypeLabels } from "./component-labels";
import {
  readNumber,
  useComponentForm,
  type ComponentFormSubmitValues,
  type ComponentFormValues
} from "../hooks/use-component-form";

export type { ComponentFormSubmitValues } from "../hooks/use-component-form";

type ComponentFormModalProps = {
  availableCards: GameComponent[];
  component?: GameComponent;
  error?: string | null;
  loading?: boolean;
  mode: "create" | "edit";
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: ComponentFormSubmitValues) => void;
};

const visibilityOptions = componentVisibilities.map((visibility) => ({
  value: visibility,
  label: visibility === "visible" ? "Visible" : "Hidden"
}));

const typeOptions = componentTypes.map((type) => ({
  value: type,
  label: componentTypeLabels[type]
}));

export function ComponentFormModal({
  availableCards,
  component,
  error,
  loading = false,
  mode,
  opened,
  onClose,
  onSubmit
}: ComponentFormModalProps) {
  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      radius={8}
      size="lg"
      title={mode === "create" ? "New component" : "Edit component"}
    >
      {opened ? (
        <ComponentFormContent
          key={component?.id ?? "new"}
          availableCards={availableCards}
          component={component}
          error={error}
          loading={loading}
          mode={mode}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </Modal>
  );
}

function ComponentFormContent({
  availableCards,
  component,
  error,
  loading = false,
  mode,
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
  } = useComponentForm(component);
  const cardOptions = availableCards
    .filter((item) => item.type === "card")
    .map((card) => ({ value: card.id, label: card.name }));

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
            label="Name"
            placeholder="Strike card"
            required
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.currentTarget.value })}
          />
          {mode === "create" ? (
            <Select
              allowDeselect={false}
              data={typeOptions}
              disabled={loading}
              label="Type"
              value={values.type}
              onChange={(value) =>
                setValues({ ...values, type: (value ?? "card") as ComponentType })
              }
            />
          ) : (
            <Stack gap={6}>
              <Text size="sm" fw={500}>
                Type
              </Text>
              <Badge color="teal" radius={8} size="lg" variant="light">
                {componentTypeLabels[values.type]}
              </Badge>
            </Stack>
          )}
        </Group>

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

        <Textarea
          disabled={loading}
          label="Description"
          minRows={2}
          placeholder="What this component represents"
          value={values.description}
          onChange={(event) => setValues({ ...values, description: event.currentTarget.value })}
        />

        <TypeSpecificFields
          cardOptions={cardOptions}
          loading={loading ?? false}
          removeDeckCard={removeDeckCard}
          setDieSides={setDieSides}
          values={values}
          setValues={setValues}
          updateDeckCard={updateDeckCard}
        />

        <Textarea
          disabled={loading}
          label="Notes"
          minRows={3}
          placeholder="Component behavior, balance notes, setup reminders"
          value={values.notes}
          onChange={(event) => setValues({ ...values, notes: event.currentTarget.value })}
        />

        <Group justify="flex-end">
          <Button type="button" variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={nameIsEmpty} radius={8}>
            {mode === "create" ? "Create component" : "Save changes"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function TypeSpecificFields({
  cardOptions,
  loading,
  removeDeckCard,
  setDieSides,
  setValues,
  updateDeckCard,
  values
}: {
  cardOptions: { value: string; label: string }[];
  loading: boolean;
  removeDeckCard: (index: number) => void;
  setDieSides: (sides: number) => void;
  setValues: (values: ComponentFormValues) => void;
  updateDeckCard: (index: number, patch: Partial<DeckCardEntry>) => void;
  values: ComponentFormValues;
}) {
  switch (values.type) {
    case "card":
      return (
        <Stack gap="md">
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
          <Textarea
            disabled={loading}
            label="Front text"
            minRows={3}
            value={values.frontText}
            onChange={(event) => setValues({ ...values, frontText: event.currentTarget.value })}
          />
          <Textarea
            disabled={loading}
            label="Back text"
            minRows={2}
            value={values.backText}
            onChange={(event) => setValues({ ...values, backText: event.currentTarget.value })}
          />
        </Stack>
      );

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
