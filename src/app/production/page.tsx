import Link from "next/link";
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
  Field,
  Input,
  Select,
  StatCard,
  AddDetails,
  Alert,
  EmptyState,
} from "@/components/ui";
import {
  addBatch,
  startBatch,
  completeBatch,
  cancelBatch,
  saveBomItem,
  removeBomItem,
} from "./actions";

export const dynamic = "force-dynamic";

const statusColor: Record<string, "gray" | "blue" | "amber" | "green" | "red"> = {
  Planned: "blue",
  "In Progress": "amber",
  Completed: "green",
  Cancelled: "gray",
};

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { start } = monthRange(parseMonth());

  const [products, materials, batches, openOrders] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      include: { bom: { include: { rawMaterial: true } } },
    }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
    prisma.productionBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true, order: true },
      take: 100,
    }),
    prisma.order.findMany({
      where: { status: { in: ["Draft", "Confirmed", "In Production"] } },
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
  ]);

  const bomByProduct = new Map(products.map((p) => [p.id, p.bom]));
  const active = batches.filter(
    (b) => b.status === "Planned" || b.status === "In Progress"
  );
  const finished = batches.filter((b) => !active.includes(b)).slice(0, 20);

  const planned = active.filter((b) => b.status === "Planned");
  const inProgress = active.filter((b) => b.status === "In Progress");
  const doneThisMonth = batches.filter(
    (b) => b.status === "Completed" && b.completedAt && b.completedAt >= start
  );
  const costThisMonth = batches
    .filter((b) => b.startedAt && b.startedAt >= start && b.status !== "Cancelled")
    .reduce((s, b) => s + b.materialCost, 0);

  /** For a planned batch: which materials are short right now. */
  function shortages(productId: string, qty: number) {
    const bom = bomByProduct.get(productId) ?? [];
    return bom.filter((b) => b.rawMaterial.quantity < b.quantity * qty);
  }

  return (
    <div>
      <PageHeader
        title="Production"
        subtitle="Bills of materials and production batches — materials in, finished pairs out."
      />

      {error && (
        <Alert>
          {error}{" "}
          <Link href="/production" className="underline ml-1">
            Dismiss
          </Link>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Planned batches"
          value={num(planned.length)}
          hint={`${num(planned.reduce((s, b) => s + b.quantity, 0))} pairs`}
          tone="blue"
        />
        <StatCard
          label="In progress"
          value={num(inProgress.length)}
          hint={`${num(inProgress.reduce((s, b) => s + b.quantity, 0))} pairs on the floor`}
          tone="amber"
        />
        <StatCard
          label="Pairs made this month"
          value={num(doneThisMonth.reduce((s, b) => s + b.quantity, 0))}
          tone="green"
        />
        <StatCard label="Material used this month" value={money(costThisMonth)} />
      </div>

      {/* ---------- Batches ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Production batches</h2>
        <AddDetails summary="New batch">
          <Card className="p-5">
            <form action={addBatch} className="grid sm:grid-cols-4 gap-4">
              <Field label="Product">
                <Select name="productId" required defaultValue="">
                  <option value="" disabled>
                    Select product…
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.color} {p.size}) · {p.sku}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Pairs">
                <Input name="quantity" type="number" min={1} required defaultValue={10} />
              </Field>
              <Field label="For order (optional)">
                <Select name="orderId" defaultValue="">
                  <option value="">— stock —</option>
                  {openOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.number} · {o.customer.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Notes">
                <Input name="notes" placeholder="Optional" />
              </Field>
              <div className="sm:col-span-4">
                <Button>Plan batch</Button>
              </div>
            </form>
          </Card>
        </AddDetails>
      </div>

      <Card className="mb-10">
        {batches.length === 0 ? (
          <EmptyState message="No production batches yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Batch</Th>
                <Th>Product</Th>
                <Th className="text-right">Pairs</Th>
                <Th>For order</Th>
                <Th>Materials</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {[...active, ...finished].map((b) => {
                const short = b.status === "Planned" ? shortages(b.productId, b.quantity) : [];
                const noBom = (bomByProduct.get(b.productId) ?? []).length === 0;
                return (
                  <tr key={b.id} className={active.includes(b) ? "" : "opacity-60"}>
                    <Td className="font-medium whitespace-nowrap">
                      {b.number}
                      <div className="text-xs text-slate-500 font-normal">
                        {date(b.createdAt)}
                      </div>
                    </Td>
                    <Td>
                      <div className="font-medium">{b.product.name}</div>
                      <div className="text-xs text-slate-500">
                        {[b.product.color, b.product.size].filter(Boolean).join(" · ")}
                      </div>
                    </Td>
                    <Td className="text-right font-medium">{b.quantity}</Td>
                    <Td>
                      {b.order ? (
                        <Link href={`/orders/${b.order.id}`} className="font-medium text-primary hover:underline">
                          {b.order.number}
                        </Link>
                      ) : (
                        <span className="text-slate-500">Stock</span>
                      )}
                    </Td>
                    <Td>
                      {b.status === "Planned" ? (
                        noBom ? (
                          <Badge color="amber">No BOM</Badge>
                        ) : short.length ? (
                          <span title={short.map((s) => s.rawMaterial.name).join(", ")}>
                            <Badge color="red">Short: {short.length}</Badge>
                          </span>
                        ) : (
                          <Badge color="green">Available</Badge>
                        )
                      ) : b.materialCost > 0 ? (
                        <span className="text-slate-500">{money(b.materialCost)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge color={statusColor[b.status] ?? "gray"}>{b.status}</Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {b.status === "Planned" && (
                          <form action={startBatch}>
                            <input type="hidden" name="batchId" value={b.id} />
                            <Button variant="secondary">Start</Button>
                          </form>
                        )}
                        {b.status === "In Progress" && (
                          <form action={completeBatch}>
                            <input type="hidden" name="batchId" value={b.id} />
                            <Button>Complete</Button>
                          </form>
                        )}
                        {active.includes(b) && (
                          <form action={cancelBatch}>
                            <input type="hidden" name="batchId" value={b.id} />
                            <button
                              type="submit"
                              className="text-xs text-slate-500 hover:text-red-600"
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* ---------- Bill of materials ---------- */}
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Bill of materials</h2>
        <p className="text-sm text-slate-500">
          Materials needed to make one pair. Starting a batch deducts these × pairs from raw
          material stock.
        </p>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Materials per pair</Th>
              <Th className="text-right">Material cost / pair</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">Margin</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const unitCost = p.bom.reduce(
                (s, b) => s + b.quantity * b.rawMaterial.unitCost,
                0
              );
              const margin = p.price > 0 ? ((p.price - unitCost) / p.price) * 100 : 0;
              return (
                <tr key={p.id} className="align-top">
                  <Td>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.sku}</div>
                  </Td>
                  <Td>
                    <div className="space-y-1">
                      {p.bom.map((b) => (
                        <div key={b.id} className="flex items-center gap-2 text-sm">
                          <span>
                            {b.rawMaterial.name}{" "}
                            <span className="text-slate-500">
                              {b.quantity} {b.rawMaterial.unit}
                            </span>
                          </span>
                          <form action={removeBomItem}>
                            <input type="hidden" name="id" value={b.id} />
                            <button
                              type="submit"
                              className="inline-flex min-h-11 min-w-11 sm:min-h-7 sm:min-w-7 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Remove ${b.rawMaterial.name}`}
                            >
                              ×
                            </button>
                          </form>
                        </div>
                      ))}
                      {p.bom.length === 0 && (
                        <p className="text-xs text-amber-600">No materials yet</p>
                      )}
                      <form action={saveBomItem} className="flex flex-wrap items-center gap-2 pt-1">
                        <input type="hidden" name="productId" value={p.id} />
                        <Select name="rawMaterialId" required defaultValue="" className="w-full sm:w-44">
                          <option value="" disabled>
                            Material…
                          </option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </Select>
                        <Input
                          name="quantity"
                          type="number"
                          step="0.01"
                          min={0.01}
                          required
                          placeholder="Qty"
                          className="w-20"
                        />
                        <Button variant="secondary">Save</Button>
                      </form>
                    </div>
                  </Td>
                  <Td className="text-right">{p.bom.length ? money(unitCost) : "—"}</Td>
                  <Td className="text-right">{money(p.price)}</Td>
                  <Td className="text-right">
                    {p.bom.length ? (
                      <Badge color={margin >= 30 ? "green" : margin >= 10 ? "amber" : "red"}>
                        {margin.toFixed(0)}%
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
