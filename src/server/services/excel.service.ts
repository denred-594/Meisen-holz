import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/server/db";
import { kisten, KISTEN_TYP_LABELS } from "@/server/db/schemas";
import { eq } from "drizzle-orm";
import { Kiste } from "@/server/domain/kiste";
import { settingsService } from "@/server/services/settings.service";
import { calculateFinalPrice } from "@/utils/pricing";

const CURRENCY_FORMAT = "#,##0.00 [$€-407]";

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
    },
  });

  if (!k) throw new Error("Kiste nicht gefunden");
  const aggregate = Kiste.fromRow(k);
  const pricingSettings = await settingsService.getLatest();

  const materialCost = aggregate.materialCost;
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
      (component.masse.laenge * component.masse.breite * component.masse.dicke) /
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
        ? `${volumeCm3.toFixed(2)} cm³`
        : `${areaM2.toFixed(4)} m²`
      : `${volumeM3.toFixed(4)} m³`;
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

  const metrics: Array<[string, number, string?]> = [
    ["Gewicht", Number(k.gewicht), "kg"],
    ["Gesamt-Außenquadratmeter", gesamtAussenflaecheM2, "m²"],
    ["Materialkosten", materialCost, "EUR"],
    ["Arbeitsanteil aus Material", calculated.laborFromMaterial, "EUR"],
    ["Manuelle Arbeitskosten", calculated.manualLabor, "EUR"],
    ["Zwischensumme", calculated.subtotal, "EUR"],
    ["Kalkulierter Endpreis", calculated.final, "EUR"],
    ["Faktor A", Number(pricingSettings.factorA), ""],
    ["Faktor B", Number(pricingSettings.factorB), ""],
    ["Faktor C", Number(pricingSettings.factorC), ""],
    ["Faktor D", Number(pricingSettings.factorD), ""],
  ];

  const metricStart = row;
  for (const [label, value, unit] of metrics) {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { bold: true, color: { argb: "FF374151" } };
    ws.mergeCells(`B${row}:H${row}`);
    ws.getCell(`B${row}`).value = unit === "kg" ? value : Number(value);
    if (unit === "EUR") {
      ws.getCell(`B${row}`).numFmt = CURRENCY_FORMAT;
    } else if (unit === "kg") {
      ws.getCell(`B${row}`).numFmt = '#,##0.00 "kg"';
    } else if (unit === "m²") {
      ws.getCell(`B${row}`).numFmt = '#,##0.0000 "m²"';
    }
    ws.getCell(`I${row}`).value = unit ?? "";
    row += 1;
  }
  setBorder(ws, metricStart, row - 1);

  ws.views = [{ state: "frozen", ySplit: headerRow }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
