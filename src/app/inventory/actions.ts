"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function n(fd: FormData, key: string) {
  return Number(fd.get(key) ?? 0) || 0;
}

export async function addProduct(fd: FormData) {
  const sku = str(fd, "sku");
  const name = str(fd, "name");
  if (!sku || !name) return;
  await prisma.product.create({
    data: {
      sku,
      name,
      model: str(fd, "model") || null,
      size: str(fd, "size") || null,
      color: str(fd, "color") || null,
      price: n(fd, "price"),
      cost: n(fd, "cost"),
      quantity: Math.trunc(n(fd, "quantity")),
      reorderLevel: Math.trunc(n(fd, "reorderLevel")),
    },
  });
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function addMaterial(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.rawMaterial.create({
    data: {
      name,
      unit: str(fd, "unit") || "unit",
      quantity: n(fd, "quantity"),
      unitCost: n(fd, "unitCost"),
      reorderLevel: n(fd, "reorderLevel"),
      supplierId: str(fd, "supplierId") || null,
    },
  });
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function adjustProductStock(fd: FormData) {
  const productId = str(fd, "productId");
  const delta = Math.trunc(n(fd, "delta"));
  const type = str(fd, "type") || (delta >= 0 ? "IN" : "OUT");
  if (!productId || delta === 0) return;
  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { quantity: { increment: delta } },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: delta,
        reason: str(fd, "reason") || "Manual adjustment",
      },
    }),
  ]);
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function adjustMaterialStock(fd: FormData) {
  const rawMaterialId = str(fd, "rawMaterialId");
  const delta = n(fd, "delta");
  const type = str(fd, "type") || (delta >= 0 ? "IN" : "OUT");
  if (!rawMaterialId || delta === 0) return;
  await prisma.$transaction([
    prisma.rawMaterial.update({
      where: { id: rawMaterialId },
      data: { quantity: { increment: delta } },
    }),
    prisma.stockMovement.create({
      data: {
        rawMaterialId,
        type,
        quantity: delta,
        reason: str(fd, "reason") || "Manual adjustment",
      },
    }),
  ]);
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function addSupplier(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.supplier.create({
    data: {
      name,
      contact: str(fd, "contact") || null,
      phone: str(fd, "phone") || null,
      email: str(fd, "email") || null,
      address: str(fd, "address") || null,
    },
  });
  revalidatePath("/inventory");
}
