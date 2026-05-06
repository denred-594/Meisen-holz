"use client";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Text, Table, Stack, JsonInput } from "@mantine/core";
import { Kiste } from "@/server/domain/kiste";
import { useEffect, useState } from "react";
import { calculateFinalPrice } from "@/utils/pricing";

export default function Test() {
  const trpc = useTRPC();
  const { data: kistenDaten } = useQuery(
    trpc.kisten.getByIdWithRelations.queryOptions({ id: 2 })
  );
  const { data: pricingFactors } = useQuery(trpc.settings.get.queryOptions());
  const [kiste, setkiste] = useState<Kiste>();
  useEffect(() => {
    if (!kistenDaten) return;
    setkiste(Kiste.fromRow(kistenDaten));
  }, [kistenDaten]);

  return (
    <Stack>
      <Text>Materialkosten: {kiste?.materialCost}</Text>
      <Text>
        Gesamtkosten:{" "}
        {calculateFinalPrice(kiste?.materialCost || 0, pricingFactors).final}
      </Text>
      <Table>
        Table
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Typ</Table.Th>
            <Table.Th>Anzahl</Table.Th>
            <Table.Th>Maße (LxBxD)</Table.Th>
            <Table.Th>Material</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {kiste?.components.map((component) => (
            <Table.Tr>
              <Table.Td>{component.name}</Table.Td>
              <Table.Td>{component.amount}x</Table.Td>
              <Table.Td>{Object.values(component.masse).join("x")}</Table.Td>
              <Table.Td>
                {component.type == "Brett"
                  ? kiste.holzBrett?.typ
                  : component.name == "Balken Längs"
                  ? kiste.holzBalkenLaengs?.typ
                  : kiste.holzBalkenQuer?.typ}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <JsonInput
        value={JSON.stringify(kiste?.snapshot, null, 2)}
        h={400}
        rows={16}
      />
    </Stack>
  );
}
