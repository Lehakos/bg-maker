import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title
} from "@mantine/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Boxes, LibraryBig, Rows3, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { formatProjectDate } from "./project-format";
import { useProject } from "./project-hooks";

export function ProjectWorkspacePage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const navigate = useNavigate();
  const project = useProject(projectId);

  function goToProjects() {
    void navigate({ to: "/" });
  }

  if (project.isLoading) {
    return (
      <Center className="project-loading" aria-label="Загрузка проекта">
        <Loader color="teal" />
      </Center>
    );
  }

  if (project.isError) {
    return (
      <Stack className="project-workspace" gap="lg">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<ArrowLeft size={16} />}
          onClick={goToProjects}
        >
          К проектам
        </Button>
        <Alert color="red" icon={<AlertCircle size={16} />} radius="sm">
          {project.error.message}
        </Alert>
      </Stack>
    );
  }

  if (!project.data) {
    return null;
  }

  return (
    <Stack className="project-workspace" gap="xl">
      <Group justify="space-between" align="center" gap="md">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<ArrowLeft size={16} />}
          onClick={goToProjects}
        >
          К проектам
        </Button>
        <Badge color="teal" variant="light" radius="sm">
          Обновлен {formatProjectDate(project.data.updatedAt)}
        </Badge>
      </Group>

      <Box className="workspace-heading">
        <Stack gap="xs">
          <Group gap="sm" align="center">
            <Boxes size={24} />
            <Text c="dimmed" size="sm" fw={700}>
              Project
            </Text>
          </Group>
          <Title order={2}>{project.data.name}</Title>
          {project.data.description ? (
            <Text c="dimmed" maw={760}>
              {project.data.description}
            </Text>
          ) : null}
        </Stack>
      </Box>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <WorkspaceSection
          icon={<Rows3 size={22} />}
          title="Table Setups"
          count={project.data.tableSetupsCount}
          emptyText="Стартовые раскладки появятся здесь."
        />
        <WorkspaceSection
          icon={<LibraryBig size={22} />}
          title="Object Library"
          count={project.data.objectsCount}
          emptyText="Объекты проекта появятся здесь."
        />
        <WorkspaceSection
          icon={<Sparkles size={22} />}
          title="Playtests"
          count={project.data.playtestsCount}
          emptyText="Запуски плейтестов появятся здесь."
        />
      </SimpleGrid>
    </Stack>
  );
}

type WorkspaceSectionProps = {
  icon: ReactNode;
  title: string;
  count: number;
  emptyText: string;
};

function WorkspaceSection({ icon, title, count, emptyText }: WorkspaceSectionProps) {
  return (
    <Box className="workspace-section">
      <Stack gap="md">
        <Group justify="space-between" gap="md">
          <Group gap="sm">
            <Box className="workspace-section-icon" aria-hidden>
              {icon}
            </Box>
            <Title order={3}>{title}</Title>
          </Group>
          <Badge color="gray" variant="outline" radius="sm">
            {count}
          </Badge>
        </Group>
        <Text c="dimmed" size="sm">
          {emptyText}
        </Text>
      </Stack>
    </Box>
  );
}
