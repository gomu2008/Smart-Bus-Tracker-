export type UserRole = 'student' | 'staff' | 'driver' | 'admin';
export type UserStatus = 'active' | 'pending_approval' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  collegeId: string;
  department?: string;
  phone?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type BusCondition = 'excellent' | 'good' | 'fair' | 'needs_service';
export type BrakeCondition = 'excellent' | 'good' | 'fair' | 'needs_attention' | 'critical';
export type WheelCondition = 'excellent' | 'good' | 'fair' | 'needs_replacement';

export type GpsConnectionStatus = 'connected' | 'no_fix' | 'offline' | 'not_configured' | 'invalid_data';
export type SimNetworkStatus = '4g_lte' | '3g_hspa' | '2g_gsm' | 'sim_inactive' | 'weak_signal' | 'roaming';

export interface GpsDevice {
  id: string; // e.g. gps_dev_01
  name: string; // Device label, e.g. "ESP32-NEO6M Bus #1"
  imei: string; // 15-digit IMEI
  busId?: string; // Mapped Bus ID
  deviceToken: string; // Secret key for hardware ingestion
  protocol: 'esp32_json' | 'http_rest' | 'gt06' | 'teltonika_json';
  serverEndpoint: string; // Ingestion endpoint URL
  updateIntervalSeconds: number; // Ingestion frequency, e.g. 2-5s
  status: GpsConnectionStatus;
  simStatus: SimNetworkStatus;
  simCarrier?: string; // e.g. "Jio 4G LTE" or "Airtel"
  simPhoneNumber?: string;
  signalDbm?: number; // e.g. -72 dBm
  batteryPercent?: number; // e.g. 98%
  satellitesCount?: number; // e.g. 9
  lastLatitude?: number;
  lastLongitude?: number;
  lastSpeed?: number;
  lastHeading?: number;
  lastAccuracy?: number;
  lastPacketTime?: string;
  lastRawPacket?: string;
  firmwareVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GpsPacketLog {
  id: string;
  deviceId: string;
  busId?: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  satellites: number;
  battery?: number;
  simStatus?: string;
  rawPayload: string;
  validationStatus: 'valid' | 'invalid' | 'no_fix';
  validationMessage?: string;
}

export interface Bus {
  id: string;
  plateNumber: string;
  busNumber: string;
  capacity: number;
  model: string;
  status: 'active' | 'maintenance' | 'inactive';
  condition?: BusCondition;
  conditionNotes?: string;
  // Brake & Wheel Safety Diagnostics
  brakeCondition?: BrakeCondition;
  brakePadLifePercent?: number;
  brakePressurePsi?: number;
  wheelCondition?: WheelCondition;
  tirePressurePsi?: number;
  tireTreadDepthMm?: number;
  spareWheelPresent?: boolean;
  brakeWheelInspectionDate?: string;
  brakeWheelInspectionNotes?: string;
  manufacturingYear?: number;
  engineNumber?: string;
  chassisNumber?: string;
  fuelType?: 'Electric' | 'CNG' | 'Diesel' | 'Hybrid';
  fuelLevelPercent?: number;
  mileageKm?: number;
  lastServiceDate?: string;
  nextServiceDue?: string;
  features?: string[];
  insuranceExpiry?: string;
  fitnessCertExpiry?: string;
  currentRouteId?: string;
  currentDriverId?: string;
  driverName?: string;
  driverPhone?: string;
  activeTrip?: Trip;
  location?: BusLocation;
  // Real GPS Hardware Tracker Integration Fields
  gpsDeviceId?: string;
  gpsDeviceImei?: string;
  gpsSimStatus?: SimNetworkStatus;
  gpsConnectionStatus?: GpsConnectionStatus;
  lastGpsUpdate?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  createdAt: string;
}

export interface SystemSettings {
  collegeName: string;
  demoMode: boolean;
  lastUpdated: string;
}

export interface Stop {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  address?: string;
  stopOrder?: number;
  scheduledMinutesFromStart?: number;
  createdAt?: string;
}

export interface Route {
  id: string;
  name: string;
  routeNumber: string;
  color: string;
  description: string;
  estimatedDurationMinutes: number;
  morningStartTime: string;
  eveningStartTime: string;
  stops?: Stop[];
  createdAt?: string;
}

export interface Trip {
  id: string;
  busId: string;
  routeId: string;
  driverId: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  currentStopOrder: number;
  nextStopId?: string;
  occupiedSeats: number;
  delayMinutes: number;
  delayReason?: string;
  emergencyAlert?: string;
  bus?: Bus;
  route?: Route;
  location?: BusLocation;
  stopETAs?: Record<string, { distanceKm: number; etaMinutes: number }>;
  createdAt?: string;
}

export interface BusLocation {
  busId: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy?: number;
  timestamp: string;
  isSimulated?: boolean;
  delayMinutes?: number;
  occupiedSeats?: number;
  routeId?: string;
  nextStopId?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent' | 'info';
  targetType: 'all' | 'route' | 'bus';
  targetId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'trip_started' | 'trip_delay' | 'approaching_stop' | 'announcement' | 'emergency' | 'system';
  read: boolean;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  tripId?: string;
  busId?: string;
  category: 'late_bus' | 'driver_behavior' | 'lost_item' | 'cleanliness' | 'other';
  rating: number;
  message: string;
  status: 'pending' | 'resolved';
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface FavouriteStop {
  id: string;
  userId: string;
  routeId: string;
  stopId: string;
  createdAt: string;
}
