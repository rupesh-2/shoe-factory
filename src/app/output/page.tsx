import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, num, date as fmtDate } from "@/lib/format";
import { parseDay, toDayInput, monthRange } from "@/lib/dates";
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
  Alert,
  EmptyState,
  LinkButton,
} from "@/components/ui";
import { addOutput, removeOutput, saveRate, addCategory } from "./actions";

export const dynamic = "force-dynamic";

export default async function OutputPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const { date, error } = await searchParams;
  const day = parseDay(date);
  const dayInput = toDayInput(day);
  const isToday = dayInput === toDayInput(new Date());
  // Month containing the selected day
  const { start, end } = monthRange(dayInput.slice(0, 7));

  const [entries, employees, products, categories, monthAgg] = await Promise.all([
    prisma.productionLog.findMany({
      where: { date: day },
      orderBy: { createdAt: "desc" },
      include: { employee: true, product: { include: { category: true } } },
    }),
    prisma.employee.findMany({
      where: { active: true },
      orderBy: [{ payType: "desc" }, { name: "asc" }],
    }),
    prisma.product.findMany({ orderBy: { name: "asc" }, include: { category: true } }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.productionLog.aggregate({
      where: { date: { gte: start, lt: end } },
      _sum: { quantity: true, amount: true },
    }),
  ]);

  const dayPairs = entries.reduce((s, e) => s + e.quantity, 0);
  const dayPay = entries.reduce((s, e) => s + e.amount, 0);

  // Per-worker totals for the day
  const byWorker = new Map<string, { name: string; pairs: number; amount: number }>();
  for (const e of entries) {
    const w = byWorker.get(e.employeeId) ?? { name: e.employee.name, pairs: 0, amount: 0 };
    w.pairs += e.quantity;
    w.amount += e.amount;
    byWorker.set(e.employeeId, w);
  }

  const pieceWorkers = employees.filter((e) => e.payType === "Piece");

  return (
    <div>
      <PageHeader
        title="Daily Output"
        subtitle="Pairs each worker made per day. Piece-rate workers are paid pairs × the rate for that shoe type."
        action={
          <LinkButton href="/payroll" variant="secondary">
            Payroll
          </LinkButton>
        }
      />

      {error && (
        <Alert>
          {error}{" "}
          <Link href={`/output?date=${dayInput}`} className="underline ml-1">
            Dismiss
          </Link>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={isToday ? "Pairs today" : "Pairs"}
          value={num(dayPairs)}
          hint={isToday ? undefined : fmtDate(day)}
          tone="blue"
        />
        <StatCard label={isToday ? "Worker pay today" : "Worker pay"} value={money(dayPay)} tone="green" />
        <StatCard label="Workers logged" value={num(byWorker.size)} />
        <StatCard
          label="Pairs this month"
          value={num(monthAgg._sum.quantity ?? 0)}
          hint={`${money(monthAgg._sum.amount ?? 0)} piece pay`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">{isToday ? "Today" : fmtDate(day)}</h2>
        <form className="flex items-center gap-2">
          <Input name="date" type="date" defaultValue={dayInput} className="w-40" />
          <Button variant="secondary">Go</Button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Log output</h3>
            {pieceWorkers.length === 0 && (
              <p className="text-sm text-amber-600 mb-4">
                No workers are on piece rate yet. Switch them in{" "}
                <Link href="/staff" className="underline">
                  Staff
                </Link>
                .
              </p>
            )}
            <form action={addOutput} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <input type="hidden" name="date" value={dayInput} />
              <Field label="Worker">
                <Select name="employeeId" required defaultValue="">
                  <option value="" disabled>
                    Select worker…
                  </option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                      {e.payType === "Piece" ? "" : " (daily wage)"}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Product">
                  <Select name="productId" required defaultValue="">
                    <option value="" disabled>
                      Select product…
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.color} {p.size}) ·{" "}
                        {p.category
                          ? `${p.category.name} ${money(p.category.pieceRate)}/pair`
                          : "no type"}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Pairs">
                <Input name="quantity" type="number" min={1} required placeholder="0" />
              </Field>
              <div className="sm:col-span-4">
                <Button>Add</Button>
              </div>
            </form>
          </Card>

          <Card>
            {entries.length === 0 ? (
              <EmptyState message="Nothing logged for this day yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Worker</Th>
                    <Th>Product</Th>
                    <Th className="text-right">Pairs</Th>
                    <Th className="text-right">Rate</Th>
                    <Th className="text-right">Amount</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <Td className="font-medium">
                        {e.employee.name}
                        {e.employee.payType !== "Piece" && (
                          <div className="text-xs text-slate-500 font-normal">
                            daily wage — not paid per pair
                          </div>
                        )}
                      </Td>
                      <Td>
                        <div>{e.product.name}</div>
                        <div className="text-xs text-slate-500">
                          {e.product.category?.name ?? "—"} ·{" "}
                          {[e.product.color, e.product.size].filter(Boolean).join(" ")}
                        </div>
                      </Td>
                      <Td className="text-right font-medium">{e.quantity}</Td>
                      <Td className="text-right text-slate-500">{money(e.rate)}</Td>
                      <Td className="text-right font-medium">{money(e.amount)}</Td>
                      <Td>
                        <form action={removeOutput}>
                          <input type="hidden" name="id" value={e.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove entry"
                          >
                            ×
                          </button>
                        </form>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {byWorker.size > 0 && (
            <Card>
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="font-semibold">By worker</h3>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Worker</Th>
                    <Th className="text-right">Pairs</Th>
                    <Th className="text-right">Earned</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...byWorker.values()]
                    .sort((a, b) => b.pairs - a.pairs)
                    .map((w) => (
                      <tr key={w.name}>
                        <Td className="font-medium">{w.name}</Td>
                        <Td className="text-right">{w.pairs}</Td>
                        <Td className="text-right font-medium">{money(w.amount)}</Td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>

        {/* ---------- Piece rates ---------- */}
        <Card className="p-5 h-fit">
          <h3 className="font-semibold">Piece rates</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Fixed pay per pair, by shoe type. Changing a rate applies to new entries only.
          </p>
          <div className="space-y-3">
            {categories.map((c) => (
              <form key={c.id} action={saveRate} className="flex items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c._count.products} product{c._count.products === 1 ? "" : "s"}
                    {c.pieceRate <= 0 && (
                      <span className="ml-1">
                        <Badge color="amber">no rate</Badge>
                      </span>
                    )}
                  </p>
                </div>
                <Input
                  name="pieceRate"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={c.pieceRate}
                  className="w-24"
                  aria-label={`${c.name} rate per pair`}
                />
                <Button variant="secondary">Save</Button>
              </form>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-slate-500">No shoe types yet.</p>
            )}
          </div>
          <form action={addCategory} className="mt-5 pt-4 border-t border-slate-200 flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <Field label="New shoe type">
                <Input name="name" required placeholder="Slipper" />
              </Field>
            </div>
            <div className="w-24">
              <Field label="Rs./pair">
                <Input name="pieceRate" type="number" step="0.01" min={0} defaultValue={0} />
              </Field>
            </div>
            <Button>Add</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
