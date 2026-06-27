"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  getReportById,
  upvoteReport,
  confirmReport,
  addComment,
  getComments,
  getStatusHistory,
  Report,
  Comment,
} from "@/lib/dbService";
import {
  MapPin,
  Clock,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Briefcase,
  AlertTriangle,
  History,
  CheckCircle,
  FileText,
  Send,
} from "lucide-react";

// Load MapViewer dynamically
const MapViewer = dynamic(() => import("@/components/MapViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-60 w-full rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xs text-gray-500">
      Loading interactive map...
    </div>
  ),
});

function ReportDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("report");
  const tStatus = useTranslations("statuses");

  const [report, setReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadReportData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const rep = await getReportById(id);
      if (!rep) {
        setReport(null);
        return;
      }
      setReport(rep);
      
      const comms = await getComments(id);
      setComments(comms);

      const hist = await getStatusHistory(id);
      setStatusHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadReportData();
    })();
  }, [id]);

  const handleUpvote = async () => {
    if (!user || !report) return;
    try {
      const newCount = await upvoteReport(report.id, user.uid);
      setReport({ ...report, upvoteCount: newCount });
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirm = async () => {
    if (!user || !report) return;
    try {
      const newCount = await confirmReport(report.id, user.uid);
      setReport({ ...report, confirmedCount: newCount });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim() || !report) return;

    setSubmittingComment(true);
    try {
      const comm = await addComment(
        report.id,
        user.uid,
        user.displayName || "Citizen",
        user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        commentText
      );
      setComments((prev) => [...prev, comm]);
      setCommentText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-brand-bg text-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mb-4" />
          <p className="text-xs">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col min-h-screen bg-brand-bg text-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="h-12 w-12 text-brand-warning mb-4" />
          <h2 className="text-xl font-bold">{t("notFound")}</h2>
          <p className="text-sm text-gray-400 mt-2">{t("notFoundDesc")}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs font-semibold bg-brand-primary text-white px-4 py-2 rounded-xl mt-6"
          >
            {t("returnToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  const severityColors = {
    low: "bg-brand-success/10 text-brand-success border-brand-success/20",
    medium: "bg-brand-warning/10 text-brand-warning border-brand-warning/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critical: "bg-brand-danger/10 text-brand-danger border-brand-danger/20 animate-pulse",
  };

  const statusColors = {
    submitted: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    under_review: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    verified: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    in_progress: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    resolved: "text-brand-success bg-brand-success/10 border-brand-success/20",
    rejected: "text-brand-danger bg-brand-danger/10 border-brand-danger/20",
    duplicate: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  };

  const statusLabels = {
    submitted: tStatus("submitted"),
    under_review: tStatus("under_review"),
    verified: tStatus("verified"),
    in_progress: tStatus("in_progress"),
    resolved: tStatus("resolved"),
    rejected: tStatus("rejected"),
    duplicate: tStatus("duplicate"),
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-white">
      <Navbar />

      <div className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-6 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToDashboard")}
        </button>

        {/* Title Grid */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 uppercase tracking-wider text-gray-300">
                {report.category.replace("_", " ")}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${severityColors[report.severity]}`}>
                {t("severityBadge", { severity: report.severity })}
              </span>
              {report.crisisFlag && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand-danger/25 text-brand-danger border border-brand-danger/30 uppercase animate-pulse">
                  {t("crisisAlert")}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-white leading-tight">{report.title}</h1>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5 flex-wrap">
              <MapPin className="h-3.5 w-3.5" />
              <span>{report.addressText}</span>
              <span className="text-white/10">|</span>
              <Clock className="h-3.5 w-3.5" />
              <span>{t("reportedOn")}{new Date(report.createdAt).toLocaleString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-4 py-2 border rounded-xl uppercase tracking-wider ${statusColors[report.status]}`}>
              {t("status")}{statusLabels[report.status]}
            </span>
          </div>
        </div>

        {/* Content Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description & Photos */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-brand-primary" />
                {t("issueDescription")}
              </h3>
              <p className="text-sm font-light leading-relaxed text-gray-200 whitespace-pre-line">
                {report.description}
              </p>

              {report.photoUrls && report.photoUrls.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {report.photoUrls.map((url, i) => (
                    <div key={url} className="rounded-2xl overflow-hidden border border-white/5 shadow-md">
                      <img src={url} alt={`Evidence ${i}`} className="w-full h-48 object-cover hover:scale-105 transition-all duration-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Summarized & Dept */}
            {report.aiSummary && (
              <div className="glass-panel p-6 rounded-3xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-brand-primary/10 rounded-bl-3xl">
                  <Sparkles className="h-5 w-5 text-brand-primary animate-pulse" />
                </div>
                <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5">
                  {t("aiSummary")}
                </h3>
                <p className="text-sm font-light text-gray-200 italic leading-relaxed">
                  &quot;{report.aiSummary}&quot;
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Briefcase className="h-4 w-4 text-brand-primary" />
                  <span>{t("routedTo")}<strong className="text-white font-bold">{report.assignedDepartment}</strong></span>
                </div>
              </div>
            )}

            {/* Interactive Comment Thread */}
            <div className="glass-panel p-6 rounded-3xl space-y-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-brand-primary" />
                {t("communityDiscussion", { count: comments.length })}
              </h3>

              {user ? (
                <form onSubmit={handleCommentSubmit} className="flex gap-3">
                  <input
                    type="text"
                    required
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t("commentPlaceholder")}
                    className="glass-input flex-1 px-4 py-2.5 rounded-xl text-xs"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-white p-2.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <p className="text-xs text-gray-500 italic">{t("signInToComment")}</p>
              )}

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-500 font-light">{t("noComments")}</p>
                ) : (
                  comments.map((comm) => (
                    <div key={comm.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                      <img src={comm.photoURL} alt="Avatar" className="h-8 w-8 rounded-lg object-cover bg-white/10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                           <span className="text-xs font-bold text-white">{comm.displayName}</span>
                           <span className="text-[10px] text-gray-500">{new Date(comm.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1 font-light leading-relaxed">{comm.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Maps, Vote and Timeline */}
          <div className="space-y-6">
            
            {/* Community Validation Card */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t("communityValidation")}</h3>
              <p className="text-xs text-gray-400 font-light">{t("validationDesc")}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleUpvote}
                  disabled={!user}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-brand-primary/15 border border-white/5 hover:border-brand-primary/30 transition-all text-center group"
                >
                  <ThumbsUp className="h-5 w-5 text-gray-400 group-hover:text-brand-primary transition-all mb-2" />
                  <span className="text-xs font-bold text-white">{report.upvoteCount}</span>
                  <span className="text-[9px] text-gray-500">{t("upvotes")}</span>
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={!user}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-brand-success/15 border border-white/5 hover:border-brand-success/30 transition-all text-center group"
                >
                  <CheckCircle className="h-5 w-5 text-gray-400 group-hover:text-brand-success transition-all mb-2" />
                  <span className="text-xs font-bold text-white">{report.confirmedCount}</span>
                  <span className="text-[9px] text-gray-500">{t("confirmations")}</span>
                </button>
              </div>
            </div>

            {/* Micro Map */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-primary" />
                {t("issueLocation")}
              </h3>
              <MapViewer position={report.location} title={report.title} />
            </div>

            {/* Timeline Tracking */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="h-4 w-4 text-brand-primary" />
                {t("resolutionTimeline")}
              </h3>
              
              <div className="space-y-6 relative pl-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/15">
                
                {statusHistory.length > 0 ? (
                  statusHistory.map((h, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[13px] top-1 h-3.5 w-3.5 rounded-full border-2 border-brand-primary bg-brand-bg shadow-md" />
                      <div className="pl-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {t("statusChanged")}{statusLabels[h.toStatus as keyof typeof statusLabels] || h.toStatus}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(h.timestamp).toLocaleDateString()}</p>
                        {h.note && (
                          <p className="text-[11px] text-gray-300 mt-1 font-light italic">
                            &quot;{h.note}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="relative">
                      <div className="absolute -left-[13px] top-1 h-3.5 w-3.5 rounded-full border-2 border-brand-primary bg-brand-bg shadow-md" />
                      <div className="pl-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{t("reportFiled")}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(report.createdAt).toLocaleDateString()}</p>
                        <p className="text-[11px] text-gray-300 mt-1 font-light italic">&quot;{t("reportCreated")}&quot;</p>
                      </div>
                    </div>

                    {report.status !== "submitted" && (
                      <div className="relative">
                        <div className="absolute -left-[13px] top-1 h-3.5 w-3.5 rounded-full border-2 border-brand-primary bg-brand-bg shadow-md" />
                        <div className="pl-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{statusLabels[report.status]}</span>
                          <p className="text-[10px] text-gray-400 mt-0.5">{new Date().toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default function ReportDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-brand-bg text-white">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mb-4" />
          <p className="text-xs">Loading...</p>
        </div>
      </div>
    }>
      <ReportDetailsContent />
    </Suspense>
  );
}
