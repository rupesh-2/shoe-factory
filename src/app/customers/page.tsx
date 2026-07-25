import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, num } from "@/lib/format";
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
} from "@/components/ui";
import { addCustomer } from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      orders: {
        include: { lines: true },
      },
    },
  });

  const withTotals = customers.map((c) => {
    const total = c.orders.reduce(
      (s, o) => s + o.lines.reduce((ls, l) => ls + l.quantity * l.unitPrice, 0),
      0
    );
    return { ...c, total, orderCount: c.orders.length };
  });

  const wholesale = customers.filter((c) => c.type === "wholesale").length;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer directory with order history."
        action={
          <details className="group relative">
            <summary className="cursor-pointer select-none rounded-lg bg-slate-900 text-white px-3.5 py-2 text-sm font-medium list-none">
              + Add customer
            </summary>
            <Card className="p-5 absolute right-0 mt-2 w-[28rem] z-10">
              <form action={addCustomer} className="grid grid-cols-2 gap-4">
                <Field label="Name">
                  <Input name="name" required />
                </Field>
                <Field label="Company">
                  <Input name="company" />
                </Field>
                <Field label="Type">
                  <Select name="type" defaultValue="retail">
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </Select>
                </Field>
                <Field label="Phone">
                  <Input name="phone" />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" />
                </Field>
                <Field label="Address">
                  <Input name="address" />
                </Field>
                <div className="col-span-2">
                  <Button>Save customer</Button>
                </div>
              </form>
            </Card>
          </details>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total customers" value={num(customers.length)} />
        <StatCard label="Wholesale" value={num(wholesale)} tone="blue" />
        <StatCard label="Retail" value={num(customers.length - wholesale)} />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Contact</Th>
              <Th className="text-right">Orders</Th>
              <Th className="text-right">Lifetime value</Th>
            </tr>
          </thead>
          <tbody>
            {withTotals.map((c) => (
              <tr key={c.id}>
                <Td>
                  <div className="font-medium">{c.name}</div>
                  {c.company && (
                    <div className="text-xs text-slate-400">{c.company}</div>
                  )}
                </Td>
                <Td>
                  <Badge color={c.type === "wholesale" ? "blue" : "gray"}>
                    {c.type}
                  </Badge>
                </Td>
                <Td className="text-slate-500">
                  {c.phone ?? c.email ?? "—"}
                </Td>
                <Td className="text-right">{c.orderCount}</Td>
                <Td className="text-right font-medium">{money(c.total)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <p className="text-sm text-slate-400 mt-4">
        Create and track orders in the{" "}
        <Link href="/orders" className="text-slate-700 underline">
          Orders
        </Link>{" "}
        section.
      </p>
    </div>
  );
}
