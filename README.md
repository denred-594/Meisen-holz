Ein Projekt-Template (Next.js App Router) mit Mantine, tRPC, Drizzle/Postgres und TanStack Query.

Migration der Holz-Kisten Anwendung (Backend + Frontend) integriert:

- Neue Drizzle Tabellen: `holzplatten`, `holzbalken`, `kisten`, `price_settings`, `kistentyp`
- Services: `materialService`, `kistenService`, `settingsService`
- tRPC Router: `material`, `kisten`, `settings`
- Seiten: `/kisten`, `/settings`

Schnellstart:

1. Environment Variable `DATABASE_URL` in `.env` setzen (Postgres).
2. Drizzle Migrations generieren & anwenden:

```bash
pnpm drizzle:generate
pnpm drizzle:push
```

3. Seed Skript ausführen:

```bash
pnpm ts-node ./scripts/seedHolz.ts
```

4. Development Server starten:

```bash
pnpm dev
```

Wichtige TRPC Endpunkte:

- `material.holzplatten`, `material.holzbalken`, Upsert/Deletion Mutationen
- `kisten.list`, `kisten.create` (inkl. Preisberechnung)
- `settings.get`, `settings.update` (historisiert als neue Zeile)

Preisberechnung (vereinfacht) nutzt:
Volumen der Balken & Riegel × Durchschnittlicher Kubikmeterpreis × Materialfaktor + Arbeitskosten → Markups.

Weitere Aufgaben / Erweiterungen:

- Validierung & Fehlerbehandlung vertiefen
- Mehrere Holzbalkentypen im Preis mitteln
- Detailed Bretter-Volumenberechnung
- Auth / Rollen für Einstellungen

## Docker (One-Command Setup)

Das Projekt ist mit Docker Compose inkl. PostgreSQL lauffähig.

### 1) Environment vorbereiten

Lege eine `.env` im Projektroot an (z. B. basierend auf `env_template`) und setze mindestens:

```bash
POSTGRES_DB=redel
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
RUN_SEED=false
BETTER_AUTH_SECRET=please-change-this-secret
BETTER_AUTH_URL=http://localhost:3000
```

Die App bekommt ihre `DATABASE_URL` automatisch über `docker-compose.yml`.

### 2) Start mit einem Befehl

```bash
docker compose up --build
```

Was automatisch passiert:

- PostgreSQL startet mit Healthcheck
- Next.js App wird gebaut
- Beim App-Start wird `drizzle-kit push` ausgeführt (`npm run dbp`)
- Optionales Seed-Skript läuft, wenn `RUN_SEED=true`
- Danach startet die App auf `http://localhost:3000`

Hinweis: Postgres wird standardmäßig **nicht** auf einen Host-Port gemappt (vermeidet Port-Konflikte). Die App verbindet sich intern über den Compose-Service `postgres`.

### 3) Nützliche Befehle

```bash
# Stoppen
docker compose down

# Stoppen inkl. DB-Daten löschen
docker compose down -v
```

## Erweiterungen: Bellmer-Kistentypen, Excel-Export und Pipeline-Preise

- Frontend erweitert um Kistentypen:
  - "Bellmer Vollholzkiste mit Querbalken"
  - "Bellmer Vollholzkiste mit Längs- und Querbalken"
  - Dynamische Eingaben: Anzahl Quer-/Längsbalken, Balkenmaße
- Preisberechnung als Pipeline:
  - Material = Bretter (€/m², aus `holzplatten`) + Balken (€/m³, aus `holzbalken`)
  - Arbeitskosten aus Material = Material × factorA × factorB
  - Manuelle Arbeit = hourlyRate × workHours
  - Zwischensumme = Material + Arbeitskosten + generalMarkupEuro + Manuelle Arbeit
  - Endpreis = Zwischensumme × factorC × factorD
  - Faktoren / Sätze via `settings.update` konfigurierbar (A–D, generalMarkupEuro, hourlyRate, workHours)
- Excel-Export:
  - Route: `GET /api/kisten/[id]/export` liefert `.xlsx`
  - Enthält Kopf, Stücklisten (Bretter/Balken) und Endpreis

## DB Migration

Die Tabelle `price_settings` wurde um Felder `factorA`, `factorB`, `factorC`, `factorD`, `generalMarkupEuro` erweitert. Bitte Drizzle ausführen:

```bash
pnpm db:gen
pnpm db:push
```

## Tests

Ein Unit-Test für die Pipeline ist enthalten:

```bash
pnpm test
```
