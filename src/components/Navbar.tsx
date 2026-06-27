"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAlerts, Alert } from "@/lib/dbService";
import { ShieldAlert, AlertTriangle, Map, LayoutDashboard, PlusCircle, User, LogOut, ChevronDown, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Navbar() {
  const t = useTranslations("nav");
  const { user, signOutUser, changeRole } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch active alerts to show warning indicator
    const fetchAlerts = async () => {
      try {
        const list = await getAlerts();
        setActiveAlertCount(list.length);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/auth");
  };

  const selectRole = async (role: "citizen" | "moderator" | "admin") => {
    await changeRole(role);
    setRoleMenuOpen(false);
    router.refresh();
  };

  const navItems = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("map"), href: "/map", icon: Map },
    {
      name: t("alerts"),
      href: "/alerts",
      icon: AlertTriangle,
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
    },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-brand-bg/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-105 transition-all">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-brand-primary transition-all">
                CivicPulse<span className="text-brand-primary">AI</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "text-brand-primary bg-brand-primary/10"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    {item.badge !== undefined && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-danger text-[10px] font-bold text-white animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* User Menu / CTAs */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Admin/Mod Indicator & Quick Selector */}
                <div className="relative">
                  <button
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/5 border border-white/10 hover:border-brand-primary/40 text-gray-300 transition-all"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      user.role === "admin" 
                        ? "bg-brand-danger" 
                        : user.role === "moderator" 
                        ? "bg-brand-warning" 
                        : "bg-brand-success"
                    }`} />
                    <span>{user.role}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                  {roleMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-xl border border-white/5 bg-brand-card p-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t("switchRole")}</div>
                      <button onClick={() => selectRole("citizen")} className="flex w-full items-center px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg">{t("citizen")}</button>
                      <button onClick={() => selectRole("moderator")} className="flex w-full items-center px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg">{t("moderator")}</button>
                      <button onClick={() => selectRole("admin")} className="flex w-full items-center px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg">{t("admin")}</button>
                    </div>
                  )}
                </div>

                {/* Admin Console Link (if Admin or Mod) */}
                {(user.role === "admin" || user.role === "moderator") && (
                  <Link
                    href="/admin"
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                      pathname.startsWith("/admin")
                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                        : "border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{t("adminPanel")}</span>
                  </Link>
                )}

                {/* Create Issue Action */}
                <Link
                  href="/report/new"
                  className="flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/30 hover:scale-[1.02] transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("reportIssue")}</span>
                </Link>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all overflow-hidden"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border border-white/5 bg-brand-card p-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-2 text-xs border-b border-white/5">
                        <p className="font-semibold text-white truncate">{user.displayName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 rounded-xl transition-all"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        <span>{t("settings")}</span>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-all"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t("signOut")}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/auth"
                className="text-sm font-semibold text-gray-300 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl bg-white/5 transition-all"
              >
                {t("signIn")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
