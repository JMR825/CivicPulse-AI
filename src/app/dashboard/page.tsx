"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { getReports, getAlerts, upvoteReport, confirmReport, Report, Alert } from "@/lib/dbService";
import { Search, Filter, ThumbsUp, MapPin, AlertTriangle, Clock, ShieldAlert, Sparkles, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  // Load database items
  const loadData = async () => {
    try {
      const reps = await getReports();
      const alts = await getAlerts();
      setReports(reps);
      setAlerts(alts);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, []);

  const handleUpvote = async (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const newCount = await upvoteReport(reportId, user.uid);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, upvoteCount: newCount } : r))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirm = async (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const newCount = await confirmReport(reportId, user.uid);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, confirmedCount: newCount } : r))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.assignedDepartment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || r.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || r.status === selectedStatus;
    
    // Admins see all. Citizens see public, or their own
    const isOwner = user && r.uid === user.uid;
    const isPublic = r.visibility === "public" || r.visibility === undefined || r.visibility === null;
    const isAdmin = user && (user.role === "admin" || user.role === "moderator");
    const matchesVisibility = isAdmin || isPublic || isOwner;

    return matchesSearch && matchesCategory && matchesStatus && matchesVisibility;
  });

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "pothole", label: "Pothole / Road" },
    { value: "garbage", label: "Garbage Overflow" },
    { value: "water_leak", label: "Water Leak" },
    { value: "broken_streetlight", label: "Streetlight" },
    { value: "drainage", label: "Drainage / Sewer" },
    { value: "flooding", label: "Flooding" },
    { value: "fire", label: "Fire / Smoke" },
    { value: "gas_leak", label: "Gas Leak" },
    { value: "other", label: "Other" },
  ];

  const statuses = [
    { value: "all", label: "All Statuses" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "verified", label: "Verified" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "rejected", label: "Rejected" },
    { value: "duplicate", label: "Duplicate" },
  ];

  const severityColors = {
    low: "bg-brand-success/10 text-brand-success border-brand-success/20",
    medium: "bg-brand-warning/10 text-brand-warning border-brand-warning/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critical: "bg-brand-danger/10 text-brand-danger border-brand-danger/20 animate-pulse",
  };

  const statusLabels = {
    submitted: "Submitted",
    under_review: "Under Review",
    verified: "Verified",
    in_progress: "In Progress",
    resolved: "Resolved",
    rejected: "Rejected",
    duplicate: "Duplicate",
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-white">
      <Navbar />

      <div className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Active Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 rounded-2xl bg-brand-danger/10 border border-brand-danger/25 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand-danger" />
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-danger/20 text-brand-danger shrink-0 mt-0.5 animate-pulse">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="font-bold text-white text-sm uppercase tracking-wider">{alert.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-danger text-white uppercase">
                      Active Alert
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">{alert.message}</p>
                  {alert.safetyInstructions && (
                    <div className="mt-2 text-xs bg-black/30 p-2 rounded-lg text-brand-danger/90 font-mono">
                      Safety Tip: {alert.safetyInstructions}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard Title & Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Community Issues Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Review, support, and track local civic resolution progress.</p>
          </div>
          <Link
            href="/report/new"
            className="self-start bg-brand-primary hover:bg-brand-primary/95 text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all"
          >
            File a New Report
          </Link>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl space-y-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-primary" />
                Filter Issues
              </h3>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by keywords..."
                    className="glass-input w-full pl-9 pr-3 py-2 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
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

              {/* Status */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-xs rounded-xl appearance-none"
                >
                  {statuses.map((stat) => (
                    <option key={stat.value} value={stat.value} className="bg-brand-bg">
                      {stat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Issue Cards Feed */}
          <div className="lg:col-span-3 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mb-4" />
                <p className="text-xs">Loading reported issues...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl">
                <p className="text-sm text-gray-400 font-light">No issues match your filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedStatus("all");
                  }}
                  className="text-xs text-brand-primary font-semibold underline mt-3 hover:text-white"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              filteredReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/report?id=${report.id}`}
                  className="block glass-panel glass-panel-hover p-6 rounded-3xl relative overflow-hidden"
                >
                  <div className="flex items-start justify-between flex-wrap gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 uppercase tracking-wider text-gray-300">
                        {report.category.replace("_", " ")}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${severityColors[report.severity]}`}>
                        {report.severity}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      report.status === "resolved" 
                        ? "bg-brand-success/20 text-brand-success" 
                        : report.status === "duplicate" 
                        ? "bg-gray-700 text-gray-400" 
                        : "bg-brand-primary/20 text-brand-primary"
                    }`}>
                      {statusLabels[report.status]}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white hover:text-brand-primary transition-all">
                    {report.title}
                  </h3>

                  <p className="text-xs text-gray-400 mt-2 line-clamp-2 font-light leading-relaxed">
                    {report.description}
                  </p>

                  {/* AI Summarized Indicator */}
                  {report.aiSummary && (
                    <div className="mt-3 flex items-start gap-2 bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10">
                      <Sparkles className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-brand-primary/95 leading-relaxed font-light">
                        <strong className="font-bold">AI Summary:</strong> {report.aiSummary}
                      </p>
                    </div>
                  )}

                  {/* Footer Stats & Interactions */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{report.addressText}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleUpvote(report.id, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/30 border border-white/5 text-gray-400 transition-all"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>{report.upvoteCount}</span>
                      </button>
                      <button
                        onClick={(e) => handleConfirm(report.id, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-brand-success/10 hover:text-brand-success hover:border-brand-success/30 border border-white/5 text-gray-400 transition-all"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{report.confirmedCount}</span>
                      </button>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
