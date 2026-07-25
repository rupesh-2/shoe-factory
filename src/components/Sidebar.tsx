"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/inventory", label: "Inventory", icon: "📦" },
  { href: "/customers", label: "Customers", icon: "🧑" },
  { href: "/orders", label: "Orders", icon: "🧾" },
  { href: "/staff", label: "Staff", icon: "👷" },
  { href: "/finance", label: "Finance", icon: "💰" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👟</span>
          <div>
            <p className="text-white font-semibold leading-tight">Shoe Factory</p>
            <p className="text-[11px] text-slate-400">Management System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        v1.0 · Demo data
      </div>
    </aside>
  );
}
