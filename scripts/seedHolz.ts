import "dotenv/config";
import { db } from "@/server/db";
import {
  holzplatten,
  holzbalken,
  priceSettings,
  kistentyp,
  holzplattenDicken,
  kistentypBalkenKomponenten,
} from "@/server/db/schemas";
import { count, eq } from "drizzle-orm";

async function run() {
  console.log("Seeding Grunddaten...");
  const [plattenCount] = await db.select({ c: count() }).from(holzplatten);
  if (plattenCount.c === 0) {
    const plattenSeeds = [
      {
        typ: "OSB",
        breite: 1250,
        isVollholz: false,
        varianten: [
          { dicke: 9, preis: 14 },
          { dicke: 12, preis: 15 },
          { dicke: 15, preis: 16.5 },
          { dicke: 18, preis: 18 },
          { dicke: 21, preis: 20 },
          { dicke: 24, preis: 22 },
        ],
      },
      {
        typ: "Sperrholz (Elliotes)",
        breite: 1500,
        isVollholz: false,
        varianten: [
          { dicke: 9, preis: 19 },
          { dicke: 12, preis: 20 },
          { dicke: 15, preis: 22 },
          { dicke: 18, preis: 24 },
          { dicke: 21, preis: 26 },
          { dicke: 24, preis: 28 },
        ],
      },
      {
        typ: "Multiplex",
        breite: 1250,
        isVollholz: false,
        varianten: [
          { dicke: 9, preis: 25 },
          { dicke: 12, preis: 27 },
          { dicke: 15, preis: 29 },
          { dicke: 18, preis: 31 },
          { dicke: 21, preis: 33 },
          { dicke: 24, preis: 36 },
        ],
      },
      {
        typ: "Vollholz",
        breite: 200,
        isVollholz: true,
        varianten: [
          { dicke: 23, preis: 0.0012 },
          { dicke: 30, preis: 0.0014 },
          { dicke: 38, preis: 0.0016 },
        ],
      },
    ];
    for (const row of plattenSeeds) {
      const { varianten, ...platte } = row;
      const [ret] = await db
        .insert(holzplatten)
        .values(platte as any)
        .returning();
      if (varianten.length) {
        await db.insert(holzplattenDicken).values(
          varianten.map((variant) => ({
            holzplatteId: ret.id,
            dicke: variant.dicke,
            preis: variant.preis,
          }))
        );
      }
    }
    console.log("Holzplatten + Dicken seeded");
  }
  const [balkenCount] = await db.select({ c: count() }).from(holzbalken);
  if (balkenCount.c === 0) {
    const balkenRows = [
      { typ: "Fichte", staerke: 40, breite: 60, preisProKubikmeter: 450 },
      { typ: "Kiefer", staerke: 40, breite: 80, preisProKubikmeter: 500 },
      { typ: "Eiche", staerke: 50, breite: 80, preisProKubikmeter: 900 },
    ];
    for (const row of balkenRows) {
      await db.insert(holzbalken).values(row as any);
    }
    console.log("Holzbalken seeded");
  }
  const [settingsCount] = await db.select({ c: count() }).from(priceSettings);
  if (settingsCount.c === 0) {
    await db.insert(priceSettings).values({});
    console.log("PriceSettings seeded");
  }
  const [typA] = await db.select().from(kistentyp).where(eq(kistentyp.id, "A"));
  if (!typA) {
    await db
      .insert(kistentyp)
      .values({ id: "A", arbeitszeit: 0, bauanleitung: "" });
    await db.insert(kistentypBalkenKomponenten).values([
      { kistentypId: "A", typ: "Querbalken", position: "Boden", lage: "Außen" },
      { kistentypId: "A", typ: "Riegel", position: "Kopf", lage: "Innen" },
    ]);
  }
  const [typB] = await db.select().from(kistentyp).where(eq(kistentyp.id, "B"));
  if (!typB) {
    await db
      .insert(kistentyp)
      .values({ id: "B", arbeitszeit: 0, bauanleitung: "" });
    await db.insert(kistentypBalkenKomponenten).values([
      { kistentypId: "B", typ: "Querbalken", position: "Boden", lage: "Außen" },
      {
        kistentypId: "B",
        typ: "Längsbalken",
        position: "Boden",
        lage: "Außen",
      },
      { kistentypId: "B", typ: "Riegel", position: "Seite", lage: "Innen" },
      { kistentypId: "B", typ: "Riegel", position: "Kopf", lage: "Innen" },
    ]);
  }
  console.log("Seeding abgeschlossen");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
