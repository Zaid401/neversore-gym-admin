import { AlertTriangle, Package } from "lucide-react";

const inventory = [
  { name: "Jet Black Stringer", sku: "NS-ST-001", stock: 45, reorder: 10, status: "ok" },
  { name: "Power Joggers", sku: "NS-JG-002", stock: 28, reorder: 15, status: "ok" },
  { name: "Iron Compression Tee", sku: "NS-CT-003", stock: 3, reorder: 10, status: "low" },
  { name: "Beast Mode Hoodie", sku: "NS-HD-004", stock: 52, reorder: 10, status: "ok" },
  { name: "Stealth Shorts", sku: "NS-SH-005", stock: 0, reorder: 20, status: "out" },
  { name: "Titan Tank", sku: "NS-TT-006", stock: 67, reorder: 15, status: "ok" },
];

export default function Inventory() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Stock</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Reorder Level</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.sku} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {item.name}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{item.sku}</td>
                  <td className="px-6 py-4">
                    <span className={item.status !== "ok" ? "text-destructive font-medium" : ""}>{item.stock}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{item.reorder}</td>
                  <td className="px-6 py-4">
                    {item.status === "low" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                        <AlertTriangle className="h-3 w-3" /> Low Stock
                      </span>
                    )}
                    {item.status === "out" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Out of Stock
                      </span>
                    )}
                    {item.status === "ok" && (
                      <span className="text-xs font-medium text-success">In Stock</span>
                    )}
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
