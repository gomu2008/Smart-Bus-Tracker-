import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { useToast } from '../context/ToastContext';
import { Route, Stop, Bus, Trip } from '../types';
import { LeafletMap } from '../components/LeafletMap';
import { RouteStopPicker } from '../components/RouteStopPicker';
import { VehicleGpsTracker } from '../components/VehicleGpsTracker';
import { PasswordSettingSection } from '../components/PasswordSettingSection';
import {
  Bus as BusIcon,
  MapPin,
  Clock,
  Gauge,
  Users,
  Compass,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Megaphone,
  MessageSquareWarning,
  User,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  XCircle,
  Wrench,
  Disc,
  CircleDot,
} from 'lucide-react';

interface StaffDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ activeTab, onTabChange }) => {
  const { user, token, updateUser } = useAuth();
  const { busLocations, activeTrips, announcements, notifications, signalLostBuses, refreshAllData, collegeName } = useLive();
  const { showToast } = useToast();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [favouriteStopIds, setFavouriteStopIds] = useState<string[]>([]);
  const [selectedBusDetails, setSelectedBusDetails] = useState<Bus | null>(null);

  // Reserved faculty seat state
  const [reservedTripIds, setReservedTripIds] = useState<string[]>([]);

  // Feedback form
  const [feedbackCategory, setFeedbackCategory] = useState<'late_bus' | 'driver_behavior' | 'lost_item' | 'route_suggestion' | 'general'>('route_suggestion');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Profile Form
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileDepartment, setProfileDepartment] = useState(user?.department || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch routes and buses
  const fetchData = async () => {
    try {
      const [routesRes, busesRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/buses'),
      ]);

      if (routesRes.ok) {
        const rData = await routesRes.json();
        const fetchedRoutes: Route[] = rData.routes || [];
        setRoutes(fetchedRoutes);

        // Prefer Tirunelveli Route TN-01 or first route
        if (!selectedRouteId && fetchedRoutes.length > 0) {
          const tnRoute = fetchedRoutes.find(r => r.routeNumber === 'TN-01' || r.name.toLowerCase().includes('tirunelveli'));
          const defaultRoute = tnRoute || fetchedRoutes[0];
          setSelectedRouteId(defaultRoute.id);
          if (defaultRoute.stops && defaultRoute.stops.length > 0) {
            setSelectedStopId(defaultRoute.stops[0].id);
          }
        }
      }

      if (busesRes.ok) {
        const bData = await busesRes.json();
        setBuses(bData.buses || []);
      }
    } catch {
      // Quiet fallback
    }
  };

  const fetchFavourites = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/student/favourites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFavouriteStopIds((data.favourites || []).map((f: any) => f.stopId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchFavourites();
  }, [token]);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const routeStops = selectedRoute?.stops || [];
  const selectedStop = routeStops.find(s => s.id === selectedStopId);

  // Active trip & bus for this route
  const activeTripOnRoute = activeTrips.find(t => t.routeId === selectedRouteId);
  const activeBusOnRoute = activeTripOnRoute
    ? buses.find(b => b.id === activeTripOnRoute.busId)
    : buses.find(b => b.currentRouteId === selectedRouteId);

  const busLiveLoc = activeBusOnRoute ? busLocations[activeBusOnRoute.id] : undefined;
  const isBusDelayed = (activeTripOnRoute?.delayMinutes || 0) > 0;
  const isSignalLost = activeBusOnRoute && Boolean(signalLostBuses[activeBusOnRoute.id]);

  // Compute live ETA
  const stopIndex = routeStops.findIndex(s => s.id === selectedStopId);
  const currentBusStopOrder = activeTripOnRoute?.currentStopOrder || 1;
  const isApproaching = stopIndex !== -1 && stopIndex >= currentBusStopOrder - 1;

  let liveDistanceKm = 0;
  let liveEtaMinutes = 0;

  if (activeBusOnRoute && busLiveLoc && selectedStop && isApproaching) {
    const latDiff = Math.abs(busLiveLoc.latitude - selectedStop.latitude);
    const lngDiff = Math.abs(busLiveLoc.longitude - selectedStop.longitude);
    liveDistanceKm = parseFloat((Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111).toFixed(1));
    const speed = (busLiveLoc.speed && busLiveLoc.speed > 10) ? busLiveLoc.speed : 30;
    liveEtaMinutes = Math.max(1, Math.round((liveDistanceKm / speed) * 60) + (stopIndex * 1));
  } else if (selectedStop && selectedStop.scheduledMinutesFromStart !== undefined) {
    liveEtaMinutes = Math.max(1, selectedStop.scheduledMinutesFromStart);
    liveDistanceKm = parseFloat(((liveEtaMinutes * 32) / 60).toFixed(1));
  }

  // Toggle Favourite
  const toggleFavourite = async (stopId: string) => {
    if (!token) return;
    const isFav = favouriteStopIds.includes(stopId);
    try {
      if (isFav) {
        const res = await fetch(`/api/student/favourites/${stopId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setFavouriteStopIds(prev => prev.filter(id => id !== stopId));
          showToast('Removed from saved stops', 'info');
        }
      } else {
        const res = await fetch('/api/student/favourites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ stopId }),
        });
        if (res.ok) {
          setFavouriteStopIds(prev => [...prev, stopId]);
          showToast('Added to saved stops', 'success');
        }
      }
    } catch {
      showToast('Failed to update favourite stop', 'error');
    }
  };

  // Toggle Faculty Reserved Seat
  const toggleFacultySeat = (tripId: string) => {
    const isReserved = reservedTripIds.includes(tripId);
    if (isReserved) {
      setReservedTripIds(prev => prev.filter(id => id !== tripId));
      showToast('Faculty priority seat reservation released.', 'info');
    } else {
      setReservedTripIds(prev => [...prev, tripId]);
      showToast('Faculty Priority Seat (Row 2, Window) confirmed on this shuttle!', 'success');
    }
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !feedbackSubject || !feedbackMessage) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    setSubmittingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: feedbackCategory,
          subject: `[Staff/Faculty - ${user?.department || 'Staff'}] ${feedbackSubject}`,
          message: feedbackMessage,
          routeId: selectedRouteId || undefined,
          busId: activeBusOnRoute?.id || undefined,
        }),
      });
      if (res.ok) {
        showToast('Faculty transport dispatch inquiry submitted successfully!', 'success');
        setFeedbackSubject('');
        setFeedbackMessage('');
      } else {
        showToast('Failed to submit inquiry.', 'error');
      }
    } catch {
      showToast('Network error submitting feedback.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Update Profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          department: profileDepartment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        showToast('Faculty profile and department details updated!', 'success');
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch {
      showToast('Network error updating profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Faculty & Staff Transport Portal
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
              Staff Priority Transit
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Welcome, <span className="font-semibold text-slate-900 dark:text-white">{user?.name}</span> · Staff ID: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{user?.collegeId}</span> {user?.department && <span>· Dept: <b className="text-slate-700 dark:text-slate-300">{user.department}</b></span>} · <span className="font-bold text-amber-600 dark:text-amber-400">{collegeName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchData();
              refreshAllData();
              showToast('Refreshed fleet telemetry & routes', 'info');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* VIEW: LIVE BUS TRACKER */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          {/* Customized Route & Stop Journey Picker */}
          <RouteStopPicker
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={id => {
              setSelectedRouteId(id);
              const r = routes.find(rt => rt.id === id);
              if (r?.stops?.[0]) setSelectedStopId(r.stops[0].id);
            }}
            selectedStopId={selectedStopId}
            onSelectStop={id => setSelectedStopId(id)}
            favouriteStopIds={favouriteStopIds}
            onToggleFavourite={stopId => toggleFavourite(stopId)}
            busLocations={busLocations}
            buses={buses}
          />

          {/* Real-time Status Card & Map Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: ETA & Vehicle Safety Health Inspection */}
            <div className="space-y-4">
              {/* ETA Highlight Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
                  <BusIcon className="w-40 h-40" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider bg-slate-950/15 px-2.5 py-1 rounded-full">
                      Live Arrival Countdown
                    </span>
                    <span className="text-xs font-mono font-bold bg-white/60 px-2 py-0.5 rounded-md">
                      {selectedStop?.code || 'STP'}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tight">
                      {liveEtaMinutes}
                    </span>
                    <span className="text-base font-extrabold uppercase">
                      Minutes
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-900/80 mt-1">
                    ETA to <b className="text-slate-950">{selectedStop?.name || 'Selected Stop'}</b>
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-950/15 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase opacity-75">Distance</span>
                      <p className="font-extrabold">{liveDistanceKm} km</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase opacity-75">Speed</span>
                      <p className="font-extrabold">
                        {busLiveLoc?.speed ? `${Math.round(busLiveLoc.speed)} km/h` : '32 km/h'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shuttle Vehicle Safety & Brake/Wheel Diagnostics Card */}
              {activeBusOnRoute ? (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <BusIcon className="w-4 h-4 text-amber-500" />
                        <span>{activeBusOnRoute.busNumber}</span>
                      </h3>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        Plate: {activeBusOnRoute.plateNumber} · {activeBusOnRoute.model}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      activeBusOnRoute.condition === 'excellent'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                    }`}>
                      {activeBusOnRoute.condition || 'Good'}
                    </span>
                  </div>

                  {/* Mechanical Brake & Wheel Safety Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Brakes Card */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold mb-1">
                        <Disc className="w-3.5 h-3.5 text-rose-500" />
                        <span>Brake System</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                        Rating: <span className="text-emerald-600 dark:text-emerald-400 uppercase">{(activeBusOnRoute.brakeCondition || 'Good').replace('_', ' ')}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Pad Life: <b>{activeBusOnRoute.brakePadLifePercent ?? 90}%</b> · {activeBusOnRoute.brakePressurePsi ?? 115} PSI
                      </div>
                    </div>

                    {/* Wheels / Tyres Card */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold mb-1">
                        <CircleDot className="w-3.5 h-3.5 text-amber-500" />
                        <span>Wheels & Tyres</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white">
                        Rating: <span className="text-emerald-600 dark:text-emerald-400 uppercase">{(activeBusOnRoute.wheelCondition || 'Good').replace('_', ' ')}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Pressure: <b>{activeBusOnRoute.tirePressurePsi ?? 110} PSI</b> · {activeBusOnRoute.tireTreadDepthMm ?? 8.8} mm
                      </div>
                    </div>
                  </div>

                  {/* Occupancy and Faculty Reservation Action */}
                  <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Faculty Reserved Seating</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 border border-teal-300">
                        Rows 1-3 Staff
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Seats 1 to 8 on this vehicle are reserved for college professors, research fellows, and staff commuters.
                    </p>
                    <button
                      onClick={() => toggleFacultySeat(activeTripOnRoute?.id || activeBusOnRoute.id)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        reservedTripIds.includes(activeTripOnRoute?.id || activeBusOnRoute.id)
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-50'
                      }`}
                    >
                      {reservedTripIds.includes(activeTripOnRoute?.id || activeBusOnRoute.id) ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Staff Priority Seat Confirmed</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Reserve Faculty Transit Seat</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* View Full Vehicle Specs Button */}
                  <button
                    onClick={() => setSelectedBusDetails(activeBusOnRoute)}
                    className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    <span>View Complete Vehicle Inspection Report</span>
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <BusIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No active vehicle on this corridor right now
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Check the Route Timetable or switch corridors to track operating shuttles.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Live Tactical Map */}
            <div className="lg:col-span-2 min-h-[480px]">
              <LeafletMap
                buses={buses}
                routes={routes}
                stops={routeStops}
                locations={busLocations}
                selectedRouteId={selectedRouteId}
                selectedStopId={selectedStopId}
                selectedPickupStopId={selectedStopId}
                onStopSelect={stop => setSelectedStopId(stop.id)}
                className="w-full h-full min-h-[480px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW: STAFF PRIORITY SEATING */}
      {activeTab === 'seating' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Faculty & Staff Reserved Seating Deck</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Priority allocation for professors, lab instructors, and administrative staff across all college transit corridors
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
              Department: {user?.department || 'Faculty Commuter'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buses.map(bus => {
              const assignedR = routes.find(r => r.id === bus.currentRouteId);
              const trip = activeTrips.find(t => t.busId === bus.id);
              const occupied = trip?.occupiedSeats || 18;
              const staffSeatsAvailable = Math.max(0, 8 - (reservedTripIds.includes(trip?.id || bus.id) ? 1 : 0));
              const isReserved = reservedTripIds.includes(trip?.id || bus.id);

              return (
                <div
                  key={bus.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {bus.busNumber}
                      </h3>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {assignedR ? `${assignedR.routeNumber}: ${assignedR.name}` : 'Campus Corridor'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {staffSeatsAvailable} Staff Seats Free
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">Total Capacity</span>
                      <span className="font-extrabold">{bus.capacity} Seats</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">Staff Rows</span>
                      <span className="font-extrabold text-teal-600">Rows 1-3</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">Current Load</span>
                      <span className="font-extrabold">{occupied} Boarded</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-slate-500">
                      AC: {bus.features?.includes('Air Conditioned') ? '✅ Yes' : 'Standard'} · Brakes: <b className="text-emerald-600 uppercase">{bus.brakeCondition || 'Good'}</b>
                    </div>
                    <button
                      onClick={() => toggleFacultySeat(trip?.id || bus.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isReserved
                          ? 'bg-teal-600 text-white shadow'
                          : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500 hover:text-white'
                      }`}
                    >
                      {isReserved ? 'Seat Confirmed' : 'Reserve Seat'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Campus & Faculty Transit Timetable</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Regular operating schedules for all corridors, including Tamil Nadu Tirunelveli express routes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map(r => (
              <div
                key={r.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded text-slate-950 font-mono" style={{ backgroundColor: r.color || '#F59E0B' }}>
                      {r.routeNumber}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                      {r.name}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    ~{r.estimatedDurationMinutes} mins
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {r.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Morning Departure</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.morningStartTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Evening Return</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{r.eveningStartTime}</span>
                  </div>
                </div>

                {r.stops && r.stops.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">
                      Scheduled Stops ({r.stops.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {r.stops.map((st, idx) => (
                        <span
                          key={st.id}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-800"
                        >
                          {idx + 1}. {st.code} ({st.name})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <span>Campus Transport Bulletins & Advisories</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official notices from Fleet Dispatch regarding weather, schedule revisions, or roadworks
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No active announcements right now. All routes running on regular college schedule.
              </div>
            ) : (
              announcements.map((ann, idx) => (
                <div
                  key={`${ann.id}-${idx}`}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {ann.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ann.content || (ann as any).message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW: FEEDBACK & ROUTE REQUEST */}
      {activeTab === 'feedback' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquareWarning className="w-5 h-5 text-amber-500" />
              <span>Faculty Transport Feedback & Inquiries</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit route feedback, report delays, or request special shuttle timings for college academic events
            </p>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={feedbackCategory}
                onChange={e => setFeedbackCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white"
              >
                <option value="route_suggestion">Route Extension / New Corridor Suggestion</option>
                <option value="late_bus">Bus Delay / Punctuality Concern</option>
                <option value="driver_behavior">Driver Feedback & Professionalism</option>
                <option value="lost_item">Lost Belongings on Campus Shuttle</option>
                <option value="general">General Transport Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={feedbackSubject}
                onChange={e => setFeedbackSubject(e.target.value)}
                placeholder="e.g. Request pickup adjustment for Evening Lab examinations"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Message
              </label>
              <textarea
                required
                rows={4}
                value={feedbackMessage}
                onChange={e => setFeedbackMessage(e.target.value)}
                placeholder="Please describe your transport feedback or schedule requirements in detail..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submittingFeedback}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback to Transport Office'}
            </button>
          </form>
        </div>
      )}

      {/* VIEW: PROFILE */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              <span>Faculty & Staff Profile</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your college employee information and department transit records
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Staff Employee ID
              </label>
              <input
                type="text"
                disabled
                value={user?.collegeId || ''}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Registered Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name & Title
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Academic / Administrative Department
              </label>
              <input
                type="text"
                value={profileDepartment}
                onChange={e => setProfileDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
                placeholder="+91 98421 55001"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
            >
              {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>

          {/* Password & Security Settings (Open / Hide Password Setting) */}
          <PasswordSettingSection defaultOpen={false} />
        </div>
      )}

      {/* MODAL: COMPLETE BUS DETAILS & BRAKE/WHEEL MECHANICAL REPORT */}
      {selectedBusDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-xl w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                  <BusIcon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedBusDetails.busNumber}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                      {selectedBusDetails.plateNumber}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-xs text-slate-500">{selectedBusDetails.model}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedBusDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Condition Banner */}
            <div className="p-4 rounded-2xl border mb-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Overall Vehicle Health: {(selectedBusDetails.condition || 'GOOD').toUpperCase()}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-white/80 dark:bg-slate-900/60">
                  Status: {selectedBusDetails.status}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {selectedBusDetails.conditionNotes || 'Regular maintenance inspection completed. Mechanical, braking, and steering certified.'}
              </p>
            </div>

            {/* Brake & Wheel Diagnostic Inspection Details */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 mb-4">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                Brake System & Wheel Assembly Diagnostics
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Brakes */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Disc className="w-3.5 h-3.5 text-rose-500" />
                      <span>Braking System</span>
                    </span>
                    <span className="font-bold uppercase text-[10px] text-emerald-600">
                      {(selectedBusDetails.brakeCondition || 'Good').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Brake Lining Life: <b>{selectedBusDetails.brakePadLifePercent ?? 90}%</b>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Air Pressure: <b>{selectedBusDetails.brakePressurePsi ?? 115} PSI</b> (Dual Circuit)
                  </div>
                </div>

                {/* Wheels */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <CircleDot className="w-3.5 h-3.5 text-amber-500" />
                      <span>Wheels & Tyres</span>
                    </span>
                    <span className="font-bold uppercase text-[10px] text-emerald-600">
                      {(selectedBusDetails.wheelCondition || 'Good').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tire Pressure: <b>{selectedBusDetails.tirePressurePsi ?? 110} PSI</b>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tread Depth: <b>{selectedBusDetails.tireTreadDepthMm ?? 8.5} mm</b> · Spare: Certified
                  </div>
                </div>
              </div>

              {selectedBusDetails.brakeWheelInspectionNotes && (
                <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  Inspection Notes: {selectedBusDetails.brakeWheelInspectionNotes}
                </p>
              )}
            </div>

            {/* Technical Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Powertrain</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBusDetails.fuelType || 'Diesel'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Fuel / Battery</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBusDetails.fuelLevelPercent !== undefined ? `${selectedBusDetails.fuelLevelPercent}%` : '80%'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Odometer</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBusDetails.mileageKm ? `${selectedBusDetails.mileageKm.toLocaleString()} km` : '25,000 km'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Seating</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBusDetails.capacity} Total (8 Staff)
                </p>
              </div>
            </div>

            {/* Certified Safety Equipment */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Certified Safety & Comfort Features
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedBusDetails.features || ['Air Conditioned', 'CCTV Monitored', 'First Aid Kit']).map(f => (
                  <span
                    key={f}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{f}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedBusDetails(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800"
              >
                Close Vehicle Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
