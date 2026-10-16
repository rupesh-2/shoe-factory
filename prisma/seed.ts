import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean slate (order matters for FKs)
  await prisma.productionLog.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.purchaseLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.bomItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.expense.deleteMany();

  // ----- Suppliers & Raw Materials -----
  const leatherCo = await prisma.supplier.create({
    data: { name: "Premium Leather Co.", contact: "Ramesh", phone: "9800011122", email: "sales@premiumleather.com" },
  });
  const soleWorks = await prisma.supplier.create({
    data: { name: "SoleWorks Ltd.", contact: "Anita", phone: "9800033344", email: "orders@soleworks.com" },
  });

  await prisma.rawMaterial.createMany({
    data: [
      { name: "Full-grain Leather", unit: "sq.ft", quantity: 1200, unitCost: 3.5, reorderLevel: 300, supplierId: leatherCo.id },
      { name: "Rubber Soles", unit: "pair", quantity: 800, unitCost: 1.2, reorderLevel: 200, supplierId: soleWorks.id },
      { name: "Shoe Laces", unit: "pair", quantity: 150, unitCost: 0.3, reorderLevel: 250, supplierId: soleWorks.id },
      { name: "Adhesive Glue", unit: "litre", quantity: 90, unitCost: 4.0, reorderLevel: 40, supplierId: leatherCo.id },
      { name: "Eyelets", unit: "pack", quantity: 60, unitCost: 2.5, reorderLevel: 100, supplierId: soleWorks.id },
    ],
  });

  // ----- Shoe types with piece rate (pay per pair) -----
  const [sneaker, boot, loafer, sandal] = await Promise.all([
    prisma.category.create({ data: { name: "Sneaker", pieceRate: 1.5 } }),
    prisma.category.create({ data: { name: "Boot", pieceRate: 3 } }),
    prisma.category.create({ data: { name: "Loafer", pieceRate: 2.25 } }),
    prisma.category.create({ data: { name: "Sandal", pieceRate: 0.8 } }),
  ]);

  // ----- Products (finished goods) -----
  const products = await Promise.all([
    prisma.product.create({ data: { sku: "SNK-BLK-42", categoryId: sneaker.id, name: "Classic Sneaker", model: "Classic", size: "42", color: "Black", price: 59.99, cost: 28, quantity: 120, reorderLevel: 30 } }),
    prisma.product.create({ data: { sku: "SNK-WHT-41", categoryId: sneaker.id, name: "Classic Sneaker", model: "Classic", size: "41", color: "White", price: 59.99, cost: 28, quantity: 18, reorderLevel: 30 } }),
    prisma.product.create({ data: { sku: "BOOT-BRN-43", categoryId: boot.id, name: "Leather Boot", model: "Ranger", size: "43", color: "Brown", price: 119.0, cost: 62, quantity: 45, reorderLevel: 20 } }),
    prisma.product.create({ data: { sku: "LOAF-TAN-40", categoryId: loafer.id, name: "Formal Loafer", model: "Executive", size: "40", color: "Tan", price: 89.5, cost: 41, quantity: 8, reorderLevel: 15 } }),
    prisma.product.create({ data: { sku: "SND-BLU-39", categoryId: sandal.id, name: "Summer Sandal", model: "Breeze", size: "39", color: "Blue", price: 34.99, cost: 14, quantity: 200, reorderLevel: 40 } }),
  ]);

  // ----- Bill of materials (per pair) -----
  const mat = Object.fromEntries(
    (await prisma.rawMaterial.findMany()).map((m) => [m.name, m])
  );
  const bom: [number, string, number][] = [
    [0, "Full-grain Leather", 1.5], [0, "Rubber Soles", 1], [0, "Shoe Laces", 1], [0, "Adhesive Glue", 0.05], [0, "Eyelets", 0.1],
    [1, "Full-grain Leather", 1.5], [1, "Rubber Soles", 1], [1, "Shoe Laces", 1], [1, "Adhesive Glue", 0.05], [1, "Eyelets", 0.1],
    [2, "Full-grain Leather", 3], [2, "Rubber Soles", 1], [2, "Shoe Laces", 1], [2, "Adhesive Glue", 0.08], [2, "Eyelets", 0.15],
    [3, "Full-grain Leather", 2], [3, "Rubber Soles", 1], [3, "Adhesive Glue", 0.06],
    [4, "Full-grain Leather", 0.8], [4, "Rubber Soles", 1], [4, "Adhesive Glue", 0.03],
  ];
  await prisma.bomItem.createMany({
    data: bom.map(([pi, name, quantity]) => ({
      productId: products[pi].id,
      rawMaterialId: mat[name].id,
      quantity,
    })),
  });

  // ----- Customers -----
  const cust = await Promise.all([
    prisma.customer.create({ data: { name: "Downtown Footwear", company: "Downtown Retail LLC", type: "wholesale", phone: "9811100001", email: "buy@downtownfootwear.com", address: "12 Market St" } }),
    prisma.customer.create({ data: { name: "Sara Malik", type: "retail", phone: "9811100002", email: "sara@example.com" } }),
    prisma.customer.create({ data: { name: "StepUp Stores", company: "StepUp Pvt Ltd", type: "wholesale", phone: "9811100003", email: "orders@stepup.com", address: "88 Mall Rd" } }),
  ]);

  // ----- Orders + Lines + Invoice + Payment -----
  const order1 = await prisma.order.create({
    data: {
      number: "ORD-1001",
      customerId: cust[0].id,
      status: "Delivered",
      lines: {
        create: [
          { productId: products[0].id, quantity: 20, unitPrice: 54 },
          { productId: products[2].id, quantity: 10, unitPrice: 110 },
        ],
      },
    },
  });
  const order1Total = 20 * 54 + 10 * 110;
  const inv1 = await prisma.invoice.create({
    data: { number: "INV-1001", orderId: order1.id, amount: order1Total, status: "Paid" },
  });
  await prisma.payment.create({ data: { invoiceId: inv1.id, amount: order1Total, method: "Bank Transfer" } });

  const order2 = await prisma.order.create({
    data: {
      number: "ORD-1002",
      customerId: cust[2].id,
      status: "Confirmed",
      lines: { create: [{ productId: products[4].id, quantity: 50, unitPrice: 30 }] },
    },
  });
  const order2Total = 50 * 30;
  const inv2 = await prisma.invoice.create({
    data: { number: "INV-1002", orderId: order2.id, amount: order2Total, status: "Partial" },
  });
  await prisma.payment.create({ data: { invoiceId: inv2.id, amount: 600, method: "Cash" } });

  await prisma.order.create({
    data: {
      number: "ORD-1003",
      customerId: cust[1].id,
      status: "Draft",
      lines: { create: [{ productId: products[3].id, quantity: 2, unitPrice: 89.5 }] },
    },
  });

  // ----- Production batches -----
  await prisma.productionBatch.create({
    data: { number: "PB-1001", productId: products[2].id, quantity: 20, status: "Completed", materialCost: 20 * (3 * 3.5 + 1.2 + 0.3 + 0.08 * 4 + 0.15 * 2.5), startedAt: new Date(Date.now() - 6 * 864e5), completedAt: new Date(Date.now() - 3 * 864e5) },
  });
  await prisma.productionBatch.create({
    data: { number: "PB-1002", productId: products[4].id, quantity: 60, status: "In Progress", orderId: order2.id, materialCost: 60 * (0.8 * 3.5 + 1.2 + 0.03 * 4), startedAt: new Date(Date.now() - 864e5), notes: "For order ORD-1002" },
  });
  await prisma.productionBatch.create({
    data: { number: "PB-1003", productId: products[3].id, quantity: 30, status: "Planned", notes: "Restock loafers" },
  });

  // ----- Purchase orders -----
  await prisma.purchaseOrder.create({
    data: {
      number: "PO-1001",
      supplierId: leatherCo.id,
      status: "Received",
      receivedAt: new Date(Date.now() - 10 * 864e5),
      lines: { create: [{ rawMaterialId: mat["Full-grain Leather"].id, quantity: 1200, unitCost: 3.5 }] },
    },
  });
  await prisma.purchaseOrder.create({
    data: {
      number: "PO-1002",
      supplierId: soleWorks.id,
      status: "Ordered",
      notes: "Laces running low",
      lines: { create: [{ rawMaterialId: mat["Shoe Laces"].id, quantity: 400, unitCost: 0.3 }] },
    },
  });

  // ----- Employees + Attendance -----
  const emps = await Promise.all([
    prisma.employee.create({ data: { name: "Imran Khan", role: "Production Lead", department: "Production", wageRate: 45, phone: "9822200001" } }),
    prisma.employee.create({ data: { name: "Fatima Noor", role: "Stitcher", department: "Production", payType: "Piece", phone: "9822200002" } }),
    prisma.employee.create({ data: { name: "David Roy", role: "Accountant", department: "Finance", wageRate: 50, phone: "9822200003" } }),
    prisma.employee.create({ data: { name: "Lena Park", role: "Sales Rep", department: "Sales", wageRate: 38, phone: "9822200004" } }),
    prisma.employee.create({ data: { name: "Ravi Thapa", role: "Laster", department: "Production", payType: "Piece", phone: "9822200005" } }),
    prisma.employee.create({ data: { name: "Sunita Rai", role: "Stitcher", department: "Production", payType: "Piece", phone: "9822200006" } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Attendance for this month so far (Sundays off), with a few absences / half days
  const att: { employeeId: string; date: Date; status: string; hours: number }[] = [];
  for (let d = new Date(today.getFullYear(), today.getMonth(), 1); d <= today; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (d.getDay() === 0) continue;
    emps.forEach((e, i) => {
      const k = (d.getDate() + i * 3) % 11;
      const status = k === 0 ? "Absent" : k === 5 ? "Half Day" : "Present";
      att.push({ employeeId: e.id, date: d, status, hours: status === "Present" ? 8 : status === "Half Day" ? 4 : 0 });
    });
  }
  await prisma.attendance.createMany({ data: att });

  // Daily output for piece-rate workers on the days they were in
  const rateOf = new Map([[sneaker.id, 1.5], [boot.id, 3], [loafer.id, 2.25], [sandal.id, 0.8]]);
  const logs = [];
  for (const a of att) {
    const e = emps.find((x) => x.id === a.employeeId)!;
    if (e.payType !== "Piece" || a.status === "Absent" || a.status === "Leave") continue;
    const p = products[(a.date.getDate() + emps.indexOf(e)) % products.length];
    const rate = rateOf.get(p.categoryId!)!;
    const base = p.categoryId === boot.id ? 8 : p.categoryId === sandal.id ? 30 : 16;
    const quantity = Math.round((a.status === "Half Day" ? base / 2 : base) + (a.date.getDate() % 4));
    logs.push({ employeeId: e.id, productId: p.id, date: a.date, quantity, rate, amount: quantity * rate });
  }
  await prisma.productionLog.createMany({ data: logs });

  // ----- Expenses -----
  await prisma.expense.createMany({
    data: [
      { category: "Materials", amount: 4200, note: "Leather restock" },
      { category: "Utilities", amount: 650, note: "Electricity" },
      { category: "Wages", amount: 5300, note: "Weekly wages" },
      { category: "Overhead", amount: 900, note: "Factory rent" },
    ],
  });

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
