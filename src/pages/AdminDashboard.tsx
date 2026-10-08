import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/Logo';
import { LeafletMap } from '../components/LeafletMap';
import { CsvDataReportDebugger } from '../components/CsvDataReportDebugger';
import { VehicleGpsTracker } from '../components/VehicleGpsTracker';
import { Bus, Route, Stop, User, FeedbackItem, Announcement } from '../types';
import {
  Gauge,
  Bus as BusIcon,
  MapPin,
  Users,
  Compass,
  Megaphone,
  MessageSquareWarning,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Download,
  Search,
  Filter,
  Radio,
  Sliders,
  Check,
  ChevronRight,
  TrendingUp,
  School,
  Fuel,
  Zap,
  Wrench,
  ShieldCheck,
  Eye,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab, onTabChange }) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const { busLocations, activeTrips, refreshAllData, collegeName, updateCollegeName } = useLive();
  const { openStudio, accentPreset, templatePreset, logoPreset, brandName } = useTheme();

  // College Name state
  const [collegeNameInput, setCollegeNameInput] = useState<string>(collegeName || '');
  const [savingCollegeName, setSavingCollegeName] = useState<boolean>(false);

  useEffect(() => {
    if (collegeName) {
      setCollegeNameInput(collegeName);
    }
  }, [collegeName]);

  // Stats & Analytics State
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Fleet state
  const [buses, setBuses] = useState<Bus[]>([]);
  const [showAddBusModal, setShowAddBusModal] = useState<boolean>(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [busDetailModal, setBusDetailModal] = useState<Bus | null>(null);
  const [busForm, setBusForm] = useState({
    plateNumber: '',
    busNumber: '',
    capacity: 45,
    model: '',
    manufacturingYear: 2024,
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    condition: 'excellent' as 'excellent' | 'good' | 'fair' | 'needs_service',
    conditionNotes: '',
    engineNumber: '',
    chassisNumber: '',
    fuelType: 'Diesel' as 'Electric' | 'CNG' | 'Diesel' | 'Hybrid',
    fuelLevelPercent: 85,
    mileageKm: 25000,
    lastServiceDate: '',
    nextServiceDue: '',
    features: ['Air Conditioned', 'CCTV Monitored', 'First Aid Kit'],
    insuranceExpiry: '',
    fitnessCertExpiry: '',
    currentRouteId: '',
    currentDriverId: '',
  });

  // Routes & Stops state
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [stopSearch, setStopSearch] = useState<string>('');
  const [showAddRouteModal, setShowAddRouteModal] = useState<boolean>(false);
  const [showAddStopModal, setShowAddStopModal] = useState<boolean>(false);
  const [mapPickCoords, setMapPickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickModeActive, setPickModeActive] = useState<boolean>(false);

  const [stopForm, setStopForm] = useState({
    name: '',
    code: '',
    latitude: 8.7139,
    longitude: 77.7567,
    landmark: '',
    address: '',
  });

  const [routeForm, setRouteForm] = useState({
    name: '',
    routeNumber: '',
    color: '#F59E0B',
    description: '',
    estimatedDurationMinutes: 30,
    morningStartTime: '08:00 AM',
    eveningStartTime: '05:00 PM',
    selectedStopIds: [] as string[],
  });

  // Users & Driver Approvals state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAddAnnounceModal, setShowAddAnnounceModal] = useState<boolean>(false);
  const [announceForm, setAnnounceForm] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'urgent' | 'info',
    targetType: 'all' as 'all' | 'route' | 'bus',
    targetId: '',
  });

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string>('');

  // Tactical Map Selection
  const [inspectedBus, setInspectedBus] = useState<Bus | null>(null);

  // Fetch Stats
  const fetchStats = async () => {
    if (!token) return;
    try {
      setLoadingStats(true);
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Fleet & Routes
  const fetchFleetData = async () => {
    try {
      const [bRes, rRes, sRes] = await Promise.all([
        fetch('/api/buses'),
        fetch('/api/routes'),
        fetch('/api/stops'),
      ]);
      if (bRes.ok) {
        const b = await bRes.json();
        setBuses(b.buses || []);
      }
      if (rRes.ok) {
        const r = await rRes.json();
        setRoutes(r.routes || []);
      }
      if (sRes.ok) {
        const s = await sRes.json();
        setStops(s.stops || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    if (!token) return;
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams();
      if (userRoleFilter) params.append('role', userRoleFilter);
      if (userStatusFilter) params.append('status', userStatusFilter);
      if (userSearch) params.append('search', userSearch);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Feedback
  const fetchFeedback = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/feedback', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data.feedback || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchFleetData();
    fetchAnnouncements();
    fetchFeedback();
    fetchUsers();
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [userRoleFilter, userStatusFilter, userSearch]);

  // Toggle Demo Mode Simulator
  const handleToggleSimulator = async () => {
    if (!token) return;
    const nextState = !stats?.metrics?.demoMode;
    try {
      const res = await fetch('/api/admin/simulator/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        showToast(`Simulator Demo Mode ${nextState ? 'Activated' : 'Paused'}`, 'success');
        fetchStats();
      }
    } catch {
      showToast('Failed to toggle simulator', 'error');
    }
  };

  // Reset Database to Seed
  const handleResetDatabase = async () => {
    if (!confirm('Reset entire system database to initial seeded sample data?')) return;
    try {
      const res = await fetch('/api/admin/simulator/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('System database reset to initial seeded state!', 'info');
        fetchStats();
        fetchFleetData();
        fetchUsers();
        refreshAllData();
      }
    } catch {
      showToast('Failed to reset database', 'error');
    }
  };

  // User status update (approve/reject/activate/deactivate)
  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`User status set to ${newStatus}`, 'success');
        fetchUsers();
        fetchStats();
      } else {
        showToast(data.error || 'Failed to update user', 'error');
      }
    } catch {
      showToast('Network error updating user', 'error');
    }
  };

  // College Name CRUD
  const handleSaveCollegeName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!collegeNameInput.trim()) {
      showToast('College name cannot be blank', 'error');
      return;
    }
    setSavingCollegeName(true);
    const success = await updateCollegeName(collegeNameInput.trim());
    setSavingCollegeName(false);
    if (success) {
      showToast('College and campus institution name updated!', 'success');
    }
  };

  // Bus CRUD
  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBus ? `/api/buses/${editingBus.id}` : '/api/buses';
      const method = editingBus ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(busForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(editingBus ? 'Vehicle details and condition updated' : 'New bus registered to fleet', 'success');
        setShowAddBusModal(false);
        setEditingBus(null);
        setBusForm({
          plateNumber: '',
          busNumber: '',
          capacity: 45,
          model: '',
          manufacturingYear: 2024,
          status: 'active',
          condition: 'excellent',
          conditionNotes: '',
          engineNumber: '',
          chassisNumber: '',
          fuelType: 'Diesel',
          fuelLevelPercent: 85,
          mileageKm: 25000,
          lastServiceDate: '',
          nextServiceDue: '',
          features: ['Air Conditioned', 'CCTV Monitored', 'First Aid Kit'],
          insuranceExpiry: '',
          fitnessCertExpiry: '',
          currentRouteId: '',
          currentDriverId: '',
        });
        fetchFleetData();
        fetchStats();
        refreshAllData();
      } else {
        showToast(data.error || 'Failed to save bus', 'error');
      }
    } catch {
      showToast('Network error saving bus', 'error');
    }
  };

  const handleDeleteBus = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bus from the fleet?')) return;
    try {
      const res = await fetch(`/api/buses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Bus removed from fleet', 'info');
        fetchFleetData();
        fetchStats();
        refreshAllData();
      }
    } catch {
      showToast('Failed to delete bus', 'error');
    }
  };

  // Stop Map Pin Pick Handler
  const handleMapPinSelected = (lat: number, lng: number) => {
    setMapPickCoords({ lat, lng });
    setStopForm(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
    }));
    setShowAddStopModal(true);
    setPickModeActive(false);
    showToast(`Pinned coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info');
  };

  // Save Stop (Create & Update)
  const handleSaveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStop ? `/api/stops/${editingStop.id}` : '/api/stops';
      const method = editingStop ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(stopForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingStop ? 'Bus stop updated successfully!' : 'Bus stop created successfully!', 'success');
        setShowAddStopModal(false);
        setEditingStop(null);
        setMapPickCoords(null);
        setStopForm({
          name: '',
          code: '',
          latitude: 8.7139,
          longitude: 77.7567,
          landmark: '',
          address: '',
        });
        fetchFleetData();
        refreshAllData();
      } else {
        showToast(data.error || 'Failed to save stop', 'error');
      }
    } catch {
      showToast('Error saving stop', 'error');
    }
  };

  const handleDeleteStop = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bus stop? This may affect routes that stop here.')) return;
    try {
      const res = await fetch(`/api/stops/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Bus stop deleted successfully', 'info');
        fetchFleetData();
        refreshAllData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete stop', 'error');
      }
    } catch {
      showToast('Network error deleting stop', 'error');
    }
  };

  // Save / Update Route
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const stopsPayload = routeForm.selectedStopIds.map((stopId, idx) => ({
        stopId,
        scheduledMinutesFromStart: idx * 7,
      }));

      const url = editingRoute ? `/api/routes/${editingRoute.id}` : '/api/routes';
      const method = editingRoute ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...routeForm,
          stops: stopsPayload,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(editingRoute ? 'Route updated and customized successfully!' : 'Route created successfully!', 'success');
        setShowAddRouteModal(false);
        setEditingRoute(null);
        setRouteForm({
          name: '',
          routeNumber: '',
          color: '#F59E0B',
          description: '',
          estimatedDurationMinutes: 30,
          morningStartTime: '08:00 AM',
          eveningStartTime: '05:00 PM',
          selectedStopIds: [],
        });
        fetchFleetData();
        fetchStats();
        refreshAllData();
      } else {
        showToast(data.error || 'Failed to save route', 'error');
      }
    } catch {
      showToast('Error saving route', 'error');
    }
  };

  // Delete Route
  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Are you sure you want to remove this transit route?')) return;
    try {
      const res = await fetch(`/api/routes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Route removed', 'info');
        fetchFleetData();
        fetchStats();
        refreshAllData();
      }
    } catch {
      showToast('Failed to delete route', 'error');
    }
  };

  // Announcements CRUD
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(announceForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Announcement broadcast dispatched to campus!', 'success');
        setShowAddAnnounceModal(false);
        setAnnounceForm({
          title: '',
          content: '',
          priority: 'normal',
          targetType: 'all',
          targetId: '',
        });
        fetchAnnouncements();
      } else {
        showToast(data.error || 'Failed to publish announcement', 'error');
      }
    } catch {
      showToast('Network error publishing announcement', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Announcement deleted', 'info');
        fetchAnnouncements();
      }
    } catch {
      showToast('Failed to delete announcement', 'error');
    }
  };

  // Resolve Feedback
  const handleResolveFeedback = async (id: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resolutionNotes: resolutionNote }),
      });
      if (res.ok) {
        showToast('Feedback ticket resolved and archived', 'success');
        setResolvingId(null);
        setResolutionNote('');
        fetchFeedback();
        fetchStats();
      }
    } catch {
      showToast('Failed to resolve feedback', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Command Dispatch Center
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
              Admin HQ
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Director: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.name}</span> · Fleet Monitoring & Dispatch Control
          </p>
        </div>

        {/* Global Controls: Simulator Toggle & Reset DB */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              stats?.metrics?.demoMode
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Toggle automatic GPS simulation for testing"
          >
            <Radio className={`w-3.5 h-3.5 ${stats?.metrics?.demoMode ? 'animate-pulse' : ''}`} />
            <span>Simulator Demo: {stats?.metrics?.demoMode ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleResetDatabase}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 transition-colors shadow-sm"
            title="Reset to default seed data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Sample Data</span>
          </button>
        </div>
      </div>

      {/* Admin Authorization Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Changes handled only by Admin:</strong> Full administrative authorization active. You have exclusive permissions to create, edit, or delete buses, Tirunelveli stops, and routes.
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono">
          Admin Verified
        </span>
      </div>

      {/* VIEW: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* College Name & Campus Institution Identity Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <School className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Campus Institution Identity
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Live Synced
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {collegeName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Broadcasted across student bus tracker, driver navigation tablets, and campus alerts
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCollegeName} className="flex items-center gap-2 sm:self-auto">
              <div className="relative">
                <input
                  type="text"
                  value={collegeNameInput}
                  onChange={e => setCollegeNameInput(e.target.value)}
                  placeholder="Enter College / University Name..."
                  className="w-64 sm:w-80 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:border-amber-500 shadow-sm text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={savingCollegeName || collegeNameInput === collegeName}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  collegeNameInput !== collegeName && collegeNameInput.trim().length > 0
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{savingCollegeName ? 'Saving...' : 'Update Name'}</span>
              </button>
            </form>
          </div>

          {/* Fleet Vehicle Condition & Readiness Overview */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Fleet Vehicle Condition & Maintenance Readiness</span>
                </h3>
                <p className="text-xs text-slate-500">Real-time condition breakdown of all campus shuttle buses</p>
              </div>
              <button
                onClick={() => onTabChange('fleet')}
                className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Manage Fleet & Condition Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Excellent</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                  {buses.filter(b => b.condition === 'excellent').length} <span className="text-xs font-normal text-emerald-600">buses</span>
                </div>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">Top tier · 100% operational</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-teal-700 dark:text-teal-400">Good</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                </div>
                <div className="text-xl font-black text-teal-900 dark:text-teal-200 mt-1">
                  {buses.filter(b => b.condition === 'good' || !b.condition).length} <span className="text-xs font-normal text-teal-600">buses</span>
                </div>
                <p className="text-[10px] text-teal-700/80 dark:text-teal-400/80 mt-1">Fully roadworthy & certified</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">Fair</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </div>
                <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1">
                  {buses.filter(b => b.condition === 'fair').length} <span className="text-xs font-normal text-amber-600">buses</span>
                </div>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1">Minor wear · Routine check</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400">Needs Service</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                </div>
                <div className="text-xl font-black text-rose-900 dark:text-rose-200 mt-1">
                  {buses.filter(b => b.condition === 'needs_service').length} <span className="text-xs font-normal text-rose-600">buses</span>
                </div>
                <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-1">Maintenance overhaul needed</p>
              </div>
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Buses</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {stats?.metrics?.activeBuses ?? '--'}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {stats?.metrics?.totalBuses ?? 4}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
              <div className="text-2xl font-black text-amber-500 mt-1">
                {stats?.metrics?.totalStudents ?? '--'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drivers</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {stats?.metrics?.totalDrivers ?? '--'}
                {stats?.metrics?.pendingDrivers > 0 && (
                  <span className="text-xs font-bold text-rose-500 ml-1">({stats.metrics.pendingDrivers} req)</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campus Routes</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {stats?.metrics?.totalRoutes ?? '--'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On-Time Score</span>
              <div className="text-2xl font-black text-emerald-500 mt-1">
                {stats?.metrics?.onTimePercentage ?? 94}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Issues</span>
              <div className="text-2xl font-black text-rose-500 mt-1">
                {stats?.metrics?.pendingFeedback ?? 0}
              </div>
            </div>
          </div>

          {/* Analytics Charts & Operational Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart: Trips per Day */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Campus Transit Volume (Last 7 Days)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total shuttle trips completed across corridors</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12% this week</span>
                </div>
              </div>

              {/* Bar Chart Representation */}
              <div className="h-52 flex items-end gap-3 sm:gap-6 pt-6">
                {stats?.charts?.days?.map((day: string, idx: number) => {
                  const val = stats.charts.tripsPerDay[idx] || 15;
                  const heightPercent = Math.min(100, Math.round((val / 30) * 100));

                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-amber-500 transition-colors">
                        {val}
                      </span>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden h-full flex items-end">
                        <div
                          className="w-full bg-amber-500 rounded-t-xl group-hover:bg-amber-400 transition-all duration-300"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delay Cause Breakdown */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  Delay Incident Analysis
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Primary factors causing shuttle arrival variance</p>

                <div className="space-y-4">
                  {stats?.charts?.delayReasons?.map((item: any) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{item.count} incidents</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${item.count * 15}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Fleet Reliability Status:</span>
                <span className="font-bold text-emerald-500">Grade A (Optimal)</span>
              </div>
            </div>
          </div>

          {/* Quick Active Fleet Snapshot Map */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Shuttles Moving on Route</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live positions updated continuously from telemetry feed</p>
              </div>
              <button
                onClick={() => onTabChange('map_tactical')}
                className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
              >
                <span>Open Tactical Radar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <LeafletMap
              buses={buses}
              routes={routes}
              stops={stops}
              locations={busLocations}
              className="h-[380px] w-full"
            />
          </div>
        </div>
      )}

      {/* VIEW: FLEET MANAGEMENT */}
      {activeTab === 'fleet' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fleet Vehicles Management</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Register, configure, and assign campus transport buses</p>
            </div>
            <button
              onClick={() => {
                setEditingBus(null);
                setBusForm({
                  plateNumber: '',
                  busNumber: '',
                  capacity: 45,
                  model: '',
                  manufacturingYear: 2024,
                  status: 'active',
                  condition: 'excellent',
                  conditionNotes: '',
                  engineNumber: '',
                  chassisNumber: '',
                  fuelType: 'Diesel',
                  fuelLevelPercent: 85,
                  mileageKm: 25000,
                  lastServiceDate: '',
                  nextServiceDue: '',
                  features: ['Air Conditioned', 'CCTV Monitored', 'First Aid Kit'],
                  insuranceExpiry: '',
                  fitnessCertExpiry: '',
                  currentRouteId: '',
                  currentDriverId: '',
                });
                setShowAddBusModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Bus / Callout</th>
                  <th className="px-4 py-3">Plate & Model</th>
                  <th className="px-4 py-3">Vehicle Condition</th>
                  <th className="px-4 py-3">Health & Fuel</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Assigned Route</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {buses.map(b => {
                  const assignedRoute = routes.find(r => r.id === b.currentRouteId);
                  const isExcellent = b.condition === 'excellent';
                  const isGood = b.condition === 'good' || !b.condition;
                  const isFair = b.condition === 'fair';
                  const isNeedsService = b.condition === 'needs_service';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <BusIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{b.busNumber}</span>
                        </div>
                        {b.conditionNotes && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5" title={b.conditionNotes}>
                            {b.conditionNotes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 block">
                          {b.plateNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[150px] block">
                          {b.model} {b.manufacturingYear ? `(${b.manufacturingYear})` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                          isExcellent
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : isGood
                            ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                            : isFair
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isExcellent ? 'bg-emerald-500' : isGood ? 'bg-teal-500' : isFair ? 'bg-amber-500' : 'bg-rose-500 animate-ping'
                          }`} />
                          {b.condition ? b.condition.replace('_', ' ') : 'good'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {b.fuelType || 'Diesel'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {b.fuelLevelPercent !== undefined ? `${b.fuelLevelPercent}%` : '80%'}
                          </span>
                        </div>
                        <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              (b.fuelLevelPercent ?? 80) < 30 ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${b.fuelLevelPercent ?? 80}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {b.mileageKm ? `${b.mileageKm.toLocaleString()} km` : '25,000 km'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200">
                        {b.capacity} seats
                        {b.features?.includes('Air Conditioned') && (
                          <span className="ml-1 text-[10px] text-sky-500 font-bold">· AC</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {assignedRoute ? (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {assignedRoute.routeNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : b.status === 'maintenance'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setBusDetailModal(b)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Vehicle Specs & Condition Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingBus(b);
                              setBusForm({
                                plateNumber: b.plateNumber,
                                busNumber: b.busNumber,
                                capacity: b.capacity,
                                model: b.model || '',
                                manufacturingYear: b.manufacturingYear || 2024,
                                status: b.status,
                                condition: b.condition || 'good',
                                conditionNotes: b.conditionNotes || '',
                                engineNumber: b.engineNumber || '',
                                chassisNumber: b.chassisNumber || '',
                                fuelType: b.fuelType || 'Diesel',
                                fuelLevelPercent: b.fuelLevelPercent !== undefined ? b.fuelLevelPercent : 80,
                                mileageKm: b.mileageKm !== undefined ? b.mileageKm : 25000,
                                lastServiceDate: b.lastServiceDate || '',
                                nextServiceDue: b.nextServiceDue || '',
                                features: b.features || ['Air Conditioned', 'First Aid Kit'],
                                insuranceExpiry: b.insuranceExpiry || '',
                                fitnessCertExpiry: b.fitnessCertExpiry || '',
                                currentRouteId: b.currentRouteId || '',
                                currentDriverId: b.currentDriverId || '',
                              });
                              setShowAddBusModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Vehicle & Condition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBus(b.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Bus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: ROUTES & STOPS PICKER */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Interactive Route & Stop Architect
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click anywhere on the map to place a new designated stop or build a multi-stop campus corridor
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPickModeActive(prev => !prev);
                    if (!pickModeActive) {
                      showToast('Map pick mode enabled: Click any location on the map below!', 'info');
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    pickModeActive
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>{pickModeActive ? 'Cancel Pinning' : 'Click Map to Add Stop'}</span>
                </button>

                <button
                  onClick={() => {
                    setEditingStop(null);
                    setStopForm({
                      name: '',
                      code: '',
                      latitude: 8.7139,
                      longitude: 77.7567,
                      landmark: '',
                      address: '',
                    });
                    setShowAddStopModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 flex items-center gap-1.5 border border-slate-700"
                >
                  <Plus className="w-4 h-4 text-amber-500" />
                  <span>Add Bus Stop</span>
                </button>

                <button
                  onClick={() => setShowAddRouteModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Route</span>
                </button>
              </div>
            </div>

            {/* Interactive Map with Picker */}
            <div className="mb-6">
              <LeafletMap
                buses={buses}
                routes={routes}
                stops={stops}
                locations={busLocations}
                interactivePickMode={pickModeActive}
                onMapClick={handleMapPinSelected}
                tempMarker={mapPickCoords ? { lat: mapPickCoords.lat, lng: mapPickCoords.lng } : null}
                className="h-[420px] w-full"
              />
            </div>

            {/* Existing Routes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {routes.map(r => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded text-slate-950" style={{ backgroundColor: r.color || '#F59E0B' }}>
                        {r.routeNumber}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoute(r);
                            setRouteForm({
                              name: r.name,
                              routeNumber: r.routeNumber,
                              color: r.color || '#F59E0B',
                              description: r.description || '',
                              estimatedDurationMinutes: r.estimatedDurationMinutes || 30,
                              morningStartTime: r.morningStartTime || '08:00 AM',
                              eveningStartTime: r.eveningStartTime || '05:00 PM',
                              selectedStopIds: (r.stops || []).map(s => s.id),
                            });
                            setShowAddRouteModal(true);
                          }}
                          className="text-slate-400 hover:text-amber-500 p-1 rounded-lg hover:bg-amber-500/10 transition-colors"
                          title="Customize Route & Stops"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoute(r.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Route"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{r.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">{r.description}</p>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-2">
                      Stops: {r.stops?.length || 0} designated checkpoints
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Morning: {r.morningStartTime}</span>
                    <span>Duration: {r.estimatedDurationMinutes}m</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Campus Bus Stops Directory & Editor */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <span>Designated Campus Bus Stops ({stops.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add, edit coordinates, rename, or adjust stop landmarks across campus routes
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search stop name or code..."
                      value={stopSearch}
                      onChange={e => setStopSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none w-48 sm:w-64 text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setEditingStop(null);
                      setStopForm({
                        name: '',
                        code: '',
                        latitude: 12.9800,
                        longitude: 77.6050,
                        landmark: '',
                        address: '',
                      });
                      setShowAddStopModal(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Stop</span>
                  </button>
                </div>
              </div>

              {/* Stops Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2.5 rounded-l-xl">Stop Name & Code</th>
                      <th className="px-3 py-2.5">Landmark & Address</th>
                      <th className="px-3 py-2.5">GPS Coordinates</th>
                      <th className="px-3 py-2.5">Linked Routes</th>
                      <th className="px-3 py-2.5 rounded-r-xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stops
                      .filter(s =>
                        !stopSearch ||
                        s.name.toLowerCase().includes(stopSearch.toLowerCase()) ||
                        s.code.toLowerCase().includes(stopSearch.toLowerCase()) ||
                        (s.landmark && s.landmark.toLowerCase().includes(stopSearch.toLowerCase()))
                      )
                      .map((s, idx) => {
                        const linkedRoutes = routes.filter(r => r.stops?.some(rs => rs.id === s.id || (rs as any).stopId === s.id));
                        return (
                          <tr key={`${s.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 py-2.5">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {s.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-block mt-0.5">
                                {s.code}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-[200px]">
                              {s.landmark && <div className="font-medium text-slate-700 dark:text-slate-300">📍 {s.landmark}</div>}
                              {s.address && <div className="text-[10px] text-slate-400 truncate">{s.address}</div>}
                              {!s.landmark && !s.address && <span className="text-slate-400">Campus perimeter</span>}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">
                              {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                            </td>
                            <td className="px-3 py-2.5">
                              {linkedRoutes.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {linkedRoutes.map(lr => (
                                    <span key={lr.id} className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-950" style={{ backgroundColor: lr.color || '#F59E0B' }}>
                                      {lr.routeNumber}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Unlinked</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingStop(s);
                                    setStopForm({
                                      name: s.name,
                                      code: s.code,
                                      latitude: s.latitude,
                                      longitude: s.longitude,
                                      landmark: s.landmark || '',
                                      address: s.address || '',
                                    });
                                    setShowAddStopModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold text-[11px] transition-colors flex items-center gap-1"
                                  title="Edit / Change Stop Details"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit Stop</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteStop(s.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Delete Stop"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: USER MANAGEMENT & DRIVER APPROVALS */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Accounts & Driver Approvals
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify pending driver registrations and manage access rights
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name / ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="">All Roles</option>
                <option value="driver">Drivers Only</option>
                <option value="student">Students Only</option>
                <option value="admin">Admins Only</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={e => setUserStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="">All Statuses</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">User Name</th>
                  <th className="px-4 py-3">College ID</th>
                  <th className="px-4 py-3">Institutional Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {u.collegeId}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-700 dark:text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : u.status === 'pending_approval'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}>
                        {u.status === 'pending_approval' ? 'Pending Approval' : u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role === 'driver' && u.status === 'pending_approval' && (
                          <button
                            onClick={() => handleUpdateUserStatus(u.id, 'active')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve Driver</span>
                          </button>
                        )}

                        {u.status === 'active' && u.role !== 'admin' && (
                          <button
                            onClick={() => handleUpdateUserStatus(u.id, 'inactive')}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs"
                          >
                            Deactivate
                          </button>
                        )}

                        {u.status === 'inactive' && (
                          <button
                            onClick={() => handleUpdateUserStatus(u.id, 'active')}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 text-xs"
                          >
                            Re-activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: TACTICAL FLEET RADAR MAP */}
      {activeTab === 'map_tactical' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Live Tactical Monitoring Radar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continuous satellite and GPS vehicle tracking with speed telemetry
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-500">
              {buses.filter(b => b.status === 'active').length} active transponders
            </div>
          </div>

          <LeafletMap
            buses={buses}
            routes={routes}
            stops={stops}
            locations={busLocations}
            className="h-[560px] w-full"
            onBusSelect={bus => setInspectedBus(bus)}
          />

          {inspectedBus && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Inspecting Vehicle</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {inspectedBus.busNumber} ({inspectedBus.plateNumber})
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Speed: {busLocations[inspectedBus.id]?.speed ? `${Math.round(busLocations[inspectedBus.id].speed)} km/h` : '0 km/h'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Campus Broadcast System</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dispatch instant notifications to all students, specific routes, or buses</p>
            </div>
            <button
              onClick={() => setShowAddAnnounceModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Announcement</span>
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((ann, idx) => (
              <div
                key={`${ann.id}-${idx}`}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{ann.title}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      ann.priority === 'urgent' ? 'bg-rose-100 dark:bg-rose-950 text-rose-600' : 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                    }`}>
                      {ann.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">{ann.content}</p>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Target: <b className="capitalize text-slate-700 dark:text-slate-300">{ann.targetType}</b> · Posted by {ann.createdByName} · {new Date(ann.createdAt).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: FEEDBACK & RESOLUTION */}
      {activeTab === 'feedback' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Student Incident Reports & Feedback</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Review reported issues regarding delay, cleanliness, lost items, and driver conduct</p>
          </div>

          <div className="space-y-3">
            {feedbackList.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="text-amber-500 font-bold">★ {item.rating}/5</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    item.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 mb-2">{item.message}</p>
                <div className="text-[10px] text-slate-400 mb-3">
                  Reported by: <b>{item.userName}</b> ({item.userEmail}) · {new Date(item.createdAt).toLocaleDateString()}
                </div>

                {item.status === 'pending' ? (
                  resolvingId === item.id ? (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <input
                        type="text"
                        placeholder="Resolution notes (e.g. Schedule recalibrated / Driver briefed)..."
                        value={resolutionNote}
                        onChange={e => setResolutionNote(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveFeedback(item.id)}
                          className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500"
                        >
                          Confirm Resolved
                        </button>
                        <button
                          onClick={() => setResolvingId(null)}
                          className="px-3 py-1 border border-slate-300 dark:border-slate-700 text-slate-500 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingId(item.id)}
                      className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400"
                    >
                      Resolve Ticket
                    </button>
                  )
                ) : (
                  item.resolutionNotes && (
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-[11px]">
                      <b>Resolution:</b> {item.resolutionNotes}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: DATA REPORTS & CSV EXPORT */}
      {activeTab === 'reports' && (
        <CsvDataReportDebugger />
      )}

      {/* VIEW: ADMIN SETTINGS & PROFILE */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Clearance & Institutional Identity</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Institutional control profile (Master Access)</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-extrabold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full Clearance</span>
            </span>
          </div>

          <div className="space-y-3 max-w-md text-xs">
            <div>
              <span className="font-bold text-slate-500 block mb-1">Administrator Role</span>
              <p className="font-bold text-slate-900 dark:text-white">{user?.name || 'Authorized Institutional Administrator'}</p>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">Administrator Clearance</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Direct Admin Access (No Password Required)</span>
                </span>
              </div>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">College ID</span>
              <p className="font-mono text-amber-500 font-bold">{user?.collegeId || 'TEC-ADMIN-HQ'}</p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              Institutional Master Clearance: Route network management, fleet controls, and safety oversight.
            </div>
          </div>

          {/* Transit Branding, Logo & Template Architecture */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: accentPreset.colorHex }} />
                  <span>Branding, Logo Emblem & Layout Template Architecture</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure visual identity, color scheme, active vector emblem, and dashboard structure
                </p>
              </div>

              <button
                type="button"
                onClick={openStudio}
                className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0"
                style={{ backgroundColor: accentPreset.colorHex }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Theme & Template Studio</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Active Logo & Moniker</span>
                <div className="flex items-center gap-2">
                  <Logo size="sm" variant="full" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Style: {logoPreset.name}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Active Theme Palette</span>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full shadow-xs border border-white/20" style={{ backgroundColor: accentPreset.colorHex }} />
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{accentPreset.name}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">{accentPreset.tagline}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Layout Architecture</span>
                <div className="font-bold text-xs text-slate-900 dark:text-white">{templatePreset.name}</div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{templatePreset.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BUS & VEHICLE CONDITION */}
      {showAddBusModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BusIcon className="w-5 h-5 text-amber-500" />
                  <span>{editingBus ? 'Edit Fleet Vehicle & Condition' : 'Register New Fleet Vehicle'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update technical specifications, physical condition report, and route assignment
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddBusModal(false);
                  setEditingBus(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBus} className="space-y-4 text-xs">
              {/* SECTION 1: IDENTITY */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  1. Identification & Baseline
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bus Name / Callout *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bus 12 (Yellow Arrow)"
                      value={busForm.busNumber}
                      onChange={e => setBusForm(prev => ({ ...prev, busNumber: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      License Plate Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={busForm.plateNumber}
                      onChange={e => setBusForm(prev => ({ ...prev, plateNumber: e.target.value }))}
                      placeholder="KA-01-F-4021"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none uppercase font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Make & Model
                    </label>
                    <input
                      type="text"
                      value={busForm.model}
                      onChange={e => setBusForm(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Tata Starbus Ultra"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Manufacturing Year
                    </label>
                    <input
                      type="number"
                      value={busForm.manufacturingYear}
                      onChange={e => setBusForm(prev => ({ ...prev, manufacturingYear: parseInt(e.target.value, 10) || 2024 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Passenger Capacity (Seats) *
                    </label>
                    <input
                      type="number"
                      required
                      value={busForm.capacity}
                      onChange={e => setBusForm(prev => ({ ...prev, capacity: parseInt(e.target.value, 10) || 40 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: BUS CONDITION & INSPECTION */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>2. Vehicle Condition & Technical Health</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Current Bus Condition Rating *
                    </label>
                    <select
                      value={busForm.condition}
                      onChange={e => setBusForm(prev => ({ ...prev, condition: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                    >
                      <option value="excellent">🟢 Excellent (Showroom Quality · Optimal)</option>
                      <option value="good">🟢 Good (Fully Roadworthy · Certified)</option>
                      <option value="fair">🟡 Fair (Minor Wear · Routine Servicing Due)</option>
                      <option value="needs_service">🔴 Needs Service (Urgent Maintenance / Repair)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Fleet Operational Status *
                    </label>
                    <select
                      value={busForm.status}
                      onChange={e => setBusForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                    >
                      <option value="active">Active (On Campus Duty)</option>
                      <option value="maintenance">Maintenance (In Workshop)</option>
                      <option value="inactive">Inactive (Standby Reserve)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Condition Notes & Inspection Report
                  </label>
                  <textarea
                    rows={2}
                    value={busForm.conditionNotes}
                    onChange={e => setBusForm(prev => ({ ...prev, conditionNotes: e.target.value }))}
                    placeholder="e.g. Tyres in excellent tread depth, climate AC unit serviced, brakes tested at 100% efficiency."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* SECTION 3: FUEL, MILEAGE & ENGINE DETAILS */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  3. Fuel, Mileage & Engineering Numbers
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Fuel / Powertrain Type
                    </label>
                    <select
                      value={busForm.fuelType}
                      onChange={e => setBusForm(prev => ({ ...prev, fuelType: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG (Clean Gas)</option>
                      <option value="Electric">Electric (Zero Emission)</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Fuel / Battery Level (%): {busForm.fuelLevelPercent}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={busForm.fuelLevelPercent}
                      onChange={e => setBusForm(prev => ({ ...prev, fuelLevelPercent: parseInt(e.target.value, 10) }))}
                      className="w-full accent-amber-500 mt-2"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Odometer Mileage (km)
                    </label>
                    <input
                      type="number"
                      value={busForm.mileageKm}
                      onChange={e => setBusForm(prev => ({ ...prev, mileageKm: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Engine Number
                    </label>
                    <input
                      type="text"
                      value={busForm.engineNumber}
                      onChange={e => setBusForm(prev => ({ ...prev, engineNumber: e.target.value }))}
                      placeholder="e.g. TAT-CRDI-8921"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Chassis / VIN Number
                    </label>
                    <input
                      type="text"
                      value={busForm.chassisNumber}
                      onChange={e => setBusForm(prev => ({ ...prev, chassisNumber: e.target.value }))}
                      placeholder="e.g. MAT8912040182"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: SERVICE & COMPLIANCE DATES */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  4. Maintenance & Compliance Schedule
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Last Servicing Date
                    </label>
                    <input
                      type="date"
                      value={busForm.lastServiceDate}
                      onChange={e => setBusForm(prev => ({ ...prev, lastServiceDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Next Service Due Date
                    </label>
                    <input
                      type="date"
                      value={busForm.nextServiceDue}
                      onChange={e => setBusForm(prev => ({ ...prev, nextServiceDue: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Insurance Policy Expiry
                    </label>
                    <input
                      type="date"
                      value={busForm.insuranceExpiry}
                      onChange={e => setBusForm(prev => ({ ...prev, insuranceExpiry: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Fitness / Pollution Certificate Expiry
                    </label>
                    <input
                      type="date"
                      value={busForm.fitnessCertExpiry}
                      onChange={e => setBusForm(prev => ({ ...prev, fitnessCertExpiry: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: SAFETY & COMFORT FEATURES */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  5. Amenities & Safety Equipment
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Air Conditioned',
                    'CCTV Monitored',
                    'GPS Telemetry',
                    'First Aid Kit',
                    'Emergency SOS',
                    'Speed Governor',
                    'Wheelchair Ramp',
                  ].map(feat => {
                    const isChecked = busForm.features.includes(feat);
                    return (
                      <label key={feat} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setBusForm(prev => ({ ...prev, features: [...prev.features, feat] }));
                            } else {
                              setBusForm(prev => ({ ...prev, features: prev.features.filter(f => f !== feat) }));
                            }
                          }}
                          className="accent-amber-500 rounded"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{feat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 6: ASSIGNMENT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign to Route
                  </label>
                  <select
                    value={busForm.currentRouteId}
                    onChange={e => setBusForm(prev => ({ ...prev, currentRouteId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="">Unassigned</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.routeNumber} - {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Driver
                  </label>
                  <select
                    value={busForm.currentDriverId}
                    onChange={e => setBusForm(prev => ({ ...prev, currentDriverId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="">Unassigned</option>
                    {usersList
                      .filter(u => u.role === 'driver' && u.status === 'active')
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.collegeId})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBusModal(false);
                    setEditingBus(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-md transition-transform active:scale-95"
                >
                  {editingBus ? 'Update Vehicle & Condition' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BUS STOP */}
      {showAddStopModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>{editingStop ? 'Edit Campus Bus Stop' : 'Create Designated Bus Stop'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddStopModal(false);
                  setEditingStop(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {editingStop
                ? `Update coordinates, code, and details for ${editingStop.name}`
                : 'Add this stop checkpoint to the campus transport network'}
            </p>

            <form onSubmit={handleSaveStop} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Stop Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Library Gate"
                  value={stopForm.name}
                  onChange={e => setStopForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Stop Code</label>
                  <input
                    type="text"
                    placeholder="SLG-01"
                    value={stopForm.code}
                    onChange={e => setStopForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Prominent Landmark</label>
                  <input
                    type="text"
                    placeholder="Opposite fountain"
                    value={stopForm.landmark}
                    onChange={e => setStopForm(prev => ({ ...prev, landmark: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Street / Campus Address</label>
                <input
                  type="text"
                  placeholder="North Campus Blvd, Sector 4"
                  value={stopForm.address}
                  onChange={e => setStopForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={stopForm.latitude}
                    onChange={e => setStopForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={stopForm.longitude}
                    onChange={e => setStopForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStopModal(false);
                    setEditingStop(null);
                  }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                >
                  {editingStop ? 'Save Changes' : 'Create Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW BUS DETAILS & VEHICLE HEALTH INSPECTION */}
      {busDetailModal && (
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
                    {busDetailModal.busNumber}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                      {busDetailModal.plateNumber}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-xs text-slate-500">{busDetailModal.model}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setBusDetailModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Condition Banner */}
            <div className={`p-4 rounded-2xl border mb-4 ${
              busDetailModal.condition === 'excellent'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : busDetailModal.condition === 'good' || !busDetailModal.condition
                ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800/60 text-teal-900 dark:text-teal-200'
                : busDetailModal.condition === 'fair'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Condition: {busDetailModal.condition ? busDetailModal.condition.replace('_', ' ').toUpperCase() : 'GOOD'}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-white/70 dark:bg-slate-900/60">
                  Status: {busDetailModal.status}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {busDetailModal.conditionNotes || 'Regular maintenance inspection completed. Mechanical and electrical systems certified.'}
              </p>
            </div>

            {/* Live Vehicle GPS Transponder & Telemetry */}
            <div className="mb-4">
              <VehicleGpsTracker
                bus={busDetailModal}
                location={busLocations[busDetailModal.id]}
              />
            </div>

            {/* Technical Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Powertrain</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {busDetailModal.fuelType || 'Diesel'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Fuel / Battery</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {busDetailModal.fuelLevelPercent !== undefined ? `${busDetailModal.fuelLevelPercent}%` : '80%'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Odometer</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {busDetailModal.mileageKm ? `${busDetailModal.mileageKm.toLocaleString()} km` : '25,000 km'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Seating</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {busDetailModal.capacity} Seats
                </p>
              </div>
            </div>

            {/* Engineering & Compliance Numbers */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5 mb-4">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Vehicle Compliance & Engineering Record
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Engine Number:</span>{' '}
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {busDetailModal.engineNumber || 'TAT-CRDI-8921'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Chassis Number:</span>{' '}
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {busDetailModal.chassisNumber || 'MAT8912040182'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Last Serviced:</span>{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {busDetailModal.lastServiceDate || '2026-09-15'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Next Service Due:</span>{' '}
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {busDetailModal.nextServiceDue || '2026-11-20'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Insurance Valid Till:</span>{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {busDetailModal.insuranceExpiry || '2027-05-15'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Fitness Certificate:</span>{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {busDetailModal.fitnessCertExpiry || '2027-08-30'}
                  </span>
                </div>
              </div>
            </div>

            {/* Features & Equipment Badges */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Certified Safety & Comfort Features
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(busDetailModal.features || ['Air Conditioned', 'CCTV Monitored', 'First Aid Kit']).map(f => (
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

            {/* Action buttons */}
            <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setBusDetailModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = busDetailModal;
                  setBusDetailModal(null);
                  setEditingBus(b);
                  setBusForm({
                    plateNumber: b.plateNumber,
                    busNumber: b.busNumber,
                    capacity: b.capacity,
                    model: b.model || '',
                    manufacturingYear: b.manufacturingYear || 2024,
                    status: b.status,
                    condition: b.condition || 'good',
                    conditionNotes: b.conditionNotes || '',
                    engineNumber: b.engineNumber || '',
                    chassisNumber: b.chassisNumber || '',
                    fuelType: b.fuelType || 'Diesel',
                    fuelLevelPercent: b.fuelLevelPercent !== undefined ? b.fuelLevelPercent : 80,
                    mileageKm: b.mileageKm !== undefined ? b.mileageKm : 25000,
                    lastServiceDate: b.lastServiceDate || '',
                    nextServiceDue: b.nextServiceDue || '',
                    features: b.features || ['Air Conditioned', 'First Aid Kit'],
                    insuranceExpiry: b.insuranceExpiry || '',
                    fitnessCertExpiry: b.fitnessCertExpiry || '',
                    currentRouteId: b.currentRouteId || '',
                    currentDriverId: b.currentDriverId || '',
                  });
                  setShowAddBusModal(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Vehicle & Condition</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / CUSTOMIZE ROUTE & STOP SEQUENCE */}
      {showAddRouteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-xl w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-500" />
                  <span>{editingRoute ? 'Customize Route & Ordered Stops' : 'Create Campus Route Corridor'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingRoute
                    ? `Configuring stop sequence & timetable for ${editingRoute.name}`
                    : 'Assemble designated bus stops into an active transit line'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddRouteModal(false);
                  setEditingRoute(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Route Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Route 4: Thachanallur Express"
                    value={routeForm.name}
                    onChange={e => setRouteForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Route Number / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="R-04"
                    value={routeForm.routeNumber}
                    onChange={e => setRouteForm(prev => ({ ...prev, routeNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Morning Schedule</label>
                  <input
                    type="text"
                    value={routeForm.morningStartTime}
                    onChange={e => setRouteForm(prev => ({ ...prev, morningStartTime: e.target.value }))}
                    placeholder="07:45 AM"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Evening Schedule</label>
                  <input
                    type="text"
                    value={routeForm.eveningStartTime}
                    onChange={e => setRouteForm(prev => ({ ...prev, eveningStartTime: e.target.value }))}
                    placeholder="04:45 PM"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Estimated Duration (mins)</label>
                  <input
                    type="number"
                    value={routeForm.estimatedDurationMinutes}
                    onChange={e => setRouteForm(prev => ({ ...prev, estimatedDurationMinutes: parseInt(e.target.value, 10) || 30 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="block font-bold mb-1">Corridor Description</label>
                  <input
                    type="text"
                    placeholder="Transit path and key institutions served..."
                    value={routeForm.description}
                    onChange={e => setRouteForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Map Line Color</label>
                  <input
                    type="color"
                    value={routeForm.color}
                    onChange={e => setRouteForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-8.5 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              {/* CUSTOMIZE ORDERED STOPS IN SEQUENCE */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>Stop Sequence Order ({routeForm.selectedStopIds.length} stops in corridor)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Re-order stops in transit sequence</span>
                </div>

                {/* Ordered List of Selected Stops */}
                {routeForm.selectedStopIds.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/80">
                    {routeForm.selectedStopIds.map((stopId, idx) => {
                      const stop = stops.find(s => s.id === stopId);
                      if (!stop) return null;

                      return (
                        <div key={stopId} className="pt-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {stop.name}
                              </span>{' '}
                              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                ({stop.code})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Move Up */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                if (idx === 0) return;
                                const next = [...routeForm.selectedStopIds];
                                const temp = next[idx - 1];
                                next[idx - 1] = next[idx];
                                next[idx] = temp;
                                setRouteForm(prev => ({ ...prev, selectedStopIds: next }));
                              }}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-xs font-bold"
                              title="Move Stop Up"
                            >
                              ↑
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              disabled={idx === routeForm.selectedStopIds.length - 1}
                              onClick={() => {
                                if (idx === routeForm.selectedStopIds.length - 1) return;
                                const next = [...routeForm.selectedStopIds];
                                const temp = next[idx + 1];
                                next[idx + 1] = next[idx];
                                next[idx] = temp;
                                setRouteForm(prev => ({ ...prev, selectedStopIds: next }));
                              }}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-xs font-bold"
                              title="Move Stop Down"
                            >
                              ↓
                            </button>

                            {/* Remove */}
                            <button
                              type="button"
                              onClick={() => {
                                setRouteForm(prev => ({
                                  ...prev,
                                  selectedStopIds: prev.selectedStopIds.filter(id => id !== stopId),
                                }));
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                              title="Remove Stop from Corridor"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs italic">
                    No stops added yet. Select a bus stop below to add it to the sequence.
                  </div>
                )}

                {/* Add Stop to Sequence Dropdown */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center gap-2">
                  <select
                    id="add-stop-select"
                    defaultValue=""
                    onChange={e => {
                      if (!e.target.value) return;
                      const val = e.target.value;
                      if (!routeForm.selectedStopIds.includes(val)) {
                        setRouteForm(prev => ({
                          ...prev,
                          selectedStopIds: [...prev.selectedStopIds, val],
                        }));
                      }
                      e.target.value = '';
                    }}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold text-xs"
                  >
                    <option value="">+ Add Designated Stop to Sequence...</option>
                    {stops
                      .filter(s => !routeForm.selectedStopIds.includes(s.id))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) - {s.landmark || s.address || 'Tirunelveli'}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRouteModal(false);
                    setEditingRoute(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-md transition-transform active:scale-95"
                >
                  {editingRoute ? 'Save Customized Route' : 'Create Route Corridor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST ANNOUNCEMENT */}
      {showAddAnnounceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Dispatch Campus Announcement
            </h3>
            <p className="text-xs text-slate-500 mb-3">Broadcasts live notification to student inboxes & screens</p>

            <form onSubmit={handlePublishAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Alteration for Monsoon"
                  value={announceForm.title}
                  onChange={e => setAnnounceForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Priority</label>
                <select
                  value={announceForm.priority}
                  onChange={e => setAnnounceForm(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent Alert</option>
                  <option value="info">Informational</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed announcement text..."
                  value={announceForm.content}
                  onChange={e => setAnnounceForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddAnnounceModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                >
                  Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
