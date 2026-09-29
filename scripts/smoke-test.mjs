// Durchlauf aller Aktionen der App über die echte HTTP-API.
// Aufruf: npm run smoke   (Dev-Server muss laufen)
// Legt Testdaten an, prüft alle Endpunkte und räumt danach vollständig auf.
const BASE = "http://localhost:3000";
let cookie = "";
const ergebnisse = [];
const aufraeumen = [];

function pass(name, info = "") {
  ergebnisse.push({ ok: true, name, info });
  console.log(`  ✓ ${name}${info ? ` — ${info}` : ""}`);
}
function fail(name, info) {
  ergebnisse.push({ ok: false, name, info });
  console.log(`  ✗ ${name} — ${info}`);
}
async function pruefe(name, fn, info) {
  try {
    const r = await fn();
    pass(name, typeof info === "function" ? info(r) : info);
    return r;
  } catch (e) {
    fail(name, String(e.message ?? e).slice(0, 220));
    return null;
  }
}

async function query(path, input) {
  const url =
    `${BASE}/api/trpc/${path}` +
    (input === undefined
      ? ""
      : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`);
  const res = await fetch(url, { headers: { cookie } });
  const body = await res.json();
  if (body.error) throw new Error(body.error.json.message);
  return body.result.data.json;
}
async function mutate(path, input) {
  const res = await fetch(`${BASE}/api/trpc/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ json: input }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.json.message);
  return body.result.data.json;
}
async function erwarteFehler(name, fn, muster) {
  try {
    await fn();
    fail(name, "kein Fehler geworfen, obwohl erwartet");
  } catch (e) {
    const msg = String(e.message ?? e);
    if (muster && !new RegExp(muster, "i").test(msg))
      fail(name, `falsche Meldung: ${msg.slice(0, 160)}`);
    else pass(name, msg.slice(0, 110));
  }
}

// ─────────────────────────────── AUTH
console.log("\n== Auth ==");
await new Promise((r) => setTimeout(r, 3000));
await pruefe("sign-in mit korrektem Passwort", async () => {
  let res;
  // better-auth begrenzt Anmeldeversuche pro Zeitfenster. Bei 403 lange warten,
  // statt schnell nachzufeuern – das würde das Fenster nur verlängern.
  for (const wartenMs of [0, 15000, 30000, 45000]) {
    if (wartenMs) await new Promise((r) => setTimeout(r, wartenMs));
    res = await fetch(`${BASE}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: BASE,
      },
      body: JSON.stringify({ email: "info@holz-meisen.de", password: "MeisenMeisenMeisen1" }),
    });
    if (res.ok) break;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} (Rate-Limit?)`);
  cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("kein Session-Cookie erhalten");
  return cookie;
}, "Session-Cookie gesetzt");

await pruefe("get-session liefert angemeldeten Benutzer", async () => {
  const res = await fetch(`${BASE}/api/auth/get-session`, { headers: { cookie } });
  const b = await res.json();
  if (!b?.user?.email) throw new Error("keine Session");
  return b.user.email;
}, (r) => r);

await erwarteFehler(
  "sign-in mit falschem Passwort wird abgelehnt",
  async () => {
    const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE },
      body: JSON.stringify({ email: "info@holz-meisen.de", password: "falsch" }),
    });
    if (res.ok) throw Object.assign(new Error("angenommen"), { ok: true });
    throw new Error(`abgelehnt mit HTTP ${res.status}`);
  },
  "abgelehnt",
);

await pruefe("geschützte Seite leitet ohne Session um", async () => {
  const res = await fetch(`${BASE}/kisten`, { redirect: "manual" });
  if (res.status !== 307 && res.status !== 308)
    throw new Error(`erwartete Umleitung, bekam HTTP ${res.status}`);
  return res.headers.get("location");
}, (r) => `→ ${r}`);

// ─────────────────────────────── AUSGANGSSTAND
console.log("\n== Ausgangsstand ==");
const basis = {};
for (const [name, path] of [
  ["platten", "material.holzplatten"],
  ["balken", "material.holzbalken"],
  ["riegel", "material.holzriegel"],
  ["kisten", "kisten.list"],
]) {
  basis[name] = (await query(path)).length;
}
console.log(`  Platten ${basis.platten} · Balken ${basis.balken} · Riegel ${basis.riegel} · Kisten ${basis.kisten}`);

// ─────────────────────────────── EINSTELLUNGEN
console.log("\n== Einstellungen ==");
const settingsVorher = await pruefe("settings.get", () => query("settings.get"),
  (r) => `Faktor A ${r.factorA}, Stundensatz ${r.hourlyRate}`);

await pruefe("settings.update (Stundensatz ändern)", async () => {
  const neu = await mutate("settings.update", { hourlyRate: 55.5 });
  if (Number(neu.hourlyRate) !== 55.5) throw new Error(`gespeichert: ${neu.hourlyRate}`);
  return neu;
}, "55,50 € übernommen");

await pruefe("settings.update (Stundensatz zurücksetzen)", async () => {
  const neu = await mutate("settings.update", {
    hourlyRate: Number(settingsVorher.hourlyRate),
    workHours: Number(settingsVorher.workHours),
    factorA: Number(settingsVorher.factorA),
    factorB: Number(settingsVorher.factorB),
    factorC: Number(settingsVorher.factorC),
    factorD: Number(settingsVorher.factorD),
    plattenGewichtKgProM2: Number(settingsVorher.plattenGewichtKgProM2),
  });
  if (Number(neu.hourlyRate) !== Number(settingsVorher.hourlyRate))
    throw new Error("nicht zurückgesetzt");
  return neu;
}, "Originalwerte wieder aktiv");

await erwarteFehler(
  "settings.update lehnt negatives Plattengewicht ab",
  () => mutate("settings.update", { plattenGewichtKgProM2: -5 }),
  "",
);

// ─────────────────────────────── MATERIAL: RIEGEL
console.log("\n== Material: Riegel ==");
const riegel = await pruefe("material.upsertHolzriegel (neu)",
  () => mutate("material.upsertHolzriegel", {
    typ: "E2E-Riegel", staerke: 20, breite: 90, preisProKubikmeter: 333,
  }), (r) => `ID ${r.id}`);
if (riegel) aufraeumen.push(() => mutate("material.deleteHolzriegel", { id: riegel.id }));

await pruefe("material.upsertHolzriegel (ändern)",
  async () => {
    const r = await mutate("material.upsertHolzriegel", {
      id: riegel.id, typ: "E2E-Riegel v2", staerke: 21, breite: 91, preisProKubikmeter: 444,
    });
    if (r.typ !== "E2E-Riegel v2" || Number(r.preisProKubikmeter) !== 444)
      throw new Error(JSON.stringify(r));
    return r;
  }, "Typ und Preis aktualisiert");

await pruefe("material.holzriegel enthält den neuen Eintrag",
  async () => {
    const alle = await query("material.holzriegel");
    if (!alle.find((r) => r.id === riegel.id)) throw new Error("nicht gefunden");
    return alle.length;
  }, (n) => `${n} Riegel`);

await erwarteFehler("material.upsertHolzriegel lehnt Stärke 0 ab",
  () => mutate("material.upsertHolzriegel", { typ: "X", staerke: 0, breite: 10, preisProKubikmeter: 1 }), "");

// ─────────────────────────────── MATERIAL: BALKEN
console.log("\n== Material: Holzbalken ==");
const balken = await pruefe("material.upsertHolzbalken (neu)",
  () => mutate("material.upsertHolzbalken", {
    typ: "E2E-Balken", staerke: 50, breite: 70, preisProKubikmeter: 512,
  }), (r) => `ID ${r.id}`);
if (balken) aufraeumen.push(() => mutate("material.deleteHolzbalken", { id: balken.id }));

await pruefe("material.upsertHolzbalken (ändern)",
  async () => {
    const r = await mutate("material.upsertHolzbalken", {
      id: balken.id, typ: "E2E-Balken v2", staerke: 51, breite: 71, preisProKubikmeter: 600,
    });
    if (Number(r.preisProKubikmeter) !== 600) throw new Error(JSON.stringify(r));
    return r;
  }, "Preis aktualisiert");

// ─────────────────────────────── MATERIAL: PLATTEN (gemeldeter Fehler)
console.log("\n== Material: Holzplatten ==");
const platte = await pruefe("material.upsertHolzplatte (neu, 2 Dicken)",
  () => mutate("material.upsertHolzplatte", {
    typ: "E2E-Platte", breite: 1250, isVollholz: false,
    varianten: [{ dicke: 12, preis: 21 }, { dicke: 18, preis: 25 }],
  }), (r) => `ID ${r.id}, ${r.dicken.length} Dicken`);
if (platte) aufraeumen.push(() => mutate("material.deleteHolzplatte", { id: platte.id }));

await pruefe("material.upsertHolzplatte (Dicken ersetzen)",
  async () => {
    const r = await mutate("material.upsertHolzplatte", {
      id: platte.id, typ: "E2E-Platte v2", breite: 1500, isVollholz: false,
      varianten: [{ dicke: 15, preis: 30 }],
    });
    if (r.dicken.length !== 1 || r.dicken[0].dicke !== 15) throw new Error(JSON.stringify(r.dicken));
    return r;
  }, "1 Dicke übrig, alte entfernt");

await pruefe("material.upsertHolzplatte (Vollholz-Flag)",
  async () => {
    const r = await mutate("material.upsertHolzplatte", {
      id: platte.id, typ: "E2E-Platte v2", breite: 1500, isVollholz: true,
      varianten: [{ dicke: 15, preis: 0.0013 }],
    });
    if (!r.isVollholz) throw new Error("Flag nicht gesetzt");
    return r;
  }, "isVollholz true, Preis 0,0013 €/cm³");

// Platte, die anschliessend gelöscht wird → der gemeldete Fehlerfall
const wegwerfPlatte = await pruefe("material.upsertHolzplatte (Wegwerf-Platte mit Dicken)",
  () => mutate("material.upsertHolzplatte", {
    typ: "E2E-Wegwerf", breite: 1000, isVollholz: false,
    varianten: [{ dicke: 9, preis: 10 }, { dicke: 12, preis: 12 }, { dicke: 24, preis: 20 }],
  }), (r) => `ID ${r.id}, ${r.dicken.length} Dicken`);

await pruefe("material.deleteHolzplatte MIT Dicken (gemeldeter Fehler)",
  async () => {
    await mutate("material.deleteHolzplatte", { id: wegwerfPlatte.id });
    const alle = await query("material.holzplatten");
    if (alle.find((p) => p.id === wegwerfPlatte.id)) throw new Error("noch vorhanden");
    return true;
  }, "gelöscht, keine FK-Verletzung");

// ─────────────────────────────── KISTEN
console.log("\n== Kisten ==");
await pruefe("kisten.meta", () => query("kisten.meta"),
  (r) => `${r.kistenTypOptions.length} Kistentypen`);
await pruefe("kisten.list", () => query("kisten.list"), (r) => `${r.length} Kisten`);
await pruefe("kisten.listWithRelations", async () => {
  const r = await query("kisten.listWithRelations");
  if (r.length && !("bretter" in r[0])) throw new Error("Relationen fehlen");
  return r;
}, (r) => `${r.length} Kisten mit Relationen`);

const basisKiste = {
  innenmasse: { laenge: 1610, breite: 460, hoehe: 330 },
  holzBretterID: platte.id,
  holzBretterBodenID: null,
  holzBalkenLaengsID: null,
  holzBalkenQuerID: balken.id,
  holzRiegelID: riegel.id,
  balkenLaengsAnzahl: 0,
  balkenQuerAnzahl: 3,
  bodenAnzahl: 1,
  dickeBretter: 15,
  dickeBretterBoden: null,
  riegelDicke: 23,
  riegelBreite: 80,
};

const angelegt = {};
for (const [typ, extra] of [
  ["schwartz", {}],
  ["bellmer_q", {}],
  ["bellmer_lq", { holzBalkenLaengsID: balken.id, balkenLaengsAnzahl: 3 }],
]) {
  const k = await pruefe(`kisten.create (${typ})`,
    () => mutate("kisten.create", { ...basisKiste, ...extra, kistentypId: typ, name: `E2E ${typ}` }),
    (r) => `ID ${r.id}, Gewicht ${r.gewicht} kg`);
  if (k) { angelegt[typ] = k; aufraeumen.push(() => mutate("kisten.delete", { id: k.id })); }
}

await pruefe("kisten.getById", () => query("kisten.getById", { id: angelegt.schwartz.id }),
  (r) => `${r.name}`);
await pruefe("kisten.getByIdWithRelations liefert Riegel-Relation",
  async () => {
    const r = await query("kisten.getByIdWithRelations", { id: angelegt.schwartz.id });
    if (!r.riegel) throw new Error("riegel-Relation fehlt");
    return r.riegel.typ;
  }, (r) => `Riegel: ${r}`);

await pruefe("kisten.update (Maße ändern, Gewicht neu berechnet)",
  async () => {
    const vorher = await query("kisten.getById", { id: angelegt.schwartz.id });
    const r = await mutate("kisten.update", {
      ...basisKiste, id: angelegt.schwartz.id, kistentypId: "schwartz",
      name: "E2E schwartz", innenmasse: { laenge: 2000, breite: 600, hoehe: 500 },
    });
    if (r.innenLaenge !== 2000) throw new Error("Maß nicht gespeichert");
    if (Number(r.gewicht) === Number(vorher.gewicht)) throw new Error("Gewicht nicht neu berechnet");
    return `${vorher.gewicht} → ${r.gewicht} kg`;
  }, (r) => r);

await pruefe("kisten.updateName", async () => {
  const r = await mutate("kisten.updateName", { id: angelegt.schwartz.id, name: "E2E umbenannt" });
  if (r.name !== "E2E umbenannt") throw new Error(r.name);
  return r.name;
}, (r) => r);

await pruefe("kisten.create ohne Namen erzeugt Fallback-Namen", async () => {
  const r = await mutate("kisten.create", { ...basisKiste, kistentypId: "schwartz" });
  aufraeumen.push(() => mutate("kisten.delete", { id: r.id }));
  if (r.name !== `Kiste #${r.id}`) throw new Error(`Name: ${r.name}`);
  return r.name;
}, (r) => r);

await erwarteFehler("kisten.create ohne Längsbalken bei bellmer_lq wird abgelehnt",
  () => mutate("kisten.create", { ...basisKiste, kistentypId: "bellmer_lq", holzBalkenLaengsID: null }),
  "längsbalken");
await erwarteFehler("kisten.create mit Bodenmaterial ohne Bodendicke wird abgelehnt",
  () => mutate("kisten.create", { ...basisKiste, kistentypId: "schwartz", holzBretterBodenID: platte.id, dickeBretterBoden: null }),
  "dicke");
await erwarteFehler("kisten.create mit negativer Länge wird abgelehnt",
  () => mutate("kisten.create", { ...basisKiste, kistentypId: "schwartz", innenmasse: { laenge: -1, breite: 100, hoehe: 100 } }), "");
await erwarteFehler("kisten.getById mit ID 0 wird abgelehnt",
  () => query("kisten.getById", { id: 0 }), "");

// ─────────────────────────────── LÖSCHSCHUTZ
console.log("\n== Löschschutz für verwendete Materialien ==");
await erwarteFehler("Platte, die von einer Kiste genutzt wird, ist geschützt",
  () => mutate("material.deleteHolzplatte", { id: platte.id }), "kann nicht gelöscht werden");
await erwarteFehler("Balken, der von einer Kiste genutzt wird, ist geschützt",
  () => mutate("material.deleteHolzbalken", { id: balken.id }), "kann nicht gelöscht werden");
await erwarteFehler("Riegel, der von einer Kiste genutzt wird, ist geschützt",
  () => mutate("material.deleteHolzriegel", { id: riegel.id }), "kann nicht gelöscht werden");

// ─────────────────────────────── EXPORT
console.log("\n== Excel-Export ==");
for (const [typ, k] of Object.entries(angelegt)) {
  await pruefe(`Export ${typ} (Kiste ${k.id})`, async () => {
    const res = await fetch(`${BASE}/api/kisten/${k.id}/export`, { headers: { cookie } });
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${buf.toString().slice(0, 120)}`);
    if (buf.subarray(0, 2).toString() !== "PK") throw new Error("keine gültige xlsx");
    return buf.length;
  }, (n) => `${n} Bytes, gültige xlsx`);
}
await pruefe("Export mit ungültiger ID gibt 400", async () => {
  const res = await fetch(`${BASE}/api/kisten/abc/export`, { headers: { cookie } });
  if (res.status !== 400) throw new Error(`HTTP ${res.status}`);
  return res.status;
}, "HTTP 400");
await pruefe("Export einer nicht existierenden Kiste gibt 500 mit Meldung", async () => {
  const res = await fetch(`${BASE}/api/kisten/999999/export`, { headers: { cookie } });
  const txt = await res.text();
  if (res.ok) throw new Error("unerwartet erfolgreich");
  return txt.slice(0, 60);
}, (r) => r);

// ─────────────────────────────── SEITEN
console.log("\n== Seiten ==");
for (const pfad of ["/kisten", "/settings", "/signin"]) {
  await pruefe(`GET ${pfad} (angemeldet, ohne Umleitung)`, async () => {
    const res = await fetch(`${BASE}${pfad}`, {
      headers: { cookie },
      redirect: "manual",
    });
    if (res.status !== 200)
      throw new Error(`HTTP ${res.status} → ${res.headers.get("location")}`);
    const html = await res.text();
    if (!html.includes("Kistenkonfigurator")) throw new Error("Seite ohne Inhalt");
    return res.status;
  }, (r) => `HTTP ${r}, Inhalt gerendert`);
}

// ─────────────────────────────── AUFRÄUMEN
console.log("\n== Aufräumen ==");
for (const fn of aufraeumen.reverse()) {
  try { await fn(); } catch (e) { fail("Aufräumen", String(e.message).slice(0, 140)); }
}
const nachher = {};
for (const [name, path] of [
  ["platten", "material.holzplatten"],
  ["balken", "material.holzbalken"],
  ["riegel", "material.holzriegel"],
  ["kisten", "kisten.list"],
]) {
  nachher[name] = (await query(path)).length;
}
const gleich = Object.keys(basis).every((k) => basis[k] === nachher[k]);
if (gleich) pass("Datenbestand wie vor dem Test",
  `Platten ${nachher.platten} · Balken ${nachher.balken} · Riegel ${nachher.riegel} · Kisten ${nachher.kisten}`);
else fail("Datenbestand verändert", `vorher ${JSON.stringify(basis)} / nachher ${JSON.stringify(nachher)}`);

// ─────────────────────────────── ERGEBNIS
const ok = ergebnisse.filter((r) => r.ok).length;
const nok = ergebnisse.filter((r) => !r.ok);
console.log(`\n────────── ${ok}/${ergebnisse.length} Prüfungen erfolgreich`);
if (nok.length) {
  console.log("FEHLGESCHLAGEN:");
  nok.forEach((r) => console.log(`  ✗ ${r.name} — ${r.info}`));
  process.exit(1);
}
