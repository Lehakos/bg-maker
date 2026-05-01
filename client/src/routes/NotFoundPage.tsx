import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Center className="not-found-page">
      <Stack align="center" gap="sm">
        <Title order={2}>Страница не найдена</Title>
        <Text c="dimmed" ta="center">
          Такого маршрута в BG Maker нет.
        </Text>
        <Button
          variant="light"
          leftSection={<ArrowLeft size={16} />}
          onClick={() => void navigate({ to: "/" })}
        >
          К проектам
        </Button>
      </Stack>
    </Center>
  );
}
