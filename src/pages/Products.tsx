import { useState, useRef } from "react";
import { Plus, Search, Pencil, Trash2, X, Loader2, ImagePlus, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Paginator from "@/components/ui/Paginator";

const PAGE_SIZE = 10;

interface Category { id: string; name: string; }

interface ProductVariant {
  stock_quantity: number;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  short_description: string | null;
  description: string | null;
  categories: Category[] | null;
  product_variants: ProductVariant[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  short_description: string | null;
  description: string | null;
  categories: Category | null;
  product_variants: ProductVariant[];
}

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "", base_price: "", sale_price: "", category_id: "",
    short_description: "", description: "", is_featured: false,
  });
  // Images: up to 5 slots. Each slot is a preview URL (existing) or a File (new)
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null, null, null]);
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null, null, null]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ products: Product[]; total: number }>({
    queryKey: ["products", page, search],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("products")
        .select(
          "id,name,slug,base_price,sale_price,is_active,is_featured,category_id,short_description,description,categories(id,name),product_variants(stock_quantity)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      // Map Supabase array format to single object format for categories
      const products = (data || []).map((row): Product => ({
        ...row,
        categories: row.categories?.[0] ?? null,
      }));
      return { products, total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: slugify(form.name),
        base_price: parseFloat(form.base_price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        category_id: form.category_id || null,
        short_description: form.short_description || null,
        description: form.description || null,
        is_featured: form.is_featured,
        is_active: true,
      };

      let productId = editProduct?.id;
      if (editProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editProduct.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Upload new images
      const uploadPromises = imageFiles.map(async (file, idx) => {
        if (!file || !productId) return;
        const ext = file.name.split(".").pop();
        const path = `${productId}/${idx}-${Date.now()}.${ext}`;
        const { error: storageErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
        if (storageErr) return; // Don't fail whole save if one image fails
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        await supabase.from("product_images").insert({
          product_id: productId,
          image_url: urlData.publicUrl,
          sort_order: idx,
          is_primary: idx === 0,
        });
      });
      await Promise.all(uploadPromises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: editProduct ? "Product updated" : "Product created" });
      closeModal();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: "", base_price: "", sale_price: "", category_id: "", short_description: "", description: "", is_featured: false });
    setImagePreviews([null, null, null, null, null]);
    setImageFiles([null, null, null, null, null]);
    setShowModal(true);
  };

  const openEdit = async (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, base_price: String(p.base_price), sale_price: p.sale_price ? String(p.sale_price) : "",
      category_id: p.category_id || "", short_description: p.short_description || "",
      description: p.description || "", is_featured: p.is_featured,
    });
    // Load existing images for this product
    const { data: imgs } = await supabase
      .from("product_images")
      .select("image_url,sort_order")
      .eq("product_id", p.id)
      .order("sort_order");
    const previews: (string | null)[] = [null, null, null, null, null];
    (imgs || []).forEach((img) => { if (img.sort_order < 5) previews[img.sort_order] = img.image_url; });
    setImagePreviews(previews);
    setImageFiles([null, null, null, null, null]);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditProduct(null); };

  const handleFileChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreviews((prev) => { const n = [...prev]; n[idx] = ev.target?.result as string; return n; });
    };
    reader.readAsDataURL(file);
    setImageFiles((prev) => { const n = [...prev]; n[idx] = file; return n; });
  };

  const clearImage = (idx: number) => {
    setImagePreviews((prev) => { const n = [...prev]; n[idx] = null; return n; });
    setImageFiles((prev) => { const n = [...prev]; n[idx] = null; return n; });
    if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = "";
  };

  const getTotalStock = (p: Product) => p.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search products…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Stock</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No products found</td></tr>
              ) : products.map((product) => {
                const totalStock = getTotalStock(product);
                return (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {product.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <span className="font-medium">{product.name}</span>
                          {product.is_featured && <span className="ml-2 text-xs text-warning">★ Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{product.categories?.name ?? "—"}</td>
                    <td className="px-6 py-4 font-medium">
                      {product.sale_price ? (
                        <div>
                          <span className="text-primary">₹{product.sale_price.toLocaleString("en-IN")}</span>
                          <span className="ml-1 text-xs line-through text-muted-foreground">₹{product.base_price.toLocaleString("en-IN")}</span>
                        </div>
                      ) : `₹${product.base_price.toLocaleString("en-IN")}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={totalStock <= 5 ? "text-destructive font-medium" : ""}>{totalStock}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${product.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(product)} title="Edit"
                          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActiveMutation.mutate({ id: product.id, is_active: product.is_active })}
                          title={product.is_active ? "Deactivate" : "Activate"}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-center bg-background/80 backdrop-blur-sm p-4 !mt-0" onClick={closeModal}>
          <div className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-2xl rounded-lg border border-border bg-card shadow-xl animate-fade-in max-h-[90vh] sm:max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
              <h2 className="font-heading text-base sm:text-lg font-bold">{editProduct ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={closeModal} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
            </div>
            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 overflow-y-auto">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Product Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Base Price (₹) *</label>
                  <input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Sale Price (₹)</label>
                  <input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">— No Category —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Short Description</label>
                <input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="featured" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4 accent-primary" />
                <label htmlFor="featured" className="text-sm text-muted-foreground">Mark as featured</label>
              </div>

              {/* Image Upload â€” max 5 */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Product Images (max 5)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg border-2 border-dashed border-border overflow-hidden group">
                      {imagePreviews[idx] ? (
                        <>
                          <img src={imagePreviews[idx]!} alt={`img-${idx}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => clearImage(idx)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-center text-[10px] text-white py-0.5">Primary</span>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[idx]?.click()}
                          className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        >
                          <ImagePlus className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="text-[9px] sm:text-[10px]">{idx === 0 ? "Primary" : `#${idx + 1}`}</span>
                        </button>
                      )}
                      <input
                        ref={(el) => { fileInputRefs.current[idx] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(idx, e)}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground">First image will be set as primary. JPG, PNG, WebP supported.</p>
              </div>

              <button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.base_price || saveMutation.isPending}
                className="w-full rounded-lg bg-primary px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editProduct ? "Update Product" : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
