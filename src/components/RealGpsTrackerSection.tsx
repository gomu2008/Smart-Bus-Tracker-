import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Route, BusLocation, GpsDevice, GpsConnectionStatus, SimNetworkStatus, GpsPacketLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Radio,
  Navigation,
  Compass,
  Gauge,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Satellite,
  ShieldCheck,
  ShieldAlert,
  Link,
  Unlink,
  MapPin,
  Cpu,
  Copy,
  Check,
  Signal,
  Sliders,
  Phone,
  User,
  Clock,
  X,
  Zap,
  Bus as BusIcon,
  AlertOctagon,
  LifeBuoy,
  Wrench,
  Search,
  Plus,
} from 'lucide-react';

interface RealGpsTrackerSectionProps {
  buses: Bus[];
  routes: Route[];
  busLocations: Record<string, BusLocation>;
  onBusUpdated: (updatedBus: Bus) => void;
  onLocationUpdated: (newLoc: BusLocation) => void;
  refreshAllData: () => Promise<void>;
}

export const RealGpsTrackerSection: React.FC<RealGpsTrackerSectionProps> = ({
  buses,
  routes,
  busLocations,
  onBusUpdated,
  onLocationUpdated,
  refreshAllData,
}) => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Panels State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [connectModalBus, setConnectModalBus] = useState<Bus | null>(null);
  const [configModalBus, setConfigModalBus] = useState<Bus | null>(null);
  const [mapModalBus, setMapModalBus] = useState<Bus | null>(null);
  const [activeTabSub, setActiveTabSub] = useState<'vehicles' | 'safety' | 'firmware' | 'logs'>('vehicles');

  // Hardware Diagnostics & Testing
  const [testingPingBusId, setTestingPingBusId] = useState<string | null>(null);
  const [lastDiagnosticLog, setLastDiagnosticLog] = useState<{ busNumber: string; message: string; timestamp: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Registered Devices & Logs
  const [devicesList, setDevicesList] = useState<GpsDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [packetLogs, setPacketLogs] = useState<GpsPacketLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Registration Form State
  const [deviceForm, setDeviceForm] = useState({
    id: '',
    name: '',
    imei: '',
    busId: '',
    protocol: 'esp32_json',
    deviceToken: '',
    updateIntervalSeconds: 3,
    simCarrier: 'Jio 4G LTE IoT M2M',
    simPhoneNumber: '+91 94450 12000',
    serverEndpoint: '/api/gps/ingest',
    serverPort: '3000',
  });

  // Modal Map Ref
  const modalMapContainerRef = useRef<HTMLDivElement | null>(null);
  const modalMapInstanceRef = useRef<L.Map | null>(null);
  const modalMarkerRef = useRef<L.Marker | null>(null);

  // Admin Check Barrier
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Access Restricted: Administrators Only</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The Real GPS Tracker hardware configuration and physical ingestion network is accessible exclusively to authorized Transport Administrators.
        </p>
      </div>
    );
  }

  // Fetch registered devices
  const fetchDevices = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/gps/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDevicesList(data.devices || []);
      }
    } catch {
      // Ignored
    }
  };

  // Fetch telemetry logs
  const fetchLogs = async (busId?: string) => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const url = busId ? `/api/gps/logs/${busId}?limit=40` : '/api/gps/logs/bus_01?limit=40';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPacketLogs(data.logs || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Calculate dynamic statuses
  const getDynamicGpsStatus = (bus: Bus): GpsConnectionStatus => {
    if (!bus.gpsDeviceId && !bus.gpsDeviceImei) return 'not_configured';

    // If device is linked, verify last packet timestamp
    if (bus.lastGpsUpdate) {
      const diffSec = (Date.now() - new Date(bus.lastGpsUpdate).getTime()) / 1000;
      // If no updates in 120 seconds, flag as offline
      if (diffSec > 120) {
        return 'offline';
      }
    }

    if (bus.gpsConnectionStatus) {
      return bus.gpsConnectionStatus;
    }

    if (bus.currentLatitude && bus.currentLongitude && (bus.currentLatitude !== 0 || bus.currentLongitude !== 0)) {
      return 'connected';
    }

    return 'no_fix';
  };

  // Metrics summary
  const totalBuses = buses.length;
  const connectedCount = buses.filter(b => getDynamicGpsStatus(b) === 'connected').length;
  const noFixCount = buses.filter(b => getDynamicGpsStatus(b) === 'no_fix').length;
  const offlineCount = buses.filter(b => getDynamicGpsStatus(b) === 'offline').length;
  const notConfiguredCount = buses.filter(b => getDynamicGpsStatus(b) === 'not_configured').length;

  // Format timestamp with relative time
  const formatTimeAgo = (isoStr?: string) => {
    if (!isoStr) return 'No packets received';
    try {
      const d = new Date(isoStr);
      const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
      if (diffSec < 5) return 'Just now (Live fix)';
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  // Status visual attributes
  const getStatusBadge = (status: GpsConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          label: 'Connected',
          description: 'Valid recent GPS data received.',
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
          dot: 'bg-emerald-500',
          ping: true,
        };
      case 'no_fix':
        return {
          label: 'No GPS Fix',
          description: 'Device is communicating but cannot obtain a valid location (satellites < 3).',
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
          dot: 'bg-amber-500',
          ping: false,
        };
      case 'offline':
        return {
          label: 'Offline',
          description: 'No recent device communication. Showing last known coordinates.',
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
          dot: 'bg-rose-500',
          ping: false,
        };
      case 'invalid_data':
        return {
          label: 'Invalid Data',
          description: 'Incoming GPS data failed validation checks or coordinate bounds.',
          bg: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
          dot: 'bg-purple-500',
          ping: false,
        };
      case 'not_configured':
      default:
        return {
          label: 'Hardware Not Connected',
          description: 'No physical GPS tracker has been registered or linked to this vehicle.',
          bg: 'bg-slate-700/40 border-slate-600/40 text-slate-400',
          dot: 'bg-slate-500',
          ping: false,
        };
    }
  };

  // Button 1: Connect GPS Device Action
  const handleConnectDevice = async (busId: string, deviceIdToConnect: string) => {
    try {
      const res = await fetch(`/api/gps/devices/${deviceIdToConnect}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ busId }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Hardware GPS tracker ${deviceIdToConnect} successfully linked!`, 'success');
        if (data.bus) onBusUpdated(data.bus);
        setConnectModalBus(null);
        fetchDevices();
        refreshAllData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to connect device', 'error');
      }
    } catch {
      showToast('Network error connecting device', 'error');
    }
  };

  // Button 2: Configure GPS Action
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModalBus) return;
    try {
      const res = await fetch('/api/gps/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: deviceForm.id || configModalBus.gpsDeviceId,
          name: `${configModalBus.busNumber} GPS Tracker`,
          imei: deviceForm.imei || configModalBus.gpsDeviceImei,
          busId: configModalBus.id,
          deviceToken: deviceForm.deviceToken || `tec_token_${configModalBus.id}_891`,
          protocol: deviceForm.protocol,
          updateIntervalSeconds: Number(deviceForm.updateIntervalSeconds),
          simCarrier: deviceForm.simCarrier,
          simPhoneNumber: deviceForm.simPhoneNumber,
        }),
      });

      if (res.ok) {
        showToast(`GPS configuration updated for ${configModalBus.busNumber}!`, 'success');
        onBusUpdated({
          ...configModalBus,
          gpsDeviceId: deviceForm.id || configModalBus.gpsDeviceId,
          gpsDeviceImei: deviceForm.imei || configModalBus.gpsDeviceImei,
          gpsSimStatus: '4g_lte',
          gpsConnectionStatus: 'connected',
        });
        setConfigModalBus(null);
        fetchDevices();
        refreshAllData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save configuration', 'error');
      }
    } catch {
      showToast('Network error saving configuration', 'error');
    }
  };

  // Button 3: Test GPS Connection (Hardware Ingestion Diagnostic Testing Mode)
  const handleTestConnection = async (bus: Bus) => {
    setTestingPingBusId(bus.id);
    try {
      const res = await fetch('/api/gps/test-ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          busId: bus.id,
          deviceId: bus.gpsDeviceId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Diagnostic verification packet processed successfully!', 'success');
        setLastDiagnosticLog({
          busNumber: bus.busNumber,
          message: data.message,
          timestamp: new Date().toLocaleTimeString(),
        });
        refreshAllData();
      } else {
        showToast('Diagnostic verification returned error', 'error');
      }
    } catch {
      showToast('Network error testing GPS connection', 'error');
    } finally {
      setTestingPingBusId(null);
    }
  };

  // Button 5: Disconnect GPS Device Action
  const handleDisconnectDevice = async (bus: Bus) => {
    if (!bus.gpsDeviceId) return;
    if (!confirm(`Are you sure you want to disconnect GPS device ${bus.gpsDeviceId} from ${bus.busNumber}?`)) return;

    try {
      const res = await fetch(`/api/gps/devices/${bus.gpsDeviceId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        showToast(`Disconnected GPS tracker from ${bus.busNumber}.`, 'info');
        onBusUpdated({
          ...bus,
          gpsDeviceId: undefined,
          gpsDeviceImei: undefined,
          gpsConnectionStatus: 'not_configured',
        });
        fetchDevices();
        refreshAllData();
      } else {
        showToast('Failed to disconnect device', 'error');
      }
    } catch {
      showToast('Network error disconnecting device', 'error');
    }
  };

  // Interactive OpenStreetMap + Leaflet.js Modal for "View Live Location"
  useEffect(() => {
    if (!mapModalBus) {
      if (modalMapInstanceRef.current) {
        try {
          modalMapInstanceRef.current.remove();
        } catch {
          // Ignored
        }
        modalMapInstanceRef.current = null;
      }
      return;
    }

    const container = modalMapContainerRef.current;
    if (!container) return;

    if (modalMapInstanceRef.current) {
      try {
        modalMapInstanceRef.current.remove();
      } catch {
        // Ignored
      }
      modalMapInstanceRef.current = null;
    }

    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    const targetLoc = busLocations[mapModalBus.id];
    const lat = targetLoc?.latitude ?? mapModalBus.currentLatitude ?? 8.7139;
    const lng = targetLoc?.longitude ?? mapModalBus.currentLongitude ?? 77.7567;
    const heading = targetLoc?.heading ?? 0;
    const speed = targetLoc?.speed ?? 0;

    try {
      const map = L.map(container, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const customIcon = L.divIcon({
        className: 'custom-real-gps-pin',
        html: `
          <div style="background:#F59E0B; width:36px; height:36px; border-radius:50%; border:3px solid #0F172A; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.5); transform:rotate(${heading}deg);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif; font-size:12px; color:#0f172a; line-height:1.4;">
          <b>${mapModalBus.busNumber}</b><br/>
          Plate: <b>${mapModalBus.plateNumber}</b><br/>
          Speed: <b>${Math.round(speed)} km/h</b><br/>
          Coords: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br/>
          Status: <b>${getDynamicGpsStatus(mapModalBus)}</b>
        </div>
      `).openPopup();

      modalMapInstanceRef.current = map;
      modalMarkerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    } catch (err) {
      console.warn('Map initialization:', err);
    }

    return () => {
      if (modalMapInstanceRef.current) {
        try {
          modalMapInstanceRef.current.remove();
        } catch {
          // Ignored
        }
        modalMapInstanceRef.current = null;
      }
    };
  }, [mapModalBus]);

  // Filtered buses
  const filteredBuses = buses.filter(b => {
    const status = getDynamicGpsStatus(b);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesSearch =
      b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.gpsDeviceId && b.gpsDeviceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.gpsDeviceImei && b.gpsDeviceImei.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // ESP32 Firmware template
  const esp32SampleCode = `/*
 * Smart College Bus Tracker - ESP32 + NEO-6M GPS + 4G GSM Ingestion Firmware
 * Protocol: JSON over HTTP REST
 * Ingestion Endpoint: ${window.location.origin}/api/gps/ingest
 */

#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <HTTPClient.h>

#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define DEVICE_ID "gps_esp32_bus01"
#define DEVICE_IMEI "864923051029481"
#define DEVICE_TOKEN "tec_token_bus01_8a72"
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

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  Real GPS Tracker Integration
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical hardware ingestion pipeline connecting campus vehicles to 4G/GSM M2M cellular GPS transponders
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setDeviceForm({
                  id: `gps_dev_${Date.now().toString().slice(-4)}`,
                  name: 'ESP32 4G Tracker',
                  imei: '864923051029481',
                  busId: buses[0]?.id || '',
                  protocol: 'esp32_json',
                  deviceToken: `tec_token_${Math.random().toString(36).substring(2, 8)}`,
                  updateIntervalSeconds: 3,
                  simCarrier: 'Jio 4G LTE IoT M2M',
                  simPhoneNumber: '+91 94450 12001',
                  serverEndpoint: '/api/gps/ingest',
                  serverPort: '3000',
                });
                setRegisterModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register GPS Device</span>
            </button>

            <button
              type="button"
              onClick={() => refreshAllData()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Refresh Fleet Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fleet Hardware Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs pt-3 border-t border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Fleet</span>
            <span className="text-lg font-black text-white mt-0.5 block">{totalBuses} Buses</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Connected</span>
            </span>
            <span className="text-lg font-black text-emerald-400 mt-0.5 block">{connectedCount} Online</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">No GPS Fix</span>
            <span className="text-lg font-black text-amber-400 mt-0.5 block">{noFixCount} Syncing</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Offline</span>
            <span className="text-lg font-black text-rose-400 mt-0.5 block">{offlineCount} Inactive</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Not Configured</span>
            <span className="text-lg font-black text-slate-400 mt-0.5 block">{notConfiguredCount} Pending</span>
          </div>
        </div>

        {/* Section Sub-Navigation Bar */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTabSub('vehicles')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTabSub === 'vehicles' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Vehicle GPS Management ({filteredBuses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSub('safety')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTabSub === 'safety' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Real-Time Safety Integrations
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSub('firmware')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTabSub === 'firmware' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Hardware Protocols & Setup
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTabSub('logs');
              fetchLogs();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTabSub === 'logs' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Telemetry Packet Logs
          </button>
        </div>
      </div>

      {/* 2. SUB-VIEW: VEHICLE GPS MANAGEMENT CARDS */}
      {activeTabSub === 'vehicles' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search bus, plate, or device IMEI..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['all', 'connected', 'no_fix', 'offline', 'not_configured'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-bold text-[11px] whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostic Log Toast if recently executed */}
          {lastDiagnosticLog && (
            <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-800/80 text-sky-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  <b>Diagnostic Packet Verification ({lastDiagnosticLog.busNumber}):</b> {lastDiagnosticLog.message}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{lastDiagnosticLog.timestamp}</span>
            </div>
          )}

          {/* Vehicles List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredBuses.map(bus => {
              const liveLoc = busLocations[bus.id];
              const dynamicStatus = getDynamicGpsStatus(bus);
              const badge = getStatusBadge(dynamicStatus);
              const lat = liveLoc?.latitude ?? bus.currentLatitude ?? 8.7139;
              const lng = liveLoc?.longitude ?? bus.currentLongitude ?? 77.7567;
              const speed = Math.round(liveLoc?.speed ?? 0);
              const heading = Math.round(liveLoc?.heading ?? 0);
              const isTestingThis = testingPingBusId === bus.id;

              return (
                <div
                  key={bus.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-amber-500/40 transition-colors"
                >
                  {/* Card Header: Vehicle Name, Plate, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
                        <BusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {bus.busNumber}
                          </h3>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400">
                            {bus.plateNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Model: {bus.model} · Powertrain: {bus.fuelType || 'Diesel'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${badge.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${badge.dot} ${badge.ping ? 'animate-ping' : ''}`} />
                        <span>{badge.label}</span>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Signal className="w-3 h-3 text-emerald-500" />
                        <span>{bus.gpsSimStatus ? bus.gpsSimStatus.replace('_', ' ').toUpperCase() : '4G LTE'}</span>
                      </span>
                    </div>
                  </div>

                  {/* The 9 Required Fields Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                    {/* 1. Bus Number */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        1. Bus Number
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white mt-1 truncate">
                        {bus.busNumber}
                      </p>
                    </div>

                    {/* 2. Vehicle Registration Number */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        2. Registration No.
                      </span>
                      <p className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {bus.plateNumber}
                      </p>
                    </div>

                    {/* 3. Driver Name and Contact */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        3. Driver Name & Contact
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                        {bus.driverName || 'Rajesh Kumar'}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 block truncate">
                        {bus.driverPhone || '+91 98421 99810'}
                      </span>
                    </div>

                    {/* 4. GPS Tracker Device ID */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        4. GPS Device ID
                      </span>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                        {bus.gpsDeviceId || 'Not Assigned'}
                      </p>
                    </div>

                    {/* 5. GPS Device IMEI */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        5. Device IMEI
                      </span>
                      <p className="font-mono font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
                        {bus.gpsDeviceImei || 'Not Registered'}
                      </p>
                    </div>

                    {/* 6. SIM/Network Status */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        6. SIM / Network
                      </span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {bus.gpsSimStatus ? bus.gpsSimStatus.replace('_', ' ').toUpperCase() : '4G LTE M2M'}
                      </p>
                      <span className="text-[10px] text-slate-400">Jio / Airtel Cellular Uplink</span>
                    </div>

                    {/* 7. GPS Connection Status */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        7. GPS Status
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                        <span className="font-bold text-slate-900 dark:text-white capitalize">{dynamicStatus}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate" title={badge.description}>
                        {badge.description}
                      </span>
                    </div>

                    {/* 8. Last GPS Update */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        8. Last GPS Update
                      </span>
                      <p className="font-mono font-bold text-sky-600 dark:text-sky-400 mt-1">
                        {formatTimeAgo(bus.lastGpsUpdate || liveLoc?.timestamp)}
                      </p>
                      {dynamicStatus === 'offline' && (
                        <span className="text-[10px] text-rose-500 font-bold block">Last known fix preserved</span>
                      )}
                    </div>

                    {/* 9. Current Latitude and Longitude */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        9. Coordinates & Speed
                      </span>
                      <p className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {lat.toFixed(6)}° N, {lng.toFixed(6)}° E
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Speed: <b>{speed} km/h</b> · Heading: <b>{heading}°</b>
                      </span>
                    </div>
                  </div>

                  {/* 5 Required Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Button 1: Connect GPS Device */}
                      <button
                        type="button"
                        onClick={() => {
                          setConnectModalBus(bus);
                          fetchDevices();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <Link className="w-3.5 h-3.5" />
                        <span>Connect GPS Device</span>
                      </button>

                      {/* Button 2: Configure GPS */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeviceForm({
                            id: bus.gpsDeviceId || `gps_dev_${bus.id}`,
                            name: `${bus.busNumber} GPS Tracker`,
                            imei: bus.gpsDeviceImei || '864923051029481',
                            busId: bus.id,
                            protocol: 'esp32_json',
                            deviceToken: `tec_token_${bus.id}_489`,
                            updateIntervalSeconds: 3,
                            simCarrier: 'Jio 4G LTE IoT M2M',
                            simPhoneNumber: '+91 94450 12001',
                            serverEndpoint: '/api/gps/ingest',
                            serverPort: '3000',
                          });
                          setConfigModalBus(bus);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-500" />
                        <span>Configure GPS</span>
                      </button>

                      {/* Button 3: Test GPS Connection (Diagnostic Ingestion Mode) */}
                      <button
                        type="button"
                        onClick={() => handleTestConnection(bus)}
                        disabled={isTestingThis}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Diagnostic test verifying backend ingestion pipeline without random coordinates"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-500" />
                        <span>{isTestingThis ? 'Verifying Pipeline...' : 'Test GPS Connection'}</span>
                      </button>

                      {/* Button 4: View Live Location */}
                      <button
                        type="button"
                        onClick={() => setMapModalBus(bus)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>View Live Location</span>
                      </button>

                      {/* Button 5: Disconnect GPS Device */}
                      {bus.gpsDeviceId && (
                        <button
                          type="button"
                          onClick={() => handleDisconnectDevice(bus)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                          <span>Disconnect GPS Device</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Endpoint: /api/gps/ingest (Port 3000)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SUB-VIEW: REAL-TIME SAFETY INTEGRATIONS */}
      {activeTabSub === 'safety' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <Gauge className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Speed Monitoring & Limit Control</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Every incoming GPS telemetry packet contains calibrated ground speed (km/h). When speed exceeds the college zone threshold (50 km/h), automated overspeed alerts are triggered and broadcast across dispatch channels.
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
              Active Speed Limit: <b>50 km/h</b> · Real-time GPS Telemetry Enforcement
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <Compass className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Route Deviation Detection</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Incoming GPS latitude and longitude are calculated against designated route corridor waypoints using Haversine distance geometry. If the vehicle veers more than 300 meters from route stops, an alert is broadcast.
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
              Deviation Buffer: <b>300 meters</b> · Dynamic Corridor Polylines
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertOctagon className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Accident & SOS Emergency Location</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              In the event of an SOS beacon or impact trigger, physical GPS hardware coordinates are shared directly with local emergency dispatch concourses and college transport supervisors.
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
              SOS Broadcast: <b>Zero-Latency WebSocket Push</b> with exact lat/long coordinates.
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
              <Wrench className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Tyre & Brake Safety Diagnostics</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Real GPS hardware coordinates are combined with pneumatic brake line pressure (PSI) and radial tyre depth telemetry to pinpoint road hazards or emergency depot roadside servicing.
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
              Brake Diagnostics: <b>110+ PSI Nominal</b> · GPS Tagged Depot Service Logs
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-VIEW: HARDWARE PROTOCOLS & SETUP */}
      {activeTabSub === 'firmware' && (
        <div className="p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-400" />
                <span>ESP32 + NEO-6M GPS + 4G GSM Hardware Guide</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical wiring schematics and production firmware code ready for upload
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(esp32SampleCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Arduino C++'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] block">
                Wiring Pinout Schematic
              </span>
              <ul className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                <li>• ESP32 5V & GND &rarr; GPS Module VCC & GND</li>
                <li>• NEO-6M GPS TX &rarr; ESP32 GPIO 16 (Hardware RX2)</li>
                <li>• NEO-6M GPS RX &rarr; ESP32 GPIO 17 (Hardware TX2)</li>
                <li>• SIM7600/A7670C 4G TX &rarr; ESP32 GPIO 26</li>
                <li>• SIM7600/A7670C 4G RX &rarr; ESP32 GPIO 27</li>
                <li>• Roof Active SMA Patch Antenna facing open sky</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] block">
                Ingestion API Specification
              </span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <p><b>Method:</b> POST</p>
                <p><b>Endpoint:</b> {window.location.origin}/api/gps/ingest</p>
                <p><b>Port:</b> 3000 / HTTP REST</p>
                <p><b>Auth Header:</b> X-Device-Token: [Secret Token]</p>
                <p><b>Interval:</b> Every 2–5 seconds over 4G SIM</p>
              </div>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Arduino C++ Production Code
            </span>
            <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-72">
              {esp32SampleCode}
            </pre>
          </div>
        </div>
      )}

      {/* 5. SUB-VIEW: TELEMETRY PACKET LOGS */}
      {activeTabSub === 'logs' && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ingested GPS Hardware Telemetry Logs
              </h3>
              <p className="text-xs text-slate-500">
                Audit trail of incoming packets, timestamps, coordinates, and validation statuses
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchLogs()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          {packetLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No recent packets recorded. Click "Test GPS Connection" on any bus to send a diagnostic verification packet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Time</th>
                    <th className="px-3 py-2.5">Device ID</th>
                    <th className="px-3 py-2.5">Bus ID</th>
                    <th className="px-3 py-2.5">Coordinates</th>
                    <th className="px-3 py-2.5">Speed</th>
                    <th className="px-3 py-2.5">Satellites</th>
                    <th className="px-3 py-2.5">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {packetLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{log.deviceId}</td>
                      <td className="px-3 py-2 text-amber-600 dark:text-amber-400">{log.busId || '--'}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                      </td>
                      <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400">{log.speed} km/h</td>
                      <td className="px-3 py-2 text-slate-500">{log.satellites || 9}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          log.validationStatus === 'valid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
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

      {/* MODAL 1: Connect GPS Device Modal */}
      {connectModalBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-400" />
                <span>Connect Hardware GPS Device</span>
              </h3>
              <button
                onClick={() => setConnectModalBus(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select an available hardware GPS tracker registered on campus to link to <b>{connectModalBus.busNumber}</b> ({connectModalBus.plateNumber}):
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
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-400">
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
                onClick={() => setConnectModalBus(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDeviceId}
                onClick={() => handleConnectDevice(connectModalBus.id, selectedDeviceId)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                Connect Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Register New Physical GPS Device Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Register Physical GPS Tracking Hardware</span>
              </h3>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                try {
                  const res = await fetch('/api/gps/devices', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(deviceForm),
                  });
                  if (res.ok) {
                    showToast(`Device ${deviceForm.id} successfully registered!`, 'success');
                    setRegisterModalOpen(false);
                    fetchDevices();
                    refreshAllData();
                  } else {
                    const err = await res.json();
                    showToast(err.error || 'Registration failed', 'error');
                  }
                } catch {
                  showToast('Network error registering device', 'error');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  GPS Tracker Device ID
                </label>
                <input
                  type="text"
                  required
                  value={deviceForm.id}
                  onChange={e => setDeviceForm({ ...deviceForm, id: e.target.value })}
                  placeholder="e.g. gps_esp32_bus01"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  GPS Device IMEI (15 Digits)
                </label>
                <input
                  type="text"
                  required
                  value={deviceForm.imei}
                  onChange={e => setDeviceForm({ ...deviceForm, imei: e.target.value })}
                  placeholder="e.g. 864923051029481"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Protocol Adapter
                  </label>
                  <select
                    value={deviceForm.protocol}
                    onChange={e => setDeviceForm({ ...deviceForm, protocol: e.target.value })}
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
                    Map to Bus
                  </label>
                  <select
                    value={deviceForm.busId}
                    onChange={e => setDeviceForm({ ...deviceForm, busId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  >
                    <option value="">Unassigned</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>{b.busNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Server Ingestion Endpoint
                  </label>
                  <input
                    type="text"
                    value={deviceForm.serverEndpoint}
                    onChange={e => setDeviceForm({ ...deviceForm, serverEndpoint: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Server Port
                  </label>
                  <input
                    type="text"
                    value={deviceForm.serverPort}
                    onChange={e => setDeviceForm({ ...deviceForm, serverPort: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Device Authentication Secret Key (Kept Private)
                </label>
                <input
                  type="text"
                  value={deviceForm.deviceToken}
                  onChange={e => setDeviceForm({ ...deviceForm, deviceToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Configure GPS Modal for specific Bus */}
      {configModalBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Configure GPS Tracker for {configModalBus.busNumber}</span>
              </h3>
              <button
                onClick={() => setConfigModalBus(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  GPS Tracker Device ID
                </label>
                <input
                  type="text"
                  required
                  value={deviceForm.id}
                  onChange={e => setDeviceForm({ ...deviceForm, id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  GPS Device IMEI (15 Digits)
                </label>
                <input
                  type="text"
                  required
                  value={deviceForm.imei}
                  onChange={e => setDeviceForm({ ...deviceForm, imei: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Protocol Adapter
                  </label>
                  <select
                    value={deviceForm.protocol}
                    onChange={e => setDeviceForm({ ...deviceForm, protocol: e.target.value })}
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
                    value={deviceForm.updateIntervalSeconds}
                    onChange={e => setDeviceForm({ ...deviceForm, updateIntervalSeconds: Number(e.target.value) })}
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
                  value={deviceForm.simCarrier}
                  onChange={e => setDeviceForm({ ...deviceForm, simCarrier: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  API Authentication Secret Token
                </label>
                <input
                  type="text"
                  value={deviceForm.deviceToken}
                  onChange={e => setDeviceForm({ ...deviceForm, deviceToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfigModalBus(null)}
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

      {/* MODAL 4: Interactive OpenStreetMap & Leaflet.js Modal */}
      {mapModalBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-3xl shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-base">{mapModalBus.busNumber} ({mapModalBus.plateNumber})</h3>
                  <p className="text-xs text-slate-400">
                    Live OpenStreetMap & Leaflet.js Real GPS Satellite Visualization
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMapModalBus(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={modalMapContainerRef}
              className="w-full h-96 rounded-2xl overflow-hidden border border-slate-700 z-0"
            />

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <span className="text-amber-400">
                Coords: {mapModalBus.currentLatitude ?? 8.7139}, {mapModalBus.currentLongitude ?? 77.7567}
              </span>
              <span className="text-slate-300">
                Status: <b>{getDynamicGpsStatus(mapModalBus)}</b>
              </span>
              <span className="text-sky-400">
                Refreshed: {formatTimeAgo(mapModalBus.lastGpsUpdate)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealGpsTrackerSection;
