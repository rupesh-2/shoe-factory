"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, Logo } from "./icons";

const nav = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/inventory", label: "Inventory", icon: "inventory" },
  { href: "/customers", label: "Customers", icon: "customers" },
  { href: "/orders", label: "Orders", icon: "orders" },
  { href: "/production", label: "Production", icon: "production" },
  { href: "/purchasing", label: "Purchasing", icon: "purchasing" },
  { href: "/staff", label: "Staff", icon: "staff" },
  { href: "/output", label: "Daily Output", icon: "output" },
  { href: "/payroll", label: "Payroll", icon: "payroll" },
  { href: "/finance", label: "Finance", icon: "finance" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <Logo />
      <div>
        <p className="text-white font-semibold leading-tight">Shoe Factory</p>
        <p className="text-[11px] text-slate-400">Management System</p>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-1">
      {nav.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 min-h-11 md:min-h-9 text-sm transition-colors duration-200 ${
              active
                ? "bg-primary text-white font-medium shadow-sm"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0 opacity-80" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = nav.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden print:hidden sticky top-0 z-30 flex items-center justify-between bg-slate-900 px-4 py-3">
        <Brand />
        <div className="flex items-center gap-3">
          {current && <span className="text-sm text-slate-300">{current.label}</span>}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-200 hover:bg-slate-800"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden print:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative flex h-full w-64 max-w-[80vw] flex-col bg-slate-900 text-slate-300 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:text-white"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex print:hidden w-60 shrink-0 bg-slate-900 text-slate-300 flex-col min-h-screen sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-slate-800">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
          v1.1 · Demo data
        </div>
      </aside>
    </>
  );
}
