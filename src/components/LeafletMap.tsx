import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Route, Stop, BusLocation } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Navigation, Maximize2, ShieldAlert, AlertTriangle, Wrench, ZoomIn, ZoomOut, Compass } from 'lucide-react';

// Configure Leaflet default icons to avoid 404 errors on marker-icon.png
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch {
  // ignore in non-browser environments
}

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
  selectedPickupStopId?: string;
  autoFocusEmergency?: boolean;
}

// Distance from point to line segment in km (Equirectangular approximation)
function distanceToSegmentKm(pLat: number, pLng: number, aLat: number, aLng: number, bLat: number, bLng: number): number {
  const midLat = ((aLat + bLat) / 2) * (Math.PI / 180);
  const kx = Math.cos(midLat) * 111.32;
  const ky = 110.574;

  const px = pLng * kx;
  const py = pLat * ky;
  const ax = aLng * kx;
  const ay = aLat * ky;
  const bx = bLng * kx;
  const by = bLat * ky;

  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) {
    const dx = px - ax;
    const dy = py - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
  const projx = ax + t * abx;
  const projy = ay + t * aby;
  const dx = px - projx;
  const dy = py - projy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check minimum distance from bus to any segment of its route
function getRouteDeviationKm(busLat: number, busLng: number, route: Route): number {
  if (!route.stops || route.stops.length < 2) return 0;
  let minDistance = Infinity;

  for (let i = 0; i < route.stops.length - 1; i++) {
    const s1 = route.stops[i];
    const s2 = route.stops[i + 1];
    if (s1.latitude && s1.longitude && s2.latitude && s2.longitude) {
      const dist = distanceToSegmentKm(busLat, busLng, s1.latitude, s1.longitude, s2.latitude, s2.longitude);
      if (dist < minDistance) minDistance = dist;
    }
  }

  return minDistance === Infinity ? 0 : minDistance;
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
  selectedPickupStopId,
  autoFocusEmergency = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routePolylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const deviationLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const hasFocusedEmergencyRef = useRef<string | null>(null);

  const { theme, accentPreset } = useTheme();
  const [activeEmergencyBus, setActiveEmergencyBus] = useState<{ bus: Bus; message: string } | null>(null);

  // Check for any bus with active emergency
  const emergencyInfo = useMemo(() => {
    for (const b of buses) {
      const alert = b.activeTrip?.emergencyAlert;
      if (alert) return { bus: b, message: alert };
    }
    return null;
  }, [buses]);

  useEffect(() => {
    setActiveEmergencyBus(emergencyInfo);
  }, [emergencyInfo]);

  // 1. Initialize Map with OpenStreetMap (Leaflet.js)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    if (mapInstanceRef.current) return;

    // Guard against "Map container is already initialized." by resetting leaflet DOM marker if needed
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    let map: L.Map;
    try {
      // Center around Tirunelveli, Tamil Nadu campus hub
      map = L.map(container, {
        center: [8.7139, 77.7567],
        zoom: 13,
        zoomControl: false,
      });
      mapInstanceRef.current = map;
    } catch (err) {
      console.warn('Map initialization caught error:', err);
      return;
    }

    // Fix tile rendering on mount
    const resizeTimer = setTimeout(() => {
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      } catch {
        // ignore
      }
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Map cleanup error:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. ResizeObserver to keep tiles pristine when containers resize
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 3. Tile Layer using OpenStreetMap (OSM)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
      } catch {
        // ignore
      }
    }

    const tileUrl =
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      theme === 'dark'
        ? '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    try {
      const tileLayer = L.tileLayer(tileUrl, {
        attribution,
        maxZoom: 19,
        subdomains: theme === 'dark' ? 'abcd' : 'abc',
      });
      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;
    } catch (err) {
      console.warn('Map tileLayer error:', err);
    }
  }, [theme]);

  // 4. Map click handler for interactive stop pin placing
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

  // 5. Render Temp Pin (Stop Picker)
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
            <div style="background-color: #ef4444; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2.5px solid white;">
              <div style="transform: rotate(45deg); font-weight: bold; font-size: 15px;">📍</div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        });

        tempMarkerRef.current = L.marker([tempMarker.lat, tempMarker.lng], { icon: pinIcon }).addTo(map);
      }
    } else if (tempMarkerRef.current) {
      map.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  }, [tempMarker]);

  // 6. Render Route Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old lines
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
        color: route.color || accentPreset.colorHex,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray: isSelected ? undefined : '6, 6',
      }).addTo(map);

      polyline.bindTooltip(
        `<b>${route.name} (${route.routeNumber})</b><br/><span style="font-size: 11px;">${route.stops.length} stops · ~${route.estimatedDurationMinutes} mins</span>`,
        { sticky: true }
      );

      routePolylinesRef.current.set(route.id, polyline);
    });
  }, [routes, selectedRouteId, accentPreset]);

  // 7. Render Stop Markers & Student Pickup Point
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentStopIds = new Set(stops.map(s => s.id));
    stopMarkersRef.current.forEach((marker, id) => {
      if (!currentStopIds.has(id)) {
        map.removeLayer(marker);
        stopMarkersRef.current.delete(id);
      }
    });

    const activePickupId = selectedPickupStopId || selectedStopId;

    stops.forEach(stop => {
      if (!stop.latitude || !stop.longitude) return;

      const isPickup = activePickupId === stop.id;

      let markerHtml = '';
      if (isPickup) {
        // High-visibility Student Pickup Point Indicator
        markerHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 1000;">
            <div style="
              background: #2563eb;
              color: #ffffff;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 7px;
              border-radius: 9999px;
              white-space: nowrap;
              border: 1.5px solid #ffffff;
              box-shadow: 0 4px 10px rgba(37,99,235,0.5);
              margin-bottom: 2px;
              display: flex;
              align-items: center;
              gap: 3px;
            ">
              <span>📍 Your Pickup Point</span>
            </div>
            <div style="
              background: #2563eb;
              color: #ffffff;
              border: 3px solid #ffffff;
              border-radius: 50%;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 0 0 6px rgba(37,99,235,0.3);
            ">
              ★
            </div>
          </div>
        `;
      } else {
        // Standard Stop Marker
        markerHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="
              background: #1e293b;
              color: #ffffff;
              border: 2px solid #64748b;
              border-radius: 9999px;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 700;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ">
              ${stop.stopOrder || '●'}
            </div>
            <span style="
              margin-top: 2px;
              font-size: 9.5px;
              font-weight: 600;
              background: rgba(15, 23, 42, 0.85);
              color: #f8fafc;
              padding: 1px 5px;
              border-radius: 4px;
              white-space: nowrap;
              max-width: 100px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${stop.name}</span>
          </div>
        `;
      }

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: markerHtml,
        iconSize: [isPickup ? 140 : 100, isPickup ? 55 : 35],
        iconAnchor: [isPickup ? 70 : 50, isPickup ? 45 : 12],
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

      // Popup
      marker.bindPopup(`
        <div style="padding: 12px; min-width: 180px;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${stop.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Stop Code: <b style="color: #2563eb;">${stop.code}</b></div>
          ${stop.landmark ? `<div style="font-size: 11px; color: #475569; margin-bottom: 4px;">📍 ${stop.landmark}</div>` : ''}
          ${stop.address ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${stop.address}</div>` : ''}
          <div style="font-size: 11px; color: #2563eb; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            ${isPickup ? '✓ Currently Selected as your Boarding Stop' : 'Click to select as your Pickup Stop'}
          </div>
        </div>
      `);
    });
  }, [stops, selectedStopId, selectedPickupStopId, onStopSelect]);

  // 8. Render Bus Markers with 4 DISTINCT Statuses (Active, Delayed, Emergency, Under Repair) & Route Deviation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const activeBusIds = new Set(buses.map(b => b.id));

    // Remove old bus markers
    busMarkersRef.current.forEach((marker, id) => {
      if (!activeBusIds.has(id)) {
        map.removeLayer(marker);
        busMarkersRef.current.delete(id);
      }
    });

    // Remove old deviation lines
    deviationLinesRef.current.forEach(line => map.removeLayer(line));
    deviationLinesRef.current.clear();

    buses.forEach(bus => {
      const loc = locations[bus.id];
      if (!loc || !loc.latitude || !loc.longitude) return;

      const trip = bus.activeTrip;
      const hasEmergency = Boolean(trip?.emergencyAlert);
      const isUnderRepair = bus.status === 'maintenance' || bus.condition === 'needs_service';
      const delayMinutes = loc.delayMinutes || trip?.delayMinutes || 0;
      const isDelayed = delayMinutes > 0;
      const speedKmH = Math.round(loc.speed || 0);

      // Check route deviation (if bus is assigned to a route with stops)
      const assignedRoute = routes.find(r => r.id === (trip?.routeId || bus.currentRouteId));
      let isDeviated = false;
      let deviationKm = 0;
      if (assignedRoute && !isUnderRepair && assignedRoute.stops && assignedRoute.stops.length >= 2) {
        deviationKm = getRouteDeviationKm(loc.latitude, loc.longitude, assignedRoute);
        if (deviationKm > 0.35) { // more than 350 meters off route corridor
          isDeviated = true;
        }
      }

      // Draw deviation indicator line if off-course
      if (isDeviated && assignedRoute && Array.isArray(assignedRoute.stops)) {
        const validStops = assignedRoute.stops.filter(
          s => s && typeof s.latitude === 'number' && typeof s.longitude === 'number' && !isNaN(s.latitude) && !isNaN(s.longitude)
        );
        if (validStops.length > 0) {
          let nearestStop = validStops[0];
          let nearestDist = Infinity;
          validStops.forEach(s => {
            const d = Math.hypot(s.latitude - loc.latitude, s.longitude - loc.longitude);
            if (d < nearestDist) {
              nearestDist = d;
              nearestStop = s;
            }
          });

          if (nearestStop && typeof nearestStop.latitude === 'number' && typeof nearestStop.longitude === 'number') {
            const devLine = L.polyline(
              [[loc.latitude, loc.longitude], [nearestStop.latitude, nearestStop.longitude]],
              { color: '#ef4444', weight: 2.5, dashArray: '5, 5', opacity: 0.8 }
            ).addTo(map);
            devLine.bindTooltip(`⚠️ Route Deviation: ~${(deviationKm * 1000).toFixed(0)}m off scheduled path`, { sticky: true });
            deviationLinesRef.current.set(bus.id, devLine);
          }
        }
      }

      // 4 Distinct Marker Visual Styles:
      // Status 1: Emergency / SOS
      // Status 2: Under Repair / Maintenance
      // Status 3: Delayed Bus
      // Status 4: Active / On-Time Bus
      let statusBg = '#10b981'; // Green (Active)
      let statusText = `${speedKmH} km/h`;
      let badgeBorder = '#ffffff';
      let iconColor = '#000000';
      let pulseClass = 'bus-marker-pulse';
      let centerIconSvg = '';

      if (hasEmergency) {
        statusBg = '#dc2626'; // Red (Emergency)
        statusText = '🚨 SOS EMERGENCY';
        badgeBorder = '#fee2e2';
        iconColor = '#ffffff';
        pulseClass = 'animate-ping';
        centerIconSvg = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        `;
      } else if (isUnderRepair) {
        statusBg = '#f97316'; // Orange / Wrench (Under Repair)
        statusText = '🔧 UNDER REPAIR';
        badgeBorder = '#ffedd5';
        iconColor = '#ffffff';
        pulseClass = '';
        centerIconSvg = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        `;
      } else if (isDelayed) {
        statusBg = '#f59e0b'; // Amber (Delayed)
        statusText = `+${delayMinutes}m DELAYED`;
        badgeBorder = '#fef3c7';
        iconColor = '#000000';
        pulseClass = 'bus-marker-pulse';
        centerIconSvg = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        `;
      } else {
        // Standard Active Bus
        statusBg = '#10b981'; // Green
        statusText = `${speedKmH} km/h (Active)`;
        badgeBorder = '#ffffff';
        iconColor = '#000000';
        pulseClass = 'bus-marker-pulse';
        centerIconSvg = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        `;
      }

      const busHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <!-- Top Speed / Status Badge -->
          <div style="
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 9999px;
            border: 1.5px solid ${badgeBorder};
            white-space: nowrap;
            margin-bottom: 2px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: ${statusBg};"></span>
            <span>${statusText}</span>
          </div>

          ${isDeviated ? `
            <div style="
              background: #ef4444;
              color: white;
              font-size: 9px;
              font-weight: 800;
              padding: 1px 5px;
              border-radius: 4px;
              margin-bottom: 2px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">⚠️ OFF ROUTE (~${(deviationKm * 1000).toFixed(0)}m)</div>
          ` : ''}

          <!-- Bus Circular Emblem -->
          <div style="position: relative;">
            <div style="
              width: 40px;
              height: 40px;
              background-color: ${statusBg};
              border: 3px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            " class="${pulseClass}">
              ${centerIconSvg}
            </div>

            <!-- Orientation Heading Needle (hidden on workshop buses) -->
            ${!isUnderRepair ? `
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
                border-bottom: 8px solid ${statusBg};
              "></div>
            ` : ''}
          </div>

          <!-- Bus Number & Plate Tag -->
          <div style="
            margin-top: 3px;
            background: rgba(15, 23, 42, 0.95);
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.15);
          ">
            ${bus.busNumber}
          </div>
        </div>
      `;

      const busIcon = L.divIcon({
        className: 'custom-bus-marker',
        html: busHtml,
        iconSize: [110, 85],
        iconAnchor: [55, 42],
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

      // Popup content with detailed diagnostics
      const statusTitle = hasEmergency
        ? '🚨 EMERGENCY ALERT'
        : isUnderRepair
        ? '🔧 UNDER REPAIR / MAINTENANCE'
        : isDelayed
        ? `⚠️ DELAYED (+${delayMinutes}m)`
        : '🟢 ACTIVE & ON-TIME';

      const popupHtml = `
        <div style="padding: 12px; min-width: 230px; font-family: inherit;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 14px; color: #0f172a;">${bus.busNumber}</span>
            <span style="background: ${hasEmergency ? '#fee2e2' : isUnderRepair ? '#ffedd5' : isDelayed ? '#fef3c7' : '#dcfce7'}; color: ${hasEmergency ? '#b91c1c' : isUnderRepair ? '#c2410c' : isDelayed ? '#b45309' : '#15803d'}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
              ${statusTitle}
            </span>
          </div>
          
          ${hasEmergency ? `
            <div style="background: #fef2f2; border: 1.5px solid #f87171; color: #991b1b; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 700; margin-bottom: 8px;">
              ⚠️ Incident: ${trip?.emergencyAlert}
            </div>
          ` : ''}

          ${isDeviated ? `
            <div style="background: #fff7ed; border: 1.5px solid #fdba74; color: #c2410c; padding: 6px; border-radius: 6px; font-size: 10.5px; font-weight: 700; margin-bottom: 8px;">
              ⚠️ Route Deviation: Vehicle is ${(deviationKm * 1000).toFixed(0)}m off designated corridor.
            </div>
          ` : ''}

          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">Plate: <b style="font-family: monospace;">${bus.plateNumber}</b></div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">Model: <b>${bus.model || 'College Transit Shuttle'}</b> (${bus.fuelType || 'Diesel'})</div>
          
          <div style="display: flex; gap: 4px; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">
              🛑 Brake Pads: ${bus.brakePadLifePercent ?? 88}%
            </span>
            <span style="font-size: 10px; font-weight: 700; background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">
              🛞 Tyre Pressure: ${bus.tirePressurePsi ?? 108} PSI
            </span>
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">Speed: <b>${speedKmH} km/h</b> (Heading: ${loc.heading}°)</div>
          <div style="font-size: 10px; font-family: monospace; color: #b45309; background: #fef3c7; padding: 3px 6px; border-radius: 4px; margin: 4px 0; border: 1px solid #fde68a;">
            🛰️ GPS: <b>${loc.latitude.toFixed(5)}°N, ${loc.longitude.toFixed(5)}°E</b> (±${loc.accuracy || 5}m)
          </div>
          <div style="font-size: 11px; color: #475569;">Occupancy: <b>${loc.occupiedSeats ?? (trip?.occupiedSeats || 0)} / ${bus.capacity} seats</b></div>
        </div>
      `;

      if (marker.getPopup()) {
        marker.setPopupContent(popupHtml);
      } else {
        marker.bindPopup(popupHtml);
      }

      // 9. Auto-Focus on Emergency if configured and not already focused
      if (hasEmergency && autoFocusEmergency && hasFocusedEmergencyRef.current !== bus.id) {
        hasFocusedEmergencyRef.current = bus.id;
        try {
          map.flyTo([loc.latitude, loc.longitude], 16, { animate: true, duration: 1.5 });
          setTimeout(() => {
            try {
              if (mapInstanceRef.current && marker) marker.openPopup();
            } catch {
              // ignore
            }
          }, 1600);
        } catch (e) {
          console.warn('Map flyTo emergency error:', e);
        }
      }
    });
  }, [buses, locations, routes, onBusSelect, autoFocusEmergency]);

  // Auto-focus on selected stop
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedStopId) return;
    const stop = stops.find(s => s.id === selectedStopId);
    if (stop && typeof stop.latitude === 'number' && typeof stop.longitude === 'number' && !isNaN(stop.latitude) && !isNaN(stop.longitude)) {
      try {
        map.setView([stop.latitude, stop.longitude], 15, { animate: true });
      } catch (err) {
        console.warn('Map setView stop error:', err);
      }
    }
  }, [selectedStopId, stops]);

  // Auto-focus on selected route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRouteId) return;
    const route = routes.find(r => r.id === selectedRouteId);
    if (route && Array.isArray(route.stops) && route.stops.length > 0) {
      const validStops = route.stops.filter(
        s => s && typeof s.latitude === 'number' && typeof s.longitude === 'number' && !isNaN(s.latitude) && !isNaN(s.longitude)
      );
      if (validStops.length === 1) {
        try {
          map.setView([validStops[0].latitude, validStops[0].longitude], 15, { animate: true });
        } catch (err) {
          console.warn('Map setView route stop error:', err);
        }
      } else if (validStops.length > 1) {
        try {
          const bounds = L.latLngBounds(validStops.map(s => [s.latitude, s.longitude]));
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
          }
        } catch (err) {
          console.warn('Map fitBounds route error:', err);
        }
      }
    }
  }, [selectedRouteId, routes]);

  // Fit bounds helper
  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      const coords: [number, number][] = [];
      Object.values(locations).forEach(l => {
        if (l && typeof l.latitude === 'number' && typeof l.longitude === 'number' && !isNaN(l.latitude) && !isNaN(l.longitude)) {
          coords.push([l.latitude, l.longitude]);
        }
      });
      stops.forEach(s => {
        if (s && typeof s.latitude === 'number' && typeof s.longitude === 'number' && !isNaN(s.latitude) && !isNaN(s.longitude)) {
          coords.push([s.latitude, s.longitude]);
        }
      });

      if (coords.length === 1) {
        map.setView(coords[0], 14, { animate: true });
      } else if (coords.length > 1) {
        const bounds = L.latLngBounds(coords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      } else {
        map.setView([8.7139, 77.7567], 13, { animate: true });
      }
    } catch (err) {
      console.warn('Map handleFitBounds error:', err);
    }
  };

  const handleZoomIn = () => {
    try {
      if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
    } catch {
      // ignore
    }
  };

  const handleZoomOut = () => {
    try {
      if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
    } catch {
      // ignore
    }
  };

  const handleFocusEmergency = () => {
    if (!activeEmergencyBus) return;
    const loc = locations[activeEmergencyBus.bus.id];
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.flyTo([loc.latitude, loc.longitude], 16, { animate: true, duration: 1.2 });
        const marker = busMarkersRef.current.get(activeEmergencyBus.bus.id);
        if (marker) marker.openPopup();
      } catch (err) {
        console.warn('Map handleFocusEmergency error:', err);
      }
    }
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Emergency HUD Banner if any vehicle has active SOS */}
      {activeEmergencyBus && (
        <div className="absolute top-3 left-3 right-16 z-20 bg-rose-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <span className="font-extrabold text-xs block truncate">
                🚨 EMERGENCY: {activeEmergencyBus.bus.busNumber} ({activeEmergencyBus.bus.plateNumber})
              </span>
              <span className="text-[11px] opacity-90 truncate block">
                {activeEmergencyBus.message}
              </span>
            </div>
          </div>
          <button
            onClick={handleFocusEmergency}
            className="px-3 py-1 bg-white text-rose-700 font-extrabold text-xs rounded-xl shadow-xs shrink-0 hover:bg-rose-50 transition-colors"
          >
            Locate SOS
          </button>
        </div>
      )}

      {/* Map Control Buttons: Zoom In, Zoom Out, Fit Fleet */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2.5 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors backdrop-blur-sm"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={handleZoomOut}
          className="p-2.5 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors backdrop-blur-sm"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleFitBounds}
          className="p-2.5 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors backdrop-blur-sm"
          title="Fit Fleet to Screen"
          aria-label="Fit Fleet to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Picker Banner */}
      {interactivePickMode && (
        <div className="absolute top-4 left-4 z-20 bg-amber-500 text-slate-950 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 animate-bounce">
          <Navigation className="w-3.5 h-3.5 fill-current" />
          Click anywhere on the map to place this stop pin
        </div>
      )}

      {/* Map Legend: Active, Delayed, Emergency, Under Repair */}
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-3 px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 backdrop-blur-sm text-[11px] font-bold text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
          <span>Delayed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-xs animate-pulse"></span>
          <span>Emergency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs"></span>
          <span>Under Repair</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs"></span>
          <span>Pickup Stop</span>
        </div>
      </div>
    </div>
  );
};
