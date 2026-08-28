import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/server/db";
import { kisten, KISTEN_TYP_LABELS } from "@/server/db/schemas";
import { eq } from "drizzle-orm";
import { HOLZ_DICHTE_KG_PRO_M3, Kiste } from "@/server/domain/kiste";
import { settingsService } from "@/server/services/settings.service";
import { calculateFinalPrice } from "@/utils/pricing";

const CURRENCY_FORMAT = "#,##0.00 [$€-407]";

/** Zahl mit deutschem Dezimalkomma, für die Formeltexte in Abschnitt 3. */
const formatNumber = (value: number, decimals: number) =>
  value.toFixed(decimals).replace(".", ",");
const formatEuro = (value: number) => `${formatNumber(value, 2)} €`;
const formatFactor = (value: number) => formatNumber(value, 6);

function addSectionTitle(ws: ExcelJS.Worksheet, row: number, text: string) {
  ws.mergeCells(`A${row}:J${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = text;
  cell.font = { bold: true, size: 12, color: { argb: "FF1F2937" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function setBorder(
  ws: ExcelJS.Worksheet,
  fromRow: number,
  toRow: number,
  fromCol = 1,
  toCol = 10,
) {
  for (let row = fromRow; row <= toRow; row++) {
    for (let col = fromCol; col <= toCol; col++) {
      ws.getCell(row, col).border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    }
  }
}

export async function buildKistenSpecWorkbook(kisteId: number) {
  const k = await db.query.kisten.findFirst({
    where: eq(kisten.id, kisteId),
    with: {
      bretter: { with: { varianten: true } },
      bretterBoden: { with: { varianten: true } },
      balkenLaengs: true,
      balkenQuer: true,
      riegel: true,
    },
  });

  if (!k) throw new Error("Kiste nicht gefunden");
  const aggregate = Kiste.fromRow(k);
  const pricingSettings = await settingsService.getLatest();
  const plattenGewichtKgProM2 = Number(
    pricingSettings.plattenGewichtKgProM2 ?? 8,
  );

  const materialCost = aggregate.materialCost;
  const calculatedWeightKg = aggregate.calculateWeightKg(plattenGewichtKgProM2);
  const gesamtAussenflaecheM2 = aggregate.gesamtAussenflaecheM2;
  const calculated = calculateFinalPrice(materialCost, {
    factorA: Number(pricingSettings.factorA),
    factorB: Number(pricingSettings.factorB),
    factorC: Number(pricingSettings.factorC),
    factorD: Number(pricingSettings.factorD),
    hourlyRate: Number(pricingSettings.hourlyRate),
    workHours: Number(pricingSettings.workHours),
  });

  const components = aggregate.components.filter(
    (component) => component.amount > 0,
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kistenkonfigurator";
  wb.created = new Date();
  const ws = wb.addWorksheet("Kistenspezifikation");
  ws.properties.defaultRowHeight = 20;

  ws.columns = [
    { width: 6 },
    { width: 28 },
    { width: 12 },
    { width: 10 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
    { width: 16 },
    { width: 15 },
    { width: 15 },
  ];

  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = "Kistenspezifikation";
  ws.getCell("A1").font = {
    bold: true,
    size: 18,
    color: { argb: "FF111827" },
  };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

  ws.mergeCells("A2:J2");
  ws.getCell("A2").value =
    `Erstellt am ${new Date().toLocaleDateString("de-DE")}`;
  ws.getCell("A2").font = { size: 10, color: { argb: "FF6B7280" } };

  let row = 4;

  addSectionTitle(ws, row, "1) Kisten- und Materialdaten");
  row += 1;

  const infoRows: Array<[string, string | number]> = [
    ["Kisten-ID", k.id],
    ["Bezeichnung", k.name?.trim() || `Kiste #${k.id}`],
    ["Kistentyp", KISTEN_TYP_LABELS[k.kistentyp] ?? k.kistentyp],
    [
      "Innenmaß (L × B × H)",
      `${k.innenLaenge} × ${k.innenBreite} × ${k.innenHoehe} mm`,
    ],
    ["Bretter", k.bretter?.typ ?? `ID ${k.holzBretterID}`],
    ["Bretterdicke", `${k.dickeBretter} mm`],
    [
      "Bodenbrett",
      k.bretterBoden?.typ ??
        k.bretter?.typ ??
        (k.holzBretterBodenID ? `ID ${k.holzBretterBodenID}` : "-"),
    ],
    ["Bodenbrettdicke", `${k.dickeBretterBoden ?? k.dickeBretter} mm`],
    ["Anzahl Bodenbretter", Number(k.bodenAnzahl ?? 1)],
    [
      "Balken längs",
      k.balkenLaengs
        ? `${k.balkenLaengs.typ} (${k.balkenLaengs.staerke}×${k.balkenLaengs.breite} mm)`
        : "-",
    ],
    [
      "Balken quer",
      k.balkenQuer
        ? `${k.balkenQuer.typ} (${k.balkenQuer.staerke}×${k.balkenQuer.breite} mm)`
        : "-",
    ],
    [
      "Riegel",
      k.riegel
        ? `${k.riegel.typ} (${k.riegelDicke}×${k.riegelBreite} mm)`
        : `${k.riegelDicke}×${k.riegelBreite} mm (keine Riegelart gewählt)`,
    ],
    ["Seitenriegel pro Seite", Number(k.seitenriegelAnzahl)],
  ];

  const infoStart = row;
  for (const [label, value] of infoRows) {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { bold: true, color: { argb: "FF374151" } };
    ws.mergeCells(`B${row}:J${row}`);
    ws.getCell(`B${row}`).value = value;
    ws.getCell(`B${row}`).alignment = {
      horizontal: "left",
      vertical: "middle",
    };
    row += 1;
  }
  setBorder(ws, infoStart, row - 1);

  row += 1;
  addSectionTitle(ws, row, "2) Komponentenübersicht mit Maßen");
  row += 1;

  const headerRow = row;
  const headers = [
    "Pos.",
    "Komponente",
    "Typ",
    "Anzahl",
    "Länge (mm)",
    "Breite (mm)",
    "Dicke (mm)",
    "Fläche / Volumen",
    "Einzelpreis",
    "Gesamtpreis",
  ];

  headers.forEach((header, index) => {
    const cell = ws.getCell(row, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF374151" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  row += 1;
  const componentStart = row;

  components.forEach((component, index) => {
    const isBrett = component.type === "Brett";
    const areaM2 =
      (component.masse.laenge * component.masse.breite) / 1_000_000;
    const volumeCm3 =
      (component.masse.laenge *
        component.masse.breite *
        component.masse.dicke) /
      1000;
    const volumeM3 =
      (component.masse.laenge *
        component.masse.breite *
        component.masse.dicke) /
      1_000_000_000;
    const quantity = Number(component.amount) || 0;
    const unitPrice = Number(component.preisInEurGesamt) || 0;
    const totalPrice = unitPrice * quantity;

    ws.getCell(`A${row}`).value = index + 1;
    ws.getCell(`B${row}`).value = component.name;
    ws.getCell(`C${row}`).value = component.type;
    ws.getCell(`D${row}`).value = quantity;
    ws.getCell(`E${row}`).value = component.masse.laenge;
    ws.getCell(`F${row}`).value = component.masse.breite;
    ws.getCell(`G${row}`).value = component.masse.dicke;
    ws.getCell(`H${row}`).value = isBrett
      ? component.pricingUnit === "cm3"
        ? `${volumeCm3.toFixed(2).replace(".", ",")} cm³`
        : `${areaM2.toFixed(4).replace(".", ",")} m²`
      : `${volumeM3.toFixed(4).replace(".", ",")} m³`;
    ws.getCell(`I${row}`).value = unitPrice;
    ws.getCell(`J${row}`).value = totalPrice;

    ws.getCell(`I${row}`).numFmt = CURRENCY_FORMAT;
    ws.getCell(`J${row}`).numFmt = CURRENCY_FORMAT;
    row += 1;
  });

  const totalRow = row;
  ws.mergeCells(`A${totalRow}:I${totalRow}`);
  ws.getCell(`A${totalRow}`).value = "Materialkosten gesamt";
  ws.getCell(`A${totalRow}`).font = { bold: true, color: { argb: "FF111827" } };
  ws.getCell(`A${totalRow}`).alignment = {
    horizontal: "right",
    vertical: "middle",
  };
  ws.getCell(`J${totalRow}`).value = materialCost;
  ws.getCell(`J${totalRow}`).font = { bold: true, color: { argb: "FF111827" } };
  ws.getCell(`J${totalRow}`).numFmt = CURRENCY_FORMAT;

  setBorder(ws, headerRow, totalRow);
  ws.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: 10 },
  };

  row += 2;
  addSectionTitle(ws, row, "3) Kennzahlen und Kalkulation");
  row += 1;

  const factorA = Number(pricingSettings.factorA);
  const factorB = Number(pricingSettings.factorB);
  const factorC = Number(pricingSettings.factorC);
  const factorD = Number(pricingSettings.factorD);
  const hourlyRate = Number(pricingSettings.hourlyRate);
  const workHours = Number(pricingSettings.workHours);
  const aussenmasse = aggregate.aussenmasse;
  const materialAfterAB = materialCost * factorA * factorB;

  const metrics: Array<{
    label: string;
    formula: string;
    value: number;
    unit: string;
  }> = [
    {
      label: "Gewicht",
      formula:
        `${formatNumber(aggregate.massivholzVolumenM3, 4)} m³ × ` +
        `${HOLZ_DICHTE_KG_PRO_M3} kg/m³ + ` +
        `${formatNumber(aggregate.plattenFlaecheM2, 4)} m² × ` +
        `${formatNumber(plattenGewichtKgProM2, 2)} kg/m²`,
      value: calculatedWeightKg,
      unit: "kg",
    },
    {
      label: "Gesamt-Außenquadratmeter",
      formula:
        `2 × (${aussenmasse.laenge}×${aussenmasse.breite} + ` +
        `${aussenmasse.laenge}×${aussenmasse.hoehe} + ` +
        `${aussenmasse.breite}×${aussenmasse.hoehe}) mm² ÷ 1.000.000`,
      value: gesamtAussenflaecheM2,
      unit: "m²",
    },
    {
      label: "Materialkosten",
      formula: `Summe der Gesamtpreise aus Abschnitt 2 (${components.length} Positionen, inkl. Riegel)`,
      value: materialCost,
      unit: "EUR",
    },
    {
      label: "Arbeitsanteil aus Material",
      formula:
        `${formatEuro(materialCost)} × ${formatFactor(factorA)} × ` +
        `${formatFactor(factorB)} − ${formatEuro(materialCost)}`,
      value: calculated.laborFromMaterial,
      unit: "EUR",
    },
    {
      label: "Manuelle Arbeitskosten",
      formula: `${formatNumber(workHours, 2)} h × ${formatEuro(hourlyRate)}/h`,
      value: calculated.manualLabor,
      unit: "EUR",
    },
    {
      label: "Zwischensumme",
      formula:
        `${formatEuro(materialCost)} × ${formatFactor(factorA)} × ` +
        `${formatFactor(factorB)} + ${formatEuro(calculated.manualLabor)} = ` +
        `${formatEuro(materialAfterAB)} + ${formatEuro(calculated.manualLabor)}`,
      value: calculated.subtotal,
      unit: "EUR",
    },
    {
      label: "Kalkulierter Endpreis",
      formula:
        `${formatEuro(calculated.subtotal)} × ${formatFactor(factorC)} × ` +
        `${formatFactor(factorD)}`,
      value: calculated.final,
      unit: "EUR",
    },
    {
      label: "Faktor A",
      formula: "Einstellungen – Aufschlag auf die Materialkosten",
      value: factorA,
      unit: "",
    },
    {
      label: "Faktor B",
      formula: "Einstellungen – allgemeiner Kostenaufschlag",
      value: factorB,
      unit: "",
    },
    {
      label: "Faktor C",
      formula: "Einstellungen – Aufschlag auf die Zwischensumme",
      value: factorC,
      unit: "",
    },
    {
      label: "Faktor D",
      formula: "Einstellungen – letzter Aufschlag",
      value: factorD,
      unit: "",
    },
  ];

  const metricHeaderRow = row;
  const metricHeaders: Array<[string, string]> = [
    ["A", "Bezeichnung"],
    ["C", "Formel (mit eingesetzten Zahlen)"],
    ["H", "Wert"],
    ["J", "Einheit"],
  ];
  ws.mergeCells(`A${row}:B${row}`);
  ws.mergeCells(`C${row}:G${row}`);
  ws.mergeCells(`H${row}:I${row}`);
  for (const [column, title] of metricHeaders) {
    const cell = ws.getCell(`${column}${row}`);
    cell.value = title;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF374151" },
    };
    cell.alignment = { horizontal: "left", vertical: "middle" };
  }
  row += 1;

  for (const metric of metrics) {
    ws.mergeCells(`A${row}:B${row}`);
    ws.getCell(`A${row}`).value = metric.label;
    ws.getCell(`A${row}`).font = { bold: true, color: { argb: "FF374151" } };
    ws.getCell(`A${row}`).alignment = {
      horizontal: "left",
      vertical: "middle",
    };

    ws.mergeCells(`C${row}:G${row}`);
    ws.getCell(`C${row}`).value = metric.formula;
    ws.getCell(`C${row}`).font = { color: { argb: "FF4B5563" } };
    ws.getCell(`C${row}`).alignment = {
      horizontal: "left",
      vertical: "middle",
    };

    ws.mergeCells(`H${row}:I${row}`);
    const valueCell = ws.getCell(`H${row}`);
    valueCell.value = Number(metric.value);
    valueCell.alignment = { horizontal: "right", vertical: "middle" };
    if (metric.unit === "EUR") {
      valueCell.numFmt = CURRENCY_FORMAT;
    } else if (metric.unit === "kg") {
      valueCell.numFmt = '#,##0.00 "kg"';
    } else if (metric.unit === "m²") {
      valueCell.numFmt = '#,##0.0000 "m²"';
    } else {
      valueCell.numFmt = "#,##0.000000";
    }

    ws.getCell(`J${row}`).value = metric.unit;
    row += 1;
  }
  setBorder(ws, metricHeaderRow, row - 1);

  ws.views = [{ state: "frozen", ySplit: headerRow }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
