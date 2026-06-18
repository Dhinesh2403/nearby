import { Injectable, signal, effect } from '@angular/core';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  readonly location = signal<GeoLocation | null>(null);
  readonly isRequesting = signal(false);
  readonly error = signal<string | null>(null);
  // Human-readable "area, city" resolved from coords (11.2). Empty until known.
  readonly areaLabel = signal<string>('');

  constructor() {
    // Auto-request location on service initialization
    effect(() => {
      if (!this.location() && !this.isRequesting()) {
        this.requestLocation();
      }
    }, { allowSignalWrites: true });
  }

  requestLocation(): void {
    if (!navigator.geolocation) {
      this.error.set('Geolocation not supported in this browser.');
      return;
    }

    this.isRequesting.set(true);
    this.error.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        this.location.set({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
        });
        this.isRequesting.set(false);
        this.error.set(null);
        this.reverseGeocode(latitude, longitude);
      },
      (err) => {
        this.isRequesting.set(false);
        let errorMsg = 'Failed to get location.';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = 'Location permission denied. Please enable it in settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = 'Location information is unavailable.';
            break;
          case err.TIMEOUT:
            errorMsg = 'Location request timed out.';
            break;
        }
        this.error.set(errorMsg);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }

  clearLocation(): void {
    this.location.set(null);
    this.error.set(null);
    this.areaLabel.set('');
  }

  // Resolve coords → "locality, city" using OpenStreetMap Nominatim
  // (free, no API key, precise for Indian cities and localities).
  // Falls back to BigDataCloud if Nominatim fails.
  private reverseGeocode(lat: number, lng: number): void {
    const nominatim = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en&zoom=12&addressdetails=1`;
    fetch(nominatim, {
      headers: {
        'Accept': 'application/json',
        // Nominatim ToS requires a meaningful User-Agent
        'User-Agent': 'NearByPro/1.0 (nearbypro.online)',
      },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.address) throw new Error('no address');
        const addr = d.address;
        // Indian Nominatim response has many possible fields depending on zoom
        const locality =
          addr.neighbourhood || addr.suburb || addr.quarter ||
          addr.village || addr.town || '';
        const city =
          addr.city || addr.town || addr.county || addr.state_district || addr.state || '';
        // Build label: "Locality, City" or just "City" if same
        const parts = [locality, city].filter(Boolean);
        const label = parts.filter((v, i, a) => a.indexOf(v) === i).join(', ');
        if (label) { this.areaLabel.set(label); return; }
        throw new Error('empty label');
      })
      .catch(() => {
        // Fallback: BigDataCloud (keyless, less precise but always available)
        const bdc = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        fetch(bdc)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d) return;
            const area = d.locality || d.localityInfo?.administrative?.[3]?.name || '';
            const city = d.city || d.principalSubdivision || '';
            const label = [area, city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
            if (label) this.areaLabel.set(label);
          })
          .catch(() => { /* graceful — label stays empty */ });
      });
  }
}
