import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dates";

const DAY_VALUE: Record<string, number> = { Present: 1, "Half Day": 0.5 };

export type PayrollRow = {
  employeeId: string;
  name: string;
  role: string;
  payType: string;
  wageRate: number;
  present: number;
  halfDays: number;
  absent: number;
  leave: number;
  daysWorked: number;
  pairs: number;
  pieceEarnings: number;
  gross: number;
  paid: { amount: number; paidAt: Date } | null;
};

/**
 * Wages for a month.
 * Daily staff: days worked (half days count 0.5) × daily wage.
 * Piece-rate staff: sum of their logged output (pairs × rate at the time).
 */
export async function getPayroll(month: string): Promise<PayrollRow[]> {
  const { start, end } = monthRange(month);
  const employees = await prisma.employee.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      attendance: { where: { date: { gte: start, lt: end } } },
      payrolls: { where: { month } },
      outputs: { where: { date: { gte: start, lt: end } } },
    },
  });

  return employees
    .filter(
      (e) =>
        e.active || e.attendance.length > 0 || e.payrolls.length > 0 || e.outputs.length > 0
    )
    .map((e) => {
      const count = (s: string) => e.attendance.filter((a) => a.status === s).length;
      const daysWorked = e.attendance.reduce((s, a) => s + (DAY_VALUE[a.status] ?? 0), 0);
      const pairs = e.outputs.reduce((s, o) => s + o.quantity, 0);
      const pieceEarnings = e.outputs.reduce((s, o) => s + o.amount, 0);
      const gross = e.payType === "Piece" ? pieceEarnings : daysWorked * e.wageRate;
      const run = e.payrolls[0];
      return {
        employeeId: e.id,
        name: e.name,
        role: e.role,
        payType: e.payType,
        wageRate: e.wageRate,
        present: count("Present"),
        halfDays: count("Half Day"),
        absent: count("Absent"),
        leave: count("Leave"),
        daysWorked,
        pairs,
        pieceEarnings,
        gross: Math.round(gross * 100) / 100,
        paid: run ? { amount: run.amount, paidAt: run.paidAt } : null,
      };
    });
}
