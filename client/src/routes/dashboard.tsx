import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
  Title
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Dice5, Edit, Layers, Server, Trash2, Users } from "lucide-react";
import { type GameProjectSummary, type ProjectStatus } from "@bg-maker/shared";
import {
  deleteProject,
  getApiErrorMessage,
  getHealth,
  getProject,
  getProjects,
  updateProject
} from "../api/client";
import { ProjectFormModal, type ProjectFormValues } from "../components/project-form-modal";
import { getProjectFormValues } from "../components/project-form-values";

const statusColors: Record<ProjectStatus, string> = {
  draft: "gray",
  testing: "yellow",
  ready: "teal"
};

export function DashboardRoute() {
  const queryClient = useQueryClient();
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: 1
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects
  });

  const projects = projectsQuery.data ?? [];
  const componentCount = projects.reduce((total, project) => total + project.componentCount, 0);

  const editingProjectQuery = useQuery({
    queryKey: ["project", editingProjectId],
    queryFn: () => getProject(editingProjectId ?? ""),
    enabled: editingProjectId !== null,
    retry: false
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, values }: { projectId: string; values: ProjectFormValues }) =>
      updateProject(projectId, values),
    onSuccess: async (project) => {
      queryClient.setQueryData(["project", project.id], project);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeProjectEditor();
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async (_result, projectId) => {
      queryClient.removeQueries({ queryKey: ["project", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });

      if (editingProjectId === projectId) {
        closeProjectEditor();
      }
    }
  });

  const editingProjectValues = useMemo(
    () => (editingProjectQuery.data ? getProjectFormValues(editingProjectQuery.data) : undefined),
    [editingProjectQuery.data]
  );
  const editingProjectError = editingProjectQuery.error
    ? getApiErrorMessage(editingProjectQuery.error)
    : updateProjectMutation.error
      ? getApiErrorMessage(updateProjectMutation.error)
      : null;
  const editingProjectIsLoading =
    editingProjectId !== null && !editingProjectQuery.data && editingProjectQuery.isFetching;
  const deletingProjectId = deleteProjectMutation.isPending
    ? deleteProjectMutation.variables
    : null;
  const projectActionIsPending = updateProjectMutation.isPending || deleteProjectMutation.isPending;

  function openProjectEditor(projectId: string) {
    updateProjectMutation.reset();
    setEditingProjectId(projectId);
  }

  function closeProjectEditor() {
    updateProjectMutation.reset();
    setEditingProjectId(null);
  }

  function handleDeleteProject(project: GameProjectSummary) {
    deleteProjectMutation.reset();

    if (window.confirm(`Delete "${project.name}"?`)) {
      deleteProjectMutation.mutate(project.id);
    }
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={1}>Workspace</Title>
            <Text c="dimmed" mt={4}>
              Board game projects
            </Text>
          </Box>
          <Badge
            color={healthQuery.data?.status === "ok" ? "teal" : "gray"}
            leftSection={<Server size={12} />}
            radius={8}
            variant="light"
          >
            API {healthQuery.data?.status ?? "loading"}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <StatCard icon={<Dice5 size={18} />} label="Projects" value={projects.length} />
          <StatCard icon={<Users size={18} />} label="Playtests" value={0} />
          <StatCard icon={<Layers size={18} />} label="Components" value={componentCount} />
        </SimpleGrid>

        <Paper withBorder radius={8} p="md">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <ThemeIcon color="teal" variant="light" radius={8}>
                <Activity size={18} />
              </ThemeIcon>
              <Title order={2} size="h3">
                Recent projects
              </Title>
            </Group>
          </Group>
          <Stack gap="sm">
            {deleteProjectMutation.isError ? (
              <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
                {getApiErrorMessage(deleteProjectMutation.error)}
              </Alert>
            ) : null}
            {projectsQuery.isError ? (
              <Alert color="red" icon={<AlertTriangle size={16} />} radius={8} variant="light">
                {getApiErrorMessage(projectsQuery.error)}
              </Alert>
            ) : (
              <ProjectTable
                loading={projectsQuery.isLoading}
                projects={projects}
                deletingProjectId={deletingProjectId}
                actionDisabled={projectActionIsPending}
                onDeleteProject={handleDeleteProject}
                onEditProject={openProjectEditor}
              />
            )}
          </Stack>
        </Paper>
      </Stack>

      <ProjectFormModal
        opened={editingProjectId !== null}
        mode="edit"
        initialValues={editingProjectValues}
        loading={editingProjectIsLoading || updateProjectMutation.isPending}
        error={editingProjectError}
        onClose={closeProjectEditor}
        onSubmit={(values) => {
          if (editingProjectId) {
            updateProjectMutation.mutate({ projectId: editingProjectId, values });
          }
        }}
      />
    </Container>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Paper withBorder radius={8} p="md">
      <Group justify="space-between">
        <Box>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Title order={2}>{value}</Title>
        </Box>
        <ThemeIcon color="teal" variant="light" radius={8} size={42}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

function ProjectTable({
  actionDisabled,
  deletingProjectId,
  loading,
  onDeleteProject,
  onEditProject,
  projects
}: {
  actionDisabled: boolean;
  deletingProjectId: string | null;
  loading: boolean;
  onDeleteProject: (project: GameProjectSummary) => void;
  onEditProject: (projectId: string) => void;
  projects: GameProjectSummary[];
}) {
  if (loading) {
    return (
      <Text c="dimmed" py="lg" ta="center">
        Loading projects
      </Text>
    );
  }

  if (projects.length === 0) {
    return (
      <Text c="dimmed" py="lg" ta="center">
        No projects yet
      </Text>
    );
  }

  return (
    <Table.ScrollContainer minWidth={640}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Players</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Components</Table.Th>
            <Table.Th>Updated</Table.Th>
            <Table.Th className="project-actions-header" aria-label="Actions" />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {projects.map((project) => (
            <Table.Tr key={project.id} className="project-table-row">
              <Table.Td fw={600}>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="project-link"
                >
                  {project.name}
                </Link>
              </Table.Td>
              <Table.Td>{project.players}</Table.Td>
              <Table.Td>
                <Badge color={statusColors[project.status]} radius={8}>
                  {project.status}
                </Badge>
              </Table.Td>
              <Table.Td>{project.componentCount}</Table.Td>
              <Table.Td>{new Date(project.updatedAt).toLocaleDateString()}</Table.Td>
              <Table.Td className="project-actions-cell">
                <Group
                  gap={4}
                  justify="flex-end"
                  wrap="nowrap"
                  className="project-row-actions"
                  data-testid={`project-actions-${project.id}`}
                >
                  <Tooltip label="Edit project" withArrow>
                    <ActionIcon
                      aria-label={`Edit ${project.name}`}
                      color="teal"
                      radius={8}
                      variant="subtle"
                      disabled={actionDisabled}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onEditProject(project.id);
                      }}
                    >
                      <Edit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete project" withArrow>
                    <ActionIcon
                      aria-label={`Delete ${project.name}`}
                      color="red"
                      radius={8}
                      variant="subtle"
                      loading={deletingProjectId === project.id}
                      disabled={actionDisabled && deletingProjectId !== project.id}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteProject(project);
                      }}
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
