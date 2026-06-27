"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { getReports, Report } from "@/lib/dbService";
import { User, Shield, MapPin, Eye, Volume2, Award, Settings, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const { user } = useAuth();
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const t = useTranslations("profile");
  const tBadge = useTranslations("badges");

  // Settings states
  const [language, setLanguage] = useState("en");
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    // Load setting overrides from localStorage
    if (typeof window !== "undefined") {
      void (async () => {
        setLanguage(localStorage.getItem("civicpulse_lang") || "en");
        setHighContrast(localStorage.getItem("civicpulse_contrast") === "true");
        setLargeText(localStorage.getItem("civicpulse_largetext") === "true");
      })();
    }
  }, []);

  useEffect(() => {
    async function loadUserReports() {
      if (!user) return;
      try {
        const reps = await getReports();
        const mine = reps.filter((r) => r.uid === user.uid);
        setUserReports(mine);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUserReports();
  }, [user]);

  const updateLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("civicpulse_lang", lang);
  };

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    localStorage.setItem("civicpulse_contrast", String(next));
    // Apply class to html
    if (next) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };

  const toggleLargeText = () => {
    const next = !largeText;
    setLargeText(next);
    localStorage.setItem("civicpulse_largetext", String(next));
    if (next) {
      document.documentElement.classList.add("large-text");
    } else {
      document.documentElement.classList.remove("large-text");
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-brand-bg text-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <User className="h-12 w-12 text-gray-500 mb-4" />
          <h2 className="text-xl font-bold">{t("authRequired")}</h2>
          <p className="text-sm text-gray-400 mt-2">{t("authRequiredDesc")}</p>
          <Link href="/auth" className="bg-brand-primary text-white text-xs font-semibold px-5 py-2.5 rounded-xl mt-6">
            {t("signInNow")}
          </Link>
        </div>
      </div>
    );
  }

  // Badges logic
  const count = userReports.length;
  const badges = [
    { name: tBadge("safetySentinel"), desc: tBadge("safetySentinelDesc"), unlocked: count >= 1, icon: Shield },
    { name: tBadge("communityGuardian"), desc: tBadge("communityGuardianDesc"), unlocked: count >= 3, icon: Award },
    { name: tBadge("watchCaptain"), desc: tBadge("watchCaptainDesc"), unlocked: user.trustScore >= 80, icon: CheckCircle2 },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-white">
      <Navbar />

      <div className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* User Card */}
        <div className="glass-panel p-8 rounded-3xl mb-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
              alt="Avatar"
              className="h-20 w-20 rounded-2xl bg-white/10 border border-white/5 object-cover"
            />
            <div>
              <h1 className="text-2xl font-extrabold text-white">{user.displayName}</h1>
              <p className="text-xs text-gray-400 mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-bold uppercase bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-2.5 py-0.5 rounded-full">
                  {t("role")} {user.role}
                </span>
                <span className="text-[10px] font-bold uppercase bg-brand-success/10 border border-brand-success/20 text-brand-success px-2.5 py-0.5 rounded-full">
                  {t("trustScore")} {user.trustScore}
                </span>
              </div>
            </div>
          </div>

          {/* Citizen engagement numbers */}
          <div className="flex gap-8 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-white">{userReports.length}</span>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{t("myReports")}</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-extrabold text-white">{user.trustScore * 2}</span>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{t("xpPoints")}</p>
            </div>
          </div>
        </div>

        {/* Configurations Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Settings Section */}
          <div className="glass-panel p-6 rounded-3xl space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Settings className="h-4.5 w-4.5 text-brand-primary" />
              {t("appPreferences")}
            </h3>

            {/* Language */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{t("language")}</label>
              <select
                value={language}
                onChange={(e) => updateLanguage(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs rounded-xl"
              >
                <option value="en" className="bg-brand-bg">English (EN)</option>
                <option value="es" className="bg-brand-bg">Español (ES)</option>
                <option value="fr" className="bg-brand-bg">Français (FR)</option>
                <option value="hi" className="bg-brand-bg">हिन्दी (HI)</option>
              </select>
            </div>

            {/* Contrast Mode */}
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-300">{t("highContrast")}</span>
              </div>
              <button
                onClick={toggleContrast}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all ${
                  highContrast ? "bg-brand-primary" : "bg-white/10"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${
                    highContrast ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Large Text Mode */}
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-300">{t("largeText")}</span>
              </div>
              <button
                onClick={toggleLargeText}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all ${
                  largeText ? "bg-brand-primary" : "bg-white/10"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${
                    largeText ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Gamified Badges */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Award className="h-4.5 w-4.5 text-brand-primary" />
              {t("civicBadges")}
            </h3>
            
            <div className="space-y-4">
              {badges.map((badge, idx) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      badge.unlocked
                        ? "bg-brand-primary/5 border-brand-primary/20 text-white"
                        : "bg-black/20 border-white/5 opacity-50"
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      badge.unlocked ? "bg-brand-primary/10 text-brand-primary" : "bg-white/5 text-gray-500"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{badge.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">{badge.desc}</p>
                      {badge.unlocked ? (
                        <span className="text-[8px] uppercase tracking-wider font-bold text-brand-success mt-1 block">{t("unlocked")}</span>
                      ) : (
                        <span className="text-[8px] uppercase tracking-wider font-bold text-gray-500 mt-1 block">{t("locked")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* My Report History */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <MapPin className="h-4.5 w-4.5 text-brand-primary" />
              {t("reportHistory")}
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-xs text-gray-500">{t("loadingHistory")}</p>
              ) : userReports.length === 0 ? (
                <p className="text-xs text-gray-500 font-light">{t("noReports")}</p>
              ) : (
                userReports.map((r) => (
                  <Link
                    key={r.id}
                    href={`/report?id=${r.id}`}
                    className="block p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-primary/30 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 mb-1.5 uppercase">
                      <span>{r.category.replace("_", " ")}</span>
                      <span>{r.status}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{r.title}</h4>
                    <p className="text-[10px] text-gray-500 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
