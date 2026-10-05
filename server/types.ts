export type UserRole = 'student' | 'staff' | 'driver' | 'admin';
export type UserStatus = 'active' | 'pending_approval' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  collegeId: string;
  department?: string;
  phone?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export type BusCondition = 'excellent' | 'good' | 'fair' | 'needs_service';
export type BrakeCondition = 'excellent' | 'good' | 'fair' | 'needs_attention' | 'critical';
export type WheelCondition = 'excellent' | 'good' | 'fair' | 'needs_replacement';

export interface Bus {
  id: string;
  plateNumber: string;
  busNumber: string;
  capacity: number;
  model: string;
  status: 'active' | 'maintenance' | 'inactive';
  condition: BusCondition;
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
  createdAt: string;
}

export interface Stop {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  address?: string;
  createdAt: string;
}

export interface RouteStop {
  id: string;
  routeId: string;
  stopId: string;
  stopOrder: number;
  scheduledMinutesFromStart: number;
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
  stops?: (Stop & { stopOrder: number; scheduledMinutesFromStart: number })[];
  createdAt: string;
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
  createdAt: string;
}

export interface BusLocation {
  busId: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading: number; // degrees
  accuracy?: number; // meters
  timestamp: string;
  isSimulated?: boolean;
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

export interface PasswordReset {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  used: boolean;
}

export interface DatabaseSchema {
  users: User[];
  buses: Bus[];
  stops: Stop[];
  routes: Route[];
  route_stops: RouteStop[];
  trips: Trip[];
  locations: Record<string, BusLocation>; // keyed by busId
  location_history: (BusLocation & { id: string })[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  feedback: FeedbackItem[];
  favourites: FavouriteStop[];
  password_resets: PasswordReset[];
  settings: {
    collegeName: string;
    demoMode: boolean;
    lastUpdated: string;
  };
}
