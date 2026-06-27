"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Report } from "@/lib/dbService";
import { Navigation, Loader2, Box, Layers } from "lucide-react";
import { useTranslations } from "next-intl";

// Helper to color pins depending on severity
function createCustomPin(severity: "low" | "medium" | "high" | "critical") {
  const colors = {
    low: "#10b981",       // emerald
    medium: "#f59e0b",    // amber
    high: "#f97316",      // orange
    critical: "#ef4444",  // rose red
  };
  const hex = colors[severity];
  
  return new L.DivIcon({
    html: `<div style="background-color: ${hex}; box-shadow: 0 0 10px ${hex}80; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; transform: translate(-2px, -2px);"></div>`,
    className: "custom-map-pin",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// User location blue marker
const userPin = new L.DivIcon({
  html: `<div style="background-color: #3b82f6; box-shadow: 0 0 14px #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; transform: translate(-3px, -3px);" class="animate-pulse"></div>`,
  className: "user-gps-pin",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface FullscreenMapProps {
  reports: Report[];
}

// Subcomponent to programmatically pan/zoom map
function MapRecenter({ position, zoom }: { position: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, zoom || map.getZoom());
  }, [position, map, zoom]);
  return null;
}

export default function FullscreenMap({ reports }: FullscreenMapProps) {
  const t = useTranslations("map");
  const [center, setCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [zoom, setZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [is3D, setIs3D] = useState(true);

  useEffect(() => {
    if (reports.length > 0) {
      setCenter([reports[0].location.lat, reports[0].location.lng]);
    }
  }, [reports]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert(t("geoNotSupported"));
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setCenter(coords);
        setZoom(16); // zoom in on current location
        setLoadingGps(false);
      },
      (err) => {
        console.error(err);
        alert(t("geoFailed"));
        setLoadingGps(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative h-full w-full">
      
      {/* Map Action Overlays */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* GPS Locate Me */}
        <button
          onClick={handleLocateMe}
          disabled={loadingGps}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-brand-card/85 border border-white/10 hover:border-brand-primary/40 text-gray-300 hover:text-white backdrop-blur-md transition-all disabled:opacity-50"
        >
          {loadingGps ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5 text-brand-primary" />
          )}
          <span>{loadingGps ? t("locating") : t("locateMe")}</span>
        </button>

        {/* 2D/3D Toggle */}
        <button
          onClick={() => setIs3D(!is3D)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-brand-card/85 border border-white/10 hover:border-brand-primary/40 text-gray-300 hover:text-white backdrop-blur-md transition-all"
        >
          {is3D ? (
            <Layers className="h-3.5 w-3.5 text-brand-primary" />
          ) : (
            <Box className="h-3.5 w-3.5 text-brand-primary" />
          )}
          <span>{is3D ? "2D" : "3D"}</span>
        </button>
      </div>

      <div
        className="h-full w-full transition-all duration-500 origin-bottom"
        style={is3D ? { transform: "rotateX(48deg) scale(1.2)", transformStyle: "preserve-3d", perspective: "1200px" } : {}}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          />

          {/* User Live Marker */}
          {userLocation && (
            <Marker position={userLocation} icon={userPin}>
              <Popup>
                <div className="p-1 text-center font-bold text-xs text-white">
                  {t("youAreHere")}
                </div>
              </Popup>
            </Marker>
          )}

          {reports.map((report) => {
            const pin = createCustomPin(report.severity);
            return (
              <Marker
                key={report.id}
                position={[report.location.lat, report.location.lng]}
                icon={pin}
              >
                <Popup>
                  <div className="p-1 space-y-2 text-white font-sans max-w-[240px]">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-gray-300">
                        {report.category.replace("_", " ")}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        report.severity === "critical" 
                          ? "text-red-400" 
                          : report.severity === "high" 
                          ? "text-orange-400" 
                          : report.severity === "medium" 
                          ? "text-amber-400" 
                          : "text-emerald-400"
                      }`}>
                        {report.severity}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm line-clamp-1 leading-tight">{report.title}</h4>
                    
                    {report.aiSummary && (
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed italic">
                        &quot;{report.aiSummary}&quot;
                      </p>
                    )}

                    <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px]">
                      <span className="text-gray-500">{t("status")}{report.status.replace("_", " ")}</span>
                      <Link
                        href={`/report?id=${report.id}`}
                        className="font-bold text-brand-primary hover:underline"
                      >
                        {t("viewTimeline")}
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <MapRecenter position={center} zoom={zoom} />
        </MapContainer>
      </div>
    </div>
  );
}
