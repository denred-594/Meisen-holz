import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
  createTheme,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { Metadata } from "next";
import TRPCWrapper from "@/lib/trpc/provider";
import LayoutShell from "@/components/LayoutShell";

const theme = createTheme({
  primaryColor: "gray",
  primaryShade: 8,
  defaultRadius: "md",
  fontFamily:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen',
  headings: { fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI"' },
});

export const metadata: Metadata = {
  title: "Holzkisten-Konfigurator",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>
      <body>
        <MantineProvider forceColorScheme="light" theme={theme}>
          <Notifications position="top-right" />
          <ModalsProvider>
            <TRPCWrapper>
              <LayoutShell>{children}</LayoutShell>
            </TRPCWrapper>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
