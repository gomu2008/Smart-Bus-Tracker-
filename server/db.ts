import fs from 'fs';
import path from 'path';
import { DatabaseSchema, User, Bus, Stop, Route, RouteStop, Trip, BusLocation, Announcement, NotificationItem, FeedbackItem, FavouriteStop, PasswordReset, GpsDevice, GpsPacketLog } from './types.js';
import { getSeedData } from './seed.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smartbus.json');

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isSaving = false;

  constructor() {
    this.ensureDirectory();
    this.data = this.load();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        // Verify key tables exist and check if data needs migration from old Bengaluru stops
        if (parsed.users && parsed.buses && parsed.stops && parsed.routes) {
          const hasOldBengaluru = parsed.stops.some((s: any) => s.latitude > 12 && s.latitude < 14);
          const hasAdmin = parsed.users.some((u: any) => u.role === 'admin' || u.email.toLowerCase() === 'gomu2468@gmail.com' || u.email.toLowerCase() === 'tec2026@gmail.com');
          if (!hasOldBengaluru && hasAdmin) {
            parsed.gps_devices = parsed.gps_devices || [];
            parsed.gps_packet_logs = parsed.gps_packet_logs || [];
            return parsed;
          }
          console.log('Migrating database to official Tirunelveli, Tamil Nadu network...');
        }
      }
    } catch (err) {
      console.error('Error reading database file, resetting to seed data:', err);
    }

    const seed = getSeedData();
    this.saveImmediate(seed);
    return seed;
  }

  public scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 200);
  }

  private saveImmediate(dataToSave: DatabaseSchema) {
    try {
      this.ensureDirectory();
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to save database immediately:', err);
    }
  }

  private saveToDisk() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      this.ensureDirectory();
      this.data.settings.lastUpdated = new Date().toISOString();
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database:', err);
    } finally {
      this.isSaving = false;
    }
  }

  public getRaw(): DatabaseSchema {
    return this.data;
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserByCollegeId(collegeId: string): User | undefined {
    return this.data.users.find(u => u.collegeId.toLowerCase() === collegeId.toLowerCase());
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.scheduleSave();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.scheduleSave();
    return this.data.users[idx];
  }

  public deleteUser(id: string): boolean {
    const prevLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== prevLen) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- Buses ---
  public getBuses(): Bus[] {
    return this.data.buses;
  }

  public getBusById(id: string): Bus | undefined {
    return this.data.buses.find(b => b.id === id);
  }

  public createBus(bus: Bus): Bus {
    this.data.buses.push(bus);
    this.scheduleSave();
    return bus;
  }

  public updateBus(id: string, updates: Partial<Bus>): Bus | undefined {
    const idx = this.data.buses.findIndex(b => b.id === id);
    if (idx === -1) return undefined;
    this.data.buses[idx] = { ...this.data.buses[idx], ...updates };
    this.scheduleSave();
    return this.data.buses[idx];
  }

  public deleteBus(id: string): boolean {
    const prev = this.data.buses.length;
    this.data.buses = this.data.buses.filter(b => b.id !== id);
    if (this.data.buses.length !== prev) {
      delete this.data.locations[id];
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- Stops ---
  public getStops(): Stop[] {
    return this.data.stops;
  }

  public getStopById(id: string): Stop | undefined {
    return this.data.stops.find(s => s.id === id);
  }

  public createStop(stop: Stop): Stop {
    this.data.stops.push(stop);
    this.scheduleSave();
    return stop;
  }

  public updateStop(id: string, updates: Partial<Stop>): Stop | undefined {
    const idx = this.data.stops.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.data.stops[idx] = { ...this.data.stops[idx], ...updates };
    this.scheduleSave();
    return this.data.stops[idx];
  }

  public deleteStop(id: string): boolean {
    const prev = this.data.stops.length;
    this.data.stops = this.data.stops.filter(s => s.id !== id);
    this.data.route_stops = this.data.route_stops.filter(rs => rs.stopId !== id);
    if (this.data.stops.length !== prev) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- Routes & Route Stops ---
  public getRoutes(): Route[] {
    return this.data.routes.map(route => {
      const rStops = this.data.route_stops
        .filter(rs => rs.routeId === route.id)
        .sort((a, b) => a.stopOrder - b.stopOrder)
        .map(rs => {
          const stop = this.getStopById(rs.stopId);
          return {
            ...(stop || {
              id: rs.stopId,
              name: 'Unknown Stop',
              code: 'UNK',
              latitude: 0,
              longitude: 0,
              createdAt: '',
            }),
            stopOrder: rs.stopOrder,
            scheduledMinutesFromStart: rs.scheduledMinutesFromStart,
          };
        });
      return { ...route, stops: rStops };
    });
  }

  public getRouteById(id: string): Route | undefined {
    const route = this.data.routes.find(r => r.id === id);
    if (!route) return undefined;
    const rStops = this.data.route_stops
      .filter(rs => rs.routeId === route.id)
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map(rs => {
        const stop = this.getStopById(rs.stopId);
        return {
          ...(stop || {
            id: rs.stopId,
            name: 'Unknown Stop',
            code: 'UNK',
            latitude: 0,
            longitude: 0,
            createdAt: '',
          }),
          stopOrder: rs.stopOrder,
          scheduledMinutesFromStart: rs.scheduledMinutesFromStart,
        };
      });
    return { ...route, stops: rStops };
  }

  public createRoute(route: Route, stops: { stopId: string; scheduledMinutesFromStart: number }[]): Route {
    this.data.routes.push(route);
    stops.forEach((s, idx) => {
      this.data.route_stops.push({
        id: `rs_${route.id}_${idx + 1}_${Date.now()}`,
        routeId: route.id,
        stopId: s.stopId,
        stopOrder: idx + 1,
        scheduledMinutesFromStart: s.scheduledMinutesFromStart,
      });
    });
    this.scheduleSave();
    return this.getRouteById(route.id)!;
  }

  public updateRoute(
    id: string,
    updates: Partial<Route>,
    stops?: { stopId: string; scheduledMinutesFromStart: number }[]
  ): Route | undefined {
    const idx = this.data.routes.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.data.routes[idx] = { ...this.data.routes[idx], ...updates };

    if (stops) {
      this.data.route_stops = this.data.route_stops.filter(rs => rs.routeId !== id);
      stops.forEach((s, sIdx) => {
        this.data.route_stops.push({
          id: `rs_${id}_${sIdx + 1}_${Date.now()}`,
          routeId: id,
          stopId: s.stopId,
          stopOrder: sIdx + 1,
          scheduledMinutesFromStart: s.scheduledMinutesFromStart,
        });
      });
    }

    this.scheduleSave();
    return this.getRouteById(id);
  }

  public deleteRoute(id: string): boolean {
    const prev = this.data.routes.length;
    this.data.routes = this.data.routes.filter(r => r.id !== id);
    this.data.route_stops = this.data.route_stops.filter(rs => rs.routeId !== id);
    if (this.data.routes.length !== prev) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- Trips ---
  public getTrips(): Trip[] {
    return this.data.trips;
  }

  public getTripById(id: string): Trip | undefined {
    return this.data.trips.find(t => t.id === id);
  }

  public getActiveTrips(): Trip[] {
    return this.data.trips.filter(t => t.status === 'in_progress');
  }

  public createTrip(trip: Trip): Trip {
    this.data.trips.push(trip);
    this.scheduleSave();
    return trip;
  }

  public updateTrip(id: string, updates: Partial<Trip>): Trip | undefined {
    const idx = this.data.trips.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.data.trips[idx] = { ...this.data.trips[idx], ...updates };
    this.scheduleSave();
    return this.data.trips[idx];
  }

  // --- Locations ---
  public getAllLocations(): Record<string, BusLocation> {
    return this.data.locations;
  }

  public getLocationByBusId(busId: string): BusLocation | undefined {
    return this.data.locations[busId];
  }

  public updateBusLocation(loc: BusLocation) {
    this.data.locations[loc.busId] = loc;
    this.data.location_history.push({
      ...loc,
      id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    });
    // Limit history to last 500 items
    if (this.data.location_history.length > 500) {
      this.data.location_history = this.data.location_history.slice(-500);
    }
    this.scheduleSave();
  }

  // --- Announcements ---
  public getAnnouncements(): Announcement[] {
    return this.data.announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createAnnouncement(announcement: Announcement): Announcement {
    this.data.announcements.unshift(announcement);
    this.scheduleSave();
    return announcement;
  }

  public deleteAnnouncement(id: string): boolean {
    const prev = this.data.announcements.length;
    this.data.announcements = this.data.announcements.filter(a => a.id !== id);
    if (this.data.announcements.length !== prev) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- Notifications ---
  public getNotificationsForUser(userId: string): NotificationItem[] {
    const list = this.data.notifications
      .filter(n => n.userId === userId || n.userId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const seen = new Set<string>();
    return list.filter(n => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }

  public createNotification(notification: NotificationItem): NotificationItem {
    if (this.data.notifications.some(n => n.id === notification.id)) {
      notification.id = `${notification.id}_${Math.random().toString(36).substring(2, 6)}`;
    }
    this.data.notifications.unshift(notification);
    if (this.data.notifications.length > 200) {
      this.data.notifications = this.data.notifications.slice(0, 200);
    }
    this.scheduleSave();
    return notification;
  }

  public markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id && (n.userId === userId || n.userId === 'all'));
    if (notif) {
      notif.read = true;
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(userId: string): void {
    this.data.notifications.forEach(n => {
      if (n.userId === userId || n.userId === 'all') {
        n.read = true;
      }
    });
    this.scheduleSave();
  }

  // --- Feedback ---
  public getFeedback(): FeedbackItem[] {
    return this.data.feedback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createFeedback(item: FeedbackItem): FeedbackItem {
    this.data.feedback.unshift(item);
    this.scheduleSave();
    return item;
  }

  public updateFeedback(id: string, updates: Partial<FeedbackItem>): FeedbackItem | undefined {
    const idx = this.data.feedback.findIndex(f => f.id === id);
    if (idx === -1) return undefined;
    this.data.feedback[idx] = { ...this.data.feedback[idx], ...updates };
    this.scheduleSave();
    return this.data.feedback[idx];
  }

  // --- Favourites ---
  public getFavourites(userId: string): FavouriteStop[] {
    return this.data.favourites.filter(f => f.userId === userId);
  }

  public addFavourite(fav: FavouriteStop): FavouriteStop {
    const exists = this.data.favourites.find(
      f => f.userId === fav.userId && f.routeId === fav.routeId && f.stopId === fav.stopId
    );
    if (exists) return exists;
    this.data.favourites.push(fav);
    this.scheduleSave();
    return fav;
  }

  public removeFavourite(userId: string, stopId: string, routeId?: string): boolean {
    const prev = this.data.favourites.length;
    this.data.favourites = this.data.favourites.filter(
      f => !(f.userId === userId && f.stopId === stopId && (!routeId || f.routeId === routeId))
    );
    if (this.data.favourites.length !== prev) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- Password Resets ---
  public createPasswordReset(email: string, token: string): PasswordReset {
    const reset: PasswordReset = {
      id: `pr_${Date.now()}`,
      email: email.toLowerCase(),
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins
      used: false,
    };
    this.data.password_resets.push(reset);
    this.scheduleSave();
    return reset;
  }

  public getPasswordReset(email: string, token: string): PasswordReset | undefined {
    return this.data.password_resets.find(
      pr => pr.email.toLowerCase() === email.toLowerCase() && pr.token === token && !pr.used
    );
  }

  public markPasswordResetUsed(id: string) {
    const pr = this.data.password_resets.find(r => r.id === id);
    if (pr) {
      pr.used = true;
      this.scheduleSave();
    }
  }

  // --- Real GPS Tracker Hardware Devices & Packet Telemetry ---
  public getGpsDevices(): GpsDevice[] {
    if (!this.data.gps_devices) this.data.gps_devices = [];
    return this.data.gps_devices;
  }

  public getGpsDeviceById(idOrImei: string): GpsDevice | undefined {
    if (!this.data.gps_devices) this.data.gps_devices = [];
    return this.data.gps_devices.find(
      d => d.id === idOrImei || d.imei === idOrImei
    );
  }

  public getGpsDeviceByBusId(busId: string): GpsDevice | undefined {
    if (!this.data.gps_devices) this.data.gps_devices = [];
    return this.data.gps_devices.find(d => d.busId === busId);
  }

  public upsertGpsDevice(device: GpsDevice): GpsDevice {
    if (!this.data.gps_devices) this.data.gps_devices = [];
    const index = this.data.gps_devices.findIndex(
      d => d.id === device.id || (device.imei && d.imei === device.imei)
    );
    if (index >= 0) {
      this.data.gps_devices[index] = { ...this.data.gps_devices[index], ...device, updatedAt: new Date().toISOString() };
    } else {
      this.data.gps_devices.push(device);
    }
    this.scheduleSave();
    return index >= 0 ? this.data.gps_devices[index] : device;
  }

  public deleteGpsDevice(id: string): boolean {
    if (!this.data.gps_devices) this.data.gps_devices = [];
    const initialLen = this.data.gps_devices.length;
    this.data.gps_devices = this.data.gps_devices.filter(d => d.id !== id && d.imei !== id);
    if (this.data.gps_devices.length !== initialLen) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public addGpsPacketLog(log: GpsPacketLog): GpsPacketLog {
    if (!this.data.gps_packet_logs) this.data.gps_packet_logs = [];
    this.data.gps_packet_logs.unshift(log);
    // Keep max 1000 logs in memory/disk
    if (this.data.gps_packet_logs.length > 1000) {
      this.data.gps_packet_logs = this.data.gps_packet_logs.slice(0, 1000);
    }
    this.scheduleSave();
    return log;
  }

  public getGpsPacketLogs(busId?: string, limit = 50): GpsPacketLog[] {
    if (!this.data.gps_packet_logs) this.data.gps_packet_logs = [];
    const filtered = busId
      ? this.data.gps_packet_logs.filter(p => p.busId === busId)
      : this.data.gps_packet_logs;
    return filtered.slice(0, limit);
  }

  // --- Settings & Demo Mode ---
  public getSettings() {
    if (!this.data.settings.collegeName) {
      this.data.settings.collegeName = 'Tirunelveli Engineering College (TEC)';
    }
    return this.data.settings;
  }

  public setDemoMode(enabled: boolean) {
    this.data.settings.demoMode = enabled;
    this.scheduleSave();
  }

  public updateSettings(updates: Partial<DatabaseSchema['settings']>) {
    this.data.settings = { ...this.data.settings, ...updates, lastUpdated: new Date().toISOString() };
    this.scheduleSave();
    return this.data.settings;
  }

  public resetDatabase() {
    this.data = getSeedData();
    this.saveImmediate(this.data);
    return this.data;
  }
}

export const db = new Database();
