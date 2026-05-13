import { Button, Group } from "@mantine/core";
import type { ReactNode } from "react";
import { stickyModalFooterClassName } from "./modal-layout";

type ModalFooterActionsProps = {
  cancelLabel?: string;
  confirmDisabled?: boolean;
  confirmIcon?: ReactNode;
  confirmLabel: string;
  confirmLoading?: boolean;
  confirmType?: "button" | "submit";
  testId?: string;
  onCancel: () => void;
  onConfirm?: () => void;
};

export function ModalFooterActions({
  cancelLabel = "Cancel",
  confirmDisabled = false,
  confirmIcon,
  confirmLabel,
  confirmLoading = false,
  confirmType = "button",
  testId = "modal-footer-actions",
  onCancel,
  onConfirm
}: ModalFooterActionsProps) {
  return (
    <Group className={stickyModalFooterClassName} data-testid={testId} justify="flex-end" gap="sm">
      <Button data-testid={`${testId}-cancel`} variant="subtle" color="gray" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        data-testid={`${testId}-confirm`}
        disabled={confirmDisabled}
        leftSection={confirmIcon}
        loading={confirmLoading}
        type={confirmType}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </Group>
  );
}
