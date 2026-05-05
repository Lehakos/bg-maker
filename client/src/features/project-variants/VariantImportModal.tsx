import type { ProjectFileNode, ProjectObjectTemplate } from "@bg-maker/shared";
import { Alert, Button, FileInput, Group, Modal, Stack, Textarea } from "@mantine/core";
import { AlertCircle, FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import {
  stickyModalBodyClassName,
  stickyModalFooterClassName,
  stickyModalFormClassName,
  stickyModalStyles
} from "../../components/modal-layout";
import {
  collectProjectImageAssetReferences,
  parseVariantImportTable,
  type ParsedVariantImportRow
} from "./project-variants";

type VariantImportModalProps = {
  fileTree: ProjectFileNode[];
  opened: boolean;
  sourceName: string;
  template: ProjectObjectTemplate;
  onClose: () => void;
  onImport: (rows: ParsedVariantImportRow[]) => void;
};

export function VariantImportModal({
  fileTree,
  opened,
  sourceName,
  template,
  onClose,
  onImport
}: VariantImportModalProps) {
  const [tableText, setTableText] = useState("");
  const [fileError, setFileError] = useState("");
  const imageAssetReferences = useMemo(
    () => collectProjectImageAssetReferences(fileTree),
    [fileTree]
  );
  const hasImageVariables = template.variables.some((variable) => variable.type === "image");
  const parsedTable = useMemo(
    () =>
      parseVariantImportTable({
        imageAssetReferences,
        sourceName,
        table: tableText,
        template
      }),
    [imageAssetReferences, sourceName, tableText, template]
  );
  const rowErrors = parsedTable.rows.flatMap((row) =>
    row.errors.map((error) => `Row ${row.rowNumber}: ${error}`)
  );
  const errors = [...parsedTable.errors, ...rowErrors, ...(fileError ? [fileError] : [])];
  const canImport = tableText.trim() && !errors.length && parsedTable.rows.length > 0;

  async function handleFileChange(file: File | null) {
    setFileError("");

    if (!file) {
      return;
    }

    try {
      setTableText(await file.text());
    } catch {
      setFileError("Could not read the selected file.");
    }
  }

  function handleImport() {
    if (!canImport) {
      return;
    }

    onImport(parsedTable.rows);
  }

  return (
    <Modal
      centered
      opened={opened}
      radius="sm"
      size="xl"
      styles={stickyModalStyles}
      title="Import variants"
      onClose={onClose}
    >
      <div className={stickyModalFormClassName}>
        <div className={stickyModalBodyClassName}>
          <Stack gap="md">
            <FileInput
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              clearable
              label="CSV or TSV file"
              leftSection={<Upload size={16} />}
              onChange={handleFileChange}
            />
            <Textarea
              autosize
              label="Table"
              leftSection={<FileSpreadsheet size={16} />}
              minRows={8}
              value={tableText}
              onChange={(event) => {
                setFileError("");
                setTableText(event.currentTarget.value);
              }}
            />
            {hasImageVariables && imageAssetReferences.length ? (
              <div className="overflow-hidden rounded-md border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-500">
                  Image references
                </div>
                <div className="max-h-40 overflow-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-white text-slate-500">
                      <tr>
                        <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">
                          Path
                        </th>
                        <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">
                          ID
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {imageAssetReferences.map((imageAsset) => (
                        <tr
                          key={imageAsset.id}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="max-w-56 px-2 py-1.5 font-medium text-slate-700">
                            <span className="block truncate" title={imageAsset.path}>
                              {imageAsset.path}
                            </span>
                          </td>
                          <td className="max-w-72 px-2 py-1.5 font-mono text-[11px] text-slate-600">
                            <span className="block truncate" title={imageAsset.id}>
                              {imageAsset.id}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {errors.length ? (
              <Alert color="red" icon={<AlertCircle size={16} />} radius="sm">
                <div className="space-y-1 text-sm">
                  {errors.slice(0, 6).map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                  {errors.length > 6 ? <p>{errors.length - 6} more errors</p> : null}
                </div>
              </Alert>
            ) : null}
            {parsedTable.rows.length ? (
              <div className="overflow-hidden rounded-md border border-slate-200">
                <table className="w-full table-fixed border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="w-16 border-b border-slate-200 px-2 py-1.5 font-semibold">
                        Row
                      </th>
                      <th className="border-b border-slate-200 px-2 py-1.5 font-semibold">
                        Name
                      </th>
                      <th className="w-24 border-b border-slate-200 px-2 py-1.5 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTable.rows.slice(0, 8).map((row) => (
                      <tr key={row.rowNumber} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-1.5 text-slate-500">{row.rowNumber}</td>
                        <td className="truncate px-2 py-1.5 text-slate-800">{row.name}</td>
                        <td
                          className={
                            row.errors.length
                              ? "px-2 py-1.5 font-medium text-red-600"
                              : "px-2 py-1.5 font-medium text-emerald-700"
                          }
                        >
                          {row.errors.length ? "Error" : "Ready"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Stack>
        </div>
        <Group className={stickyModalFooterClassName} justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canImport}
            leftSection={<FileSpreadsheet size={16} />}
            onClick={handleImport}
          >
            Import
          </Button>
        </Group>
      </div>
    </Modal>
  );
}
