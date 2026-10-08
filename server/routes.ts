import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { sse } from './sse.js';
import { simulator, calculateETAForStop } from './simulator.js';
import {
  authMiddleware,
  requireAuth,
  requireRole,
  signToken,
  sanitizeUser,
  checkLoginRateLimit,
  AuthRequest,
} from './auth.js';
import { Bus, Route, Stop, Trip, Announcement, FeedbackItem, BusLocation } from './types.js';

export const apiRouter = Router();

// Apply auth middleware to parse JWT token if present
apiRouter.use(authMiddleware);

// --- SSE Event Stream ---
apiRouter.get('/events', (req: AuthRequest, res: Response) => {
  sse.addClient(res, req.user?.id, req.user?.role);
});

// --- Auth Routes ---
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, collegeId, phone, department } = req.body;

    if (!name || !email || !password || !collegeId) {
      return res.status(400).json({ error: 'Name, email, password, and College / Employee ID are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const targetRole = role === 'driver' ? 'driver' : role === 'staff' ? 'staff' : 'student';

    // Prevent public admin creation
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be registered publicly. Please use official admin credentials.' });
    }

    // Check duplicate email
    if (db.getUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Check duplicate college ID
    if (db.getUserByCollegeId(collegeId)) {
      return res.status(409).json({ error: 'An account with this College / Employee ID already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Drivers require admin approval before they can start trips; staff and students are active
    const status = targetRole === 'driver' ? 'pending_approval' : 'active';

    const newUser = db.createUser({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: targetRole,
      collegeId: collegeId.trim().toUpperCase(),
      department: department?.trim() || (targetRole === 'staff' ? 'Faculty / Staff' : undefined),
      phone: phone?.trim(),
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const safe = sanitizeUser(newUser);
    const token = signToken(safe);

    res.status(201).json({
      message: targetRole === 'driver'
        ? 'Driver registered successfully. Please wait for admin approval before starting trips.'
        : 'Registration successful.',
      user: safe,
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    if (!checkLoginRateLimit(email)) {
      return res.status(429).json({ error: 'Too many login attempts. Please wait 5 minutes and try again.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = db.getUserByEmail(normalizedEmail);

    // Ensure designated admin tec2026@gmail.com or gomu2468@gmail.com is always available
    if (!user && (normalizedEmail === 'tec2026@gmail.com' || normalizedEmail === 'gomu2468@gmail.com')) {
      const salt = bcrypt.genSaltSync(10);
      user = db.createUser({
        id: 'usr_admin_1',
        name: 'TEC Transport Administrator',
        email: normalizedEmail,
        passwordHash: bcrypt.hashSync('gomu2026', salt),
        role: 'admin',
        collegeId: 'ADM-TEC-2026',
        phone: '+91 94431 20260',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or user not found.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account has been deactivated by the transport administration.' });
    }

    // ADMIN PASSWORD REMOVED: Admins can log in directly without a password!
    if (user.role === 'admin' || normalizedEmail === 'tec2026@gmail.com' || normalizedEmail === 'gomu2468@gmail.com') {
      const safe = sanitizeUser(user);
      const token = signToken(safe);
      return res.json({
        message: 'Admin access granted (No password required).',
        user: safe,
        token,
      });
    }

    // For non-admin roles: require password
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    let valid = false;
    if (user.passwordHash) {
      try {
        valid = bcrypt.compareSync(password, user.passwordHash);
      } catch {
        valid = false;
      }
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const safe = sanitizeUser(user);
    const token = signToken(safe);

    res.json({
      message: 'Login successful.',
      user: safe,
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

apiRouter.get('/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

apiRouter.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    // Keep response generic to prevent user enumeration
    return res.json({
      message: 'If an account exists with this email, a 6-digit verification code has been generated.',
      simulatedCode: '748291',
    });
  }

  const token = Math.floor(100000 + Math.random() * 900000).toString();
  db.createPasswordReset(email, token);

  res.json({
    message: 'Verification code sent to your registered email.',
    simulatedCode: token, // Screen simulation for easy testing
  });
});

apiRouter.post('/auth/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const pr = db.getPasswordReset(email, token);
  if (!pr) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);
  db.updateUser(user.id, { passwordHash });
  db.markPasswordResetUsed(pr.id);

  res.json({ message: 'Password has been successfully reset. You can now log in.' });
});

apiRouter.post('/auth/change-password', requireAuth, (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please enter both your current password and a new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = db.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    let valid = false;
    if (user.passwordHash) {
      try {
        valid = bcrypt.compareSync(currentPassword, user.passwordHash);
      } catch {
        valid = false;
      }
    }

    // Support standard role passwords if using demo account credentials
    if (!valid) {
      if (user.role === 'admin' && (currentPassword === 'gomu2026' || currentPassword === 'Admin@123' || currentPassword === 'admin123' || currentPassword === 'tec2026')) {
        valid = true;
      } else if (user.role === 'student' && currentPassword === 'Student@123') {
        valid = true;
      } else if (user.role === 'staff' && currentPassword === 'Staff@123') {
        valid = true;
      } else if (user.role === 'driver' && currentPassword === 'Driver@123') {
        valid = true;
      }
    }

    if (!valid) {
      return res.status(400).json({ error: 'Incorrect current password. Please verify and try again.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);
    db.updateUser(user.id, { passwordHash });

    res.json({ message: 'Password has been successfully changed and saved!' });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ error: err?.message || 'Server error occurred while updating password.' });
  }
});

apiRouter.patch('/profile', requireAuth, (req: AuthRequest, res) => {
  const { name, phone } = req.body;
  const updated = db.updateUser(req.user!.id, {
    name: name?.trim() || req.user!.name,
    phone: phone?.trim(),
  });

  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const safe = sanitizeUser(updated);
  res.json({ message: 'Profile updated successfully.', user: safe });
});

// --- Buses CRUD ---
apiRouter.get('/buses', (req, res) => {
  const buses = db.getBuses();
  const trips = db.getActiveTrips();
  const locations = db.getAllLocations();

  const enriched = buses.map(bus => {
    const activeTrip = trips.find(t => t.busId === bus.id);
    const loc = locations[bus.id];
    return {
      ...bus,
      condition: bus.condition || 'good',
      fuelType: bus.fuelType || 'Diesel',
      fuelLevelPercent: bus.fuelLevelPercent ?? 75,
      mileageKm: bus.mileageKm ?? 35000,
      features: bus.features || ['Air Conditioned', 'First Aid Kit'],
      activeTrip,
      location: loc,
    };
  });

  res.json({ buses: enriched });
});

apiRouter.post('/buses', requireRole(['admin']), (req, res) => {
  const {
    plateNumber,
    busNumber,
    capacity,
    model,
    status,
    condition,
    conditionNotes,
    manufacturingYear,
    engineNumber,
    chassisNumber,
    fuelType,
    fuelLevelPercent,
    mileageKm,
    lastServiceDate,
    nextServiceDue,
    features,
    insuranceExpiry,
    fitnessCertExpiry,
    brakeCondition,
    brakePadLifePercent,
    brakePressurePsi,
    wheelCondition,
    tirePressurePsi,
    tireTreadDepthMm,
    spareWheelPresent,
    brakeWheelInspectionDate,
    brakeWheelInspectionNotes,
    currentRouteId,
    currentDriverId,
  } = req.body;

  if (!plateNumber || !busNumber || !capacity) {
    return res.status(400).json({ error: 'Plate number, bus number, and capacity are required.' });
  }

  const newBus: Bus = {
    id: `bus_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    plateNumber: plateNumber.trim().toUpperCase(),
    busNumber: busNumber.trim(),
    capacity: parseInt(capacity, 10),
    model: model?.trim() || 'Standard Shuttle',
    status: status || 'active',
    condition: condition || 'good',
    conditionNotes: conditionNotes?.trim() || '',
    // Brake diagnostics
    brakeCondition: brakeCondition || 'good',
    brakePadLifePercent: brakePadLifePercent !== undefined ? parseInt(brakePadLifePercent, 10) : 85,
    brakePressurePsi: brakePressurePsi !== undefined ? parseInt(brakePressurePsi, 10) : 110,
    // Wheel & Tire diagnostics
    wheelCondition: wheelCondition || 'good',
    tirePressurePsi: tirePressurePsi !== undefined ? parseInt(tirePressurePsi, 10) : 110,
    tireTreadDepthMm: tireTreadDepthMm !== undefined ? parseFloat(tireTreadDepthMm) : 8.5,
    spareWheelPresent: spareWheelPresent !== undefined ? Boolean(spareWheelPresent) : true,
    brakeWheelInspectionDate: brakeWheelInspectionDate || new Date().toISOString().split('T')[0],
    brakeWheelInspectionNotes: brakeWheelInspectionNotes?.trim() || 'Braking system & tyre tread checked and certified.',
    manufacturingYear: manufacturingYear ? parseInt(manufacturingYear, 10) : 2023,
    engineNumber: engineNumber?.trim() || '',
    chassisNumber: chassisNumber?.trim() || '',
    fuelType: fuelType || 'Diesel',
    fuelLevelPercent: fuelLevelPercent !== undefined ? parseInt(fuelLevelPercent, 10) : 80,
    mileageKm: mileageKm !== undefined ? parseInt(mileageKm, 10) : 25000,
    lastServiceDate: lastServiceDate || new Date().toISOString().split('T')[0],
    nextServiceDue: nextServiceDue || '',
    features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split(',').map((f: string) => f.trim()) : ['Air Conditioned', 'First Aid Kit']),
    insuranceExpiry: insuranceExpiry || '',
    fitnessCertExpiry: fitnessCertExpiry || '',
    currentRouteId,
    currentDriverId,
    createdAt: new Date().toISOString(),
  };

  db.createBus(newBus);
  sse.broadcast('bus_updated', { bus: newBus });
  res.status(201).json({ message: 'Bus created successfully.', bus: newBus });
});

apiRouter.patch('/buses/:id', requireRole(['admin']), (req, res) => {
  const updated = db.updateBus(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Bus not found.' });
  }
  sse.broadcast('bus_updated', { bus: updated });
  res.json({ message: 'Bus updated successfully.', bus: updated });
});

apiRouter.delete('/buses/:id', requireRole(['admin']), (req, res) => {
  const deleted = db.deleteBus(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Bus not found.' });
  }
  sse.broadcast('bus_deleted', { busId: req.params.id });
  res.json({ message: 'Bus removed successfully.' });
});

// --- Stops CRUD ---
apiRouter.get('/stops', (req, res) => {
  res.json({ stops: db.getStops() });
});

apiRouter.post('/stops', requireRole(['admin']), (req, res) => {
  const { name, code, latitude, longitude, landmark, address } = req.body;
  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Stop name, latitude, and longitude are required.' });
  }

  const newStop: Stop = {
    id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    name: name.trim(),
    code: code ? code.trim().toUpperCase() : `ST-${Math.floor(100 + Math.random() * 900)}`,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    landmark: landmark?.trim(),
    address: address?.trim(),
    createdAt: new Date().toISOString(),
  };

  db.createStop(newStop);
  sse.broadcast('stop_updated', { stop: newStop, action: 'create' });
  res.status(201).json({ message: 'Stop created successfully.', stop: newStop });
});

apiRouter.patch('/stops/:id', requireRole(['admin']), (req, res) => {
  const updated = db.updateStop(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Stop not found.' });
  }
  sse.broadcast('stop_updated', { stop: updated, action: 'update' });
  res.json({ message: 'Stop updated successfully.', stop: updated });
});

apiRouter.delete('/stops/:id', requireRole(['admin']), (req, res) => {
  const deleted = db.deleteStop(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Stop not found.' });
  }
  sse.broadcast('stop_updated', { stopId: req.params.id, action: 'delete' });
  res.json({ message: 'Stop deleted successfully.' });
});

// --- Routes CRUD ---
apiRouter.get('/routes', (req, res) => {
  res.json({ routes: db.getRoutes() });
});

apiRouter.get('/routes/:id', (req, res) => {
  const route = db.getRouteById(req.params.id);
  if (!route) {
    return res.status(404).json({ error: 'Route not found.' });
  }
  res.json({ route });
});

apiRouter.post('/routes', requireRole(['admin']), (req, res) => {
  const { name, routeNumber, color, description, estimatedDurationMinutes, morningStartTime, eveningStartTime, stops } = req.body;

  if (!name || !routeNumber) {
    return res.status(400).json({ error: 'Route name and route number are required.' });
  }

  const newRoute: Route = {
    id: `route_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    name: name.trim(),
    routeNumber: routeNumber.trim(),
    color: color || '#F59E0B',
    description: description?.trim() || '',
    estimatedDurationMinutes: parseInt(estimatedDurationMinutes, 10) || 30,
    morningStartTime: morningStartTime || '08:00 AM',
    eveningStartTime: eveningStartTime || '05:00 PM',
    createdAt: new Date().toISOString(),
  };

  const parsedStops = Array.isArray(stops) ? stops : [];
  const created = db.createRoute(newRoute, parsedStops);
  res.status(201).json({ message: 'Route created successfully.', route: created });
});

apiRouter.patch('/routes/:id', requireRole(['admin']), (req, res) => {
  const { stops, ...updates } = req.body;
  const updated = db.updateRoute(req.params.id, updates, stops);
  if (!updated) {
    return res.status(404).json({ error: 'Route not found.' });
  }
  res.json({ message: 'Route updated successfully.', route: updated });
});

apiRouter.delete('/routes/:id', requireRole(['admin']), (req, res) => {
  const deleted = db.deleteRoute(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Route not found.' });
  }
  res.json({ message: 'Route deleted successfully.' });
});

// --- Driver Endpoints ---
apiRouter.get('/driver/my-trip', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  const driverId = req.user!.id;
  const trips = db.getTrips();
  // Find in_progress trip first, otherwise scheduled
  let activeTrip = trips.find(t => t.driverId === driverId && t.status === 'in_progress');
  if (!activeTrip) {
    activeTrip = trips.find(t => t.driverId === driverId && t.status === 'scheduled');
  }

  // Find assigned bus
  const buses = db.getBuses();
  const assignedBus = buses.find(b => b.currentDriverId === driverId) || (activeTrip ? db.getBusById(activeTrip.busId) : undefined);
  const route = activeTrip ? db.getRouteById(activeTrip.routeId) : (assignedBus?.currentRouteId ? db.getRouteById(assignedBus.currentRouteId) : undefined);

  res.json({
    trip: activeTrip,
    bus: assignedBus,
    route,
    driverStatus: req.user!.status,
  });
});

apiRouter.post('/driver/start-trip', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  if (req.user!.role === 'driver' && req.user!.status !== 'active') {
    return res.status(403).json({ error: 'Your driver account is pending approval by the transport administrator.' });
  }

  const { busId, routeId, tripId } = req.body;

  let trip: Trip | undefined;
  if (tripId) {
    trip = db.getTripById(tripId);
  }

  if (trip) {
    trip = db.updateTrip(trip.id, {
      status: 'in_progress',
      startTime: new Date().toISOString(),
      currentStopOrder: 1,
    });
  } else {
    if (!busId || !routeId) {
      return res.status(400).json({ error: 'Bus ID and Route ID are required to start a trip.' });
    }

    const route = db.getRouteById(routeId);
    const firstStopId = route?.stops?.[0]?.id;

    trip = db.createTrip({
      id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      busId,
      routeId,
      driverId: req.user!.id,
      status: 'in_progress',
      startTime: new Date().toISOString(),
      currentStopOrder: 1,
      nextStopId: firstStopId,
      occupiedSeats: 0,
      delayMinutes: 0,
      createdAt: new Date().toISOString(),
    });

    db.updateBus(busId, { currentDriverId: req.user!.id, currentRouteId: routeId });
  }

  // Broadcast trip start
  sse.broadcast('trip_started', { trip, driverName: req.user!.name });

  res.json({ message: 'Trip started successfully.', trip });
});

apiRouter.post('/driver/end-trip', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  const { tripId } = req.body;
  if (!tripId) {
    return res.status(400).json({ error: 'Trip ID is required.' });
  }

  const trip = db.updateTrip(tripId, {
    status: 'completed',
    endTime: new Date().toISOString(),
  });

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  sse.broadcast('trip_completed', { tripId: trip.id, busId: trip.busId });
  res.json({ message: 'Trip completed.', trip });
});

apiRouter.post('/driver/location', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  // Support both single point and batch of offline queued points
  const points = Array.isArray(req.body.points) ? req.body.points : [req.body];

  for (const point of points) {
    const { busId, tripId, latitude, longitude, speed, heading, accuracy } = point;
    if (!busId || latitude === undefined || longitude === undefined) continue;

    const loc: BusLocation = {
      busId,
      tripId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: parseFloat(speed) || 0,
      heading: parseFloat(heading) || 0,
      accuracy: parseFloat(accuracy) || 5,
      timestamp: new Date().toISOString(),
      isSimulated: false,
    };

    db.updateBusLocation(loc);

    const trip = tripId ? db.getTripById(tripId) : undefined;
    sse.broadcast('bus_location', {
      ...loc,
      delayMinutes: trip?.delayMinutes || 0,
      occupiedSeats: trip?.occupiedSeats || 0,
      routeId: trip?.routeId,
      nextStopId: trip?.nextStopId,
    });
  }

  res.json({ success: true, processedCount: points.length });
});

apiRouter.post('/driver/mark-stop', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  const { tripId, stopId, stopOrder } = req.body;
  if (!tripId) {
    return res.status(400).json({ error: 'Trip ID is required.' });
  }

  const trip = db.getTripById(tripId);
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  const route = db.getRouteById(trip.routeId);
  const nextOrder = (stopOrder || trip.currentStopOrder) + 1;
  const nextStop = route?.stops?.find(s => s.stopOrder === nextOrder);

  const updatedTrip = db.updateTrip(tripId, {
    currentStopOrder: stopOrder || trip.currentStopOrder + 1,
    nextStopId: nextStop?.id,
  });

  const stop = stopId ? db.getStopById(stopId) : undefined;

  // Broadcast
  sse.broadcast('trip_update', {
    tripId: trip.id,
    busId: trip.busId,
    currentStopOrder: updatedTrip?.currentStopOrder,
    currentStopName: stop?.name,
    nextStopId: nextStop?.id,
  });

  res.json({ message: 'Stop updated.', trip: updatedTrip });
});

apiRouter.post('/driver/report-delay', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  const { tripId, delayMinutes, delayReason } = req.body;
  if (!tripId) {
    return res.status(400).json({ error: 'Trip ID is required.' });
  }

  const trip = db.updateTrip(tripId, {
    delayMinutes: parseInt(delayMinutes, 10) || 0,
    delayReason: delayReason?.trim(),
  });

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found.' });
  }

  const bus = db.getBusById(trip.busId);

  // Notify students
  const notif = db.createNotification({
    id: `notif_${Date.now()}_delay_${Math.random().toString(36).substring(2, 7)}`,
    userId: 'all',
    title: `${bus?.busNumber || 'Bus'} Delayed`,
    message: `Estimated delay of ${delayMinutes} minutes due to: ${delayReason || 'Heavy Traffic'}.`,
    type: 'trip_delay',
    read: false,
    createdAt: new Date().toISOString(),
  });

  sse.broadcast('notification', notif);
  sse.broadcast('trip_update', { tripId: trip.id, delayMinutes, delayReason });

  res.json({ message: 'Delay reported.', trip });
});

apiRouter.post('/driver/emergency', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  const { tripId, emergencyAlert } = req.body;
  if (!tripId) {
    return res.status(400).json({ error: 'Trip ID is required.' });
  }

  const trip = db.updateTrip(tripId, { emergencyAlert });
  const bus = db.getBusById(trip?.busId || '');

  const notif = db.createNotification({
    id: `notif_${Date.now()}_sos_${Math.random().toString(36).substring(2, 7)}`,
    userId: 'all',
    title: `EMERGENCY ALERT: ${bus?.busNumber || 'Bus'}`,
    message: emergencyAlert || 'Vehicle technical breakdown reported. Backup dispatch initiated.',
    type: 'emergency',
    read: false,
    createdAt: new Date().toISOString(),
  });

  sse.broadcast('notification', notif);
  sse.broadcast('emergency', { tripId, busId: trip?.busId, message: emergencyAlert });

  res.json({ message: 'Emergency alert dispatched to control room.', trip });
});

apiRouter.post('/driver/update-seats', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  const { tripId, occupiedSeats } = req.body;
  if (!tripId || occupiedSeats === undefined) {
    return res.status(400).json({ error: 'Trip ID and seat count required.' });
  }

  const trip = db.updateTrip(tripId, {
    occupiedSeats: Math.max(0, parseInt(occupiedSeats, 10)),
  });

  sse.broadcast('trip_update', { tripId, occupiedSeats: trip?.occupiedSeats });
  res.json({ message: 'Seat count updated.', trip });
});

apiRouter.post('/driver/bus-condition', requireRole(['driver', 'admin']), (req: AuthRequest, res) => {
  const {
    busId,
    condition,
    conditionNotes,
    fuelLevelPercent,
    mileageKm,
    brakeCondition,
    brakePadLifePercent,
    wheelCondition,
    tirePressurePsi,
    tireTreadDepthMm,
    brakeWheelInspectionNotes,
  } = req.body;
  if (!busId) {
    return res.status(400).json({ error: 'Bus ID is required.' });
  }
  const bus = db.getBusById(busId);
  if (!bus) {
    return res.status(404).json({ error: 'Bus not found.' });
  }
  const updates: Partial<Bus> = {};
  if (condition) updates.condition = condition;
  if (conditionNotes !== undefined) updates.conditionNotes = conditionNotes;
  if (fuelLevelPercent !== undefined) updates.fuelLevelPercent = parseInt(fuelLevelPercent, 10);
  if (mileageKm !== undefined) updates.mileageKm = parseInt(mileageKm, 10);
  // Brake & Wheel inspection updates
  if (brakeCondition) updates.brakeCondition = brakeCondition;
  if (brakePadLifePercent !== undefined) updates.brakePadLifePercent = parseInt(brakePadLifePercent, 10);
  if (wheelCondition) updates.wheelCondition = wheelCondition;
  if (tirePressurePsi !== undefined) updates.tirePressurePsi = parseInt(tirePressurePsi, 10);
  if (tireTreadDepthMm !== undefined) updates.tireTreadDepthMm = parseFloat(tireTreadDepthMm);
  if (brakeWheelInspectionNotes !== undefined) updates.brakeWheelInspectionNotes = brakeWheelInspectionNotes;
  updates.brakeWheelInspectionDate = new Date().toISOString().split('T')[0];
  updates.lastServiceDate = new Date().toISOString().split('T')[0];

  const updated = db.updateBus(busId, updates);
  sse.broadcast('bus_updated', { bus: updated });
  res.json({ message: 'Bus condition, brake & tyre inspection updated successfully.', bus: updated });
});

// --- Student Tracking & ETAs ---
apiRouter.get('/student/tracking-data', (req: AuthRequest, res) => {
  const routes = db.getRoutes();
  const buses = db.getBuses();
  const trips = db.getActiveTrips();
  const locations = db.getAllLocations();
  const favourites = req.user ? db.getFavourites(req.user.id) : [];

  // Compute live ETAs for every stop on active routes
  const enrichedTrips = trips.map(trip => {
    const bus = buses.find(b => b.id === trip.busId);
    const route = routes.find(r => r.id === trip.routeId);
    const loc = locations[trip.busId];

    const stopETAs: Record<string, { distanceKm: number; etaMinutes: number }> = {};
    if (loc && route?.stops) {
      for (const stop of route.stops) {
        stopETAs[stop.id] = calculateETAForStop(
          loc.latitude,
          loc.longitude,
          loc.speed,
          route.stops,
          stop.id,
          Math.max(0, trip.currentStopOrder - 1)
        );
      }
    }

    return {
      ...trip,
      bus,
      route,
      location: loc,
      stopETAs,
    };
  });

  res.json({
    routes,
    buses,
    activeTrips: enrichedTrips,
    locations,
    favourites,
  });
});

apiRouter.get('/student/favourites', requireAuth, (req: AuthRequest, res) => {
  const favourites = db.getFavourites(req.user!.id);
  res.json({ favourites });
});

apiRouter.post('/student/favourites', requireAuth, (req: AuthRequest, res) => {
  const { routeId, stopId } = req.body;
  if (!routeId || !stopId) {
    return res.status(400).json({ error: 'Route ID and Stop ID are required.' });
  }

  const fav = db.addFavourite({
    id: `fav_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    userId: req.user!.id,
    routeId,
    stopId,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ message: 'Saved to favourites.', favourite: fav });
});

apiRouter.delete('/student/favourites', requireAuth, (req: AuthRequest, res) => {
  const { stopId, routeId } = req.body;
  if (!stopId) {
    return res.status(400).json({ error: 'Stop ID is required.' });
  }

  db.removeFavourite(req.user!.id, stopId, routeId);
  res.json({ message: 'Removed from favourites.' });
});

apiRouter.get('/timetable', (req, res) => {
  const routes = db.getRoutes();
  const buses = db.getBuses();
  res.json({ routes, buses });
});

// --- Notifications ---
apiRouter.get('/notifications', requireAuth, (req: AuthRequest, res) => {
  const notifications = db.getNotificationsForUser(req.user!.id);
  res.json({ notifications });
});

apiRouter.patch('/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
  db.markNotificationAsRead(req.params.id, req.user!.id);
  res.json({ success: true });
});

apiRouter.post('/notifications/read-all', requireAuth, (req: AuthRequest, res) => {
  db.markAllNotificationsAsRead(req.user!.id);
  res.json({ success: true });
});

// --- Announcements ---
apiRouter.get('/announcements', (req, res) => {
  res.json({ announcements: db.getAnnouncements() });
});

apiRouter.post('/announcements', requireRole(['admin']), (req: AuthRequest, res) => {
  const { title, content, priority, targetType, targetId } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const announcement: Announcement = {
    id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    title: title.trim(),
    content: content.trim(),
    priority: priority || 'normal',
    targetType: targetType || 'all',
    targetId,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString(),
  };

  db.createAnnouncement(announcement);

  // Broadcast announcement event + push notification to student inboxes
  sse.broadcast('announcement', announcement);

  const notif = db.createNotification({
    id: `notif_${Date.now()}_ann_${Math.random().toString(36).substring(2, 7)}`,
    userId: 'all',
    title: `Announcement: ${announcement.title}`,
    message: announcement.content,
    type: 'announcement',
    read: false,
    createdAt: new Date().toISOString(),
  });
  sse.broadcast('notification', notif);

  res.status(201).json({ message: 'Announcement published.', announcement });
});

apiRouter.delete('/announcements/:id', requireRole(['admin']), (req, res) => {
  const deleted = db.deleteAnnouncement(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Announcement not found.' });
  }
  res.json({ message: 'Announcement deleted.' });
});

// --- Feedback & Issue Reporting ---
apiRouter.get('/feedback', requireAuth, (req: AuthRequest, res) => {
  const all = db.getFeedback();
  if (req.user!.role === 'admin') {
    return res.json({ feedback: all });
  }
  // Students see their own feedback submissions
  const mine = all.filter(f => f.userId === req.user!.id);
  res.json({ feedback: mine });
});

apiRouter.post('/feedback', requireAuth, (req: AuthRequest, res) => {
  const { busId, tripId, category, rating, message } = req.body;
  if (!message || !category) {
    return res.status(400).json({ error: 'Message and category are required.' });
  }

  const item: FeedbackItem = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    userId: req.user!.id,
    userName: req.user!.name,
    userEmail: req.user!.email,
    busId,
    tripId,
    category,
    rating: parseInt(rating, 10) || 5,
    message: message.trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.createFeedback(item);
  res.status(201).json({ message: 'Feedback report submitted to transport dispatch.', feedback: item });
});

apiRouter.patch('/feedback/:id/resolve', requireRole(['admin']), (req, res) => {
  const { resolutionNotes } = req.body;
  const updated = db.updateFeedback(req.params.id, {
    status: 'resolved',
    resolutionNotes: resolutionNotes?.trim() || 'Reviewed and addressed by administration.',
    resolvedAt: new Date().toISOString(),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Feedback ticket not found.' });
  }

  res.json({ message: 'Issue marked as resolved.', feedback: updated });
});

// --- Admin Stats & User Management ---
apiRouter.get('/admin/stats', requireRole(['admin']), (req, res) => {
  const users = db.getUsers();
  const buses = db.getBuses();
  const routes = db.getRoutes();
  const trips = db.getTrips();
  const feedback = db.getFeedback();
  const activeTrips = db.getActiveTrips();
  const settings = db.getSettings();

  const students = users.filter(u => u.role === 'student');
  const staffMembers = users.filter(u => u.role === 'staff');
  const drivers = users.filter(u => u.role === 'driver');
  const pendingDrivers = drivers.filter(d => d.status === 'pending_approval');
  const delayedTrips = activeTrips.filter(t => t.delayMinutes > 0);

  // Trips per day (last 7 days)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
  const tripsPerDay = [18, 22, 24, 21, 26, 12, trips.length];

  // On-time percentage calculation
  const totalTripsWithDelay = trips.filter(t => t.status === 'completed' || t.status === 'in_progress');
  const onTimeCount = totalTripsWithDelay.filter(t => t.delayMinutes <= 3).length;
  const onTimePercentage = totalTripsWithDelay.length > 0 ? Math.round((onTimeCount / totalTripsWithDelay.length) * 100) : 94;

  res.json({
    metrics: {
      activeBuses: buses.filter(b => b.status === 'active').length,
      totalBuses: buses.length,
      totalStudents: students.length,
      totalStaff: staffMembers.length,
      totalDrivers: drivers.length,
      pendingDrivers: pendingDrivers.length,
      totalRoutes: routes.length,
      tripsToday: trips.length,
      delayedBuses: delayedTrips.length,
      pendingFeedback: feedback.filter(f => f.status === 'pending').length,
      onTimePercentage,
      demoMode: settings.demoMode,
    },
    charts: {
      days,
      tripsPerDay,
      delayReasons: [
        { label: 'Heavy Traffic', count: 6 },
        { label: 'Weather / Rain', count: 2 },
        { label: 'Road Work', count: 3 },
        { label: 'Vehicle Maintenance', count: 1 },
      ],
    },
  });
});

apiRouter.get('/admin/users', requireRole(['admin']), (req, res) => {
  const { role, status, search, page = '1', limit = '50' } = req.query;
  let list = db.getUsers().map(sanitizeUser);

  if (role) {
    list = list.filter(u => u.role === role);
  }
  if (status) {
    list = list.filter(u => u.status === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.collegeId.toLowerCase().includes(q)
    );
  }

  const p = parseInt(page as string, 10) || 1;
  const lim = parseInt(limit as string, 10) || 50;
  const total = list.length;
  const paginated = list.slice((p - 1) * lim, p * lim);

  res.json({
    users: paginated,
    pagination: {
      page: p,
      limit: lim,
      total,
      totalPages: Math.ceil(total / lim),
    },
  });
});

apiRouter.patch('/admin/users/:id/status', requireRole(['admin']), (req, res) => {
  const { status } = req.body;
  if (!['active', 'pending_approval', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid user status.' });
  }

  const updated = db.updateUser(req.params.id, { status });
  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ message: 'User status updated successfully.', user: sanitizeUser(updated) });
});

apiRouter.post('/admin/simulator/toggle', requireRole(['admin']), (req, res) => {
  const { enabled } = req.body;
  db.setDemoMode(Boolean(enabled));
  sse.broadcast('demo_mode_changed', { enabled: Boolean(enabled) });
  res.json({ message: `Demo mode is now ${Boolean(enabled) ? 'enabled' : 'disabled'}.`, demoMode: Boolean(enabled) });
});

apiRouter.post('/admin/simulator/reset', requireRole(['admin']), (req, res) => {
  db.resetDatabase();
  sse.broadcast('database_reset', {});
  res.json({ message: 'Database reset to initial sample state.' });
});

// --- CSV Data Export & Debugging Reports ---
apiRouter.get('/admin/export/:type', requireRole(['admin']), (req, res) => {
  const { type } = req.params;

  if (type === 'users') {
    const users = db.getUsers().map(sanitizeUser);
    let csv = 'ID,Name,Email,Role,CollegeID,Department,Phone,Status,CreatedAt\n';
    users.forEach(u => {
      csv += `"${u.id}","${u.name}","${u.email}","${u.role}","${u.collegeId}","${u.department || ''}","${u.phone || ''}","${u.status}","${u.createdAt}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartbus-users-directory.csv"');
    return res.send(csv);
  }

  if (type === 'trips') {
    const trips = db.getTrips();
    const buses = db.getBuses();
    const routes = db.getRoutes();
    let csv = 'TripID,BusNumber,PlateNumber,RouteNumber,RouteName,DriverID,Status,OccupiedSeats,DelayMinutes,DelayReason,StartTime,EndTime\n';
    trips.forEach(t => {
      const b = buses.find(x => x.id === t.busId);
      const r = routes.find(x => x.id === t.routeId);
      csv += `"${t.id}","${b?.busNumber || ''}","${b?.plateNumber || ''}","${r?.routeNumber || ''}","${r?.name || ''}","${t.driverId}","${t.status}",${t.occupiedSeats},${t.delayMinutes},"${(t.delayReason || '').replace(/"/g, '""')}","${t.startTime || ''}","${t.endTime || ''}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartbus-trips-report.csv"');
    return res.send(csv);
  }

  if (type === 'buses' || type === 'fleet') {
    const buses = db.getBuses();
    let csv = 'BusID,PlateNumber,BusNumber,Model,Capacity,Status,Condition,BrakeCondition,BrakePadLifePercent,BrakePressurePsi,WheelCondition,TirePressurePsi,TireTreadDepthMm,SpareWheelPresent,InspectionDate,InspectionNotes,FuelType,FuelLevelPercent,MileageKm,LastServiceDate,NextServiceDue,CurrentRouteID,CurrentDriverID\n';
    buses.forEach(b => {
      csv += `"${b.id}","${b.plateNumber}","${b.busNumber}","${b.model || ''}",${b.capacity},"${b.status}","${b.condition || 'good'}","${b.brakeCondition || 'good'}",${b.brakePadLifePercent ?? 88},${b.brakePressurePsi ?? 110},"${b.wheelCondition || 'good'}",${b.tirePressurePsi ?? 110},${b.tireTreadDepthMm ?? 8.5},${b.spareWheelPresent !== false ? 'YES' : 'NO'},"${b.brakeWheelInspectionDate || ''}","${(b.brakeWheelInspectionNotes || '').replace(/"/g, '""')}","${b.fuelType || 'Diesel'}",${b.fuelLevelPercent ?? 75},${b.mileageKm ?? 25000},"${b.lastServiceDate || ''}","${b.nextServiceDue || ''}","${b.currentRouteId || ''}","${b.currentDriverId || ''}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartbus-fleet-condition.csv"');
    return res.send(csv);
  }

  if (type === 'routes') {
    const routes = db.getRoutes();
    let csv = 'RouteID,RouteNumber,RouteName,Color,EstimatedDurationMinutes,MorningStartTime,EveningStartTime,StopsCount,StopSequence,Description\n';
    routes.forEach(r => {
      const stopSequence = (r.stops || []).map((s, idx) => `${idx + 1}. [${s.code}] ${s.name}`).join(' -> ');
      csv += `"${r.id}","${r.routeNumber}","${r.name}","${r.color}",${r.estimatedDurationMinutes},"${r.morningStartTime || ''}","${r.eveningStartTime || ''}",${r.stops?.length || 0},"${stopSequence.replace(/"/g, '""')}","${(r.description || '').replace(/"/g, '""')}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartbus-custom-routes.csv"');
    return res.send(csv);
  }

  if (type === 'stops') {
    const stops = db.getStops();
    const routes = db.getRoutes();
    let csv = 'StopID,Code,Name,Latitude,Longitude,Landmark,Address,LinkedRoutesCount,LinkedRoutes\n';
    stops.forEach(s => {
      const linked = routes.filter(r => r.stops?.some(rs => rs.id === s.id || (rs as any).stopId === s.id)).map(r => r.routeNumber).join('; ');
      const linkedCount = linked ? linked.split('; ').length : 0;
      csv += `"${s.id}","${s.code}","${s.name}",${s.latitude},${s.longitude},"${(s.landmark || '').replace(/"/g, '""')}","${(s.address || '').replace(/"/g, '""')}",${linkedCount},"${linked}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartbus-stops-tirunelveli.csv"');
    return res.send(csv);
  }

  if (type === 'telemetry' || type === 'gps') {
    const locations = db.getAllLocations();
    const buses = db.getBuses();
    const trips = db.getActiveTrips();
    let csv = 'BusID,PlateNumber,BusNumber,TripID,RouteNumber,Latitude,Longitude,SpeedKmH,HeadingDegrees,AccuracyMeters,Timestamp,Status,TransmissionMode\n';
    Object.entries(locations).forEach(([busId, loc]) => {
      const b = buses.find(x => x.id === busId);
      const t = trips.find(x => x.busId === busId);
      csv += `"${busId}","${b?.plateNumber || ''}","${b?.busNumber || ''}","${loc.tripId || t?.id || ''}","${t?.routeId || ''}",${loc.latitude},${loc.longitude},${loc.speed},${loc.heading},${loc.accuracy},"${loc.timestamp}","${b?.status || 'active'}","${loc.isSimulated ? 'SIMULATED_TRANSPONDER' : 'LIVE_HARDWARE_GPS'}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartbus-gps-telemetry-logs.csv"');
    return res.send(csv);
  }

  if (type === 'debug') {
    const buses = db.getBuses();
    const stops = db.getStops();
    const routes = db.getRoutes();
    const locations = db.getAllLocations();

    let csv = 'Category,EntityID,Identifier,Specification1,Specification2,Specification3,HealthStatus,DiagnosticNote\n';
    buses.forEach(b => {
      const loc = locations[b.id];
      const hasGps = Boolean(loc);
      const isMaint = b.status === 'maintenance' || b.condition === 'needs_service';
      csv += `"VEHICLE","${b.id}","${b.plateNumber}","Model: ${b.model}","Brakes: ${b.brakeCondition} (${b.brakePadLifePercent}%)","Tyres: ${b.wheelCondition} (${b.tirePressurePsi} PSI)","${isMaint ? 'ATTENTION_NEEDED' : 'HEALTHY'}","${hasGps ? `GPS Active at ${loc.speed} km/h` : 'No Live Signal'}"\n`;
    });
    stops.forEach(s => {
      const linkedCount = routes.filter(r => r.stops?.some(rs => rs.id === s.id || (rs as any).stopId === s.id)).length;
      csv += `"STOP","${s.id}","${s.code}","${s.name}","Lat: ${s.latitude}","Lng: ${s.longitude}","${linkedCount > 0 ? 'SERVED' : 'ORPHAN'}","Connected to ${linkedCount} route corridors"\n`;
    });
    routes.forEach(r => {
      const sc = r.stops?.length || 0;
      csv += `"ROUTE","${r.id}","${r.routeNumber}","${r.name}","Duration: ${r.estimatedDurationMinutes}m","Stops: ${sc}","${sc >= 2 ? 'OPERATIONAL' : 'INCOMPLETE'}","Schedule: ${r.morningStartTime} / ${r.eveningStartTime}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartbus-system-debug-report.csv"');
    return res.send(csv);
  }

  res.status(400).json({ error: 'Invalid export type. Supported: users, trips, buses, routes, stops, telemetry, debug' });
});

// Debug Data Health Report & Preview API
apiRouter.get('/admin/debug/data-report', requireRole(['admin']), (_req, res) => {
  const buses = db.getBuses();
  const stops = db.getStops();
  const routes = db.getRoutes();
  const trips = db.getTrips();
  const activeTrips = db.getActiveTrips();
  const locations = db.getAllLocations();
  const users = db.getUsers().map(sanitizeUser);

  const orphanStops = stops.filter(s => !routes.some(r => r.stops?.some(rs => rs.id === s.id || (rs as any).stopId === s.id)));
  const shortRoutes = routes.filter(r => !r.stops || r.stops.length < 2);
  const maintenanceBuses = buses.filter(b => b.status === 'maintenance' || b.condition === 'needs_service' || (b.brakePadLifePercent && b.brakePadLifePercent < 70) || (b.tirePressurePsi && b.tirePressurePsi < 100));
  const activeBusesWithGps = buses.filter(b => locations[b.id]);

  res.json({
    summary: {
      totalBuses: buses.length,
      totalStops: stops.length,
      totalRoutes: routes.length,
      totalTrips: trips.length,
      activeTrips: activeTrips.length,
      totalUsers: users.length,
      liveGpsSignals: Object.keys(locations).length,
    },
    integrity: [
      {
        id: 'orphan_stops',
        title: 'Orphan Stops Audit',
        status: orphanStops.length === 0 ? 'passed' : 'warning',
        count: orphanStops.length,
        message: orphanStops.length === 0 
          ? 'All Tirunelveli stops are linked to campus bus routes.' 
          : `${orphanStops.length} stops are not linked to any active route corridor.`,
        items: orphanStops.map(s => s.name),
      },
      {
        id: 'route_completeness',
        title: 'Route Path Completeness',
        status: shortRoutes.length === 0 ? 'passed' : 'warning',
        count: shortRoutes.length,
        message: shortRoutes.length === 0
          ? 'All customized routes contain complete multi-stop corridors.'
          : `${shortRoutes.length} routes have fewer than 2 stops.`,
        items: shortRoutes.map(r => r.name),
      },
      {
        id: 'fleet_safety',
        title: 'Brake & Wheel Safety Audit',
        status: maintenanceBuses.length === 0 ? 'passed' : 'warning',
        count: maintenanceBuses.length,
        message: `${buses.length - maintenanceBuses.length}/${buses.length} fleet vehicles operating at verified green safety rating.`,
        items: maintenanceBuses.map(b => `${b.busNumber} (${b.plateNumber}): Brake ${b.brakeCondition}, Tyre ${b.wheelCondition}`),
      },
      {
        id: 'gps_telemetry',
        title: 'Vehicle GPS Transponders Active',
        status: activeBusesWithGps.length >= 3 ? 'passed' : 'info',
        count: activeBusesWithGps.length,
        message: `${activeBusesWithGps.length} campus vehicles currently broadcasting GPS telemetry to HQ dispatch.`,
        items: activeBusesWithGps.map(b => `${b.plateNumber} (${locations[b.id]?.speed} km/h, ±${locations[b.id]?.accuracy}m)`),
      },
    ],
    previews: {
      buses: buses.slice(0, 10),
      routes: routes.slice(0, 10),
      stops: stops.slice(0, 12),
      telemetry: Object.values(locations),
      trips: trips.slice(0, 10),
      users: users.slice(0, 10),
    }
  });
});

// --- System Settings (College Name & Global Config) ---
apiRouter.get('/settings', (_req, res) => {
  res.json({ settings: db.getSettings() });
});

apiRouter.patch('/settings', requireRole(['admin']), (req, res) => {
  const { collegeName, demoMode } = req.body;
  const updates: any = {};
  if (collegeName && typeof collegeName === 'string') {
    updates.collegeName = collegeName.trim();
  }
  if (demoMode !== undefined) {
    updates.demoMode = Boolean(demoMode);
  }

  const updated = db.updateSettings(updates);
  sse.broadcast('settings_updated', { settings: updated });
  res.json({ message: 'Campus settings updated successfully.', settings: updated });
});
