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
  SearchBar,
  EmptyState,
} from "@/components/ui";
import { addCustomer } from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim().toLowerCase();
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
  const shown = withTotals.filter(
    (c) =>
      !term ||
      [c.name, c.company, c.phone, c.email].some((v) => v?.toLowerCase().includes(term))
  );

  const wholesale = customers.filter((c) => c.type === "wholesale").length;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer directory with order history."
        action={
          <details className="group relative">
            <summary className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 min-h-11 sm:min-h-9 text-sm font-medium transition-colors duration-200 bg-primary text-white hover:bg-primary-hover shadow-sm select-none list-none">
              + Add customer
            </summary>
            <Card className="fixed inset-x-4 top-20 z-40 max-h-[calc(100vh-6rem)] overflow-y-auto p-5 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:max-h-none sm:overflow-visible sm:w-[28rem]">
              <form action={addCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="sm:col-span-2">
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

      <div className="mb-4 flex justify-end">
        <SearchBar placeholder="Search name, company, phone" defaultValue={q} />
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
            {shown.map((c) => (
              <tr key={c.id}>
                <Td>
                  <div className="font-medium">{c.name}</div>
                  {c.company && (
                    <div className="text-xs text-slate-500">{c.company}</div>
                  )}
                </Td>
                <Td>
                  <Badge color={c.type === "wholesale" ? "blue" : "gray"}>
                    {c.type}
                  </Badge>
                </Td>
                <Td className="text-slate-500 whitespace-nowrap">
                  {c.phone ?? c.email ?? "—"}
                </Td>
                <Td className="text-right">{c.orderCount}</Td>
                <Td className="text-right font-medium whitespace-nowrap">{money(c.total)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {shown.length === 0 && <EmptyState message="No customers match your search." />}
      </Card>

      <p className="text-sm text-slate-500 mt-4">
        Create and track orders in the{" "}
        <Link href="/orders" className="text-slate-700 underline">
          Orders
        </Link>{" "}
        section.
      </p>
    </div>
  );
}
