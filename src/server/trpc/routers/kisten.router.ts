import "server-only";
import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { kistenService } from "@/server/services/kisten.service";
import { kistenTypIdEnum } from "@/server/db/schemas";

const innenmasseSchema = z.object({
  hoehe: z.number().positive(),
  laenge: z.number().positive(),
  breite: z.number().positive(),
});

const kisteConfigBase = z.object({
  name: z.string().min(1).optional(),
  kistentypId: z.enum(kistenTypIdEnum.enumValues as [string, ...string[]]),
  innenmasse: innenmasseSchema,
  gewicht: z.number().positive(),
  holzBretterID: z.number().int().positive(),
  holzBretterBodenID: z.number().int().positive().nullable().optional(),
  holzBalkenLaengsID: z.number().int().positive().nullable(),
  holzBalkenQuerID: z.number().int().positive().nullable().optional(),
  balkenLaengsAnzahl: z.number().int().min(0),
  balkenQuerAnzahl: z.number().int().min(0),
  bodenAnzahl: z.number().int().min(1),
  dickeBretter: z.number().int().positive(),
  dickeBretterBoden: z.number().int().positive().nullable().optional(),
  riegelDicke: z.number().int().positive(),
  riegelBreite: z.number().int().positive(),
});

const ensureLaengsbalken = (val: any, ctx: z.RefinementCtx) => {
  if (val.kistentypId === "bellmer_lq" && !val.holzBalkenLaengsID) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bitte Längsbalken auswählen",
      path: ["holzBalkenLaengsID"],
    });
  }
  if (val.holzBretterBodenID && !val.dickeBretterBoden) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bitte Dicke für Bodenbrett auswählen",
      path: ["dickeBretterBoden"],
    });
  }
};

const kisteConfigSchema = kisteConfigBase.superRefine(ensureLaengsbalken);
const kisteUpdateSchema = kisteConfigBase
  .extend({
    id: z.number().int().positive(),
  })
  .superRefine(ensureLaengsbalken);

export const kistenRouter = router({
  list: publicProcedure.query(kistenService.list),
  listWithRelations: publicProcedure.query(kistenService.listWithRelations),
  meta: publicProcedure.query(kistenService.getMeta),

  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => kistenService.getById(input.id)),
  getByIdWithRelations: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => kistenService.getByIdWithRelations(input.id)),
  create: publicProcedure
    .input(kisteConfigSchema)
    .mutation(async ({ input }) => kistenService.create(input as any)),
  update: publicProcedure
    .input(kisteUpdateSchema)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input as any;
      return kistenService.update(id, rest as any);
    }),
  updateName: publicProcedure
    .input(
      z.object({ id: z.number().int().positive(), name: z.string().min(1) })
    )
    .mutation(async ({ input }) =>
      kistenService.updateName(input.id, input.name)
    ),
  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => kistenService.delete(input.id)),
});
