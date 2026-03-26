"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Swords,
  Trophy,
  Activity,
  Image,
  MessageCircle,
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

const navSections = [
  {
    label: "OVERVIEW",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/subscribers", label: "Subscribers", icon: Users },
      { href: "/league", label: "League", icon: Swords },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { href: "/finance", label: "Finance", icon: Wallet },
      { href: "/prizes", label: "Prizes", icon: Trophy },
    ],
  },
  {
    label: "TEAM",
    items: [
      { href: "/meetings", label: "Meetings", icon: MessageCircle },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/media", label: "Media", icon: Image },
    ],
  },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const sidebarSurface: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
  borderRight: "1.5px solid rgba(255,255,255,0.10)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
  backdropFilter: "blur(8px)",
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const userName = session?.user?.name ?? "User";
  const userInitial = userName.charAt(0).toUpperCase();

  function renderNavItem(item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }) {
    const Icon = item.icon;
    const active = isActive(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => {
          setMobileOpen(false);
          if (active) window.dispatchEvent(new CustomEvent("nav-reset"));
        }}
        className={`flex items-center transition-all duration-150 ${
          collapsed ? "justify-center" : ""
        }`}
        style={{
          gap: "10px",
          padding: collapsed ? "8px" : "8px 12px",
          borderRadius: "var(--radius)",
          borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
          background: active ? "rgba(255, 255, 255, 0.03)" : "transparent",
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
          fontSize: "14px",
          fontWeight: 500,
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
        <span
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: "20px",
            height: "20px",
            color: active ? "var(--accent)" : "inherit",
          }}
        >
          <Icon className="w-[18px] h-[18px]" />
        </span>
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  function renderSectionLabel(label: string) {
    if (collapsed) return null;
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-muted)",
          padding: "12px 12px 6px",
        }}
      >
        {label}
      </div>
    );
  }

  const sidebarContent = (isMobile: boolean) => {
    const isCollapsed = collapsed && !isMobile;

    return (
      <>
        {/* Header */}
        <div
          className="flex items-center"
          style={{
            height: "56px",
            padding: "0 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {isCollapsed ? (
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--accent)",
              }}
            >
              E
            </span>
          ) : (
            <span
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              <span style={{ color: "var(--accent)" }}>ECL</span>{" "}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "var(--text-secondary)",
                }}
              >
                Dashboard
              </span>
            </span>
          )}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto"
              style={{
                padding: "4px",
                borderRadius: "var(--radius)",
                color: "var(--text-muted)",
              }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation sections */}
        <nav
          style={{ padding: "12px 12px 0" }}
        >
          {navSections.map((section) => (
            <div key={section.label} style={{ marginBottom: "8px" }}>
              {renderSectionLabel(section.label)}
              <div className="flex flex-col" style={{ gap: "2px" }}>
                {section.items.map((item) => renderNavItem(item))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Bottom nav */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "8px 12px",
          }}
        >
          <div className="flex flex-col" style={{ gap: "2px" }}>
            {bottomItems.map((item) => renderNavItem(item))}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`flex items-center transition-all duration-150 ${
                isCollapsed ? "justify-center" : ""
              }`}
              style={{
                gap: "10px",
                padding: isCollapsed ? "8px" : "8px 12px",
                borderRadius: "var(--radius)",
                borderLeft: "3px solid transparent",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "14px",
                fontWeight: 500,
                width: "100%",
              }}
              title={isCollapsed ? "Sign out" : undefined}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <span
                className="flex-shrink-0 flex items-center justify-center"
                style={{ width: "20px", height: "20px" }}
              >
                <LogOut className="w-[18px] h-[18px]" />
              </span>
              {!isCollapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>

        {/* Footer — user profile + collapse toggle */}
        <div
          style={{
            padding: isCollapsed ? "12px 0" : "16px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: isCollapsed ? "column-reverse" : "row",
            alignItems: "center",
            gap: isCollapsed ? "8px" : "10px",
          }}
        >
          {/* Avatar */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(251,191,36,0.25), rgba(251,191,36,0.08))",
              border: "1.5px solid rgba(255,255,255,0.10)",
              color: "var(--accent)",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            {userInitial}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div
                className="truncate"
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {userName}
              </div>
            </div>
          )}
          {!isMobile && (
            <button
              onClick={onToggle}
              className="flex-shrink-0 flex items-center justify-center transition-colors duration-150"
              style={{
                padding: "4px",
                borderRadius: "var(--radius)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              {isCollapsed ? (
                <PanelLeft className="w-[18px] h-[18px]" />
              ) : (
                <PanelLeftClose className="w-[18px] h-[18px]" />
              )}
            </button>
          )}
        </div>
      </>
    );
  };

  const isCollapsed = collapsed;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 h-dvh flex-col transition-all duration-200 ease-in-out z-40 hidden md:flex"
        style={{
          ...sidebarSurface,
          width: isCollapsed ? "64px" : "260px",
        }}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed z-50 md:hidden"
        style={{
          top: "12px",
          left: "12px",
          background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
          border: "1.5px solid rgba(255,255,255,0.10)",
          borderRadius: "var(--radius)",
          padding: "8px",
          backdropFilter: "blur(8px)",
        }}
      >
        <Menu className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 h-dvh flex flex-col z-50 md:hidden"
            style={{
              ...sidebarSurface,
              width: "260px",
            }}
          >
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  );
}
