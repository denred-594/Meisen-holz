"use client";

import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Text,
  Container,
  Button,
  Stack,
  Anchor,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : "Ungültige E-Mail-Adresse",
      password: (value) => (value.length >= 1 ? null : "Passwort erforderlich"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (res.error) {
        setError(res.error?.message || "Anmeldung fehlgeschlagen");
        return;
      }

      // Erfolgreiche Anmeldung
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" style={{ fontWeight: 900 }}>
        Willkommen zurück!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Noch keinen Account?{" "}
        <Anchor size="sm" component="a" href="/signup">
          Jetzt registrieren
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {error && (
              <Alert color="red" title="Fehler">
                {error}
              </Alert>
            )}

            <TextInput
              label="E-Mail"
              placeholder="deine@email.com"
              required
              {...form.getInputProps("email")}
            />

            <PasswordInput
              label="Passwort"
              placeholder="Dein Passwort"
              required
              {...form.getInputProps("password")}
            />

            <Button type="submit" fullWidth mt="xl" loading={isLoading}>
              Anmelden
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
