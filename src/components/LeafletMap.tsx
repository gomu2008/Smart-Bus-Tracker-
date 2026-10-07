import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Bus, Route, Stop, BusLocation } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Navigation, Maximize2, ShieldAlert } from 'lucide-react';

interface LeafletMapProps {
  buses?: Bus[];
  routes?: Route[];
  stops?: Stop[];
  locations?: Record<string, BusLocation>;
  selectedRouteId?: string;
  selectedStopId?: string;
  onStopSelect?: (stop: Stop) => void;
  onBusSelect?: (bus: Bus) => void;
  onMapClick?: (lat: number, lng: number) => void;
  tempMarker?: { lat: number; lng: number; label?: string } | null;
  interactivePickMode?: boolean;
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  buses = [],
  routes = [],
  stops = [],
  locations = {},
  selectedRouteId,
  selectedStopId,
  onStopSelect,
  onBusSelect,
  onMapClick,
  tempMarker,
  interactivePickMode = false,
  className = 'h-[500px] w-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routePolylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const { theme } = useTheme();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center around Tirunelveli, Tamil Nadu campus hub
    const map = L.map(mapContainerRef.current, {
      center: [8.7139, 77.7567],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer based on theme
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      theme === 'dark'
        ? '&copy; <a href="https://carto.com/">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [theme]);

  // Click Handler for Admin Stop Placement
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick]);

  // Render Temp Marker (for Stop creation)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tempMarker) {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setLatLng([tempMarker.lat, tempMarker.lng]);
      } else {
        const pinIcon = L.divIcon({
          className: 'custom-temp-pin',
          html: `
            <div style="background-color: #ef4444; color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">
              <div style="transform: rotate(45deg); font-weight: bold; font-size: 14px;">📍</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        tempMarkerRef.current = L.marker([tempMarker.lat, tempMarker.lng], { icon: pinIcon }).addTo(map);
      }
    } else if (tempMarkerRef.current) {
      map.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  }, [tempMarker]);

  // Render Route Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing polylines
    routePolylinesRef.current.forEach(polyline => map.removeLayer(polyline));
    routePolylinesRef.current.clear();

    const displayRoutes = selectedRouteId
      ? routes.filter(r => r.id === selectedRouteId)
      : routes;

    displayRoutes.forEach(route => {
      if (!route.stops || route.stops.length < 2) return;

      const latlngs: [number, number][] = route.stops
        .filter(s => s.latitude && s.longitude)
        .map(s => [s.latitude, s.longitude]);

      if (latlngs.length < 2) return;

      const isSelected = selectedRouteId === route.id;
      const polyline = L.polyline(latlngs, {
        color: route.color || '#F59E0B',
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray: isSelected ? undefined : '6, 6',
      }).addTo(map);

      polyline.bindTooltip(
        `<b>${route.name}</b><br/><span style="font-size: 11px;">${route.stops.length} stops · ${route.estimatedDurationMinutes} mins</span>`,
        { sticky: true }
      );

      routePolylinesRef.current.set(route.id, polyline);
    });
  }, [routes, selectedRouteId]);

  // Render Stop Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear removed stops
    const currentStopIds = new Set(stops.map(s => s.id));
    stopMarkersRef.current.forEach((marker, id) => {
      if (!currentStopIds.has(id)) {
        map.removeLayer(marker);
        stopMarkersRef.current.delete(id);
      }
    });

    stops.forEach(stop => {
      if (!stop.latitude || !stop.longitude) return;

      const isSelected = selectedStopId === stop.id;
      const markerHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="
            background: ${isSelected ? '#F59E0B' : '#1E293B'};
            color: ${isSelected ? '#000000' : '#FFFFFF'};
            border: 2px solid ${isSelected ? '#FFFFFF' : '#64748B'};
            border-radius: 9999px;
            width: ${isSelected ? '26px' : '20px'};
            height: ${isSelected ? '26px' : '20px'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
            transition: all 0.2s ease;
          " class="${isSelected ? 'stop-marker-pulse' : ''}">
            ${stop.stopOrder || '●'}
          </div>
          <span style="
            margin-top: 2px;
            font-size: 10px;
            font-weight: 600;
            background: rgba(15, 23, 42, 0.85);
            color: #f8fafc;
            padding: 1px 6px;
            border-radius: 4px;
            white-space: nowrap;
            max-width: 110px;
            overflow: hidden;
            text-overflow: ellipsis;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${stop.name}</span>
        </div>
      `;

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: markerHtml,
        iconSize: [110, 40],
        iconAnchor: [55, 12],
      });

      let marker = stopMarkersRef.current.get(stop.id);
      if (marker) {
        marker.setLatLng([stop.latitude, stop.longitude]);
        marker.setIcon(stopIcon);
      } else {
        marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(map);
        marker.on('click', () => {
          if (onStopSelect) onStopSelect(stop);
        });
        stopMarkersRef.current.set(stop.id, marker);
      }

      // Popup Content
      marker.bindPopup(`
        <div style="padding: 12px; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${stop.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">Code: <span style="font-weight: 600; color: #d97706;">${stop.code}</span></div>
          ${stop.landmark ? `<div style="font-size: 11px; color: #475569; margin-bottom: 4px;">📍 ${stop.landmark}</div>` : ''}
          ${stop.address ? `<div style="font-size: 11px; color: #64748b;">${stop.address}</div>` : ''}
          <div style="margin-top: 8px; pt-2; border-top: 1px solid #e2e8f0; font-size: 11px; color: #2563eb; font-weight: 600;">
            Click to set as pickup stop
          </div>
        </div>
      `);
    });
  }, [stops, selectedStopId, onStopSelect]);

  // Render & Animate Bus Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Keep active bus IDs
    const activeBusIds = new Set(buses.map(b => b.id));

    // Remove defunct markers
    busMarkersRef.current.forEach((marker, id) => {
      if (!activeBusIds.has(id)) {
        map.removeLayer(marker);
        busMarkersRef.current.delete(id);
      }
    });

    buses.forEach(bus => {
      const loc = locations[bus.id];
      if (!loc || !loc.latitude || !loc.longitude) return;

      const trip = bus.activeTrip;
      const isDelayed = (loc.delayMinutes || trip?.delayMinutes || 0) > 0;
      const delayMins = loc.delayMinutes || trip?.delayMinutes || 0;
      const speedKmH = Math.round(loc.speed || 0);
      const isSignalLost = (Date.now() - new Date(loc.timestamp).getTime()) > 60000;

      // Status indicator color: Green = active/on-time, Amber = delayed, Red = signal lost
      const badgeBg = isSignalLost ? '#ef4444' : isDelayed ? '#f59e0b' : '#10b981';

      const busHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <!-- Speed / Status Tag -->
          <div style="
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 9999px;
            border: 1px solid rgba(255,255,255,0.2);
            white-space: nowrap;
            margin-bottom: 2px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 3px;
          ">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${badgeBg};"></span>
            <span>${isSignalLost ? 'LOST' : `${speedKmH} km/h`}</span>
          </div>

          <!-- Bus Icon Badge with Heading Pointer -->
          <div style="position: relative;">
            <div style="
              width: 38px;
              height: 38px;
              background-color: #F59E0B;
              border: 3px solid #FFFFFF;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            " class="bus-marker-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            
            <!-- Heading Needle -->
            <div style="
              position: absolute;
              top: -6px;
              left: 50%;
              transform: translateX(-50%) rotate(${loc.heading || 0}deg);
              transform-origin: bottom center;
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-bottom: 8px solid #F59E0B;
            "></div>
          </div>

          <!-- Bus Plate / Name -->
          <div style="
            margin-top: 2px;
            background: rgba(15, 23, 42, 0.9);
            color: #fbbf24;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">
            ${bus.plateNumber}
          </div>
        </div>
      `;

      const busIcon = L.divIcon({
        className: 'custom-bus-marker',
        html: busHtml,
        iconSize: [90, 75],
        iconAnchor: [45, 38],
      });

      let marker = busMarkersRef.current.get(bus.id);
      if (marker) {
        marker.setLatLng([loc.latitude, loc.longitude]);
        marker.setIcon(busIcon);
      } else {
        marker = L.marker([loc.latitude, loc.longitude], { icon: busIcon }).addTo(map);
        marker.on('click', () => {
          if (onBusSelect) onBusSelect(bus);
        });
        busMarkersRef.current.set(bus.id, marker);
      }

      // Popup Content
      const condColor = bus.condition === 'excellent' ? '#16a34a' : bus.condition === 'good' ? '#059669' : bus.condition === 'fair' ? '#d97706' : '#dc2626';
      const condBg = bus.condition === 'excellent' ? '#dcfce7' : bus.condition === 'good' ? '#ecfdf5' : bus.condition === 'fair' ? '#fef3c7' : '#fee2e2';
      const condLabel = bus.condition ? bus.condition.replace('_', ' ').toUpperCase() : 'GOOD';
      const hasAC = bus.features?.includes('Air Conditioned');

      marker.bindPopup(`
        <div style="padding: 12px; min-width: 220px; font-family: inherit;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 14px; color: #0f172a;">${bus.busNumber}</span>
            <span style="background: ${isDelayed ? '#fef3c7' : '#dcfce7'}; color: ${isDelayed ? '#b45309' : '#15803d'}; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
              ${isDelayed ? `+${delayMins}m Late` : 'On Time'}
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">Plate: <b style="font-family: monospace;">${bus.plateNumber}</b></div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">Model: <b>${bus.model || 'Standard Shuttle'}</b> (${bus.fuelType || 'Diesel'})</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 4px 0;">
            <span style="font-size: 10px; font-weight: 700; background: ${condBg}; color: ${condColor}; padding: 1px 6px; border-radius: 4px;">
              Overall: ${condLabel}
            </span>
            ${hasAC ? '<span style="font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px;">❄️ AC</span>' : ''}
          </div>
          <!-- Brake & Wheel Diagnostics -->
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;">
            <span style="font-size: 9.5px; font-weight: 700; background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">
              🛑 Brakes: <b style="color: ${bus.brakeCondition === 'fair' ? '#d97706' : bus.brakeCondition === 'critical' ? '#dc2626' : '#16a34a'};">${(bus.brakeCondition || 'Good').toUpperCase()}</b> (${bus.brakePadLifePercent ?? 88}% pad)
            </span>
            <span style="font-size: 9.5px; font-weight: 700; background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">
              🛞 Tyres: <b style="color: ${bus.wheelCondition === 'fair' ? '#d97706' : '#16a34a'};">${(bus.wheelCondition || 'Good').toUpperCase()}</b> (${bus.tirePressurePsi ?? 110} PSI)
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">Speed: <b>${speedKmH} km/h</b> (Heading: ${loc.heading}°)</div>
          <div style="font-size: 10px; font-family: monospace; color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; margin: 3px 0; border: 1px solid #fde68a;">
            🛰️ GPS: <b>${loc.latitude.toFixed(5)}°N, ${loc.longitude.toFixed(5)}°E</b> (±${loc.accuracy || 5}m · ${loc.isSimulated ? 'Transponder' : 'Live Device GPS'})
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">Occupancy: <b>${loc.occupiedSeats ?? (trip?.occupiedSeats || 0)} / ${bus.capacity} seats</b></div>
          ${trip?.delayReason ? `<div style="font-size: 11px; color: #b45309; margin-top: 4px; padding: 4px; background: #fffbeb; border-radius: 4px;">⚠️ ${trip.delayReason}</div>` : ''}
          ${isSignalLost ? `<div style="font-size: 11px; color: #dc2626; margin-top: 4px; font-weight: 600;">⚠️ GPS signal lost (>60s)</div>` : ''}
        </div>
      `);
    });
  }, [buses, locations, onBusSelect]);

  // Auto-focus on selected stop
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedStopId) return;
    const stop = stops.find(s => s.id === selectedStopId);
    if (stop && stop.latitude && stop.longitude) {
      map.setView([stop.latitude, stop.longitude], 15, { animate: true });
    }
  }, [selectedStopId, stops]);

  // Auto-focus on selected route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRouteId) return;
    const route = routes.find(r => r.id === selectedRouteId);
    if (route && route.stops && route.stops.length > 0) {
      const validStops = route.stops.filter(s => s.latitude && s.longitude);
      if (validStops.length > 0) {
        const bounds = L.latLngBounds(validStops.map(s => [s.latitude, s.longitude]));
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
      }
    }
  }, [selectedRouteId, routes]);

  // Fit bounds helper
  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const coords: [number, number][] = [];

    // Collect all bus coords
    Object.values(locations).forEach(l => {
      if (l.latitude && l.longitude) coords.push([l.latitude, l.longitude]);
    });

    // Collect all stop coords
    stops.forEach(s => {
      if (s.latitude && s.longitude) coords.push([s.latitude, s.longitude]);
    });

    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 15 });
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Control Buttons */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleFitBounds}
          className="p-2.5 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors backdrop-blur-sm"
          title="Fit Fleet to Screen"
          aria-label="Fit Fleet to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Picker Banner */}
      {interactivePickMode && (
        <div className="absolute top-4 left-4 z-20 bg-amber-500 text-slate-950 px-3.5 py-1.5 rounded-xl font-medium text-xs shadow-lg flex items-center gap-2 animate-bounce">
          <Navigation className="w-3.5 h-3.5 fill-current" />
          Click anywhere on the map to place this stop pin
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-4 px-3.5 py-2 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 backdrop-blur-sm text-xs font-medium text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>On-Time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Delayed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Signal Lost</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-slate-300"></span>
          <span>Route Stop</span>
        </div>
      </div>
    </div>
  );
};
