import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money, date } from "@/lib/format";
import { Card, Table, Th, Td, Badge } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { Logo } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: { include: { customer: true, lines: { include: { product: true } } } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!invoice) notFound();

  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, invoice.amount - paid);
  const customer = invoice.order?.customer;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href="/finance" className="text-sm text-slate-500 hover:text-slate-900">
          ← Finance
        </Link>
        <PrintButton />
      </div>

      <Card className="p-5 sm:p-8 print:border-0 print:shadow-none print:p-0">
        <div className="flex flex-wrap justify-between gap-6 mb-8">
          <div>
            <Logo size="h-10 w-10 mb-2 print:bg-slate-900" />
            <p className="text-lg font-semibold">Shoe Factory</p>
            <p className="text-sm text-slate-500">Footwear manufacturing</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight">INVOICE</p>
            <p className="font-mono text-sm mt-1">{invoice.number}</p>
            <p className="text-sm text-slate-500">Date: {date(invoice.createdAt)}</p>
            {invoice.dueDate && (
              <p className="text-sm text-slate-500">Due: {date(invoice.dueDate)}</p>
            )}
            {invoice.order && (
              <p className="text-sm text-slate-500">Order: {invoice.order.number}</p>
            )}
            <div className="mt-2">
              <Badge
                color={
                  invoice.status === "Paid"
                    ? "green"
                    : invoice.status === "Partial"
                    ? "amber"
                    : "red"
                }
              >
                {invoice.status}
              </Badge>
            </div>
          </div>
        </div>

        {customer && (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Bill to</p>
            <p className="font-medium">{customer.name}</p>
            {customer.company && <p className="text-sm text-slate-600">{customer.company}</p>}
            {customer.address && <p className="text-sm text-slate-600">{customer.address}</p>}
            {customer.phone && <p className="text-sm text-slate-600">{customer.phone}</p>}
            {customer.email && <p className="text-sm text-slate-600">{customer.email}</p>}
          </div>
        )}

        <Table>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Unit price</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {invoice.order?.lines.map((l) => (
              <tr key={l.id}>
                <Td>
                  <div className="font-medium">{l.product.name}</div>
                  <div className="text-xs text-slate-500">
                    {l.product.sku}
                    {l.product.color && ` · ${l.product.color}`}
                    {l.product.size && ` · Size ${l.product.size}`}
                  </div>
                </Td>
                <Td className="text-right">{l.quantity}</Td>
                <Td className="text-right">{money(l.unitPrice)}</Td>
                <Td className="text-right">{money(l.quantity * l.unitPrice)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="mt-6 ml-auto w-full sm:w-72 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Total</span>
            <span className="font-semibold">{money(invoice.amount)}</span>
          </div>
          {invoice.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-slate-500">
              <span>
                Paid {date(p.createdAt)} · {p.method}
              </span>
              <span>-{money(p.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
            <span className="font-semibold">Balance due</span>
            <span className="font-semibold">{money(balance)}</span>
          </div>
        </div>

        <p className="mt-12 text-center text-xs text-slate-500">Thank you for your business.</p>
      </Card>
    </div>
  );
}
