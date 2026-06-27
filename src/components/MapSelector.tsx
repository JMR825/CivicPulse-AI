"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// Fix default marker icon compilation bugs in Next.js
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapSelectorProps {
  position: { lat: number; lng: number };
  onChange: (pos: { lat: number; lng: number; address: string }) => void;
}

// Subcomponent to handle map click events
function ClickHandler({ setPos, onChange, enabled }: { setPos: any; onChange: any; enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (!enabled) return; // Disable clicks in 3D mode due to coordinate skew
      const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPos(newPos);
      
      const mockAddress = `Selected Position (lat: ${newPos.lat.toFixed(4)}, lng: ${newPos.lng.toFixed(4)})`;
      onChange({ ...newPos, address: mockAddress });
    },
  });
  return null;
}

// Subcomponent to programmatically center the map
function MapRecenter({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], 16);
  }, [position, map]);
  return null;
}

export default function MapSelector({ position, onChange }: MapSelectorProps) {
  const t = useTranslations("newReport");
  const [markerPos, setMarkerPos] = useState(position);
  const [loadingGps, setLoadingGps] = useState(false);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    setMarkerPos(position);
  }, [position]);

  // Handle Dragging
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const newPos = { lat: latLng.lat, lng: latLng.lng };
          setMarkerPos(newPos);
          const address = `Dragged Pin Position (lat: ${newPos.lat.toFixed(4)}, lng: ${newPos.lng.toFixed(4)})`;
          onChange({ ...newPos, address });
        }
      },
    }),
    [onChange]
  );

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert(t("geoNotSupported"));
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMarkerPos(coords);
        const address = `Verified GPS Location (lat: ${coords.lat.toFixed(4)}, lng: ${coords.lng.toFixed(4)})`;
        onChange({ ...coords, address });
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
    <div className="relative h-72 w-full rounded-2xl overflow-hidden border border-white/5 shadow-inner">
      
      {/* Map Control Overlays */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* GPS Button */}
        <button
          type="button"
          onClick={handleUseGps}
          disabled={loadingGps}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-brand-card/85 border border-white/10 hover:border-brand-primary/40 text-gray-300 hover:text-white backdrop-blur-md transition-all disabled:opacity-50"
        >
          {loadingGps ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5 text-brand-primary" />
          )}
          <span>{loadingGps ? "Locating..." : t("useLiveGps")}</span>
        </button>
      </div>

      <div
        className="h-full w-full transition-all duration-500 origin-bottom"
        style={{
          transform: "perspective(900px) rotateX(42deg) scale(1.15)",
        }}
      >
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={13}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          />
          <Marker
            draggable={true} // Enable drag for manual adjustment
            eventHandlers={eventHandlers}
            ref={markerRef}
            position={[markerPos.lat, markerPos.lng]}
            icon={markerIcon}
          />
          <ClickHandler setPos={setMarkerPos} onChange={onChange} enabled={true} />
          <MapRecenter position={markerPos} />
        </MapContainer>
      </div>
    </div>
  );
}
