import {
  getDefaultProjectObjectName,
  projectObjectKinds,
  type ProjectFileKind,
  type ProjectObjectKind
} from "@bg-maker/shared";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { Link2, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { getProjectObjectLinkedFileDefaultName } from "../project-objects/project-object-template";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "../project-objects/project-object-tree-labels";
import { ProjectObjectKindIcon } from "../project-objects/project-object-tree-ui";

export type ProjectFileCreateType = "folder" | ProjectFileKind;

export type ProjectFileCreateData = {
  name: string;
  objectRootKind?: ProjectObjectKind;
  sourceObjectFileNodeId?: string;
};

export type ProjectFileCreateObjectSourceOption = {
  id: string;
  name: string;
  propertyCount: number;
  rootKind?: ProjectObjectKind;
};

type ProjectFileCreateModalProps = {
  objectSourceOptions?: readonly ProjectFileCreateObjectSourceOption[];
  opened: boolean;
  type: ProjectFileCreateType;
  onClose: () => void;
  onCreate: (data: ProjectFileCreateData) => void;
};

export function ProjectFileCreateModal({
  objectSourceOptions = [],
  opened,
  type,
  onClose,
  onCreate
}: ProjectFileCreateModalProps) {
  const [name, setName] = useState(() => getDefaultCreateName(type));
  const [nameTouched, setNameTouched] = useState(false);
  const [objectRootKind, setObjectRootKind] = useState<ProjectObjectKind>("group");
  const [sourceObjectFileNodeId, setSourceObjectFileNodeId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameIsEmpty = !name.trim();
  const sourceObjectOption = objectSourceOptions.find(
    (option) => option.id === sourceObjectFileNodeId
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (nameIsEmpty) {
      return;
    }

    onCreate({
      name,
      objectRootKind:
        type === "object" && !sourceObjectFileNodeId ? objectRootKind : undefined,
      sourceObjectFileNodeId:
        type === "object" && sourceObjectFileNodeId ? sourceObjectFileNodeId : undefined
    });
    onClose();
  }

  function handleObjectRootKindChange(kind: ProjectObjectKind) {
    setObjectRootKind(kind);
    setSourceObjectFileNodeId("");

    if (!nameTouched) {
      setName(getDefaultProjectObjectName(kind));
    }
  }

  function handleObjectSourceChange(option: ProjectFileCreateObjectSourceOption) {
    setSourceObjectFileNodeId(option.id);

    if (!nameTouched) {
      setName(getProjectObjectLinkedFileDefaultName(option.name));
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={getCreateTitle(type)} centered radius="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            autoFocus
            label="Name"
            placeholder={
              type === "object"
                ? sourceObjectOption
                  ? getProjectObjectLinkedFileDefaultName(sourceObjectOption.name)
                  : getDefaultProjectObjectName(objectRootKind)
                : getDefaultCreateName(type)
            }
            value={name}
            error={submitted && nameIsEmpty ? "Enter a name" : undefined}
            onChange={(event) => {
              setNameTouched(true);
              setName(event.currentTarget.value);
            }}
          />

          {type === "object" ? (
            <ObjectRootKindPicker
              objectSourceOptions={objectSourceOptions}
              sourceObjectFileNodeId={sourceObjectFileNodeId}
              value={objectRootKind}
              onChange={handleObjectRootKindChange}
              onSourceChange={handleObjectSourceChange}
            />
          ) : null}

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
  objectSourceOptions: readonly ProjectFileCreateObjectSourceOption[];
  sourceObjectFileNodeId: string;
  value: ProjectObjectKind;
  onChange: (kind: ProjectObjectKind) => void;
  onSourceChange: (option: ProjectFileCreateObjectSourceOption) => void;
};

function ObjectRootKindPicker({
  objectSourceOptions,
  sourceObjectFileNodeId,
  value,
  onChange,
  onSourceChange
}: ObjectRootKindPickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-900">Root type</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Root object type">
          {projectObjectKinds.map((kind) => {
            const selected = !sourceObjectFileNodeId && value === kind;
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

      {objectSourceOptions.length ? (
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-900">Custom objects</p>
          <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Custom objects">
            {objectSourceOptions.map((option) => {
              const selected = sourceObjectFileNodeId === option.id;
              const propertyCountLabel = `${option.propertyCount} propert${
                option.propertyCount === 1 ? "y" : "ies"
              }`;

              return (
                <button
                  key={option.id}
                  aria-checked={selected}
                  className={cx(
                    "flex h-11 min-w-0 items-center gap-2 rounded-md border px-3 text-left transition-colors",
                    selected
                      ? "border-sky-500 bg-sky-50 text-slate-950 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.18)]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                  role="radio"
                  title={option.name}
                  type="button"
                  onClick={() => onSourceChange(option)}
                >
                  <Link2 className="shrink-0 text-sky-700" size={16} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{option.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {option.rootKind ? getProjectObjectKindLabel(option.rootKind) : "Object"} -{" "}
                      {propertyCountLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
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
