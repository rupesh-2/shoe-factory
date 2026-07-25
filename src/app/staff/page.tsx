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
import { addEmployee, markAttendance, toggleActive } from "./actions";

export const dynamic = "force-dynamic";

const attColor: Record<string, "green" | "red" | "amber" | "gray"> = {
  Present: "green",
  Absent: "red",
  Leave: "amber",
};

export default async function StaffPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employees = await prisma.employee.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      attendance: { where: { date: today } },
    },
  });

  const active = employees.filter((e) => e.active);
  const presentToday = employees.filter(
    (e) => e.attendance[0]?.status === "Present"
  ).length;
  const dailyWage = active.reduce((s, e) => s + e.wageRate, 0);

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Employee records, attendance, and payroll inputs."
        action={
          <details className="group relative">
            <summary className="cursor-pointer select-none rounded-lg bg-slate-900 text-white px-3.5 py-2 text-sm font-medium list-none">
              + Add employee
            </summary>
            <Card className="p-5 absolute right-0 mt-2 w-[28rem] z-10">
              <form action={addEmployee} className="grid grid-cols-2 gap-4">
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
                <Field label="Daily wage ($)">
                  <Input name="wageRate" type="number" step="0.01" defaultValue={0} />
                </Field>
                <Field label="Phone">
                  <Input name="phone" />
                </Field>
                <Field label="Email">
                  <Input name="email" type="email" />
                </Field>
                <div className="col-span-2">
                  <Button>Save employee</Button>
                </div>
              </form>
            </Card>
          </details>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active staff" value={num(active.length)} />
        <StatCard label="Present today" value={num(presentToday)} tone="green" />
        <StatCard
          label="Absent / leave"
          value={num(active.length - presentToday)}
          tone="amber"
        />
        <StatCard label="Daily wage bill" value={money(dailyWage)} tone="blue" />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Employee</Th>
              <Th>Role</Th>
              <Th>Department</Th>
              <Th className="text-right">Daily wage</Th>
              <Th>Today</Th>
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
                  <Td className="text-right">{money(e.wageRate)}</Td>
                  <Td>
                    {status ? (
                      <Badge color={attColor[status] ?? "gray"}>{status}</Badge>
                    ) : (
                      <span className="text-slate-300 text-xs">Not marked</span>
                    )}
                  </Td>
                  <Td>
                    <form action={markAttendance} className="flex items-center gap-2">
                      <input type="hidden" name="employeeId" value={e.id} />
                      <Select name="status" defaultValue="Present" className="w-28">
                        <option>Present</option>
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
                        className="text-xs text-slate-400 hover:text-slate-700"
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
