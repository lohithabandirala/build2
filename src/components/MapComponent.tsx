"use client";

import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

export default function MapComponent({ feedbackData }: { feedbackData: any[] }) {
  // Center of India roughly
  const center = [22.9074872, 79.0730667]; 
  
  return (
    <div style={{ height: '100%', width: '100%', minHeight: '300px', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer center={center as any} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark theme tile layer
        />
        
        {feedbackData.length === 0 && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, background: 'rgba(0,0,0,0.8)', padding: '0.5rem 1rem', borderRadius: '4px', color: 'white' }}>
            No infrastructure issues reported yet.
          </div>
        )}

        {feedbackData.map((fb) => {
          if (!fb.location) return null;
          
          const isCritical = fb.ai_analysis?.urgency_score > 7;
          const color = isCritical ? 'var(--accent)' : 'var(--primary)';
          
          return (
            <CircleMarker 
              key={fb.id} 
              center={[fb.location.lat, fb.location.lng]} 
              pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }} 
              radius={10}
            >
              <Popup>
                <strong>{fb.ai_analysis?.category || fb.category}</strong><br/>
                {fb.ai_analysis?.summary || fb.text}
              </Popup>
            </CircleMarker>
          );
        })}

        
      </MapContainer>
    </div>
  );
}
