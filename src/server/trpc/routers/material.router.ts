import "server-only";
import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { materialService } from "@/server/services/holz.service";

export const materialRouter = router({
  holzplatten: publicProcedure.query(materialService.getHolzplatten),
  holzbalken: publicProcedure.query(materialService.getHolzbalken),
  upsertHolzplatte: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        typ: z.string(),
        isVollholz: z.boolean().optional(),
        varianten: z
          .array(
            z.object({
              dicke: z.coerce.number().int().positive(),
              preis: z.coerce.number().min(0),
            }),
          )
          .min(1),
        breite: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input }) => materialService.upsertHolzplatte(input)),
  upsertHolzbalken: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        typ: z.string(),
        staerke: z.number().int().positive(),
        breite: z.number().int().positive(),
        preisProKubikmeter: z.coerce.number(),
      }),
    )
    .mutation(async ({ input }) => materialService.upsertHolzbalken(input)),
  deleteHolzplatte: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => materialService.deleteHolzplatte(input.id)),
  deleteHolzbalken: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => materialService.deleteHolzbalken(input.id)),
});
