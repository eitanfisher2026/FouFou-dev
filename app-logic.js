  // Load saved preferences
  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('foufou_preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        // Admin-controlled settings: always use defaults (Firebase will override on load)
        // Don't trust localStorage values since admin may have changed them
        prefs.maxStops = 10;
        prefs.fetchMoreCount = prefs.fetchMoreCount || 3;
        // User-specific settings preserved from last session
        if (!prefs.searchMode) prefs.searchMode = 'area';
        if (prefs.searchMode === 'radius' && prefs.radiusMeters === 15000 && prefs.radiusPlaceName === t('general.allCity')) prefs.searchMode = 'all';
        if (!prefs.radiusMeters) prefs.radiusMeters = 500;
        if (!prefs.radiusSource) prefs.radiusSource = 'gps';
        if (!prefs.radiusPlaceName) prefs.radiusPlaceName = '';
        return prefs;
      }
    } catch (e) {}
    // First time user: area and interests empty, defaults for everything else
    return {
      hours: 3,
      area: '',
      interests: [],
      circular: true,
      startPoint: '',
      maxStops: 10,
      fetchMoreCount: 3,
      searchMode: 'area',
      radiusMeters: 500,
      radiusSource: 'gps',
      radiusPlaceId: null,
      radiusPlaceName: '',
      gpsLat: null,
      gpsLng: null,
      currentLat: null,
      currentLng: null
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // AUTH STATE — Firebase Authentication + Role-based access
  // Roles: 0 = regular, 1 = editor, 2 = admin
  // ═══════════════════════════════════════════════════════════════
  const [authUser, setAuthUser] = useState(null); // Firebase auth user object
  const authUserRef = React.useRef(null); // ref to always read current auth state (avoids stale closure in requireSignIn)
  const [authLoading, setAuthLoading] = useState(true); // true until onAuthStateChanged fires
  const [userRole, setUserRole] = useState(0); // 0=regular, 1=editor, 2=admin (real role from Firebase)
  const [userProfile, setUserProfile] = useState(null); // { name, email, photo, role, cities }
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [aboutEditing, setAboutEditing] = useState(false);
  const [aboutLocalText, setAboutLocalText] = useState('');
  const [allUsers, setAllUsers] = useState([]); // admin only: list of users
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMode, setLoginMode] = useState('login'); // 'login' | 'register'
  const [loginError, setLoginError] = useState('');
  const [roleOverride, setRoleOverride] = useState(null); // null = no override, 0/1/2 = impersonate

  // Effective role: override if set (admin testing), otherwise real role
  const effectiveRole = (roleOverride !== null && userRole >= 2) ? roleOverride : userRole;

  // Computed role checks use effectiveRole
  const isEditor = effectiveRole >= 1;
  const isAdmin = effectiveRole >= 2;
  // But keep real admin check for impersonation UI itself
  const isRealAdmin = userRole >= 2;
  const isUnlocked = isEditor; // backward compat — most old checks mean "can edit content"



  // ═══════════════════════════════════════════════════════════════
  // AUTH LISTENER — watches Firebase Auth state changes
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      authUserRef.current = user; // keep ref in sync
      setAuthUser(user);
      if (user) {
        // Analytics: track login
        if (!user.isAnonymous) {
          window.BKK.logEvent?.('login', { method: user.providerData?.[0]?.providerId || 'unknown' });
        }
        // Anonymous users: no Firebase profile. State lives in localStorage only.
        // This prevents accumulation of empty user records in Firebase.
        if (user.isAnonymous) {
          setUserProfile(null);
          setUserRole(0);
          window.BKK._isAdmin = false;
          setAuthLoading(false);
          return;
        }
        // Signed-in users: load or create Firebase profile
        try {
          const snap = await database.ref(`users/${user.uid}`).once('value');
          let profile = snap.val();
          if (!profile) {
            // First login — create profile
            // Bootstrap: if no users exist yet, make this user admin
            let initialRole = 0;
            try {
              const allUsersSnap = await database.ref('users').once('value');
              if (!allUsersSnap.val() || Object.keys(allUsersSnap.val()).length === 0) {
                initialRole = 2; // First user ever = admin
              }
            } catch (e) { /* ignore */ }
            profile = {
              name: user.displayName || '',
              email: user.email || '',
              photo: user.photoURL || '',
              role: initialRole,
              cities: [],
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            await database.ref(`users/${user.uid}`).set(profile);
          } else {
            // Update last login
            database.ref(`users/${user.uid}/lastLogin`).set(new Date().toISOString());
            if (user.email && profile.email !== user.email) {
              database.ref(`users/${user.uid}/email`).set(user.email);
            }
          }
          setUserProfile(profile);
          setUserRole(profile.role || 0);
          window.BKK._isAdmin = (profile.role || 0) >= 2;

          // Run one-time migrations for admin
          if ((profile.role || 0) >= 2) {
            migrateAddedBy(user.uid);
            migrateReviewRatings();
          }
        } catch (err) {
          console.error('[AUTH] Error loading profile:', err);
          setUserRole(0);
          window.BKK._isAdmin = false;
        }
      } else {
        console.log('[AUTH] Signed out');
        setUserProfile(null);
        setUserRole(0);
        window.BKK._isAdmin = false;
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auth functions
  const authSignInGoogle = async () => {
    if (!auth) return;
    setLoginError('');
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      setShowLoginDialog(false);
    } catch (err) {
      console.error('[AUTH] Google sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        // Fallback to redirect
        try { await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider()); } catch (e2) { setLoginError(e2.message); }
      } else {
        setLoginError(err.message);
      }
    }
  };

  const authSignInMicrosoft = async () => {
    if (!auth) return;
    setLoginError('');
    try {
      const provider = new firebase.auth.OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account' });
      await auth.signInWithPopup(provider);
      setShowLoginDialog(false);
    } catch (err) {
      console.error('[AUTH] Microsoft sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        try { await auth.signInWithRedirect(new firebase.auth.OAuthProvider('microsoft.com')); } catch (e2) { setLoginError(e2.message); }
      } else {
        setLoginError(err.message);
      }
    }
  };

  const authSignInApple = async () => {
    if (!auth) return;
    setLoginError('');
    try {
      const provider = new firebase.auth.OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await auth.signInWithPopup(provider);
      setShowLoginDialog(false);
    } catch (err) {
      console.error('[AUTH] Apple sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        try { await auth.signInWithRedirect(new firebase.auth.OAuthProvider('apple.com')); } catch (e2) { setLoginError(e2.message); }
      } else {
        setLoginError(err.message);
      }
    }
  };

  const authSignInAnonymous = async () => {
    if (!auth) return;
    setLoginError('');
    try {
      await auth.signInAnonymously();
      setShowLoginDialog(false);
    } catch (err) {
      console.error('[AUTH] Anonymous sign-in error:', err);
      setLoginError(err.message);
    }
  };

  const authSignOut = async () => {
    if (!auth) return;
    try {
      await auth.signOut();
      setShowLoginDialog(false);
    } catch (err) {
      console.error('[AUTH] Sign-out error:', err);
    }
  };


  const authDeleteAccount = async () => {
    if (!auth || !authUser || authUser.isAnonymous) return;
    const confirmed = window.confirm(
      (t('auth.deleteAccountConfirm') || 'האם אתה בטוח שברצונך למחוק את החשבון?\nפעולה זו בלתי הפיכה.')
    );
    if (!confirmed) return;
    try {
      await authUser.delete();
      setShowLoginDialog(false);
      showToast(t('auth.accountDeleted') || '🗑️ החשבון נמחק', 'info');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        showToast(t('auth.recentLoginRequired') || '⚠️ יש להתחבר מחדש לפני מחיקת החשבון', 'error');
        await auth.signOut();
      } else {
        console.error('[AUTH] Delete account error:', err);
        showToast(t('auth.deleteAccountError') || '❌ שגיאה במחיקת החשבון', 'error');
      }
    }
  };

  const authLinkAnonymousToGoogle = async () => {
    if (!auth || !authUser || !authUser.isAnonymous) return;
    setLoginError('');
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await authUser.linkWithPopup(provider);
      showToast(t('auth.accountLinked') || '✅ החשבון קושר בהצלחה!', 'success');
    } catch (err) {
      console.error('[AUTH] Link error:', err);
      setLoginError(err.message);
    }
  };

  const authUpdateUserRole = async (uid, newRole) => {
    if (!isRealAdmin || !database) return;
    try {
      await database.ref(`users/${uid}/role`).set(newRole);
      // Refresh allUsers if open
      if (showUserManagement) authLoadAllUsers();
      showToast(`✅ ${t('toast.roleUpdated')}: ${['Regular','Editor','Admin'][newRole]}`, 'success');
    } catch (err) {
      console.error('[AUTH] Update role error:', err);
      showToast('❌ ' + err.message, 'error');
    }
  };

  const authLoadAllUsers = async () => {
    if (!isRealAdmin || !database) return;
    try {
      const snap = await database.ref('users').once('value');
      const data = snap.val() || {};
      const list = Object.entries(data).map(([uid, profile]) => ({ uid, ...profile }));
      list.sort((a, b) => (b.role || 0) - (a.role || 0) || (a.name || '').localeCompare(b.name || ''));
      setAllUsers(list);
    } catch (err) {
      console.error('[AUTH] Load users error:', err);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // MIGRATION: Stamp addedBy on existing locations (one-time)
  // ═══════════════════════════════════════════════════════════════
  const migrateAddedBy = async (adminUid) => {
    if (!isFirebaseAvailable || !database || !adminUid) return;
    const migKey = 'foufou_migration_addedBy_done';
    if (localStorage.getItem(migKey)) return; // already done
    try {
      const cityIds = Object.keys(window.BKK.cities || {});
      let total = 0;
      for (const cityId of cityIds) {
        const snap = await database.ref(`cities/${cityId}/locations`).once('value');
        const locs = snap.val();
        if (!locs) continue;
        const updates = {};
        Object.entries(locs).forEach(([key, loc]) => {
          if (!loc.addedBy) {
            updates[`${key}/addedBy`] = adminUid;
            total++;
          }
        });
        if (Object.keys(updates).length > 0) {
          await database.ref(`cities/${cityId}/locations`).update(updates);
        }
      }
      localStorage.setItem(migKey, new Date().toISOString());
      if (total > 0) {
        console.log(`[MIGRATION] Stamped addedBy on ${total} locations`);
        addDebugLog('MIGRATION', `addedBy stamped on ${total} locations`);
      }
    } catch (err) {
      console.error('[MIGRATION] addedBy failed:', err);
    }
  }

  // One-time migration: populate reviewRatings/ from existing reviews/
  const migrateReviewRatings = async () => {
    if (!isFirebaseAvailable || !database) return;
    const migKey = 'foufou_migration_reviewRatings_done';
    if (localStorage.getItem(migKey)) return;
    try {
      const cities = Object.keys(window.BKK.cities || { bangkok: 1 });
      for (const cityId of cities) {
        const snap = await database.ref(`cities/${cityId}/reviews`).once('value');
        const data = snap.val();
        if (!data) continue;
        const updates = {};
        for (const [placeKey, userReviews] of Object.entries(data)) {
          for (const [uid, r] of Object.entries(userReviews)) {
            if (r.rating > 0) {
              updates[`cities/${cityId}/reviewRatings/${placeKey}/${uid}`] = r.rating;
            }
          }
        }
        if (Object.keys(updates).length > 0) {
          await database.ref().update(updates);
          console.log(`[MIGRATE] reviewRatings: wrote ${Object.keys(updates).length} ratings for ${cityId}`);
        }
      }
      localStorage.setItem(migKey, '1');
      console.log('[MIGRATE] reviewRatings migration complete');
    } catch (e) {
      console.error('[MIGRATE] reviewRatings error:', e);
    }
  };;

  const [currentView, setCurrentView] = useState('form');
  const [currentLang, setCurrentLang] = useState(() => {
    try { return (window.BKK && window.BKK.i18n && window.BKK.i18n.currentLang) || 'he'; } catch(e) { return 'he'; }
  });
  const [selectedCityId, setSelectedCityId] = useState(() => {
    try { return localStorage.getItem('city_explorer_city') || 'bangkok'; } catch(e) { return 'bangkok'; }
  });
  // City active/inactive states — React state so UI re-renders when admin changes cities
  // Do NOT initialize from localStorage — always wait for Firebase to avoid stale cache
  const [cityActiveStates, setCityActiveStates] = useState({});
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState(loadPreferences());
  const [route, setRoute] = useState(null);
  const [routeListKey, setRouteListKey] = useState(0); // incremented to force re-render of route stop list after favorites change
  const [isGenerating, setIsGenerating] = useState(false);
  const [disabledStops, setDisabledStops] = useState([]); // Track disabled stop IDs
  const disabledStopsRef = React.useRef(disabledStops);
  React.useEffect(() => { disabledStopsRef.current = disabledStops; }, [disabledStops]);
  const reoptimizeTimerRef = React.useRef(null);
  const [isReoptimizing, setIsReoptimizing] = useState(false);

  // Trigger 3: auto-reoptimize when disabled stops change (skip/unskip)
  const prevDisabledRef = React.useRef(disabledStops);
  React.useEffect(() => {
    if (!route?.stops?.length) { prevDisabledRef.current = disabledStops; return; }
    if (prevDisabledRef.current === disabledStops) return;
    prevDisabledRef.current = disabledStops;
    scheduleReoptimize();
  }, [disabledStops]);
  
  // === SHARED HELPERS (avoid code duplication) ===
  
  // Check if a stop is disabled — single source of truth
  const isStopDisabled = (stop) => disabledStops.includes((stop.name || '').toLowerCase().trim()) || !!stop.trailSkipped;
  
  // Find smart start point: GPS nearest → circular first → null (let optimizer pick)
  // Debounced auto-reoptimize — called when stops/start change, never cuts stops
  // Uses runSmartPlanRef so setTimeout always calls the LATEST version (avoids stale closure)
  const runSmartPlanRef = React.useRef(null);
  const scheduleReoptimize = () => {
    if (reoptimizeTimerRef.current) clearTimeout(reoptimizeTimerRef.current);
    reoptimizeTimerRef.current = setTimeout(() => {
      if (runSmartPlanRef.current) {
        setIsReoptimizing(true);
        runSmartPlanRef.current({ skipSmartSelect: true });
        setIsReoptimizing(false);
      }
    }, 600);
  };

  const findSmartStart = (stops, gps, isCircular) => {
    if (gps?.lat && gps?.lng) {
      const check = window.BKK.isGpsWithinCity(gps.lat, gps.lng);
      if (check.withinCity) {
        let minDist = Infinity, nearest = null;
        stops.forEach(s => {
          const d = calcDistance(gps.lat, gps.lng, s.lat, s.lng);
          if (d < minDist) { minDist = d; nearest = s; }
        });
        if (nearest) return { lat: nearest.lat, lng: nearest.lng, address: nearest.name };
      }
    }
    // No GPS — pick start based on area center (or city center as fallback)
    // For circular: nearest stop to area center (natural anchor for a loop)
    // For linear: nearest stop to area center (reasonable entry point, even if not a true endpoint)
    const areaId = formData?.area;
    const areaObj = (window.BKK.areaOptions || []).find(a => a.id === areaId);
    const refLat = areaObj?.lat ?? window.BKK.activeCityData?.center?.lat ?? window.BKK.selectedCity?.center?.lat;
    const refLng = areaObj?.lng ?? window.BKK.activeCityData?.center?.lng ?? window.BKK.selectedCity?.center?.lng;
    if (refLat && refLng && stops.length > 0) {
      let minDist = Infinity, nearest = null;
      stops.forEach(s => {
        const d = calcDistance(refLat, refLng, s.lat, s.lng);
        if (d < minDist) { minDist = d; nearest = s; }
      });
      if (nearest) return { lat: nearest.lat, lng: nearest.lng, address: nearest.name };
    }
    if (stops.length > 0) {
      return { lat: stops[0].lat, lng: stops[0].lng, address: stops[0].name };
    }
    return null;
  };
  
  // Full smart plan: select stops, find start, optimize, update state
  // Returns { optimized, disabled, autoStart, isCircular } or null on failure
  const runSmartPlan = (options = {}) => {
    const { openMap = false, startTrail = false, skipSmartSelect = false, overrideStart = null, overrideType = null } = options;
    
    if (!route?.stops?.length) return null;
    const allStops = route.stops.filter(s => s.lat && s.lng);
    if (allStops.length < 2) { showToast(t('places.noPlacesWithCoords'), 'warning'); return null; }
    
    const isCircular = overrideType !== null ? overrideType === 'circular' : routeType === 'circular';
    
    // Step 1: Smart select or respect manual choices
    let selected, disabledList, newDisabled;
    if (skipSmartSelect) {
      const curDisabled = disabledStopsRef.current || [];
      selected = allStops.filter(s => !curDisabled.includes((s.name || '').toLowerCase().trim()));
      disabledList = allStops.filter(s => curDisabled.includes((s.name || '').toLowerCase().trim()));
      newDisabled = curDisabled;
    }
    // Always ensure manuallyAdded stops are in selected (never dropped by smart select)
    if (selected.length > 0) {
      const manualInDisabled = disabledList.filter(s => s.manuallyAdded);
      if (manualInDisabled.length > 0) {
        selected = [...selected, ...manualInDisabled];
        disabledList = disabledList.filter(s => !s.manuallyAdded);
      }
    } else {
      const result = smartSelectStops(allStops, formData.interests);
      selected = result.selected;
      disabledList = result.disabled;
      newDisabled = disabledList.map(s => (s.name || '').toLowerCase().trim());
      setDisabledStops(newDisabled);
    }
    if (selected.length < 2) { showToast(t('places.noPlacesWithCoords'), 'warning'); return null; }
    
    // Step 2: Find start point
    let autoStart = overrideStart || startPointCoordsRef.current;
    if (!autoStart) {
      const gps = (formData.currentLat && formData.currentLng) ? { lat: formData.currentLat, lng: formData.currentLng } : null;
      autoStart = findSmartStart(selected, gps, isCircular);
    }
    
    // Step 3: Optimize route order
    // If there's an isRadiusCenter stop, pin it at position 0 — UNLESS the user manually chose a different start point
    const radiusCenterStop = selected.find(s => s.isRadiusCenter) || null;
    // User overrode start = overrideStart provided AND it doesn't match the radius center's coordinates
    const userOverrodeStart = overrideStart && radiusCenterStop &&
      (Math.abs(overrideStart.lat - radiusCenterStop.lat) > 0.0001 ||
       Math.abs(overrideStart.lng - radiusCenterStop.lng) > 0.0001);
    if (userOverrodeStart) {
      // User took manual control — release the pin so radius center becomes a regular stop
      radiusCenterStop.isRadiusCenter = false;
    }
    const pinnedFirstStop = (radiusCenterStop && !userOverrodeStart) ? radiusCenterStop : null;
    const optimized = optimizeStopOrder(selected, autoStart, isCircular, pinnedFirstStop);
    
    // For linear without explicit start: use first optimized stop
    if (!autoStart && optimized.length > 0) {
      autoStart = { lat: optimized[0].lat, lng: optimized[0].lng, address: optimized[0].name };
    }
    
    // Step 4: Update state
    setStartPointCoords(autoStart);
    startPointCoordsRef.current = autoStart;
    setFormData(prev => ({...prev, startPoint: autoStart?.address || (autoStart ? `${autoStart.lat},${autoStart.lng}` : '')}));
    
    const newStops = [...optimized, ...disabledList];
    setRoute(prev => prev ? { ...prev, stops: newStops, circular: isCircular, optimized: true, startPoint: autoStart?.address, startPointCoords: autoStart } : prev);
    
    // Step 5: Optional actions
    if (startTrail) startActiveTrail(optimized, formData.interests, formData.area);
    if (openMap && autoStart) {
      const urls = window.BKK.buildGoogleMapsUrls(
        optimized.map(s => ({ lat: s.lat, lng: s.lng, name: s.name })),
        `${autoStart.lat},${autoStart.lng}`, isCircular, window.BKK.googleMaxWaypoints || 12
      );
      if (urls.length > 0) {
        window.open(urls[0].url, 'city_explorer_map');
        window.BKK.logEvent?.('route_started', {
          city: selectedCityId,
          stops: optimized.length,
          circular: isCircular ? 1 : 0,
          interests: formData.interests?.length || 0
        });
      }
    }
    
    return { optimized, disabled: disabledList, autoStart, newDisabled, isCircular };
  };
  
  const [showRoutePreview, setShowRoutePreview] = useState(false); // Route reorder dialog
  const reorderOriginalStopsRef = React.useRef(null); // Snapshot of stops before reorder
  const userManualOrderRef = React.useRef(false); // True after user manually reordered stops
  // Pending actions: auto-save place first, then open review/refresh rating
  const pendingReviewOpenRef = React.useRef(false);
  const pendingRatingRefreshRef = React.useRef(false);
  const [showRouteMenu, setShowRouteMenu] = useState(false); // Hamburger menu in route results
  const [showHeaderMenu, setShowHeaderMenu] = useState(false); // Main hamburger menu in header
  const [routeChoiceMade, setRouteChoiceMade] = useState(null); // null | 'manual' — controls wizard step 3 split
  
  // Auto-compute route whenever route exists with stops but isn't optimized
  // Skip in wizard mode when user hasn't chosen Yalla/Manual yet
  const autoComputeRef = React.useRef(false);
  React.useEffect(() => {
    if (route && route.stops && route.stops.length >= 2 && !route.optimized && !autoComputeRef.current) {
      // Don't auto-compute while wizard choice screen is showing
      if (routeChoiceMade === null) return;
      autoComputeRef.current = true;
      const timer = setTimeout(() => {
        console.log('[AUTO-COMPUTE] Route not optimized, auto-computing...');
        recomputeForMap(null, undefined, true); // skipSmartSelect: respect user's manual disable choices
        autoComputeRef.current = false;
      }, 300);
      return () => { clearTimeout(timer); autoComputeRef.current = false; };
    }
  }, [route?.stops?.length, route?.optimized, routeChoiceMade]);
  const [manualStops, setManualStops] = useState([]); // Manually added stops (session only)
  const [showManualAddDialog, setShowManualAddDialog] = useState(false);
  const [activeTrail, setActiveTrail] = useState(() => {
    try {
      const saved = localStorage.getItem('foufou_active_trail');
      if (saved) {
        const trail = JSON.parse(saved);
        // Auto-expire after configured hours
        if (trail.startedAt && (Date.now() - trail.startedAt) > (window.BKK.systemParams?.trailTimeoutHours || 8) * 60 * 60 * 1000) {
          localStorage.removeItem('foufou_active_trail');
          return null;
        }
        return trail;
      }
    } catch(e) {}
    return null;
  });
  const [skippedTrailStops, setSkippedTrailStops] = useState(new Set());
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [quickAddPlace, setQuickAddPlace] = useState(null); // Google place being added
  const [fabPos, setFabPos] = useState(() => {
    try { const s = localStorage.getItem('foufou_fab_pos'); return s ? JSON.parse(s) : null; } catch(e) { return null; }
  });
  const fabDragRef = React.useRef({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, moved: false });
  // Remembers last capture interests within the session (NOT persisted — resets on page load)
  // Used to pre-select the same interest(s) on next capture. Empty on first capture.
  const lastCaptureInterestsRef = React.useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState(null); // 'description' | 'notes' | null
  const [interimText, setInterimText] = useState(''); // live speech preview
  const stopRecordingRef = React.useRef(null);

  // Unified stop — safe to call anytime
  const stopAllRecording = () => {
    if (stopRecordingRef.current) { stopRecordingRef.current(); stopRecordingRef.current = null; }
    setIsRecording(false); setRecordingField(null); setInterimText('');
  };

  // Send automated system feedback — rate-limited per device by systemAlertIntervalHours
  const sendSystemAlert = (message) => {
    if (!isFirebaseAvailable || !database) return;
    const intervalMs = (window.BKK.systemParams?.systemAlertIntervalHours ?? 1) * 3600000;
    try {
      const last = parseInt(localStorage.getItem('foufou_last_system_alert') || '0');
      if (Date.now() - last < intervalMs) return; // rate limit
      localStorage.setItem('foufou_last_system_alert', String(Date.now()));
    } catch(e) {}
    database.ref('feedback').push({
      text: '[SYSTEM ALERT] ' + message,
      userId: 'system',
      userName: 'FouFou System 🤖',
      timestamp: Date.now(),
      type: 'system_alert',
      version: window.BKK.VERSION,
      userAgent: navigator.userAgent.slice(0, 120)
    }).catch(() => {});
  };

  // Unified recording toggle for a field
  const toggleRecording = (fieldId, onFinalText, onClearBefore, lang = null) => {
    if (isRecording && recordingField === fieldId) { stopAllRecording(); return; }
    if (isRecording) stopAllRecording();
    if (onClearBefore) onClearBefore();
    setIsRecording(true); setRecordingField(fieldId); setInterimText('');
    const stop = window.BKK.startSpeechToText({
      maxDuration: (window.BKK.systemParams?.speechMaxSeconds || 15) * 1000,
      ...(lang ? { lang } : {}),
      onResult: (text, isFinal) => {
        if (isFinal) { setInterimText(''); onFinalText(text); }
        else { setInterimText(text); }
      },
      onEnd: () => { setIsRecording(false); setRecordingField(null); setInterimText(''); stopRecordingRef.current = null; },
      onError: (error) => {
        setIsRecording(false); setRecordingField(null); setInterimText(''); stopRecordingRef.current = null;
        if (error === 'not-allowed') showToast('🎤 ' + (t('speech.micPermissionDenied') || 'אין הרשאת מיקרופון'), 'error');
      }
    });
    stopRecordingRef.current = stop;
  };

  // RecordingTextarea — unified component used everywhere
  // fieldId: unique string per field. value/onChange: controlled. onClear: optional.
  // clearOnStart: clears field before recording. lang: override speech language (e.g. 'en-US').
  // asInput: renders <input> instead of <textarea> (for name fields).
  const RecordingTextarea = ({ fieldId, value, onChange, onClear, placeholder, rows = 2, className = '', style = {}, clearOnStart = false, lang = null, asInput = false }) => {
    const active = isRecording && recordingField === fieldId;
    const isRTL = window.BKK.i18n.isRTL();
    const handleMic = () => {
      const onFinal = (text) => onChange({ target: { value: (clearOnStart ? '' : (value ? value + ' ' : '')) + text } });
      const onClearBefore = clearOnStart ? () => { onClear ? onClear() : onChange({ target: { value: '' } }); } : null;
      toggleRecording(fieldId, onFinal, onClearBefore, lang);
    };
    const baseStyle = { direction: isRTL ? 'rtl' : 'ltr', width: '100%', boxSizing: 'border-box', borderColor: active ? '#ef4444' : undefined, paddingRight: isRTL ? '24px' : '8px', paddingLeft: isRTL ? '8px' : '24px' };
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: asInput ? 'center' : 'flex-start' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          {asInput ? (
            <input type="text"
              value={value} onChange={onChange}
              placeholder={active ? '' : placeholder}
              className={className || 'w-full p-2 border-2 border-gray-300 rounded-lg'}
              style={{ ...baseStyle, fontSize: '16px', ...style }}
            />
          ) : (
            <textarea
              value={value} onChange={onChange}
              placeholder={active ? '' : placeholder}
              className={className || 'w-full p-2 border-2 border-gray-300 rounded-lg'}
              style={{ ...baseStyle, fontSize: '14px', minHeight: '56px', resize: 'vertical', lineHeight: '1.4', ...style }}
              rows={rows}
            />
          )}
          {value?.trim() && (
            <button type="button"
              onClick={() => { stopAllRecording(); onClear ? onClear() : onChange({ target: { value: '' } }); }}
              style={{ position: 'absolute', top: asInput ? '50%' : '6px', transform: asInput ? 'translateY(-50%)' : 'none', [isRTL ? 'right' : 'left']: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '13px', lineHeight: 1, padding: '2px' }}
            >✕</button>
          )}
        </div>
        {window.BKK?.speechSupported && (
          <button type="button" onClick={handleMic}
            style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: active ? '#ef4444' : '#f3f4f6', color: active ? 'white' : '#6b7280', animation: active ? 'pulse 1s ease-in-out infinite' : 'none', boxShadow: active ? '0 0 0 3px rgba(239,68,68,0.3)' : 'none' }}
          >🎤</button>
        )}
      </div>
    );
  };

  // Interim bar — show below any RecordingTextarea when active for that field
  const RecordingInterim = ({ fieldId }) => {
    if (!isRecording || recordingField !== fieldId || !interimText) return null;
    return (
      <div style={{ marginTop: '4px', padding: '4px 8px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#92400e', fontStyle: 'italic', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
        🎤 {interimText}
      </div>
    );
  };

  // Detect return from Google Maps — check localStorage for activeTrail
  // Also check for app updates when returning to tab
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Check for active trail
        try {
          const saved = localStorage.getItem('foufou_active_trail');
          if (saved) {
            const trail = JSON.parse(saved);
            if (trail.startedAt && (Date.now() - trail.startedAt) < (window.BKK.systemParams?.trailTimeoutHours || 8) * 60 * 60 * 1000) {
              setActiveTrail(trail);
              setCurrentView('form');
              window.scrollTo(0, 0);
            } else {
              localStorage.removeItem('foufou_active_trail');
              setActiveTrail(null);
            }
          }
        } catch(e) {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  // Time filter for interest grid: 'all' | 'day' | 'night'
  // Controls which interests are visible in wizard step 1.
  // Also drives hard time filter in smartSelectStops (see below).
  const [interestTimeFilter, setInterestTimeFilter] = useState(
    () => localStorage.getItem('foufou_time_filter') || 'all'
  );
  // Persist time filter changes
  // Per-mode interest selections: save/restore when switching time filter
  // Key: foufou_interests_day / foufou_interests_night / foufou_interests_all
  const saveInterestsForMode = (mode, interests) => {
    try { localStorage.setItem(`foufou_interests_${mode}`, JSON.stringify(interests)); } catch(e) {}
  };
  const loadInterestsForMode = (mode) => {
    try {
      const saved = localStorage.getItem(`foufou_interests_${mode}`);
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  };

  const setInterestTimeFilterAndSave = (val) => {
    // Save current selections for the current mode before switching
    saveInterestsForMode(interestTimeFilter, formData.interests);
    // Load saved selections for the new mode
    const savedForNewMode = loadInterestsForMode(val);
    setFormData(prev => ({ ...prev, interests: savedForNewMode }));
    setInterestTimeFilter(val);
    try { localStorage.setItem('foufou_time_filter', val); } catch(e) {}
  };

  const [routeType, setRouteType] = useState(() => {
    // Load from localStorage or default to 'circular'
    const saved = localStorage.getItem('foufou_route_type');
    return saved || 'circular';
  }); // 'circular' or 'linear'
  
  // Time-of-day mode for content-aware routing (uses city-level settings)
  const getAutoTimeMode = () => {
    const h = new Date().getHours();
    const dayStart = window.BKK.dayStartHour ?? 6;
    const nightStart = window.BKK.nightStartHour ?? 17;
    // Day = dayStart..nightStart, Night = nightStart..dayStart (wraps midnight)
    if (nightStart > dayStart) {
      return (h >= dayStart && h < nightStart) ? 'day' : 'night';
    } else {
      // nightStart < dayStart (e.g. night=22, day=8)
      return (h >= dayStart || h < nightStart) ? 'day' : 'night';
    }
  };
  const routeTimeModeRef = React.useRef('auto');
  const getEffectiveTimeMode = () => routeTimeModeRef.current === 'auto' ? getAutoTimeMode() : routeTimeModeRef.current;

  // Shared helper: determine a stop's best time (day/night/anytime)
  // Checks in order: explicit bestTime field → name keywords → interestConfig → interest defaults
  const NIGHT_NAME_KEYWORDS = ['night market', 'nightmarket', 'night bazaar', 'night bazar', 'talat rot fai', 'asiatique'];
  const DAY_NAME_KEYWORDS = ['morning market', 'breakfast market'];
  const INTEREST_DEFAULT_TIMES = {
    temples: 'day', galleries: 'day', architecture: 'day', parks: 'day',
    beaches: 'day', graffiti: 'day', artisans: 'day', canals: 'day',
    culture: 'day', history: 'day', markets: 'day', shopping: 'day',
    nightlife: 'night', bars: 'night', rooftop: 'night', entertainment: 'night'
  };
  const getStopBestTime = (stop) => {
    // 1. Explicit per-stop override
    if (stop.bestTime) return stop.bestTime;
    // 2. Name-based detection (catches "night market", "Asiatique" etc.)
    const nameLower = (stop.name || '').toLowerCase();
    if (NIGHT_NAME_KEYWORDS.some(kw => nameLower.includes(kw))) return 'night';
    if (DAY_NAME_KEYWORDS.some(kw => nameLower.includes(kw))) return 'day';
    // 3. interestConfig bestTime (Firebase-configurable per interest)
    for (const id of (stop.interests || [])) {
      const cfg = interestConfig[id];
      if (cfg?.bestTime && cfg.bestTime !== 'anytime') return cfg.bestTime;
    }
    // 4. Hard-coded interest defaults
    for (const id of (stop.interests || [])) {
      if (INTEREST_DEFAULT_TIMES[id]) return INTEREST_DEFAULT_TIMES[id];
    }
    return 'anytime';
  };


  const [customLocations, setCustomLocations] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [pendingLocations, setPendingLocations] = useState([]);
  const [pendingInterests, setPendingInterests] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [addLocRatingScore, setAddLocRatingScore] = useState(0);
  const [addLocRatingText, setAddLocRatingText] = useState('');
  const [placesTab, setPlacesTab] = useState('all'); // 'all' | 'drafts' | 'ready' | 'skipped'
  const [lastImportBatch, setLastImportBatch] = useState(null); // batch ID of last import
  const [filterImportBatch, setFilterImportBatch] = useState(false); // filter to show only last import
  const [filterNoInterest, setFilterNoInterest] = useState(false); // admin/editor: show places with no interest
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [placesGroupBy, setPlacesGroupBy] = useState('interest'); // 'interest' or 'area'
  const [placesSortBy, setPlacesSortBy] = useState(() => {
    try { return JSON.parse(localStorage.getItem('foufou_preferences') || '{}').placesSortBy || 'updatedAt'; } catch(e) { return 'updatedAt'; }
  }); // 'updatedAt' | 'addedAt' | 'interest' | 'area'
  const [routesSortBy, setRoutesSortBy] = useState('area'); // 'area' or 'name'
  const [editingRoute, setEditingRoute] = useState(null);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [routeDialogMode, setRouteDialogMode] = useState('edit'); // 'add' or 'edit'
  const [newLocation, setNewLocation] = useState({
    name: '',
    description: '',
    notes: '',
    area: formData.area,
    areas: [formData.area],
    interests: [],
    lat: null,
    lng: null,
    mapsUrl: '',
    address: '',  // Address for geocoding
    uploadedImage: null,  // Base64 image data
    imageUrls: [],  // Array of URL strings
  });
  const [customInterests, setCustomInterests] = useState(() => {
    try {
      const cached = localStorage.getItem('foufou_custom_interests');
      return cached ? JSON.parse(cached) : [];
    } catch(e) { return []; }
  });
  const [interestStatus, setInterestStatus] = useState(() => {
    try {
      const cached = localStorage.getItem('foufou_interest_status');
      return cached ? JSON.parse(cached) : {};
    } catch(e) { return {}; }
  });
  
  // Interest search configuration (editable)
  // Default interest search configurations — used before Firebase loads and as fallback
  const defaultConfig = React.useMemo(() => ({
    temples: { types: ['hindu_temple', 'buddhist_temple', 'church', 'mosque'], blacklist: ['hotel', 'restaurant', 'school'] },
    food: { types: ['restaurant', 'meal_takeaway'], blacklist: ['bar', 'pub', 'club', 'hotel', 'hostel'] },
    graffiti: { textSearch: 'street art', blacklist: ['tattoo', 'ink', 'piercing', 'salon'] },
    artisans: { types: ['store', 'art_gallery'], blacklist: ['cannabis', 'weed', 'kratom', 'massage', 'spa', '7-eleven', 'convenience'] },
    galleries: { types: ['art_gallery', 'museum'], blacklist: ['cannabis', 'weed', 'kratom', 'massage', 'spa', 'cafe', 'coffee', 'hotel'] },
    architecture: { types: ['historical_landmark'], blacklist: ['hotel', 'restaurant', 'mall', 'parking'] },
    canals: { types: ['boat_tour_agency', 'marina'], blacklist: ['hotel', 'restaurant', 'parking'] },
    cafes: { types: ['cafe', 'coffee_shop'], blacklist: ['cannabis', 'weed', 'kratom', 'hookah', 'shisha'] },
    markets: { types: ['market', 'shopping_mall'], blacklist: ['hotel', 'supermarket', '7-eleven', 'convenience', 'tesco', 'big c', 'makro'] },
    nightlife: { types: ['bar', 'night_club'], blacklist: ['restaurant', 'hotel', 'hostel', 'cafe'] },
    parks: { types: ['park', 'national_park'], blacklist: ['hotel', 'parking', 'car park', 'garage', 'water park'] },
    rooftop: { types: ['bar', 'restaurant'], blacklist: ['parking', 'car park', 'garage'] },
    entertainment: { types: ['movie_theater', 'amusement_park', 'performing_arts_theater'], blacklist: ['hotel', 'mall'] },
    massage_spa: { blacklist: [] },
    fitness: { blacklist: [] },
    shopping_special: { blacklist: [] },
    learning: { blacklist: [] },
    health: { blacklist: [] },
    accommodation: { blacklist: [] },
    transport: { blacklist: [] },
    business: { blacklist: [] },
  }), []);

  const [interestConfig, setInterestConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('foufou_interest_config');
      return cached ? JSON.parse(cached) : {};
    } catch(e) { return {}; }
  });
  const [cityHiddenInterests, setCityHiddenInterests] = useState({}); // { cityId: Set<interestId> }
  const [interestGroups, setInterestGroups] = useState(() => {
    // Load from localStorage cache so first render is already sorted
    try {
      const cached = localStorage.getItem('foufou_interest_groups');
      return cached ? JSON.parse(cached) : {};
    } catch(e) { return {}; }
  });
  const [aboutContent, setAboutContent] = useState({ he: '', en: '' }); // admin-editable about text

  const toggleCityForInterest = (interestId, cityId) => {
    const cur = cityHiddenInterests[cityId] || new Set();
    const next = new Set(cur);
    if (next.has(interestId)) next.delete(interestId); else next.add(interestId);
    const arr = [...next];
    setCityHiddenInterests(prev => ({ ...prev, [cityId]: next }));
    if (isFirebaseAvailable && database) {
      database.ref(`settings/cityHiddenInterests/${cityId}`).set(arr.length > 0 ? arr : null)
        .catch(e => console.error('[CITY] toggle error:', e));
    }
  };
  const [showDedupDropdown, setShowDedupDropdown] = useState(false); // dedupRelated dropdown in interest dialog

  // System parameters — configurable scoring/optimization values
  if (!window.BKK._defaultSystemParams) {
    window.BKK._defaultSystemParams = {
      // App settings (admin-controlled)
      maxStops: 10,
      fetchMoreCount: 3,
      googleMaxWaypoints: 12,
      defaultRadius: 500,
      // Dedup
      dedupRadiusMeters: 100,
      dedupGoogleEnabled: 1,
      dedupCustomEnabled: 1,
      // Trail
      trailTimeoutHours: 8,
      defaultInterestWeight: 3,
      maxContentPasses: 3,
      contentReorderEnabled: true,
      maxContentGeoIncrease: 0.05, // Max 5% distance increase for content reordering (was 25%!)
      twoOptMaxPasses: 20, // 2-opt improvement passes for route optimization
      // Time scoring
      timeScoreMatch: 2,
      timeScoreAnytime: 1,
      timeScoreConflict: 0,
      timeConflictPenalty: 3,
      // Slot positioning
      slotEarlyThreshold: 0.4,
      slotLateThreshold: 0.6,
      slotEndThreshold: 0.7,
      slotPenaltyMultiplier: 3,
      slotEndPenaltyMultiplier: 4,
      gapPenaltyMultiplier: 2,
      includeDrafts: true,
      // Speech recording
      speechMaxSeconds: 15,
      speechRate: 1.0,
      // Toast display duration (ms)
      toastDuration: 4000,
      // Point search (מסביב למקום dropdown)
      pointSearchMaxGoogle: 10,   // max Google results in dropdown
      pointSearchMaxFavorites: 5, // max favorite results in dropdown
      // Favorite scoring — weighted priority vs Google results
      // favoriteBaseScore: base score added to any favorite (no rating yet)
      // favoriteBonusPerStar: added per ⭐ when rated above threshold
      // favoriteLowRatingThreshold: avg below this = penalty instead of bonus
      // favoriteLowRatingPenalty: subtracted from base when rating is poor
      favoriteBaseScore: 20,
      favoriteBonusPerStar: 5,
      favoriteLowRatingThreshold: 2.5,
      favoriteLowRatingPenalty: 60,

      // Google Places rating count filters (applies only to Google results, never to saved favorites)
      // googleMinRatingCount: places with fewer ratings than this are NEVER shown (filtered like blacklist)
      // googleLowRatingCount: places below this get a near-zero score — included only if no better option
      googleMinRatingCount: 20,
      googleLowRatingCount: 60,

      // Google Places location mode for text search
      // 'restriction' = hard limit to search radius (default, returns fewer but closer results)
      // 'bias' = prefer search radius but may return results outside (old behavior)
      googleLocationMode: 'restriction',
      // filteredBusinessStatuses: array of businessStatus values to exclude
      // Possible values: CLOSED_PERMANENTLY, CLOSED_TEMPORARILY, BUSINESS_STATUS_UNSPECIFIED
      filteredBusinessStatuses: ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY'],
      // filterClosedNow: if true, exclude places where openNow === false
      filterClosedNow: false,
      // maxResultCount: -1 = don't send to Google (use their default/max)
      // positive number = send to Google as maxResultCount
      googleMaxResultCount: -1,
      googleNearbyRankPreference: 'POPULARITY',
      googleTextRankPreference: 'RELEVANCE',
      // System alerts — how often to send automated system feedback (hours)
      systemAlertIntervalHours: 1,
      // Feedback images
      feedbackMaxImages: 3,
    };
    window.BKK.systemParams = { ...window.BKK._defaultSystemParams };
  }
  const [systemParams, setSystemParams] = useState(window.BKK.systemParams);
  const sp = systemParams; // shorthand
  // interestCounters: computed on-the-fly — max location number per interest (for auto-naming)
  // NOT persisted to Firebase — always derived from actual customLocations
  const interestCounters = useMemo(() => {
    const counters = {};
    (customLocations || []).forEach(loc => {
      const nameMatch = (loc.name || '').match(/#(\d+)$/);
      if (!nameMatch) return;
      const num = parseInt(nameMatch[1]);
      (loc.interests || []).forEach(id => {
        if (!counters[id] || num > counters[id]) counters[id] = num;
      });
    });
    return counters;
  }, [customLocations]);
  const [googlePlaceInfo, setGooglePlaceInfo] = useState(null);
  const [loadingGoogleInfo, setLoadingGoogleInfo] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState(null); // null=hidden, []=no results, [...]= results
  const [pointSearchResults, setPointSearchResults] = useState(null); // null=hidden, []=loading, [...]= results for step-2 point mode
  const [pointSearchQuery, setPointSearchQuery] = useState(''); // tracks input value for button enable/disable
  const [editingCustomInterest, setEditingCustomInterest] = useState(null);
  const [showAddInterestDialog, setShowAddInterestDialog] = useState(false);
  const [interestDialogReadOnly, setInterestDialogReadOnly] = useState(false);
  const [cityVisibilityInterest, setCityVisibilityInterest] = useState(null); // interest object for city visibility dialog
  const [newInterest, setNewInterest] = useState({ label: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', nameKeywords: '', privateOnly: true, locked: false, scope: 'global', category: 'attraction', weight: 3, minStops: 1, maxStops: 10, minRatingCount: null, lowRatingCount: null });
  const [iconPickerConfig, setIconPickerConfig] = useState(null); // { description: '', callback: fn, suggestions: [], loading: false }
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editNavList, setEditNavList] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(null); // { place, reviews: [], myRating, myText }
  const [reviewRecording, setReviewRecording] = useState(false);
  const [reviewInterimText, setReviewInterimText] = useState('');
  const reviewStopRecRef = React.useRef(null);

  const startReviewDictation = () => {
    if (reviewRecording) {
      if (reviewStopRecRef.current) { reviewStopRecRef.current(); reviewStopRecRef.current = null; }
      setReviewRecording(false);
      setReviewInterimText('');
      return;
    }
    setReviewRecording(true);
    const stop = window.BKK.startSpeechToText({
      maxDuration: (window.BKK.systemParams?.speechMaxSeconds || 15) * 1000,
      onResult: (text, isFinal) => {
        if (isFinal) {
          setReviewDialog(prev => ({ ...prev, myText: (prev.myText ? prev.myText + ' ' : '') + text, hasChanges: true }));
          setReviewInterimText('');
        } else {
          setReviewInterimText(text);
        }
      },
      onEnd: () => { setReviewRecording(false); setReviewInterimText(''); reviewStopRecRef.current = null; },
      onError: () => { setReviewRecording(false); setReviewInterimText(''); reviewStopRecRef.current = null; }
    });
    reviewStopRecRef.current = stop;
  };

  const stopReviewDictation = () => {
    if (reviewStopRecRef.current) { reviewStopRecRef.current(); reviewStopRecRef.current = null; }
    setReviewRecording(false);
    setReviewInterimText('');
  };
  const [reviewAverages, setReviewAverages] = useState({}); // { placeKey: { avg: 4.2, count: 3 } }
  const [userNamesMap, setUserNamesMap] = useState({}); // { uid: displayName }
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapVersion, setMapVersion] = useState(0); // Increment to force map re-render
  const [settingsTab, setSettingsTab] = useState('general'); // 'general', 'cities', 'interests', 'sysparams', 'debug'
  const [editingParamKey, setEditingParamKey] = useState(null); // key of param being edited inline
  const [editingParamVal, setEditingParamVal] = useState('');
  const [editingArea, setEditingArea] = useState(null); // area being edited on map
  const [mapMode, setMapMode] = useState('areas'); // 'areas', 'radius', or 'stops'
  const [mapStops, setMapStops] = useState([]); // stops to show when mapMode='stops'
  const [mapUserLocation, setMapUserLocation] = useState(null); // { lat, lng } for blue dot on map
  const [mapSkippedStops, setMapSkippedStops] = useState(new Set()); // indices of skipped stops on map
  const [mapFavFilter, setMapFavFilter] = useState(new Set()); // interest IDs to show (empty=all)
  const [mapFavArea, setMapFavArea] = useState(null); // area to focus on (null=all)
  const [mapFavRadius, setMapFavRadius] = useState(null); // { lat, lng, meters } for radius mode on fav map
  const [mapFocusPlace, setMapFocusPlace] = useState(null); // place to highlight
  const [mapBottomSheet, setMapBottomSheet] = useState(null); // { name, loc } for bottom sheet
  const [mapReturnPlace, setMapReturnPlace] = useState(null); // place to reopen dialog for after map close
  const [showFavMapFilter, setShowFavMapFilter] = useState(false); // filter dialog open
  const [startPointCoords, setStartPointCoords] = useState(null); // { lat, lng, address }
  const leafletMapRef = React.useRef(null);
  
  // Cache for unused Google Places results per interest (avoids redundant API calls)
  const googleCacheRef = React.useRef({});

  // Leaflet Map initialization (lazy-loaded)
  React.useEffect(() => {
    if (!showMapModal) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      return;
    }
    
    // Lazy load Leaflet on first use
    window.BKK.loadLeaflet().then(function(loaded) {
      if (!loaded || !showMapModal) return;
    
    // Wait for DOM
    const timer = setTimeout(() => {
      const container = document.getElementById('leaflet-map-container');
      if (!container) return;
      // Clean previous map if exists
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      
      try {
        const coords = window.BKK.areaCoordinates || {};
        const areas = window.BKK.areaOptions || [];
        
        // Generate area colors dynamically from palette
        const colorPalette = window.BKK.stopColorPalette;
        const areaColors = {};
        areas.forEach((area, i) => { areaColors[area.id] = colorPalette[i % colorPalette.length]; });
        
        if (mapMode === 'areas') {
          // All areas mode - center on selected city
          const cityCenter = window.BKK.selectedCity?.center || window.BKK.activeCityData?.center || { lat: 0, lng: 0 };
          const map = L.map(container).setView([cityCenter.lat, cityCenter.lng], 12);
          L.tileLayer(window.BKK.getTileUrl(), {
            attribution: '© OpenStreetMap contributors', maxZoom: 18
          }).addTo(map);
          
          const allCircles = [];
          areas.forEach(area => {
            const c = coords[area.id];
            if (!c) return;
            const color = areaColors[area.id] || '#6b7280';
            const circle = L.circle([c.lat, c.lng], {
              radius: c.radius, color: color, fillColor: color,
              fillOpacity: window.BKK.mapConfig.area.fillOpacity, weight: window.BKK.mapConfig.area.weight
            }).addTo(map).bindPopup(
              '<div style="text-align:center;direction:rtl;font-size:13px;">' +
              '<b>' + tLabel(area) + '</b><br/>' +
              '<span style="color:#666;font-size:11px;">' + area.labelEn + '</span><br/>' +
              '<span style="color:#999;font-size:10px;">Radius: ' + c.radius + ' m</span></div>'
            );
            // Name label with background for readability
            L.marker([c.lat, c.lng], {
              icon: L.divIcon({
                className: '',
                html: '<div style="font-size:10px;font-weight:bold;text-align:center;color:' + color + ';background:rgba(255,255,255,0.88);padding:2px 5px;border-radius:4px;border:1.5px solid ' + color + ';white-space:nowrap;line-height:1.2;box-shadow:0 1px 3px rgba(0,0,0,0.15);">' + tLabel(area) + '</div>',
                iconSize: [80, 22], iconAnchor: [40, 11]
              })
            }).addTo(map);
            allCircles.push(circle);
          });
          
          // Auto-fit to show all areas
          if (allCircles.length > 0) {
            const group = L.featureGroup(allCircles);
            map.fitBounds(group.getBounds().pad(0.1));
          }
          
          leafletMapRef.current = map;
        } else if (mapMode === 'radius') {
          // Radius mode
          const lat = formData.currentLat;
          const lng = formData.currentLng;
          if (!lat || !lng) return;
          
          const map = L.map(container).setView([lat, lng], 15);
          L.tileLayer(window.BKK.getTileUrl(), {
            attribution: '© OpenStreetMap contributors', maxZoom: 18
          }).addTo(map);
          
          // Radius circle FIRST (so marker is on top)
          const radiusCircle = L.circle([lat, lng], {
            radius: formData.radiusMeters, color: window.BKK.mapConfig.radiusSearch.color, fillColor: window.BKK.mapConfig.radiusSearch.color,
            fillOpacity: window.BKK.mapConfig.radiusSearch.fillOpacity, weight: window.BKK.mapConfig.radiusSearch.weight, dashArray: window.BKK.mapConfig.radiusSearch.dash
          }).addTo(map);
          
          // Center marker (red, prominent)
          L.circleMarker([lat, lng], {
            radius: window.BKK.mapConfig.radiusSearch.centerRadius, color: window.BKK.mapConfig.radiusSearch.color, fillColor: window.BKK.mapConfig.radiusSearch.color,
            fillOpacity: 1, weight: 2
          }).addTo(map).bindPopup(
            '<div style="text-align:center;direction:rtl;">' +
            '<b>📍 ' + (formData.radiusPlaceName || t('form.currentLocation')) + '</b><br/>' +
            '<span style="font-size:11px;color:#666;">Radius: ' + formData.radiusMeters + ' m</span></div>'
          ).openPopup();
          
          // Fit to circle bounds
          map.fitBounds(radiusCircle.getBounds().pad(0.15));
          
          // Show area circles faintly for context
          areas.forEach(area => {
            const c = coords[area.id];
            if (!c) return;
            L.circle([c.lat, c.lng], {
              radius: c.radius, color: window.BKK.mapConfig.area.ghostColor, fillColor: window.BKK.mapConfig.area.ghostColor,
              fillOpacity: window.BKK.mapConfig.area.ghostFillOpacity, weight: window.BKK.mapConfig.area.ghostWeight
            }).addTo(map);
            L.marker([c.lat, c.lng], {
              icon: L.divIcon({
                className: '',
                html: '<div style="font-size:8px;color:' + window.BKK.mapConfig.area.ghostColor + ';text-align:center;white-space:nowrap;">' + tLabel(area) + '</div>',
                iconSize: [50, 15], iconAnchor: [25, 7]
              })
            }).addTo(map);
          });
          
          leafletMapRef.current = map;
        } else if (mapMode === 'stops') {
          // Stops mode - show route points on map (fullscreen)
          const stops = mapStops.filter(s => s.lat && s.lng);
          if (stops.length === 0) return;
          
          const avgLat = stops.reduce((sum, s) => sum + s.lat, 0) / stops.length;
          const avgLng = stops.reduce((sum, s) => sum + s.lng, 0) / stops.length;
          
          const map = L.map(container).setView([avgLat, avgLng], 13);
          L.tileLayer(window.BKK.getTileUrl(), {
            attribution: '© OpenStreetMap contributors', maxZoom: 18
          }).addTo(map);
          
          // Global callback for popup buttons
          const markerRefs = {};
          let startMarkerRef = null;
          const startPointCoordsRef_local = { current: startPointCoords };
          
          const updateStartMarker = (lat, lng, address) => {
            if (startMarkerRef) map.removeLayer(startMarkerRef);
            startMarkerRef = L.marker([lat, lng], {
              icon: L.divIcon({
                className: '',
                html: '<div style="font-size:' + window.BKK.mapConfig.marker.startIconFontSize + ';text-align:center;width:' + window.BKK.mapConfig.marker.startIconSize + 'px;height:' + window.BKK.mapConfig.marker.startIconSize + 'px;line-height:' + window.BKK.mapConfig.marker.startIconSize + 'px;border-radius:50%;background:' + window.BKK.mapConfig.marker.startRingColor + ';border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);color:white;font-weight:bold;">▶</div>',
                iconSize: [28, 28], iconAnchor: [14, 14]
              })
            }).addTo(map);
            startMarkerRef.bindPopup('<div style="text-align:center;font-size:12px;font-weight:bold;">📍 ' + (address || t('route.startPoint')) + '</div>');
          };
          
          window._mapStopAction = (action, data, lat, lng) => {
            if (action === 'continuefrom') {
              const trailStops = (activeTrail && activeTrail.stops) || stopsOrderRef.current || stops;
              const clickedIdx = trailStops.findIndex(s => (s.name || '').toLowerCase().trim() === data.toLowerCase().trim());
              if (clickedIdx < 0) { map.closePopup(); return; }

              // Skip all stops before clicked one in the trail
              const newSkipped = new Set();
              for (let si = 0; si < clickedIdx; si++) newSkipped.add(si);
              setSkippedTrailStops(newSkipped);
              setMapSkippedStops(new Set(newSkipped));

              // Build Google Maps URL: origin = clicked stop, waypoints = remaining stops
              const origin = parseFloat(lat) + ',' + parseFloat(lng);
              const remaining = trailStops.slice(clickedIdx + 1).filter(s => s.lat && s.lng);

              // For circular: add original first stop (A) as final destination
              const isCircular = activeTrail && activeTrail.circular;
              const firstStop = trailStops[0];
              if (isCircular && firstStop && firstStop.lat && clickedIdx > 0) {
                remaining.push(firstStop);
              }

              const urls = window.BKK.buildGoogleMapsUrls(remaining, origin, false, window.BKK.googleMaxWaypoints || 12);
              map.closePopup();
              if (urls.length > 0) {
                window.open(urls[0].url, 'city_explorer_map');
              } else {
                // Last stop or no remaining — just open this stop in Google Maps
                window.open(googleUrl || ('https://www.google.com/maps/search/?api=1&query=' + origin), 'city_explorer_map');
              }
              return;
            }
            if (action === 'skiptrail') {
              const trailStops = (activeTrail && activeTrail.stops) || stopsOrderRef.current || stops;
              const idx = trailStops.findIndex(s => (s.name||'').toLowerCase().trim() === data.toLowerCase().trim());
              if (idx >= 0) {
                setSkippedTrailStops(prev => { const next = new Set(prev); next.add(idx); return next; });
                setMapSkippedStops(prev => { const next = new Set(prev); next.add(idx); return next; });
              }
              map.closePopup();
              return;
            }
            if (action === 'unskiptrail') {
              const trailStops = (activeTrail && activeTrail.stops) || stopsOrderRef.current || stops;
              const idx = trailStops.findIndex(s => (s.name||'').toLowerCase().trim() === data.toLowerCase().trim());
              if (idx >= 0) {
                setSkippedTrailStops(prev => { const next = new Set(prev); next.delete(idx); return next; });
                setMapSkippedStops(prev => { const next = new Set(prev); next.delete(idx); return next; });
              }
              map.closePopup();
              return;
            }
            if (action === 'setstart') {
              const newStart = { lat: parseFloat(lat), lng: parseFloat(lng), address: data };
              startPointCoordsRef_local.current = newStart;
              updateStartMarker(parseFloat(lat), parseFloat(lng), data);
              map.closePopup();
              showToast(`▶ ${data}`, 'success');
              // Auto-recompute route with new start point
              const result = recomputeForMap(newStart, undefined, true);
              if (result) {
                stopsOrderRef.current = result.optimized;
              }
              setTimeout(() => { if (window._mapRedrawLine) window._mapRedrawLine(); }, 150);
              return;
            }
            const nameKey = data.toLowerCase().trim();
            if (action === 'disable') {
              setDisabledStops(prev => [...prev, nameKey]);
              if (markerRefs[nameKey]) {
                markerRefs[nameKey].circle.setStyle({ fillOpacity: window.BKK.mapConfig.marker.disabledFillOpacity, opacity: window.BKK.mapConfig.marker.disabledOpacity });
                markerRefs[nameKey].label.setOpacity(0.3);
              }
              map.closePopup();
              // If disabling the current start point, clear it so recompute picks a new one
              const curStart = startPointCoordsRef_local.current;
              if (curStart) {
                const stopObj = stops.find(s => (s.name || '').toLowerCase().trim() === nameKey);
                if (stopObj && Math.abs(stopObj.lat - curStart.lat) < 0.0001 && Math.abs(stopObj.lng - curStart.lng) < 0.0001) {
                  startPointCoordsRef_local.current = null;
                  if (startMarkerRef) { map.removeLayer(startMarkerRef); startMarkerRef = null; }
                  setStartPointCoords(null);
                  startPointCoordsRef.current = null;
                }
              }
              showToast(`⏸️ ${data}`, 'info');
              // Trigger route recompute
              setRoute(prev => prev ? {...prev, optimized: false} : prev);
              setTimeout(() => { if (window._mapRedrawLine) window._mapRedrawLine(); }, 50);
            } else if (action === 'enable') {
              setDisabledStops(prev => prev.filter(n => n !== nameKey));
              if (markerRefs[nameKey]) {
                markerRefs[nameKey].circle.setStyle({ fillOpacity: window.BKK.mapConfig.marker.fillOpacity, opacity: 1 });
                markerRefs[nameKey].label.setOpacity(1);
              }
              map.closePopup();
              showToast(`▶️ ${data}`, 'success');
              // Trigger route recompute
              setRoute(prev => prev ? {...prev, optimized: false} : prev);
              setTimeout(() => { if (window._mapRedrawLine) window._mapRedrawLine(); }, 50);
            }
          };
          
          const markers = [];
          const isRTL = window.BKK.i18n.isRTL();
          const stopsOrderRef = { current: stops }; // Mutable ref for current stop order
          
          // Initial start point marker (only if NOT overlapping with a stop)
          if (startPointCoords?.lat && startPointCoords?.lng) {
            const overlapsStop = stops.some(s => Math.abs(s.lat - startPointCoords.lat) < 0.0001 && Math.abs(s.lng - startPointCoords.lng) < 0.0001);
            if (!overlapsStop) {
              updateStartMarker(startPointCoords.lat, startPointCoords.lng, startPointCoords.address);
            }
          }
          // Build sequential letter map: only active stops get letters
          const mapLetterMap = {};
          let mapLetterIdx = 0;
          stops.forEach((s, idx) => {
            const nk = (s.name || '').toLowerCase().trim();
            const disabled = disabledStops.includes(nk) || mapSkippedStops.has(idx);
            if (!disabled) {
              mapLetterMap[idx] = window.BKK.stopLabel(mapLetterIdx);
              mapLetterIdx++;
            }
          });
          
          stops.forEach((stop, i) => {
            const isManualStop = stop.manuallyAdded || stop.isRadiusCenter;
            // Manual stops: white fill + green border. Regular stops: interest color.
            const interestColor = (stop.interests && stop.interests[0] && stop.interests[0] !== '_manual'
              ? window.BKK.getInterestColor(stop.interests[0], allInterestOptions || [])
              : null) || colorPalette[i % colorPalette.length];
            const color = isManualStop ? '#22c55e' : interestColor; // border/outline color
            const fillColor = isManualStop ? 'white' : interestColor;
            const labelTextColor = isManualStop ? '#15803d' : 'white';
            const nameKey = (stop.name || '').toLowerCase().trim();
            const isDisabled = disabledStops.includes(nameKey) || mapSkippedStops.has(i);
            const stopLetter = mapLetterMap[i] || '';
            const isStart = startPointCoordsRef_local.current && Math.abs(stop.lat - startPointCoordsRef_local.current.lat) < 0.0001 && Math.abs(stop.lng - startPointCoordsRef_local.current.lng) < 0.0001;
            
            const mc = window.BKK.mapConfig.marker;
            
            // Green outer ring for start point
            if (isStart && !isDisabled) {
              L.circleMarker([stop.lat, stop.lng], {
                radius: mc.startRingRadius, color: mc.startRingColor, fillColor: 'transparent',
                fillOpacity: 0, weight: mc.startRingWeight, opacity: 1,
                dashArray: mc.startRingDash
              }).addTo(map);
            }
            
            const circle = L.circleMarker([stop.lat, stop.lng], {
              radius: mc.radius, color: color, fillColor: fillColor,
              fillOpacity: isDisabled ? mc.disabledFillOpacity : mc.fillOpacity, weight: isManualStop ? 2.5 : mc.weight,
              opacity: isDisabled ? mc.disabledOpacity : 1
            }).addTo(map);
            
            const label = L.marker([stop.lat, stop.lng], {
              icon: L.divIcon({
                className: '',
                html: '<div style="font-size:' + mc.labelFontSize + ';font-weight:bold;text-align:center;color:' + labelTextColor + ';width:' + mc.labelSize + 'px;height:' + mc.labelSize + 'px;line-height:' + mc.labelSize + 'px;border-radius:50%;background:' + fillColor + ';border:2px solid ' + (isManualStop ? '#22c55e' : (isStart ? mc.startRingColor : 'white')) + ';box-shadow:0 1px 4px rgba(0,0,0,0.3);opacity:' + (isDisabled ? mc.disabledOpacity : '1') + ';">' + (isStart && !isManualStop ? '▶' : stopLetter) + '</div>',
                iconSize: [mc.labelSize, mc.labelSize], iconAnchor: [mc.labelSize/2, mc.labelSize/2]
              }),
              opacity: isDisabled ? mc.disabledOpacity : 1
            }).addTo(map);
            
            markerRefs[nameKey] = { circle, label };
            
            const escapedName = (stop.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const googleUrl = window.BKK.getGoogleMapsUrl(stop) || ('https://www.google.com/maps/search/?api=1&query=' + stop.lat + ',' + stop.lng);
            
            // Dynamic popup - different content based on whether trail is active
            const makePopup = () => {
              const isTrailActive = !!activeTrail;
              const curDisabled = disabledStopsRef.current || [];
              const curIsDisabled = curDisabled.includes(nameKey);
              const header = '<div style="font-weight:bold;font-size:14px;margin-bottom:6px;">' + (stopLetter ? stopLetter + '. ' : '') + (stop.name || '') + '</div>' +
                (stop.rating ? '<div style="color:#f59e0b;margin-bottom:6px;">⭐ ' + stop.rating + (stop.ratingCount ? ' (' + stop.ratingCount + ')' : '') + '</div>' : '');
              const googleBtn = '<a href="' + googleUrl + '" target="_blank" style="flex:1;display:inline-block;padding:6px 10px;border-radius:8px;background:#3b82f6;color:white;text-decoration:none;font-size:12px;font-weight:bold;">Google Maps ↗</a>';

              if (isTrailActive) {
                // Trail active: Google Maps + Skip + Continue from here
                const continueLabel = isRTL ? 'המשך מנקודה זו ▶' : 'Continue from here ▶';
                const skipTrailLabel = isRTL ? '⏭️ דלג' : '⏭️ Skip';
                const isAlreadySkipped = skippedTrailStops.has(
                  activeTrail?.stops ? activeTrail.stops.findIndex(s => (s.name||'').toLowerCase().trim() === (stop.name||'').toLowerCase().trim()) : -1
                );
                const skipColor = isAlreadySkipped ? '#6b7280' : '#ea580c';
                const skipAction = isAlreadySkipped ? 'unskiptrail' : 'skiptrail';
                const skipLabel = isAlreadySkipped ? (isRTL ? '↩️ בטל דילוג' : '↩️ Unskip') : skipTrailLabel;
                return '<div style="text-align:center;direction:' + (isRTL ? 'rtl' : 'ltr') + ';font-size:13px;min-width:160px;padding:4px 0;">' +
                  header +
                  '<div style="display:flex;gap:6px;justify-content:center;margin-bottom:6px;">' +
                    googleBtn +
                    '<button onclick="window._mapStopAction(\'' + skipAction + '\',\'' + escapedName + '\')" style="flex:1;padding:6px 8px;border-radius:8px;background:' + skipColor + ';color:white;border:none;font-size:12px;font-weight:bold;cursor:pointer;">' + skipLabel + '</button>' +
                  '</div>' +
                  '<button onclick="window._mapStopAction(\'continuefrom\',\'' + escapedName + '\',' + stop.lat + ',' + stop.lng + ')" style="width:100%;padding:7px 8px;border-radius:8px;background:#16a34a;color:white;border:none;font-size:12px;font-weight:bold;cursor:pointer;">' + continueLabel + '</button>' +
                '</div>';
              } else {
                // No trail: Google Maps + Skip/Enable + Set start point (original)
                const toggleAction = curIsDisabled ? 'enable' : 'disable';
                const toggleLabel = curIsDisabled ? '▶️ ' + t('route.returnPlace') : '⏸️ ' + t('route.skipPlace');
                const toggleColor = curIsDisabled ? '#059669' : '#ea580c';
                return '<div style="text-align:center;direction:' + (isRTL ? 'rtl' : 'ltr') + ';font-size:13px;min-width:160px;padding:4px 0;">' +
                  header +
                  '<div style="display:flex;gap:6px;justify-content:center;margin-bottom:6px;">' +
                    googleBtn +
                    '<button onclick="window._mapStopAction(\'' + toggleAction + '\',\'' + escapedName + '\')" style="flex:1;padding:6px 10px;border-radius:8px;background:' + toggleColor + ';color:white;border:none;font-size:12px;font-weight:bold;cursor:pointer;">' + toggleLabel + '</button>' +
                  '</div>' +
                  '<button onclick="window._mapStopAction(\'setstart\',\'' + escapedName + '\',' + stop.lat + ',' + stop.lng + ')" style="width:100%;padding:5px 8px;border-radius:8px;background:' + window.BKK.mapConfig.marker.startRingColor + ';color:white;border:none;font-size:11px;font-weight:bold;cursor:pointer;">▶ ' + t('form.setStartPoint') + '</button>' +
                '</div>';
              }
            };
            
            circle.bindPopup(makePopup, { maxWidth: 250 });
            circle.on('popupopen', () => { circle.getPopup().setContent(makePopup()); });
            label.on('click', () => { circle.openPopup(); });
            markers.push(circle);
          });
          
          // Route lines removed — map shows stops only, user navigates via Google Maps
          const redrawRouteLine = () => {}; // no-op (called from toggle handlers)
          
          if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.15));
          }
          
          // GPS locate-me button (top-right)
          const LocateControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function() {
              const div = L.DomUtil.create('div', '');
              div.innerHTML = '<button style="width:36px;height:36px;border-radius:8px;border:2px solid rgba(0,0,0,0.2);background:white;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.15);" title="' + t('form.findCurrentLocation') + '">📍</button>';
              let myLocMarker = null;
              div.onclick = function(e) {
                e.stopPropagation();
                div.firstChild.innerHTML = '⏳';
                window.BKK.getValidatedGps(
                  function(pos) {
                    div.firstChild.innerHTML = '📍';
                    if (myLocMarker) map.removeLayer(myLocMarker);
                    const lat = pos.coords.latitude, lng = pos.coords.longitude;
                    myLocMarker = L.circleMarker([lat, lng], {
                      radius: 8, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.4, weight: 3
                    }).addTo(map);
                    myLocMarker.bindPopup(
                      '<div style="text-align:center;font-size:12px;padding:4px 0;">' +
                      '<div style="font-weight:bold;margin-bottom:6px;">📍 ' + t('wizard.myLocation') + '</div>' +
                      '<button onclick="window._mapStopAction(\'setstart\',\'' + t('wizard.myLocation').replace(/'/g, "\\'") + '\',' + lat + ',' + lng + ')" style="width:100%;padding:5px 8px;border-radius:8px;background:' + window.BKK.mapConfig.marker.startRingColor + ';color:white;border:none;font-size:11px;font-weight:bold;cursor:pointer;">▶ ' + t('form.setStartPoint') + '</button>' +
                      '</div>'
                    ).openPopup();
                    map.setView([lat, lng], map.getZoom());
                  },
                  function(reason) {
                    div.firstChild.innerHTML = '📍';
                    if (reason === 'outside_city') showToast(t('toast.outsideCity'), 'warning', 'sticky');
                    else showToast(reason === 'denied' ? t('toast.locationNoPermission') : t('toast.noGpsSignal'), 'warning', 'sticky');
                  }
                );
              };
              L.DomEvent.disableClickPropagation(div);
              return div;
            }
          });
          new LocateControl().addTo(map);
          
          // Store redraw for disable/enable callbacks
          window._mapRedrawLine = redrawRouteLine;
          window._mapStopsOrderRef = stopsOrderRef;
          
          // User location blue dot
          if (mapUserLocation && mapUserLocation.lat && mapUserLocation.lng) {
            const userDot = L.circleMarker([mapUserLocation.lat, mapUserLocation.lng], {
              radius: 10, fillColor: '#4285F4', fillOpacity: 1,
              color: 'white', weight: 3, opacity: 1
            }).addTo(map);
            userDot.bindPopup(`<div style="text-align:center;font-size:12px;font-weight:bold;">📍 ${t('trail.youAreHere')}</div>`).openPopup();
            // Add accuracy ring
            L.circle([mapUserLocation.lat, mapUserLocation.lng], {
              radius: mapUserLocation.accuracy || 30,
              fillColor: '#4285F4', fillOpacity: 0.1,
              color: '#4285F4', weight: 1, opacity: 0.3
            }).addTo(map);
          }
          
          leafletMapRef.current = map;
        } else if (mapMode === 'favorites') {
          // ═══════════════════════════════════════════════════════════════
          // FAVORITES MAP — shows saved places colored by interest
          // Supports: city overview, area focus, single place highlight
          // ═══════════════════════════════════════════════════════════════
          const allInts = allInterestOptions || [];
          const showDrafts = window.BKK.systemParams?.includeDrafts !== false;
          
          // Filter locations
          const locs = customLocations.filter(loc => {
            if (loc.status === 'blacklist') return false;
            if (!loc.lat || !loc.lng) return false;
            if (!showDrafts && !loc.locked) return false;
            // Only show places whose interests are visible to this user
            const locInts = loc.interests || [];
            if (locInts.length > 0) {
              const hasVisibleInterest = locInts.some(id => {
                const opt = allInterestOptions.find(o => o.id === id);
                if (!opt) return false;
                const aStatus = opt.adminStatus || 'active';
                if (aStatus === 'hidden') return false;
                if (aStatus === 'draft' && !isEditor) return false;
                return true; // all visible interests shown (user toggle removed)
              });
              if (!hasVisibleInterest) return false;
            }
            if (mapFavArea) {
              const la = loc.areas || (loc.area ? [loc.area] : []);
              if (!la.includes(mapFavArea)) return false;
            }
            // Radius mode: don't filter — show all places, just display the ring
            if (mapFavFilter.size > 0) {
              if (!(loc.interests || []).some(i => mapFavFilter.has(i))) return false;
            }
            return true;
          });
          
          // Determine center and zoom
          let cLat, cLng, defZoom;
          if (mapFocusPlace && mapFocusPlace.lat) {
            cLat = mapFocusPlace.lat; cLng = mapFocusPlace.lng; defZoom = 16;
          } else if (mapFavRadius) {
            cLat = mapFavRadius.lat; cLng = mapFavRadius.lng; defZoom = mapFavRadius.meters <= 300 ? 16 : mapFavRadius.meters <= 600 ? 15 : 14;
          } else if (mapFavArea && coords[mapFavArea]) {
            cLat = coords[mapFavArea].lat; cLng = coords[mapFavArea].lng; defZoom = 14;
          } else {
            const cc = window.BKK.selectedCity?.center || { lat: 0, lng: 0 };
            cLat = cc.lat; cLng = cc.lng; defZoom = 12;
          }
          
          const map = L.map(container).setView([cLat, cLng], defZoom);
          L.tileLayer(window.BKK.getTileUrl(), { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
          
          // Custom panes for z-order
          map.createPane('areaLabelsPane');
          map.getPane('areaLabelsPane').style.zIndex = window.BKK.mapConfig.area.labelsPaneZ;
          map.createPane('placeMarkersPane');
          map.getPane('placeMarkersPane').style.zIndex = window.BKK.mapConfig.area.markersPaneZ;
          
          // Area circles — always show all, highlight selected with bold ring
          const areasOnly = locs.length === 0 && !mapFavRadius;
          const hasSelection = !!mapFavArea || !!mapFavRadius;
          const hasPlaceMarkers = locs.length > 0;
          map.getPane('areaLabelsPane').style.pointerEvents = hasPlaceMarkers ? 'none' : 'auto';
          areas.forEach(area => {
            const c = coords[area.id];
            if (!c) return;
            const isSelected = mapFavArea === area.id;
            const aColor = areaColors[area.id] || '#6b7280';
            // Base circle — non-interactive when place markers exist (prevents click blocking)
            L.circle([c.lat, c.lng], {
              radius: c.radius,
              color: areasOnly ? aColor : (isSelected ? '#2563eb' : '#94a3b8'),
              fillColor: areasOnly ? aColor : (isSelected ? '#2563eb' : '#94a3b8'),
              fillOpacity: areasOnly ? 0.15 : (isSelected ? 0.10 : 0.05),
              weight: areasOnly ? 2 : (isSelected ? 3 : 1.2),
              interactive: !hasPlaceMarkers
            }).addTo(map).on('click', () => {
              if (window._favMapAreaClick) window._favMapAreaClick(area.id);
            });
            // Labels — always show all, non-interactive when place markers exist
            L.marker([c.lat, c.lng], {
              interactive: !hasPlaceMarkers,
              pane: 'areaLabelsPane',
              icon: L.divIcon({
                className: '',
                html: '<div style="font-size:' + (areasOnly ? '10px' : '9px') + ';color:' + (areasOnly ? aColor : (isSelected ? '#1e40af' : '#64748b')) + ';text-align:center;white-space:nowrap;font-weight:bold;background:rgba(255,255,255,' + (areasOnly ? '0.88' : (isSelected ? '0.95' : '0.75')) + ');padding:' + (areasOnly || isSelected ? '2px 5px' : '1px 4px') + ';border-radius:' + (areasOnly || isSelected ? '4px' : '3px') + ';' + ((areasOnly || isSelected) ? 'border:1.5px solid ' + (isSelected ? '#2563eb' : aColor) + ';box-shadow:0 1px 3px rgba(0,0,0,0.15);' : '') + (hasPlaceMarkers ? 'pointer-events:none;' : 'cursor:pointer;') + '">' + tLabel(area) + '</div>',
                iconSize: [80, 22], iconAnchor: [40, 11]
              })
            }).addTo(map).on('click', () => {
              if (window._favMapAreaClick) window._favMapAreaClick(area.id);
            });
          });
          
          // Radius circle — bold ring matching selected-area style
          if (mapFavRadius) {
            L.circle([mapFavRadius.lat, mapFavRadius.lng], {
              radius: mapFavRadius.meters,
              color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.08, weight: 3
            }).addTo(map);
            L.circleMarker([mapFavRadius.lat, mapFavRadius.lng], {
              radius: window.BKK.mapConfig.gps.radius, color: '#2563eb', fillColor: window.BKK.mapConfig.gps.color, fillOpacity: 1, weight: window.BKK.mapConfig.gps.weight
            }).addTo(map);
          }
          
          // CALLBACKS FIRST - must exist before any code that might crash
          window._favMapSheet = (loc) => { setMapBottomSheet(loc); };
          window._favMapAreaClick = (areaId) => {
            setMapFavArea(prev => prev === areaId ? null : areaId);
            setMapFavRadius(null);
            setMapBottomSheet(null);
          };
          
          // Place markers in placeMarkersPane (z-650), always on top
          const mkrs = [];
          locs.forEach(loc => {
            const pi = (loc.interests || [])[0];
            const color = pi ? window.BKK.getInterestColor(pi, allInts) : '#9ca3af';
            const isFocused = mapFocusPlace && mapFocusPlace.id === loc.id;
            const r = isFocused ? 11 : 8;
            const m = L.circleMarker([loc.lat, loc.lng], {
              radius: r, color: isFocused ? '#000' : color, fillColor: color,
              fillOpacity: loc.locked ? 0.9 : 0.5, weight: isFocused ? 3 : (loc.locked ? 2 : 1),
              pane: 'placeMarkersPane'
            }).addTo(map);
            const hitArea = L.circleMarker([loc.lat, loc.lng], {
              radius: 20, fillOpacity: 0, opacity: 0, weight: 0,
              pane: 'placeMarkersPane'
            }).addTo(map);
            const handleClick = (e) => { L.DomEvent.stopPropagation(e); if (window._favMapSheet) window._favMapSheet(loc); };
            m.on('click', handleClick);
            hitArea.on('click', handleClick);
            mkrs.push(m);
          });
          
          // Fit bounds - own try/catch so errors never block anything
          try {
            if (!mapFocusPlace) {
              if (mapFavRadius) {
                const _c = L.circle([mapFavRadius.lat, mapFavRadius.lng], { radius: mapFavRadius.meters }).addTo(map);
                map.fitBounds(_c.getBounds().pad(0.15));
                map.removeLayer(_c);
              } else if (mapFavArea && coords[mapFavArea]) {
                const _c = L.circle([coords[mapFavArea].lat, coords[mapFavArea].lng], { radius: coords[mapFavArea].radius }).addTo(map);
                map.fitBounds(_c.getBounds().pad(0.15));
                map.removeLayer(_c);
              } else if (mkrs.length > 1) {
                map.fitBounds(L.featureGroup(mkrs).getBounds().pad(0.1));
              }
            }
          } catch(fitErr) {
            console.warn('[MAP] fitBounds warning:', fitErr);
          }
          
          // User location blue dot
          if (mapUserLocation && mapUserLocation.lat) {
            L.circleMarker([mapUserLocation.lat, mapUserLocation.lng], {
              radius: window.BKK.mapConfig.gps.radius, color: '#2563eb', fillColor: window.BKK.mapConfig.gps.color, fillOpacity: 1, weight: window.BKK.mapConfig.gps.weight
            }).addTo(map).bindPopup('\ud83d\udccd');
            L.circle([mapUserLocation.lat, mapUserLocation.lng], {
              radius: mapUserLocation.accuracy || 30, color: '#3b82f6',
              fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1
            }).addTo(map);
          }
          
          leafletMapRef.current = map;
        }
      } catch(err) {
        console.error('[MAP]', err);
      }
    }, 150);
    }); // end loadLeaflet().then
    
    return () => { if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; } delete window._mapStopAction; delete window._mapRedrawLine; delete window._mapStopsOrderRef; delete window._favMapSheet; delete window._favMapAreaClick; setMapBottomSheet(null); };
  }, [showMapModal, mapMode, mapStops, mapUserLocation, mapSkippedStops, mapFavFilter, mapFavArea, mapFavRadius, mapFocusPlace, customLocations, formData.currentLat, formData.currentLng, formData.radiusMeters, mapVersion]);
  const [modalImage, setModalImage] = useState(null);
  const [modalImageCtx, setModalImageCtx] = useState(null); // { description, location } for image modal
  const [modalAddingDesc, setModalAddingDesc] = useState(false); // inline description input visible
  const [modalDescDraft, setModalDescDraft] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [placeSearchQuery, setPlaceSearchQuery] = useState(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('foufou_preferences'));
      return prefs?.radiusPlaceName || '';
    } catch(e) { return ''; }
  });
  const [searchResults, setSearchResults] = useState([]);
  const [addingPlaceIds, setAddingPlaceIds] = useState([]); // Track places being added
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedData, setImportedData] = useState(null);
  
  // Access Log System (Admin Only)
  const [accessStats, setAccessStats] = useState(null); // { total, weekly: { '2026-W08': { IL: 3, TH: 12 } } }
  const isCurrentUserAdmin = isRealAdmin; // backward compat — uses real role, not impersonated

  // Feedback System
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [editingMyFeedback, setEditingMyFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem('feedback_draft') || '{}'); return d.text || ''; } catch(e) { return ''; }
  });
  const [feedbackImages, setFeedbackImages] = useState([]); // base64 array, max sp.feedbackMaxImages
  const [feedbackCategory, setFeedbackCategory] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem('feedback_draft') || '{}'); return d.cat || 'general'; } catch(e) { return 'general'; }
  });
  const [feedbackSubject, setFeedbackSubject] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem('feedback_draft') || '{}'); return d.subject || ''; } catch(e) { return ''; }
  });
  const [feedbackSenderName, setFeedbackSenderName] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem('feedback_draft') || '{}'); return d.senderName || ''; } catch(e) { return ''; }
  });
  const [feedbackSenderEmail, setFeedbackSenderEmail] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem('feedback_draft') || '{}'); return d.senderEmail || ''; } catch(e) { return ''; }
  });
  const [feedbackList, setFeedbackList] = useState([]);
  const [myFeedbackList, setMyFeedbackList] = useState([]); // own feedback for non-admin users
  const [showFeedbackList, setShowFeedbackList] = useState(false);
  const [hasNewFeedback, setHasNewFeedback] = useState(false);

  // Confirm Dialog (replaces browser confirm)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ message: '', onConfirm: null });

  // Help System
  const [showHelp, setShowHelp] = useState(false);
  const [helpEditing, setHelpEditing] = useState(false);
  const [helpEditText, setHelpEditText] = useState('');
  const [helpOverrides, setHelpOverrides] = useState({});
  const [hintEditId, setHintEditId] = useState(null);
  const [hintEditText, setHintEditText] = useState('');
  const [helpContext, setHelpContext] = useState('main');
  
  // Debug Mode System
  // Debug system with categories
  // Categories: api, firebase, sync, route, interest, location, migration, all
  const [debugMode, setDebugMode] = useState(() => {
    return localStorage.getItem('foufou_debug_mode') === 'true';
  });
  const [debugCategories, setDebugCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('foufou_debug_categories') || '["all"]'); } catch(e) { return ['all']; }
  });
  const toggleDebugCategory = (cat) => {
    setDebugCategories(prev => {
      if (cat === 'all') return ['all'];
      const without = prev.filter(c => c !== 'all');
      const next = without.includes(cat) ? without.filter(c => c !== cat) : [...without, cat];
      return next.length === 0 ? ['all'] : next;
    });
  };
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratingsRefreshProgress, setRatingsRefreshProgress] = useState(null); // { current, total, updated }
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Tracks initial Firebase/localStorage load
  // PERFORMANCE: Show app after interests+config load (the first screen the user sees).
  // locations, routes, status load in background and update when ready.
  const dataLoadTracker = React.useRef({ locations: false, interests: false, config: false, status: false, routes: false });
  const markLoaded = (key) => {
    dataLoadTracker.current[key] = true;
    const t = dataLoadTracker.current;
    // Show app as soon as interests+config are ready — user can interact immediately
    if (t.interests && t.config && t.status) {
      setIsDataLoaded(true);
      window.scrollTo(0, 0);
      // Analytics: session start
      setTimeout(() => {
        window.BKK.logEvent?.('session_start', {
          city: selectedCityId,
          lang: currentLang,
          user_type: authUser ? (authUser.isAnonymous ? 'anonymous' : 'registered') : 'not_signed_in'
        });
      }, 1000); // slight delay to ensure auth state is settled
      // Preload Leaflet in background (2s delay to not compete with rendering)
      setTimeout(() => window.BKK.loadLeaflet(), 2000);
    }
  };
  
  // Safety timeout - don't show loading forever
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDataLoaded) {
        console.warn('[LOAD] Safety timeout - forcing data loaded after 5s');
        setIsDataLoaded(true);
        window.scrollTo(0, 0);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isDataLoaded]);

  // Cache version check — on startup, read settings/cacheVersion once.
  // Stale-While-Revalidate: always render from cache immediately, Firebase updates silently.
  // cacheVersion only used to detect corruption and send alert.
  useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    database.ref('settings/cacheVersion').once('value').then(snap => {
      const serverVersion = snap.val();
      // Guard: corrupted or missing
      if (!serverVersion || typeof serverVersion !== 'number') {
        sendSystemAlert('settings/cacheVersion is missing or corrupted. Value: ' + JSON.stringify(serverVersion) + '. Auto-repairing.');
        database.ref('settings/cacheVersion').set(Date.now()).catch(() => {});
        return;
      }
      // Just update local version — don't delete caches.
      // Firebase listeners always load fresh data in background anyway.
      try { localStorage.setItem('foufou_cache_version', String(serverVersion)); } catch(e) {}
    }).catch(() => {
      // Network error on version check — safe to ignore, use local cache as-is
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isLocating, setIsLocating] = useState(false);
  const [rightColWidth, setRightColWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem('foufou_right_col_width'));
      return saved && saved >= 100 && saved <= 250 ? saved : 130;
    } catch(e) { return 130; }
  });
  
  // Admin System - legacy state kept for backward compat during transition
  const [adminPassword, setAdminPassword] = useState(''); // legacy, will be removed
  const [adminUsers, setAdminUsers] = useState([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false); // legacy
  
  // Refs for current values (needed by map closures to avoid stale state)
  const routeTypeRef = React.useRef(routeType);
  React.useEffect(() => { routeTypeRef.current = routeType; }, [routeType]);
  const startPointCoordsRef = React.useRef(startPointCoords);
  const prevStartPointRef = React.useRef(null);
  React.useEffect(() => {
    startPointCoordsRef.current = startPointCoords;
    // Only reoptimize when start point ACTUALLY changes from user action
    // (not when runSmartPlan internally sets it to the same value)
    const prev = prevStartPointRef.current;
    const changed = startPointCoords?.lat !== prev?.lat || startPointCoords?.lng !== prev?.lng;
    prevStartPointRef.current = startPointCoords;
    if (changed && startPointCoords?.lat && startPointCoords?.lng && route?.stops?.length >= 2) {
      if (userManualOrderRef.current) {
        showToast(t('route.manualOrderKept'), 'info');
      } else {
        scheduleReoptimize();
      }
    }
  }, [startPointCoords]);
  const [showVersionPasswordDialog, setShowVersionPasswordDialog] = useState(false); // legacy
  const [showAddCityDialog, setShowAddCityDialog] = useState(false);
  const [addCityInput, setAddCityInput] = useState('');
  const [addCitySearchStatus, setAddCitySearchStatus] = useState(''); // '', 'searching', 'found', 'error', 'generating', 'done'
  const [addCityFound, setAddCityFound] = useState(null);
  const [addCityGenerated, setAddCityGenerated] = useState(null);
  const [googleMaxWaypoints, setGoogleMaxWaypoints] = useState(12);
  const [cityModified, setCityModified] = useState(false);
  const [cityEditCounter, setCityEditCounter] = useState(0); // Force re-render on city object mutation
  const [showSettingsMap, setShowSettingsMap] = useState(false);
  const [showMapFullscreen, setShowMapFullscreen] = useState(false);
  const [mapEditMode, setMapEditMode] = useState(false);
  const mapMarkersRef = React.useRef([]);
  const mapOriginalPositions = React.useRef({});
  const [passwordInput, setPasswordInput] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState(''); // For setting new password in admin panel
  
  // Add debug log entry (console only, filtered by category)
  const searchDebugLogRef = useRef([]);
  const [searchDebugLog, setSearchDebugLog] = useState([]);
  const urlDebugLogRef = useRef([]);
  const [urlDebugLog, setUrlDebugLog] = useState([]);
  const googleInfoDebugLogRef = useRef([]);
  const [googleInfoDebugLog, setGoogleInfoDebugLog] = useState([]);

  // Filter Log — per-search breakdown of passed/filtered places
  // Shape: [{ interestId, interestLabel, searchType, query, placeTypes, blacklist, passed: [...], filtered: [...] }]
  const filterLogRef = useRef([]);
  const [filterLog, setFilterLog] = useState([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [debugClaudeQ, setDebugClaudeQ] = useState('');
  
  // Debug sessions — accumulated across searches, persisted to localStorage
  const [debugSessions, setDebugSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('foufou_debug_sessions') || '[]'); } catch { return []; }
  });
  // Debug popup removed — using floating debug panel instead
  const debugModeRef = useRef(localStorage.getItem('foufou_debug_mode') === 'true');
  const debugCategoriesRef = useRef(debugCategories);
  useEffect(() => { debugModeRef.current = debugMode; }, [debugMode]);
  useEffect(() => { debugCategoriesRef.current = debugCategories; }, [debugCategories]);
  const searchRunIdRef = React.useRef(null);
  // URL debug: _urlDebug is activated only during explicit user clicks (onClick handlers)
  // Setting it globally causes noise from every getGoogleMapsUrl render call
  // Instead, expose a helper that onClick handlers call to log a single URL build
  window.BKK._logUrlBuild = (name, stop) => {
    if (!debugModeRef.current) return;
    const cats = debugCategoriesRef.current;
    if (!cats.includes('all') && !cats.includes('url')) return;
    const buf = [];
    window.BKK._urlDebug = buf;
    const url = window.BKK.getGoogleMapsUrl(stop);
    window.BKK._urlDebug = null;
    const entry = { ts: Date.now(), category: 'url', message: `URL: ${name}`, data: {
      name, url, steps: buf,
      raw: { mapsUrl: stop.mapsUrl, googlePlaceId: stop.googlePlaceId || stop.placeId, lat: stop.lat, lng: stop.lng, address: stop.address }
    }};
    urlDebugLogRef.current = [entry, ...urlDebugLogRef.current.slice(0, 49)];
    setUrlDebugLog([...urlDebugLogRef.current]);
    console.log(`[URL] ${name}`, entry.data);
  };

  const addDebugLog = (category, message, data = null) => {
    if (!debugModeRef.current) return;
    const cat = category.toLowerCase();
    const cats = debugCategoriesRef.current;
    if (!cats.includes('all') && !cats.includes(cat)) return;
    const entry = { ts: Date.now(), category, message, data, runId: searchRunIdRef.current };
    console.log(`[${category}] ${message}`, data || '');
    if (cat === 'api' || cat === 'search') {
      searchDebugLogRef.current = [...searchDebugLogRef.current.slice(-100), entry];
      setSearchDebugLog([...searchDebugLogRef.current]);
    }
    if (cat === 'url') {
      urlDebugLogRef.current = [...urlDebugLogRef.current.slice(-50), entry];
      setUrlDebugLog([...urlDebugLogRef.current]);
    }
  };

  // Add a filter-log entry for one interest's search results
  // Called once per interest after all filtering layers complete
  const addToFilterLog = ({ interestId, interestLabel, searchType, query, placeTypes, blacklist, nameKeywords, allResults, requestDetails }) => {
    if (!debugModeRef.current) return;
    // allResults = debugPlaceResults array — each item has { name, rating, reviews, primaryType, types, status, reason, nameKeywordMatch }
    const passed = allResults.filter(p => p.status === '✅ KEPT').map(p => ({
      name: p.name,
      rating: p.rating,
      reviews: p.reviews,
      primaryType: p.primaryType,
      matchedTypes: p.matchedTypes || [],
      nameKeywordMatch: p.nameKeywordMatch || null,
      openNow: p.openNow ?? null,
      address: p.address || null,
      rank: p.rank,
      totalFromGoogle: p.totalFromGoogle,
      googlePlaceId: p.googlePlaceId || null,
    }));
    const filtered = allResults.filter(p => p.status !== '✅ KEPT').map(p => ({
      name: p.name,
      rating: p.rating,
      reviews: p.reviews,
      primaryType: p.primaryType,
      address: p.address || null,
      googlePlaceId: p.googlePlaceId || null,
      layer: p.status,   // '❌ BLACKLIST' | '❌ TYPE MISMATCH' | '❌ NO MATCH' | '❌ CLOSED' | '❌ TOO FAR' | '❌ TOO FEW RATINGS'
      reason: p.reason || '',
    }));
    const entry = {
      ts: Date.now(),
      runId: searchRunIdRef.current,
      interestId,
      interestLabel,
      searchType,
      query: query || null,
      placeTypes: placeTypes || [],
      blacklist: blacklist || [],
      nameKeywords: nameKeywords || [],
      passed,
      filtered,
      fromGoogle: allResults.length,
      requestDetails: requestDetails || null,
    };
    filterLogRef.current = [entry, ...filterLogRef.current.slice(0, 99)];
    setFilterLog([...filterLogRef.current]);
  };

  // Build a structured context string from current debug sessions for Claude
  const buildClaudeContext = () => {
    const lines = [];
    lines.push('# FouFou Debug Context');
    lines.push('App: FouFou v' + (window.BKK?.VERSION || '?') + ' | City: ' + selectedCityId + ' | ' + new Date().toLocaleString('he-IL'));
    lines.push('');
    debugSessions.forEach((s, si) => {
      lines.push('='.repeat(60));
      lines.push('SESSION ' + (si + 1) + ' — ' + s.time);
      lines.push('City: ' + s.city + ' | Area: ' + (s.areaName || s.area) + ' | Mode: ' + s.searchMode + (s.radiusMeters ? ' ' + s.radiusMeters + 'm' : ''));
      lines.push('Interests: ' + s.interests.map(i => i.label).join(', '));
      if (s.stats) {
        lines.push('Stats: custom=' + s.stats.custom + ' fetched=' + s.stats.fetched + ' total=' + s.stats.total + ' maxStops=' + s.stats.maxStops);
        if (s.stats.interestResults) {
          lines.push('Per-interest: ' + Object.entries(s.stats.interestResults).map(([k,v]) => k + '(g:' + (v.google ?? v.fetched) + ' c:' + v.custom + ' t:' + v.total + ')').join(' | '));
        }
      }
      lines.push('');
      (s.stops || []).forEach((st, i) => {
        const d = st._debug;
        lines.push('  ' + (i + 1) + '. ' + (st.custom ? '📌' : '🌐') + ' ' + st.name);
        lines.push('     Rating: ⭐' + (st.rating || '?') + ' (' + (st.ratingCount || '?') + ' reviews)');
        if (st.address) lines.push('     Address: ' + st.address);
        if (d) {
          lines.push('     Interest: ' + d.interestLabel + ' | Search: ' + (d.searchType || '-') + (d.query ? ' "' + d.query + '"' : ''));
          if (d.placeTypes?.length) lines.push('     Types: ' + d.placeTypes.join(', '));
          if (d.googleTypes?.length) lines.push('     Google types: ' + d.googleTypes.join(', '));
          if (d.primaryType) lines.push('     Primary: ' + d.primaryType);
          if (d.rank) lines.push('     Rank: #' + d.rank + '/' + d.totalFromGoogle);
          if (d.blacklist?.length) lines.push('     Blacklist: ' + d.blacklist.join(', '));
        }
        lines.push('');
      });
      const sessLogs = searchDebugLogRef.current.filter(e => e.runId && e.runId === s.runId);
      if (sessLogs.length > 0) {
        lines.push('  --- API Log ---');
        sessLogs.forEach(e => {
          lines.push('  [' + e.category + '] ' + e.message);
          if (e.data?.total !== undefined) lines.push('    Google:' + e.data.total + ' → Kept:' + e.data.kept + ' BL:-' + (e.data.blacklistFiltered || 0) + ' Type:-' + (e.data.typeFiltered || 0));
        });
        lines.push('');
      }
    });
    return lines.join('\n');
  };

  // Open claude.ai with context + question pre-filled
  const askClaude = (question) => {
    const ctx = buildClaudeContext();
    const fullText = ctx + '\n\n' + '='.repeat(60) + '\n\nSHALOM FROM FOUFOU:\n' + question;
    const encoded = encodeURIComponent(fullText);
    if (encoded.length < 7500) {
      window.open('https://claude.ai/new?q=' + encoded, '_blank');
    } else {
      navigator.clipboard?.writeText(fullText).then(() => {
        showToast('📋 Context copied — paste in claude.ai', 'info');
        window.open('https://claude.ai/new', '_blank');
      }).catch(() => showToast('Context too large — use export instead', 'info'));
    }
  };

  // Save debug preferences
  useEffect(() => {
    localStorage.setItem('foufou_debug_mode', debugMode.toString());
  }, [debugMode]);
  useEffect(() => {
    localStorage.setItem('foufou_debug_categories', JSON.stringify(debugCategories));
  }, [debugCategories]);
  
  // Persist debug sessions (keep last 20 sessions)
  useEffect(() => {
    try { localStorage.setItem('foufou_debug_sessions', JSON.stringify(debugSessions.slice(-20))); } catch(e) {}
  }, [debugSessions]);
  
  // Save a debug session after route generation
  const saveDebugSession = (routeObj) => {
    if (!debugModeRef.current) return;
    const session = {
      id: Date.now(),
      runId: searchRunIdRef.current,
      time: new Date().toLocaleString('he-IL'),
      city: selectedCityId,
      area: formData.area,
      areaName: routeObj.areaName,
      searchMode: formData.searchMode,
      radiusMeters: formData.searchMode === 'radius' ? formData.radiusMeters : null,
      interests: formData.interests.map(id => {
        const opt = allInterestOptions.find(o => o.id === id);
        return { id, label: tLabel(opt) || id };
      }),
      stats: routeObj.stats || null,
      stops: (routeObj.stops || []).map(s => ({
        name: s.name,
        rating: s.rating,
        ratingCount: s.ratingCount,
        address: s.address,
        custom: !!s.custom,
        _debug: s._debug || null
      }))
    };
    setDebugSessions(prev => [...prev, session]);
  };
  
  // Export all debug sessions as text
  const exportDebugSessions = () => {
    if (debugSessions.length === 0) return;
    const lines = [];
    debugSessions.forEach((s, si) => {
      lines.push(`\n${'='.repeat(60)}`);
      lines.push(`SESSION ${si + 1} — ${s.time} — ${s.city} / ${s.areaName || s.area} (${s.searchMode}${s.radiusMeters ? ' ' + s.radiusMeters + 'm' : ''})`);
      lines.push(`Interests: ${s.interests.map(i => i.label).join(', ')}`);
      if (s.stats) {
        lines.push(`Stats: custom=${s.stats.custom} | fetched=${s.stats.fetched} | total=${s.stats.total} | maxStops=${s.stats.maxStops}`);
        if (s.stats.interestLimits) {
          lines.push(`Limits: ${Object.entries(s.stats.interestLimits).map(([k,v])=>`${k}=${v}`).join(', ')}`);
        }
        if (s.stats.interestResults) {
          lines.push(`Results: ${Object.entries(s.stats.interestResults).map(([k,v])=>`${k}: custom=${v.custom}, google=${v.google??v.fetched}, total=${v.total}, limit=${v.limit??'?'}`).join(' | ')}`);
        }
      }
      lines.push(`${'='.repeat(60)}`);
      (s.stops || []).forEach((st, i) => {
        const d = st._debug;
        lines.push(`  ${i+1}. ${st.name} ${st.custom ? '📌' : '🌐'} ⭐${st.rating || '?'} (${st.ratingCount || '?'})`);
        if (d) {
          lines.push(`     Interest: ${d.interestLabel} | Source: ${d.source} | Search: ${d.searchType || '-'}`);
          if (d.query) lines.push(`     Query: "${d.query}"`);
          if (d.placeTypes) lines.push(`     Types: ${d.placeTypes.join(', ')}`);
          if (d.blacklist && d.blacklist.length) lines.push(`     Blacklist: ${d.blacklist.join(', ')}`);
          if (d.googleTypes) lines.push(`     Google types: ${d.googleTypes.join(', ')}`);
          if (d.primaryType) lines.push(`     Primary: ${d.primaryType}`);
          if (d.rank) lines.push(`     Rank: ${d.rank}/${d.totalFromGoogle}`);
          lines.push(`     Area: ${d.area} | Center: ${d.center || '-'} | Radius: ${d.radius || '-'}m`);
        }
        if (st.address) lines.push(`     Address: ${st.address}`);
      });
    });
    // Append Google Info debug
    if (googleInfoDebugLogRef.current.length > 0) {
      lines.push('\n' + '='.repeat(60));
      lines.push('GOOGLE INFO DEBUG');
      lines.push('='.repeat(60));
      googleInfoDebugLogRef.current.forEach((e, i) => {
        lines.push(`\n[${i+1}] ${e.locationName}`);
        lines.push(`  Query: ${e.searchQuery}`);
        lines.push(`  PlaceID: ${e.rawFromGoogle.placeId || '(none)'} ${e.rawFromGoogle.placeId ? (e.rawFromGoogle.placeIdValid ? '✅ valid' : '❌ INVALID') : ''}`);
        lines.push(`  Name from Google: ${e.rawFromGoogle.name || '(none)'}`);
        lines.push(`  Rating: ${e.rawFromGoogle.rating ? `${e.rawFromGoogle.rating} (${e.rawFromGoogle.ratingCount})` : '(none)'}`);
        lines.push(`  Coords: ${e.rawFromGoogle.lat},${e.rawFromGoogle.lng}`);
        lines.push(`  Primary type: ${e.rawFromGoogle.primaryType || '(none)'}`);
        lines.push(`  Existing mapsUrl: ${e.existingMapsUrl || '(none)'}`);
        lines.push(`  Built URL: ${e.builtUrl || '(none)'}`);
      });
    }

    // Append URL debug
    if (urlDebugLogRef.current.length > 0) {
      lines.push('\n' + '='.repeat(60));
      lines.push('URL BUILD DEBUG');
      lines.push('='.repeat(60));
      urlDebugLogRef.current.forEach((e, i) => {
        const msg = e.message || '(no message)';
        lines.push(`\n[${i+1}] ${msg}`);
        const d = e.data;
        if (d) {
          lines.push(`  Name: ${d.name || '(none)'}`);
          lines.push(`  mapsUrl: ${d.raw?.mapsUrl || d.mapsUrl || '(none)'}`);
          lines.push(`  placeId: ${d.raw?.googlePlaceId || d.placeId || '(none)'}`);
          lines.push(`  lat/lng: ${d.raw?.lat || d.lat},${d.raw?.lng || d.lng}`);
          (d.steps || []).forEach(s => lines.push(`  → ${s.step || s}${s.url ? ': ' + s.url : ''}`));
          lines.push(`  Final URL: ${d.url || '#'}`);
        }
      });
    }

    const text = lines.join('\n');
    // On mobile: try clipboard; on desktop: always download file (more reliable)
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const filename = `foufou-debug-${new Date().toISOString().slice(0,16).replace('T','-')}.txt`;
    if (isMobile && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Debug copied to clipboard!', 'success');
      }).catch(() => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        a.click(); URL.revokeObjectURL(url);
        showToast('📥 Debug file downloaded', 'success');
      });
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      a.click(); URL.revokeObjectURL(url);
      showToast('📥 Debug file downloaded', 'success');
    }
  };
  
  // Share debug as file (mobile: Web Share API → WhatsApp/etc; desktop: download)

  // Clear debug sessions
  const clearDebugSessions = () => {
    setDebugSessions([]);
    searchDebugLogRef.current = [];
    setSearchDebugLog([]);
    urlDebugLogRef.current = [];
    setUrlDebugLog([]);
    googleInfoDebugLogRef.current = [];
    setGoogleInfoDebugLog([]);
    filterLogRef.current = [];
    setFilterLog([]);
    setDebugFlagged(new Set());
    showToast('🗑️ Debug cleared', 'info');
  };
  
  // Flagged stops for investigation
  const [debugFlagged, setDebugFlagged] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('foufou_debug_flagged') || '[]')); } catch(e) { return new Set(); }
  });
  useEffect(() => {
    try { localStorage.setItem('foufou_debug_flagged', JSON.stringify([...debugFlagged])); } catch(e) {}
  }, [debugFlagged]);
  const toggleDebugFlag = (key) => {
    setDebugFlagged(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const exportFlaggedStops = () => {
    const lines = ['=== 🚩 FLAGGED STOPS ===', ''];
    debugSessions.forEach((sess) => {
      const flaggedInSess = (sess.stops || []).map((st, i) => ({ st, i, key: `${sess.id}:${i}` })).filter(x => debugFlagged.has(x.key));
      if (flaggedInSess.length === 0) return;
      lines.push(`--- ${sess.time} | ${sess.areaName || sess.area} (${sess.searchMode}) | ${sess.interests.map(i => i.label).join(', ')} ---`);
      flaggedInSess.forEach(({ st, i }) => {
        const d = st._debug;
        lines.push(`  🚩 ${i + 1}. ${st.name} — ⭐${st.rating || '?'} (${st.ratingCount || '?'})`);
        if (d) {
          lines.push(`     Interest: ${d.interestLabel} | Search: ${d.searchType}${d.query ? ` "${d.query}"` : ''}`);
          if (d.placeTypes) lines.push(`     Search types: ${d.placeTypes.join(', ')}`);
          lines.push(`     Google types: ${(d.googleTypes || []).join(', ')}`);
          lines.push(`     Primary: ${d.primaryType || '-'} | Rank: #${d.rank}/${d.totalFromGoogle}`);
          if (d.blacklist?.length) lines.push(`     Blacklist: ${d.blacklist.join(', ')}`);
        }
        if (st.address) lines.push(`     Address: ${st.address}`);
        lines.push('');
      });
    });
    if (lines.length <= 2) { showToast('No flagged stops', 'info'); return; }
    const text = lines.join('\n');
    try { navigator.clipboard.writeText(text); showToast(`📋 ${lines.filter(l => l.includes('🚩')).length} flagged stops copied`, 'success'); }
    catch(e) { const blob = new Blob([text], {type:'text/plain'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'flagged-stops.txt'; a.click(); }
  };
  
  // Help content - merge Firebase overrides over i18n defaults
  const helpContentBase = window.BKK.helpContent;
  const getHelpSection = (sectionId) => {
    const lang = window.BKK.i18n.currentLang || 'he';
    const override = helpOverrides[sectionId] && helpOverrides[sectionId][lang];
    const base = helpContentBase[sectionId];
    if (override) return { title: (base && base.title) || sectionId, content: override };
    return base;
  };

  React.useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    database.ref('helpContent').once('value').then(snap => {
      const data = snap.val();
      if (data) setHelpOverrides(data);
    }).catch(() => {});
  }, [isFirebaseAvailable]);

  // Save a single field to cities/{cityId}/general in Firebase
  // Called from views.js city icon/color/name handlers — must live here (before 500KB Babel limit)
  // Handle city icon file upload — compresses and saves to Firebase
  // Must live here (app-logic.js, ~115KB) not in views.js (>500KB in bundle)
  const handleCityIconUpload = async (file, cityId, field, maxSize) => {
    if (!file) return;
    addDebugLog('firebase', `[CITY-ICON] handleCityIconUpload called`, { cityId, field, fileName: file.name, fileSize: file.size });
    try {
      const compressed = await window.BKK.compressIcon(file, maxSize || 80);
      addDebugLog('firebase', `[CITY-ICON] compressIcon result`, { hasResult: !!compressed, length: compressed?.length });
      if (!compressed) {
        showToast('❌ Failed to compress icon', 'error');
        return;
      }
      // Update local city object immediately
      const city = window.BKK.cities?.[cityId];
      if (city) {
        if (field === 'icon') city.icon = compressed;
        else if (field === 'iconLeft') { if (!city.theme) city.theme = {}; city.theme.iconLeft = compressed; }
        else if (field === 'iconRight') { if (!city.theme) city.theme = {}; city.theme.iconRight = compressed; }
      }
      // Update cityRegistry too
      const regKey = Object.keys(window.BKK.cityRegistry || {}).find(k => window.BKK.cityRegistry[k].id === cityId);
      if (regKey && field === 'icon') window.BKK.cityRegistry[regKey].icon = compressed;
      setCityModified(true);
      setCityEditCounter(c => c + 1);
      // Save to Firebase
      saveCityGeneralField(cityId, field, compressed);
    } catch (e) {
      addDebugLog('firebase', `[CITY-ICON] ❌ error`, { error: e.message });
      showToast('❌ Icon upload error: ' + e.message, 'error');
    }
  };
  // Expose for Console testing
  window.BKK._handleCityIconUpload = handleCityIconUpload;
  window.BKK._saveCityGeneralField = (cityId, field, value) => saveCityGeneralField(cityId, field, value);

  const saveCityGeneralField = (cityId, field, value) => {
    if (!isFirebaseAvailable || !database) {
      showToast('❌ Firebase not available', 'error');
      addDebugLog('firebase', `[CITY-SAVE] BLOCKED — Firebase not available`, { cityId, field });
      return;
    }
    if (!isUnlocked) {
      showToast('❌ No permission to save', 'error');
      addDebugLog('firebase', `[CITY-SAVE] BLOCKED — isUnlocked=false`, { cityId, field, isUnlocked, isEditor });
      return;
    }
    addDebugLog('firebase', `[CITY-SAVE] Saving cities/${cityId}/general/${field}`, { cityId, field, valueType: typeof value, valueLength: value?.length });
    database.ref(`cities/${cityId}/general/${field}`).set(value)
      .then(() => {
        addDebugLog('firebase', `[CITY-SAVE] ✅ Saved cities/${cityId}/general/${field}`);
        setCityEditCounter(c => c + 1);
      })
      .catch(e => {
        addDebugLog('firebase', `[CITY-SAVE] ❌ Error saving cities/${cityId}/general/${field}`, { error: e.message, code: e.code });
        showToast('❌ שגיאת שמירה: ' + e.message, 'error');
      });
  };

  // Save speech rate to Firebase systemParams
  const saveSpeechRate = (rate) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[SETTINGS-SAVE] speechRate → ${rate}`);
    database.ref('settings/systemParams/speechRate').set(rate);
  };

  // Lock/unlock a location
  const saveLocationLocked = (cityId, firebaseId, locked) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[SETTINGS-SAVE] location locked=${locked}`, { cityId, firebaseId });
    database.ref(`cities/${cityId}/locations/${firebaseId}/locked`).set(locked);
  };

  // Set interest adminStatus
  const saveInterestAdminStatus = (interestId, status) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[SETTINGS-SAVE] interestConfig/${interestId}/adminStatus → ${status}`);
    database.ref(`settings/interestConfig/${interestId}/adminStatus`).set(status).catch(() => {});
    database.ref('settings/cacheVersion').set(Date.now()).catch(() => {});
  };

  // Save a single system param
  const saveSystemParam = (key, value) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[SETTINGS-SAVE] systemParams/${key} → ${value}`);
    database.ref(`settings/systemParams/${key}`).set(value);
  };

  // Reset all system params to defaults
  const resetSystemParams = (defaults) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[SETTINGS-SAVE] systemParams RESET`, { keys: Object.keys(defaults) });
    database.ref('settings/systemParams').set(defaults);
  };

  // Bulk update (used in dedup/import operations in settings)
  const saveBulkUpdate = async (batch) => {
    if (!isFirebaseAvailable || !database) return;
    if (Object.keys(batch).length === 0) return;
    addDebugLog('firebase', `[SETTINGS-SAVE] bulkUpdate ${Object.keys(batch).length} keys`);
    await database.ref().update(batch);
  };

  // Clear access log (admin)
  const clearAccessLog = async () => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[SETTINGS-SAVE] accessLog.remove()`);
    await database.ref('accessLog').remove();
  };

  // Fetch access stats — moved here from views.js to keep all Firebase reads in app-logic.js
  const fetchAccessStats = async (onResult) => {
    if (!isFirebaseAvailable || !database) { showToast('No database', 'error'); return; }
    try {
      const snap = await database.ref('accessStats').once('value');
      const data = snap.val();
      if (data) onResult(data);
      else showToast('No access stats yet', 'info');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  // Remove a location's googlePlaceId field
  const removeLocationGooglePlaceId = (cityId, firebaseId) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] remove googlePlaceId`, { cityId, firebaseId });
    database.ref(`cities/${cityId}/locations/${firebaseId}/googlePlaceId`).remove();
  };

  // Toggle city visibility for an interest (cityHiddenInterests)
  const saveCityHiddenInterests = (cityId, arr) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] cityHiddenInterests/${cityId}`, { count: arr.length });
    database.ref(`settings/cityHiddenInterests/${cityId}`).set(arr.length > 0 ? arr : null)
      .catch(e => console.error('[CITY] toggle error:', e));
  };

  // Set interest adminStatus (cycled in interest dialog)
  const saveInterestAdminStatusAsync = async (interestId, status) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] interestConfig/${interestId}/adminStatus → ${status}`);
    try { await database.ref(`settings/interestConfig/${interestId}/adminStatus`).set(status); } catch(e) {}
  };

  // Save interest counter
  const saveInterestCounter = (cityId, interestId, counter) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] interestCounters/${interestId} → ${counter}`);
    database.ref(`cities/${cityId}/interestCounters/${interestId}`).set(counter);
  };

  // Remove interest config (for built-in interest reset)
  const removeInterestConfig = (interestId) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] remove interestConfig/${interestId}`);
    database.ref(`settings/interestConfig/${interestId}`).remove();
  };

  // Save interest config
  const saveInterestConfig = (interestId, configData) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] interestConfig/${interestId}`, { keys: Object.keys(configData) });
    database.ref(`settings/interestConfig/${interestId}`).set(configData);
    database.ref('settings/cacheVersion').set(Date.now());
  };

  const saveInterestGroup = (groupId, labelHe, labelEn, order) => {
    if (!isFirebaseAvailable || !database) return;
    const data = { labelHe: labelHe.trim(), labelEn: labelEn.trim() };
    if (order !== undefined) data.order = order;
    setInterestGroups(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || {}), ...data } }));
    database.ref(`settings/interestGroups/${groupId}`).update(data);
    database.ref('settings/cacheVersion').set(Date.now());
  };

  const deleteInterestGroup = (groupId) => {
    if (!isFirebaseAvailable || !database) return;
    setInterestGroups(prev => { const n = { ...prev }; delete n[groupId]; return n; });
    database.ref(`settings/interestGroups/${groupId}`).remove();
    database.ref('settings/cacheVersion').set(Date.now());
  };

  // Save/update customInterest + config in one operation
  const saveCustomInterestAndConfig = (firebaseId, interestId, updatedInterest, mergedConfig) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] customInterest+config`, { firebaseId, interestId });
    const batch = {};
    batch[`customInterests/${firebaseId || interestId}`] = updatedInterest;
    if (mergedConfig) batch[`settings/interestConfig/${interestId}`] = mergedConfig;
    batch['settings/cacheVersion'] = Date.now();
    database.ref().update(batch).catch(e => addDebugLog('firebase', '[DIALOG-SAVE] saveCustomInterestAndConfig failed', { error: e.message }));
  };

  // Create new interest (customInterests + cityHiddenInterests + interestStatus + interestConfig)
  // OPTIMIZED: single batched write instead of 4+ separate calls
  const saveNewInterest = (interestId, newInterestData, hiddenCityIds, userId, searchConfig) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] new interest ${interestId}`, { hiddenCities: hiddenCityIds.length });
    const batch = {};
    batch[`customInterests/${interestId}`] = newInterestData;
    batch[`settings/interestStatus/${interestId}`] = true;
    if (searchConfig) batch[`settings/interestConfig/${interestId}`] = searchConfig;
    hiddenCityIds.forEach(cid => {
      const cur = new Set(cityHiddenInterests[cid] || []);
      cur.add(interestId);
      batch[`settings/cityHiddenInterests/${cid}`] = [...cur];
    });
    batch['settings/cacheVersion'] = Date.now();
    database.ref().update(batch).catch(e => addDebugLog('firebase', `[DIALOG-SAVE] saveNewInterest failed`, { error: e.message }));
    if (userId) database.ref(`users/${userId}/interestStatus/${interestId}`).set(true).catch(() => {});
  };

  // Delete feedback list
  const clearFeedbackList = () => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] feedback.remove()`);
    database.ref('feedback').remove().then(() => {
      setFeedbackList([]);
      showToast(t('toast.allFeedbackDeleted'), 'success');
    });
  };

  // Delete a user (admin)
  const deleteUser = async (uid) => {
    if (!isFirebaseAvailable || !database) return;
    addDebugLog('firebase', `[DIALOG-SAVE] users/${uid}.remove()`);
    await database.ref(`users/${uid}`).remove();
  };

  // Set interestStatus for user and/or settings
  const saveNewInterestStatus = (userId, interestId) => {
    if (!isFirebaseAvailable || !database) return;
    if (userId) database.ref(`users/${userId}/interestStatus/${interestId}`).set(true).catch(() => {});
    else database.ref(`settings/interestStatus/${interestId}`).set(true).catch(() => {});
  };

  // Save new customInterest to Firebase with verification read-back
  const saveNewCustomInterest = (interestId, newInterestData, onSuccess, onError) => {
    if (!isFirebaseAvailable || !database) return false;
    addDebugLog('firebase', `[DIALOG-SAVE] new customInterest ${interestId}`);
    database.ref(`customInterests/${interestId}`).set(newInterestData)
      .then(() => {
        // Verify: read back to confirm server persisted it
        database.ref(`customInterests/${interestId}`).once('value').then(snap => {
          if (!snap.val()) {
            console.error(`[INTEREST-SAVE] ⚠️ VERIFICATION FAILED for ${interestId}`);
            showToast(`⚠️ "${newInterestData.label}" may not have been saved to server`, 'warning');
          }
        });
        if (onSuccess) onSuccess();
      })
      .catch(e => {
        addDebugLog('firebase', `[DIALOG-SAVE] ❌ customInterest FAILED ${interestId}`, { error: e.message });
        if (onError) onError(e);
      });
    return true;
  };

  // ── Translation utility ────────────────────────────────────────────────────
  // Detects if text is Hebrew (Unicode block \u0590-\u05FF).
  // If UI lang = he and text is NOT Hebrew → translate TO Hebrew.
  // If UI lang = en and text IS Hebrew (or not English) → translate TO English.
  // Returns null if no translation needed (text already matches UI lang).
  const detectNeedsTranslation = (text) => {
    if (!text || text.trim().length < 3) return null;
    const isHebrew = /[\u0590-\u05FF]/.test(text);
    const uiLang = window.BKK.i18n.currentLang || 'he';
    if (uiLang === 'he' && !isHebrew) return 'he';   // UI=he, text not Hebrew → translate to he
    if (uiLang === 'en' && isHebrew) return 'en';    // UI=en, text is Hebrew → translate to en
    return null; // already matches
  };

  // Translate text using MyMemory API (free, no key required, 1000 req/day)
  const translateText = async (text, targetLang) => {
    const langPair = targetLang === 'he' ? 'en|he' : 'he|en';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    addDebugLog('api', `[TRANSLATE] ${langPair}: "${text.substring(0, 40)}..."`);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translation API error: ' + res.status);
    const data = await res.json();
    if (data.responseStatus !== 200) throw new Error('Translation failed: ' + data.responseMessage);
    return data.responseData.translatedText;
  };
  // ──────────────────────────────────────────────────────────────────────────

  const saveHelpContent = (sectionId, text) => {
    if (!isFirebaseAvailable || !database) return;
    const lang = window.BKK.i18n.currentLang || 'he';
    database.ref(`helpContent/${sectionId}/${lang}`).set(text);
    setHelpOverrides(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], [lang]: text } }));
    showToast('💾 ' + (t('general.saved') || 'נשמר'), 'success');
  };

  const saveAndTranslateHint = async (sectionId, text) => {
    if (!isFirebaseAvailable || !database) return;
    const srcLang = window.BKK.i18n.currentLang || 'he';
    const tgtLang = srcLang === 'he' ? 'en' : 'he';
    // Save original to source lang slot
    database.ref(`helpContent/${sectionId}/${srcLang}`).set(text);
    setHelpOverrides(prev => ({ ...prev, [sectionId]: { ...(prev[sectionId] || {}), [srcLang]: text } }));
    showToast('💾 נשמר, מתרגם...', 'info');
    setHintEditId(null);
    // Translate and save to target lang slot
    try {
      const resp = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + srcLang + '&tl=' + tgtLang + '&dt=t&q=' + encodeURIComponent(text));
      const data = await resp.json();
      const translated = data[0].map(function(s) { return s[0]; }).join('');
      database.ref(`helpContent/${sectionId}/${tgtLang}`).set(translated);
      setHelpOverrides(prev => ({ ...prev, [sectionId]: { ...(prev[sectionId] || {}), [tgtLang]: translated } }));
      showToast('🌐 ' + (tgtLang === 'en' ? 'תורגם לאנגלית' : 'Translated to Hebrew') + '!', 'success');
    } catch (err) { showToast('Translation: ' + err.message, 'error'); }
  };

  // Save About text — translate to English only when source is Hebrew (same pattern as helpContent)
  const saveAboutContent = async (text) => {
    if (!isFirebaseAvailable || !database) return;
    const srcLang = window.BKK.i18n.currentLang || 'he';
    database.ref(`settings/aboutContent/${srcLang}`).set(text);
    setAboutContent(prev => ({ ...prev, [srcLang]: text }));
    if (srcLang !== 'he') {
      // English edit — save only, no translation
      showToast('💾 ' + (t('general.saved') || 'נשמר'), 'success');
      return;
    }
    // Hebrew edit — translate to English
    showToast('💾 ' + (t('general.saved') || 'נשמר') + ', מתרגם...', 'info');
    try {
      const resp = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=he&tl=en&dt=t&q=' + encodeURIComponent(text));
      const data = await resp.json();
      const translated = data[0].map(function(s) { return s[0]; }).join('');
      database.ref('settings/aboutContent/en').set(translated);
      setAboutContent(prev => ({ ...prev, en: translated }));
      showToast('🌐 תורגם לאנגלית!', 'success');
    } catch (err) { showToast('Translation: ' + err.message, 'error'); }
  };

  // Save About text without translation
  const saveAboutContentOnly = (text) => {
    if (!isFirebaseAvailable || !database) return;
    const srcLang = window.BKK.i18n.currentLang || 'he';
    database.ref(`settings/aboutContent/${srcLang}`).set(text);
    setAboutContent(prev => ({ ...prev, [srcLang]: text }));
    showToast('💾 ' + (t('general.saved') || 'נשמר'), 'success');
  };

  // TTS
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsVoices, setTtsVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(localStorage.getItem('foufou_tts_voice') || '');
  const [adminDefaultLang, setAdminDefaultLang] = useState(localStorage.getItem('foufou_admin_default_lang') || 'en');
  React.useEffect(() => {
    const load = () => setTtsVoices(window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const speakHelp = (text) => {
    if (!window.speechSynthesis) return;
    if (isSpeaking && !isPaused) { window.speechSynthesis.pause(); setIsPaused(true); return; }
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); return; }
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, '').replace(/[•#]/g, '').replace(/\n+/g, '. ');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = window.BKK.i18n.currentLang === 'en' ? 'en-US' : 'he-IL';
    u.rate = window.BKK.systemParams?.speechRate || 1.0;
    if (selectedVoice) { const v = ttsVoices.find(function(v) { return v.name === selectedVoice; }); if (v) u.voice = v; }
    u.onstart = () => { setIsSpeaking(true); setIsPaused(false); };
    u.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    u.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
    window.speechSynthesis.speak(u);
  };
  const stopSpeaking = () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); setIsSpeaking(false); setIsPaused(false); };

  // Hint visit tracking
  const getHintVisits = (id) => parseInt(localStorage.getItem('foufou_hint_' + id) || '0');
  const trackHintVisit = (id) => {
    if (!window._hintTracked) window._hintTracked = {};
    if (!window._hintTracked[id]) {
      window._hintTracked[id] = true;
      localStorage.setItem('foufou_hint_' + id, String(getHintVisits(id) + 1));
    }
  };
  const saveHint = (id, text) => {
    saveHelpContent(id, text);
    setHintEditId(null);
  };

  // Migrate old help content to hints (one-time, admin only)
  // Speech-to-text for hint editing
  const [hintRecording, setHintRecording] = useState(false);
  const [hintInterimText, setHintInterimText] = useState('');
  const hintEditTextRef = React.useRef('');
  const startHintDictation = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('Speech recognition not supported', 'error'); return; }
    const recognition = new SR();
    recognition.lang = window.BKK.i18n.currentLang === 'en' ? 'en-US' : 'he-IL';
    recognition.continuous = false;
    recognition.interimResults = true;
    hintEditTextRef.current = hintEditText;
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          hintEditTextRef.current = (hintEditTextRef.current ? hintEditTextRef.current + ' ' : '') + transcript;
          setHintEditText(hintEditTextRef.current);
          setHintInterimText('');
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (interim) setHintInterimText(interim);
    };
    recognition.onend = () => {
      setHintInterimText('');
      // Auto-restart if user didn't manually stop
      if (window._hintRecognition) {
        try { recognition.start(); } catch(e) { setHintRecording(false); window._hintRecognition = null; }
      }
    };
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') { setHintRecording(false); window._hintRecognition = null; }
    };
    window._hintRecognition = recognition;
    recognition.start();
    setHintRecording(true);
    showToast('🎤 ' + (t('toast.hintRecording') || 'מדבר...'), 'info');
  };
  const stopHintDictation = () => {
    const rec = window._hintRecognition;
    window._hintRecognition = null;
    if (rec) { try { rec.stop(); } catch(e) {} }
    setHintRecording(false);
    setHintInterimText('');
  };

  // Audio recording for hints (saves to Firebase Storage)
  const [hintAudioRecording, setHintAudioRecording] = useState(false);
  const [hintAudioUrls, setHintAudioUrls] = useState({});
  
  // Load audio URLs from Firebase
  React.useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    database.ref('helpAudio').once('value').then(snap => {
      const data = snap.val();
      if (data) setHintAudioUrls(data);
    }).catch(() => {});
  }, [isFirebaseAvailable]);

  const [hintAudioDurations, setHintAudioDurations] = useState({});
  
  // Load audio durations from Firebase
  React.useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    database.ref('helpAudioDuration').once('value').then(snap => {
      const data = snap.val();
      if (data) setHintAudioDurations(data);
    }).catch(() => {});
  }, [isFirebaseAvailable]);

  const startHintAudioRecord = (hintId) => {
    const recordStart = Date.now();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const duration = Math.round((Date.now() - recordStart) / 1000);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          const lang = window.BKK.i18n.currentLang || 'he';
          const key = hintId + '_' + lang;
          if (isFirebaseAvailable && database) {
            // OPTIMIZED: batch 2 writes into single update
            database.ref().update({
              ['helpAudio/' + key]: base64,
              ['helpAudioDuration/' + key]: duration,
            });
            setHintAudioUrls(prev => ({ ...prev, [key]: base64 }));
            setHintAudioDurations(prev => ({ ...prev, [key]: duration }));
            showToast('🎙️ ' + duration + 's נשמרה!', 'success');
          }
        };
        reader.readAsDataURL(blob);
      };
      window._hintMediaRecorder = mediaRecorder;
      mediaRecorder.start();
      setHintAudioRecording(hintId);
      showToast('🔴 מקליט...', 'info');
    }).catch(() => showToast('אין גישה למיקרופון', 'error'));
  };
  const stopHintAudioRecord = () => {
    if (window._hintMediaRecorder) { window._hintMediaRecorder.stop(); window._hintMediaRecorder = null; }
    setHintAudioRecording(false);
  };

  // Play hint: audio recording > TTS
  const playHint = (hintId, text) => {
    // Always cancel any ongoing TTS first
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (window._hintAudio) { window._hintAudio.pause(); window._hintAudio = null; }
    
    const lang = window.BKK.i18n.currentLang || 'he';
    const audioUrl = hintAudioUrls[hintId + '_' + lang];
    if (audioUrl) {
      window.BKK.logEvent?.('hint_audio_played', { hint_id: hintId, lang });
      const audio = new Audio(audioUrl);
      window._hintAudio = audio;
      audio.onended = () => { setIsSpeaking(false); setIsPaused(false); setPlayingHintLabel(''); window._hintAudio = null; };
      setIsSpeaking(true); setIsPaused(false);
      setPlayingHintLabel(text?.slice(0, 40) || hintId);
      audio.play();
      return;
    }
    speakHelp(text);
  };
  const pauseResumeHint = () => {
    if (window._hintAudio) {
      if (window._hintAudio.paused) { window._hintAudio.play(); setIsPaused(false); }
      else { window._hintAudio.pause(); setIsPaused(true); }
      return;
    }
    // TTS pause/resume
    if (window.speechSynthesis) {
      if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
      else { window.speechSynthesis.pause(); setIsPaused(true); }
    }
  };
  const stopHintPlayback = () => {
    if (window._hintAudio) { window._hintAudio.pause(); window._hintAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false); setIsPaused(false); setPlayingHintLabel('');
  };

  // Render a context-sensitive hint bar
  const [openHintPopup, setOpenHintPopup] = useState(null);
  const [playingHintLabel, setPlayingHintLabel] = useState(''); // label shown in floating player
  const [hintDragPos, setHintDragPos] = React.useState({ x: 0, y: 0 });
  const hintDragRef = React.useRef({ x: 0, y: 0, startX: 0, startY: 0, dragging: false });
  const closeHintPopup = () => { setOpenHintPopup(null); /* audio continues — stops only via floating player */ };
  const renderContextHint = (hintId) => {
    const s = getHelpSection(hintId);
    const txt = (s && s.content && s.content.trim()) || '';
    trackHintVisit(hintId);
    const lang = window.BKK.i18n.currentLang || 'he';
    const hasAudio = !!hintAudioUrls[hintId + '_' + lang];
    const btnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '0 1px' };
    const isRTL = window.BKK.i18n.isRTL();
    
    if (!txt && !isAdmin) return null;
    
    // Admin editing mode
    if (hintEditId === hintId) return (
      <div style={{ margin: '4px 0', padding: '8px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
        <textarea value={hintEditText + (hintInterimText ? ' ' + hintInterimText : '')} 
          readOnly={!!hintInterimText}
          onChange={(e) => { if (!hintInterimText) { setHintEditText(e.target.value); hintEditTextRef.current = e.target.value; } }}
          onFocus={(e) => { e.target.style.minHeight = Math.max(120, e.target.scrollHeight) + 'px'; }}
          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = Math.max(120, el.scrollHeight) + 'px'; } }}
          style={{ width: '100%', minHeight: '120px', padding: '6px', fontSize: '12px', border: '1px solid #93c5fd', borderRadius: '6px', resize: 'vertical', direction: isRTL ? 'rtl' : 'ltr', userSelect: 'text', WebkitUserSelect: 'text', touchAction: 'auto' }} />
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
          <button onClick={() => saveHint(hintId, hintEditText)}
            style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 'bold', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾</button>
          <button onClick={() => saveAndTranslateHint(hintId, hintEditText)}
            style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 'bold', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾🌐</button>
          <button onClick={() => hintRecording ? stopHintDictation() : startHintDictation()}
            style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 'bold', background: hintRecording ? '#ef4444' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', animation: hintRecording ? 'pulse 1s infinite' : 'none' }}>{hintRecording ? '⏹️ הפסק' : '🎤 הכתב'}</button>
          <button onClick={() => setHintEditId(null)}
            style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 'bold', background: '#d1d5db', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
          {/* Audio recording */}
          <div style={{ width: '100%', display: 'flex', gap: '4px', marginTop: '2px' }}>
            {hintAudioRecording === hintId ? (
              <button onClick={stopHintAudioRecord}
                style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 'bold', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', animation: 'pulse 1s infinite' }}>🔴 סיום הקלטה</button>
            ) : (
              <button onClick={() => startHintAudioRecord(hintId)}
                style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 'bold', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🎙️ הקלט קול ({lang})</button>
            )}
            {hasAudio && <span style={{ fontSize: '10px', color: '#22c55e', alignSelf: 'center' }}>✅ יש הקלטה</span>}
          </div>
        </div>
      </div>
    );
    
    // Empty (admin only) - small add button
    if (!txt && isAdmin) return (
      <div style={{ display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end', margin: '-4px 0 0 0', lineHeight: 1 }}>
        <button onClick={() => { setHintEditId(hintId); setHintEditText(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#d1d5db', padding: '0 2px' }}>＋</button>
      </div>
    );
    
    // Default: popup only (buttons rendered by renderStepHeader inline)
    return (<>
      {openHintPopup === hintId && (<>
          <div onClick={closeHintPopup} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          <div
            onMouseDown={(e) => {
              const clientX = e.clientX; const clientY = e.clientY;
              hintDragRef.current = { ...hintDragRef.current, startX: clientX - hintDragRef.current.x, startY: clientY - hintDragRef.current.y, dragging: true };
              e.preventDefault();
            }}
            onMouseMove={(e) => {
              if (!hintDragRef.current.dragging) return;
              const x = e.clientX - hintDragRef.current.startX;
              const y = e.clientY - hintDragRef.current.startY;
              hintDragRef.current.x = x; hintDragRef.current.y = y;
              setHintDragPos({ x, y });
            }}
            onMouseUp={() => { hintDragRef.current.dragging = false; }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              hintDragRef.current = { ...hintDragRef.current, startX: t.clientX - hintDragRef.current.x, startY: t.clientY - hintDragRef.current.y, dragging: true };
            }}
            onTouchMove={(e) => {
              if (!hintDragRef.current.dragging) return;
              const t = e.touches[0];
              const x = t.clientX - hintDragRef.current.startX;
              const y = t.clientY - hintDragRef.current.startY;
              hintDragRef.current.x = x; hintDragRef.current.y = y;
              setHintDragPos({ x, y });
            }}
            onTouchEnd={() => { hintDragRef.current.dragging = false; }}
            style={{
              position: 'fixed', zIndex: 9999,
              top: `calc(50% + ${hintDragPos.y}px)`, left: `calc(50% + ${hintDragPos.x}px)`,
              transform: 'translate(-50%, -50%)',
              width: 'min(340px, 88vw)',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '16px',
              border: '1px solid #7dd3fc',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              fontSize: '13px', color: '#1e3a5f',
              direction: isRTL ? 'rtl' : 'ltr',
              animation: 'fadeIn 0.2s',
              overflow: 'hidden',
              cursor: 'default',
              userSelect: 'none'
            }}>
            {/* Header / drag handle */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', gap: '8px',
              background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
              cursor: 'grab'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>💡</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                  {t('wizard.audioTitle') || (isRTL ? 'הסבר' : 'Info')}
                </span>
                {(() => { const dur = hintAudioDurations[hintId + '_' + lang]; return dur ? (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>{dur}s</span>
                ) : null; })()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => isSpeaking ? pauseResumeHint() : playHint(hintId, txt)}
                  style={{ ...btnStyle, color: 'white', fontSize: '18px', opacity: 0.9 }}>
                  {isSpeaking ? (isPaused ? '▶️' : '⏸️') : (hasAudio ? '🔊' : '🔈')}
                </button>
                {isSpeaking && <button onClick={stopHintPlayback} style={{ ...btnStyle, color: 'white', fontSize: '16px' }}>⏹️</button>}
                <button onClick={closeHintPopup}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontSize: '14px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold' }}>✕</button>
              </div>
            </div>
            {/* Content — touchAction auto so scroll works, stops drag propagation */}
            <div
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ padding: '12px 16px', lineHeight: '1.7', maxHeight: '50vh', overflowY: 'auto', userSelect: 'text', cursor: 'text', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {txt}
            </div>
          </div>
      </>)}
    </>);
  };

  const showHelpFor = (context) => {
    setHelpContext(context);
    setHelpEditing(false);
    setShowHelp(true);
  };

  const showConfirm = (message, onConfirm, options = {}) => {
    setConfirmConfig({ message, onConfirm, ...options });
    setShowConfirmDialog(true);
  };

  // Toast notification helper
  const showToast = (message, type = 'success', customDuration = null) => {
    setToastMessage({ message, type, sticky: customDuration === 'sticky' });
    if (customDuration !== 'sticky') {
      const duration = customDuration || (window.BKK.systemParams?.toastDuration ?? 3000);
      setTimeout(() => setToastMessage(null), duration);
    }
  };



  // Geocode typed start point address to coordinates


  // Monitor Firebase connection state
  useEffect(() => {
    const handler = (e) => setFirebaseConnected(e.detail.connected);
    window.addEventListener('firebase-connection', handler);
    setFirebaseConnected(!!window.BKK.firebaseConnected);
    return () => window.removeEventListener('firebase-connection', handler);
  }, []);

  // Startup offline detection — if still not connected after 5s, show toast
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!window.BKK.firebaseConnected) {
        showToast(t('toast.offline'), 'warning', 'sticky');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Push navigation state when view or wizard step changes
  useEffect(() => {
    if (window.BKK.pushNavState) {
      window.BKK.pushNavState({ view: currentView, wizardStep });
    }
  }, [currentView, wizardStep]);

  // Handle Android/iOS back button
  useEffect(() => {
    const handler = (e) => {
      const prev = e.detail;
      if (!prev) return;
      
      // Within wizard: go to previous step
      if (prev.wizardStep < wizardStep) {
        setWizardStep(prev.wizardStep);
        if (prev.wizardStep < 3) { setRoute(null); setCurrentView('form'); }
        window.scrollTo(0, 0);
        return;
      }
      
      // Normal navigation between views
      if (prev.view !== currentView) {
        setCurrentView(prev.view);
        window.scrollTo(0, 0);
        return;
      }
    };
    window.addEventListener('app-nav-back', handler);
    return () => window.removeEventListener('app-nav-back', handler);
  }, [currentView, wizardStep]);

  // Save pending items to localStorage whenever they change
  useEffect(() => {
  }, [pendingLocations]);
  useEffect(() => {
  }, [pendingInterests]);

  // Sync pending locations to Firebase
  const syncPendingItems = async () => {
    if (!isFirebaseAvailable || !database) return 0;
    if (!window.BKK.firebaseConnected) {
      showToast(t('toast.offline'), 'warning');
      return 0;
    }
    
    let synced = 0;
    
    // Sync pending locations
    if (pendingLocations.length > 0) {
      const remaining = [];
      for (const loc of pendingLocations) {
        try {
          const cityId = loc.cityId || selectedCityId;
          const { pendingAt, ...cleanLoc } = loc;
          const ref = await database.ref(`cities/${cityId}/locations`).push(cleanLoc);
          // Verify server received it by reading back
          await Promise.race([
            ref.once('value'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);
          synced++;
          console.log('[SYNC] Synced pending location:', loc.name);
        } catch (e) {
          console.warn('[SYNC] Failed to sync location:', loc.name, e.message);
          remaining.push(loc);
        }
      }
      setPendingLocations(remaining);
    }
    
    // Sync pending interests
    if (pendingInterests.length > 0) {
      const remaining = [];
      for (const item of pendingInterests) {
        try {
          const { pendingAt, searchConfig, ...interestData } = item;
          await database.ref(`customInterests/${interestData.id}`).set(interestData);
          if (searchConfig && Object.keys(searchConfig).length > 0) {
            await database.ref(`settings/interestConfig/${interestData.id}`).set(searchConfig);
          }
          // Verify server received it by reading back
          await Promise.race([
            database.ref(`customInterests/${interestData.id}`).once('value'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);
          synced++;
          console.log('[SYNC] Synced pending interest:', interestData.label);
        } catch (e) {
          console.warn('[SYNC] Failed to sync interest:', item.label, e.message);
          remaining.push(item);
        }
      }
      setPendingInterests(remaining);
    }
    
    const totalPending = pendingLocations.length + pendingInterests.length;
    if (synced > 0) {
      showToast(`✅ ${t('toast.syncedPending').replace('{count}', String(synced))}`, 'success');
    }
    if (totalPending > 0 && synced < totalPending) {
      showToast(`⚠️ ${totalPending - synced} ${t('toast.stillPending')}`, 'warning');
    }
    return synced;
  };

  // Auto-sync when connection is restored
  useEffect(() => {
    if (firebaseConnected && isFirebaseAvailable && database) {
      // Dismiss any sticky offline toast
      setToastMessage(prev => (prev && prev.sticky) ? null : prev);
      if (pendingLocations.length > 0 || pendingInterests.length > 0) {
        const timer = setTimeout(() => {
          console.log('[SYNC] Connection restored, syncing', pendingLocations.length, 'locations +', pendingInterests.length, 'interests');
          showToast(`🔄 ${t('toast.connectionRestored')}`, 'info');
          syncPendingItems();
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        // No pending items but connection just came back — inform user
        console.log('[SYNC] Connection restored, no pending items');
      }
    }
  }, [firebaseConnected]);

  // Helper: save to pending localStorage
  const saveToPending = (locationData) => {
    const pending = { ...locationData, pendingAt: new Date().toISOString() };
    setPendingLocations(prev => [...prev, pending]);
    showToast(`💾 ${locationData.name} — ${t('toast.savedPending')}`, 'warning', 'sticky');
  };

  const saveToPendingInterest = (interestData, searchConfig) => {
    const pending = { ...interestData, searchConfig: searchConfig || {}, pendingAt: new Date().toISOString() };
    setPendingInterests(prev => [...prev, pending]);
    showToast(`💾 ${interestData.label || interestData.name} — ${t('toast.savedPending')}`, 'warning', 'sticky');
  };

  // One-time migration: move old customLocations to per-city structure
  useEffect(() => {
    if (isFirebaseAvailable && database) {
      window.BKK.migrateLocationsToPerCity(database);
      window.BKK.cleanupInProgress(database);
      window.BKK.seedSystemRoutes(database);
      // NOTE: cleanupOrphanedInterests REMOVED — it was deleting valid interests!
      // The function checked for types/textSearch on the interest object, but search config
      // is stored separately in settings/interestConfig/{id}. So non-privateOnly interests
      // were incorrectly flagged as orphans and deleted.

      // interests and interestConfig live entirely in Firebase — no hardcoded seeds or patches

      // ONE-TIME CLEANUP: Remove interestConfig + interestStatus orphans (v3.12.19)
      // Prevents zombie entries after user deletes an interest
      if (localStorage.getItem('interestConfig_orphans_cleaned_v1219') !== 'true') {
        Promise.all([
          database.ref('customInterests').once('value'),
          database.ref('settings/interestConfig').once('value'),
          database.ref('settings/interestStatus').once('value'),
          database.ref('users').once('value'),
        ]).then(([ciSnap, cfgSnap, statusSnap, usersSnap]) => {
          const ciIds = new Set(Object.values(ciSnap.val() || {}).map(v => v.id).filter(Boolean));
          const writes = {};
          // Clean interestConfig
          Object.keys(cfgSnap.val() || {}).forEach(id => {
            if (!ciIds.has(id)) writes[`settings/interestConfig/${id}`] = null;
          });
          // Clean interestStatus
          Object.keys(statusSnap.val() || {}).forEach(id => {
            if (!ciIds.has(id)) writes[`settings/interestStatus/${id}`] = null;
          });
          // Clean users/interestStatus
          Object.entries(usersSnap.val() || {}).forEach(([uid, udata]) => {
            Object.keys(udata?.interestStatus || {}).forEach(id => {
              if (!ciIds.has(id)) writes[`users/${uid}/interestStatus/${id}`] = null;
            });
          });
          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => {
                console.log('[CLEANUP] Removed orphan entries:', Object.keys(writes).length);
                localStorage.setItem('interestConfig_orphans_cleaned_v1219', 'true');
              })
              .catch(e => console.error('[CLEANUP] orphan cleanup failed:', e));
          } else {
            localStorage.setItem('interestConfig_orphans_cleaned_v1219', 'true');
          }
        });
      }

      // ONE-TIME RESTORE: Set culture and shopping back to active (v3.12.5)
      if (localStorage.getItem('restore_culture_shopping_v125') !== 'true') {
        const writes = {};
        ['culture', 'shopping'].forEach(id => {
          writes[`settings/interestConfig/${id}/adminStatus`] = 'active';
        });
        database.ref().update(writes)
          .then(() => localStorage.setItem('restore_culture_shopping_v125', 'true'))
          .catch(e => console.error('[RESTORE] culture/shopping failed:', e));
      }

      // ONE-TIME MIGRATION: Move labelOverride/labelEnOverride → customInterests.label/labelEn (v3.12.11)
      // After this, interestConfig holds search config only — no display fields
      if (localStorage.getItem('labels_migrated_to_customInterests_v1211') !== 'true') {
        Promise.all([
          database.ref('customInterests').once('value'),
          database.ref('settings/interestConfig').once('value')
        ]).then(([ciSnap, cfgSnap]) => {
          const ciData = ciSnap.val() || {};
          const cfgData = cfgSnap.val() || {};
          const writes = {};

          // Build id → firebase key map
          const idToKey = {};
          Object.entries(ciData).forEach(([fbKey, val]) => {
            if (val && val.id) idToKey[val.id] = fbKey;
          });

          Object.entries(cfgData).forEach(([id, cfg]) => {
            const labelOverride = cfg.labelOverride;
            const labelEnOverride = cfg.labelEnOverride;
            if (!labelOverride && !labelEnOverride) return;

            const fbKey = idToKey[id];

            // nightlife: only delete overrides, keep current label
            if (id === 'nightlife') {
              if (labelOverride) writes[`settings/interestConfig/${id}/labelOverride`] = null;
              if (labelEnOverride) writes[`settings/interestConfig/${id}/labelEnOverride`] = null;
              return;
            }

            if (fbKey) {
              if (labelOverride) {
                writes[`customInterests/${fbKey}/label`] = labelOverride;
                writes[`settings/interestConfig/${id}/labelOverride`] = null;
              }
              if (labelEnOverride) {
                writes[`customInterests/${fbKey}/labelEn`] = labelEnOverride;
                writes[`settings/interestConfig/${id}/labelEnOverride`] = null;
              }
            }
          });

          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => {
                console.log('[MIGRATION] labels moved to customInterests:', Object.keys(writes).length, 'writes');
                localStorage.setItem('labels_migrated_to_customInterests_v1211', 'true');
              })
              .catch(e => console.error('[MIGRATION] labels migration failed:', e));
          } else {
            localStorage.setItem('labels_migrated_to_customInterests_v1211', 'true');
          }
        });
      }

      // ONE-TIME MIGRATION: Move iconOverride → customInterests.icon (v3.12.17)
      // interestConfig should hold search config only — no display fields
      if (localStorage.getItem('icons_migrated_to_customInterests_v1217') !== 'true') {
        Promise.all([
          database.ref('customInterests').once('value'),
          database.ref('settings/interestConfig').once('value')
        ]).then(([ciSnap, cfgSnap]) => {
          const ciData = ciSnap.val() || {};
          const cfgData = cfgSnap.val() || {};
          const idToKey = {};
          Object.entries(ciData).forEach(([fbKey, val]) => { if (val?.id) idToKey[val.id] = fbKey; });
          const writes = {};
          Object.entries(cfgData).forEach(([id, cfg]) => {
            const iconOverride = cfg.iconOverride || cfg.icon;
            if (!iconOverride) return;
            const fbKey = idToKey[id];
            if (!fbKey) return;
            const currentIcon = ciData[fbKey]?.icon || '';
            // Only write if customInterests.icon is empty or default 📍
            if (!currentIcon || currentIcon === '📍') {
              writes[`customInterests/${fbKey}/icon`] = iconOverride;
            }
            writes[`settings/interestConfig/${id}/iconOverride`] = null;
            if (cfg.icon) writes[`settings/interestConfig/${id}/icon`] = null;
          });
          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => {
                console.log('[MIGRATION] icons moved to customInterests:', Object.keys(writes).length, 'writes');
                localStorage.setItem('icons_migrated_to_customInterests_v1217', 'true');
              })
              .catch(e => console.error('[MIGRATION] icons migration failed:', e));
          } else {
            localStorage.setItem('icons_migrated_to_customInterests_v1217', 'true');
          }
        });
      }

      // ONE-TIME MIGRATION: Rename interest IDs to readable English names (v3.12.12)
      // e.g. custom_1773840083847 → sweets, cafes → coffee, graffiti → street_art
      // Updates: customInterests[].id, interestConfig keys, interestStatus keys,
      //          locations[].interests arrays, users[].interestStatus keys
      if (localStorage.getItem('interest_ids_migrated_v1213') !== 'true') {
        const toId = (s) => 'i_' + s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const cityIds = Object.keys(window.BKK.cities || {});
        Promise.all([
          database.ref('customInterests').once('value'),
          database.ref('settings/interestConfig').once('value'),
          database.ref('settings/interestStatus').once('value'),
          database.ref('users').once('value'),
          // Read each city's locations + routes individually
          ...cityIds.map(cid => Promise.all([
            database.ref(`cities/${cid}/locations`).once('value'),
            database.ref(`cities/${cid}/routes`).once('value')
          ]).then(([locSnap, routeSnap]) => ({ cityId: cid, snap: locSnap, routesSnap: routeSnap })))
        ]).then(([ciSnap, cfgSnap, statusSnap, usersSnap, ...citySnaps]) => {
          const ciData = ciSnap.val() || {};
          const cfgData = cfgSnap.val() || {};
          const statusData = statusSnap.val() || {};
          const usersData = usersSnap.val() || {};

          // Build migration map: old_id → new_id
          const migration = {};
          const fbKeyMap = {};
          Object.entries(ciData).forEach(([fbKey, val]) => {
            if (!val || !val.id) return;
            const labelEn = (val.labelEn || '').trim();
            if (!labelEn) return;
            const newId = toId(labelEn);
            if (newId !== val.id) {
              migration[val.id] = newId;
              fbKeyMap[val.id] = fbKey;
            }
          });

          if (Object.keys(migration).length === 0) {
            localStorage.setItem('interest_ids_migrated_v1213', 'true');
            return;
          }

          const writes = {};
          Object.entries(migration).forEach(([oldId, newId]) => {
            const fbKey = fbKeyMap[oldId];
            // 1. customInterests id field
            writes[`customInterests/${fbKey}/id`] = newId;
            // 2. interestConfig
            if (cfgData[oldId]) {
              writes[`settings/interestConfig/${newId}`] = cfgData[oldId];
              writes[`settings/interestConfig/${oldId}`] = null;
            }
            // 3. interestStatus
            if (statusData[oldId] !== undefined) {
              writes[`settings/interestStatus/${newId}`] = statusData[oldId];
              writes[`settings/interestStatus/${oldId}`] = null;
            }
            // 4. locations + routes — from individually fetched cities
            citySnaps.forEach(({ cityId, snap, routesSnap }) => {
              // locations
              const locsData = snap.val() || {};
              Object.entries(locsData).forEach(([locId, loc]) => {
                if (Array.isArray(loc.interests) && loc.interests.includes(oldId)) {
                  const key = `cities/${cityId}/locations/${locId}/interests`;
                  const current = writes[key] || loc.interests;
                  writes[key] = current.map(i => i === oldId ? newId : i);
                }
              });
              // routes: preferences.interests, stops[].interests, stops[]._debug.interestId
              const routesData = (routesSnap && routesSnap.val()) || {};
              Object.entries(routesData).forEach(([routeId, route]) => {
                const prefInts = route.preferences?.interests;
                if (Array.isArray(prefInts) && prefInts.includes(oldId)) {
                  const key = `cities/${cityId}/routes/${routeId}/preferences/interests`;
                  const current = writes[key] || prefInts;
                  writes[key] = current.map(i => i === oldId ? newId : i);
                }
                const stops = route.stops;
                if (Array.isArray(stops)) {
                  stops.forEach((stop, idx) => {
                    if (!stop) return;
                    if (Array.isArray(stop.interests) && stop.interests.includes(oldId)) {
                      const key = `cities/${cityId}/routes/${routeId}/stops/${idx}/interests`;
                      const current = writes[key] || stop.interests;
                      writes[key] = current.map(i => i === oldId ? newId : i);
                    }
                    if (stop._debug?.interestId === oldId) {
                      writes[`cities/${cityId}/routes/${routeId}/stops/${idx}/_debug/interestId`] = newId;
                    }
                  });
                }
              });
            });
            // 5. users interestStatus
            Object.entries(usersData).forEach(([uid, udata]) => {
              if (udata?.interestStatus?.[oldId] !== undefined) {
                writes[`users/${uid}/interestStatus/${newId}`] = udata.interestStatus[oldId];
                writes[`users/${uid}/interestStatus/${oldId}`] = null;
              }
            });
          });

          database.ref().update(writes)
            .then(() => {
              console.log('[MIGRATION] Interest IDs renamed:', Object.keys(migration).length, 'ids,', Object.keys(writes).length, 'writes');
              localStorage.setItem('interest_ids_migrated_v1213', 'true');
            })
            .catch(e => console.error('[MIGRATION] ID rename failed:', e));
        }).catch(e => console.error('[MIGRATION] ID rename read failed:', e));
      }

      // ONE-TIME CLEANUP: Remove stale cityOverrides/interests from Firebase (v3.12.3)
      if (localStorage.getItem('cityOverrides_interests_cleaned') !== 'true') {
        database.ref('settings/cityOverrides').once('value').then(snap => {
          const data = snap.val() || {};
          const writes = {};
          Object.keys(data).forEach(cityId => {
            if (data[cityId]?.interests) writes[`settings/cityOverrides/${cityId}/interests`] = null;
            if (data[cityId]?.uncoveredInterests) writes[`settings/cityOverrides/${cityId}/uncoveredInterests`] = null;
          });
          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => localStorage.setItem('cityOverrides_interests_cleaned', 'true'))
              .catch(e => console.error('[CLEANUP] cityOverrides failed:', e));
          } else {
            localStorage.setItem('cityOverrides_interests_cleaned', 'true');
          }
        });
      }

      // ONE-TIME MIGRATION: Move cityOverrides/theme icons → cities/{cityId}/icon|iconLeft|iconRight (v3.12.21)
      if (localStorage.getItem('city_icons_migrated_v1221') !== 'true') {
        database.ref('settings/cityOverrides').once('value').then(snap => {
          const data = snap.val() || {};
          const writes = {};
          Object.entries(data).forEach(([cityId, co]) => {
            if (co.theme) {
              if (co.theme.icon) writes[`cities/${cityId}/general/icon`] = co.theme.icon;
              if (co.theme.iconLeft) writes[`cities/${cityId}/general/iconLeft`] = co.theme.iconLeft;
              if (co.theme.iconRight) writes[`cities/${cityId}/general/iconRight`] = co.theme.iconRight;
              writes[`settings/cityOverrides/${cityId}/theme`] = null;
            }
          });
          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => localStorage.setItem('city_icons_migrated_v1221', 'true'))
              .catch(e => console.error('[MIGRATION] city icons failed:', e));
          } else {
            localStorage.setItem('city_icons_migrated_v1221', 'true');
          }
        });
      }

      // ONE-TIME MIGRATION: Move cities/{cityId}/icon|iconLeft|iconRight → cities/{cityId}/general/ (v3.12.23)
      if (localStorage.getItem('city_icons_to_general_v1223') !== 'true') {
        const cityIds = Object.values(window.BKK.cityRegistry || {}).map(r => r.id);
        Promise.all(cityIds.flatMap(cid => [
          database.ref(`cities/${cid}/icon`).once('value').then(s => ({ cid, field: 'icon', val: s.val() })),
          database.ref(`cities/${cid}/iconLeft`).once('value').then(s => ({ cid, field: 'iconLeft', val: s.val() })),
          database.ref(`cities/${cid}/iconRight`).once('value').then(s => ({ cid, field: 'iconRight', val: s.val() })),
        ])).then(results => {
          const writes = {};
          results.forEach(({ cid, field, val }) => {
            if (val) {
              writes[`cities/${cid}/general/${field}`] = val;
              writes[`cities/${cid}/${field}`] = null;
            }
          });
          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => localStorage.setItem('city_icons_to_general_v1223', 'true'))
              .catch(e => console.error('[MIGRATION] city icons to general failed:', e));
          } else {
            localStorage.setItem('city_icons_to_general_v1223', 'true');
          }
        }).catch(() => localStorage.setItem('city_icons_to_general_v1223', 'true'));
      }

      // ONE-TIME MIGRATION: Move dayStartHour/nightStartHour/color → cities/{cityId}/general (v3.12.25)
      if (localStorage.getItem('city_general_migrated_v1225') !== 'true') {
        const cityIds = Object.values(window.BKK.cityRegistry || {}).map(r => r.id);
        Promise.all([
          database.ref('settings/cityOverrides').once('value'),
          ...cityIds.map(cid => database.ref(`cities/${cid}/general`).once('value').then(s => ({ cid, val: s.val() || {} })))
        ]).then(([overridesSnap, ...cityGenerals]) => {
          const overrides = overridesSnap.val() || {};
          const writes = {};
          cityIds.forEach((cid, i) => {
            const existing = cityGenerals[i].val;
            const co = overrides[cid] || {};
            const cityJs = window.BKK.cities[cid] || {};
            // dayStartHour: cityOverrides > JS file > default
            if (existing.dayStartHour == null) {
              const val = co.dayStartHour ?? cityJs.dayStartHour ?? null;
              if (val != null) writes[`cities/${cid}/general/dayStartHour`] = val;
            }
            // nightStartHour: cityOverrides > JS file > default
            if (existing.nightStartHour == null) {
              const val = co.nightStartHour ?? cityJs.nightStartHour ?? null;
              if (val != null) writes[`cities/${cid}/general/nightStartHour`] = val;
            }
            // color: theme.color from JS file
            if (existing.color == null && cityJs.theme?.color) {
              writes[`cities/${cid}/general/color`] = cityJs.theme.color;
            }
            // Clean up cityOverrides dayStartHour/nightStartHour
            if (co.dayStartHour != null) writes[`settings/cityOverrides/${cid}/dayStartHour`] = null;
            if (co.nightStartHour != null) writes[`settings/cityOverrides/${cid}/nightStartHour`] = null;
          });
          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => localStorage.setItem('city_general_migrated_v1225', 'true'))
              .catch(e => console.error('[MIGRATION] city general failed:', e));
          } else {
            localStorage.setItem('city_general_migrated_v1225', 'true');
          }
        });
      }

      // ONE-TIME MIGRATION: Fill missing name/nameEn/icon in cities/{cityId}/general (v3.12.28)
      if (localStorage.getItem('city_general_completed_v1228') !== 'true') {
        const regEntries = Object.entries(window.BKK.cityRegistry || {});
        Promise.all(
          regEntries.map(([regKey, reg]) => database.ref(`cities/${reg.id}/general`).once('value').then(s => ({ regKey, reg, g: s.val() || {} })))
        ).then(results => {
          const writes = {};
          results.forEach(({ regKey, reg, g }) => {
            const cid = reg.id;
            const cityJs = window.BKK.cities[cid] || {};
            // name — use registry nameEn/name as source of truth
            if (!g.name && (reg.name || cityJs.name)) writes[`cities/${cid}/general/name`] = reg.name || cityJs.name;
            if (!g.nameEn && (reg.nameEn || cityJs.nameEn)) writes[`cities/${cid}/general/nameEn`] = reg.nameEn || cityJs.nameEn;
            // icon — from JS file if missing
            if (!g.icon && cityJs.icon && !cityJs.icon.startsWith('data:')) writes[`cities/${cid}/general/icon`] = cityJs.icon;
            // dayStartHour/nightStartHour fallback
            if (g.dayStartHour == null && cityJs.dayStartHour != null) writes[`cities/${cid}/general/dayStartHour`] = cityJs.dayStartHour;
            if (g.nightStartHour == null && cityJs.nightStartHour != null) writes[`cities/${cid}/general/nightStartHour`] = cityJs.nightStartHour;
            // color fallback
            if (!g.color && cityJs.theme?.color) writes[`cities/${cid}/general/color`] = cityJs.theme.color;
          });
          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => { localStorage.setItem('city_general_completed_v1228', 'true'); })
              .catch(e => console.error('[MIGRATION] city general complete failed:', e));
          } else {
            localStorage.setItem('city_general_completed_v1228', 'true');
          }
        });
      }

      // ONE-TIME CLEANUP: Remove stale IDs from cityHiddenInterests (v3.12.4)
      // Removes interest IDs that no longer exist in customInterests
      if (localStorage.getItem('cityHidden_cleaned_v124') !== 'true') {
        Promise.all([
          database.ref('customInterests').once('value'),
          database.ref('settings/cityHiddenInterests').once('value')
        ]).then(([ciSnap, hiddenSnap]) => {
          const validIds = new Set(
            Object.values(ciSnap.val() || {}).map(v => v.id || '').filter(Boolean)
          );
          const hidden = hiddenSnap.val() || {};
          const writes = {};
          Object.entries(hidden).forEach(([cityId, arr]) => {
            if (!Array.isArray(arr)) return;
            const filtered = arr.filter(id => validIds.has(id));
            if (filtered.length !== arr.length) {
              writes[`settings/cityHiddenInterests/${cityId}`] = filtered.length > 0 ? filtered : null;
            }
          });
          if (Object.keys(writes).length > 0) {
            database.ref().update(writes)
              .then(() => localStorage.setItem('cityHidden_cleaned_v124', 'true'))
              .catch(e => console.error('[CLEANUP] cityHiddenInterests failed:', e));
          } else {
            localStorage.setItem('cityHidden_cleaned_v124', 'true');
          }
        });
      }
    }
  }, []);

  // Load user display names for addedBy resolution
  useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    database.ref('users').once('value').then(snap => {
      const data = snap.val();
      if (data) {
        const map = {};
        for (const [uid, profile] of Object.entries(data)) {
          map[uid] = profile.name || profile.email?.split('@')[0] || uid.slice(0, 8);
        }
        setUserNamesMap(map);
      }
    }).catch(() => {});
  }, [isFirebaseAvailable, database]);

  // One-time mapsUrl repair: fix missing/coords-only mapsUrl for saved favorites
  const mapsUrlRepairDone = React.useRef(new Set());
  useEffect(() => {
    if (locationsLoading || !selectedCityId || mapsUrlRepairDone.current.has(selectedCityId)) return;
    if (!customLocations || customLocations.length === 0) return;
    mapsUrlRepairDone.current.add(selectedCityId);
    
    const coordsOnlyPattern = /\?q=\d+\.\d+,\d+\.\d+$|&query=\d+\.\d+,\d+\.\d+$/;
    const isValidGPID = (pid) => pid && typeof pid === 'string' && /^(ChIJ|EiI|GhIJ)/.test(pid);
    const updates = [];
    const placeIdFixes = {};
    
    // Clean up bad googlePlaceId values (Firebase keys mistakenly promoted)
    customLocations.forEach(loc => {
      if (loc.googlePlaceId && !isValidGPID(loc.googlePlaceId) && loc.firebaseId) {
        placeIdFixes[`cities/${selectedCityId}/locations/${loc.firebaseId}/googlePlaceId`] = null;
      }
    });
    if (Object.keys(placeIdFixes).length > 0 && isFirebaseAvailable && database) {
      console.log(`[REPAIR] Clearing ${Object.keys(placeIdFixes).length} bad googlePlaceId values`);
      database.ref().update(placeIdFixes).catch(e => console.error('[REPAIR] googlePlaceId cleanup failed:', e));
      // Also fix in memory
      setCustomLocations(prev => prev.map(loc => 
        loc.googlePlaceId && !isValidGPID(loc.googlePlaceId) ? { ...loc, googlePlaceId: null } : loc
      ));
    }
    
    customLocations.forEach(loc => {
      const hasValidPlaceId = isValidGPID(loc.googlePlaceId) || isValidGPID(loc.placeId);
      const isCoordOnly = !hasValidPlaceId && !loc.address;
      const currentUrl = loc.mapsUrl || '';
      
      // For ALL places: if URL is broken/shortened → always fix (or clear for coord-only)
      const isBroken = currentUrl && (
        currentUrl.includes('maps.app.goo.gl') ||
        currentUrl.includes('goo.gl/') ||
        currentUrl.includes('app.goo.gl') ||
        (!currentUrl.includes('google.com/maps') && currentUrl.length > 0 && currentUrl !== '#')
      );

      if (isCoordOnly) {
        // Coord-only places: clear broken URLs (can't build better), keep coord-only URLs
        if (isBroken || (currentUrl && currentUrl.includes('query=') && !currentUrl.match(/query=\d+\.\d+,\d+\.\d+/))) {
          updates.push({ firebaseId: loc.firebaseId, name: loc.name, oldUrl: currentUrl, newUrl: '' });
        }
        return; // coord-only: no further processing
      }

      const needsFix = !currentUrl ||
        currentUrl === '#' ||
        coordsOnlyPattern.test(currentUrl) ||
        isBroken;
      
      if (!needsFix) return;
      
      const newUrl = window.BKK.getGoogleMapsUrl(loc);
      if (newUrl && newUrl !== '#' && newUrl !== currentUrl) {
        updates.push({ firebaseId: loc.firebaseId, name: loc.name, oldUrl: currentUrl, newUrl });
      }
    });
    
    if (updates.length === 0) return;
    
    console.log(`[REPAIR] Fixing mapsUrl for ${updates.length} locations in ${selectedCityId}`);
    
    if (isFirebaseAvailable && database) {
      const batch = {};
      updates.forEach(u => {
        if (u.firebaseId) {
          batch[`cities/${selectedCityId}/locations/${u.firebaseId}/mapsUrl`] = u.newUrl;
        }
      });
      database.ref().update(batch)
        .then(() => console.log(`[REPAIR] Updated ${updates.length} mapsUrl entries`))
        .catch(e => console.error('[REPAIR] mapsUrl batch update failed:', e));
    } else {
      const updated = customLocations.map(loc => {
        const fix = updates.find(u => u.name === loc.name);
        return fix ? { ...loc, mapsUrl: fix.newUrl } : loc;
      });
      setCustomLocations(updated);
    }
  }, [customLocations, locationsLoading, selectedCityId]);

  // One-time migration: fix stale outsideArea flags and wrong default areas
  const areaRepairDone = React.useRef(new Set());
  useEffect(() => {
    const repairKey = selectedCityId + '_v2'; // v2: closest area for outside places
    if (locationsLoading || !selectedCityId || areaRepairDone.current.has(repairKey)) return;
    if (!customLocations.length) return;
    areaRepairDone.current.add(repairKey);
    
    const updates = [];
    for (const loc of customLocations) {
      if (!loc.lat || !loc.lng) continue;
      const detected = window.BKK.getAreasForCoordinates(loc.lat, loc.lng);
      const currentAreas = loc.areas || (loc.area ? [loc.area] : []);
      
      if (detected.length > 0) {
        // Auto-detect found areas — update if different
        const areasMatch = detected.length === currentAreas.length && detected.every(a => currentAreas.includes(a));
        if (!areasMatch || loc.outsideArea) {
          updates.push({ id: loc.id, firebaseId: loc.firebaseId, areas: detected, area: detected[0], outsideArea: false });
        }
      } else {
        // Outside all areas — assign closest area and mark outsideArea
        const closest = window.BKK.getClosestArea(loc.lat, loc.lng);
        if (closest && (currentAreas[0] !== closest || !loc.outsideArea)) {
          updates.push({ id: loc.id, firebaseId: loc.firebaseId, areas: [closest], area: closest, outsideArea: true });
        }
      }
    }
    
    if (updates.length > 0) {
      console.log(`[AREA-REPAIR] Fixing areas for ${updates.length} locations in ${selectedCityId}`);
      if (isFirebaseAvailable && database) {
        const batch = {};
        updates.forEach(u => {
          if (u.firebaseId) {
            batch[`cities/${selectedCityId}/locations/${u.firebaseId}/areas`] = u.areas;
            batch[`cities/${selectedCityId}/locations/${u.firebaseId}/area`] = u.area;
            batch[`cities/${selectedCityId}/locations/${u.firebaseId}/outsideArea`] = u.outsideArea;
          }
        });
        if (Object.keys(batch).length > 0) {
          database.ref().update(batch).then(() => {
            console.log(`[AREA-REPAIR] Fixed ${updates.length} locations in Firebase`);
          }).catch(e => console.error('[AREA-REPAIR] Firebase error:', e));
        }
      } else {
        const updated = customLocations.map(loc => {
          const fix = updates.find(u => u.id === loc.id);
          return fix ? { ...loc, areas: fix.areas, area: fix.area, outsideArea: fix.outsideArea } : loc;
        });
        setCustomLocations(updated);
        }
    }
  }, [customLocations, locationsLoading, selectedCityId]);
  useEffect(() => {
    if (!selectedCityId) return;
    
    if (isFirebaseAvailable && database) {
      const routesRef = database.ref(`cities/${selectedCityId}/routes`);
      
      const onValue = routesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const routesArray = Object.keys(data).map(key => ({
            ...data[key],
            firebaseId: key
          }));
          setSavedRoutes(routesArray);
          console.log('[FIREBASE] Loaded', routesArray.length, 'saved routes for', selectedCityId);
        } else {
          setSavedRoutes([]);
        }
        markLoaded('routes');
      });
      
      return () => routesRef.off('value', onValue);
    } else {
      setSavedRoutes([]);
      markLoaded('routes');
    }
  }, [selectedCityId]);

  // Fullscreen map — init when opened, destroy when closed
  // MUST be at component level (not inside JSX) to comply with Rules of Hooks
  useEffect(() => {
    if (!showMapFullscreen) return;
    let timer;
    timer = setTimeout(() => {
      const container = document.getElementById('settings-fullscreen-map');
      if (!container || !window.L) return;
      try { if (window._settingsMap) { window._settingsMap.off(); window._settingsMap.remove(); window._settingsMap = null; } } catch(e) {}
      container.innerHTML = '';
      delete container._leaflet_id;
      const city = window.BKK.selectedCity;
      if (!city) return;
      const coords = window.BKK.areaCoordinates || {};
      const areas = city.areas || [];
      const cityCenter = city.center || { lat: 0, lng: 0 };
      const map = window.L.map(container).setView([cityCenter.lat, cityCenter.lng], 12);
      window.L.tileLayer(window.BKK.getTileUrl(), { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
      const colorPalette = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1', '#8b5cf6', '#06b6d4', '#f97316', '#a855f7', '#14b8a6', '#e11d48', '#84cc16', '#0ea5e9', '#d946ef', '#f43f5e'];
      const allCircles = [];
      mapMarkersRef.current = [];
      areas.forEach((area, i) => {
        const c = coords[area.id];
        if (!c) return;
        const color = colorPalette[i % colorPalette.length];
        const circle = window.L.circle([c.lat, c.lng], { radius: c.radius, color, fillColor: color, fillOpacity: 0.15, weight: 2 }).addTo(map);
        allCircles.push(circle);
        const marker = window.L.marker([c.lat, c.lng], { draggable: false, title: area.label || area.id }).addTo(map);
        marker.bindTooltip(area.label || area.id, { permanent: true, direction: 'top', className: 'area-label-tooltip', offset: [0, -10] });
        marker._areaId = area.id; marker._circle = circle; marker._area = area; marker._coords = c;
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newLat = Math.round(pos.lat * 10000) / 10000;
          const newLng = Math.round(pos.lng * 10000) / 10000;
          area.lat = newLat; area.lng = newLng; c.lat = newLat; c.lng = newLng;
          circle.setLatLng(pos);
        });
        mapMarkersRef.current.push(marker);
      });
      if (allCircles.length > 0) {
        const group = window.L.featureGroup(allCircles);
        map.fitBounds(group.getBounds().pad(0.1));
      }
      window._settingsMap = map;
      setTimeout(() => {
        map.invalidateSize();
        mapOriginalPositions.current = {};
        mapMarkersRef.current.forEach(m => {
          const ll = m.getLatLng();
          mapOriginalPositions.current[m._areaId] = { lat: ll.lat, lng: ll.lng, radius: m._circle?.getRadius() || 0 };
          m.dragging.enable();
        });
        setMapEditMode(true);
      }, 300);
    }, 50);
    return () => {
      clearTimeout(timer);
      try { if (window._settingsMap) { window._settingsMap.off(); window._settingsMap.remove(); window._settingsMap = null; } } catch(e) {}
      mapMarkersRef.current = [];
    };
  }, [showMapFullscreen]);

  // Load custom locations from Firebase - PER CITY
  useEffect(() => {
    if (!selectedCityId) return;
    setLocationsLoading(true);
    
    if (isFirebaseAvailable && database) {
      console.log('[DATA] Loading locations for city:', selectedCityId);
      const locationsRef = database.ref(`cities/${selectedCityId}/locations`);
      
      let lastSnapshotTs = 0; // guard against double-fire within same 50ms window
      const onValue = locationsRef.on('value', (snapshot) => {
        // Deduplicate: Firebase sometimes fires twice rapidly — ignore if within 50ms
        const now = Date.now();
        if (now - lastSnapshotTs < 50) return;
        lastSnapshotTs = now;
        const data = snapshot.val();
        if (data) {
          const locationsArray = Object.keys(data).map(key => {
            const loc = { ...data[key], firebaseId: key, cityId: selectedCityId };
            // Ensure name is always a string — Firebase may have null/missing name
            if (!loc.name || typeof loc.name !== 'string') loc.name = `(no name) ${key.slice(-4)}`;
            // Sanitize: fix address if it's an object (import bug)
            if (loc.address && typeof loc.address === 'object') {
              if (loc.address.lat && !loc.lat) { loc.lat = loc.address.lat; loc.lng = loc.address.lng; }
              delete loc.address;
            }
            // Sanitize: use placeId as googlePlaceId only if it looks like a real Google Place ID
            if (loc.placeId && !loc.googlePlaceId && /^(ChIJ|EiI|GhIJ)/.test(loc.placeId)) loc.googlePlaceId = loc.placeId;
            // Only clear stale outsideArea if coords now match an area. Never set it here.
            if (loc.outsideArea && loc.lat && loc.lng && window.BKK.getAreasForCoordinates) {
              const detected = window.BKK.getAreasForCoordinates(loc.lat, loc.lng);
              if (detected.length > 0) loc.outsideArea = false;
            }
            return loc;
          });
          setCustomLocations(locationsArray);
          console.log('[FIREBASE] Loaded', locationsArray.length, 'locations for', selectedCityId);
          // Load review averages for all custom locations
          const allNames = locationsArray.filter(l => l.status !== 'blacklist').map(l => l.name);
          // Warn about locations with missing name (data integrity issue)
          const nameless = locationsArray.filter(l => l.name?.startsWith('(no name)'));
          if (nameless.length > 0) {
            console.warn('[DATA] Locations with missing name:', nameless.map(l => l.firebaseId));
          }
          if (allNames.length > 0) loadReviewRatings(selectedCityId);
        } else {
          setCustomLocations([]);
        }
        setLocationsLoading(false);
        markLoaded('locations');
      });
      
      // Load city general data (icon/iconLeft/iconRight/name/color/hours) from Firebase
      database.ref(`cities/${selectedCityId}/general`).once('value').then(s => {
        const g = s.val();
        addDebugLog('firebase', `[CITY-LOAD] cities/${selectedCityId}/general`, { hasData: !!g, icon: g?.icon?.substring(0,20) });
        if (!window.BKK.cities[selectedCityId] || !g) return;
        const city = window.BKK.cities[selectedCityId];
        const regKey = Object.keys(window.BKK.cityRegistry || {}).find(k => window.BKK.cityRegistry[k].id === selectedCityId) || selectedCityId;
        if (g.icon) { city.icon = g.icon; if (window.BKK.cityRegistry[regKey]) window.BKK.cityRegistry[regKey].icon = g.icon; }
        if (g.iconLeft) { if (!city.theme) city.theme = {}; city.theme.iconLeft = g.iconLeft; }
        if (g.iconRight) { if (!city.theme) city.theme = {}; city.theme.iconRight = g.iconRight; }
        if (g.color) { if (!city.theme) city.theme = {}; city.theme.color = g.color; }
        if (g.name) city.name = g.name;
        if (g.nameEn) city.nameEn = g.nameEn;
        if (g.dayStartHour != null) { city.dayStartHour = g.dayStartHour; window.BKK.dayStartHour = g.dayStartHour; }
        if (g.nightStartHour != null) { city.nightStartHour = g.nightStartHour; window.BKK.nightStartHour = g.nightStartHour; }
        if (g.boundaryFactor != null) city.boundaryFactor = g.boundaryFactor;
        addDebugLog('firebase', `[CITY-LOAD] Applied`, { cityIcon: city.icon?.substring(0,20), sameRef: city === window.BKK.selectedCity });
        setCityEditCounter(c => c + 1);
      }).catch(() => {});

      return () => locationsRef.off('value', onValue);
    } else {
      setCustomLocations([]);
      setLocationsLoading(false);
      markLoaded('locations');
    }
  }, [selectedCityId]);

  // Load custom interests from Firebase
  const recentlyAddedRef = React.useRef(new Map()); // id → timestamp of recent local adds
  const interestsInitialLoadDone = React.useRef(false); // prevents double markLoaded after Promise.all
  useEffect(() => {
    if (isFirebaseAvailable && database) {
      const interestsRef = database.ref('customInterests');
      // All interests now live in customInterests — no builtInIds filter needed
      
      const unsubscribe = interestsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const interestsArray = Object.keys(data).map(key => ({
            ...data[key],
            firebaseId: key
          }));
          
          // Merge: keep locally-added interests that Firebase doesn't know about yet (race condition protection)
          const firebaseIds = new Set(interestsArray.map(i => i.id));
          const now = Date.now();
          // Clean up stale entries (older than 30 seconds)
          for (const [id, ts] of recentlyAddedRef.current) {
            if (now - ts > 30000) recentlyAddedRef.current.delete(id);
          }
          setCustomInterests(prev => {
            // Detect disappearances
            const prevIds = new Set(prev.map(i => i.id));
            const disappeared = prev.filter(i => !firebaseIds.has(i.id) && !recentlyAddedRef.current.has(i.id));
            if (disappeared.length > 0 && prev.length > 0) {
              console.warn('[FIREBASE] ⚠️ INTERESTS DISAPPEARED:', disappeared.map(i => `${i.id}:"${i.label}"`).join(', '));
              console.warn('[FIREBASE] Previous count:', prev.length, '→ Firebase count:', interestsArray.length);
            }
            // Find locally-added interests not yet in Firebase (added within last 30s)
            const pendingLocal = prev.filter(i => 
              !firebaseIds.has(i.id) && recentlyAddedRef.current.has(i.id)
            );
            if (pendingLocal.length > 0) {
              console.log('[FIREBASE] Keeping', pendingLocal.length, 'pending local interests:', pendingLocal.map(i => i.label).join(', '));
            }
            const result = [...interestsArray, ...pendingLocal];
            // Cache for instant next-load render
            try { localStorage.setItem('foufou_custom_interests', JSON.stringify(result)); } catch(e) {}
            return result;
          });
          console.log('[FIREBASE] Loaded', interestsArray.length, 'interests from Firebase');
        } else {
          // snapshot is null = no customInterests in Firebase at all
          // Only keep local state if we have never successfully loaded from Firebase
          // (connection issue on startup). If we have loaded before, null means empty = correct.
          setCustomInterests(prev => {
            if (prev.length > 0 && !interestsInitialLoadDone.current) {
              console.warn('[FIREBASE] customInterests returned null before initial load — keeping local');
              return prev;
            }
            return [];
          });
        }
        if (!interestsInitialLoadDone.current) {
          interestsInitialLoadDone.current = true;
          markLoaded('interests');
        }
      });
      
      return () => interestsRef.off('value', unsubscribe);
    } else {
      markLoaded('interests');
    }
  }, []);

  // Load interest search configurations from Firebase
  useEffect(() => {
    
    if (isFirebaseAvailable && database) {
      const configRef = database.ref('settings/interestConfig');
      
      // Load interestGroups in parallel so markLoaded fires with groups already set
      Promise.all([
        configRef.once('value'),
        database.ref('settings/interestGroups').once('value')
      ]).then(([snapshot, groupsSnap]) => {
        // Apply interestGroups immediately — before markLoaded
        const groups = groupsSnap.val();
        if (groups) {
          setInterestGroups(groups);
          try { localStorage.setItem('foufou_interest_groups', JSON.stringify(groups)); } catch(e) {}
        }
        const data = snapshot.val();
        if (data) {
          // Deep merge: for each interest, use Firebase config but fall back to default blacklist if empty
          const merged = { ...defaultConfig };
          for (const [key, val] of Object.entries(data)) {
            if (merged[key]) {
              merged[key] = { ...merged[key], ...val };
              // If Firebase has empty blacklist but default has values, keep default
              if ((!val.blacklist || val.blacklist.length === 0) && defaultConfig[key]?.blacklist?.length > 0) {
                merged[key].blacklist = defaultConfig[key].blacklist;
              }
            } else {
              merged[key] = val;
            }
          }
          setInterestConfig(merged);
          try { localStorage.setItem('foufou_interest_config', JSON.stringify(merged)); } catch(e) {}
          console.log('[FIREBASE] Loaded interest config (deep merge)');
        } else {
          // Save defaults to Firebase
          configRef.set(defaultConfig);
          setInterestConfig(defaultConfig);
          console.log('[FIREBASE] Saved default interest config');
        }
        // Guard: Promise.all handles initial load, don't double-markLoaded
        if (!dataLoadTracker.current.config) markLoaded('config');
      });
      
      // Listen for real-time changes after initial load
      configRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const merged = { ...defaultConfig };
          for (const [key, val] of Object.entries(data)) {
            if (merged[key]) {
              merged[key] = { ...merged[key], ...val };
              if ((!val.blacklist || val.blacklist.length === 0) && defaultConfig[key]?.blacklist?.length > 0) {
                merged[key].blacklist = defaultConfig[key].blacklist;
              }
            } else {
              merged[key] = val;
            }
          }
          setInterestConfig(merged);
        }
      });
    } else {
      setInterestConfig(defaultConfig);
      markLoaded('config');
    }
  }, []);

  // Load cityHiddenInterests — per-city interest visibility set by admin
  useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    const ref = database.ref('settings/cityHiddenInterests');
    ref.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      // Convert arrays to Sets for fast lookup
      const sets = {};
      Object.entries(data).forEach(([cityId, arr]) => {
        sets[cityId] = new Set(Array.isArray(arr) ? arr : Object.keys(arr));
      });
      setCityHiddenInterests(sets);
    });
    return () => ref.off();
  }, []);
  // interestCounters: computed on-the-fly from customLocations — no longer persisted to Firebase

  // Load interest active/inactive status (per-user with admin defaults)
  useEffect(() => {
    // Hard-coded defaults: all built-in interests default to active
    // noGoogleSearch interests are also active by default (opt-out model, same as regular)
    const builtInIds = interestOptions.map(i => i.id);
    
    const hardDefaults = {};
    builtInIds.forEach(id => { hardDefaults[id] = true; });
    
    // Helper: compute defaults from interestConfig defaultEnabled flags
    const computeDefaults = (icfg, legacyStatus) => {
      const defaults = { ...hardDefaults };
      // If interestConfig has any defaultEnabled flags, use them
      const hasDefaultFlags = Object.values(icfg || {}).some(c => c?.defaultEnabled !== undefined);
      if (hasDefaultFlags) {
        Object.entries(icfg).forEach(([id, cfg]) => {
          if (cfg?.defaultEnabled !== undefined) defaults[id] = cfg.defaultEnabled;
        });
      } else if (legacyStatus) {
        // Legacy fallback: use settings/interestStatus
        Object.assign(defaults, legacyStatus);
      }
      return defaults;
    };
    
    if (isFirebaseAvailable && database) {
      const configRef = database.ref('settings/interestConfig');
      const legacyStatusRef = database.ref('settings/interestStatus');
      // Anonymous users: load global config/defaults only — no personal Firebase data
      const isAnon = authUser?.isAnonymous || !authUser?.uid;
      const userStatusRef = isAnon ? null : database.ref(`users/${authUser.uid}/interestStatus`);
      
      // Load interestConfig + user status together
      // customInterests are loaded by the real-time listener above (no duplicate load needed)
      Promise.all([
        configRef.once('value'),
        legacyStatusRef.once('value'),
        userStatusRef ? userStatusRef.once('value') : Promise.resolve(null),
      ]).then(([configSnap, legacySnap, userSnap]) => {
        const icfg = configSnap.val() || {};
        const legacyStatus = legacySnap.val();
        const userData = userSnap?.val();
        
        const defaults = computeDefaults(icfg, legacyStatus);
        if (userData) {
          const merged = { ...defaults, ...userData };
          setInterestStatus(merged);
          try { localStorage.setItem('foufou_interest_status', JSON.stringify(merged)); } catch(e) {}
        } else {
          setInterestStatus(defaults);
          try { localStorage.setItem('foufou_interest_status', JSON.stringify(defaults)); } catch(e) {}
        }

        setInterestConfig(prev => {
          const merged = { ...defaultConfig };
          for (const [key, val] of Object.entries(icfg)) {
            if (merged[key]) {
              merged[key] = { ...merged[key], ...val };
              if ((!val.blacklist || val.blacklist.length === 0) && defaultConfig[key]?.blacklist?.length > 0) {
                merged[key].blacklist = defaultConfig[key].blacklist;
              }
            } else {
              merged[key] = val;
            }
          }
          return merged;
        });

        markLoaded('config');
        markLoaded('status');
        // 'interests' is marked loaded by the real-time listener
      }).catch(err => {
        console.error('[FIREBASE] Error loading config/status:', err);
        setInterestStatus(hardDefaults);
        setInterestConfig(defaultConfig);
        markLoaded('config');
        markLoaded('status');
      });
    } else {
      setInterestStatus({});
      markLoaded('status');
    }
  }, []);

  // ============================================================
  // Refresh All Data - Manual reload from Firebase & localStorage
  // ============================================================
  const refreshAllData = async () => {
    setIsRefreshing(true);
    console.log('[REFRESH] Starting full data refresh...');
    
    try {
      // 1. Saved Routes
      if (isFirebaseAvailable && database) {
        try {
          const routeSnap = await database.ref(`cities/${selectedCityId}/routes`).once('value');
          const routeData = routeSnap.val();
          if (routeData) {
            const routesArray = Object.keys(routeData).map(key => ({
              ...routeData[key],
              firebaseId: key
            }));
            setSavedRoutes(routesArray);
            console.log('[REFRESH] Loaded', routesArray.length, 'saved routes from Firebase');
          } else {
            setSavedRoutes([]);
          }
        } catch (e) {
          console.error('[REFRESH] Error loading saved routes:', e);
        }
      } else {
        setSavedRoutes([]);
      }
      
      if (isFirebaseAvailable && database) {
        // 2. Custom Locations
        try {
          const locSnap = await database.ref(`cities/${selectedCityId}/locations`).once('value');
          const locData = locSnap.val();
          if (locData) {
            const locationsArray = Object.keys(locData).map(key => ({
              ...locData[key],
              firebaseId: key,
              cityId: selectedCityId
            }));
            setCustomLocations(locationsArray);
            console.log('[REFRESH] Loaded', locationsArray.length, 'locations');
          } else {
            setCustomLocations([]);
          }
        } catch (e) {
          console.error('[REFRESH] Error loading locations:', e);
        }
        
        // 3. Custom Interests
        try {
          const intSnap = await database.ref('customInterests').once('value');
          const intData = intSnap.val();
          if (intData) {
            // All interests are in customInterests — no builtInIds filter needed
            const interestsArray = Object.keys(intData).map(key => ({
              ...intData[key],
              firebaseId: key
            }));
            setCustomInterests(interestsArray);
            console.log('[REFRESH] Loaded', interestsArray.length, 'interests');
          } else {
            // Don't wipe if we already have interests locally
            setCustomInterests(prev => {
              if (prev.length > 0) {
                console.warn('[REFRESH] customInterests returned null but we have', prev.length, 'locally — keeping');
                return prev;
              }
              return [];
            });
          }
        } catch (e) {
          console.error('[REFRESH] Error loading interests:', e);
        }
        
        // 4-7. All settings in single read
        try {
          const settingsSnap = await database.ref('settings').once('value');
          const s = settingsSnap.val() || {};
          
          // Interest Config
          if (s.interestConfig) {
            setInterestConfig(prev => ({ ...prev, ...s.interestConfig }));
          }
          
          // Interest Status — compute defaults from interestConfig.defaultEnabled flags
          {
            const builtInIds = interestOptions.map(i => i.id);
            const uncoveredIds = []; // uncoveredInterests removed — folded into interests
            const icfg = s.interestConfig || {};
            const defaultStatus = {};
            builtInIds.forEach(id => { 
              defaultStatus[id] = icfg[id]?.defaultEnabled !== undefined ? icfg[id].defaultEnabled : true; 
            });
            uncoveredIds.forEach(id => { 
              defaultStatus[id] = icfg[id]?.defaultEnabled !== undefined ? icfg[id].defaultEnabled : false; 
            });
            // Legacy fallback: if settings/interestStatus exists and no defaultEnabled flags, use it
            if (s.interestStatus && !Object.values(icfg).some(c => c?.defaultEnabled !== undefined)) {
              Object.assign(defaultStatus, s.interestStatus);
            }
            // Merge: defaults as base, preserve user choices on top
            setInterestStatus(prev => {
              if (!prev || Object.keys(prev).length === 0) return defaultStatus;
              return { ...defaultStatus, ...prev };
            });
          }
          
          // Legacy admin data (kept for reference, auth is now Firebase Auth)
          setAdminPassword(s.adminPassword || '');
          const usersData = s.adminUsers || {};
          const usersList = Object.entries(usersData).map(([oderId, data]) => ({ oderId, ...data }));
          setAdminUsers(usersList);
          // Role is now determined by Firebase Auth → users/{uid}/role
          
          // App settings
          if (s.googleMaxWaypoints != null) setGoogleMaxWaypoints(s.googleMaxWaypoints);
          const updates = {};
          if (s.maxStops != null) updates.maxStops = s.maxStops;
          if (s.fetchMoreCount != null) updates.fetchMoreCount = s.fetchMoreCount;
          if (s.defaultRadius != null) window.BKK._defaultRadius = s.defaultRadius;
          if (Object.keys(updates).length > 0) setFormData(prev => ({...prev, ...updates}));
          
          // City overrides
          if (s.cityOverrides) {
            window.BKK._cityOverrides = s.cityOverrides;
            // cityOverrides retained for migration purposes only — general data now in cities/{cityId}/general
          }
          
          // System params
          if (s.systemParams) {
            const sp = { ...s.systemParams };
            // Firebase stores arrays as {0:..., 1:...} — convert back
            if (sp.filteredBusinessStatuses && !Array.isArray(sp.filteredBusinessStatuses)) {
              sp.filteredBusinessStatuses = Object.values(sp.filteredBusinessStatuses);
            }
            const merged = { ...window.BKK._defaultSystemParams, ...sp };
            window.BKK.systemParams = merged;
            setSystemParams(merged);
            // systemParams overrides (higher priority)
            if (s.systemParams.maxStops != null) updates.maxStops = s.systemParams.maxStops;
            if (s.systemParams.fetchMoreCount != null) updates.fetchMoreCount = s.systemParams.fetchMoreCount;
            if (s.systemParams.googleMaxWaypoints != null) setGoogleMaxWaypoints(s.systemParams.googleMaxWaypoints);
            if (s.systemParams.defaultRadius != null) window.BKK._defaultRadius = s.systemParams.defaultRadius;
            if (Object.keys(updates).length > 0) setFormData(prev => ({...prev, ...updates}));
          }
          
          // Map visual config overrides
          if (s.mapConfig) {
            const mc = window.BKK.mapConfig;
            Object.keys(s.mapConfig).forEach(group => {
              if (mc[group] && typeof s.mapConfig[group] === 'object') {
                Object.assign(mc[group], s.mapConfig[group]);
              }
            });
          }
          if (s.stopColorPalette) window.BKK.stopColorPalette = s.stopColorPalette;
          
          console.log('[REFRESH] All settings loaded (single read)');
        } catch (e) {
          console.error('[REFRESH] Error loading settings:', e);
        }
        
        showToast(t('toast.dataRefreshed'), 'success');
      } else {
        showToast(t('toast.noConnection'), 'warning');
      }
    } catch (error) {
      console.error('[REFRESH] Unexpected error:', error);
      showToast(t('toast.refreshError'), 'error');
    } finally {
      setIsRefreshing(false);
      console.log('[REFRESH] Complete');
    }
  };

  // Save routeType to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('foufou_route_type', routeType);
  }, [routeType]);

  // Access Log System - Track visits
  useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    
    const userId = authUser?.uid || 'anonymous';
    
    // ── CONSOLIDATED settings listener (replaces 8 individual listeners + loadAdminControlledSettings) ──
    const hasSavedPrefs = !!localStorage.getItem('foufou_preferences');
    const settingsRef = database.ref('settings');
    settingsRef.on('value', (snap) => {
      const s = snap.val() || {};
      
      // Legacy admin data (auth is now via Firebase Auth)
      setAdminPassword(s.adminPassword || '');
      const usersData = s.adminUsers || {};
      const usersList = Object.entries(usersData).map(([oderId, data]) => ({ oderId, ...data }));
      setAdminUsers(usersList);
      // Role is now determined by Firebase Auth → users/{uid}/role
      
      // App settings — prefer systemParams, fallback to top-level keys for backward compatibility
      if (s.googleMaxWaypoints != null) setGoogleMaxWaypoints(s.googleMaxWaypoints);
      
      const formUpdates = {};
      if (s.maxStops != null) formUpdates.maxStops = s.maxStops;
      if (s.fetchMoreCount != null) formUpdates.fetchMoreCount = s.fetchMoreCount;
      if (s.defaultRadius != null) {
        window.BKK._defaultRadius = s.defaultRadius;
        if (!hasSavedPrefs) formUpdates.radiusMeters = s.defaultRadius;
      }
      
      // System parameters (algorithm tuning + app settings overrides)
      if (s.systemParams) {
        const merged = { ...window.BKK._defaultSystemParams, ...s.systemParams };
        window.BKK.systemParams = merged;
        setSystemParams(merged);
        // systemParams overrides for app settings (higher priority than top-level)
        if (s.systemParams.maxStops != null) formUpdates.maxStops = s.systemParams.maxStops;
        if (s.systemParams.fetchMoreCount != null) formUpdates.fetchMoreCount = s.systemParams.fetchMoreCount;
        if (s.systemParams.googleMaxWaypoints != null) setGoogleMaxWaypoints(s.systemParams.googleMaxWaypoints);
        if (s.systemParams.defaultRadius != null) {
          window.BKK._defaultRadius = s.systemParams.defaultRadius;
          if (!hasSavedPrefs) formUpdates.radiusMeters = s.systemParams.defaultRadius;
        }
      }
      
      if (Object.keys(formUpdates).length > 0) {
        setFormData(prev => ({...prev, ...formUpdates}));
      }
      if (s.cityOverrides) {
        window.BKK._cityOverrides = s.cityOverrides;
        // cityOverrides retained for migration purposes only — general data now in cities/{cityId}/general
      }
      
      console.log('[FIREBASE] Settings loaded (single listener):', Object.keys(s).filter(k => s[k] != null).join(', '));
      
      // City active states — admin-controlled, synced to all users via Firebase
      // NOTE: cityStates is read from a separate public node, not from settings

      // Interest groups (label names for wizard grouping)
      if (s.interestGroups) {
        setInterestGroups(s.interestGroups);
        try { localStorage.setItem('foufou_interest_groups', JSON.stringify(s.interestGroups)); } catch(e) {}
      }
      // Note: if s.interestGroups is absent from settings, keep existing value (loaded from Promise.all or localStorage)
    });
    
    // Log access stats (aggregated weekly counters by country)
    if (!isAdmin) {
      const lastLogTime = parseInt(localStorage.getItem('foufou_last_log_time') || '0');
      const oneHour = 60 * 60 * 1000;
      
      if (Date.now() - lastLogTime >= oneHour) {
        localStorage.setItem('foufou_last_log_time', Date.now().toString());
        
        // Get ISO week key (e.g. "2026-W08")
        const now = new Date();
        const jan1 = new Date(now.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
        const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        
        // Increment total counter
        database.ref('accessStats/total').transaction(val => (val || 0) + 1);
        
        // Increment weekly unknown first, then update with country
        database.ref(`accessStats/weekly/${weekKey}/unknown`).transaction(val => (val || 0) + 1);
        
        // Geo lookup to get country
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(geo => {
            const cc = geo.country_code || 'unknown';
            if (cc !== 'unknown') {
              // Move count from unknown to actual country
              database.ref(`accessStats/weekly/${weekKey}/unknown`).transaction(val => Math.max((val || 1) - 1, 0));
              database.ref(`accessStats/weekly/${weekKey}/${cc}`).transaction(val => (val || 0) + 1);
            }
          })
          .catch(() => { /* keep as unknown */ });
      }
    }
    return () => settingsRef.off('value');
  }, []);

  // Load aboutContent — public read via settings/aboutContent override rule
  useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    // Read from settings/aboutContent (old path, data lives here)
    // Firebase rule override: settings/aboutContent has .read: true
    const aboutRef = database.ref('settings/aboutContent');
    aboutRef.on('value', (snap) => {
      const data = snap.val();
      if (data) setAboutContent(data);
    });
    return () => aboutRef.off('value');
  }, []);

  // Load city active states from cities/{cityId}/general/active — public readable
  useEffect(() => {
    if (!isFirebaseAvailable || !database) return;
    const cityIds = Object.keys(window.BKK?.cities || {});
    if (!cityIds.length) return;
    const listeners = [];
    cityIds.forEach(cityId => {
      const ref = database.ref(`cities/${cityId}/general/active`);
      const handler = ref.on('value', (snap) => {
        const active = snap.val();
        // null = not set = active by default
        const isActive = active !== false;
        if (window.BKK?.cities?.[cityId]) window.BKK.cities[cityId].active = isActive;
        setCityActiveStates(prev => {
          const next = { ...prev, [cityId]: isActive };
          try { localStorage.setItem('city_active_states', JSON.stringify(next)); } catch(e) {}
          return next;
        });
      });
      listeners.push({ ref, handler });
    });
    return () => listeners.forEach(({ ref, handler }) => ref.off('value', handler));
  }, []);

  const submitFeedback = () => {
    if (!feedbackText.trim()) {
      showToast(t('settings.writeFeedback'), 'warning');
      return;
    }

    const existingEntry = myFeedbackList.length > 0 ? myFeedbackList[0] : null;

    const feedbackEntry = {
      category: feedbackCategory,
      subject: feedbackSubject.trim() || null,
      senderName: feedbackSenderName.trim() || null,
      senderEmail: feedbackSenderEmail.trim() || null,
      text: feedbackText.trim(),
      images: feedbackImages.length > 0 ? feedbackImages : null,
      ...(authUser?.uid ? { userId: authUser.uid, userEmail: authUser.email || '' } : {}),
      currentView: currentView || 'unknown',
      wizardStep: wizardStep || 0,
      cityId: selectedCityId || '',
      timestamp: Date.now(),
      date: new Date().toISOString(),
      resolved: false
    };

    if (isFirebaseAvailable && database) {
      if (existingEntry && existingEntry.firebaseId) {
        // Update existing feedback
        database.ref(`feedback/${existingEntry.firebaseId}`).update(feedbackEntry)
          .then(() => {
            showToast(t('toast.feedbackThanks'), 'success');
            setFeedbackText(''); setFeedbackImages([]); setFeedbackSubject(''); setFeedbackSenderName(''); setFeedbackSenderEmail(''); try { localStorage.removeItem('feedback_draft'); } catch(e) {}
            setFeedbackCategory('general');
            setEditingMyFeedback(false);
            setShowFeedbackDialog(false);
          })
          .catch((err) => {
            showToast(`${t('toast.sendError')}: ${err.message || err}`, 'error');
          });
      } else {
        // New feedback entry
        database.ref('feedback').push(feedbackEntry)
          .then((ref) => {
            showToast(t('toast.feedbackThanks'), 'success');
            setMyFeedbackList(prev => [{ ...feedbackEntry, firebaseId: ref.key }, ...prev].slice(0, 10));
            setFeedbackText(''); setFeedbackImages([]); setFeedbackSubject(''); setFeedbackSenderName(''); setFeedbackSenderEmail(''); try { localStorage.removeItem('feedback_draft'); } catch(e) {}
            setFeedbackCategory('general');
            setEditingMyFeedback(false);
            setShowFeedbackDialog(false);
          })
          .catch((err) => {
            showToast(`${t('toast.sendError')}: ${err.message || err}`, 'error');
          });
      }
    } else {
      showToast(t('toast.firebaseUnavailable'), 'error');
    }
  };

  // Load feedback list - all users see all feedback; non-admin can only delete their own
  const feedbackCountRef = useRef(null);
  useEffect(() => {
    if (!isFirebaseAvailable || !database) return;

    const feedbackRef = database.ref('feedback').orderByChild('timestamp').limitToLast(100);

    const unsubscribe = feedbackRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.keys(data).map(key => ({
          ...data[key],
          firebaseId: key
        })).sort((a, b) => b.timestamp - a.timestamp);
        setFeedbackList(arr);
        if (authUser && authUser.uid) {
          setMyFeedbackList(arr.filter(f => f.userId === authUser.uid));
        }
        if (isCurrentUserAdmin) {
          const prevCount = feedbackCountRef.current;
          if (prevCount !== null && arr.length > prevCount) {
            const newest = arr[0];
            setHasNewFeedback(true);
            showToast(`💬 ${t('settings.newFeedback')}: "${(newest.text || '').slice(0, 40)}${(newest.text || '').length > 40 ? '...' : ''}"`, 'info', 5000);
          }
          feedbackCountRef.current = arr.length;
          if (prevCount === null) {
            const lastSeen = parseInt(localStorage.getItem('foufou_last_seen_feedback') || '0');
            const hasUnseen = arr.some(f => f.timestamp > lastSeen);
            if (hasUnseen) setHasNewFeedback(true);
          }
        }
      } else {
        setFeedbackList([]);
        setMyFeedbackList([]);
        feedbackCountRef.current = 0;
      }
    });

    return () => feedbackRef.off('value', unsubscribe);
  }, [isCurrentUserAdmin]);

    const markFeedbackAsSeen = () => {
    const latest = feedbackList.length > 0 ? feedbackList[0].timestamp : Date.now();
    localStorage.setItem('foufou_last_seen_feedback', latest.toString());
    setHasNewFeedback(false);
  };

  const toggleFeedbackResolved = (feedbackItem) => {
    if (isFirebaseAvailable && database && feedbackItem.firebaseId) {
      database.ref(`feedback/${feedbackItem.firebaseId}`).update({
        resolved: !feedbackItem.resolved
      });
    }
  };

  const deleteFeedback = (feedbackItem) => {
    if (isFirebaseAvailable && database && feedbackItem.firebaseId) {
      database.ref(`feedback/${feedbackItem.firebaseId}`).remove()
        .then(() => {
          showToast(t('toast.feedbackDeleted'), 'success');
          setMyFeedbackList(prev => prev.filter(f => f.firebaseId !== feedbackItem.firebaseId));
        });
    }
  };

  // Config - loaded from config.js, re-read on city change via selectedCityId dependency
  // interestOptions: now sourced from customInterests (Firebase) — city files no longer carry interests
  // cityHiddenInterests still controls per-city visibility
  const hiddenForCity = cityHiddenInterests[selectedCityId] || new Set();
  const interestOptions = (customInterests || []).filter(i => !hiddenForCity.has(i.id));



  const interestToGooglePlaces = window.BKK.interestToGooglePlaces || {};

  // uncoveredInterests removed — folded into interestOptions with noGoogleSearch:true

  const interestTooltips = window.BKK.interestTooltips || {};

  const areaCoordinates = window.BKK.areaCoordinates || {};

  // Switch city function
  const switchCity = (cityId, stayOnView) => {
    if (cityId === selectedCityId) return;
    if (!window.BKK.cities[cityId]) return;
    
    window.BKK.selectCity(cityId);
    window.BKK.logEvent?.('city_selected', { city: cityId });
    // day/night hours and icons loaded from cities/{cityId}/general by useEffect on selectedCityId
    setSelectedCityId(cityId);
    localStorage.setItem('city_explorer_city', cityId);
    setCustomLocations([]); // Clear immediately — Firebase listener for new city will repopulate
    setReviewAverages({}); // Clear ratings — will reload via loadReviewRatings when locations arrive
    
    // Reset form data for new city, but preserve user settings
    // Clear saved interests for all time modes — they belong to the previous city
    try { ['day','night','all'].forEach(m => localStorage.removeItem(`foufou_interests_${m}`)); } catch(e) {}
    const firstArea = window.BKK.areaOptions[0]?.id || '';
    setFormData(prev => ({
      hours: 3, area: firstArea, interests: [], circular: true, startPoint: '',
      maxStops: prev.maxStops || 10, fetchMoreCount: prev.fetchMoreCount || 3, searchMode: 'area',
      radiusMeters: prev.radiusMeters || 500, radiusSource: 'gps', radiusPlaceId: null, radiusPlaceName: '',
      gpsLat: null, gpsLng: null, currentLat: null, currentLng: null
    }));
    setRoute(null);
    setWizardStep(1);
    endActiveTrail(); // End any active trail when starting new wizard
    if (!stayOnView) {
      setCurrentView('form');
      window.scrollTo(0, 0);
    }
    setDisabledStops([]);
    setShowRoutePreview(false);
    setShowRouteMenu(false);
    setManualStops([]);
    setCityModified(false);
    showToast(window.BKK.selectedCity.icon + ' ' + tLabel(window.BKK.selectedCity), 'success');
  };

  const switchLanguage = (lang) => {
    if (lang === currentLang) return;
    window.BKK.i18n.setLang(lang);
    setCurrentLang(lang);
    window.BKK.logEvent?.('language_changed', { lang });
  };
  
  // Utility functions - loaded from utils.js
  const checkLocationInArea = window.BKK.checkLocationInArea;

  // Text Search URL
  const GOOGLE_PLACES_TEXT_SEARCH_URL = window.BKK.GOOGLE_PLACES_TEXT_SEARCH_URL || 'https://places.googleapis.com/v1/places:searchText';

  // Calculate distance between two coordinates in meters (Haversine)
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const r1 = lat1 * Math.PI / 180;
    const r2 = lat2 * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(r1)*Math.cos(r2)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // ── Duplicate Detection: find nearby Google Places + existing custom locations ──
  const [bulkDedupResults, setBulkDedupResults] = useState(null); // [{ loc, matches: [{...loc, _distance}] }]
  const [dedupConfirm, setDedupConfirm] = useState(null); // { type: 'google'|'custom', loc, match, closeAfter }
  
  const findNearbyDuplicates = async (lat, lng, interests) => {
    if (!lat || !lng || !interests?.length) return null;
    const radius = sp.dedupRadiusMeters || 50;
    const results = { google: [], custom: [], lat, lng, interests };
    addDebugLog('DEDUP', `[DEDUP] Start — lat:${lat?.toFixed(5)} lng:${lng?.toFixed(5)} radius:${radius}m interests:[${interests.join(', ')}]`);
    
    // Expand interests with dedupRelated (ONE level only, bidirectional)
    const expandedInterests = new Set(interests);
    for (const opt of allInterestOptions) {
      const related = interestConfig[opt.id]?.dedupRelated || opt.dedupRelated || [];
      // If this interest is in our ORIGINAL list, add its direct related
      if (interests.includes(opt.id)) {
        related.forEach(r => expandedInterests.add(r));
      }
      // If this interest lists one of our ORIGINAL interests as related (reverse link)
      if (related.some(r => interests.includes(r))) {
        expandedInterests.add(opt.id);
      }
    }
    
    // 1. Check existing custom locations (expanded interest + within radius)
    if (sp.dedupCustomEnabled) {
      for (const loc of customLocations) {
        if (!loc.lat || !loc.lng) continue;
        const dist = calcDistance(lat, lng, loc.lat, loc.lng);
        if (dist <= radius) {
          const sharedInterest = loc.interests?.some(i => expandedInterests.has(i));
          if (sharedInterest) {
            results.custom.push({ ...loc, _distance: Math.round(dist) });
          }
        }
      }
    }
    
    // 2. Google Places Search — two strategies: Nearby (types) + Text Search (textSearch)
    if (sp.dedupGoogleEnabled && GOOGLE_PLACES_API_KEY) {
      try {
        const interestToGP = window.BKK.interestToGooglePlaces || {};
        const googleTypes = [];
        const textQueries = [];
        const blacklistWords = [];
        for (const interest of expandedInterests) {
          // Read types: first from interestConfig (custom interests), then from interestToGooglePlaces (builtin)
          const cfg = interestConfig[interest];
          const cfgTypes = cfg?.types;
          if (Array.isArray(cfgTypes) && cfgTypes.length > 0) {
            googleTypes.push(...cfgTypes);
          } else if (typeof cfgTypes === 'string' && cfgTypes.trim()) {
            googleTypes.push(...cfgTypes.split(',').map(t => t.trim()).filter(t => t));
          } else {
            const builtinTypes = interestToGP[interest];
            if (builtinTypes) googleTypes.push(...builtinTypes);
          }
          if (cfg?.textSearch) textQueries.push(cfg.textSearch);
          if (cfg?.blacklist) {
            blacklistWords.push(...cfg.blacklist.map(w => w.toLowerCase()));
          }
          const ci = interestMap[interest];
          if (ci?.baseCategory && interestConfig[ci.baseCategory]?.blacklist) {
            blacklistWords.push(...interestConfig[ci.baseCategory].blacklist.map(w => w.toLowerCase()));
          }
        }
        const uniqueTypes = [...new Set(googleTypes)].slice(0, 5);
        const uniqueTextQueries = [...new Set(textQueries)];
        const uniqueBlacklist = [...new Set(blacklistWords)];
        const searchRadius = Math.max(radius, 50);
        const fieldMask = 'places.displayName,places.location,places.formattedAddress,places.rating,places.userRatingCount,places.id,places.types,places.googleMapsUri';

        const mapPlace = (p) => ({
          name: p.displayName?.text || '',
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          address: p.formattedAddress || '',
          rating: p.rating || 0,
          ratingCount: p.userRatingCount || 0,
          googlePlaceId: p.id,
          mapsUrl: p.googleMapsUri || '',
          types: p.types || [],
          _distance: Math.round(calcDistance(lat, lng, p.location?.latitude || 0, p.location?.longitude || 0))
        });
        const applyBlacklist = (places) => uniqueBlacklist.length === 0 ? places :
          places.filter(p => !uniqueBlacklist.some(w => (p.displayName?.text || '').toLowerCase().includes(w)));

        // 2a. Nearby Search for type-based interests
        if (uniqueTypes.length > 0) {
          const nearbyBody = { locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: searchRadius } }, includedTypes: uniqueTypes, maxResultCount: 5 };
          addDebugLog('DEDUP', `[DEDUP] Nearby Search → types: [${uniqueTypes.join(', ')}] radius: ${searchRadius}m`, { body: nearbyBody });
          const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': fieldMask },
            body: JSON.stringify(nearbyBody)
          });
          if (response.ok) {
            const data = await response.json();
            const all = data.places || [];
            const afterBlacklist = applyBlacklist(all);
            const kept = afterBlacklist.map(mapPlace);
            const filtered = all.filter(p => !afterBlacklist.includes(p));
            addDebugLog('DEDUP', `[DEDUP] Nearby → ${all.length} from Google, ${filtered.length} blacklisted, ${kept.length} kept`, {
              kept: kept.map(p => `✅ ${p.name} ${p._distance}m ⭐${p.rating}`),
              blacklisted: filtered.map(p => `❌ ${p.displayName?.text}`)
            });
            results.google.push(...kept);
          }
        }

        // 2b. Text Search for text-based interests (parallel)
        if (uniqueTextQueries.length > 0) {
          await Promise.all(uniqueTextQueries.map(async (query) => {
            const textBody = { textQuery: query, locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: searchRadius } }, maxResultCount: 5 };
            addDebugLog('DEDUP', `[DEDUP] Text Search → query: "${query}" radius: ${searchRadius}m`, { body: textBody });
            const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': fieldMask },
              body: JSON.stringify(textBody)
            });
            if (response.ok) {
              const data = await response.json();
              const all = data.places || [];
              const afterBlacklist = applyBlacklist(all).map(mapPlace);
              const nearby = afterBlacklist.filter(p => p._distance <= radius);
              const tooFar = afterBlacklist.filter(p => p._distance > radius);
              addDebugLog('DEDUP', `[DEDUP] Text "${query}" → ${all.length} from Google, ${nearby.length} within ${radius}m, ${tooFar.length} too far`, {
                kept: nearby.map(p => `✅ ${p.name} ${p._distance}m ⭐${p.rating}`),
                tooFar: tooFar.map(p => `📏 ${p.name} ${p._distance}m`)
              });
              results.google.push(...nearby);
            }
          }));
          // Deduplicate by googlePlaceId
          const seen = new Set();
          results.google = results.google.filter(p => {
            if (!p.googlePlaceId || seen.has(p.googlePlaceId)) return false;
            seen.add(p.googlePlaceId); return true;
          });
        }

      } catch (e) {
        console.warn('[DEDUP] Google search failed:', e.message);
      }
    }
    
    const total = results.google.length + results.custom.length;
    if (total > 0) {
      addDebugLog('DEDUP', `[DEDUP] ✅ Found ${results.google.length} Google + ${results.custom.length} custom within ${radius}m`, {
        google: results.google.map(p => `${p.name} ${p._distance}m`),
        custom: results.custom.map(p => `${p.name}`)
      });
      return results;
    }
    addDebugLog('DEDUP', `[DEDUP] ❌ No matches found within ${radius}m`, { lat, lng, interests: [...expandedInterests] });
    return null;
  };

  // Detect which area a coordinate belongs to (returns areaId or null)
  const detectAreaFromCoords = (lat, lng) => {
    const coords = window.BKK.areaCoordinates;
    let closest = null;
    let closestDist = Infinity;
    
    for (const [areaId, center] of Object.entries(coords)) {
      const check = checkLocationInArea(lat, lng, areaId);
      if (check.valid && check.distance < closestDist) {
        closest = areaId;
        closestDist = check.distance;
      }
    }
    return closest;
  };

  const fetchGooglePlaces = async (area, interests, radiusOverride) => {
    // radiusOverride: { lat, lng, radius } for radius mode
    let center, searchRadius;
    
    if (radiusOverride) {
      center = { lat: radiusOverride.lat, lng: radiusOverride.lng };
      searchRadius = radiusOverride.radius;
    } else {
      const areaCenter = areaCoordinates[area];
      if (!areaCenter) {
        addDebugLog('API', `No coordinates for area: ${area}`);
        console.error('[DYNAMIC] No coordinates for area:', area);
        return [];
      }
      center = { lat: areaCenter.lat, lng: areaCenter.lng };
      searchRadius = areaCenter.radius || 2000;
    }

    // Filter out invalid interests (those without search config)
    const validInterests = interests.filter(id => isInterestValid(id));
    if (validInterests.length === 0) {
      const names = interests.map(id => allInterestOptions.find(o => o.id === id)).filter(Boolean).map(o => tLabel(o) || o?.id || id).join(', ');
      addDebugLog('API', `No valid config for: ${names}`);
      console.warn('[DYNAMIC] No valid interests - all are missing search config:', names);
      return [];
    }
    
    if (validInterests.length < interests.length) {
      const skipped = interests.filter(id => !isInterestValid(id));
      const skippedNames = skipped.map(id => allInterestOptions.find(o => o.id === id)).filter(Boolean).map(o => tLabel(o) || o?.id || id).join(', ');
      addDebugLog('API', `Skipped interests without config: ${skippedNames}`);
      console.warn('[DYNAMIC] Skipped invalid interests:', skippedNames);
    }

    try {
      // Get config for the first valid interest (primary)
      const primaryInterest = validInterests[0];
      
      // Check if this interest has direct config or through baseCategory
      let config = interestConfig[primaryInterest];
      if (!config) {
        const customInterest = interestMap[primaryInterest];
        if (customInterest?.baseCategory) {
          config = interestConfig[customInterest.baseCategory] || {};
        } else {
          config = {};
        }
      }
      
      // Check if this interest uses text search (Firebase config first, then city defaults)
      const textSearchQuery = config.textSearch || (window.BKK.textSearchInterests || {})[validInterests[0]] || '';
      
      // Name keywords: if place name contains any of these, it passes type filter even without matching type
      const nameKeywords = (config.nameKeywords || []).map(k => k.toLowerCase().trim()).filter(Boolean);
      
      // Collect blacklist words from all valid interests
      const blacklistWords = validInterests
        .flatMap(interest => {
          const directConfig = interestConfig[interest];
          if (directConfig?.blacklist) return directConfig.blacklist;
          const ci = interestMap[interest];
          if (ci?.baseCategory) return interestConfig[ci.baseCategory]?.blacklist || [];
          return [];
        })
        .map(word => word.toLowerCase());
      
      let response;
      let placeTypes = [];
      let textSearchBodyStr = null;
      let nearbySearchBodyStr = null;
      const _maxRC = window.BKK.systemParams?.googleMaxResultCount ?? -1;
      
      if (textSearchQuery) {
        // Use Text Search API — textQuery should be the search term only.
        // Location is handled by locationBias/Restriction — adding area name to query
        // would cause Google to match only places whose name contains the area name.
        // textQuery = search term only — location handled by locationBias/Restriction
        const searchQuery = textSearchQuery.trim();
        
        const interestLabel = allInterestOptions.find(o => o.id === validInterests[0]);
        addDebugLog('API', `🔍 TEXT SEARCH`, { 
          interest: tLabel(interestLabel) || validInterests[0],
          interestId: validInterests[0],
          query: searchQuery,
          textSearch: textSearchQuery,
          blacklist: blacklistWords,
          area: area || 'GPS',
          center: `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`,
          radius: searchRadius + 'm'
        });
        
        // Text Search API: locationRestriction only supports rectangle (NOT circle).
        // locationBias supports circle. So:
        //   restriction mode → convert circle to bounding rectangle
        //   bias mode        → use locationBias.circle
        const useRestriction = (window.BKK.systemParams?.googleLocationMode || 'restriction') === 'restriction';
        const metersPerDegreeLat = 111320;
        const metersPerDegreeLng = 111320 * Math.cos(center.lat * Math.PI / 180);
        const deltaLat = searchRadius / metersPerDegreeLat;
        const deltaLng = searchRadius / metersPerDegreeLng;
        const textSearchLocationParam = useRestriction
          ? { locationRestriction: { rectangle: {
              low:  { latitude: center.lat - deltaLat, longitude: center.lng - deltaLng },
              high: { latitude: center.lat + deltaLat, longitude: center.lng + deltaLng }
            }}}
          : { locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: searchRadius }}};
        const textSearchBody = {
          textQuery: searchQuery,
          ...(_maxRC > 0 ? { maxResultCount: _maxRC } : {}),
          rankPreference: window.BKK.systemParams?.googleTextRankPreference || 'RELEVANCE',
          ...textSearchLocationParam
        };
        textSearchBodyStr = JSON.stringify(textSearchBody, null, 2);
        response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.currentOpeningHours,places.businessStatus'
          },
          body: textSearchBodyStr
        });
      } else {
        // Use Nearby Search API with types from interestConfig
        placeTypes = [...new Set(
          validInterests.flatMap(interest => {
            // First check if this interest has direct config
            if (interestConfig[interest]?.types) {
              return interestConfig[interest].types;
            }
            // Fallback to baseCategory if it's a custom interest
            const customInterest = interestMap[interest];
            if (customInterest?.baseCategory && interestConfig[customInterest.baseCategory]?.types) {
              return interestConfig[customInterest.baseCategory].types;
            }
            // Fallback to interestToGooglePlaces
            return interestToGooglePlaces[interest] || interestToGooglePlaces[customInterest?.baseCategory] || ['point_of_interest'];
          })
        )];

        const interestLabel = allInterestOptions.find(o => o.id === validInterests[0]);
        addDebugLog('API', `🔍 CATEGORY SEARCH`, { 
          interest: tLabel(interestLabel) || validInterests[0],
          interestId: validInterests[0],
          placeTypes: placeTypes,
          blacklist: blacklistWords,
          area: area || 'GPS',
          center: `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`,
          radius: searchRadius + 'm'
        });

        const useRestrictionTypes = (window.BKK.systemParams?.googleLocationMode || 'restriction') === 'restriction';
        const locationParamTypes = useRestrictionTypes ? 'locationRestriction' : 'locationBias';
        const nearbySearchBody = {
          includedTypes: placeTypes.slice(0, 10),
          ...(_maxRC > 0 ? { maxResultCount: _maxRC } : {}),
          [locationParamTypes]: {
            circle: {
              center: { latitude: center.lat, longitude: center.lng },
              radius: searchRadius
            }
          },
          rankPreference: radiusOverride ? 'DISTANCE' : (window.BKK.systemParams?.googleNearbyRankPreference || 'POPULARITY')
        };
        nearbySearchBodyStr = JSON.stringify(nearbySearchBody, null, 2);
        response = await fetch(GOOGLE_PLACES_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.currentOpeningHours,places.businessStatus'
          },
          body: nearbySearchBodyStr
        });
      }

      console.log('[DYNAMIC] Google Places Response:', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DYNAMIC] Error fetching Google Places:', {
          status: response.status,
          error: errorText,
          area,
          placeTypes
        });
        
        // Handle 400 Unsupported types - retry without bad types
        if (response.status === 400 && errorText.includes('Unsupported types') && !isTextSearch && placeTypes.length > 1) {
          console.warn('[DYNAMIC] Unsupported types detected, retrying one type at a time...');
          let allRetryPlaces = [];
          for (const singleType of placeTypes) {
            try {
              const retryResponse = await fetch(GOOGLE_PLACES_API_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
                  'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.currentOpeningHours,places.businessStatus'
                },
                body: JSON.stringify({
                  includedTypes: [singleType],
                  locationRestriction: {
                    circle: {
                      center: { latitude: center.lat, longitude: center.lng },
                      radius: searchRadius
                    }
                  }
                })
              });
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                if (retryData.places) {
                  allRetryPlaces.push(...retryData.places);
                  console.log(`[DYNAMIC] Retry success for type: ${singleType}, got ${retryData.places.length} places`);
                }
              } else {
                const interestNames = validInterests.map(id => allInterestOptions.find(o => o.id === id)).filter(Boolean).map(o => tLabel(o) || o?.id || id).join(', ');
                addDebugLog('API', `Type "${singleType}" not supported by Google (${interestNames})`);
                console.warn(`[DYNAMIC] Type "${singleType}" not supported, skipping`);
              }
            } catch (retryErr) {
              console.warn(`[DYNAMIC] Retry failed for type: ${singleType}`, retryErr);
            }
          }
          if (allRetryPlaces.length > 0) {
            // Process retry results - jump to processing section
            const data = { places: allRetryPlaces };
            response = { ok: true }; // Fake ok response
            // Continue with processing below using data
            const isTextSearchRetry = false;
            const textSearchPhraseRetry = '';
            let typeFilteredCountRetry = 0;
            let blacklistFilteredCountRetry = 0;
            let relevanceFilteredCountRetry = 0;
            
            const places = data.places.map(place => {
              const name = place.displayName?.text || 'Unknown';
              const placeTypesFromGoogle = place.types || [];
              const openingHours = place.currentOpeningHours;
              const todayIndex = new Date().getDay();
              const googleDayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
              const todayHours = openingHours?.weekdayDescriptions?.[googleDayIndex] || '';
              const hoursOnly = todayHours.includes(':') ? todayHours.substring(todayHours.indexOf(':') + 1).trim() : todayHours;
              return {
                name,
                description: place.formattedAddress || '',
                address: place.formattedAddress || '',
                lat: place.location?.latitude || 0,
                lng: place.location?.longitude || 0,
                rating: place.rating || 0,
                ratingCount: place.userRatingCount || 0,
                interests: validInterests,
                googleTypes: placeTypesFromGoogle,
                primaryType: place.primaryType || null,
                googlePlaceId: place.id || null,
                openNow: openingHours?.openNow ?? null,
                todayHours: hoursOnly || '',
                businessStatus: place.businessStatus || 'OPERATIONAL',
                custom: false
              };
            }).filter(place => place.lat !== 0 && place.lng !== 0);
            
            addDebugLog('API', `Got ${places.length} results from retry`, { names: places.slice(0, 5).map(p => p.name) });
            const filteredPlaces = blacklistWords.length === 0 ? places : places.filter(place => {
              const placeName = place.name.toLowerCase();
              const placeTypeList = (place.googleTypes || []).map(t => t.toLowerCase().replace(/_/g, ' '));
              return !blacklistWords.some(word => placeName.includes(word) || placeTypeList.some(type => type.includes(word)));
            });
            return filteredPlaces;
          }
          const interestLabelRetry = allInterestOptions.find(o => o.id === validInterests[0]);
          addDebugLog('API', `❌ ZERO RESULTS: ${tLabel(interestLabelRetry) || validInterests[0]} — all types returned nothing`, {
            tried: placeTypes,
            blacklist: blacklistWords,
            area: area || 'GPS',
          });
          addToFilterLog({
            interestId: validInterests[0],
            interestLabel: tLabel(interestLabelRetry) || validInterests[0],
            searchType: 'category',
            query: null,
            placeTypes: placeTypes,
            blacklist: blacklistWords,
            nameKeywords: [],
            allResults: [],
            requestDetails: {
              mode: 'nearbySearch',
              query: null,
              types: placeTypes,
              center: { lat: center.lat, lng: center.lng },
              radius: searchRadius,
              locationMode: window.BKK.systemParams?.googleLocationMode || 'restriction',
              rawFromGoogle: 0,
              googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent((placeTypes||[]).join(' '))}/@${center.lat},${center.lng},15z`,
            },
          });
          return []; // No results from any type
        }
        
        // Log to filter log with actual request details before handling error
        const interestLabelApiErr = allInterestOptions.find(o => o.id === validInterests[0]);
        const isTextSearchApiErr = !!textSearchQuery;
        addToFilterLog({
          interestId: validInterests[0],
          interestLabel: tLabel(interestLabelApiErr) || validInterests[0],
          searchType: 'error',
          query: isTextSearchApiErr ? textSearchQuery : null,
          placeTypes: isTextSearchApiErr ? null : placeTypes,
          blacklist: blacklistWords,
          nameKeywords: [],
          allResults: [],
          requestDetails: {
            mode: isTextSearchApiErr ? 'textSearch' : 'nearbySearch',
            query: isTextSearchApiErr ? textSearchQuery : null,
            types: isTextSearchApiErr ? null : placeTypes,
            center: { lat: center.lat, lng: center.lng },
            radius: searchRadius,
            locationMode: window.BKK.systemParams?.googleLocationMode || 'restriction',
            rawFromGoogle: 0,
            errorStatus: response.status,
            errorText: errorText?.slice(0, 200) || '',
            rawBody: isTextSearchApiErr ? textSearchBodyStr : nearbySearchBodyStr,
            googleMapsUrl: isTextSearchApiErr
              ? `https://www.google.com/maps/search/${encodeURIComponent(textSearchQuery)}/@${center.lat},${center.lng},15z`
              : `https://www.google.com/maps/search/${encodeURIComponent((placeTypes||[]).join(' '))}/@${center.lat},${center.lng},15z`,
          },
        });
        // For 400 (bad types/config) — return [] without throwing so other interests continue
        if (response.status === 400) {
          return [];
        }
        // For transient server errors (503, 500, 429), throw a user-friendly message
        if (response.status === 503 || response.status === 500) {
          throw new Error(t('toast.googleApiUnavailable') || 'Google API זמנית לא זמין — נסה שוב בעוד כמה שניות');
        } else if (response.status === 429) {
          throw new Error(t('toast.googleApiQuota') || 'Google API: חריגה ממכסה — נסה שוב מאוחר יותר');
        }
        throw new Error(`Google API ${response.status}`);
      }

      const data = await response.json();
      
      console.log('[DYNAMIC] Google Places Response:', {
        area,
        interests,
        placeTypes,
        foundPlaces: data.places?.length || 0
      });
      
      if (!data.places || data.places.length === 0) {
        // Still log to filter log so user can see the request that returned empty
        const interestLabelEmpty = allInterestOptions.find(o => o.id === validInterests[0]);
        const isTextSearchEmpty = !!textSearchQuery;
        addToFilterLog({
          interestId: validInterests[0],
          interestLabel: tLabel(interestLabelEmpty) || validInterests[0],
          searchType: isTextSearchEmpty ? 'text' : 'category',
          query: isTextSearchEmpty ? textSearchQuery : null,
          placeTypes: isTextSearchEmpty ? null : placeTypes,
          blacklist: blacklistWords,
          nameKeywords: [],
          allResults: [],
          requestDetails: {
            mode: isTextSearchEmpty ? 'textSearch' : 'nearbySearch',
            query: isTextSearchEmpty ? textSearchQuery : null,
            types: isTextSearchEmpty ? null : placeTypes,
            center: { lat: center.lat, lng: center.lng },
            radius: searchRadius,
            locationMode: (window.BKK.systemParams?.googleLocationMode || 'restriction'),
            rawFromGoogle: 0,
            rawBody: isTextSearchEmpty ? textSearchBodyStr : nearbySearchBodyStr,
            googleMapsUrl: isTextSearchEmpty
              ? `https://www.google.com/maps/search/${encodeURIComponent(textSearchQuery)}/@${center.lat},${center.lng},15z`
              : `https://www.google.com/maps/search/${encodeURIComponent((placeTypes||[]).join(' '))}/@${center.lat},${center.lng},15z`,
          },
        });
        return [];
      }

      // Check if this was a text search
      const isTextSearch = !!textSearchQuery;
      
      // For text search: use the full query phrase for relevance filtering
      // Parse textSearch into individual phrases:
      // - comma-separated terms
      // - "quoted phrases" treated as single phrase with spaces
      // - underscores normalized to spaces (street_art → street art)
      // All case-insensitive
      const parseTextSearchPhrases = (query) => {
        if (!query) return [];
        const phrases = [];
        const regex = /"([^"]+)"|([^,]+)/g;
        let m;
        while ((m = regex.exec(query)) !== null) {
          const raw = (m[1] || m[2] || '').trim().toLowerCase().replace(/_/g, ' ');
          if (raw) phrases.push(raw);
        }
        return phrases;
      };
      const textSearchPhrases = isTextSearch ? parseTextSearchPhrases(textSearchQuery) : [];
      const textSearchPhrase = textSearchPhrases[0] || ''; // keep for legacy/debug
      
      // Filter and transform Google Places data
      let typeFilteredCount = 0;
      let blacklistFilteredCount = 0;
      let relevanceFilteredCount = 0;
      const debugPlaceResults = [];
      const totalFromGoogle = data.places.length;
      
      const transformed = data.places
        .filter((place, placeIndex) => {
          const placeName = (place.displayName?.text || '').toLowerCase();
          const placeTypesFromGoogle = place.types || [];
          const debugEntry = { 
            name: place.displayName?.text, 
            rating: place.rating?.toFixed(1) || 'N/A', 
            reviews: place.userRatingCount || 0,
            types: placeTypesFromGoogle.slice(0, 5).join(', '),
            primaryType: place.primaryType || '-',
            address: place.formattedAddress || '',
            openNow: place.currentOpeningHours?.openNow ?? null,
            rank: placeIndex + 1,
            totalFromGoogle,
            googlePlaceId: place.id || null,
          };
          
          // Filter 0: Business status — filter based on systemParams.filteredBusinessStatuses
          const bStatus = place.businessStatus || 'OPERATIONAL';
          const filteredStatuses = window.BKK.systemParams?.filteredBusinessStatuses || ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY'];
          if (filteredStatuses.includes(bStatus)) {
            debugEntry.status = '❌ CLOSED';
            debugEntry.reason = bStatus;
            debugPlaceResults.push(debugEntry);
            return false;
          }

          // Filter 0b: openNow — filter closed-now places if filterClosedNow is enabled
          if (window.BKK.systemParams?.filterClosedNow && place.openNow === false) {
            debugEntry.status = '❌ CLOSED';
            debugEntry.reason = 'CLOSED_NOW';
            debugPlaceResults.push(debugEntry);
            return false;
          }

          // Filter 1: Blacklist check - filter out places with blacklisted words in name OR types
          if (blacklistWords.length > 0) {
            const placeTypes = (place.types || []).concat(place.primaryType ? [place.primaryType] : []).map(t => t.toLowerCase().replace(/_/g, ' '));
            const matchedWord = blacklistWords.find(word =>
              placeName.includes(word) ||
              placeTypes.some(type => type.includes(word))
            );
            if (matchedWord) {
              blacklistFilteredCount++;
              debugEntry.status = '❌ BLACKLIST';
              debugEntry.reason = `name or type contains "${matchedWord}"`;
              debugPlaceResults.push(debugEntry);
              return false;
            }
          }
          
          // Filter 2: For text search - relevance check
          // Place passes if: name contains ANY of the search phrases
          if (isTextSearch && textSearchPhrases.length > 0) {
            const matchedPhrase = textSearchPhrases.find(ph => placeName.includes(ph));
            if (!matchedPhrase) {
              relevanceFilteredCount++;
              debugEntry.status = '❌ NO MATCH';
              debugEntry.reason = `name doesn't contain any of [${textSearchPhrases.join(', ')}]`;
              debugPlaceResults.push(debugEntry);
              return false;
            }
          }
          
          // Filter 3: Type validation - for category search only
          // A place passes if: type matches OR name contains a nameKeyword
          if (!isTextSearch && placeTypes.length > 0) {
            const placeTypesFromGoogle = place.types || [];
            const hasValidType = placeTypesFromGoogle.some(type => placeTypes.includes(type));
            const hasNameKeyword = nameKeywords.length > 0 && nameKeywords.some(kw => placeName.includes(kw));
            
            if (!hasValidType && !hasNameKeyword) {
              typeFilteredCount++;
              debugEntry.status = '❌ TYPE MISMATCH';
              debugEntry.reason = `google types [${placeTypesFromGoogle.slice(0,5).join(',')}] don't match [${placeTypes.join(',')}]`;
              debugPlaceResults.push(debugEntry);
              return false;
            }
            if (!hasValidType && hasNameKeyword) {
              debugEntry.nameKeywordMatch = nameKeywords.find(kw => placeName.includes(kw));
            }
            // Record which types matched (for filter panel display)
            debugEntry.matchedTypes = placeTypesFromGoogle.filter(type => placeTypes.includes(type));
          }
          
          debugEntry.status = '✅ KEPT';
          debugPlaceResults.push(debugEntry);
          return true;
        })
        .map((place, index) => {
          // Extract today's opening hours
          const openingHours = place.currentOpeningHours;
          const todayIndex = new Date().getDay(); // 0=Sun, need to map to weekdayDescriptions (0=Mon in Google)
          const googleDayIndex = todayIndex === 0 ? 6 : todayIndex - 1; // Convert: Sun=6, Mon=0, Tue=1...
          const todayHours = openingHours?.weekdayDescriptions?.[googleDayIndex] || '';
          // Remove day name prefix (e.g. "Monday: 9:00 AM – 5:00 PM" -> "9:00 AM – 5:00 PM")
          const hoursOnly = todayHours.includes(':') ? todayHours.substring(todayHours.indexOf(':') + 1).trim() : todayHours;
          
          return {
            name: place.displayName?.text || 'Unknown Place',
            lat: place.location?.latitude || center.lat,
            lng: place.location?.longitude || center.lng,
            description: `⭐ ${place.rating?.toFixed(1) || 'N/A'} (${place.userRatingCount || 0} reviews)`,
            googlePlace: true,
            rating: place.rating || 0,
            ratingCount: place.userRatingCount || 0,
            googleTypes: place.types || [],
            primaryType: place.primaryType || '',
            googlePlaceId: place.id || null,
            address: place.formattedAddress || '',
            openNow: openingHours?.openNow ?? null,
            todayHours: hoursOnly || '',
            businessStatus: place.businessStatus || 'OPERATIONAL',
            interests: interests,
            _debug: {
              source: 'google',
              interestId: validInterests[0],
              interestLabel: tLabel(allInterestOptions.find(o => o.id === validInterests[0])) || validInterests[0],
              searchType: isTextSearch ? 'text' : 'category',
              query: isTextSearch ? textSearchQuery : null,
              placeTypes: isTextSearch ? null : placeTypes,
              blacklist: blacklistWords,
              area: area || 'radius',
              center: `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`,
              radius: searchRadius,
              googleTypes: (place.types || []).slice(0, 8),
              primaryType: place.primaryType || '',
              rank: index + 1,
              totalFromGoogle: data.places.length,
              timestamp: Date.now()
            }
          };
        });
      
      console.log('[DYNAMIC] Filtering summary:', {
        received: data.places.length,
        typeFiltered: typeFilteredCount,
        blacklistFiltered: blacklistFilteredCount,
        relevanceFiltered: relevanceFilteredCount,
        beforeDistFilter: transformed.length
      });
      
      // Log detailed debug results for in-app viewer
      const interestLabel = allInterestOptions.find(o => o.id === validInterests[0]);
      const zeroResults = transformed.length === 0;
      addDebugLog('API', `${zeroResults ? '❌ ZERO RESULTS' : '📊 RESULTS'}: ${tLabel(interestLabel) || validInterests[0]}`, {
        total: data.places.length,
        kept: transformed.length,
        blacklistFiltered: blacklistFilteredCount,
        typeFiltered: typeFilteredCount,
        relevanceFiltered: relevanceFilteredCount,
        places: debugPlaceResults  // always include all filtered entries
      });
      if (zeroResults) {
        addDebugLog('API', `❌ All ${data.places.length} places were filtered out — blacklist:${blacklistFilteredCount} type:${typeFilteredCount} relevance:${relevanceFilteredCount}`, {
          filteredOut: debugPlaceResults.map(p => `${p.status} ${p.name} — ${p.reason || ''}`)
        });
      }
      // Readable console log of all places with status
      console.log(`[API] 📊 ${tLabel(interestLabel) || validInterests[0]} — ${data.places.length} from Google, ${transformed.length} kept:`);
      debugPlaceResults.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.status} ${p.name} — ⭐${p.rating} (${p.reviews}) [${p.primaryType}]${p.reason ? ' | ' + p.reason : ''}`);
      });
      
      // Filter 4: Distance check - remove places too far from search center
      // Use per-area distanceMultiplier, fallback to city default, fallback to 1.2
      const areaConfig = areaCoordinates[area] || {};
      const distMultiplier = areaConfig.distanceMultiplier || window.BKK.selectedCity?.distanceMultiplier || 1.2;
      const maxDistance = searchRadius * distMultiplier;
      const distanceFiltered = transformed.filter(place => {
        const dist = calcDistance(center.lat, center.lng, place.lat, place.lng);
        if (dist > maxDistance) {
          addDebugLog('API', `❌ TOO FAR: ${place.name} (${Math.round(dist)}m > ${Math.round(maxDistance)}m)`);
          debugPlaceResults.push({
            name: place.name,
            rating: place.rating?.toFixed?.(1) || place.rating || 'N/A',
            reviews: place.ratingCount || 0,
            primaryType: place.primaryType || '-',
            address: place.address || '',
            status: '❌ TOO FAR',
            reason: `${Math.round(dist)}m > max ${Math.round(maxDistance)}m`,
          });
          return false;
        }
        return true;
      });
      
      if (distanceFiltered.length < transformed.length) {
        console.log(`[DYNAMIC] Distance filter removed ${transformed.length - distanceFiltered.length} far places`);
      }
      
      // Layer 6: Rating count filter — applies only to Google results, never to saved favorites
      const minCount = config.minRatingCount != null ? config.minRatingCount : (sp.googleMinRatingCount ?? 20);
      const lowCount = config.lowRatingCount != null ? config.lowRatingCount : (sp.googleLowRatingCount ?? 60);
      let ratingCountFiltered = 0;
      const ratingFiltered = distanceFiltered.filter(place => {
        const count = place.ratingCount || 0;
        if (count < minCount) {
          ratingCountFiltered++;
          addDebugLog('API', `❌ TOO FEW RATINGS: ${place.name} (${count} < ${minCount})`);
          debugPlaceResults.push({
            name: place.name,
            rating: place.rating?.toFixed?.(1) || place.rating || 'N/A',
            reviews: count,
            primaryType: place.primaryType || '-',
            address: place.address || '',
            status: '❌ TOO FEW RATINGS',
            reason: `${count} reviews < min ${minCount}`,
          });
          return false;
        }
        if (count < lowCount) {
          place.lowRatingCount = true;
        }
        return true;
      });

      if (ratingCountFiltered > 0) {
        addDebugLog('API', `❌ Filtered ${ratingCountFiltered} places with < ${minCount} ratings`);
      }

      addDebugLog('API', `✅ FINAL: ${tLabel(allInterestOptions.find(o => o.id === validInterests[0])) || validInterests[0]} → ${ratingFiltered.length} places`, {
        fromGoogle: data.places.length,
        afterFilters: transformed.length,
        afterDistance: distanceFiltered.length,
        afterRatingCount: ratingFiltered.length,
        removed: { blacklist: blacklistFilteredCount, type: typeFilteredCount, relevance: relevanceFilteredCount, distance: transformed.length - distanceFiltered.length, lowRatingCount: ratingCountFiltered },
        finalPlaces: ratingFiltered.map(p => `${p.name} ⭐${p.rating} (${p.ratingCount})${p.lowRatingCount ? ' ⚠️low' : ''}`)
      });

      // Update filter log with complete picture for this interest
      addToFilterLog({
        interestId: validInterests[0],
        interestLabel: tLabel(allInterestOptions.find(o => o.id === validInterests[0])) || validInterests[0],
        searchType: isTextSearch ? 'text' : 'category',
        query: isTextSearch ? textSearchQuery : null,
        placeTypes: isTextSearch ? null : placeTypes,
        blacklist: blacklistWords,
        nameKeywords,
        allResults: debugPlaceResults,
        requestDetails: {
          mode: isTextSearch ? 'textSearch' : 'nearbySearch',
          query: isTextSearch ? textSearchQuery : null,
          types: isTextSearch ? null : placeTypes,
          center: { lat: center.lat, lng: center.lng },
          radius: searchRadius,
          locationMode: (window.BKK.systemParams?.googleLocationMode || 'restriction'),
          rawFromGoogle: debugPlaceResults.length,
          rawBody: isTextSearch ? textSearchBodyStr : nearbySearchBodyStr,
        },
      });
      
      return ratingFiltered;
    } catch (error) {
      console.error('[DYNAMIC] Error fetching Google Places:', {
        error: error.message,
        stack: error.stack,
        area,
        interests
      });
      
      // Throw error to be handled by caller
      throw {
        type: 'GOOGLE_API_ERROR',
        message: error.message,
        details: { area, interests, stack: error.stack }
      };
    }
  };

  // Function to fetch Google Place info for a location
  const fetchGooglePlaceInfo = async (location) => {
    if (!location || (!location.lat && !location.name)) {
      showToast(t('places.notEnoughInfo'), 'error');
      return null;
    }
    
    setLoadingGoogleInfo(true);
    
    try {
      // Use Text Search to find the place
      const searchQuery = location.name + ' ' + (window.BKK.cityNameForSearch || 'Bangkok');
      
      const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.primaryTypeDisplayName,places.currentOpeningHours'
        },
        body: JSON.stringify({
          textQuery: searchQuery,
          maxResultCount: 5,
          locationBias: location.lat && location.lng ? {
            circle: {
              center: { latitude: location.lat, longitude: location.lng },
              radius: 1000.0
            }
          } : undefined
        })
      });
      
      if (!response.ok) {
        throw new Error('Google API error');
      }
      
      const data = await response.json();
      
      if (!data.places || data.places.length === 0) {
        setGooglePlaceInfo({ notFound: true, searchQuery });
        showToast(t('places.placeNotOnGoogle'), 'warning');
        return null;
      }
      
      // Find best match (closest to our coordinates if available)
      let bestMatch = data.places[0];
      
      if (location.lat && location.lng && data.places.length > 1) {
        const getDistance = (place) => {
          const lat = place.location?.latitude || 0;
          const lng = place.location?.longitude || 0;
          return Math.sqrt(Math.pow(lat - location.lat, 2) + Math.pow(lng - location.lng, 2));
        };
        
        bestMatch = data.places.reduce((best, place) => 
          getDistance(place) < getDistance(best) ? place : best
        );
      }
      
      const placeInfo = {
        name: bestMatch.displayName?.text,
        address: bestMatch.formattedAddress,
        types: bestMatch.types || [],
        primaryType: bestMatch.primaryType,
        primaryTypeDisplayName: bestMatch.primaryTypeDisplayName?.text,
        rating: bestMatch.rating,
        ratingCount: bestMatch.userRatingCount,
        location: bestMatch.location,
        googlePlaceId: bestMatch.id || null,
        allResults: data.places.map(p => ({
          name: p.displayName?.text,
          types: p.types,
          primaryType: p.primaryType
        }))
      };
      
      setGooglePlaceInfo(placeInfo);
      
      // Auto-apply googlePlaceId and rating to the location being edited
      if (placeInfo.googlePlaceId) {
        setNewLocation(prev => {
          // Do NOT touch mapsUrl — getGoogleMapsUrl handles legacy URLs on-the-fly
          // Only update data fields: placeId, rating, address
          return {
            ...prev,
            googlePlaceId: placeInfo.googlePlaceId,
            googlePlace: true,
            ...(placeInfo.address && !prev.address ? { address: placeInfo.address } : {}),
            ...(placeInfo.rating ? { googleRating: placeInfo.rating, googleRatingCount: placeInfo.ratingCount || 0 } : {})
          };
        });


        // Rating refresh handled by dedicated button — not auto-saved here
      }
      
      addDebugLog('API', 'Fetched Google Place Info', { name: placeInfo.name, types: placeInfo.types });

      // Google Info debug log — always record when debug mode active
      if (debugModeRef.current) {
        const isValidGooglePlaceId = (pid) => {
          if (!pid || typeof pid !== 'string' || pid.length < 15) return false;
          if (/^(ChIJ|EiI|GhIJ)/.test(pid)) return true;
          if (pid.length > 25 && /^[A-Za-z0-9_-]+$/.test(pid) && !pid.startsWith('-')) return true;
          return false;
        };
        const builtUrl = placeInfo.googlePlaceId
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeInfo.name || location.name)}&query_place_id=${placeInfo.googlePlaceId}`
          : null;
        const entry = {
          ts: Date.now(),
          locationName: location.name,
          searchQuery: location.name + ' Bangkok',
          rawFromGoogle: {
            placeId: placeInfo.googlePlaceId,
            placeIdValid: isValidGooglePlaceId(placeInfo.googlePlaceId),
            name: placeInfo.name,
            address: placeInfo.address,
            rating: placeInfo.rating,
            ratingCount: placeInfo.ratingCount,
            lat: placeInfo.location?.latitude,
            lng: placeInfo.location?.longitude,
            types: placeInfo.types,
            primaryType: placeInfo.primaryType,
          },
          builtUrl,
          existingMapsUrl: location.mapsUrl || null,
        };
        googleInfoDebugLogRef.current = [entry, ...googleInfoDebugLogRef.current.slice(0, 19)];
        setGoogleInfoDebugLog([...googleInfoDebugLogRef.current]);
      }
      
      return placeInfo;
    } catch (error) {
      console.error('Error fetching Google place info:', error);
      showToast(t('toast.googleInfoError'), 'error');
      return null;
    } finally {
      setLoadingGoogleInfo(false);
    }
  };

  // Batch refresh Google ratings for all favorites with Google presence
  // Bulk audit & fix URLs and googlePlaceId for all favorites
  const [urlAuditResult, setUrlAuditResult] = useState(null);

  // Refresh Google rating for a single place — used by the rating button in edit dialog
  const refreshSingleGoogleRating = async (loc, inPlaceCallback = null) => {
    if (!GOOGLE_PLACES_API_KEY) {
      showToast('Google API not available', 'error');
      return;
    }
    if (!inPlaceCallback && (!isFirebaseAvailable || !database || !loc?.firebaseId)) {
      showToast('Google API or Firebase not available', 'error');
      return;
    }
    showToast('⭐ ' + (t('settings.refreshRatings') || 'מרענן דירוג...'), 'info');
    try {
      let newRating = null, newCount = 0, foundPlaceId = null;
      // Use Place Details if we have googlePlaceId
      if (loc.googlePlaceId) {
        const resp = await fetch(`https://places.googleapis.com/v1/places/${loc.googlePlaceId}`, {
          method: 'GET',
          headers: { 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'rating,userRatingCount' }
        });
        if (resp.ok) { const d = await resp.json(); newRating = d.rating || null; newCount = d.userRatingCount || 0; }
      }
      // Fallback: Text Search
      if (!newRating) {
        const resp = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'places.id,places.rating,places.userRatingCount,places.location' },
          body: JSON.stringify({ textQuery: loc.name + ' ' + (window.BKK.cityNameForSearch || 'Bangkok'), maxResultCount: 3,
            locationBias: { circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: 500.0 } } })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.places?.length) {
            const best = data.places.reduce((a, b) => {
              const da = Math.abs((a.location?.latitude||0) - loc.lat) + Math.abs((a.location?.longitude||0) - loc.lng);
              const db = Math.abs((b.location?.latitude||0) - loc.lat) + Math.abs((b.location?.longitude||0) - loc.lng);
              return da < db ? a : b;
            });
            newRating = best.rating || null;
            newCount = best.userRatingCount || 0;
            if (best.id && !loc.googlePlaceId) foundPlaceId = best.id;
          }
        }
      }
      if (!newRating) { showToast(t('settings.noPlacesToRefresh') || 'לא נמצא דירוג', 'warning'); return; }
      const updates = { googleRating: newRating, googleRatingCount: newCount, googleRatingUpdated: Date.now(), ...(foundPlaceId ? { googlePlaceId: foundPlaceId } : {}) };
      if (inPlaceCallback) {
        // Unsaved location — just update in-place via callback, don't write to Firebase
        inPlaceCallback(updates);
        setNewLocation(prev => ({ ...prev, ...updates }));
        showToast(`⭐ ${loc.name} — ${newRating.toFixed(1)} (${newCount})`, 'success');
        return;
      }
      await database.ref(`cities/${selectedCityId}/locations/${loc.firebaseId}`).update(updates);
      // Update local state immediately
      setCustomLocations(prev => prev.map(l => l.firebaseId === loc.firebaseId ? { ...l, ...updates } : l));
      setEditingLocation(prev => prev ? { ...prev, ...updates } : prev);
      setNewLocation(prev => ({ ...prev, googleRating: newRating, googleRatingCount: newCount }));
      showToast(`⭐ ${loc.name} — ${newRating.toFixed(1)} (${newCount})`, 'success');
    } catch (e) {
      console.error('[RATING] Single refresh error:', e.message);
      showToast(t('toast.updateError') || 'שגיאה', 'error');
    }
  };

  const refreshAllGoogleRatings = async () => {
    if (!GOOGLE_PLACES_API_KEY || !isFirebaseAvailable || !database) {
      showToast('Google API or Firebase not available', 'error');
      return;
    }
    
    const allPlaces = customLocations.filter(loc => 
      (loc.cityId || 'bangkok') === selectedCityId && loc.status !== 'blacklist' && loc.lat && loc.lng && loc.name
    );
    
    const REFRESH_INTERVAL = 7 * 24 * 3600 * 1000;
    const candidates = allPlaces.filter(loc => !loc.googleRatingUpdated || (Date.now() - loc.googleRatingUpdated) > REFRESH_INTERVAL);
    const skippedRecent = allPlaces.length - candidates.length;
    
    if (candidates.length === 0) {
      showToast(`${t('settings.noPlacesToRefresh') || 'אין מקומות לרענון'} (${skippedRecent} ${t('settings.recentlyUpdated') || 'עודכנו לאחרונה'})`, 'info');
      return;
    }
    
    const stats = { total: candidates.length, skippedRecent, apiCalls: 0, detailsCalls: 0, textSearchCalls: 0, updated: 0, unchanged: 0, noRating: 0, errors: 0, noFirebaseId: 0, saved: 0, newPlaceIds: 0 };
    const startTime = Date.now();
    const CHUNK_SIZE = 5; // parallel requests per chunk — stays within Google rate limits
    let processed = 0;

    setRatingsRefreshProgress({ current: 0, total: candidates.length, updated: 0 });

    // Helper: fetch rating for one location
    const fetchOneRating = async (loc) => {
      let newRating = null, newCount = 0, foundPlaceId = null;
      // Prefer Place Details (GET, $0.005) over Text Search ($0.032)
      if (loc.googlePlaceId) {
        const detailResp = await fetch(`https://places.googleapis.com/v1/places/${loc.googlePlaceId}`, {
          method: 'GET',
          headers: { 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'rating,userRatingCount' }
        });
        stats.apiCalls++; stats.detailsCalls++;
        if (detailResp.ok) {
          const detail = await detailResp.json();
          newRating = detail.rating || null;
          newCount = detail.userRatingCount || 0;
        }
      }
      if (newRating === null) {
        const resp = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'places.id,places.rating,places.userRatingCount,places.location' },
          body: JSON.stringify({ textQuery: loc.name + ' ' + (window.BKK.cityNameForSearch || 'Bangkok'), maxResultCount: 3, locationBias: { circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: 500.0 } } })
        });
        stats.apiCalls++; stats.textSearchCalls++;
        if (resp.ok) {
          const data = await resp.json();
          if (data.places?.length) {
            const best = data.places.length > 1
              ? data.places.reduce((a, b) => ((a.location ? Math.abs(a.location.latitude - loc.lat) + Math.abs(a.location.longitude - loc.lng) : 999) < (b.location ? Math.abs(b.location.latitude - loc.lat) + Math.abs(b.location.longitude - loc.lng) : 999) ? a : b))
              : data.places[0];
            newRating = best.rating || null;
            newCount = best.userRatingCount || 0;
            if (best.id && !loc.googlePlaceId) { foundPlaceId = best.id; stats.newPlaceIds++; }
          }
        }
      }
      return { newRating, newCount, foundPlaceId };
    };

    // Process in parallel chunks of CHUNK_SIZE
    for (let chunkStart = 0; chunkStart < candidates.length; chunkStart += CHUNK_SIZE) {
      const chunk = candidates.slice(chunkStart, chunkStart + CHUNK_SIZE);
      await Promise.all(chunk.map(async (loc) => {
        try {
          const { newRating, newCount, foundPlaceId } = await fetchOneRating(loc);
          processed++;
          setRatingsRefreshProgress({ current: processed, total: candidates.length, updated: stats.updated });
          if (!newRating) { stats.noRating++; return; }
          const updates = { googleRatingUpdated: Date.now(), ...(foundPlaceId ? { googlePlaceId: foundPlaceId } : {}) };
          if (loc.googleRating === newRating && loc.googleRatingCount === newCount) {
            stats.unchanged++;
            if (loc.firebaseId) database.ref(`cities/${selectedCityId}/locations/${loc.firebaseId}`).update(updates);
            return;
          }
          if (loc.firebaseId) {
            try {
              await database.ref(`cities/${selectedCityId}/locations/${loc.firebaseId}`).update({ googleRating: newRating, googleRatingCount: newCount, ...updates });
              stats.saved++;
            } catch (fbErr) { stats.errors++; }
          } else { stats.noFirebaseId++; }
          setCustomLocations(prev => prev.map(l => l.name === loc.name ? { ...l, googleRating: newRating, googleRatingCount: newCount, googleRatingUpdated: Date.now(), ...(foundPlaceId ? { googlePlaceId: foundPlaceId } : {}) } : l));
          stats.updated++;
          setRatingsRefreshProgress({ current: processed, total: candidates.length, updated: stats.updated });
        } catch (e) { stats.errors++; }
      }));
      // 300ms between chunks to respect rate limits
      if (chunkStart + CHUNK_SIZE < candidates.length) await new Promise(r => setTimeout(r, 300));
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const estCost = (stats.detailsCalls * 0.005 + stats.textSearchCalls * 0.032).toFixed(3);
    const nextCost = ((stats.detailsCalls + stats.newPlaceIds) * 0.005 + Math.max(0, stats.textSearchCalls - stats.newPlaceIds) * 0.032).toFixed(3);
    showToast(
      `⭐ ${stats.updated} ${t('settings.updated')} / ${stats.total} ${t('settings.scanned') || 'נסרקו'} (${stats.unchanged} ${t('settings.unchangedRating') || 'ללא שינוי'}) · $${estCost}`,
      stats.updated > 0 ? 'success' : 'info'
    );
    setRatingsRefreshProgress(null);
  };

  // Combine all interests: built-in + uncovered + custom (city-filtered)
  // Filter custom interests by city scope (must be before allInterestOptions)
  // cityCustomInterests kept for backward compatibility with any remaining references
  const cityCustomInterests = interestOptions;

  const allInterestOptions = useMemo(() => {
    const mapped = interestOptions.map(opt => {
      const config = interestConfig[opt.id];
      if (!config) return opt;
      return {
        ...opt,
        label: config.labelOverride || config.label || opt.label,
        labelEn: config.labelEnOverride || config.labelOverrideEn || config.labelEn || opt.labelEn,
        icon: config.iconOverride || config.icon || opt.icon,
        locked: config.locked !== undefined ? config.locked : opt.locked,
        category: config.category || opt.category || 'attraction',
        weight: config.weight || opt.weight || sp.defaultInterestWeight,
        minStops: config.minStops != null ? config.minStops : (opt.minStops != null ? opt.minStops : 1),
        maxStops: config.maxStops || opt.maxStops || 10,
        adminStatus: config.adminStatus || 'active',
        group: config.group || opt.group || '',
        noGoogleSearch: config.noGoogleSearch || opt.noGoogleSearch || false,
        privateOnly: config.privateOnly || opt.privateOnly || false,
        color: config.color || opt.color || null,
      };
    });
    // Sort: group order then alphabetical within group — re-sorts on language change
    const sortLocale = currentLang === 'he' ? 'he' : 'en';
    const groupOrderMap = {};
    Object.keys(interestGroups || {}).forEach((gId, idx) => {
      groupOrderMap[gId] = (interestGroups[gId]?.order ?? idx);
    });
    return mapped.sort((a, b) => {
      const ga = groupOrderMap[a.group || ''] ?? 99;
      const gb = groupOrderMap[b.group || ''] ?? 99;
      if (ga !== gb) return ga - gb;
      const la = (currentLang === 'he' ? a.label : a.labelEn) || a.label || '';
      const lb = (currentLang === 'he' ? b.label : b.labelEn) || b.label || '';
      return la.localeCompare(lb, sortLocale);
    });
  }, [interestOptions, interestConfig, interestGroups, currentLang]);

  // Debug: log custom interests in allInterestOptions (only when debug mode is on)
  useEffect(() => {
    if (!debugMode) return;
    addDebugLog('INTEREST', `allInterestOptions.length=${allInterestOptions.length} cityCustomInterests.length=${(cityCustomInterests||[]).length} customInterests.length=${(customInterests||[]).length}`);
    addDebugLog('INTEREST', `allInterestOptions IDs: ${allInterestOptions.map(o=>o.id).join(', ')}`);
    const customs = allInterestOptions.filter(o => o.id?.startsWith?.('custom_') || o.custom);
    if (customs.length > 0) {
      addDebugLog('INTEREST', `${customs.length} custom found in allInterestOptions:`);
      customs.forEach(c => addDebugLog('INTEREST', `  - ${c.id}: "${c.label}" scope=${c.scope||'?'} privateOnly=${c.privateOnly} valid=${isInterestValid?.(c.id)}`));
    } else if ((customInterests||[]).length > 0) {
      addDebugLog('INTEREST', 'BUG: customInterests exist but NOT in allInterestOptions!');
      addDebugLog('INTEREST', 'cityCustomInterests: ' + JSON.stringify((cityCustomInterests||[]).map(c=>({id:c.id,label:c.label}))));
    }
  }, [customInterests, cityCustomInterests, allInterestOptions, debugMode]);
  useEffect(() => {
    // Don't save if data hasn't loaded yet - prevents overwriting saved interests with empty state
    if (!isDataLoaded) return;
    // Strip admin-controlled settings before saving — these come from Firebase, not localStorage
    const { maxStops, fetchMoreCount, _selectedMapArea, ...userPrefs } = formData;
    userPrefs.placesSortBy = placesSortBy;
    localStorage.setItem('foufou_preferences', JSON.stringify(userPrefs));
  }, [formData, isDataLoaded, placesSortBy]);

  // Version check - auto-check on load + manual check
  const checkForUpdates = async (silent = false) => {
    try {
      const response = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) return false;
      const data = await response.json();
      const serverVersion = data.version;
      const localVersion = window.BKK.VERSION;
      
      if (serverVersion && serverVersion !== localVersion) {
        console.log(`[UPDATE] New version available: ${serverVersion} (current: ${localVersion})`);
        setUpdateAvailable(true);
        if (!silent) {
          showToast(`${t("toast.newVersionAvailable")} ${serverVersion}`, 'success');
        }
        return true;
      } else {
        if (!silent) showToast(t('toast.appUpToDate'), 'success');
        return false;
      }
    } catch (e) {
      console.log('[UPDATE] Check failed:', e);
      if (!silent) showToast(t('toast.cannotCheckUpdates'), 'error');
      return false;
    }
  };

  const applyUpdate = () => {
    if (window.__beforeUnloadHandler) {
      window.removeEventListener('beforeunload', window.__beforeUnloadHandler);
    }
    const doReload = () => { window.location.reload(); };
    const clearAndReload = () => {
      if ('caches' in window) {
        caches.keys()
          .then(names => Promise.all(names.map(name => caches.delete(name))))
          .then(doReload)
          .catch(doReload);
      } else {
        doReload();
      }
    };
    // Unregister SW first — prevents old SW from re-activating and serving stale JS after reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations.map(r => r.unregister())))
        .then(clearAndReload)
        .catch(clearAndReload);
    } else {
      clearAndReload();
    }
  };

  // Auto-check for updates on load (silent)
  useEffect(() => {
    const timer = setTimeout(() => checkForUpdates(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Save column width
  useEffect(() => {
    localStorage.setItem('foufou_right_col_width', rightColWidth.toString());
  }, [rightColWidth]);

  // Sync editingLocation to newLocation when edit dialog opens
  useEffect(() => {
    if (showEditLocationDialog && editingLocation) {
      setNewLocation({
        name: editingLocation.name || '',
        description: editingLocation.description || '',
        notes: editingLocation.notes || '',
        area: editingLocation.area || formData.area,
        interests: editingLocation.interests || [],
        lat: editingLocation.lat || null,
        lng: editingLocation.lng || null,
        mapsUrl: editingLocation.mapsUrl || '',
        address: editingLocation.address || '',
        uploadedImage: editingLocation.uploadedImage || null,
        imageUrls: editingLocation.imageUrls || [],
        locked: editingLocation.locked || false,
        areas: editingLocation.areas || (editingLocation.area ? [editingLocation.area] : []),
        googleRating: editingLocation.googleRating || null,
        googleRatingCount: editingLocation.googleRatingCount || 0,
        googlePlaceId: editingLocation.googlePlaceId || null,
        googlePlace: editingLocation.googlePlace || false
      });
    }
  }, [showEditLocationDialog, editingLocation]);

  // After auto-save completes (editingLocation set) — fire pending action
  useEffect(() => {
    if (pendingReviewOpenRef.current && editingLocation && showEditLocationDialog) {
      pendingReviewOpenRef.current = false;
      openReviewDialog(editingLocation);
    }
  }, [editingLocation, showEditLocationDialog]);

  useEffect(() => {
    if (pendingRatingRefreshRef.current && editingLocation && showEditLocationDialog) {
      pendingRatingRefreshRef.current = false;
      refreshSingleGoogleRating(editingLocation);
    }
  }, [editingLocation, showEditLocationDialog]);

  const areaOptions = window.BKK.areaOptions || [];

  // Memoized lookup maps to avoid O(n) .find() calls in render loops
  const interestMap = useMemo(() => {
    try {
      const map = {};
      if (allInterestOptions) allInterestOptions.forEach(o => { if (o && o.id) map[o.id] = o; });
      return map;
    } catch(e) { console.error('[MEMO] interestMap error:', e); return {}; }
  }, [allInterestOptions]);

  const areaMap = useMemo(() => {
    try {
      const map = {};
      if (areaOptions) areaOptions.forEach(o => { if (o && o.id) map[o.id] = o; });
      return map;
    } catch(e) { console.error('[MEMO] areaMap error:', e); return {}; }
  }, [areaOptions]);

  // City-filtered custom locations and saved routes
  const cityCustomLocations = useMemo(() => {
    // Filter by cityId — every location loaded from Firebase has cityId stamped on it.
    // Safety net against race conditions when switching cities: even if stale locations
    // linger in customLocations[] for a moment, they will never surface in the wrong city.
    return customLocations.filter(loc => (loc.cityId || 'bangkok') === selectedCityId);
  }, [customLocations, selectedCityId]);

  const citySavedRoutes = useMemo(() => {
    return savedRoutes.filter(r => (r.cityId || 'bangkok') === selectedCityId);
  }, [savedRoutes, selectedCityId]);


  // Memoize expensive places grouping/sorting
  const groupedPlaces = useMemo(() => {
    try {
      if (!cityCustomLocations || cityCustomLocations.length === 0) {
        return { groups: {}, ungrouped: [], sortedKeys: [], activeCount: 0, blacklistedLocations: [], draftsLocations: [], readyLocations: [], draftsCount: 0, readyCount: 0, blacklistCount: 0 };
      }
      const draftsLocations = cityCustomLocations.filter(loc => loc.status !== 'blacklist' && !loc.locked);
      const readyLocations = cityCustomLocations.filter(loc => loc.status !== 'blacklist' && loc.locked);
      const blacklistedLocations = cityCustomLocations.filter(loc => loc.status === 'blacklist');
      
      // Choose which locations to group based on placesTab
      const tabLocations = placesTab === 'all' ? [...draftsLocations, ...readyLocations] : placesTab === 'drafts' ? draftsLocations : placesTab === 'ready' ? readyLocations : blacklistedLocations;
      
      // Apply search filter
      const filteredTabLocations = searchQuery?.trim() 
        ? tabLocations.filter(loc => {
            const q = searchQuery.toLowerCase();
            return loc.name?.toLowerCase().includes(q) || loc.description?.toLowerCase().includes(q) || loc.notes?.toLowerCase().includes(q);
          })
        : tabLocations;
      
      if (filteredTabLocations.length === 0) return { groups: {}, ungrouped: [], sortedKeys: [], activeCount: draftsLocations.length + readyLocations.length, blacklistedLocations, draftsLocations, readyLocations, draftsCount: draftsLocations.length, readyCount: readyLocations.length, blacklistCount: blacklistedLocations.length };
      
      // Derive grouping mode from sort selection
      const isFlatEarly = placesSortBy === 'updatedAt' || placesSortBy === 'addedAt' || placesSortBy === 'name';
      const groupByMode = placesSortBy === 'area' ? 'area' : 'interest';

      const groups = {};
      const ungrouped = [];
      
      filteredTabLocations.forEach(loc => {
        if (groupByMode === 'interest') {
          const interests = (loc.interests || []).filter(i => i !== '_manual');
          if (interests.length === 0) {
            ungrouped.push(loc);
          } else {
            let hasValidInterest = false;
            interests.forEach(int => {
              if (interestMap[int]) {
                if (!groups[int]) groups[int] = [];
                groups[int].push(loc);
                hasValidInterest = true;
              }
            });
            if (!hasValidInterest) ungrouped.push(loc);
          }
        } else {
          const locAreas = loc.areas || (loc.area ? [loc.area] : ['unknown']);
          locAreas.forEach(areaId => {
            if (!groups[areaId]) groups[areaId] = [];
            groups[areaId].push(loc);
          });
        }
      });
      
      const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (groupByMode === 'interest') {
          return (tLabel(interestMap[a]) || a).localeCompare(tLabel(interestMap[b]) || b);
        } else {
          return (tLabel(areaMap[a]) || a).localeCompare(tLabel(areaMap[b]) || b);
        }
      });

      // FLAT MODE check (computed earlier as isFlatEarly)
      const getTs2 = (loc) => {
        const d = placesSortBy === 'addedAt' ? (loc.addedAt) : (loc.updatedAt || loc.addedAt);
        return d ? (new Date(d).getTime() || 0) : 0;
      };
      if (isFlatEarly) {
        const flat = [...filteredTabLocations].sort((a, b) => {
          if (placesSortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' });
          const ta = getTs2(a), tb = getTs2(b);
          if (ta === 0 && tb === 0) return (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' });
          if (ta === 0) return 1; if (tb === 0) return -1;
          if (tb !== ta) return tb - ta; // newer first
          return (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' }); // same date → name asc
        });
        return { groups: {}, ungrouped: flat, sortedKeys: [], activeCount: draftsLocations.length + readyLocations.length, blacklistedLocations, draftsLocations, readyLocations, draftsCount: draftsLocations.length, readyCount: readyLocations.length, blacklistCount: blacklistedLocations.length };
      }

      // GROUPED MODE — sort within each group: by interest label then name (area mode), or by name (interest mode)
      const sortWithin = (locs) => [...locs].sort((a, b) => {
        if (groupByMode === 'area') {
          const ai = tLabel(interestMap[(a.interests || [])[0]]) || '';
          const bi = tLabel(interestMap[(b.interests || [])[0]]) || '';
          return ai.localeCompare(bi, 'he') || (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' });
        }
        return (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' });
      });
      
      const sortedGroups = {};
      sortedKeys.forEach(key => { sortedGroups[key] = sortWithin(groups[key]); });
      const sortedUngrouped = sortWithin(ungrouped);
      
      return { groups: sortedGroups, ungrouped: sortedUngrouped, sortedKeys, activeCount: draftsLocations.length + readyLocations.length, blacklistedLocations, draftsLocations, readyLocations, draftsCount: draftsLocations.length, readyCount: readyLocations.length, blacklistCount: blacklistedLocations.length };
    } catch(e) {
      console.error('[MEMO] groupedPlaces error:', e);
      return { groups: {}, ungrouped: [], sortedKeys: [], activeCount: 0, blacklistedLocations: [], draftsLocations: [], readyLocations: [], draftsCount: 0, readyCount: 0, blacklistCount: 0 };
    }
  }, [cityCustomLocations, placesGroupBy, placesSortBy, placesTab, interestMap, areaMap, searchQuery]);

  // Flat navigation list for prev/next in edit dialog
  const flatNavList = useMemo(() => {
    return [...groupedPlaces.sortedKeys.flatMap(k => groupedPlaces.groups[k] || []), ...groupedPlaces.ungrouped];
  }, [groupedPlaces]);

  // Image handling - loaded from utils.js
  const uploadImage = window.BKK.uploadImage;
  


  // Auto-clean: remove selected interests that are no longer valid/visible
  // IMPORTANT: Only runs after initial data is loaded to prevent race condition
  // Interest cleanup removed — city switch already clears interests (switchCity resets formData.interests=[])
  // No need to validate interests against interestConfig on every Firebase update

  // Button styles - loaded from utils.js

  const getStopsForInterests = () => {
    // Now we only collect CUSTOM locations - Google Places will be fetched in generateRoute
    const isRadiusMode = formData.searchMode === 'radius' || formData.searchMode === 'all';
    
    // Filter custom locations that match current city, area/radius and selected interests
    const matchingCustomLocations = customLocations.filter(loc => {
      // Filter by current city (locations without cityId are treated as 'bangkok')
      if ((loc.cityId || 'bangkok') !== selectedCityId) return false;
      
      // CRITICAL: Skip blacklisted locations!
      if (loc.status === 'blacklist') return false;
      
      // Skip drafts if includeDrafts is off
      if (!window.BKK.systemParams?.includeDrafts && !loc.locked) return false;
      
      // Skip invalid locations (missing required data)
      if (!isLocationValid(loc)) return false;
      
      if (isRadiusMode) {
        // In radius mode: filter by distance from current position
        if (!formData.currentLat || !formData.currentLng || !loc.lat || !loc.lng) return false;
        const dist = calcDistance(formData.currentLat, formData.currentLng, loc.lat, loc.lng);
        if (dist > formData.radiusMeters) return false;
      } else {
        // In area mode: filter by area (supports multi-area)
        const locAreas = loc.areas || (loc.area ? [loc.area] : []);
        if (!locAreas.includes(formData.area)) return false;
      }
      
      if (!loc.interests || loc.interests.length === 0) return false;
      
      // Check if location interests match selected interests
      return loc.interests.some(locInterest => {
        // Direct match
        if (formData.interests.includes(locInterest)) return true;
        
        // Check if selected interest is a custom one with baseCategory that matches
        for (const selectedInterest of formData.interests) {
          const customInterest = allInterestOptions.find(opt => 
            opt.id === selectedInterest && opt.custom && opt.baseCategory
          );
          
          if (customInterest && locInterest === customInterest.baseCategory) {
            return true;
          }
        }
        
        return false;
      });
    });
    
    // Remove duplicates
    const seen = new Set();
    return matchingCustomLocations.filter(stop => {
      const key = `${stop.lat},${stop.lng}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // ========== SMART STOP SELECTION (for Yalla and "Help me plan") ==========
  // Returns { selected: [...], disabled: [...] } based on category/weight/minStops config
  // ── Shared: interest allocation ──────────────────────────────────────────
  // Single source of truth for per-interest stop limits.
  // Steps: 1) guarantee minimums, 2) distribute by weight up to maxStops cap,
  //        3) backfill overflow when all caps are hit (maxStops is a soft cap).
  // Returns: { [interestId]: { max, category } }
  const buildInterestLimits = (selectedInterests, maxTotal) => {
    const cfg = {};
    let totalWeight = 0;
    for (const id of selectedInterests) {
      const interestObj = allInterestOptions.find(o => o.id === id);
      cfg[id] = {
        weight: interestObj?.weight || sp.defaultInterestWeight,
        minStops: interestObj?.minStops != null ? interestObj.minStops : 1,
        maxStops: interestObj?.maxStops || 10,
        category: interestObj?.category || 'attraction'
      };
      totalWeight += cfg[id].weight;
    }

    // Step 1: Guarantee minimums
    const limits = {};
    let allocated = 0;
    for (const id of selectedInterests) {
      const min = Math.min(cfg[id].minStops, cfg[id].maxStops, maxTotal - allocated);
      limits[id] = { max: min, category: cfg[id].category };
      allocated += min;
    }

    // Step 2: Distribute remaining by weight, respecting maxStops cap
    let remaining = maxTotal - allocated;
    if (remaining > 0 && totalWeight > 0) {
      for (let pass = 0; pass < 3 && remaining > 0; pass++) {
        let activeWeight = 0;
        for (const id of selectedInterests) {
          if (limits[id].max < cfg[id].maxStops) activeWeight += cfg[id].weight;
        }
        if (activeWeight <= 0) break;
        for (const id of selectedInterests) {
          if (remaining <= 0) break;
          if (limits[id].max >= cfg[id].maxStops) continue;
          const share = Math.floor((cfg[id].weight / activeWeight) * remaining);
          const canAdd = Math.min(share, cfg[id].maxStops - limits[id].max, remaining);
          limits[id].max += canAdd;
          allocated += canAdd;
          remaining = maxTotal - allocated;
        }
      }
      // Distribute leftover 1-by-1 (still within soft cap)
      remaining = maxTotal - allocated;
      const sorted = [...selectedInterests].sort((a, b) => cfg[b].weight - cfg[a].weight);
      for (const id of sorted) {
        if (remaining <= 0) break;
        if (limits[id].max >= cfg[id].maxStops) continue;
        limits[id].max += 1;
        remaining -= 1;
      }
      // Backfill: overflow beyond soft caps when total still not filled
      remaining = maxTotal - Object.values(limits).reduce((s, l) => s + l.max, 0);
      if (remaining > 0) {
        const bfSorted = [...selectedInterests].sort((a, b) => cfg[b].weight - cfg[a].weight);
        const bfShare = {};
        let bfAllocated = 0;
        for (const id of bfSorted) {
          const share = Math.floor((cfg[id].weight / totalWeight) * remaining);
          bfShare[id] = share;
          bfAllocated += share;
        }
        let bfLeftover = remaining - bfAllocated;
        for (const id of bfSorted) {
          if (bfLeftover <= 0) break;
          bfShare[id] += 1;
          bfLeftover -= 1;
        }
        for (const id of selectedInterests) {
          limits[id].max += (bfShare[id] || 0);
        }
      }
    }
    return { limits, cfg, totalWeight };
  };

  const smartSelectStops = (stops, selectedInterests, maxTotal) => {
    maxTotal = maxTotal || formData.maxStops || 10;
    const { limits, cfg } = buildInterestLimits(selectedInterests, maxTotal);
    console.log('[SMART] Interest limits:', JSON.stringify(limits));
    
    // Group stops by their primary matching interest
    const buckets = {};
    const unmatched = [];
    for (const id of selectedInterests) buckets[id] = [];
    
    for (const stop of stops) {
      const stopInterests = stop.interests || [];
      // Find first matching selected interest
      const matchingInterest = selectedInterests.find(id => stopInterests.includes(id));
      if (matchingInterest && buckets[matchingInterest]) {
        buckets[matchingInterest].push(stop);
      } else {
        unmatched.push(stop);
      }
    }
    
    // Sort each bucket: custom/pinned first, then by time match, then by rating
    const timeMode = getEffectiveTimeMode(); // 'day' or 'night'

    // Hard time filter — generic, based on which interests the USER selected.
    // RULE: if all selected interests are 'day' → filter out 'night' stops.
    //       if all selected interests are 'night' → filter out 'day' stops.
    //       if mix of day+night → no filter (user explicitly wants both).
    //       anytime interests → never affect filter direction.
    // Custom (saved) places are always kept regardless.
    {
      const selectedBestTimes = new Set(
        selectedInterests
          .map(id => {
            const cfg = interestConfig[id];
            if (cfg?.bestTime && cfg.bestTime !== 'anytime') return cfg.bestTime;
            const hardDefault = { temples: 'day', galleries: 'day', architecture: 'day', parks: 'day',
              beaches: 'day', graffiti: 'day', artisans: 'day', canals: 'day', culture: 'day',
              history: 'day', nightlife: 'night', bars: 'night', rooftop: 'night', entertainment: 'night' };
            return hardDefault[id] || 'anytime';
          })
          .filter(bt => bt !== 'anytime')
      );
      const onlyDay = selectedBestTimes.size > 0 && !selectedBestTimes.has('night');
      const onlyNight = selectedBestTimes.size > 0 && !selectedBestTimes.has('day');
      const effectiveFilter = onlyDay ? 'day' : onlyNight ? 'night' : null; // null = no filter

      if (effectiveFilter) {
        for (const id of Object.keys(buckets)) {
          buckets[id] = buckets[id].filter(stop => {
            const isCustom = stop.source === 'custom' || stop.custom;
            if (isCustom) return true;
            const bt = getStopBestTime(stop);
            if (bt === 'anytime') return true;
            if (bt !== effectiveFilter) {
              addDebugLog('SMART', `⏰ Hard-filtered: ${stop.name} bestTime=${bt} effectiveFilter=${effectiveFilter}`);
              return false;
            }
            return true;
          });
        }
      }
    }

    // Get a stop's preferred time — uses shared getStopBestTime helper

    // Time score: matching=sp.timeScoreMatch, anytime=sp.timeScoreAnytime, conflicting=sp.timeScoreConflict
    const timeScore = (stop) => {
      const bt = getStopBestTime(stop);
      if (bt === 'anytime') return sp.timeScoreAnytime;
      return bt === timeMode ? sp.timeScoreMatch : sp.timeScoreConflict;
    };
    
    const stopScore = (s) => {
      // Google score: rating × log10(ratingCount+1) — reflects both quality and confidence
      const googleScore = (s.rating || 0) * Math.log10((s.ratingCount || 0) + 1);
      const isCustom = s.source === 'custom' || s.custom;
      if (!isCustom) {
        // Google place with low rating count → near-zero score (deprioritized, last resort)
        // Only included if nothing better available in same interest bucket
        if (s.lowRatingCount) return 0.01;
        return googleScore;
      }
      // Favorite base priority (unrated favorites get this by default)
      const base = sp.favoriteBaseScore ?? 20;
      const pk = (s.name || '').replace(/[.#$/\[\]]/g, '_');
      const ra = reviewAverages[pk];
      if (!ra || ra.count === 0) return googleScore + base; // no rating yet — default priority
      const threshold = sp.favoriteLowRatingThreshold ?? 2.5;
      if (ra.avg < threshold) {
        // Poor rating — penalize: may fall below strong Google results
        return googleScore + base - (sp.favoriteLowRatingPenalty ?? 60);
      }
      // Good rating — bonus per star (e.g. 4.5⭐ × 5 = +22.5 on top of base)
      return googleScore + base + ra.avg * (sp.favoriteBonusPerStar ?? 5);
    };
    for (const id of selectedInterests) {
      buckets[id].sort((a, b) => {
        // Time conflict overrides everything — conflicting stop goes last
        const aTime = timeScore(a);
        const bTime = timeScore(b);
        const aConflict = aTime === sp.timeScoreConflict ? 1 : 0;
        const bConflict = bTime === sp.timeScoreConflict ? 1 : 0;
        if (aConflict !== bConflict) return aConflict - bConflict;
        // Unified weighted score: favorites get base priority, adjusted by FouFou rating
        const scoreDiff = stopScore(b) - stopScore(a);
        if (Math.abs(scoreDiff) > 0.5) return scoreDiff;
        // Time match as tiebreaker
        return bTime - aTime;
      });
    }
    
    console.log(`[SMART] Time mode: ${timeMode}, sorting buckets by time preference`);
    
    // Pick top N from each bucket
    const selected = [];
    const disabled = [];
    
    for (const interestId of selectedInterests) {
      const bucket = buckets[interestId];
      const limit = limits[interestId].max;
      selected.push(...bucket.slice(0, limit));
      disabled.push(...bucket.slice(limit));
    }
    disabled.push(...unmatched);
    
    // If we have room, fill from best disabled stops (prefer time-matching)
    if (selected.length < maxTotal && disabled.length > 0) {
      disabled.sort((a, b) => {
        const aTime = timeScore(a);
        const bTime = timeScore(b);
        const aConflict = aTime === sp.timeScoreConflict ? 1 : 0;
        const bConflict = bTime === sp.timeScoreConflict ? 1 : 0;
        if (aConflict !== bConflict) return aConflict - bConflict;
        if (aTime !== bTime) return bTime - aTime;
        return stopScore(b) - stopScore(a);
      });
      const extra = disabled.splice(0, maxTotal - selected.length);
      selected.push(...extra);
    }
    
    // Smart ordering: category determines position in day
    // Derived from slot config to keep a single source of truth.
    // slot->category mapping: middle/bookend=meal, end/late=experience, early/any=attraction
    const slotToCategory = { middle: 'meal', bookend: 'meal', end: 'experience', late: 'experience', early: 'attraction', any: 'attraction' };
    const defaultSlotForCategory = {
      cafes: 'bookend', food: 'middle', restaurants: 'middle',
      markets: 'early', shopping: 'early', temples: 'any', galleries: 'any',
      architecture: 'any', parks: 'early', beaches: 'early', graffiti: 'any',
      artisans: 'any', canals: 'any', culture: 'any', history: 'any',
      nightlife: 'end', rooftop: 'end', bars: 'end', entertainment: 'late',
    };
    const getCategory = (stop) => {
      const stopInterests = stop.interests || [];
      for (const id of selectedInterests) {
        if (!stopInterests.includes(id)) continue;
        // 1. Explicit category on interest object
        const cat = limits[id]?.category;
        if (cat && cat !== 'attraction') return cat;
        // 2. Derive from interestConfig routeSlot (Firebase-configurable)
        const cfgSlot = interestConfig[id]?.routeSlot;
        if (cfgSlot && slotToCategory[cfgSlot]) return slotToCategory[cfgSlot];
        // 3. Derive from built-in slot defaults
        const builtinSlot = defaultSlotForCategory[id];
        if (builtinSlot) return slotToCategory[builtinSlot];
      }
      return 'attraction';
    };
    
    // Separate by role
    const attractions = selected.filter(s => ['attraction', 'nature', 'shopping'].includes(getCategory(s)));
    const breaks = selected.filter(s => getCategory(s) === 'break');
    const meals = selected.filter(s => getCategory(s) === 'meal');
    const experiences = selected.filter(s => getCategory(s) === 'experience');
    
    // Build ordered route: attractions with breaks/meals interspersed
    const ordered = [];
    let attractionIdx = 0;
    const totalAttractions = attractions.length;
    
    // Insert break roughly 1/3 into attractions, meal at 2/3
    const breakAt = Math.max(1, Math.floor(totalAttractions / 3));
    const mealAt = Math.max(2, Math.floor(totalAttractions * 2 / 3));
    
    for (let i = 0; i < totalAttractions; i++) {
      ordered.push(attractions[i]);
      if (i === breakAt - 1 && breaks.length > 0) ordered.push(...breaks);
      if (i === mealAt - 1 && meals.length > 0) ordered.push(...meals);
    }
    
    // If no attractions but we have breaks/meals, add them
    if (totalAttractions === 0) {
      ordered.push(...breaks, ...meals);
    }
    
    // Experiences at the end
    ordered.push(...experiences);
    
    console.log('[SMART] Selected:', ordered.length, '| Disabled:', disabled.length);
    console.log('[SMART] Order:', ordered.map(s => `${s.name} [${getCategory(s)}]`).join(' → '));
    
    return { selected: ordered, disabled };
  };

  // ========== ROUTE OPTIMIZATION (Nearest Neighbor + 2-opt) ==========
  const optimizeStopOrder = (stops, startCoords, isCircular, pinnedFirstStop = null) => {
    // pinnedFirstStop: a stop that must be at position 0 (radius center / GPS point).
    // It is excluded from the TSP optimization and prepended to the result.
    const stopsToOptimize = pinnedFirstStop
      ? stops.filter(s => s !== pinnedFirstStop && !(s.isRadiusCenter && pinnedFirstStop.isRadiusCenter))
      : stops;
    if (stopsToOptimize.length <= 1) return pinnedFirstStop ? [pinnedFirstStop, ...stopsToOptimize] : stops;
    
    // Filter stops with valid coordinates (operates on stopsToOptimize, not stops)
    const withCoords = stopsToOptimize.filter(s => s.lat && s.lng);
    const noCoords = stopsToOptimize.filter(s => !s.lat || !s.lng);
    
    if (withCoords.length <= 1) {
      const result = [...withCoords, ...noCoords];
      return pinnedFirstStop ? [pinnedFirstStop, ...result] : result;
    }
    
    // Distance matrix (using calcDistance which is Haversine)
    const dist = (a, b) => calcDistance(a.lat, a.lng, b.lat, b.lng);
    
    // --- Step 1: Nearest Neighbor from start point ---
    const unvisited = [...withCoords];
    const ordered = [];
    
    // Determine start: use startCoords if available, otherwise pick the stop closest to center
    let currentPos;
    if (startCoords?.lat && startCoords?.lng) {
      currentPos = startCoords;
    } else {
      // Use centroid of all stops as reference, pick nearest to it
      const avgLat = withCoords.reduce((s, p) => s + p.lat, 0) / withCoords.length;
      const avgLng = withCoords.reduce((s, p) => s + p.lng, 0) / withCoords.length;
      // For linear: start from the stop furthest from centroid (creates a more natural path)
      // For circular: start from stop nearest to centroid
      if (!isCircular) {
        let maxDist = -1, startIdx = 0;
        unvisited.forEach((s, i) => {
          const d = calcDistance(avgLat, avgLng, s.lat, s.lng);
          if (d > maxDist) { maxDist = d; startIdx = i; }
        });
        ordered.push(unvisited.splice(startIdx, 1)[0]);
      } else {
        let minDist = Infinity, startIdx = 0;
        unvisited.forEach((s, i) => {
          const d = calcDistance(avgLat, avgLng, s.lat, s.lng);
          if (d < minDist) { minDist = d; startIdx = i; }
        });
        ordered.push(unvisited.splice(startIdx, 1)[0]);
      }
      currentPos = ordered[0];
    }
    
    // If we have startCoords (external start point), find nearest stop to it first
    if (startCoords?.lat && startCoords?.lng && unvisited.length > 0) {
      let minDist = Infinity, nearIdx = 0;
      unvisited.forEach((s, i) => {
        const d = dist(currentPos, s);
        if (d < minDist) { minDist = d; nearIdx = i; }
      });
      ordered.push(unvisited.splice(nearIdx, 1)[0]);
      currentPos = ordered[ordered.length - 1];
    }
    
    // Greedily pick nearest unvisited
    while (unvisited.length > 0) {
      let minDist = Infinity, nearIdx = 0;
      unvisited.forEach((s, i) => {
        const d = dist(currentPos, s);
        if (d < minDist) { minDist = d; nearIdx = i; }
      });
      ordered.push(unvisited.splice(nearIdx, 1)[0]);
      currentPos = ordered[ordered.length - 1];
    }
    
    // --- Step 2: 2-opt improvement (uncross paths) ---
    const totalDist = (route) => {
      let d = 0;
      // If start coords exist, include distance from start to first stop
      if (startCoords?.lat && startCoords?.lng) {
        d += dist(startCoords, route[0]);
      }
      for (let i = 0; i < route.length - 1; i++) {
        d += dist(route[i], route[i + 1]);
      }
      // Circular: add return to start
      if (isCircular) {
        const returnTo = startCoords?.lat ? startCoords : route[0];
        d += dist(route[route.length - 1], returnTo);
      }
      return d;
    };
    
    let improved = true;
    let passes = 0;
    const maxPasses = sp.twoOptMaxPasses || 20; // 2-opt passes (each pass is O(n²), n≤15 so very fast)
    
    while (improved && passes < maxPasses) {
      improved = false;
      passes++;
      for (let i = 0; i < ordered.length - 1; i++) {
        for (let j = i + 2; j < ordered.length; j++) {
          // Check if reversing segment [i+1..j] reduces total distance
          // Only need to compare the 2 edges being broken/reconnected
          const A = i === 0 && startCoords?.lat ? startCoords : ordered[i];
          const B = ordered[i + 1];
          const C = ordered[j];
          const D = j + 1 < ordered.length ? ordered[j + 1] 
            : (isCircular ? (startCoords?.lat ? startCoords : ordered[0]) : null);
          
          const oldDist = dist(A, B) + (D ? dist(C, D) : 0);
          const newDist = dist(A, C) + (D ? dist(B, D) : 0);
          
          if (newDist < oldDist - 1) { // 1m threshold to avoid float noise
            // Reverse segment in place
            const reversed = ordered.slice(i + 1, j + 1).reverse();
            ordered.splice(i + 1, j - i, ...reversed);
            improved = true;
          }
        }
      }
    }
    
    console.log(`[OPTIMIZE] ${withCoords.length} stops, 2-opt: ${passes} passes, distance: ${Math.round(totalDist(ordered))}m (${isCircular ? 'circular' : 'linear'})`);
    
    // --- Step 3: Content-aware reordering ---
    // Adjust order so route feels natural: cafes at start/end, food in middle, no same-category neighbors
    if (ordered.length >= 4) {
      // Default slot config — overridden by interestConfig when available
      const defaultSlotConfig = {
        cafes:         { slot: 'bookend', minGap: 3, time: 'anytime' },
        food:          { slot: 'middle',  minGap: 3, time: 'anytime' },
        restaurants:   { slot: 'middle',  minGap: 3, time: 'anytime' },
        markets:       { slot: 'early',   minGap: 2, time: 'day' },
        shopping:      { slot: 'early',   minGap: 2, time: 'day' },
        temples:       { slot: 'any',     minGap: 1, time: 'day' },
        galleries:     { slot: 'any',     minGap: 1, time: 'day' },
        architecture:  { slot: 'any',     minGap: 1, time: 'day' },
        parks:         { slot: 'early',   minGap: 1, time: 'day' },
        beaches:       { slot: 'early',   minGap: 2, time: 'day' },
        graffiti:      { slot: 'any',     minGap: 1, time: 'day' },
        artisans:      { slot: 'any',     minGap: 1, time: 'day' },
        canals:        { slot: 'any',     minGap: 1, time: 'day' },
        culture:       { slot: 'any',     minGap: 1, time: 'day' },
        history:       { slot: 'any',     minGap: 1, time: 'day' },
        nightlife:     { slot: 'end',     minGap: 2, time: 'night' },
        rooftop:       { slot: 'end',     minGap: 2, time: 'night' },
        bars:          { slot: 'end',     minGap: 2, time: 'night' },
        entertainment: { slot: 'late',    minGap: 2, time: 'night' },
      };
      
      // Merge with interestConfig (user-defined values override defaults)
      const slotConfig = {};
      Object.keys(defaultSlotConfig).forEach(k => { slotConfig[k] = { ...defaultSlotConfig[k] }; });
      if (typeof interestConfig === 'object') {
        Object.entries(interestConfig).forEach(([id, cfg]) => {
          if (cfg.routeSlot || cfg.minGap || cfg.bestTime) {
            if (!slotConfig[id]) slotConfig[id] = { slot: 'any', minGap: 1, time: 'anytime' };
            if (cfg.routeSlot && cfg.routeSlot !== 'any') slotConfig[id].slot = cfg.routeSlot;
            if (cfg.minGap) slotConfig[id].minGap = cfg.minGap;
            if (cfg.bestTime && cfg.bestTime !== 'anytime') slotConfig[id].time = cfg.bestTime;
          }
        });
      }
      
      // Time-of-day compatibility scoring (simplified: day vs night)
      const timeMode = getEffectiveTimeMode();
      const timeCompat = (stopTime) => {
        if (!stopTime || stopTime === 'anytime') return 0;
        if (stopTime === timeMode) return 0;
        return sp.timeConflictPenalty;
      };
      
      const n = ordered.length;
      const getCategory = (stop) => {
        const cats = stop.interests || [];
        return cats.find(c => slotConfig[c]) || cats[0] || 'other';
      };
      const getStopTime = (stop) => {
        // Per-stop override (from bestTime field) takes priority
        if (stop.bestTime) return stop.bestTime;
        const cat = getCategory(stop);
        return slotConfig[cat]?.time || 'anytime';
      };
      
      // Score how well a stop fits its position (lower = better)
      const slotScore = (cat, pos) => {
        const cfg = slotConfig[cat];
        if (!cfg) return 0;
        const pct = n > 1 ? pos / (n - 1) : 0.5;
        switch (cfg.slot) {
          case 'bookend': return Math.min(pct, 1 - pct) * sp.slotEndPenaltyMultiplier;
          case 'early': return pct < sp.slotEarlyThreshold ? 0 : (pct - sp.slotEarlyThreshold) * sp.slotPenaltyMultiplier;
          case 'middle': return Math.abs(pct - 0.5) * sp.slotPenaltyMultiplier;
          case 'late': return pct > sp.slotLateThreshold ? 0 : (sp.slotLateThreshold - pct) * sp.slotPenaltyMultiplier;
          case 'end': return pct > sp.slotEndThreshold ? 0 : (sp.slotEndThreshold - pct) * sp.slotEndPenaltyMultiplier;
          default: return 0;
        }
      };
      
      // Penalty for same-category adjacency
      const gapPenalty = (arr) => {
        let penalty = 0;
        for (let i = 0; i < arr.length; i++) {
          const cat = getCategory(arr[i]);
          const cfg = slotConfig[cat];
          const minGap = cfg?.minGap || 1;
          for (let j = 1; j <= Math.min(minGap, i); j++) {
            if (getCategory(arr[i - j]) === cat) {
              penalty += (minGap - j + 1) * sp.gapPenaltyMultiplier;
            }
          }
        }
        return penalty;
      };
      
      // Total content penalty (includes time-of-day)
      const contentPenalty = (arr) => {
        let p = 0;
        for (let i = 0; i < arr.length; i++) {
          p += slotScore(getCategory(arr[i]), i);
          p += timeCompat(getStopTime(arr[i])); // Time mismatch penalty
        }
        p += gapPenalty(arr);
        return p;
      };
      
      // Geographic distance of the order
      const geoDist = (arr) => totalDist(arr);
      const baseGeo = geoDist(ordered);
      const basePenalty = contentPenalty(ordered);
      
      // Only apply if there are actual content issues AND feature is enabled
      if (basePenalty > 0.5 && sp.contentReorderEnabled !== false) {
        // Try targeted swaps that improve content without too much geographic cost
        let contentImproved = true;
        let contentPasses = 0;
        const maxContentPasses = sp.maxContentPasses;
        const maxGeoIncrease = sp.maxContentGeoIncrease || 0.05;
        
        while (contentImproved && contentPasses < maxContentPasses) {
          contentImproved = false;
          contentPasses++;
          // When pinnedFirstStop is set, start from i=1 — position 0 is locked
          const startIdx = pinnedFirstStop ? 1 : 0;
          for (let i = startIdx; i < ordered.length; i++) {
            for (let j = i + 1; j < ordered.length; j++) {
              const curPenalty = contentPenalty(ordered);
              // Try swap
              [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
              const newPenalty = contentPenalty(ordered);
              const newGeo = geoDist(ordered);
              const geoIncrease = (newGeo - baseGeo) / Math.max(baseGeo, 1);
              
              // Accept if content improves AND geographic cost stays within threshold
              if (newPenalty < curPenalty - 0.3 && geoIncrease < maxGeoIncrease) {
                contentImproved = true;
                // Keep swap
              } else {
                // Revert
                [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
              }
            }
          }
        }
        
        const finalPenalty = contentPenalty(ordered);
        const finalGeo = geoDist(ordered);
        console.log(`[CONTENT-REORDER] mode=${timeMode}, ${contentPasses} passes, penalty ${basePenalty.toFixed(1)} → ${finalPenalty.toFixed(1)}, distance ${Math.round(baseGeo)}m → ${Math.round(finalGeo)}m (max ${Math.round(maxGeoIncrease*100)}% increase allowed)`);
      }
    }
    
    // Append stops without coordinates at the end
    // If pinnedFirstStop exists, prepend it — it is always position 0 (letter A), untouched by TSP
    return pinnedFirstStop
      ? [pinnedFirstStop, ...ordered, ...noCoords]
      : [...ordered, ...noCoords];
  };

  const generateRoute = async (extraManualStop = null) => {
    searchRunIdRef.current = Date.now().toString();
    const isRadiusMode = formData.searchMode === 'radius' || formData.searchMode === 'all';
    
    // Clear old start point to avoid stale data
    setStartPointCoords(null);
    setFormData(prev => ({...prev, startPoint: ''}));
    
    // For 'all' mode, auto-set city center and large radius
    if (formData.searchMode === 'all') {
      if (!formData.currentLat) {
        const cityCenter = window.BKK.selectedCity?.center || window.BKK.activeCityData?.center || { lat: 0, lng: 0 };
        const cityRadius = window.BKK.selectedCity?.allCityRadius || 15000;
        const cityName = tLabel(window.BKK.selectedCity) || t('general.allCity');
        const allCityLabel = t('general.all') + ' ' + cityName;
        setFormData(prev => ({...prev, currentLat: cityCenter.lat, currentLng: cityCenter.lng, radiusMeters: cityRadius, radiusPlaceName: allCityLabel}));
        formData.currentLat = cityCenter.lat;
        formData.currentLng = cityCenter.lng;
        formData.radiusMeters = cityRadius;
        formData.radiusPlaceName = allCityLabel;
      }
    }
    
    if (isRadiusMode) {
      if (!formData.currentLat || !formData.currentLng) {
        showToast(t('form.findLocationFirst'), 'warning');
        return;
      }
      if (formData.interests.length === 0) {
        showToast(t('form.selectAtLeastOneInterest'), 'warning');
        return;
      }
    } else {
      if (!formData.area && formData.interests.length === 0) {
        showToast(t('form.selectAreaAndInterest'), 'warning');
        return;
      }
      if (!formData.area) {
        showToast(t('form.selectAreaFirst'), 'warning');
        return;
      }
      if (formData.interests.length === 0) {
        showToast(t('form.selectAtLeastOneInterest'), 'warning');
        return;
      }
    }
    
    setIsGenerating(true);
    
    try {
      // SAFETY: Filter out disabled interests that may be stale in formData
      const activeInterests = formData.interests.filter(id => {
        const opt = allInterestOptions.find(o => o.id === id);
        if (!opt) return false;
        // Admin status: hidden=never searchable, draft=admin only
        const aStatus = opt.adminStatus || 'active';
        if (aStatus === 'hidden') return false;
        if (aStatus === 'draft' && !isUnlocked) return false;
        if (opt.scope === 'local' && opt.cityId && opt.cityId !== selectedCityId) return false;
        return true;
      });
      if (activeInterests.length !== formData.interests.length) {
        const removed = formData.interests.filter(id => !activeInterests.includes(id));
        console.warn('[ROUTE] ⚠️ Removed disabled interests from search:', removed);
        setFormData(prev => ({ ...prev, interests: activeInterests }));
        if (activeInterests.length === 0) {
          showToast(t('form.selectAtLeastOneInterest'), 'warning');
          setIsGenerating(false);
          return;
        }
      }
      // Use activeInterests for the rest of this generation
      const searchInterests = activeInterests;
      
      addDebugLog('ROUTE', 'Starting route generation', { 
        mode: formData.searchMode, 
        area: formData.area, 
        radius: isRadiusMode ? formData.radiusMeters : null,
        interests: searchInterests, 
        maxStops: formData.maxStops 
      });
      console.log('[ROUTE] Starting route generation', isRadiusMode ? 'RADIUS mode' : 'AREA mode');
      console.log('[ROUTE] Selected interests:', JSON.stringify(searchInterests));
      console.log('[ROUTE] Area:', formData.area, '| SearchMode:', formData.searchMode);
      
      // Get custom locations (always included)
      const customStops = getStopsForInterests();
      addDebugLog('ROUTE', `Found ${customStops.length} custom stops`);
      console.log('[ROUTE] Custom stops:', customStops.length, customStops.map(s => `${s.name} [${(s.interests||[]).join(',')}]`));
      
      // Calculate stops needed per interest — single source of truth via buildInterestLimits
      const maxStops = formData.maxStops || 10;
      const { limits: limitsObj, cfg: interestCfg, totalWeight } = buildInterestLimits(searchInterests, maxStops);
      // Flatten to plain number map for backward compat with rest of route code
      const interestLimits = {};
      for (const id of searchInterests) interestLimits[id] = limitsObj[id].max;
      console.log('[ROUTE] Interest limits:', JSON.stringify(interestLimits), '| total max:', maxStops);
      
      // Track results per interest for smart completion
      const interestResults = {};
      const allStops = []; // Build this respecting limits
      let fetchErrors = [];
      
      // Clear Google cache for fresh route generation
      googleCacheRef.current = {};
      
      // ROUND 1: Collect custom stops first, then fire all Google API calls in parallel

      // Step A: collect custom stops per interest and add to allStops (Set-based dedup)
      const customPerInterest = {};
      const addedCustomNames = new Set();
      for (const interest of searchInterests) {
        const stopsForThisInterest = interestLimits[interest] || 2;
        const customToUse = customStops
          .filter(stop => stop.interests && stop.interests.includes(interest))
          .slice(0, stopsForThisInterest);
        customPerInterest[interest] = customToUse;
        for (const cs of customToUse) {
          const key = (cs.name || '').toLowerCase().trim();
          if (!addedCustomNames.has(key)) {
            addedCustomNames.add(key);
            // Pick best matching interest: prefer the most specific (whose dedupRelated includes another match)
            const allMatches = searchInterests.filter(si => (cs.interests || []).includes(si));
            let bestMatch = interest;
            if (allMatches.length > 1) {
              for (const m of allMatches) {
                const rel = (interestConfig[m]?.dedupRelated || []);
                if (allMatches.some(other => other !== m && rel.includes(other))) { bestMatch = m; break; }
              }
            }
            const reorderedInterests = [bestMatch, ...(cs.interests || []).filter(i => i !== bestMatch)];
            allStops.push({ ...cs, interests: reorderedInterests, _debug: {
              source: 'custom',
              interestId: bestMatch,
              interestLabel: tLabel(allInterestOptions.find(o => o.id === bestMatch)) || bestMatch,
              area: formData.area || 'radius',
              searchMode: formData.searchMode,
              timestamp: Date.now()
            }});
          }
        }
      }

      // Step B: fire all Google API calls in parallel
      const fetchResults = await Promise.all(searchInterests.map(async interest => {
        const interestObj = allInterestOptions.find(o => o.id === interest);
        if (interestObj?.privateOnly || interestConfig?.[interest]?.noGoogleSearch) {
          console.log(`[ROUTE] Skipping API for internal/private interest: ${interest}`);
          // Log to filter log as internal interest (no Google search)
          const interestLabelSkip = allInterestOptions.find(o => o.id === interest);
          addToFilterLog({
            interestId: interest,
            interestLabel: tLabel(interestLabelSkip) || interest,
            searchType: 'internal',
            query: null,
            placeTypes: null,
            blacklist: [],
            nameKeywords: [],
            allResults: [],
            requestDetails: {
              mode: 'internal',
              query: 'פנימי — ללא חיפוש גוגל',
              types: null,
              center: null,
              radius: null,
              locationMode: 'none',
              rawFromGoogle: 0,
              googleMapsUrl: null,
            },
          });
          return { interest, places: [] };
        }
        try {
          const stopsForThisInterest = interestLimits[interest] || 2;
          console.log(`[ROUTE] Fetching for interest: ${interest} (limit ${stopsForThisInterest}, have ${customPerInterest[interest].length} custom)`);
          const radiusOverride = isRadiusMode ? {
            lat: formData.currentLat,
            lng: formData.currentLng,
            radius: formData.radiusMeters
          } : null;
          const places = await fetchGooglePlaces(isRadiusMode ? null : formData.area, [interest], radiusOverride);
          return { interest, places };
        } catch (error) {
          fetchErrors.push({ interest, error: error.message || 'Unknown error', details: error.details || {} });
          console.error(`[ERROR] Failed to fetch for ${interest}:`, error);
          // Log to filter log so user can see the failure
          const interestLabelErr = allInterestOptions.find(o => o.id === interest);
          addToFilterLog({
            interestId: interest,
            interestLabel: tLabel(interestLabelErr) || interest,
            searchType: 'error',
            query: null,
            placeTypes: null,
            blacklist: [],
            nameKeywords: [],
            allResults: [],
            requestDetails: {
              mode: 'error',
              query: error.message || 'Unknown error',
              types: null,
              center: null,
              radius: null,
              locationMode: window.BKK.systemParams?.googleLocationMode || 'restriction',
              rawFromGoogle: 0,
              googleMapsUrl: null,
            },
          });
          return { interest, places: [] };
        }
      }));

      // Step C: process each result and build allStops
      for (const { interest, places: rawPlaces } of fetchResults) {
        const stopsForThisInterest = interestLimits[interest] || 2;
        const customToUse = customPerInterest[interest];

        let fetchedPlaces = rawPlaces;

        // Filter blacklisted places (status='blacklist') BEFORE sorting
        fetchedPlaces = filterBlacklist(fetchedPlaces);

        // Filter out Google places that duplicate custom locations
        fetchedPlaces = filterDuplicatesOfCustom(fetchedPlaces);

        // In radius mode: HARD filter by actual distance (API locationBias doesn't guarantee this)
        if (isRadiusMode) {
          const beforeFilter = fetchedPlaces.length;
          fetchedPlaces = fetchedPlaces.filter(p => {
            const dist = calcDistance(formData.currentLat, formData.currentLng, p.lat, p.lng);
            return dist <= formData.radiusMeters;
          });
          const removed = beforeFilter - fetchedPlaces.length;
          if (removed > 0) {
            addDebugLog('RADIUS', `Filtered ${removed} places beyond ${formData.radiusMeters}m radius`);
            console.log(`[RADIUS] Filtered ${removed}/${beforeFilter} places beyond radius`);
          }
        }

        // Sort
        let sortedAll;
        if (isRadiusMode) {
          sortedAll = fetchedPlaces
            .map(p => ({ ...p, _dist: calcDistance(formData.currentLat, formData.currentLng, p.lat, p.lng) }))
            .sort((a, b) => a._dist - b._dist || (b.rating * Math.log10((b.ratingCount || 0) + 1)) - (a.rating * Math.log10((a.ratingCount || 0) + 1)));
        } else {
          sortedAll = [...fetchedPlaces]
            .sort((a, b) => (b.rating * Math.log10((b.ratingCount || 0) + 1)) - (a.rating * Math.log10((a.ratingCount || 0) + 1)));
        }

        // Take only what's needed beyond custom stops already added
        const actualNeeded = Math.max(0, stopsForThisInterest - customToUse.length);
        const sortedPlaces = sortedAll.slice(0, actualNeeded);
        const cachedPlaces = sortedAll.slice(actualNeeded);

        if (actualNeeded === 0) {
          console.log(`[ROUTE] ${interest}: have ${customToUse.length} custom, limit=${stopsForThisInterest} → skipping Google results (actualNeeded=0)`);
        }

        // Store unused places in cache for "find more"
        googleCacheRef.current[interest] = cachedPlaces;
        console.log(`[ROUTE] 📋 ${interest}: picked ${sortedPlaces.length}/${sortedAll.length}, cached ${cachedPlaces.length}`);
        if (sortedPlaces.length > 0) {
          sortedPlaces.forEach((p, i) => {
            console.log(`  ✅ ${i+1}. ${p.name} — ⭐${p.rating} (${p.ratingCount})`);
          });
        }
        if (cachedPlaces.length > 0) {
          console.log(`  [cached: ${cachedPlaces.slice(0, 5).map(p => p.name).join(', ')}${cachedPlaces.length > 5 ? '...' : ''}]`);
        }

        // Track results
        interestResults[interest] = {
          requested: stopsForThisInterest,
          custom: customToUse.length,
          fetched: sortedPlaces.length,
          total: customToUse.length + sortedPlaces.length,
          allPlaces: sortedAll // Keep all for round 2 (already sorted)
        };

        // Add to allStops
        allStops.push(...sortedPlaces);
      }
      
      // Remove duplicates after round 1 - check ONLY exact name match
      // Allow same coordinates with different names (same physical location, different interests)
      const seen = new Set();
      let uniqueStops = allStops.filter(stop => {
        const normalizedName = stop.name.toLowerCase().trim();
        
        if (seen.has(normalizedName)) {
          console.log('[DEDUP] Removed duplicate by exact name:', stop.name);
          return false;
        }
        
        seen.add(normalizedName);
        return true;
      });
      
      // ROUND 2: If we didn't reach maxStops, try to add more from successful interests
      // BUT respect per-interest maxStops caps
      const totalFound = uniqueStops.length;
      const missing = maxStops - totalFound;
      
      console.log('[ROUTE] Round 1 complete:', { totalFound, maxStops, missing });
      
      if (missing > 0) {
        // Count how many stops we already have per interest
        const currentCountPerInterest = {};
        for (const interest of searchInterests) currentCountPerInterest[interest] = 0;
        for (const stop of uniqueStops) {
          for (const interest of searchInterests) {
            if (stop.interests?.includes(interest)) {
              currentCountPerInterest[interest] = (currentCountPerInterest[interest] || 0) + 1;
            }
          }
        }
        
        const additionalPlaces = [];
        
        for (const interest of searchInterests) {
          const result = interestResults[interest];
          const alreadyUsed = result.fetched;
          const available = result.allPlaces.length;
          const canAddMore = available - alreadyUsed;
          
          // Use interestLimits (includes backfill overflow) not raw maxStops cap
          const interestMax = interestLimits[interest];
          const currentCount = currentCountPerInterest[interest] || 0;
          const roomLeft = Math.max(0, interestMax - currentCount);
          
          if (canAddMore > 0 && roomLeft > 0) {
            // allPlaces is already sorted from Round 1 — just slice the next batch
            const morePlaces = result.allPlaces
              .slice(alreadyUsed, alreadyUsed + Math.min(canAddMore, roomLeft));
            
            additionalPlaces.push(...morePlaces);
            console.log(`[ROUTE R2] ${interest}: adding ${morePlaces.length} (current: ${currentCount}, limit: ${interestMax})`);
          } else if (canAddMore > 0) {
            console.log(`[ROUTE R2] ${interest}: skipped, already at limit (${currentCount}/${interestMax})`);
          }
        }
        
        // Add additional places up to the missing amount
        const ratingSort2 = (a, b) => (b.rating * Math.log10((b.ratingCount || 0) + 1)) - (a.rating * Math.log10((a.ratingCount || 0) + 1));
        const distSort2 = (a, b) => calcDistance(formData.currentLat, formData.currentLng, a.lat, a.lng) - calcDistance(formData.currentLat, formData.currentLng, b.lat, b.lng);
        const sorted = additionalPlaces
          .sort(isRadiusMode ? distSort2 : ratingSort2)
          .slice(0, missing);
        
        uniqueStops = [...uniqueStops, ...sorted];
        
        // Remove duplicates again - check ONLY exact name match
        const seenNames = new Set();
        const finalStops = [];
        
        for (const stop of uniqueStops) {
          const normalizedName = stop.name.toLowerCase().trim();
          
          if (!seenNames.has(normalizedName)) {
            finalStops.push(stop);
            seenNames.add(normalizedName);
          } else {
            console.log('[DEDUP Round 2] Removed duplicate:', stop.name);
          }
        }
        
        uniqueStops = finalStops;
        
        console.log('[ROUTE] Round 2 complete:', { added: sorted.length, total: uniqueStops.length });
        
        // Update Google cache: remove places that Round 2 used
        const usedInRound2 = new Set(sorted.map(s => s.name.toLowerCase().trim()));
        for (const interest of searchInterests) {
          if (googleCacheRef.current[interest]?.length > 0) {
            googleCacheRef.current[interest] = googleCacheRef.current[interest]
              .filter(p => !usedInRound2.has((p.name || '').toLowerCase().trim()));
          }
        }
      }

      // ROUND 3: If still short of maxStops, fill from any interest with remaining places — no limit cap.
      // Handles the case where one interest had fewer results than allocated (e.g. museums limit=8 but only 2 available)
      // and another has plenty (e.g. restaurants limit=2 but 9 available). Fill the gap by best rating.
      const stillMissing = maxStops - uniqueStops.length;
      if (stillMissing > 0) {
        console.log(`[ROUTE] Round 3: ${uniqueStops.length}/${maxStops} — trying to fill ${stillMissing} remaining slots`);
        const usedNames3 = new Set(uniqueStops.map(s => s.name.toLowerCase().trim()));
        const extraPlaces = [];
        for (const interest of searchInterests) {
          const result = interestResults[interest];
          if (!result) continue;
          const remaining = (result.allPlaces || []).filter(p => !usedNames3.has((p.name || '').toLowerCase().trim()));
          extraPlaces.push(...remaining);
        }
        if (extraPlaces.length > 0) {
          const ratingSort3 = (a, b) => (b.rating * Math.log10((b.ratingCount || 0) + 1)) - (a.rating * Math.log10((a.ratingCount || 0) + 1));
          const distSort3 = (a, b) => calcDistance(formData.currentLat, formData.currentLng, a.lat, a.lng) - calcDistance(formData.currentLat, formData.currentLng, b.lat, b.lng);
          const toAdd = extraPlaces.sort(isRadiusMode ? distSort3 : ratingSort3).slice(0, stillMissing);
          uniqueStops = [...uniqueStops, ...toAdd];
          console.log(`[ROUTE] Round 3 complete: added ${toAdd.length}, total now ${uniqueStops.length}/${maxStops}`);
        }
      }
      
      // Show errors if any occurred
      if (fetchErrors.length > 0) {
        const errorMsg = fetchErrors.map(e => `${e.interest}: ${e.error}`).join(', ');
        
        console.error('[ROUTE] Data source errors:', fetchErrors);
        showToast(`${t("toast.errorsGettingPlaces")} ${errorMsg}`, 'warning');
      }
      
      // In radius mode: detect area for each stop + filter out places outside known areas + add distance
      if (isRadiusMode) {
        // In radius mode: keep all stops within distance — area membership is irrelevant
        uniqueStops = uniqueStops.map(stop => {
          const detectedArea = detectAreaFromCoords(stop.lat, stop.lng);
          const distFromCenter = Math.round(calcDistance(formData.currentLat, formData.currentLng, stop.lat, stop.lng));
          // Use detected area or fall back to closest area — never discard based on area
          const closestArea = detectedArea || window.BKK.getClosestArea(stop.lat, stop.lng) || formData.area;
          return { ...stop, detectedArea: closestArea, distFromCenter };
        });
      } else {
        // In area mode: set detectedArea = formData.area for all
        uniqueStops = uniqueStops.map(stop => ({ ...stop, detectedArea: formData.area }));
      }
      
      if (uniqueStops.length === 0) {
        showToast(isRadiusMode 
          ? t('places.noPlacesInRadius') 
          : t('places.noMatchingPlaces'), 'error');
        setIsGenerating(false);
        return;
      }

      // Sort uniqueStops for display: slot position first, then time-conflict, then custom/rating.
      {
        const timeMode = getEffectiveTimeMode();
        // Same slot mapping as optimizeStopOrder — single source of truth
        const slotOrder = { early: 1, any: 2, bookend: 2, middle: 3, late: 4, end: 4 };
        const defaultSlotForId = {
          cafes: 'bookend', food: 'middle', restaurants: 'middle',
          markets: 'early', shopping: 'early', temples: 'any', galleries: 'any',
          architecture: 'any', parks: 'early', beaches: 'early', graffiti: 'any',
          artisans: 'any', canals: 'any', culture: 'any', history: 'any',
          nightlife: 'end', rooftop: 'end', bars: 'end', entertainment: 'late',
        };
        const getSlotOrder = (stop) => {
          for (const id of (stop.interests || [])) {
            if (!searchInterests.includes(id)) continue;
            const cfgSlot = interestConfig[id]?.routeSlot;
            const slot = cfgSlot || defaultSlotForId[id] || 'any';
            return slotOrder[slot] ?? 2;
          }
          return 2;
        };
        uniqueStops.sort((a, b) => {
          // 1. Slot position (early before middle before end)
          const aSlot = getSlotOrder(a);
          const bSlot = getSlotOrder(b);
          if (aSlot !== bSlot) return aSlot - bSlot;          // 2. Time conflict (conflicting goes last within same slot)
          const aTime = getStopBestTime(a);
          const bTime = getStopBestTime(b);
          const aConflict = (aTime !== 'anytime' && aTime !== timeMode) ? 1 : 0;
          const bConflict = (bTime !== 'anytime' && bTime !== timeMode) ? 1 : 0;
          if (aConflict !== bConflict) return aConflict - bConflict;
          // 3. Custom first, then rating
          const aCustom = (a.source === 'custom' || a.custom) ? 1 : 0;
          const bCustom = (b.source === 'custom' || b.custom) ? 1 : 0;
          if (aCustom !== bCustom) return bCustom - aCustom;
          return (b.rating * Math.log10((b.ratingCount || 0) + 1)) - (a.rating * Math.log10((a.ratingCount || 0) + 1));
        });
      }

      // Route name and area info
      let areaName, interestsText;
      if (isRadiusMode) {
        const allCityLabel = t('general.all') + ' ' + (tLabel(window.BKK.selectedCity) || t('general.city'));
        if (formData.searchMode === 'all' || formData.radiusPlaceName === allCityLabel || formData.radiusPlaceName === t('general.allCity')) {
          areaName = allCityLabel;
        } else {
          const sourceName = formData.radiusSource === 'myplace' && formData.radiusPlaceId
            ? customLocations.find(l => l.id === formData.radiusPlaceId)?.name || t('form.myPlace')
            : formData.radiusSource === 'gps'
            ? t('wizard.myLocation')
            : formData.radiusPlaceName || t('form.currentLocation');
          areaName = `${formData.radiusMeters}m - ${sourceName}`;
        }
      } else {
        const selectedArea = areaOptions.find(a => a.id === formData.area);
        areaName = tLabel(selectedArea) || t('general.allCity');
      }
      interestsText = searchInterests
        .map(id => allInterestOptions.filter(o => o && o.id).find(o => o.id === id)).map(o => o ? tLabel(o) : null)
        .filter(Boolean)
        .join(', ');
      
      // Find highest sequential number for similar routes
      const baseName = `${areaName} - ${interestsText}`;
      const existingNumbers = savedRoutes
        .filter(r => r.name && r.name.startsWith(baseName))
        .map(r => {
          const match = r.name.match(/#(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        });
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const defaultName = `${baseName} #${nextNumber}`;
      
      const newRoute = {
        id: Date.now(),
        name: '', // Will be set when user saves
        defaultName: defaultName,
        createdAt: new Date().toISOString(),
        areaName: areaName,
        interestsText: interestsText,
        title: `${areaName} - ${uniqueStops.length} ${t("route.places")}`,
        description: `Route ${routeType === 'circular' ? t('route.circular') : t('route.linear')}`,
        duration: formData.hours, // Keep for backward compatibility but not displayed
        circular: routeType === 'circular',
        startPoint: (startPointCoords?.address) || formData.startPoint || t('form.startPointFirst'),
        startPointCoords: startPointCoords || null,
        stops: uniqueStops,
        preferences: { ...formData, interests: searchInterests },
        stats: (() => {
          const googleCount = Object.values(interestResults).reduce((sum, r) => sum + (r.fetched || 0), 0);
          return {
            custom: customStops.length,
            fetched: googleCount,
            total: uniqueStops.length,
            maxStops: maxStops,
            interestLimits: { ...interestLimits },
            interestResults: Object.fromEntries(
              Object.entries(interestResults).map(([k, v]) => [k, { custom: v.custom, google: v.fetched, total: v.total, limit: interestLimits[k] }])
            )
          };
        })(),
        // Warning if didn't reach maxStops
        incomplete: uniqueStops.length < maxStops ? {
          requested: maxStops,
          found: uniqueStops.length,
          missing: maxStops - uniqueStops.length
        } : null,
        // Errors if any
        errors: fetchErrors.length > 0 ? fetchErrors : null,
        optimized: false
      };

      // Include manually added stops (if any)
      const allManualStops = extraManualStop
        ? [extraManualStop, ...manualStops.filter(s => !s.isRadiusCenter)]
        : manualStops;
      if (allManualStops.length > 0) {
        const existingNames = new Set(uniqueStops.map(s => (s.name || '').toLowerCase().trim()));
        const nonDuplicateManual = allManualStops.filter(ms => !existingNames.has((ms.name || '').toLowerCase().trim()));
        if (nonDuplicateManual.length > 0) {
          // Radius center goes first (gets letter A), other manual stops go at the end
          const radiusCenterStops = nonDuplicateManual.filter(s => s.isRadiusCenter);
          const otherManual = nonDuplicateManual.filter(s => !s.isRadiusCenter);
          newRoute.stops = [...radiusCenterStops, ...newRoute.stops, ...otherManual];
          newRoute.stats.manual = nonDuplicateManual.length;
          newRoute.stats.total = newRoute.stops.length;
          // Mark as optimized so letter circles render immediately (radius center = letter A)
          if (radiusCenterStops.length > 0) newRoute.optimized = true;
        }
      }
      // Set radius center as start point AFTER route is built
      if (extraManualStop?.isRadiusCenter) {
        const sp = { lat: extraManualStop.lat, lng: extraManualStop.lng, address: extraManualStop.name };
        setStartPointCoords(sp);
        startPointCoordsRef.current = sp;
      }

      console.log('[ROUTE] Route created successfully:', {
        stops: newRoute.stops.length,
        stats: newRoute.stats,
        incomplete: newRoute.incomplete,
        errors: newRoute.errors
      });

      setRoute(newRoute);
      userManualOrderRef.current = false; // new route resets manual order flag
      // Analytics
      window.BKK.logEvent?.('route_generated', {
        city: selectedCityId,
        stops: newRoute.stops.length,
        interests: formData.interests?.length || 0,
        area: formData.area || 'radius',
        has_favorites: (newRoute.stats?.custom || 0) > 0 ? 1 : 0
      });

      // ── Friendly stats toast — interests ordered as they appear in route ──
      (() => {
        // Build ordered list of interests as they appear in route (same order as results screen)
        const seenInterests = [];
        newRoute.stops.forEach(stop => {
          (stop.interests || []).forEach(id => {
            if (!seenInterests.includes(id)) seenInterests.push(id);
          });
        });

        const selectedIds = newRoute.preferences?.interests || formData.interests || [];
        const interestCounts = {};
        newRoute.stops.forEach(stop => {
          (stop.interests || []).forEach(id => {
            interestCounts[id] = (interestCounts[id] || 0) + 1;
          });
        });

        const interestLines = seenInterests
          .filter(id => selectedIds.includes(id))
          .map(id => {
            const opt = allInterestOptions.find(o => o.id === id);
            if (!opt) return null;
            const iconRaw = opt.icon || '';
            const isImageIcon = iconRaw.startsWith('data:') || iconRaw.startsWith('http');
            const baseOpt = isImageIcon ? allInterestOptions?.find(o => o.id === id) : null;
            const icon = isImageIcon
              ? ((baseOpt?.icon && !baseOpt.icon.startsWith('data:')) ? baseOpt.icon + ' ' : '🏷️ ')
              : (iconRaw ? iconRaw + ' ' : '');
            const label = tLabel(opt) || opt.labelEn || id;
            const n = interestCounts[id] || 0;
            return `${icon}${label} (${n})`;
          })
          .filter(Boolean)
          .join('\n');

        const customInRoute = newRoute.stops.filter(s => s.custom).length;
        const googleInRoute = newRoute.stops.filter(s => !s.custom).length;
        let sourceLine = '';
        if (customInRoute > 0 && googleInRoute > 0)
          sourceLine = t('toast.statsSourceMixed').replace('{custom}', customInRoute).replace('{google}', googleInRoute);
        else if (customInRoute > 0)
          sourceLine = t('toast.statsSourceCustomOnly');
        else if (googleInRoute > 0)
          sourceLine = t('toast.statsSourceGoogleOnly');

        const msg = [
          t('toast.statsTitle'),
          t('toast.statsInterestsHeader'),
          interestLines,
          sourceLine,
          t('toast.statsHint'),
        ].filter(Boolean).join('\n');
        showToast(msg, 'info');
      })();

      // Save debug session for field debugging
      saveDebugSession(newRoute);
      
      // Load review averages for all custom places
      const customNames = newRoute.stops
        .filter(s => s.custom || customLocations.find(cl => cl.name === s.name))
        .map(s => s.name);
      if (customNames.length > 0) loadReviewAverages(customNames);
      
      // Clean up disabled stops: keep only those that still exist in the new route
      if (disabledStops.length > 0) {
        const newStopNames = new Set(newRoute.stops.map(s => (s.name || '').toLowerCase().trim()));
        const stillRelevant = disabledStops.filter(name => newStopNames.has(name));
        if (stillRelevant.length !== disabledStops.length) {
          console.log('[ROUTE] Cleaned disabled stops:', disabledStops.length, '->', stillRelevant.length);
          setDisabledStops(stillRelevant);
        }
      }
      
      console.log('[ROUTE] Route set, staying in form view');
      console.log('[ROUTE] Route object:', newRoute);
      
      // Scroll to top for Yalla button
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      
      // Stay in form view to show compact list
    } catch (error) {
      console.error('[ROUTE] Fatal error generating route:', error);
      showToast(`${t('general.error')}: ${error.message || t('general.unknownError')}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Recompute route for map — returns data for immediate use (avoids React state timing issues)
  // When skipSmartSelect=true, respects current disabledStops (for user manual changes)
  // Thin wrapper for backward compatibility — delegates to runSmartPlan
  // Uses routeTypeRef to avoid stale closures in useEffect/setTimeout
  // Keep runSmartPlanRef updated so scheduleReoptimize always uses latest version
  runSmartPlanRef.current = runSmartPlan;

  const recomputeForMap = (overrideStart, overrideType, skipSmartSelect) => {
    const type = overrideType !== undefined ? overrideType : routeTypeRef.current;
    return runSmartPlan({ overrideStart, overrideType: type, skipSmartSelect });
  };

  // Fetch more places for a specific interest
  // Priority: 1) unused custom locations  2) Google cache  3) new API call
  const fetchMoreForInterest = async (interest) => {
    if (!route) return;
    
    setIsGenerating(true);
    
    try {
      const fetchCount = formData.fetchMoreCount || 3;
      const isRadiusMode = formData.searchMode === 'radius' || formData.searchMode === 'all';
      const existingNames = route.stops.map(s => s.name.toLowerCase().trim());
      const interestLabel = allInterestOptions.find(o => o.id === interest)?.label || interest;
      let placesToAdd = [];
      let source = '';
      
      console.log(`[FETCH_MORE] Need ${fetchCount} more for ${interest}`);
      
      // Pre-compute: all custom interest IDs whose baseCategory === this interest
      // e.g. if graffiti is built-in and custom_XYZ has baseCategory:'graffiti', locations tagged with custom_XYZ also qualify
      const relatedCustomInterestIds = new Set(
        allInterestOptions
          .filter(opt => opt.custom && opt.baseCategory === interest)
          .map(opt => opt.id)
      );

      // LAYER 1: Unused custom locations for this interest
      const unusedCustom = customLocations.filter(loc => {
        if (loc.status === 'blacklist') return false;
        if (!isLocationValid(loc)) return false;
        if (!loc.interests || !loc.interests.some(li => {
          if (li === interest) return true;                          // direct match
          if (relatedCustomInterestIds.has(li)) return true;        // custom sub-interest of this built-in
          // Legacy: if interest itself is custom with baseCategory (old path)
          const ci = allInterestOptions.find(opt => opt.id === interest && opt.custom && opt.baseCategory);
          return ci && li === ci.baseCategory;
        })) return false;
        // Must be in area/radius
        if (isRadiusMode) {
          // Radius mode: filter by distance if both have coords; accept coord-less if in area
          if (!formData.currentLat || !formData.currentLng) return false;
          if (loc.lat && loc.lng) {
            return calcDistance(formData.currentLat, formData.currentLng, loc.lat, loc.lng) <= formData.radiusMeters;
          }
          // No coords on loc — include anyway (coord-less favorites still worth showing)
          return true;
        } else {
          // Area mode: exact match only — same logic as getStopsForInterests (Round 1)
          const locAreas = loc.areas || (loc.area ? [loc.area] : []);
          return locAreas.includes(formData.area);
        }
        // Not already in route
      }).filter(loc => !existingNames.includes((loc.name || '').toLowerCase().trim()));
      
      if (unusedCustom.length > 0) {
        const toAdd = unusedCustom.slice(0, fetchCount);
        placesToAdd = toAdd.map(p => ({ ...p, addedLater: true }));
        source = t('general.fromMyPlaces');
        console.log(`[FETCH_MORE] Found ${toAdd.length} from unused custom locations`);
      }
      
      // LAYER 2: Google cache (unused results from initial route generation)
      if (placesToAdd.length < fetchCount) {
        const cached = googleCacheRef.current[interest] || [];
        const allUsedNames = [...existingNames, ...placesToAdd.map(p => p.name.toLowerCase().trim())];
        const unusedCached = cached.filter(p => !allUsedNames.includes(p.name.toLowerCase().trim()));
        
        if (unusedCached.length > 0) {
          const needed = fetchCount - placesToAdd.length;
          const fromCache = unusedCached.slice(0, needed).map(p => ({
            ...p,
            addedLater: true,
            detectedArea: isRadiusMode ? detectAreaFromCoords(p.lat, p.lng) : formData.area
          }));
          placesToAdd.push(...fromCache);
          // Update cache: remove used ones
          googleCacheRef.current[interest] = unusedCached.slice(needed);
          source = source ? `${source} + ${t('general.fromGoogleCache') || t('general.fromGoogle')}` : t('general.fromGoogle');
          console.log(`[FETCH_MORE] Added ${fromCache.length} from Google cache (${googleCacheRef.current[interest].length} remaining)`);
        }
      }
      
      // LAYER 3: New API call (only if still need more AND not private-only)
      if (placesToAdd.length < fetchCount) {
        // Check privateOnly
        const interestObjFM = allInterestOptions.find(o => o.id === interest);
        const isPrivate = interestObjFM?.privateOnly || interestConfig?.[interest]?.noGoogleSearch || false;
        
        if (isPrivate) {
          console.log(`[FETCH_MORE] Private interest ${interest} - skipping API call`);
        } else {
        const needed = fetchCount - placesToAdd.length;
        console.log(`[FETCH_MORE] Cache exhausted, calling API for ${needed} more`);
        
        const radiusOverride = isRadiusMode ? { 
          lat: formData.currentLat, lng: formData.currentLng, radius: formData.radiusMeters 
        } : null;
        let newPlaces = await fetchGooglePlaces(isRadiusMode ? null : formData.area, [interest], radiusOverride);
        
        if (isRadiusMode) {
          newPlaces = newPlaces.map(p => ({ ...p, detectedArea: detectAreaFromCoords(p.lat, p.lng) }))
            .filter(p => p.detectedArea);
          newPlaces = newPlaces.filter(p => calcDistance(formData.currentLat, formData.currentLng, p.lat, p.lng) <= formData.radiusMeters);
        } else {
          newPlaces = newPlaces.map(p => ({ ...p, detectedArea: formData.area }));
        }
        
        newPlaces = filterBlacklist(newPlaces);
        newPlaces = filterDuplicatesOfCustom(newPlaces);
        
        const allUsedNames = [...existingNames, ...placesToAdd.map(p => p.name.toLowerCase().trim())];
        newPlaces = newPlaces.filter(p => !allUsedNames.includes(p.name.toLowerCase().trim()));
        
        if (isRadiusMode && formData.currentLat) {
          newPlaces.sort((a, b) => calcDistance(formData.currentLat, formData.currentLng, a.lat, a.lng) - calcDistance(formData.currentLat, formData.currentLng, b.lat, b.lng));
        } else {
          newPlaces.sort((a, b) => (b.rating * Math.log10((b.ratingCount || 0) + 1)) - (a.rating * Math.log10((a.ratingCount || 0) + 1)));
        }
        
        const fromApi = newPlaces.slice(0, needed).map(p => ({ ...p, addedLater: true }));
        // Cache remaining for future use
        googleCacheRef.current[interest] = newPlaces.slice(needed);
        placesToAdd.push(...fromApi);
        source = source ? `${source} + ${t("general.fromGoogle")}` : t('general.fromGoogle');
        console.log(`[FETCH_MORE] Got ${fromApi.length} from API, cached ${googleCacheRef.current[interest].length}`);
        } // end if !isPrivate
      }
      
      if (placesToAdd.length === 0) {
        showToast(`${t("toast.noMoreInInterest")} ${interestLabel}`, 'warning');
        return;
      }

      // Log to filter panel — fetchMore entry
      addToFilterLog({
        interestId: interest,
        interestLabel: interestLabel + ' [+עוד]',
        searchType: 'fetchMore',
        query: null,
        placeTypes: null,
        blacklist: null,
        nameKeywords: null,
        allResults: placesToAdd.map(p => ({
          name: p.name,
          rating: typeof p.rating === 'number' ? p.rating.toFixed(1) : (p.rating || 'N/A'),
          reviews: p.ratingCount || 0,
          primaryType: p.primaryType || (p.custom ? '📌 custom' : '-'),
          address: p.address || '',
          openNow: p.openNow ?? null,
          rank: null,
          totalFromGoogle: null,
          status: '✅ KEPT',
          matchedTypes: [],
          fetchMoreSource: p.custom ? 'custom' : (p._debug?.source || 'cache/api'),
        })),
      });
      
      const updatedRoute = {
        ...route,
        stops: [...route.stops, ...placesToAdd], optimized: false
      };
      
      setRoute(updatedRoute);
      scheduleReoptimize();
      showToast(`${placesToAdd.length} ${t("toast.addedMorePlaces")} ${interestLabel} (${source})`, 'success');
      
    } catch (error) {
      console.error('[FETCH_MORE] Error:', error);
      showToast(t('toast.addPlacesError'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch more places for all interests - delegates to fetchMoreForInterest per interest
  const fetchMoreAll = async () => {
    if (!route) return;
    
    setIsGenerating(true);
    
    try {
      const fetchCount = formData.fetchMoreCount || 3;
      const perInterest = Math.ceil(fetchCount / formData.interests.length);
      const isRadiusMode = formData.searchMode === 'radius' || formData.searchMode === 'all';
      const existingNames = route.stops.map(s => s.name.toLowerCase().trim());
      
      console.log(`[FETCH_MORE_ALL] Need ${perInterest} per interest, total target: ${fetchCount}`);
      
      const allNewPlaces = [];
      let fromCustom = 0;
      let fromCache = 0;
      let fromApi = 0;
      
      for (const interest of formData.interests) {
        const allUsedNames = [...existingNames, ...allNewPlaces.map(p => p.name.toLowerCase().trim())];
        let placesForInterest = [];
        
        // LAYER 1: Unused custom locations
        const relatedCIIds = new Set(
          allInterestOptions.filter(opt => opt.custom && opt.baseCategory === interest).map(opt => opt.id)
        );
        const unusedCustom = customLocations.filter(loc => {
          if (loc.status === 'blacklist') return false;
          if (!isLocationValid(loc)) return false;
          if (!loc.interests || !loc.interests.some(li => {
            if (li === interest) return true;
            if (relatedCIIds.has(li)) return true;
            const ci = allInterestOptions.find(opt => opt.id === interest && opt.custom && opt.baseCategory);
            return ci && li === ci.baseCategory;
          })) return false;
          if (isRadiusMode) {
            if (!formData.currentLat || !formData.currentLng) return false;
            if (loc.lat && loc.lng) return calcDistance(formData.currentLat, formData.currentLng, loc.lat, loc.lng) <= formData.radiusMeters;
            return true;
          } else {
            const locAreas = loc.areas || (loc.area ? [loc.area] : []);
            if (locAreas.includes(formData.area)) return true;
            if (loc.lat && loc.lng) {
              const areaCoords = window.BKK.areaCoordinates?.[formData.area];
              if (areaCoords?.lat && areaCoords?.lng) {
                return calcDistance(loc.lat, loc.lng, areaCoords.lat, areaCoords.lng) <= (areaCoords.radius || 2000) * 2;
              }
            }
            return false;
          }
        }).filter(loc => !allUsedNames.includes(loc.name.toLowerCase().trim()));
        
        if (unusedCustom.length > 0) {
          const toAdd = unusedCustom.slice(0, perInterest).map(p => ({ ...p, addedLater: true }));
          placesForInterest.push(...toAdd);
          fromCustom += toAdd.length;
        }
        
        // LAYER 2: Google cache
        if (placesForInterest.length < perInterest) {
          const cached = googleCacheRef.current[interest] || [];
          const usedNames = [...allUsedNames, ...placesForInterest.map(p => p.name.toLowerCase().trim())];
          const unusedCached = cached.filter(p => !usedNames.includes(p.name.toLowerCase().trim()));
          
          if (unusedCached.length > 0) {
            const needed = perInterest - placesForInterest.length;
            const fromC = unusedCached.slice(0, needed).map(p => ({
              ...p, addedLater: true,
              detectedArea: isRadiusMode ? detectAreaFromCoords(p.lat, p.lng) : formData.area
            }));
            placesForInterest.push(...fromC);
            googleCacheRef.current[interest] = unusedCached.slice(needed);
            fromCache += fromC.length;
          }
        }
        
        // LAYER 3: API (only if still need more)
        if (placesForInterest.length < perInterest) {
          // Check privateOnly
          const interestObjFA = allInterestOptions.find(o => o.id === interest);
          const isPrivateAll = interestObjFA?.privateOnly || interestConfig?.[interestId]?.noGoogleSearch || false;
          
          if (!isPrivateAll) {
          const needed = perInterest - placesForInterest.length;
          console.log(`[FETCH_MORE_ALL] API call for ${interest} (need ${needed} more)`);
          
          const radiusOverride = isRadiusMode ? { 
            lat: formData.currentLat, lng: formData.currentLng, radius: formData.radiusMeters 
          } : null;
          let newPlaces = await fetchGooglePlaces(isRadiusMode ? null : formData.area, [interest], radiusOverride);
          
          if (isRadiusMode) {
            newPlaces = newPlaces.map(p => ({ ...p, detectedArea: detectAreaFromCoords(p.lat, p.lng) }))
              .filter(p => p.detectedArea);
            newPlaces = newPlaces.filter(p => calcDistance(formData.currentLat, formData.currentLng, p.lat, p.lng) <= formData.radiusMeters);
          } else {
            newPlaces = newPlaces.map(p => ({ ...p, detectedArea: formData.area }));
          }
          
          newPlaces = filterBlacklist(newPlaces);
          newPlaces = filterDuplicatesOfCustom(newPlaces);
          const usedNames = [...allUsedNames, ...placesForInterest.map(p => p.name.toLowerCase().trim())];
          newPlaces = newPlaces.filter(p => !usedNames.includes(p.name.toLowerCase().trim()));
          
          const fromA = newPlaces.slice(0, needed).map(p => ({ ...p, addedLater: true }));
          googleCacheRef.current[interest] = newPlaces.slice(needed);
          placesForInterest.push(...fromA);
          fromApi += fromA.length;
          } else {
            console.log(`[FETCH_MORE_ALL] Private interest ${interest} - skipping API`);
          }
        }
        
        allNewPlaces.push(...placesForInterest);
      }
      
      if (allNewPlaces.length === 0) {
        showToast(t('places.noMorePlaces'), 'warning');
        return;
      }
      
      const updatedRoute = {
        ...route,
        stops: [...route.stops, ...allNewPlaces], optimized: false
      };
      
      setRoute(updatedRoute);
      
      // Build source message
      const sources = [];
      if (fromCustom > 0) sources.push(`${fromCustom} ${t("general.fromMyPlaces")}`);
      if (fromCache > 0) sources.push(`${fromCache} ${t('general.fromGoogleCache') || t('general.fromGoogle')}`);
      if (fromApi > 0) sources.push(`${fromApi} ${t("general.fromGoogle")}`);

      // Log custom + cache additions to filter panel (API ones already logged by fetchGooglePlaces)
      const nonApiAdded = allNewPlaces.filter(p => p.custom || (!p._debug?.source || p._debug?.source !== 'google'));
      if (nonApiAdded.length > 0) {
        addToFilterLog({
          interestId: 'fetchMoreAll',
          interestLabel: '+עוד לכל התחומים',
          searchType: 'fetchMore',
          query: null,
          placeTypes: null,
          blacklist: null,
          nameKeywords: null,
          allResults: nonApiAdded.map(p => ({
            name: p.name,
            rating: typeof p.rating === 'number' ? p.rating.toFixed(1) : (p.rating || 'N/A'),
            reviews: p.ratingCount || 0,
            primaryType: p.primaryType || (p.custom ? '📌 custom' : '-'),
            address: p.address || '',
            openNow: p.openNow ?? null,
            rank: null,
            totalFromGoogle: null,
            status: '✅ KEPT',
            matchedTypes: [],
            fetchMoreSource: p.custom ? 'custom' : 'cache',
          })),
        });
      }

      showToast(`${allNewPlaces.length} ${t("route.places")} (${sources.join(', ')})`, 'success');
      
      setTimeout(() => {
        document.getElementById('route-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
    } catch (error) {
      console.error('[FETCH_MORE_ALL] Error:', error);
      showToast(t('toast.addPlacesError'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter blacklisted places
  // Filter out places that exist in custom locations with status='blacklist' (exact name match)
  const filterBlacklist = (places) => {
    const blacklistedNames = customLocations
      .filter(loc => loc.status === 'blacklist' && (loc.cityId || 'bangkok') === selectedCityId)
      .map(loc => loc.name.toLowerCase().trim());
    
    if (blacklistedNames.length === 0) return places;
    
    return places.filter(place => {
      const placeName = place.name.toLowerCase().trim();
      const isBlacklisted = blacklistedNames.includes(placeName);
      if (isBlacklisted) {
        console.log(`[BLACKLIST] Filtered out: ${place.name}`);
      }
      return !isBlacklisted;
    });
  };
  
  // Filter out Google places that already exist in custom locations (exact name match)
  const filterDuplicatesOfCustom = (places) => {
    const customNames = customLocations
      .filter(loc => loc.status !== 'blacklist' && (loc.cityId || 'bangkok') === selectedCityId && loc.name)
      .map(loc => loc.name.toLowerCase().trim());
    
    if (customNames.length === 0) return places;
    
    return places.filter(place => {
      if (!place.name) return true; // keep places with no name — will be filtered elsewhere
      const placeName = place.name.toLowerCase().trim();
      const isDuplicate = customNames.includes(placeName);
      if (isDuplicate) {
        console.log(`[DEDUP] Filtered Google duplicate of custom location: ${place.name}`);
      }
      return !isDuplicate;
    });
  };

  // Strip heavy data (base64 images) from route before save - keep Storage URLs
  const stripRouteForStorage = (r) => {
    const stripped = { ...r };
    if (stripped.stops) {
      stripped.stops = stripped.stops.map(s => {
        const clean = { ...s };
        // Remove base64 images
        if (clean.uploadedImage && clean.uploadedImage.startsWith('data:')) {
          delete clean.uploadedImage;
        }
        // Remove large Firebase Storage URLs from stops (they're in customLocations)
        if (clean.uploadedImage && clean.uploadedImage.length > 200) {
          delete clean.uploadedImage;
        }
        // Remove imageUrls array from stops (they're in customLocations)
        delete clean.imageUrls;
        return clean;
      });
    }
    return stripped;
  };

  const saveRoutesToStorage = (_routes) => {
    // Firebase handles persistence — no-op
  };

  const quickSaveRoute = () => {
    const name = route.defaultName || route.name || `Route ${Date.now()}`;
    
    const routeToSave = {
      ...route,
      name: name,
      notes: '',
      savedAt: new Date().toISOString(),
      savedBy: authUser?.uid || null,
      locked: false,
      cityId: selectedCityId
    };

    if (isFirebaseAvailable && database) {
      const stripped = stripRouteForStorage(routeToSave);
      database.ref(`cities/${selectedCityId}/routes`).push(stripped)
        .then((ref) => {
          console.log('[FIREBASE] Route saved');
          const savedWithFbId = { ...routeToSave, firebaseId: ref.key };
          setRoute(savedWithFbId);
          setEditingRoute({...savedWithFbId});
          setRouteDialogMode('add');
          setShowRouteDialog(true);
          showToast(t('route.routeSaved'), 'success');
          window.BKK.logEvent?.('route_saved', { city: selectedCityId, stops: route?.stops?.length || 0, area: route?.areaName || formData.area });
        })
        .catch((error) => {
          console.error('[FIREBASE] Error saving route:', error);
          showToast(t('toast.routeSaveError'), 'error');
        });
    } else {
      const updated = [routeToSave, ...savedRoutes];
      setSavedRoutes(updated);
      saveRoutesToStorage(updated);
      setRoute(routeToSave);
      showToast(t('route.routeSaved'), 'success');
      window.BKK.logEvent?.('route_saved', { city: selectedCityId, stops: route?.stops?.length || 0, area: route?.areaName || formData.area });
      setEditingRoute({...routeToSave});
      setRouteDialogMode('add');
      setShowRouteDialog(true);
    }
  };

  const deleteRoute = (routeId) => {
    if (isFirebaseAvailable && database) {
      const routeToDelete = savedRoutes.find(r => r.id === routeId);
      if (routeToDelete && routeToDelete.firebaseId) {
        database.ref(`cities/${selectedCityId}/routes/${routeToDelete.firebaseId}`).remove()
          .then(() => {
            console.log('[FIREBASE] Route deleted');
            showToast(t('route.routeDeleted'), 'success');
          })
          .catch((error) => {
            console.error('[FIREBASE] Error deleting route:', error);
            showToast(t('toast.deleteError'), 'error');
          });
      }
    } else {
      const updated = savedRoutes.filter(r => r.id !== routeId);
      setSavedRoutes(updated);
      saveRoutesToStorage(updated);
      showToast(t('route.routeDeleted'), 'success');
    }
  };

  const updateRoute = (routeId, updates) => {
    if (isFirebaseAvailable && database) {
      const routeToUpdate = savedRoutes.find(r => r.id === routeId);
      if (routeToUpdate && routeToUpdate.firebaseId) {
        // Update local state immediately
        setSavedRoutes(prev => prev.map(r => r.id === routeId ? { ...r, ...updates } : r));
        showToast(t('route.routeUpdated'), 'success');
        database.ref(`cities/${selectedCityId}/routes/${routeToUpdate.firebaseId}`).update(updates)
          .catch((error) => {
            console.error('[FIREBASE] Error updating route:', error);
            showToast(t('toast.updateError'), 'error');
          });
      }
    } else {
      const updated = savedRoutes.map(r => r.id === routeId ? { ...r, ...updates } : r);
      setSavedRoutes(updated);
      saveRoutesToStorage(updated);
      showToast(t('route.routeUpdated'), 'success');
    }
  };

  const loadSavedRoute = (savedRoute) => {
    setRoute(savedRoute);
    // Restore startPoint: prefer startPointCoords.address (validated), then route.startPoint, then preferences
    const coords = savedRoute.startPointCoords || null;
    const validatedAddress = coords?.address || '';
    const startPointText = validatedAddress || 
      (savedRoute.startPoint !== t('form.startPointFirst') ? savedRoute.startPoint : '') || 
      '';
    if (savedRoute.preferences) {
      setFormData({...savedRoute.preferences, startPoint: startPointText });
    }
    setStartPointCoords(coords);
    // Restore route type (circular/linear)
    setRouteType(savedRoute.circular ? 'circular' : 'linear');
    setRouteChoiceMade('manual');
    setCurrentView('form');
    setWizardStep(3);
    window.scrollTo(0, 0);
  };

  // NOTE: addCustomInterest logic is now inline in the dialog footer (see Add Interest Dialog)
  // This allows direct configuration of search settings when creating an interest

  const deleteCustomInterest = (interestId) => {
    const interestToDelete = interestMap[interestId];
    const interestName = tLabel(interestToDelete) || interestId;
    const cannotUndo = t('toast.actionCannotBeUndone') || 'פעולה זו אינה ניתנת לביטול.';

    const proceedWithDelete = (allAffectedLocs) => {
      const affectedCities = [...new Set(allAffectedLocs.map(l => l.cityId || l._cityId || selectedCityId))];
      const totalCount = allAffectedLocs.length;

      // Build per-city breakdown
      const cityBreakdown = affectedCities.map(cid => {
        const count = allAffectedLocs.filter(l => (l.cityId || l._cityId || selectedCityId) === cid).length;
        const cityObj = window.BKK.cities?.[cid];
        const cityName = cityObj ? (tLabel(cityObj) || cityObj.nameEn || cid) : cid;
        return `${cityName} — ${count}`;
      }).join('\n');

      const warningMsg = totalCount > 0
        ? `${t('toast.interestDeleteWarning') || 'מחיקת תחום ממועדפים:'} "${interestName}":\n${cityBreakdown}\n\n${cannotUndo}`
        : `${t('toast.interestDeleteWarningNoPlaces') || 'למחוק את התחום'} "${interestName}"? ${cannotUndo}`;

      showConfirm(warningMsg, () => {
        // Optimistic local update
        setCustomInterests(prev => prev.filter(i => i.id !== interestId));
        setCustomLocations(prev => prev.map(loc => {
          if (!loc.interests || !loc.interests.includes(interestId)) return loc;
          return { ...loc, interests: loc.interests.filter(id => id !== interestId) };
        }));

        if (isFirebaseAvailable && database) {
          const doDelete = async () => {
            try {
              // 1. Delete customInterest entry
              const fbId = interestToDelete?.firebaseId;
              if (fbId) {
                await database.ref(`customInterests/${fbId}`).remove();
              } else {
                const snap = await database.ref('customInterests').orderByChild('id').equalTo(interestId).once('value');
                if (snap.val()) await Promise.all(Object.keys(snap.val()).map(k => database.ref(`customInterests/${k}`).remove()));
              }
              // 2. Delete interestConfig + interestStatus
              await database.ref(`settings/interestConfig/${interestId}`).remove().catch(() => {});
              await database.ref(`settings/interestStatus/${interestId}`).remove().catch(() => {});
              // 3. Remove from all locations across all cities
              if (totalCount > 0) {
                const writes = {};
                allAffectedLocs.forEach(loc => {
                  if (loc.firebaseId) {
                    const cityId = loc.cityId || loc._cityId || selectedCityId;
                    const newInterests = (loc.interests || []).filter(id => id !== interestId);
                    writes[`cities/${cityId}/locations/${loc.firebaseId}/interests`] = newInterests.length > 0 ? newInterests : null;
                  }
                });
                if (Object.keys(writes).length > 0) await database.ref().update(writes);
              }
              // 4. Remove from cityHiddenInterests
              const hiddenSnap = await database.ref('settings/cityHiddenInterests').once('value');
              if (hiddenSnap.val()) {
                const hw = {};
                Object.entries(hiddenSnap.val()).forEach(([cid, arr]) => {
                  if (Array.isArray(arr) && arr.includes(interestId)) {
                    const cleaned = arr.filter(id => id !== interestId);
                    hw[`settings/cityHiddenInterests/${cid}`] = cleaned.length > 0 ? cleaned : null;
                  }
                });
                if (Object.keys(hw).length > 0) await database.ref().update(hw);
              }
              // 5. Remove from all users' interestStatus
              const usersSnap = await database.ref('users').once('value');
              if (usersSnap.val()) {
                const uw = {};
                Object.entries(usersSnap.val()).forEach(([uid, udata]) => {
                  if (udata?.interestStatus?.[interestId] !== undefined) {
                    uw[`users/${uid}/interestStatus/${interestId}`] = null;
                  }
                });
                if (Object.keys(uw).length > 0) await database.ref().update(uw);
              }
              const msg = totalCount > 0
                ? (t('toast.interestDeletedFull') || 'תחום נמחק ונוקה מ-{count} מקומות').replace('{count}', totalCount)
                : t('interests.interestDeleted');
              showToast(msg, 'success');
              // Bump cacheVersion so all users get fresh data on next session
              database.ref('settings/cacheVersion').set(Date.now()).catch(() => {});
              addDebugLog('firebase', `[DELETE-INTEREST] ${interestId} — cleaned ${totalCount} locs in ${affectedCities.length} cities`);
            } catch (error) {
              console.error('[FIREBASE] Error deleting interest:', error);
              setCustomInterests(prev => [...prev, interestToDelete]);
              showToast(t('toast.deleteError'), 'error');
            }
          };
          doDelete();
        } else {
          showToast(totalCount > 0
            ? (t('toast.interestDeletedFull') || '').replace('{count}', totalCount)
            : t('interests.interestDeleted'), 'success');
        }
      }, { confirmLabel: t('general.delete') || 'מחק', confirmColor: '#ef4444' });
    };

    // Query ALL cities from Firebase to get accurate impact across all cities
    if (isFirebaseAvailable && database) {
      const cityIds = Object.keys(window.BKK.cities || {});
      Promise.all(cityIds.map(cid =>
        database.ref(`cities/${cid}/locations`)
          .orderByChild('interests')
          .once('value')
          .then(snap => {
            const locs = [];
            if (snap.val()) {
              Object.entries(snap.val()).forEach(([fbId, loc]) => {
                if (loc.interests && Array.isArray(loc.interests) && loc.interests.includes(interestId)) {
                  locs.push({ ...loc, firebaseId: fbId, _cityId: cid });
                }
              });
            }
            return locs;
          })
          .catch(() => [])
      )).then(results => {
        const allAffectedLocs = results.flat();
        proceedWithDelete(allAffectedLocs);
      });
    } else {
      // Fallback: use local customLocations
      const localAffected = customLocations.filter(loc =>
        loc.interests && loc.interests.includes(interestId)
      );
      proceedWithDelete(localAffected);
    }
  };

  // Toggle interest active/inactive status (per-user)



  // Admin: toggle the defaultEnabled flag for an interest


  // Admin: cycle adminStatus for an interest (active → draft → hidden → active)
  const cycleAdminStatus = async (interestId) => {
    if (!isUnlocked) return;
    const currentConfig = interestConfig[interestId] || {};
    const current = currentConfig.adminStatus || 'active';
    const next = current === 'active' ? 'draft' : current === 'draft' ? 'hidden' : 'active';
    
    const updatedConfig = { ...interestConfig, [interestId]: { ...currentConfig, adminStatus: next } };
    setInterestConfig(updatedConfig);
    
    if (isFirebaseAvailable && database) {
      try {
        await database.ref(`settings/interestConfig/${interestId}/adminStatus`).set(next);
        console.log(`[ADMIN] Set adminStatus=${next} for ${interestId}`);
      } catch (err) {
        console.error('Error saving adminStatus:', err);
      }
    }
    
    const labels = { active: '🟢', draft: '🟡', hidden: '🔴' };
    showToast(`${labels[next]} ${interestId} → ${next}`, 'info');
  };

  // Check if interest has valid search config
  // RULE: behavior (noGoogleSearch, types, textSearch) comes from interestConfig (Firebase) only
  // City files only indicate availability — NOT behavior
  const isInterestValid = (interestId) => {
    const config = interestConfig[interestId];
    // noGoogleSearch = internal interest, no Google search ever
    if (config?.noGoogleSearch) return false;
    // privateOnly = manual tagging only, always valid
    const interestObj = allInterestOptions.find(o => o.id === interestId);
    if (interestObj?.privateOnly || config?.privateOnly) return true;
    const rawCustom = interestMap[interestId];
    if (rawCustom?.privateOnly) return true;
    // Has search config in Firebase?
    if (config?.textSearch?.trim()) return true;
    if (config?.types) {
      const typesArr = Array.isArray(config.types) ? config.types : config.types.toString().split(',').map(s=>s.trim()).filter(Boolean);
      if (typesArr.length > 0) return true;
    }
    // Has search config in city file (built-in)?
    const cityPlaces = window.BKK.interestToGooglePlaces || {};
    const cityTextSearch = window.BKK.textSearchInterests || {};
    if (cityPlaces[interestId]?.length > 0) return true;
    if (cityTextSearch[interestId]) return true;
    return false;
  };

  // Sanitize mapsUrl before saving.
  // RULE: Never save shortened URLs (maps.app.goo.gl, goo.gl) — they break on mobile.
  // Never save non-google.com/maps URLs. Always rebuild from canonical fields.
  // This function is the SINGLE gate for all mapsUrl writes.
  const isBrokenMapsUrl = (url) => {
    if (!url) return false;
    // Short / redirect URLs — can't be resolved client-side due to CORS
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/') || url.includes('app.goo.gl')) return true;
    // Not a real google.com/maps URL
    if (!url.includes('google.com/maps')) return true;
    // Bad query_place_id
    const m = url.match(/query_place_id=([^&]+)/);
    if (m) {
      const pid = decodeURIComponent(m[1]);
      if (pid && !/^(ChIJ|EiI|GhIJ)/.test(pid)) return true;
    }
    return false;
  };

  const sanitizeMapsUrl = (loc) => {
    const url = loc.mapsUrl || '';
    if (!isBrokenMapsUrl(url)) return loc;
    // Rebuild from canonical fields — clear mapsUrl first so getGoogleMapsUrl uses placeId/name/coords
    const clean = { ...loc, mapsUrl: '' };
    return { ...loc, mapsUrl: window.BKK.getGoogleMapsUrl(clean) };
  };

  // Check if edit dialog has unsaved changes vs original
  const locationHasChanges = () => {
    if (!editingLocation) return false;
    const e = editingLocation;
    const n = newLocation;
    const s = (v) => (v || '').toString().trim();
    const nn = (v) => v ?? null;
    if (s(n.name) !== s(e.name)) return true;
    if (s(n.description) !== s(e.description)) return true;
    if (s(n.notes) !== s(e.notes)) return true;
    if (JSON.stringify(n.areas || []) !== JSON.stringify(e.areas || (e.area ? [e.area] : []))) return true;
    if (JSON.stringify(n.interests || []) !== JSON.stringify(e.interests || [])) return true;
    if (nn(n.lat) !== nn(e.lat) || nn(n.lng) !== nn(e.lng)) return true;
    if (s(n.mapsUrl) !== s(e.mapsUrl)) return true;
    if (s(n.address) !== s(e.address)) return true;
    if (!!n.locked !== !!e.locked) return true;
    if (!!n.dedupOk !== !!e.dedupOk) return true;
    if (nn(n.uploadedImage) !== nn(e.uploadedImage)) return true;
    if (s(n.googlePlaceId) !== s(e.googlePlaceId)) return true;
    if (nn(n.googleRating) !== nn(e.googleRating)) return true;
    return false;
  };

  // Check if location has all required data
  const isLocationValid = (loc) => {
    if (!loc) return false;
    // Must have name
    if (!loc.name || !loc.name.trim()) return false;
    // Note: interests and coordinates are optional - location is still valid without them
    // (it just won't appear in route calculation, but will show in "my places")
    return true;
  };

  const deleteCustomLocation = (locationId) => {
    const locationToDelete = customLocations.find(loc => loc.id === locationId);
    
    // Delete from Firebase (or localStorage fallback)
    if (isFirebaseAvailable && database) {
      // DYNAMIC MODE: Firebase (shared)
      if (locationToDelete && locationToDelete.firebaseId) {
        // Optimistic local update — remove immediately, don't wait for Firebase listener
        setCustomLocations(prev => prev.filter(loc => loc.id !== locationId));
        setRouteListKey(k => k + 1);
        database.ref(`cities/${selectedCityId}/locations/${locationToDelete.firebaseId}`).remove()
          .then(() => {
            console.log('[FIREBASE] Location deleted from shared database');
            showToast(t('places.placeDeleted'), 'success');
          })
          .catch((error) => {
            console.error('[FIREBASE] Error deleting location:', error);
            // Revert on error
            setCustomLocations(prev => [...prev, locationToDelete]);
            setRouteListKey(k => k + 1);
            showToast(t('toast.deleteError'), 'error');
          });
        // Also delete all reviews for this location (by name key)
        if (locationToDelete.name) {
          const pk = locationToDelete.name.replace(/[.#$/\[\]]/g, '_');
          database.ref(`cities/${selectedCityId}/reviews/${pk}`).remove()
            .catch(() => {}); // silent — reviews may not exist
        }
      }
    } else {
      // STATIC MODE: localStorage (local)
      const updated = customLocations.filter(loc => loc.id !== locationId);
      setCustomLocations(updated);
      setRouteListKey(k => k + 1);
      showToast(t('places.placeDeleted'), 'success');
    }
  };
  
  // Toggle location status with review state
  const toggleLocationStatus = (locationId) => {
    const location = customLocations.find(loc => loc.id === locationId);
    if (!location) return;
    
    let newStatus = location.status;
    
    if (location.status === 'blacklist') {
      newStatus = 'review';
    } else if (location.status === 'review') {
      newStatus = 'active';
    } else {
      newStatus = 'blacklist';
    }
    
    // Update in Firebase (or localStorage fallback)
    if (isFirebaseAvailable && database) {
      // DYNAMIC MODE: Firebase (shared)
      if (location.firebaseId) {
        // Update local state immediately — don't wait for Firebase listener
        setCustomLocations(prev => prev.map(l => l.id === locationId ? { ...l, status: newStatus } : l));
        const statusText =
          newStatus === 'blacklist' ? t('route.skipPermanently') :
          newStatus === 'review' ? t('general.underReview') :
          t('general.included');
        showToast(`${location.name}: ${statusText}`, 'success');
        database.ref(`cities/${selectedCityId}/locations/${location.firebaseId}`).update({
          status: newStatus
        }).catch((error) => {
          console.error('[FIREBASE] Error updating status:', error);
          // Revert local state on error
          setCustomLocations(prev => prev.map(l => l.id === locationId ? { ...l, status: location.status } : l));
          showToast(t('toast.updateError'), 'error');
        });
      }
    } else {
      // STATIC MODE: localStorage (local)
      const updated = customLocations.map(loc => {
        if (loc.id === locationId) {
          return { ...loc, status: newStatus };
        }
        return loc;
      });
      setCustomLocations(updated);
      
      const statusText = 
        newStatus === 'blacklist' ? t('route.skipPermanently') : 
        newStatus === 'review' ? t('general.underReview') : 
        t('general.included');
      showToast(`${location.name}: ${statusText}`, 'success');
    }
  };
  
  // Handle edit location - populate form with existing data
  // === PLACE REVIEWS ===
  
  // Load all review ratings for a city from reviewRatings/ (ratings only, no text)
  // Called at startup and on city switch.
  const loadReviewRatings = async (cityId) => {
    try {
      if (!database || !cityId) return;
      const snap = await database.ref(`cities/${cityId}/reviewRatings`).once('value');
      const data = snap.val() || {};
      // data shape: { PlaceKey: { uid1: 4, uid2: 5, ... }, ... }
      const avgs = {};
      for (const [placeKey, ratings] of Object.entries(data)) {
        const vals = Object.values(ratings).filter(r => typeof r === 'number' && r > 0);
        if (vals.length > 0) {
          avgs[placeKey] = { avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length };
        }
      }
      setReviewAverages(avgs); // replace entirely — city-scoped
    } catch (e) {
      console.error('[REVIEWS] Load ratings error:', e);
    }
  };

  // Recalculate average for a single place after save/delete
  const refreshReviewRating = async (cityId, placeKey) => {
    try {
      if (!database) return;
      const snap = await database.ref(`cities/${cityId}/reviewRatings/${placeKey}`).once('value');
      const data = snap.val();
      if (data) {
        const vals = Object.values(data).filter(r => typeof r === 'number' && r > 0);
        if (vals.length > 0) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          setReviewAverages(prev => ({ ...prev, [placeKey]: { avg, count: vals.length } }));
          return;
        }
      }
      setReviewAverages(prev => { const next = { ...prev }; delete next[placeKey]; return next; });
    } catch (e) {
      console.error('[REVIEWS] Refresh rating error:', e);
    }
  };

  // Legacy stub — ratings now loaded city-wide via loadReviewRatings
  const loadReviewAverages = (_placeNames) => {};;

  // Quick-patch a single field on an existing location (for popup inline edits)
  const patchLocationField = async (loc, fields) => {
    if (!requireSignIn()) return false;
    if (!loc?.firebaseId || !isFirebaseAvailable || !database) return false;
    try {
      await database.ref(`cities/${selectedCityId}/locations/${loc.firebaseId}`).update(fields);
      setCustomLocations(prev => prev.map(l => l.id === loc.id ? { ...l, ...fields } : l));
      return true;
    } catch(e) {
      showToast(t('toast.sendError') + ': ' + (e.message || e), 'error');
      return false;
    }
  };

  const openReviewDialog = async (place) => {
    const cityId = window.BKK.selectedCityId || 'bangkok';
    const placeKey = (place.name || '').replace(/[.#$/\[\]]/g, '_');
    const visitorId = authUser?.uid || window.BKK.visitorId || 'anonymous';
    
    // Clear immediately to prevent stale data from previous open
    setReviewDialog({ place, placeKey, reviews: [], myRating: 0, myText: '', hasChanges: false, loading: true });
    
    // Load existing reviews from Firebase
    let reviews = [];
    try {
      if (database) {
        const snap = await database.ref(`cities/${cityId}/reviews/${placeKey}`).once('value');
        const data = snap.val();
        if (data) {
          reviews = Object.entries(data).map(([uid, r]) => ({
            odvisitorId: uid,
            rating: r.rating || 0,
            text: r.text || '',
            userName: r.userName || uid.slice(0, 8),
            timestamp: r.timestamp || 0
          })).sort((a, b) => b.timestamp - a.timestamp);
        }
      }
    } catch (e) {
      console.error('[REVIEWS] Load error:', e);
    }
    
    // Find my existing review
    const myReview = reviews.find(r => r.odvisitorId === visitorId);
    
    setReviewDialog({
      place,
      placeKey,
      reviews,
      myRating: myReview?.rating || 0,
      myText: myReview?.text || '',
      hasChanges: false
    });
  };
  
  const saveReview = async () => {
    if (!reviewDialog) return;
    if (!authUser?.uid || authUser.isAnonymous) {
      setReviewDialog(null);
      if (!requireSignIn()) return;
      return;
    }
    if (reviewDialog.myRating === 0) {
      showToast(t('reviews.ratingRequired') || 'יש לבחור לפחות כוכב אחד', 'warning');
      return;
    }
    const cityId = window.BKK.selectedCityId || 'bangkok';
    const uid = authUser.uid;
    const userName = authUser.displayName || window.BKK.visitorName || uid.slice(0, 8);

    // Optimistic update — show immediately before Firebase confirms
    const placeKey = reviewDialog.placeKey;
    const optimisticRating = reviewDialog.myRating;
    setReviewAverages(prev => {
      const existing = prev[placeKey];
      if (existing) {
        // Approximate: replace this user's previous rating if any
        const newAvg = (existing.avg * existing.count - (existing._myPrev || 0) + optimisticRating) / existing.count;
        return { ...prev, [placeKey]: { ...existing, avg: newAvg, _myPrev: optimisticRating } };
      }
      return { ...prev, [placeKey]: { avg: optimisticRating, count: 1 } };
    });
    setReviewDialog(null); // close immediately

    try {
      if (database) {
        const path = `cities/${cityId}/reviews/${placeKey}/${uid}`;
        await database.ref(path).set({
          rating: optimisticRating,
          text: reviewDialog.myText.trim(),
          userName: userName,
          timestamp: Date.now()
        });
        // Write rating to reviewRatings/ (ratings-only node)
        await database.ref(`cities/${cityId}/reviewRatings/${placeKey}/${uid}`).set(optimisticRating);
        showToast(t('reviews.saved'), 'success');
        // Refresh average from reviewRatings/
        refreshReviewRating(cityId, placeKey);
      } else {
        showToast('No database connection', 'error');
      }
    } catch (e) {
      console.error('[REVIEWS] Save error:', e.message, e.code);
      showToast(t('reviews.saveError') + ': ' + (e.message || ''), 'error');
    }
  };
  
  const deleteMyReview = async () => {
    if (!reviewDialog) return;
    if (!authUser?.uid) return;
    const cityId = window.BKK.selectedCityId || 'bangkok';
    const uid = authUser.uid;
    const placeName = reviewDialog.place?.name || '';
    const placeKey = reviewDialog.placeKey;

    try {
      if (database) {
        await database.ref(`cities/${cityId}/reviews/${placeKey}/${uid}`).remove();
        await database.ref(`cities/${cityId}/reviewRatings/${placeKey}/${uid}`).remove();
        // Refresh reviews inside dialog
        const snap = await database.ref(`cities/${cityId}/reviews/${placeKey}`).once('value');
        const data = snap.val();
        const updated = data ? Object.entries(data).map(([ruid, r]) => ({
          odvisitorId: ruid, rating: r.rating || 0, text: r.text || '',
          userName: r.userName || ruid.slice(0, 8), timestamp: r.timestamp || 0
        })).sort((a, b) => b.timestamp - a.timestamp) : [];
        setReviewDialog(prev => prev ? { ...prev, reviews: updated, myRating: 0, myText: '', hasChanges: false } : null);
        refreshReviewRating(cityId, placeKey);
        showToast(t('reviews.deleted'), 'success');
      }
    } catch (e) {
      console.error('[REVIEWS] Delete error:', e);
      showToast(t('reviews.saveError') || 'שגיאה במחיקה', 'error');
    }
  };

  const deleteReviewByAdmin = async (targetUid) => {
    if (!reviewDialog || !isCurrentUserAdmin) return;
    const cityId = window.BKK.selectedCityId || 'bangkok';
    const placeName = reviewDialog.place?.name || '';
    const placeKey = reviewDialog.placeKey;
    try {
      if (database) {
        await database.ref(`cities/${cityId}/reviews/${placeKey}/${targetUid}`).remove();
        await database.ref(`cities/${cityId}/reviewRatings/${placeKey}/${targetUid}`).remove();
        const snap = await database.ref(`cities/${cityId}/reviews/${placeKey}`).once('value');
        const data = snap.val();
        const updated = data ? Object.entries(data).map(([uid, r]) => ({
          odvisitorId: uid, rating: r.rating || 0, text: r.text || '',
          userName: r.userName || uid.slice(0, 8), timestamp: r.timestamp || 0
        })).sort((a, b) => b.timestamp - a.timestamp) : [];
        setReviewDialog(prev => prev ? { ...prev, reviews: updated } : null);
        refreshReviewRating(cityId, placeKey);
        showToast(t('reviews.deleted'), 'success');
      }
    } catch (e) {
      console.error('[REVIEWS] Admin delete error:', e);
    }
  };

  const handleEditLocation = (loc, navList) => {
    if (navList !== undefined) setEditNavList(navList);
    setEditingLocation(loc);
    const editFormData = {
      name: loc.name || '',
      description: loc.description || '',
      notes: loc.notes || '',
      area: loc.area || (loc.areas ? loc.areas[0] : formData.area),
      areas: loc.areas || (loc.area ? [loc.area] : [formData.area]),
      interests: loc.interests || [],
      lat: loc.lat || null,
      lng: loc.lng || null,
      mapsUrl: loc.mapsUrl || '',
      address: loc.address || '',
      uploadedImage: loc.uploadedImage || null,
      imageUrls: loc.imageUrls || [],
      locked: !!loc.locked,
      dedupOk: !!loc.dedupOk,
      googlePlaceId: loc.googlePlaceId || '',
      googlePlace: !!loc.googlePlace,
      googleRating: loc.googleRating || null,
      googleRatingCount: loc.googleRatingCount || 0
    };
    
    setNewLocation(editFormData);
    setGooglePlaceInfo(null);
    setLocationSearchResults(null);
    setShowEditLocationDialog(true);
  };
  
  // Add Google place to My Locations
  // Auth guard: call before any write action. If anonymous → show toast + open login.
  // Returns true if allowed, false if blocked.
  const requireSignIn = () => {
    if (!authUser || authUser.isAnonymous) {
      showToast(t('auth.signInRequired') || '🔒 כדי לבצע פעולה זו יש להתחבר', 'info', 'sticky');
      setTimeout(() => {
        if (!authLoading && (!authUserRef.current || authUserRef.current.isAnonymous)) {
          setShowLoginDialog(true);
        }
      }, 800);
      return false;
    }
    return true;
  };

  const addGooglePlaceToCustom = async (place, forceAdd = false) => {
    if (!requireSignIn()) return false;
    if (!forceAdd) {
      // Check if already exists (by name, case-insensitive)
      const existsByName = customLocations.find(loc =>
        loc.name.toLowerCase().trim() === place.name.toLowerCase().trim()
      );
      if (existsByName) {
        setDedupConfirm({ type: 'custom', match: existsByName, pendingGooglePlace: place,
          _distance: 0 });
        return false;
      }

      // Check for nearby duplicates by coordinates
      if (place.lat && place.lng) {
        const nearbyDup = customLocations.find(loc => {
          if (!loc.lat || !loc.lng) return false;
          const dlat = (loc.lat - place.lat) * 111320;
          const dlng = (loc.lng - place.lng) * 111320 * Math.cos(place.lat * Math.PI / 180);
          return Math.sqrt(dlat * dlat + dlng * dlng) < 50;
        });
        if (nearbyDup) {
          const dlat = (nearbyDup.lat - place.lat) * 111320;
          const dlng = (nearbyDup.lng - place.lng) * 111320 * Math.cos(place.lat * Math.PI / 180);
          const dist = Math.round(Math.sqrt(dlat * dlat + dlng * dlng));
          setDedupConfirm({ type: 'custom', match: { ...nearbyDup, _distance: dist }, pendingGooglePlace: place });
          return false;
        }
      }
    }
    
    // Set adding state for dimmed button
    const placeId = place.id || place.name;
    setAddingPlaceIds(prev => [...prev, placeId]);
    
    const detectedAreas = window.BKK.getAreasForCoordinates(place.lat, place.lng);
    const bestArea = detectedAreas.length > 0 ? detectedAreas[0] : (window.BKK.getClosestArea(place.lat, place.lng) || formData.area);
    const isOutside = detectedAreas.length === 0;
    
    let locationToAdd = {
      id: Date.now(),
      name: place.name,
      description: (place.description && !place.description.startsWith('⭐')) ? place.description : '',
      notes: '',
      address: place.address || '',
      area: bestArea,
      areas: detectedAreas.length > 0 ? detectedAreas : [bestArea],
      interests: place.interests || [],
      lat: place.lat,
      lng: place.lng,
      googlePlaceId: place.googlePlaceId || null,
      uploadedImage: null,
      imageUrls: [],
      outsideArea: isOutside,
      custom: true,
      status: 'active',
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      addedBy: authUser?.uid || null,
      fromGoogle: true,
      googleRating: place.rating || null,
      googleRatingCount: place.ratingCount || place.user_ratings_total || 0,
      cityId: selectedCityId
    };
    locationToAdd.mapsUrl = window.BKK.getGoogleMapsUrl(locationToAdd);
    locationToAdd = sanitizeMapsUrl(locationToAdd);

    if (forceAdd) {
      // forceAdd=true: came from dedup confirm "add anyway" — save directly, no dialog
      setAddingPlaceIds(prev => prev.filter(id => id !== placeId));
      await saveQuickAddPlace(locationToAdd, null);
      return true;
    }

    // Open quick-add dialog for user to enrich and optionally rate before saving
    setAddingPlaceIds(prev => prev.filter(id => id !== placeId));
    setQuickAddPlace(locationToAdd);
    setShowQuickAddDialog(true);
    return true;
  };
  
  

  
  // Boundary check before any location save. Returns 'ok', 'warn' (admin), or 'block'.
  const checkLocationBoundary = (lat, lng) => {
    if (!lat || !lng) return 'ok';
    const cityData = window.BKK.activeCityData;
    if (!cityData?.center) return 'ok';
    const R = 6371e3;
    const dLat = (cityData.center.lat - lat) * Math.PI / 180;
    const dLng = (cityData.center.lng - lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat * Math.PI / 180) * Math.cos(cityData.center.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const factor = cityData.boundaryFactor ?? 1.5;
    const maxRadius = (cityData.allCityRadius || 15000) * factor;
    if (distance <= maxRadius) return 'ok';
    return isAdmin ? 'warn' : 'block';
  };

  // Save a place from the QuickAddDialog (enriched by user before saving)
  const saveQuickAddPlace = async (enriched, rating) => {
    if (!requireSignIn()) return;
    const placeId = enriched.id || enriched.name;
    // Guard: prevent duplicate save if already in progress for this place
    if (addingPlaceIds.includes(placeId)) return;
    // Boundary check
    const boundaryResult = checkLocationBoundary(enriched.lat, enriched.lng);
    if (boundaryResult === 'block') { showToast(t('toast.savingOutsideCity'), 'warning', 'sticky'); return; }
    if (boundaryResult === 'warn') showToast(t('toast.adminSavingOutsideCity'), 'warning', 'sticky');
    // Remember interests for next add/capture
    if (enriched.interests?.length > 0) lastCaptureInterestsRef.current = enriched.interests;
    setAddingPlaceIds(prev => [...prev, placeId]);
    let saved = null;
    if (isFirebaseAvailable && database) {
      try {
        const ref = await database.ref(`cities/${selectedCityId}/locations`).push(enriched);
        saved = { ...enriched, firebaseId: ref.key };
        // Don't do optimistic update here — Firebase listener will refresh the list
        // (optimistic update + debounce caused duplicates to appear)
        setRouteListKey(k => k + 1);
        addDebugLog('ADD', `QuickAdd "${enriched.name}" saved to Firebase`);
      } catch (error) {
        saveToPending(enriched);
        saved = enriched;
        showToast(`💾 "${enriched.name}" — ${t('toast.savedWillSync')}`, 'warning', 'sticky');
      }
    } else {
      setCustomLocations(prev => [...prev, enriched]);
      saved = enriched;
    }
    // Save rating if provided
    if (rating && rating.score > 0 && saved && isFirebaseAvailable && database) {
      try {
        const pk = (enriched.name || '').replace(/[.#$/\[\]]/g, '_');
        const uid = authUser?.uid || window.BKK.visitorId;
        await database.ref(`cities/${selectedCityId}/reviews/${pk}/${uid}`).set({
          rating: rating.score,
          text: rating.text || '',
          timestamp: Date.now(),
          uid,
          userName: authUser?.displayName || authUser?.email || t('auth.anonymous')
        });
        // Write to reviewRatings/ (ratings-only node)
        await database.ref(`cities/${selectedCityId}/reviewRatings/${pk}/${uid}`).set(rating.score);
        refreshReviewRating(selectedCityId, pk);
      } catch(e) { /* rating save failure is non-critical */ }
    }
    setAddingPlaceIds(prev => prev.filter(id => id !== placeId));
    setShowQuickAddDialog(false);
    setQuickAddPlace(null);
    showToast(`✅ "${enriched.name}" ${t('places.addedToYourList')}`, 'success');
  };

  
  const handleImportMerge = async () => {
    let addedInterests = 0;
    let skippedInterests = 0;
    let addedLocations = 0;
    let skippedLocations = 0;
    let addedRoutes = 0;
    let skippedRoutes = 0;
    let updatedConfigs = 0;
    let updatedStatuses = 0;
    
    // Detect file type: global (interests) or city (locations+routes) or legacy (mixed)
    const fileType = importedData._type || 'legacy';
    const isGlobal = fileType === 'foufou-global' || fileType === 'legacy';
    const isCity = fileType === 'foufou-city' || fileType === 'legacy';
    
    // For city files: warn if cityId doesn't match current city
    if (fileType === 'foufou-city' && importedData.cityId && importedData.cityId !== selectedCityId) {
      const ok = window.confirm(`הקובץ שייך לעיר "${importedData.cityId}" אבל אתה נמצא ב-"${selectedCityId}".\nלייבא בכל זאת?`);
      if (!ok) return;
    }

    // Helper to check if interest exists by ID or label
    const interestExistsByLabel = (label, id) => {
      if (id && interestMap[id]) return true;
      return customInterests.find(i => (i.label || i.name || '').toLowerCase() === (label || '').toLowerCase());
    };
    
    // Helper to check if location exists by name (not id)
    const locationExistsByName = (name) => {
      return customLocations.find(l => l.name.toLowerCase() === name.toLowerCase());
    };
    
    // Import to Firebase (or localStorage fallback)
    const currentImportBatch = new Date().toISOString().slice(0, 16).replace('T', '_');
    if (isFirebaseAvailable && database) {
      // DYNAMIC MODE: Firebase (shared)
      
      // 1. Import custom interests (global only)
      if (isGlobal) for (const interest of (importedData.customInterests || [])) {
        const label = tLabel(interest) || interest.name;
        if (!label) continue;
        
        const exists = interestExistsByLabel(label, interest.id);
        if (exists) {
          skippedInterests++;
          continue;
        }
        
        try {
          const interestId = interest.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          const newInterest = {
            id: interestId,
            label: label,
            labelEn: interest.labelEn || '',
            name: label,
            icon: interest.icon || '📍',
            custom: true,
            privateOnly: interest.privateOnly || false,
            locked: !!interest.locked,
            category: interest.category || 'attraction',
            weight: interest.weight || sp.defaultInterestWeight,
            minStops: interest.minStops != null ? interest.minStops : 1,
            maxStops: interest.maxStops || 10,
            routeSlot: interest.routeSlot || 'any',
            minGap: interest.minGap || 1,
            bestTime: interest.bestTime || 'anytime',
            ...(interest.color ? { color: interest.color } : {})
          };
          await database.ref(`customInterests/${interestId}`).set(newInterest);
          addedInterests++;
        } catch (error) {
          console.error('[FIREBASE] Error importing interest:', error);
        }
      }
      
      // 2. Import interest configurations (global only)
      if (isGlobal && importedData.interestConfig) {
        for (const [interestId, config] of Object.entries(importedData.interestConfig)) {
          try {
            await database.ref(`settings/interestConfig/${interestId}`).set(config);
            updatedConfigs++;
          } catch (error) {
            console.error('[FIREBASE] Error importing config:', error);
          }
        }
      }
      
      // 3. Import interest statuses (global only)
      if (isGlobal && importedData.interestStatus) {
        for (const [interestId, status] of Object.entries(importedData.interestStatus)) {
          try {
            await database.ref(`settings/interestStatus/${interestId}`).set(status);
            updatedStatuses++;
          } catch (error) {
            console.error('[FIREBASE] Error importing status:', error);
          }
        }
      }
      
      // 3b. interestCounters no longer persisted to Firebase — computed on-the-fly from locations
      
      // 3c. Import system parameters (global only)
      if (isGlobal && importedData.systemParams && typeof importedData.systemParams === 'object') {
        const merged = { ...window.BKK._defaultSystemParams, ...importedData.systemParams };
        window.BKK.systemParams = merged;
        setSystemParams(merged);
        if (isFirebaseAvailable && database) {
          await database.ref('settings/systemParams').set(merged);
        }
      }
      
      // 4. Import locations (city only — to current or file's city)
      const importCityId = (fileType === 'foufou-city' && importedData.cityId) ? importedData.cityId : selectedCityId;
      if (isCity) for (const loc of (importedData.customLocations || [])) {
        if (!loc.name) continue;
        
        const exists = locationExistsByName(loc.name);
        if (exists) {
          skippedLocations++;
          continue;
        }
        
        try {
          const impDetected = (loc.lat && loc.lng) ? window.BKK.getAreasForCoordinates(loc.lat, loc.lng) : [];
            const impBestArea = impDetected.length > 0 ? impDetected[0] 
              : (loc.area || (loc.areas?.[0]) || (loc.lat ? window.BKK.getClosestArea(loc.lat, loc.lng) : null) || formData.area || areaOptions[0]?.id || 'center');
            const newLocation = {
            id: loc.id || Date.now() + Math.floor(Math.random() * 1000),
            name: loc.name.trim(),
            description: loc.description || loc.notes || '',
            notes: loc.notes || '',
            area: impBestArea,
            areas: impDetected.length > 0 ? impDetected : [impBestArea],
            interests: Array.isArray(loc.interests) ? loc.interests : [],
            lat: loc.lat || null,
            lng: loc.lng || null,
            mapsUrl: loc.mapsUrl || '',
            address: loc.address || '',
            uploadedImage: loc.uploadedImage || null,
            imageUrls: Array.isArray(loc.imageUrls) ? loc.imageUrls : [],
            outsideArea: loc.lat && loc.lng && impDetected.length === 0,
            missingCoordinates: !loc.lat || !loc.lng,
            
            custom: true,
            status: loc.status || 'active',
            locked: false, // Always import as draft for review
            rating: loc.rating || null,
            ratingCount: loc.ratingCount || null,
            fromGoogle: loc.fromGoogle || false,
            addedAt: loc.addedAt || new Date().toISOString(),
            updatedAt: loc.updatedAt || loc.addedAt || new Date().toISOString(),
            addedBy: authUser?.uid || null,
            importBatch: currentImportBatch
          };
          
          await database.ref(`cities/${importCityId}/locations`).push(newLocation);
          addedLocations++;
        } catch (error) {
          console.error('[FIREBASE] Error importing location:', error);
        }
      }
      
      // 5. Import saved routes (city only)
      if (isCity) for (const route of (importedData.savedRoutes || [])) {
        if (!route.name) continue;
        
        const exists = savedRoutes.find(r => r.name.toLowerCase() === route.name.toLowerCase());
        if (exists) {
          skippedRoutes++;
          continue;
        }
        
        try {
          const routeToSave = stripRouteForStorage({
            ...route,
            id: route.id || Date.now() + Math.floor(Math.random() * 1000),
            importedAt: new Date().toISOString()
          });
          await database.ref(`cities/${selectedCityId}/routes`).push(routeToSave);
          addedRoutes++;
        } catch (error) {
          console.error('[FIREBASE] Error importing route:', error);
        }
      }
      
    } else {
      // STATIC MODE: localStorage (local)
      const newInterests = [...customInterests];
      const newLocations = [...customLocations];
      const newConfig = { ...interestConfig };
      const newStatus = { ...interestStatus };
      
      // 1. Import custom interests
      (importedData.customInterests || []).forEach(interest => {
        const label = tLabel(interest) || interest.name;
        if (!label) return;
        
        const exists = newInterests.find(i => (i.label || i.name || '').toLowerCase() === label.toLowerCase());
        if (exists) {
          skippedInterests++;
          return;
        }
        
        const interestId = interest.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        newInterests.push({
          id: interestId,
          label: label,
          labelEn: interest.labelEn || '',
          name: label,
          icon: interest.icon || '📍',
          custom: true,
          privateOnly: interest.privateOnly || false,
          locked: !!interest.locked,
          category: interest.category || 'attraction',
          weight: interest.weight || sp.defaultInterestWeight,
          minStops: interest.minStops != null ? interest.minStops : 1,
          maxStops: interest.maxStops || 10,
          routeSlot: interest.routeSlot || 'any',
          minGap: interest.minGap || 1,
          bestTime: interest.bestTime || 'anytime'
        });
        addedInterests++;
      });
      
      // 2. Import interest configurations
      if (importedData.interestConfig) {
        Object.entries(importedData.interestConfig).forEach(([id, config]) => {
          newConfig[id] = config;
          updatedConfigs++;
        });
      }
      
      // 3. Import interest statuses
      if (importedData.interestStatus) {
        Object.entries(importedData.interestStatus).forEach(([id, status]) => {
          newStatus[id] = status;
          updatedStatuses++;
        });
      }
      
      // 3b. Import interest counters (auto-naming)
      // interestCounters no longer stored — computed on-the-fly from customLocations

      // 3c. Import system parameters
      if (importedData.systemParams && typeof importedData.systemParams === 'object') {
        const merged = { ...window.BKK._defaultSystemParams, ...importedData.systemParams };
        window.BKK.systemParams = merged;
        setSystemParams(merged);
      }

      if (importedData.cityHiddenInterests && typeof importedData.cityHiddenInterests === 'object') {
        const sets = {};
        Object.entries(importedData.cityHiddenInterests).forEach(([cid, arr]) => {
          sets[cid] = new Set(Array.isArray(arr) ? arr : []);
        });
        setCityHiddenInterests(sets);
      }
      (importedData.customLocations || []).forEach(loc => {
        if (!loc.name) return;
        
        const exists = newLocations.find(l => l.name.toLowerCase() === loc.name.toLowerCase());
        if (exists) {
          skippedLocations++;
          return;
        }
        
        const impDetected2 = (loc.lat && loc.lng) ? window.BKK.getAreasForCoordinates(loc.lat, loc.lng) : [];
        const impBestArea2 = impDetected2.length > 0 ? impDetected2[0] 
          : (loc.area || (loc.areas?.[0]) || (loc.lat ? window.BKK.getClosestArea(loc.lat, loc.lng) : null) || formData.area || areaOptions[0]?.id || 'center');
        const newLocation = {
          id: loc.id || Date.now() + Math.floor(Math.random() * 1000),
          name: loc.name.trim(),
          description: loc.description || loc.notes || '',
          notes: loc.notes || '',
          area: impBestArea2,
          areas: impDetected2.length > 0 ? impDetected2 : [impBestArea2],
          interests: Array.isArray(loc.interests) ? loc.interests : [],
          lat: loc.lat || null,
          lng: loc.lng || null,
          mapsUrl: loc.mapsUrl || '',
          address: loc.address || '',
          uploadedImage: loc.uploadedImage || null,
          imageUrls: Array.isArray(loc.imageUrls) ? loc.imageUrls : [],
          outsideArea: loc.lat && loc.lng && impDetected2.length === 0,
          missingCoordinates: !loc.lat || !loc.lng,
          
          custom: true,
          status: loc.status || 'active',
          locked: !!loc.locked,
          rating: loc.rating || null,
          ratingCount: loc.ratingCount || null,
          fromGoogle: loc.fromGoogle || false,
          addedAt: loc.addedAt || new Date().toISOString(),
            updatedAt: loc.updatedAt || loc.addedAt || new Date().toISOString(),
          importBatch: currentImportBatch
        };
        
        newLocations.push(newLocation);
        addedLocations++;
      });
      
      // 5. Import saved routes
      const newRoutes = [...savedRoutes];
      (importedData.savedRoutes || []).forEach(route => {
        if (!route.name) return;
        
        const exists = newRoutes.find(r => r.name.toLowerCase() === route.name.toLowerCase());
        if (exists) {
          skippedRoutes++;
          return;
        }
        
        newRoutes.push({
          ...route,
          id: route.id || Date.now() + Math.floor(Math.random() * 1000),
          importedAt: new Date().toISOString()
        });
        addedRoutes++;
      });
      
      setCustomInterests(newInterests);
      setCustomLocations(newLocations);
      setSavedRoutes(newRoutes);
      setInterestConfig(newConfig);
      setInterestStatus(newStatus);
      
      saveRoutesToStorage(newRoutes);
    }
    
    setShowImportDialog(false);
    setImportedData(null);
    
    // Build detailed report
    const report = [];
    if (addedInterests > 0 || skippedInterests > 0) {
      report.push(`${t("import.interests")} +${addedInterests}`);
    }
    if (updatedConfigs > 0) {
      report.push(`${t("import.configs")} +${updatedConfigs}`);
    }
    if (addedLocations > 0 || skippedLocations > 0) {
      report.push(`${t("import.locations")} +${addedLocations}`);
    }
    if (addedRoutes > 0 || skippedRoutes > 0) {
      report.push(`${t("import.routes")} +${addedRoutes}`);
    }
    
    const totalAdded = addedInterests + addedLocations + addedRoutes + updatedConfigs;
    showToast(report.join(' | ') || t('toast.noImportItems'), totalAdded > 0 ? 'success' : 'warning');
    
    // If locations were imported, switch to favorites > drafts view for review
    if (addedLocations > 0) {
      setLastImportBatch(currentImportBatch);
      setFilterImportBatch(true);
      setTimeout(() => {
        showToast(`📋 ${addedLocations} ${t('import.importedAsDrafts') || 'places imported as drafts — review in Favorites > Drafts'}`, 'info', 'sticky');
        setCurrentView('myPlaces');
        setPlacesTab('drafts');
      }, 1500);
    }
  };

  // ===== Active Trail Management =====
  const startActiveTrail = (stops, interests, area) => {
    const trail = {
      stops: stops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng, interest: s.interest || s.interests?.[0] })),
      interests: interests || formData.interests || [],
      area: area || formData.area || '',
      cityId: selectedCityId,
      circular: routeType === 'circular',
      startedAt: Date.now(),
      // Full route snapshot — restored on endActiveTrail so user sees complete route state
      routeSnapshot: route ? JSON.parse(JSON.stringify(route)) : null
    };
    // Reset capture interests on new trail — next capture starts from trail interests, not previous session
    lastCaptureInterestsRef.current = [];
    setActiveTrail(trail);
    localStorage.setItem('foufou_active_trail', JSON.stringify(trail));
  };

  const endActiveTrail = () => {
    // Restore the route snapshot from when the trail started
    // Mark skipped stops with trailSkipped:true so route results screen can show them grayed
    if (activeTrail?.routeSnapshot) {
      const skippedIdxSet = skippedTrailStops;
      const restoredRoute = { ...activeTrail.routeSnapshot };
      if (restoredRoute.stops) {
        restoredRoute.stops = restoredRoute.stops.map((stop, idx) => ({
          ...stop,
          trailSkipped: skippedIdxSet.has(idx) ? true : undefined
        }));
      }
      setRoute(restoredRoute);
      setWizardStep(3);
      setCurrentView('form');
      setRouteChoiceMade('manual'); // show route results panel
    }
    setActiveTrail(null);
    setSkippedTrailStops(new Set());
    localStorage.removeItem('foufou_active_trail');
  };

  // ── Save with duplicate detection ──
  // overrideData: use this instead of newLocation (needed when called right after setNewLocation,
  // before React has re-rendered — e.g. from QuickCapture onSave where state update is async)
  const saveWithDedupCheck = async (closeAfter = true, closeQuickCapture = false, overrideData = null) => {
    let loc = overrideData ? { ...overrideData } : { ...newLocation };

    // Attach add-dialog rating if present (add mode only, not QuickCapture which passes its own)
    if (!closeQuickCapture && !overrideData?.userRating && addLocRatingScore > 0) {
      loc.userRating = { score: addLocRatingScore, text: addLocRatingText };
    }

    // Check interests first — before any other validation
    if (loc.name?.trim() && !loc.interests?.length) {
      showToast(t('form.selectAtLeastOneInterest') || 'יש לבחור לפחות תחום אחד', 'warning');
      return;
    }

    // Check exact name duplicate — same dialog as proximity dedup
    if (loc.name?.trim()) {
      const nameMatch = customLocations.find(l =>
        l.name.toLowerCase().trim() === loc.name.toLowerCase().trim() &&
        l.status !== 'blacklist' &&
        (!overrideData || l.id !== overrideData.id)
      );
      if (nameMatch) {
        setDedupConfirm({ type: 'custom', loc, match: nameMatch, closeAfter, closeQuickCapture, overrideData });
        return;
      }
    }

    if (!loc.name?.trim() || !loc.interests?.length) {
      addCustomLocation(closeAfter, loc);
      if (closeQuickCapture) setShowQuickCapture(false);
      return;
    }
    // Skip dedup if no GPS or dedup disabled
    if (!loc.lat || !loc.lng || (!sp.dedupGoogleEnabled && !sp.dedupCustomEnabled)) {
      addCustomLocation(closeAfter, loc);
      if (closeQuickCapture) setShowQuickCapture(false);
      return;
    }

    // If user selected a specific Google place — check if same placeId already in our DB
    if (loc.googlePlace || loc.googlePlaceId) {
      const pidMatch = customLocations.find(l =>
        l.googlePlaceId && l.googlePlaceId === loc.googlePlaceId &&
        l.status !== 'blacklist' &&
        (!overrideData || l.id !== overrideData.id)
      );
      if (pidMatch) {
        // Same physical place already saved (possibly under a different name) → show dedup popup
        setDedupConfirm({ type: 'custom', loc, match: pidMatch, closeAfter, closeQuickCapture, overrideData });
        return;
      }
      // Not in DB — user explicitly chose this Google place → save directly
      addCustomLocation(closeAfter, loc);
      if (closeQuickCapture) setShowQuickCapture(false);
      return;
    }

    // No googlePlaceId — run proximity search for all dialogs when coords are present
    // (covers both "הוסף ידנית" with typed name, and "צלם עכשיו" with user or auto name)
    // Background dedup check
    try {
      const matches = await findNearbyDuplicates(loc.lat, loc.lng, loc.interests);
      
      if (matches && matches.custom.length > 0) {
        const dup = matches.custom[0];
        setDedupConfirm({ type: 'custom', loc, match: dup, closeAfter, closeQuickCapture, overrideData: loc });
        return;
      }
      
      if (matches && matches.google.length > 0) {
        // Sort by distance only (user is physically at the location)
        const sorted = matches.google.sort((a, b) => a._distance - b._distance);
        const top3 = sorted.slice(0, 3);
        if (top3.length === 1) {
          // Single match — show as before
          setDedupConfirm({ type: 'google', loc, match: top3[0], closeAfter, closeQuickCapture, overrideData: loc });
        } else {
          // Multiple matches — show picker
          setDedupConfirm({ type: 'googleMulti', loc, matches: top3, closeAfter, closeQuickCapture, overrideData: loc });
        }
        return;
      }
    } catch (e) {
      // Dedup check failed — save anyway, don't lose the place
    }
    
    // No matches or check failed — save normally
    addCustomLocation(closeAfter, loc);
    if (closeQuickCapture) {
      setShowQuickCapture(false);
      showToast('✅ ' + t('trail.saved'), 'success');
    }
  };

  // Handle dedup confirmation actions
  const handleDedupConfirm = (action) => {
    if (!dedupConfirm) return;
    const { type, loc, match, closeAfter, closeQuickCapture, overrideData } = dedupConfirm;

    // Save photo to device — only if NOT from captureMode (captureMode already saved on capture)
    if (loc?.uploadedImage && !closeQuickCapture) {
      try { window.BKK.saveImageToDevice?.(loc.uploadedImage, loc.name || match.name || 'photo'); } catch(e) {}
    }

    if (action === 'updateWithGoogle') {
      // Update existing custom location with Google data (rating, address, placeId, name if different)
      const gp = dedupConfirm.pendingGooglePlace;
      if (gp && match) {
        const updates = {
          googlePlaceId: gp.googlePlaceId || match.googlePlaceId || null,
          googleRating: gp.rating || match.googleRating || null,
          googleRatingCount: gp.ratingCount || match.googleRatingCount || 0,
          address: gp.address || match.address || '',
          mapsUrl: gp.mapsUrl || match.mapsUrl || '',
          fromGoogle: true
        };
        // Only update name if existing has none or they match loosely
        if (!match.name || match.name.toLowerCase().trim() !== gp.name.toLowerCase().trim()) {
          updates._googleName = gp.name; // store as hint, don't overwrite user's name
        }
        const updated = customLocations.map(l =>
          l.id === match.id ? { ...l, ...updates } : l
        );
        setCustomLocations(updated);
        if (isFirebaseAvailable && database && match.firebaseKey) {
          database.ref(`cities/${selectedCityId}/locations/${match.firebaseKey}`).update(updates);
        }
        showToast(`🔄 "${match.name}" — ${t('dedup.updatedWithGoogle')}`, 'success');
      }
      setDedupConfirm(null);
      return;
    }

    if (action === 'acceptGooglePick') {
      // User picked a specific Google place from the multi-picker
      // picked is passed directly to avoid async setState issue
      const picked = dedupConfirm._pickedMatch || dedupConfirm.pickedMatch;
      if (picked) {
        const userDescription = overrideData?.description || loc.description || '';
        const userRating = overrideData?.userRating ?? loc.userRating ?? null;
        const googleData = {
          ...loc, ...(overrideData || {}),
          name: picked.name,
          lat: picked.lat || loc.lat,
          lng: picked.lng || loc.lng,
          address: picked.address || '',
          mapsUrl: picked.mapsUrl || '',
          description: userDescription,
          userRating: userRating,
          googleRating: picked.rating || null,
          googleRatingCount: picked.ratingCount || 0,
          googlePlace: true,
          googlePlaceId: picked.googlePlaceId || ''
        };
        addCustomLocation(closeAfter, googleData);
        if (closeQuickCapture) setShowQuickCapture(false);
        showToast(`📍 ${t('dedup.googleMatch')}: ${picked.name}`, 'success');
      }
      setDedupConfirm(null);
      return;
    }

    if (action === 'accept') {
      // From addGooglePlaceToCustom: open the existing location for editing
      if (dedupConfirm.pendingGooglePlace) {
        setDedupConfirm(null);
        setTimeout(() => handleEditLocation(match), 200);
        showToast(`📍 "${match.name}" ${t('dedup.alreadyExists')}`, 'info');
        return;
      }      if (type === 'google') {
        // Preserve user's own description and rating — don't overwrite with Google data
        const userDescription = overrideData?.description || loc.description || '';
        const userRating = overrideData?.userRating ?? loc.userRating ?? null;
        const googleData = {
          ...loc,
          ...(overrideData || {}),
          name: match.name,
          lat: match.lat || loc.lat,
          lng: match.lng || loc.lng,
          address: match.address || '',
          mapsUrl: match.mapsUrl || '',
          description: userDescription, // keep user's description
          userRating: userRating,        // keep user's rating
          googleRating: match.rating || null,
          googleRatingCount: match.ratingCount || 0,
          googlePlace: true,
          googlePlaceId: match.googlePlaceId || ''
        };
        addCustomLocation(closeAfter, googleData);
        showToast(`📍 ${t('dedup.googleMatch')}: ${match.name}`, 'success');
      } else {
        // Custom match — don't add, merge interests if needed
        const newInterests = loc.interests.filter(i => !match.interests?.includes(i));
        if (newInterests.length > 0) {
          const mergedInterests = [...(match.interests || []), ...newInterests];
          const updated = customLocations.map(l => 
            l.id === match.id ? { ...l, interests: mergedInterests } : l
          );
          setCustomLocations(updated);
          if (isFirebaseAvailable && database && match.firebaseKey) {
            database.ref(`cities/${selectedCityId}/locations/${match.firebaseKey}/interests`).set(mergedInterests);
          }
          const interestNames = newInterests.map(id => {
            const opt = allInterestOptions.find(o => o.id === id);
            return opt ? (tLabel(opt) || id) : id;
          }).join(', ');
          showToast(`🔗 "${match.name}" +${interestNames}`, 'success');
        } else {
          showToast(`✅ "${match.name}" ${t('dedup.alreadyExists')}`, 'info');
        }
      }
    } else if (action === 'addNew') {
      if (dedupConfirm.pendingGooglePlace) {
        // Came from addGooglePlaceToCustom — force-add bypassing dedup check
        addGooglePlaceToCustom(dedupConfirm.pendingGooglePlace, true);
      } else {
        // Use overrideData if available (e.g. from QuickCapture where state may be stale)
        addCustomLocation(closeAfter, dedupConfirm.overrideData || null);
        showToast('✅ ' + t('trail.saved'), 'success');
      }
    }
    // action === 'cancel' — do nothing (photo already saved above)
    
    if (closeQuickCapture) setShowQuickCapture(false);
    setDedupConfirm(null);
  };

  // Bulk dedup scan — find all suspected duplicate pairs
  const scanAllDuplicates = (coordsOnly = false) => {
    const radius = sp.dedupRadiusMeters || 50;
    const locs = customLocations.filter(l => l.lat && l.lng);
    const clusters = [];
    const seen = new Set();
    
    // Build related interest map (bidirectional) — only for interest-based mode
    const relatedMap = {};
    if (!coordsOnly) {
      for (const opt of allInterestOptions) {
        const related = interestConfig[opt.id]?.dedupRelated || opt.dedupRelated || [];
        if (!relatedMap[opt.id]) relatedMap[opt.id] = new Set();
        related.forEach(r => {
          relatedMap[opt.id].add(r);
          if (!relatedMap[r]) relatedMap[r] = new Set();
          relatedMap[r].add(opt.id);
        });
      }
    }
    
    const interestsOverlap = (a, b) => {
      if (!a?.length || !b?.length) return false;
      for (const ia of a) {
        if (b.includes(ia)) return true;
        const rel = relatedMap[ia];
        if (rel && b.some(ib => rel.has(ib))) return true;
      }
      return false;
    };
    
    for (let i = 0; i < locs.length; i++) {
      if (seen.has(locs[i].id)) continue;
      const matches = [];
      for (let j = i + 1; j < locs.length; j++) {
        if (seen.has(locs[j].id)) continue;
        const dist = calcDistance(locs[i].lat, locs[i].lng, locs[j].lat, locs[j].lng);
        if (dist <= radius && (coordsOnly || interestsOverlap(locs[i].interests, locs[j].interests))) {
          matches.push({ ...locs[j], _distance: Math.round(dist) });
          seen.add(locs[j].id);
        }
      }
      if (matches.length > 0) {
        seen.add(locs[i].id);
        clusters.push({ loc: locs[i], matches });
      }
    }
    
    setBulkDedupResults(clusters);
    const modeLabel = coordsOnly ? '📐' : '🔍';
    if (clusters.length === 0) {
      showToast('✅ ' + t('dedup.noDuplicates'), 'success');
    } else {
      showToast(`${modeLabel} ${clusters.length} ${t('dedup.clustersFound')}`, 'info');
    }
  };

  // Merge: keep loc A, remove loc B
  const mergeDedupLocations = (keepId, removeId) => {
    const remove = customLocations.find(l => l.id === removeId);
    if (!remove) return;
    
    // Remove from customLocations
    const updated = customLocations.filter(l => l.id !== removeId);
    setCustomLocations(updated);
    
    // Remove from Firebase
    if (isFirebaseAvailable && database && remove.firebaseKey) {
      database.ref(`cities/${selectedCityId}/locations/${remove.firebaseKey}`).remove();
    }
    
    // Update bulk results
    setBulkDedupResults(prev => {
      if (!prev) return null;
      return prev.map(c => ({
        ...c,
        matches: c.matches.filter(m => m.id !== removeId)
      })).filter(c => c.loc.id !== removeId && c.matches.length > 0);
    });
    
    showToast(`🗑️ ${remove.name} → ${t('dedup.merged')}`, 'success');
  };

  const addCustomLocation = (closeAfter = true, overrideData = null) => {
    if (!requireSignIn()) return;
    const locData = overrideData || newLocation;
    // Remember interests for next add
    if (locData.interests?.length > 0) lastCaptureInterestsRef.current = locData.interests;
    if (!locData.name?.trim() || !locData.interests?.length) {
      if (locData.name?.trim() && !locData.interests?.length) {
        showToast(t('form.selectAtLeastOneInterest') || 'יש לבחור לפחות תחום אחד', 'warning');
      }
      return;
    }

    // Require coordinates
    const _lat = locData.lat, _lng = locData.lng;
    if (!_lat || !_lng || _lat === 0 || _lng === 0) {
      showToast(t('places.noCoordinates') || '📍 לא ניתן לשמור מקום ללא קואורדינטות — יש להזין כתובת או GPS', 'warning');
      return;
    }
    
    // Check for duplicate name — block save to prevent duplicates
    const exists = customLocations.find(loc => 
      loc.name.toLowerCase().trim() === locData.name.toLowerCase().trim()
    );
    if (exists) {
      showToast(`⚠️ "${locData.name}" ${t("places.alreadyInList")}`, 'warning');
      return; // BLOCK — don't save duplicate
    }
    
    // Use provided coordinates (can be null)
    let lat = locData.lat;
    let lng = locData.lng;
    let outsideArea = false;
    let hasCoordinates = (lat !== null && lng !== null && lat !== 0 && lng !== 0);
    
    // Auto-detect areas from coordinates at save time
    let finalAreas = locData.areas || (locData.area ? [locData.area] : []);
    if (hasCoordinates) {
      const detected = window.BKK.getAreasForCoordinates(lat, lng);
      if (detected.length > 0) {
        finalAreas = detected;
      } else if (finalAreas.length > 0) {
        // No area detected - check if manually selected areas match
        const inAnyArea = finalAreas.some(aId => checkLocationInArea(lat, lng, aId).valid);
        if (!inAnyArea) {
          const areaNames = finalAreas.map(aId => areaOptions.find(a => a.id === aId)).filter(Boolean).map(a => tLabel(a)).join(', ');
          showToast(
            `⚠️ ${locData.name.trim()} — ${t("toast.outsideAreaWarning")} (${areaNames})`,
            'warning'
          );
        }
      }
    }
    if (finalAreas.length === 0) finalAreas = [formData.area || areaOptions[0]?.id || 'center'];
    
    const newId = Date.now();
    let locationToAdd = {
      id: newId,
      name: locData.name.trim(),
      description: (locData.description || '').trim(),
      notes: (locData.notes || '').trim(),
      area: finalAreas[0],
      areas: finalAreas,
      interests: locData.interests,
      lat: lat,
      lng: lng,
      mapsUrl: locData.mapsUrl || '',
      address: locData.address || '',
      uploadedImage: locData.uploadedImage || null,
      imageUrls: locData.imageUrls || [],
      outsideArea: outsideArea, // Flag for outside area
      missingCoordinates: !hasCoordinates, // Flag for missing coordinates
      custom: true,
      status: 'active',
      locked: locData.locked || false,
      dedupOk: locData.dedupOk || false,
      googlePlaceId: locData.googlePlaceId || '',
      googlePlace: !!locData.googlePlace,
      googleRating: locData.googleRating || null,
      googleRatingCount: locData.googleRatingCount || 0,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      addedBy: authUser?.uid || null,
      cityId: selectedCityId
    };
    locationToAdd = sanitizeMapsUrl(locationToAdd);

    // Boundary check
    const boundaryResultAdd = checkLocationBoundary(locationToAdd.lat, locationToAdd.lng);
    if (boundaryResultAdd === 'block') { showToast(t('toast.savingOutsideCity'), 'warning', 'sticky'); return; }
    if (boundaryResultAdd === 'warn') showToast(t('toast.adminSavingOutsideCity'), 'warning', 'sticky');

    // Increment interest counters for auto-naming (if name matches "#N" pattern)
    const incrementCounters = () => {
      const nameMatch = locationToAdd.name.match(/#(\d+)$/);
      if (nameMatch && locationToAdd.interests?.length > 0) {
        const num = parseInt(nameMatch[1]);
        const updates = {};
        // interestCounters now computed from customLocations via useMemo — no Firebase write needed
      }
    };
    
    // Save to Firebase (or localStorage fallback)
    if (isFirebaseAvailable && database) {
      // DYNAMIC MODE: Firebase (shared) — SDK handles offline caching automatically
      incrementCounters();
      database.ref(`cities/${selectedCityId}/locations`).push(locationToAdd)
        .then(async (ref) => {
          // Firebase push succeeded (may be cached offline - SDK will sync when online)
          try {
            await Promise.race([
              ref.once('value'),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
            console.log('[FIREBASE] Location VERIFIED on server:', ref.key);
            showToast(`✅ ${locationToAdd.name} — ${t('places.placeAddedShared')}`, 'success');
            // Analytics
            window.BKK.logEvent?.('favorite_saved', {
              city: selectedCityId,
              interest: locationToAdd.interests?.[0] || 'unknown',
              has_photo: !!locationToAdd.uploadedImage,
              has_coords: !!(locationToAdd.lat && locationToAdd.lng),
              from_google: !!locationToAdd.googlePlace
            });
          } catch (verifyErr) {
            // Server unreachable but Firebase SDK has the data cached - it WILL sync when online
            console.warn('[FIREBASE] Saved to Firebase cache (will auto-sync):', verifyErr.message);
            showToast(`💾 ${locationToAdd.name} — ${t('toast.savedWillSync')}`, 'warning', 'sticky');
          }
          
          // Save userRating if provided (from QuickCapture or add dialog)
          if (locData.userRating && isFirebaseAvailable && database) {
            try {
              const pk = (locationToAdd.name || '').replace(/[.#$/\[\]]/g, '_');
              const uid = authUser?.uid || window.BKK.visitorId;
              const ratingScore = locData.userRating.score || locData.userRating;
              const ratingText = locData.userRating.text || '';
              await database.ref(`cities/${selectedCityId}/reviews/${pk}/${uid}`).set({
                rating: ratingScore,
                text: ratingText,
                timestamp: Date.now(),
                uid,
                userName: authUser?.displayName || authUser?.email || t('auth.anonymous')
              });
              await database.ref(`cities/${selectedCityId}/reviewRatings/${pk}/${uid}`).set(ratingScore);
              refreshReviewRating(selectedCityId, pk);
            } catch(e) { /* rating save failure is non-critical */ }
          }

          // If staying open, switch to edit mode
          if (!closeAfter) {
            const addedWithFirebaseId = { ...locationToAdd, firebaseId: ref.key };
            setEditingLocation(addedWithFirebaseId);
            setShowAddLocationDialog(false);
            setShowEditLocationDialog(true);
          }
        })
        .catch((error) => {
          // Firebase push itself failed — this shouldn't happen even offline, but save to pending as safety net
          console.error('[FIREBASE] Push failed completely, saving to pending:', error);
          saveToPending(locationToAdd);
        });
    } else {
      // STATIC MODE: localStorage (local)
      const updated = [...customLocations, locationToAdd];
      setCustomLocations(updated);
      showToast(t('places.placeAdded'), 'success');
      
      // If staying open, switch to edit mode
      if (!closeAfter) {
        setEditingLocation(locationToAdd);
        setShowAddLocationDialog(false);
        setShowEditLocationDialog(true);
      }
    }
    
    // Add to current route if exists (only if has coordinates)
    if (route && hasCoordinates) {
      const updatedRoute = {
        ...route,
        stops: [...route.stops, locationToAdd]
      };
      setRoute(updatedRoute);
    }
    
    if (closeAfter) {
      setShowAddLocationDialog(false);
      setAddLocRatingScore(0);
      setAddLocRatingText('');
      setNewLocation({ 
        name: '', 
        description: '', 
        notes: '',
        area: formData.area, 
        areas: [formData.area],
        interests: [], 
        lat: null, 
        lng: null, 
        mapsUrl: '',
        address: '',
        uploadedImage: null,
        imageUrls: []
      });
    } else {
      setAddLocRatingScore(0);
      setAddLocRatingText('');
    }
  };
  
  // Update existing location
  const updateCustomLocation = (closeAfter = true) => {
    if (!requireSignIn()) return;
    if (!newLocation.name?.trim()) {
      showToast(t('places.enterPlaceName'), 'warning');
      return;
    }

    // Require coordinates
    if (!newLocation.lat || !newLocation.lng || newLocation.lat === 0 || newLocation.lng === 0) {
      showToast(t('places.noCoordinates') || '📍 לא ניתן לשמור מקום ללא קואורדינטות — יש להזין כתובת או GPS', 'warning');
      return;
    }
    
    // Check for duplicate name (warn only, don't block)
    const exists = customLocations.find(loc => 
      loc.name.toLowerCase().trim() === newLocation.name.toLowerCase().trim() &&
      loc.id !== editingLocation.id
    );
    if (exists) {
      showToast(`⚠️ "${newLocation.name}" ${t("places.alreadyInList")}`, 'warning');
      return; // BLOCK
    }
    
    // Check if anything actually changed (normalize null/undefined)
    const hasChanges = locationHasChanges();
    
    if (!hasChanges) {
      showToast(`💡 ${t('places.noChanges') || 'אין שינויים לשמור'}`, 'info');
      if (closeAfter) {
        setShowEditLocationDialog(false);
        setEditingLocation(null);
      }
      return;
    }
    
    // Use provided coordinates (can be null)
    let hasCoordinates = (newLocation.lat !== null && newLocation.lng !== null && 
                          newLocation.lat !== 0 && newLocation.lng !== 0);
    let outsideArea = false;
    
    // Auto-detect areas from coordinates at save time
    let finalAreas = newLocation.areas || (newLocation.area ? [newLocation.area] : editingLocation.areas || []);
    if (hasCoordinates) {
      const detected = window.BKK.getAreasForCoordinates(newLocation.lat, newLocation.lng);
      if (detected.length > 0) {
        finalAreas = detected;
      } else if (finalAreas.length > 0) {
        const inAnyArea = finalAreas.some(aId => checkLocationInArea(newLocation.lat, newLocation.lng, aId).valid);
        if (!inAnyArea) {
          const areaNames = finalAreas.map(aId => areaOptions.find(a => a.id === aId)).filter(Boolean).map(a => tLabel(a)).join(', ');
          showToast(
            `⚠️ ${newLocation.name || editingLocation.name} — ${t("toast.outsideAreaWarning")} (${areaNames})`,
            'warning'
          );
        }
      }
    }
    if (finalAreas.length === 0) finalAreas = editingLocation.areas || [formData.area || areaOptions[0]?.id || 'center'];
    
    const updatedLocation = sanitizeMapsUrl({ 
      ...editingLocation, // Keep existing fields like status
      ...newLocation, // Override with edited fields
      area: finalAreas[0],
      areas: finalAreas,
      custom: true, 
      id: editingLocation.id,
      outsideArea: outsideArea,
      missingCoordinates: !hasCoordinates,
      updatedAt: new Date().toISOString() // Stamp update time
    });

    // Boundary check
    const boundaryResultUpdate = checkLocationBoundary(updatedLocation.lat, updatedLocation.lng);
    if (boundaryResultUpdate === 'block') { showToast(t('toast.savingOutsideCity'), 'warning', 'sticky'); return; }
    if (boundaryResultUpdate === 'warn') showToast(t('toast.adminSavingOutsideCity'), 'warning', 'sticky');

    // Update in Firebase (or localStorage fallback)
    if (isFirebaseAvailable && database) {
      // DYNAMIC MODE: Firebase (shared)
      const { firebaseId, ...locationData } = updatedLocation;
      
      // Optimistic local update — show change immediately without waiting for Firebase
      setCustomLocations(prev => prev.map(loc =>
        loc.id === updatedLocation.id ? { ...updatedLocation, firebaseId } : loc
      ));
      setRouteListKey(k => k + 1);
      
      if (firebaseId) {
        database.ref(`cities/${selectedCityId}/locations/${firebaseId}`).set(locationData)
          .then(async () => {
            // Verify server received it by reading back
            try {
              await Promise.race([
                database.ref(`cities/${selectedCityId}/locations/${firebaseId}`).once('value'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
              ]);
              console.log('[FIREBASE] Location update VERIFIED on server');
              showToast(`✅ ${updatedLocation.name} — ${t('places.placeUpdated')}`, 'success');
            } catch (e) {
              showToast(`💾 ${updatedLocation.name} — ${t('toast.savedWillSync')}`, 'warning', 'sticky');
            }
            if (!closeAfter) {
              const fresh = { ...updatedLocation, firebaseId };
              setEditingLocation(fresh);
              // Refresh form so it reflects saved state (prevents false "no changes" on next save)
              setNewLocation({
                name: fresh.name || '', description: fresh.description || '', notes: fresh.notes || '',
                area: fresh.area || '', areas: fresh.areas || [], interests: fresh.interests || [],
                lat: fresh.lat || null, lng: fresh.lng || null, mapsUrl: fresh.mapsUrl || '',
                address: fresh.address || '', uploadedImage: fresh.uploadedImage || null,
                imageUrls: fresh.imageUrls || [], locked: !!fresh.locked, dedupOk: !!fresh.dedupOk,
                googlePlaceId: fresh.googlePlaceId || '', googleRating: fresh.googleRating || null,
                googleRatingCount: fresh.googleRatingCount || 0
              });
            }
          })
          .catch((error) => {
            console.error('[FIREBASE] Error updating location:', error);
            showToast(`❌ ${updatedLocation.name} — ${t('toast.updateError')}: ${error.message || error}`, 'error', 'sticky');
          });
      }
    } else {
      // STATIC MODE: localStorage (local)
      const updated = customLocations.map(loc => 
        loc.id === editingLocation.id ? updatedLocation : loc
      );
      setCustomLocations(updated);
      showToast(t('places.placeUpdated'), 'success');
      // Update editingLocation with latest data
      if (!closeAfter) {
        setEditingLocation(updatedLocation);
      }
    }
    
    if (closeAfter) {
      setShowEditLocationDialog(false);
      setEditingLocation(null);
      setNewLocation({ 
        name: '', 
        description: '', 
        notes: '',
        area: formData.area, 
        areas: [formData.area],
        interests: [], 
        lat: null, 
        lng: null, 
        mapsUrl: '',
        address: '',
        uploadedImage: null,
        imageUrls: []
      });
    }
  };

  // Get current location from GPS
  const getCurrentLocation = () => {
    showToast(t('form.searchingLocation'), 'info');
    
    window.BKK.getValidatedGps(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        const detected = window.BKK.getAreasForCoordinates(lat, lng);
        const areaUpdates = detected.length > 0 ? { areas: detected, area: detected[0] } : {};
        
        setNewLocation(prev => ({
          ...prev,
          lat: lat,
          lng: lng,
          mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
          ...areaUpdates
        }));
        
        showToast(`${t("toast.locationDetectedCoords")} ${lat.toFixed(5)}, ${lng.toFixed(5)}${detected.length > 0 ? ` (${detected.length} ${t("toast.detectedAreas")})` : ''}`, 'success');
        
        try {
          const address = await reverseGeocode(lat, lng);
          if (address) {
            setNewLocation(prev => ({ ...prev, address: address }));
          }
        } catch (err) {
          console.log('[GPS] Reverse geocode failed (ok):', err);
        }
      },
      (reason) => {
        if (reason === 'outside_city') showToast(t('toast.outsideCity'), 'warning', 'sticky');
        else showToast(reason === 'denied' ? t('toast.locationNoPermission') : t('toast.noGpsSignal'), 'error', 'sticky');
      }
    );
  };

  // Parse Google Maps URL to extract coordinates
  // Search address using Google Places API (instead of Geocoding)
  const geocodeAddress = async (address) => {
    if (!address || !address.trim()) {
      showToast(t('form.enterAddress'), 'warning');
      return;
    }

    try {
      showToast(t('places.searchingAddress'), 'info');
      
      // Add city name if not already included
      const cityName = window.BKK.cityNameForSearch || 'Bangkok';
      const countryName = window.BKK.selectedCity?.country || '';
      const searchQuery = address.toLowerCase().includes(cityName.toLowerCase()) 
        ? address 
        : `${address}, ${cityName}${countryName ? ', ' + countryName : ''}`;
      
      // Use Google Places API Text Search
      const response = await fetch(
        `https://places.googleapis.com/v1/places:searchText`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress'
          },
          body: JSON.stringify({
            textQuery: searchQuery,
            maxResultCount: 1
          })
        }
      );
      
      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        const location = place.location;
        const formattedAddress = place.formattedAddress || place.displayName?.text || searchQuery;
        
        // Auto-detect areas from coordinates
        const detected = window.BKK.getAreasForCoordinates(location.latitude, location.longitude);
        const areaUpdates = detected.length > 0 ? { areas: detected, area: detected[0] } : {};
        
        const updatedLoc = {
          ...newLocation,
          lat: location.latitude,
          lng: location.longitude,
          address: formattedAddress,
          googlePlaceId: place.id || null,
          ...areaUpdates
        };
        updatedLoc.mapsUrl = window.BKK.getGoogleMapsUrl(updatedLoc);
        setNewLocation(updatedLoc);
        
        showToast(`${t("toast.found")} ${formattedAddress}${detected.length > 0 ? ` (${detected.length} ${t("toast.detectedAreas")})` : ''}`, 'success');
      } else {
        showToast(t('places.addressNotFoundRetry'), 'error');
      }
    } catch (error) {
      console.error('[GEOCODING] Error:', error);
      showToast(t('toast.addressSearchErrorHint'), 'error');
    }
  };

  // Search places by name - returns multiple results for picking
  const searchPlacesByName = async (query) => {
    if (!query || !query.trim()) return;
    try {
      setLocationSearchResults([]); // show loading state
      const cityForSearch = window.BKK.cityNameForSearch || 'Bangkok';
      const countryForSearch = window.BKK.selectedCity?.country || '';
      const searchQuery = query.toLowerCase().includes(cityForSearch.toLowerCase()) ? query : `${query}, ${cityForSearch}${countryForSearch ? ', ' + countryForSearch : ''}`;
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.userRatingCount'
        },
        body: JSON.stringify({ textQuery: searchQuery, maxResultCount: window.BKK.systemParams?.pointSearchMaxGoogle || 10 })
      });
      const data = await response.json();
      if (data.places && data.places.length > 0) {
        setLocationSearchResults(data.places.map(p => ({
          name: p.displayName?.text || '',
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          address: p.formattedAddress || '',
          rating: p.rating,
          ratingCount: p.userRatingCount,
          googlePlaceId: p.id
        })));
      } else {
        setLocationSearchResults([]);
        showToast(t('places.noPlacesFound'), 'warning');
      }
    } catch (err) {
      console.error('[SEARCH] Error:', err);
      showToast(t('toast.searchError'), 'error');
      setLocationSearchResults(null);
    }
  };

  // Search places for radius-mode point selection in step 2
  const searchPointForRadius = async (query) => {
    if (!query || !query.trim()) return;
    try {
      setPointSearchResults([]); // empty = loading
      const q = query.toLowerCase().trim();
      // Search favorites by name only — address search causes false matches (e.g. "Watthana" district)
      const favMatches = (customLocations || []).filter(cl => {
        if (!cl.lat || !cl.lng) return false;
        const name = (cl.name || '').toLowerCase();
        return name.includes(q);
      }).slice(0, window.BKK.systemParams?.pointSearchMaxFavorites || 5).map(cl => ({
        name: cl.name, lat: cl.lat, lng: cl.lng,
        address: cl.address || '', rating: cl.googleRating,
        ratingCount: cl.googleRatingCount, googlePlaceId: cl.googlePlaceId,
        isFavorite: true, favData: cl
      }));
      // Search Google Places
      const cityForSearch = window.BKK.cityNameForSearch || 'Bangkok';
      const countryForSearch = window.BKK.selectedCity?.country || '';
      const searchQuery = query.toLowerCase().includes(cityForSearch.toLowerCase()) ? query : `${query}, ${cityForSearch}${countryForSearch ? ', ' + countryForSearch : ''}`;
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.userRatingCount'
        },
        body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 5 })
      });
      const data = await response.json();
      const googleResults = data.places && data.places.length > 0
        ? data.places.map(p => ({
            name: p.displayName?.text || '',
            lat: p.location?.latitude, lng: p.location?.longitude,
            address: p.formattedAddress || '', rating: p.rating,
            ratingCount: p.userRatingCount, googlePlaceId: p.id,
            isFavorite: false
          })).filter(p => {
            // Remove from Google list if already in favorites (by placeId or proximity)
            return !favMatches.some(f =>
              (f.googlePlaceId && p.googlePlaceId && f.googlePlaceId === p.googlePlaceId) ||
              (f.lat && f.lng && Math.abs(f.lat - p.lat) < 0.0002 && Math.abs(f.lng - p.lng) < 0.0002)
            );
          })
        : [];
      if (favMatches.length === 0 && googleResults.length === 0) {
        setPointSearchResults([]);
        showToast(t('places.noPlacesFound'), 'warning');
      } else {
        setPointSearchResults({ favorites: favMatches, google: googleResults });
      }
    } catch (err) {
      console.error('[POINT SEARCH] Error:', err);
      setPointSearchResults(null);
    }
  };

  // Reverse geocode: get address from coordinates
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places:searchText`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.formattedAddress'
          },
          body: JSON.stringify({
            textQuery: `${lat},${lng}`,
            maxResultCount: 1
          })
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



