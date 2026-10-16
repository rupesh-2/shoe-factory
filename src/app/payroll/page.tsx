import { money, num, date } from "@/lib/format";
import { parseMonth, monthLabel } from "@/lib/dates";
import { getPayroll } from "@/lib/payroll";
import {
  Card,
  PageHeader,
  Table,
  Th,
  Td,
  Badge,
  Button,
  Input,
  StatCard,
  EmptyState,
  LinkButton,
} from "@/components/ui";
import { payEmployee, payAll } from "./actions";

export const dynamic = "force-dynamic";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const month = parseMonth((await searchParams).month);
  const rows = await getPayroll(month);

  const gross = rows.reduce((s, r) => s + r.gross, 0);
  const paid = rows.reduce((s, r) => s + (r.paid?.amount ?? 0), 0);
  const unpaid = rows.filter((r) => !r.paid && r.gross > 0);
  const outstanding = unpaid.reduce((s, r) => s + r.gross, 0);

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Daily staff: days worked × daily wage (half day = 0.5). Piece-rate workers: pairs made × rate per shoe type."
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/output" variant="secondary">
              Daily output
            </LinkButton>
            <LinkButton href="/staff" variant="secondary">
              Attendance
            </LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Gross wages" value={money(gross)} hint={monthLabel(month)} />
        <StatCard label="Paid" value={money(paid)} tone="green" />
        <StatCard
          label="Outstanding"
          value={money(outstanding)}
          tone={outstanding > 0 ? "amber" : "green"}
        />
        <StatCard label="Staff on payroll" value={num(rows.length)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">{monthLabel(month)}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex items-center gap-2">
            <Input name="month" type="month" defaultValue={month} className="w-44" />
            <Button variant="secondary">Go</Button>
          </form>
          {unpaid.length > 0 && (
            <form action={payAll}>
              <input type="hidden" name="month" value={month} />
              <Button>
                Pay all {unpaid.length} · {money(outstanding)}
              </Button>
            </form>
          )}
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="No staff to pay for this month." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Pay basis</Th>
                <Th className="text-right">Days worked</Th>
                <Th className="text-right">Pairs made</Th>
                <Th className="text-right">Gross</Th>
                <Th>Pay</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <Td>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.role}</div>
                  </Td>
                  <Td>
                    {r.payType === "Piece" ? (
                      <Badge color="purple">Per pair</Badge>
                    ) : (
                      <span className="text-slate-600">{money(r.wageRate)}/day</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <span className="font-medium">{r.daysWorked}</span>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {r.present} full · {r.halfDays} half · {r.absent + r.leave} off
                    </div>
                  </Td>
                  <Td className="text-right">
                    {r.pairs > 0 ? (
                      <span className={r.payType === "Piece" ? "font-medium" : "text-slate-500"}>
                        {num(r.pairs)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <span className="font-medium">{money(r.gross)}</span>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {r.payType === "Piece"
                        ? `${num(r.pairs)} pairs`
                        : `${r.daysWorked} × ${money(r.wageRate)}`}
                    </div>
                  </Td>
                  <Td>
                    {r.paid ? (
                      <div>
                        <Badge color="green">Paid {money(r.paid.amount)}</Badge>
                        <div className="text-xs text-slate-500 mt-1">
                          {date(r.paid.paidAt)}
                        </div>
                      </div>
                    ) : r.gross > 0 ? (
                      <form action={payEmployee} className="flex items-center gap-2">
                        <input type="hidden" name="employeeId" value={r.employeeId} />
                        <input type="hidden" name="month" value={month} />
                        <Input
                          name="amount"
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder={r.gross.toFixed(2)}
                          className="w-24"
                          aria-label="Amount (blank = gross)"
                        />
                        <Button variant="secondary">Pay</Button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {r.payType === "Piece" ? "No output logged" : "No days worked"}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="text-xs text-slate-500 mt-3">
        Paying books a Wages expense in Finance. Leave the amount blank to pay the computed
        gross, or enter a different amount for advances or deductions.
      </p>
    </div>
  );
}
