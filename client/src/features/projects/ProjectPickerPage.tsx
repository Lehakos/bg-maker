import {
  Alert,
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
import { useDisclosure } from "@mantine/hooks";
import { AlertCircle, FolderOpen, Plus } from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "./ProjectCard";
import { useProjects } from "./project-hooks";

export function ProjectPickerPage() {
  const projects = useProjects();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  return (
    <Stack className="project-picker" gap="xl">
      <Group className="project-page-heading" justify="space-between" align="flex-end" gap="lg">
        <Box>
          <Title order={2}>Проекты</Title>
          <Text c="dimmed">Выберите проект или создайте новую настольную игру.</Text>
        </Box>
        <Button leftSection={<Plus size={16} />} onClick={openCreate}>
          Создать проект
        </Button>
      </Group>

      {projects.isLoading ? (
        <Center className="project-loading" aria-label="Загрузка проектов">
          <Loader color="teal" />
        </Center>
      ) : null}

      {projects.isError ? (
        <Alert color="red" icon={<AlertCircle size={16} />} radius="sm">
          {projects.error.message}
        </Alert>
      ) : null}

      {projects.data?.length ? (
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
          {projects.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </SimpleGrid>
      ) : null}

      {projects.data?.length === 0 ? (
        <Center className="empty-projects">
          <Stack align="center" gap="md">
            <Box className="empty-projects-icon" aria-hidden>
              <FolderOpen size={34} />
            </Box>
            <Stack align="center" gap={4}>
              <Title order={3}>Проектов пока нет</Title>
              <Text c="dimmed" ta="center">
                Создайте первый проект, чтобы открыть рабочую среду BG Maker.
              </Text>
            </Stack>
            <Button leftSection={<Plus size={16} />} onClick={openCreate}>
              Создать проект
            </Button>
          </Stack>
        </Center>
      ) : null}

      <CreateProjectModal opened={createOpened} onClose={closeCreate} />
    </Stack>
  );
}
