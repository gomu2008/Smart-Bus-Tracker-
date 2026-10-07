import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Edit3,
  PhoneCall,
  Radio,
  Navigation,
  Gauge,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Bus,
  MapPin,
  QrCode,
  Wrench,
  HeartPulse,
  Clock,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ChevronRight,
  Eye,
  Flame,
  Activity,
  Layers,
  ArrowRight,
  User,
  GraduationCap,
  Award,
  FileText,
  Share2,
  Loader2,
} from 'lucide-react';
import { useLive } from '../context/LiveContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';

export type PosterTemplate = 'expo-presentation' | 'campus-notice' | 'in-cabin-safety';
export type PosterTheme = 'campus-official' | 'high-vis-amber' | 'tactical-dark' | 'emergency-alert';

interface BusPreset {
  id: string;
  name: string;
  plate: string;
  model: string;
  routeNumber: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  facultyInCharge: string;
  capacity: number;
  tyrePressure: number; // PSI
  brakeLife: number; // %
  keyStops: string[];
}

const FLEET_PRESETS: BusPreset[] = [
  {
    id: 'bus_01',
    name: 'Bus 01 - Thamirabharani Express',
    plate: 'TN-72-AZ-2026',
    model: 'Tata Starbus Ultra EV 2024',
    routeNumber: 'Route 01',
    routeName: 'Tirunelveli Junction ➔ Palayamkottai ➔ TEC Campus',
    driverName: 'Rajesh Kumar',
    driverPhone: '+91 98421 99810',
    facultyInCharge: 'Dr. S. Karthikeyan (HOD, AI & DS)',
    capacity: 45,
    tyrePressure: 112,
    brakeLife: 95,
    keyStops: ['Tirunelveli Jn (07:30 AM)', 'Vannarpettai', 'Palayamkottai Bus Stand', 'Pettai Gate', 'TEC Campus (08:35 AM)'],
  },
  {
    id: 'bus_02',
    name: 'Bus 02 - Nellai Royal Blue',
    plate: 'TN-72-BY-4512',
    model: 'Ashok Leyland Falcon CNG 2023',
    routeNumber: 'Route 02',
    routeName: 'New Bus Stand ➔ High Ground ➔ TEC Campus',
    driverName: 'Anita Sharma',
    driverPhone: '+91 98421 77230',
    facultyInCharge: 'Prof. M. Anitha (CSE Dept)',
    capacity: 40,
    tyrePressure: 108,
    brakeLife: 88,
    keyStops: ['New Bus Stand (07:35 AM)', 'Perumalpuram', 'High Ground Colony', 'Sripuram', 'TEC Campus (08:40 AM)'],
  },
  {
    id: 'bus_03',
    name: 'Bus 03 - Palayamkottai Shuttle',
    plate: 'TN-72-CZ-7821',
    model: 'Eicher Skyline Pro Diesel 2024',
    routeNumber: 'Route 03',
    routeName: 'Sankarankovil ➔ Tenkasi Highway ➔ TEC Campus',
    driverName: 'Murugan Senthil',
    driverPhone: '+91 98421 12345',
    facultyInCharge: 'Prof. K. Ramesh (Mech Dept)',
    capacity: 50,
    tyrePressure: 110,
    brakeLife: 91,
    keyStops: ['Sankarankovil Main (07:15 AM)', 'Alangulam Jn', 'Tenkasi Cross', 'TEC Campus (08:30 AM)'],
  },
];

interface PosterCustomData {
  collegeName: string;
  collegeTagline: string;
  department: string;
  symposiumTitle: string;
  projectTitle: string;
  projectSubtitle: string;
  projectAuthors: string;
  guideName: string;
  problemStatement: string;
  controlRoomPhone: string;
  emergencyResponsePhone: string;
  securityPhone: string;
  tyreBreakdownHotline: string;
  ambulanceHotline: string;
  policeHotline: string;
  trackingPortalUrl: string;
  safetySlogan: string;
}

export const A3PosterStudio: React.FC = () => {
  const { collegeName: liveCollegeName } = useLive();
  const { accentPreset } = useTheme();

  // Selected preset & template
  const [selectedBusId, setSelectedBusId] = useState<string>('bus_01');
  const [template, setTemplate] = useState<PosterTemplate>('expo-presentation');
  const [themeStyle, setThemeStyle] = useState<PosterTheme>('campus-official');
  const [zoomLevel, setZoomLevel] = useState<number>(0.85); // 85% comfortable display
  const [showEditDrawer, setShowEditDrawer] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  // Cover image asset generated
  const coverImageSrc = '/src/assets/images/bus_safety_poster_cover_1791371301103.jpg';

  const currentBus = FLEET_PRESETS.find(b => b.id === selectedBusId) || FLEET_PRESETS[0];

  // Editable Content State
  const [posterData, setPosterData] = useState<PosterCustomData>({
    collegeName: liveCollegeName || 'THAMIRABHARANI ENGINEERING COLLEGE',
    collegeTagline: 'AUTONOMOUS  ·  AICTE APPROVED  ·  COLLEGE · LEARN · GROW',
    department: 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE',
    symposiumTitle: 'CAMPUS INNOVATION EXPO & SAFETY INITIATIVE 2026',
    projectTitle: 'SMART COLLEGE BUS TRACKER AND SAFETY MANAGEMENT SYSTEM',
    projectSubtitle: 'Real-Time GPS Tracking, AI Accident Detection, Tyre Burst Alerts & Preventive Fleet Maintenance',
    projectAuthors: 'Benjamin · Kathiravan · Transportation Safety Cell',
    guideName: 'Dr. S. Karthikeyan, Ph.D. (HOD - AI & DS)',
    problemStatement:
      'College commute poses significant challenges: unexpected delays, lack of live visibility for parents/students, risk of severe tyre bursts on highways, and critical delays during road emergencies. This system integrates real-time GPS tracking via OpenStreetMap (zero proprietary API cost), AI-based gyro accident detection, IoT TPMS tyre pressure telemetry, and instant multi-channel emergency alert dispatching.',
    controlRoomPhone: '+91 94431 20260',
    emergencyResponsePhone: '+91 94431 20261',
    securityPhone: '0462-2553300',
    tyreBreakdownHotline: '1800-425-9999',
    ambulanceHotline: '108',
    policeHotline: '112',
    trackingPortalUrl: 'https://transport.tec.ac.in/track',
    safetySlogan: 'Safe Travel · Smart Tracking · Rapid Emergency Protection',
  });

  const posterRef = useRef<HTMLDivElement>(null);

  // Print A3 Poster directly
  const handlePrint = () => {
    window.print();
  };

  // Export as high-resolution PNG image (A3 format)
  const handleDownloadImage = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);
    try {
      // Temporarily normalize scale for crisp capture
      const originalTransform = posterRef.current.style.transform;
      posterRef.current.style.transform = 'scale(1)';

      const canvas = await html2canvas(posterRef.current, {
        scale: 2, // 2x gives 1680 x 2376 px, high definition print clarity
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      posterRef.current.style.transform = originalTransform;

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `A3_Poster_${posterData.collegeName.replace(/[^a-zA-Z0-9]/g, '_')}_${template}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export poster as image:', err);
      // Fallback to print dialog
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContact(label);
    setTimeout(() => setCopiedContact(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24">
      {/* Strict ISO A3 Portrait Printing Specs (297mm × 420mm) */}
      <style>{`
        @media print {
          @page {
            size: A3 portrait;
            margin: 0;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-a3-container {
            width: 297mm !important;
            min-height: 420mm !important;
            height: 420mm !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Studio Header Toolbar */}
      <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Poster Description */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md font-bold">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  A3 Poster Studio & Generator
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  ISO A3 (297 × 420 mm)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create, customize, and print high-resolution presentation and notice board posters
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Template Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setTemplate('expo-presentation')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  template === 'expo-presentation'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🎓 Project Expo
              </button>
              <button
                onClick={() => setTemplate('campus-notice')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  template === 'campus-notice'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📢 Notice Board
              </button>
              <button
                onClick={() => setTemplate('in-cabin-safety')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  template === 'in-cabin-safety'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🚍 In-Cabin Card
              </button>
            </div>

            {/* Bus Preset Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-1 border border-slate-200 dark:border-slate-700">
              <Bus className="w-3.5 h-3.5 text-amber-500" />
              <select
                aria-label="Select College Bus Preset"
                value={selectedBusId}
                onChange={e => setSelectedBusId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden pr-2 cursor-pointer"
              >
                {FLEET_PRESETS.map(b => (
                  <option key={b.id} value={b.id} className="dark:bg-slate-800">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.1))}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 min-w-[45px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(0.85)}
                className="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Fit
              </button>
              <button
                onClick={() => setZoomLevel(1.0)}
                className="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                100%
              </button>
            </div>

            {/* Customize / Edit Button */}
            <button
              onClick={() => setShowEditDrawer(prev => !prev)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-500" />
              <span>Edit Details</span>
            </button>

            {/* Download Image Button (html2canvas) */}
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              title="Download high resolution PNG image file"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Image (PNG)</span>
                </>
              )}
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-md flex items-center gap-1.5 font-sans"
            >
              <Printer className="w-4 h-4" />
              <span>Print A3 (PDF)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Poster Canvas Display */}
      <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-8 overflow-x-auto">
        {/* Physical A3 Box (Aspect ratio 1 : 1.414, standard 840px × 1188px on web screen) */}
        <div
          ref={posterRef}
          className="print-a3-container relative bg-white text-slate-900 shadow-2xl rounded-2xl overflow-hidden transition-transform duration-200 origin-top select-none border border-slate-300"
          style={{
            width: '840px',
            minHeight: '1188px',
            transform: `scale(${zoomLevel})`,
            marginBottom: `${(zoomLevel - 1) * 1188}px`,
          }}
        >
          {/* Top Safety Accent Band */}
          <div className="h-3 w-full bg-gradient-to-r from-amber-500 via-yellow-400 via-orange-500 to-emerald-500" />

          {/* ========================================================
              TEMPLATE 1: EXPO & PROJECT PRESENTATION POSTER
             ======================================================== */}
          {template === 'expo-presentation' && (
            <div className="flex flex-col h-full">
              {/* Institutional Header Banner */}
              <div className="px-8 pt-5 pb-4 bg-slate-900 text-white border-b-2 border-amber-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Logo size="lg" variant="badge" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                        {posterData.department}
                      </span>
                      <h1 className="text-xl font-black tracking-tight leading-tight uppercase text-white">
                        {posterData.collegeName}
                      </h1>
                      <p className="text-[10px] font-medium text-slate-300 mt-0.5">
                        {posterData.collegeTagline}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 shadow-sm">
                      <Award className="w-3.5 h-3.5" />
                      <span>{posterData.symposiumTitle}</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-300 mt-1">
                      Project Guide: {posterData.guideName}
                    </p>
                  </div>
                </div>

                {/* Project Title Deck */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-wide uppercase text-amber-400">
                      {posterData.projectTitle}
                    </h2>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      {posterData.projectSubtitle}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Lead Developers</span>
                    <span className="text-xs font-bold text-white">{posterData.projectAuthors}</span>
                  </div>
                </div>
              </div>

              {/* Main Body Grid */}
              <div className="p-6 space-y-4 flex-1">
                {/* Row 1: Problem Statement & Motivation */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 rounded bg-amber-500 text-slate-950">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Problem Statement & System Motivation
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
                    {posterData.problemStatement}
                  </p>
                </div>

                {/* Row 2: 3-Column Engineering Infographic */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Left Column (5 Cols): Cover Art & Live GPS Radar Visual */}
                  <div className="col-span-5 flex flex-col gap-3">
                    <div className="relative rounded-xl overflow-hidden border-2 border-amber-500 shadow-lg bg-slate-950 aspect-3/4">
                      <img
                        src={coverImageSrc}
                        alt="College Bus Safety and Tracking System Cover"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {/* Telemetry Overlays */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center">
                        <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-mono text-amber-400 border border-amber-500/50 flex items-center gap-1">
                          <Navigation className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                          GPS: 8.7139° N, 77.7567° E
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
                          100% OPERATIONAL
                        </span>
                      </div>

                      <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2.5 rounded-lg bg-black/85 backdrop-blur-md text-white border border-white/10">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[11px] font-extrabold text-amber-400">{currentBus.name}</span>
                          <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                            {currentBus.plate}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-300">
                          Equipped with NEO-M8N GPS, MPU-6050 3-Axis Gyro, and Pneumatic Rim TPMS
                        </p>
                      </div>
                    </div>

                    {/* QR Code Bar */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                      <div className="p-1 bg-white rounded-lg shadow-xs shrink-0 border border-slate-200">
                        <QrCode className="w-12 h-12 text-slate-900" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-amber-700 block">
                          LIVE DEMO & TRACKING PORTAL
                        </span>
                        <h4 className="text-xs font-black text-slate-900">Scan For Real-Time Map</h4>
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                          {posterData.trackingPortalUrl}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (7 Cols): The 4 Core Smart Modules */}
                  <div className="col-span-7 flex flex-col gap-3">
                    {/* Module 1: Live Bus Tracking & OpenStreetMap */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-blue-500/10 text-blue-600 font-bold">
                            <Navigation className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-black text-slate-900">
                            1. Real-Time GPS Tracking & OpenStreetMap
                          </h4>
                        </div>
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          Zero Google API
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-snug">
                        Interactive Leaflet.js maps displaying live bus markers, colored polyline corridors, live speed, stop countdown ETAs, and automatic route deviation alerts when a bus drifts off course.
                      </p>
                    </div>

                    {/* Module 2: AI Accident & Gyro Emergency Alert */}
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50/40 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-red-500/10 text-red-600 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-black text-red-900">
                            2. AI Accident Detection & Crash SOS Beacon
                          </h4>
                        </div>
                        <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          Millisecond Response
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-snug">
                        MPU-6050 3-axis accelerometer and gyroscope detect collisions and rollover (&gt;35° tilt). Instantly transmits coordinates and incident severity to transport admins, driver contacts, and emergency units.
                      </p>
                    </div>

                    {/* Module 3: Wheel Burst & Tyre Problem Detection */}
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-amber-500/10 text-amber-600 font-bold">
                            <Gauge className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-black text-amber-900">
                            3. Wheel Burst & TPMS Tyre Protection
                          </h4>
                        </div>
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                          Threshold &gt;75°C
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-snug">
                        Monitors tyre pressure (110–115 PSI) and temperature per rim in real-time. Detects rapid pressure leaks or overheating, triggering cockpit buzzers and recommending safe shoulder stoppage.
                      </p>
                    </div>

                    {/* Module 4: Bus Maintenance & Driver Safety */}
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                            <Wrench className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-black text-emerald-900">
                            4. Digital Maintenance & Driver Telemetry
                          </h4>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          50 km/h Governor
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-snug">
                        Daily digital pre-trip inspection locks unsafe buses under "Under Maintenance" status. Monitors speed violations, harsh braking, and generates automated driver safety reports.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 3: System Hardware & Architecture Pipeline */}
                <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      Hardware IoT & Software Data Flow
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Edge Sensor ➔ 4G Telemetry ➔ FastAPI ➔ OpenStreetMap Leaflet
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-[10px]">
                    <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                      <strong className="text-amber-400 block mb-0.5">1. SENSING EDGE</strong>
                      <p className="text-slate-300 leading-tight">
                        GPS Neo-M8N, MPU-6050 Gyro, Valve Stem TPMS, Driver Cockpit SOS Panic Button.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                      <strong className="text-amber-400 block mb-0.5">2. TRANSMISSION</strong>
                      <p className="text-slate-300 leading-tight">
                        ESP32 IoT controller transmitting encrypted telemetry packets via 4G/LTE MQTT & SSE.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                      <strong className="text-amber-400 block mb-0.5">3. AI ENGINE</strong>
                      <p className="text-slate-300 leading-tight">
                        FastAPI backend executing anomaly algorithms for rollover, speed alerts & tyre pressure drops.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                      <strong className="text-amber-400 block mb-0.5">4. CLIENT VISUALS</strong>
                      <p className="text-slate-300 leading-tight">
                        React.js, Leaflet.js, OpenStreetMap interactive dashboard with real-time audio alarms.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 4: 24/7 Emergency Contacts & Official Hotline Grid */}
                <div className="p-4 rounded-xl border-2 border-red-500 bg-red-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-red-600 text-white">
                        <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-red-950">
                        Institutional Emergency Response & Hotlines Directory
                      </h4>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white">
                      TOLL-FREE / 24X7
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-red-200">
                      <span className="text-[9px] text-slate-500 font-bold block">Transport Control Room</span>
                      <strong className="font-mono text-red-600">{posterData.controlRoomPhone}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-red-200">
                      <span className="text-[9px] text-slate-500 font-bold block">Emergency Response (ERT)</span>
                      <strong className="font-mono text-red-600">{posterData.emergencyResponsePhone}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-red-200">
                      <span className="text-[9px] text-slate-500 font-bold block">Assigned Driver ({currentBus.driverName})</span>
                      <strong className="font-mono text-blue-600">{currentBus.driverPhone}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-red-200">
                      <span className="text-[9px] text-slate-500 font-bold block">Tyre & Breakdown Desk</span>
                      <strong className="font-mono text-amber-600">{posterData.tyreBreakdownHotline}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Footer Band */}
              <div className="mt-auto px-8 py-3 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{posterData.safetySlogan}</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-slate-400">
                  <span>CAMPUS HELPDESK: {posterData.securityPhone}</span>
                  <span>·</span>
                  <span>ISO 39001 ROAD TRAFFIC SAFETY</span>
                  <span>·</span>
                  <span>EXPO REF: TEC-BUS-2026-A3</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TEMPLATE 2: CAMPUS SAFETY NOTICE BOARD POSTER
             ======================================================== */}
          {template === 'campus-notice' && (
            <div className="flex flex-col h-full">
              {/* Top Banner */}
              <div className="px-8 pt-6 pb-4 bg-amber-500 text-slate-950 border-b-4 border-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <Logo size="lg" variant="badge" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest block text-slate-900">
                        OFFICIAL CAMPUS TRANSIT ADVISORY
                      </span>
                      <h1 className="text-2xl font-black tracking-tight leading-none uppercase">
                        {posterData.collegeName}
                      </h1>
                      <p className="text-xs font-bold text-slate-800 mt-1">
                        {posterData.collegeTagline}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full bg-slate-950 text-white text-xs font-black uppercase tracking-wide">
                      CAMPUS NOTICE BOARD
                    </span>
                    <p className="text-[10px] font-mono mt-1 font-bold">CIRCULAR: TEC/TRP/2026/A3</p>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-8 space-y-5 flex-1">
                {/* Hero Showcase with Cover Art & QR */}
                <div className="grid grid-cols-12 gap-6 items-center bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="col-span-5 rounded-2xl overflow-hidden shadow-xl border-2 border-amber-500 bg-slate-900 aspect-3/4">
                    <img
                      src={coverImageSrc}
                      alt="College Bus Safety Cover"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="col-span-7 space-y-4">
                    <div>
                      <span className="px-2.5 py-1 rounded bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                        ACTIVE SAFETY MONITORING
                      </span>
                      <h2 className="text-xl font-black text-slate-900 mt-2 leading-tight uppercase">
                        {posterData.projectTitle}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        For student safety and prompt emergency assistance, all college buses are equipped with real-time GPS sensors, automated accident detection beacons, and tyre pressure monitors.
                      </p>
                    </div>

                    {/* Scan QR for Mobile Tracking */}
                    <div className="p-4 rounded-xl bg-white border border-amber-300 shadow-sm flex items-center gap-4">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0">
                        <QrCode className="w-16 h-16 text-slate-900" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-600">
                          INSTANT STUDENT & PARENT ACCESS
                        </span>
                        <h4 className="text-sm font-black text-slate-900">Scan to Track Any Bus Live</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {posterData.trackingPortalUrl}
                        </p>
                        <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                          ✔ No Login Required for Route ETA & Map
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Hotlines Block */}
                <div className="p-5 rounded-2xl bg-red-600 text-white shadow-lg space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-red-400">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-5 h-5 animate-pulse" />
                      <h3 className="text-base font-black uppercase tracking-wide">
                        24/7 CAMPUS EMERGENCY & ACCIDENT HOTLINES
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-white text-red-600 text-xs font-black">
                      PRIORITY DIRECT LINE
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-red-700/80 border border-red-400">
                      <span className="text-[10px] uppercase font-bold text-red-200 block">Transport Control Room</span>
                      <strong className="text-base font-black font-mono tracking-tight">{posterData.controlRoomPhone}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-red-700/80 border border-red-400">
                      <span className="text-[10px] uppercase font-bold text-red-200 block">Emergency Response Team</span>
                      <strong className="text-base font-black font-mono tracking-tight">{posterData.emergencyResponsePhone}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-red-700/80 border border-red-400">
                      <span className="text-[10px] uppercase font-bold text-red-200 block">Government First Responders</span>
                      <strong className="text-base font-black font-mono tracking-tight">108 (Med) · 112 (Pol)</strong>
                    </div>
                  </div>
                </div>

                {/* Fleet Details Strip */}
                <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 block">CURRENT ROUTE CORRIDOR</span>
                    <strong className="text-sm font-bold">{currentBus.routeName}</strong>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="block text-slate-300">Driver: {currentBus.driverName} ({currentBus.driverPhone})</span>
                    <span className="text-amber-400 font-bold">Plate: {currentBus.plate} · Speed Limit 50 km/h</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto px-8 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>{posterData.safetySlogan}</span>
                <span>Security Desk: {posterData.securityPhone} · tec2026@gmail.com</span>
              </div>
            </div>
          )}

          {/* ========================================================
              TEMPLATE 3: IN-CABIN PASSENGER & DRIVER SAFETY CARD
             ======================================================== */}
          {template === 'in-cabin-safety' && (
            <div className="flex flex-col h-full">
              {/* Bulkhead Header */}
              <div className="px-8 pt-6 pb-5 bg-red-600 text-white border-b-4 border-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-10 h-10 animate-bounce" />
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-red-200">
                        OFFICIAL VEHICLE SAFETY NOTICE
                      </span>
                      <h1 className="text-2xl font-black uppercase leading-tight">
                        PASSENGER & CREW EMERGENCY PROTOCOL
                      </h1>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-white text-red-700 font-black rounded-lg text-sm font-mono">
                      {currentBus.name}
                    </span>
                    <p className="text-xs font-mono mt-1 text-red-200">PLATE: {currentBus.plate}</p>
                  </div>
                </div>
              </div>

              {/* Cabin Guidelines Body */}
              <div className="p-8 space-y-6 flex-1">
                {/* 2 Big Action Columns */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left: What to do in accident */}
                  <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-300 space-y-4">
                    <h3 className="text-sm font-black uppercase text-red-600 flex items-center gap-2">
                      <HeartPulse className="w-5 h-5" />
                      In Case of Accident / Collision
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2.5 text-xs text-slate-700 font-medium">
                      <li><strong>Remain Calm:</strong> Do not crowd the aisles. Keep all personal belongings clear of exits.</li>
                      <li><strong>Automated Beacon Active:</strong> 3-axis crash sensor has already alerted campus control.</li>
                      <li><strong>Emergency Exits:</strong> Located at Window #4, Window #8, and the rear hydraulic door.</li>
                      <li><strong>Safety Hammers:</strong> Red glass-breaking hammers are mounted on the center pillars.</li>
                      <li><strong>First Aid Kit:</strong> Stored securely in the front overhead cabinet above row 1.</li>
                    </ol>
                  </div>

                  {/* Right: What to do in Tyre Burst */}
                  <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-4">
                    <h3 className="text-sm font-black uppercase text-amber-800 flex items-center gap-2">
                      <Gauge className="w-5 h-5" />
                      Tyre Pressure / Wheel Burst Notice
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2.5 text-xs text-slate-700 font-medium">
                      <li><strong>TPMS Continuous Monitoring:</strong> All 6 radial tyres are monitored at 110 PSI nominal.</li>
                      <li><strong>Safe Stop Maneuver:</strong> If alarm rings, driver will immediately pull to the outer shoulder.</li>
                      <li><strong>Hazard Warning:</strong> Dual emergency hazard lights will blink; passengers must remain seated.</li>
                      <li><strong>Relief Transit:</strong> Dedicated backup campus bus will be dispatched within 12 minutes.</li>
                    </ol>
                  </div>
                </div>

                {/* Driver & Coordinator Card */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
                  <h4 className="text-xs font-black uppercase text-amber-400">
                    Assigned Vehicle Crew & Transport Contacts
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Driver In-Charge</span>
                      <strong className="text-sm text-white">{currentBus.driverName}</strong>
                      <span className="text-blue-400 block mt-1">{currentBus.driverPhone}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Faculty Coordinator</span>
                      <strong className="text-sm text-white">{currentBus.facultyInCharge}</strong>
                      <span className="text-slate-400 block mt-1">Bus Cell In-Charge</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Control Room Helpline</span>
                      <strong className="text-sm text-red-400">{posterData.controlRoomPhone}</strong>
                      <span className="text-slate-400 block mt-1">Direct Landline: {posterData.securityPhone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cabin Footer */}
              <div className="mt-auto px-8 py-4 bg-slate-950 text-white border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400">
                  SPEED GOVERNED TO 50 KM/H · 100% CCTV RECORDING
                </span>
                <span className="text-slate-400 font-mono">
                  {posterData.collegeName} · SAFETY DIVISION
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Drawer for Custom Content */}
      {showEditDrawer && (
        <div className="no-print fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Customize Poster Content
              </h3>
            </div>
            <button
              onClick={() => setShowEditDrawer(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                College Name
              </label>
              <input
                type="text"
                value={posterData.collegeName}
                onChange={e => setPosterData(prev => ({ ...prev, collegeName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Project Title
              </label>
              <input
                type="text"
                value={posterData.projectTitle}
                onChange={e => setPosterData(prev => ({ ...prev, projectTitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Department / Cell
              </label>
              <input
                type="text"
                value={posterData.department}
                onChange={e => setPosterData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Authors / Team Members
              </label>
              <input
                type="text"
                value={posterData.projectAuthors}
                onChange={e => setPosterData(prev => ({ ...prev, projectAuthors: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Project Guide / In-Charge
              </label>
              <input
                type="text"
                value={posterData.guideName}
                onChange={e => setPosterData(prev => ({ ...prev, guideName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                24/7 Control Room Phone
              </label>
              <input
                type="text"
                value={posterData.controlRoomPhone}
                onChange={e => setPosterData(prev => ({ ...prev, controlRoomPhone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Emergency Response Phone (ERT)
              </label>
              <input
                type="text"
                value={posterData.emergencyResponsePhone}
                onChange={e => setPosterData(prev => ({ ...prev, emergencyResponsePhone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tyre & Breakdown Support Hotline
              </label>
              <input
                type="text"
                value={posterData.tyreBreakdownHotline}
                onChange={e => setPosterData(prev => ({ ...prev, tyreBreakdownHotline: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Live Tracking URL (Shown on QR)
              </label>
              <input
                type="text"
                value={posterData.trackingPortalUrl}
                onChange={e => setPosterData(prev => ({ ...prev, trackingPortalUrl: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() =>
                  setPosterData({
                    collegeName: liveCollegeName || 'THAMIRABHARANI ENGINEERING COLLEGE',
                    collegeTagline: 'AUTONOMOUS  ·  AICTE APPROVED  ·  COLLEGE · LEARN · GROW',
                    department: 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE',
                    symposiumTitle: 'CAMPUS INNOVATION EXPO & SAFETY INITIATIVE 2026',
                    projectTitle: 'SMART COLLEGE BUS TRACKER AND SAFETY MANAGEMENT SYSTEM',
                    projectSubtitle: 'Real-Time GPS Tracking, AI Accident Detection, Tyre Burst Alerts & Preventive Fleet Maintenance',
                    projectAuthors: 'Benjamin · Kathiravan · Transportation Safety Cell',
                    guideName: 'Dr. S. Karthikeyan, Ph.D. (HOD - AI & DS)',
                    problemStatement:
                      'College commute poses significant challenges: unexpected delays, lack of live visibility for parents/students, risk of severe tyre bursts on highways, and critical delays during road emergencies. This system integrates real-time GPS tracking via OpenStreetMap (zero proprietary API cost), AI-based gyro accident detection, IoT TPMS tyre pressure telemetry, and instant multi-channel emergency alert dispatching.',
                    controlRoomPhone: '+91 94431 20260',
                    emergencyResponsePhone: '+91 94431 20261',
                    securityPhone: '0462-2553300',
                    tyreBreakdownHotline: '1800-425-9999',
                    ambulanceHotline: '108',
                    policeHotline: '112',
                    trackingPortalUrl: 'https://transport.tec.ac.in/track',
                    safetySlogan: 'Safe Travel · Smart Tracking · Rapid Emergency Protection',
                  })
                }
                className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
