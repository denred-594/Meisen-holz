ALTER TABLE "holzplatten" ADD COLUMN IF NOT EXISTS "is_vollholz" boolean DEFAULT false NOT NULL;

ALTER TABLE "holzplatten_dicken"
  ALTER COLUMN "preis" TYPE numeric(12, 6);

ALTER TABLE "kisten" ADD COLUMN IF NOT EXISTS "holz_bretter_boden_id" integer;
ALTER TABLE "kisten" ADD COLUMN IF NOT EXISTS "boden_anzahl" integer DEFAULT 1 NOT NULL;
ALTER TABLE "kisten" ADD COLUMN IF NOT EXISTS "dicke_bretter_boden" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'kisten_holz_bretter_boden_id_holzplatten_id_fk'
      AND table_name = 'kisten'
  ) THEN
    ALTER TABLE "kisten"
      ADD CONSTRAINT "kisten_holz_bretter_boden_id_holzplatten_id_fk"
      FOREIGN KEY ("holz_bretter_boden_id")
      REFERENCES "public"."holzplatten"("id")
      ON DELETE no action
      ON UPDATE no action;
  END IF;
END $$;
