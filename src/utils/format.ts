/**
 * Einheitliche Zahlenformatierung für die Oberfläche.
 * Deutsches Dezimalkomma, damit Liste, Detail und Export gleich aussehen.
 */

export function formatDecimal(value: number | null | undefined, digits = 2) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "–";
  return numeric.toFixed(digits).replace(".", ",");
}

export function formatEuro(value: number | null | undefined, digits = 2) {
  return `${formatDecimal(value, digits)} €`;
}

/** Maßangabe in fester Reihenfolge Länge × Breite × Höhe/Dicke. */
export function formatMasse(laenge: number, breite: number, drittes: number) {
  return `${laenge} × ${breite} × ${drittes} mm`;
}
