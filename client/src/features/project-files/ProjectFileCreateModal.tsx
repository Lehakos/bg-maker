import {
  getDefaultProjectObjectName,
  projectObjectKinds,
  type ProjectFileKind,
  type ProjectObjectKind
} from "@bg-maker/shared";
import { clsx as cx } from "clsx";
import { Modal, Stack, TextInput } from "@mantine/core";
import { Link2, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ModalFooterActions } from "../../components/ModalFooterActions";
import { SelectableSurface } from "../../components/SelectableSurface";
import {
  stickyModalBodyClassName,
  stickyModalFormClassName,
  stickyModalStyles
} from "../../components/modal-layout";
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
      objectRootKind: type === "object" && !sourceObjectFileNodeId ? objectRootKind : undefined,
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
    <Modal
      data-testid="project-file-create-modal"
      opened={opened}
      onClose={onClose}
      title={getCreateTitle(type)}
      centered
      radius="sm"
      styles={stickyModalStyles}
    >
      <form className={stickyModalFormClassName} onSubmit={handleSubmit}>
        <div className={stickyModalBodyClassName}>
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
          </Stack>
        </div>

        <ModalFooterActions
          confirmIcon={<Plus size={16} />}
          confirmLabel="Create"
          confirmType="submit"
          testId="project-file-create-modal-actions"
          onCancel={onClose}
        />
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
              <SelectableSurface
                key={kind}
                aria-checked={selected}
                className={cx(
                  "flex h-10 items-center gap-2 px-3 text-left text-sm font-medium",
                  selected ? "text-slate-950" : "text-slate-700"
                )}
                role="radio"
                selected={selected}
                title={label}
                onClick={() => onChange(kind)}
              >
                <ProjectObjectKindIcon
                  className={cx("shrink-0", getProjectObjectKindIconClassName(kind))}
                  kind={kind}
                  size={16}
                />
                <span className="truncate">{label}</span>
              </SelectableSurface>
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
                <SelectableSurface
                  key={option.id}
                  aria-checked={selected}
                  className={cx(
                    "flex h-11 min-w-0 items-center gap-2 px-3 text-left",
                    selected ? "text-slate-950" : "text-slate-700"
                  )}
                  role="radio"
                  selected={selected}
                  title={option.name}
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
                </SelectableSurface>
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
