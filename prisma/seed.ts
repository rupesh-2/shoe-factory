import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean slate (order matters for FKs)
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.supplier.deleteMany();
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

  // ----- Products (finished goods) -----
  const products = await Promise.all([
    prisma.product.create({ data: { sku: "SNK-BLK-42", name: "Classic Sneaker", model: "Classic", size: "42", color: "Black", price: 59.99, cost: 28, quantity: 120, reorderLevel: 30 } }),
    prisma.product.create({ data: { sku: "SNK-WHT-41", name: "Classic Sneaker", model: "Classic", size: "41", color: "White", price: 59.99, cost: 28, quantity: 18, reorderLevel: 30 } }),
    prisma.product.create({ data: { sku: "BOOT-BRN-43", name: "Leather Boot", model: "Ranger", size: "43", color: "Brown", price: 119.0, cost: 62, quantity: 45, reorderLevel: 20 } }),
    prisma.product.create({ data: { sku: "LOAF-TAN-40", name: "Formal Loafer", model: "Executive", size: "40", color: "Tan", price: 89.5, cost: 41, quantity: 8, reorderLevel: 15 } }),
    prisma.product.create({ data: { sku: "SND-BLU-39", name: "Summer Sandal", model: "Breeze", size: "39", color: "Blue", price: 34.99, cost: 14, quantity: 200, reorderLevel: 40 } }),
  ]);

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

  // ----- Employees + Attendance -----
  const emps = await Promise.all([
    prisma.employee.create({ data: { name: "Imran Khan", role: "Production Lead", department: "Production", wageRate: 45, phone: "9822200001" } }),
    prisma.employee.create({ data: { name: "Fatima Noor", role: "Stitcher", department: "Production", wageRate: 28, phone: "9822200002" } }),
    prisma.employee.create({ data: { name: "David Roy", role: "Accountant", department: "Finance", wageRate: 50, phone: "9822200003" } }),
    prisma.employee.create({ data: { name: "Lena Park", role: "Sales Rep", department: "Sales", wageRate: 38, phone: "9822200004" } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const e of emps) {
    await prisma.attendance.create({ data: { employeeId: e.id, date: today, status: "Present", hours: 8 } });
  }

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
