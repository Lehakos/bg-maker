import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
  Title
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Edit,
  FileText,
  Layers,
  Plus,
  Trash2,
  Users
} from "lucide-react";
import {
  componentTypes,
  type CardTemplate,
  type ComponentType,
  type GameComponent,
  type GameProject,
  type ProjectStatus
} from "@bg-maker/shared";
import { deleteProject, getApiErrorMessage, getProject, updateProject } from "../api/client";
import { ComponentFormModal } from "../components/component-form-modal";
import { componentTypeLabels } from "../components/component-labels";
import { ProjectFormModal, type ProjectFormValues } from "../components/project-form-modal";
import { getProjectFormValues } from "../components/project-form-values";
import { useProjectComponents } from "../hooks/use-project-components";

const statusColors: Record<ProjectStatus, string> = {
  draft: "gray",
  testing: "yellow",
  ready: "teal"
};

export function ProjectDetailRoute() {
  const params = useParams({ strict: false });
  const projectId = String(params.projectId ?? "");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editModalOpened, { close: closeEditModal, open: openEditModal }] = useDisclosure(false);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: projectId.length > 0,
    retry: false
  });

  const updateProjectMutation = useMutation({
    mutationFn: (values: ProjectFormValues) => updateProject(projectId, values),
    onSuccess: async (project) => {
      queryClient.setQueryData(["project", projectId], project);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeEditModal();
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      void navigate({ to: "/" });
    }
  });

  const componentCatalog = useProjectComponents(projectId);

  const project = projectQuery.data;
  const formValues = useMemo(
    () => (project ? getProjectFormValues(project) : undefined),
    [project]
  );

  if (projectQuery.isLoading) {
    return (
      <Container size="lg" py="xl">
        <Text c="dimmed" ta="center">
          Loading project
        </Text>
      </Container>
    );
  }

  if (projectQuery.isError || !project) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Button
            leftSection={<ArrowLeft size={16} />}
            variant="subtle"
            color="gray"
            onClick={() => void navigate({ to: "/" })}
          >
            Workspace
          </Button>
          <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
            {projectQuery.error ? getApiErrorMessage(projectQuery.error) : "Project not found"}
          </Alert>
        </Stack>
      </Container>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${project.name}"?`)) {
      deleteProjectMutation.mutate();
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={6}>
            <Button
              leftSection={<ArrowLeft size={16} />}
              variant="subtle"
              color="gray"
              px={0}
              onClick={() => void navigate({ to: "/" })}
            >
              Workspace
            </Button>
            <Group gap="sm" align="center">
              <Title order={1}>{project.name}</Title>
              <Badge color={statusColors[project.status]} radius={8}>
                {project.status}
              </Badge>
            </Group>
            <Text c="dimmed">{project.description || "No description"}</Text>
          </Stack>

          <Group gap="sm">
            <Button leftSection={<Edit size={16} />} radius={8} onClick={openEditModal}>
              Edit
            </Button>
            <Button
              color="red"
              leftSection={<Trash2 size={16} />}
              loading={deleteProjectMutation.isPending}
              radius={8}
              variant="light"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Group>
        </Group>

        {deleteProjectMutation.isError ? (
          <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
            {getApiErrorMessage(deleteProjectMutation.error)}
          </Alert>
        ) : null}

        <Tabs defaultValue="overview" radius={8} variant="outline">
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<Activity size={14} />}>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="components" leftSection={<Layers size={14} />}>
              Components
            </Tabs.Tab>
            <Tabs.Tab value="layout" leftSection={<FileText size={14} />}>
              Layout
            </Tabs.Tab>
            <Tabs.Tab value="sessions" leftSection={<Users size={14} />}>
              Sessions
            </Tabs.Tab>
            <Tabs.Tab value="notes" leftSection={<FileText size={14} />}>
              Notes
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            <ProjectOverview project={project} />
          </Tabs.Panel>
          <Tabs.Panel value="components" pt="md">
            <ProjectComponents
              actionError={componentCatalog.actionError}
              cardTemplates={componentCatalog.cardTemplates}
              components={componentCatalog.components}
              deletingCardTemplateId={componentCatalog.deletingCardTemplateId}
              deletingComponentId={componentCatalog.deletingComponentId}
              duplicatingComponentId={componentCatalog.duplicatingComponentId}
              filter={componentCatalog.componentTypeFilter}
              filteredComponents={componentCatalog.filteredComponents}
              loading={componentCatalog.componentsQuery.isLoading}
              queryError={componentCatalog.queryError}
              getComponentDetails={componentCatalog.getComponentDetails}
              onDeleteCardTemplate={componentCatalog.requestDeleteCardTemplate}
              onDeleteComponent={componentCatalog.requestDeleteComponent}
              onDuplicateComponent={componentCatalog.duplicateComponent}
              onEditComponent={componentCatalog.openEditComponent}
              onEditCardTemplate={componentCatalog.openEditCardTemplate}
              onFilterChange={componentCatalog.setComponentTypeFilter}
              onNewCardTemplate={componentCatalog.openNewCardTemplate}
              onNewComponent={componentCatalog.openNewComponent}
            />
          </Tabs.Panel>
          <Tabs.Panel value="layout" pt="md">
            <EmptyProjectSection
              icon={<FileText size={20} />}
              title="Layout"
              description="Table zones and starting setup arrive after project management."
            />
          </Tabs.Panel>
          <Tabs.Panel value="sessions" pt="md">
            <EmptyProjectSection
              icon={<Users size={20} />}
              title="Sessions"
              description="Playable sessions are outside phase one."
            />
          </Tabs.Panel>
          <Tabs.Panel value="notes" pt="md">
            <EmptyProjectSection
              icon={<FileText size={20} />}
              title="Notes"
              description={project.notes || "No notes yet"}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <ProjectFormModal
        opened={editModalOpened}
        mode="edit"
        initialValues={formValues}
        loading={updateProjectMutation.isPending}
        error={updateProjectMutation.error ? getApiErrorMessage(updateProjectMutation.error) : null}
        onClose={() => {
          updateProjectMutation.reset();
          closeEditModal();
        }}
        onSubmit={(values) => updateProjectMutation.mutate(values)}
      />
      <ComponentFormModal
        availableCards={componentCatalog.components}
        cardTemplates={componentCatalog.cardTemplates}
        component={componentCatalog.editingComponent}
        error={componentCatalog.formError}
        loading={componentCatalog.formIsPending}
        mode={
          componentCatalog.componentModal?.mode === "create" ||
          componentCatalog.componentModal?.mode === "createTemplate"
            ? "create"
            : "edit"
        }
        opened={componentCatalog.componentModal !== null}
        template={componentCatalog.editingCardTemplate}
        templateMode={
          componentCatalog.componentModal?.mode === "createTemplate"
            ? "create"
            : componentCatalog.componentModal?.mode === "editTemplate"
              ? "edit"
              : undefined
        }
        onClose={componentCatalog.closeComponentModal}
        onSubmit={componentCatalog.submitComponentForm}
      />
    </Container>
  );
}

function ProjectOverview({ project }: { project: GameProject }) {
  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <ProjectFact label="Players" value={project.players || "-"} />
        <ProjectFact label="Status" value={project.status} />
        <ProjectFact label="Components" value={String(project.componentCount)} />
        <ProjectFact label="Created" value={formatDate(project.createdAt)} />
        <ProjectFact label="Updated" value={formatDate(project.updatedAt)} />
      </SimpleGrid>

      <Paper withBorder radius={8} p="md">
        <Title order={2} size="h3">
          Description
        </Title>
        <Text c={project.description ? undefined : "dimmed"} mt="xs">
          {project.description || "No description"}
        </Text>
      </Paper>

      <Paper withBorder radius={8} p="md">
        <Title order={2} size="h3">
          Working notes
        </Title>
        <Text c={project.notes ? undefined : "dimmed"} mt="xs" style={{ whiteSpace: "pre-wrap" }}>
          {project.notes || "No notes yet"}
        </Text>
      </Paper>
    </Stack>
  );
}

function ProjectComponents({
  actionError,
  cardTemplates,
  components,
  deletingCardTemplateId,
  deletingComponentId,
  duplicatingComponentId,
  filter,
  filteredComponents,
  getComponentDetails,
  loading,
  onDeleteComponent,
  onDeleteCardTemplate,
  onDuplicateComponent,
  onEditComponent,
  onEditCardTemplate,
  onFilterChange,
  onNewCardTemplate,
  onNewComponent,
  queryError
}: {
  actionError: string | null;
  cardTemplates: CardTemplate[];
  components: GameComponent[];
  deletingCardTemplateId: string | null;
  deletingComponentId: string | null;
  duplicatingComponentId: string | null;
  filter: ComponentType | "all";
  filteredComponents: GameComponent[];
  getComponentDetails: (component: GameComponent) => string;
  loading: boolean;
  onDeleteCardTemplate: (template: CardTemplate) => void;
  onDeleteComponent: (component: GameComponent) => void;
  onDuplicateComponent: (component: GameComponent) => void;
  onEditComponent: (component: GameComponent) => void;
  onEditCardTemplate: (template: CardTemplate) => void;
  onFilterChange: (filter: ComponentType | "all") => void;
  onNewCardTemplate: () => void;
  onNewComponent: () => void;
  queryError: string | null;
}) {
  const filterOptions = [
    { value: "all", label: "All types" },
    ...componentTypes.map((type) => ({ value: type, label: componentTypeLabels[type] }))
  ];

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }}>
        {componentTypes.map((type) => (
          <Paper key={type} withBorder radius={8} p="md">
            <Text size="sm" c="dimmed">
              {componentTypeLabels[type]}
            </Text>
            <Title order={3} size="h3" mt={4}>
              {components.filter((component) => component.type === type).length}
            </Title>
          </Paper>
        ))}
      </SimpleGrid>

      {actionError ? (
        <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
          {actionError}
        </Alert>
      ) : null}

      <Paper withBorder radius={8} p="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <ThemeIcon color="blue" variant="light" radius={8}>
                <FileText size={18} />
              </ThemeIcon>
              <Box>
                <Title order={2} size="h3">
                  Card templates
                </Title>
                <Text c="dimmed" size="sm">
                  {cardTemplates.length} total
                </Text>
              </Box>
            </Group>
            <Button leftSection={<Plus size={16} />} radius={8} onClick={onNewCardTemplate}>
              New card template
            </Button>
          </Group>

          <CardTemplateTable
            cardTemplates={cardTemplates}
            deletingCardTemplateId={deletingCardTemplateId}
            onDeleteCardTemplate={onDeleteCardTemplate}
            onEditCardTemplate={onEditCardTemplate}
          />
        </Stack>
      </Paper>

      <Paper withBorder radius={8} p="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <ThemeIcon color="teal" variant="light" radius={8}>
                <Layers size={18} />
              </ThemeIcon>
              <Box>
                <Title order={2} size="h3">
                  Component catalog
                </Title>
                <Text c="dimmed" size="sm">
                  {components.length} total
                </Text>
              </Box>
            </Group>
            <Group gap="sm">
              <Select
                allowDeselect={false}
                aria-label="Filter components by type"
                data={filterOptions}
                value={filter}
                w={170}
                onChange={(value) => onFilterChange((value ?? "all") as ComponentType | "all")}
              />
              <Button leftSection={<Plus size={16} />} radius={8} onClick={onNewComponent}>
                New component
              </Button>
            </Group>
          </Group>

          {queryError ? (
            <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
              {queryError}
            </Alert>
          ) : null}

          <ComponentTable
            components={filteredComponents}
            deletingComponentId={deletingComponentId}
            duplicatingComponentId={duplicatingComponentId}
            getComponentDetails={getComponentDetails}
            loading={loading}
            onDeleteComponent={onDeleteComponent}
            onDuplicateComponent={onDuplicateComponent}
            onEditComponent={onEditComponent}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}

function CardTemplateTable({
  cardTemplates,
  deletingCardTemplateId,
  onDeleteCardTemplate,
  onEditCardTemplate
}: {
  cardTemplates: CardTemplate[];
  deletingCardTemplateId: string | null;
  onDeleteCardTemplate: (template: CardTemplate) => void;
  onEditCardTemplate: (template: CardTemplate) => void;
}) {
  if (cardTemplates.length === 0) {
    return (
      <Text c="dimmed" py="lg" ta="center">
        No card templates yet
      </Text>
    );
  }

  return (
    <Table.ScrollContainer minWidth={640}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Size</Table.Th>
            <Table.Th>Fields</Table.Th>
            <Table.Th>Updated</Table.Th>
            <Table.Th className="component-actions-header" aria-label="Actions" />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {cardTemplates.map((template) => (
            <Table.Tr key={template.id} className="card-template-table-row">
              <Table.Td>
                <Text fw={600}>{template.name}</Text>
              </Table.Td>
              <Table.Td>{formatCardTemplateSize(template)}</Table.Td>
              <Table.Td>
                {template.fields.length > 0
                  ? template.fields.map((field) => field.label).join(", ")
                  : "Static template"}
              </Table.Td>
              <Table.Td>{formatDate(template.updatedAt)}</Table.Td>
              <Table.Td className="component-actions-cell">
                <Group
                  gap={4}
                  justify="flex-end"
                  className="card-template-row-actions"
                  data-testid={`card-template-actions-${template.id}`}
                >
                  <Tooltip label="Edit template" withArrow>
                    <ActionIcon
                      aria-label={`Edit card template ${template.name}`}
                      radius={8}
                      variant="subtle"
                      onClick={() => onEditCardTemplate(template)}
                    >
                      <Edit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete template" withArrow>
                    <ActionIcon
                      aria-label={`Delete card template ${template.name}`}
                      color="red"
                      loading={deletingCardTemplateId === template.id}
                      radius={8}
                      variant="subtle"
                      onClick={() => onDeleteCardTemplate(template)}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function ComponentTable({
  components,
  deletingComponentId,
  duplicatingComponentId,
  getComponentDetails,
  loading,
  onDeleteComponent,
  onDuplicateComponent,
  onEditComponent
}: {
  components: GameComponent[];
  deletingComponentId: string | null;
  duplicatingComponentId: string | null;
  getComponentDetails: (component: GameComponent) => string;
  loading: boolean;
  onDeleteComponent: (component: GameComponent) => void;
  onDuplicateComponent: (component: GameComponent) => void;
  onEditComponent: (component: GameComponent) => void;
}) {
  if (loading) {
    return (
      <Text c="dimmed" py="lg" ta="center">
        Loading components
      </Text>
    );
  }

  if (components.length === 0) {
    return (
      <Text c="dimmed" py="lg" ta="center">
        No components yet
      </Text>
    );
  }

  return (
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Qty</Table.Th>
            <Table.Th>Details</Table.Th>
            <Table.Th>Updated</Table.Th>
            <Table.Th className="component-actions-header" aria-label="Actions" />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {components.map((component) => (
            <Table.Tr key={component.id} className="component-table-row">
              <Table.Td fw={600}>{component.name}</Table.Td>
              <Table.Td>
                <Badge color="teal" radius={8} variant="light">
                  {componentTypeLabels[component.type]}
                </Badge>
              </Table.Td>
              <Table.Td>{component.quantity}</Table.Td>
              <Table.Td>
                <Stack gap={4}>
                  <Text size="sm">{getComponentDetails(component)}</Text>
                  {component.tags.length > 0 ? (
                    <Group gap={4}>
                      {component.tags.map((tag) => (
                        <Badge key={tag} color="gray" radius={8} size="xs" variant="light">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  ) : null}
                </Stack>
              </Table.Td>
              <Table.Td>{formatDate(component.updatedAt)}</Table.Td>
              <Table.Td className="component-actions-cell">
                <Group
                  gap={4}
                  justify="flex-end"
                  className="component-row-actions"
                  data-testid={`component-actions-${component.id}`}
                >
                  <Tooltip label="Edit component" withArrow>
                    <ActionIcon
                      aria-label={`Edit ${component.name}`}
                      radius={8}
                      variant="subtle"
                      onClick={() => onEditComponent(component)}
                    >
                      <Edit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Duplicate component" withArrow>
                    <ActionIcon
                      aria-label={`Duplicate ${component.name}`}
                      loading={duplicatingComponentId === component.id}
                      radius={8}
                      variant="subtle"
                      onClick={() => onDuplicateComponent(component)}
                    >
                      <Copy size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete component" withArrow>
                    <ActionIcon
                      aria-label={`Delete ${component.name}`}
                      color="red"
                      loading={deletingComponentId === component.id}
                      radius={8}
                      variant="subtle"
                      onClick={() => onDeleteComponent(component)}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function ProjectFact({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder radius={8} p="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Title order={3} size="h4" mt={4}>
        {value}
      </Title>
    </Paper>
  );
}

function EmptyProjectSection({
  description,
  icon,
  title
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Paper withBorder radius={8} p="xl">
      <Stack align="center" gap="sm">
        <ThemeIcon color="teal" radius={8} size={44} variant="light">
          {icon}
        </ThemeIcon>
        <Title order={2} size="h3">
          {title}
        </Title>
        <Text c="dimmed" maw={440} ta="center">
          {description}
        </Text>
      </Stack>
    </Paper>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatCardTemplateSize(template: CardTemplate) {
  return `${template.layout.size.widthMm} x ${template.layout.size.heightMm} mm`;
}
