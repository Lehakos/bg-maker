import type { ProjectObjectNode } from "@bg-maker/shared";
import { Eye, EyeOff } from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import {
  getProjectObjectKindIconClassName,
  getProjectObjectKindLabel
} from "../project-objects/project-object-tree-labels";
import { ProjectObjectKindIcon } from "../project-objects/project-object-tree-ui";
import { InspectorSwitchField, InspectorTextField } from "./inspector-ui";

type ProjectObjectHeaderSectionProps = {
  nameDraft: string;
  selectedObject: ProjectObjectNode;
  showVisibility?: boolean;
  onNameBlur: (value: string) => void;
  onNameChange: (value: string) => void;
  onNameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onVisibilityChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function ProjectObjectHeaderSection({
  nameDraft,
  selectedObject,
  showVisibility = true,
  onNameBlur,
  onNameChange,
  onNameKeyDown,
  onVisibilityChange
}: ProjectObjectHeaderSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ProjectObjectKindIcon
          className={getProjectObjectKindIconClassName(selectedObject.kind)}
          kind={selectedObject.kind}
          size={18}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {getProjectObjectKindLabel(selectedObject.kind)}
          </p>
          <p className="truncate text-[11px] text-slate-500">{selectedObject.id}</p>
        </div>
      </div>

      <InspectorTextField
        label="Name"
        value={nameDraft}
        onBlur={onNameBlur}
        onChange={onNameChange}
        onKeyDown={onNameKeyDown}
      />

      {showVisibility ? (
        <InspectorSwitchField
          checked={selectedObject.visible}
          icon={
            selectedObject.visible ? (
              <Eye className="shrink-0" size={15} />
            ) : (
              <EyeOff className="shrink-0" size={15} />
            )
          }
          label="Visible"
          onChange={onVisibilityChange}
        />
      ) : null}
    </section>
  );
}
