import {
  Alert,
  ActionIcon,
  Button,
  ColorInput,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput
} from "@mantine/core";
import { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  createDefaultProjectParameters,
  projectParameterTypes,
  projectStatuses,
  type CreateGameProjectInput,
  type ProjectParameter,
  type ProjectParameterType,
  type ProjectStatus
} from "@bg-maker/shared";
import "./form-modal.css";

export type ProjectFormValues = Required<CreateGameProjectInput>;

type ProjectFormModalProps = {
  opened: boolean;
  mode: "create" | "edit";
  initialValues?: ProjectFormValues;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => void;
};

const defaultValues: ProjectFormValues = {
  name: "",
  description: "",
  players: "1-4",
  parameters: createDefaultProjectParameters(),
  status: "draft",
  notes: ""
};

const statusLabels: Record<ProjectStatus, string> = {
  draft: "Draft",
  testing: "Testing",
  ready: "Ready"
};

const statusOptions = projectStatuses.map((status) => ({
  value: status,
  label: statusLabels[status]
}));

const parameterTypeLabels: Record<ProjectParameterType, string> = {
  color: "Color",
  number: "Number",
  text: "Text"
};

const parameterTypeOptions = projectParameterTypes.map((type) => ({
  value: type,
  label: parameterTypeLabels[type]
}));

export function ProjectFormModal({
  opened,
  mode,
  initialValues,
  loading = false,
  error,
  onClose,
  onSubmit
}: ProjectFormModalProps) {
  const isWaitingForEditValues = mode === "edit" && !initialValues;

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
      size="lg"
      title={mode === "create" ? "New project" : "Edit project"}
    >
      {opened && isWaitingForEditValues ? (
        <div className="app-form-modal-form">
          <Stack className="app-form-modal-scroll" gap="md">
            {error ? (
              <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
                {error}
              </Alert>
            ) : (
              <Text c="dimmed" py="lg" ta="center">
                Loading project
              </Text>
            )}
          </Stack>
          {error ? (
            <Group className="app-form-modal-footer" justify="flex-end">
              <Button type="button" variant="subtle" color="gray" onClick={onClose}>
                Close
              </Button>
            </Group>
          ) : null}
        </div>
      ) : opened ? (
        <ProjectFormContent
          mode={mode}
          initialValues={initialValues}
          loading={loading}
          error={error}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </Modal>
  );
}

function ProjectFormContent({
  mode,
  initialValues,
  loading = false,
  error,
  onClose,
  onSubmit
}: Omit<ProjectFormModalProps, "opened">) {
  const [values, setValues] = useState<ProjectFormValues>(() =>
    cloneProjectFormValues(initialValues ?? defaultValues)
  );
  const nameIsEmpty = values.name.trim().length === 0;

  return (
    <form
      className="app-form-modal-form"
      onSubmit={(event) => {
        event.preventDefault();

        if (nameIsEmpty) {
          return;
        }

        onSubmit({
          name: values.name.trim(),
          description: values.description.trim(),
          players: values.players.trim(),
          parameters: normalizeProjectParameters(values.parameters),
          status: values.status,
          notes: values.notes.trim()
        });
      }}
    >
      <Stack className="app-form-modal-scroll" gap="md">
        {error ? (
          <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
            {error}
          </Alert>
        ) : null}

        <TextInput
          data-autofocus
          label="Name"
          placeholder="Solo Dungeon"
          required
          value={values.name}
          disabled={loading}
          error={nameIsEmpty && values.name.length > 0 ? "Name must not be empty" : undefined}
          onChange={(event) => setValues({ ...values, name: event.currentTarget.value })}
        />

        <Textarea
          label="Description"
          minRows={3}
          placeholder="What this project is testing"
          value={values.description}
          disabled={loading}
          onChange={(event) => setValues({ ...values, description: event.currentTarget.value })}
        />

        <Group grow align="flex-start">
          <TextInput
            label="Players"
            placeholder="1-4"
            value={values.players}
            disabled={loading}
            onChange={(event) => setValues({ ...values, players: event.currentTarget.value })}
          />
          <Select
            allowDeselect={false}
            data={statusOptions}
            label="Status"
            value={values.status}
            disabled={loading}
            onChange={(value) =>
              setValues({ ...values, status: (value ?? "draft") as ProjectStatus })
            }
          />
        </Group>

        <ProjectParametersFields
          loading={loading}
          parameters={values.parameters}
          onChange={(parameters) => setValues({ ...values, parameters })}
        />

        <Textarea
          label="Notes"
          minRows={4}
          placeholder="Working notes, playtest concerns, next edits"
          value={values.notes}
          disabled={loading}
          onChange={(event) => setValues({ ...values, notes: event.currentTarget.value })}
        />
      </Stack>
      <Group className="app-form-modal-footer" justify="flex-end">
        <Button type="button" variant="subtle" color="gray" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} disabled={nameIsEmpty} radius={8}>
          {mode === "create" ? "Create project" : "Save changes"}
        </Button>
      </Group>
    </form>
  );
}

function ProjectParametersFields({
  loading,
  onChange,
  parameters
}: {
  loading: boolean;
  onChange: (parameters: ProjectParameter[]) => void;
  parameters: ProjectParameter[];
}) {
  function updateParameter(index: number, patch: Partial<ProjectParameter>) {
    onChange(
      parameters.map((parameter, parameterIndex) =>
        parameterIndex === index ? normalizeParameterPatch(parameter, patch) : parameter
      )
    );
  }

  function removeParameter(index: number) {
    onChange(parameters.filter((_parameter, parameterIndex) => parameterIndex !== index));
  }

  return (
    <Stack className="project-parameters-section" gap="sm">
      <Group justify="space-between" align="center">
        <Text size="sm" fw={500}>
          Project parameters
        </Text>
        <Button
          disabled={loading}
          leftSection={<Plus size={14} />}
          radius={8}
          size="xs"
          type="button"
          variant="light"
          onClick={() =>
            onChange([
              ...parameters,
              {
                key: createUniqueParameterKey(parameters),
                label: "New color",
                type: "color",
                value: "#0f766e"
              }
            ])
          }
        >
          Add parameter
        </Button>
      </Group>

      {parameters.length === 0 ? (
        <Text c="dimmed" size="sm">
          No project parameters
        </Text>
      ) : (
        <Stack gap="xs">
          {parameters.map((parameter, index) => (
            <div className="project-parameter-row" key={index}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  disabled={loading}
                  label="Label"
                  value={parameter.label}
                  onChange={(event) =>
                    updateParameter(index, { label: event.currentTarget.value })
                  }
                />
                <Select
                  allowDeselect={false}
                  data={parameterTypeOptions}
                  disabled={loading}
                  label="Type"
                  value={parameter.type}
                  onChange={(value) =>
                    updateParameter(index, {
                      type: (value ?? "color") as ProjectParameterType,
                      value: getDefaultParameterValue((value ?? "color") as ProjectParameterType)
                    })
                  }
                />
                <Group align="flex-end" gap="xs" wrap="nowrap">
                  <ParameterValueInput
                    loading={loading}
                    parameter={parameter}
                    onChange={(value) => updateParameter(index, { value })}
                  />
                  <ActionIcon
                    aria-label={`Remove parameter ${parameter.label || parameter.key}`}
                    color="red"
                    disabled={loading}
                    mb={2}
                    radius={8}
                    variant="subtle"
                    onClick={() => removeParameter(index)}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              </SimpleGrid>
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function ParameterValueInput({
  loading,
  onChange,
  parameter
}: {
  loading: boolean;
  onChange: (value: string) => void;
  parameter: ProjectParameter;
}) {
  if (parameter.type === "color") {
    return (
      <ColorInput
        disabled={loading}
        format="hex"
        label="Value"
        value={parameter.value}
        onChange={onChange}
      />
    );
  }

  if (parameter.type === "number") {
    const numericValue = Number.isFinite(Number(parameter.value)) ? Number(parameter.value) : 0;

    return (
      <NumberInput
        allowDecimal
        disabled={loading}
        label="Value"
        value={numericValue}
        onChange={(value) => onChange(String(value ?? 0))}
      />
    );
  }

  return (
    <TextInput
      disabled={loading}
      label="Value"
      value={parameter.value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function normalizeParameterPatch(
  parameter: ProjectParameter,
  patch: Partial<ProjectParameter>
): ProjectParameter {
  const nextType = patch.type ?? parameter.type;

  return {
    ...parameter,
    ...patch,
    key: patch.key ?? parameter.key,
    label: patch.label ?? parameter.label,
    type: nextType,
    value: patch.value ?? parameter.value
  };
}

function normalizeProjectParameters(parameters: ProjectParameter[]) {
  const usedKeys = new Set<string>();

  return parameters.map((parameter, index) => {
    const fallbackKey = `parameter_${index + 1}`;
    const key = createUniqueNormalizedParameterKey(
      parameter.key || parameter.label || fallbackKey,
      usedKeys
    );

    usedKeys.add(key);

    return {
      key,
      label: parameter.label.trim(),
      type: parameter.type,
      value: parameter.value.trim()
    };
  });
}

function cloneProjectFormValues(values: ProjectFormValues): ProjectFormValues {
  return {
    ...values,
    parameters: values.parameters.map((parameter) => ({ ...parameter }))
  };
}

function createUniqueParameterKey(parameters: ProjectParameter[]) {
  const keys = new Set(parameters.map((parameter) => parameter.key));
  return createUniqueNormalizedParameterKey("new_color", keys);
}

function getDefaultParameterValue(type: ProjectParameterType) {
  switch (type) {
    case "color":
      return "#0f766e";
    case "number":
      return "0";
    case "text":
      return "";
  }
}

function normalizeParameterKey(value: string) {
  const key = value
    .trim()
    .replace(/[^a-z0-9_]+/gi, "_")
    .replace(/^_+/, "")
    .toLowerCase();

  if (!key || /^[a-z]/.test(key)) {
    return key;
  }

  return `parameter_${key}`;
}

function createUniqueNormalizedParameterKey(value: string, existingKeys: Set<string>) {
  const baseKey = normalizeParameterKey(value) || "parameter";
  let key = baseKey;
  let index = 2;

  while (existingKeys.has(key)) {
    key = `${baseKey}_${index}`;
    index += 1;
  }

  return key;
}
