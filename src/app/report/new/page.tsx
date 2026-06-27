"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { createReport } from "@/lib/dbService";
import { analyzeReport } from "@/lib/gemini";
import { useTranslations } from "next-intl";
import { Sparkles, MapPin, Upload, ArrowLeft, ArrowRight, CheckCircle, ShieldAlert, AlertCircle, FileText, Image as ImageIcon } from "lucide-react";

const MapSelector = dynamic(() => import("@/components/MapSelector"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xs text-gray-500">
      Loading...
    </div>
  ),
});

export default function NewReport() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("newReport");

  // Multi-step state: 1 = Form details, 2 = AI Preview
  const [step, setStep] = useState(1);
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState({ lat: 37.7749, lng: -122.4194 }); // default San Francisco
  const [addressText, setAddressText] = useState("San Francisco City Center, CA");
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  // AI Generated Preview State
  const [aiPreview, setAiPreview] = useState<{
    category: string;
    aiSummary: string;
    priorityScore: number;
    severity: "low" | "medium" | "high" | "critical";
    crisisFlag: boolean;
    assignedDepartment: string;
    safetyInstructions: string;
    duplicateOf: string | null;
  } | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/auth");
    }
  }, [user, router]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPhotoFiles((prev) => [...prev, ...filesArray]);

      const urls = filesArray.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...urls]);
    }
  };

  const handleLocationChange = (pos: { lat: number; lng: number; address: string }) => {
    setLocation({ lat: pos.lat, lng: pos.lng });
    setAddressText(pos.address);
  };

  const handleAnalyzeClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setLoadingAI(true);
    try {
      // Call local/online analysis
      const analysis = await analyzeReport(title, description);
      
      // Look for duplicate mocks or actual
      setAiPreview({
        category: analysis.category,
        aiSummary: analysis.aiSummary,
        priorityScore: analysis.priorityScore,
        severity: analysis.severity,
        crisisFlag: analysis.crisisFlag,
        assignedDepartment: analysis.assignedDepartment,
        safetyInstructions: analysis.safetyInstructions,
        duplicateOf: null, // Initial check, will be run again on submission
      });
      setStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Create mock or real report in firestore
      const created = await createReport({
        title,
        description,
        location,
        addressText,
        photoUrls: photoPreviews, // use mock Object URLs or store them
        uid: user.uid,
      });

      router.push(`/report?id=${created.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const severityColors = {
    low: "bg-brand-success/15 text-brand-success border-brand-success/20",
    medium: "bg-brand-warning/15 text-brand-warning border-brand-warning/20",
    high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    critical: "bg-brand-danger/15 text-brand-danger border-brand-danger/20 animate-pulse",
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-white">
      <Navbar />

      <div className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 text-xs font-semibold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">
          <span className={step === 1 ? "text-brand-primary font-bold" : ""}>{t("step1")}</span>
          <ArrowRight className="h-3 w-3" />
          <span className={step === 2 ? "text-brand-primary font-bold" : ""}>{t("step2")}</span>
        </div>

        {/* Step 1: Input details */}
        {step === 1 && (
          <form onSubmit={handleAnalyzeClick} className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{t("title")}</h1>
              <p className="text-sm text-gray-400 mt-1">{t("subtitle")}</p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("issueTitle")}</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                className="glass-input w-full px-4 py-3 rounded-xl text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("description")}</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descPlaceholder")}
                className="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none"
              />
            </div>

            {/* Geolocation Map Pin */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-primary" />
                {t("selectLocation")}
              </label>
              <MapSelector position={location} onChange={handleLocationChange} />
              <p className="text-[11px] text-gray-400 font-mono mt-1 bg-white/5 px-3 py-2 rounded-xl">
                {t("locationPrefix")}{addressText}
              </p>
            </div>

            {/* Photo Upload */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-brand-primary" />
                {t("attachPhotos")}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col items-center justify-center h-28 rounded-2xl border border-dashed border-white/10 hover:border-brand-primary/40 bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                  <Upload className="h-6 w-6 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-300">{t("uploadImage")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {photoPreviews.length > 0 && (
                  <div className="flex gap-2 items-center overflow-x-auto h-28 p-2 rounded-2xl bg-white/5 border border-white/5">
                    {photoPreviews.map((url, i) => (
                      <div key={url} className="h-20 w-20 rounded-xl overflow-hidden shrink-0 relative border border-white/10 shadow-md">
                        <img src={url} alt={`Preview ${i}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={loadingAI}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:brightness-105 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{loadingAI ? t("analyzing") : t("runVerification")}</span>
            </button>
          </form>
        )}

        {/* Step 2: AI Pre-verification Preview */}
        {step === 2 && aiPreview && (
          <div className="space-y-6">
            <div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-4 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("goBack")}
              </button>
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-brand-primary animate-pulse" />
                {t("aiPreview")}
              </h1>
              <p className="text-sm text-gray-400 mt-1">{t("aiPreviewSub")}</p>
            </div>

            {/* AI Summary Card */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-brand-primary" />
                {t("aiGeneratedSummary")}
              </h3>
              <blockquote className="border-l-2 border-brand-primary pl-4 text-sm font-light italic leading-relaxed text-gray-200">
                &quot;{aiPreview.aiSummary}&quot;
              </blockquote>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category & Dept */}
              <div className="glass-panel p-6 rounded-3xl space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("classification")}</h4>
                <p className="text-sm font-bold text-white capitalize">{aiPreview.category.replace("_", " ")}</p>
                <p className="text-xs text-gray-400 mt-1">{t("routedTo")}{aiPreview.assignedDepartment}</p>
              </div>

              {/* Severity & Crisis */}
              <div className="glass-panel p-6 rounded-3xl space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("priorityMetrics")}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase border ${severityColors[aiPreview.severity]}`}>
                    {aiPreview.severity}
                  </span>
                  {aiPreview.crisisFlag && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-danger/20 text-brand-danger border border-brand-danger/30 uppercase animate-pulse">
                      {t("crisisLevel")}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">{t("priorityScore")}{aiPreview.priorityScore.toFixed(2)} / 1.00</p>
              </div>
            </div>

            {/* Safety Instructions Banner */}
            <div className="p-5 rounded-3xl bg-brand-warning/10 border border-brand-warning/20 flex gap-4">
              <AlertCircle className="h-6 w-6 text-brand-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-brand-warning uppercase tracking-wider">{t("safetyAdvice")}</h4>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed font-light">{aiPreview.safetyInstructions}</p>
              </div>
            </div>

            {/* Duplicate Notice */}
            {aiPreview.duplicateOf && (
              <div className="p-5 rounded-3xl bg-brand-danger/10 border border-brand-danger/20 flex gap-4">
                <ShieldAlert className="h-6 w-6 text-brand-danger shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-brand-danger uppercase tracking-wider">{t("duplicateWarning")}</h4>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed font-light">
                    {t("duplicateDesc", { id: aiPreview.duplicateOf })}
                  </p>
                </div>
              </div>
            )}

            {/* Confirm Submission */}
            <button
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-brand-success hover:bg-brand-success/95 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-brand-success/20 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{submitting ? t("publishing") : t("publishReport")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
