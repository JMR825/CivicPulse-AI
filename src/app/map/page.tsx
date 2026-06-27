"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import { getReports, Report } from "@/lib/dbService";
import { Filter, MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

// Load FullscreenMap dynamically
const FullscreenMap = dynamic(() => import("@/components/FullscreenMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-white/5 border border-white/5 flex items-center justify-center text-xs text-gray-500">
      Loading geospatial map layers...
    </div>
  ),
});

export default function MapPage() {
  const t = useTranslations("map");
  const tCat = useTranslations("categories");
  const tSev = useTranslations("severity");

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [hideResolved, setHideResolved] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const list = await getReports();
      setReports(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchReports();
    })();
  }, []);

  const filteredReports = reports.filter((r) => {
    const matchesCategory = selectedCategory === "all" || r.category === selectedCategory;
    const matchesSeverity = selectedSeverity === "all" || r.severity === selectedSeverity;
    const matchesResolved = !hideResolved || r.status !== "resolved";
    
    // Citizens see public, or their own
    const isPublic = r.visibility === "public" || r.visibility === undefined || r.visibility === null;
    
    return matchesCategory && matchesSeverity && matchesResolved && isPublic;
  });

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "pothole", label: tCat("pothole") },
    { value: "garbage", label: tCat("garbage") },
    { value: "water_leak", label: tCat("water_leak") },
    { value: "broken_streetlight", label: tCat("broken_streetlight") },
    { value: "drainage", label: tCat("drainage") },
    { value: "flooding", label: tCat("flooding") },
    { value: "fire", label: tCat("fire") },
    { value: "gas_leak", label: tCat("gas_leak") },
    { value: "other", label: tCat("other") },
  ];

  const severities = [
    { value: "all", label: t("allSeverities") },
    { value: "low", label: tSev("low") },
    { value: "medium", label: tSev("medium") },
    { value: "high", label: tSev("high") },
    { value: "critical", label: tSev("critical") },
  ];

  return (
    <div className="flex flex-col h-screen bg-brand-bg text-white overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* Sidebar Filters */}
        <div className="w-full md:w-80 border-r border-white/5 bg-brand-bg/50 backdrop-blur-xl p-6 flex flex-col justify-between shrink-0 z-10">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-primary" />
                {t("title")}
              </h1>
              <p className="text-xs text-gray-400 mt-1">{t("subtitle")}</p>
            </div>

            {/* Filter controls */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Filter className="h-3.5 w-3.5 text-brand-primary" />
                {t("mapFilters")}
              </h3>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("category")}</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-xs rounded-xl appearance-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-brand-bg">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("severity")}</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-xs rounded-xl appearance-none"
                >
                  {severities.map((sev) => (
                    <option key={sev.value} value={sev.value} className="bg-brand-bg">
                      {sev.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hide Resolved */}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={hideResolved}
                  onChange={(e) => setHideResolved(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-brand-primary focus:ring-brand-primary/50"
                />
                <span className="text-xs text-gray-300">{t("hideResolved")}</span>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 rounded-xl transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{t("refreshPins")}</span>
            </button>
            <div className="flex items-start gap-2 bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10 mt-4 text-[10px] text-brand-primary leading-normal">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{t("showingPins", { count: filteredReports.length })}</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 h-full relative z-0">
          {loading && reports.length === 0 ? (
            <div className="absolute inset-0 bg-brand-bg flex flex-col items-center justify-center text-gray-500 z-20">
              <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mb-4" />
              <p className="text-xs">{t("plotting")}</p>
            </div>
          ) : (
            <FullscreenMap reports={filteredReports} />
          )}
        </div>

      </div>
    </div>
  );
}
