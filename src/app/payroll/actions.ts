"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseMonth, monthLabel } from "@/lib/dates";
import { getPayroll } from "@/lib/payroll";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function revalidate() {
  revalidatePath("/payroll");
  revalidatePath("/finance");
  revalidatePath("/");
}

/** Pay one employee for the month. Amount defaults to computed gross. */
export async function payEmployee(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const month = parseMonth(str(fd, "month"));
  const row = (await getPayroll(month)).find((r) => r.employeeId === employeeId);
  if (!row || row.paid) return;

  const entered = Number(fd.get("amount"));
  const amount = str(fd, "amount") !== "" && entered >= 0 ? entered : row.gross;
  if (amount <= 0) return;

  await prisma.$transaction([
    prisma.payrollRun.create({
      data: { employeeId, month, daysWorked: row.daysWorked, amount },
    }),
    prisma.expense.create({
      data: {
        category: "Wages",
        amount,
        note: `${row.name} · ${monthLabel(month)} wages`,
      },
    }),
  ]);
  revalidate();
}

/** Pay everyone still unpaid for the month at their computed gross. */
export async function payAll(fd: FormData) {
  const month = parseMonth(str(fd, "month"));
  const unpaid = (await getPayroll(month)).filter((r) => !r.paid && r.gross > 0);
  if (unpaid.length === 0) return;

  await prisma.$transaction([
    ...unpaid.map((r) =>
      prisma.payrollRun.create({
        data: { employeeId: r.employeeId, month, daysWorked: r.daysWorked, amount: r.gross },
      })
    ),
    prisma.expense.create({
      data: {
        category: "Wages",
        amount: unpaid.reduce((s, r) => s + r.gross, 0),
        note: `Payroll ${monthLabel(month)} · ${unpaid.length} staff`,
      },
    }),
  ]);
  revalidate();
}
