// ============================================================================
// FouFou — City Trail Generator - Configuration & Constants
// Copyright © 2026 Eitan Fisher. All Rights Reserved.
// ============================================================================

window.BKK = window.BKK || {};
window.BKK.stopColorPalette = ['#4a90d9', '#e8a838', '#d95555', '#3bba7e', '#d97eb5', '#7c7ce0', '#9b7ed9', '#2eb8c9', '#e08540', '#b36dd9', '#38b3a0', '#c93d5a', '#7fb832', '#2e9ed9', '#c25ee0', '#d95070'];

// Map visual configuration — all defaults, overridable via Firebase settings.mapConfig
window.BKK.mapConfig = {
  // Route line styles (3-layer system: glow + base + animated flow)
  route: {
    glowColor: '#818cf8', glowWeight: 6, glowOpacity: 0.15,
    baseColor: '#6366f1', baseWeight: 2.5, baseOpacity: 0.5,
    flowColor: 'white', flowWeight: 2, flowOpacity: 0.7,
    flowDash: '4,12', flowSpeed: '0.8s', flowOffset: -20,
    infoColor: '#4f46e5'
  },
  // Stop markers on route map
  marker: {
    radius: 15, weight: 2.5, fillOpacity: 0.8, disabledFillOpacity: 0.2, disabledOpacity: 0.3,
    labelSize: 28, labelFontSize: '13px',
    startRingRadius: 20, startRingWeight: 3, startRingColor: '#22c55e', startRingDash: '6,4',
    startIconSize: 28, startIconFontSize: '14px'
  },
  // Area labels / circles on favorites map
  area: {
    fillOpacity: 0.15, weight: 2,
    labelFontSize: '10px', labelBg: 'rgba(255,255,255,0.88)',
    ghostFillOpacity: 0.04, ghostWeight: 1, ghostColor: '#94a3b8',
    labelsPaneZ: 450, markersPaneZ: 650
  },
  // Radius search display
  radiusSearch: {
    color: '#e11d48', fillOpacity: 0.12, weight: 3, dash: '8,6',
    centerRadius: 8
  },
  // GPS / location marker
  gps: {
    color: '#3b82f6', radius: 7, weight: 2
  }
};

// Generate or restore persistent visitor ID
(function() {
  let vid = null;
  try { vid = localStorage.getItem('foufou_visitor_id'); } catch(e) {}
  if (!vid) {
    vid = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem('foufou_visitor_id', vid); } catch(e) {}
  }
  window.BKK.visitorId = vid;
  // Try to get a display name
  let vname = null;
  try { vname = localStorage.getItem('foufou_visitor_name'); } catch(e) {}
  window.BKK.visitorName = vname || vid.slice(0, 10);
})();

// App Version
window.BKK.VERSION = '4.1.0';
// Convert stop index (0-based) to letter label: 0→A, 1→B, ..., 25→Z, 26→AA
window.BKK.stopLabel = function(i) {
  if (i < 26) return String.fromCharCode(65 + i);
  return String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
};

// Tile URL — MapTiler streets-v2 with English labels (uses OSM `name:en` tags)
// Key is restricted to foufou.city + eitanfisher2026.github.io HTTP origins.
// 256/ prefix returns 256px tiles so existing Leaflet configs (default tileSize) render correctly.
window.BKK.getTileUrl = function() {
  return 'https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=Uvu44hp7joiCfp72GhTj';
};

// App Name
window.BKK.APP_NAME = 'FouFou';

// Firebase Configuration
window.BKK.firebaseConfig = {
  apiKey: "AIzaSyCAH_2fk_plk6Dg5dlCCfaRWKL3Nmc6V6g",
  authDomain: "bangkok-explorer.firebaseapp.com",
  databaseURL: "https://bangkok-explorer-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bangkok-explorer",
  storageBucket: "bangkok-explorer.firebasestorage.app",
  messagingSenderId: "139083217994",
  appId: "1:139083217994:web:48fc6a45028c91d177bab3",
  measurementId: "G-QVGD0RKEHP"
};

// Google Places API Configuration
window.BKK.GOOGLE_PLACES_API_KEY = 'AIzaSyCE598tSisniM66ApqRvOyOq4svTf6pLHc';
window.BKK.GOOGLE_PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';
window.BKK.GOOGLE_PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// ============================================================================
// CITIES REGISTRY (lightweight metadata only - full data loaded dynamically)
// ============================================================================

window.BKK.cityRegistry = {
  bangkok: { id: 'bangkok', name: 'בנגקוק', nameEn: 'Bangkok', country: 'Thailand', icon: '🛺' },
  telaviv: { id: 'gushdan', name: 'תל אביב', nameEn: 'Tel Aviv', country: 'Israel', icon: '🏖️' },
  singapore: { id: 'singapore', name: 'סינגפור', nameEn: 'Singapore', country: 'Singapore', icon: '🦁' },
  malaga: { id: 'malaga', name: 'מלגה', nameEn: 'Malaga', country: 'Spain', icon: '☀️' },
  rome: { id: 'rome', name: 'רומא', nameEn: 'Rome', country: 'Italy', icon: '🏛️' },
  paris: { id: 'paris', name: 'פריז', nameEn: 'Paris', country: 'France', icon: '🗼' },
  london: { id: 'london', name: 'לונדון', nameEn: 'London', country: 'UK', icon: '🚌' },
  new_york: { id: 'new_york', name: 'ניו יורק', nameEn: 'New York', country: 'USA', icon: '🗽' },
  jerusalem: { id: 'jerusalem', name: 'ירושלים', nameEn: 'Jerusalem', country: 'Israel', icon: '🕍' },
  budapest: { id: 'budapest', name: 'בודפשט', nameEn: 'Budapest', country: 'Hungary', icon: '🏰' }
};

// Active cities (loaded from localStorage or defaults)
window.BKK.cities = {};
window.BKK.cityData = window.BKK.cityData || {};

// ============================================================================
// CITY LOADING & SELECTION
// ============================================================================

/**
 * Load a city's structural data from Firebase cities/{id}/config.
 * Returns a Promise that resolves with the city object.
 */
window.BKK.loadCity = function(cityId) {
  return new Promise(function(resolve, reject) {
    var reg = window.BKK.cityRegistry[cityId] ||
      Object.values(window.BKK.cityRegistry).find(function(r) { return r.id === cityId; });
    if (!reg) { reject('Unknown city: ' + cityId); return; }
    var db = window.BKK._database;
    if (!db) { reject('No database for city: ' + cityId); return; }
    db.ref('cities/' + cityId + '/config').once('value').then(function(snap) {
      var config = snap.val();
      if (config && config.center && config.areas) {
        var city = Object.assign({}, reg, config);
        if (config.areas && !Array.isArray(config.areas)) {
          city.areas = Object.keys(config.areas)
            .sort(function(a, b) { return parseInt(a) - parseInt(b); })
            .map(function(k) { return config.areas[k]; });
        }
        window.BKK.cities[cityId] = city;
        window.BKK.cityData[cityId] = city;
        resolve(city);
      } else {
        reject('No config in Firebase for city: ' + cityId);
      }
    }).catch(function(e) {
      reject('Firebase error for city ' + cityId + ': ' + (e.message || e));
    });
  });
};

/**
 * Unload a city to free memory (keeps registry entry).
 */
window.BKK.unloadCity = function(cityId) {
  delete window.BKK.cities[cityId];
  delete window.BKK.cityData[cityId];
  delete window.BKK.cityRegistry[cityId];
  // Remove from custom cities localStorage
  try {
    var customCities = JSON.parse(localStorage.getItem('custom_cities') || '{}');
    delete customCities[cityId];
    localStorage.setItem('custom_cities', JSON.stringify(customCities));
  } catch(e) {}
  console.log('[CONFIG] Unloaded city: ' + cityId);
};

/**
 * Load the city registry from Firebase settings/cityRegistry.
 * Merges Firebase entries on top of the JS-bundled registry so:
 *  - existing cities get their icon/name overridden from Firebase
 *  - new Firebase-only cities (added via foufou-build) appear in the picker
 * Call this once after Firebase is ready; pass the setRegistryVersion setter
 * so React re-renders the city dropdown.
 */
window.BKK.loadCityRegistry = function(db) {
  if (!db) return Promise.resolve();
  return db.ref('settings/cityRegistry').once('value').then(function(snap) {
    var fbReg = snap.val();
    if (!fbReg) return;
    var order = 0;
    Object.keys(fbReg).forEach(function(key) {
      var entry = fbReg[key];
      if (!entry || !entry.id) return;
      window.BKK.cityRegistry[key] = Object.assign(
        { order: order++ },
        window.BKK.cityRegistry[key] || {},
        entry
      );
    });
    console.log('[CONFIG] Registry from Firebase: ' + Object.keys(fbReg).length + ' cities');
  }).catch(function(e) {
    console.warn('[CONFIG] Registry load failed:', e.message || e);
  });
};

/**
 * Push one city's structural data to Firebase (admin only, one-time seed).
 * Writes:  cities/{cityId}/config  and  settings/cityRegistry/{regKey}
 */
window.BKK.seedCityToFirebase = function(cityId, db) {
  if (!db) return Promise.reject('No database');
  var city = window.BKK.cities[cityId];
  if (!city) return Promise.reject('City not loaded: ' + cityId);
  var regKey = Object.keys(window.BKK.cityRegistry || {}).find(function(k) {
    return window.BKK.cityRegistry[k].id === cityId;
  }) || cityId;
  var reg = window.BKK.cityRegistry[regKey] || {};
  var config = {
    center: city.center || null,
    allCityRadius: city.allCityRadius || 15000,
    distanceMultiplier: city.distanceMultiplier || 1.05,
    dayStartHour: city.dayStartHour != null ? city.dayStartHour : 7,
    nightStartHour: city.nightStartHour != null ? city.nightStartHour : 18,
    areas: city.areas || [],
    interestToGooglePlaces: city.interestToGooglePlaces || {},
    textSearchInterests: city.textSearchInterests || {},
    interestTooltips: city.interestTooltips || {},
    systemRoutes: city.systemRoutes || []
  };
  var registryEntry = {
    id: cityId,
    name: city.name || reg.name || '',
    nameEn: city.nameEn || reg.nameEn || '',
    country: city.country || reg.country || '',
    icon: (city.icon && !city.icon.startsWith('data:')) ? city.icon : (reg.icon || '🏙️'),
    active: city.active !== false,
    order: reg.order != null ? reg.order : 0
  };
  return Promise.all([
    db.ref('cities/' + cityId + '/config').set(config),
    db.ref('settings/cityRegistry/' + regKey).set(registryEntry)
  ]).then(function() {
    console.log('[CONFIG] Seeded: ' + cityId);
  });
};


/**
 * Export a city as a downloadable JS file (for GitHub upload).
 */
window.BKK.exportCityFile = function(city) {
  var cityId = city.id;
  // v3.23.26: prefer the registry KEY for the filename, falling back to id.
  // Lets legacy ids (e.g. "gushdan") export as the modern filename ("city-telaviv.js")
  // so the export matches the file actually loaded by cityRegistry.
  var registryKey = cityId;
  var reg = window.BKK.cityRegistry || {};
  for (var k in reg) {
    if (reg[k] && reg[k].id === cityId) { registryKey = k; break; }
  }
  // Strip data: URLs before saving to file — they belong in Firebase/theme, not in city files
  // Data URLs make city files huge and cause display bugs
  var cleanCity = JSON.parse(JSON.stringify(city));
  if (cleanCity.icon && cleanCity.icon.startsWith('data:')) cleanCity.icon = '📍';
  if (cleanCity.theme && cleanCity.theme.iconLeft && cleanCity.theme.iconLeft.startsWith('data:')) cleanCity.theme.iconLeft = '';
  var lines = [];
  lines.push('// City data: ' + city.nameEn);
  lines.push('window.BKK.cityData = window.BKK.cityData || {};');
  // Inner assignment still uses the id so existing Firebase data under cities/{id} keeps working
  lines.push('window.BKK.cityData.' + cityId + ' = ' + JSON.stringify(cleanCity, null, 2) + ';');

  var content = lines.join('\n') + '\n';
  var blob = new Blob([content], { type: 'text/javascript' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'city-' + registryKey + '.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('[CONFIG] Exported city file: city-' + registryKey + '.js');
};


/**
 * One-time cleanup: remove inProgress field from all Firebase records.
 * This field was removed in v3.5.1. Runs once per browser.
 */
window.BKK.cleanupInProgress = function(database) {
  if (!database) return Promise.resolve();
  if (localStorage.getItem('cleanup_inprogress_done') === 'true') return Promise.resolve();
  
  var cities = Object.keys(window.BKK.cities || {});
  var updates = {};
  var paths = [];
  
  cities.forEach(function(cityId) {
    paths.push('cities/' + cityId + '/customLocations');
    paths.push('cities/' + cityId + '/savedRoutes');
  });
  paths.push('customInterests');
  paths.push('settings/interestConfig');
  
  return Promise.all(paths.map(function(path) {
    return database.ref(path).once('value').then(function(snap) {
      var data = snap.val();
      if (!data) return;
      Object.keys(data).forEach(function(key) {
        if (data[key] && data[key].hasOwnProperty('inProgress')) {
          updates[path + '/' + key + '/inProgress'] = null;
        }
      });
    }).catch(function() {});
  })).then(function() {
    var count = Object.keys(updates).length;
    if (count > 0) {
      return database.ref().update(updates).then(function() {
        console.log('[CLEANUP] Removed inProgress from ' + count + ' records');
      });
    }
  }).then(function() {
    localStorage.setItem('cleanup_inprogress_done', 'true');
  }).catch(function(err) {
    console.error('[CLEANUP] inProgress removal error:', err);
  });
};



/**
 * Select a city and populate all legacy window.BKK.* variables.
 */
window.BKK.selectCity = function(cityId) {
  var city = window.BKK.cities[cityId];
  if (!city) {
    console.error('[CONFIG] City not loaded:', cityId);
    return false;
  }

  window.BKK.selectedCity = city;
  window.BKK.selectedCityId = cityId;
  window.BKK.activeCityData = city; // For GPS city-bounds validation

  // Populate legacy area variables
  window.BKK.areaOptions = city.areas.map(function(a) {
    return { id: a.id, label: a.label, labelEn: a.labelEn, desc: a.desc, descEn: a.descEn };
  });

  window.BKK.areaCoordinates = {};
  city.areas.forEach(function(a) {
    var multiplier = a.distanceMultiplier || city.distanceMultiplier || 1.2;
    window.BKK.areaCoordinates[a.id] = {
      lat: a.lat, lng: a.lng, radius: a.radius,
      distanceMultiplier: multiplier,
      size: a.size || 'medium',
      safety: a.safety || 'safe'
    };
  });

  // Populate legacy interest variables
  window.BKK.interestOptions = []; // interests now live in Firebase customInterests — loaded by React
  window.BKK.interestToGooglePlaces = city.interestToGooglePlaces || {};
  window.BKK.textSearchInterests = city.textSearchInterests || {};
  window.BKK.uncoveredInterests = []; // removed — noGoogleSearch flag on interests instead
  window.BKK.interestTooltips = city.interestTooltips || {};

  // City name for search queries
  window.BKK.cityNameForSearch = city.nameEn;

  // Time-of-day boundaries for this city
  window.BKK.dayStartHour = city.dayStartHour != null ? city.dayStartHour : 6;
  window.BKK.nightStartHour = city.nightStartHour != null ? city.nightStartHour : 17;

  console.log('[CONFIG] City selected: ' + city.nameEn + ' (' + city.areas.length + ' areas)');
  return true;
};

// City data is loaded on-demand from Firebase. Initial city load happens in React after Firebase is ready.
(function() {
  // Load custom cities from localStorage (legacy support)
  try {
    var customCities = JSON.parse(localStorage.getItem('custom_cities') || '{}');
    Object.keys(customCities).forEach(function(cityId) {
      window.BKK.cities[cityId] = customCities[cityId];
      window.BKK.cityData[cityId] = customCities[cityId];
      if (!window.BKK.cityRegistry[cityId]) {
        window.BKK.cityRegistry[cityId] = {
          id: cityId, name: customCities[cityId].name, nameEn: customCities[cityId].nameEn,
          country: customCities[cityId].country, icon: customCities[cityId].icon, file: null
        };
      }
    });
  } catch(e) {}
})();

// ============================================================================
// HELP CONTENT (shared across cities)
// ============================================================================

// Help content now served from i18n.js translations
// This getter dynamically returns help in the current language
Object.defineProperty(window.BKK, 'helpContent', {
  get() {
    return window.BKK.i18n.strings?.[window.BKK.i18n.currentLang]?.help || window.BKK.i18n.strings?.he?.help || {};
  }
});

// [CONFIG] loaded




