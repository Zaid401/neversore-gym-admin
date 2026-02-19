import { useState } from "react";
import { Search, Eye, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Paginator from "@/components/ui/Paginator";

const PAGE_SIZE = 10;

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-blue-500/10 text-blue-400",
  processing: "bg-primary/10 text-primary",
  shipped: "bg-purple-500/10 text-purple-400",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  return_requested: "bg-orange-500/10 text-orange-400",
  returned: "bg-muted text-muted-foreground",
};

const ALL_STATUSES = ["confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function Orders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [updateModal, setUpdateModal] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: { orders, total } = { orders: [], total: 0 }, isLoading } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ["orders", statusFilter, page, search],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("orders")
        .select("id,order_number,status,payment_status,total_amount,created_at,profiles!user_id(full_name,email)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (search.trim()) q = q.ilike("order_number", `%${search.trim()}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return { orders: (data || []) as Order[], total: count ?? 0 };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_update_order_status", {
        p_order_id: updateModal!.id,
        p_new_status: newStatus,
        p_tracking_number: trackingNumber || null,
        p_tracking_url: trackingUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Order status updated" });
      setUpdateModal(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openUpdate = (o: Order) => {
    setUpdateModal(o);
    setNewStatus(o.status);
    setTrackingNumber("");
    setTrackingUrl("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search orders..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Order</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No orders found</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 font-medium font-mono text-xs">{order.order_number}</td>
                  <td className="px-6 py-4">{order.profiles?.full_name ?? order.profiles?.email ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-6 py-4 font-medium">₹{order.total_amount.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewOrder(order)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => openUpdate(order)} className="rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors">
                        Update
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

      {/* View Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setViewOrder(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold">Order {viewOrder.order_number}</h2>
              <button onClick={() => setViewOrder(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Customer</dt><dd className="font-medium">{viewOrder.profiles?.full_name ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{viewOrder.profiles?.email}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{new Date(viewOrder.created_at).toLocaleDateString("en-IN")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-bold text-primary">₹{viewOrder.total_amount.toLocaleString("en-IN")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[viewOrder.status] ?? ""}`}>{viewOrder.status}</span></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Payment</dt><dd>{viewOrder.payment_status}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {updateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setUpdateModal(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold">Update Order Status</h2>
              <button onClick={() => setUpdateModal(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">New Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tracking Number (optional)</label>
                <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tracking URL (optional)</label>
                <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
