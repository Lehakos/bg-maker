import { Box, Text, Title } from "@mantine/core";
import { Link, Outlet } from "@tanstack/react-router";
import "./app.css";

export function App() {
  return (
    <Box className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand-link">
          <Box className="brand-mark" aria-hidden>
            BG
          </Box>
          <Box>
            <Title order={1}>BG Maker</Title>
            <Text c="dimmed" size="sm">
              Tabletop engine workspace
            </Text>
          </Box>
        </Link>
      </header>
      <main className="app-main" aria-label="Application workspace">
        <Outlet />
      </main>
    </Box>
  );
}
