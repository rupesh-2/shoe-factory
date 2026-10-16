import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";
import { Card, PageHeader, Table, Th, Td, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const typeColor: Record<string, "green" | "red" | "blue"> = {
  IN: "green",
  OUT: "red",
  ADJUST: "blue",
};

export default async function StockHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const where =
    kind === "products"
      ? { productId: { not: null } }
      : kind === "materials"
      ? { rawMaterialId: { not: null } }
      : {};

  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { product: true, rawMaterial: true },
    take: 300,
  });

  const tabs = [
    { key: undefined, label: "All" },
    { key: "products", label: "Finished goods" },
    { key: "materials", label: "Raw materials" },
  ];

  return (
    <div>
      <PageHeader
        title="Stock history"
        subtitle="Every stock movement — production, purchases, shipments and manual adjustments."
        action={
          <Link href="/inventory" className="text-sm text-slate-500 hover:text-slate-900">
            ← Inventory
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/inventory/history?kind=${t.key}` : "/inventory/history"}
            className={`rounded-full px-3 py-1 text-sm ${
              kind === t.key
                ? "bg-primary text-white"
                : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        {movements.length === 0 ? (
          <EmptyState message="No stock movements yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Item</Th>
                <Th>Type</Th>
                <Th className="text-right">Change</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <Td className="text-slate-500 whitespace-nowrap">
                    {date(m.createdAt)}{" "}
                    <span className="text-xs text-slate-500">
                      {m.createdAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </Td>
                  <Td>
                    {m.product ? (
                      <>
                        <span className="font-medium">{m.product.name}</span>{" "}
                        <span className="text-xs text-slate-500 font-mono">{m.product.sku}</span>
                      </>
                    ) : (
                      <span className="font-medium">{m.rawMaterial?.name ?? "—"}</span>
                    )}
                  </Td>
                  <Td>
                    <Badge color={typeColor[m.type] ?? "gray"}>{m.type}</Badge>
                  </Td>
                  <Td
                    className={`text-right font-medium ${
                      m.quantity >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {m.quantity > 0 ? "+" : ""}
                    {+m.quantity.toFixed(2)}
                    {m.rawMaterial && (
                      <span className="text-slate-500 font-normal"> {m.rawMaterial.unit}</span>
                    )}
                  </Td>
                  <Td className="text-slate-500">{m.reason ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
