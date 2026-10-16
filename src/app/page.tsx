import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, num } from "@/lib/format";
import {
  Card,
  PageHeader,
  StatCard,
  Table,
  Th,
  Td,
  Badge,
  LinkButton,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const orderStatusColor: Record<string, "gray" | "blue" | "amber" | "green" | "purple"> = {
  Draft: "gray",
  Confirmed: "blue",
  "In Production": "amber",
  Shipped: "purple",
  Delivered: "green",
  Closed: "gray",
};

export default async function DashboardPage() {
  const [
    products,
    rawMaterials,
    customers,
    employees,
    payments,
    expenses,
    openOrders,
    recentOrders,
    activeBatches,
    openPOs,
  ] = await Promise.all([
    prisma.product.findMany(),
    prisma.rawMaterial.findMany(),
    prisma.customer.count(),
    prisma.employee.count({ where: { active: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.order.count({ where: { status: { notIn: ["Delivered", "Closed"] } } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    prisma.productionBatch.findMany({
      where: { status: { in: ["Planned", "In Progress"] } },
    }),
    prisma.purchaseOrder.count({ where: { status: "Ordered" } }),
  ]);
  const pairsInProduction = activeBatches
    .filter((b) => b.status === "In Progress")
    .reduce((s, b) => s + b.quantity, 0);

  const revenue = payments._sum.amount ?? 0;
  const totalExpenses = expenses._sum.amount ?? 0;
  const profit = revenue - totalExpenses;

  const lowStockProducts = products.filter((p) => p.quantity <= p.reorderLevel);
  const lowStockMaterials = rawMaterials.filter(
    (m) => m.quantity <= m.reorderLevel
  );
  const inventoryValue =
    products.reduce((s, p) => s + p.cost * p.quantity, 0) +
    rawMaterials.reduce((s, m) => s + m.unitCost * m.quantity, 0);

  const lowStockCount = lowStockProducts.length + lowStockMaterials.length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview across inventory, production, customers, staff and finance."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue (received)" value={money(revenue)} tone="green" />
        <StatCard label="Expenses" value={money(totalExpenses)} tone="red" />
        <StatCard
          label="Profit"
          value={money(profit)}
          tone={profit >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Inventory value"
          value={money(inventoryValue)}
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Products (SKUs)" value={num(products.length)} />
        <StatCard label="Customers" value={num(customers)} />
        <StatCard label="Active staff" value={num(employees)} />
        <StatCard label="Open orders" value={num(openOrders)} tone="amber" />
        <StatCard
          label="Pairs in production"
          value={num(pairsInProduction)}
          hint={`${activeBatches.length} open batches`}
          tone="blue"
        />
        <StatCard label="Open purchase orders" value={num(openPOs)} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold">Recent orders</h2>
          </div>
          {recentOrders.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No orders yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <Td className="font-medium">
                      <Link href={`/orders/${o.id}`} className="text-primary hover:underline">
                        {o.number}
                      </Link>
                    </Td>
                    <Td>{o.customer.name}</Td>
                    <Td>
                      <Badge color={orderStatusColor[o.status] ?? "gray"}>
                        {o.status}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold">Low-stock alerts</h2>
            {lowStockCount > 0 && <Badge color="red">{lowStockCount}</Badge>}
          </div>
          <div className="p-5 space-y-3">
            {lowStockCount === 0 && (
              <p className="text-sm text-emerald-700">Everything is well stocked.</p>
            )}
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {p.name}{" "}
                  <span className="text-slate-500">
                    ({p.color} {p.size})
                  </span>
                </span>
                <Badge color="red">{p.quantity} left</Badge>
              </div>
            ))}
            {lowStockMaterials.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{m.name}</span>
                <Badge color="amber">
                  {m.quantity} {m.unit}
                </Badge>
              </div>
            ))}
            <div className="pt-2">
              <LinkButton href="/purchasing" variant="secondary">
                Reorder materials
              </LinkButton>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
