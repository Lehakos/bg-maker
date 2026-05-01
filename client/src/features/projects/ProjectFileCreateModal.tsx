import type { ProjectFileKind } from "@bg-maker/shared";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";

export type ProjectFileCreateType = "folder" | ProjectFileKind;

type ProjectFileCreateModalProps = {
  opened: boolean;
  type: ProjectFileCreateType;
  onClose: () => void;
  onCreate: (name: string) => void;
};

export function ProjectFileCreateModal({
  opened,
  type,
  onClose,
  onCreate
}: ProjectFileCreateModalProps) {
  const [name, setName] = useState(() => getDefaultCreateName(type));
  const [submitted, setSubmitted] = useState(false);
  const nameIsEmpty = !name.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (nameIsEmpty) {
      return;
    }

    onCreate(name);
    onClose();
  }

  return (
    <Modal opened={opened} onClose={onClose} title={getCreateTitle(type)} centered radius="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            autoFocus
            label="Name"
            placeholder={getDefaultCreateName(type)}
            value={name}
            error={submitted && nameIsEmpty ? "Enter a name" : undefined}
            onChange={(event) => setName(event.currentTarget.value)}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" leftSection={<Plus size={16} />}>
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function getCreateTitle(type: ProjectFileCreateType) {
  if (type === "folder") {
    return "New folder";
  }

  if (type === "tableSetup") {
    return "New table setup";
  }

  if (type === "object") {
    return "New object";
  }

  return "New item";
}

function getDefaultCreateName(type: ProjectFileCreateType) {
  if (type === "folder") {
    return "New folder";
  }

  if (type === "tableSetup") {
    return "New table setup";
  }

  if (type === "object") {
    return "New object";
  }

  return "New item";
}
