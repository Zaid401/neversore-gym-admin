import { useState } from "react";
import { Star, Eye, EyeOff, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Paginator from "@/components/ui/Paginator";

const PAGE_SIZE = 10;

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  profiles: { full_name: string | null } | null;
  products: { name: string } | null;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < count ? "fill-warning text-warning" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

const STAR_OPTIONS = [
  { label: "All Stars", value: "all" },
  { label: "5 ★", value: "5" },
  { label: "4 ★", value: "4" },
  { label: "3 ★", value: "3" },
  { label: "2 ★", value: "2" },
  { label: "1 ★", value: "1" },
];

export default function Reviews() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [sortStars, setSortStars] = useState("all");

  const { data: { reviews, total } = { reviews: [], total: 0 }, isLoading } = useQuery<{ reviews: Review[]; total: number }>({
    queryKey: ["reviews", page, sortStars],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("product_reviews")
        .select("id,rating,title,comment,is_approved,created_at,profiles(full_name),products(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (sortStars !== "all") q = q.eq("rating", parseInt(sortStars));
      const { data, error, count } = await q;
      if (error) throw error;
      return { reviews: (data || []) as Review[], total: count ?? 0 };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { error } = await supabase.from("product_reviews").update({ is_approved: !is_approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: vars.is_approved ? "Review hidden" : "Review shown" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Review deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter by stars */}
      <div className="flex flex-wrap gap-2">
        {STAR_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setSortStars(opt.value); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              sortStars === opt.value
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">{total} review{total !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">No reviews found</div>
      ) : (
        <>
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-border bg-card p-5 card-hover">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{review.profiles?.full_name ?? "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground">on {review.products?.name ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${review.is_approved ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {review.is_approved ? "Visible" : "Hidden"}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
              <Stars count={review.rating} />
              {review.title && <p className="mt-2 text-sm font-medium">{review.title}</p>}
              {review.comment && <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => toggleMutation.mutate({ id: review.id, is_approved: review.is_approved })}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    review.is_approved
                      ? "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                      : "bg-success/10 text-success hover:bg-success/20"
                  }`}
                >
                  {review.is_approved ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                </button>
                <button
                  onClick={() => { if (confirm("Delete this review permanently?")) deleteMutation.mutate(review.id); }}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}

          <Paginator page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
}
