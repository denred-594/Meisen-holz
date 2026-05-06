import "server-only";
import { db } from "@/server/db";
import {
  holzplatten,
  holzbalken,
  holzplattenDicken,
  T_Holzplatte,
  T_Holzbalken,
} from "@/server/db/schemas";
import { asc, eq } from "drizzle-orm";

export const materialService = {
  // Holzplatten
  getHolzplatten: async (): Promise<
    (T_Holzplatte & {
      dicken: { id: number; dicke: number; preis: number }[];
      dicke: number[];
    })[]
  > => {
    const platten = await db
      .select()
      .from(holzplatten)
      .orderBy(asc(holzplatten.id));
    const dickenRows = await db.select().from(holzplattenDicken);
    const grouped = new Map<
      number,
      { id: number; dicke: number; preis: number }[]
    >();
    for (const d of dickenRows) {
      if (!grouped.has(d.holzplatteId)) grouped.set(d.holzplatteId, []);
      grouped.get(d.holzplatteId)!.push({
        id: d.id,
        dicke: d.dicke,
        preis: Number(d.preis ?? 0),
      });
    }
    return platten.map((p) => {
      const varianten = grouped.get(p.id) ?? [];
      const sortierteVarianten = [...varianten].sort(
        (a, b) => a.dicke - b.dicke,
      );
      return {
        ...p,
        dicken: sortierteVarianten,
        dicke: sortierteVarianten.map((v) => v.dicke),
      };
    });
  },
  getHolzplatteById: async (
    id: number,
  ): Promise<
    | (T_Holzplatte & {
        dicken: { id: number; dicke: number; preis: number }[];
        dicke: number[];
      })
    | undefined
  > => {
    const [row] = await db
      .select()
      .from(holzplatten)
      .where(eq(holzplatten.id, id));
    if (!row) return undefined;
    const dicken = await db
      .select()
      .from(holzplattenDicken)
      .where(eq(holzplattenDicken.holzplatteId, id));
    const varianten = dicken
      .map((d) => ({
        id: d.id,
        dicke: d.dicke,
        preis: Number(d.preis ?? 0),
      }))
      .sort((a, b) => a.dicke - b.dicke);
    return { ...row, dicken: varianten, dicke: varianten.map((v) => v.dicke) };
  },
  upsertHolzplatte: async (
    values: Partial<T_Holzplatte> & {
      typ: string;
      isVollholz?: boolean;
      varianten: { dicke: number; preis: number }[];
      breite?: number;
      id?: number;
    },
  ) => {
    const sanitizedVariants = (values.varianten ?? [])
      .map((variant) => {
        const dickeNumber = Number(variant.dicke);
        const preisNumber = Number(variant.preis ?? 0);
        if (!Number.isFinite(dickeNumber) || dickeNumber <= 0) {
          return null;
        }
        return {
          dicke: Math.round(dickeNumber),
          preis: Number.isFinite(preisNumber) ? preisNumber : 0,
        };
      })
      .filter((variant): variant is { dicke: number; preis: number } =>
        Boolean(variant),
      );
    if (values.id) {
      await db
        .update(holzplatten)
        .set({
          typ: values.typ,
          breite: values.breite,
          isVollholz: values.isVollholz ?? undefined,
        })
        .where(eq(holzplatten.id, values.id));
      // replace dicken
      await db
        .delete(holzplattenDicken)
        .where(eq(holzplattenDicken.holzplatteId, values.id));
      if (sanitizedVariants.length) {
        await db.insert(holzplattenDicken).values(
          sanitizedVariants.map((variant) => ({
            holzplatteId: values.id!,
            dicke: variant.dicke,
            preis: variant.preis,
          })),
        );
      }
      const updated = await materialService.getHolzplatteById(values.id);
      return updated!;
    }
    const inserted = await db
      .insert(holzplatten)
      .values({
        typ: values.typ,
        breite: values.breite,
        isVollholz: Boolean(values.isVollholz),
      })
      .returning();
    const plate = inserted[0];
    if (sanitizedVariants.length) {
      await db.insert(holzplattenDicken).values(
        sanitizedVariants.map((variant) => ({
          holzplatteId: plate.id,
          dicke: variant.dicke,
          preis: variant.preis,
        })),
      );
    }
    const withDicken = await materialService.getHolzplatteById(plate.id);
    return withDicken!;
  },
  deleteHolzplatte: async (id: number) => {
    await db.delete(holzplatten).where(eq(holzplatten.id, id));
    return { success: true };
  },

  // Holzbalken
  getHolzbalken: async (): Promise<T_Holzbalken[]> => {
    return await db.select().from(holzbalken).orderBy(asc(holzbalken.id));
  },
  getHolzbalkenById: async (id: number): Promise<T_Holzbalken | undefined> => {
    const [row] = await db
      .select()
      .from(holzbalken)
      .where(eq(holzbalken.id, id));
    return row;
  },
  upsertHolzbalken: async (
    values: Partial<T_Holzbalken> & {
      typ: string;
      staerke: number;
      breite: number;
      preisProKubikmeter: number;
      id?: number;
    },
  ) => {
    if (values.id) {
      await db
        .update(holzbalken)
        .set({
          typ: values.typ,
          staerke: values.staerke,
          breite: values.breite,
          preisProKubikmeter: Number(values.preisProKubikmeter),
        })
        .where(eq(holzbalken.id, values.id));
      const updated = await materialService.getHolzbalkenById(values.id);
      return updated!;
    }
    const inserted = await db
      .insert(holzbalken)
      .values({
        typ: values.typ,
        staerke: values.staerke,
        breite: values.breite,
        preisProKubikmeter: Number(values.preisProKubikmeter),
      })
      .returning();
    return inserted[0];
  },
  deleteHolzbalken: async (id: number) => {
    await db.delete(holzbalken).where(eq(holzbalken.id, id));
    return { success: true };
  },
};
