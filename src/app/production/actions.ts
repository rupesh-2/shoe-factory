"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function n(fd: FormData, key: string) {
  return Number(fd.get(key) ?? 0) || 0;
}

function revalidate(orderId?: string | null) {
  revalidatePath("/production");
  revalidatePath("/inventory");
  revalidatePath("/");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

async function genBatchNumber() {
  const count = await prisma.productionBatch.count();
  return `PB-${1001 + count}`;
}

// ---------- Bill of materials ----------

export async function saveBomItem(fd: FormData) {
  const productId = str(fd, "productId");
  const rawMaterialId = str(fd, "rawMaterialId");
  const quantity = n(fd, "quantity");
  if (!productId || !rawMaterialId || quantity <= 0) return;
  await prisma.bomItem.upsert({
    where: { productId_rawMaterialId: { productId, rawMaterialId } },
    create: { productId, rawMaterialId, quantity },
    update: { quantity },
  });
  revalidatePath("/production");
}

export async function removeBomItem(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  await prisma.bomItem.delete({ where: { id } });
  revalidatePath("/production");
}

// ---------- Batches ----------

export async function addBatch(fd: FormData) {
  const productId = str(fd, "productId");
  const quantity = Math.trunc(n(fd, "quantity"));
  if (!productId || quantity <= 0) return;
  const orderId = str(fd, "orderId") || null;
  await prisma.productionBatch.create({
    data: {
      number: await genBatchNumber(),
      productId,
      quantity,
      orderId,
      notes: str(fd, "notes") || null,
    },
  });
  revalidate(orderId);
}

/** Start a batch: consume raw materials per the product's BOM. */
export async function startBatch(fd: FormData) {
  const batchId = str(fd, "batchId");
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
    include: { product: { include: { bom: { include: { rawMaterial: true } } } } },
  });
  if (!batch || batch.status !== "Planned") return;

  const bom = batch.product.bom;
  if (bom.length === 0) {
    redirect(
      `/production?error=${encodeURIComponent(
        `${batch.product.name} has no bill of materials yet. Add materials per pair below before starting ${batch.number}.`
      )}`
    );
  }

  const short = bom.filter(
    (b) => b.rawMaterial.quantity < b.quantity * batch.quantity
  );
  if (short.length > 0) {
    const list = short
      .map(
        (b) =>
          `${b.rawMaterial.name} (need ${+(b.quantity * batch.quantity).toFixed(2)}, have ${b.rawMaterial.quantity} ${b.rawMaterial.unit})`
      )
      .join(", ");
    redirect(
      `/production?error=${encodeURIComponent(
        `Not enough materials to start ${batch.number}: ${list}. Raise a purchase order first.`
      )}`
    );
  }

  const materialCost = bom.reduce(
    (s, b) => s + b.quantity * batch.quantity * b.rawMaterial.unitCost,
    0
  );

  await prisma.$transaction([
    ...bom.flatMap((b) => {
      const used = b.quantity * batch.quantity;
      return [
        prisma.rawMaterial.update({
          where: { id: b.rawMaterialId },
          data: { quantity: { decrement: used } },
        }),
        prisma.stockMovement.create({
          data: {
            rawMaterialId: b.rawMaterialId,
            type: "OUT",
            quantity: -used,
            reason: `Used in batch ${batch.number}`,
          },
        }),
      ];
    }),
    prisma.productionBatch.update({
      where: { id: batch.id },
      data: { status: "In Progress", startedAt: new Date(), materialCost },
    }),
  ]);
  revalidate(batch.orderId);
}

/** Complete a batch: add the finished pairs to stock. */
export async function completeBatch(fd: FormData) {
  const batchId = str(fd, "batchId");
  const batch = await prisma.productionBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.status !== "In Progress") return;

  await prisma.$transaction([
    prisma.product.update({
      where: { id: batch.productId },
      data: { quantity: { increment: batch.quantity } },
    }),
    prisma.stockMovement.create({
      data: {
        productId: batch.productId,
        type: "IN",
        quantity: batch.quantity,
        reason: `Batch ${batch.number} completed`,
      },
    }),
    prisma.productionBatch.update({
      where: { id: batch.id },
      data: { status: "Completed", completedAt: new Date() },
    }),
  ]);
  revalidate(batch.orderId);
}

/** Cancel a batch. If it was already started, return its materials to stock. */
export async function cancelBatch(fd: FormData) {
  const batchId = str(fd, "batchId");
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
    include: { product: { include: { bom: true } } },
  });
  if (!batch || (batch.status !== "Planned" && batch.status !== "In Progress")) return;

  const restore =
    batch.status === "In Progress"
      ? batch.product.bom.flatMap((b) => {
          const qty = b.quantity * batch.quantity;
          return [
            prisma.rawMaterial.update({
              where: { id: b.rawMaterialId },
              data: { quantity: { increment: qty } },
            }),
            prisma.stockMovement.create({
              data: {
                rawMaterialId: b.rawMaterialId,
                type: "IN",
                quantity: qty,
                reason: `Batch ${batch.number} cancelled — returned`,
              },
            }),
          ];
        })
      : [];

  await prisma.$transaction([
    ...restore,
    prisma.productionBatch.update({
      where: { id: batch.id },
      data: { status: "Cancelled" },
    }),
  ]);
  revalidate(batch.orderId);
}

/** Create batches for every order line that finished-goods stock can't cover. */
export async function planForOrder(fd: FormData) {
  const orderId = str(fd, "orderId");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      lines: { include: { product: true } },
      batches: { where: { status: { in: ["Planned", "In Progress"] } } },
    },
  });
  if (!order) return;

  // Combine lines per product, net off stock and batches already planned
  const need = new Map<string, number>();
  for (const l of order.lines) need.set(l.productId, (need.get(l.productId) ?? 0) + l.quantity);

  let count = await prisma.productionBatch.count();
  const creates = [];
  for (const [productId, qty] of need) {
    const product = order.lines.find((l) => l.productId === productId)!.product;
    const planned = order.batches
      .filter((b) => b.productId === productId)
      .reduce((s, b) => s + b.quantity, 0);
    const shortfall = qty - Math.max(0, product.quantity) - planned;
    if (shortfall > 0) {
      creates.push(
        prisma.productionBatch.create({
          data: {
            number: `PB-${1001 + count++}`,
            productId,
            quantity: shortfall,
            orderId,
            notes: `For order ${order.number}`,
          },
        })
      );
    }
  }
  if (creates.length) await prisma.$transaction(creates);
  revalidate(orderId);
}
