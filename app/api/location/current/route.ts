// ============================================================================
// Current Location API - Returns user's current location
// ============================================================================

import { NextResponse } from 'next/server';
import { getLatestLocation, determineLocation } from '@/lib/locationReader';

export async function GET() {
  try {
    const location = getLatestLocation();
    
    if (!location) {
      return NextResponse.json({
        location: null,
        locationName: 'No location data',
        isAtSchool: false,
      });
    }

    const schoolLocation = determineLocation(location.lat, location.lng);

    return NextResponse.json({
      location: schoolLocation,
      rawLocation: {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
      },
      locationName: schoolLocation?.name || 'Traveling',
      isAtSchool: !!schoolLocation,
    });
  } catch (error) {
    console.error('Error getting current location:', error);
    return NextResponse.json(
      { error: 'Failed to get location' },
      { status: 500 }
    );
  }
}
