import { ShoppingCart, Package, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  { icon: ShoppingCart, text: "New order #1284 placed by Rahul Sharma", time: "2 min ago", color: "text-primary" },
  { icon: Package, text: "Product 'Jet Black Stringer' stock updated", time: "15 min ago", color: "text-success" },
  { icon: Users, text: "New customer registration — Arjun Patel", time: "1 hour ago", color: "text-warning" },
  { icon: Star, text: "5-star review on 'Power Joggers'", time: "3 hours ago", color: "text-primary" },
  { icon: ShoppingCart, text: "Order #1280 marked as shipped", time: "5 hours ago", color: "text-success" },
];

export default function RecentActivity() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "500ms" }}>
      <h3 className="font-heading text-lg font-bold mb-6">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg p-3 hover:bg-accent transition-colors">
            <div className="rounded-lg bg-secondary p-2">
              <activity.icon className={cn("h-4 w-4", activity.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{activity.text}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
