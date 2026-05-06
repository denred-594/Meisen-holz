import {
  KistenTypId,
  T_Holzbalken,
  T_Holzplatte,
  T_HolzplatteDicke,
  T_Kiste,
} from "@/server/db/schemas";

export type T_Masse = {
  laenge: number;
  breite: number;
  dicke: number;
};

export type T_CalculatedComponent_Type = "Brett" | "Balken";
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
}

export type T_KisteRowWithRelations = T_Kiste &
  Partial<T_KisteMaterialDetails> & {
    bretter?: T_HolzplatteWithVariants | null;
    bretterBoden?: T_HolzplatteWithVariants | null;
    balkenLaengs?: T_Holzbalken | null;
    balkenQuer?: T_Holzbalken | null;
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
  gewicht: number;
  holzBretterID: number;
  holzBretterBodenID?: number | null;
  holzBalkenLaengsID?: number | null;
  holzBalkenQuerID?: number | null;
  dickeBretter: number;
  dickeBretterBoden?: number | null;
  riegelDicke: number;
  riegelBreite: number;
  balkenLaengsAnzahl: number;
  balkenQuerAnzahl: number;
  bodenAnzahl: number;
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
  dickeBretter: number;
  dickeBretterBoden?: number | null;
  riegelDicke: number;
  riegelBreite: number;
  preis?: number;
  balkenLaengsAnzahl: number;
  balkenQuerAnzahl: number;
  bodenAnzahl: number;
}

type BrettPricing = {
  price: number;
  pricingUnit: "m2" | "cm3";
  basisMenge: number;
};

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
      dickeBretter: row.dickeBretter,
      dickeBretterBoden: row.dickeBretterBoden ?? null,
      riegelDicke: row.riegelDicke,
      riegelBreite: row.riegelBreite,
      balkenLaengsAnzahl: row.balkenLaengsAnzahl ?? 0,
      balkenQuerAnzahl: row.balkenQuerAnzahl ?? 0,
      bodenAnzahl: Math.max(1, row.bodenAnzahl ?? 1),
      holzBrett,
      holzBrettBoden,
      holzBalkenLaengs,
      holzBalkenQuer,
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
      gewicht: input.gewicht,
      holzBretterID: input.holzBretterID,
      holzBretterBodenID: input.holzBretterBodenID ?? null,
      holzBalkenLaengsID: input.holzBalkenLaengsID ?? null,
      holzBalkenQuerID: input.holzBalkenQuerID,
      dickeBretter: input.dickeBretter,
      dickeBretterBoden: input.dickeBretterBoden ?? null,
      riegelDicke: input.riegelDicke,
      riegelBreite: input.riegelBreite,
      balkenLaengsAnzahl: input.balkenLaengsAnzahl,
      balkenQuerAnzahl: input.balkenQuerAnzahl,
      bodenAnzahl: Math.max(1, input.bodenAnzahl ?? 1),
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
}
