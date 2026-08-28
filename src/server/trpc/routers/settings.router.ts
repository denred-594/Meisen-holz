import "server-only";
import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { settingsService } from "@/server/services/settings.service";

export const settingsRouter = router({
  get: publicProcedure.query(settingsService.getLatest),
  update: publicProcedure
    .input(
      z.object({
        factorA: z.number().positive().optional(),
        factorB: z.number().positive().optional(),
        factorC: z.number().positive().optional(),
        factorD: z.number().positive().optional(),
        hourlyRate: z.number().min(0).optional(),
        workHours: z.number().min(0).optional(),
        plattenGewichtKgProM2: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input }) => settingsService.update(input)),
});
