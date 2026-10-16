import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, date } from "@/lib/format";
import { Card, PageHeader, Table, Th, Td, Badge, Button, Alert } from "@/components/ui";
import { advanceStatus } from "../actions";
import { planForOrder } from "../../production/actions";
import { PIPELINE, nextStatus } from "../pipeline";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      lines: { include: { product: true } },
      invoice: { include: { payments: true } },
      batches: { include: { product: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const total = order.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const currentIndex = (PIPELINE as readonly string[]).indexOf(order.status);
  const next = nextStatus(order.status);

  // Pairs still to find: ordered − in stock − already being made for this order
  const openBatches = order.batches.filter(
    (b) => b.status === "Planned" || b.status === "In Progress"
  );
  const shortfall = order.lines.some((l) => {
    const planned = openBatches
      .filter((b) => b.productId === l.productId)
      .reduce((s, b) => s + b.quantity, 0);
    return l.quantity > Math.max(0, l.product.quantity) + planned;
  });
  const canPlan = ["Draft", "Confirmed", "In Production"].includes(order.status);

  return (
    <div>
      <PageHeader
        title={`Order ${order.number}`}
        subtitle={`${order.customer.name} · ${date(order.createdAt)}`}
        action={
          <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-900">
            ← All orders
          </Link>
        }
      />

      {error && (
        <Alert>
          {error}{" "}
          <Link href={`/orders/${order.id}`} className="underline ml-1">
            Dismiss
          </Link>
        </Alert>
      )}

      {/* Pipeline */}
      <Card className="p-5 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {PIPELINE.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    active
                      ? "bg-primary text-white"
                      : done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {done ? "✓ " : ""}
                  {step}
                </div>
                {i < PIPELINE.length - 1 && (
                  <span className="text-slate-400">→</span>
                )}
              </div>
            );
          })}
        </div>
        {next && (
          <form action={advanceStatus} className="mt-4">
            <input type="hidden" name="orderId" value={order.id} />
            <Button>
              Advance to “{next}”
              {next === "Confirmed" && " (creates invoice)"}
              {next === "Shipped" && " (deducts stock)"}
            </Button>
          </form>
        )}
        {!next && (
          <p className="mt-4 text-sm text-emerald-600 font-medium">
            ✓ Order complete.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold">Line items</h2>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">In stock</Th>
                <Th className="text-right">Unit price</Th>
                <Th className="text-right">Subtotal</Th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.id}>
                  <Td>
                    <div className="font-medium">{l.product.name}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {l.product.sku}
                    </div>
                  </Td>
                  <Td className="text-right">{l.quantity}</Td>
                  <Td
                    className={`text-right ${
                      l.product.quantity < l.quantity ? "text-red-600" : "text-slate-500"
                    }`}
                  >
                    {l.product.quantity}
                  </Td>
                  <Td className="text-right">{money(l.unitPrice)}</Td>
                  <Td className="text-right font-medium">
                    {money(l.quantity * l.unitPrice)}
                  </Td>
                </tr>
              ))}
              <tr>
                <Td className="font-semibold" />
                <Td />
                <Td />
                <Td className="text-right font-semibold">Total</Td>
                <Td className="text-right font-semibold">{money(total)}</Td>
              </tr>
            </tbody>
          </Table>
          <div className="px-5 py-4 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Production</h3>
              {canPlan && shortfall && (
                <form action={planForOrder}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <Button variant="secondary">Plan production for shortfall</Button>
                </form>
              )}
            </div>
            {order.batches.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">
                {shortfall
                  ? "Not enough finished stock — plan batches to make the missing pairs."
                  : "Enough finished stock to fulfil this order."}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {order.batches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="font-medium">{b.number}</span> · {b.product.name} ×{" "}
                      {b.quantity}
                    </span>
                    <Badge
                      color={
                        b.status === "Completed"
                          ? "green"
                          : b.status === "In Progress"
                          ? "amber"
                          : b.status === "Planned"
                          ? "blue"
                          : "gray"
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>
                ))}
                <Link href="/production" className="text-sm font-medium text-primary hover:underline">
                  Go to production →
                </Link>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Customer</h2>
            <p className="font-medium">{order.customer.name}</p>
            {order.customer.company && (
              <p className="text-sm text-slate-500">{order.customer.company}</p>
            )}
            {order.customer.phone && (
              <p className="text-sm text-slate-500">{order.customer.phone}</p>
            )}
            {order.customer.email && (
              <p className="text-sm text-slate-500">{order.customer.email}</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">Invoice</h2>
            {order.invoice ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Number</span>
                  <span className="font-medium">{order.invoice.number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span>{money(order.invoice.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status</span>
                  <Badge
                    color={
                      order.invoice.status === "Paid"
                        ? "green"
                        : order.invoice.status === "Partial"
                        ? "amber"
                        : "red"
                    }
                  >
                    {order.invoice.status}
                  </Badge>
                </div>
                <div className="pt-2 flex gap-4">
                  <Link
                    href={`/finance/invoices/${order.invoice.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View / print
                  </Link>
                  <Link
                    href="/finance"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Record payment →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No invoice yet — created when the order is confirmed.
              </p>
            )}
          </Card>

          {order.notes && (
            <Card className="p-5">
              <h2 className="font-semibold mb-2">Notes</h2>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
