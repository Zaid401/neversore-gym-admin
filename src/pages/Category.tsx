import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Paginator from "@/components/ui/Paginator";

const PAGE_SIZE = 15;

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  products: { count: number }[];
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function Category() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "", image_url: "", sort_order: "0" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);

  const { data: { categories, total } = { categories: [], total: 0 }, isLoading } = useQuery<{ categories: Category[]; total: number }>({
    queryKey: ["categories-admin", page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("categories")
        .select("id,name,slug,description,image_url,is_active,sort_order,products(count)", { count: "exact" })
        .order("sort_order")
        .range(from, to);
      if (error) throw error;
      return { categories: (data || []) as Category[], total: count ?? 0 };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = form.image_url;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `category-${Date.now()}.${ext}`;
        const { error: storageErr } = await supabase.storage
          .from("category-images")
          .upload(path, imageFile, { upsert: true });
        if (storageErr) throw storageErr;
        const { data: urlData } = supabase.storage.from("category-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      } else if (editCat?.image_url && !imageUrl) {
        // No new file picked — keep the existing stored URL
        imageUrl = editCat.image_url;
      }

      // Preserve existing slug when editing — changing slugs breaks product page URLs
      const payload = {
        name: form.name,
        ...(editCat ? {} : { slug: slugify(form.name) }),
        description: form.description || null,
        image_url: imageUrl || null,
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (editCat) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({ ...payload, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-admin"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: editCat ? "Category updated" : "Category created" });
      closeModal();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories-admin"] }),
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditCat(null);
    setForm({ name: "", description: "", image_url: "", sort_order: "0" });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setForm({ name: cat.name, description: cat.description || "", image_url: cat.image_url || "", sort_order: String(cat.sort_order) });
    setImageFile(null);
    setImagePreview(cat.image_url || null);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditCat(null); setImageFile(null); setImagePreview(null); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold  text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage your product categories</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold uppercase text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Slug</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Products</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Sort Order</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No categories yet</td></tr>
              ) : categories.map((cat) => (
                <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{cat.name}</td>
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{cat.slug}</td>
                  <td className="px-6 py-4">{Array.isArray(cat.products) ? cat.products[0]?.count ?? 0 : 0}</td>
                  <td className="px-6 py-4 text-muted-foreground">{cat.sort_order}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cat.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(cat)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleMutation.mutate({ id: cat.id, is_active: cat.is_active })}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title={cat.is_active ? "Deactivate" : "Activate"}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Paginator page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-center bg-background/80 backdrop-blur-sm p-4 !mt-0" onClick={closeModal}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl animate-fade-in min-h-fit flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
              <h2 className="font-heading text-base sm:text-lg font-bold">{editCat ? "Edit Category" : "Add Category"}</h2>
              <button onClick={closeModal} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
            </div>
            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 overflow-y-auto">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-16 resize-none" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }}
                />
                {imagePreview ? (
                  <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border bg-secondary">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); setForm({ ...form, image_url: "" }); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 rounded-full bg-background/80 p-1 text-foreground hover:bg-background transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary px-4 py-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Click to upload image
                  </button>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}
                className="w-full rounded-lg bg-primary px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold uppercase  text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editCat ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
