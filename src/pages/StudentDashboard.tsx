import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { useToast } from '../context/ToastContext';
import { LeafletMap } from '../components/LeafletMap';
import { RouteStopPicker } from '../components/RouteStopPicker';
import { VehicleGpsTracker } from '../components/VehicleGpsTracker';
import { Route, Stop, Bus, Trip, FeedbackItem } from '../types';
import {
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  Search,
  Users,
  Compass,
  Gauge,
  AlertTriangle,
  Send,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Lock,
  User,
  Phone,
  Radio,
  RefreshCw,
  Bus as BusIcon,
  Eye,
  Sparkles,
  XCircle,
} from 'lucide-react';

interface StudentDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ activeTab, onTabChange }) => {
  const { user, token, updateUser } = useAuth();
  const { busLocations, activeTrips, announcements, notifications, signalLostBuses, refreshAllData, collegeName } = useLive();
  const { showToast } = useToast();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusDetails, setSelectedBusDetails] = useState<Bus | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route_01');
  const [selectedStopId, setSelectedStopId] = useState<string>('stop_03');
  const [destinationStopId, setDestinationStopId] = useState<string>('');
  const [showVehicleGps, setShowVehicleGps] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favouriteStops, setFavouriteStops] = useState<{ stopId: string; routeId: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Feedback form state
  const [fbCategory, setFbCategory] = useState<string>('late_bus');
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbMessage, setFbMessage] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<FeedbackItem[]>([]);

  // Profile edit state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Change password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSaving, setPassSaving] = useState(false);

  // Fetch routes and buses
  const loadData = async () => {
    try {
      setLoadingData(true);
      const [routesRes, busesRes, favRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/buses'),
        fetch('/api/student/favourites', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);

      if (routesRes.ok) {
        const rData = await routesRes.json();
        setRoutes(rData.routes || []);
        if (rData.routes?.length > 0 && !selectedRouteId) {
          setSelectedRouteId(rData.routes[0].id);
        }
      }

      if (busesRes.ok) {
        const bData = await busesRes.json();
        setBuses(bData.buses || []);
      }

      if (favRes.ok) {
        const fData = await favRes.json();
        setFavouriteStops(fData.favourites || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch feedback history
  const loadFeedback = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/feedback', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyFeedbacks(data.feedback || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    loadFeedback();
  }, [token]);

  const activeRoute = useMemo(() => {
    return routes.find(r => r.id === selectedRouteId) || routes[0];
  }, [routes, selectedRouteId]);

  const allStops = useMemo(() => {
    return activeRoute?.stops || [];
  }, [activeRoute]);

  const selectedStop = useMemo(() => {
    return allStops.find(s => s.id === selectedStopId) || allStops[0];
  }, [allStops, selectedStopId]);

  // Find active trip running on this route
  const activeTripOnRoute = useMemo(() => {
    return activeTrips.find(t => t.routeId === activeRoute?.id && t.status === 'in_progress');
  }, [activeTrips, activeRoute]);

  // Find assigned bus for this trip
  const activeBusOnRoute = useMemo(() => {
    if (!activeTripOnRoute) return null;
    return buses.find(b => b.id === activeTripOnRoute.busId) || null;
  }, [activeTripOnRoute, buses]);

  const busLiveLoc = useMemo(() => {
    if (!activeBusOnRoute) return null;
    return busLocations[activeBusOnRoute.id] || null;
  }, [activeBusOnRoute, busLocations]);

  // Live ETA calculation for selected stop
  const stopETA = useMemo(() => {
    if (!selectedStop) return null;
    if (activeTripOnRoute?.stopETAs && activeTripOnRoute.stopETAs[selectedStop.id]) {
      return activeTripOnRoute.stopETAs[selectedStop.id];
    }
    // Fallback static calculation
    return {
      distanceKm: 2.4,
      etaMinutes: 6,
    };
  }, [activeTripOnRoute, selectedStop]);

  // Handle toggle favourite
  const toggleFavourite = async (stopId: string, routeId: string) => {
    if (!token) {
      showToast('Please sign in to save favourite stops', 'info');
      return;
    }

    const isFav = favouriteStops.some(f => f.stopId === stopId && f.routeId === routeId);
    try {
      if (isFav) {
        setFavouriteStops(prev => prev.filter(f => !(f.stopId === stopId && f.routeId === routeId)));
        await fetch('/api/student/favourites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ stopId, routeId }),
        });
        showToast('Removed from saved stops', 'info');
      } else {
        setFavouriteStops(prev => [...prev, { stopId, routeId }]);
        await fetch('/api/student/favourites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ stopId, routeId }),
        });
        showToast('Saved to favourite stops', 'success');
      }
    } catch {
      showToast('Failed to update favourite', 'error');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbMessage.trim()) {
      showToast('Please enter your feedback message', 'error');
      return;
    }

    setFbSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: fbCategory,
          rating: fbRating,
          message: fbMessage,
          busId: activeBusOnRoute?.id,
          tripId: activeTripOnRoute?.id,
        }),
      });

      const data = await res.json();
      setFbSubmitting(false);

      if (res.ok) {
        showToast('Feedback ticket submitted to transport control.', 'success');
        setFbMessage('');
        loadFeedback();
      } else {
        showToast(data.error || 'Failed to submit feedback.', 'error');
      }
    } catch {
      setFbSubmitting(false);
      showToast('Network error submitting feedback.', 'error');
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      const data = await res.json();
      setProfileSaving(false);

      if (res.ok) {
        updateUser(data.user);
        showToast('Profile updated successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch {
      setProfileSaving(false);
      showToast('Network error updating profile', 'error');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPass.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }

    setPassSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json();
      setPassSaving(false);

      if (res.ok) {
        showToast('Password changed successfully!', 'success');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        showToast(data.error || 'Failed to change password.', 'error');
      }
    } catch {
      setPassSaving(false);
      showToast('Network error changing password', 'error');
    }
  };

  // Filtered stops & routes for search
  const filteredStops = useMemo(() => {
    if (!searchQuery.trim()) return allStops;
    const q = searchQuery.toLowerCase();
    return allStops.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.landmark?.toLowerCase().includes(q)
    );
  }, [allStops, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Student Transport Portal
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Live Transit
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Welcome, <span className="font-semibold text-slate-900 dark:text-white">{user?.name}</span> · ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.collegeId}</span> · <span className="font-bold text-amber-600 dark:text-amber-400">{collegeName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshAllData()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Informational Banner */}
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Tirunelveli campus bus routes active. Live GPS & brake/wheel telemetry streaming.</span>
        </div>
        <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
          Route & fleet changes handled exclusively by Admin
        </span>
      </div>

      {/* VIEW: LIVE TRACKER */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          {/* Customized Route & Stop Journey Picker */}
          <RouteStopPicker
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={id => {
              setSelectedRouteId(id);
              const r = routes.find(x => x.id === id);
              if (r?.stops?.[0]) setSelectedStopId(r.stops[0].id);
            }}
            selectedStopId={selectedStopId}
            onSelectStop={id => setSelectedStopId(id)}
            destinationStopId={destinationStopId}
            onSelectDestinationStop={id => setDestinationStopId(id)}
            favouriteStopIds={favouriteStops.map(f => f.stopId)}
            onToggleFavourite={(stopId, routeId) => toggleFavourite(stopId, routeId)}
            busLocations={busLocations}
            buses={buses}
            onFocusOnMap={(lat, lng) => {
              // select stop or focus
            }}
          />

          {/* Live ETA Hero Banner Card & Live GPS Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-5 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900/80 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-950" />
                  <span>Real-Time Shuttle Arrival ETA</span>
                </span>
                <span className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-full ${
                  (busLiveLoc?.delayMinutes || activeTripOnRoute?.delayMinutes || 0) > 0
                    ? 'bg-rose-950 text-rose-200'
                    : 'bg-slate-950 text-amber-400'
                }`}>
                  {(busLiveLoc?.delayMinutes || activeTripOnRoute?.delayMinutes || 0) > 0
                    ? `+${busLiveLoc?.delayMinutes || activeTripOnRoute?.delayMinutes}m Delayed`
                    : 'On Schedule'}
                </span>
              </div>

              <div className="my-3 flex items-baseline justify-between">
                <div>
                  <div className="text-4xl font-black tracking-tight flex items-baseline gap-1.5">
                    <span>{stopETA ? `${stopETA.etaMinutes}` : '--'}</span>
                    <span className="text-lg font-bold uppercase">mins</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900/90 mt-1">
                    Boarding Stop: <span className="underline">{selectedStop?.name || 'Selected Point'}</span> ({selectedStop?.code})
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900/80">Assigned Shuttle</div>
                  <div className="text-base font-black text-slate-950 mt-0.5">
                    {activeBusOnRoute ? `${activeBusOnRoute.busNumber}` : 'Pending Dispatch'}
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-900/80">
                    {activeBusOnRoute?.plateNumber || ''}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-950/20 flex flex-wrap items-center justify-between text-xs font-bold text-slate-950">
                <span>Distance: {stopETA ? `${stopETA.distanceKm} km away` : '--'}</span>
                <span>Telemetry: {busLiveLoc ? `${Math.round(busLiveLoc.speed)} km/h · Heading ${busLiveLoc.heading || 0}°` : 'GPS Standby'}</span>
                <button
                  type="button"
                  onClick={() => setShowVehicleGps(prev => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-400 text-[11px] font-extrabold hover:bg-slate-900 transition-colors"
                >
                  {showVehicleGps ? 'Hide GPS Telemetry' : 'Show Vehicle GPS'}
                </button>
              </div>
            </div>

            {/* Quick Stop Info Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Selected Stop Overview
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedStop?.name}
                </h4>
                <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  Stop Code: {selectedStop?.code}
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  📍 {selectedStop?.landmark || selectedStop?.address || 'Designated college transit checkpoint'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Corridor: <b className="text-slate-800 dark:text-slate-200">{activeRoute?.routeNumber}</b></span>
                <span>Morning: <b className="text-slate-800 dark:text-slate-200">{activeRoute?.morningStartTime}</b></span>
              </div>
            </div>
          </div>

          {/* Live Vehicle GPS Transponder HUD (when active) */}
          {showVehicleGps && activeBusOnRoute && (
            <VehicleGpsTracker
              bus={activeBusOnRoute}
              location={busLiveLoc}
              trip={activeTripOnRoute}
            />
          )}

          {/* Interactive Map & Telemetry Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Map Container */}
            <div className="lg:col-span-3">
              <LeafletMap
                buses={activeBusOnRoute ? [activeBusOnRoute] : buses.filter(b => b.status === 'active')}
                routes={routes}
                stops={allStops}
                locations={busLocations}
                selectedRouteId={selectedRouteId}
                selectedStopId={selectedStopId}
                selectedPickupStopId={selectedStopId}
                onStopSelect={stop => setSelectedStopId(stop.id)}
                className="h-[520px] w-full"
              />
            </div>

            {/* Right Telemetry & Stop Sequence Panel */}
            <div className="space-y-4">
              {/* Bus Status Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Vehicle Telemetry
                </h3>

                {activeBusOnRoute ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Assigned Shuttle</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {activeBusOnRoute.busNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Plate Number</span>
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        {activeBusOnRoute.plateNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Condition Rating</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        activeBusOnRoute.condition === 'excellent'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : activeBusOnRoute.condition === 'good' || !activeBusOnRoute.condition
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                          : activeBusOnRoute.condition === 'fair'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      }`}>
                        {activeBusOnRoute.condition ? activeBusOnRoute.condition.replace('_', ' ') : 'Good'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Model & Fuel</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                        {activeBusOnRoute.model} ({activeBusOnRoute.fuelType || 'Diesel'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Capacity & Seats</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {busLiveLoc?.occupiedSeats ?? activeTripOnRoute?.occupiedSeats ?? 0} / {activeBusOnRoute.capacity}
                      </span>
                    </div>

                    {/* Passenger Occupancy Meter */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-500">Occupancy</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {Math.round(
                            ((busLiveLoc?.occupiedSeats ?? activeTripOnRoute?.occupiedSeats ?? 0) /
                              activeBusOnRoute.capacity) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((busLiveLoc?.occupiedSeats ?? activeTripOnRoute?.occupiedSeats ?? 0) /
                                  activeBusOnRoute.capacity) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Amenities Badges */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {activeBusOnRoute.features?.includes('Air Conditioned') && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-[10px] font-bold border border-sky-200 dark:border-sky-800">
                          ❄️ AC Shuttle
                        </span>
                      )}
                      {activeBusOnRoute.features?.includes('CCTV Monitored') && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                          📹 CCTV
                        </span>
                      )}
                      {activeBusOnRoute.features?.includes('GPS Telemetry') && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                          📡 Live GPS
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedBusDetails(activeBusOnRoute)}
                      className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Bus Details & Safety Condition</span>
                    </button>

                    {/* Delay or Signal Warning */}
                    {activeBusOnRoute && signalLostBuses[activeBusOnRoute.id] && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>GPS signal lost for {activeBusOnRoute.busNumber}.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No active trip running on {activeRoute?.routeNumber}.
                  </div>
                )}
              </div>

              {/* Stops Timeline on Route */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Route Stops Progression
                </h3>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {allStops.map(stop => {
                    const isSelected = selectedStopId === stop.id;
                    const isPassed = activeTripOnRoute && (stop.stopOrder || 0) < activeTripOnRoute.currentStopOrder;
                    const isCurrent = activeTripOnRoute && (stop.stopOrder || 0) === activeTripOnRoute.currentStopOrder;

                    return (
                      <div
                        key={stop.id}
                        onClick={() => setSelectedStopId(stop.id)}
                        className={`p-2 rounded-xl cursor-pointer text-xs transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white font-bold'
                            : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 animate-pulse'
                                : isPassed
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isPassed ? '✓' : stop.stopOrder}
                          </span>
                          <span className="truncate">{stop.name}</span>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold shrink-0">
                            Pickup
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TIMETABLE & SCHEDULE */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Official College Bus Timetable
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Daily scheduled departure and arrival windows across campus arteries
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {routes.map(r => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {r.routeNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">{r.estimatedDurationMinutes} mins</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{r.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {r.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Scheduled Shifts:
                      </div>
                      <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Morning Run</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{r.morningStartTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Evening Return</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{r.eveningStartTime}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedRouteId(r.id);
                      onTabChange('tracker');
                    }}
                    className="w-full py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                  >
                    Track This Route Live
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SAVED FAVORITES */}
      {activeTab === 'favorites' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            My Bookmarked Stops
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Quickly jump to your frequently boarded campus shuttle stations
          </p>

          {favouriteStops.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              You haven't saved any stops yet. Click the bookmark icon next to any stop on the tracker to save it!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {favouriteStops.map((fav, idx) => {
                const stop = routes.flatMap(r => r.stops || []).find(s => s.id === fav.stopId);
                const route = routes.find(r => r.id === fav.routeId);

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        {route?.routeNumber || 'Campus Route'}
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {stop?.name || fav.stopId}
                      </div>
                      <div className="text-xs text-slate-500">Code: {stop?.code || 'STP'}</div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRouteId(fav.routeId);
                        setSelectedStopId(fav.stopId);
                        onTabChange('tracker');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                    >
                      Track Now
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Official Transport Announcements
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Campus road updates, weather advisories, and timetable notifications from dispatch
            </p>
          </div>

          <div className="space-y-3">
            {announcements.map((ann, idx) => (
              <div
                key={`${ann.id}-${idx}`}
                className={`p-4 rounded-2xl border ${
                  ann.priority === 'urgent'
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {ann.title}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      ann.priority === 'urgent'
                        ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                    }`}>
                      {ann.priority}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ann.content}
                </p>
                <div className="mt-2 text-[10px] text-slate-400 font-medium">
                  Posted by: {ann.createdByName || 'Administration'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: FEEDBACK & ISSUE REPORTING */}
      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submit form */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Report an Issue / Feedback
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Send immediate feedback regarding bus punctuality, cleanliness, driver conduct, or lost items.
            </p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Category
                </label>
                <select
                  value={fbCategory}
                  onChange={e => setFbCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="late_bus">Late Bus / Schedule Delay</option>
                  <option value="driver_behavior">Driver Behavior / Safety</option>
                  <option value="lost_item">Lost Item on Board</option>
                  <option value="cleanliness">Vehicle Cleanliness / AC</option>
                  <option value="other">Other Suggestion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Experience Rating (1-5 Stars)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFbRating(star)}
                      className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${
                        fbRating >= star
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={fbMessage}
                  onChange={e => setFbMessage(e.target.value)}
                  placeholder="Describe what occurred, date/time, and specific bus or stop location..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={fbSubmitting}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{fbSubmitting ? 'Submitting Report...' : 'Submit to Transport Office'}</span>
              </button>
            </form>
          </div>

          {/* Previous submissions */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              My Submitted Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Track resolution status of your reported tickets
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {myFeedbacks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No issues reported yet.
                </div>
              ) : (
                myFeedbacks.map((fb, idx) => (
                  <div
                    key={`${fb.id}-${idx}`}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 dark:text-white capitalize">
                        {fb.category.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        fb.status === 'resolved'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        {fb.status}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-2">{fb.message}</p>
                    {fb.resolutionNotes && (
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                        <b>Office Resolution:</b> {fb.resolutionNotes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: PROFILE & SETTINGS */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Personal Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Update your registered college transit information
            </p>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  College ID
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.collegeId || ''}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 outline-none cursor-not-allowed uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="py-2.5 px-5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md"
              >
                {profileSaving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Change Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Ensure your account uses a secure password of at least 6 characters
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={passSaving}
                className="py-2.5 px-5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-700"
              >
                {passSaving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT BUS DETAILS & SAFETY CONDITION INSPECTION */}
      {selectedBusDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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
            <div className={`p-4 rounded-2xl border mb-4 ${
              selectedBusDetails.condition === 'excellent'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : selectedBusDetails.condition === 'good' || !selectedBusDetails.condition
                ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800/60 text-teal-900 dark:text-teal-200'
                : selectedBusDetails.condition === 'fair'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Condition: {selectedBusDetails.condition ? selectedBusDetails.condition.replace('_', ' ').toUpperCase() : 'GOOD'}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-white/70 dark:bg-slate-900/60">
                  Campus Certified
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {selectedBusDetails.conditionNotes || 'Regular maintenance inspection completed. Mechanical and safety systems certified.'}
              </p>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-xs mb-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Seating</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBusDetails.capacity} Seats
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Fuel / Power</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBusDetails.fuelType || 'Diesel'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Model Year</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedBusDetails.manufacturingYear || 2024}
                </p>
              </div>
            </div>

            {/* Features & Equipment Badges */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Safety & Rider Comfort Amenities
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

            {/* Compliance Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Last Serviced:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBusDetails.lastServiceDate || 'Recent'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fitness & Safety Cert:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Valid & Verified</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBusDetails(null)}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
