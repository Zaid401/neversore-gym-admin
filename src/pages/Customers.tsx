import { useState } from "react";
import { Search } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

const customers = [
  { name: "Rahul Sharma", email: "rahul@email.com", orders: 12, spent: "₹48,500", status: "active" as const },
  { name: "Arjun Patel", email: "arjun@email.com", orders: 8, spent: "₹32,200", status: "active" as const },
  { name: "Vikram Singh", email: "vikram@email.com", orders: 15, spent: "₹62,800", status: "active" as const },
  { name: "Karan Mehta", email: "karan@email.com", orders: 3, spent: "₹8,900", status: "inactive" as const },
  { name: "Amit Gupta", email: "amit@email.com", orders: 22, spent: "₹95,400", status: "active" as const },
  { name: "Deepak Joshi", email: "deepak@email.com", orders: 6, spent: "₹18,600", status: "active" as const },
];

export default function Customers() {
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Total Orders</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Total Spent</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.email} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {customer.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="font-medium">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{customer.email}</td>
                  <td className="px-6 py-4">{customer.orders}</td>
                  <td className="px-6 py-4 font-medium">{customer.spent}</td>
                  <td className="px-6 py-4"><StatusBadge status={customer.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
