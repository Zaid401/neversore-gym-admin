import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { month: "Jan", orders: 142 },
  { month: "Feb", orders: 185 },
  { month: "Mar", orders: 164 },
  { month: "Apr", orders: 220 },
  { month: "May", orders: 198 },
  { month: "Jun", orders: 256 },
  { month: "Jul", orders: 289 },
];

export default function OrdersChart() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <h3 className="font-heading text-lg font-bold mb-6">Orders This Year</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
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
