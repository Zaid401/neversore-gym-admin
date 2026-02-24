import { useState } from "react";
import { AlertTriangle, Package, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Paginator from "@/components/ui/Paginator";

const PAGE_SIZE = 15;

interface Variant {
  id: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  products: { name: string } | null;
  product_colors: { color_name: string } | null;
  product_sizes: { size_label: string } | null;
}

interface VariantFromDB {
  id: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  products: { name: string }[] | null;
  product_colors: { color_name: string }[] | null;
  product_sizes: { size_label: string }[] | null;
}

export default function Inventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [adjustVariant, setAdjustVariant] = useState<Variant | null>(null);
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState("")

  const { data: { variants, total } = { variants: [], total: 0 }, isLoading } = useQuery<{ variants: Variant[]; total: number }>({
    queryKey: ["inventory", page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("product_variants")
        .select("id,sku,stock_quantity,low_stock_threshold,products(name),product_colors(color_name),product_sizes(size_label)", { count: "exact" })
        .order("stock_quantity", { ascending: true })
        .range(from, to);
      if (error) throw error;
      // Map Supabase array format to single object format
      const variants = (data || []).map((row: VariantFromDB): Variant => ({
        ...row,
        products: row.products?.[0] ?? null,
        product_colors: row.product_colors?.[0] ?? null,
        product_sizes: row.product_sizes?.[0] ?? null,
      }));
      return { variants, total: count ?? 0 };
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const qty = parseInt(newQty);
      if (isNaN(qty) || qty < 0) throw new Error("Invalid quantity");
      const diff = qty - adjustVariant!.stock_quantity;
      const previousQty = adjustVariant!.stock_quantity;
      const { error: updateErr } = await supabase.from("product_variants").update({ stock_quantity: qty }).eq("id", adjustVariant!.id);
      if (updateErr) throw updateErr;
      const { error: logErr } = await supabase.from("inventory_logs").insert({
        variant_id: adjustVariant!.id,
        change_quantity: diff,
        previous_quantity: previousQty,
        new_quantity: qty,
        reason: reason || (diff >= 0 ? "Restock — admin adjustment" : "Manual reduction — admin adjustment"),
      });
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Stock updated" });
      setAdjustVariant(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const getStatus = (v: Variant) => {
    if (v.stock_quantity === 0) return "out";
    if (v.stock_quantity <= v.low_stock_threshold) return "low";
    return "ok";
  };

  const lowCount = variants.filter((v) => getStatus(v) !== "ok").length;

  const openAdjust = (v: Variant) => {
    setAdjustVariant(v);
    setNewQty(String(v.stock_quantity));
    setReason("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span><strong>{lowCount}</strong> variant{lowCount !== 1 ? "s" : ""} need restocking (low or out of stock)</span>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Variant</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Stock</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Threshold</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : variants.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No variants found</td></tr>
              ) : variants.map((v) => {
                const status = getStatus(v);
                return (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {v.products?.name ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{v.sku}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {[v.product_colors?.color_name, v.product_sizes?.size_label].filter(Boolean).join(" / ")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={status !== "ok" ? "text-destructive font-semibold" : ""}>{v.stock_quantity}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{v.low_stock_threshold}</td>
                    <td className="px-6 py-4">
                      {status === "low" && <span className="inline-flex items-center gap-1 text-xs font-medium text-warning"><AlertTriangle className="h-3 w-3" /> Low Stock</span>}
                      {status === "out" && <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" /> Out of Stock</span>}
                      {status === "ok" && <span className="text-xs font-medium text-success">In Stock</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => openAdjust(v)} className="rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors">Adjust</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Paginator page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />

      {adjustVariant && (
        <div className="fixed inset-0 z-50 flex justify-center bg-background/80 backdrop-blur-sm p-4 !mt-0" onClick={() => setAdjustVariant(null)}>
          <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-xl animate-fade-in max-h-[95vh] md:max-h-fit lg:max-h-fit flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
              <h2 className="font-heading text-base sm:text-lg font-bold">Adjust Stock</h2>
              <button onClick={() => setAdjustVariant(null)} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
            </div>
            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 overflow-y-auto">
              <p className="text-sm text-muted-foreground">{adjustVariant.products?.name} — {[adjustVariant.product_colors?.color_name, adjustVariant.product_sizes?.size_label].filter(Boolean).join(" / ")}</p>
              <p className="text-xs text-muted-foreground font-mono">{adjustVariant.sku} · Current: <strong>{adjustVariant.stock_quantity}</strong></p>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">New Quantity</label>
                <input type="number" min="0" value={newQty} onChange={(e) => setNewQty(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Reason (optional)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending || newQty === ""}
                className="w-full rounded-lg bg-primary px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {adjustMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
