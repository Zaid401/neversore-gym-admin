import { useState } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: number;
  name: string;
  productCount: number;
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([
    { id: 1, name: "Upper", productCount: 24 },
    { id: 2, name: "Bottom", productCount: 18 },
    { id: 3, name: "Active", productCount: 32 },
    { id: 4, name: "Casual", productCount: 15 },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) return;

    if (editingCategory) {
      // Edit existing category
      setCategories(
        categories.map((cat) =>
          cat.id === editingCategory.id ? { ...cat, name: categoryName } : cat
        )
      );
    } else {
      // Add new category
      const newCategory: Category = {
        id: Math.max(...categories.map((c) => c.id), 0) + 1,
        name: categoryName,
        productCount: 0,
      };
      setCategories([...categories, newCategory]);
    }

    setIsDialogOpen(false);
    setCategoryName("");
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      setCategories(categories.filter((cat) => cat.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">
            Categories
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your product categories
          </p>
        </div>
        <Button onClick={handleAddCategory} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            All Categories
          </CardTitle>
          <CardDescription>
            View and manage all product categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{category.productCount} products</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        className="gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the category name below."
                : "Enter a name for the new category."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Upper, Bottom, Active"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveCategory()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Update" : "Add"} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
