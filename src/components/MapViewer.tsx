"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapViewerProps {
  position: { lat: number; lng: number };
  title: string;
}

export default function MapViewer({ position, title }: MapViewerProps) {
  return (
    <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-white/5 shadow-inner">
      <div
        className="h-full w-full transition-all duration-500 origin-bottom"
        style={{
          transform: "perspective(900px) rotateX(42deg) scale(1.1)",
        }}
      >
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={15}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          />
          <Marker position={[position.lat, position.lng]} icon={markerIcon}>
            <Popup>{title}</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
