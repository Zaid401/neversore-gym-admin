import { useState } from "react";
import { Search, Filter, Eye } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

const orders = [
  { id: "#ORD-1284", customer: "Rahul Sharma", date: "2026-02-18", total: "₹4,599", status: "paid" as const },
  { id: "#ORD-1283", customer: "Arjun Patel", date: "2026-02-17", total: "₹2,899", status: "pending" as const },
  { id: "#ORD-1282", customer: "Vikram Singh", date: "2026-02-17", total: "₹6,499", status: "paid" as const },
  { id: "#ORD-1281", customer: "Karan Mehta", date: "2026-02-16", total: "₹3,199", status: "cancelled" as const },
  { id: "#ORD-1280", customer: "Amit Gupta", date: "2026-02-16", total: "₹5,799", status: "paid" as const },
  { id: "#ORD-1279", customer: "Deepak Joshi", date: "2026-02-15", total: "₹1,999", status: "pending" as const },
  { id: "#ORD-1278", customer: "Rohan Kapoor", date: "2026-02-15", total: "₹8,299", status: "paid" as const },
];

export default function Orders() {
  const [search, setSearch] = useState("");

  const filtered = orders.filter(
    (o) => o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Order ID</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{order.id}</td>
                  <td className="px-6 py-4">{order.customer}</td>
                  <td className="px-6 py-4 text-muted-foreground">{order.date}</td>
                  <td className="px-6 py-4 font-medium">{order.total}</td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4">
                    <button className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
