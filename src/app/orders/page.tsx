import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, date } from "@/lib/format";
import {
  Card,
  PageHeader,
  Table,
  Th,
  Td,
  Badge,
  SearchBar,
  FilterTabs,
  EmptyState,
} from "@/components/ui";
import { PIPELINE } from "./pipeline";
import { OrderForm } from "./OrderForm";

export const dynamic = "force-dynamic";

const statusColor: Record<string, "gray" | "blue" | "amber" | "green" | "purple"> = {
  Draft: "gray",
  Confirmed: "blue",
  "In Production": "amber",
  Shipped: "purple",
  Delivered: "green",
  Closed: "gray",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const [orders, products, customers] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true, lines: true, invoice: true },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const isOpen = (s: string) => s !== "Delivered" && s !== "Closed";
  const term = q?.trim().toLowerCase();
  const shown = orders.filter(
    (o) =>
      (!status || (status === "open" ? isOpen(o.status) : o.status === status)) &&
      (!term ||
        o.number.toLowerCase().includes(term) ||
        o.customer.name.toLowerCase().includes(term))
  );
  const href = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/orders?${qs}` : "/orders";
  };
  const tabs = [
    { label: "All", href: href(), key: undefined, count: orders.length },
    { label: "Open", href: href("open"), key: "open", count: orders.filter((o) => isOpen(o.status)).length },
    ...PIPELINE.map((s) => ({
      label: s,
      href: href(s),
      key: s as string,
      count: orders.filter((o) => o.status === s).length,
    })).filter((t) => t.count > 0),
  ];

  return (
    <div>
      <PageHeader title="Orders" subtitle="Create orders and move them through the pipeline." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <FilterTabs tabs={tabs} active={status} />
            <SearchBar placeholder="Search order or customer" defaultValue={q} keep={{ status }} />
          </div>
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Status</Th>
                  <Th>Invoice</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => {
                  const total = o.lines.reduce(
                    (s, l) => s + l.quantity * l.unitPrice,
                    0
                  );
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <Td className="whitespace-nowrap">
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {o.number}
                        </Link>
                      </Td>
                      <Td>{o.customer.name}</Td>
                      <Td className="text-slate-500 whitespace-nowrap">{date(o.createdAt)}</Td>
                      <Td className="text-right font-medium whitespace-nowrap">{money(total)}</Td>
                      <Td>
                        <Badge color={statusColor[o.status] ?? "gray"}>
                          {o.status}
                        </Badge>
                      </Td>
                      <Td>
                        {o.invoice ? (
                          <Badge
                            color={
                              o.invoice.status === "Paid"
                                ? "green"
                                : o.invoice.status === "Partial"
                                ? "amber"
                                : "red"
                            }
                          >
                            {o.invoice.status}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {shown.length === 0 && <EmptyState message="No orders match this filter." />}
          </Card>
        </div>

        <div>
          <Card className="p-5">
            <h2 className="font-semibold mb-4">New order</h2>
            {products.length === 0 || customers.length === 0 ? (
              <p className="text-sm text-slate-500">
                Add at least one product and one customer first.
              </p>
            ) : (
              <OrderForm products={products} customers={customers} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
