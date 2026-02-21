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
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address_line_1: string;
  shipping_address_line_2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
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
      const searchTerm = search.trim();
      
      // Fetch orders with shipping details
      let q = supabase
        .from("orders")
        .select("id,order_number,status,payment_status,total_amount,created_at,shipping_full_name,shipping_phone,shipping_address_line_1,shipping_address_line_2,shipping_city,shipping_state,shipping_postal_code,shipping_country", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      
      // Search by order number or customer name
      if (searchTerm) {
        q = q.or(`order_number.ilike.%${searchTerm}%,shipping_full_name.ilike.%${searchTerm}%`);
      }
      
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
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
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
                  <td className="px-6 py-4">{order.shipping_full_name ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-6 py-4 font-medium">₹{order.total_amount.toLocaleString("en-IN")}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewOrder(order)} className="rounded-md px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </button>
                      <button onClick={() => openUpdate(order)} className="rounded-md px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
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
        <div className="fixed inset-0 z-50 flex justify-center bg-background/80 backdrop-blur-sm p-4 !mt-0" onClick={() => setViewOrder(null)}>
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl max-h-[95vh] md:max-h-[85vh] lg:max-h-[80vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-heading text-xl font-bold">Order Details</h2>
              <button onClick={() => setViewOrder(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="space-y-6 p-6 overflow-y-auto">
              {/* Order Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Order Information</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Order Number</dt>
                    <dd className="font-mono font-medium">{viewOrder.order_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Date</dt>
                    <dd className="font-medium">{new Date(viewOrder.created_at).toLocaleDateString("en-IN")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Status</dt>
                    <dd><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[viewOrder.status] ?? ""}`}>{viewOrder.status.replace("_", " ")}</span></dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Payment Status</dt>
                    <dd className="font-medium capitalize">{viewOrder.payment_status}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground mb-0.5">Total Amount</dt>
                    <dd className="font-bold text-lg text-primary">₹{viewOrder.total_amount.toLocaleString("en-IN")}</dd>
                  </div>
                </dl>
              </div>
              
              {/* Shipping Address */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Shipping Address</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Customer Name</dt>
                    <dd className="font-medium">{viewOrder.shipping_full_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Phone Number</dt>
                    <dd className="font-medium">{viewOrder.shipping_phone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-0.5">Address</dt>
                    <dd className="font-medium">
                      {viewOrder.shipping_address_line_1}
                      {viewOrder.shipping_address_line_2 && (
                        <>
                          <br />
                          {viewOrder.shipping_address_line_2}
                        </>
                      )}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-muted-foreground mb-0.5">City</dt>
                      <dd className="font-medium">{viewOrder.shipping_city}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-0.5">State</dt>
                      <dd className="font-medium">{viewOrder.shipping_state}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-0.5">Postal Code</dt>
                      <dd className="font-medium">{viewOrder.shipping_postal_code}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-0.5">Country</dt>
                      <dd className="font-medium">{viewOrder.shipping_country}</dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {updateModal && (
        <div className="fixed inset-0 z-50 flex justify-center bg-background/80 backdrop-blur-sm p-4 !mt-0" onClick={() => setUpdateModal(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-xl animate-fade-in self-start mt-20 max-h-[95vh] md:max-h-[85vh] lg:max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-heading text-lg font-bold">Update Order Status</h2>
              <button onClick={() => setUpdateModal(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6 overflow-y-auto">
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
