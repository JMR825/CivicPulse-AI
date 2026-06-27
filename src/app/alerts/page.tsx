"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { getAlerts, Alert } from "@/lib/dbService";
import { AlertTriangle, Clock, ShieldAlert, Sparkles, BellRing, BellOff, Volume2 } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const list = await getAlerts();
        setAlerts(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const toggleSubscription = () => {
    setSubscribed(!subscribed);
  };

  const severityColors = {
    low: "border-brand-success/30 bg-brand-success/5 text-brand-success",
    medium: "border-brand-warning/30 bg-brand-warning/5 text-brand-warning",
    high: "border-orange-500/30 bg-orange-500/5 text-orange-400",
    critical: "border-brand-danger/30 bg-brand-danger/5 text-brand-danger animate-pulse-slow",
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-white">
      <Navbar />

      <div className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="h-8 w-8 text-brand-danger animate-pulse" />
              Emergency Broadcast Center
            </h1>
            <p className="text-sm text-gray-400 mt-1">Official verified local crisis alerts and active municipal safety warnings.</p>
          </div>

          {/* Sub widget */}
          <button
            onClick={toggleSubscription}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-xs uppercase tracking-wider transition-all border ${
              subscribed
                ? "bg-brand-success/15 border-brand-success/30 text-brand-success hover:bg-brand-success/20"
                : "bg-white/5 border-white/10 hover:border-brand-primary/40 text-gray-300 hover:text-white"
            }`}
          >
            {subscribed ? (
              <>
                <BellRing className="h-4 w-4 shrink-0" />
                <span>Alerts Enabled</span>
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 shrink-0" />
                <span>Subscribe to Alerts</span>
              </>
            )}
          </button>
        </div>

        {/* Feed List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mb-4" />
            <p className="text-xs">Connecting to emergency broadcast stream...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-success/10 text-brand-success">
              <Volume2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-white text-base">All Systems Normal</h3>
            <p className="text-xs text-gray-400 font-light max-w-sm mx-auto">There are currently no active emergency alerts or crisis warning broadcasts in your area.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`glass-panel p-6 rounded-3xl relative overflow-hidden border ${severityColors[alert.severity]}`}
              >
                {/* Accent line */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  alert.severity === "critical" 
                    ? "bg-brand-danger" 
                    : alert.severity === "high" 
                    ? "bg-orange-500" 
                    : alert.severity === "medium" 
                    ? "bg-brand-warning" 
                    : "bg-brand-success"
                }`} />

                <div className="pl-2 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-gray-300">
                      Emergency Alert
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Expires: {new Date(alert.expiresAt).toLocaleTimeString()}</span>
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-white">{alert.title}</h3>
                  <p className="text-sm text-gray-200 font-light leading-relaxed">{alert.message}</p>

                  {/* Safety Advice */}
                  {alert.safetyInstructions && (
                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex gap-3 items-start">
                      <Sparkles className="h-5 w-5 text-brand-danger shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Safety Instruction</h4>
                        <p className="text-xs text-gray-300 mt-1 font-mono leading-relaxed">{alert.safetyInstructions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
