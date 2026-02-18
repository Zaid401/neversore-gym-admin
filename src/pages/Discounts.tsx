import { Plus, Percent } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

const discounts = [
  { code: "FIRST20", type: "Percentage", value: "20%", minOrder: "₹999", status: "active" as const, uses: 342 },
  { code: "SUMMER15", type: "Percentage", value: "15%", minOrder: "₹1,499", status: "active" as const, uses: 128 },
  { code: "FLAT500", type: "Flat", value: "₹500", minOrder: "₹2,999", status: "inactive" as const, uses: 89 },
  { code: "NEWYEAR10", type: "Percentage", value: "10%", minOrder: "₹499", status: "active" as const, uses: 567 },
];

export default function Discounts() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Add Discount
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Value</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Min. Order</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Uses</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.code} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-primary">{d.code}</td>
                  <td className="px-6 py-4 text-muted-foreground">{d.type}</td>
                  <td className="px-6 py-4 font-medium">{d.value}</td>
                  <td className="px-6 py-4 text-muted-foreground">{d.minOrder}</td>
                  <td className="px-6 py-4">{d.uses}</td>
                  <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
