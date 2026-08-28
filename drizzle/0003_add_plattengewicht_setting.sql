ALTER TABLE "price_settings"
  ADD COLUMN IF NOT EXISTS "platten_gewicht_kg_pro_m2" numeric(10, 2) DEFAULT 8 NOT NULL;
