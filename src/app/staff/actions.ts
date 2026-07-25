"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
      wageRate: n(fd, "wageRate"),
    },
  });
  revalidatePath("/staff");
  revalidatePath("/");
}

export async function markAttendance(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const status = str(fd, "status") || "Present";
  if (!employeeId) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hours = status === "Present" ? 8 : 0;

  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: today } },
    create: { employeeId, date: today, status, hours },
    update: { status, hours },
  });

  revalidatePath("/staff");
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
