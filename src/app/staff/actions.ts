"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseDay } from "@/lib/dates";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function n(fd: FormData, key: string) {
  return Number(fd.get(key) ?? 0) || 0;
}

export async function addEmployee(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.employee.create({
    data: {
      name,
      role: str(fd, "role") || "Worker",
      department: str(fd, "department") || null,
      phone: str(fd, "phone") || null,
      email: str(fd, "email") || null,
      payType: str(fd, "payType") === "Piece" ? "Piece" : "Daily",
      wageRate: n(fd, "wageRate"),
    },
  });
  revalidatePath("/staff");
  revalidatePath("/");
}

const HOURS: Record<string, number> = { Present: 8, "Half Day": 4 };

export async function markAttendance(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const status = str(fd, "status") || "Present";
  if (!employeeId) return;

  const day = parseDay(str(fd, "date"));
  const hours = HOURS[status] ?? 0;

  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: day } },
    create: { employeeId, date: day, status, hours },
    update: { status, hours },
  });

  revalidatePath("/staff");
  revalidatePath("/payroll");
}

/** Mark every active employee without a record that day as Present. */
export async function markAllPresent(fd: FormData) {
  const day = parseDay(str(fd, "date"));
  const employees = await prisma.employee.findMany({
    where: { active: true, attendance: { none: { date: day } } },
  });
  if (employees.length === 0) return;
  await prisma.attendance.createMany({
    data: employees.map((e) => ({
      employeeId: e.id,
      date: day,
      status: "Present",
      hours: 8,
    })),
  });
  revalidatePath("/staff");
  revalidatePath("/payroll");
}

export async function togglePayType(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  if (!employeeId) return;
  const e = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!e) return;
  await prisma.employee.update({
    where: { id: employeeId },
    data: { payType: e.payType === "Piece" ? "Daily" : "Piece" },
  });
  revalidatePath("/staff");
  revalidatePath("/payroll");
  revalidatePath("/output");
}

export async function toggleActive(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const active = str(fd, "active") === "true";
  if (!employeeId) return;
  await prisma.employee.update({
    where: { id: employeeId },
    data: { active: !active },
  });
  revalidatePath("/staff");
  revalidatePath("/");
}
