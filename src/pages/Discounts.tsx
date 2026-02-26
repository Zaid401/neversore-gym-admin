import { useState } from "react";
import { Plus, Loader2, X, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Paginator from "@/components/ui/Paginator";

const PAGE_SIZE = 10;

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  times_used: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export default function Discounts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_discount_amount: "",
    usage_limit: "", per_user_limit: "", valid_from: "", valid_until: "",
  });

  const { data: { coupons, total } = { coupons: [], total: 0 }, isLoading } = useQuery<{ coupons: Coupon[]; total: number }>({
    queryKey: ["coupons", page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("coupons")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { coupons: data || [], total: count ?? 0 };
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coupons").insert({
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        per_user_limit: form.per_user_limit ? parseInt(form.per_user_limit) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast({ title: "Coupon created" });
      setShowModal(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast({ title: "Coupon deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const closeModal = () => {
    setShowModal(false);
    setForm({ code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_discount_amount: "", usage_limit: "", per_user_limit: "", valid_from: "", valid_until: "" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold uppercase  text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Value</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Min. Order</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Uses</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Valid Until</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No coupons yet</td></tr>
              ) : coupons.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-primary">{c.code}</td>
                  <td className="px-6 py-4 text-muted-foreground capitalize">{c.discount_type}</td>
                  <td className="px-6 py-4 font-medium">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}
                    {c.max_discount_amount && <span className="ml-1 text-xs text-muted-foreground">(max ₹{c.max_discount_amount})</span>}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{c.min_order_amount ? `₹${c.min_order_amount}` : "—"}</td>
                  <td className="px-6 py-4">{c.times_used}{c.usage_limit ? `/${c.usage_limit}` : ""}</td>
                  <td className="px-6 py-4 text-muted-foreground">{c.valid_until ? new Date(c.valid_until).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleMutation.mutate({ id: c.id, is_active: c.is_active })} className="flex items-center gap-1.5 text-xs font-medium transition-colors" title={c.is_active ? "Deactivate" : "Activate"}>
                      {c.is_active
                        ? <><ToggleRight className="h-5 w-5 text-success" /><span className="text-success">Active</span></>
                        : <><ToggleLeft className="h-5 w-5 text-muted-foreground" /><span className="text-muted-foreground">Inactive</span></>}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => { if (confirm(`Delete coupon "${c.code}"?`)) deleteMutation.mutate(c.id); }}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete coupon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Paginator page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-lg font-bold">Add Coupon</h2>
              <button onClick={closeModal} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Code *</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE10"
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-mono uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Discount Type *</label>
                  <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Value *</label>
                  <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Min. Order (₹)</label>
                  <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Max Discount (₹)</label>
                  <input type="number" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Total Usage Limit</label>
                  <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Per-User Limit</label>
                  <input type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Valid From</label>
                  <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Valid Until</label>
                  <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <button onClick={() => createMutation.mutate()} disabled={!form.code || !form.discount_value || createMutation.isPending}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold uppercase  text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
