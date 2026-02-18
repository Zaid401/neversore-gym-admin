import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { cn } from "@/lib/utils";

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          collapsed ? "lg:ml-[68px]" : "lg:ml-[260px]"
        )}
      >
        <TopNavbar onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
