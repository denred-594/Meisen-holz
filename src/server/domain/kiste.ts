import {
  KistenTypId,
  T_Holzbalken,
  T_Holzplatte,
  T_HolzplatteDicke,
  T_Holzriegel,
  T_Kiste,
} from "@/server/db/schemas";

export type T_Masse = {
  laenge: number;
  breite: number;
  dicke: number;
};

export type T_CalculatedComponent_Type = "Brett" | "Balken" | "Riegel";
export type T_CalculatedComponent_PricingUnit = "m2" | "cm3" | "m3";

export type T_CalculatedComponent = {
  type: T_CalculatedComponent_Type;
  amount: number;
  name: string;
  masse: T_Masse;
  preisInEurGesamt: number;
  pricingUnit?: T_CalculatedComponent_PricingUnit;
  basisMenge?: number;
  materialName?: string;
};

export type T_HolzplatteWithVariants = T_Holzplatte & {
  varianten?: T_HolzplatteDicke[];
};

export interface T_KisteMaterialDetails {
  holzBrett?: T_HolzplatteWithVariants;
  selectedBrettVariante?: T_HolzplatteDicke | null;
  holzBrettBoden?: T_HolzplatteWithVariants | null;
  selectedBrettVarianteBoden?: T_HolzplatteDicke | null;
  holzBalkenLaengs?: T_Holzbalken | null;
  holzBalkenQuer?: T_Holzbalken | null;
  holzRiegel?: T_Holzriegel | null;
}

export type T_KisteRowWithRelations = T_Kiste &
  Partial<T_KisteMaterialDetails> & {
    bretter?: T_HolzplatteWithVariants | null;
    bretterBoden?: T_HolzplatteWithVariants | null;
    balkenLaengs?: T_Holzbalken | null;
    balkenQuer?: T_Holzbalken | null;
    riegel?: T_Holzriegel | null;
  };

export interface T_Innenmasse {
  hoehe: number;
  laenge: number;
  breite: number;
}

export interface T_KisteConfigInput {
  name?: string;
  kistentypId: KistenTypId;
  innenmasse: T_Innenmasse;
  holzBretterID: number;
  holzBretterBodenID?: number | null;
  holzBalkenLaengsID?: number | null;
  holzBalkenQuerID?: number | null;
  holzRiegelID?: number | null;
  dickeBretter: number;
  dickeBretterBoden?: number | null;
  riegelDicke: number;
  riegelBreite: number;
  balkenLaengsAnzahl: number;
  balkenQuerAnzahl: number;
  bodenAnzahl: number;
  seitenriegelAnzahl?: number;
}

export interface T_KisteData extends T_KisteMaterialDetails {
  id?: number;
  name?: string;
  kistentypId: KistenTypId;
  innenmasse: T_Innenmasse;
  gewicht: number;
  holzBretterID: number;
  holzBretterBodenID?: number | null;
  holzBalkenLaengsID?: number | null;
  holzBalkenQuerID?: number | null;
  holzRiegelID?: number | null;
  dickeBretter: number;
  dickeBretterBoden?: number | null;
  riegelDicke: number;
  riegelBreite: number;
  preis?: number;
  balkenLaengsAnzahl: number;
  balkenQuerAnzahl: number;
  bodenAnzahl: number;
  seitenriegelAnzahl: number;
}

type BrettPricing = {
  price: number;
  pricingUnit: "m2" | "cm3";
  basisMenge: number;
};

export const HOLZ_DICHTE_KG_PRO_M3 = 425;
const DEFAULT_PLATTEN_GEWICHT_KG_PRO_M2 = 8;

/**
 * Einzug der Deckelriegel gegenüber der Deckelkante.
 * Quelle: Meisen-Spezifikation Schwartz, Zeilen 35/36 ("minus 15 / 15").
 */
const DECKELRIEGEL_EINZUG_MM = 15;

/**
 * Anzahl Seitenriegel je Seite laut Meisen-Spezifikation:
 * Schwartz Zeilen 42/43 = "2x2", Bellmer Q Zeile 43 / LQ Zeile 44 = "2x3".
 */
export const SEITENRIEGEL_DEFAULT_PRO_SEITE: Record<KistenTypId, number> = {
  schwartz: 2,
  bellmer_q: 3,
  bellmer_lq: 3,
};

/** Köpferiegel laut Spezifikation immer "2x2": 2 Köpfe mit je 2 Riegeln. */
const KOEPFERIEGEL_PRO_KOPF = 2;

export class Kiste {
  constructor(private readonly data: T_KisteData) {}

  static fromRow(
    row: T_KisteRowWithRelations,
    related?: Partial<T_KisteMaterialDetails>
  ): Kiste {
    const holzBrett =
      related?.holzBrett ?? row.holzBrett ?? row.bretter ?? undefined;
    const holzBrettBoden =
      related?.holzBrettBoden ?? row.holzBrettBoden ?? row.bretterBoden ?? null;
    const holzBalkenLaengs =
      related?.holzBalkenLaengs ??
      row.holzBalkenLaengs ??
      row.balkenLaengs ??
      null;
    const holzBalkenQuer =
      related?.holzBalkenQuer ?? row.holzBalkenQuer ?? row.balkenQuer ?? null;
    const holzRiegel =
      related?.holzRiegel ?? row.holzRiegel ?? row.riegel ?? null;
    const selectedBrettVariante =
      related?.selectedBrettVariante ??
      row.selectedBrettVariante ??
      (holzBrett?.varianten ?? []).find(
        (variant) => variant.dicke === row.dickeBretter
      ) ??
      null;
    const bodenDicke = row.dickeBretterBoden ?? row.dickeBretter;
    const selectedBrettVarianteBoden =
      related?.selectedBrettVarianteBoden ??
      row.selectedBrettVarianteBoden ??
      (holzBrettBoden?.varianten ?? []).find(
        (variant) => variant.dicke === bodenDicke
      ) ??
      selectedBrettVariante;

    return new Kiste({
      id: row.id,
      name: row.name ?? undefined,
      kistentypId: row.kistentyp,
      innenmasse: {
        laenge: row.innenLaenge,
        hoehe: row.innenHoehe,
        breite: row.innenBreite,
      },
      gewicht: Number(row.gewicht),
      holzBretterID: row.holzBretterID,
      holzBretterBodenID: row.holzBretterBodenID ?? null,
      holzBalkenLaengsID: row.holzBalkenLaengsID ?? null,
      holzBalkenQuerID: row.holzBalkenQuerID ?? null,
      holzRiegelID: row.holzRiegelID ?? null,
      dickeBretter: row.dickeBretter,
      dickeBretterBoden: row.dickeBretterBoden ?? null,
      riegelDicke: row.riegelDicke,
      riegelBreite: row.riegelBreite,
      balkenLaengsAnzahl: row.balkenLaengsAnzahl ?? 0,
      balkenQuerAnzahl: row.balkenQuerAnzahl ?? 0,
      bodenAnzahl: Math.max(1, row.bodenAnzahl ?? 1),
      seitenriegelAnzahl:
        row.seitenriegelAnzahl ?? SEITENRIEGEL_DEFAULT_PRO_SEITE[row.kistentyp],
      holzBrett,
      holzBrettBoden,
      holzBalkenLaengs,
      holzBalkenQuer,
      holzRiegel,
      selectedBrettVariante,
      selectedBrettVarianteBoden,
    });
  }

  static fromConfig(input: T_KisteConfigInput): Kiste {
    return new Kiste({
      id: undefined,
      name: input.name,
      kistentypId: input.kistentypId,
      innenmasse: input.innenmasse,
      gewicht: 0,
      holzBretterID: input.holzBretterID,
      holzBretterBodenID: input.holzBretterBodenID ?? null,
      holzBalkenLaengsID: input.holzBalkenLaengsID ?? null,
      holzBalkenQuerID: input.holzBalkenQuerID,
      holzRiegelID: input.holzRiegelID ?? null,
      dickeBretter: input.dickeBretter,
      dickeBretterBoden: input.dickeBretterBoden ?? null,
      riegelDicke: input.riegelDicke,
      riegelBreite: input.riegelBreite,
      balkenLaengsAnzahl: input.balkenLaengsAnzahl,
      balkenQuerAnzahl: input.balkenQuerAnzahl,
      bodenAnzahl: Math.max(1, input.bodenAnzahl ?? 1),
      seitenriegelAnzahl: Math.max(
        0,
        input.seitenriegelAnzahl ??
          SEITENRIEGEL_DEFAULT_PRO_SEITE[input.kistentypId],
      ),
    });
  }

  get snapshot(): T_KisteData {
    return this.data;
  }

  get innenmasse(): T_Innenmasse {
    return this.data.innenmasse;
  }

  get holzBrett(): T_HolzplatteWithVariants | undefined {
    return this.data.holzBrett;
  }

  get holzBrettBoden(): T_HolzplatteWithVariants | undefined {
    return this.data.holzBrettBoden ?? this.data.holzBrett;
  }

  get selectedBrettVariante(): T_HolzplatteDicke | null {
    return (
      this.data.selectedBrettVariante ??
      (this.data.holzBrett?.varianten ?? []).find(
        (variant) => variant.dicke === this.data.dickeBretter
      ) ??
      null
    );
  }

  get selectedBrettVarianteBoden(): T_HolzplatteDicke | null {
    const bodenDicke = this.data.dickeBretterBoden ?? this.data.dickeBretter;
    return (
      this.data.selectedBrettVarianteBoden ??
      (this.holzBrettBoden?.varianten ?? []).find(
        (variant) => variant.dicke === bodenDicke
      ) ??
      this.selectedBrettVariante
    );
  }

  get holzBalkenLaengs(): T_Holzbalken | null {
    return this.data.holzBalkenLaengs ?? null;
  }

  get holzBalkenQuer(): T_Holzbalken | null {
    return this.data.holzBalkenQuer ?? null;
  }

  get holzRiegel(): T_Holzriegel | null {
    return this.data.holzRiegel ?? null;
  }

  /**
   * Stärke des Querbalkens. In der Meisen-Spezifikation ist das der Wert, um den
   * die gekürzten Riegel je Seite verringert werden (Schwartz 78 mm, Bellmer 98 mm).
   */
  private get querbalkenStaerke(): number {
    return this.data.holzBalkenQuer?.staerke ?? 0;
  }

  private get seitenriegelProSeite(): number {
    return Math.max(
      0,
      this.data.seitenriegelAnzahl ??
        SEITENRIEGEL_DEFAULT_PRO_SEITE[this.data.kistentypId],
    );
  }

  private get deckelMasse(): T_Masse {
    const masse: T_Masse = {
      dicke: this.data.dickeBretter,
      laenge:
        this.data.innenmasse.laenge +
        (this.data.dickeBretter + this.data.riegelDicke) * 2,
      breite: 0,
    };

    switch (this.data.kistentypId) {
      case "bellmer_q":
      case "bellmer_lq":
        masse.breite = this.data.innenmasse.breite + this.data.dickeBretter * 2;
        break;
      case "schwartz":
        masse.breite =
          this.data.innenmasse.breite +
          (this.data.dickeBretter + this.data.riegelDicke) * 2;
        break;
    }
    return masse;
  }

  private get zusaetzlicheBodenDickeFuerWandhoehe(): number {
    const bodenDicke = this.data.dickeBretterBoden ?? this.data.dickeBretter;
    const zusaetzlicheBodenbretter = Math.max(0, this.data.bodenAnzahl - 1);
    return zusaetzlicheBodenbretter * bodenDicke;
  }

  private get bodenMasse(): T_Masse {
    const bodenDicke = this.data.dickeBretterBoden ?? this.data.dickeBretter;
    const masse: T_Masse = {
      dicke: bodenDicke,
      laenge: 0,
      breite: 0,
    };

    switch (this.data.kistentypId) {
      case "bellmer_q":
        masse.breite = this.data.innenmasse.breite + this.data.riegelDicke * 2;
        masse.laenge =
          this.data.innenmasse.laenge +
          this.data.riegelDicke * 2 +
          this.data.dickeBretter * 2;
        break;
      case "bellmer_lq":
        masse.breite = this.data.innenmasse.breite;
        masse.laenge =
          this.data.innenmasse.laenge +
          this.data.riegelDicke * 2 +
          this.data.dickeBretter * 2;
        break;
      case "schwartz":
        masse.breite = this.data.innenmasse.breite + this.data.riegelDicke * 2;
        masse.laenge = this.data.innenmasse.laenge + this.data.riegelDicke * 2;
        break;
    }
    return masse;
  }

  private get seitenMasse(): T_Masse {
    const masse: T_Masse = {
      dicke: this.data.dickeBretter,
      laenge:
        this.data.innenmasse.laenge +
        (this.data.dickeBretter + this.data.riegelDicke) * 2,
      breite: 0,
    };

    switch (this.data.kistentypId) {
      case "bellmer_q":
        masse.breite =
          this.data.innenmasse.hoehe +
          this.zusaetzlicheBodenDickeFuerWandhoehe;
        break;
      case "bellmer_lq":
        masse.breite =
          this.data.innenmasse.hoehe +
          this.data.dickeBretter +
          this.zusaetzlicheBodenDickeFuerWandhoehe;
        break;
      case "schwartz":
        masse.breite =
          this.data.innenmasse.hoehe +
          this.data.riegelDicke * 2 +
          this.zusaetzlicheBodenDickeFuerWandhoehe;
        break;
    }
    return masse;
  }

  private get koepfeMasse(): T_Masse {
    const masse: T_Masse = {
      dicke: this.data.dickeBretter,
      laenge: 0,
      breite: 0,
    };

    switch (this.data.kistentypId) {
      case "bellmer_q":
      case "bellmer_lq":
        masse.breite =
          this.data.innenmasse.hoehe +
          this.zusaetzlicheBodenDickeFuerWandhoehe;
        masse.laenge = this.data.innenmasse.breite;
        break;
      case "schwartz":
        masse.breite =
          this.data.innenmasse.hoehe +
          this.data.riegelDicke * 2 +
          (this.data.holzBalkenQuer?.staerke ?? 0) +
          this.zusaetzlicheBodenDickeFuerWandhoehe;
        masse.laenge = this.data.innenmasse.breite + this.data.riegelDicke * 2;
        break;
    }
    return masse;
  }

  private getBrettPricing(
    masse: T_Masse,
    variante: T_HolzplatteDicke | null,
    material: T_HolzplatteWithVariants | undefined
  ): BrettPricing {
    const preis = Number(variante?.preis ?? 0);
    const isVollholz = Boolean(material?.isVollholz);
    if (isVollholz) {
      const volumenCm3 = (masse.laenge * masse.breite * masse.dicke) / 1000;
      return {
        price: volumenCm3 * preis,
        pricingUnit: "cm3",
        basisMenge: volumenCm3,
      };
    }
    const flaecheInM2 = (masse.laenge / 1000) * (masse.breite / 1000);
    return {
      price: flaecheInM2 * preis,
      pricingUnit: "m2",
      basisMenge: flaecheInM2,
    };
  }

  private buildBrettComponent(input: {
    name: string;
    amount: number;
    masse: T_Masse;
    variante: T_HolzplatteDicke | null;
    material: T_HolzplatteWithVariants | undefined;
  }): T_CalculatedComponent {
    const pricing = this.getBrettPricing(
      input.masse,
      input.variante,
      input.material
    );
    return {
      type: "Brett",
      name: input.name,
      amount: input.amount,
      masse: input.masse,
      preisInEurGesamt: pricing.price,
      pricingUnit: pricing.pricingUnit,
      basisMenge: pricing.basisMenge,
      materialName: input.material?.typ,
    };
  }

  get components() {
    const components: T_CalculatedComponent[] = [];
    const deckel = this.deckel;
    const boden = this.boden;
    const seiten = this.seiten;
    const koepfe = this.koepfe;
    const balkenLaengs = this.balkenLaengs;
    const balkenQuer = this.balkenQuer;
    components.push(deckel, boden, seiten, koepfe, balkenQuer);
    if (balkenLaengs) {
      components.push(balkenLaengs);
    }
    components.push(...this.riegel);
    return components;
  }

  get materialCost(): number {
    return this.components.reduce(
      (acc, component) =>
        acc + (Number(component.preisInEurGesamt) || 0) * (component.amount || 0),
      0
    );
  }

  get aussenmasse(): { laenge: number; breite: number; hoehe: number } {
    const deckel = this.deckelMasse;
    const boden = this.bodenMasse;
    const seiten = this.seitenMasse;
    const koepfe = this.koepfeMasse;

    const laenge = Math.max(
      deckel.laenge,
      boden.laenge,
      seiten.laenge,
      koepfe.laenge
    );
    const breite = Math.max(deckel.breite, boden.breite, koepfe.laenge);
    const hoehe =
      Math.max(seiten.breite, koepfe.breite) + deckel.dicke + boden.dicke;

    return { laenge, breite, hoehe };
  }

  get gesamtAussenflaecheM2(): number {
    const { laenge, breite, hoehe } = this.aussenmasse;
    const flaecheInMm2 =
      2 * (laenge * breite + laenge * hoehe + breite * hoehe);
    return flaecheInMm2 / 1_000_000;
  }

  /** Volumen aller über Kubikmeter abgerechneten Massivholzteile (Balken + Riegel). */
  get massivholzVolumenM3(): number {
    return this.components
      .filter(
        (component) =>
          component.type === "Balken" || component.type === "Riegel",
      )
      .reduce(
        (total, component) =>
          total +
          (component.masse.laenge / 1000) *
            (component.masse.breite / 1000) *
            (component.masse.dicke / 1000) *
            (Number(component.amount) || 0),
        0,
      );
  }

  /** Aufsummierte Fläche aller Plattenteile (Deckel, Boden, Seiten, Köpfe). */
  get plattenFlaecheM2(): number {
    return this.components
      .filter((component) => component.type === "Brett")
      .reduce(
        (total, component) =>
          total +
          (component.masse.laenge / 1000) *
            (component.masse.breite / 1000) *
            (Number(component.amount) || 0),
        0,
      );
  }

  calculateWeightKg(
    plattenGewichtKgProM2 = DEFAULT_PLATTEN_GEWICHT_KG_PRO_M2,
  ): number {
    return (
      this.massivholzVolumenM3 * HOLZ_DICHTE_KG_PRO_M3 +
      this.plattenFlaecheM2 * plattenGewichtKgProM2
    );
  }

  get calculatedWeightKg(): number {
    return this.calculateWeightKg();
  }

  private get deckel(): T_CalculatedComponent {
    return this.buildBrettComponent({
      name: "Brett Deckel",
      amount: 1,
      masse: this.deckelMasse,
      variante: this.selectedBrettVariante,
      material: this.holzBrett,
    });
  }

  private get boden(): T_CalculatedComponent {
    return this.buildBrettComponent({
      name: "Brett Boden",
      amount: this.data.bodenAnzahl,
      masse: this.bodenMasse,
      variante: this.selectedBrettVarianteBoden,
      material: this.holzBrettBoden,
    });
  }

  private get seiten(): T_CalculatedComponent {
    return this.buildBrettComponent({
      name: "Brett Seite",
      amount: 2,
      masse: this.seitenMasse,
      variante: this.selectedBrettVariante,
      material: this.holzBrett,
    });
  }

  private get koepfe(): T_CalculatedComponent {
    return this.buildBrettComponent({
      name: "Brett Kopf",
      amount: 2,
      masse: this.koepfeMasse,
      variante: this.selectedBrettVariante,
      material: this.holzBrett,
    });
  }

  private getPreisForBalkenBymasse(masse: T_Masse, preisProM3: number): number {
    const volumenInM3 =
      (masse.laenge / 1000) * (masse.breite / 1000) * (masse.dicke / 1000);
    return volumenInM3 * preisProM3;
  }

  private get balkenLaengs(): T_CalculatedComponent | null {
    switch (this.data.kistentypId) {
      case "bellmer_lq": {
        const masse = {
          laenge:
            this.data.innenmasse.laenge +
            (this.data.riegelDicke + this.data.dickeBretter) * 2,
          breite: this.data.holzBalkenLaengs?.breite || 0,
          dicke: this.data.holzBalkenLaengs?.staerke || 0,
        };
        const preis = this.getPreisForBalkenBymasse(
          masse,
          this.data.holzBalkenLaengs?.preisProKubikmeter || 0
        );
        return {
          amount: this.data.balkenLaengsAnzahl,
          type: "Balken",
          name: "Balken Längs",
          masse,
          preisInEurGesamt: preis,
          pricingUnit: "m3",
          basisMenge:
            (masse.laenge * masse.breite * masse.dicke) / 1_000_000_000,
          materialName: this.data.holzBalkenLaengs?.typ,
        };
      }
      case "bellmer_q":
      case "schwartz":
      default:
        return null;
    }
  }

  private get balkenQuer(): T_CalculatedComponent {
    const masse: T_Masse = { laenge: 0, breite: 0, dicke: 0 };
    switch (this.data.kistentypId) {
      case "bellmer_q":
      case "bellmer_lq":
        masse.laenge = this.data.innenmasse.breite + this.data.dickeBretter * 2;
        break;
      case "schwartz":
        masse.laenge =
          this.data.innenmasse.breite +
          this.data.riegelDicke * 2 +
          this.data.dickeBretter * 2;
        break;
    }
    masse.breite = this.data.holzBalkenQuer?.breite || 0;
    masse.dicke = this.data.holzBalkenQuer?.staerke || 0;
    const preis = this.getPreisForBalkenBymasse(
      masse,
      this.data.holzBalkenQuer?.preisProKubikmeter || 0
    );
    return {
      amount: this.data.balkenQuerAnzahl,
      type: "Balken",
      name: "Balken Quer",
      masse,
      preisInEurGesamt: preis,
      pricingUnit: "m3",
      basisMenge: (masse.laenge * masse.breite * masse.dicke) / 1_000_000_000,
      materialName: this.data.holzBalkenQuer?.typ,
    };
  }

  private buildRiegelComponent(
    name: string,
    amount: number,
    laenge: number,
  ): T_CalculatedComponent {
    const masse: T_Masse = {
      laenge,
      breite: this.data.riegelBreite,
      dicke: this.data.riegelDicke,
    };
    const volumenInM3 =
      (masse.laenge / 1000) * (masse.breite / 1000) * (masse.dicke / 1000);
    return {
      type: "Riegel",
      name,
      amount,
      masse,
      preisInEurGesamt:
        volumenInM3 * (this.data.holzRiegel?.preisProKubikmeter ?? 0),
      pricingUnit: "m3",
      basisMenge: volumenInM3,
      materialName: this.data.holzRiegel?.typ,
    };
  }

  /**
   * Riegel gemäß Meisen-Kistenspezifikation. Querschnitt ist immer
   * riegelDicke × riegelBreite, Abrechnung über Kubikmeter.
   *
   * Schwartz (Riegel innen, Sheet-Zeilen 35, 36, 42, 43, 48, 49)
   * Bellmer Q  (Riegel außen, Sheet-Zeilen 36, 43, 48, 49)
   * Bellmer LQ (Riegel außen, Sheet-Zeilen 36, 44, 49, 50)
   */
  get riegel(): T_CalculatedComponent[] {
    const { laenge: innenLaenge, breite: innenBreite, hoehe: innenHoehe } =
      this.data.innenmasse;
    const balkenStaerke = this.querbalkenStaerke;
    const seitenriegelJeSeite = this.seitenriegelProSeite;
    const koepferiegel = 2 * KOEPFERIEGEL_PRO_KOPF;
    const deckel = this.deckelMasse;

    const spezifikation: Array<{
      name: string;
      amount: number;
      laenge: number;
    }> = [];

    switch (this.data.kistentypId) {
      case "schwartz":
        spezifikation.push(
          {
            name: "Deckelriegel längs",
            amount: 2,
            laenge: deckel.laenge - 2 * DECKELRIEGEL_EINZUG_MM,
          },
          {
            name: "Deckelriegel quer",
            amount: this.data.balkenQuerAnzahl,
            laenge:
              deckel.breite -
              2 * DECKELRIEGEL_EINZUG_MM -
              2 * balkenStaerke,
          },
          {
            name: "Seitenriegel längs",
            amount: 2 * seitenriegelJeSeite,
            laenge: innenLaenge,
          },
          {
            name: "Seitenriegel senkrecht/vertikal",
            amount: 2 * seitenriegelJeSeite,
            laenge: innenHoehe - 2 * balkenStaerke,
          },
          {
            name: "Köpferiegel waagerecht",
            amount: koepferiegel,
            laenge: innenBreite + 2 * this.data.riegelDicke,
          },
          {
            name: "Köpferiegel senkrecht/vertikal",
            amount: koepferiegel,
            laenge: innenHoehe - 2 * balkenStaerke,
          },
        );
        break;
      case "bellmer_q":
      case "bellmer_lq":
        spezifikation.push(
          {
            name: "Deckelriegel quer",
            amount: this.data.balkenQuerAnzahl,
            laenge: deckel.breite,
          },
          {
            name: "Seitenriegel senkrecht/vertikal",
            amount: 2 * seitenriegelJeSeite,
            laenge:
              innenHoehe +
              balkenStaerke +
              2 * this.data.dickeBretter +
              this.data.riegelDicke,
          },
          {
            name: "Köpferiegel waagerecht",
            amount: koepferiegel,
            laenge: innenBreite - 2 * balkenStaerke,
          },
          {
            name: "Köpferiegel senkrecht/vertikal",
            amount: koepferiegel,
            laenge: innenHoehe,
          },
        );
        break;
    }

    return spezifikation
      .filter((eintrag) => eintrag.amount > 0 && eintrag.laenge > 0)
      .map((eintrag) =>
        this.buildRiegelComponent(eintrag.name, eintrag.amount, eintrag.laenge),
      );
  }
}
