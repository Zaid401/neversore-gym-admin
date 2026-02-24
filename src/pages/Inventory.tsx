import { useState, useMemo } from "react";
import { AlertTriangle, Package, Loader2, X, Search } from "lucide-react";
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
  product_name: string;
  color_name: string;
  size_label: string;
}

type SortField = "stock_quantity" | "product_name" | "sku";
type SortDir = "asc" | "desc";
type StockFilter = "all" | "low" | "out" | "in";

export default function Inventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [adjustVariant, setAdjustVariant] = useState<Variant | null>(null);
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState("");

  // Search, filter, sort state
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortField, setSortField] = useState<SortField>("stock_quantity");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Fetch ALL variants (we filter/sort client-side for instant search)
  const { data: allVariants = [], isLoading } = useQuery<Variant[]>({
    queryKey: ["inventory-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id,sku,stock_quantity,low_stock_threshold,product_id,color_id,size_id,products(name),product_colors(color_name),product_sizes(size_label)")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((row: Record<string, unknown>): Variant => {
        const prod = row.products as { name: string } | null;
        const color = row.product_colors as { color_name: string } | null;
        const size = row.product_sizes as { size_label: string } | null;
        return {
          id: row.id as string,
          sku: row.sku as string,
          stock_quantity: row.stock_quantity as number,
          low_stock_threshold: row.low_stock_threshold as number,
          product_name: prod?.name ?? "Unknown",
          color_name: color?.color_name ?? "",
          size_label: size?.size_label ?? "",
        };
      });
    },
  });

  // Client-side filter, search, sort
  const filtered = useMemo(() => {
    let list = [...allVariants];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (v) =>
          v.product_name.toLowerCase().includes(q) ||
          v.sku.toLowerCase().includes(q) ||
          v.color_name.toLowerCase().includes(q) ||
          v.size_label.toLowerCase().includes(q)
      );
    }

    // Stock filter
    if (stockFilter === "out") list = list.filter((v) => v.stock_quantity === 0);
    else if (stockFilter === "low") list = list.filter((v) => v.stock_quantity > 0 && v.stock_quantity <= v.low_stock_threshold);
    else if (stockFilter === "in") list = list.filter((v) => v.stock_quantity > v.low_stock_threshold);

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "stock_quantity") cmp = a.stock_quantity - b.stock_quantity;
      else if (sortField === "product_name") cmp = a.product_name.localeCompare(b.product_name);
      else if (sortField === "sku") cmp = a.sku.localeCompare(b.sku);
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [allVariants, search, stockFilter, sortField, sortDir]);

  // Paginate client-side
  const total = filtered.length;
  const variants = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      qc.invalidateQueries({ queryKey: ["inventory-all"] });
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

  const lowCount = allVariants.filter((v) => getStatus(v) !== "ok").length;

  const openAdjust = (v: Variant) => {
    setAdjustVariant(v);
    setNewQty(String(v.stock_quantity));
    setReason("");
  };

  // Reset page when filters change
  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
  const handleFilterChange = (val: StockFilter) => { setStockFilter(val); setPage(1); };

  return (
    <div className="space-y-6 animate-fade-in">
      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span><strong>{lowCount}</strong> variant{lowCount !== 1 ? "s" : ""} need restocking (low or out of stock)</span>
        </div>
      )}

      {/* Search, Filter, Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by product name, SKU, color..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Filter */}
        <select
          value={stockFilter}
          onChange={(e) => handleFilterChange(e.target.value as StockFilter)}
          className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Status</option>
          <option value="out">Out of Stock</option>
          <option value="low">Low Stock</option>
          <option value="in">In Stock</option>
        </select>

        {/* Sort */}
        <select
          value={`${sortField}-${sortDir}`}
          onChange={(e) => {
            const [f, d] = e.target.value.split("-") as [SortField, SortDir];
            setSortField(f);
            setSortDir(d);
          }}
          className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="stock_quantity-asc">Stock: Low → High</option>
          <option value="stock_quantity-desc">Stock: High → Low</option>
          <option value="product_name-asc">Name: A → Z</option>
          <option value="product_name-desc">Name: Z → A</option>
          <option value="sku-asc">SKU: A → Z</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground">{total} variant{total !== 1 ? "s" : ""} found</p>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Stock</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Threshold</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : variants.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No variants found</td></tr>
              ) : variants.map((v) => {
                const status = getStatus(v);
                return (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">{v.product_name}</p>
                          <p className="text-xs text-muted-foreground">{v.color_name}{v.size_label ? ` / ${v.size_label}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{v.sku}</td>
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
              <div>
                <p className="text-sm font-semibold text-foreground">{adjustVariant.product_name}</p>
                <p className="text-sm text-muted-foreground">{adjustVariant.color_name}{adjustVariant.size_label ? ` / ${adjustVariant.size_label}` : ""}</p>
              </div>
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
