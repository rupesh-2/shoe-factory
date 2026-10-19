import { prisma } from "@/lib/prisma";
import { money, num, date as fmtDate } from "@/lib/format";
import { parseDay, toDayInput } from "@/lib/dates";
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
  LinkButton,
} from "@/components/ui";
import {
  addEmployee,
  markAttendance,
  markAllPresent,
  toggleActive,
  togglePayType,
} from "./actions";

export const dynamic = "force-dynamic";

const attColor: Record<string, "green" | "red" | "amber" | "gray"> = {
  Present: "green",
  "Half Day": "amber",
  Absent: "red",
  Leave: "amber",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const day = parseDay((await searchParams).date);
  const dayInput = toDayInput(day);
  const isToday = dayInput === toDayInput(new Date());

  const employees = await prisma.employee.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      attendance: { where: { date: day } },
    },
  });

  const active = employees.filter((e) => e.active);
  const presentToday = employees.filter((e) =>
    ["Present", "Half Day"].includes(e.attendance[0]?.status ?? "")
  ).length;
  const unmarked = active.filter((e) => !e.attendance[0]).length;
  const dailyWage = active
    .filter((e) => e.payType !== "Piece")
    .reduce((s, e) => s + e.wageRate, 0);
  const pieceCount = active.filter((e) => e.payType === "Piece").length;

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Employee records, attendance, and payroll inputs."
        action={
          <div className="flex flex-wrap items-center gap-2">
          <LinkButton href="/payroll" variant="secondary">
            Payroll
          </LinkButton>
          <details className="group relative">
            <summary className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 min-h-11 sm:min-h-9 text-sm font-medium transition-colors duration-200 bg-primary text-white hover:bg-primary-hover shadow-sm select-none list-none">
              + Add employee
            </summary>
            <Card className="fixed inset-x-4 top-20 z-40 max-h-[calc(100vh-6rem)] overflow-y-auto p-5 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:max-h-none sm:overflow-visible sm:w-[28rem]">
              <form action={addEmployee} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <Input name="name" required />
                </Field>
                <Field label="Role">
                  <Input name="role" placeholder="Stitcher" />
                </Field>
                <Field label="Department">
                  <Select name="department" defaultValue="Production">
                    <option>Production</option>
                    <option>Sales</option>
                    <option>Finance</option>
                    <option>Admin</option>
                    <option>Warehouse</option>
                  </Select>
                </Field>
                <Field label="Paid">
                  <Select name="payType" defaultValue="Daily">
                    <option value="Daily">Daily wage</option>
                    <option value="Piece">Per pair (piece rate)</option>
                  </Select>
                </Field>
                <Field label="Daily wage (Rs., if daily)">
                  <Input name="wageRate" type="number" step="0.01" defaultValue={0} />
                </Field>
                <Field label="Phone">
                  <Input name="phone" />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" />
                </Field>
                <div className="sm:col-span-2">
                  <Button>Save employee</Button>
                </div>
              </form>
            </Card>
          </details>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active staff" value={num(active.length)} />
        <StatCard
          label={isToday ? "Present today" : "Present"}
          value={num(presentToday)}
          hint={isToday ? undefined : fmtDate(day)}
          tone="green"
        />
        <StatCard
          label="Absent / leave"
          value={num(active.length - presentToday)}
          tone="amber"
        />
        <StatCard
          label="Daily wage bill"
          value={money(dailyWage)}
          hint={pieceCount ? `+ ${pieceCount} paid per pair` : undefined}
          tone="blue"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">
          Attendance · {isToday ? "Today" : fmtDate(day)}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex items-center gap-2">
            <Input name="date" type="date" defaultValue={dayInput} className="w-40" />
            <Button variant="secondary">Go</Button>
          </form>
          {unmarked > 0 && (
            <form action={markAllPresent}>
              <input type="hidden" name="date" value={dayInput} />
              <Button>Mark {unmarked} unmarked present</Button>
            </form>
          )}
        </div>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Employee</Th>
              <Th>Role</Th>
              <Th>Department</Th>
              <Th className="text-right">Pay</Th>
              <Th>{isToday ? "Today" : "Status"}</Th>
              <Th>Mark attendance</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const status = e.attendance[0]?.status;
              return (
                <tr key={e.id} className={e.active ? "" : "opacity-50"}>
                  <Td className="font-medium">{e.name}</Td>
                  <Td>{e.role}</Td>
                  <Td className="text-slate-500">{e.department ?? "—"}</Td>
                  <Td className="text-right">
                    {e.payType === "Piece" ? (
                      <Badge color="purple">Per pair</Badge>
                    ) : (
                      <span className="whitespace-nowrap">{money(e.wageRate)}/day</span>
                    )}
                    <form action={togglePayType}>
                      <input type="hidden" name="employeeId" value={e.id} />
                      <button
                        type="submit"
                        className="text-[11px] text-slate-500 hover:text-slate-700 whitespace-nowrap"
                      >
                        {e.payType === "Piece" ? "Switch to daily" : "Switch to per pair"}
                      </button>
                    </form>
                  </Td>
                  <Td>
                    {status ? (
                      <Badge color={attColor[status] ?? "gray"}>{status}</Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">Not marked</span>
                    )}
                  </Td>
                  <Td>
                    <form action={markAttendance} className="flex items-center gap-2">
                      <input type="hidden" name="employeeId" value={e.id} />
                      <input type="hidden" name="date" value={dayInput} />
                      <Select name="status" defaultValue={status ?? "Present"} className="w-28">
                        <option>Present</option>
                        <option>Half Day</option>
                        <option>Absent</option>
                        <option>Leave</option>
                      </Select>
                      <Button variant="secondary">Save</Button>
                    </form>
                  </Td>
                  <Td>
                    <form action={toggleActive}>
                      <input type="hidden" name="employeeId" value={e.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(e.active)}
                      />
                      <button
                        type="submit"
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        {e.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
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
