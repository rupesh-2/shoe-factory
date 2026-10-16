"use client";

import { useState } from "react";
import { createPurchaseOrder } from "./actions";
import { Button, Field, Input, Select } from "@/components/ui";

type Material = {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  supplierId: string | null;
};
type Supplier = { id: string; name: string };

type Line = { rawMaterialId: string; quantity: number; unitCost: number };

const emptyLine: Line = { rawMaterialId: "", quantity: 1, unitCost: 0 };

export function PurchaseForm({
  materials,
  suppliers,
}: {
  materials: Material[];
  suppliers: Supplier[];
}) {
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine]);

  function update(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function onPick(i: number, rawMaterialId: string) {
    const m = materials.find((x) => x.id === rawMaterialId);
    update(i, { rawMaterialId, unitCost: m ? m.unitCost : 0 });
  }

  // Materials from the chosen supplier first, then the rest
  const sorted = [...materials].sort(
    (a, b) => Number(b.supplierId === supplierId) - Number(a.supplierId === supplierId)
  );
  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const valid = lines.filter((l) => l.rawMaterialId && l.quantity > 0);

  return (
    <form
      action={async (fd) => {
        await createPurchaseOrder(fd);
        setLines([emptyLine]);
      }}
      className="space-y-5"
    >
      <input type="hidden" name="lines" value={JSON.stringify(valid)} />

      <div className="grid gap-4">
        <Field label="Supplier">
          <Select
            name="supplierId"
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="" disabled>
              Select supplier…
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes">
          <Input name="notes" placeholder="Optional" />
        </Field>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Materials</p>
        <div className="space-y-3">
          {lines.map((l, i) => {
            const m = materials.find((x) => x.id === l.rawMaterialId);
            return (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Select
                      value={l.rawMaterialId}
                      onChange={(e) => onPick(i, e.target.value)}
                      aria-label="Material"
                    >
                      <option value="">Select material…</option>
                      {sorted.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.name} ({mat.unit})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                    className="h-9 w-9 shrink-0 rounded-lg text-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 items-end">
                  <label className="block">
                    <span className="block text-xs text-slate-500 mb-1">
                      Qty{m ? ` (${m.unit})` : ""}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={l.quantity}
                      onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs text-slate-500 mb-1">Unit cost</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={l.unitCost}
                      onChange={(e) => update(i, { unitCost: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <div className="text-right">
                    <span className="block text-xs text-slate-500 mb-1">Subtotal</span>
                    <span className="block py-2 text-sm font-medium">
                      ${(l.quantity * l.unitCost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setLines((p) => [...p, emptyLine])}
          className="mt-3 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          + Add another material
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-sm text-slate-500">PO total</span>
        <span className="text-lg font-semibold">${total.toFixed(2)}</span>
      </div>

      <Button>Create purchase order</Button>
    </form>
  );
}
