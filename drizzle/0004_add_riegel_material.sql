CREATE TABLE IF NOT EXISTS "holzriegel" (
  "id" serial PRIMARY KEY NOT NULL,
  "typ" text NOT NULL,
  "staerke" integer NOT NULL,
  "breite" integer NOT NULL,
  "preis_pro_kubikmeter" numeric(12, 2) NOT NULL
);

ALTER TABLE "kisten" ADD COLUMN IF NOT EXISTS "holz_riegel_id" integer;
ALTER TABLE "kisten" ADD COLUMN IF NOT EXISTS "seitenriegel_anzahl" integer DEFAULT 3 NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'kisten_holz_riegel_id_holzriegel_id_fk'
      AND table_name = 'kisten'
  ) THEN
    ALTER TABLE "kisten"
      ADD CONSTRAINT "kisten_holz_riegel_id_holzriegel_id_fk"
      FOREIGN KEY ("holz_riegel_id")
      REFERENCES "public"."holzriegel"("id")
      ON DELETE no action
      ON UPDATE no action;
  END IF;
END $$;
