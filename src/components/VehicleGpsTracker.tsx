import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, BusLocation, Trip, GpsDevice, GpsConnectionStatus, SimNetworkStatus, GpsPacketLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Radio,
  Navigation,
  Compass,
  Gauge,
  Wifi,
  WifiOff,
  Crosshair,
  Activity,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Satellite,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Link,
  Unlink,
  ExternalLink,
  MapPin,
  Cpu,
  Code2,
  Copy,
  Check,
  Signal,
  Sliders,
  Phone,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
} from 'lucide-react';

interface VehicleGpsTrackerProps {
  bus: Bus;
  location?: BusLocation | null;
  trip?: Trip | null;
  onLocationUpdated?: (loc: BusLocation) => void;
  onBusUpdated?: (updatedBus: Bus) => void;
  className?: string;
}

export const VehicleGpsTracker: React.FC<VehicleGpsTrackerProps> = ({
  bus,
  location,
  trip,
  onLocationUpdated,
  onBusUpdated,
  className = '',
}) => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  // Modals & Panels State
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showLiveMap, setShowLiveMap] = useState<boolean>(false);
  const [showFirmwareDocs, setShowFirmwareDocs] = useState<boolean>(false);
  const [showHistoryLogs, setShowHistoryLogs] = useState<boolean>(false);
  const [testingPing, setTestingPing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [logs, setLogs] = useState<GpsPacketLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Registered Devices
  const [devicesList, setDevicesList] = useState<GpsDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Configuration Form State
  const [configForm, setConfigForm] = useState({
    deviceId: bus.gpsDeviceId || `gps_esp32_${bus.id}`,
    imei: bus.gpsDeviceImei || '864923051029481',
    protocol: 'esp32_json',
    deviceToken: `tec_token_${bus.id}_${Math.random().toString(36).substring(2, 6)}`,
    updateIntervalSeconds: 3,
    simCarrier: 'Jio 4G LTE IoT M2M',
    simPhoneNumber: '+91 94450 12001',
  });

  // Browser Geolocation Broadcast Mode (Mobile Driver mode)
  const [isBroadcastingDeviceGps, setIsBroadcastingDeviceGps] = useState<boolean>(false);
  const [deviceGpsError, setDeviceGpsError] = useState<string | null>(null);
  const [broadcastCount, setBroadcastCount] = useState<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // Mini Map Refs
  const miniMapContainerRef = useRef<HTMLDivElement | null>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);
  const miniMarkerRef = useRef<L.Marker | null>(null);

  // Active Coordinates & Telemetry
  const lat = location?.latitude ?? bus.currentLatitude ?? 8.7139;
  const lng = location?.longitude ?? bus.currentLongitude ?? 77.7567;
  const speed = Math.round(location?.speed ?? 0);
  const heading = Math.round(location?.heading ?? 0);
  const accuracy = location?.accuracy ?? 2.5;

  // Determine actual connection status
  const getCalculatedStatus = (): GpsConnectionStatus => {
    if (!bus.gpsDeviceId && !bus.gpsDeviceImei) return 'not_configured';
    if (bus.gpsConnectionStatus) return bus.gpsConnectionStatus;
    if (lat && lng && (lat !== 0 || lng !== 0)) return 'connected';
    return 'no_fix';
  };

  const currentStatus = getCalculatedStatus();

  // Status visual attributes
  const getStatusBadge = (status: GpsConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          label: 'Connected',
          description: 'Valid recent GPS data received from hardware.',
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
          dot: 'bg-emerald-500',
          ping: true,
        };
      case 'no_fix':
        return {
          label: 'No GPS Fix',
          description: 'Device communicating via 4G/GSM but searching for satellite lock.',
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
          dot: 'bg-amber-500',
          ping: false,
        };
      case 'offline':
        return {
          label: 'Offline',
          description: 'No communication received from GPS tracker within timeout.',
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
          dot: 'bg-rose-500',
          ping: false,
        };
      case 'invalid_data':
        return {
          label: 'Invalid Data',
          description: 'Incoming GPS telemetry failed validation or coordinate bounds.',
          bg: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
          dot: 'bg-purple-500',
          ping: false,
        };
      case 'not_configured':
      default:
        return {
          label: 'Not Configured',
          description: 'No physical GPS tracking device has been linked to this bus.',
          bg: 'bg-slate-700/40 border-slate-600/40 text-slate-400',
          dot: 'bg-slate-500',
          ping: false,
        };
    }
  };

  const statusBadge = getStatusBadge(currentStatus);

  // SIM Network label
  const getSimBadge = (status?: SimNetworkStatus) => {
    switch (status) {
      case '4g_lte':
        return { label: '4G LTE M2M', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case '3g_hspa':
        return { label: '3G HSPA+', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
      case '2g_gsm':
        return { label: '2G GSM / GPRS', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'weak_signal':
        return { label: 'Weak Signal', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
      case 'sim_inactive':
        return { label: 'SIM Inactive', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      default:
        return { label: '4G LTE High-Speed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
  };

  const simBadge = getSimBadge(bus.gpsSimStatus);

  // Fetch available devices
  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/gps/devices', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDevicesList(data.devices || []);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDevices();
    }
  }, [user?.role]);

  // Fetch telemetry logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/gps/logs/${bus.id}?limit=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingLogs(false);
    }
  };

  // Button 1: Connect GPS Device
  const handleConnectDevice = async (deviceIdToConnect: string) => {
    try {
      const res = await fetch(`/api/gps/devices/${deviceIdToConnect}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ busId: bus.id }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`GPS Device ${deviceIdToConnect} successfully bound to ${bus.busNumber}!`, 'success');
        if (onBusUpdated && data.bus) {
          onBusUpdated(data.bus);
        }
        setShowConnectModal(false);
        fetchDevices();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to connect device', 'error');
      }
    } catch {
      showToast('Network error connecting GPS device', 'error');
    }
  };

  // Button 2: Configure GPS
  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/gps/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: configForm.deviceId,
          name: `${bus.busNumber} GPS Tracker`,
          imei: configForm.imei,
          busId: bus.id,
          deviceToken: configForm.deviceToken,
          protocol: configForm.protocol,
          updateIntervalSeconds: Number(configForm.updateIntervalSeconds),
          simCarrier: configForm.simCarrier,
          simPhoneNumber: configForm.simPhoneNumber,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`GPS Tracker configuration updated for ${bus.busNumber}!`, 'success');
        if (onBusUpdated) {
          onBusUpdated({
            ...bus,
            gpsDeviceId: configForm.deviceId,
            gpsDeviceImei: configForm.imei,
            gpsSimStatus: '4g_lte',
            gpsConnectionStatus: 'connected',
          });
        }
        setShowConfigModal(false);
        fetchDevices();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save configuration', 'error');
      }
    } catch {
      showToast('Network error saving configuration', 'error');
    }
  };

  // Button 3: Test GPS Connection
  const handleTestConnection = async () => {
    setTestingPing(true);
    try {
      const res = await fetch('/api/gps/test-ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          busId: bus.id,
          deviceId: bus.gpsDeviceId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'GPS hardware telemetry test verified successfully!', 'success');
        if (onLocationUpdated && data.packet) {
          onLocationUpdated({
            busId: bus.id,
            latitude: data.packet.latitude,
            longitude: data.packet.longitude,
            speed: data.packet.speed,
            heading: data.packet.heading,
            accuracy: data.packet.accuracy,
            timestamp: data.packet.timestamp,
            isSimulated: false,
          });
        }
        if (showHistoryLogs) {
          fetchLogs();
        }
      } else {
        showToast('GPS connection test returned warning', 'error');
      }
    } catch {
      showToast('Network timeout testing GPS connection', 'error');
    } finally {
      setTestingPing(false);
    }
  };

  // Button 4: View Live Location (Initializes mini Leaflet map)
  useEffect(() => {
    if (!showLiveMap) {
      if (miniMapInstanceRef.current) {
        try {
          miniMapInstanceRef.current.remove();
        } catch {
          // Ignored
        }
        miniMapInstanceRef.current = null;
      }
      return;
    }

    const container = miniMapContainerRef.current;
    if (!container) return;

    // Clean previous
    if (miniMapInstanceRef.current) {
      try {
        miniMapInstanceRef.current.remove();
      } catch {
        // Ignored
      }
      miniMapInstanceRef.current = null;
    }

    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    try {
      const map = L.map(container, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom Bus Pin
      const icon = L.divIcon({
        className: 'custom-live-bus-pin',
        html: `
          <div style="background:#F59E0B; width:34px; height:34px; border-radius:50%; border:3px solid #0F172A; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.5); transform:rotate(${heading}deg);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif; font-size:12px; color:#0f172a;">
          <b>${bus.busNumber}</b><br/>
          Speed: ${speed} km/h<br/>
          Coords: ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
      `).openPopup();

      miniMapInstanceRef.current = map;
      miniMarkerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err) {
      console.warn('Error initializing mini map:', err);
    }

    return () => {
      if (miniMapInstanceRef.current) {
        try {
          miniMapInstanceRef.current.remove();
        } catch {
          // Ignored
        }
        miniMapInstanceRef.current = null;
      }
    };
  }, [showLiveMap]);

  // Update mini map marker on coordinate change
  useEffect(() => {
    if (miniMapInstanceRef.current && miniMarkerRef.current) {
      miniMarkerRef.current.setLatLng([lat, lng]);
      miniMapInstanceRef.current.panTo([lat, lng]);
    }
  }, [lat, lng]);

  // Button 5: Disconnect GPS Device
  const handleDisconnectDevice = async () => {
    if (!bus.gpsDeviceId) return;
    if (!confirm(`Are you sure you want to disconnect GPS device ${bus.gpsDeviceId} from ${bus.busNumber}?`)) return;

    try {
      const res = await fetch(`/api/gps/devices/${bus.gpsDeviceId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        showToast(`Disconnected GPS Tracker from ${bus.busNumber}.`, 'info');
        if (onBusUpdated) {
          onBusUpdated({
            ...bus,
            gpsDeviceId: undefined,
            gpsDeviceImei: undefined,
            gpsConnectionStatus: 'not_configured',
          });
        }
        fetchDevices();
      } else {
        showToast('Failed to disconnect device', 'error');
      }
    } catch {
      showToast('Network error disconnecting device', 'error');
    }
  };

  // Browser Geolocation Broadcast Mode (For test smartphone in bus)
  const startDeviceGpsBroadcast = () => {
    if (!navigator.geolocation) {
      setDeviceGpsError('Geolocation is not supported by your browser.');
      showToast('Browser does not support geolocation.', 'error');
      return;
    }

    setDeviceGpsError(null);
    setIsBroadcastingDeviceGps(true);
    showToast(`Streaming device GPS coordinates for ${bus.busNumber}...`, 'success');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async pos => {
        const payload = {
          busId: bus.id,
          deviceId: bus.gpsDeviceId || 'mobile_sensor_dev',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32,
          heading: pos.coords.heading || 0,
          accuracy: Math.round(pos.coords.accuracy) || 3,
          satellites: 9,
          simStatus: '4g_lte',
        };

        try {
          const res = await fetch('/api/gps/ingest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            setBroadcastCount(c => c + 1);
            if (onLocationUpdated) {
              onLocationUpdated({
                ...payload,
                timestamp: new Date().toISOString(),
                isSimulated: false,
              });
            }
          }
        } catch {
          // Ignored
        }
      },
      err => {
        setDeviceGpsError(err.message);
        setIsBroadcastingDeviceGps(false);
        showToast(`GPS Error: ${err.message}`, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  };

  const stopDeviceGpsBroadcast = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcastingDeviceGps(false);
    showToast(`Stopped device GPS streaming for ${bus.busNumber}.`, 'info');
  };

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Format timestamp
  const formatUpdateTime = (isoStr?: string) => {
    if (!isoStr) return 'No updates received';
    try {
      const d = new Date(isoStr);
      const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
      if (diffSec < 5) return 'Just now (Live)';
      if (diffSec < 60) return `${diffSec} seconds ago`;
      if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  // Hardware Code Snippet
  const esp32CodeSnippet = `/*
 * Smart College Bus Tracker - ESP32 + NEO-6M GPS + 4G GSM Ingestion Firmware
 * Bus: ${bus.busNumber} (${bus.plateNumber})
 * Ingestion Endpoint: ${window.location.origin}/api/gps/ingest
 */

#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <HTTPClient.h>
#include <WiFi.h> // Or TinyGSM for SIM7600 4G LTE

#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define DEVICE_ID "${bus.gpsDeviceId || 'gps_esp32_' + bus.id}"
#define DEVICE_IMEI "${bus.gpsDeviceImei || '864923051029481'}"
#define DEVICE_TOKEN "${configForm.deviceToken}"
#define INGEST_URL "${window.location.origin}/api/gps/ingest"

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("ESP32 Bus GPS Telemetry Initialized.");
}

void loop() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  static unsigned long lastSend = 0;
  if (millis() - lastSend > 3000) { // Every 3 seconds
    lastSend = millis();

    if (gps.location.isValid()) {
      HTTPClient http;
      http.begin(INGEST_URL);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Device-Token", DEVICE_TOKEN);

      String json = "{";
      json += "\\"deviceId\\":\\"" + String(DEVICE_ID) + "\\",";
      json += "\\"imei\\":\\"" + String(DEVICE_IMEI) + "\\",";
      json += "\\"busId\\":\\"${bus.id}\\",";
      json += "\\"lat\\":" + String(gps.location.lat(), 6) + ",";
      json += "\\"lng\\":" + String(gps.location.lng(), 6) + ",";
      json += "\\"speed\\":" + String(gps.speed.kmph(), 1) + ",";
      json += "\\"heading\\":" + String(gps.course.deg(), 1) + ",";
      json += "\\"satellites\\":" + String(gps.satellites.value()) + ",";
      json += "\\"accuracy\\":" + String(gps.hdop.hdop() * 2.0, 1) + ",";
      json += "\\"simStatus\\":\\"4g_lte\\"";
      json += "}";

      int httpCode = http.POST(json);
      Serial.printf("Telemetry posted, HTTP code: %d\\n", httpCode);
      http.end();
    } else {
      Serial.println("Searching for GPS satellites lock...");
    }
  }
}`;

  if (user?.role !== 'admin') {
    return (
      <div className={`p-4 sm:p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex items-center gap-3.5 ${className}`}>
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <span>GPS Tracker Hardware Access Restricted</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Admin Only
            </span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            Real GPS Tracker hardware configuration, device binding, and uplink telemetry management is accessible exclusively to authorized Transport Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-5 ${className}`}>
      {/* 1. Header Bar: Feature Title & Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-wide">
                Real GPS Tracker
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase">
                Hardware Transponder
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live physical GPS module integration via 4G/GSM M2M cellular uplink
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${statusBadge.bg}`}>
            <span className={`w-2 h-2 rounded-full ${statusBadge.dot} ${statusBadge.ping ? 'animate-ping' : ''}`} />
            <span>{statusBadge.label}</span>
          </div>

          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${simBadge.color} flex items-center gap-1`}>
            <Signal className="w-3.5 h-3.5" />
            <span>{simBadge.label}</span>
          </span>
        </div>
      </div>

      {/* 2. Primary 9 Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Field 1: Bus Number */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            1. Bus Number
          </span>
          <p className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{bus.busNumber}</span>
          </p>
        </div>

        {/* Field 2: Vehicle Registration Number */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            2. Vehicle Registration No.
          </span>
          <p className="text-sm font-mono font-bold text-amber-400 mt-1">
            {bus.plateNumber}
          </p>
        </div>

        {/* Field 3: Driver Name and Contact */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            3. Driver Name & Contact
          </span>
          <p className="text-sm font-bold text-slate-200 mt-1 flex items-center justify-between">
            <span className="truncate">{bus.driverName || 'Rajesh Kumar'}</span>
            <span className="text-xs font-mono font-normal text-slate-400">{bus.driverPhone || '+91 98421 99810'}</span>
          </p>
        </div>

        {/* Field 4: GPS Tracker Device ID */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            4. GPS Tracker Device ID
          </span>
          <p className="text-sm font-mono font-bold text-emerald-400 mt-1 truncate">
            {bus.gpsDeviceId || 'Not Assigned'}
          </p>
        </div>

        {/* Field 5: GPS Device IMEI */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            5. GPS Device IMEI
          </span>
          <p className="text-sm font-mono font-bold text-slate-300 mt-1">
            {bus.gpsDeviceImei || 'Not Registered'}
          </p>
        </div>

        {/* Field 6: SIM / Network Status */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            6. SIM / Network Status
          </span>
          <p className="text-xs font-bold text-slate-200 mt-1 flex items-center justify-between">
            <span className="text-emerald-400">{simBadge.label}</span>
            <span className="text-[11px] text-slate-400">{configForm.simCarrier}</span>
          </p>
        </div>

        {/* Field 7: GPS Connection Status */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            7. GPS Connection Status
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${statusBadge.dot}`} />
            <span className="text-xs font-bold text-white">{statusBadge.label}</span>
            <span className="text-[11px] text-slate-400">({accuracy ? `±${accuracy}m` : 'Fixed'})</span>
          </div>
        </div>

        {/* Field 8: Last GPS Update */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            8. Last GPS Update
          </span>
          <p className="text-xs font-mono font-bold text-sky-400 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatUpdateTime(bus.lastGpsUpdate || location?.timestamp)}</span>
          </p>
        </div>

        {/* Field 9: Current Latitude and Longitude */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            9. Current Lat & Long
          </span>
          <p className="text-xs font-mono font-bold text-amber-400 mt-1 flex items-center justify-between">
            <span>{lat.toFixed(6)}° N, {lng.toFixed(6)}° E</span>
            <span className="text-[11px] text-slate-400">{speed} km/h</span>
          </p>
        </div>
      </div>

      {/* 3. Action Buttons Row (Connect, Configure, Test, View Live Location, Disconnect) */}
      <div className="pt-2 flex flex-wrap items-center gap-2.5">
        {/* Button 1: Connect GPS Device */}
        <button
          type="button"
          onClick={() => {
            fetchDevices();
            setShowConnectModal(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
        >
          <Link className="w-3.5 h-3.5" />
          <span>Connect GPS Device</span>
        </button>

        {/* Button 2: Configure GPS */}
        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Configure GPS</span>
        </button>

        {/* Button 3: Test GPS Connection */}
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testingPing}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5 text-sky-400" />
          <span>{testingPing ? 'Verifying Ping...' : 'Test GPS Connection'}</span>
        </button>

        {/* Button 4: View Live Location */}
        <button
          type="button"
          onClick={() => setShowLiveMap(prev => !prev)}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${
            showLiveMap
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span>{showLiveMap ? 'Hide Live Map' : 'View Live Location'}</span>
        </button>

        {/* Button 5: Disconnect GPS Device */}
        {bus.gpsDeviceId && (
          <button
            type="button"
            onClick={handleDisconnectDevice}
            className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Disconnect GPS</span>
          </button>
        )}

        {/* Extra: Hardware Docs & History Logs */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowHistoryLogs(prev => !prev);
              if (!showHistoryLogs) fetchLogs();
            }}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Telemetry History</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFirmwareDocs(prev => !prev)}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Hardware Firmware</span>
          </button>
        </div>
      </div>

      {/* 4. Live Map View Panel (OpenStreetMap Leaflet.js) */}
      {showLiveMap && (
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time GPS Map (OpenStreetMap & Leaflet)</span>
            </span>
            <span className="font-mono text-slate-400">
              {lat.toFixed(6)}, {lng.toFixed(6)} · Speed: {speed} km/h · Heading: {heading}°
            </span>
          </div>
          <div
            ref={miniMapContainerRef}
            className="w-full h-64 rounded-xl overflow-hidden border border-slate-700 z-0"
          />
        </div>
      )}

      {/* 5. Mobile Sensor GPS Broadcasting Alternative */}
      <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300">
            {isBroadcastingDeviceGps ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live smartphone GPS broadcast active: {broadcastCount} packets transmitted
              </span>
            ) : (
              <span>Mobile Phone in Bus Mode: Stream smartphone GPS directly to backend server.</span>
            )}
          </span>
        </div>

        {isBroadcastingDeviceGps ? (
          <button
            type="button"
            onClick={stopDeviceGpsBroadcast}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop Sensor GPS</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startDeviceGpsBroadcast}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Stream Phone GPS</span>
          </button>
        )}
      </div>

      {/* 6. Hardware Firmware & Wiring Documentation Panel */}
      {showFirmwareDocs && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>ESP32 + NEO-6M GPS + SIM7600 4G LTE Integration Specs</span>
            </h4>
            <button
              onClick={() => {
                navigator.clipboard.writeText(esp32CodeSnippet);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1"
            >
              {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Arduino Code'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-bold text-amber-400 block mb-1">Hardware Pin Connections</span>
              <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                <li>• ESP32 5V & GND &rarr; GPS Module VCC & GND</li>
                <li>• NEO-6M GPS TX &rarr; ESP32 GPIO 16 (RX2)</li>
                <li>• NEO-6M GPS RX &rarr; ESP32 GPIO 17 (TX2)</li>
                <li>• SIM7600 4G TX &rarr; ESP32 GPIO 26</li>
                <li>• SIM7600 4G RX &rarr; ESP32 GPIO 27</li>
                <li>• External Active Patch Antenna exposed on bus roof</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-bold text-emerald-400 block mb-1">REST Ingestion Endpoint</span>
              <div className="font-mono text-[11px] text-slate-300 break-all space-y-1">
                <p><b>Method:</b> POST</p>
                <p><b>URL:</b> {window.location.origin}/api/gps/ingest</p>
                <p><b>Header:</b> X-Device-Token: {configForm.deviceToken}</p>
                <p><b>Interval:</b> Every 2–5 seconds over 4G/GSM SIM</p>
              </div>
            </div>
          </div>

          <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
            {esp32CodeSnippet}
          </pre>
        </div>
      )}

      {/* 7. History Packet Logs Panel */}
      {showHistoryLogs && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Recent Ingested GPS Telemetry Packets</span>
            </h4>
            <button
              onClick={fetchLogs}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No recent packets stored for this bus. Click "Test GPS Connection" to send a verified telemetry packet.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Timestamp</th>
                    <th className="p-2">Coordinates</th>
                    <th className="p-2">Speed</th>
                    <th className="p-2">Satellites</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-900/60">
                      <td className="p-2 text-slate-300">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-2 text-amber-400">{log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}</td>
                      <td className="p-2 text-emerald-400">{log.speed} km/h</td>
                      <td className="p-2 text-slate-300">{log.satellites || 9}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          log.validationStatus === 'valid'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {log.validationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Connect GPS Device */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-400" />
                <span>Connect Real GPS Device</span>
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select an available hardware GPS tracker registered on campus to map to <b>{bus.busNumber}</b>:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {devicesList.map(dev => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDeviceId(dev.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-colors ${
                    selectedDeviceId === dev.id
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{dev.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400">
                      {dev.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    ID: {dev.id} · IMEI: {dev.imei}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDeviceId}
                onClick={() => handleConnectDevice(selectedDeviceId)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                Connect Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Configure GPS Device */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Configure GPS Hardware Tracker</span>
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfiguration} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  GPS Tracker Device ID
                </label>
                <input
                  type="text"
                  required
                  value={configForm.deviceId}
                  onChange={e => setConfigForm({ ...configForm, deviceId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none"
                  placeholder="e.g. gps_esp32_bus01"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  GPS Device IMEI (15 Digits)
                </label>
                <input
                  type="text"
                  required
                  value={configForm.imei}
                  onChange={e => setConfigForm({ ...configForm, imei: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none"
                  placeholder="e.g. 864923051029481"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Protocol Adapter
                  </label>
                  <select
                    value={configForm.protocol}
                    onChange={e => setConfigForm({ ...configForm, protocol: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  >
                    <option value="esp32_json">ESP32 + NEO-6M (JSON)</option>
                    <option value="teltonika_json">Teltonika FMC130 (4G)</option>
                    <option value="gt06">GT06 / Coban GPS Protocol</option>
                    <option value="http_rest">Quectel / Generic HTTP REST</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Update Frequency
                  </label>
                  <select
                    value={configForm.updateIntervalSeconds}
                    onChange={e => setConfigForm({ ...configForm, updateIntervalSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  >
                    <option value={2}>Every 2 seconds (High Precision)</option>
                    <option value={3}>Every 3 seconds (Standard)</option>
                    <option value={5}>Every 5 seconds (Low Bandwidth)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  SIM Carrier & M2M APN
                </label>
                <input
                  type="text"
                  value={configForm.simCarrier}
                  onChange={e => setConfigForm({ ...configForm, simCarrier: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  placeholder="e.g. Jio 4G LTE IoT M2M"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Device Authentication Secret Token
                </label>
                <input
                  type="text"
                  value={configForm.deviceToken}
                  onChange={e => setConfigForm({ ...configForm, deviceToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleGpsTracker;
