"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Swords,
  Trophy,
  Activity,
  Image,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subscribers", label: "Subscribers", icon: Users },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/players", label: "Standings", icon: Swords },
  { href: "/prizes", label: "Prizes", icon: Trophy },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/media", label: "Media", icon: Image },
];

const bottomNav = [
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function renderNavItem(item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) {
    const Icon = item.icon;
    const active = isActive(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          collapsed ? "justify-center px-0" : "px-3"
        }`}
        style={{
          borderLeft: collapsed
            ? "none"
            : active
              ? "3px solid var(--accent)"
              : "3px solid transparent",
          background: active ? "rgba(255, 255, 255, 0.03)" : "transparent",
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
        }}
        title={collapsed ? item.label : undefined}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.color = "var(--text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }
        }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  const sidebarContent = (isMobile: boolean) => (
    <>
      <div className="h-14 flex items-center px-4 border-b border-[var(--border)]">
        {collapsed && !isMobile ? (
          <span className="text-lg font-bold text-[var(--accent)]">E</span>
        ) : (
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            <span style={{ color: "var(--accent)" }}>ECL</span>{" "}
            <span className="text-sm font-normal text-[var(--text-secondary)]">
              Dashboard
            </span>
          </span>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {mainNav.map((item) => renderNavItem(item))}
      </nav>

      <div className="flex-1" />

      <div className="mx-3 border-t border-[var(--border)] my-2" />

      <nav className="py-2 px-2 space-y-0.5">
        {bottomNav.map((item) => renderNavItem(item))}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className={`flex items-center gap-3 px-3 py-2 mx-2 mb-2 rounded-lg text-sm font-medium transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] ${
          collapsed && !isMobile ? "justify-center px-0" : ""
        }`}
        title={collapsed ? "Sign out" : undefined}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {(!collapsed || isMobile) && <span>Sign out</span>}
      </button>

      {!isMobile && (
        <button
          onClick={onToggle}
          className="mx-2 mb-3 p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] transition-colors flex items-center justify-center"
        >
          {collapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 top-0 h-dvh bg-[var(--card-inner-bg)] border-r border-[var(--border)] flex-col transition-all duration-200 ease-in-out z-40 hidden md:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden bg-[var(--card-inner-bg)] border border-[var(--border)] rounded-lg p-2"
      >
        <Menu className="w-5 h-5 text-[var(--text-secondary)]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-[var(--overlay-bg)] z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-dvh w-60 bg-[var(--card-inner-bg)] border-r border-[var(--border)] flex flex-col z-50 md:hidden">
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  );
}
