import { useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import Paginator from "@/components/ui/Paginator";

const PAGE_SIZE = 10;

interface Customer {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: { customers, total } = { customers: [], total: 0 }, isLoading } = useQuery<{ customers: Customer[]; total: number }>({
    queryKey: ["customers", page, search],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // First, get profiles
      let profileQuery = supabase
        .from("profiles")
        .select("id,full_name,email,created_at", { count: "exact" })
        .eq("role", "customer")
        .order("created_at", { ascending: false })
        .range(from, to);
      
      // Apply search filter if provided
      if (search.trim()) {
        profileQuery = profileQuery.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
      }
      
      const { data: profilesData, error: profilesError, count } = await profileQuery;
      
      if (profilesError) throw profilesError;
      if (!profilesData || profilesData.length === 0) {
        return { customers: [], total: count ?? 0 };
      }
      
      const userIds = profilesData.map(p => p.id);
      
      // Get order stats for these users
      const { data: orderStats } = await supabase
        .from("orders")
        .select("user_id,total_amount,shipping_phone,created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });
      
      // Aggregate data per user
      const customerMap = new Map<string, Customer>();
      profilesData.forEach(profile => {
        customerMap.set(profile.id, {
          ...profile,
          phone: null,
          order_count: 0,
          total_spent: 0,
        });
      });
      
      // Calculate stats from orders
      orderStats?.forEach(order => {
        const customer = customerMap.get(order.user_id);
        if (customer) {
          customer.order_count++;
          customer.total_spent += Number(order.total_amount) || 0;
          // Use phone from most recent order (first in ordered list)
          if (!customer.phone && order.shipping_phone) {
            customer.phone = order.shipping_phone;
          }
        }
      });
      
      return { 
        customers: Array.from(customerMap.values()), 
        total: count ?? 0 
      };
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Total Orders</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Total Spent</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No customers found</td></tr>
              ) : customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(customer.full_name ?? customer.email).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{customer.full_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{customer.email}</td>
                  <td className="px-6 py-4 text-muted-foreground">{customer.phone ?? "—"}</td>
                  <td className="px-6 py-4">{customer.order_count}</td>
                  <td className="px-6 py-4 font-medium">{customer.total_spent > 0 ? `₹${customer.total_spent.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(customer.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Paginator page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}
