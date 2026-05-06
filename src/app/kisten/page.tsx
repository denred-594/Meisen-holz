"use client";
import { useState, useMemo, useEffect } from "react";
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
} from "@/components/MaterialSelects";
import {
  KISTEN_TYP_LABELS,
  KistenTypId,
  kistenTypIdEnum,
} from "@/server/db/schemas";
import { modals } from "@mantine/modals";
import { Kiste } from "@/server/domain/kiste";
import { calculateFinalPrice } from "@/utils/pricing";
// Kisten-Optionen kommen vom Server (SOT) über trpc.kisten.meta

export default function KistenPage() {
  const trpc = useTRPC();
  const { data: kisten, refetch } = useQuery(
    trpc.kisten.listWithRelations.queryOptions(undefined, {
      staleTime: 5000,
    })
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
    })
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
    })
  );
  const updateNameMutation = useMutation(
    trpc.kisten.updateName.mutationOptions({
      onSuccess: async () => {
        await refetch();
        await refetchDetails();
      },
      onError: (e) => {
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        });
      },
    })
  );

  const { data: holzplatten } = useQuery(
    trpc.material.holzplatten.queryOptions()
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
    })
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
      gewicht: 0,
      holzBretterID: undefined as number | undefined,
      dickeBretter: undefined as number | undefined,
      holzBretterBodenID: undefined as number | undefined,
      dickeBretterBoden: undefined as number | undefined,
      holzBalkenLaengsID: undefined as number | undefined,
      holzBalkenQuerID: undefined as number | undefined,
      riegelDicke: 23 as number | undefined,
      riegelBreite: 100 as number | undefined,
      balkenLaengsAnzahl: 0,
      balkenQuerAnzahl: 0,
      bodenAnzahl: 1,
    },
  });
  const {
    data: details,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = useQuery(
    trpc.kisten.getByIdWithRelations.queryOptions(
      { id: selectedId! },
      { enabled: Boolean(selectedId) }
    )
  );
  const { data: pricingFactors } = useQuery(trpc.settings.get.queryOptions());
  const selectedKiste = useMemo(() => {
    if (details) return Kiste.fromRow(details);
    return null;
  }, [details]);

  const finalPriceEur = useMemo(() => {
    return Number(
      calculateFinalPrice(selectedKiste?.materialCost || 0, pricingFactors).final
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

  useEffect(() => {
    if (!details) return;
    editForm.setValues({
      id: details.id,
      name: details.name ?? "",
      kistentypId: details.kistentyp,
      laenge: details.innenLaenge,
      breite: details.innenBreite,
      hoehe: details.innenHoehe,
      gewicht: Number(details.gewicht),
      holzBretterID: details.holzBretterID,
      dickeBretter: details.dickeBretter,
      holzBretterBodenID: details.holzBretterBodenID ?? undefined,
      dickeBretterBoden: details.dickeBretterBoden ?? undefined,
      holzBalkenLaengsID: details.holzBalkenLaengsID ?? undefined,
      holzBalkenQuerID: details.holzBalkenQuerID ?? undefined,
      riegelDicke: details.riegelDicke,
      riegelBreite: details.riegelBreite,
      balkenLaengsAnzahl: details.balkenLaengsAnzahl ?? 0,
      balkenQuerAnzahl: details.balkenQuerAnzahl ?? 0,
      bodenAnzahl: details.bodenAnzahl ?? 1,
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
    setSelectedId(id);
    setModalOpen(true);
    refetchDetails();
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
      gewicht: 10,
      holzBretterID: undefined as number | undefined,
      dickeBretter: undefined as number | undefined,
      holzBretterBodenID: undefined as number | undefined,
      dickeBretterBoden: undefined as number | undefined,
      holzBalkenLaengsID: undefined as number | undefined,
      holzBalkenQuerID: undefined as number | undefined,
      riegelDicke: 23 as number | undefined,
      riegelBreite: 100 as number | undefined,
      balkenLaengsAnzahl: 3,
      balkenQuerAnzahl: 3,
      bodenAnzahl: 1,
    },
    validate: {
      hoehe: (v) => (v && v > 0 ? null : "Pflichtfeld"),
      laenge: (v) => (v && v > 0 ? null : "Pflichtfeld"),
      breite: (v) => (v && v > 0 ? null : "Pflichtfeld"),
      gewicht: (v) => (v && v > 0 ? null : "Pflichtfeld"),
      holzBretterID: (v) => (v ? null : "Bitte Brettermaterial wählen"),
      dickeBretter: (v) => (v ? null : "Bitte Dicke wählen"),
      bodenAnzahl: (v) => (v && v >= 1 ? null : "Mindestens 1"),
      holzBalkenLaengsID: (v, values) =>
        values.kistentypId === "bellmer_lq" && !v
          ? "Bitte Balken längs wählen"
          : null,
      riegelDicke: (v) => (v ? null : "Bitte Riegeldicke angeben"),
      riegelBreite: (v) => (v ? null : "Bitte Riegelbreite angeben"),
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
  const disableCreateButton =
    missingCreateLaengsbalken ||
    missingCreateBodenDicke ||
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
      gewicht: values.gewicht,
      holzBretterID: values.holzBretterID!,
      holzBretterBodenID: values.holzBretterBodenID ?? null,
      holzBalkenLaengsID: requiresLaengsbalken
        ? values.holzBalkenLaengsID!
        : null,
      holzBalkenQuerID: values.holzBalkenQuerID ?? null,
      balkenLaengsAnzahl: values.balkenLaengsAnzahl,
      balkenQuerAnzahl: values.balkenQuerAnzahl,
      bodenAnzahl: values.bodenAnzahl,
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
        <Card shadow="sm" padding="md" w={360} withBorder>
          <Stack gap="sm">
            <TextInput
              label="Name (optional)"
              placeholder="z. B. Auftrag 1234"
              {...createForm.getInputProps("name")}
            />
            <Select
              label="Kistentyp"
              data={kistenTypIdEnum.enumValues.map((value) => ({
                value,
                label: KISTEN_TYP_LABELS[value] as string,
              }))}
              {...createForm.getInputProps("kistentypId")}
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
            <NumberInput
              label="Gewicht (kg)"
              {...createForm.getInputProps("gewicht")}
            />
            <Divider label="Materialien" />
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
              label="Dicke Bretter"
              dicken={dickePlatten}
              {...createForm.getInputProps("dickeBretter")}
            />
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
              label="Dicke Boden"
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
            <NumberInput
              label="Anzahl Bodenbretter"
              min={1}
              value={createForm.values.bodenAnzahl}
              onChange={(v) =>
                createForm.setFieldValue(
                  "bodenAnzahl",
                  v === "" ? 1 : Math.max(1, Number(v))
                )
              }
            />
            <Divider label="Balken" />
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
            <BalkenSelect
              label="Balken quer"
              {...createForm.getInputProps("holzBalkenQuerID")}
            />
            <Group grow>
              {createForm.values.kistentypId === "bellmer_lq" && (
                <NumberInput
                  label="Anzahl Längsbalken"
                  min={0}
                  {...createForm.getInputProps("balkenLaengsAnzahl")}
                />
              )}
              <NumberInput
                label="Anzahl Querbalken"
                min={0}
                {...createForm.getInputProps("balkenQuerAnzahl")}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Riegeldicke (mm)"
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
            {missingCreateLaengsbalken && (
              <Text c="red" size="xs">
                Bitte einen Längsbalken auswählen.
              </Text>
            )}
            {(!createForm.values.holzBretterID ||
              !createForm.values.dickeBretter ||
              missingCreateBodenDicke) && (
              <Text c="red" size="xs">
                Platten & Dicken vollständig auswählen.
              </Text>
            )}
          </Stack>
        </Card>
        <Stack flex={1} pos="relative">
          <Title order={3}>Erstellte Kisten</Title>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Typ</Table.Th>
                <Table.Th>Maße (LxBxH)</Table.Th>
                <Table.Th>Preis (€)</Table.Th>
                <Table.Th>Aktionen</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {kisten?.map((k) => (
                <Table.Tr
                  key={k.id}
                  onClick={() => openDetails(k.id)}
                  style={{ cursor: "pointer" }}
                >
                  <Table.Td>{k.id}</Table.Td>
                  <Table.Td>{(k as any).name || `Kiste #${k.id}`}</Table.Td>
                  <Table.Td>
                    {KISTEN_TYP_LABELS?.[k.kistentyp] ?? k.kistentyp}
                  </Table.Td>
                  <Table.Td>
                    {k.innenLaenge}x{k.innenBreite}x{k.innenHoehe}
                  </Table.Td>
                  <Table.Td>
                    {calculateFinalPrice(
                      Kiste.fromRow(k).materialCost,
                      pricingFactors
                    ).final.toFixed(2)}{" "}
                  </Table.Td>
                  <Table.Td w={240}>
                    <Group>
                      <Button
                        size="xs"
                        loading={exportingId === k.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          exportKiste(k.id);
                        }}
                        variant="light"
                        ml="sm"
                      >
                        Export XLSX
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
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
                            labels: { confirm: "Löschen", cancel: "Abbrechen" },
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
              ))}
            </Table.Tbody>
          </Table>
          <Modal
            opened={modalOpen}
            onClose={() => setModalOpen(false)}
            title={
              <Text fw={700} fz={24} span>
                {details?.name || `Kiste #${details?.id}`}
              </Text>
            }
            size="xl"
          >
            {detailsLoading && <LoadingOverlay visible />}
            {details && (
              <Stack gap="sm">
                <Group align="center" gap="sm">
                  {/* <TextInput
                    placeholder="Neuer Name"
                    size="xs"
                    onKeyDown={async (ev) => {
                      if (ev.key === "Enter") {
                        const val = (
                          ev.currentTarget as HTMLInputElement
                        ).value.trim();
                        if (!val) return;
                        updateNameMutation.mutate({
                          id: details.id,
                          name: val,
                        });
                        (ev.currentTarget as HTMLInputElement).value = "";
                      }
                    }}
                  /> */}
                </Group>
                <Text fw={600} size="sm">
                  Typ:{" "}
                  <Text span fw={400}>
                    {selectedKiste
                      ? KISTEN_TYP_LABELS[selectedKiste.snapshot.kistentypId]
                      : "-"}
                  </Text>
                </Text>
                <Text fw={600} size="sm">
                  Innenmaße:{" "}
                  <Text span fw={400}>
                    {Object.values(
                      selectedKiste?.snapshot.innenmasse ?? {}
                    ).join("x")}{" "}
                    mm
                  </Text>
                </Text>
                <Text fw={600} size="sm">
                  Brett:{" "}
                  <Text span fw={400}>
                    {selectedKiste?.snapshot.holzBrett?.typ}{" "}
                    {selectedKiste?.snapshot.selectedBrettVariante?.dicke} mm
                  </Text>
                </Text>
                <Text fw={600} size="sm">
                  Bodenbrett:{" "}
                  <Text span fw={400}>
                    {selectedKiste?.snapshot.holzBrettBoden?.typ ??
                      selectedKiste?.snapshot.holzBrett?.typ}{" "}
                    {selectedKiste?.snapshot.selectedBrettVarianteBoden?.dicke ??
                      selectedKiste?.snapshot.selectedBrettVariante?.dicke}{" "}
                    mm
                  </Text>
                </Text>
                <Text fw={600} size="sm">
                  Riegelbreite:{" "}
                  <Text span fw={400}>
                    {selectedKiste?.snapshot.riegelBreite} mm
                  </Text>
                </Text>
                <Text fw={600} size="sm">
                  Außenfläche (geometrisch):{" "}
                  <Text span fw={400}>
                    {selectedKiste?.gesamtAussenflaecheM2.toFixed(4)} m²
                  </Text>
                </Text>

                <Text fw={600} size="sm">
                  Preis: {selectedKiste?.materialCost.toFixed(2)}€
                </Text>
                <Text fw={600} size="sm">
                  Preis:{" "}
                  <Text span fw={400}>
                    {Number(
                      calculateFinalPrice(
                        selectedKiste?.materialCost || 0,
                        pricingFactors
                      ).final
                    ).toFixed(2)}{" "}
                    €
                  </Text>
                </Text>
                <Divider label="Bretter" />
                <Table withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Anzahl</Table.Th>
                      <Table.Th>Maße (LxBxD)</Table.Th>
                      <Table.Th>Typ</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {selectedKiste?.components.map((component) => (
                      <Table.Tr key={component.name}>
                        <Table.Td>{component.name}</Table.Td>
                        <Table.Td>{component.amount}x</Table.Td>
                        <Table.Td>
                          {Object.values(component.masse).join(" x ")} mm
                        </Table.Td>
                        <Table.Td>{component.materialName ?? "-"}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                <Divider label="Bearbeiten" />
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
                      data={Object.entries(KISTEN_TYP_LABELS).map(
                        ([value, label]) => ({ value, label: label as string })
                      )}
                      {...editForm.getInputProps("kistentypId")}
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
                      label="Dicke Bretter"
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
                            meta?.dicken.includes(editForm.values.dickeBretterBoden)
                              ? editForm.values.dickeBretterBoden
                              : undefined,
                        })
                      }
                    />
                    <DickeSelect
                      label="Dicke Boden"
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
                        val === "" ? 1 : Math.max(1, Number(val))
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
                        id ?? undefined
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
                            val === "" ? 0 : Number(val)
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
                          val === "" ? 0 : Number(val)
                        )
                      }
                    />
                  </Group>
                  <Group grow>
                    <NumberInput
                      label="Riegeldicke (mm)"
                      min={1}
                      {...editForm.getInputProps("riegelDicke")}
                    />
                    <NumberInput
                      label="Riegelbreite (mm)"
                      min={1}
                      {...editForm.getInputProps("riegelBreite")}
                    />
                  </Group>

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
                          gewicht: v.gewicht,
                          holzBretterID: v.holzBretterID!,
                          holzBretterBodenID: v.holzBretterBodenID ?? null,
                          holzBalkenLaengsID:
                            v.kistentypId === "bellmer_lq"
                              ? v.holzBalkenLaengsID!
                              : null,
                          holzBalkenQuerID: v.holzBalkenQuerID ?? null,
                          balkenLaengsAnzahl: v.balkenLaengsAnzahl ?? 0,
                          balkenQuerAnzahl: v.balkenQuerAnzahl ?? 0,
                          bodenAnzahl: v.bodenAnzahl ?? 1,
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

                  {angebotstexte && (
                    <>
                      <Divider label="Angebotstexte" />
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
                    </>
                  )}
                </Stack>
              </Stack>
            )}
          </Modal>
        </Stack>
      </Group>
    </Stack>
  );
}
