"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function revalidate() {
  revalidatePath("/purchasing");
  revalidatePath("/inventory");
  revalidatePath("/finance");
  revalidatePath("/");
}

async function genPoNumber() {
  const count = await prisma.purchaseOrder.count();
  return `PO-${1001 + count}`;
}

/** Suggested reorder quantity: top stock back up to twice the reorder level. */
function suggestedQty(m: { quantity: number; reorderLevel: number }) {
  return Math.max(1, Math.ceil(m.reorderLevel * 2 - m.quantity));
}

type LineInput = { rawMaterialId: string; quantity: number; unitCost: number };

export async function createPurchaseOrder(fd: FormData) {
  const supplierId = str(fd, "supplierId");
  let lines: LineInput[] = [];
  try {
    lines = JSON.parse(String(fd.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  lines = lines.filter((l) => l.rawMaterialId && l.quantity > 0);
  if (!supplierId || lines.length === 0) return;

  await prisma.purchaseOrder.create({
    data: {
      number: await genPoNumber(),
      supplierId,
      notes: str(fd, "notes") || null,
      lines: {
        create: lines.map((l) => ({
          rawMaterialId: l.rawMaterialId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      },
    },
  });
  revalidate();
}

/** Draft a PO for every low-stock material from one supplier. */
export async function createReorderPO(fd: FormData) {
  const supplierId = str(fd, "supplierId");
  if (!supplierId) return;
  const materials = await prisma.rawMaterial.findMany({ where: { supplierId } });
  const low = materials.filter((m) => m.quantity <= m.reorderLevel);
  if (low.length === 0) return;

  await prisma.purchaseOrder.create({
    data: {
      number: await genPoNumber(),
      supplierId,
      notes: "Reorder for low stock",
      lines: {
        create: low.map((m) => ({
          rawMaterialId: m.id,
          quantity: suggestedQty(m),
          unitCost: m.unitCost,
        })),
      },
    },
  });
  revalidate();
}

/** Receive goods: add to material stock, update unit cost, book the expense. */
export async function receivePurchaseOrder(fd: FormData) {
  const poId = str(fd, "poId");
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { lines: true, supplier: true },
  });
  if (!po || po.status !== "Ordered") return;

  const total = po.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  await prisma.$transaction([
    ...po.lines.flatMap((l) => [
      prisma.rawMaterial.update({
        where: { id: l.rawMaterialId },
        data: {
          quantity: { increment: l.quantity },
          ...(l.unitCost > 0 ? { unitCost: l.unitCost } : {}),
        },
      }),
      prisma.stockMovement.create({
        data: {
          rawMaterialId: l.rawMaterialId,
          type: "IN",
          quantity: l.quantity,
          reason: `Received on ${po.number}`,
        },
      }),
    ]),
    prisma.expense.create({
      data: {
        category: "Materials",
        amount: total,
        note: `${po.number} · ${po.supplier.name}`,
      },
    }),
    prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "Received", receivedAt: new Date() },
    }),
  ]);
  revalidate();
}

export async function cancelPurchaseOrder(fd: FormData) {
  const poId = str(fd, "poId");
  await prisma.purchaseOrder.updateMany({
    where: { id: poId, status: "Ordered" },
    data: { status: "Cancelled" },
  });
  revalidate();
}
