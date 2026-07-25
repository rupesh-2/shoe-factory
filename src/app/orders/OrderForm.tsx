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

      <div className="grid sm:grid-cols-2 gap-4">
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
        <div className="space-y-2">
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId);
            return (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    value={l.productId}
                    onChange={(e) => onPick(i, e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name} ({pr.color} {pr.size}) · {pr.sku}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) =>
                      update(i, { quantity: Number(e.target.value) || 0 })
                    }
                    aria-label="Quantity"
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    step="0.01"
                    value={l.unitPrice}
                    onChange={(e) =>
                      update(i, { unitPrice: Number(e.target.value) || 0 })
                    }
                    aria-label="Unit price"
                  />
                </div>
                <div className="w-24 text-right text-sm text-slate-600 pb-2">
                  ${(l.quantity * l.unitPrice).toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="pb-2 text-slate-400 hover:text-red-500 text-lg"
                  aria-label="Remove line"
                  disabled={lines.length === 1}
                >
                  ×
                </button>
                {p && p.price !== l.unitPrice ? null : null}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-2 text-sm text-slate-600 hover:text-slate-900"
        >
          + Add line
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
