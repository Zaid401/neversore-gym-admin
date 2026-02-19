import { useState } from "react";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

const products = [
  { id: 1, name: "Jet Black Stringer", category: "Tank Tops", price: "₹1,299", stock: 45, status: "active" as const, image: "JB" },
  { id: 2, name: "Power Joggers", category: "Bottoms", price: "₹2,499", stock: 28, status: "active" as const, image: "PJ" },
  { id: 3, name: "Iron Compression Tee", category: "T-Shirts", price: "₹1,599", stock: 3, status: "active" as const, image: "IC" },
  { id: 4, name: "Beast Mode Hoodie", category: "Hoodies", price: "₹3,299", stock: 52, status: "active" as const, image: "BM" },
  { id: 5, name: "Stealth Shorts", category: "Bottoms", price: "₹1,199", stock: 0, status: "inactive" as const, image: "SS" },
  { id: 6, name: "Titan Tank", category: "Tank Tops", price: "₹999", stock: 67, status: "active" as const, image: "TT" },
];
  
export default function Products() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Stock</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {product.image}
                      </div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{product.category}</td>
                  <td className="px-6 py-4 font-medium">{product.price}</td>
                  <td className="px-6 py-4">
                    <span className={product.stock <= 5 ? "text-destructive font-medium" : ""}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={product.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl animate-fade-in mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-lg font-bold">Add New Product</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Product Name</label>
                <input className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Price</label>
                  <input className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Stock</label>
                  <input type="number" className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                <select className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>Tank Tops</option>
                  <option>T-Shirts</option>
                  <option>Hoodies</option>
                  <option>Bottoms</option>
                  <option>Accessories</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                <textarea className="w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none" />
              </div>
              <button className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors">
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
