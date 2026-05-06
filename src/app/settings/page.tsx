"use client";
import { useState } from "react";
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
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { IconTrash, IconEdit, IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

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

  const [local, setLocal] = useState({
    materialCostFactor: settings?.materialCostFactor
      ? Number(settings.materialCostFactor)
      : 1,
    generalMarkup: settings?.generalMarkup
      ? Number(settings.generalMarkup)
      : 0.3,
    additionalMarkup1: settings?.additionalMarkup1
      ? Number(settings.additionalMarkup1)
      : 0.1111,
    additionalMarkup2: settings?.additionalMarkup2
      ? Number(settings.additionalMarkup2)
      : 0.0204,
    hourlyRate: settings?.hourlyRate ? Number(settings.hourlyRate) : 50,
    workHours: settings?.workHours ? Number(settings.workHours) : 4,
    factorA: (settings as any)?.factorA
      ? Number((settings as any).factorA)
      : 100 / 90,
    factorB: (settings as any)?.factorB
      ? Number((settings as any).factorB)
      : 100 / 70,
    factorC: (settings as any)?.factorC
      ? Number((settings as any).factorC)
      : 100 / 90,
    factorD: (settings as any)?.factorD
      ? Number((settings as any).factorD)
      : 100 / 98,
    generalMarkupEuro: (settings as any)?.generalMarkupEuro
      ? Number((settings as any).generalMarkupEuro)
      : 0,
  });

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
        title: "Ungültige Dicke",
        message: "Bitte eine positive Dicke eingeben.",
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
        message: `Die Dicke ${rounded} mm ist bereits hinterlegt.`,
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

  return (
    <Stack p="md" gap="md">
      <Title order={2}>Einstellungen & Materialien</Title>
      <Tabs defaultValue="preise">
        <Tabs.List>
          <Tabs.Tab value="preise">Preise</Tabs.Tab>
          <Tabs.Tab value="holzplatten">Holzplatten</Tabs.Tab>
          <Tabs.Tab value="holzbalken">Holzbalken</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="preise" pt="md">
          <Card withBorder shadow="sm" p="md">
            <Stack gap="md">
              <Group grow>
                <NumberInput
                  label="Materialkostenfaktor"
                  value={local.materialCostFactor}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, materialCostFactor: Number(v) }))
                  }
                />
                <NumberInput
                  label="Allgemeiner Aufschlag (Anteil)"
                  value={local.generalMarkup}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, generalMarkup: Number(v) }))
                  }
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Zusatzaufschlag 1 (Anteil)"
                  value={local.additionalMarkup1}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, additionalMarkup1: Number(v) }))
                  }
                />
                <NumberInput
                  label="Zusatzaufschlag 2 (Anteil)"
                  value={local.additionalMarkup2}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, additionalMarkup2: Number(v) }))
                  }
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Faktor A (100/90)"
                  value={local.factorA}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, factorA: Number(v) }))
                  }
                />
                <NumberInput
                  label="Faktor B (100/70)"
                  value={local.factorB}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, factorB: Number(v) }))
                  }
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Faktor C (100/90)"
                  value={local.factorC}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, factorC: Number(v) }))
                  }
                />
                <NumberInput
                  label="Faktor D (100/98)"
                  value={local.factorD}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, factorD: Number(v) }))
                  }
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Stundensatz (€)"
                  value={local.hourlyRate}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, hourlyRate: Number(v) }))
                  }
                />
                <NumberInput
                  label="Arbeitsstunden"
                  value={local.workHours}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, workHours: Number(v) }))
                  }
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Pauschalaufschlag (€)"
                  value={local.generalMarkupEuro}
                  onChange={(v) =>
                    setLocal((f) => ({ ...f, generalMarkupEuro: Number(v) }))
                  }
                />
              </Group>
              <Button loading={updateMutation.isPending} onClick={save}>
                Speichern
              </Button>
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
                  label="Vollholz (Preis in EUR/cm3)"
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
                    label="Neue Dicke (mm)"
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
                      platteForm.isVollholz ? "Preis EUR/cm3" : "Preis EUR/m2"
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
                        <Table.Th style={{ width: "40%" }}>Dicke (mm)</Table.Th>
                        <Table.Th style={{ width: "40%" }}>
                          {platteForm.isVollholz
                            ? "Preis EUR/cm3"
                            : "Preis EUR/m2"}
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
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Typ</Table.Th>
                    <Table.Th>Einheit</Table.Th>
                    <Table.Th>Breite (mm)</Table.Th>
                    <Table.Th>Dicken & Preise</Table.Th>
                    <Table.Th></Table.Th>
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
                      <Table.Td>{p.id}</Table.Td>
                      <Table.Td>{p.typ}</Table.Td>
                      <Table.Td>{p.isVollholz ? "EUR/cm3" : "EUR/m2"}</Table.Td>
                      <Table.Td>{p.breite ?? "-"}</Table.Td>
                      <Table.Td>
                        {p.dicken?.length ? (
                          <Group gap={4} wrap="wrap">
                            {p.dicken.map((variante) => (
                              <Badge
                                key={`${p.id}-${variante.id}`}
                                variant="light"
                              >
                                {variante.dicke} mm /{" "}
                                {Number(variante.preis).toFixed(4)}{" "}
                                {p.isVollholz ? "EUR/cm3" : "EUR/m2"}
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
                        <Group gap={4}>
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
                  label="Preis €/m³"
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
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Typ</Table.Th>
                    <Table.Th>Stärke</Table.Th>
                    <Table.Th>Breite</Table.Th>
                    <Table.Th>Preis €/m³</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {holzbalken?.map((b) => (
                    <Table.Tr key={b.id}>
                      <Table.Td>{b.id}</Table.Td>
                      <Table.Td>{b.typ}</Table.Td>
                      <Table.Td>{b.staerke}</Table.Td>
                      <Table.Td>{b.breite}</Table.Td>
                      <Table.Td>
                        {Number(b.preisProKubikmeter).toFixed(2)}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
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
      </Tabs>
      {/* Debug-JSON entfernt */}
    </Stack>
  );
}
