import { AppShell, Button, Group, ThemeIcon, Title } from "@mantine/core";
import { Link, Outlet } from "@tanstack/react-router";
import { APP_NAME } from "@bg-maker/shared";
import { Boxes, Plus } from "lucide-react";

export function RootLayout() {
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
            <Link to="/" className="nav-link">
              Workspace
            </Link>
            <Button leftSection={<Plus size={16} />} radius={8}>
              New prototype
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
