"use client";

import { useState } from "react";
import { createOrder } from "./actions";
import { Button, Field, Input, Select } from "@/components/ui";

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  color: string | null;
  size: string | null;
};
type Customer = { id: string; name: string };

type Line = { productId: string; quantity: number; unitPrice: number };

export function OrderForm({
  products,
  customers,
}: {
  products: Product[];
  customers: Customer[];
}) {
  const [lines, setLines] = useState<Line[]>([
    { productId: "", quantity: 1, unitPrice: 0 },
  ]);

  function update(i: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );
  }
  function onPick(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    update(i, { productId, unitPrice: p ? p.price : 0 });
  }
  function addLine() {
    setLines((p) => [...p, { productId: "", quantity: 1, unitPrice: 0 }]);
  }
  function removeLine(i: number) {
    setLines((p) => p.filter((_, idx) => idx !== i));
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const valid = lines.filter((l) => l.productId && l.quantity > 0);

  return (
    <form action={createOrder} className="space-y-5">
      <input type="hidden" name="lines" value={JSON.stringify(valid)} />

      <div className="grid gap-4">
        <Field label="Customer">
          <Select name="customerId" required defaultValue="">
            <option value="" disabled>
              Select customer…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes">
          <Input name="notes" placeholder="Optional" />
        </Field>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Line items</p>
        <div className="space-y-3">
          {lines.map((l, i) => {
            return (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Select
                      value={l.productId}
                      onChange={(e) => onPick(i, e.target.value)}
                      aria-label="Product"
                    >
                      <option value="">Select product…</option>
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.name} ({pr.color} {pr.size}) · {pr.sku}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="h-9 w-9 shrink-0 rounded-lg text-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 items-end">
                  <label className="block">
                    <span className="block text-xs text-slate-500 mb-1">Qty (pairs)</span>
                    <Input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs text-slate-500 mb-1">Unit price</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={l.unitPrice}
                      onChange={(e) => update(i, { unitPrice: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <div className="text-right">
                    <span className="block text-xs text-slate-500 mb-1">Subtotal</span>
                    <span className="block py-2 text-sm font-medium">
                      ${(l.quantity * l.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-3 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          + Add another product
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-sm text-slate-500">Order total</span>
        <span className="text-lg font-semibold">${total.toFixed(2)}</span>
      </div>

      <Button>Create order</Button>
    </form>
  );
}
