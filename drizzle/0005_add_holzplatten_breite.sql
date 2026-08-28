-- holzplatten.breite ist im Drizzle-Schema und in der Settings-UI vorhanden,
-- fehlte aber in der Datenbank. Ohne die Spalte scheitert jede Abfrage, die
-- die Relation "bretter" lädt (u. a. der Excel-Export).
ALTER TABLE "holzplatten" ADD COLUMN IF NOT EXISTS "breite" integer;
