import { IndianRupee, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OrdersChart from "@/components/dashboard/OrdersChart";
import RecentActivity from "@/components/dashboard/RecentActivity";

interface DashboardStats {
  total_orders: number;
  total_revenue: number;
  orders_today: number;
  revenue_today: number;
  pending_orders: number;
  total_customers: number;
  low_stock_variants: number;
  pending_returns: number;
  pending_reviews: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_dashboard_stats");
      if (error) throw error;
      return data as DashboardStats;
    },
    refetchInterval: 60000, // refresh every minute
  });

  const formatCurrency = (val: number) =>
    `₹${val?.toLocaleString("en-IN") ?? "0"}`;

  const statCards = [
    {
      title: "Total Revenue",
      value: isLoading ? "—" : formatCurrency(stats?.total_revenue ?? 0),
      change: isLoading ? "" : `Today: ${formatCurrency(stats?.revenue_today ?? 0)}`,
      changeType: "positive" as const,
      icon: IndianRupee,
    },
    {
      title: "Total Orders",
      value: isLoading ? "—" : String(stats?.total_orders ?? 0),
      change: isLoading ? "" : `${stats?.pending_orders ?? 0} pending`,
      changeType: "neutral" as const,
      icon: ShoppingCart,
    },
    {
      title: "Active Customers",
      value: isLoading ? "—" : String(stats?.total_customers ?? 0),
      change: isLoading ? "" : `Today: ${stats?.orders_today ?? 0} new orders`,
      changeType: "positive" as const,
      icon: Users,
    },
    {
      title: "Low Stock Items",
      value: isLoading ? "—" : String(stats?.low_stock_variants ?? 0),
      change: isLoading ? "" : `${stats?.pending_returns ?? 0} return requests`,
      changeType: (stats?.low_stock_variants ?? 0) > 0 ? "negative" as const : "positive" as const,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, i) => (
          <StatCard key={stat.title} {...stat} index={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RevenueChart />
        <OrdersChart />
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
