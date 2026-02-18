import RevenueChart from "@/components/dashboard/RevenueChart";
import OrdersChart from "@/components/dashboard/OrdersChart";
import { TrendingUp, Users, ShoppingCart, Package } from "lucide-react";

const metrics = [
  { label: "Conversion Rate", value: "3.2%", icon: TrendingUp },
  { label: "Avg. Order Value", value: "₹3,850", icon: ShoppingCart },
  { label: "Returning Customers", value: "42%", icon: Users },
  { label: "Top Product", value: "Power Joggers", icon: Package },
];

export default function Analytics() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-5 card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <m.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="font-heading text-lg font-bold">{m.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart />
        <OrdersChart />
      </div>
    </div>
  );
}
