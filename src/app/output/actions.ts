"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseDay, toDayInput } from "@/lib/dates";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function n(fd: FormData, key: string) {
  return Number(fd.get(key) ?? 0) || 0;
}

function revalidate() {
  revalidatePath("/output");
  revalidatePath("/payroll");
  revalidatePath("/inventory");
}

/** Log pairs a worker made on a day, at the product type's current piece rate. */
export async function addOutput(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const productId = str(fd, "productId");
  const quantity = Math.trunc(n(fd, "quantity"));
  const day = parseDay(str(fd, "date"));
  if (!employeeId || !productId || quantity <= 0) return;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });
  if (!product) return;

  const rate = product.category?.pieceRate ?? 0;
  if (rate <= 0) {
    const why = product.category
      ? `Set a piece rate for “${product.category.name}” first.`
      : `${product.name} (${product.sku}) has no shoe type — set it in Inventory first.`;
    redirect(`/output?date=${toDayInput(day)}&error=${encodeURIComponent(why)}`);
  }

  await prisma.productionLog.create({
    data: {
      employeeId,
      productId,
      date: day,
      quantity,
      rate,
      amount: Math.round(quantity * rate * 100) / 100,
    },
  });
  revalidate();
}

export async function removeOutput(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  await prisma.productionLog.delete({ where: { id } });
  revalidate();
}

export async function saveRate(fd: FormData) {
  const id = str(fd, "id");
  const pieceRate = n(fd, "pieceRate");
  if (!id || pieceRate < 0) return;
  await prisma.category.update({ where: { id }, data: { pieceRate } });
  revalidate();
}

export async function addCategory(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.category.upsert({
    where: { name },
    create: { name, pieceRate: n(fd, "pieceRate") },
    update: { pieceRate: n(fd, "pieceRate") },
  });
  revalidate();
}
