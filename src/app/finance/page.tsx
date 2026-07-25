import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
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
import { recordPayment, addExpense } from "./actions";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [invoices, expenses, paymentsAgg] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { order: { include: { customer: true } }, payments: true },
    }),
    prisma.expense.findMany({ orderBy: { date: "desc" } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);

  const revenue = paymentsAgg._sum.amount ?? 0;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = revenue - totalExpenses;

  const receivables = invoices.reduce((s, inv) => {
    const paid = inv.payments.reduce((ps, p) => ps + p.amount, 0);
    return s + Math.max(0, inv.amount - paid);
  }, 0);

  // Expense breakdown by category
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Finance" subtitle="Invoices, payments, expenses, and profit & loss." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenue (received)" value={money(revenue)} tone="green" />
        <StatCard label="Expenses" value={money(totalExpenses)} tone="red" />
        <StatCard
          label="Profit"
          value={money(profit)}
          tone={profit >= 0 ? "green" : "red"}
        />
        <StatCard label="Receivables" value={money(receivables)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Invoices */}
        <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold">Invoices</h2>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Customer</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
                <Th>Record payment</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                const balance = Math.max(0, inv.amount - paid);
                return (
                  <tr key={inv.id}>
                    <Td className="font-medium">{inv.number}</Td>
                    <Td>{inv.order?.customer.name ?? "—"}</Td>
                    <Td className="text-right">{money(inv.amount)}</Td>
                    <Td className="text-right">{money(balance)}</Td>
                    <Td>
                      <Badge
                        color={
                          inv.status === "Paid"
                            ? "green"
                            : inv.status === "Partial"
                            ? "amber"
                            : "red"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </Td>
                    <Td>
                      {inv.status === "Paid" ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <form
                          action={recordPayment}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <Input
                            name="amount"
                            type="number"
                            step="0.01"
                            placeholder={balance.toFixed(2)}
                            className="w-24"
                          />
                          <Button variant="secondary">Pay</Button>
                        </form>
                      )}
                    </Td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <Td className="text-slate-400" >No invoices yet.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        {/* P&L breakdown */}
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Profit &amp; Loss</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Revenue</span>
              <span className="font-medium text-emerald-600">{money(revenue)}</span>
            </div>
            <div className="pt-2 text-slate-500 text-xs uppercase tracking-wide">
              Expenses
            </div>
            {Object.entries(byCategory).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between pl-2">
                <span className="text-slate-500">{cat}</span>
                <span>-{money(amt)}</span>
              </div>
            ))}
            {Object.keys(byCategory).length === 0 && (
              <p className="text-slate-400 text-xs pl-2">No expenses recorded.</p>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-semibold">Net profit</span>
              <span
                className={`font-semibold ${
                  profit >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {money(profit)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Expenses */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Expenses</h2>
        <details className="group relative">
          <summary className="cursor-pointer select-none rounded-lg bg-slate-900 text-white px-3.5 py-2 text-sm font-medium list-none">
            + Add expense
          </summary>
          <Card className="p-5 absolute right-0 mt-2 w-[26rem] z-10">
            <form action={addExpense} className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <Select name="category" defaultValue="Overhead">
                  <option>Materials</option>
                  <option>Wages</option>
                  <option>Utilities</option>
                  <option>Overhead</option>
                </Select>
              </Field>
              <Field label="Amount ($)">
                <Input name="amount" type="number" step="0.01" required />
              </Field>
              <div className="col-span-2">
                <Field label="Note">
                  <Input name="note" placeholder="Optional" />
                </Field>
              </div>
              <div className="col-span-2">
                <Button>Save expense</Button>
              </div>
            </form>
          </Card>
        </details>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Note</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Badge color="gray">{e.category}</Badge>
                </Td>
                <Td className="text-slate-500">{e.note ?? "—"}</Td>
                <Td className="text-right font-medium">{money(e.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
