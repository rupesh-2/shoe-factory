import { prisma } from "@/lib/prisma";
import { money, num, date } from "@/lib/format";
import { monthRange, parseMonth } from "@/lib/dates";
import {
  Card,
  PageHeader,
  Table,
  Th,
  Td,
  Badge,
  Button,
  StatCard,
  EmptyState,
} from "@/components/ui";
import { PurchaseForm } from "./PurchaseForm";
import {
  createReorderPO,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "./actions";

export const dynamic = "force-dynamic";

const statusColor: Record<string, "blue" | "green" | "gray"> = {
  Ordered: "blue",
  Received: "green",
  Cancelled: "gray",
};

export default async function PurchasingPage() {
  const { start } = monthRange(parseMonth());
  const [purchaseOrders, materials, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { supplier: true, lines: { include: { rawMaterial: true } } },
    }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" }, include: { supplier: true } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  const poTotal = (po: (typeof purchaseOrders)[number]) =>
    po.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const open = purchaseOrders.filter((po) => po.status === "Ordered");
  const receivedThisMonth = purchaseOrders.filter(
    (po) => po.status === "Received" && po.receivedAt && po.receivedAt >= start
  );

  // Material ids already on an open PO — don't nag about those
  const onOrder = new Set(open.flatMap((po) => po.lines.map((l) => l.rawMaterialId)));
  const low = materials.filter((m) => m.quantity <= m.reorderLevel);
  const lowBySupplier = new Map<string, typeof low>();
  for (const m of low) {
    const key = m.supplierId ?? "";
    lowBySupplier.set(key, [...(lowBySupplier.get(key) ?? []), m]);
  }

  return (
    <div>
      <PageHeader
        title="Purchasing"
        subtitle="Purchase orders to suppliers. Receiving a PO adds stock and books the expense."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open POs" value={num(open.length)} tone="blue" />
        <StatCard
          label="Value on order"
          value={money(open.reduce((s, po) => s + poTotal(po), 0))}
          tone="blue"
        />
        <StatCard
          label="Received this month"
          value={money(receivedThisMonth.reduce((s, po) => s + poTotal(po), 0))}
          tone="green"
        />
        <StatCard
          label="Materials to reorder"
          value={num(low.length)}
          tone={low.length ? "red" : "green"}
        />
      </div>

      {/* ---------- Reorder suggestions ---------- */}
      {low.length > 0 && (
        <Card className="mb-8">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold">Reorder suggestions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Materials at or below their reorder level. Suggested quantity brings stock to 2×
              the reorder level.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {[...lowBySupplier.entries()].map(([supplierId, items]) => {
              const supplier = suppliers.find((s) => s.id === supplierId);
              return (
                <div
                  key={supplierId || "none"}
                  className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{supplier?.name ?? "No supplier set"}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {items.map((m) => (
                        <span key={m.id} className="text-sm text-slate-600">
                          {m.name}{" "}
                          <span className="text-slate-500">
                            ({m.quantity} / {m.reorderLevel} {m.unit})
                          </span>
                          {onOrder.has(m.id) && (
                            <span className="ml-1">
                              <Badge color="blue">on order</Badge>
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  {supplier ? (
                    <form action={createReorderPO}>
                      <input type="hidden" name="supplierId" value={supplier.id} />
                      <Button variant="secondary">Draft reorder PO</Button>
                    </form>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Assign a supplier in Inventory to reorder
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card>
            {purchaseOrders.length === 0 ? (
              <EmptyState message="No purchase orders yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>PO</Th>
                    <Th>Supplier</Th>
                    <Th>Items</Th>
                    <Th className="text-right">Total</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="align-top">
                      <Td className="font-medium whitespace-nowrap">
                        {po.number}
                        <div className="text-xs text-slate-500 font-normal">
                          {date(po.createdAt)}
                        </div>
                      </Td>
                      <Td>{po.supplier.name}</Td>
                      <Td className="text-slate-600">
                        {po.lines.map((l) => (
                          <div key={l.id} className="text-xs">
                            {l.rawMaterial.name} · {l.quantity} {l.rawMaterial.unit} @{" "}
                            {money(l.unitCost)}
                          </div>
                        ))}
                      </Td>
                      <Td className="text-right font-medium">{money(poTotal(po))}</Td>
                      <Td>
                        <Badge color={statusColor[po.status] ?? "gray"}>{po.status}</Badge>
                        {po.receivedAt && (
                          <div className="text-xs text-slate-500 mt-1">
                            {date(po.receivedAt)}
                          </div>
                        )}
                      </Td>
                      <Td>
                        {po.status === "Ordered" ? (
                          <div className="flex items-center gap-2">
                            <form action={receivePurchaseOrder}>
                              <input type="hidden" name="poId" value={po.id} />
                              <Button>Receive</Button>
                            </form>
                            <form action={cancelPurchaseOrder}>
                              <input type="hidden" name="poId" value={po.id} />
                              <button
                                type="submit"
                                className="text-xs text-slate-500 hover:text-red-600"
                              >
                                Cancel
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <Card className="p-5 h-fit">
          <h2 className="font-semibold mb-4">New purchase order</h2>
          <PurchaseForm
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            materials={materials.map((m) => ({
              id: m.id,
              name: m.name,
              unit: m.unit,
              unitCost: m.unitCost,
              supplierId: m.supplierId,
            }))}
          />
        </Card>
      </div>
    </div>
  );
}
