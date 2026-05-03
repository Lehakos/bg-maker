import { Alert, Button, Group, Modal, Stack, Textarea, TextInput } from "@mantine/core";
import { AlertCircle, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useCreateProject } from "../project-workspace/project-hooks";

type CreateProjectModalProps = {
  opened: boolean;
  onClose: () => void;
};

export function CreateProjectModal({ opened, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const createProject = useCreateProject();
  const nameIsEmpty = !name.trim();

  function closeModal() {
    setSubmitted(false);
    createProject.reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (nameIsEmpty) {
      return;
    }

    try {
      await createProject.mutateAsync({
        name,
        description
      });
    } catch {
      return;
    }

    setName("");
    setDescription("");
    closeModal();
  }

  return (
    <Modal opened={opened} onClose={closeModal} title="New project" centered radius="sm">
      <form onSubmit={(event) => void handleSubmit(event)}>
        <Stack gap="md">
          {createProject.isError ? (
            <Alert color="red" icon={<AlertCircle size={16} />} radius="sm">
              {createProject.error.message}
            </Alert>
          ) : null}

          <TextInput
            autoFocus
            label="Name"
            placeholder="For example, Cosmic Orchard"
            value={name}
            error={submitted && nameIsEmpty ? "Enter a project name" : undefined}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Textarea
            label="Description"
            placeholder="Short note about the prototype"
            minRows={3}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              leftSection={<Plus size={16} />}
              loading={createProject.isPending}
            >
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
