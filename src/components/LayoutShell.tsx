"use client";
import { ReactNode } from "react";
import {
  AppShell,
  Group,
  Anchor,
  Title,
  Box,
  ThemeIcon,
  Text,
} from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box as IconBox, Settings as IconSettings } from "react-feather";

interface LayoutShellProps {
  children: ReactNode;
}

const links = [
  { href: "/kisten", icon: IconBox, label: "Kisten" },
  { href: "/settings", icon: IconSettings, label: "Einstellungen" },
];

export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header withBorder bg="gray.0">
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm" align="center">
            <ThemeIcon variant="light" color="gray" radius="md" size={34}>
              <IconBox size={18} />
            </ThemeIcon>
            <Box>
              <Title order={4}>Kistenkonfigurator</Title>
            </Box>
          </Group>

          <Group gap="xs">
            {links.map(({ href, icon: Icon, label }) => (
              <Anchor
                key={href}
                component={Link}
                href={href}
                c={pathname.startsWith(href) ? "gray.9" : "dimmed"}
                fw={pathname.startsWith(href) ? 600 : 500}
                px="sm"
                py={6}
                style={(theme) => ({
                  borderRadius: theme.radius.md,
                  backgroundColor: pathname.startsWith(href)
                    ? theme.colors.gray[1]
                    : "transparent",
                })}
              >
                <Group gap={6} align="center">
                  <Icon size={17} />
                  <span>{label}</span>
                </Group>
              </Anchor>
            ))}
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

export default LayoutShell;
