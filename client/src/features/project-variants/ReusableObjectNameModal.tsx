import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { Boxes, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  stickyModalBodyClassName,
  stickyModalFooterClassName,
  stickyModalFormClassName,
  stickyModalStyles
} from "../../components/modal-layout";

type ReusableObjectNameModalProps = {
  initialName: string;
  opened: boolean;
  title?: string;
  onClose: () => void;
  onCreate: (name: string) => void;
};

export function ReusableObjectNameModal({
  initialName,
  opened,
  title = "Reusable object",
  onClose,
  onCreate
}: ReusableObjectNameModalProps) {
  const [name, setName] = useState(initialName);
  const [submitted, setSubmitted] = useState(false);
  const nameIsEmpty = !name.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (nameIsEmpty) {
      return;
    }

    onCreate(name);
  }

  return (
    <Modal
      centered
      opened={opened}
      radius="sm"
      styles={stickyModalStyles}
      title={title}
      onClose={onClose}
    >
      <form className={stickyModalFormClassName} onSubmit={handleSubmit}>
        <div className={stickyModalBodyClassName}>
          <Stack gap="md">
            <TextInput
              autoFocus
              error={submitted && nameIsEmpty ? "Enter a name" : undefined}
              label="Name"
              leftSection={<Boxes size={16} />}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </Stack>
        </div>
        <Group className={stickyModalFooterClassName} justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" leftSection={<Plus size={16} />}>
            Create
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
