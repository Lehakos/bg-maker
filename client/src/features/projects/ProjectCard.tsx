import type { ProjectSummary } from "@bg-maker/shared";
import { Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { ArrowRight, Clock3, LibraryBig, Rows3, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { formatProjectDate } from "./project-format";

type ProjectCardProps = {
  project: ProjectSummary;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  function openProject() {
    void navigate({
      to: "/projects/$projectId",
      params: { projectId: project.id }
    });
  }

  return (
    <Card className="project-card" padding="lg" radius="sm" withBorder>
      <Stack gap="md" className="project-card-content">
        <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
          <Stack gap={4} className="project-card-title">
            <Title order={3}>{project.name}</Title>
            <Group gap={6} c="dimmed">
              <Clock3 size={14} />
              <Text size="sm">Обновлен {formatProjectDate(project.updatedAt)}</Text>
            </Group>
          </Stack>
          <Badge color="teal" variant="light" radius="sm">
            Project
          </Badge>
        </Group>

        <Text className="project-card-description" c="dimmed" size="sm">
          {project.description || "Описание пока не добавлено"}
        </Text>

        <Group gap="xs" className="project-card-stats">
          <Badge leftSection={<Rows3 size={12} />} color="gray" variant="outline" radius="sm">
            {project.tableSetupsCount} setups
          </Badge>
          <Badge leftSection={<LibraryBig size={12} />} color="gray" variant="outline" radius="sm">
            {project.objectsCount} objects
          </Badge>
          <Badge leftSection={<Sparkles size={12} />} color="gray" variant="outline" radius="sm">
            {project.playtestsCount} playtests
          </Badge>
        </Group>

        <Button
          className="project-card-action"
          variant="light"
          rightSection={<ArrowRight size={16} />}
          onClick={openProject}
        >
          Открыть
        </Button>
      </Stack>
    </Card>
  );
}
