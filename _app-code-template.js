const { useState, useEffect, useMemo, useCallback, useRef } = React;

const firebaseConfig = window.BKK.firebaseConfig;

let firebaseApp = null;
let database = null;
let storage = null;
let auth = null;
let isFirebaseAvailable = false;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      const cfg = window.BKK.firebaseConfig;
      if (!cfg || !cfg.apiKey) { console.error('[FIREBASE] Config not found'); return; }
      firebaseApp = firebase.initializeApp(cfg);
      database = firebase.database();
      if (firebase.auth) { auth = firebase.auth(); }
      window.BKK.firebaseConnected = false;
      var _connTimer = null;
      database.ref('.info/connected').on('value', function(snap) {
        var isConnected = snap.val() === true;
        if (isConnected === window.BKK.firebaseConnected) return;
        clearTimeout(_connTimer);
        _connTimer = setTimeout(function() {
          if (isConnected === window.BKK.firebaseConnected) return;
          window.BKK.firebaseConnected = isConnected;
          console.log('[FIREBASE] Connection:', isConnected ? 'ONLINE' : 'OFFLINE');
          window.dispatchEvent(new CustomEvent('firebase-connection', { detail: { connected: isConnected } }));
        }, isConnected ? 500 : 2000);
      });
      if (firebase.storage) { storage = firebase.storage(); }
      // Initialize Analytics
      if (firebase.analytics) {
        try {
          window.BKK._analytics = firebase.analytics();
          window.BKK.logEvent = (eventName, params) => {
            if (window.BKK._isAdmin) return;
            try { window.BKK._analytics.logEvent(eventName, params || {}); } catch(e) {}
          };
        } catch(e) { window.BKK.logEvent = () => {}; }
      } else {
        window.BKK.logEvent = () => {};
      }
      isFirebaseAvailable = true;
      console.log('[FIREBASE] Initialized');
    }
  } catch (error) {
    console.error('[FIREBASE] Init failed:', error);
  }
}

const GOOGLE_PLACES_API_KEY = window.BKK.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_API_URL = window.BKK.GOOGLE_PLACES_API_URL;

// __INSERT_QUICK_ADD_COMPONENT__

const FouFouApp = () => {

// __INSERT_APP_LOGIC__

// __INSERT_VIEWS__

// __INSERT_DIALOGS__



      </div>
    </div>
  );
};

// Wait for Firebase, then init and render
window.__firebaseReady.then(function(sdkLoaded) {
  if (sdkLoaded) initFirebase();
  window.__beforeUnloadHandler = function(e) { e.preventDefault(); e.returnValue = ''; return ''; };
  window.addEventListener('beforeunload', window.__beforeUnloadHandler);
  window.BKK._navHistory = [];
  window.BKK._historyDepth = 0;
  window.BKK.pushNavState = function(state) {
    var last = window.BKK._navHistory[window.BKK._navHistory.length - 1];
    if (last && last.view === state.view && last.wizardStep === state.wizardStep) return;
    window.BKK._navHistory.push(state);
    window.BKK._historyDepth++;
    window.history.pushState({ appNav: true, depth: window.BKK._historyDepth }, '', window.location.href);
  };
  window.BKK.getNavBack = function() {
    if (window.BKK._navHistory.length > 1) { window.BKK._navHistory.pop(); return window.BKK._navHistory[window.BKK._navHistory.length - 1]; }
    return null;
  };
  window.addEventListener('popstate', function(e) {
    window.BKK._historyDepth = Math.max(0, window.BKK._historyDepth - 1);
    var prev = window.BKK.getNavBack();
    if (prev) window.dispatchEvent(new CustomEvent('app-nav-back', { detail: prev }));
    while (window.BKK._historyDepth < 2) { window.BKK._historyDepth++; window.history.pushState({ appNav: true, depth: window.BKK._historyDepth, cushion: true }, '', window.location.href); }
  });
  window.history.replaceState({ appNav: true, depth: 0 }, '', window.location.href);
  window.history.pushState({ appNav: true, depth: 1, cushion: true }, '', window.location.href);
  window.history.pushState({ appNav: true, depth: 2, cushion: true }, '', window.location.href);
  window.BKK._historyDepth = 2;
  ReactDOM.createRoot(document.getElementById('root')).render(<FouFouApp />);
});
