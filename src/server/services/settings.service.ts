import "server-only";
import { db } from "@/server/db";
import { priceSettings, T_PriceSettingsRow } from "@/server/db/schemas";
import { desc } from "drizzle-orm";

export const settingsService = {
  getLatest: async (): Promise<T_PriceSettingsRow> => {
    const rows = await db
      .select()
      .from(priceSettings)
      .orderBy(desc(priceSettings.id))
      .limit(1);
    if (rows.length === 0) {
      // Insert default if missing
      const inserted = await db.insert(priceSettings).values({}).returning();
      return inserted[0];
    }
    return rows[0];
  },
  update: async (
    values: Partial<T_PriceSettingsRow>
  ): Promise<T_PriceSettingsRow> => {
    // Insert new snapshot row (history)
    const inserted = await db
      .insert(priceSettings)
      .values({
        materialCostFactor: values.materialCostFactor ?? undefined,
        generalMarkup: values.generalMarkup ?? undefined,
        additionalMarkup1: values.additionalMarkup1 ?? undefined,
        additionalMarkup2: values.additionalMarkup2 ?? undefined,
        hourlyRate: values.hourlyRate ?? undefined,
        workHours: values.workHours ?? undefined,
        factorA: (values as any).factorA ?? undefined,
        factorB: (values as any).factorB ?? undefined,
        factorC: (values as any).factorC ?? undefined,
        factorD: (values as any).factorD ?? undefined,
        generalMarkupEuro: (values as any).generalMarkupEuro ?? undefined,
      })
      .returning();
    return inserted[0];
  },
};
