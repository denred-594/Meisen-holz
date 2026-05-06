import "server-only";
import { router } from "./trpc";
import { materialRouter } from "./routers/material.router";
import { kistenRouter } from "./routers/kisten.router";
import { settingsRouter } from "./routers/settings.router";

export const appRouter = router({
  material: materialRouter,
  kisten: kistenRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
