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
    <Card className="min-h-[250px] border-[#d9e1dc] bg-white" padding="lg" radius="sm" withBorder>
      <Stack gap="md" className="min-h-full">
        <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
          <Stack gap={4} className="min-w-0">
            <Title order={3} className="text-lg leading-[1.2] tracking-normal">
              {project.name}
            </Title>
            <Group gap={6} c="dimmed">
              <Clock3 size={14} />
              <Text size="sm">Updated {formatProjectDate(project.updatedAt)}</Text>
            </Group>
          </Stack>
          <Badge color="teal" variant="light" radius="sm">
            Project
          </Badge>
        </Group>

        <Text className="min-h-11" c="dimmed" size="sm">
          {project.description || "No description yet"}
        </Text>

        <Group gap="xs" className="min-h-7">
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
          className="mt-auto"
          variant="light"
          rightSection={<ArrowRight size={16} />}
          onClick={openProject}
        >
          Open
        </Button>
      </Stack>
    </Card>
  );
}
