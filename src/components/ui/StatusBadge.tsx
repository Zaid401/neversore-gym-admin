import { cn } from "@/lib/utils";

type Status = "paid" | "pending" | "cancelled" | "active" | "inactive";

const statusStyles: Record<Status, string> = {
  paid: "bg-success/15 text-success",
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  cancelled: "bg-destructive/15 text-destructive",
  inactive: "bg-muted text-muted-foreground",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}
