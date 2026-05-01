import { Box, Text, Title } from "@mantine/core";
import { Link, Outlet } from "@tanstack/react-router";

export function App() {
  return (
    <Box className="min-h-screen bg-[#f6f7f4] text-slate-800">
      <header className="flex min-h-[72px] items-center border-b border-[#d9e1dc] bg-white px-[18px] py-3">
        <Link to="/" className="flex items-center gap-3 text-inherit no-underline">
          <Box
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#24443f] text-[13px] font-extrabold text-white"
            aria-hidden
          >
            BG
          </Box>
          <Box>
            <Title order={1} className="text-xl leading-[1.1] tracking-normal">
              BG Maker
            </Title>
            <Text c="dimmed" size="sm">
              Tabletop engine workspace
            </Text>
          </Box>
        </Link>
      </header>
      <main className="min-h-[calc(100vh-72px)]" aria-label="Application workspace">
        <Outlet />
      </main>
    </Box>
  );
}
