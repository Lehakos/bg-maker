import { AppShell, Button, Group, ThemeIcon, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { APP_NAME } from "@bg-maker/shared";
import { ArrowLeft, Boxes, Plus } from "lucide-react";
import { createProject, getApiErrorMessage } from "../api/client";
import { ProjectFormModal } from "../components/project-form-modal";
import "./root.css";

export function RootLayout() {
  const [projectModalOpened, { close: closeProjectModal, open: openProjectModal }] =
    useDisclosure(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeProjectModal();
      void navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
    }
  });

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <ThemeIcon variant="light" color="teal" radius={8} size={36}>
              <Boxes size={20} />
            </ThemeIcon>
            <Title order={3}>{APP_NAME}</Title>
          </Group>
          <Group gap="sm">
            <Link aria-label="Back to workspace" className="site-header-workspace-link" to="/">
              <ArrowLeft size={16} />
              Workspace
            </Link>
            <Button leftSection={<Plus size={16} />} radius={8} onClick={openProjectModal}>
              New project
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
      <ProjectFormModal
        opened={projectModalOpened}
        mode="create"
        loading={createProjectMutation.isPending}
        error={createProjectMutation.error ? getApiErrorMessage(createProjectMutation.error) : null}
        onClose={() => {
          createProjectMutation.reset();
          closeProjectModal();
        }}
        onSubmit={(values) => createProjectMutation.mutate(values)}
      />
    </AppShell>
  );
}
