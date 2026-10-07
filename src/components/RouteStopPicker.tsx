import React, { useState, useMemo } from 'react';
import { Route, Stop, Bus, BusLocation } from '../types';
import {
  MapPin,
  Search,
  Navigation,
  Bookmark,
  BookmarkCheck,
  Clock,
  Compass,
  ArrowRight,
  Radio,
  Sparkles,
  ChevronRight,
  Crosshair,
  Bus as BusIcon,
} from 'lucide-react';

interface RouteStopPickerProps {
  routes: Route[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  selectedStopId: string;
  onSelectStop: (stopId: string) => void;
  destinationStopId?: string;
  onSelectDestinationStop?: (stopId: string) => void;
  favouriteStopIds?: string[];
  onToggleFavourite?: (stopId: string, routeId: string) => void;
  busLocations?: Record<string, BusLocation>;
  buses?: Bus[];
  onFocusOnMap?: (lat: number, lng: number) => void;
  className?: string;
}

export const RouteStopPicker: React.FC<RouteStopPickerProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  selectedStopId,
  onSelectStop,
  destinationStopId,
  onSelectDestinationStop,
  favouriteStopIds = [],
  onToggleFavourite,
  busLocations = {},
  buses = [],
  onFocusOnMap,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'saved' | 'terminals'>('all');
  const [showJourneyPlanner, setShowJourneyPlanner] = useState(false);

  // Active route
  const activeRoute = useMemo(() => {
    return routes.find(r => r.id === selectedRouteId) || routes[0];
  }, [routes, selectedRouteId]);

  // Route stops in sequence
  const stops = useMemo(() => {
    return activeRoute?.stops || [];
  }, [activeRoute]);

  // Active bus on this route
  const activeBus = useMemo(() => {
    return buses.find(b => b.currentRouteId === activeRoute?.id || b.activeTrip?.routeId === activeRoute?.id);
  }, [buses, activeRoute]);

  // Live GPS location of active bus
  const activeGps = useMemo(() => {
    if (!activeBus) return null;
    return busLocations[activeBus.id] || null;
  }, [activeBus, busLocations]);

  // Selected boarding stop
  const boardingStop = useMemo(() => {
    return stops.find(s => s.id === selectedStopId) || stops[0];
  }, [stops, selectedStopId]);

  // Selected destination stop
  const droppingStop = useMemo(() => {
    if (!destinationStopId) return stops[stops.length - 1];
    return stops.find(s => s.id === destinationStopId) || stops[stops.length - 1];
  }, [stops, destinationStopId]);

  // Filtered stops
  const filteredStops = useMemo(() => {
    return stops.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.landmark && s.landmark.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (filterMode === 'saved') {
        return favouriteStopIds.includes(s.id);
      }
      if (filterMode === 'terminals') {
        return (
          s.stopOrder === 1 ||
          s.stopOrder === stops.length ||
          s.name.toLowerCase().includes('campus') ||
          s.name.toLowerCase().includes('stand') ||
          s.name.toLowerCase().includes('junction')
        );
      }
      return true;
    });
  }, [stops, searchTerm, filterMode, favouriteStopIds]);

  // Calculate journey metrics
  const journeyMetrics = useMemo(() => {
    if (!boardingStop || !droppingStop) return null;
    const bOrder = boardingStop.stopOrder || 1;
    const dOrder = droppingStop.stopOrder || stops.length;
    const stopCount = Math.abs(dOrder - bOrder);
    // rough estimate 3-4 mins per stop + dwell
    const estMinutes = Math.max(5, stopCount * 4);

    return {
      stopsBetween: stopCount,
      estimatedMinutes: estMinutes,
      isReversed: dOrder < bOrder,
    };
  }, [boardingStop, droppingStop, stops.length]);

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 ${className}`}>
      {/* 1. ROUTE SELECTOR CAROUSEL */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span>1. Campus Transit Corridors</span>
          </label>
          <span className="text-[11px] font-bold text-slate-400">
            {routes.length} Active Corridors
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {routes.map(r => {
            const isSelected = r.id === activeRoute?.id;
            const hasLiveBus = buses.some(b => b.currentRouteId === r.id || b.activeTrip?.routeId === r.id);

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelectRoute(r.id);
                  if (r.stops && r.stops[0]) {
                    onSelectStop(r.stops[0].id);
                  }
                }}
                className={`flex-shrink-0 px-3.5 py-2.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-sm ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: r.color || '#F59E0B' }}
                  />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {r.routeNumber}
                  </span>
                  {hasLiveBus && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Active shuttle on line" />
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold max-w-[140px] truncate">
                  {r.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {r.stops?.length || 0} stops · {r.estimatedDurationMinutes}m
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DUAL STOP JOURNEY PICKER (BOARDING & DESTINATION) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {/* Boarding Stop Picker */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>Boarding Stop (Pick Up)</span>
            </span>

            {boardingStop && onToggleFavourite && (
              <button
                type="button"
                onClick={() => onToggleFavourite(boardingStop.id, activeRoute.id)}
                className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1"
                title="Bookmark stop"
              >
                {favouriteStopIds.includes(boardingStop.id) ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </>
                )}
              </button>
            )}
          </div>

          <select
            value={boardingStop?.id}
            onChange={e => {
              onSelectStop(e.target.value);
              const found = stops.find(s => s.id === e.target.value);
              if (found && onFocusOnMap) {
                onFocusOnMap(found.latitude, found.longitude);
              }
            }}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
          >
            {stops.map(s => (
              <option key={s.id} value={s.id}>
                #{s.stopOrder} {s.name} ({s.code})
              </option>
            ))}
          </select>

          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="truncate">📍 {boardingStop?.landmark || boardingStop?.address || 'Designated stop'}</span>
            {boardingStop && onFocusOnMap && (
              <button
                type="button"
                onClick={() => onFocusOnMap(boardingStop.latitude, boardingStop.longitude)}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5 flex-shrink-0 ml-1"
              >
                <Crosshair className="w-3 h-3" />
                <span>Locate</span>
              </button>
            )}
          </div>
        </div>

        {/* Destination Stop Picker */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-blue-500" />
              <span>Destination Stop (Drop Off)</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">Campus End Point</span>
          </div>

          <select
            value={droppingStop?.id}
            onChange={e => {
              if (onSelectDestinationStop) {
                onSelectDestinationStop(e.target.value);
              }
              const found = stops.find(s => s.id === e.target.value);
              if (found && onFocusOnMap) {
                onFocusOnMap(found.latitude, found.longitude);
              }
            }}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
          >
            {stops.map(s => (
              <option key={s.id} value={s.id}>
                #{s.stopOrder} {s.name} ({s.code})
              </option>
            ))}
          </select>

          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="truncate">📍 {droppingStop?.landmark || droppingStop?.address || 'Terminal campus gate'}</span>
            {droppingStop && onFocusOnMap && (
              <button
                type="button"
                onClick={() => onFocusOnMap(droppingStop.latitude, droppingStop.longitude)}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5 flex-shrink-0 ml-1"
              >
                <Crosshair className="w-3 h-3" />
                <span>Locate</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. JOURNEY SUMMARY STRIP */}
      {journeyMetrics && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <BusIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{boardingStop?.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
                <span>{droppingStop?.name}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {journeyMetrics.stopsBetween} intermediate stops · Est. transit {journeyMetrics.estimatedMinutes} mins
              </div>
            </div>
          </div>

          {/* Active Vehicle GPS status badge */}
          {activeGps && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-[11px]">
                <span className="font-bold text-slate-900 dark:text-white">{activeBus?.plateNumber}</span>
                <span className="text-slate-400 ml-1.5">({Math.round(activeGps.speed)} km/h · ±{activeGps.accuracy || 5}m)</span>
              </div>
              {onFocusOnMap && (
                <button
                  type="button"
                  onClick={() => onFocusOnMap(activeGps.latitude, activeGps.longitude)}
                  className="ml-1 p-1 rounded-lg text-amber-500 hover:bg-amber-500/10"
                  title="Center map on live bus GPS"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. EXPANDABLE SEARCH & STOP DIRECTORY DRAWER */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setShowJourneyPlanner(prev => !prev)}
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-amber-500 flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{showJourneyPlanner ? 'Hide Stop Browser' : `Browse All Stops (${stops.length})`}</span>
          </button>

          {showJourneyPlanner && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  filterMode === 'all'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('saved')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  filterMode === 'saved'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Saved ⭐
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('terminals')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  filterMode === 'terminals'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Hubs
              </button>
            </div>
          )}
        </div>

        {showJourneyPlanner && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by stop name, code (TN-01), or landmark..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStops.map(s => {
                const isSelected = s.id === boardingStop?.id;
                const isSaved = favouriteStopIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      onSelectStop(s.id);
                      if (onFocusOnMap) onFocusOnMap(s.latitude, s.longitude);
                    }}
                    className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {s.stopOrder || '●'}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{s.name}</span>
                          <span className="text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                            {s.code}
                          </span>
                        </div>
                        {s.landmark && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">
                            📍 {s.landmark}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onToggleFavourite && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onToggleFavourite(s.id, activeRoute.id);
                          }}
                          className={`p-1 rounded-lg ${isSaved ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Bookmark stop"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
