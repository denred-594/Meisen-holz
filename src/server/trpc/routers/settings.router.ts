import "server-only";
import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { settingsService } from "@/server/services/settings.service";

export const settingsRouter = router({
  get: publicProcedure.query(settingsService.getLatest),
  update: publicProcedure
    .input(
      z.object({
        materialCostFactor: z.number().optional(),
        generalMarkup: z.number().optional(),
        additionalMarkup1: z.number().optional(),
        additionalMarkup2: z.number().optional(),
        hourlyRate: z.number().optional(),
        workHours: z.number().optional(),
        factorA: z.number().optional(),
        factorB: z.number().optional(),
        factorC: z.number().optional(),
        factorD: z.number().optional(),
        generalMarkupEuro: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => settingsService.update(input)),
});
