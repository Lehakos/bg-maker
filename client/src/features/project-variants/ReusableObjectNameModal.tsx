import { Modal, Stack, TextInput } from "@mantine/core";
import { Boxes, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ModalFooterActions } from "../../components/ModalFooterActions";
import {
  stickyModalBodyClassName,
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
      data-testid="reusable-object-name-modal"
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
        <ModalFooterActions
          confirmIcon={<Plus size={16} />}
          confirmLabel="Create"
          confirmType="submit"
          testId="reusable-object-name-modal-actions"
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}
