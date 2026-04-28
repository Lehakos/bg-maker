import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput
} from "@mantine/core";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { projectStatuses, type CreateGameProjectInput, type ProjectStatus } from "@bg-maker/shared";

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
  const [values, setValues] = useState<ProjectFormValues>(initialValues ?? defaultValues);
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
