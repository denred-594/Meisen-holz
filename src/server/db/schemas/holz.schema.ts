import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
export const KISTEN_TYP_LABELS: Record<KistenTypId, string> = {
  schwartz: "Schwartz",
  bellmer_q: "Bellmer Vollholzkiste mit Querbalken",
  bellmer_lq: "Bellmer Vollholzkiste mit Längs- und Querbalken",
};
// Holzplatten: Normalisiert – Dicken in eigener Tabelle
export const holzplatten = pgTable("holzplatten", {
  id: serial("id").primaryKey(),
  typ: text("typ").notNull(),
  breite: integer("breite"),
  isVollholz: boolean("is_vollholz").notNull().default(false),
});

export const holzplattenDicken = pgTable("holzplatten_dicken", {
  id: serial("id").primaryKey(),
  holzplatteId: integer("holzplatte_id")
    .references(() => holzplatten.id)
    .notNull(),
  dicke: integer("dicke").notNull(),
  preis: numeric("preis", { precision: 12, scale: 6, mode: "number" })
    .notNull()
    .default(0),
});

// Holzbalken: Preis pro Kubikmeter für Materialkostenberechnung
export const holzbalken = pgTable("holzbalken", {
  id: serial("id").primaryKey(),
  typ: text("typ").notNull(),
  staerke: integer("staerke").notNull(),
  breite: integer("breite").notNull(),
  preisProKubikmeter: numeric("preis_pro_kubikmeter", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
});

// Kistentyp Metadaten
export const kistentyp = pgTable("kistentyp", {
  id: text("id").primaryKey(),
  arbeitszeit: integer("arbeitszeit").notNull().default(0),
  bauanleitung: text("bauanleitung").notNull().default(""),
});

export const kistentypBalkenKomponenten = pgTable(
  "kistentyp_balken_komponenten",
  {
    id: serial("id").primaryKey(),
    kistentypId: text("kistentyp_id")
      .references(() => kistentyp.id)
      .notNull(),
    typ: text("typ").notNull(),
    position: text("position").notNull(),
    lage: text("lage").notNull(),
  },
);

export const brettTypEnum = pgEnum("brett_typ_enum", [
  "boden",
  "seite",
  "stirnseite",
  "deckel",
]);

export type BrettTyp = (typeof brettTypEnum.enumValues)[number];

export const kistenTypIdEnum = pgEnum("kistentyp_id_enum", [
  "schwartz",
  "bellmer_q",
  "bellmer_lq",
]);
export const kistenTypIdEnumValues = kistenTypIdEnum.enumValues;
export type KistenTypId = (typeof kistenTypIdEnum.enumValues)[number];

// Price Settings (Verlaufs-Tabelle möglich; für Abfragen nehmen wir den letzten Eintrag)
export const priceSettings = pgTable("price_settings", {
  id: serial("id").primaryKey(),
  materialCostFactor: numeric("material_cost_factor", {
    precision: 8,
    scale: 4,
    mode: "number",
  })
    .notNull()
    .default(1),
  // Prozentualer Aufschlag (Bestand) – wird weiterhin unterstützt
  generalMarkup: numeric("general_markup", {
    precision: 8,
    scale: 4,
    mode: "number",
  })
    .notNull()
    .default(0.3),
  additionalMarkup1: numeric("additional_markup1", {
    precision: 8,
    scale: 4,
    mode: "number",
  })
    .notNull()
    .default(0.1111),
  additionalMarkup2: numeric("additional_markup2", {
    precision: 8,
    scale: 4,
    mode: "number",
  })
    .notNull()
    .default(0.0204),
  // Neue, explizite Pipeline-Faktoren und Euro-Pauschale
  factorA: numeric("factor_a", { precision: 10, scale: 6, mode: "number" })
    .notNull()
    .default(100 / 90),
  factorB: numeric("factor_b", { precision: 10, scale: 6, mode: "number" })
    .notNull()
    .default(100 / 70),
  factorC: numeric("factor_c", { precision: 10, scale: 6, mode: "number" })
    .notNull()
    .default(100 / 90),
  factorD: numeric("factor_d", { precision: 10, scale: 6, mode: "number" })
    .notNull()
    .default(100 / 98),
  generalMarkupEuro: numeric("general_markup_euro", {
    precision: 12,
    scale: 2,
    mode: "number",
  })
    .notNull()
    .default(0),
  hourlyRate: numeric("hourly_rate", {
    precision: 10,
    scale: 2,
    mode: "number",
  })
    .notNull()
    .default(50),
  workHours: numeric("work_hours", { precision: 10, scale: 2, mode: "number" })
    .notNull()
    .default(4),
  updatedAt: timestamp("updated_at", {
    withTimezone: false,
    mode: "date",
  }).defaultNow(),
});

// Kisten: Normalisiert (keine JSON-Felder)
export const kisten = pgTable("kisten", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  kistentyp: kistenTypIdEnum("kistentyp").notNull(),
  innenHoehe: integer("innen_hoehe").notNull(),
  innenLaenge: integer("innen_laenge").notNull(),
  innenBreite: integer("innen_breite").notNull(),
  gewicht: numeric("gewicht", {
    precision: 10,
    scale: 2,
    mode: "number",
  }).notNull(),
  holzBretterID: integer("holz_bretter_id")
    .references(() => holzplatten.id)
    .notNull(),
  holzBretterBodenID: integer("holz_bretter_boden_id").references(
    () => holzplatten.id,
  ),
  holzBalkenLaengsID: integer("holz_balken_laengs_id").references(
    () => holzbalken.id,
  ),
  holzBalkenQuerID: integer("holz_balken_quer_id").references(
    () => holzbalken.id,
  ),
  balkenLaengsAnzahl: integer("balken_laengs_anzahl").notNull().default(0),
  balkenQuerAnzahl: integer("balken_quer_anzahl").notNull().default(0),
  bodenAnzahl: integer("boden_anzahl").notNull().default(1),
  dickeBretter: integer("dicke_bretter").notNull(),
  dickeBretterBoden: integer("dicke_bretter_boden"),
  riegelDicke: integer("riegel_dicke").notNull(),
  riegelBreite: integer("riegel_breite").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: false,
    mode: "date",
  }).defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: false,
    mode: "date",
  }).defaultNow(),
});

export const kistenRelations = relations(kisten, ({ one }) => ({
  bretter: one(holzplatten, {
    fields: [kisten.holzBretterID],
    references: [holzplatten.id],
  }),
  bretterBoden: one(holzplatten, {
    fields: [kisten.holzBretterBodenID],
    references: [holzplatten.id],
  }),
  balkenLaengs: one(holzbalken, {
    fields: [kisten.holzBalkenLaengsID],
    references: [holzbalken.id],
  }),
  balkenQuer: one(holzbalken, {
    fields: [kisten.holzBalkenQuerID],
    references: [holzbalken.id],
  }),
}));

export const bretterRelations = relations(holzplatten, ({ many }) => ({
  varianten: many(holzplattenDicken),
}));

export const bretterDickenRelations = relations(
  holzplattenDicken,
  ({ one }) => ({
    holzplatte: one(holzplatten, {
      fields: [holzplattenDicken.holzplatteId],
      references: [holzplatten.id],
    }),
  }),
);

export type T_Holzplatte = typeof holzplatten.$inferSelect;
export type T_NewHolzplatte = typeof holzplatten.$inferInsert;
export type T_HolzplatteDicke = typeof holzplattenDicken.$inferSelect;
export type T_Holzbalken = typeof holzbalken.$inferSelect;
export type T_NewHolzbalken = typeof holzbalken.$inferInsert;
export type T_Kiste = typeof kisten.$inferSelect;
export type T_NewKiste = typeof kisten.$inferInsert;
export type T_PriceSettingsRow = typeof priceSettings.$inferSelect;
