"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  getReports,
  getAlerts,
  getAuditLogs,
  adminVerifyReport,
  adminMergeReport,
  adminPublishAlert,
  Report,
  Alert,
  AuditLog,
} from "@/lib/dbService";
import {
  Shield,
  ListTodo,
  AlertTriangle,
  BarChart3,
  History,
  CheckCircle,
  XCircle,
  Briefcase,
  AlertCircle,
  GitMerge,
  Eye,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";

export default function AdminConsole() {
  const { user } = useAuth();
  const router = useRouter();

  // Route protection
  useEffect(() => {
    if (!user) {
      router.push("/auth");
    } else if (user.role !== "admin" && user.role !== "moderator") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Tab state: "queue" | "alerts" | "analytics" | "audit"
  const [activeTab, setActiveTab] = useState<"queue" | "alerts" | "analytics" | "audit">("queue");
  
  // Data lists
  const [reports, setReports] = useState<Report[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal drawer for report verification
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [targetDept, setTargetDept] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // New Crisis Alert state
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<"low" | "medium" | "high" | "critical">("high");
  const [alertExpiresHours, setAlertExpiresHours] = useState(24);
  const [alertReportId, setAlertReportId] = useState("");

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const reps = await getReports();
      const alts = await getAlerts();
      const logs = await getAuditLogs();
      setReports(reps);
      setAlerts(alts);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      void (async () => {
        await loadAllAdminData();
      })();
    }
  }, [user]);

  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return (
      <div className="flex flex-col min-h-screen bg-brand-bg text-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Shield className="h-12 w-12 text-brand-danger animate-pulse mb-4" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-sm text-gray-400 mt-2">Only authorized administrators or moderators can access this console.</p>
        </div>
      </div>
    );
  }

  // Handle Verify/Reject/Progress/Resolve
  const handleVerifyAction = async (action: "verify" | "reject" | "in_progress" | "resolve") => {
    if (!selectedReport || !user) return;
    setActionLoading(true);
    try {
      await adminVerifyReport(selectedReport.id, user.uid, user.email || "", action, adminNote || `Report marked as ${action}`);
      setSelectedReport(null);
      setAdminNote("");
      await loadAllAdminData(); // reload
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Merge Duplicates
  const handleMergeAction = async () => {
    if (!selectedReport || !mergeTargetId || !user) return;
    setActionLoading(true);
    try {
      await adminMergeReport(selectedReport.id, mergeTargetId, user.uid, user.email || "", adminNote || "Merged duplicate report.");
      setSelectedReport(null);
      setMergeTargetId("");
      setAdminNote("");
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Crisis Alert
  const handlePublishAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== "admin") return; // restricted to full admin
    if (!alertTitle || !alertMessage || !alertReportId) return;

    const rep = reports.find((r) => r.id === alertReportId);
    if (!rep) return;

    setActionLoading(true);
    try {
      await adminPublishAlert({
        reportId: alertReportId,
        title: alertTitle,
        message: alertMessage,
        severity: alertSeverity,
        geoArea: { lat: rep.location.lat, lng: rep.location.lng, radiusKm: 3 },
        createdBy: user.uid,
        adminEmail: user.email || "",
        expiresInHours: alertExpiresHours,
      });

      setAlertTitle("");
      setAlertMessage("");
      setAlertReportId("");
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Heuristic Analytics
  const pendingReports = reports.filter((r) => ["submitted", "under_review"].includes(r.status));
  const activeAlerts = alerts;

  // Render Analytics tab computations
  const total = reports.length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const categoriesCount = reports.reduce((acc: any, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-white">
      <Navbar />

      <div className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Title */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Shield className="h-7 w-7 text-brand-primary" />
              Administrative Control Panel
            </h1>
            <p className="text-xs text-gray-400 mt-1">Review hazard queues, merge duplicates, broadcast alerts, and audit system actions.</p>
          </div>
          <button
            onClick={loadAllAdminData}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white border border-white/5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Pending Review</span>
              <span className="text-3xl font-extrabold text-white mt-1 block">{pendingReports.length}</span>
            </div>
            <ListTodo className="h-8 w-8 text-brand-primary opacity-60" />
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Active Alerts</span>
              <span className="text-3xl font-extrabold text-brand-danger mt-1 block">{activeAlerts.length}</span>
            </div>
            <AlertTriangle className="h-8 w-8 text-brand-danger opacity-60 animate-pulse" />
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Resolution Rate</span>
              <span className="text-3xl font-extrabold text-brand-success mt-1 block">
                {total > 0 ? `${Math.round((resolved / total) * 100)}%` : "0%"}
              </span>
            </div>
            <CheckCircle className="h-8 w-8 text-brand-success opacity-60" />
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-white/5 mb-8">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "queue"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Verification Queue
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "alerts"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Crisis Alerts
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "analytics"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            System Metrics
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === "audit"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Audit Logs
          </button>
        </div>

        {/* Tab Content panels */}
        {activeTab === "queue" && (
          <div className="space-y-4">
            {pendingReports.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl text-gray-400">
                All submissions reviewed! The verification queue is currently empty.
              </div>
            ) : (
              pendingReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => {
                    setSelectedReport(report);
                    setTargetDept(report.assignedDepartment);
                  }}
                  className="glass-panel glass-panel-hover p-6 rounded-3xl cursor-pointer relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap text-[10px] font-bold uppercase tracking-wider">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                        {report.category.replace("_", " ")}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${
                        report.severity === "critical" 
                          ? "bg-brand-danger/10 text-brand-danger border-brand-danger/20 animate-pulse" 
                          : "bg-brand-warning/10 text-brand-warning border-brand-warning/20"
                      }`}>
                        {report.severity}
                      </span>
                      <span className="text-gray-500">Priority Score: {report.priorityScore.toFixed(2)}</span>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-tight">{report.title}</h3>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-1 font-light leading-relaxed">{report.description}</p>
                    {report.aiSummary && (
                      <p className="text-[11px] text-brand-primary mt-2 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>AI Summarized: "{report.aiSummary}"</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                    <span className="text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                    <button className="bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary text-brand-primary hover:text-white font-bold px-4 py-2 rounded-xl transition-all">
                      Review Issue
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create form (restricted to Admin role) */}
            <div className="glass-panel p-6 rounded-3xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-brand-danger animate-pulse" />
                  Publish Crisis Alert
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">Publish an emergency banner warnings to all citizens.</p>
              </div>

              {user.role !== "admin" ? (
                <div className="p-4 rounded-xl bg-brand-warning/5 border border-brand-warning/25 text-xs text-brand-warning">
                  Moderator account restricted from publishing alerts. Only full administrators can broadcast emergencies.
                </div>
              ) : (
                <form onSubmit={handlePublishAlert} className="space-y-4">
                  {/* Select Report ID */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Issue Report</label>
                    <select
                      required
                      value={alertReportId}
                      onChange={(e) => {
                        setAlertReportId(e.target.value);
                        const r = reports.find((x) => x.id === e.target.value);
                        if (r) {
                          setAlertTitle(`CRITICAL BROADCAST: ${r.title}`);
                          setAlertMessage(r.aiSummary || r.description);
                        }
                      }}
                      className="glass-input w-full px-3 py-2 text-xs rounded-xl"
                    >
                      <option value="">-- Choose verified report --</option>
                      {reports
                        .filter((r) => r.status !== "resolved")
                        .map((r) => (
                          <option key={r.id} value={r.id} className="bg-brand-bg">
                            #{r.id.substring(0, 5)} - {r.title} ({r.severity})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Broadcast Title</label>
                    <input
                      type="text"
                      required
                      value={alertTitle}
                      onChange={(e) => setAlertTitle(e.target.value)}
                      placeholder="e.g. CRITICAL: Flooding on Oak Avenue"
                      className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Safety Message / Instruction</label>
                    <textarea
                      required
                      rows={3}
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      placeholder="Instruct citizens to avoid the zone..."
                      className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl resize-none"
                    />
                  </div>

                  {/* Severity */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Severity Level</label>
                    <select
                      value={alertSeverity}
                      onChange={(e: any) => setAlertSeverity(e.target.value)}
                      className="glass-input w-full px-3 py-2 text-xs rounded-xl"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expiry (Hours)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={168}
                      value={alertExpiresHours}
                      onChange={(e) => setAlertExpiresHours(parseInt(e.target.value))}
                      className="glass-input w-full px-3.5 py-2.5 text-xs rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-brand-danger hover:bg-brand-danger/95 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-danger/25 text-xs transition-all"
                  >
                    Broadcast Emergency Alert
                  </button>
                </form>
              )}
            </div>

            {/* List active alerts */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Clock className="h-4 w-4 text-brand-primary" />
                Active Alerts ({activeAlerts.length})
              </h3>

              {activeAlerts.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl text-gray-500">
                  No active crisis warnings currently active.
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="glass-panel p-5 rounded-2xl border border-brand-danger/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand-danger" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-white text-sm">{alert.title}</h4>
                        <p className="text-xs text-gray-400 mt-1 font-light leading-relaxed">{alert.message}</p>
                        <p className="text-[10px] text-gray-500 mt-2">Expires: {new Date(alert.expiresAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Category breakdown */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
                <BarChart3 className="h-4.5 w-4.5 text-brand-primary" />
                Issue Distribution by Category
              </h3>

              <div className="space-y-4">
                {Object.entries(categoriesCount).map(([cat, count]: [string, any]) => {
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-300">
                        <span className="capitalize">{cat.replace("_", " ")}</span>
                        <span className="font-semibold">{count} reports ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-brand-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resolution metrics */}
            <div className="glass-panel p-6 rounded-3xl space-y-6">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
                <Shield className="h-4.5 w-4.5 text-brand-primary" />
                Resolution Metrics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <span className="text-2xl font-extrabold text-brand-success">{resolved}</span>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Resolved</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <span className="text-2xl font-extrabold text-brand-primary">{reports.filter((r) => r.status === "in_progress").length}</span>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">In Progress</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <span className="text-2xl font-extrabold text-yellow-400">{reports.filter((r) => r.status === "under_review").length}</span>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Under Review</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <span className="text-2xl font-extrabold text-red-500">{reports.filter((r) => r.status === "submitted").length}</span>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Submitted</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 text-xs text-center">
                <span className="text-gray-400 block mb-1">Average Incident Resolution Time</span>
                <strong className="text-white text-lg font-bold">24.5 Hours</strong>
              </div>
            </div>

          </div>
        )}

        {activeTab === "audit" && (
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
              <History className="h-4.5 w-4.5 text-brand-primary" />
              Administrative Audit Logs
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-gray-500 font-light">No administrative actions logged yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-xs">
                    <div className="shrink-0 mt-0.5">
                      <span className="bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                        {log.actionType}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{log.note}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        By: {log.adminEmail} ({log.adminUid}) | Date: {new Date(log.createdAt).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Target: {log.targetType} #{log.targetId}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Verification Drawer Dialog */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-[#0c1220] border-l border-white/5 p-8 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="space-y-6 overflow-y-auto pr-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold text-white">Review Civic Report</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-white text-xs border border-white/10 px-2.5 py-1 rounded-lg"
                >
                  Close
                </button>
              </div>

              {/* Title & info */}
              <div>
                <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 uppercase">
                  {selectedReport.category}
                </span>
                <h3 className="text-lg font-bold text-white mt-2 leading-tight">{selectedReport.title}</h3>
                <p className="text-xs text-gray-300 mt-2 font-light leading-relaxed whitespace-pre-line bg-white/5 p-4 rounded-2xl border border-white/5">
                  {selectedReport.description}
                </p>
              </div>

              {/* Action Note */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Admin / Moderator Note</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Provide resolution details or verification justification..."
                  rows={3}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs resize-none"
                />
              </div>

              {/* Duplicate Merger field */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-gray-300 font-bold">
                  <GitMerge className="h-4 w-4 text-brand-primary" />
                  Merge as Duplicate
                </div>
                <p className="text-[10px] text-gray-400">If this report is a duplicate of another active report, enter the other Report ID to merge it.</p>
                <div className="flex gap-2">
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="glass-input flex-1 px-3 py-2 text-xs rounded-xl"
                  >
                    <option value="">-- Choose primary report --</option>
                    {reports
                      .filter((x) => x.id !== selectedReport.id && x.status !== "resolved" && x.status !== "duplicate")
                      .map((x) => (
                        <option key={x.id} value={x.id} className="bg-brand-bg">
                          #{x.id.substring(0, 5)} - {x.title}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleMergeAction}
                    disabled={!mergeTargetId || actionLoading}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold px-4 rounded-xl disabled:opacity-50"
                  >
                    Merge
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="border-t border-white/5 pt-6 flex gap-3 flex-wrap">
              <button
                onClick={() => handleVerifyAction("verify")}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-success hover:bg-brand-success/95 text-white font-bold py-3 px-4 rounded-xl text-xs disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Verify Report
              </button>

              <button
                onClick={() => handleVerifyAction("in_progress")}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-warning hover:bg-brand-warning/95 text-white font-bold py-3 px-4 rounded-xl text-xs disabled:opacity-50"
              >
                <Briefcase className="h-4 w-4" />
                Mark In Progress
              </button>

              <button
                onClick={() => handleVerifyAction("resolve")}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 px-4 rounded-xl text-xs disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Resolve Issue
              </button>

              <button
                onClick={() => handleVerifyAction("reject")}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-danger hover:bg-brand-danger/95 text-white font-bold py-3 px-4 rounded-xl text-xs disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
