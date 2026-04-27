import {
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
  Title
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Activity, Dice5, Layers, Server, Users } from "lucide-react";
import { type GamePrototypeSummary } from "@bg-maker/shared";
import { getHealth, getPrototypes } from "../api/client";

export function DashboardRoute() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: 1
  });

  const prototypesQuery = useQuery({
    queryKey: ["prototypes"],
    queryFn: getPrototypes
  });

  const prototypes = prototypesQuery.data ?? [];

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={1}>Workspace</Title>
            <Text c="dimmed" mt={4}>
              Board game prototypes
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
          <StatCard icon={<Dice5 size={18} />} label="Prototypes" value={prototypes.length} />
          <StatCard icon={<Users size={18} />} label="Playtests" value={4} />
          <StatCard icon={<Layers size={18} />} label="Asset sets" value={7} />
        </SimpleGrid>

        <Paper withBorder radius={8} p="md">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <ThemeIcon color="teal" variant="light" radius={8}>
                <Activity size={18} />
              </ThemeIcon>
              <Title order={2} size="h3">
                Recent prototypes
              </Title>
            </Group>
          </Group>
          <PrototypeTable prototypes={prototypes} />
        </Paper>
      </Stack>
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

function PrototypeTable({ prototypes }: { prototypes: GamePrototypeSummary[] }) {
  return (
    <Table.ScrollContainer minWidth={640}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Players</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Updated</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {prototypes.map((prototype) => (
            <Table.Tr key={prototype.id}>
              <Table.Td fw={600}>{prototype.name}</Table.Td>
              <Table.Td>{prototype.players}</Table.Td>
              <Table.Td>
                <Badge color={prototype.status === "testing" ? "yellow" : "gray"} radius={8}>
                  {prototype.status}
                </Badge>
              </Table.Td>
              <Table.Td>{new Date(prototype.updatedAt).toLocaleDateString()}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
