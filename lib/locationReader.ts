// ============================================================================
// Location Reader - Reads location data from JSONL file
// ============================================================================

import { readFileSync } from 'fs';
import { SCHOOL_LOCATIONS, Location } from '@/types';

const LOCATIONS_FILE = process.env.LOCATIONS_FILE_PATH;

export interface RawLocationData {
  loc: string; // "lat,lng"
  acc?: number;
  time?: string;
  ts?: string;
}

export interface ParsedLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string;
}

// ----------------------------------------------------------------------------
// Read latest location from JSONL file
// ----------------------------------------------------------------------------
export function getLatestLocation(): ParsedLocation | null {
  if (!LOCATIONS_FILE) {
    console.warn('LOCATIONS_FILE_PATH environment variable not set');
    return null;
  }

  try {
    const file = readFileSync(LOCATIONS_FILE, 'utf-8');
    const lines = file.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return null;
    
    const lastLine = lines[lines.length - 1];
    const data: RawLocationData = JSON.parse(lastLine);
    
    // Parse "lat,lng" format
    const [lat, lng] = data.loc.split(',').map(Number);
    
    return {
      lat,
      lng,
      accuracy: data.acc,
      timestamp: data.ts || data.time || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to read location:', error);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Calculate distance between two coordinates (Haversine formula)
// ----------------------------------------------------------------------------
export function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ----------------------------------------------------------------------------
// Determine which school location user is at
// ----------------------------------------------------------------------------
export function determineLocation(lat: number, lng: number): Location | null {
  for (const loc of SCHOOL_LOCATIONS) {
    const distance = getDistanceFromLatLonInMeters(lat, lng, loc.lat, loc.lng);
    if (distance <= loc.radius) {
      return loc;
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Get all location history (last N entries)
// ----------------------------------------------------------------------------
export function getLocationHistory(limit: number = 10): ParsedLocation[] {
  if (!LOCATIONS_FILE) {
    console.warn('LOCATIONS_FILE_PATH environment variable not set');
    return [];
  }

  try {
    const file = readFileSync(LOCATIONS_FILE, 'utf-8');
    const lines = file.trim().split('\n').filter(line => line.trim());
    
    return lines
      .slice(-limit)
      .map(line => {
        try {
          const data: RawLocationData = JSON.parse(line);
          const [lat, lng] = data.loc.split(',').map(Number);
          return {
            lat,
            lng,
            accuracy: data.acc,
            timestamp: data.ts || data.time || new Date().toISOString(),
          } as ParsedLocation;
        } catch {
          return null;
        }
      })
      .filter((loc): loc is ParsedLocation => loc !== null);
  } catch (error) {
    console.error('Failed to read location history:', error);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Check if user has visited all 5 locations recently
// ----------------------------------------------------------------------------
export function getVisitedLocations(historyLimit: number = 100): string[] {
  const history = getLocationHistory(historyLimit);
  const visited = new Set<string>();
  
  for (const loc of history) {
    const schoolLoc = determineLocation(loc.lat, loc.lng);
    if (schoolLoc) {
      visited.add(schoolLoc.id);
    }
  }
  
  return Array.from(visited);
}
