-- Fünf Felder aus price_settings entfernen, die nie in die Preisberechnung
-- eingeflossen sind.
--
-- materialCostFactor / generalMarkup / additionalMarkup1 / additionalMarkup2
--   stammen aus dem ursprünglichen Preismodell (Commit df9a927), das vor der
--   Kundenvorgabe entstand. Es rechnete
--     (Material × Faktor + Arbeit) × (1+a) × (1+b) × (1+c)
--   und wurde durch die Kette Faktor A–D ersetzt, weil A und B laut Auftrag
--   VOR der Arbeitszeit greifen und C und D danach.
--
-- generalMarkupEuro war eine nie fertiggestellte Euro-Pauschale: der Wert
--   wurde einmal ausgelesen, aber nie an calculateFinalPrice übergeben.
--
-- Die Kalkulation nutzt ausschließlich factor_a..factor_d, hourly_rate,
-- work_hours und platten_gewicht_kg_pro_m2. Es gehen keine wirksamen Werte
-- verloren.
ALTER TABLE "price_settings" DROP COLUMN IF EXISTS "material_cost_factor";
ALTER TABLE "price_settings" DROP COLUMN IF EXISTS "general_markup";
ALTER TABLE "price_settings" DROP COLUMN IF EXISTS "additional_markup1";
ALTER TABLE "price_settings" DROP COLUMN IF EXISTS "additional_markup2";
ALTER TABLE "price_settings" DROP COLUMN IF EXISTS "general_markup_euro";
