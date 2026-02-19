import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface ChartPoint { month: string; revenue: number; }

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RevenueChart() {
  const { data = [] } = useQuery<ChartPoint[]>({
    queryKey: ["revenue-chart"],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      since.setDate(1);
      const { data: rows } = await supabase
        .from("orders")
        .select("created_at,total_amount")
        .gte("created_at", since.toISOString())
        .eq("payment_status", "captured");
      const map: Record<string, ChartPoint> = {};
      (rows || []).forEach((o) => {
        const key = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (!map[key]) map[key] = { month: key, revenue: 0 };
        map[key].revenue += Number(o.total_amount);
      });
      return Object.values(map).sort((a, b) =>
        MONTH_ORDER.indexOf(a.month.split(" ")[0]) - MONTH_ORDER.indexOf(b.month.split(" ")[0])
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <h3 className="font-heading text-lg font-bold mb-6">Revenue Overview</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data as ChartPoint[]}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(352, 93%, 42%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(352, 93%, 42%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 16%)" />
          <XAxis dataKey="month" stroke="hsl(0, 0%, 50%)" fontSize={12} />
          <YAxis stroke="hsl(0, 0%, 50%)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 10%)",
              border: "1px solid hsl(0, 0%, 16%)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
            }}
            formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(352, 93%, 42%)"
            strokeWidth={2}
            fill="url(#revenueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
