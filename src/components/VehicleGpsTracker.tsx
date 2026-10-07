import React, { useState, useEffect, useRef } from 'react';
import { Bus, BusLocation, Trip } from '../types';
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
} from 'lucide-react';

interface VehicleGpsTrackerProps {
  bus: Bus;
  location?: BusLocation | null;
  trip?: Trip | null;
  onLocationUpdated?: (loc: BusLocation) => void;
  className?: string;
}

export const VehicleGpsTracker: React.FC<VehicleGpsTrackerProps> = ({
  bus,
  location,
  trip,
  onLocationUpdated,
  className = '',
}) => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [isBroadcastingDeviceGps, setIsBroadcastingDeviceGps] = useState<boolean>(false);
  const [deviceGpsError, setDeviceGpsError] = useState<string | null>(null);
  const [transmittingCount, setTransmittingCount] = useState<number>(0);
  const [testingPing, setTestingPing] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);

  // Fallback / current coordinates
  const lat = location?.latitude ?? 8.7139;
  const lng = location?.longitude ?? 77.7567;
  const speed = Math.round(location?.speed ?? 0);
  const heading = Math.round(location?.heading ?? 0);
  const accuracy = location?.accuracy ?? 4.5;
  const isSimulated = location?.isSimulated ?? true;
  const timestamp = location?.timestamp ? new Date(location.timestamp).toLocaleTimeString() : 'Live';

  // Heading cardinal direction
  const getCardinalDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round((deg % 360) / 45) % 8;
    return directions[index];
  };

  // Start Device GPS Broadcast
  const startDeviceGpsBroadcast = () => {
    if (!navigator.geolocation) {
      setDeviceGpsError('Geolocation is not supported by your browser/device.');
      showToast('Geolocation is not supported by this browser.', 'error');
      return;
    }

    setDeviceGpsError(null);
    setIsBroadcastingDeviceGps(true);
    showToast(`Started live device GPS broadcast for ${bus.busNumber}!`, 'success');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async pos => {
        const payload = {
          busId: bus.id,
          tripId: trip?.id || bus.activeTrip?.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 32,
          heading: pos.coords.heading || 0,
          accuracy: Math.round(pos.coords.accuracy) || 5,
        };

        try {
          const res = await fetch('/api/driver/location', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            setTransmittingCount(c => c + 1);
            if (onLocationUpdated) {
              onLocationUpdated({
                ...payload,
                timestamp: new Date().toISOString(),
                isSimulated: false,
              });
            }
          }
        } catch {
          // Network fluctuation
        }
      },
      err => {
        setDeviceGpsError(`Device GPS error: ${err.message}`);
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

  // Stop Device GPS Broadcast
  const stopDeviceGpsBroadcast = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcastingDeviceGps(false);
    showToast(`Stopped device GPS broadcast for ${bus.busNumber}.`, 'info');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Send single GPS Test Ping
  const sendTestPing = async () => {
    setTestingPing(true);
    try {
      // Offset slightly to simulate a live moving pulse
      const offsetLat = lat + (Math.random() - 0.5) * 0.001;
      const offsetLng = lng + (Math.random() - 0.5) * 0.001;
      const testSpeed = 35 + Math.round(Math.random() * 10);
      const testHeading = (heading + 15) % 360;

      const res = await fetch('/api/driver/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          busId: bus.id,
          tripId: trip?.id || bus.activeTrip?.id,
          latitude: offsetLat,
          longitude: offsetLng,
          speed: testSpeed,
          heading: testHeading,
          accuracy: 3.5,
        }),
      });

      if (res.ok) {
        showToast(`GPS Transponder ping verified on ${bus.busNumber}! Coordinates updated.`, 'success');
      } else {
        showToast('Telemetry ping received server warning', 'info');
      }
    } catch {
      showToast('Error sending telemetry ping', 'error');
    } finally {
      setTestingPing(false);
    }
  };

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4 ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>GPS Transponder Telemetry</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                isBroadcastingDeviceGps
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {isBroadcastingDeviceGps ? 'Live Device GPS Active' : isSimulated ? 'Simulated Transponder' : 'Hardware GPS Online'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Vehicle: <b className="text-slate-200">{bus.busNumber}</b> ({bus.plateNumber}) · Refreshed {timestamp}
            </p>
          </div>
        </div>

        {/* Live Satellite Status Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-mono">
          <Satellite className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-bold">3D LOCK</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-300">±{accuracy}m</span>
        </div>
      </div>

      {/* Primary Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* Latitude */}
        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Latitude
          </span>
          <div className="font-mono text-sm font-black text-amber-400 truncate">
            {lat.toFixed(6)}° N
          </div>
        </div>

        {/* Longitude */}
        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Longitude
          </span>
          <div className="font-mono text-sm font-black text-amber-400 truncate">
            {lng.toFixed(6)}° E
          </div>
        </div>

        {/* Speedometer */}
        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>Speed</span>
            <Gauge className="w-3 h-3 text-slate-400" />
          </span>
          <div className="font-mono text-sm font-black text-emerald-400">
            {speed} <span className="text-[10px] text-slate-400 font-normal">km/h</span>
          </div>
        </div>

        {/* Heading & Compass */}
        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>Heading</span>
            <Compass className="w-3 h-3 text-slate-400" />
          </span>
          <div className="font-mono text-sm font-black text-blue-400 flex items-center gap-1">
            <span>{heading}°</span>
            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
              {getCardinalDirection(heading)}
            </span>
          </div>
        </div>
      </div>

      {/* Live Device GPS Broadcasting Control & Ping Action Bar */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-400 text-[11px]">
          {isBroadcastingDeviceGps ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Broadcasting device telemetry: {transmittingCount} pings sent
            </span>
          ) : (
            <span>Use device sensor or transponder ping to stream live coordinates.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Send Ping Test */}
          <button
            type="button"
            onClick={sendTestPing}
            disabled={testingPing}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>{testingPing ? 'Pinging...' : 'Test GPS Ping'}</span>
          </button>

          {/* Toggle Device GPS Broadcast */}
          {isBroadcastingDeviceGps ? (
            <button
              type="button"
              onClick={stopDeviceGpsBroadcast}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Device GPS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startDeviceGpsBroadcast}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Broadcast Device GPS</span>
            </button>
          )}
        </div>
      </div>

      {deviceGpsError && (
        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{deviceGpsError}</span>
        </div>
      )}
    </div>
  );
};
