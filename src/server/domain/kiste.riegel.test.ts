import { describe, expect, it } from "vitest";
import {
  Kiste,
  SEITENRIEGEL_DEFAULT_PRO_SEITE,
  T_KisteRowWithRelations,
} from "./kiste";
import {
  KistenTypId,
  T_Holzbalken,
  T_Holzriegel,
} from "@/server/db/schemas";

/**
 * Referenzwerte aus den drei Meisen-Kistenspezifikationen (Sheet "Tabelle1").
 * Die Zellbezüge in den Kommentaren verweisen auf die Originaldateien, damit
 * jede Zahl hier gegen die Kundenvorgabe nachvollziehbar bleibt.
 */

const balken = (staerke: number, breite: number): T_Holzbalken => ({
  id: 1,
  typ: "Fichte",
  staerke,
  breite,
  preisProKubikmeter: 290,
});

const riegelMaterial: T_Holzriegel = {
  id: 1,
  typ: "Fichte Riegel",
  staerke: 23,
  breite: 80,
  preisProKubikmeter: 300,
};

function buildKiste(input: {
  kistentyp: KistenTypId;
  innenLaenge: number;
  innenBreite: number;
  innenHoehe: number;
  dickeBretter: number;
  riegelDicke: number;
  riegelBreite: number;
  balkenQuerAnzahl: number;
  querbalken: T_Holzbalken;
  seitenriegelAnzahl?: number;
  ohneRiegelMaterial?: boolean;
}) {
  const row = {
    id: 1,
    name: "Referenz",
    kistentyp: input.kistentyp,
    innenHoehe: input.innenHoehe,
    innenLaenge: input.innenLaenge,
    innenBreite: input.innenBreite,
    gewicht: 0,
    holzBretterID: 1,
    holzBretterBodenID: null,
    holzBalkenLaengsID: null,
    holzBalkenQuerID: 1,
    holzRiegelID: 1,
    balkenLaengsAnzahl: 0,
    balkenQuerAnzahl: input.balkenQuerAnzahl,
    bodenAnzahl: 1,
    seitenriegelAnzahl:
      input.seitenriegelAnzahl ??
      SEITENRIEGEL_DEFAULT_PRO_SEITE[input.kistentyp],
    dickeBretter: input.dickeBretter,
    dickeBretterBoden: null,
    riegelDicke: input.riegelDicke,
    riegelBreite: input.riegelBreite,
    createdAt: null,
    updatedAt: null,
    balkenQuer: input.querbalken,
    riegel: input.ohneRiegelMaterial
      ? null
      : {
          ...riegelMaterial,
          staerke: input.riegelDicke,
          breite: input.riegelBreite,
        },
  } as unknown as T_KisteRowWithRelations;

  return Kiste.fromRow(row);
}

const riegelByName = (kiste: Kiste) =>
  new Map(kiste.riegel.map((component) => [component.name, component]));

describe("Riegel – Schwartz (Sheet: Schwartz Kiste zus. geb.)", () => {
  // B26/C26/D26 = 1610 x 460 x 330, 23 mm OSB, Riegel 23x80, Bodenbalken 78x98 (C31/D31), 3x (A31)
  const kiste = buildKiste({
    kistentyp: "schwartz",
    innenLaenge: 1610,
    innenBreite: 460,
    innenHoehe: 330,
    dickeBretter: 23,
    riegelDicke: 23,
    riegelBreite: 80,
    balkenQuerAnzahl: 3,
    querbalken: balken(78, 98),
  });
  const riegel = riegelByName(kiste);

  it("bildet genau die sechs Riegelpositionen der Spezifikation ab", () => {
    expect([...riegel.keys()]).toEqual([
      "Deckelriegel längs",
      "Deckelriegel quer",
      "Seitenriegel längs",
      "Seitenriegel senkrecht/vertikal",
      "Köpferiegel waagerecht",
      "Köpferiegel senkrecht/vertikal",
    ]);
  });

  it("Seitenriegel senkrecht: Zeile 43 → 330 - 78 - 78 = 174 mm, 2x2 Stück", () => {
    const component = riegel.get("Seitenriegel senkrecht/vertikal")!;
    expect(component.masse.laenge).toBe(174);
    expect(component.amount).toBe(4);
  });

  it("Köpferiegel waagerecht: Zeile 48 → 460 + 23 + 23 = 506 mm, 2x2 Stück", () => {
    const component = riegel.get("Köpferiegel waagerecht")!;
    expect(component.masse.laenge).toBe(506);
    expect(component.amount).toBe(4);
  });

  it("Köpferiegel senkrecht: Zeile 49 → 330 - 78 - 78 = 174 mm, 2x2 Stück", () => {
    const component = riegel.get("Köpferiegel senkrecht/vertikal")!;
    expect(component.masse.laenge).toBe(174);
    expect(component.amount).toBe(4);
  });

  it("Seitenriegel längs: Zeile 42 → Innenlänge 1610 mm, 2x2 Stück", () => {
    const component = riegel.get("Seitenriegel längs")!;
    expect(component.masse.laenge).toBe(1610);
    expect(component.amount).toBe(4);
  });

  it("Deckelriegel: Einzug 15 mm je Seite, Querriegel zusätzlich -2x Balkenstärke", () => {
    // Deckelmaß kommt aus der bestehenden Plattenberechnung (1702 x 552 mm),
    // nicht aus den Sheet-Literalen 1680 x 530 – siehe Spec-Dokument.
    expect(riegel.get("Deckelriegel längs")!.masse.laenge).toBe(1702 - 30);
    expect(riegel.get("Deckelriegel längs")!.amount).toBe(2);
    expect(riegel.get("Deckelriegel quer")!.masse.laenge).toBe(
      552 - 30 - 2 * 78,
    );
    // A36 = "=A31" → Anzahl folgt den Querbalken
    expect(riegel.get("Deckelriegel quer")!.amount).toBe(3);
  });

  it("rechnet den Riegelpreis über das Volumen in Kubikmeter", () => {
    const component = riegel.get("Köpferiegel waagerecht")!;
    const volumenM3 = (506 / 1000) * (80 / 1000) * (23 / 1000);
    expect(component.pricingUnit).toBe("m3");
    expect(component.basisMenge).toBeCloseTo(volumenM3, 12);
    expect(component.preisInEurGesamt).toBeCloseTo(volumenM3 * 300, 12);
  });
});

describe("Riegel – Bellmer Vollholzkiste mit Längs- und Querbalken", () => {
  // B26/C26/D26 = 3200 x 1000 x 1600, 23 mm Bretter, Riegel 23x100, Balken 98x98, 4x quer (A32)
  const kiste = buildKiste({
    kistentyp: "bellmer_lq",
    innenLaenge: 3200,
    innenBreite: 1000,
    innenHoehe: 1600,
    dickeBretter: 23,
    riegelDicke: 23,
    riegelBreite: 100,
    balkenQuerAnzahl: 4,
    querbalken: balken(98, 98),
  });
  const riegel = riegelByName(kiste);

  it("bildet genau die vier Riegelpositionen der Spezifikation ab", () => {
    expect([...riegel.keys()]).toEqual([
      "Deckelriegel quer",
      "Seitenriegel senkrecht/vertikal",
      "Köpferiegel waagerecht",
      "Köpferiegel senkrecht/vertikal",
    ]);
  });

  it("Deckelriegel quer: Zeile 36 → 1046 mm, Anzahl = Querbalken (4x)", () => {
    const component = riegel.get("Deckelriegel quer")!;
    expect(component.masse.laenge).toBe(1046);
    expect(component.amount).toBe(4);
  });

  it("Seitenriegel senkrecht: Zeile 44 → 1600 + 98 + 23 + 23 + 23 = 1767 mm, 2x3 Stück", () => {
    const component = riegel.get("Seitenriegel senkrecht/vertikal")!;
    expect(component.masse.laenge).toBe(1767);
    expect(component.amount).toBe(6);
  });

  it("Köpferiegel waagerecht: Zeile 49 → 1000 - 98 - 98 = 804 mm, 2x2 Stück", () => {
    const component = riegel.get("Köpferiegel waagerecht")!;
    expect(component.masse.laenge).toBe(804);
    expect(component.amount).toBe(4);
  });

  it("Köpferiegel senkrecht: Zeile 50 → Innenhöhe 1600 mm, 2x2 Stück", () => {
    const component = riegel.get("Köpferiegel senkrecht/vertikal")!;
    expect(component.masse.laenge).toBe(1600);
    expect(component.amount).toBe(4);
  });
});

describe("Riegel – Bellmer Vollholzkiste mit Querbalken", () => {
  // B26/C26/D26 = 1700 x 750 x 800, 23 mm Bretter, Riegel 23x100, Balken 98x98, 3x quer (A31)
  const kiste = buildKiste({
    kistentyp: "bellmer_q",
    innenLaenge: 1700,
    innenBreite: 750,
    innenHoehe: 800,
    dickeBretter: 23,
    riegelDicke: 23,
    riegelBreite: 100,
    balkenQuerAnzahl: 3,
    querbalken: balken(98, 98),
  });
  const riegel = riegelByName(kiste);

  it("Deckelriegel quer: Zeile 36 → 796 mm, Anzahl = Querbalken (3x)", () => {
    const component = riegel.get("Deckelriegel quer")!;
    expect(component.masse.laenge).toBe(796);
    expect(component.amount).toBe(3);
  });

  it("Köpferiegel waagerecht: Zeile 48 → 750 - 98 - 98 = 554 mm, 2x2 Stück", () => {
    const component = riegel.get("Köpferiegel waagerecht")!;
    expect(component.masse.laenge).toBe(554);
    expect(component.amount).toBe(4);
  });

  it("Köpferiegel senkrecht: Zeile 49 → Innenhöhe 800 mm, 2x2 Stück", () => {
    const component = riegel.get("Köpferiegel senkrecht/vertikal")!;
    expect(component.masse.laenge).toBe(800);
    expect(component.amount).toBe(4);
  });

  it("Seitenriegel senkrecht: Balkenstärke aus dem Material statt Sheet-Literal 78", () => {
    // Zeile 43 rechnet mit 78 mm, das ist die Balkenstärke der Schwartz-Vorlage.
    // Dieses Blatt hat 98x98 Balken (C31/D31); die LQ-Variante bestätigt mit 98.
    const component = riegel.get("Seitenriegel senkrecht/vertikal")!;
    expect(component.masse.laenge).toBe(800 + 98 + 2 * 23 + 23);
    expect(component.amount).toBe(6);
  });
});

describe("Riegel – Integration in Kalkulation und Gewicht", () => {
  const kiste = buildKiste({
    kistentyp: "bellmer_lq",
    innenLaenge: 3200,
    innenBreite: 1000,
    innenHoehe: 1600,
    dickeBretter: 23,
    riegelDicke: 23,
    riegelBreite: 100,
    balkenQuerAnzahl: 4,
    querbalken: balken(98, 98),
  });

  it("liefert die Riegel als Teil von components", () => {
    const riegelKomponenten = kiste.components.filter(
      (component) => component.type === "Riegel",
    );
    expect(riegelKomponenten).toHaveLength(4);
  });

  it("berücksichtigt die Riegel in den Materialkosten", () => {
    const riegelKosten = kiste.riegel.reduce(
      (total, component) =>
        total + component.preisInEurGesamt * component.amount,
      0,
    );
    expect(riegelKosten).toBeGreaterThan(0);
    expect(kiste.materialCost).toBeGreaterThan(riegelKosten);
  });

  it("zählt das Riegelvolumen zum Massivholzvolumen für das Gewicht", () => {
    const riegelVolumen = kiste.riegel.reduce(
      (total, component) =>
        total +
        (component.masse.laenge / 1000) *
          (component.masse.breite / 1000) *
          (component.masse.dicke / 1000) *
          component.amount,
      0,
    );
    expect(kiste.massivholzVolumenM3).toBeGreaterThanOrEqual(riegelVolumen);
    expect(kiste.calculateWeightKg(8)).toBeGreaterThan(riegelVolumen * 425);
  });

  it("bleibt für Bestandskisten ohne Riegelart maßhaltig und preisneutral", () => {
    const ohneRiegelart = buildKiste({
      kistentyp: "bellmer_lq",
      innenLaenge: 3200,
      innenBreite: 1000,
      innenHoehe: 1600,
      dickeBretter: 23,
      riegelDicke: 23,
      riegelBreite: 100,
      balkenQuerAnzahl: 4,
      querbalken: balken(98, 98),
      ohneRiegelMaterial: true,
    });

    expect(ohneRiegelart.riegel).toHaveLength(4);
    expect(
      ohneRiegelart.riegel.every(
        (component) => component.preisInEurGesamt === 0,
      ),
    ).toBe(true);
    expect(ohneRiegelart.riegel[0].masse.laenge).toBe(1046);
  });

  it("entfällt die Riegelposition, wenn ihre Anzahl null ist", () => {
    const ohneSeitenriegel = buildKiste({
      kistentyp: "bellmer_lq",
      innenLaenge: 3200,
      innenBreite: 1000,
      innenHoehe: 1600,
      dickeBretter: 23,
      riegelDicke: 23,
      riegelBreite: 100,
      balkenQuerAnzahl: 4,
      querbalken: balken(98, 98),
      seitenriegelAnzahl: 0,
    });

    expect(
      ohneSeitenriegel.riegel.map((component) => component.name),
    ).not.toContain("Seitenriegel senkrecht/vertikal");
  });
});
