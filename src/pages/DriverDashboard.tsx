import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { useToast } from '../context/ToastContext';
import { LeafletMap } from '../components/LeafletMap';
import { Bus, Route, Trip, Stop, BusLocation } from '../types';
import {
  Play,
  Square,
  MapPin,
  Clock,
  AlertTriangle,
  Users,
  Compass,
  Radio,
  CheckCircle2,
  Navigation,
  ShieldAlert,
  ChevronRight,
  Wifi,
  WifiOff,
  RefreshCw,
  Sliders,
  Wrench,
  ShieldCheck,
  Bus as BusIcon,
  Eye,
  XCircle,
  User,
  Lock,
} from 'lucide-react';

interface DriverDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ activeTab, onTabChange }) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const { busLocations, refreshAllData, collegeName } = useLive();

  const [assignedTrip, setAssignedTrip] = useState<Trip | null>(null);
  const [assignedBus, setAssignedBus] = useState<Bus | null>(null);
  const [assignedRoute, setAssignedRoute] = useState<Route | null>(null);
  const [loadingTrip, setLoadingTrip] = useState<boolean>(true);

  // GPS Telemetry State
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastGpsCoords, setLastGpsCoords] = useState<{ lat: number; lng: number; speed: number; heading: number } | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Trip Timer
  const [tripElapsedSeconds, setTripElapsedSeconds] = useState<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Forms
  const [showDelayModal, setShowDelayModal] = useState<boolean>(false);
  const [delayMinutes, setDelayMinutes] = useState<number>(5);
  const [delayReason, setDelayReason] = useState<string>('Heavy traffic at main signal junction');

  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [emergencyReason, setEmergencyReason] = useState<string>('Engine overheating / mechanical stop on highway');

  const [showConditionModal, setShowConditionModal] = useState<boolean>(false);
  const [driverCondition, setDriverCondition] = useState<'excellent' | 'good' | 'fair' | 'needs_service'>('good');
  const [driverConditionNotes, setDriverConditionNotes] = useState<string>('');
  const [driverFuelLevel, setDriverFuelLevel] = useState<number>(80);
  const [driverMileage, setDriverMileage] = useState<number>(25000);
  const [savingCondition, setSavingCondition] = useState<boolean>(false);

  const [seatsOccupied, setSeatsOccupied] = useState<number>(0);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Network restored. Syncing offline GPS telemetry queue...', 'success');
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Network disconnected. Telemetry queued offline.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  // Fetch assigned trip
  const fetchTripDetails = async () => {
    if (!token) return;
    try {
      setLoadingTrip(true);
      const res = await fetch('/api/driver/my-trip', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedTrip(data.trip || null);
        setAssignedBus(data.bus || null);
        setAssignedRoute(data.route || null);
        if (data.trip?.occupiedSeats !== undefined) {
          setSeatsOccupied(data.trip.occupiedSeats);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTrip(false);
    }
  };

  useEffect(() => {
    fetchTripDetails();
  }, [token]);

  useEffect(() => {
    if (assignedBus) {
      setDriverCondition(assignedBus.condition || 'good');
      setDriverConditionNotes(assignedBus.conditionNotes || '');
      setDriverFuelLevel(assignedBus.fuelLevelPercent !== undefined ? assignedBus.fuelLevelPercent : 80);
      setDriverMileage(assignedBus.mileageKm || 25000);
    }
  }, [assignedBus]);

  const handleUpdateBusCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedBus) return;
    setSavingCondition(true);
    try {
      const res = await fetch('/api/driver/bus-condition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          busId: assignedBus.id,
          condition: driverCondition,
          conditionNotes: driverConditionNotes,
          fuelLevelPercent: driverFuelLevel,
          mileageKm: driverMileage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Vehicle condition & inspection report submitted to dispatch!', 'success');
        setAssignedBus(data.bus);
        setShowConditionModal(false);
      } else {
        showToast(data.error || 'Failed to submit condition report', 'error');
      }
    } catch {
      showToast('Network error submitting condition report', 'error');
    } finally {
      setSavingCondition(false);
    }
  };

  // Trip duration timer
  useEffect(() => {
    if (assignedTrip?.status === 'in_progress' && assignedTrip.startTime) {
      const startMs = new Date(assignedTrip.startTime).getTime();
      const updateTimer = () => {
        const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setTripElapsedSeconds(diff);
      };
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      setTripElapsedSeconds(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [assignedTrip?.status, assignedTrip?.startTime]);

  // Start Trip Handler
  const handleStartTrip = async () => {
    if (user?.status === 'pending_approval') {
      showToast('Cannot start trip: Driver account is pending admin approval.', 'error');
      return;
    }

    if (!assignedBus || !assignedRoute) {
      showToast('No assigned bus or route found. Contact admin.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/driver/start-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          busId: assignedBus.id,
          routeId: assignedRoute.id,
          tripId: assignedTrip?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAssignedTrip(data.trip);
        showToast('Trip started! Live GPS sharing activated.', 'success');
        startGpsTracking();
      } else {
        showToast(data.error || 'Failed to start trip.', 'error');
      }
    } catch {
      showToast('Network error starting trip.', 'error');
    }
  };

  // End Trip Handler
  const handleEndTrip = async () => {
    if (!assignedTrip) return;

    if (!confirm('Are you sure you want to end this trip? This will complete transit logging.')) {
      return;
    }

    try {
      const res = await fetch('/api/driver/end-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tripId: assignedTrip.id }),
      });

      const data = await res.json();
      if (res.ok) {
        setAssignedTrip(data.trip);
        stopGpsTracking();
        showToast('Trip ended successfully.', 'success');
      } else {
        showToast(data.error || 'Failed to end trip.', 'error');
      }
    } catch {
      showToast('Network error ending trip.', 'error');
    }
  };

  // Start GPS Tracking via HTML5 Geolocation API
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsError(null);
    setIsGpsActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : 30, // convert m/s to km/h or fallback
          heading: pos.coords.heading || 0,
        };
        setLastGpsCoords(coords);
        sendLocationToServer(coords);
      },
      err => {
        console.warn('Geolocation error:', err.message);
        setGpsError(`GPS Access Warning: ${err.message}. Ensure location permissions are allowed.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsActive(false);
  };

  // Send single GPS point or enqueue offline
  const sendLocationToServer = async (coords: { lat: number; lng: number; speed: number; heading: number }) => {
    if (!assignedBus) return;

    const payload = {
      busId: assignedBus.id,
      tripId: assignedTrip?.id,
      latitude: coords.lat,
      longitude: coords.lng,
      speed: coords.speed,
      heading: coords.heading,
      accuracy: 5,
    };

    if (!navigator.onLine) {
      setOfflineQueue(prev => [...prev, payload]);
      return;
    }

    try {
      await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Queue on failure
      setOfflineQueue(prev => [...prev, payload]);
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    const batch = [...offlineQueue];
    try {
      const res = await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ points: batch }),
      });
      if (res.ok) {
        setOfflineQueue([]);
        showToast(`Synced ${batch.length} offline GPS telemetry points!`, 'success');
      }
    } catch (err) {
      console.error('Failed to sync offline queue:', err);
    }
  };

  // Mark Stop Reached
  const handleMarkStopReached = async (stopId: string, stopOrder: number) => {
    if (!assignedTrip) return;
    try {
      const res = await fetch('/api/driver/mark-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tripId: assignedTrip.id,
          stopId,
          stopOrder,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignedTrip(data.trip);
        showToast(`Stop #${stopOrder} marked as reached!`, 'success');
      }
    } catch {
      showToast('Failed to update stop.', 'error');
    }
  };

  // Report Delay
  const handleReportDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTrip) return;
    try {
      const res = await fetch('/api/driver/report-delay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tripId: assignedTrip.id,
          delayMinutes,
          delayReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignedTrip(data.trip);
        setShowDelayModal(false);
        showToast(`Reported ${delayMinutes}m delay to dispatch & students.`, 'info');
      }
    } catch {
      showToast('Failed to report delay', 'error');
    }
  };

  // Report Emergency
  const handleReportEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTrip) return;
    try {
      const res = await fetch('/api/driver/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tripId: assignedTrip.id,
          emergencyAlert: emergencyReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignedTrip(data.trip);
        setShowEmergencyModal(false);
        showToast('EMERGENCY SOS DISPATCHED TO HQ!', 'error');
      }
    } catch {
      showToast('Failed to dispatch emergency', 'error');
    }
  };

  // Adjust Seats
  const handleAdjustSeats = async (delta: number) => {
    if (!assignedTrip || !assignedBus) return;
    const nextVal = Math.max(0, Math.min(assignedBus.capacity, seatsOccupied + delta));
    setSeatsOccupied(nextVal);
    try {
      await fetch('/api/driver/update-seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tripId: assignedTrip.id, occupiedSeats: nextVal }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const stops = assignedRoute?.stops || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Driver Dispatch Deck
            </h1>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              user?.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
            }`}>
              {user?.status === 'active' ? 'Authorized Driver' : 'Pending Approval'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Driver: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.name}</span> · Badge ID: <span className="font-mono text-amber-600 dark:text-amber-400">{user?.collegeId}</span> · <span className="font-bold text-amber-600 dark:text-amber-400">{collegeName}</span>
          </p>
        </div>

        {/* GPS Telemetry Pill */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isOnline ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online (Real-time)' : `Offline (${offlineQueue.length} queued)`}</span>
          </div>
        </div>
      </div>

      {/* Driver Pending Approval Warning Banner */}
      {user?.status === 'pending_approval' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Registration Under Review
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
              Your driver account requires verification from college transport administration. You cannot start live passenger trips until approved.
              (Tip: Switch to the Admin account to approve this driver in 1 click under Users & Approvals!)
            </p>
          </div>
        </div>
      )}

      {/* GPS Warning if error */}
      {gpsError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold text-rose-900 dark:text-rose-200">GPS Notice</h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">{gpsError}</p>
          </div>
          <button
            onClick={startGpsTracking}
            className="px-3 py-1 bg-rose-600 text-white font-bold text-xs rounded-lg hover:bg-rose-500"
          >
            Retry GPS
          </button>
        </div>
      )}

      {/* VIEW: ACTIVE TRIP CONTROL */}
      {activeTab === 'dispatch' && (
        <div className="space-y-6">
          {/* Main Control Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Vehicle & Trip State */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Assigned Route & Vehicle
                    </span>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {assignedRoute?.name || 'Route 1: North Campus Express'}
                    </h2>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    assignedTrip?.status === 'in_progress'
                      ? 'bg-emerald-500 text-slate-950 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {assignedTrip?.status === 'in_progress' ? 'Trip Running' : 'Standby'}
                  </span>
                </div>

                {/* Key Grid Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Bus Plate</span>
                    <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {assignedBus?.plateNumber || 'KA-01-F-4021'}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Trip Timer</span>
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatTimer(tripElapsedSeconds)}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Speed</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {lastGpsCoords ? `${Math.round(lastGpsCoords.speed)} km/h` : '32 km/h'}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Delay Status</span>
                    <p className={`text-xs font-bold mt-0.5 ${
                      (assignedTrip?.delayMinutes || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {(assignedTrip?.delayMinutes || 0) > 0 ? `+${assignedTrip?.delayMinutes}m Late` : 'On Time'}
                    </p>
                  </div>
                </div>

                {/* Vehicle Health & Condition Check Row */}
                <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 my-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                      <BusIcon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {assignedBus?.model || 'Campus Transport Shuttle'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          assignedBus?.condition === 'excellent'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : assignedBus?.condition === 'good' || !assignedBus?.condition
                            ? 'bg-teal-100 text-teal-700 border-teal-300'
                            : assignedBus?.condition === 'fair'
                            ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : 'bg-rose-100 text-rose-700 border-rose-300'
                        }`}>
                          {assignedBus?.condition ? assignedBus.condition.replace('_', ' ') : 'Good'} Condition
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Fuel: <b>{assignedBus?.fuelLevelPercent ?? 80}%</b> ({assignedBus?.fuelType || 'Diesel'})</span>
                        <span>·</span>
                        <span>Odometer: <b>{assignedBus?.mileageKm ? `${assignedBus.mileageKm.toLocaleString()} km` : '25,000 km'}</b></span>
                        {assignedBus?.features?.includes('Air Conditioned') && (
                          <>
                            <span>·</span>
                            <span className="text-sky-600 dark:text-sky-400 font-bold">❄️ AC Verified</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowConditionModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto border border-slate-700 shadow-sm"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pre-Trip Vehicle Inspection</span>
                  </button>
                </div>

                {/* Passenger Occupancy Control */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 my-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Occupied Passenger Seats
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Total Capacity: {assignedBus?.capacity || 45} passengers
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAdjustSeats(-1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-slate-800 dark:text-slate-200 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white w-6 text-center">
                      {seatsOccupied}
                    </span>
                    <button
                      onClick={() => handleAdjustSeats(1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black text-slate-800 dark:text-slate-200 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Start / End Trip Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
                {assignedTrip?.status !== 'in_progress' ? (
                  <button
                    onClick={handleStartTrip}
                    disabled={user?.status === 'pending_approval'}
                    className="flex-1 py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Scheduled Trip</span>
                  </button>
                ) : (
                  <button
                    onClick={handleEndTrip}
                    className="flex-1 py-3 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    <span>End & Complete Trip</span>
                  </button>
                )}

                <button
                  onClick={() => setShowDelayModal(true)}
                  className="py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs border border-amber-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>Report Delay</span>
                </button>

                <button
                  onClick={() => setShowEmergencyModal(true)}
                  className="py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-xs border border-rose-500/30 transition-colors flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Emergency / SOS</span>
                </button>
              </div>
            </div>

            {/* Right 1 Col: Upcoming Stops Progression */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  Upcoming Stops Checklist
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Tap "Reached" as you arrive at each stop to broadcast to students
                </p>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {stops.map(stop => {
                    const isReached = (stop.stopOrder || 0) <= (assignedTrip?.currentStopOrder || 0);
                    const isNext = (stop.stopOrder || 0) === (assignedTrip?.currentStopOrder || 0) + 1;

                    return (
                      <div
                        key={stop.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                          isNext
                            ? 'bg-amber-500/10 border-amber-500'
                            : isReached
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                            : 'border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-400">
                              #{stop.stopOrder}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {stop.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                            Code: {stop.code}
                          </span>
                        </div>

                        {isReached ? (
                          <span className="text-emerald-500 text-xs font-bold flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkStopReached(stop.id, stop.stopOrder || 1)}
                            disabled={assignedTrip?.status !== 'in_progress'}
                            className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shrink-0 disabled:opacity-40"
                          >
                            Mark Reached
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Tactical Map for Driver */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Route Map & Path</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live position visualizer along scheduled waypoints</p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-500">
                {assignedRoute?.stops?.length || 0} designated stops
              </span>
            </div>

            <LeafletMap
              buses={assignedBus ? [assignedBus] : []}
              routes={assignedRoute ? [assignedRoute] : []}
              stops={stops}
              locations={busLocations}
              selectedRouteId={assignedRoute?.id}
              className="h-[400px] w-full"
            />
          </div>
        </div>
      )}

      {/* VIEW: STOPS & TIMINGS */}
      {activeTab === 'route_stops' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Complete Route Stops Timetable
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Scheduled transit intervals from departure terminal
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Order</th>
                  <th className="px-4 py-3">Stop Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Landmark / Coordinates</th>
                  <th className="px-4 py-3 rounded-r-xl">Scheduled Offset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stops.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold font-mono">#{s.stopOrder}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">{s.code}</td>
                    <td className="px-4 py-3 text-slate-500">{s.landmark || `${s.latitude}, ${s.longitude}`}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">+{s.scheduledMinutesFromStart} mins</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: DRIVER PROFILE & VEHICLE / PASSWORD SETTINGS */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Driver Profile & Vehicle Assignment
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Licensed Transit Operator Credentials
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Pilot</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-1">Driver Name</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{user?.name || 'Assigned Driver'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-1">College ID</span>
                <p className="font-mono text-amber-500 font-bold text-sm">{user?.collegeId || 'DRV-TEC-01'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-1">Phone Contact</span>
                <p className="font-mono text-slate-700 dark:text-slate-300 font-bold text-sm">{user?.phone || '+91 94431 01001'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-1">Assigned Vehicle</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{assignedBus ? `${assignedBus.busNumber} (${assignedBus.plateNumber})` : 'Bus 01 (TN-72-AX-4091)'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-1">Primary Route</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{assignedRoute ? assignedRoute.name : 'Vannarpettai - TEC Campus'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-bold block mb-1">Speed Limit / Telemetry</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Active GPS Radar & TPMS</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT DELAY MODAL */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Report Route Delay
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Students waiting along this corridor will be notified immediately.
            </p>

            <form onSubmit={handleReportDelay} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Delay Duration (Minutes)
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDelayMinutes(mins)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        delayMinutes === mins
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Delay
                </label>
                <select
                  value={delayReason}
                  onChange={e => setDelayReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Heavy traffic at main signal junction">Heavy traffic at main signal junction</option>
                  <option value="Severe monsoon rain / water logging">Severe monsoon rain / water logging</option>
                  <option value="Municipal road detour">Municipal road detour</option>
                  <option value="Passenger rush at terminal station">Passenger rush at terminal station</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
                >
                  Broadcast Delay Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMERGENCY SOS MODAL */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-rose-300 dark:border-rose-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-black">Emergency / SOS Broadcast</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Dispatches an immediate high-priority alert to the central campus transport control room.
            </p>

            <form onSubmit={handleReportEmergency} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Incident Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={emergencyReason}
                  onChange={e => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 shadow-md shadow-rose-600/30"
                >
                  Dispatch Emergency SOS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRE-TRIP VEHICLE CONDITION & INSPECTION */}
      {showConditionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Pre-Trip Vehicle Condition Checklist</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify safety condition for {assignedBus?.busNumber} ({assignedBus?.plateNumber})
                </p>
              </div>
              <button
                onClick={() => setShowConditionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBusCondition} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Mandatory Driver Pre-Trip Checks:
                </span>
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-amber-500 rounded" />
                  <span>Braking system & emergency handbrake operational</span>
                </label>
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-amber-500 rounded" />
                  <span>All headlights, indicators, and taillights working</span>
                </label>
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-amber-500 rounded" />
                  <span>Tyre pressure & tread depth inspected</span>
                </label>
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-amber-500 rounded" />
                  <span>First aid kit and fire extinguisher present</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Overall Vehicle Condition Rating
                </label>
                <select
                  value={driverCondition}
                  onChange={e => setDriverCondition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                >
                  <option value="excellent">🟢 Excellent (Clean, smooth, top shape)</option>
                  <option value="good">🟢 Good (Roadworthy, ready for campus route)</option>
                  <option value="fair">🟡 Fair (Minor cosmetic or wear, report below)</option>
                  <option value="needs_service">🔴 Needs Service (Maintenance needed immediately)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Fuel / Battery Level (%): {driverFuelLevel}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={driverFuelLevel}
                  onChange={e => setDriverFuelLevel(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Odometer Reading (km)
                </label>
                <input
                  type="number"
                  value={driverMileage}
                  onChange={e => setDriverMileage(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Inspection Remarks & Driver Notes
                </label>
                <textarea
                  rows={2}
                  value={driverConditionNotes}
                  onChange={e => setDriverConditionNotes(e.target.value)}
                  placeholder="Notes for fleet workshop (e.g. Tyres checked, wiper blades good, AC working well)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConditionModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCondition}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                >
                  {savingCondition ? 'Submitting...' : 'Submit Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
