"use client";
import { Fragment, useState, useMemo, useEffect } from "react";
import { useTRPC } from "@/lib/trpc/client";
import {
  Button,
  TextInput,
  NumberInput,
  Select,
  Stack,
  Group,
  Table,
  Title,
  Divider,
  Card,
  Text,
  Modal,
  LoadingOverlay,
  SimpleGrid,
  Paper,
  Tabs,
  Accordion,
  Textarea,
  CopyButton,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import {
  BalkenSelect,
  PlatteSelect,
  DickeSelect,
  RiegelSelect,
} from "@/components/MaterialSelects";
import {
  KISTEN_TYP_LABELS,
  KistenTypId,
  kistenTypIdEnum,
} from "@/server/db/schemas";
import { modals } from "@mantine/modals";
import {
  Kiste,
  SEITENRIEGEL_DEFAULT_PRO_SEITE,
  T_CalculatedComponent_Type,
} from "@/server/domain/kiste";
import { calculateFinalPrice } from "@/utils/pricing";
import { formatDecimal, formatEuro, formatMasse } from "@/utils/format";
// Kisten-Optionen kommen vom Server (SOT) über trpc.kisten.meta

/** Abschnittstrenner im Formular – kräftiger als der Mantine-Standard. */
const SECTION_DIVIDER = {
  label: {
    fontSize: "var(--mantine-font-size-xs)",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: "var(--mantine-color-dimmed)",
  },
};

export default function KistenPage() {
  const trpc = useTRPC();
  const { data: kisten, refetch } = useQuery(
    trpc.kisten.listWithRelations.queryOptions(undefined, {
      staleTime: 5000,
    }),
  );
  const createMutation = useMutation(
    trpc.kisten.create.mutationOptions({
      onSuccess: () => {
        refetch();
        notifications.show({
          title: "Kiste angelegt",
          message: "Die Kiste wurde erfolgreich erstellt.",
          color: "green",
        });
      },
      onError: (e) => {
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        });
      },
    }),
  );
  const deleteMutation = useMutation(
    trpc.kisten.delete.mutationOptions({
      onSuccess: async () => {
        await refetch();
      },
      onError: (e) => {
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        });
      },
    }),
  );
  const { data: holzplatten } = useQuery(
    trpc.material.holzplatten.queryOptions(),
  );
  const updateMutation = useMutation(
    trpc.kisten.update.mutationOptions({
      onSuccess: async () => {
        await refetch();
        await refetchDetails();
        notifications.show({
          title: "Kiste aktualisiert",
          message: "Gespeichert.",
          color: "green",
        });
      },
      onError: (e) => {
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        });
      },
    }),
  );
  // const { data: meta } = useQuery(trpc.kisten.meta.queryOptions());

  const [exportingId, setExportingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const editForm = useForm({
    initialValues: {
      id: 0,
      name: "",
      kistentypId: "schwartz" as KistenTypId,
      hoehe: 0,
      laenge: 0,
      breite: 0,
      holzBretterID: undefined as number | undefined,
      dickeBretter: undefined as number | undefined,
      holzBretterBodenID: undefined as number | undefined,
      dickeBretterBoden: undefined as number | undefined,
      holzBalkenLaengsID: undefined as number | undefined,
      holzBalkenQuerID: undefined as number | undefined,
      holzRiegelID: undefined as number | undefined,
      riegelDicke: 23 as number | undefined,
      riegelBreite: 100 as number | undefined,
      balkenLaengsAnzahl: 0,
      balkenQuerAnzahl: 0,
      bodenAnzahl: 1,
      seitenriegelAnzahl: SEITENRIEGEL_DEFAULT_PRO_SEITE.schwartz,
    },
  });
  const {
    data: details,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = useQuery(
    trpc.kisten.getByIdWithRelations.queryOptions(
      { id: selectedId! },
      { enabled: Boolean(selectedId) },
    ),
  );
  const { data: pricingFactors } = useQuery(trpc.settings.get.queryOptions());
  const plattenGewichtKgProM2 = Number(
    (pricingFactors as any)?.plattenGewichtKgProM2 ?? 8,
  );
  const selectedKiste = useMemo(() => {
    if (details) return Kiste.fromRow(details);
    return null;
  }, [details]);

  const komponentenGruppen = useMemo(() => {
    if (!selectedKiste) return [];
    const reihenfolge: T_CalculatedComponent_Type[] = [
      "Brett",
      "Balken",
      "Riegel",
    ];
    const bezeichnung: Record<T_CalculatedComponent_Type, string> = {
      Brett: "Bretter",
      Balken: "Balken",
      Riegel: "Riegel",
    };
    return reihenfolge
      .map((art) => ({
        art: bezeichnung[art],
        komponenten: selectedKiste.components.filter(
          (component) => component.type === art && component.amount > 0,
        ),
      }))
      .filter((gruppe) => gruppe.komponenten.length > 0);
  }, [selectedKiste]);

  const finalPriceEur = useMemo(() => {
    return Number(
      calculateFinalPrice(selectedKiste?.materialCost || 0, pricingFactors)
        .final,
    );
  }, [selectedKiste?.materialCost, pricingFactors]);

  const angebotstexte = useMemo(() => {
    if (!selectedKiste) return null;

    const { laenge, breite, hoehe } = selectedKiste.snapshot.innenmasse;
    const masse = `${laenge}x${breite}x${hoehe} mm`;
    const wandMaterial = `${selectedKiste.snapshot.holzBrett?.typ ?? "-"} ${
      selectedKiste.snapshot.selectedBrettVariante?.dicke ?? "-"
    } mm`;
    const bodenMaterial = `${
      selectedKiste.snapshot.holzBrettBoden?.typ ??
      selectedKiste.snapshot.holzBrett?.typ ??
      "-"
    } ${
      selectedKiste.snapshot.selectedBrettVarianteBoden?.dicke ??
      selectedKiste.snapshot.selectedBrettVariante?.dicke ??
      "-"
    } mm`;

    const bodenAnzahl = selectedKiste.snapshot.bodenAnzahl;
    const querbalken = selectedKiste.snapshot.balkenQuerAnzahl;
    const laengsbalken = selectedKiste.snapshot.balkenLaengsAnzahl;

    const balkenTextParts = [
      laengsbalken > 0 ? `${laengsbalken} Längsbalken` : null,
      querbalken > 0 ? `${querbalken} Querbalken` : null,
    ].filter(Boolean);

    const balkenText = balkenTextParts.length
      ? balkenTextParts.join(", ")
      : "keine Balken";

    const riegelText = `${selectedKiste.snapshot.riegelBreite}x${selectedKiste.snapshot.riegelDicke} mm`;

    const ansprechpartner = "{{ANSPRECHPARTNER}}";
    const firma = "Meisen Holzverarbeitung GmbH & Co. KG";
    const strasse = "Auweg 22";
    const ort = "52349 Düren";
    const geschaeftsfuehrung = "Geschäftsführerin: Petra Meisen";

    const preis = `${finalPriceEur.toFixed(2)} €`;

    const kurz = `Sehr geehrte/r ${ansprechpartner},\n\nwir bieten Ihnen hiermit eine Kiste mit Innenmaßen ${masse} zum Gesamtpreis von ${preis} an.\n\nMit freundlichen Grüßen\n${firma}\n${strasse}\n${ort}\n${geschaeftsfuehrung}`;

    const mittel = `Sehr geehrte/r ${ansprechpartner},\n\ngerne bieten wir Ihnen eine Kiste mit Innenmaßen ${masse} an.\nMaterial: Wände ${wandMaterial}, Boden ${bodenMaterial} (${bodenAnzahl}x).\nGesamtpreis: ${preis}.\n\nMit freundlichen Grüßen\n${firma}\n${strasse}\n${ort}\n${geschaeftsfuehrung}`;

    const ausfuehrlich = `Sehr geehrte/r ${ansprechpartner},\n\nwir bieten Ihnen hiermit eine Kiste mit folgenden Spezifikationen an:\n- Innenmaße: ${masse}\n- Wände: ${wandMaterial}\n- Boden: ${bodenMaterial} (${bodenAnzahl}x)\n- Riegel: ${riegelText}\n- Balken: ${balkenText}\n\nGesamtpreis: ${preis}.\n\nMit freundlichen Grüßen\n${firma}\n${strasse}\n${ort}\n${geschaeftsfuehrung}`;

    return { kurz, mittel, ausfuehrlich };
  }, [selectedKiste, finalPriceEur]);

  const detailRows = useMemo(() => {
    if (!selectedKiste) return [];
    const snapshot = selectedKiste.snapshot;
    const brettDicke = snapshot.selectedBrettVariante?.dicke;
    const bodenDicke =
      snapshot.selectedBrettVarianteBoden?.dicke ?? brettDicke;
    return [
      {
        label: "Innenmaß (L × B × H)",
        value: formatMasse(
          snapshot.innenmasse.laenge,
          snapshot.innenmasse.breite,
          snapshot.innenmasse.hoehe,
        ),
      },
      {
        label: "Bretter",
        value: `${snapshot.holzBrett?.typ ?? "–"}${brettDicke ? `, ${brettDicke} mm` : ""}`,
      },
      {
        label: "Bodenbretter",
        value: `${snapshot.holzBrettBoden?.typ ?? snapshot.holzBrett?.typ ?? "–"}${bodenDicke ? `, ${bodenDicke} mm` : ""} (${snapshot.bodenAnzahl}×)`,
      },
      {
        label: "Balken quer",
        value: selectedKiste.holzBalkenQuer
          ? `${selectedKiste.holzBalkenQuer.typ} (${selectedKiste.holzBalkenQuer.staerke}×${selectedKiste.holzBalkenQuer.breite} mm), ${snapshot.balkenQuerAnzahl}×`
          : "–",
      },
      {
        label: "Balken längs",
        value: selectedKiste.holzBalkenLaengs
          ? `${selectedKiste.holzBalkenLaengs.typ} (${selectedKiste.holzBalkenLaengs.staerke}×${selectedKiste.holzBalkenLaengs.breite} mm), ${snapshot.balkenLaengsAnzahl}×`
          : "–",
      },
      {
        label: "Riegel",
        value: selectedKiste.holzRiegel
          ? `${selectedKiste.holzRiegel.typ} (${snapshot.riegelDicke}×${snapshot.riegelBreite} mm)`
          : `${snapshot.riegelDicke}×${snapshot.riegelBreite} mm – keine Riegelart gewählt`,
      },
      {
        label: "Seitenriegel pro Seite",
        value: `${snapshot.seitenriegelAnzahl}×`,
      },
      {
        label: "Außenfläche",
        value: `${formatDecimal(selectedKiste.gesamtAussenflaecheM2, 4)} m²`,
      },
    ];
  }, [selectedKiste]);

  useEffect(() => {
    if (!details) return;
    editForm.setValues({
      id: details.id,
      name: details.name ?? "",
      kistentypId: details.kistentyp,
      laenge: details.innenLaenge,
      breite: details.innenBreite,
      hoehe: details.innenHoehe,
      holzBretterID: details.holzBretterID,
      dickeBretter: details.dickeBretter,
      holzBretterBodenID: details.holzBretterBodenID ?? undefined,
      dickeBretterBoden: details.dickeBretterBoden ?? undefined,
      holzBalkenLaengsID: details.holzBalkenLaengsID ?? undefined,
      holzBalkenQuerID: details.holzBalkenQuerID ?? undefined,
      holzRiegelID: details.holzRiegelID ?? undefined,
      riegelDicke: details.riegelDicke,
      riegelBreite: details.riegelBreite,
      balkenLaengsAnzahl: details.balkenLaengsAnzahl ?? 0,
      balkenQuerAnzahl: details.balkenQuerAnzahl ?? 0,
      bodenAnzahl: details.bodenAnzahl ?? 1,
      seitenriegelAnzahl:
        details.seitenriegelAnzahl ??
        SEITENRIEGEL_DEFAULT_PRO_SEITE[details.kistentyp],
    });
  }, [details]);

  const dickePlattenEdit = useMemo(() => {
    return (
      (holzplatten ?? []).find((p) => p.id === editForm.values.holzBretterID)
        ?.dicke ?? []
    );
  }, [holzplatten, editForm.values.holzBretterID]);

  const dickePlattenBodenEdit = useMemo(() => {
    const bodenId =
      editForm.values.holzBretterBodenID ?? editForm.values.holzBretterID;
    return (holzplatten ?? []).find((p) => p.id === bodenId)?.dicke ?? [];
  }, [
    holzplatten,
    editForm.values.holzBretterBodenID,
    editForm.values.holzBretterID,
  ]);

  function openDetails(id: number) {
    // Kein refetchDetails() hier: der Query-Key hängt an selectedId und wird
    // durch setSelectedId ausgelöst. Ein Refetch würde noch mit dem vorherigen
    // selectedId laufen (beim ersten Öffnen null) und die Eingabe-Validierung
    // des Routers verletzen.
    setSelectedId(id);
    setModalOpen(true);
  }

  async function exportKiste(id: number) {
    try {
      setExportingId(id);
      const res = await fetch(`/api/kisten/${id}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kiste_${id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportingId(null);
    }
  }

  const createForm = useForm({
    initialValues: {
      name: "",
      kistentypId: "schwartz" as KistenTypId satisfies KistenTypId,
      hoehe: 500,
      laenge: 800,
      breite: 600,
      holzBretterID: undefined as number | undefined,
      dickeBretter: undefined as number | undefined,
      holzBretterBodenID: undefined as number | undefined,
      dickeBretterBoden: undefined as number | undefined,
      holzBalkenLaengsID: undefined as number | undefined,
      holzBalkenQuerID: undefined as number | undefined,
      holzRiegelID: undefined as number | undefined,
      riegelDicke: 23 as number | undefined,
      riegelBreite: 100 as number | undefined,
      balkenLaengsAnzahl: 3,
      balkenQuerAnzahl: 3,
      bodenAnzahl: 1,
      seitenriegelAnzahl: SEITENRIEGEL_DEFAULT_PRO_SEITE.schwartz,
    },
    validate: {
      hoehe: (v) => (v && v > 0 ? null : "Pflichtfeld"),
      laenge: (v) => (v && v > 0 ? null : "Pflichtfeld"),
      breite: (v) => (v && v > 0 ? null : "Pflichtfeld"),
      holzBretterID: (v) => (v ? null : "Bitte Brettermaterial wählen"),
      dickeBretter: (v) => (v ? null : "Bitte Stärke wählen"),
      bodenAnzahl: (v) => (v && v >= 1 ? null : "Mindestens 1"),
      holzBalkenLaengsID: (v, values) =>
        values.kistentypId === "bellmer_lq" && !v
          ? "Bitte Balken längs wählen"
          : null,
      riegelDicke: (v) => (v ? null : "Bitte Riegelstärke angeben"),
      riegelBreite: (v) => (v ? null : "Bitte Riegelbreite angeben"),
      holzRiegelID: (v) => (v ? null : "Bitte Riegelart wählen"),
    },
  });

  const dickePlatten = useMemo(() => {
    return (
      (holzplatten ?? []).find((p) => p.id === createForm.values.holzBretterID)
        ?.dicke ?? []
    );
  }, [holzplatten, createForm.values.holzBretterID]);

  const dickePlattenBoden = useMemo(() => {
    const bodenId =
      createForm.values.holzBretterBodenID ?? createForm.values.holzBretterID;
    return (holzplatten ?? []).find((p) => p.id === bodenId)?.dicke ?? [];
  }, [
    holzplatten,
    createForm.values.holzBretterBodenID,
    createForm.values.holzBretterID,
  ]);

  const requiresCreateLaengsbalken =
    createForm.values.kistentypId === "bellmer_lq";
  const missingCreateLaengsbalken =
    requiresCreateLaengsbalken && !createForm.values.holzBalkenLaengsID;
  const missingCreateBodenDicke =
    Boolean(createForm.values.holzBretterBodenID) &&
    !createForm.values.dickeBretterBoden;
  const missingCreateRiegel = !createForm.values.holzRiegelID;
  const disableCreateButton =
    missingCreateLaengsbalken ||
    missingCreateBodenDicke ||
    missingCreateRiegel ||
    !createForm.values.holzBretterID ||
    !createForm.values.dickeBretter ||
    !createForm.values.riegelDicke ||
    !createForm.values.riegelBreite;

  function submitCreate(values: typeof createForm.values) {
    const requiresLaengsbalken = values.kistentypId === "bellmer_lq";
    createMutation.mutate({
      name: values.name?.trim() || undefined,
      kistentypId: values.kistentypId as any,
      innenmasse: {
        hoehe: values.hoehe,
        laenge: values.laenge,
        breite: values.breite,
      },
      holzBretterID: values.holzBretterID!,
      holzBretterBodenID: values.holzBretterBodenID ?? null,
      holzBalkenLaengsID: requiresLaengsbalken
        ? values.holzBalkenLaengsID!
        : null,
      holzBalkenQuerID: values.holzBalkenQuerID ?? null,
      holzRiegelID: values.holzRiegelID ?? null,
      balkenLaengsAnzahl: values.balkenLaengsAnzahl,
      balkenQuerAnzahl: values.balkenQuerAnzahl,
      bodenAnzahl: values.bodenAnzahl,
      seitenriegelAnzahl: values.seitenriegelAnzahl,
      dickeBretter: values.dickeBretter!,
      dickeBretterBoden: values.holzBretterBodenID
        ? values.dickeBretterBoden!
        : null,
      riegelDicke: values.riegelDicke!,
      riegelBreite: values.riegelBreite!,
    });
    createForm.reset();
  }

  return (
    <Stack p="md" gap="md">
      <Title order={2}>Kisten konfigurieren</Title>
      <Group align="flex-start" wrap="wrap" gap="md">
        <Card shadow="sm" padding="lg" w={460} withBorder>
          <Stack gap="sm">
            <Title order={4} mb={4}>
              Neue Kiste
            </Title>
            <TextInput
              label="Name (optional)"
              placeholder="Leer lassen für automatische Nummer"
              {...createForm.getInputProps("name")}
            />
            <Select
              label="Kistentyp"
              allowDeselect={false}
              data={kistenTypIdEnum.enumValues.map((value) => ({
                value,
                label: KISTEN_TYP_LABELS[value] as string,
              }))}
              value={createForm.values.kistentypId}
              error={createForm.errors.kistentypId}
              onChange={(value) => {
                if (!value) return;
                const kistentypId = value as KistenTypId;
                createForm.setValues({
                  ...createForm.values,
                  kistentypId,
                  seitenriegelAnzahl:
                    SEITENRIEGEL_DEFAULT_PRO_SEITE[kistentypId],
                });
              }}
            />
            <Group grow>
              <NumberInput
                label="Länge (mm)"
                {...createForm.getInputProps("laenge")}
              />
              <NumberInput
                label="Breite (mm)"
                {...createForm.getInputProps("breite")}
              />
              <NumberInput
                label="Höhe (mm)"
                {...createForm.getInputProps("hoehe")}
              />
            </Group>
            <Divider label="Materialien" labelPosition="left" styles={SECTION_DIVIDER} />
            <Group grow align="flex-start">
              <PlatteSelect
                error={createForm.errors.holzBretterID}
                label="Brettermaterial"
                value={createForm.values.holzBretterID}
                onChange={(id, meta) =>
                  createForm.setValues({
                    ...createForm.values,
                    holzBretterID: id,
                    dickeBretter:
                      createForm.values.dickeBretter &&
                      meta?.dicken.includes(createForm.values.dickeBretter)
                        ? createForm.values.dickeBretter
                        : undefined,
                  })
                }
              />
              <DickeSelect
                label="Stärke Bretter"
                dicken={dickePlatten}
                {...createForm.getInputProps("dickeBretter")}
              />
            </Group>
            <Group grow align="flex-start">
              <PlatteSelect
                label="Bodenmaterial (optional)"
                value={createForm.values.holzBretterBodenID}
                onChange={(id, meta) =>
                  createForm.setValues({
                    ...createForm.values,
                    holzBretterBodenID: id,
                    dickeBretterBoden:
                      id &&
                      createForm.values.dickeBretterBoden &&
                      meta?.dicken.includes(createForm.values.dickeBretterBoden)
                        ? createForm.values.dickeBretterBoden
                        : undefined,
                  })
                }
              />
              <DickeSelect
                label="Stärke Boden"
                dicken={
                  createForm.values.holzBretterBodenID ? dickePlattenBoden : []
                }
                value={
                  createForm.values.holzBretterBodenID
                    ? createForm.values.dickeBretterBoden
                    : undefined
                }
                onChange={(value) =>
                  createForm.setFieldValue("dickeBretterBoden", value)
                }
              />
            </Group>
            <NumberInput
              label="Anzahl Bodenbretter"
              min={1}
              value={createForm.values.bodenAnzahl}
              onChange={(v) =>
                createForm.setFieldValue(
                  "bodenAnzahl",
                  v === "" ? 1 : Math.max(1, Number(v)),
                )
              }
            />
            <Divider label="Balken" labelPosition="left" styles={SECTION_DIVIDER} />
            {createForm.values.kistentypId == "bellmer_lq" && (
              <BalkenSelect
                label="Balken längs"
                value={createForm.values.holzBalkenLaengsID}
                error={createForm.errors.holzBalkenLaengsID}
                onChange={(id, meta) => {
                  createForm.setValues({
                    ...createForm.values,
                    holzBalkenLaengsID: id,
                    riegelDicke: meta?.staerke ?? createForm.values.riegelDicke,
                    riegelBreite:
                      meta?.breite ?? createForm.values.riegelBreite,
                  });
                }}
              />
            )}
            <Group grow align="flex-start">
              <BalkenSelect
                label="Balken quer"
                {...createForm.getInputProps("holzBalkenQuerID")}
              />
              <NumberInput
                label="Anzahl Querbalken"
                min={0}
                {...createForm.getInputProps("balkenQuerAnzahl")}
              />
            </Group>
            {createForm.values.kistentypId === "bellmer_lq" && (
              <NumberInput
                label="Anzahl Längsbalken"
                min={0}
                {...createForm.getInputProps("balkenLaengsAnzahl")}
              />
            )}
            <Divider label="Riegel" labelPosition="left" styles={SECTION_DIVIDER} />
            <Group grow align="flex-start">
              <RiegelSelect
                value={createForm.values.holzRiegelID}
                error={createForm.errors.holzRiegelID}
                onChange={(id, meta) =>
                  createForm.setValues({
                    ...createForm.values,
                    holzRiegelID: id,
                    riegelDicke: meta?.staerke ?? createForm.values.riegelDicke,
                    riegelBreite: meta?.breite ?? createForm.values.riegelBreite,
                  })
                }
              />
              <NumberInput
                label="Seitenriegel pro Seite"
                min={0}
                value={createForm.values.seitenriegelAnzahl}
                onChange={(v) =>
                  createForm.setFieldValue(
                    "seitenriegelAnzahl",
                    v === "" ? 0 : Math.max(0, Number(v)),
                  )
                }
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Riegelstärke (mm)"
                min={1}
                {...createForm.getInputProps("riegelDicke")}
              />
              <NumberInput
                label="Riegelbreite (mm)"
                min={1}
                {...createForm.getInputProps("riegelBreite")}
              />
            </Group>
            <Button
              disabled={disableCreateButton}
              loading={createMutation.isPending}
              onClick={() => {
                const handleSubmit = createForm.onSubmit(submitCreate);
                handleSubmit();
              }}
            >
              Kiste anlegen
            </Button>
          </Stack>
        </Card>
        <Stack flex={1} miw={0} pos="relative">
          <Title order={4}>Erstellte Kisten</Title>
          <Table.ScrollContainer minWidth={700}>
          <Table highlightOnHover withTableBorder verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={60}>ID</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Typ</Table.Th>
                <Table.Th style={{ whiteSpace: "nowrap" }}>
                  Innenmaß (L × B × H)
                </Table.Th>
                <Table.Th ta="right">Gewicht</Table.Th>
                <Table.Th ta="right">Preis</Table.Th>
                <Table.Th w={220}>Aktionen</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {kisten?.map((k) => {
                const aggregate = Kiste.fromRow(k);
                return (
                  <Table.Tr
                    key={k.id}
                    onClick={() => openDetails(k.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <Table.Td c="dimmed">{k.id}</Table.Td>
                    <Table.Td fw={600}>
                      {(k as any).name || `Kiste #${k.id}`}
                    </Table.Td>
                    <Table.Td>
                      {KISTEN_TYP_LABELS?.[k.kistentyp] ?? k.kistentyp}
                    </Table.Td>
                    <Table.Td style={{ whiteSpace: "nowrap" }}>
                      {formatMasse(k.innenLaenge, k.innenBreite, k.innenHoehe)}
                    </Table.Td>
                    <Table.Td
                      ta="right"
                      style={{
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatDecimal(
                        aggregate.calculateWeightKg(plattenGewichtKgProM2),
                      )}{" "}
                      kg
                    </Table.Td>
                    <Table.Td
                      ta="right"
                      fw={600}
                      style={{
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatEuro(
                        calculateFinalPrice(
                          aggregate.materialCost,
                          pricingFactors,
                        ).final,
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap" justify="flex-end">
                        <Button
                          size="xs"
                          loading={exportingId === k.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            exportKiste(k.id);
                          }}
                          variant="light"
                        >
                          Export XLSX
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={async (e) => {
                            e.stopPropagation();
                            modals.openConfirmModal({
                              title: "Kiste löschen",
                              children: (
                                <Text size="sm">
                                  Diese Kiste wirklich löschen?
                                </Text>
                              ),
                              confirmProps: { color: "red" },
                              labels: {
                                confirm: "Löschen",
                                cancel: "Abbrechen",
                              },
                              onConfirm: () =>
                                deleteMutation.mutate({ id: k.id }),
                            });
                          }}
                        >
                          Löschen
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          </Table.ScrollContainer>
          <Modal
            opened={modalOpen}
            onClose={() => setModalOpen(false)}
            size={960}
            padding="lg"
            title={
              <div>
                <Text fw={700} fz={22}>
                  {details?.name || `Kiste #${details?.id}`}
                </Text>
                <Text size="xs" c="dimmed">
                  {details
                    ? `${KISTEN_TYP_LABELS[details.kistentyp]} · Kiste #${details.id}`
                    : ""}
                </Text>
              </div>
            }
          >
            {detailsLoading && <LoadingOverlay visible />}
            {details && (
              <Tabs defaultValue="uebersicht" keepMounted={false}>
                <Tabs.List mb="md">
                  <Tabs.Tab value="uebersicht">Übersicht</Tabs.Tab>
                  <Tabs.Tab value="bearbeiten">Bearbeiten</Tabs.Tab>
                  <Tabs.Tab value="angebot">Angebot</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="uebersicht">
                  <Stack gap="lg">
                    <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
                      {[
                        {
                          label: "Gewicht",
                          value: `${formatDecimal(
                            selectedKiste?.calculateWeightKg(
                              plattenGewichtKgProM2,
                            ) ?? 0,
                          )} kg`,
                        },
                        {
                          label: "Materialkosten",
                          value: formatEuro(selectedKiste?.materialCost ?? 0),
                        },
                        {
                          label: "Kalkulierter Endpreis",
                          value: formatEuro(
                            calculateFinalPrice(
                              selectedKiste?.materialCost || 0,
                              pricingFactors,
                            ).final,
                          ),
                          hervorgehoben: true,
                        },
                      ].map((kennzahl) => (
                        <Paper
                          key={kennzahl.label}
                          withBorder
                          radius="md"
                          p="sm"
                        >
                          <Text size="xs" c="dimmed">
                            {kennzahl.label}
                          </Text>
                          <Text
                            fz={22}
                            fw={kennzahl.hervorgehoben ? 700 : 600}
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {kennzahl.value}
                          </Text>
                        </Paper>
                      ))}
                    </SimpleGrid>

                    <div>
                      <Divider
                        label="Aufbau"
                        labelPosition="left"
                        styles={SECTION_DIVIDER}
                        mb="sm"
                      />
                      <SimpleGrid
                        cols={{ base: 1, sm: 2 }}
                        spacing="xl"
                        verticalSpacing={8}
                      >
                        {detailRows.map((row) => (
                          <Group
                            key={row.label}
                            gap="sm"
                            wrap="nowrap"
                            align="baseline"
                          >
                            <Text
                              size="sm"
                              c="dimmed"
                              w={165}
                              style={{ flexShrink: 0 }}
                            >
                              {row.label}
                            </Text>
                            <Text
                              size="sm"
                              fw={500}
                              style={{ wordBreak: "break-word" }}
                            >
                              {row.value}
                            </Text>
                          </Group>
                        ))}
                      </SimpleGrid>
                    </div>

                    <div>
                      <Divider
                        label="Komponenten"
                        labelPosition="left"
                        styles={SECTION_DIVIDER}
                        mb="sm"
                      />
                      <Table.ScrollContainer minWidth={640}>
                        <Table
                          withTableBorder
                          highlightOnHover
                          verticalSpacing={6}
                        >
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Komponente</Table.Th>
                              <Table.Th ta="right" w={70}>
                                Anzahl
                              </Table.Th>
                              <Table.Th style={{ whiteSpace: "nowrap" }}>
                                Maße (L × B × D)
                              </Table.Th>
                              <Table.Th>Material</Table.Th>
                              <Table.Th ta="right" w={120}>
                                Gesamtpreis
                              </Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {komponentenGruppen.map((gruppe) => (
                              <Fragment key={gruppe.art}>
                                <Table.Tr>
                                  <Table.Td
                                    colSpan={5}
                                    py={4}
                                    style={{
                                      background:
                                        "var(--mantine-color-gray-0)",
                                    }}
                                  >
                                    <Text
                                      size="xs"
                                      fw={700}
                                      c="dimmed"
                                      tt="uppercase"
                                      style={{ letterSpacing: "0.04em" }}
                                    >
                                      {gruppe.art}
                                    </Text>
                                  </Table.Td>
                                </Table.Tr>
                                {gruppe.komponenten.map((component) => (
                                  <Table.Tr key={component.name}>
                                    <Table.Td>{component.name}</Table.Td>
                                    <Table.Td ta="right">
                                      {component.amount}×
                                    </Table.Td>
                                    <Table.Td
                                      style={{
                                        whiteSpace: "nowrap",
                                        fontVariantNumeric: "tabular-nums",
                                      }}
                                    >
                                      {formatMasse(
                                        component.masse.laenge,
                                        component.masse.breite,
                                        component.masse.dicke,
                                      )}
                                    </Table.Td>
                                    <Table.Td c="dimmed">
                                      {component.materialName ?? "–"}
                                    </Table.Td>
                                    <Table.Td
                                      ta="right"
                                      style={{
                                        whiteSpace: "nowrap",
                                        fontVariantNumeric: "tabular-nums",
                                      }}
                                    >
                                      {formatEuro(
                                        (Number(component.preisInEurGesamt) ||
                                          0) * (component.amount || 0),
                                      )}
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                              </Fragment>
                            ))}
                          </Table.Tbody>
                          <Table.Tfoot>
                            <Table.Tr>
                              <Table.Th colSpan={4} ta="right">
                                Materialkosten gesamt
                              </Table.Th>
                              <Table.Th
                                ta="right"
                                style={{
                                  whiteSpace: "nowrap",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {formatEuro(selectedKiste?.materialCost ?? 0)}
                              </Table.Th>
                            </Table.Tr>
                          </Table.Tfoot>
                        </Table>
                      </Table.ScrollContainer>
                    </div>
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="bearbeiten">
                  <Stack gap="sm">
                  <Group grow>
                    <NumberInput
                      label="Länge (mm)"
                      {...editForm.getInputProps("laenge")}
                    />
                    <NumberInput
                      label="Breite (mm)"
                      {...editForm.getInputProps("breite")}
                    />
                    <NumberInput
                      label="Höhe (mm)"
                      {...editForm.getInputProps("hoehe")}
                    />
                  </Group>
                  <Group grow>
                    <Select
                      label="Kistentyp"
                      allowDeselect={false}
                      data={Object.entries(KISTEN_TYP_LABELS).map(
                        ([value, label]) => ({ value, label: label as string }),
                      )}
                      value={editForm.values.kistentypId}
                      error={editForm.errors.kistentypId}
                      onChange={(value) => {
                        if (!value) return;
                        const kistentypId = value as KistenTypId;
                        editForm.setValues({
                          ...editForm.values,
                          kistentypId,
                          seitenriegelAnzahl:
                            SEITENRIEGEL_DEFAULT_PRO_SEITE[kistentypId],
                        });
                      }}
                    />
                  </Group>
                  <Group grow>
                    <PlatteSelect
                      label="Brettermaterial"
                      value={editForm.values.holzBretterID}
                      onChange={(id, meta) =>
                        editForm.setValues({
                          ...editForm.values,
                          holzBretterID: id,
                          dickeBretter:
                            editForm.values.dickeBretter &&
                            meta?.dicken.includes(editForm.values.dickeBretter)
                              ? editForm.values.dickeBretter
                              : undefined,
                        })
                      }
                    />
                    <DickeSelect
                      label="Stärke Bretter"
                      dicken={dickePlattenEdit}
                      {...editForm.getInputProps("dickeBretter")}
                    />
                  </Group>
                  <Group grow>
                    <PlatteSelect
                      label="Bodenmaterial (optional)"
                      value={editForm.values.holzBretterBodenID}
                      onChange={(id, meta) =>
                        editForm.setValues({
                          ...editForm.values,
                          holzBretterBodenID: id,
                          dickeBretterBoden:
                            id &&
                            editForm.values.dickeBretterBoden &&
                            meta?.dicken.includes(
                              editForm.values.dickeBretterBoden,
                            )
                              ? editForm.values.dickeBretterBoden
                              : undefined,
                        })
                      }
                    />
                    <DickeSelect
                      label="Stärke Boden"
                      dicken={
                        editForm.values.holzBretterBodenID
                          ? dickePlattenBodenEdit
                          : []
                      }
                      value={
                        editForm.values.holzBretterBodenID
                          ? editForm.values.dickeBretterBoden
                          : undefined
                      }
                      onChange={(value) =>
                        editForm.setFieldValue("dickeBretterBoden", value)
                      }
                    />
                  </Group>
                  <NumberInput
                    label="Anzahl Bodenbretter"
                    min={1}
                    value={editForm.values.bodenAnzahl}
                    onChange={(val) =>
                      editForm.setFieldValue(
                        "bodenAnzahl",
                        val === "" ? 1 : Math.max(1, Number(val)),
                      )
                    }
                  />
                  {editForm.values.kistentypId == "bellmer_lq" && (
                    <BalkenSelect
                      label="Balken längs"
                      value={editForm.values.holzBalkenLaengsID}
                      error={editForm.errors.holzBalkenLaengsID}
                      onChange={(id, meta) =>
                        editForm.setValues({
                          ...editForm.values,
                          holzBalkenLaengsID: id,
                          riegelDicke:
                            meta?.staerke ?? editForm.values.riegelDicke,
                          riegelBreite:
                            meta?.breite ?? editForm.values.riegelBreite,
                        })
                      }
                    />
                  )}
                  <BalkenSelect
                    label="Balken quer"
                    value={editForm.values.holzBalkenQuerID}
                    error={editForm.errors.holzBalkenQuerID}
                    onChange={(id) =>
                      editForm.setFieldValue(
                        "holzBalkenQuerID",
                        id ?? undefined,
                      )
                    }
                  />
                  <Group grow>
                    {editForm.values.kistentypId == "bellmer_lq" && (
                      <NumberInput
                        label="Anzahl Längsbalken"
                        min={0}
                        disabled={editForm.values.kistentypId !== "bellmer_lq"}
                        value={editForm.values.balkenLaengsAnzahl}
                        error={editForm.errors.balkenLaengsAnzahl}
                        onChange={(val) =>
                          editForm.setFieldValue(
                            "balkenLaengsAnzahl",
                            val === "" ? 0 : Number(val),
                          )
                        }
                      />
                    )}
                    <NumberInput
                      label="Anzahl Querbalken"
                      min={0}
                      value={editForm.values.balkenQuerAnzahl}
                      error={editForm.errors.balkenQuerAnzahl}
                      onChange={(val) =>
                        editForm.setFieldValue(
                          "balkenQuerAnzahl",
                          val === "" ? 0 : Number(val),
                        )
                      }
                    />
                  </Group>
                  <RiegelSelect
                    value={editForm.values.holzRiegelID}
                    error={editForm.errors.holzRiegelID}
                    onChange={(id, meta) =>
                      editForm.setValues({
                        ...editForm.values,
                        holzRiegelID: id,
                        riegelDicke:
                          meta?.staerke ?? editForm.values.riegelDicke,
                        riegelBreite:
                          meta?.breite ?? editForm.values.riegelBreite,
                      })
                    }
                  />
                  <Group grow>
                    <NumberInput
                      label="Riegelstärke (mm)"
                      min={1}
                      {...editForm.getInputProps("riegelDicke")}
                    />
                    <NumberInput
                      label="Riegelbreite (mm)"
                      min={1}
                      {...editForm.getInputProps("riegelBreite")}
                    />
                  </Group>
                  <NumberInput
                    label="Seitenriegel pro Seite"
                    min={0}
                    value={editForm.values.seitenriegelAnzahl}
                    onChange={(val) =>
                      editForm.setFieldValue(
                        "seitenriegelAnzahl",
                        val === "" ? 0 : Math.max(0, Number(val)),
                      )
                    }
                  />

                  <Group justify="flex-end">
                    <Button
                      onClick={() => {
                        const v = editForm.values as typeof editForm.values;
                        if (v.holzBretterBodenID && !v.dickeBretterBoden) {
                          notifications.show({
                            title: "Fehler",
                            message:
                              "Bitte Dicke für das Bodenmaterial auswählen.",
                            color: "red",
                          });
                          return;
                        }
                        updateMutation.mutate({
                          id: v.id,
                          name: v.name?.trim() || undefined,
                          kistentypId: v.kistentypId,
                          innenmasse: {
                            hoehe: v.hoehe,
                            laenge: v.laenge,
                            breite: v.breite,
                          },
                          holzBretterID: v.holzBretterID!,
                          holzBretterBodenID: v.holzBretterBodenID ?? null,
                          holzBalkenLaengsID:
                            v.kistentypId === "bellmer_lq"
                              ? v.holzBalkenLaengsID!
                              : null,
                          holzBalkenQuerID: v.holzBalkenQuerID ?? null,
                          holzRiegelID: v.holzRiegelID ?? null,
                          balkenLaengsAnzahl: v.balkenLaengsAnzahl ?? 0,
                          balkenQuerAnzahl: v.balkenQuerAnzahl ?? 0,
                          bodenAnzahl: v.bodenAnzahl ?? 1,
                          seitenriegelAnzahl: v.seitenriegelAnzahl,
                          dickeBretter: v.dickeBretter!,
                          dickeBretterBoden: v.holzBretterBodenID
                            ? v.dickeBretterBoden!
                            : null,
                          riegelDicke: v.riegelDicke!,
                          riegelBreite: v.riegelBreite!,
                        } as any);
                      }}
                    >
                      Speichern
                    </Button>
                  </Group>
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="angebot">
                  <Stack gap="md">
                    {angebotstexte && (
                      <Accordion variant="contained" multiple={false}>
                        <Accordion.Item value="kurz">
                          <Accordion.Control>
                            Angebotstext kurz
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap="xs">
                              <Textarea
                                minRows={6}
                                value={angebotstexte.kurz}
                                readOnly
                              />
                              <Group justify="flex-end">
                                <CopyButton value={angebotstexte.kurz}>
                                  {({ copy }) => (
                                    <Button size="xs" onClick={copy}>
                                      Kopieren
                                    </Button>
                                  )}
                                </CopyButton>
                              </Group>
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="mittel">
                          <Accordion.Control>
                            Angebotstext mittel
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap="xs">
                              <Textarea
                                minRows={7}
                                value={angebotstexte.mittel}
                                readOnly
                              />
                              <Group justify="flex-end">
                                <CopyButton value={angebotstexte.mittel}>
                                  {({ copy }) => (
                                    <Button size="xs" onClick={copy}>
                                      Kopieren
                                    </Button>
                                  )}
                                </CopyButton>
                              </Group>
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="ausfuehrlich">
                          <Accordion.Control>
                            Angebotstext ausführlich
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap="xs">
                              <Textarea
                                minRows={9}
                                value={angebotstexte.ausfuehrlich}
                                readOnly
                              />
                              <Group justify="flex-end">
                                <CopyButton value={angebotstexte.ausfuehrlich}>
                                  {({ copy }) => (
                                    <Button size="xs" onClick={copy}>
                                      Kopieren
                                    </Button>
                                  )}
                                </CopyButton>
                              </Group>
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
                    )}
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            )}
          </Modal>
        </Stack>
      </Group>
    </Stack>
  );
}
