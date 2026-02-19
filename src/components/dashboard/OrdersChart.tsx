import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface ChartPoint { month: string; orders: number; }

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function OrdersChart() {
  const { data = [] } = useQuery<ChartPoint[]>({
    queryKey: ["orders-chart"],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      since.setDate(1);
      const { data: rows } = await supabase
        .from("orders")
        .select("created_at")
        .gte("created_at", since.toISOString());
      const map: Record<string, ChartPoint> = {};
      (rows || []).forEach((o) => {
        const key = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (!map[key]) map[key] = { month: key, orders: 0 };
        map[key].orders += 1;
      });
      return Object.values(map).sort((a, b) =>
        MONTH_ORDER.indexOf(a.month.split(" ")[0]) - MONTH_ORDER.indexOf(b.month.split(" ")[0])
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <h3 className="font-heading text-lg font-bold mb-6">Orders This Year</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data as ChartPoint[]}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 16%)" />
          <XAxis dataKey="month" stroke="hsl(0, 0%, 50%)" fontSize={12} />
          <YAxis stroke="hsl(0, 0%, 50%)" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 10%)",
              border: "1px solid hsl(0, 0%, 16%)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "13px",
            }}
          />
          <Bar dataKey="orders" fill="hsl(352, 93%, 42%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
