import {
  getDefaultProjectObjectName,
  projectObjectKinds,
  type ProjectFileKind,
  type ProjectObjectKind
} from "@bg-maker/shared";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "../project-objects/project-object-tree-labels";
import { ProjectObjectKindIcon } from "../project-objects/project-object-tree-ui";

export type ProjectFileCreateType = "folder" | ProjectFileKind;

export type ProjectFileCreateData = {
  name: string;
  objectRootKind?: ProjectObjectKind;
};

type ProjectFileCreateModalProps = {
  opened: boolean;
  type: ProjectFileCreateType;
  onClose: () => void;
  onCreate: (data: ProjectFileCreateData) => void;
};

export function ProjectFileCreateModal({
  opened,
  type,
  onClose,
  onCreate
}: ProjectFileCreateModalProps) {
  const [name, setName] = useState(() => getDefaultCreateName(type));
  const [nameTouched, setNameTouched] = useState(false);
  const [objectRootKind, setObjectRootKind] = useState<ProjectObjectKind>("group");
  const [submitted, setSubmitted] = useState(false);
  const nameIsEmpty = !name.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (nameIsEmpty) {
      return;
    }

    onCreate({
      name,
      objectRootKind: type === "object" ? objectRootKind : undefined
    });
    onClose();
  }

  function handleObjectRootKindChange(kind: ProjectObjectKind) {
    setObjectRootKind(kind);

    if (!nameTouched) {
      setName(getDefaultProjectObjectName(kind));
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={getCreateTitle(type)} centered radius="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {type === "object" ? (
            <ObjectRootKindPicker value={objectRootKind} onChange={handleObjectRootKindChange} />
          ) : null}

          <TextInput
            autoFocus
            label="Name"
            placeholder={
              type === "object"
                ? getDefaultProjectObjectName(objectRootKind)
                : getDefaultCreateName(type)
            }
            value={name}
            error={submitted && nameIsEmpty ? "Enter a name" : undefined}
            onChange={(event) => {
              setNameTouched(true);
              setName(event.currentTarget.value);
            }}
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

type ObjectRootKindPickerProps = {
  value: ProjectObjectKind;
  onChange: (kind: ProjectObjectKind) => void;
};

function ObjectRootKindPicker({ value, onChange }: ObjectRootKindPickerProps) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-900">Root type</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Root object type">
        {projectObjectKinds.map((kind) => {
          const selected = value === kind;
          const label = getProjectObjectKindLabel(kind);

          return (
            <button
              key={kind}
              aria-checked={selected}
              className={cx(
                "flex h-10 items-center gap-2 rounded-md border px-3 text-left text-sm font-medium transition-colors",
                selected
                  ? "border-sky-500 bg-sky-50 text-slate-950 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              )}
              role="radio"
              title={label}
              type="button"
              onClick={() => onChange(kind)}
            >
              <ProjectObjectKindIcon
                className={cx("shrink-0", getProjectObjectKindIconClassName(kind))}
                kind={kind}
                size={16}
              />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getDefaultCreateName(type: ProjectFileCreateType) {
  if (type === "folder") {
    return "New folder";
  }

  if (type === "tableSetup") {
    return "New table setup";
  }

  if (type === "object") {
    return getDefaultProjectObjectName("group");
  }

  return "New item";
}
