"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function n(fd: FormData, key: string) {
  return Number(fd.get(key) ?? 0) || 0;
}

export async function recordPayment(fd: FormData) {
  const invoiceId = str(fd, "invoiceId");
  const amount = n(fd, "amount");
  if (!invoiceId || amount <= 0) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return;

  const paidSoFar = invoice.payments.reduce((s, p) => s + p.amount, 0) + amount;
  const status =
    paidSoFar >= invoice.amount ? "Paid" : paidSoFar > 0 ? "Partial" : "Unpaid";

  await prisma.$transaction([
    prisma.payment.create({
      data: { invoiceId, amount, method: str(fd, "method") || "Cash" },
    }),
    prisma.invoice.update({ where: { id: invoiceId }, data: { status } }),
  ]);

  revalidatePath("/finance");
  revalidatePath("/");
}

export async function addExpense(fd: FormData) {
  const amount = n(fd, "amount");
  if (amount <= 0) return;
  await prisma.expense.create({
    data: {
      category: str(fd, "category") || "Overhead",
      amount,
      note: str(fd, "note") || null,
    },
  });
  revalidatePath("/finance");
  revalidatePath("/");
}
