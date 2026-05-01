import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Center className="min-h-[420px]">
      <Stack align="center" gap="sm">
        <Title order={2}>Page not found</Title>
        <Text c="dimmed" ta="center">
          BG Maker does not have this route.
        </Text>
        <Button
          variant="light"
          leftSection={<ArrowLeft size={16} />}
          onClick={() => void navigate({ to: "/" })}
        >
          Back to projects
        </Button>
      </Stack>
    </Center>
  );
}
