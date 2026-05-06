import "server-only";
import { db } from "@/server/db";
import {
  kisten,
  KISTEN_TYP_LABELS,
  KistenTypId,
  kistenTypIdEnum,
  T_Kiste,
} from "@/server/db/schemas";
import { eq } from "drizzle-orm";
import {
  Kiste as DomainKiste,
  T_KisteConfigInput as DomainKisteConfigInput,
  T_KisteData,
} from "@/server/domain/kiste";

export type T_KisteConfigInput = DomainKisteConfigInput;
export type T_KisteDto = T_Kiste;

const mapRowToDto = (row: T_Kiste): T_KisteDto => row;

function mapSnapshotToDb(snapshot: T_KisteData) {
  return {
    kistentyp: snapshot.kistentypId,
    innenHoehe: snapshot.innenmasse.hoehe,
    innenLaenge: snapshot.innenmasse.laenge,
    innenBreite: snapshot.innenmasse.breite,
    gewicht: Number(snapshot.gewicht),
    holzBretterID: snapshot.holzBretterID,
    holzBretterBodenID: snapshot.holzBretterBodenID ?? null,
    holzBalkenLaengsID: snapshot.holzBalkenLaengsID ?? null,
    holzBalkenQuerID: snapshot.holzBalkenQuerID ?? null,
    balkenLaengsAnzahl: snapshot.balkenLaengsAnzahl ?? 0,
    balkenQuerAnzahl: snapshot.balkenQuerAnzahl ?? 0,
    bodenAnzahl: snapshot.bodenAnzahl ?? 1,
    dickeBretter: snapshot.dickeBretter,
    dickeBretterBoden: snapshot.dickeBretterBoden ?? null,
    riegelDicke: snapshot.riegelDicke,
    riegelBreite: snapshot.riegelBreite,
  } as const;
}

export const kistenService = {
  create: async (input: T_KisteConfigInput): Promise<T_KisteDto> => {
    const normalizedName = input.name?.trim() ?? "";
    const domainKiste = DomainKiste.fromConfig({
      ...input,
      name: normalizedName,
    });
    const snapshot = domainKiste.snapshot;

    const [row] = await db
      .insert(kisten)
      .values({
        name: normalizedName,
        ...mapSnapshotToDb(snapshot),
      })
      .returning();

    if (!normalizedName.length) {
      const fallbackName = `Kiste #${row.id}`;
      await db
        .update(kisten)
        .set({ name: fallbackName })
        .where(eq(kisten.id, row.id));
      row.name = fallbackName as T_Kiste["name"];
    }

    return mapRowToDto(row);
  },

  list: async (): Promise<T_KisteDto[]> => {
    const rows = await db.query.kisten.findMany({
      orderBy: (kisten, { asc }) => [asc(kisten.createdAt)],
    });
    return rows.map(mapRowToDto);
  },
  listWithRelations: async (): Promise<T_KisteDto[]> => {
    const rows = await db.query.kisten.findMany({
      orderBy: (kisten, { asc }) => [asc(kisten.createdAt)],
      with: {
        bretter: { with: { varianten: true } },
        bretterBoden: { with: { varianten: true } },
        balkenLaengs: true,
        balkenQuer: true,
      },
    });
    return rows.map(mapRowToDto);
  },

  getById: async (id: number): Promise<T_KisteDto | undefined> => {
    const [row] = await db.select().from(kisten).where(eq(kisten.id, id));
    if (!row) return undefined;
    return mapRowToDto(row);
  },
  getByIdWithRelations: async (id: number) => {
    const row = db.query.kisten.findFirst({
      where: eq(kisten.id, id),
      with: {
        bretter: { with: { varianten: true } },
        bretterBoden: { with: { varianten: true } },
        balkenLaengs: true,
        balkenQuer: true,
      },
    });
    return row;
  },

  updateName: async (id: number, name: string) => {
    const normalized = name.trim();
    await db.update(kisten).set({ name: normalized }).where(eq(kisten.id, id));
    const [row] = await db.select().from(kisten).where(eq(kisten.id, id));
    return row as T_KisteDto | undefined;
  },

  delete: async (id: number) => {
    await db.delete(kisten).where(eq(kisten.id, id));
    return { success: true } as const;
  },

  getMeta: async () => {
    const kistenTypIds = kistenTypIdEnum.enumValues;
    const kistenTypOptions = kistenTypIds.map((v) => ({
      value: v,
      label: KISTEN_TYP_LABELS[v as KistenTypId] ?? v,
    }));

    return {
      kistenTypIds,
      kistenTypOptions,
      labels: { kistentyp: KISTEN_TYP_LABELS },
    };
  },

  update: async (
    id: number,
    input: T_KisteConfigInput
  ): Promise<T_KisteDto | undefined> => {
    const normalizedName = input.name?.trim() ?? "";
    const domainKiste = DomainKiste.fromConfig({
      ...input,
      name: normalizedName,
    });
    const snapshot = domainKiste.snapshot;

    await db
      .update(kisten)
      .set({
        name: normalizedName,
        ...mapSnapshotToDb(snapshot),
      })
      .where(eq(kisten.id, id));

    const [row] = await db.select().from(kisten).where(eq(kisten.id, id));
    if (!row) return undefined;
    return mapRowToDto(row);
  },
};
