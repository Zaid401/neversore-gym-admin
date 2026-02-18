import { IndianRupee, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OrdersChart from "@/components/dashboard/OrdersChart";
import RecentActivity from "@/components/dashboard/RecentActivity";

const stats = [
  { title: "Total Revenue", value: "₹12,45,800", change: "+12% from last month", changeType: "positive" as const, icon: IndianRupee },
  { title: "Total Orders", value: "1,284", change: "+8% from last month", changeType: "positive" as const, icon: ShoppingCart },
  { title: "Active Customers", value: "3,462", change: "+5% new this month", changeType: "positive" as const, icon: Users },
  { title: "Low Stock Items", value: "12", change: "Needs attention", changeType: "negative" as const, icon: AlertTriangle },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
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
