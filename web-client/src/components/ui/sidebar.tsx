"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  FlaskConical,
  Search,
  Heart,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/voice", label: "Voice Intelligence", icon: Mic },
  { href: "/qa-playground", label: "QA Playground", icon: FlaskConical },
  { href: "/diagnostics", label: "Diagnostics & RCA", icon: Search },
  { href: "/healing", label: "Self-Healing", icon: Heart },
  { href: "/inference", label: "Inference Hub", icon: Cpu },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out glass-card-static border-r border-[var(--border-glass)] ${
        collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]"
      }`}
      style={{ borderRadius: 0 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-[var(--border-subtle)]">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--cyan)] to-[var(--violet)] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-gradient leading-tight">
              InsightDesk AI
            </h1>
            <p className="text-[10px] text-[var(--text-muted)] leading-tight">
              Command Center
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-[var(--cyan-glow)] text-[var(--cyan)] border border-[var(--border-active)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 transition-all ${
                  isActive
                    ? "text-[var(--cyan)] drop-shadow-[0_0_6px_var(--cyan-glow)]"
                    : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--cyan)] pulse-live" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => {
          setCollapsed(!collapsed);
          // Toggle page-content class
          document
            .querySelector(".page-content")
            ?.classList.toggle("collapsed", !collapsed);
        }}
        className="flex items-center justify-center py-4 border-t border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
