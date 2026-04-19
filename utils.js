// ============================================================================
// FouFou — City Trail Generator - Utility Functions
// Copyright © 2026 Eitan Fisher. All Rights Reserved.
// Pure functions - no React state dependency
// ============================================================================

window.BKK = window.BKK || {};

// ============================================================================
// GEOLOCATION & COORDINATES
// ============================================================================

/**
 * Session-cached user GPS. Populated by setUserGPS() or by a successful
 * getUserGPS() call. Cleared only when the page reloads. Callers may read this
 * synchronously as a best-effort hint — prefer getUserGPS() for an async
 * fresh-or-cached lookup.
 */
window.BKK.lastKnownGPS = null; // { lat, lng, timestamp } | null

/**
 * Store a known GPS reading in the session cache. Call this from anywhere that
 * legitimately obtains device coordinates (e.g. the GPS search flow).
 */
window.BKK.setUserGPS = (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return;
  window.BKK.lastKnownGPS = { lat, lng, timestamp: Date.now() };
};

/**
 * Async fetch of device GPS with a session cache and a timeout.
 *
 * - If we already have a cached reading in this session, return it immediately.
 *   GPS doesn't change the hemisphere mid-visit, so a cached value is reliable
 *   enough for "which city are you in" questions.
 * - Otherwise wrap `getValidatedGps` (which handles permissions, high-accuracy,
 *   and timing consistently with the rest of the app). On any failure or timeout,
 *   resolve with null — callers must handle absence gracefully.
 *
 * Note: we accept both in-city and out-of-city successful reads here (by calling
 * `navigator.geolocation.getCurrentPosition` directly via the wrapper and
 * catching the 'outside_city' case as success). Downstream logic in
 * buildGoogleMapsUrls handles the in-city decision itself.
 *
 * Never rejects; always resolves to `{ lat, lng }` or `null`.
 */
window.BKK.getUserGPS = (timeoutMs) => {
  timeoutMs = timeoutMs || 8000;
  // Synchronous cache hit
  if (window.BKK.lastKnownGPS) {
    const c = window.BKK.lastKnownGPS;
    return Promise.resolve({ lat: c.lat, lng: c.lng });
  }
  if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== 'function') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    // Outer safety timer — guarantees we resolve even if the browser hangs.
    const timer = setTimeout(() => done(null), timeoutMs);
    try {
      // Use same options as getValidatedGps for consistent device behavior.
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const lat = pos?.coords?.latitude;
          const lng = pos?.coords?.longitude;
          if (typeof lat === 'number' && typeof lng === 'number') {
            window.BKK.setUserGPS(lat, lng);
            done({ lat, lng });
          } else {
            done(null);
          }
        },
        () => { clearTimeout(timer); done(null); },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
      );
    } catch (_) {
      clearTimeout(timer);
      done(null);
    }
  });
};

/**
 * Check if a location is within an area's boundaries using Haversine formula
 * @returns {{ valid: boolean, distance: number, distanceKm: string }}
 */
window.BKK.checkLocationInArea = (lat, lng, areaId) => {
  const area = window.BKK.areaCoordinates[areaId];
  if (!area || !lat || !lng) return { valid: true, distance: 0 };
  
  const R = 6371e3; // Earth radius in meters
  const lat1Rad = lat * Math.PI / 180;
  const lat2Rad = area.lat * Math.PI / 180;
  const deltaLat = (area.lat - lat) * Math.PI / 180;
  const deltaLng = (area.lng - lng) * Math.PI / 180;
  
  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return { 
    valid: distance <= area.radius, 
    distance: Math.round(distance),
    distanceKm: (distance / 1000).toFixed(1)
  };
};

/**
 * Check if GPS coordinates are within the active city boundaries.
 * Uses city center + allCityRadius (with 50% padding for edge cases).
 * @returns {{ withinCity: boolean, distance: number }}
 */
window.BKK.isGpsWithinCity = (lat, lng) => {
  if (!lat || !lng) return { withinCity: false, distance: 0 };
  const cityData = window.BKK.activeCityData;
  if (!cityData?.center) return { withinCity: true, distance: 0 };
  const R = 6371e3;
  const lat1Rad = lat * Math.PI / 180;
  const lat2Rad = cityData.center.lat * Math.PI / 180;
  const dLat = (cityData.center.lat - lat) * Math.PI / 180;
  const dLng = (cityData.center.lng - lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const maxRadius = (cityData.allCityRadius || 15000) * 1.5;
  return { withinCity: distance <= maxRadius, distance: Math.round(distance) };
};

/**
 * System-wide GPS wrapper. Gets position and validates it's within city.
 * If outside city, calls onError with 'outside_city' reason.
 * @param {function} onSuccess - (pos) => {} — only called if within city
 * @param {function} onError - (reason) => {} — 'outside_city', 'denied', 'unavailable', 'timeout'
 */
window.BKK.getValidatedGps = (onSuccess, onError) => {
  if (!navigator.geolocation) { if (onError) onError('unavailable'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Populate the session GPS cache regardless of city-bounds check — even if the
      // user is outside the city, we still know where they are, and that information
      // is useful for downstream decisions (e.g. buildGoogleMapsUrls avoiding a 17-day-walk).
      window.BKK.setUserGPS(pos.coords.latitude, pos.coords.longitude);
      const check = window.BKK.isGpsWithinCity(pos.coords.latitude, pos.coords.longitude);
      if (check.withinCity) {
        if (onSuccess) onSuccess(pos);
      } else {
        console.log('[GPS] Outside city bounds:', check.distance, 'm from center');
        if (onError) onError('outside_city');
      }
    },
    (err) => { if (onError) onError(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'); },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
};

/**
 * Find the closest area to given coordinates
 * @returns {string} area ID of the closest area
 */
window.BKK.getClosestArea = (lat, lng) => {
  if (!lat || !lng) return null;
  const coords = window.BKK.areaCoordinates || {};
  let closest = null;
  let minDist = Infinity;
  for (const [areaId, area] of Object.entries(coords)) {
    const R = 6371e3;
    const dLat = (area.lat - lat) * Math.PI / 180;
    const dLng = (area.lng - lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat * Math.PI / 180) * Math.cos(area.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    if (dist < minDist) { minDist = dist; closest = areaId; }
  }
  return closest;
};

/**
 * Get all areas that contain this coordinate (within radius)
 * @returns {string[]} Array of area IDs
 */
window.BKK.getAreasForCoordinates = (lat, lng) => {
  if (!lat || !lng) return [];
  const coords = window.BKK.areaCoordinates || {};
  const results = [];
  for (const [areaId, area] of Object.entries(coords)) {
    const check = window.BKK.checkLocationInArea(lat, lng, areaId);
    if (check.valid) results.push(areaId);
  }
  return results.length > 0 ? results : [];
};

/**
 * Normalize location areas: convert old 'area' string to 'areas' array
 * Backward-compatible migration
 */
window.BKK.normalizeLocationAreas = (loc) => {
  return window.BKK.getLocationAreas(loc);
};

/**
 * Generate a distinct color for an interest based on its position.
 * Uses HSL with golden-angle spacing for maximum visual separation.
 * @param {number} index — position in the interest list
 * @param {number} total — total number of interests
 * @returns {string} hex color
 */
window.BKK.generateInterestColor = (index, total) => {
  // Golden angle in degrees — ensures maximum separation
  const hue = (index * 137.508) % 360;
  const saturation = 65 + (index % 3) * 10; // 65-85%
  const lightness = 45 + (index % 2) * 8;   // 45-53%
  return window.BKK.hslToHex(hue, saturation, lightness);
};

/**
 * Convert HSL values to hex color string
 */
window.BKK.hslToHex = (h, s, l) => {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
};

/**
 * Get the color for an interest — uses override if set, otherwise auto-generates.
 * Call with the full allInterestOptions array for consistent indexing.
 * @param {string} interestId
 * @param {Array} allInterests — full ordered list for index calculation
 * @returns {string} hex color
 */
// Stable colors by interest ID — consistent across languages and sort orders
window.BKK.INTEREST_COLORS = {
  cafes:         '#e07b39', // orange-brown
  coffee:        '#e07b39', // orange-brown (alias)
  food:          '#e05c5c', // red-orange
  restaurants:   '#e05c5c', // red-orange
  architecture:  '#5b8dd9', // blue
  galleries:     '#9b59b6', // purple
  museums:       '#27ae60', // green
  culture:       '#16a085', // teal
  history:       '#8e6c3e', // brown
  temples:       '#c0392b', // dark red
  parks:         '#2ecc71', // light green
  markets:       '#f1c40f', // yellow
  shopping:      '#e67e22', // amber
  nightlife:     '#6c3483', // dark purple
  bars:          '#884ea0', // purple
  rooftop:       '#2980b9', // sky blue
  entertainment: '#d35400', // deep orange
  beaches:       '#1abc9c', // turquoise
  canals:        '#3498db', // blue
  artisans:      '#e91e8c', // pink
  graffiti:      '#ff5722', // deep orange-red
};

window.BKK.getInterestColor = (interestId, allInterests) => {
  const interest = allInterests.find(i => i.id === interestId);
  if (interest?.color) return interest.color;
  // Stable color by ID first — avoids same-color collisions across languages
  if (window.BKK.INTEREST_COLORS[interestId]) return window.BKK.INTEREST_COLORS[interestId];
  const idx = allInterests.findIndex(i => i.id === interestId);
  return window.BKK.generateInterestColor(idx >= 0 ? idx : 0, allInterests.length);
};

// ============================================================================
// Pick the dominant (most-specific) interest from a set for display color.
// Rule: if interest A appears in interest B's dedupRelated (both in the set),
//       A is the "child"/specific one and wins. Ties → first in allInts order.
// Used by favorites map, and anywhere a single representative color is needed.
// ============================================================================
window.BKK.pickDominantInterest = (ids, allInts) => {
  if (!ids || ids.length === 0) return null;
  if (ids.length === 1) return ids[0];
  const set = new Set(ids);
  // Collect candidates that are referenced as "child" by a sibling
  const children = ids.filter(id =>
    allInts.some(o => set.has(o.id) && o.id !== id && (o.dedupRelated || []).includes(id))
  );
  // From children pick first in system order; fall back to first id in system order
  const ordered = allInts.map(o => o.id).filter(id => set.has(id));
  if (children.length > 0) {
    const winner = ordered.find(id => children.includes(id));
    if (winner) return winner;
  }
  return ordered[0] || ids[0];
};

// ============================================================================
// Get all areas for a location (handles both .areas array and .area string)
// ============================================================================
window.BKK.getLocationAreas = (loc) => {
  if (loc.areas && Array.isArray(loc.areas) && loc.areas.length > 0) {
    return loc.areas;
  }
  if (loc.area && typeof loc.area === 'string') {
    return [loc.area];
  }
  return [window.BKK.areaOptions?.[0]?.id || 'center'];
};

/**
 * Extract coordinates from Google Maps URL (various formats)
 * @returns {{ lat: number, lng: number } | null}
 */
window.BKK.extractCoordsFromUrl = (url) => {
  if (!url || !url.trim()) return null;

  let lat = null, lng = null;
  let match;
  
  // Format 1: ?q=13.7465,100.4927
  match = url.match(/[?&]q=([-\d.]+),([-\d.]+)/);
  if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
  
  // Format 2: @13.7465,100.4927,17z
  if (!lat) {
    match = url.match(/@([-\d.]+),([-\d.]+)/);
    if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
  }
  
  // Format 3: &ll=13.7465,100.4927
  if (!lat) {
    match = url.match(/[?&]ll=([-\d.]+),([-\d.]+)/);
    if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
  }
  
  // Format 4: Shortened URLs (goo.gl)
  if (!lat && (url.includes('goo.gl') || url.includes('maps.app'))) {
    return { lat: null, lng: null, shortened: true };
  }
  
  // Format 5: Raw coordinates: 13.7465,100.4927
  if (!lat) {
    match = url.match(/^([-\d.]+)\s*,\s*([-\d.]+)$/);
    if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
  }
  
  if (lat !== null && lng !== null) {
    return { lat, lng };
  }
  return null;
};

/**
 * Geocode address using Google Places Text Search API
 * @returns {{ lat, lng, address, displayName } | null}
 */
window.BKK.geocodeAddress = async (address) => {
  if (!address || !address.trim()) return null;

  const cityName = (window.BKK.selectedCity?.nameEn || 'Bangkok');
  const countryName = (window.BKK.selectedCity?.country || 'Thailand');
  const searchQuery = address.toLowerCase().includes(cityName.toLowerCase()) 
    ? address 
    : `${address}, ${cityName}, ${countryName}`;
  
  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': window.BKK.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress'
      },
      body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 1 })
    }
  );
  
  const data = await response.json();
  
  if (data.places && data.places.length > 0) {
    const place = data.places[0];
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
      address: place.formattedAddress || place.displayName?.text || searchQuery,
      displayName: place.displayName?.text || ''
    };
  }
  return null;
};

/**
 * Geocode by place name
 * @returns {{ lat, lng, address, displayName } | null}
 */
/**
 * Reverse geocode: get address from coordinates
 * @returns {string} formatted address
 */
window.BKK.reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': window.BKK.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.formattedAddress'
        },
        body: JSON.stringify({ textQuery: `${lat},${lng}`, maxResultCount: 1 })
      }
    );
    
    const data = await response.json();
    if (data.places && data.places.length > 0) {
      return data.places[0].formattedAddress || '';
    }
    return '';
  } catch (error) {
    console.error('[REVERSE GEOCODE] Error:', error);
    return '';
  }
};

// ============================================================================
// IMAGE HANDLING
// ============================================================================

/**
 * Compress image file to target size
 * @returns {Promise<string>} base64 compressed image (fallback) or URL
 */
window.BKK.compressImage = (input, maxSizeKB = 120) => {
  return new Promise((resolve) => {
    const process = (src) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 900;
        let w = img.width, h = img.height;
        if (w > h && w > maxDimension) { h = Math.round((h / w) * maxDimension); w = maxDimension; }
        else if (h > maxDimension) { w = Math.round((w / h) * maxDimension); h = maxDimension; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // Try quality levels until under size target
        let quality = 0.82;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.2) {
          quality = Math.round((quality - 0.1) * 10) / 10;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = () => resolve(typeof input === 'string' ? input : null);
      img.src = src;
    };
    if (typeof input === 'string') {
      process(input); // already a dataUrl
    } else {
      const reader = new FileReader();
      reader.onload = (e) => process(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(input);
    }
  });
};

/**
 * Upload an image to Firebase Storage and return the download URL.
 * Falls back to base64 if Storage is not available.
 */
window.BKK.uploadImage = async (file, cityId, locationId) => {
  // Compress first
  const compressed = await window.BKK.compressImage(file);
  
  // Try Firebase Storage
  if (typeof firebase !== 'undefined' && firebase.storage) {
    try {
      const storageRef = firebase.storage().ref();
      const path = `cities/${cityId}/images/${locationId}_${Date.now()}.jpg`;
      const imageRef = storageRef.child(path);
      
      // Convert base64 to blob for upload
      const response = await fetch(compressed);
      const blob = await response.blob();
      
      const snapshot = await imageRef.put(blob, { contentType: 'image/jpeg' });
      const downloadURL = await snapshot.ref.getDownloadURL();
      
      console.log('[STORAGE] Uploaded image:', path, 'URL:', downloadURL.substring(0, 60) + '...');
      return downloadURL;
    } catch (err) {
      console.error('[STORAGE] Upload failed, falling back to base64:', err);
      return compressed;
    }
  }
  
  // Fallback: return base64
  console.log('[STORAGE] Not available, using base64 fallback');
  return compressed;
};

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Consistent button style generator
 */
window.BKK.getButtonStyle = (isActive = false, variant = 'primary') => {
  const baseStyle = {
    border: isActive ? '5px solid #f97316' : '3px solid #d1d5db',
    backgroundColor: isActive ? '#fed7aa' : '#ffffff',
    boxShadow: isActive ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)' : 'none',
    padding: '12px 16px',
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };
  
  if (variant === 'danger') {
    return {
      ...baseStyle,
      border: '3px solid #ef4444',
      backgroundColor: isActive ? '#fecaca' : '#ffffff',
      color: '#dc2626'
    };
  }
  
  if (variant === 'success') {
    return {
      ...baseStyle,
      border: '3px solid #10b981',
      backgroundColor: isActive ? '#d1fae5' : '#ffffff',
      color: '#059669'
    };
  }
  
  return baseStyle;
};

/**
 * Parse user agent for readable browser/OS info
 */
window.BKK.parseUserAgent = (ua) => {
  let browser = 'Unknown', os = 'Unknown';
  if (ua.includes('SamsungBrowser')) browser = 'Samsung';
  else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'Mac';
  else if (ua.includes('Linux')) os = 'Linux';
  return { browser, os };
};

/**
 * SHA-256 hash a string (for password protection)
 * Returns hex string. Uses Web Crypto API.
 */
window.BKK.hashPassword = async function(password) {
  if (!password) return '';
  var encoder = new TextEncoder();
  var data = encoder.encode(password);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
};

/**
 * Build the best Google Maps URL for a place.
 * Priority: Place ID → name search for Google-origin places → address → raw coords.
 */
window.BKK.getGoogleMapsUrl = (place, _debugLabel) => {
  if (!place) return '#';
  const hasCoords = place.lat && place.lng;
  const addressStr = (typeof place.address === 'string') ? place.address.trim() : '';
  const _dbg = window.BKK._urlDebug; // set by app when debugMode + 'url' category active
  
  // Validate Google Place ID — must look like a real one (starts with ChIJ, EiI, etc.)
  const isValidGooglePlaceId = (pid) => {
    if (!pid || typeof pid !== 'string' || pid.length < 15) return false;
    if (/^(ChIJ|EiI|GhIJ)/.test(pid)) return true;
    if (pid.length > 25 && /^[A-Za-z0-9_-]+$/.test(pid) && !pid.startsWith('-')) return true;
    return false;
  };
  
  // Helper: detect broken/shortened URLs that should never be used
  const isBrokenUrl = (url) => {
    if (!url) return false;
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/') || url.includes('app.goo.gl')) return true;
    if (!url.includes('google.com/maps')) return true;
    // maps/place/?q=place_id: format truncates PlaceID on Android — must rebuild
    if (url.includes('maps/place/?q=place_id:') || url.includes('maps/place/?q=place_id%3A')) return true;
    const m = url.match(/query_place_id=([^&]+)/);
    if (m && !isValidGooglePlaceId(decodeURIComponent(m[1]))) return true;
    return false;
  };

  // Extract PlaceID from legacy maps/place/?q=place_id: format
  const extractPlaceIdFromLegacyUrl = (url) => {
    const m = url && url.match(/[?&]q=place_id[:%3A]([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const _log = (step, url) => {
    if (_dbg) _dbg.push({ name: place.name, step, url: url || null,
      mapsUrl: place.mapsUrl || null, placeId: place.googlePlaceId || place.placeId || null,
      hasCoords, lat: place.lat, lng: place.lng, address: addressStr });
  };

  // Top priority: stored mapsUrl — but only if it's a valid, stable google.com/maps URL
  if (place.mapsUrl && !isBrokenUrl(place.mapsUrl) && !place.mapsUrl.match(/\?q=\d+\.\d+,\d+\.\d+$/)) {
    const url = place.mapsUrl;
    _log('stored_mapsUrl', url);
    return url;
  }
  if (place.mapsUrl) {
    // Try to salvage PlaceID from legacy maps/place/?q=place_id: format
    const legacyPid = extractPlaceIdFromLegacyUrl(place.mapsUrl);
    if (legacyPid && isValidGooglePlaceId(legacyPid)) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || `${place.lat},${place.lng}`)}&query_place_id=${legacyPid}`;
      _log('legacy_placeId_rescued', url);
      return url;
    }
    _log('stored_mapsUrl_BROKEN', place.mapsUrl);
  }
  
  if (!hasCoords && !addressStr) { _log('no_data'); return '#'; }
  
  // Best: valid Google Place ID
  const pid = place.googlePlaceId || place.placeId;
  if (pid && isValidGooglePlaceId(pid)) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || addressStr || `${place.lat},${place.lng}`)}&query_place_id=${pid}`;
    _log('placeId', url);
    return url;
  }
  if (pid) { _log('placeId_INVALID', pid); }
  
  // Any place with name + coords — most reliable combination
  if (place.name?.trim() && hasCoords) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name.trim() + ' ' + place.lat + ',' + place.lng)}`;
    _log('name_coords', url);
    return url;
  }

  // Name + address (no coords)
  if (place.name?.trim() && addressStr) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name.trim() + ' ' + addressStr)}`;
    _log('name_address', url);
    return url;
  }

  // Address only
  if (addressStr) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressStr)}`;
    _log('address_only', url);
    return url;
  }
  
  // Coordinate-only — use navigation destination URL (not search query)
  // This opens Google Maps navigation directly to the point, works reliably on mobile
  if (hasCoords) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
    _log('coords_only_nav', url);
    return url;
  }
  
  _log('FAILED');
  return '#';
};

/**
 * Returns true if a place has NO Google representation:
 * - no valid googlePlaceId
 * - no stored mapsUrl pointing to a real Google place
 * - no address
 * Only has coordinates (lat/lng).
 * Used to decide label and URL type for navigate/open-in-google buttons.
 */
window.BKK.isCoordOnlyPlace = (place) => {
  if (!place) return true;
  const pid = place.googlePlaceId || place.placeId;
  const isValidPid = pid && /^(ChIJ|EiI|GhIJ)/.test(pid);
  if (isValidPid) return false;
  if (place.mapsUrl && place.mapsUrl.includes('google.com/maps') &&
      !place.mapsUrl.match(/\?q=\d+\.\d+,\d+\.\d+$/) &&
      !place.mapsUrl.includes('maps.app.goo.gl') &&
      !place.mapsUrl.includes('goo.gl/')) return false;
  return true;
};

/**
 * Returns the best navigation URL for a place:
 * - Has Google Place ID / stored mapsUrl → getGoogleMapsUrl (search/place URL)
 * - Coord-only → direct navigation URL: maps/dir/?destination=lat,lng
 */
window.BKK.getNavigateUrl = (place) => {
  if (!place) return '#';
  if (!window.BKK.isCoordOnlyPlace(place)) {
    return window.BKK.getGoogleMapsUrl(place);
  }
  // Coord-only: direct navigation
  if (place.lat && place.lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  }
  return '#';
};

/**
 * Returns the "open in Google" URL — only for places WITH a Google representation.
 * For coord-only places, returns a map view URL (not a place search).
 * Returns null if neither is available.
 */
window.BKK.getGoogleViewUrl = (place) => {
  if (!place) return null;
  if (!window.BKK.isCoordOnlyPlace(place)) {
    const url = window.BKK.getGoogleMapsUrl(place);
    return url !== '#' ? url : null;
  }
  // Coord-only: show exact pin on map (not a search — place/lat,lng format drops a red pin)
  if (place.lat && place.lng) {
    return `https://www.google.com/maps/place/${place.lat},${place.lng}/@${place.lat},${place.lng},17z`;
  }
  return null;
};

// Build Google Maps direction URLs, splitting into multiple if exceeding maxPoints limit
// maxPoints = total points including origin + destination (default 12 = 10 waypoints + origin + dest)
// userLoc = { lat, lng } — optional current device location. Controls whether "" ("Your location")
//           is prepended as the first point (enables the Start button in Google Maps):
//             - origin OUT of city bounds → never prepend
//             - origin IN city, userLoc IN city → prepend (Start)
//             - origin IN city, userLoc OUT of city → no prepend (Preview; user is elsewhere)
//             - origin IN city, userLoc absent → falls back to `window.BKK.lastKnownGPS`; if that
//               is also empty, we do NOT prepend (safer to get Preview than risk the 17-day-walk
//               bug for a user who is actually abroad). Callers that want reliable Start should
//               `await window.BKK.getUserGPS()` first and pass the result in.
//           Pass userLoc === false to force no-prepend regardless — used by the share-route
//           button because the recipient's location is unknown.
// Returns array of { url, fromIndex, toIndex, label } objects
window.BKK.buildGoogleMapsUrls = (stops, origin, isCircular, maxPoints, userLoc) => {
  maxPoints = maxPoints || 12;
  
  if (stops.length === 0) return [];
  
  // Path-based URL format opens Google Maps in route OVERVIEW mode (not navigation)
  // Format: google.com/maps/dir/point1/point2/.../pointN/data=!4m2!4m1!3e2
  // data=!4m2!4m1!3e2 = walking mode (3e0=driving, 3e1=biking, 3e2=walking)
  // Empty first segment = "Your location"
  
  const walkingData = 'data=!4m2!4m1!3e2';

  // Decide whether to prepend "" ("Your location") as the first point.
  // Google Maps only shows the "Start" (turn-by-turn) button when the URL's starting
  // point is close to the device. Prepending "" enables Start, BUT if the user is far
  // from the route's origin (different city), Google draws a gigantic walking path from
  // device → origin (e.g. Bangkok → Singapore = 17 days). If we skip "", Google only
  // offers Preview (no Start) but the route displays correctly.
  //
  // Decision:
  // 1. If userLoc is provided AND inside the selected city's bounds AND origin also in
  //    bounds → prepend "" (Start available, user is here, safe).
  // 2. If userLoc is NOT provided (no GPS yet — e.g. "by area" search mode where we
  //    never captured GPS) → fall back to the selected city's center as a proxy: if
  //    the origin is inside the city's bounds, assume the user is also in the city
  //    (they explicitly chose it in FouFou). If they aren't, Google will still show
  //    Start once it reads the real device location — and if the route's origin is far,
  //    the real-location mismatch would trigger the 17-day path, BUT only when the
  //    device actually is far. This is an acceptable bet because most users plan
  //    routes in the city they're visiting.
  // 3. If userLoc IS provided but far from origin → do NOT prepend "" (user is
  //    genuinely cross-city; Preview is correct).
  const originCoords = (() => {
    if (!origin) return null;
    const m = String(origin).match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!m) return null;
    return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  })();
  const distMeters = (a, b) => {
    if (typeof window.BKK.calcDistance === 'function') {
      return window.BKK.calcDistance(a.lat, a.lng, b.lat, b.lng);
    }
    const toRad = d => d * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const v = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(v));
  };
  const shouldPrependYourLoc = (() => {
    if (!originCoords) return false;
    // Explicit opt-out (for sharing) — caller says "don't assume my location".
    if (userLoc === false) return false;
    const city = window.BKK.selectedCity || window.BKK.activeCityData;
    const center = city && city.center;
    const radius = city && city.allCityRadius;
    if (!center || !radius) return false;
    // Origin must be in the selected city — required for any Start consideration.
    const originInCity = distMeters(originCoords, center) <= radius;
    if (!originInCity) return false;
    // Prefer an explicit userLoc; fall back to the session cache if nothing was passed.
    let loc = (userLoc && typeof userLoc.lat === 'number' && typeof userLoc.lng === 'number')
      ? userLoc
      : null;
    if (!loc && window.BKK.lastKnownGPS) {
      loc = { lat: window.BKK.lastKnownGPS.lat, lng: window.BKK.lastKnownGPS.lng };
    }
    // Safe default: if we have NO GPS information at all, do not prepend ""
    // (Preview is better than a wildly long walking path if the user is actually
    // far from the city). Callers that want Start should await getUserGPS() first.
    if (!loc) return false;
    return distMeters(loc, center) <= radius;
  })();
  
  // Build ordered list of all points: [userLoc?] → origin → stops → (origin if circular)
  const buildPointsList = (stopsSlice, originCoord, circular) => {
    const points = [];
    // Prepend "" ("Your location") only when userLoc is close to origin (see comment above)
    if (originCoord) {
      if (shouldPrependYourLoc) points.push('');
      points.push(originCoord);
    } else {
      // No origin at all — fall back to "Your location" as the sole starting point
      points.push('');
    }
    // Add all stops
    stopsSlice.forEach(s => points.push(`${s.lat},${s.lng}`));
    // For circular: return to origin
    if (circular && originCoord) points.push(originCoord);
    return points;
  };
  
  const buildUrl = (points) => {
    return `https://www.google.com/maps/dir/${points.join('/')}/${walkingData}`;
  };
  
  // Check if fits in one URL (max ~10 waypoints in path format)
  const maxPathPoints = maxPoints;
  const allPoints = buildPointsList(stops, origin, isCircular);
  
  if (allPoints.length <= maxPathPoints) {
    return [{ url: buildUrl(allPoints), fromIndex: 0, toIndex: stops.length - 1, part: 1, total: 1 }];
  }
  
  // Need to split into multiple URLs
  const urls = [];
  let currentIndex = 0;
  let currentOrigin = origin;
  let isFirst = true;
  const stopsPerSegment = maxPathPoints - 3; // subtract: empty start + origin + destination
  
  while (currentIndex < stops.length) {
    const remaining = stops.length - currentIndex;
    const isLast = remaining <= stopsPerSegment + 1;
    
    const points = [];
    
    if (isFirst) {
      // First segment: prepend "" only if userLoc is close to origin (see above)
      if (currentOrigin) {
        if (shouldPrependYourLoc) points.push('');
        points.push(currentOrigin);
      } else {
        points.push('');
      }
    } else {
      points.push(currentOrigin);
    }
    
    if (isLast) {
      const segStops = stops.slice(currentIndex);
      segStops.forEach(s => points.push(`${s.lat},${s.lng}`));
      if (isCircular && origin) points.push(origin);
      urls.push({ url: buildUrl(points), fromIndex: currentIndex, toIndex: stops.length - 1, part: urls.length + 1, total: 0 });
      break;
    } else {
      const segStops = stops.slice(currentIndex, currentIndex + stopsPerSegment + 1);
      segStops.forEach(s => points.push(`${s.lat},${s.lng}`));
      urls.push({ url: buildUrl(points), fromIndex: currentIndex, toIndex: currentIndex + segStops.length - 1, part: urls.length + 1, total: 0 });
      
      const lastStop = segStops[segStops.length - 1];
      currentOrigin = `${lastStop.lat},${lastStop.lng}`;
      currentIndex += segStops.length - 1; // overlap last stop as next origin
      isFirst = false;
    }
  }
  
  const total = urls.length;
  urls.forEach(u => u.total = total);
  
  return urls;
};


// ============================================================================
// EMOJI SUGGESTION ENGINE
// ============================================================================

/**
 * Suggest 3 emojis for a given description.
 * Tries Gemini API first (online), falls back to local keyword mapping.
 * @param {string} description - What the emoji should represent
 * @returns {Promise<string[]>} - Array of 3 emoji suggestions
 */
window.BKK.suggestEmojis = async function(description) {
  if (!description || !description.trim()) return ['📍', '⭐', '🏷️', '🔖', '📌', '🗂️'];
  
  // Track previous suggestions to avoid duplicates on "more"
  const prevKey = '_lastEmojiSuggestions';
  const prev = window[prevKey] || [];
  
  // Local keyword mapping with shuffle to get variety on "more"
  const all = window.BKK._suggestEmojisLocal(description, true);
  // Filter out previously shown
  const fresh = all.filter(e => !prev.includes(e));
  const result = fresh.length >= 6 ? fresh.slice(0, 6) : all.sort(() => Math.random() - 0.5).slice(0, 6);
  window[prevKey] = result;
  return result;
};

/**
 * Local keyword-based emoji suggestion
 */
window.BKK._suggestEmojisLocal = function(description, returnAll) {
  const desc = description.toLowerCase();
  
  const mapping = [
    // Food & Drink
    { keys: ['street food','אוכל רחוב','דוכן','stand','stall','hawker','vendor'], emojis: ['🍢','🍡','🥟','🍲','🍜','🥘'] },
    { keys: ['אוכל','food','restaurant','מסעד','dining','eat','snack'], emojis: ['🍜','🍲','🥘','🍛','🍔','🍕'] },
    { keys: ['קפה','coffee','cafe','קפית'], emojis: ['☕','🫖','🍵','☕'] },
    { keys: ['בר','bar','drink','שתי','cocktail','beer','בירה'], emojis: ['🍺','🍸','🥂','🍻'] },
    { keys: ['wine','יין'], emojis: ['🍷','🥂','🍇'] },
    { keys: ['ice cream','גלידה','dessert','קינוח'], emojis: ['🍦','🧁','🍰'] },
    { keys: ['bakery','מאפ','bread','לחם'], emojis: ['🥐','🍞','🧁'] },
    // Nature & Outdoors
    { keys: ['חוף','beach','sea','ים','ocean'], emojis: ['🏖️','🌊','🐚','☀️'] },
    { keys: ['פארק','park','garden','גן','טבע','nature'], emojis: ['🌳','🌿','🏞️','🌲'] },
    { keys: ['הר','mountain','hill','טיול','hike'], emojis: ['⛰️','🏔️','🥾'] },
    { keys: ['river','נהר','lake','אגם'], emojis: ['🏞️','💧','🚣'] },
    { keys: ['flower','פרח','botanical'], emojis: ['🌸','🌺','🌻'] },
    { keys: ['animal','חיות','zoo','גן חיות'], emojis: ['🦁','🐘','🦒'] },
    // Culture & History
    { keys: ['מוזיאון','museum','exhibit','תערוכה'], emojis: ['🏛️','🖼️','🎨'] },
    { keys: ['היסטורי','history','historic','עתיק','ancient'], emojis: ['🏛️','📜','⏳','🏰'] },
    { keys: ['תרבות','culture','cultural'], emojis: ['🎭','🏛️','🎪'] },
    { keys: ['temple','מקדש','church','כנסי','mosque','מסגד','synagogue','בית כנסת','religion','דת','shrine','מקום קדוש'], emojis: ['⛩️','🕌','⛪','🕍','🛕','🙏'] },
    { keys: ['buddha','בודה','buddhist','buddhism','wat','pagoda','monk','נזיר'], emojis: ['🛕','🙏','☸️','🪷','📿','🧘'] },
    { keys: ['ארכיטקטורה','architecture','building','בניין'], emojis: ['🏗️','🏢','🏰'] },
    // Arts & Entertainment
    { keys: ['אומנות','art','גלריה','gallery','street art','גרפיטי','graffiti'], emojis: ['🎨','🖼️','🖌️'] },
    { keys: ['מוזיקה','music','concert','הופעה'], emojis: ['🎵','🎶','🎸','🎤'] },
    { keys: ['תאטרון','theater','theatre','הצגה','show','performance'], emojis: ['🎭','🎪','🎬'] },
    { keys: ['cinema','סרט','movie','film'], emojis: ['🎬','🎞️','🍿'] },
    { keys: ['nightlife','לילה','club','מועדון'], emojis: ['🌃','🪩','💃','🎉'] },
    // Shopping & Markets
    { keys: ['קניות','shopping','mall','קניון'], emojis: ['🛍️','🏬','💳'] },
    { keys: ['שוק','market','bazaar','שוק פשפשים'], emojis: ['🏪','🧺','🏬'] },
    // Services & Public
    { keys: ['שירות','שרות','service','ציבורי','public','municipal','עירי','ממשל','government','עירייה','רשות'], emojis: ['🏛️','🏥','📋','🏢','🔧','⚖️'] },
    { keys: ['בית חולים','hospital','health','בריאות','medical','רפואי'], emojis: ['🏥','⚕️','💊'] },
    { keys: ['police','משטרה','emergency','חירום'], emojis: ['🚔','🚨','👮'] },
    { keys: ['school','בית ספר','education','חינוך','university','אוניברסיטה'], emojis: ['🏫','📚','🎓'] },
    { keys: ['transport','תחבורה','bus','אוטובוס','train','רכבת','metro'], emojis: ['🚌','🚆','🚇','🚊'] },
    { keys: ['parking','חני','חנייה'], emojis: ['🅿️','🚗','🏎️'] },
    { keys: ['toilet','שירותים','שרותים','שרותיים','wc','restroom','bathroom','נוחיות'], emojis: ['🚻','🚽','🧻','🚾'] },
    // Sports & Activities
    { keys: ['sport','ספורט','gym','חדר כושר','fitness'], emojis: ['⚽','🏋️','🤸'] },
    { keys: ['yoga','יוגה','meditation','מדיטציה','wellness','spa'], emojis: ['🧘','💆','🧖'] },
    { keys: ['swim','שחי','pool','בריכה'], emojis: ['🏊','🤽','💦'] },
    { keys: ['bike','אופני','cycling','רכיבה'], emojis: ['🚲','🚴','🛴'] },
    // Travel & Places
    { keys: ['hotel','מלון','hostel','אכסני','accommodation','לינה'], emojis: ['🏨','🛏️','🏩'] },
    { keys: ['airport','שדה תעופה','flight','טיסה'], emojis: ['✈️','🛫','🛬'] },
    { keys: ['viewpoint','תצפית','panorama','view','נוף'], emojis: ['🔭','👀','🏔️','📸'] },
    { keys: ['photo','צילום','camera','instagram'], emojis: ['📸','📷','🤳'] },
    // Countries & Regions
    { keys: ['spain','ספרד','spanish'], emojis: ['🇪🇸','☀️','💃','🥘'] },
    { keys: ['thailand','תאילנד','thai'], emojis: ['🇹🇭','🛺','🍜','🐘'] },
    { keys: ['israel','ישראל'], emojis: ['🇮🇱','✡️','🕍'] },
    { keys: ['japan','יפן','japanese'], emojis: ['🇯🇵','⛩️','🍣','🗾'] },
    { keys: ['italy','איטלי','italian'], emojis: ['🇮🇹','🍕','🍝'] },
    { keys: ['france','צרפת','french'], emojis: ['🇫🇷','🥐','🗼'] },
    { keys: ['usa','america','אמריקה'], emojis: ['🇺🇸','🗽','🦅'] },
    { keys: ['uk','england','אנגלי','british','london','לונדון'], emojis: ['🇬🇧','👑','🎡'] },
    { keys: ['singapore','סינגפור'], emojis: ['🇸🇬','🦁','🌿'] },
    // Misc
    { keys: ['massage','עיסוי','spa','ספא','thai massage'], emojis: ['💆','🧖','🙏','💆‍♂️'] },
    { keys: ['rooftop','גג','גגות','skybar'], emojis: ['🌆','🏙️','🍸','🌃'] },
    { keys: ['canal','תעלה','תעלות','boat','סירה','שייט'], emojis: ['🚤','⛵','🛶','🌊'] },
    { keys: ['craft','מלאכה','אומן','handmade','artisan'], emojis: ['🔨','🧵','🎨','🪡'] },
    { keys: ['kid','ילד','children','family','משפח','playground'], emojis: ['👨‍👩‍👧‍👦','🎠','🧒','🎪'] },
    { keys: ['pet','חיית מחמד','dog','כלב','cat','חתול'], emojis: ['🐕','🐈','🐾'] },
    { keys: ['book','ספר','library','ספרי'], emojis: ['📚','📖','📕'] },
    { keys: ['work','עבודה','office','משרד','cowork'], emojis: ['💼','🏢','💻'] },
    { keys: ['wifi','אינטרנט','internet','tech'], emojis: ['📶','💻','🔌'] },
    { keys: ['money','כסף','exchange','חלפ','atm','בנק','bank'], emojis: ['💰','🏧','💳'] },
    { keys: ['sunset','שקיע','sunrise','זריחה'], emojis: ['🌅','🌇','🌄'] },
    { keys: ['rain','גשם','umbrella','מטרי'], emojis: ['🌧️','☂️','💧'] },
    { keys: ['hot','חם','sun','שמש','summer','קיץ'], emojis: ['☀️','🌞','🔥'] },
    { keys: ['cold','קר','snow','שלג','winter','חורף'], emojis: ['❄️','⛷️','🧊'] },
    { keys: ['love','אהבה','heart','לב','romantic','רומנטי'], emojis: ['❤️','💕','💑'] },
    { keys: ['star','כוכב','favorite','מועדף'], emojis: ['⭐','🌟','✨'] },
    { keys: ['fire','אש','hot','חם','popular','פופולרי'], emojis: ['🔥','💥','⚡'] },
    { keys: ['peace','שלום','calm','שקט','relax'], emojis: ['☮️','🕊️','😌'] },
    { keys: ['danger','סכנה','warning','אזהרה'], emojis: ['⚠️','🚫','❌'] },
    { keys: ['celebration','חגיגה','party','מסיבה','birthday','יום הולדת'], emojis: ['🎉','🎊','🥳'] },
  ];
  
  // Score each mapping entry - use prefix matching for Hebrew morphology
  const scored = mapping.map(entry => {
    let score = 0;
    entry.keys.forEach(key => {
      // Exact substring match
      if (desc.includes(key)) {
        score += key.length * 2;
      } else if (key.length >= 3) {
        // Prefix match: "ציבורי" matches "ציבוריים", "שירות" matches "שירותים"
        const keyRoot = key.substring(0, Math.max(3, Math.ceil(key.length * 0.7)));
        const descWords = desc.split(/[\s,;.]+/);
        for (const word of descWords) {
          if (word.startsWith(keyRoot) || keyRoot.startsWith(word.substring(0, 3))) {
            score += key.length;
            break;
          }
        }
      }
    });
    return { ...entry, score };
  }).filter(e => e.score > 0).sort((a, b) => b.score - a.score);
  
  // Collect unique emojis from top matches
  const result = [];
  const seen = new Set();
  for (const entry of scored) {
    for (const emoji of entry.emojis) {
      if (!seen.has(emoji)) {
        seen.add(emoji);
        result.push(emoji);
        if (!returnAll && result.length >= 6) return result;
      }
    }
  }
  
  // If not enough matches, pad with generic emojis
  const generic = ['📍','⭐','🏷️','📌','🔖','🎯'];
  for (const g of generic) {
    if (!seen.has(g)) {
      result.push(g);
      if (result.length >= 6) break;
    }
  }
  
  return result.slice(0, 6);
};

// ============================================================================
// EXIF GPS Extraction — reads GPS coordinates from photo EXIF data
// ============================================================================
window.BKK.extractGpsFromImage = (file) => {
  return new Promise((resolve) => {
    if (!file) { console.log('[EXIF] No file'); return resolve(null); }
    if (!file.type?.startsWith('image/')) { console.log('[EXIF] Not an image:', file.type); return resolve(null); }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target.result;
        const view = new DataView(buf);
        console.log('[EXIF] File size:', buf.byteLength, 'bytes');
        
        // Check JPEG SOI marker
        if (view.getUint16(0) !== 0xFFD8) {
          console.log('[EXIF] Not a JPEG (no SOI marker)');
          return resolve(null);
        }
        
        // Scan for APP1 (EXIF) marker
        let offset = 2;
        let found = false;
        while (offset < view.byteLength - 4) {
          const marker = view.getUint16(offset);
          
          // Must be a valid JPEG marker (0xFFxx)
          if ((marker & 0xFF00) !== 0xFF00) {
            console.log('[EXIF] Invalid marker at offset', offset, ':', marker.toString(16));
            break;
          }
          
          const segLen = view.getUint16(offset + 2);
          console.log('[EXIF] Marker:', marker.toString(16), 'at offset', offset, 'len', segLen);
          
          if (marker === 0xFFE1) { // APP1 (EXIF)
            found = true;
            const result = parseExifGps(view, offset + 4, buf.byteLength);
            console.log('[EXIF] Parse result:', result);
            return resolve(result);
          }
          
          // SOS marker — stop scanning
          if (marker === 0xFFDA) break;
          
          offset += 2 + segLen;
        }
        
        if (!found) console.log('[EXIF] No APP1/EXIF marker found');
        resolve(null);
      } catch (err) {
        console.warn('[EXIF] Parse error:', err.message, err.stack);
        resolve(null);
      }
    };
    reader.onerror = () => { console.warn('[EXIF] FileReader error'); resolve(null); };
    reader.readAsArrayBuffer(file.slice(0, 512 * 1024)); // Read first 512KB
  });
};

function parseExifGps(view, segStart, totalLen) {
  // Check "Exif\0\0" header
  const e0 = view.getUint8(segStart), e1 = view.getUint8(segStart+1), e2 = view.getUint8(segStart+2), e3 = view.getUint8(segStart+3);
  const hdr = String.fromCharCode(e0, e1, e2, e3);
  if (hdr !== 'Exif') {
    console.log('[EXIF] No Exif header, got:', hdr, `(${e0},${e1},${e2},${e3})`);
    return null;
  }
  
  const tiffStart = segStart + 6;
  if (tiffStart + 8 > totalLen) return null;
  
  const byteOrder = view.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949; // 'II' = Intel = little endian
  console.log('[EXIF] Byte order:', littleEndian ? 'Little Endian (II)' : 'Big Endian (MM)');
  
  const get16 = (o) => o + 2 <= totalLen ? view.getUint16(o, littleEndian) : 0;
  const get32 = (o) => o + 4 <= totalLen ? view.getUint32(o, littleEndian) : 0;
  
  // Verify TIFF magic 0x002A
  if (get16(tiffStart + 2) !== 0x002A) {
    console.log('[EXIF] Bad TIFF magic:', get16(tiffStart + 2).toString(16));
    return null;
  }
  
  // IFD0 offset
  const ifd0Offset = tiffStart + get32(tiffStart + 4);
  if (ifd0Offset + 2 > totalLen) return null;
  
  const entryCount = get16(ifd0Offset);
  console.log('[EXIF] IFD0 entries:', entryCount, 'at offset', ifd0Offset);
  
  let gpsIfdPointer = null;
  
  for (let i = 0; i < entryCount && i < 100; i++) {
    const entryOff = ifd0Offset + 2 + i * 12;
    if (entryOff + 12 > totalLen) break;
    const tag = get16(entryOff);
    
    if (tag === 0x8825) { // GPSInfo IFD pointer
      gpsIfdPointer = get32(entryOff + 8);
      console.log('[EXIF] Found GPS IFD pointer:', gpsIfdPointer);
      break;
    }
  }
  
  if (gpsIfdPointer === null) {
    console.log('[EXIF] No GPS IFD pointer (0x8825) found in IFD0');
    return null;
  }
  
  const gpsIfdOffset = tiffStart + gpsIfdPointer;
  if (gpsIfdOffset + 2 > totalLen) return null;
  
  const gpsEntries = get16(gpsIfdOffset);
  console.log('[EXIF] GPS IFD entries:', gpsEntries, 'at offset', gpsIfdOffset);
  
  const gps = {};
  
  const readRational = (o) => {
    if (o + 8 > totalLen) return 0;
    const num = get32(o);
    const den = get32(o + 4);
    return den === 0 ? 0 : num / den;
  };
  
  for (let i = 0; i < gpsEntries && i < 50; i++) {
    const entryOff = gpsIfdOffset + 2 + i * 12;
    if (entryOff + 12 > totalLen) break;
    
    const tag = get16(entryOff);
    const type = get16(entryOff + 2);
    const count = get32(entryOff + 4);
    
    // For RATIONAL (type 5) and SRATIONAL (type 10), data is always at an offset
    // For small types (BYTE=1, ASCII=2, SHORT=3), data may be inline
    const dataOffset = (type === 5 || type === 10) 
      ? tiffStart + get32(entryOff + 8) 
      : entryOff + 8;
    
    console.log(`[EXIF] GPS tag: 0x${tag.toString(16)} type:${type} count:${count}`);
    
    if (tag === 1) { // GPSLatitudeRef (N/S) — type can be ASCII(2) or BYTE(1)
      gps.latRef = String.fromCharCode(view.getUint8(entryOff + 8));
    } else if (tag === 2 && count === 3 && (type === 5 || type === 10)) { // GPSLatitude
      gps.lat = readRational(dataOffset) + readRational(dataOffset + 8) / 60 + readRational(dataOffset + 16) / 3600;
    } else if (tag === 3) { // GPSLongitudeRef (E/W)
      gps.lngRef = String.fromCharCode(view.getUint8(entryOff + 8));
    } else if (tag === 4 && count === 3 && (type === 5 || type === 10)) { // GPSLongitude
      gps.lng = readRational(dataOffset) + readRational(dataOffset + 8) / 60 + readRational(dataOffset + 16) / 3600;
    }
  }
  
  console.log('[EXIF] Parsed GPS:', JSON.stringify(gps));
  
  if (gps.lat != null && gps.lng != null) {
    if (gps.latRef === 'S') gps.lat = -gps.lat;
    if (gps.lngRef === 'W') gps.lng = -gps.lng;
    // Sanity check
    if (Math.abs(gps.lat) <= 90 && Math.abs(gps.lng) <= 180 && (gps.lat !== 0 || gps.lng !== 0)) {
      const result = { lat: Math.round(gps.lat * 1000000) / 1000000, lng: Math.round(gps.lng * 1000000) / 1000000 };
      console.log('[EXIF] ✅ GPS:', result.lat, result.lng);
      return result;
    }
    console.log('[EXIF] GPS values out of range');
  } else {
    console.log('[EXIF] Missing lat or lng in GPS data');
  }
  return null;
}

// ============================================================================
// Camera capture — opens camera, returns { file, dataUrl }
// ============================================================================
window.BKK.openCamera = () => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Back camera
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ file, dataUrl: reader.result });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
};


// Compress icon to small PNG (64x64 max, preserves transparency)
window.BKK.compressIcon = (input, maxSize = 64, maxKB = 15) => {
  // RULE: icons max 64px AND max 15KB. Enforced by quality loop + canvas shrink.
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      // maxBytes: base64 is ~4/3 of binary size
      const maxBytes = maxKB * 1024 * (4 / 3);
      let result = null;
      for (const q of [0.85, 0.7, 0.55, 0.4, 0.25]) {
        result = canvas.toDataURL('image/webp', q);
        if (!result || result.startsWith('data:image/png')) {
          result = canvas.toDataURL('image/png');
          break;
        }
        if (result.length <= maxBytes) break;
      }
      // Last resort: shrink canvas by 50%
      if (result && result.length > maxBytes && w > 16) {
        canvas.width = Math.max(16, Math.round(w * 0.5));
        canvas.height = Math.max(16, Math.round(h * 0.5));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        result = canvas.toDataURL('image/webp', 0.5);
        if (!result || result.startsWith('data:image/png')) result = canvas.toDataURL('image/png');
      }
      resolve(result || null);
    };
    img.onerror = () => resolve(typeof input === 'string' ? input : null);
    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.readAsDataURL(input);
    }
  });
};

// ============================================================================
// Save image to device — triggers download of a data URL
// ============================================================================
window.BKK.saveImageToDevice = (dataUrl, filename) => {
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || 'foufou-photo.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.warn('Save image error:', err);
    return false;
  }
};

// ============================================================================
// Auto-name generation — "Graffiti Chinatown #3"
// ============================================================================
window.BKK.generateLocationName = (interestId, lat, lng, counters, allInterests, areaOptions) => {
  // Get interest English label
  const interest = allInterests.find(i => i.id === interestId);
  const interestName = interest?.labelEn || interest?.label || interestId;
  
  // Get area from coordinates
  let areaName = '';
  if (lat && lng) {
    const detectedAreas = window.BKK.getAreasForCoordinates(lat, lng);
    if (detectedAreas.length > 0) {
      const area = areaOptions.find(a => a.id === detectedAreas[0]);
      if (area) {
        // Use English label, shorten if too long
        let aName = area.labelEn || area.label || '';
        // Take first part before "&" or "and" if too long
        if (aName.length > 18) {
          const parts = aName.split(/\s*[&]\s*|\s+and\s+/i);
          aName = parts[0].trim();
        }
        // Still too long? Take first 2 words
        if (aName.length > 18) {
          aName = aName.split(/\s+/).slice(0, 2).join(' ');
        }
        areaName = aName;
      }
    }
  }
  
  // Get next counter
  const currentCount = counters[interestId] || 0;
  const nextNum = currentCount + 1;
  
  // Build name: "Graffiti Chinatown #3" or "Graffiti #4" (no area)
  const name = areaName 
    ? `${interestName} ${areaName} #${nextNum}`
    : `${interestName} #${nextNum}`;
  
  return { name, nextNum, interestId };
};

// ============================================================================
// Speech-to-Text — uses Web Speech API (built-in, no libraries needed)
// ============================================================================
window.BKK.speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

window.BKK.startSpeechToText = (options = {}) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  
  const lang = options.lang || ((localStorage.getItem('city_explorer_lang') || 'he') === 'he' ? 'he-IL' : 'en-US');
  const maxDuration = options.maxDuration || 10000; // 10 seconds default
  const onResult = options.onResult || function() {};
  const onEnd = options.onEnd || function() {};
  const onError = options.onError || function() {};
  
  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  
  let finalText = '';
  let timeoutId = null;

  recognition.onresult = function(event) {
    let newFinal = '';
    let interim = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        newFinal += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    if (newFinal) {
      finalText += newFinal;
      // Call onResult only with the new final chunk — not the full accumulated text
      // Callers are responsible for appending to their own state
      onResult(newFinal, true);
    } else if (interim) {
      // Interim results: pass for live preview only (isFinal=false)
      onResult(interim, false);
    }
  };
  
  recognition.onend = function() {
    clearTimeout(timeoutId);
    onEnd(finalText);
  };
  
  recognition.onerror = function(event) {
    clearTimeout(timeoutId);
    onError(event.error);
  };
  
  recognition.start();
  
  // Auto-stop after max duration
  timeoutId = setTimeout(function() {
    try { recognition.stop(); } catch(e) {}
  }, maxDuration);
  
  // Return stop function
  return function() {
    clearTimeout(timeoutId);
    try { recognition.stop(); } catch(e) {}
  };
};

console.log('[UTILS] Loaded successfully');
