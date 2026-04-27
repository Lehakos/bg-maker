import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
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
  Edit,
  FileText,
  Layers,
  Trash2,
  Users
} from "lucide-react";
import { type GameProject, type ProjectStatus } from "@bg-maker/shared";
import { deleteProject, getApiErrorMessage, getProject, updateProject } from "../api/client";
import { ProjectFormModal, type ProjectFormValues } from "../components/project-form-modal";
import { getProjectFormValues } from "../components/project-form-values";

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

  const project = projectQuery.data;
  const formValues = useMemo(() => (project ? getProjectFormValues(project) : undefined), [project]);

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
            <EmptyProjectSection
              icon={<Layers size={20} />}
              title="Components"
              description="Cards, decks, tokens, and counters arrive in the next phase."
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
    </Container>
  );
}

function ProjectOverview({ project }: { project: GameProject }) {
  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <ProjectFact label="Players" value={project.players || "-"} />
        <ProjectFact label="Status" value={project.status} />
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
