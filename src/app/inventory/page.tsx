import { prisma } from "@/lib/prisma";
import { money, num } from "@/lib/format";
import {
  Card,
  PageHeader,
  Table,
  Th,
  Td,
  Badge,
  Button,
  Field,
  Input,
  Select,
  StatCard,
  AddDetails,
  LinkButton,
  SearchBar,
  EmptyState,
} from "@/components/ui";
import {
  addProduct,
  addMaterial,
  addSupplier,
  adjustProductStock,
  adjustMaterialStock,
  setProductCategory,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim().toLowerCase();
  const match = (...vals: (string | null | undefined)[]) =>
    !term || vals.some((v) => v?.toLowerCase().includes(term));
  const [products, materials, suppliers, categories] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.rawMaterial.findMany({
      orderBy: { name: "asc" },
      include: { supplier: true },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const productValue = products.reduce((s, p) => s + p.cost * p.quantity, 0);
  const materialValue = materials.reduce((s, m) => s + m.unitCost * m.quantity, 0);
  const lowCount =
    products.filter((p) => p.quantity <= p.reorderLevel).length +
    materials.filter((m) => m.quantity <= m.reorderLevel).length;

  const shownProducts = products.filter((p) => match(p.sku, p.name, p.model, p.color, p.size));
  const shownMaterials = materials.filter((m) => match(m.name, m.supplier?.name));

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Finished goods, raw materials, and suppliers."
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <SearchBar placeholder="Search SKU, product, material" defaultValue={q} />
            <LinkButton href="/inventory/history" variant="secondary">
              Stock history
            </LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Finished goods value" value={money(productValue)} tone="blue" />
        <StatCard label="Raw material value" value={money(materialValue)} tone="blue" />
        <StatCard label="SKUs" value={num(products.length)} />
        <StatCard
          label="Low-stock items"
          value={num(lowCount)}
          tone={lowCount > 0 ? "red" : "green"}
        />
      </div>

      {/* ---------- Finished goods ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Finished Goods</h2>
        <AddDetails summary="Add product">
          <Card className="p-5">
            <form action={addProduct} className="grid sm:grid-cols-3 gap-4">
              <Field label="SKU">
                <Input name="sku" required placeholder="SNK-BLK-42" />
              </Field>
              <Field label="Name">
                <Input name="name" required placeholder="Classic Sneaker" />
              </Field>
              <Field label="Shoe type">
                <Select name="categoryId" defaultValue="">
                  <option value="">— none —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Model">
                <Input name="model" placeholder="Classic" />
              </Field>
              <Field label="Size">
                <Input name="size" placeholder="42" />
              </Field>
              <Field label="Color">
                <Input name="color" placeholder="Black" />
              </Field>
              <Field label="Quantity">
                <Input name="quantity" type="number" defaultValue={0} />
              </Field>
              <Field label="Price ($)">
                <Input name="price" type="number" step="0.01" defaultValue={0} />
              </Field>
              <Field label="Cost ($)">
                <Input name="cost" type="number" step="0.01" defaultValue={0} />
              </Field>
              <Field label="Reorder level">
                <Input name="reorderLevel" type="number" defaultValue={0} />
              </Field>
              <div className="sm:col-span-3">
                <Button>Save product</Button>
              </div>
            </form>
          </Card>
        </AddDetails>
      </div>

      <Card className="mb-10">
        <Table>
          <thead>
            <tr>
              <Th>SKU</Th>
              <Th>Product</Th>
              <Th>Shoe type</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">Stock</Th>
              <Th>Status</Th>
              <Th>Adjust stock</Th>
            </tr>
          </thead>
          <tbody>
            {shownProducts.map((p) => {
              const low = p.quantity <= p.reorderLevel;
              return (
                <tr key={p.id}>
                  <Td className="font-mono text-xs">{p.sku}</Td>
                  <Td>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {[p.color, p.size].filter(Boolean).join(" · ")}
                    </div>
                  </Td>
                  <Td>
                    <form action={setProductCategory} className="flex items-center gap-2">
                      <input type="hidden" name="productId" value={p.id} />
                      <Select
                        name="categoryId"
                        defaultValue={p.categoryId ?? ""}
                        className="w-28"
                        aria-label={`Shoe type for ${p.sku}`}
                      >
                        <option value="">— none —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                      <Button variant="secondary">Set</Button>
                    </form>
                  </Td>
                  <Td className="text-right">{money(p.price)}</Td>
                  <Td className="text-right font-medium">{p.quantity}</Td>
                  <Td>
                    {low ? (
                      <Badge color="red">Low (≤ {p.reorderLevel})</Badge>
                    ) : (
                      <Badge color="green">OK</Badge>
                    )}
                  </Td>
                  <Td>
                    <form action={adjustProductStock} className="flex items-center gap-2">
                      <input type="hidden" name="productId" value={p.id} />
                      <Input
                        name="delta"
                        type="number"
                        placeholder="+/-"
                        className="w-20"
                      />
                      <Button variant="secondary">Apply</Button>
                    </form>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {shownProducts.length === 0 && <EmptyState message="No products match your search." />}
      </Card>

      {/* ---------- Raw materials ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Raw Materials</h2>
        <AddDetails summary="Add material">
          <Card className="p-5">
            <form action={addMaterial} className="grid sm:grid-cols-3 gap-4">
              <Field label="Name">
                <Input name="name" required placeholder="Full-grain Leather" />
              </Field>
              <Field label="Unit">
                <Input name="unit" placeholder="kg, m, pair..." />
              </Field>
              <Field label="Supplier">
                <Select name="supplierId" defaultValue="">
                  <option value="">— none —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantity">
                <Input name="quantity" type="number" step="0.01" defaultValue={0} />
              </Field>
              <Field label="Unit cost ($)">
                <Input name="unitCost" type="number" step="0.01" defaultValue={0} />
              </Field>
              <Field label="Reorder level">
                <Input name="reorderLevel" type="number" step="0.01" defaultValue={0} />
              </Field>
              <div className="sm:col-span-3">
                <Button>Save material</Button>
              </div>
            </form>
          </Card>
        </AddDetails>
      </div>

      <Card className="mb-10">
        <Table>
          <thead>
            <tr>
              <Th>Material</Th>
              <Th>Supplier</Th>
              <Th className="text-right">Unit cost</Th>
              <Th className="text-right">Stock</Th>
              <Th>Status</Th>
              <Th>Adjust stock</Th>
            </tr>
          </thead>
          <tbody>
            {shownMaterials.map((m) => {
              const low = m.quantity <= m.reorderLevel;
              return (
                <tr key={m.id}>
                  <Td className="font-medium">{m.name}</Td>
                  <Td className="text-slate-500">{m.supplier?.name ?? "—"}</Td>
                  <Td className="text-right">{money(m.unitCost)}</Td>
                  <Td className="text-right font-medium">
                    {m.quantity} <span className="text-slate-500">{m.unit}</span>
                  </Td>
                  <Td>
                    {low ? (
                      <Badge color="amber">Reorder</Badge>
                    ) : (
                      <Badge color="green">OK</Badge>
                    )}
                  </Td>
                  <Td>
                    <form action={adjustMaterialStock} className="flex items-center gap-2">
                      <input type="hidden" name="rawMaterialId" value={m.id} />
                      <Input
                        name="delta"
                        type="number"
                        step="0.01"
                        placeholder="+/-"
                        className="w-20"
                      />
                      <Button variant="secondary">Apply</Button>
                    </form>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {shownMaterials.length === 0 && <EmptyState message="No materials match your search." />}
      </Card>

      {/* ---------- Suppliers ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Suppliers</h2>
        <AddDetails summary="Add supplier">
          <Card className="p-5">
            <form action={addSupplier} className="grid sm:grid-cols-3 gap-4">
              <Field label="Name">
                <Input name="name" required placeholder="Premium Leather Co." />
              </Field>
              <Field label="Contact person">
                <Input name="contact" />
              </Field>
              <Field label="Phone">
                <Input name="phone" />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" />
              </Field>
              <Field label="Address">
                <Input name="address" />
              </Field>
              <div className="sm:col-span-3">
                <Button>Save supplier</Button>
              </div>
            </form>
          </Card>
        </AddDetails>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Supplier</Th>
              <Th>Contact</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td className="text-slate-500">{s.contact ?? "—"}</Td>
                <Td className="text-slate-500">{s.phone ?? "—"}</Td>
                <Td className="text-slate-500">{s.email ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
