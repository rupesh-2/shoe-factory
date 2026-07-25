"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nextStatus } from "./pipeline";

async function genNumber(prefix: string, model: "order" | "invoice") {
  const count =
    model === "order"
      ? await prisma.order.count()
      : await prisma.invoice.count();
  return `${prefix}-${1001 + count}`;
}

type LineInput = { productId: string; quantity: number; unitPrice: number };

export async function createOrder(fd: FormData) {
  const customerId = String(fd.get("customerId") ?? "").trim();
  const notes = String(fd.get("notes") ?? "").trim();
  let lines: LineInput[] = [];
  try {
    lines = JSON.parse(String(fd.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  lines = lines.filter((l) => l.productId && l.quantity > 0);
  if (!customerId || lines.length === 0) return;

  const number = await genNumber("ORD", "order");
  const order = await prisma.order.create({
    data: {
      number,
      customerId,
      status: "Draft",
      notes: notes || null,
      lines: {
        create: lines.map((l) => ({
          productId: l.productId,
          quantity: Math.trunc(l.quantity),
          unitPrice: l.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/orders");
  revalidatePath("/");
  redirect(`/orders/${order.id}`);
}

export async function advanceStatus(fd: FormData) {
  const orderId = String(fd.get("orderId") ?? "").trim();
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true, invoice: true },
  });
  if (!order) return;

  const next = nextStatus(order.status);
  if (!next) return;

  const orderTotal = order.lines.reduce(
    (s, l) => s + l.quantity * l.unitPrice,
    0
  );

  const ops: Promise<unknown>[] = [];

  // Auto-create invoice when the order is Confirmed
  if (next === "Confirmed" && !order.invoice) {
    const invNumber = await genNumber("INV", "invoice");
    ops.push(
      prisma.invoice.create({
        data: {
          number: invNumber,
          orderId: order.id,
          amount: orderTotal,
          status: "Unpaid",
        },
      })
    );
  }

  // Deduct finished-goods stock when the order Ships
  if (next === "Shipped") {
    for (const line of order.lines) {
      ops.push(
        prisma.product.update({
          where: { id: line.productId },
          data: { quantity: { decrement: line.quantity } },
        })
      );
      ops.push(
        prisma.stockMovement.create({
          data: {
            productId: line.productId,
            type: "OUT",
            quantity: -line.quantity,
            reason: `Order ${order.number} shipped`,
          },
        })
      );
    }
  }

  ops.push(
    prisma.order.update({
      where: { id: order.id },
      data: { status: next },
    })
  );

  await prisma.$transaction(ops as never);

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  revalidatePath("/inventory");
  revalidatePath("/finance");
  revalidatePath("/");
}
