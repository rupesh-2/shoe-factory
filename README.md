# 👟 Shoe Factory Management System

An internal web app to run a shoe factory from one place — **Inventory**, **Customers**, **Staff**, and **Finance** — backed by a real database. Built for the Linear project _Shoe Factory Management System_ (CORE team).

## Tech stack

- **Next.js 16** (App Router, React Server Components, Server Actions)
- **TypeScript** + **Tailwind CSS v4**
- **Prisma 7** ORM with a **SQLite** database (via the `better-sqlite3` driver adapter)

## Getting started

```bash
npm install
cp .env.example .env   # DATABASE_URL for the SQLite file
npm run db:migrate     # create the SQLite database (first time only)
npm run db:seed        # load sample data
npm run dev            # start the dev server
```

Then open the URL printed in the terminal (http://localhost:3000, or the next free
port such as 3001 if 3000 is already in use).

### Useful scripts

| Script            | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Start the development server                         |
| `npm run build`   | Production build                                     |
| `npm run start`   | Run the production build                             |
| `npm run db:seed` | Load sample data                                     |
| `npm run db:reset`| Wipe DB, re-run migrations, and re-seed             |
| `npm run db:studio`| Open Prisma Studio to browse/edit data directly    |

## Features

### 📊 Dashboard
Cross-domain KPIs — revenue, expenses, profit, inventory value, SKU/customer/staff
counts, open orders, recent orders, and low-stock alerts.

### 📦 Inventory
- Finished goods (SKUs) and raw materials with stock levels
- Reorder thresholds with **low-stock / reorder** flags
- Quick stock adjustments (in/out) that record **stock movements**
- Supplier directory linked to materials
- Live inventory valuation
- **Stock history** — every movement from production, purchases, shipments and adjustments

### 🧑 Customers & 🧾 Orders
- Customer directory (retail / wholesale) with lifetime value
- Order builder with multiple line items
- **Order pipeline**: Draft → Confirmed → In Production → Shipped → Delivered → Closed
- Confirming an order **auto-generates its invoice**
- Shipping an order **deducts finished-goods stock** — blocked if there aren't enough pairs
- **Plan production for shortfall** creates batches for whatever stock can't cover
- Printable **invoice** (Print / Save PDF)

### 🏭 Production
- **Bill of materials** per product (materials per pair) with material cost and margin
- **Production batches**: Planned → In Progress → Completed
- Starting a batch **consumes raw materials** (blocked with a clear message if short)
- Completing a batch **adds finished pairs** to stock; cancelling returns materials

### 🛒 Purchasing
- **Purchase orders** to suppliers with multiple material lines
- **Reorder suggestions** for low materials, one-click reorder PO per supplier
- Receiving a PO **adds material stock**, updates unit cost and books a Materials expense

### 👷 Staff
- Employee records (role, department, wage rate)
- Daily **attendance** (Present / Half Day / Absent / Leave) for any date, plus "mark all present"
- Daily wage bill and present-today counts
- Activate / deactivate employees

### 📋 Daily Output (piece-rate pay)
- Each product has a **shoe type** (Sneaker, Boot, Loafer, Sandal…) with a fixed **pay per pair**
- Log how many pairs each worker made each day; the rate is locked in at entry, so changing a
  rate only affects new entries
- Day totals per worker and month-to-date piece pay

### 💵 Payroll
- Each employee is paid either **per pair** (piece rate, from Daily Output) or a **daily wage**
- Daily staff: days worked × daily wage (half days count 0.5)
- Pay one employee (with an adjusted amount for advances/deductions) or **pay all**
- Payments book a Wages expense in Finance

### 💰 Finance
- Invoices with balances and status (Unpaid / Partial / Paid)
- Record full or partial **payments**
- **Expenses** by category (Materials, Wages, Utilities, Overhead)
- **Profit & Loss** breakdown and outstanding **receivables**

## Data model

`Supplier`, `RawMaterial`, `Product`, `StockMovement`, `Customer`, `Order`,
`OrderLine`, `Employee`, `Attendance`, `Invoice`, `Payment`, `Expense`, `BomItem`,
`ProductionBatch`, `PurchaseOrder`, `PurchaseLine`, `PayrollRun`, `Category`, `ProductionLog`.
See [`prisma/schema.prisma`](prisma/schema.prisma).

## Project structure

```
src/
  app/
    page.tsx              # Dashboard
    inventory/            # Inventory module (+ actions.ts)
    customers/            # Customer directory
    orders/               # Orders list, [id] detail, order builder, pipeline
    production/           # Bill of materials + production batches
    purchasing/           # Purchase orders + reorder suggestions
    staff/                # Staff & attendance
    output/               # Daily output per worker + piece rates per shoe type
    payroll/              # Monthly payroll (daily wage or piece rate)
    finance/              # Invoices (+ printable view), payments, expenses, P&L
  components/             # Shared UI (cards, tables, badges, inputs) + Sidebar
  lib/                    # Prisma client, formatting/date helpers, payroll calc
prisma/
  schema.prisma          # Data model
  seed.ts                # Sample data
```

## Notes

This is a v1 with no authentication yet — it assumes trusted internal use. Adding
email/password login with role-based access (Admin, Inventory Manager, Sales,
HR, Accountant) is the next milestone in the PRD.
