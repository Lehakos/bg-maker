import { Box, Group, Text, Title } from "@mantine/core";
import "./app.css";

export function App() {
  return (
    <Box className="app-shell">
      <header className="app-header">
        <Group gap="sm" wrap="nowrap">
          <Box className="brand-mark" aria-hidden>
            BG
          </Box>
          <Box>
            <Title order={1}>BG Maker</Title>
            <Text c="dimmed" size="sm">
              Clean tabletop engine base
            </Text>
          </Box>
        </Group>
      </header>
      <main className="app-main" aria-label="Application workspace" />
    </Box>
  );
}
