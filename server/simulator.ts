import { db } from './db.js';
import { sse } from './sse.js';
import { BusLocation, Stop } from './types.js';

// Calculate Haversine distance in kilometers
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate bearing in degrees
export function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Calculate ETA for a stop along a route given current bus position
export function calculateETAForStop(
  currentLat: number,
  currentLng: number,
  currentSpeedKmH: number,
  routeStops: (Stop & { stopOrder: number })[],
  targetStopId: string,
  currentStopIndex: number
): { distanceKm: number; etaMinutes: number } {
  const targetIndex = routeStops.findIndex(s => s.id === targetStopId);
  if (targetIndex === -1 || targetIndex < currentStopIndex) {
    return { distanceKm: 0, etaMinutes: 0 };
  }

  const speed = currentSpeedKmH > 10 ? currentSpeedKmH : 30; // default to 30km/h if idling

  // Distance from current location to immediate next stop
  const nextStop = routeStops[currentStopIndex];
  if (!nextStop) return { distanceKm: 0, etaMinutes: 0 };

  let totalDistanceKm = getDistanceKm(currentLat, currentLng, nextStop.latitude, nextStop.longitude);

  // Sum distances between subsequent stops up to targetStop
  for (let i = currentStopIndex; i < targetIndex; i++) {
    const fromStop = routeStops[i];
    const toStop = routeStops[i + 1];
    if (fromStop && toStop) {
      totalDistanceKm += getDistanceKm(fromStop.latitude, fromStop.longitude, toStop.latitude, toStop.longitude);
    }
  }

  // Dwell time: 45 seconds per intermediate stop
  const intermediateStopsCount = Math.max(0, targetIndex - currentStopIndex);
  const travelMinutes = (totalDistanceKm / speed) * 60;
  const dwellMinutes = intermediateStopsCount * 0.75;
  const etaMinutes = Math.round(travelMinutes + dwellMinutes);

  return {
    distanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    etaMinutes: Math.max(1, etaMinutes),
  };
}

class BusSimulator {
  private timer: NodeJS.Timeout | null = null;
  private busProgress: Map<string, { segmentIndex: number; t: number; direction: 1 | -1; dwellTicks: number }> = new Map();

  public start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick();
    }, 3000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    const settings = db.getSettings();
    const activeTrips = db.getActiveTrips();
    const routes = db.getRoutes();
    const now = new Date();

    // 1. Check for Signal Lost (> 60s without GPS) for all active buses
    const allLocations = db.getAllLocations();
    for (const [busId, loc] of Object.entries(allLocations)) {
      if (!loc.isSimulated) {
        const timeDiffSeconds = (now.getTime() - new Date(loc.timestamp).getTime()) / 1000;
        if (timeDiffSeconds > 60) {
          sse.broadcast('signal_lost', {
            busId,
            tripId: loc.tripId,
            lastSeen: loc.timestamp,
            message: `Bus signal lost for bus ${busId} (${Math.round(timeDiffSeconds)}s elapsed)`,
          });
        }
      }
    }

    // 2. If Demo Mode is enabled, simulate active buses moving along their assigned route
    if (!settings.demoMode) return;

    for (const trip of activeTrips) {
      const route = routes.find(r => r.id === trip.routeId);
      if (!route || !route.stops || route.stops.length < 2) continue;

      const stops = route.stops;
      let state = this.busProgress.get(trip.busId);

      if (!state) {
        state = { segmentIndex: 0, t: 0, direction: 1, dwellTicks: 0 };
        this.busProgress.set(trip.busId, state);
      }

      // If dwelling at a stop
      if (state.dwellTicks > 0) {
        state.dwellTicks--;
        // While stopped, speed is 0
        const currentStop = stops[state.segmentIndex];
        if (currentStop) {
          const loc: BusLocation = {
            busId: trip.busId,
            tripId: trip.id,
            latitude: currentStop.latitude,
            longitude: currentStop.longitude,
            speed: 0,
            heading: 0,
            accuracy: 4,
            timestamp: now.toISOString(),
            isSimulated: true,
          };
          db.updateBusLocation(loc);
          sse.broadcast('bus_location', { ...loc, delayMinutes: trip.delayMinutes, occupiedSeats: trip.occupiedSeats });
        }
        continue;
      }

      // Advance t (0 to 1) along current segment
      const fromStop = stops[state.segmentIndex];
      const toStop = stops[state.segmentIndex + state.direction];

      if (!fromStop || !toStop) {
        // Reverse direction at terminal stops
        state.direction = (state.direction * -1) as 1 | -1;
        state.segmentIndex = state.direction === 1 ? 0 : stops.length - 1;
        continue;
      }

      // Segment distance
      const segmentDistance = getDistanceKm(fromStop.latitude, fromStop.longitude, toStop.latitude, toStop.longitude);
      // Realistic speed: 30 - 45 km/h -> in 3 seconds travels ~ (35 / 3600) * 3 = 0.029 km
      const speedKmH = 32 + Math.floor(Math.sin(Date.now() / 10000) * 8);
      const stepKm = (speedKmH / 3600) * 3;
      const dt = Math.max(0.04, Math.min(0.25, stepKm / (segmentDistance || 0.5)));

      state.t += dt;

      if (state.t >= 1) {
        // Reached next stop!
        state.t = 0;
        state.segmentIndex += state.direction;
        state.dwellTicks = 2; // Dwell for 2 ticks (~6 seconds)

        const reachedStop = stops[state.segmentIndex];
        const nextTargetStop = stops[state.segmentIndex + state.direction] || stops[state.segmentIndex];

        // Randomly simulate 1-3 passengers boarding or alighting
        const bus = db.getBusById(trip.busId);
        const maxCapacity = bus?.capacity || 40;
        const seatChange = Math.floor(Math.random() * 5) - 2;
        const newOccupied = Math.max(5, Math.min(maxCapacity, trip.occupiedSeats + seatChange));

        db.updateTrip(trip.id, {
          currentStopOrder: state.segmentIndex + 1,
          nextStopId: nextTargetStop.id,
          occupiedSeats: newOccupied,
        });

        // Trigger notification when bus is approaching key stops
        if (state.segmentIndex === 2 || state.segmentIndex === 4) {
          const notif = db.createNotification({
            id: `notif_${Date.now()}_${trip.busId}_${Math.random().toString(36).substring(2, 7)}`,
            userId: 'all',
            title: `${bus?.busNumber || 'Bus'} Approaching`,
            message: `Bus is now arriving at ${reachedStop.name}.`,
            type: 'approaching_stop',
            read: false,
            createdAt: now.toISOString(),
          });
          sse.broadcast('notification', notif);
        }

        sse.broadcast('trip_update', {
          tripId: trip.id,
          busId: trip.busId,
          currentStopOrder: state.segmentIndex + 1,
          currentStopName: reachedStop.name,
          nextStopId: nextTargetStop.id,
          occupiedSeats: newOccupied,
        });

        // Check if reached end of line
        if (
          (state.direction === 1 && state.segmentIndex >= stops.length - 1) ||
          (state.direction === -1 && state.segmentIndex <= 0)
        ) {
          state.direction = (state.direction * -1) as 1 | -1;
        }
      }

      // Linear interpolation between fromStop and toStop
      const currentLat = fromStop.latitude + (toStop.latitude - fromStop.latitude) * state.t;
      const currentLng = fromStop.longitude + (toStop.longitude - fromStop.longitude) * state.t;
      const heading = getBearing(fromStop.latitude, fromStop.longitude, toStop.latitude, toStop.longitude);

      const loc: BusLocation = {
        busId: trip.busId,
        tripId: trip.id,
        latitude: parseFloat(currentLat.toFixed(6)),
        longitude: parseFloat(currentLng.toFixed(6)),
        speed: speedKmH,
        heading: Math.round(heading),
        accuracy: 5,
        timestamp: now.toISOString(),
        isSimulated: true,
      };

      db.updateBusLocation(loc);

      sse.broadcast('bus_location', {
        ...loc,
        delayMinutes: trip.delayMinutes,
        occupiedSeats: trip.occupiedSeats,
        routeId: trip.routeId,
        nextStopId: toStop.id,
      });
    }
  }
}

export const simulator = new BusSimulator();
