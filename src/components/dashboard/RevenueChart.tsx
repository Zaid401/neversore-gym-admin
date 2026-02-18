import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { month: "Jan", revenue: 186000 },
  { month: "Feb", revenue: 245000 },
  { month: "Mar", revenue: 198000 },
  { month: "Apr", revenue: 320000 },
  { month: "May", revenue: 278000 },
  { month: "Jun", revenue: 390000 },
  { month: "Jul", revenue: 425000 },
];

export default function RevenueChart() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <h3 className="font-heading text-lg font-bold mb-6">Revenue Overview</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
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
