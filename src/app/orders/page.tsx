import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, date } from "@/lib/format";
import { Card, PageHeader, Table, Th, Td, Badge } from "@/components/ui";
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

export default async function OrdersPage() {
  const [orders, products, customers] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true, lines: true, invoice: true },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Create orders and move them through the pipeline." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                {orders.map((o) => {
                  const total = o.lines.reduce(
                    (s, l) => s + l.quantity * l.unitPrice,
                    0
                  );
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <Td>
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-medium text-slate-900 underline decoration-slate-300"
                        >
                          {o.number}
                        </Link>
                      </Td>
                      <Td>{o.customer.name}</Td>
                      <Td className="text-slate-500">{date(o.createdAt)}</Td>
                      <Td className="text-right font-medium">{money(total)}</Td>
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
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </div>

        <div>
          <Card className="p-5">
            <h2 className="font-semibold mb-4">New order</h2>
            {products.length === 0 || customers.length === 0 ? (
              <p className="text-sm text-slate-400">
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
