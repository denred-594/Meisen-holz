// Erstellt ein Weitergabe-Archiv des Projekts.
// Aufruf: npm run zip
//
// Bewusst NICHT über `git archive`: mehrere Dateien sind noch nicht committet
// (Migrationen, Tests, Hilfsmodule). git archive würde sie stillschweigend
// weglassen und der Kunde bekäme ein unvollständiges Projekt.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const WURZEL = process.cwd();
const AUSGABE_ORDNER = join(WURZEL, "dist");

/** Muster, die nicht ins Archiv gehören (zip -x Syntax). */
const AUSSCHLUSS = [
  // Abhängigkeiten und Buildartefakte
  "node_modules/*",
  ".next/*",
  "dist/*",
  "*.tsbuildinfo",
  // Versionskontrolle
  ".git/*",
  ".gitignore.bak",
  // Zugangsdaten – dürfen niemals raus
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  // Betriebssystem- und Editorkram
  "*.DS_Store",
  ".vscode/*",
  ".idea/*",
  // Eingangsmaterial und interne Notizen
  "attachements/*",
  "docs/*",
  // Von Werkzeugen erzeugte Anweisungsdateien (Next.js legt sie beim Install an)
  "AGENTS.md",
  "CLAUDE.md",
  ".claude/*",
  ".cursor/*",
  // Sonstiges
  "*.zip",
  "*.log",
];

/** Nach dem Packen: nichts davon darf im Archiv auftauchen. */
const VERBOTEN = [
  { muster: /(^|\/)\.env($|\.)/, name: ".env (Zugangsdaten)" },
  { muster: /(^|\/)node_modules\//, name: "node_modules" },
  { muster: /(^|\/)\.git\//, name: ".git" },
  { muster: /(^|\/)\.next\//, name: ".next" },
  { muster: /\.pem$|\.key$/, name: "Schlüsseldatei" },
];

function pruefeZipVorhanden() {
  try {
    execFileSync("zip", ["-v"], { stdio: "ignore" });
  } catch {
    console.error(
      "Fehler: das Kommando `zip` wurde nicht gefunden.\n" +
        "Unter macOS ist es normalerweise vorinstalliert, unter Linux via `apt install zip`.",
    );
    process.exit(1);
  }
}

function formatiereGroesse(bytes) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1
    ? `${mb.toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

function main() {
  pruefeZipVorhanden();

  const datum = new Date().toISOString().slice(0, 10);
  const dateiname = `${basename(WURZEL)}_${datum}.zip`;
  const ziel = join(AUSGABE_ORDNER, dateiname);

  mkdirSync(AUSGABE_ORDNER, { recursive: true });
  rmSync(ziel, { force: true });

  console.log(`Packe ${basename(WURZEL)} …`);
  execFileSync(
    "zip",
    ["-r", "-q", "-X", ziel, ".", "-x", ...AUSSCHLUSS],
    { cwd: WURZEL, stdio: "inherit" },
  );

  // Inhalt gegenprüfen – ein Archiv mit Zugangsdaten wäre schlimmer als keins.
  const liste = execFileSync("unzip", ["-Z1", ziel], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

  const treffer = [];
  for (const eintrag of liste) {
    for (const { muster, name } of VERBOTEN) {
      if (muster.test(eintrag)) treffer.push(`${name}: ${eintrag}`);
    }
  }

  if (treffer.length) {
    rmSync(ziel, { force: true });
    console.error("\nArchiv wurde verworfen, es enthielt Ausgeschlossenes:");
    treffer.slice(0, 20).forEach((t) => console.error(`  ✗ ${t}`));
    process.exit(1);
  }

  const groesse = statSync(ziel).size;
  // Nur echte Verzeichnisse: zip listet sie mit abschliessendem Slash.
  const ordner = new Set(
    liste.filter((p) => p.endsWith("/")).map((p) => p.split("/")[0]),
  );
  const wurzeldateien = liste.filter((p) => !p.includes("/")).length;

  console.log(`\n✓ ${ziel}`);
  console.log(`  ${liste.length} Einträge, ${formatiereGroesse(groesse)}`);
  console.log(`  ${wurzeldateien} Dateien im Wurzelverzeichnis`);
  console.log(`  Ordner: ${[...ordner].sort().join(", ")}`);
  console.log(
    "\n  Nicht enthalten: node_modules, .next, .git, .env, attachements, docs, dist",
  );
  console.log("\n  Anleitung für den Empfänger:");
  console.log("    1) npm ci");
  console.log("    2) env_template nach .env kopieren und Werte eintragen");
  console.log("    3) npm run dbp   – Datenbankschema anlegen");
  console.log("    4) npm run dev   – oder: docker compose up --build");
}

main();
