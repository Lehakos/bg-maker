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
    <Stack className="mx-auto w-full max-w-[1180px] px-3.5 py-5 md:p-7" gap="xl">
      <Group
        className="border-b border-[#d9e1dc] pb-[22px] max-[720px]:items-start"
        justify="space-between"
        align="flex-end"
        gap="lg"
      >
        <Box>
          <Title order={2} className="text-2xl leading-[1.15] tracking-normal md:text-[28px]">
            Projects
          </Title>
          <Text c="dimmed">Choose a project or create a new board game.</Text>
        </Box>
        <Button leftSection={<Plus size={16} />} onClick={openCreate}>
          Create project
        </Button>
      </Group>

      {projects.isLoading ? (
        <Center className="min-h-[420px]" aria-label="Loading projects">
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
        <Center className="min-h-[360px] rounded-lg border border-dashed border-[#b9c8c0] bg-white p-8">
          <Stack align="center" gap="md">
            <Box
              className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#eaf1ed] text-[#24443f]"
              aria-hidden
            >
              <FolderOpen size={34} />
            </Box>
            <Stack align="center" gap={4}>
              <Title order={3} className="text-lg leading-[1.2] tracking-normal">
                No projects yet
              </Title>
              <Text c="dimmed" ta="center">
                Create your first project to open the BG Maker workspace.
              </Text>
            </Stack>
            <Button leftSection={<Plus size={16} />} onClick={openCreate}>
              Create project
            </Button>
          </Stack>
        </Center>
      ) : null}

      <CreateProjectModal opened={createOpened} onClose={closeCreate} />
    </Stack>
  );
}
