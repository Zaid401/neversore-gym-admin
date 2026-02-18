import { Star } from "lucide-react";

const reviews = [
  { customer: "Rahul S.", product: "Power Joggers", rating: 5, comment: "Best gym joggers I've ever worn. Perfect fit and premium feel.", date: "2026-02-17" },
  { customer: "Arjun P.", product: "Beast Mode Hoodie", rating: 4, comment: "Great quality hoodie. Slightly heavy for summer but perfect for winter workouts.", date: "2026-02-16" },
  { customer: "Vikram S.", product: "Jet Black Stringer", rating: 5, comment: "Looks incredible. The material is breathable and the cut is perfect for showing gains.", date: "2026-02-15" },
  { customer: "Amit G.", product: "Iron Compression Tee", rating: 3, comment: "Good compression but sizing runs a bit small. Order one size up.", date: "2026-02-14" },
  { customer: "Deepak J.", product: "Titan Tank", rating: 5, comment: "Absolutely love it. The quality justifies the price 100%.", date: "2026-02-13" },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < count ? "fill-warning text-warning" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  return (
    <div className="space-y-4 animate-fade-in">
      {reviews.map((review, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5 card-hover">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium">{review.customer}</p>
              <p className="text-xs text-muted-foreground">on {review.product}</p>
            </div>
            <span className="text-xs text-muted-foreground">{review.date}</span>
          </div>
          <Stars count={review.rating} />
          <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
        </div>
      ))}
    </div>
  );
}
