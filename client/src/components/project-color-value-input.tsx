import {
  Box,
  ColorPicker,
  Group,
  Popover,
  Stack,
  TextInput,
  Tooltip,
  UnstyledButton
} from "@mantine/core";
import { useState } from "react";
import {
  getProjectColorParameters,
  resolveProjectColorValue,
  type ProjectColorValue,
  type ProjectParameter
} from "@bg-maker/shared";
import "./project-color-value-input.css";

const colorPickerPopoverWidth = "min(220px, calc(100vw - 48px))";

type ProjectColorValueInputProps = {
  disabled?: boolean;
  fallback?: string;
  label: string;
  projectParameters: ProjectParameter[];
  swatches?: string[];
  value: ProjectColorValue;
  onChange: (value: string) => void;
};

export function ProjectColorValueInput({
  disabled = false,
  fallback = "#0f766e",
  label,
  onChange,
  projectParameters,
  swatches = [],
  value
}: ProjectColorValueInputProps) {
  const colorParameters = getProjectColorParameters(projectParameters);
  const resolvedValue = resolveProjectColorValue(value, projectParameters, fallback);
  const fixedSwatches = uniqueColors(swatches);

  return (
    <FixedColorInput
      disabled={disabled}
      label={label}
      projectParameters={colorParameters}
      swatches={fixedSwatches}
      value={resolvedValue}
      onChange={onChange}
    />
  );
}

function FixedColorInput({
  disabled,
  label,
  onChange,
  projectParameters = [],
  swatches = [],
  value
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  projectParameters?: ProjectParameter[];
  swatches?: string[];
  value: string;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <Popover
      disabled={disabled}
      opened={opened}
      position="bottom-start"
      shadow="md"
      trapFocus={false}
      width={colorPickerPopoverWidth}
      withArrow
      onChange={setOpened}
    >
      <Popover.Target>
        <TextInput
          disabled={disabled}
          label={label}
          leftSection={<Box className="project-color-input-preview" style={{ backgroundColor: value }} />}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onClick={() => setOpened(true)}
          onFocus={() => setOpened(true)}
        />
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <ColorPicker format="hex" fullWidth swatches={swatches} value={value} onChange={onChange} />
          {projectParameters.length > 0 ? (
            <ProjectColorSwatches
              disabled={disabled}
              parameters={projectParameters}
              selectedColor={value}
              onSelect={(parameter) => onChange(parameter.value)}
            />
          ) : null}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function ProjectColorSwatches({
  disabled,
  onSelect,
  parameters,
  selectedColor
}: {
  disabled: boolean;
  onSelect: (parameter: ProjectParameter) => void;
  parameters: ProjectParameter[];
  selectedColor?: string;
}) {
  return (
    <Group className="project-color-reference-swatches" gap={6}>
      {parameters.map((parameter) => {
        const selected = parameter.value.toLowerCase() === selectedColor?.toLowerCase();

        return (
          <Tooltip key={parameter.key} label={`${parameter.label} (${parameter.key})`} withArrow>
            <UnstyledButton
              aria-label={`Use project color ${parameter.label}`}
              className="project-color-reference-swatch"
              data-selected={selected ? "true" : undefined}
              disabled={disabled}
              style={{ backgroundColor: parameter.value }}
              type="button"
              onClick={() => onSelect(parameter)}
            />
          </Tooltip>
        );
      })}
    </Group>
  );
}

function uniqueColors(colors: string[]) {
  return colors.filter((color, index) => color.length > 0 && colors.indexOf(color) === index);
}
