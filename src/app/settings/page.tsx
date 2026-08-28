"use client";
import { useEffect, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import {
  Stack,
  Title,
  NumberInput,
  Button,
  Group,
  Tabs,
  TextInput,
  Card,
  Table,
  ActionIcon,
  Text,
  Badge,
  Checkbox,
  Divider,
  SimpleGrid,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { IconTrash, IconEdit, IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { formatDecimal, formatEuro } from "@/utils/format";

type DickenVariantFormRow = {
  key: string;
  dicke: number | "";
  preis: number | "";
};

type PlatteFormState = {
  id?: number;
  typ: string;
  isVollholz: boolean;
  breite?: number | string;
  varianten: DickenVariantFormRow[];
  pendingDicke: number | "";
  pendingPreis: number | "";
};

const createVariantKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const createEmptyPlatteForm = (): PlatteFormState => ({
  id: undefined,
  typ: "",
  isVollholz: false,
  breite: "",
  varianten: [],
  pendingDicke: "",
  pendingPreis: "",
});

function mapSettingsToLocal(settings: any) {
  return {
    hourlyRate: settings?.hourlyRate ? Number(settings.hourlyRate) : 50,
    workHours: settings?.workHours ? Number(settings.workHours) : 4,
    factorA: settings?.factorA ? Number(settings.factorA) : 100 / 90,
    factorB: settings?.factorB ? Number(settings.factorB) : 100 / 70,
    factorC: settings?.factorC ? Number(settings.factorC) : 100 / 90,
    factorD: settings?.factorD ? Number(settings.factorD) : 100 / 98,
    plattenGewichtKgProM2: settings?.plattenGewichtKgProM2
      ? Number(settings.plattenGewichtKgProM2)
      : 8,
  };
}

export default function SettingsPage() {
  const trpc = useTRPC();
  const { data: settings, refetch } = useQuery(
    trpc.settings.get.queryOptions(),
  );
  const updateMutation = useMutation(
    trpc.settings.update.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );
  const { data: holzplatten, refetch: refetchPlatten } = useQuery(
    trpc.material.holzplatten.queryOptions(),
  );
  const { data: holzbalken, refetch: refetchBalken } = useQuery(
    trpc.material.holzbalken.queryOptions(),
  );
  const { data: holzriegel, refetch: refetchRiegel } = useQuery(
    trpc.material.holzriegel.queryOptions(),
  );
  const upsertPlatteMutation = useMutation(
    trpc.material.upsertHolzplatte.mutationOptions({
      onSuccess: () => {
        refetchPlatten();
        notifications.show({
          title: "Holzplatte gespeichert",
          message: "Erfolgreich aktualisiert.",
          color: "green",
        });
      },
      onError: (e) =>
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        }),
    }),
  );
  const deletePlatteMutation = useMutation(
    trpc.material.deleteHolzplatte.mutationOptions({
      onSuccess: () => {
        refetchPlatten();
        notifications.show({
          title: "Holzplatte gelöscht",
          message: "Eintrag entfernt.",
          color: "orange",
        });
      },
      onError: (e) =>
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        }),
    }),
  );
  const upsertBalkenMutation = useMutation(
    trpc.material.upsertHolzbalken.mutationOptions({
      onSuccess: () => {
        refetchBalken();
        notifications.show({
          title: "Holzbalken gespeichert",
          message: "Erfolgreich aktualisiert.",
          color: "green",
        });
      },
      onError: (e) =>
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        }),
    }),
  );
  const deleteBalkenMutation = useMutation(
    trpc.material.deleteHolzbalken.mutationOptions({
      onSuccess: () => {
        refetchBalken();
        notifications.show({
          title: "Holzbalken gelöscht",
          message: "Eintrag entfernt.",
          color: "orange",
        });
      },
      onError: (e) =>
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        }),
    }),
  );

  const upsertRiegelMutation = useMutation(
    trpc.material.upsertHolzriegel.mutationOptions({
      onSuccess: () => {
        refetchRiegel();
        notifications.show({
          title: "Riegel gespeichert",
          message: "Erfolgreich aktualisiert.",
          color: "green",
        });
      },
      onError: (e) =>
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        }),
    }),
  );
  const deleteRiegelMutation = useMutation(
    trpc.material.deleteHolzriegel.mutationOptions({
      onSuccess: () => {
        refetchRiegel();
        notifications.show({
          title: "Riegel gelöscht",
          message: "Eintrag entfernt.",
          color: "orange",
        });
      },
      onError: (e) =>
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        }),
    }),
  );

  const [local, setLocal] = useState(() => mapSettingsToLocal(settings));

  useEffect(() => {
    if (!settings) return;
    setLocal(mapSettingsToLocal(settings));
  }, [settings?.id]);

  function save() {
    updateMutation.mutate(local, {
      onSuccess: () =>
        notifications.show({
          title: "Preise gespeichert",
          message: "Einstellungen aktualisiert.",
          color: "green",
        }),
      onError: (e) =>
        notifications.show({
          title: "Fehler",
          message: e.message,
          color: "red",
        }),
    });
  }

  // Holzplatten Form
  const [platteForm, setPlatteForm] = useState<PlatteFormState>(() =>
    createEmptyPlatteForm(),
  );
  function resetPlatte() {
    setPlatteForm(createEmptyPlatteForm());
  }
  function addVariant() {
    const dickeValue = Number(platteForm.pendingDicke);
    if (!Number.isFinite(dickeValue) || dickeValue <= 0) {
      notifications.show({
        title: "Ungültige Stärke",
        message: "Bitte eine positive Stärke eingeben.",
        color: "red",
      });
      return;
    }
    const rounded = Math.round(dickeValue);
    if (
      platteForm.varianten.some((variant) => Number(variant.dicke) === rounded)
    ) {
      notifications.show({
        title: "Schon vorhanden",
        message: `Die Stärke ${rounded} mm ist bereits hinterlegt.`,
        color: "orange",
      });
      return;
    }
    const preisValue = Number(platteForm.pendingPreis ?? 0);
    setPlatteForm((prev) => ({
      ...prev,
      varianten: [
        ...prev.varianten,
        {
          key: createVariantKey(),
          dicke: rounded,
          preis: Number.isFinite(preisValue) ? preisValue : 0,
        },
      ],
      pendingDicke: "",
      pendingPreis: "",
    }));
  }
  function removeVariant(key: string) {
    setPlatteForm((prev) => ({
      ...prev,
      varianten: prev.varianten.filter((variant) => variant.key !== key),
    }));
  }
  function submitPlatte() {
    const variantenPayload = platteForm.varianten
      .map((variant) => ({
        dicke: Number(variant.dicke),
        preis: Number(variant.preis ?? 0),
      }))
      .filter(
        (variant) =>
          Number.isFinite(variant.dicke) &&
          variant.dicke > 0 &&
          Number.isFinite(variant.preis),
      );
    if (!variantenPayload.length) {
      notifications.show({
        title: "Dicken erforderlich",
        message: "Bitte mindestens eine Dicke mit Preis hinterlegen.",
        color: "red",
      });
      return;
    }
    upsertPlatteMutation.mutate({
      id: platteForm.id,
      typ: platteForm.typ,
      isVollholz: platteForm.isVollholz,
      breite: platteForm.breite ? Number(platteForm.breite) : undefined,
      varianten: variantenPayload,
    });
    resetPlatte();
  }

  // Holzbalken Form
  const [balkenForm, setBalkenForm] = useState<{
    id?: number;
    typ: string;
    staerke: number | string;
    breite: number | string;
    preisProKubikmeter: number | string;
  }>({
    id: undefined,
    typ: "",
    staerke: "",
    breite: "",
    preisProKubikmeter: "",
  });
  function resetBalken() {
    setBalkenForm({
      id: undefined,
      typ: "",
      staerke: "",
      breite: "",
      preisProKubikmeter: "",
    });
  }
  function submitBalken() {
    upsertBalkenMutation.mutate({
      id: balkenForm.id,
      typ: balkenForm.typ,
      staerke: Number(balkenForm.staerke),
      breite: Number(balkenForm.breite),
      preisProKubikmeter: Number(balkenForm.preisProKubikmeter || 0),
    });
    resetBalken();
  }

  // Riegel ("Bretter für Riegel") Form – Abrechnung pro Kubikmeter
  const [riegelForm, setRiegelForm] = useState<{
    id?: number;
    typ: string;
    staerke: number | string;
    breite: number | string;
    preisProKubikmeter: number | string;
  }>({
    id: undefined,
    typ: "",
    staerke: "",
    breite: "",
    preisProKubikmeter: "",
  });
  function resetRiegel() {
    setRiegelForm({
      id: undefined,
      typ: "",
      staerke: "",
      breite: "",
      preisProKubikmeter: "",
    });
  }
  function submitRiegel() {
    upsertRiegelMutation.mutate({
      id: riegelForm.id,
      typ: riegelForm.typ,
      staerke: Number(riegelForm.staerke),
      breite: Number(riegelForm.breite),
      preisProKubikmeter: Number(riegelForm.preisProKubikmeter || 0),
    });
    resetRiegel();
  }

  return (
    <Stack p="md" gap="md">
      <Title order={2}>Einstellungen & Materialien</Title>
      <Tabs defaultValue="preise">
        <Tabs.List>
          <Tabs.Tab value="preise">Preise</Tabs.Tab>
          <Tabs.Tab value="holzplatten">Holzplatten</Tabs.Tab>
          <Tabs.Tab value="holzbalken">Holzbalken</Tabs.Tab>
          <Tabs.Tab value="riegel">Riegel (Bretter)</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="preise" pt="md">
          <Card withBorder shadow="sm" p="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Reihenfolge der Kalkulation: Materialkosten × Faktor A ×
                Faktor B, dann + (Arbeitsstunden × Stundensatz), dann
                × Faktor C × Faktor D.
              </Text>
              <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
                <NumberInput
                  label="Faktor A"
                  description="Aufschlag auf die Materialkosten, z. B. 100/90 = 1,1111"
                  decimalScale={6}
                  step={0.01}
                  value={local.factorA}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, factorA: Number(v) }))
                  }
                />
                <NumberInput
                  label="Faktor B"
                  description="Allgemeiner Kostenaufschlag, z. B. 100/70 = 1,4286"
                  decimalScale={6}
                  step={0.01}
                  value={local.factorB}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, factorB: Number(v) }))
                  }
                />
                <NumberInput
                  label="Faktor C"
                  description="Aufschlag auf die Zwischensumme, z. B. 100/90 = 1,1111"
                  decimalScale={6}
                  step={0.01}
                  value={local.factorC}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, factorC: Number(v) }))
                  }
                />
                <NumberInput
                  label="Faktor D"
                  description="Letzter Aufschlag, z. B. 100/98 = 1,0204"
                  decimalScale={6}
                  step={0.01}
                  value={local.factorD}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, factorD: Number(v) }))
                  }
                />
                <NumberInput
                  label="Stundensatz"
                  description="Euro pro Arbeitsstunde"
                  suffix=" €"
                  decimalScale={2}
                  value={local.hourlyRate}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, hourlyRate: Number(v) }))
                  }
                />
                <NumberInput
                  label="Arbeitsstunden"
                  description="Kalkulierte Stunden je Kiste"
                  suffix=" h"
                  decimalScale={2}
                  step={0.5}
                  value={local.workHours}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, workHours: Number(v) }))
                  }
                />
              </SimpleGrid>
              <Divider label="Gewicht" labelPosition="left" />
              <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
                <NumberInput
                  label="Plattengewicht"
                  description="Kilogramm pro Quadratmeter Plattenmaterial"
                  suffix=" kg/m²"
                  min={0.01}
                  step={0.1}
                  decimalScale={2}
                  value={local.plattenGewichtKgProM2}
                  onChange={(v) =>
                    setLocal((f) => ({
                      ...f,
                      plattenGewichtKgProM2: Number(v),
                    }))
                  }
                />
              </SimpleGrid>
              <Group justify="flex-start" mt="xs">
                <Button loading={updateMutation.isPending} onClick={save}>
                  Speichern
                </Button>
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="holzplatten" pt="md">
          <Group align="flex-start" wrap="wrap" gap="lg">
            <Card withBorder shadow="sm" w={340} p="md">
              <Stack gap="sm">
                <Title order={4}>
                  {platteForm.id
                    ? "Holzplatte bearbeiten"
                    : "Holzplatte hinzufügen"}
                </Title>
                <TextInput
                  label="Typ"
                  value={platteForm.typ}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setPlatteForm((f) => ({ ...f, typ: value }));
                  }}
                />
                <Checkbox
                  label="Vollholz (Abrechnung in €/cm³)"
                  checked={platteForm.isVollholz ?? false}
                  onChange={(event) =>
                    setPlatteForm((f) => ({
                      ...f,
                      isVollholz: event?.target?.checked ?? false,
                    }))
                  }
                />
                <NumberInput
                  label="Breite (mm)"
                  value={
                    platteForm.breite ? Number(platteForm.breite) : undefined
                  }
                  onChange={(v) => setPlatteForm((f) => ({ ...f, breite: v }))}
                />
                <Group align="flex-end" gap="xs" wrap="wrap">
                  <NumberInput
                    label="Neue Stärke (mm)"
                    placeholder="z. B. 18"
                    value={
                      platteForm.pendingDicke === ""
                        ? undefined
                        : Number(platteForm.pendingDicke)
                    }
                    onChange={(v) =>
                      setPlatteForm((f) => ({
                        ...f,
                        pendingDicke: v === "" ? "" : Number(v),
                      }))
                    }
                  />
                  <NumberInput
                    label={
                      platteForm.isVollholz ? "Preis (€/cm³)" : "Preis (€/m²)"
                    }
                    placeholder="z. B. 24"
                    step={0.1}
                    value={
                      platteForm.pendingPreis === ""
                        ? undefined
                        : Number(platteForm.pendingPreis)
                    }
                    onChange={(v) =>
                      setPlatteForm((f) => ({
                        ...f,
                        pendingPreis: v === "" ? "" : Number(v),
                      }))
                    }
                  />
                  <Button
                    size="sm"
                    variant="light"
                    leftSection={<IconPlus size={14} />}
                    onClick={addVariant}
                  >
                    Variante hinzufügen
                  </Button>
                </Group>
                {platteForm.varianten.length ? (
                  <Table highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: "40%" }}>Stärke (mm)</Table.Th>
                        <Table.Th style={{ width: "40%" }}>
                          {platteForm.isVollholz
                            ? "Preis (€/cm³)"
                            : "Preis (€/m²)"}
                        </Table.Th>
                        <Table.Th style={{ width: "20%" }}></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {platteForm.varianten.map((variant) => (
                        <Table.Tr key={variant.key}>
                          <Table.Td>
                            <NumberInput
                              value={
                                variant.dicke === ""
                                  ? undefined
                                  : Number(variant.dicke)
                              }
                              onChange={(v) =>
                                setPlatteForm((prev) => ({
                                  ...prev,
                                  varianten: prev.varianten.map((row) =>
                                    row.key === variant.key
                                      ? {
                                          ...row,
                                          dicke: v === "" ? "" : Number(v),
                                        }
                                      : row,
                                  ),
                                }))
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              step={0.1}
                              value={
                                variant.preis === ""
                                  ? undefined
                                  : Number(variant.preis)
                              }
                              onChange={(v) =>
                                setPlatteForm((prev) => ({
                                  ...prev,
                                  varianten: prev.varianten.map((row) =>
                                    row.key === variant.key
                                      ? {
                                          ...row,
                                          preis: v === "" ? "" : Number(v),
                                        }
                                      : row,
                                  ),
                                }))
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <Group justify="flex-end">
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="red"
                                aria-label="Variante entfernen"
                                onClick={() => removeVariant(variant.key)}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text size="sm" c="dimmed">
                    Noch keine Dicken hinterlegt.
                  </Text>
                )}
                <Group>
                  <Button
                    size="sm"
                    loading={upsertPlatteMutation.isPending}
                    onClick={submitPlatte}
                    disabled={!platteForm.typ || !platteForm.varianten.length}
                  >
                    Speichern
                  </Button>
                  {platteForm.id && (
                    <Button
                      size="sm"
                      variant="light"
                      color="gray"
                      onClick={resetPlatte}
                    >
                      Abbrechen
                    </Button>
                  )}
                </Group>
              </Stack>
            </Card>
            <Stack flex={1}>
              <Title order={4}>Holzplatten Übersicht</Title>
              <Table highlightOnHover withTableBorder verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={60}>ID</Table.Th>
                    <Table.Th>Typ</Table.Th>
                    <Table.Th>Einheit</Table.Th>
                    <Table.Th style={{ whiteSpace: "nowrap" }}>
                      Breite (mm)
                    </Table.Th>
                    <Table.Th>Stärken & Preise</Table.Th>
                    <Table.Th w={80}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {holzplatten?.map((p) => (
                    <Table.Tr
                      onDoubleClick={() =>
                        setPlatteForm({
                          id: p.id,
                          typ: p.typ,
                          isVollholz: Boolean(p.isVollholz),
                          breite: typeof p.breite === "number" ? p.breite : "",
                          varianten: (p.dicken ?? []).map((variante) => ({
                            key: createVariantKey(),
                            dicke: variante.dicke,
                            preis: variante.preis,
                          })),
                          pendingDicke: "",
                          pendingPreis: "",
                        })
                      }
                      key={p.id}
                    >
                      <Table.Td c="dimmed">{p.id}</Table.Td>
                      <Table.Td fw={600}>{p.typ}</Table.Td>
                      <Table.Td>
                        <Badge
                          size="sm"
                          variant="light"
                          tt="none"
                          color={p.isVollholz ? "orange" : "blue"}
                        >
                          {p.isVollholz ? "€/cm³" : "€/m²"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{p.breite ? `${p.breite} mm` : "–"}</Table.Td>
                      <Table.Td>
                        {p.dicken?.length ? (
                          <Group gap={4} wrap="wrap">
                            {p.dicken.map((variante) => (
                              <Badge
                                key={`${p.id}-${variante.id}`}
                                variant="light"
                                tt="none"
                                style={{ fontVariantNumeric: "tabular-nums" }}
                              >
                                {variante.dicke} mm ·{" "}
                                {formatDecimal(
                                  variante.preis,
                                  p.isVollholz ? 4 : 2,
                                )}{" "}
                                {p.isVollholz ? "€/cm³" : "€/m²"}
                              </Badge>
                            ))}
                          </Group>
                        ) : (
                          <Text size="sm" c="dimmed">
                            Keine Varianten
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={2} wrap="nowrap" justify="flex-end">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            aria-label="Bearbeiten"
                            onClick={() =>
                              setPlatteForm({
                                id: p.id,
                                typ: p.typ,
                                isVollholz: Boolean(p.isVollholz),
                                breite:
                                  typeof p.breite === "number" ? p.breite : "",
                                varianten: (p.dicken ?? []).map((variante) => ({
                                  key: createVariantKey(),
                                  dicke: variante.dicke,
                                  preis: variante.preis,
                                })),
                                pendingDicke: "",
                                pendingPreis: "",
                              })
                            }
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            aria-label="Löschen"
                            loading={deletePlatteMutation.isPending}
                            onClick={() =>
                              deletePlatteMutation.mutate({ id: p.id })
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Group>
        </Tabs.Panel>
        <Tabs.Panel value="holzbalken" pt="md">
          <Group align="flex-start" wrap="wrap" gap="lg">
            <Card withBorder shadow="sm" w={340} p="md">
              <Stack gap="sm">
                <Title order={4}>
                  {balkenForm.id
                    ? "Holzbalken bearbeiten"
                    : "Holzbalken hinzufügen"}
                </Title>
                <TextInput
                  label="Typ"
                  value={balkenForm.typ}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setBalkenForm((f) => ({ ...f, typ: value }));
                  }}
                />
                <NumberInput
                  label="Stärke (mm)"
                  value={
                    balkenForm.staerke ? Number(balkenForm.staerke) : undefined
                  }
                  onChange={(v) => setBalkenForm((f) => ({ ...f, staerke: v }))}
                />
                <NumberInput
                  label="Breite (mm)"
                  value={
                    balkenForm.breite ? Number(balkenForm.breite) : undefined
                  }
                  onChange={(v) => setBalkenForm((f) => ({ ...f, breite: v }))}
                />
                <NumberInput
                  label="Preis (€/m³)"
                  value={
                    balkenForm.preisProKubikmeter
                      ? Number(balkenForm.preisProKubikmeter)
                      : undefined
                  }
                  onChange={(v) =>
                    setBalkenForm((f) => ({ ...f, preisProKubikmeter: v }))
                  }
                />
                <Group>
                  <Button
                    size="sm"
                    loading={upsertBalkenMutation.isPending}
                    onClick={submitBalken}
                    disabled={!balkenForm.typ}
                  >
                    Speichern
                  </Button>
                  {balkenForm.id && (
                    <Button
                      size="sm"
                      variant="light"
                      color="gray"
                      onClick={resetBalken}
                    >
                      Abbrechen
                    </Button>
                  )}
                </Group>
              </Stack>
            </Card>
            <Stack flex={1}>
              <Title order={4}>Holzbalken Übersicht</Title>
              <Table highlightOnHover withTableBorder verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={60}>ID</Table.Th>
                    <Table.Th>Typ</Table.Th>
                    <Table.Th ta="right">Stärke</Table.Th>
                    <Table.Th ta="right">Breite</Table.Th>
                    <Table.Th ta="right" style={{ whiteSpace: "nowrap" }}>Preis (€/m³)</Table.Th>
                    <Table.Th w={90}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {holzbalken?.map((b) => (
                    <Table.Tr key={b.id}>
                      <Table.Td c="dimmed">{b.id}</Table.Td>
                      <Table.Td fw={600}>{b.typ}</Table.Td>
                      <Table.Td ta="right">{b.staerke} mm</Table.Td>
                      <Table.Td ta="right">{b.breite} mm</Table.Td>
                      <Table.Td
                        ta="right"
                        style={{
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatEuro(b.preisProKubikmeter)}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={2} wrap="nowrap" justify="flex-end">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            aria-label="Bearbeiten"
                            onClick={() =>
                              setBalkenForm({
                                id: b.id,
                                typ: b.typ,
                                staerke: b.staerke,
                                breite: b.breite,
                                preisProKubikmeter: b.preisProKubikmeter,
                              })
                            }
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            aria-label="Löschen"
                            loading={deleteBalkenMutation.isPending}
                            onClick={() =>
                              deleteBalkenMutation.mutate({ id: b.id })
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Group>
        </Tabs.Panel>
        <Tabs.Panel value="riegel" pt="md">
          <Group align="flex-start" wrap="wrap" gap="lg">
            <Card withBorder shadow="sm" w={340} p="md">
              <Stack gap="sm">
                <Title order={4}>
                  {riegelForm.id ? "Riegel bearbeiten" : "Riegel hinzufügen"}
                </Title>
                <Text size="xs" c="dimmed">
                  Bretter für Riegel – Abrechnung wie bei den Balken pro
                  Kubikmeter.
                </Text>
                <TextInput
                  label="Typ"
                  value={riegelForm.typ}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setRiegelForm((f) => ({ ...f, typ: value }));
                  }}
                />
                <NumberInput
                  label="Stärke (mm)"
                  value={
                    riegelForm.staerke ? Number(riegelForm.staerke) : undefined
                  }
                  onChange={(v) => setRiegelForm((f) => ({ ...f, staerke: v }))}
                />
                <NumberInput
                  label="Breite (mm)"
                  value={
                    riegelForm.breite ? Number(riegelForm.breite) : undefined
                  }
                  onChange={(v) => setRiegelForm((f) => ({ ...f, breite: v }))}
                />
                <NumberInput
                  label="Preis (€/m³)"
                  value={
                    riegelForm.preisProKubikmeter
                      ? Number(riegelForm.preisProKubikmeter)
                      : undefined
                  }
                  onChange={(v) =>
                    setRiegelForm((f) => ({ ...f, preisProKubikmeter: v }))
                  }
                />
                <Group>
                  <Button
                    size="sm"
                    loading={upsertRiegelMutation.isPending}
                    onClick={submitRiegel}
                    disabled={
                      !riegelForm.typ ||
                      !riegelForm.staerke ||
                      !riegelForm.breite
                    }
                  >
                    Speichern
                  </Button>
                  {riegelForm.id && (
                    <Button
                      size="sm"
                      variant="light"
                      color="gray"
                      onClick={resetRiegel}
                    >
                      Abbrechen
                    </Button>
                  )}
                </Group>
              </Stack>
            </Card>
            <Stack flex={1}>
              <Title order={4}>Riegel Übersicht</Title>
              <Table highlightOnHover withTableBorder verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={60}>ID</Table.Th>
                    <Table.Th>Typ</Table.Th>
                    <Table.Th ta="right">Stärke</Table.Th>
                    <Table.Th ta="right">Breite</Table.Th>
                    <Table.Th ta="right" style={{ whiteSpace: "nowrap" }}>Preis (€/m³)</Table.Th>
                    <Table.Th w={90}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {holzriegel?.map((r) => (
                    <Table.Tr key={r.id}>
                      <Table.Td c="dimmed">{r.id}</Table.Td>
                      <Table.Td fw={600}>{r.typ}</Table.Td>
                      <Table.Td ta="right">{r.staerke} mm</Table.Td>
                      <Table.Td ta="right">{r.breite} mm</Table.Td>
                      <Table.Td
                        ta="right"
                        style={{
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatEuro(r.preisProKubikmeter)}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={2} wrap="nowrap" justify="flex-end">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            aria-label="Bearbeiten"
                            onClick={() =>
                              setRiegelForm({
                                id: r.id,
                                typ: r.typ,
                                staerke: r.staerke,
                                breite: r.breite,
                                preisProKubikmeter: r.preisProKubikmeter,
                              })
                            }
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            aria-label="Löschen"
                            loading={deleteRiegelMutation.isPending}
                            onClick={() =>
                              deleteRiegelMutation.mutate({ id: r.id })
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Group>
        </Tabs.Panel>
      </Tabs>
      {/* Debug-JSON entfernt */}
    </Stack>
  );
}
