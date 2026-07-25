"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export async function addCustomer(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  await prisma.customer.create({
    data: {
      name,
      company: str(fd, "company") || null,
      type: str(fd, "type") || "retail",
      phone: str(fd, "phone") || null,
      email: str(fd, "email") || null,
      address: str(fd, "address") || null,
    },
  });
  revalidatePath("/customers");
  revalidatePath("/");
}
