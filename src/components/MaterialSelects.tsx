"use client";
import { ReactNode, useMemo } from "react";
import { Select } from "@mantine/core";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";

interface BalkenSelectProps {
  value?: number;
  onChange: (
    id: number | undefined,
    meta?: { staerke: number; breite: number }
  ) => void;
  label?: string;
  error?: ReactNode;
}

export function BalkenSelect({
  value,
  onChange,
  error,
  label = "Holzbalken",
}: BalkenSelectProps) {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.material.holzbalken.queryOptions());
  const options = useMemo(
    () =>
      (data ?? []).map((b) => ({
        value: String(b.id),
        label: `${b.typ} (${b.staerke}x${b.breite} mm)`,
      })),
    [data]
  );
  return (
    <Select
      label={label}
      placeholder="Balken wählen"
      data={options}
      value={value ? String(value) : null}
      onChange={(v) => {
        const obj = (data ?? []).find((x) => String(x.id) === v);
        onChange(
          obj ? obj.id : undefined,
          obj ? { staerke: obj.staerke, breite: obj.breite } : undefined
        );
      }}
      error={error}
      searchable
      nothingFoundMessage="Keine Einträge"
    />
  );
}

interface PlatteSelectProps {
  value?: number;
  onChange: (id: number | undefined, meta?: { dicken: number[] }) => void;
  error?: ReactNode;
  label?: string;
}

export function PlatteSelect({
  value,
  onChange,
  error,
  label = "Holzplatte",
}: PlatteSelectProps) {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.material.holzplatten.queryOptions());
  const options = useMemo(
    () =>
      (data ?? []).map((p) => ({
        value: String(p.id),
        label: `${p.typ}${p.isVollholz ? " (Vollholz)" : ""} (${p.dicke.join(", ")} mm)`,
      })),
    [data]
  );

  return (
    <Select
      label={label}
      placeholder="Platte wählen"
      data={options}
      error={error}
      value={value ? String(value) : null}
      onChange={(v) => {
        const obj = (data ?? []).find((x) => String(x.id) === v);
        onChange(
          obj ? obj.id : undefined,
          obj ? { dicken: obj.dicke } : undefined
        );
      }}
      searchable
      nothingFoundMessage="Keine Einträge"
    />
  );
}

interface DickeSelectProps {
  value?: number;
  onChange: (d: number | undefined) => void;
  dicken: number[];
  label?: string;
}

export function DickeSelect({
  value,
  dicken,
  onChange,
  label = "Dicke",
}: DickeSelectProps) {
  const data = dicken.map((d) => ({ value: String(d), label: `${d} mm` }));
  return (
    <Select
      label={label}
      placeholder={data.length ? "Dicke wählen" : "Keine Dicken hinterlegt"}
      data={data}
      value={value ? String(value) : null}
      onChange={(v) => onChange(v ? Number(v) : undefined)}
      disabled={!data.length}
      nothingFoundMessage="Keine Einträge"
    />
  );
}
