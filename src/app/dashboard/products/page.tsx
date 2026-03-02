"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "@/lib/types";
import { Pencil } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editSku, setEditSku] = useState("");
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/products", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | Product[]
        | { error?: string }
        | null;

      if (!res.ok) {
        setError(
          (data as { error?: string } | null)?.error ??
            "Failed to load products",
        );
        setLoading(false);
        return;
      }

      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  async function addProduct() {
    if (!productName.trim()) {
      setError("Product name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        product_name: productName,
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | Product
      | { error?: string }
      | null;

    setSaving(false);

    if (!res.ok) {
      setError(
        (data as { error?: string } | null)?.error ?? "Failed to add product",
      );
      return;
    }

    setProducts((prev) => [data as Product, ...prev]);
    setSku("");
    setProductName("");
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setEditName(product.product_name ?? "");
    setEditSku(product.sku ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  async function updateProduct() {
    if (!editingProduct) return;

    const nextProductName = editName.trim();
    const nextSku = editSku.trim();

    if (!nextProductName) {
      setEditError("Product name is required");
      return;
    }

    setUpdating(true);
    setEditError(null);

    const res = await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: editingProduct.product_id,
        product_name: nextProductName,
        sku: nextSku,
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | Product
      | { error?: string }
      | null;

    setUpdating(false);

    if (!res.ok) {
      setEditError(
        (data as { error?: string } | null)?.error ??
          "Failed to update product",
      );
      return;
    }

    const updated = data as Product;
    setProducts((prev) =>
      prev.map((product) =>
        product.product_id === updated.product_id ? updated : product,
      ),
    );
    setEditOpen(false);
    setEditingProduct(null);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Products
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Add products that can be linked to forms.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-300">
            Product updates here don&apos;t automatically affect forms already
            linked to products. Please reselect products on each form after
            editing.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="product-name" className="mb-1.5 block">
                Product name
              </Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Starter Pack"
              />
            </div>
            <div>
              <Label htmlFor="product-sku" className="mb-1.5 block">
                SKU (optional)
              </Label>
              <Input
                id="product-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. ST-001"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void addProduct()} disabled={saving}>
              {saving ? "Adding..." : "Add Product"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </CardContent>
      </Card>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-32">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-slate-500 dark:text-slate-400"
                >
                  Loading products...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-slate-500 dark:text-slate-400"
                >
                  No products yet.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell>{product.product_name || "—"}</TableCell>
                  <TableCell>{product.sku || "—"}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {new Date(product.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(product)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details. Form-linked products may need reselection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-product-name" className="mb-1.5 block">
                Product name
              </Label>
              <Input
                id="edit-product-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Starter Pack"
              />
            </div>
            <div>
              <Label htmlFor="edit-product-sku" className="mb-1.5 block">
                SKU (optional)
              </Label>
              <Input
                id="edit-product-sku"
                value={editSku}
                onChange={(e) => setEditSku(e.target.value)}
                placeholder="e.g. ST-001"
              />
            </div>
            {editError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {editError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void updateProduct()} disabled={updating}>
              {updating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
