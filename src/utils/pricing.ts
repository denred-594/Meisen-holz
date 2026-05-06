export type PricingFactors = {
  // Multiplikatoren (z. B. 100/90, 100/70, 100/90, 100/98)
  factorA: number; // erster Aufschlag (z. B. 100/90)
  factorB: number; // allgemeiner Kostenaufschlag (z. B. 100/70)
  factorC: number; // weiterer Aufschlag (z. B. 100/90)
  factorD: number; // letzter Aufschlag (z. B. 100/98)
  hourlyRate: number; // Stundensatz (einstellbar)
  workHours: number; // Arbeitszeit (einstellbar)
};

export function calculateFinalPrice(
  materialCost: number,
  factors: PricingFactors | undefined
) {
  // Sequenz gemäß Vorgabe:
  // 1) materialCost * factorA
  // 2) * factorB (allgemeiner Kostenaufschlag)
  // 3) + (Arbeitszeit * Stundensatz)
  // 4) * factorC
  // 5) * factorD
  if (!factors) {
    return {
      laborFromMaterial: 0,
      manualLabor: 0,
      subtotal: materialCost,
      final: materialCost,
    };
  }
  const afterA = materialCost * factors.factorA;
  const afterB = afterA * factors.factorB;
  const manualLabor = factors.hourlyRate * factors.workHours; // Arbeitszeit * Stundensatz
  const subtotal = afterB + manualLabor;
  const afterC = subtotal * factors.factorC;
  const final = afterC * factors.factorD;
  const laborFromMaterial = afterB - materialCost; // optionales Insight
  return {
    laborFromMaterial,
    manualLabor,
    subtotal,
    final,
  };
}
