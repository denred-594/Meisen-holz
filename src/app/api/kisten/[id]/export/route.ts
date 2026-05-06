import { NextRequest } from "next/server";
import { buildKistenSpecWorkbook } from "@/server/services/excel.service";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return new Response("Ungültige ID", { status: 400 });
  }
  try {
    const buf = await buildKistenSpecWorkbook(id);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `Kistenspezifikation_${id}_${date}.xlsx`;
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return new Response(`Export fehlgeschlagen: ${e?.message ?? e}`, {
      status: 500,
    });
  }
}
