"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getReports, getAlerts, Report, Alert } from "@/lib/dbService";
import { ShieldAlert, Users, Award, Landmark, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState({
    totalReports: 0,
    resolvedCount: 0,
    activeCrisisCount: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const reps = await getReports();
        const activeAlts = await getAlerts();
        setAlerts(activeAlts);
        setStats({
          totalReports: reps.length,
          resolvedCount: reps.filter((r) => r.status === "resolved").length,
          activeCrisisCount: activeAlts.length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-white">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-primary/10 blur-[120px]" />
          <div className="absolute top-10 left-10 -z-10 h-72 w-72 rounded-full bg-brand-secondary/5 blur-[100px]" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-6 uppercase tracking-wider animate-pulse">
              <ShieldAlert className="h-3.5 w-3.5" />
              Connected Civic Action Platform
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent max-w-4xl mx-auto leading-[1.15]">
              Resolve Civic Hazards, Empower Communities
            </h1>
            
            <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
              CivicPulse AI combines citizen reporting with Google Gemini AI to categorize, summarize, and resolve municipal hazards like broken water pipes, potholes, and critical safety emergencies.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/report/new"
                className="flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:brightness-105 text-white font-semibold px-8 py-4 rounded-2xl shadow-xl shadow-brand-primary/25 hover:shadow-brand-primary/35 hover:scale-[1.02] transition-all duration-300"
              >
                Report a Local Issue
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-gray-300 hover:text-white border border-white/10 hover:border-white/20 px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-md transition-all"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Crisis Banner Feed (If any active) */}
        {alerts.length > 0 && (
          <section className="py-6 bg-brand-danger/10 border-y border-brand-danger/20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-danger/20 text-brand-danger animate-pulse-slow">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">Active Local Emergencies ({alerts.length})</h3>
                    <p className="text-xs text-brand-danger/90 mt-0.5">{alerts[0].title}: {alerts[0].message}</p>
                  </div>
                </div>
                <Link
                  href="/alerts"
                  className="text-xs font-bold text-white underline hover:text-brand-danger transition-all"
                >
                  View Emergency Safety Alerts &rarr;
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Stats Grid */}
        <section className="py-16 md:py-20 border-t border-white/5 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary mb-6">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <h3 className="text-gray-400 text-sm font-semibold tracking-wide uppercase">Reported Hazards</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">
                    {loading ? "..." : stats.totalReports}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-4">Hazards submitted and tracked by the community</p>
              </div>

              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-success/10 text-brand-success mb-6">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-gray-400 text-sm font-semibold tracking-wide uppercase">Resolved Complaints</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">
                    {loading ? "..." : stats.resolvedCount}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-4">Verified resolutions and repaired municipal facilities</p>
              </div>

              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-danger/10 text-brand-danger mb-6">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h3 className="text-gray-400 text-sm font-semibold tracking-wide uppercase">Active Emergencies</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">
                    {loading ? "..." : stats.activeCrisisCount}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-4">Critical warnings broadcasted by city administrators</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-20 bg-black/20 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-extrabold text-white">How CivicPulse AI Works</h2>
              <p className="text-gray-400 mt-4 font-light">Advanced AI routing combined with trust-driven community validations.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-xl shadow-brand-primary/10 mb-6">
                  <Users className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-white">1. Citizen Submission</h3>
                <p className="text-gray-400 mt-3 text-sm font-light leading-relaxed">
                  Citizens submit reports with pictures and GPS coordinates. Gemini AI compiles user inputs into a structured summaries instantly.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-secondary to-purple-600 text-white shadow-xl shadow-purple-600/10 mb-6">
                  <Award className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-white">2. AI Validation & Deduplication</h3>
                <p className="text-gray-400 mt-3 text-sm font-light leading-relaxed">
                  Our system detects duplicates using distance matrices and semantic comparison, categorizing and routing to correct departments.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-success to-emerald-700 text-white shadow-xl shadow-brand-success/10 mb-6">
                  <Landmark className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-white">3. Resolution & Alerts</h3>
                <p className="text-gray-400 mt-3 text-sm font-light leading-relaxed">
                  Admins assign, verify, and resolve issues, while publishing high-priority safety alert banners for urgent community warnings.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 bg-black/40 text-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} CivicPulse AI. Developed for civic resolution and smart city emergency management.</p>
      </footer>
    </div>
  );
}
