import { useState, useRef } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  ImagePlus,
  XCircle,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Paginator from "@/components/ui/Paginator";

const PAGE_SIZE = 10;

interface Category {
  id: string;
  name: string;
}

interface ProductVariant {
  stock_quantity: number;
}

/** One image upload slot per color */
interface ImageSlot {
  existingId: string | null;
  url: string | null;
  file: File | null;
}

function emptySlots(): ImageSlot[] {
  return Array.from({ length: 5 }, () => ({ existingId: null, url: null, file: null }));
}

interface ColorEntry {
  _key: string;
  id: string | null;
  color_name: string;
  color_hex: string;
  images: ImageSlot[];
  expanded: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_best_selling: boolean;
  category_id: string | null;
  short_description: string | null;
  description: string | null;
  categories: Category | null;
  product_variants: ProductVariant[];
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const GLOBAL_SIZES = [
  { id: "S",    size_label: "S"    },
  { id: "M",    size_label: "M"    },
  { id: "L",    size_label: "L"    },
  { id: "XL",   size_label: "XL"   },
  { id: "XXL",  size_label: "XXL"  },
  { id: "XXXL", size_label: "XXXL" },
];

export default function Products() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    base_price: "",
    sale_price: "",
    category_id: "",
    short_description: "",
    description: "",
    is_featured: false,
    is_best_selling: false,
  });

  const colorKeyCounter = useRef(0);
  const [colorEntries, setColorEntries] = useState<ColorEntry[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
          "id,name,slug,base_price,sale_price,is_active,is_featured,is_best_selling,category_id,short_description,description,categories(id,name),product_variants(stock_quantity)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      const products = (data || []).map(
        (row): Product => ({
          ...row,
          categories: (row.categories as unknown as Category | null) ?? null,
        }),
      );
      return { products, total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name")
        .eq("is_active", true)
        .order("name");
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
        is_best_selling: form.is_best_selling,
        is_active: true,
      };

      if (form.is_best_selling) {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_best_selling", true)
          .neq("id", editProduct?.id ?? "");
        if ((count ?? 0) >= 4) {
          throw new Error(
            "Only 4 products can be marked as best selling at a time. Please unmark another product first.",
          );
        }
      }

      // 1. Upsert product
      let productId = editProduct?.id;
      if (editProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editProduct.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }
      if (!productId) throw new Error("No product ID");

      const validColors = colorEntries.filter((c) => c.color_name.trim());

      if (validColors.length > 0 && selectedSizeIds.size > 0) {
        const nameSlug = slugify(form.name);

        // 2. Update or insert colors
        const finalColors: Array<{ id: string; abbrev: string; _key: string }> = [];
        for (let sortIdx = 0; sortIdx < validColors.length; sortIdx++) {
          const entry = validColors[sortIdx];
          const abbrev = entry.color_name.split(" ").map((w) => w[0]).join("").toUpperCase();
          if (entry.id) {
            await supabase
              .from("product_colors")
              .update({ color_name: entry.color_name.trim(), color_hex: entry.color_hex, sort_order: sortIdx })
              .eq("id", entry.id);
            finalColors.push({ id: entry.id, abbrev, _key: entry._key });
          } else {
            const { data: newColor } = await supabase
              .from("product_colors")
              .insert({ product_id: productId, color_name: entry.color_name.trim(), color_hex: entry.color_hex, sort_order: sortIdx })
              .select("id")
              .single();
            if (newColor) finalColors.push({ id: newColor.id, abbrev, _key: entry._key });
          }
        }

        // 3. Delete removed colors (cascades to product_variants)
        const { data: existingColors } = await supabase.from("product_colors").select("id").eq("product_id", productId);
        const keepColorIds = finalColors.map((fc) => fc.id);
        const toDeleteColors = (existingColors || []).filter((c) => !keepColorIds.includes(c.id)).map((c) => c.id);
        if (toDeleteColors.length > 0) {
          await supabase.from("product_colors").delete().in("id", toDeleteColors);
        }

        // 4. Manage per-product sizes
        const { data: existingSizesArr } = await supabase
          .from("product_sizes")
          .select("id,size_label")
          .eq("product_id", productId);
        const existingSizeMap = new Map((existingSizesArr || []).map((s) => [s.size_label, s.id]));

        const sizeIdByLabel = new Map<string, string>();
        for (const sizeLabel of selectedSizeIds) {
          if (existingSizeMap.has(sizeLabel)) {
            sizeIdByLabel.set(sizeLabel, existingSizeMap.get(sizeLabel)!);
          } else {
            const sortIdx = GLOBAL_SIZES.findIndex((s) => s.id === sizeLabel);
            const { data: newSize } = await supabase
              .from("product_sizes")
              .insert({ product_id: productId, size_label: sizeLabel, sort_order: sortIdx })
              .select("id")
              .single();
            if (newSize) sizeIdByLabel.set(sizeLabel, newSize.id);
          }
        }
        // Delete deselected sizes (cascades to product_variants)
        const toDeleteSizes = (existingSizesArr || []).filter((s) => !selectedSizeIds.has(s.size_label)).map((s) => s.id);
        if (toDeleteSizes.length > 0) {
          await supabase.from("product_sizes").delete().in("id", toDeleteSizes);
        }

        // 5. Upsert variants (color x size) — ignoreDuplicates preserves stock
        for (const { id: colorId, abbrev } of finalColors) {
          for (const sizeLabel of selectedSizeIds) {
            const dbSizeId = sizeIdByLabel.get(sizeLabel);
            if (!dbSizeId) continue;
            const sku = `${nameSlug}-${abbrev}-${sizeLabel}`.toUpperCase();
            await supabase
              .from("product_variants")
              .upsert(
                { product_id: productId, color_id: colorId, size_id: dbSizeId, sku, stock_quantity: 10, is_active: true },
                { onConflict: "product_id,color_id,size_id", ignoreDuplicates: true },
              );
          }
        }

        // 6. Per-color images — delete all, re-insert with correct color_id
        await supabase.from("product_images").delete().eq("product_id", productId);

        for (let colorIdx = 0; colorIdx < finalColors.length; colorIdx++) {
          const { id: colorId, _key: colorKey } = finalColors[colorIdx];
          const colorEntry = validColors.find((c) => c._key === colorKey)!;

          for (let slotIdx = 0; slotIdx < 5; slotIdx++) {
            const slot = colorEntry.images[slotIdx];
            if (!slot.url && !slot.file) continue;

            let imageUrl = slot.url;
            if (slot.file) {
              const ext = slot.file.name.split(".").pop();
              const path = `${productId}/${colorId}-${slotIdx}-${Date.now()}.${ext}`;
              const { error: storageErr } = await supabase.storage
                .from("product-images")
                .upload(path, slot.file, { upsert: true });
              if (!storageErr) {
                const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
                imageUrl = urlData.publicUrl;
              }
            }

            if (imageUrl) {
              await supabase.from("product_images").insert({
                product_id: productId,
                color_id: colorId,
                image_url: imageUrl,
                sort_order: slotIdx,
                is_primary: colorIdx === 0 && slotIdx === 0,
              });
            }
          }
        }
      }
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
    setForm({ name: "", base_price: "", sale_price: "", category_id: "", short_description: "", description: "", is_featured: false, is_best_selling: false });
    setColorEntries([]);
    setSelectedSizeIds(new Set());
    setShowModal(true);
  };

  const openEdit = async (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      base_price: String(p.base_price),
      sale_price: p.sale_price ? String(p.sale_price) : "",
      category_id: p.category_id || "",
      short_description: p.short_description || "",
      description: p.description || "",
      is_featured: p.is_featured,
      is_best_selling: p.is_best_selling,
    });

    const { data: colors } = await supabase
      .from("product_colors")
      .select("id,color_name,color_hex")
      .eq("product_id", p.id)
      .order("sort_order");

    const { data: allImages } = await supabase
      .from("product_images")
      .select("id,color_id,image_url,sort_order")
      .eq("product_id", p.id)
      .order("sort_order");

    const imagesByColor = new Map<string, { id: string; color_id: string | null; image_url: string; sort_order: number }[]>();
    for (const img of allImages || []) {
      const key = img.color_id ?? "__global__";
      if (!imagesByColor.has(key)) imagesByColor.set(key, []);
      imagesByColor.get(key)!.push(img);
    }

    // Global images (color_id = null) are distributed to the first color as a migration path
    const globalImgs = imagesByColor.get("__global__") || [];

    setColorEntries(
      (colors || []).map((c, idx) => {
        const slots = emptySlots();
        const colorImgs = imagesByColor.get(c.id) || [];
        // For the first color: fall back to global images if no color-specific ones exist
        const sourceImgs = colorImgs.length > 0 ? colorImgs : (idx === 0 ? globalImgs : []);
        for (const img of sourceImgs) {
          const slotIdx = Math.min(img.sort_order ?? 0, 4);
          slots[slotIdx] = { existingId: img.id, url: img.image_url, file: null };
        }
        return { _key: c.id, id: c.id, color_name: c.color_name, color_hex: c.color_hex, images: slots, expanded: true };
      }),
    );

    // Load sizes directly from product_sizes (per-product)
    const { data: productSizes } = await supabase
      .from("product_sizes")
      .select("size_label")
      .eq("product_id", p.id);
    setSelectedSizeIds(new Set((productSizes || []).map((s) => s.size_label)));

    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditProduct(null); };

  const getTotalStock = (p: Product) =>
    p.product_variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0;

  const addColor = () => {
    colorKeyCounter.current += 1;
    setColorEntries((prev) => [
      ...prev,
      { _key: `new-${colorKeyCounter.current}`, id: null, color_name: "", color_hex: "#000000", images: emptySlots(), expanded: true },
    ]);
  };

  const removeColor = (key: string) => setColorEntries((prev) => prev.filter((c) => c._key !== key));

  const updateColor = (key: string, field: "color_name" | "color_hex", value: string) =>
    setColorEntries((prev) => prev.map((c) => (c._key === key ? { ...c, [field]: value } : c)));

  const toggleColorExpanded = (key: string) =>
    setColorEntries((prev) => prev.map((c) => (c._key === key ? { ...c, expanded: !c.expanded } : c)));

  const toggleSize = (sizeId: string) =>
    setSelectedSizeIds((prev) => {
      const next = new Set(prev);
      if (next.has(sizeId)) next.delete(sizeId);
      else next.add(sizeId);
      return next;
    });

  const handleColorImageChange = (colorKey: string, slotIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = ev.target?.result as string;
      setColorEntries((prev) =>
        prev.map((c) => {
          if (c._key !== colorKey) return c;
          const newImages = [...c.images];
          newImages[slotIdx] = { existingId: newImages[slotIdx].existingId, url: preview, file };
          return { ...c, images: newImages };
        }),
      );
    };
    reader.readAsDataURL(file);
  };

  const clearColorImage = (colorKey: string, slotIdx: number) => {
    setColorEntries((prev) =>
      prev.map((c) => {
        if (c._key !== colorKey) return c;
        const newImages = [...c.images];
        newImages[slotIdx] = { existingId: null, url: null, file: null };
        return { ...c, images: newImages };
      }),
    );
    const refKey = `${colorKey}-${slotIdx}`;
    if (fileInputRefs.current[refKey]) fileInputRefs.current[refKey]!.value = "";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold uppercase text-primary-foreground hover:bg-primary/90 transition-colors"
        >
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
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No products found</td></tr>
              ) : (
                products.map((product) => {
                  const totalStock = getTotalStock(product);
                  return (
                    <tr key={product.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {product.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <span className="font-medium">{product.name}</span>
                            {product.is_featured && <span className="ml-2 text-xs text-warning">&#9733; Featured</span>}
                            {product.is_best_selling && <span className="ml-2 text-xs text-orange-500">&#127942; Best Seller</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{product.categories?.name ?? "—"}</td>
                      <td className="px-6 py-4 font-medium">
                        {product.sale_price ? (
                          <div>
                            <span className="text-primary">&#8377;{product.sale_price.toLocaleString("en-IN")}</span>
                            <span className="ml-1 text-xs line-through text-muted-foreground">&#8377;{product.base_price.toLocaleString("en-IN")}</span>
                          </div>
                        ) : `&#8377;${product.base_price.toLocaleString("en-IN")}`}
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
                          <button onClick={() => openEdit(product)} title="Edit" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => toggleActiveMutation.mutate({ id: product.id, is_active: product.is_active })} title={product.is_active ? "Deactivate" : "Activate"} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-center bg-background/80 backdrop-blur-sm p-4 !mt-0" onClick={closeModal}>
          <div className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-2xl rounded-lg border border-border bg-card shadow-xl animate-fade-in max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
              <h2 className="font-heading text-base sm:text-lg font-bold">{editProduct ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={closeModal} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
            </div>

            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 overflow-y-auto">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Product Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Base Price (Rs.) *</label>
                  <input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Sale Price (Rs.)</label>
                  <input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">No Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Short Description</label>
                <input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="featured" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <label htmlFor="featured" className="text-sm text-muted-foreground">Mark as featured</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="best_selling" checked={form.is_best_selling} onChange={(e) => setForm({ ...form, is_best_selling: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <label htmlFor="best_selling" className="text-sm text-muted-foreground">Mark as best selling <span className="text-xs text-orange-500">(max 4)</span></label>
                </div>
              </div>

              {/* Colors and per-color images */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    Product Colors &amp; Images
                  </label>
                  <button type="button" onClick={addColor} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors">
                    <Plus className="h-3 w-3" /> Add Color
                  </button>
                </div>

                {colorEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No colors yet. Click "Add Color" to define variants and upload images per color.</p>
                ) : (
                  <div className="space-y-3">
                    {colorEntries.map((entry, colorIdx) => (
                      <div key={entry._key} className="rounded-lg border border-border bg-secondary/40 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <input type="color" value={entry.color_hex} onChange={(e) => updateColor(entry._key, "color_hex", e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5 shrink-0" title="Pick color" />
                          <input value={entry.color_name} onChange={(e) => updateColor(entry._key, "color_name", e.target.value)} placeholder="e.g. Midnight Black" className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                          {colorIdx === 0 && <span className="text-[10px] text-primary font-semibold whitespace-nowrap shrink-0">PRIMARY</span>}
                          <button type="button" onClick={() => toggleColorExpanded(entry._key)} className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0" title={entry.expanded ? "Collapse" : "Expand"}>
                            {entry.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          <button type="button" onClick={() => removeColor(entry._key)} className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {entry.expanded && (
                          <div className="border-t border-border px-3 pb-3 pt-2">
                            <p className="text-[11px] text-muted-foreground mb-2">
                              Images for <span className="font-semibold text-foreground">{entry.color_name || "this color"}</span> (up to 5, first = primary on website)
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {entry.images.map((slot, slotIdx) => {
                                const refKey = `${entry._key}-${slotIdx}`;
                                return (
                                  <div key={slotIdx} className="relative aspect-square rounded-lg border-2 border-dashed border-border overflow-hidden group">
                                    {slot.url ? (
                                      <>
                                        <img src={slot.url} alt={`color-img-${slotIdx}`} className="h-full w-full object-cover" />
                                        <button type="button" onClick={() => clearColorImage(entry._key, slotIdx)} className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                          <XCircle className="h-4 w-4" />
                                        </button>
                                        {colorIdx === 0 && slotIdx === 0 && (
                                          <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-center text-[9px] text-white py-0.5">Primary</span>
                                        )}
                                      </>
                                    ) : (
                                      <button type="button" onClick={() => fileInputRefs.current[refKey]?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                                        <ImagePlus className="h-4 w-4" />
                                        <span className="text-[9px]">{slotIdx === 0 ? "Main" : `#${slotIdx + 1}`}</span>
                                      </button>
                                    )}
                                    <input ref={(el) => { fileInputRefs.current[refKey] = el; }} type="file" accept="image/*" className="hidden" onChange={(e) => handleColorImageChange(entry._key, slotIdx, e)} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sizes */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Available Sizes
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(variants auto-generated for each color x size)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {GLOBAL_SIZES.map((size) => {
                    const active = selectedSizeIds.has(size.id);
                    return (
                      <button key={size.id} type="button" onClick={() => toggleSize(size.id)} className={`rounded border px-3 py-1.5 text-xs font-bold uppercase transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                        {size.size_label}
                      </button>
                    );
                  })}
                </div>
                {colorEntries.filter((c) => c.color_name.trim()).length > 0 && selectedSizeIds.size > 0 && (
                  <p className="mt-1.5 text-xs text-success">
                    {colorEntries.filter((c) => c.color_name.trim()).length} color{colorEntries.filter((c) => c.color_name.trim()).length !== 1 ? "s" : ""} x {selectedSizeIds.size} size{selectedSizeIds.size !== 1 ? "s" : ""} = {colorEntries.filter((c) => c.color_name.trim()).length * selectedSizeIds.size} variant{colorEntries.filter((c) => c.color_name.trim()).length * selectedSizeIds.size !== 1 ? "s" : ""} will be generated
                  </p>
                )}
              </div>

              <button
                onClick={() => saveMutation.mutate()}
                disabled={!form.name || !form.base_price || saveMutation.isPending}
                className="w-full rounded-lg bg-primary px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold uppercase text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
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