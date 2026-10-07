import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { BusLocation, Trip, Announcement, NotificationItem, Bus, Route, Stop } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface LiveContextType {
  isConnected: boolean;
  collegeName: string;
  updateCollegeName: (name: string) => Promise<boolean>;
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  busLocations: Record<string, BusLocation>;
  activeTrips: Trip[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  signalLostBuses: Record<string, string>; // busId -> lastSeen
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  lastEventTime: number;
}

const LiveContext = createContext<LiveContextType | null>(null);

export const LiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [collegeName, setCollegeName] = useState<string>('Tirunelveli Engineering College (TEC)');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [busLocations, setBusLocations] = useState<Record<string, BusLocation>>({});
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [signalLostBuses, setSignalLostBuses] = useState<Record<string, string>>({});
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now());

  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchTrackingData = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [trackingRes, busesRes, routesRes] = await Promise.all([
        fetch('/api/student/tracking-data', { headers }),
        fetch('/api/buses', { headers }),
        fetch('/api/routes', { headers }),
      ]);

      if (trackingRes.ok) {
        const data = await trackingRes.json();
        setActiveTrips(data.activeTrips || []);
        if (data.locations) setBusLocations(data.locations);
      }
      if (busesRes.ok) {
        const bData = await busesRes.json();
        setBuses(bData.buses || []);
      }
      if (routesRes.ok) {
        const rData = await routesRes.json();
        const rList: Route[] = rData.routes || [];
        setRoutes(rList);
        const collectedStops: Stop[] = [];
        const seen = new Set<string>();
        rList.forEach(r => {
          (r.stops || []).forEach(s => {
            if (!seen.has(s.id)) {
              seen.add(s.id);
              collectedStops.push(s);
            }
          });
        });
        if (collectedStops.length > 0) setStops(collectedStops);
      }
    } catch {
      // Quiet retry on initial server spin-up or network fluctuation
      try {
        const fallbackRes = await fetch('/api/student/tracking-data');
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setActiveTrips(data.activeTrips || []);
          if (data.locations) setBusLocations(data.locations);
        }
      } catch {
        // Fallback state retained gracefully
      }
    }
  }, [token]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        const incoming: Announcement[] = data.announcements || [];
        const seen = new Set<string>();
        const unique = incoming.filter(a => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        setAnnouncements(unique);
      }
    } catch {
      // Quiet fallback when offline or during dev boot
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const incoming: NotificationItem[] = data.notifications || [];
        const seen = new Set<string>();
        const unique = incoming.filter(n => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
        setNotifications(unique);
      }
    } catch {
      // Quiet fallback
    }
  }, [token]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings?.collegeName) {
          setCollegeName(data.settings.collegeName);
        }
      }
    } catch {
      // Quiet fallback
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([fetchTrackingData(), fetchAnnouncements(), fetchNotifications(), fetchSettings()]);
  }, [fetchTrackingData, fetchAnnouncements, fetchNotifications, fetchSettings]);

  const updateCollegeName = async (name: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ collegeName: name }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollegeName(data.settings?.collegeName || name);
        showToast('College name updated across campus system!', 'success');
        return true;
      }
    } catch {
      showToast('Failed to update college name', 'error');
    }
    return false;
  };

  // Initial load
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Setup EventSource for real-time updates
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connectSSE = () => {
      // Clean up previous instance
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events';
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        reconnectTimeout = setTimeout(connectSSE, 4000);
      };

      es.addEventListener('bus_location', (e: MessageEvent) => {
        try {
          const loc = JSON.parse(e.data) as BusLocation;
          setBusLocations(prev => ({ ...prev, [loc.busId]: loc }));
          // If bus is reporting location, remove from signal lost
          setSignalLostBuses(prev => {
            if (!prev[loc.busId]) return prev;
            const updated = { ...prev };
            delete updated[loc.busId];
            return updated;
          });
          setLastEventTime(Date.now());
        } catch (err) {
          console.error('Error parsing bus_location event:', err);
        }
      });

      es.addEventListener('trip_started', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          showToast(`Trip started for ${data.trip?.busId}`, 'info');
          fetchTrackingData();
          setLastEventTime(Date.now());
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('trip_completed', (e: MessageEvent) => {
        try {
          fetchTrackingData();
          setLastEventTime(Date.now());
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('trip_update', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setActiveTrips(prev =>
            prev.map(t => (t.id === data.tripId ? { ...t, ...data } : t))
          );
          setLastEventTime(Date.now());
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('signal_lost', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setSignalLostBuses(prev => ({ ...prev, [data.busId]: data.lastSeen }));
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('notification', (e: MessageEvent) => {
        try {
          const notif = JSON.parse(e.data) as NotificationItem;
          setNotifications(prev => {
            if (prev.some(n => n.id === notif.id)) return prev;
            return [notif, ...prev];
          });
          showToast(notif.message, notif.type === 'emergency' ? 'error' : 'info');
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('announcement', (e: MessageEvent) => {
        try {
          const ann = JSON.parse(e.data) as Announcement;
          setAnnouncements(prev => {
            if (prev.some(a => a.id === ann.id)) return prev;
            return [ann, ...prev];
          });
          showToast(`Announcement: ${ann.title}`, 'info');
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('settings_updated', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.settings?.collegeName) {
            setCollegeName(data.settings.collegeName);
          }
        } catch (err) {
          console.error(err);
        }
      });

      es.addEventListener('database_reset', () => {
        showToast('System data reset by administrator', 'info');
        refreshAllData();
      });
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [token, showToast, fetchTrackingData, refreshAllData]);

  const markNotificationRead = async (id: string) => {
    if (!token) return;
    try {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!token) return;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <LiveContext.Provider
      value={{
        isConnected,
        collegeName,
        updateCollegeName,
        buses,
        routes,
        stops,
        busLocations,
        activeTrips,
        announcements,
        notifications,
        unreadNotifsCount,
        signalLostBuses,
        markNotificationRead,
        markAllNotificationsRead,
        refreshAllData,
        lastEventTime,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};

export const useLive = () => {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used within LiveProvider');
  return ctx;
};
