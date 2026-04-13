

  // Unified wizard step header — optionally pass hintId to embed hint button in title row
  const renderStepHeader = (icon, title, subtitle, hintId) => {
    const isRTL = window.BKK.i18n.isRTL();
    const lang = window.BKK.i18n.currentLang || 'he';
    const hasAudio = hintId && !!hintAudioUrls[hintId + '_' + lang];
    const s = hintId && getHelpSection(hintId);
    const hintTxt = (s && s.content && s.content.trim()) || '';
    const showHintBtn = hintId && (hintTxt || isAdmin);
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 10px', marginBottom: '8px',
        background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
        borderRadius: '10px', border: '1px solid #e0e7ff',
        direction: isRTL ? 'rtl' : 'ltr'
      }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>{renderIcon(icon, '18px')}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', lineHeight: 1.2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>{subtitle}</div>}
        </div>
        {showHintBtn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            {isAdmin && <button onClick={() => { const s2 = getHelpSection(hintId); setHintEditId(hintId); setHintEditText((s2 && s2.content) || ''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#d1d5db', padding: '0 1px' }}>✏️</button>}
            <button
              onClick={() => setOpenHintPopup(openHintPopup === hintId ? null : hintId)}
              title={isRTL ? 'הסבר מורחב' : 'More info'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '2px',
                padding: '2px 9px', fontSize: '14px', fontWeight: '800',
                background: openHintPopup === hintId ? '#c7d2fe' : '#e0e7ff',
                color: '#3730a3', border: '1.5px solid #818cf8',
                borderRadius: '999px', cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(99,102,241,0.3)'
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '800' }}>ℹ</span>
              {hasAudio && <span style={{ fontSize: '10px' }}>🔈</span>}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderIcon = (icon, size = '14px') => {
    if (!icon) return null;
    const isUrl = typeof icon === 'string' && (icon.startsWith('data:') || icon.startsWith('http'));
    return isUrl 
      ? <img src={icon} alt="" style={{ width: size, height: size, objectFit: 'contain', display: 'inline', verticalAlign: 'middle' }} />
      : icon;
  };

  // Shared import file parser — used from settings and favorites screen
  const parseImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let raw = event.target.result.trim();
        let data;
        try { data = JSON.parse(raw); } catch (e1) {
          try { data = JSON.parse(`[${raw}]`); } catch (e2) {
            try { data = JSON.parse(raw.replace(/,\s*([}\]])/g, '$1')); } catch (e3) {
              try { data = JSON.parse(`[${raw.replace(/,\s*([}\]])/g, '$1')}]`); } catch (e4) { throw e1; }
            }
          }
        }
        if (Array.isArray(data)) data = { customLocations: data };
        if (!data.customLocations && !data.customInterests && !data.savedRoutes) {
          const arrKey = Object.keys(data).find(k => Array.isArray(data[k]) && data[k].length > 0 && typeof data[k][0] === 'object');
          if (arrKey) data = { customLocations: data[arrKey] };
        }
        if (data.customLocations) {
          const fieldMap = {
            'שם המקום': 'name', 'שם': 'name', 'place': 'name', 'placeName': 'name', 'place_name': 'name', 'title': 'name',
            'name_he': 'name', 'שם_עברית': 'name',
            'תיאור': 'description', 'desc': 'description', 'description_he': 'description',
            'הערות': 'notes', 'note': 'notes', 'tip': 'notes', 'tips': 'notes', 'notes_he': 'notes',
            'כתובת': 'address', 'address_he': 'address',
            'קטגוריה': '_category', 'category': '_category', 'type': '_category', 'סוג': '_category',
            'קטגוריות': '_category', 'categories': '_category',
            'תחומים': 'interests', 'interest': 'interests', 'tags': 'interests',
            'אזור': 'areas', 'area': 'areas', 'אזורים': 'areas',
            'latitude': 'lat', 'longitude': 'lng', 'קו רוחב': 'lat', 'קו אורך': 'lng',
            'קישור': 'mapsUrl', 'url': 'mapsUrl', 'link': 'mapsUrl', 'google_maps': 'mapsUrl', 'googleMaps': 'mapsUrl',
            'google_maps_url': 'mapsUrl', 'googleMapsUrl': 'mapsUrl',
            'place_id': 'placeId', 'placeId': 'placeId',
            'reviews_count': 'reviewsCount', 'reviewsCount': 'reviewsCount',
            'area_name_he': '_areaMeta', 'category_name_he': '_catMeta', 'places_count': '_countMeta',
          };
          data.customLocations = data.customLocations.map(loc => {
            const normalized = {};
            for (const [key, val] of Object.entries(loc)) {
              const mapped = fieldMap[key] || fieldMap[key.toLowerCase()] || key;
              normalized[mapped] = val;
            }
            if (normalized.address && typeof normalized.address === 'object' && normalized.address.lat) {
              if (!normalized.lat) normalized.lat = normalized.address.lat;
              if (!normalized.lng) normalized.lng = normalized.address.lng || normalized.address.lon;
              delete normalized.address;
            }
            if (loc.location && typeof loc.location === 'object' && loc.location.lat) {
              if (!normalized.lat) normalized.lat = loc.location.lat;
              if (!normalized.lng) normalized.lng = loc.location.lng || loc.location.lon;
            } else if (loc.location && typeof loc.location === 'string') {
              if (!normalized.address) normalized.address = loc.location;
            }
            if (loc.name && loc.name_he && loc.name !== loc.name_he) {
              normalized.name = loc.name_he;
              normalized.nameEn = loc.name;
            }
            if (!normalized.name && normalized.name_he) normalized.name = normalized.name_he;
            if (!normalized.description && normalized.description_he) normalized.description = normalized.description_he;
            if (!normalized.notes && normalized.notes_he) normalized.notes = normalized.notes_he;
            if (!normalized.mapsUrl && normalized.google_maps_url) normalized.mapsUrl = normalized.google_maps_url;
            if (!normalized.placeId && normalized.place_id) normalized.placeId = normalized.place_id;
            if (!normalized.reviewsCount && normalized.reviews_count) normalized.reviewsCount = normalized.reviews_count;
            delete normalized._areaMeta; delete normalized._catMeta; delete normalized._countMeta;
            if (!normalized.name) {
              const firstStr = Object.values(loc).find(v => typeof v === 'string' && v.length > 1 && v.length < 100);
              if (firstStr) normalized.name = firstStr;
            }
            if (normalized._category && !normalized.notes) normalized.notes = String(normalized._category);
            delete normalized._category;
            if (normalized.areas && !Array.isArray(normalized.areas)) normalized.areas = [normalized.areas];
            if (normalized.interests && !Array.isArray(normalized.interests)) normalized.interests = [normalized.interests];
            return normalized;
          }).filter(loc => loc.name);
        }
        if (!data.customInterests && !data.customLocations?.length && !data.savedRoutes) {
          showToast(t('toast.invalidFileNoData'), 'error');
          return;
        }
        setImportedData(data);
        setShowImportDialog(true);
      } catch (error) {
        console.error('[IMPORT] Error:', error);
        showToast(`${t('toast.fileReadError')}: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-rose-50" dir={window.BKK.i18n.isRTL() ? 'rtl' : 'ltr'}>
      {/* Loading Overlay */}
      {!isDataLoaded && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #E17055 0%, #FDCB6E 100%)' }}>
          <div className="text-center">
            <svg viewBox="0 0 200 200" width="72" height="72" style={{ margin: '0 auto 12px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}>
              <circle cx="100" cy="108" r="52" fill="#FFE8D6"/>
              <polygon points="62,72 50,28 82,58" fill="#FFE8D6"/>
              <polygon points="138,72 150,28 118,58" fill="#FFE8D6"/>
              <polygon points="64,70 54,34 80,58" fill="#FFCBA4"/>
              <polygon points="136,70 146,34 120,58" fill="#FFCBA4"/>
              <rect x="68" y="94" width="26" height="19" rx="6" fill="#2D2D2D" opacity="0.9"/>
              <rect x="106" y="94" width="26" height="19" rx="6" fill="#2D2D2D" opacity="0.9"/>
              <line x1="94" y1="103" x2="106" y2="103" stroke="#2D2D2D" strokeWidth="3"/>
              <line x1="68" y1="100" x2="56" y2="95" stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="132" y1="100" x2="144" y2="95" stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M95,120 L100,125 L105,120 Z" fill="#FF8C94"/>
              <path d="M90,130 Q100,138 110,130" fill="none" stroke="#8B6F5E" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M148,140 Q170,125 165,100" fill="none" stroke="#FFE8D6" strokeWidth="10" strokeLinecap="round"/>
            </svg>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '4px', textShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>FouFou</h2>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginBottom: '16px' }}>City Trail Generator 🍜🏛️🎭</div>
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" style={{ color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.3 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path style={{ opacity: 0.8 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{t("general.loading")}</span>
            </div>
          </div>
        </div>
      )}

      {(() => {
        void cityEditCounter; // ensure header re-renders when city data changes
        const theme = window.BKK.selectedCity?.theme || { color: '#e11d48', iconLeft: '🏙️', iconRight: '🗺️' };
        const c = theme.color || '#e11d48';
        return (
      <div style={{
        background: `linear-gradient(135deg, ${c} 0%, ${c}dd 50%, ${c} 100%)`,
        backgroundSize: '200% 200%',
        animation: 'headerShimmer 6s ease infinite',
        padding: '6px 16px',
        boxShadow: `0 2px 8px ${c}33`,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {/* Feedback button - left in RTL, right in LTR */}
          <button
            onClick={() => {
                if (authUser) {
                  if (!feedbackSenderName && authUser.displayName) setFeedbackSenderName(authUser.displayName);
                  if (!feedbackSenderEmail && authUser.email) setFeedbackSenderEmail(authUser.email);
                }
                setShowFeedbackDialog(true);
              }}
            style={{
              position: 'absolute',
              [currentLang === 'he' ? 'left' : 'right']: '0',
              background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: '50%',
              width: '26px', height: '26px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '13px', color: 'white',
              transition: 'background 0.2s'
            }}
            title={t("settings.sendFeedback")}
          >💬{hasNewFeedback && isCurrentUserAdmin && <span style={{ position: 'absolute', top: '1px', right: '1px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', border: '1px solid white' }} />}</button>
          {/* Hamburger menu button - right in RTL, left in LTR */}
          <button
            onClick={() => setShowHeaderMenu(prev => !prev)}
            style={{
              position: 'absolute',
              [currentLang === 'he' ? 'right' : 'left']: '0',
              background: showHeaderMenu ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: '50%',
              width: '26px', height: '26px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '13px', color: 'white',
              transition: 'background 0.2s'
            }}
            title={t("general.menu")}
          >☰</button>
          {(theme.iconLeft || window.BKK.selectedCity?.secondaryIcon) && (() => {
            const val = theme.iconLeft || window.BKK.selectedCity?.secondaryIcon;
            return <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>
              {val.startsWith('data:') ? <img src={val} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> : val}
            </span>;
          })()}
          <h1 style={{ 
            fontSize: '16px', 
            fontWeight: '800', 
            color: 'white',
            letterSpacing: '0.5px',
            margin: 0,
            textShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>{tLabel(window.BKK.selectedCity) || 'FouFou'}</h1>
          {theme.iconRight && (() => {
            const val = theme.iconRight;
            return <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>
              {val.startsWith('data:') ? <img src={val} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> : val}
            </span>;
          })()}
          <span style={{ 
            fontSize: '8px', 
            color: 'rgba(255,255,255,0.5)',
            alignSelf: 'flex-end',
            marginBottom: '2px'
          }}>v{window.BKK.VERSION}</span>
          {isFirebaseAvailable && !firebaseConnected && (
            <span title={t('toast.offline')} style={{ 
              fontSize: '8px', 
              color: '#fbbf24',
              alignSelf: 'flex-end',
              marginBottom: '2px',
              animation: 'pulse 2s infinite'
            }}>⚡</span>
          )}
          {(pendingLocations.length + pendingInterests.length) > 0 && (
            <span title={`${pendingLocations.length + pendingInterests.length} ${t('toast.pendingSync')}`} style={{ 
              fontSize: '8px', 
              color: '#fb923c',
              alignSelf: 'flex-end',
              marginBottom: '2px',
              fontWeight: 'bold',
              animation: 'pulse 2s infinite'
            }}>☁️{pendingLocations.length + pendingInterests.length}</span>
          )}
        </div>
        {/* Header hamburger dropdown menu */}
        {showHeaderMenu && (<>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowHeaderMenu(false)} />
          <div style={{
            position: 'absolute', top: '100%', [currentLang === 'he' ? 'right' : 'left']: '0',
            background: 'white', borderRadius: '12px', marginTop: '4px', padding: '4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 50, minWidth: '150px'
          }}>
            {[
              { icon: '🗺️', label: t('nav.route'), view: 'form' },
              { icon: '⭐', label: t('nav.favorites'), view: 'myPlaces', count: cityCustomLocations.filter(l => l.status !== 'blacklist').length },
              { icon: '🏷️', label: t('nav.myInterests'), view: 'myInterests', count: allInterestOptions.filter(o => {
                const aStatus = o.adminStatus || 'active';
                if (aStatus === 'hidden') return false;
                if (aStatus === 'draft' && !isUnlocked) return false;
                if (o.scope === 'local' && o.cityId && o.cityId !== selectedCityId) return false;
                return true;
              }).length },
              { icon: '💾', label: t('nav.saved'), view: 'saved', count: citySavedRoutes.length },
              // Settings — admin only (hidden from regular users, not just blocked)
              ...(isAdmin ? [{ icon: '⚙️', label: t('settings.title'), view: 'settings' }] : []),
            ].map(item => (
              <button
                key={item.view}
                onClick={() => {
                  setCurrentView(item.view);
                  setShowHeaderMenu(false);
                  window.scrollTo(0, 0);
                  window.BKK.logEvent?.('nav_menu_clicked', { destination: item.view });
                }}
                style={{
                  width: '100%', textAlign: currentLang === 'he' ? 'right' : 'left',
                  background: currentView === item.view ? '#f3f4f6' : 'transparent',
                  border: 'none', borderRadius: '8px', padding: '8px 12px',
                  color: '#374151', fontSize: '13px', fontWeight: currentView === item.view ? '700' : '500',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'background 0.15s'
                }}
              >
                <span style={{ fontSize: '15px' }}>{renderIcon(item.icon, '16px')}</span>
                <span>{item.label}{item.count > 0 ? ` (${item.count})` : ''}</span>
              </button>
            ))}
            {/* About — visible to all users */}
            <button
              onClick={() => { setShowAbout(true); setShowHeaderMenu(false); window.BKK.logEvent?.('nav_menu_clicked', { destination: 'about' }); }}
              style={{
                width: '100%', textAlign: currentLang === 'he' ? 'right' : 'left',
                background: 'transparent', border: 'none', borderRadius: '8px', padding: '8px 12px',
                color: '#374151', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <span style={{ fontSize: '15px' }}>ℹ️</span>
              <span>{t('about.title') || (currentLang === 'he' ? 'אודות' : 'About')}</span>
            </button>
            {/* Divider + Auth button */}
            <div style={{ height: '1px', background: '#e5e7eb', margin: '4px 8px' }}></div>
            <button
              onClick={() => { setShowLoginDialog(true); setShowHeaderMenu(false); }}
              style={{
                width: '100%', textAlign: currentLang === 'he' ? 'right' : 'left',
                background: 'transparent', border: 'none', borderRadius: '8px', padding: '8px 12px',
                color: '#374151', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <span style={{ fontSize: '15px' }}>{authUser ? '👤' : '🔑'}</span>
              <span>{authUser ? (authUser.displayName || authUser.email || (t('auth.anonymous'))) : (t('auth.signIn') || 'התחבר')}</span>
              {authUser && <span style={{ fontSize: '9px', marginRight: 'auto', marginLeft: '4px', padding: '1px 5px', borderRadius: '4px', background: isAdmin ? '#fef2f2' : isEditor ? '#f3e8ff' : '#f3f4f6', color: isAdmin ? '#dc2626' : isEditor ? '#7c3aed' : '#9ca3af' }}>{isAdmin ? 'Admin' : isEditor ? 'Editor' : ''}{roleOverride !== null ? ' 🎭' : ''}</span>}
            </button>
            {isAdmin && (
              <button
                onClick={() => { setShowUserManagement(true); authLoadAllUsers(); setShowHeaderMenu(false); }}
                style={{
                  width: '100%', textAlign: currentLang === 'he' ? 'right' : 'left',
                  background: 'transparent', border: 'none', borderRadius: '8px', padding: '8px 12px',
                  color: '#374151', fontSize: '13px', fontWeight: '500',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <span style={{ fontSize: '15px' }}>👥</span>
                <span>{t('auth.userManagement')}</span>
              </button>
            )}
            {/* Return to Admin — shown when simulating another role */}
            {isRealAdmin && roleOverride !== null && (
              <button
                onClick={() => { setRoleOverride(null); setShowHeaderMenu(false); showToast('👑 חזרת למצב Admin', 'success'); }}
                style={{
                  width: '100%', textAlign: currentLang === 'he' ? 'right' : 'left',
                  background: '#faf5ff', border: 'none', borderRadius: '8px', padding: '8px 12px',
                  color: '#7c3aed', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <span style={{ fontSize: '15px' }}>🎭</span>
                <span>👑 חזור למצב Admin</span>
              </button>
            )}
          </div>
        </>)}
      </div>
      );
      })()}

      {/* Update Banner */}
      {updateAvailable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🐾</div>
            <h3 className="text-lg font-bold mb-2">{t("general.newVersionAvailableBanner")}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("general.updateDesc")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setUpdateAvailable(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200"
              >
                {t("general.later")}
              </button>
              <button
                onClick={applyUpdate}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                {t("general.updateNow")}
              </button>
            </div>
          </div>
        </div>
      )}      <div className="max-w-4xl mx-auto p-2 sm:p-4 pb-32">
        {/* ACTIVE TRAIL MODE — shown when user opened Google Maps route */}
        {activeTrail && currentView === 'form' && (
          <div className="view-fade-in">
            {/* Compact header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <button onClick={() => switchLanguage(currentLang === 'he' ? 'en' : 'he')} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2px 8px', color: '#6b7280', fontSize: '10px', cursor: 'pointer' }}>
                {currentLang === 'he' ? '🇬🇧 EN' : '🇮🇱 עב'}
              </button>
              <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>🐾 {t('trail.activeTitle')}</span>
              </div>
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                ⏱️ {(() => { const mins = Math.round((Date.now() - activeTrail.startedAt) / 60000); return mins < 60 ? `${mins} ${t('general.min')}` : `${Math.floor(mins/60)}h ${mins%60}m`; })()}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 8px 0', textAlign: 'center' }}>{t('trail.activeDesc')}</p>
            {renderContextHint('activeTrail')}

            {/* Camera Button row — doc button on left (after camera in DOM = left in RTL, closes naturally (ok) */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'stretch' }}>
            <button
              onClick={() => {
                if (!authUser || authUser.isAnonymous) { setShowLoginDialog(true); showToast(t('auth.signInRequired'), 'info', 'sticky'); return; }
                // Interest priority: user's manual selection this session > trail interests > wizard selection
                // Filter to valid IDs only (prevents stale i_nature etc from old sessions)
                const validIds = new Set(allInterestOptions.map(o => o.id));
                const lastValid = lastCaptureInterestsRef.current.filter(id => validIds.has(id));
                const defaultInterestsTrail = lastValid.length > 0
                  ? lastValid
                  : activeTrail.interests?.filter(id => validIds.has(id)).slice(0, 2).length > 0
                    ? activeTrail.interests.filter(id => validIds.has(id)).slice(0, 2)
                    : formData.interests?.filter(id => validIds.has(id)).slice(0, 1) || [];
                const initLocation = {
                  name: '', description: '', notes: '',
                  area: activeTrail.area || formData.area,
                  areas: activeTrail.area ? [activeTrail.area] : [formData.area],
                  interests: defaultInterestsTrail,
                  lat: null, lng: null, mapsUrl: '', address: '',
                  uploadedImage: null, imageUrls: [],
                  nearestStop: null, gpsLoading: true
                };
                setNewLocation(initLocation);
                setShowQuickCapture(true);
                if (navigator.geolocation) {
                  window.BKK.getValidatedGps(
                    (pos) => {
                      const lat = pos.coords.latitude;
                      const lng = pos.coords.longitude;
                      let nearest = null;
                      let minDist = Infinity;
                      (activeTrail.stops || []).forEach((stop, idx) => {
                        if (!stop.lat || !stop.lng) return;
                        const dlat = (lat - stop.lat) * 111320;
                        const dlng = (lng - stop.lng) * 111320 * Math.cos(lat * Math.PI / 180);
                        const dist = Math.sqrt(dlat * dlat + dlng * dlng);
                        if (dist < minDist) { minDist = dist; nearest = { ...stop, idx, dist: Math.round(dist) }; }
                      });
                      const detected = window.BKK.getAreasForCoordinates(lat, lng);
                      const areaUpdates = detected.length > 0 ? { areas: detected, area: detected[0] } : {};
                      setNewLocation(prev => ({
                        ...prev, lat, lng, nearestStop: nearest, gpsLoading: false, ...areaUpdates
                      }));
                    },
                    (reason) => {
                      setNewLocation(prev => ({...prev, gpsLoading: false, gpsBlocked: true}));
                      showToast(reason === 'outside_city' ? t('toast.outsideCity') : reason === 'denied' ? t('toast.locationNoPermission') : t('toast.noGpsSignal'), 'warning', 'sticky');
                    }
                  );
                }
              }}
              style={{
                flex: 1, padding: '10px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(34,197,94,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <span style={{ fontSize: '18px' }}>📸</span>
              <span>{t('trail.capturePlace')}</span>
            </button>
              {(() => {
                const lang = window.BKK.i18n.currentLang || 'he';
                const hasAudio = !!hintAudioUrls['hint_trail_' + lang];
                const s = getHelpSection('activeTrail');
                const txt = (s && s.content && s.content.trim()) || '';
                // Always show hint button in active trail — even when empty, users expect it
                return (
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
                    {isAdmin && (
                      <button onClick={() => { setHintEditId('activeTrail'); setHintEditText(txt); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#d1d5db', padding: '0' }}>✏️</button>
                    )}
                    <button onClick={() => setOpenHintPopup(openHintPopup === 'activeTrail' ? null : 'activeTrail')}
                      style={{ height: '100%', minHeight: '38px', borderRadius: '10px', padding: '0 10px', border: '1.5px solid #818cf8', background: openHintPopup === 'activeTrail' ? '#c7d2fe' : '#e0e7ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '15px', color: '#3730a3', fontWeight: '800' }}>
                      <span>ℹ</span>{hasAudio && <span style={{ fontSize: '10px' }}>🔈</span>}
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Trail Stops — compact list */}
            {activeTrail.stops?.length > 0 && (
              <div style={{ background: 'white', borderRadius: '12px', padding: '8px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '4px' }}>
                  {`📍 ${t('trail.stops')} (${activeTrail.stops.length - skippedTrailStops.size}/${activeTrail.stops.length})`}
                </div>
                {/* Legend — active trail interests with their colors */}
                {(() => {
                  const legendInterests = (activeTrail.interests || [])
                    .map(id => allInterestOptions.find(o => o.id === id))
                    .filter(Boolean);
                  if (legendInterests.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px', padding: '2px 0' }}>
                      {legendInterests.map(int => {
                        const color = window.BKK.getInterestColor(int.id, allInterestOptions);
                        const iconRaw = int.icon || '';
                        const isImg = iconRaw.startsWith('data:');
                        return (
                          <div key={int.id} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#4b5563' }}>
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }}></span>
                            {isImg
                              ? <img src={iconRaw} alt="" style={{ width: '12px', height: '12px', objectFit: 'contain' }} />
                              : <span style={{ fontSize: '11px', lineHeight: 1 }}>{iconRaw}</span>
                            }
                            <span>{tLabel(int)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {(() => {
                    // Build sequential letter map: only active stops get letters
                    const trailLetterMap = {};
                    let tLetterIdx = 0;
                    activeTrail.stops.forEach((_, idx) => {
                      if (!skippedTrailStops.has(idx)) {
                        trailLetterMap[idx] = String.fromCharCode(65 + tLetterIdx);
                        tLetterIdx++;
                      }
                    });
                    return activeTrail.stops.slice(0, 12).map((stop, idx) => {
                    const isSkipped = skippedTrailStops.has(idx);
                    const letter = trailLetterMap[idx] || '';
                    const isFavorite = customLocations.find(cl => cl.name === stop.name || (cl.lat && stop.lat && Math.abs(cl.lat - stop.lat) < 0.0001 && Math.abs(cl.lng - stop.lng) < 0.0001));
                    const pk = (stop.name || '').replace(/[.#$/\\[\]]/g, '_');
                    const ra = isFavorite ? reviewAverages[pk] : null;
                    // Color by interest — matches map markers
                    const stopInterestId = stop.interest || (isFavorite && isFavorite.interests?.[0]) || null;
                    const stopColor = isSkipped ? '#d1d5db' : (stopInterestId ? window.BKK.getInterestColor(stopInterestId, allInterestOptions) : window.BKK.stopColorPalette[idx % window.BKK.stopColorPalette.length]);
                    return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px',
                      background: '#f9fafb', borderRadius: '6px', fontSize: '11px',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: stopColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 'bold', color: 'white', flexShrink: 0,
                      }}>{letter}</span>
                      <span
                        onClick={() => {
                          if (isSkipped) return;
                          if (isFavorite) {
                            if (!isFavorite.mapsUrl && !isFavorite.googlePlaceId && !isFavorite.placeId && !isFavorite.address) {
                              showToast(t('places.favoriteNotOnGoogle'), 'info');
                            }
                            setModalImage(isFavorite.uploadedImage || '__placeholder__');
                            setModalImageCtx({ description: isFavorite.description, location: isFavorite });
                            setShowImageModal(true);
                          }
                          else if (stop.lat && stop.lng) {
                            const url = window.BKK.getNavigateUrl(stop);
                            if (url && url !== '#') window.open(url, '_blank');
                          }
                        }}
                        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          color: isSkipped ? '#9ca3af' : '#2563eb',
                          cursor: isSkipped ? 'default' : 'pointer',
                          textDecoration: isSkipped ? 'line-through' : 'underline',
                          textDecorationStyle: isSkipped ? 'solid' : 'dotted',
                          display: 'flex', alignItems: 'center', gap: '3px'
                        }}>
                        {stop.name}
                        {!isSkipped && isFavorite && <img src="icon-32x32.png" alt="FouFou" style={{ width: '12px', height: '12px', flexShrink: 0 }} />}
                      </span>
                      {/* Add to favorites / Rate button — always visible even for skipped stops */}
                      {(() => {
                        if (isFavorite) {
                          // Already a favorite — show rating or invite to rate
                          return (
                            <button
                              onClick={() => openReviewDialog(isFavorite)}
                              style={{
                                background: ra ? '#fefce8' : '#f9fafb',
                                border: `1px solid ${ra ? '#fde68a' : '#e5e7eb'}`,
                                borderRadius: '999px', cursor: 'pointer', padding: '2px 7px',
                                fontSize: '10px', fontWeight: '600', flexShrink: 0,
                                color: ra ? '#92400e' : '#9ca3af', whiteSpace: 'nowrap'
                              }}
                              title={t('trail.ratePlace')}
                            >{ra ? `⭐ ${ra.avg.toFixed(1)} (${ra.count})` : `${t('trail.ratePlace')} ⭐`}</button>
                          );
                        } else {
                          // Not a favorite — open QuickAddDialog
                          return (
                            <button
                              onClick={() => (addGooglePlaceToCustom(stop))}
                              style={{
                                background: '#f0fdf4', border: '1px solid #6ee7b7',
                                borderRadius: '999px', cursor: 'pointer', padding: '2px 7px',
                                fontSize: '10px', fontWeight: '600', flexShrink: 0,
                                color: '#059669', whiteSpace: 'nowrap'
                              }}
                              title={t('trail.addToFavorites')}
                            >{`⭐+ ${t('trail.addToFavoriteShort')}`}</button>
                          );
                        }
                      })()}
{/* Skip button removed — skipping is handled internally by continuefrom */}
                    </div>
                    );
                    });
                  })()}
                  {activeTrail.stops.length > 12 && (
                    <div style={{ fontSize: '9px', color: '#9ca3af', padding: '3px 6px' }}>
                      +{activeTrail.stops.length - 12}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
              {/* Where Am I button */}
              <button
                onClick={() => {
                  if (!activeTrail.stops?.length) { showToast(t('trail.noStopsYet'), 'warning'); return; }
                  showToast(`📍 ${t('trail.locating')}...`, 'info');
                  if (navigator.geolocation) {
                    window.BKK.getValidatedGps(
                      (pos) => {
                        setMapUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
                        setMapStops(activeTrail.stops);
                        setMapSkippedStops(new Set(skippedTrailStops));
                        setMapMode('stops');
                        setShowMapModal(true);
                      },
                      () => {
                        // Even without GPS, show the stops on map
                        setMapUserLocation(null);
                        setMapStops(activeTrail.stops);
                        setMapSkippedStops(new Set(skippedTrailStops));
                        setMapMode('stops');
                        setShowMapModal(true);
                      }
                    );
                  } else {
                    setMapUserLocation(null);
                    setMapStops(activeTrail.stops);
                    setMapSkippedStops(new Set(skippedTrailStops));
                    setMapMode('stops');
                    setShowMapModal(true);
                  }
                }}
                style={{
                  flex: 1, padding: '10px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white',
                  border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                {`📍 ${t('trail.whereAmI')}`}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  // Reopen Google Maps with active (non-skipped) stops — always in new tab to avoid "Exit navigation?" prompt
                  const activeStops = activeTrail.stops?.filter((_, i) => !skippedTrailStops.has(i));
                  if (activeStops?.length >= 2) {
                    const coords = activeStops.map(s => `${s.lat},${s.lng}`).join('/');
                    window.open(`https://www.google.com/maps/dir//${coords}/data=!4m2!4m1!3e2`, '_blank');
                  } else {
                    showToast(t('trail.needTwoStops'), 'warning');
                  }
                }}
                style={{
                  flex: 1, padding: '10px',
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#1e40af',
                  border: '2px solid #3b82f6', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                {`🗺️ ${t('trail.backToMaps')}`}
              </button>
              <button
                onClick={() => {
                  endActiveTrail();
                  // Also stop Google Maps navigation if open
                  try {
                    if (window._googleMapsWindow && !window._googleMapsWindow.closed) {
                      window._googleMapsWindow.close();
                    }
                  } catch(e) {}
                  showToast(t('trail.ended'), 'success');
                }}
                style={{
                  padding: '10px 20px', background: '#fee2e2', color: '#dc2626',
                  border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                {`🏁 ${t('trail.endTrail')}`}
              </button>
            </div>

            {/* New trail button */}
            <button
              onClick={() => {
                endActiveTrail();
                setRoute(null);
                setWizardStep(1);
                setCurrentView('form');
                window.scrollTo(0, 0);
              }}
              style={{
                width: '100%', marginTop: '8px', padding: '12px',
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white',
                border: 'none', borderRadius: '12px',
                fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2,132,199,0.3)'
              }}
            >
              {`🔄 ${t('trail.newTrail')}`}
            </button>
          </div>
        )}

        {/* WIZARD MODE */}
        {!activeTrail && currentView === 'form' && (
          <div className={wizardStep < 3 ? "view-fade-in" : ""}>


            {/* Wizard Header — shown on all steps */}
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              {/* Step indicators + language toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <button onClick={() => switchLanguage(currentLang === 'he' ? 'en' : 'he')} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2px 8px', color: '#6b7280', fontSize: '10px', cursor: 'pointer' }}>
                  {currentLang === 'he' ? '🇬🇧 EN' : '🇮🇱 עב'}
                </button>
                <div style={{ width: '8px' }} />
                {[1, 2, 3].map((step, i) => (
                  <React.Fragment key={step}>
                    {i > 0 && <div style={{ width: '20px', height: '2px', background: wizardStep >= step ? '#22c55e' : '#e5e7eb', borderRadius: '1px' }} />}
                    <div
                      onClick={() => {
                        if (step < wizardStep) {
                          setWizardStep(step);
                          if (step < 3) { setRoute(null); setRouteChoiceMade(null); setCurrentView('form'); }
                          if (step === 1) { /* interests preserved */ };
                          window.scrollTo(0, 0);
                        }
                      }}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 'bold',
                        background: wizardStep === step ? '#e11d48' : wizardStep > step ? '#22c55e' : '#e5e7eb',
                        color: wizardStep >= step ? 'white' : '#9ca3af',
                        cursor: step < wizardStep ? 'pointer' : 'default',
                        transition: 'all 0.3s'
                      }}
                    >{wizardStep > step ? '✓' : step}</div>
                  </React.Fragment>
                ))}
              </div>
              
            </div>
            {/* Step 2: Choose Area (was step 1) */}
            {wizardStep === 2 && (<>
              <div className="bg-white rounded-xl shadow-lg p-3">
                {/* Compact header: back + interests (words) + title */}
                <div style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '11px', color: '#9ca3af', marginBottom: '8px', flexWrap: 'wrap'
                }}>
                  <span
                    onClick={() => { setWizardStep(1); window.scrollTo(0, 0); }}
                    style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: '600' }}
                  >{currentLang === 'he' ? '→' : '←'} {t("general.back")}</span>
                  <span style={{ color: '#d1d5db' }}>|</span>
                  <span
                    onClick={() => { setWizardStep(1); window.scrollTo(0, 0); }}
                    style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#d1d5db' }}
                  >⭐ {formData.interests.slice(0, 3).map(id => {
                    const opt = allInterestOptions.find(o => o.id === id);
                    return opt ? tLabel(opt) : id;
                  }).join(', ')}{formData.interests.length > 3 ? ` +${formData.interests.length - 3}` : ''}</span>
                </div>
                {renderStepHeader('📍', t('wizard.step1Title'), t('wizard.step1Subtitle'), 'hint_area')}
                {renderContextHint('hint_area')}

                {/* 3 flat mode tabs: בחר אזור | בחר מקום | קרוב אליי */}
                {(() => {
                  const activeTab = formData.searchMode !== 'radius' ? 'area'
                    : (formData.radiusSource || 'gps') === 'point' ? 'point' : 'gps';
                  const STEPS = [100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500];
                  const curR = formData.radiusMeters || 500;
                  const curIdx = STEPS.indexOf(curR) !== -1 ? STEPS.indexOf(curR) : STEPS.reduce((best, v, i) => Math.abs(v - curR) < Math.abs(STEPS[best] - curR) ? i : best, 0);
                  const setR = (r) => { setFormData(prev => ({...prev, radiusMeters: r})); window.BKK.logEvent?.('radius_changed', { radius_meters: r }); };
                  const rLabel = curR >= 1000 ? `${curR/1000}km` : `${curR}m`;

                  const tabs = [
                    { id: 'area',  icon: '🗺️', he: 'בחר אזור',   en: 'Area' },
                    { id: 'point', icon: '🔍', he: 'בחר מקום',   en: 'A place' },
                    { id: 'gps',   icon: '📍', he: 'קרוב אליי',  en: 'Near me' },
                  ];

                  const onTab = (id) => {
                    setPointSearchResults(null);
                    setPointSearchQuery('');
                    if (id === 'area') {
                      setFormData(prev => ({...prev, searchMode: 'area'}));
                    } else if (id === 'point') {
                      setFormData(prev => ({...prev, searchMode: 'radius', radiusSource: 'point', radiusMeters: prev.radiusMeters || 500, currentLat: null, currentLng: null, radiusPlaceName: ''}));
                      window.BKK.logEvent?.('radius_mode_selected', { source: 'point' });
                    } else {
                      setFormData(prev => ({...prev, searchMode: 'radius', radiusSource: 'gps', radiusMeters: prev.radiusMeters || 500, currentLat: null, currentLng: null, radiusPlaceName: ''}));
                      window.BKK.logEvent?.('radius_mode_selected', { source: 'gps' });
                    }
                  };

                  return (
                    <>
                      {/* Tab row */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                        {tabs.map(tab => {
                          const isActive = activeTab === tab.id;
                          return (
                            <button key={tab.id} onClick={() => onTab(tab.id)} style={{
                              flex: 1, padding: '10px 4px', cursor: 'pointer', border: 'none', borderRadius: '12px',
                              background: isActive ? 'white' : '#f1f5f9',
                              boxShadow: isActive ? '0 0 0 2px #22c55e, 0 2px 6px rgba(34,197,94,0.15)' : 'none',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                              transition: 'all 0.2s',
                            }}>
                              <span style={{ fontSize: '18px', lineHeight: 1 }}>{tab.icon}</span>
                              <span style={{ fontSize: '11px', fontWeight: isActive ? '700' : '500', color: isActive ? '#15803d' : '#64748b', whiteSpace: 'nowrap' }}>
                                {currentLang === 'he' ? tab.he : tab.en}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Tab content */}
                      {activeTab === 'area' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '6px' }}>
                          {(window.BKK.areaOptions || []).map(area => {
                            const safety = (window.BKK.areaCoordinates?.[area.id]?.safety) || 'safe';
                            return (
                              <button
                                key={area.id}
                                onClick={() => { setFormData(prev => ({...prev, area: area.id, searchMode: 'area'})); window.BKK.logEvent?.('area_selected', { area_id: area.id, area_name: area.labelEn || area.label }); }}
                                style={{
                                  padding: '6px', borderRadius: '8px',
                                  border: formData.area === area.id ? '2px solid #22c55e' : '1.5px solid #e5e7eb',
                                  background: formData.area === area.id ? '#f0fdf4' : 'white',
                                  cursor: 'pointer', textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left',
                                  direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', transition: 'all 0.2s'
                                }}
                              >
                                <div style={{ fontWeight: 'bold', fontSize: '12px', color: formData.area === area.id ? '#15803d' : '#1f2937' }}>
                                  {formData.area === area.id && '✓ '}{tLabel(area)}
                                  {safety === 'caution' && <span style={{ color: '#f59e0b', marginRight: '3px' }} title={t("general.cautionArea")}>⚠️</span>}
                                  {safety === 'danger' && <span style={{ color: '#ef4444', marginRight: '3px' }} title={t("general.dangerArea")}>🔴</span>}
                                </div>
                                <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '1px' }}>{tDesc(area) || tLabel(area)}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {activeTab === 'point' && (
                        <div style={{ marginBottom: '8px' }}>
                          {formData.currentLat ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '10px', border: '2px solid #22c55e', marginBottom: '8px' }}>
                              <span style={{ fontSize: '14px' }}>📍</span>
                              <span style={{ flex: 1, fontSize: '13px', fontWeight: 'bold', color: '#15803d' }}>{formData.radiusPlaceName}</span>
                              <button onClick={() => { setFormData(prev => ({...prev, currentLat: null, currentLng: null, radiusPlaceName: ''})); setPointSearchResults(null); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6b7280' }}>✕</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                                <input
                                  type="text"
                                  id="point-search-input"
                                  placeholder={isRecording && recordingField === 'point_search' ? '' : (currentLang === 'he' ? 'הקלד כתובת, שם מקום, מלון...' : 'Address, place name, hotel...')}
                                  className="flex-1 p-2.5 border-2 border-purple-300 rounded-lg focus:border-purple-500"
                                  style={{ fontSize: '14px', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', outline: 'none', borderColor: isRecording && recordingField === 'point_search' ? '#ef4444' : undefined }}
                                  onChange={e => { setPointSearchQuery(e.target.value); if (!e.target.value.trim()) setPointSearchResults(null); }}
                                  onKeyDown={e => { if (e.key === 'Enter') { const q = e.target.value.trim(); if (q) searchPointForRadius(q); } }}
                                />
                                {window.BKK?.speechSupported && (
                                  <button type="button"
                                    onClick={() => toggleRecording('point_search',
                                      (text) => { const inp = document.getElementById('point-search-input'); if (inp) { inp.value = (inp.value ? inp.value + ' ' : '') + text; setPointSearchQuery(inp.value); } },
                                      () => { const inp = document.getElementById('point-search-input'); if (inp) inp.value = ''; setPointSearchResults(null); setPointSearchQuery(''); },
                                      'en-US'
                                    )}
                                    style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: isRecording && recordingField === 'point_search' ? '#ef4444' : '#f3f4f6', color: isRecording && recordingField === 'point_search' ? 'white' : '#6b7280', boxShadow: isRecording && recordingField === 'point_search' ? '0 0 0 3px rgba(239,68,68,0.3)' : 'none', animation: isRecording && recordingField === 'point_search' ? 'pulse 1s ease-in-out infinite' : 'none' }}
                                    title={isRecording && recordingField === 'point_search' ? t('speech.stopRecording') : t('speech.startRecording')}>
                                    {isRecording && recordingField === 'point_search' ? '⏹️' : '🎤'}
                                  </button>
                                )}
                                <button
                                  onClick={() => { const inp = document.getElementById('point-search-input'); if (inp?.value?.trim()) searchPointForRadius(inp.value.trim()); }}
                                  className={`px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${(pointSearchQuery||'').trim() ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                  style={{ transition: 'all 0.15s', fontSize: '13px' }}>
                                  {`🔍 ${currentLang === 'he' ? 'חפש' : 'Search'}`}
                                </button>
                              </div>
                              {isRecording && recordingField === 'point_search' && interimText && (
                                <div style={{ marginBottom: '4px', padding: '4px 8px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#92400e', fontStyle: 'italic', direction: 'ltr' }}>🎤 {interimText}</div>
                              )}
                              {pointSearchResults !== null && (
                                <div style={{ marginBottom: '8px', border: '1.5px solid #c4b5fd', borderRadius: '10px', overflow: 'hidden', background: 'white', boxShadow: '0 4px 12px rgba(124,58,237,0.12)' }}>
                                  {pointSearchResults.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '12px', color: '#9ca3af', fontSize: '12px' }}>⏳ {t('general.searching')}...</div>
                                  ) : pointSearchResults.map((result, idx) => (
                                    <button key={idx}
                                      onClick={() => { setFormData(prev => ({...prev, currentLat: result.lat, currentLng: result.lng, radiusPlaceName: result.name, radiusSource: 'point', radiusPlaceId: result.googlePlaceId || null})); setPointSearchResults(null); showToast(`✅ ${result.name}`, 'success'); }}
                                      style={{ width: '100%', textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left', padding: '8px 12px', cursor: 'pointer', background: 'none', border: 'none', borderBottom: idx < pointSearchResults.length - 1 ? '1px solid #f3e8ff' : 'none', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', display: 'block' }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#6d28d9' }}>{result.name}</div>
                                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>{result.address}{result.rating ? ` ⭐ ${result.rating}` : ''}</div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          {/* Radius stepper */}
                          <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>{t('form.searchRadius')}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={() => { if (curIdx > 0) setR(STEPS[curIdx - 1]); }} disabled={curIdx === 0} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #bae6fd', background: curIdx === 0 ? '#f1f5f9' : 'white', fontSize: '20px', fontWeight: 'bold', cursor: curIdx === 0 ? 'default' : 'pointer', color: curIdx === 0 ? '#cbd5e1' : '#0369a1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <input type="range" min={0} max={STEPS.length - 1} step={1} value={curIdx} onChange={e => setR(STEPS[parseInt(e.target.value)])} style={{ width: '100%', accentColor: '#0369a1', height: '6px', cursor: 'pointer' }} />
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0369a1' }}>{rLabel}</span>
                            </div>
                            <button onClick={() => { if (curIdx < STEPS.length - 1) setR(STEPS[curIdx + 1]); }} disabled={curIdx === STEPS.length - 1} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #bae6fd', background: curIdx === STEPS.length - 1 ? '#f1f5f9' : 'white', fontSize: '20px', fontWeight: 'bold', cursor: curIdx === STEPS.length - 1 ? 'default' : 'pointer', color: curIdx === STEPS.length - 1 ? '#cbd5e1' : '#0369a1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        </div>
                      )}

                      {activeTab === 'gps' && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ textAlign: 'center', padding: '10px 0 14px', color: '#0369a1', fontSize: '12px', fontWeight: '500' }}>
                            📍 {currentLang === 'he' ? 'המיקום שלך יאותר בעת חיפוש' : 'Your location will be detected at search time'}
                          </div>
                          {/* Radius stepper */}
                          <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>{t('form.searchRadius')}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={() => { if (curIdx > 0) setR(STEPS[curIdx - 1]); }} disabled={curIdx === 0} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #bae6fd', background: curIdx === 0 ? '#f1f5f9' : 'white', fontSize: '20px', fontWeight: 'bold', cursor: curIdx === 0 ? 'default' : 'pointer', color: curIdx === 0 ? '#cbd5e1' : '#0369a1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <input type="range" min={0} max={STEPS.length - 1} step={1} value={curIdx} onChange={e => setR(STEPS[parseInt(e.target.value)])} style={{ width: '100%', accentColor: '#0369a1', height: '6px', cursor: 'pointer' }} />
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0369a1' }}>{rLabel}</span>
                            </div>
                            <button onClick={() => { if (curIdx < STEPS.length - 1) setR(STEPS[curIdx + 1]); }} disabled={curIdx === STEPS.length - 1} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #bae6fd', background: curIdx === STEPS.length - 1 ? '#f1f5f9' : 'white', fontSize: '20px', fontWeight: 'bold', cursor: curIdx === STEPS.length - 1 ? 'default' : 'pointer', color: curIdx === STEPS.length - 1 ? '#cbd5e1' : '#0369a1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

              </div>

              {/* Sticky bottom buttons — favorites map + find places */}
              <div style={{
                position: 'sticky', bottom: 0, zIndex: 40,
                display: 'flex', flexDirection: 'column', gap: '6px',
                padding: '16px 0 env(safe-area-inset-bottom, 8px)',
                background: 'linear-gradient(to top, rgba(255,251,235,1) 80%, rgba(255,251,235,0))'
              }}>
                <button
                  onClick={() => {
                    setMapMode('favorites');
                    setMapFavArea(formData.searchMode === 'area' && formData.area ? formData.area : null);
                    setMapFavRadius(formData.searchMode === 'radius' && formData.currentLat ? { lat: formData.currentLat, lng: formData.currentLng, meters: formData.radiusMeters } : null);
                    setMapFocusPlace(null);
                    setMapFavFilter(formData.interests.length > 0 ? new Set(formData.interests) : new Set());
                    setMapBottomSheet(null); setMapReturnPlace(null); setShowMapModal(true);
                    window.BKK.logEvent?.('favorites_map_opened', { source: 'wizard_area', area: formData.area || null });
                  }}
                  style={{ padding: '10px', borderRadius: '12px', border: '2px solid #8b5cf6',
                    cursor: 'pointer', background: 'linear-gradient(135deg, #faf5ff, #ede9fe)',
                    color: '#6d28d9', fontSize: '13px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >⭐ 🗺️ {t('form.favoritesMap')}</button>
                {(() => {
                  const canSearch = isDataLoaded && formData.interests.length > 0 && (formData.searchMode === 'radius' ? (formData.radiusSource === 'gps' || formData.currentLat) : (formData.searchMode === 'area' ? formData.area : true));
                  return (
                    <button
                      onClick={() => { if (canSearch) {
                        window.BKK.logEvent?.('search_started', { city: selectedCityId, lang: currentLang, interests_count: formData.interests?.length || 0, interests: (formData.interests || []).slice(0, 5).join(','), time_filter: interestTimeFilter || 'all' });
                        // Build radius center stop to inject directly into generateRoute (avoids async state timing)
                        const buildRadiusStop = (lat, lng, name) => ({
                          name: name || t('wizard.myLocation'),
                          lat, lng,
                          address: name || '',
                          description: '',
                          duration: 0,
                          interests: ['_manual'],
                          manuallyAdded: true,
                          isRadiusCenter: true,
                          googlePlace: false,
                          rating: 0, ratingCount: 0
                        });
                        // Lazy GPS: acquire now if radius mode + GPS source + no coords yet
                        if (formData.searchMode === 'radius' && formData.radiusSource === 'gps' && !formData.currentLat && navigator.geolocation) {
                          window.BKK.getValidatedGps(
                            (pos) => {
                              const lat = pos.coords.latitude, lng = pos.coords.longitude;
                              setFormData(prev => ({...prev, currentLat: lat, currentLng: lng, radiusPlaceName: t('wizard.myLocation')}));
                              const radiusStop = buildRadiusStop(lat, lng, t('wizard.myLocation'));
                              generateRoute(radiusStop); setRouteChoiceMade(null); setWizardStep(3); window.scrollTo(0, 0);
                            },
                            (reason) => { showToast(reason === 'outside_city' ? t('toast.outsideCity') : reason === 'denied' ? t('toast.locationNoPermission') : t('toast.noGpsSignal'), 'warning', 'sticky'); }
                          );
                        } else {
                          const radiusStop = (formData.searchMode === 'radius' && formData.currentLat)
                            ? buildRadiusStop(formData.currentLat, formData.currentLng, formData.radiusPlaceName || t('wizard.myLocation'))
                            : null;
                          generateRoute(radiusStop); setRouteChoiceMade(null); setWizardStep(3); window.scrollTo(0, 0);
                        }
                      } }}
                      disabled={!canSearch}
                      style={{ padding: '14px', borderRadius: '12px',
                        cursor: canSearch ? 'pointer' : 'not-allowed',
                        border: canSearch ? '2px solid #22c55e' : '2px solid #d1d5db',
                        background: canSearch ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : '#f3f4f6',
                        color: canSearch ? '#15803d' : '#9ca3af', fontSize: '16px', fontWeight: 'bold' }}
                    >{isDataLoaded ? `🔍 ${t('wizard.findPlaces')} (${formData.maxStops || 10})` : `⏳ ${t('general.loading')}...`}</button>
                  );
                })()}
              </div>
            </>)}

            {/* Step 1: Choose Interests (was step 2) */}
            {wizardStep === 1 && (<>
              <div className="bg-white rounded-xl shadow-lg p-3">
                {/* City Selector — custom dropdown, consistent across all Android devices */}
                {(() => {
                  const activeCities = Object.values(window.BKK.cities || {}).filter(c => { const fbState = cityActiveStates[c.id]; return fbState !== false && (Object.keys(cityActiveStates).length === 0 ? c.active !== false : true); });
                  if (activeCities.length <= 1) return null;
                  const selectedCity = window.BKK.cities?.[selectedCityId];
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px', position: 'relative' }}>
                      <button
                        onClick={() => setShowCityDropdown(prev => !prev)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '12px', fontWeight: 'bold', color: '#374151', background: 'white', cursor: 'pointer' }}
                      >
                        <span>{selectedCity?.icon?.startsWith?.('data:') ? '🏙️' : (selectedCity?.icon || '🏙️')} {tLabel(selectedCity)}</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>▾</span>
                      </button>
                      {showCityDropdown && (<>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowCityDropdown(false)} />
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px', background: '#1f2937', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 50, minWidth: '160px', overflow: 'hidden' }}>
                          {activeCities.map(city => (
                            <button key={city.id}
                              onClick={() => { switchCity(city.id); setShowCityDropdown(false); }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', width: '100%', padding: '12px 16px', background: city.id === selectedCityId ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', direction: 'rtl' }}
                            >
                              <span>{tLabel(city)}</span>
                              <span>{city.icon?.startsWith?.('data:') ? '🏙️' : (city.icon || '🏙️')}</span>
                              {city.id === selectedCityId && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', display: 'inline-block', flexShrink: 0 }} />}
                            </button>
                          ))}
                        </div>
                      </>)}
                    </div>
                  );
                })()}
                {renderStepHeader('⭐', t('wizard.step2Title'), t('wizard.step2Subtitle'), 'hint_interests')}
                {renderContextHint('hint_interests')}

                {/* Time filter toggle — ☀️ day / 🌙 night / ☯ all */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                  {[
                    { key: 'day',   icon: '☀️', label: t('time.day') || 'יום' },
                    { key: 'night', icon: '🌙', label: t('time.night') || 'לילה' },
                    { key: 'all',   icon: '🌗', label: t('time.all') || 'הכל' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => setInterestTimeFilterAndSave(opt.key)}
                      title={opt.label}
                      style={{
                        padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        fontSize: '16px', lineHeight: 1,
                        background: interestTimeFilter === opt.key
                          ? (opt.key === 'day' ? '#bfdbfe' : opt.key === 'night' ? '#1f2937' : '#c4b5fd')
                          : '#f3f4f6',
                        boxShadow: interestTimeFilter === opt.key ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >{opt.icon}</button>
                  ))}
                </div>

                {/* Interest Grid — grouped by category */}
                {/* iOS Safari bug: gridColumn:'1/-1' inside a grid misaligns hit areas.
                    Fix: one grid per group, separators are divs OUTSIDE the grids. */}
                <div style={{ marginBottom: '12px' }}>
                  {(() => {
                    const filtered = allInterestOptions.filter(option => {
                      const aStatus = option.adminStatus || 'active';
                      if (aStatus === 'hidden') return false;
                      if (aStatus === 'draft' && !isUnlocked) return false;
                      if (option.scope === 'local' && option.cityId && option.cityId !== selectedCityId) return false;
                      // Time filter: show only interests matching selected time filter
                      // Check option.bestTime first (stored on the interest object), then interestConfig override
                      if (interestTimeFilter !== 'all') {
                        const cfg = interestConfig[option.id];
                        const bt = cfg?.bestTime || option.bestTime || 'anytime';
                        if (bt !== 'anytime' && bt !== interestTimeFilter) return false;
                      }
                      return true;
                    });
                    // Group by interestGroups — one grid per group, header outside grid (no gridColumn hack needed)
                    const groupOrder = Object.keys(interestGroups || {}).sort((a, b) => {
                      const oa = interestGroups[a]?.order ?? 99, ob = interestGroups[b]?.order ?? 99;
                      return oa !== ob ? oa - ob : a.localeCompare(b);
                    });
                    const usedIds = new Set();
                    const groups = groupOrder.map(gId => {
                      const members = filtered.filter(o => o.group === gId);
                      members.forEach(o => usedIds.add(o.id));
                      return members.length > 0 ? { id: gId, label: interestGroups[gId], members } : null;
                    }).filter(Boolean);
                    const ungrouped = filtered.filter(o => !usedIds.has(o.id));

                    const renderGrid = (options) => (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {options.map(option => {
                          const isSelected = formData.interests.includes(option.id);
                          const isDraft = (option.adminStatus || 'active') === 'draft';
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                setFormData(prev => {
                                  const alreadySelected = prev.interests.includes(option.id);
                                  const newInterests = alreadySelected
                                    ? prev.interests.filter(id => id !== option.id)
                                    : [...prev.interests, option.id];
                                  saveInterestsForMode(interestTimeFilter, newInterests);
                                  if (!alreadySelected && option.privateOnly) {
                                    const label = tLabel(option) || option.id;
                                    showToast(`${t('toast.privateOnlyTitle')}\n${t('toast.privateOnlyBody').replace('{label}', label)}`, 'info');
                                  }
                                  return {...prev, interests: newInterests};
                                });
                              }}
                              style={{
                                padding: '8px 4px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                border: isSelected ? '2px solid #2563eb' : isDraft ? '2px dashed #f59e0b' : '2px solid #e5e7eb',
                                background: isSelected ? '#eff6ff' : isDraft ? '#fffbeb' : 'white', position: 'relative'
                              }}
                            >
                              {isDraft && <span style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '8px' }}>🟡</span>}
                              <div style={{ fontSize: '22px', marginBottom: '2px' }}>{option.icon?.startsWith?.('data:') ? <img src={option.icon} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', display: 'inline' }} /> : option.icon}</div>
                              <div style={{ fontWeight: '700', fontSize: '11px', color: isSelected ? '#1e40af' : '#374151', wordBreak: 'break-word' }}>{tLabel(option)}</div>
                            </button>
                          );
                        })}
                      </div>
                    );

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {groups.map(g => {
                          const label = currentLang === 'he' ? g.label?.labelHe : (g.label?.labelEn || g.label?.labelHe || g.id);
                          return (
                            <div key={g.id}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.03em',
                                padding: '2px 8px 2px 4px', marginBottom: '5px',
                                borderRight: '3px solid #d1d5db', background: '#f9fafb',
                                borderRadius: '0 4px 4px 0' }}>
                                {label}
                              </div>
                              {renderGrid(g.members)}
                            </div>
                          );
                        })}
                        {ungrouped.length > 0 && (
                          <div>
                            {groups.length > 0 && (
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.03em',
                                padding: '2px 8px 2px 4px', marginBottom: '5px',
                                borderRight: '3px solid #e5e7eb', background: '#fafafa',
                                borderRadius: '0 4px 4px 0' }}>
                                {currentLang === 'he' ? 'נוספים' : 'More'}
                              </div>
                            )}
                            {renderGrid(ungrouped)}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Sticky bottom buttons — favorites map + continue */}
              <div style={{
                position: 'sticky', bottom: 0, zIndex: 40,
                display: 'flex', flexDirection: 'column', gap: '6px',
                padding: '8px 0 env(safe-area-inset-bottom, 8px)',
                background: 'linear-gradient(to top, rgba(255,251,235,1) 80%, rgba(255,251,235,0))'
              }}>
                <button
                  onClick={() => {
                    setMapMode('favorites');
                    setMapFavArea(null); setMapFavRadius(null); setMapFocusPlace(null);
                    setMapFavFilter(formData.interests.length > 0 ? new Set(formData.interests) : new Set());
                    setMapBottomSheet(null); setMapReturnPlace(null); setShowMapModal(true);
                    window.BKK.logEvent?.('favorites_map_opened', { source: 'wizard_interests' });
                  }}
                  style={{ padding: '10px', borderRadius: '12px', border: '2px solid #8b5cf6',
                    cursor: 'pointer', background: 'linear-gradient(135deg, #faf5ff, #ede9fe)',
                    color: '#6d28d9', fontSize: '13px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >⭐ 🗺️ {t('form.favoritesMap')}</button>
                {formData.interests.length > 0 && (
                  <button
                    onClick={() => { setWizardStep(2); window.scrollTo(0, 0); }}
                    style={{ padding: '14px', borderRadius: '12px', cursor: 'pointer',
                      border: '2px solid #22c55e',
                      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                      color: '#15803d', fontSize: '16px', fontWeight: 'bold' }}
                  >{t("general.next")} ({formData.interests.length})</button>
                )}
              </div>
            </>)}
          </div>
        )}

        {/* Wizard Step 3 = results */}
        
        {/* Floating audio player — draggable, no text, buttons only */}
        {isSpeaking && !openHintPopup && (
          <FloatingAudioPlayer
            isPaused={isPaused}
            onPauseResume={pauseResumeHint}
            onStop={stopHintPlayback}
          />
        )}

        {/* FAB: Quick Capture — draggable, available when no active trail */}
        {!showQuickCapture && !showAddLocationDialog && !showEditLocationDialog && (() => {
          const pos = fabPos || { right: 16, bottom: 80 };
          const style = fabPos 
            ? { position: 'fixed', left: pos.left + 'px', top: pos.top + 'px', zIndex: 1000 }
            : { position: 'fixed', right: pos.right + 'px', bottom: pos.bottom + 'px', zIndex: 1000 };
          
          const onStart = (clientX, clientY, el) => {
            const rect = el.getBoundingClientRect();
            fabDragRef.current = { dragging: true, startX: clientX, startY: clientY, offsetX: clientX - rect.left, offsetY: clientY - rect.top, moved: false };
          };
          const onMove = (clientX, clientY) => {
            if (!fabDragRef.current.dragging) return;
            const dx = Math.abs(clientX - fabDragRef.current.startX);
            const dy = Math.abs(clientY - fabDragRef.current.startY);
            if (dx > 5 || dy > 5) fabDragRef.current.moved = true;
            if (fabDragRef.current.moved) {
              const newPos = {
                left: Math.max(0, Math.min(window.innerWidth - 48, clientX - fabDragRef.current.offsetX)),
                top: Math.max(0, Math.min(window.innerHeight - 48, clientY - fabDragRef.current.offsetY))
              };
              setFabPos(newPos);
            }
          };
          const onEnd = () => {
            if (fabDragRef.current.moved && fabPos) {
              try { localStorage.setItem('foufou_fab_pos', JSON.stringify(fabPos)); } catch(e) {}
            }
            fabDragRef.current.dragging = false;
          };
          const openCapture = () => {
            if (fabDragRef.current.moved) return;
            if (!authUser || authUser.isAnonymous) { setShowLoginDialog(true); showToast(t('auth.signInRequired'), 'info', 'sticky'); return; }
            // Interest priority: user's manual selection this session > trail interests > wizard selection
            // Filter to valid IDs only (prevents stale IDs from old sessions)
            const validIds = new Set(allInterestOptions.map(o => o.id));
            const lastValid = lastCaptureInterestsRef.current.filter(id => validIds.has(id));
            const defaultInterests = lastValid.length > 0
              ? lastValid
              : activeTrail?.interests?.filter(id => validIds.has(id)).slice(0, 2).length > 0
                ? activeTrail.interests.filter(id => validIds.has(id)).slice(0, 2)
                : formData.interests?.filter(id => validIds.has(id)).slice(0, 1) || [];
            const initLocation = {
              name: '', description: '', notes: '',
              area: formData.area || 'chinatown',
              areas: formData.areas?.length > 0 ? formData.areas : [formData.area || 'chinatown'],
              interests: defaultInterests,
              lat: null, lng: null, mapsUrl: '', address: '',
              uploadedImage: null, imageUrls: [], gpsLoading: true
            };
            setNewLocation(initLocation);
            setShowQuickCapture(true);
            if (navigator.geolocation) {
              window.BKK.getValidatedGps(
                (pos) => {
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  const detected = window.BKK.getAreasForCoordinates(lat, lng);
                  const areaUpdates = detected.length > 0 ? { areas: detected, area: detected[0] } : {};
                  setNewLocation(prev => ({ ...prev, lat, lng, gpsLoading: false, ...areaUpdates }));
                },
                (reason) => {
                  setNewLocation(prev => ({...prev, gpsLoading: false, gpsBlocked: true}));
                  showToast(reason === 'outside_city' ? t('toast.outsideCity') : reason === 'denied' ? t('toast.locationNoPermission') : t('toast.noGpsSignal'), 'warning', 'sticky');
                }
              );
            }
          };
          return (
            <div
              onMouseDown={(e) => onStart(e.clientX, e.clientY, e.currentTarget)}
              onMouseMove={(e) => onMove(e.clientX, e.clientY)}
              onMouseUp={onEnd}
              onMouseLeave={onEnd}
              onTouchStart={(e) => { const t = e.touches[0]; onStart(t.clientX, t.clientY, e.currentTarget); }}
              onTouchMove={(e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); }}
              onTouchEnd={onEnd}
              onClick={openCapture}
              style={{
                ...style,
                width: '46px', height: '46px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white', boxShadow: '0 4px 12px rgba(34,197,94,0.5)',
                fontSize: '20px', cursor: 'grab', userSelect: 'none', touchAction: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title={t('trail.capturePlace')}
            >📸</div>
          );
        })()}



        {/* Back to route — visible on non-form tabs */}
        {!activeTrail && currentView !== 'form' && (
          <div style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '4px' }}>
            <button
              onClick={() => { setCurrentView('form'); setWizardStep(1); setRoute(null); setRouteChoiceMade(null); window.scrollTo(0, 0); }}
              style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '2px solid #3b82f6', borderRadius: '16px', padding: '4px 14px', color: '#1e40af', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
            >
              {`← ${t('general.backToRoute')}`}
            </button>
          </div>
        )}

        {/* Wizard Step 3: breadcrumb with back link */}
        {wizardStep === 3 && !isGenerating && !activeTrail && currentView === 'form' && (
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            fontSize: '11px', color: '#9ca3af', marginBottom: '6px', flexWrap: 'wrap'
          }}>
            <span
              onClick={() => { setWizardStep(2); setRoute(null); setRouteChoiceMade(null); setCurrentView('form'); window.scrollTo(0, 0); }}
              style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: '600', textDecoration: 'underline' }}
            >{currentLang === 'he' ? '→' : '←'} {t("general.back")}</span>
            <span style={{ color: '#d1d5db' }}>|</span>
            <span
              onClick={() => { setWizardStep(1); setRoute(null); setRouteChoiceMade(null); setCurrentView('form'); window.scrollTo(0, 0); }}
              style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#d1d5db' }}
            >⭐ {formData.interests.slice(0, 3).map(id => {
              const opt = allInterestOptions.find(o => o.id === id);
              return opt ? tLabel(opt) : id;
            }).join(', ')}{formData.interests.length > 3 ? ` +${formData.interests.length - 3}` : ''}</span>
            <span style={{ color: '#d1d5db' }}>|</span>
            <span
              onClick={() => { setWizardStep(2); setRoute(null); setRouteChoiceMade(null); setCurrentView('form'); window.scrollTo(0, 0); }}
              style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#d1d5db' }}
            >📍 {(() => {
              if (formData.searchMode === 'all') return t('wizard.allCity');
              if (formData.searchMode === 'radius') { const locName = formData.radiusSource === 'point' ? (formData.radiusPlaceName || t('wizard.nearMePoint')) : t('wizard.myLocation'); const rLabel = formData.radiusMeters >= 1000 ? (formData.radiusMeters/1000 + 'km') : (formData.radiusMeters + 'm'); return locName + ' (' + rLabel + ')'; }
              const area = (window.BKK.areaOptions || []).find(a => a.id === formData.area);
              return area ? tLabel(area) : '';
            })()}</span>
          </div>
        )}

        {/* Wizard Step 3: Loading spinner while generating */}
        {wizardStep === 3 && isGenerating && currentView === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <svg className="animate-spin" style={{ width: '40px', height: '40px', color: '#2563eb', marginBottom: '12px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>{`🔍 ${t("general.searching")}...`}</p>
            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{t("general.mayTakeSeconds")}</p>
          </div>
        )}

        {/* ROUTE CHOICE SCREEN — shown in wizard step 3 after route is loaded, before any action */}
        {/* Intermediate screen removed — auto-jump to manual mode on load */}
        {wizardStep === 3 && !isGenerating && route && route.stops?.length > 0 && !activeTrail && !route.optimized && routeChoiceMade === null && currentView === 'form' && (() => {
          // Auto-enter manual mode immediately
          setTimeout(() => { setRouteChoiceMade('manual'); window.scrollTo(0, 0); }, 0);
          return null;
        })()}

        {/* Form View */}

        {/* === VIEWS (from views.js) === */}
        {currentView === 'form' && !activeTrail && wizardStep === 3 && (routeChoiceMade === 'manual' || route?.optimized) && (
          <div className="view-fade-in bg-white rounded-xl shadow-lg p-3 space-y-3">

            {/* Manual mode header — with doc button */}
            {routeChoiceMade === 'manual' && route && renderStepHeader('🗺️', t('wizard.manualMode'), t('wizard.manualDesc'), 'hint_manual')}

            {route && routeChoiceMade === 'manual' && renderContextHint('hint_manual')}
            {route && routeChoiceMade === 'manual' && renderContextHint('hint_route_menu')}

            {/* Show stops list ONLY after route is calculated */}
            {route && (
              <div id="route-results" className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mt-4" dir={window.BKK.i18n.isRTL() ? "rtl" : "ltr"} style={{ position: 'relative' }}>
                {isReoptimizing && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,246,255,0.85)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid #e5e7eb', borderTopColor: '#6d28d9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '11px', color: '#6d28d9', fontWeight: '600' }}>{t('route.reoptimizing')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-blue-900 text-sm">{`${t("route.places")} - ${route.areaName}`} ({route.stops.filter(s => !isStopDisabled(s)).length}):</h3>
                </div>
                {renderContextHint('hint_route')}
                {/* Normal stop list grouped by interest */}
                <div className="max-h-96 overflow-y-auto" key={routeListKey} style={{ contain: 'content' }}>
                  {(() => {
                    // Build sequential letter map: only active stops get letters
                    const activeLetterMap = {};
                    let letterIdx = 0;
                    route.stops.forEach((stop, i) => {
                      if (!isStopDisabled(stop)) {
                        activeLetterMap[i] = window.BKK.stopLabel(letterIdx);
                        letterIdx++;
                      }
                    });
                    
                    // Group stops by interest
                    const groupedStops = {};
                    let stopCounter = 0;
                    
                    route.stops.forEach((stop, i) => {
                      const interests = stop.interests || [];
                      interests.forEach(interest => {
                        if (!groupedStops[interest]) {
                          groupedStops[interest] = [];
                        }
                        groupedStops[interest].push({ ...stop, originalIndex: i, displayNumber: stopCounter + 1 });
                      });
                      stopCounter++;
                    });

                    // Score helper — same formula as generateRoute stopScore
                    const calcStopScore = (stop) => {
                      const googleScore = (stop.rating || stop.googleRating || 0) * Math.log10((stop.ratingCount || stop.googleRatingCount || 0) + 1);
                      const isCustom = stop.source === 'custom' || stop.custom || !!customLocations.find(loc => loc.name === stop.name);
                      if (!isCustom) return googleScore;
                      const base = sp.favoriteBaseScore ?? 20;
                      const pk = (stop.name || '').replace(/[.#$/\\[\\]]/g, '_');
                      const ra = reviewAverages[pk];
                      if (!ra || ra.count === 0) return googleScore + base;
                      const threshold = sp.favoriteLowRatingThreshold ?? 2.5;
                      if (ra.avg < threshold) return googleScore + base - (sp.favoriteLowRatingPenalty ?? 60);
                      return googleScore + base + ra.avg * (sp.favoriteBonusPerStar ?? 5);
                    };
                    
                    return Object.entries(groupedStops)
                      .filter(([interest]) => {
                        if (interest === '_manual') return true;
                        if (!formData.interests.includes(interest)) return false;
                        // Safety: don't show groups for hidden/draft/disabled/wrong-city interests
                        const opt = allInterestOptions.find(o => o.id === interest);
                        if (!opt) return false;
                        const aStatus = opt.adminStatus || 'active';
                        if (aStatus === 'hidden') return false;
                        if (aStatus === 'draft' && !isUnlocked) return false;
                        if (opt.scope === 'local' && opt.cityId && opt.cityId !== selectedCityId) return false;
                        return true;
                      })
                      .sort(([interestA], [interestB]) => {
                        // Sort sections by slot order — same source of truth as sort in generateRoute
                        const slotOrder = { early: 1, any: 2, bookend: 2, middle: 3, late: 4, end: 4 };
                        const defaultSlotForId = {
                          cafes: 'bookend', food: 'middle', restaurants: 'middle',
                          markets: 'early', shopping: 'early', temples: 'any', galleries: 'any',
                          architecture: 'any', parks: 'early', beaches: 'early', graffiti: 'any',
                          artisans: 'any', canals: 'any', culture: 'any', history: 'any',
                          nightlife: 'end', rooftop: 'end', bars: 'end', entertainment: 'late',
                        };
                        const getOrder = (id) => {
                          if (id === '_manual') return 2;
                          const cfgSlot = interestConfig[id]?.routeSlot;
                          const slot = cfgSlot || defaultSlotForId[id] || 'any';
                          return slotOrder[slot] ?? 2;
                        };
                        return getOrder(interestA) - getOrder(interestB);
                      })
                      .map(([interest, stops]) => {
                      const isManualGroup = interest === '_manual';
                      const interestObj = isManualGroup ? { id: '_manual', label: t('general.addedManually'), icon: '📍' } : interestMap[interest];
                      if (!interestObj) return null;
                      
                      // Sort stops by weighted score (highest first) — letter stays with the stop
                      const sortedStops = isManualGroup ? stops : [...stops].sort((a, b) => calcStopScore(b) - calcStopScore(a));

                      // For manual group, filter out stops that now have real interests
                      const filteredStops = isManualGroup 
                        ? stops.filter(s => !s.interests || s.interests.length === 0 || (s.interests.length === 1 && s.interests[0] === '_manual'))
                        : sortedStops;
                      if (filteredStops.length === 0) return null;
                      
                      return (
                        <div key={interest} className="bg-white rounded-lg p-2 border border-gray-200">
                          {/* Interest header with fetch-more button */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="font-bold text-xs text-gray-700 flex items-center gap-1">
                              <span style={{ fontSize: '14px' }}>{interestObj.icon?.startsWith?.('data:') ? <img src={interestObj.icon} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', display: 'inline' }} /> : interestObj.icon}</span>
                              <span>{tLabel(interestObj)} ({filteredStops.length})</span>
                            </div>
                            {!isManualGroup && (
                            <button
                              onClick={async () => {
                                window.BKK.logEvent?.('fetch_more_clicked', { interest_id: interest, count: formData.fetchMoreCount || 3 });
                                await fetchMoreForInterest(interest);
                                await fetchMoreForInterest(interest);
                              }}
                              className="text-[10px] px-2 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600"
                              title={`${t("route.moreFromCategory")} ${tLabel(interestObj)}`}
                            >
                              {t("general.more")} {formData.fetchMoreCount || 3}
                            </button>
                            )}
                          </div>
                          
                          {/* Stops in this interest */}
                          <div className="space-y-1.5">
                            {filteredStops.map((stop) => {
                              const hasValidCoords = stop.lat && stop.lng && stop.lat !== 0 && stop.lng !== 0;
                              const isDisabled = isStopDisabled(stop);
                              const isCustom = stop.custom || !!customLocations.find(loc => loc.name.toLowerCase().trim() === (stop.name || '').toLowerCase().trim());
                              const isAddedLater = stop.addedLater;
                              const isStartPoint = hasValidCoords && startPointCoords?.lat === stop.lat && startPointCoords?.lng === stop.lng;
                              
                              return (
                                <div key={stop.originalIndex} className="p-1.5 rounded border relative" style={{ 
                                  borderColor: isDisabled ? '#d1d5db' : isStartPoint ? '#e5e7eb' : !hasValidCoords ? '#ef4444' : isAddedLater ? '#60a5fa' : '#e5e7eb',
                                  borderWidth: isAddedLater ? '2px' : '1px',
                                  borderStyle: isAddedLater ? 'dashed' : 'solid',
                                  backgroundColor: isDisabled ? '#f9fafb' : !hasValidCoords ? '#fef2f2' : isAddedLater ? '#eff6ff' : '#fafafa',
                                  opacity: isDisabled ? 0.45 : 1,
                                  transition: 'opacity 0.2s'
                                }}>
{/* Action buttons removed from absolute position - trash moved inline */}
                                  
                                  <a
                                    href={window.BKK.getNavigateUrl(stop)}
                                    target="city_explorer_map"
                                    rel={hasValidCoords ? "noopener noreferrer" : undefined}
                                    className={`block hover:bg-gray-100 transition ${window.BKK.i18n.isRTL() ? 'pr-2' : 'pl-2'}`}
                                    onClick={(e) => {
                                      // URL debug logging
                                      if (window.BKK._logUrlBuild) window.BKK._logUrlBuild(stop.name, stop);
                                      if (!hasValidCoords) {
                                        e.preventDefault();
                                        showToast(t('places.editNoCoordsHint'), 'warning');
                                        return;
                                      }
                                      // Custom place with only coordinates → show favorite card
                                      if (isCustom && !stop.mapsUrl && !stop.address && !stop.googlePlaceId && !stop.placeId) {
                                        e.preventDefault();
                                        const cl = customLocations.find(loc => loc.name === stop.name);
                                        if (cl) {
                                          showToast(t('places.favoriteNotOnGoogle'), 'info');
                                          setModalImage(cl.uploadedImage || '__placeholder__');
                                          setModalImageCtx({ description: cl.description, location: cl });
                                          setShowImageModal(true);
                                        }
                                      }
                                    }}
                                  >
                                    <div className="font-bold text-[11px] flex items-center gap-1" style={{
                                      color: isDisabled ? '#9ca3af' : hasValidCoords ? '#2563eb' : '#dc2626',
                                      textDecoration: isDisabled ? 'line-through' : 'none',
                                      flexWrap: 'wrap'
                                    }}>
                                      {route?.optimized && !isDisabled && hasValidCoords && activeLetterMap[stop.originalIndex] && (() => {
                                        // Color by interest — consistent with map markers and active trail
                                        // Radius center stops: white fill + green border (no interest color)
                                        const isRadiusCenter = stop.isRadiusCenter;
                                        const stopColor = isManualGroup
                                          ? (isRadiusCenter ? null : window.BKK.stopColorPalette[stop.originalIndex % window.BKK.stopColorPalette.length])
                                          : window.BKK.getInterestColor(interest, allInterestOptions);
                                        return isRadiusCenter ? (
                                          <span style={{ background: 'white', color: '#15803d', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0, border: '2px solid #22c55e', boxShadow: '0 1px 3px rgba(34,197,94,0.3)' }}>
                                            {activeLetterMap[stop.originalIndex]}
                                          </span>
                                        ) : (
                                          <span style={{ background: stopColor, color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                            {activeLetterMap[stop.originalIndex]}
                                          </span>
                                        );
                                      })()}
                                      {!hasValidCoords && (
                                        <span title={t("places.noCoordinates")} style={{ fontSize: '11px' }}>
                                          ❗
                                        </span>
                                      )}
                                      <span style={!isDisabled ? { textDecoration: 'underline', textUnderlineOffset: '2px' } : undefined}>{stop.name}</span>
                                      {stop.trailSkipped && (
                                        <span className="text-[8px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded font-bold">{t('trail.skipped') || 'דולג'}</span>
                                      )}
                                      {isStartPoint && (
                                        <span className="text-[8px] bg-green-600 text-white px-1 py-0.5 rounded font-bold">{t("general.start")}</span>
                                      )}
                                      {stop.detectedArea && formData.searchMode === 'radius' && (
                                        <span className="text-[8px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold">
                                          {tLabel(areaMap[stop.detectedArea]) || stop.detectedArea}
                                        </span>
                                      )}
                                      {stop.distFromCenter != null && formData.searchMode === 'radius' && (
                                        <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-bold">
                                          {stop.distFromCenter}m
                                        </span>
                                      )}
                                      {stop.outsideArea && (
                                        <span className="text-orange-500" title={t("places.outsideArea")} style={{ fontSize: '10px' }}>
                                          🔺
                                        </span>
                                      )}
                                      {isAddedLater && routeChoiceMade === 'manual' && (
                                        <span title={t("general.addedViaMore")} style={{ fontSize: '8px', fontWeight: '600', background: '#dbeafe', color: '#1d4ed8', borderRadius: '3px', padding: '0 3px', flexShrink: 0 }}>+</span>
                                      )}
                                      {/* FouFou info button for custom/favorite places */}
                                      {isCustom && (() => {
                                        const cl = customLocations.find(loc => loc.name === stop.name);
                                        return (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (stop.uploadedImage || cl?.uploadedImage) {
                                              setModalImage(stop.uploadedImage || cl.uploadedImage);
                                            } else {
                                              setModalImage('__placeholder__');
                                            }
                                            setModalImageCtx({ description: stop.description || cl?.description, location: cl || stop });
                                            setShowImageModal(true);
                                          }}
                                          style={{ cursor: 'pointer', background: 'transparent', border: 'none', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', padding: '2px', opacity: 0.75 }}
                                          title={t("general.placeInfo") || "מידע על המקום"}
                                        >
                                          <img src="icon-32x32.png" alt="FouFou" style={{ width: '18px', height: '18px' }} />
                                        </button>
                                        );
                                      })()}
                                      {/* Disable/Enable toggle — end of row (left side in RTL) */}
                                      <span
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const nk = (stop.name || '').toLowerCase().trim();
                                          const _wasSkip = !disabledStops.includes(nk); setDisabledStops(prev => prev.includes(nk) ? prev.filter(n => n !== nk) : [...prev, nk]); window.BKK.logEvent?.(_wasSkip ? 'stop_skipped' : 'stop_unskipped', { stop_name: stop.name, interest: (stop.interests || [])[0] || null });
                                        }}
                                        style={{
                                          cursor: 'pointer', fontSize: '10px', flexShrink: 0,
                                          display: 'inline-flex', alignItems: 'center', gap: '1px',
                                          padding: '1px 5px', borderRadius: '20px',
                                          background: isDisabled ? '#f0fdf4' : '#fff7ed',
                                          border: isDisabled ? '1px solid #6ee7b7' : '1px solid #fed7aa',
                                          color: isDisabled ? '#059669' : '#ea580c',
                                          marginInlineStart: 'auto', fontWeight: '500'
                                        }}
                                        title={isDisabled ? t('trail.unskip') : t('trail.skip')}
                                      >{isDisabled ? ('▶ ' + (t('trail.unskip'))) : ('⏸ ' + (t('trail.skip')))}</span>
                                      {/* Trash for manually added stops — inline at end of row */}
                                      {stop.manuallyAdded && (
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            setManualStops(prev => prev.filter(ms => ms.name !== stop.name));
                                            setRoute(prev => prev ? {
                                              ...prev,
                                              stops: prev.stops.filter((_, idx) => idx !== stop.originalIndex)
                                            } : prev);
                                            showToast(`🗑️ ${stop.name} ${t('toast.removedFromRoute')}`, 'info');
                                          }}
                                          title={t('route.removeFromRoute')}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', flexShrink: 0, padding: '0 2px', color: '#ef4444' }}
                                        >🗑️</button>
                                      )}
                                    </div>
                                    <div className="text-[10px]" style={{
                                      color: hasValidCoords ? '#6b7280' : '#991b1b'
                                    }}>
                                      {hasValidCoords ? <AutoTranslateText text={stop.description} translateText={translateText} detectNeedsTranslation={detectNeedsTranslation} /> : t('places.noCoordinatesWarning')}
                                    </div>
                                    {stop.todayHours && (
                                      <div className="text-[9px]" style={{ color: stop.openNow ? '#059669' : '#dc2626' }}>
                                        🕐 {stop.openNow ? t('general.openStatus') : t('general.closedStatus')} · {stop.todayHours}
                                      </div>
                                    )}
                                    {/* Ratings — Google + FouFou */}
                                    {isCustom && (() => {
                                      const pk = (stop.name || '').replace(/[.#$/\\[\]]/g, '_');
                                      const ra = reviewAverages[pk];
                                      const cl = customLocations.find(loc => loc.name === stop.name);
                                      const gR = cl?.googleRating || stop.googleRating;
                                      const gC = cl?.googleRatingCount || stop.googleRatingCount || 0;
                                      return (
                                        <div style={{ fontSize: '10px', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                          {gR && <span style={{ color: '#b45309' }}>⭐{gR.toFixed?.(1) || gR} ({gC})</span>}
                                          {ra ? (
                                            <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); openReviewDialog(cl || stop); }}
                                              style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>🌟{ra.avg.toFixed(1)} ({ra.count})</span>
                                          ) : (
                                            <span style={{ color: '#9ca3af', fontSize: '9px' }}>{t('reviews.notYetRated')}</span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </a>
                                  {/* Add to favorites — compact inline star, editors/admins only (regular users add during active trail) */}
                                  {!isCustom && !isDisabled && isEditor && (() => {
                                    const existingLoc = customLocations.find(loc => loc.name.toLowerCase().trim() === stop.name.toLowerCase().trim());
                                    if (existingLoc) return null; // already in favorites, stop has ✅ elsewhere
                                    const placeId = stop.id || stop.name;
                                    const isAdding = addingPlaceIds.includes(placeId);
                                    return (
                                      <button
                                        onClick={(e) => { e.preventDefault(); addGooglePlaceToCustom(stop); }}
                                        disabled={isAdding}
                                        title={t('route.addToMyList')}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                                          padding: '1px 7px', marginTop: '3px',
                                          background: isAdding ? '#e5e7eb' : '#f0fdf4',
                                          border: '1px dashed #6ee7b7',
                                          borderRadius: '20px', fontSize: '10px', fontWeight: '600',
                                          color: isAdding ? '#9ca3af' : '#059669',
                                          cursor: isAdding ? 'wait' : 'pointer',
                                        }}
                                      >
                                        {isAdding ? '...' : <>⭐ <span>{t('route.addToMyList')}</span></>}
                                      </button>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div className="mt-3 space-y-1" style={{
                  position: 'sticky', bottom: 0, zIndex: 20,
                  background: 'linear-gradient(to top, rgba(239,246,255,1) 85%, rgba(239,246,255,0))',
                  paddingTop: '10px',
                  paddingBottom: 'env(safe-area-inset-bottom, 8px)'
                }}>
                  {/* Row 1: Map & Plan + Doc + Hamburger */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      const openMap = (gpsStart) => {
                        const result = recomputeForMap(gpsStart || null, undefined, true);
                        // Always show ALL stops on map — disabled ones rendered dimmed
                        const allStops = route.stops.filter(s => s.lat && s.lng && s.lat !== 0 && s.lng !== 0);
                        if (allStops.length === 0) { showToast(t('places.noPlacesWithCoords'), 'warning'); return; }
                        setMapStops(allStops);
                        setMapMode('stops');
                        window.BKK.logEvent?.('route_map_opened', { stops_count: allStops.length });
                        setShowMapModal(true);
                      };
                      if (!startPointCoordsRef.current && !formData.currentLat && navigator.geolocation) {
                        window.BKK.getValidatedGps(
                          (pos) => {
                            const gpsStart = { lat: pos.coords.latitude, lng: pos.coords.longitude, address: t('wizard.myLocation') };
                            setFormData(prev => ({...prev, currentLat: pos.coords.latitude, currentLng: pos.coords.longitude}));
                            openMap(gpsStart);
                          },
                          (reason) => {
                            showToast(reason === 'outside_city' ? t('toast.outsideCity') : reason === 'denied' ? t('toast.locationNoPermission') : t('toast.noGpsSignal'), 'warning', 'sticky');
                            openMap(null);
                          },
                        );
                      } else {
                        openMap(null);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flex: 1, height: '42px',
                      background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', color: '#6d28d9',
                      borderRadius: '12px', fontWeight: 'bold', fontSize: '13px',
                      border: '2px solid #8b5cf6', cursor: 'pointer'
                    }}
                  >
                    {`${t("route.showStopsOnMap")} (${route.stops.filter(s => !isStopDisabled(s) && s.lat && s.lng).length})`}
                  </button>
                  {(() => {
                    const lang = window.BKK.i18n.currentLang || 'he';
                    const hasAudio = !!hintAudioUrls['hint_route_menu_' + lang];
                    const s = getHelpSection('hint_route_menu');
                    const txt = (s && s.content && s.content.trim()) || '';
                    return (
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
                        {isAdmin && (
                          <button
                            onClick={() => { setHintEditId('hint_route_menu'); setHintEditText(txt); }}
                            style={{ width: '32px', height: '42px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >✏️</button>
                        )}
                        {(txt || isAdmin) && (
                          <button
                            onClick={() => setOpenHintPopup(openHintPopup === 'hint_route_menu' ? null : 'hint_route_menu')}
                            title={window.BKK.i18n.isRTL() ? 'מה יש בתפריט?' : 'What is in the menu'}
                            style={{
                              height: '42px', borderRadius: '12px', padding: '0 10px',
                              border: '1.5px solid #818cf8', background: openHintPopup === 'hint_route_menu' ? '#c7d2fe' : '#e0e7ff',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '16px', color: '#3730a3', fontWeight: '800', flexShrink: 0,
                              boxShadow: '0 1px 4px rgba(99,102,241,0.3)'
                            }}
                          >
                            <span>ℹ</span>
                            {hasAudio && <span style={{ fontSize: '12px' }}>🔈</span>}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => setShowRouteMenu(!showRouteMenu)}
                    style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      border: '1px solid #e5e7eb', background: showRouteMenu ? '#f3f4f6' : 'rgba(255,255,255,0.9)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', color: '#6b7280', flexShrink: 0
                    }}
                  >
                    ☰
                  </button>
                  </div>

                  {/* Hamburger dropdown menu */}
                  {showRouteMenu && (
                    <div>
                    <div onClick={() => setShowRouteMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} />
                    <div style={{
                      position: 'absolute', left: 0, right: 0, bottom: '48px', zIndex: 50,
                      background: 'white', borderRadius: '12px', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
                      border: '1px solid #e5e7eb', overflow: 'hidden',
                      direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 10px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <button onClick={() => setShowRouteMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9ca3af', padding: '0 2px', lineHeight: 1 }}>✕</button>
                      </div>
                      {[
                        { icon: '+', label: t('route.addManualStop').replace('➕ ', ''), action: () => { setShowRouteMenu(false); setShowManualAddDialog(true); } },
                        { icon: '≡', label: t('route.reorderStops'), action: () => { setShowRouteMenu(false); reorderOriginalStopsRef.current = route?.stops ? [...route.stops] : null; setShowRoutePreview(true); }, disabled: !route?.optimized },
                        { icon: '↗', label: t('general.shareRoute'), action: () => {
                          if (!authUser || authUser.isAnonymous) { setShowLoginDialog(true); return; }
                          setShowRouteMenu(false);
                          if (!route?.optimized) return;
                          const activeStops = (route.stops || []).filter(s => {
                            const isActive = !isStopDisabled(s);
                            const hasCoords = s.lat && s.lng && s.lat !== 0 && s.lng !== 0;
                            return isActive && hasCoords;
                          });
                          const hasStart = startPointCoords && startPointCoords.lat && startPointCoords.lng;
                          const origin = hasStart ? `${startPointCoords.lat},${startPointCoords.lng}` : activeStops.length > 0 ? `${activeStops[0].lat},${activeStops[0].lng}` : '';
                          const stopsForUrl = hasStart
                            ? activeStops.filter(s => !(Math.abs(s.lat - startPointCoords.lat) < 0.0001 && Math.abs(s.lng - startPointCoords.lng) < 0.0001))
                            : activeStops.slice(1);
                          const isCirc = routeType === 'circular';
                          const urls = window.BKK.buildGoogleMapsUrls(stopsForUrl, origin, isCirc, googleMaxWaypoints);
                          const routeName = route.name || t('route.myRoute');
                          const mapUrl = urls.length > 0 ? urls[0].url : '';
                          if (!mapUrl) return;
                          const mapLinks = urls.map((u, i) => urls.length === 1 ? u.url : `(${u.part}/${u.total}) ${u.url}`).join('\n');
                          const shareText = `🗺️ ${routeName}\n📍 ${route.areaName || ''}\n🎯 ${activeStops.length} stops\n${routeType === 'circular' ? t('route.circularRoute') : t('route.linearDesc')}\n\n${activeStops.map((s, i) => `${window.BKK.stopLabel(i)}. ${s.name}`).join('\n')}\n\n🗺️ Google Maps:\n${mapLinks}`;
                          window.BKK.logEvent?.('route_shared', { stops_count: activeStops.length, parts: urls.length });
                          if (navigator.share) { navigator.share({ title: routeName, text: shareText }); }
                          else { navigator.clipboard.writeText(shareText); showToast(t('route.routeCopied'), 'success'); }
                        }, disabled: !route?.optimized },
                        { icon: route.name ? '✓' : '⬇', label: route.name ? `${t('route.savedAs')} ${route.name}` : ((!authUser || authUser.isAnonymous) ? (t('auth.loginToSave')) : t('route.saveRoute')), action: () => {
                          if (!authUser || authUser.isAnonymous) { setShowLoginDialog(true); return; }
                          setShowRouteMenu(false);
                          if (!route.name && route?.optimized) quickSaveRoute();
                        }, disabled: !route?.optimized || !!route.name },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={item.action}
                          disabled={item.disabled}
                          style={{
                            width: '100%', padding: '10px 14px', border: 'none', borderBottom: idx < 4 ? '1px solid #f3f4f6' : 'none',
                            background: 'white', cursor: item.disabled ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            fontSize: '13px', fontWeight: '500', color: item.disabled ? '#9ca3af' : '#374151',
                            textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left'
                          }}
                        >
                          <span style={{ fontSize: '14px', flexShrink: 0, width: '22px', textAlign: 'center', fontWeight: 'bold', color: item.disabled ? '#d1d5db' : '#6b7280' }}>{renderIcon(item.icon, '16px')}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    </div>
                  )}

                  {/* Row 2: Open in Google Maps */}
                  {(() => {
                    const activeStops = route?.optimized ? route.stops.filter((stop) => {
                      return !isStopDisabled(stop) && stop.lat && stop.lng && stop.lat !== 0 && stop.lng !== 0;
                    }) : [];
                    const hasStartPoint = startPointCoords && startPointCoords.lat && startPointCoords.lng;
                    const origin = hasStartPoint
                      ? `${startPointCoords.lat},${startPointCoords.lng}`
                      : activeStops.length > 0 ? `${activeStops[0].lat},${activeStops[0].lng}` : '';
                    // Exclude any stop that overlaps with startPointCoords to avoid duplicates in URL
                    const isOverlapStart = (s) => hasStartPoint
                      && Math.abs(s.lat - startPointCoords.lat) < 0.0001
                      && Math.abs(s.lng - startPointCoords.lng) < 0.0001;
                    const stopsForUrls = hasStartPoint
                      ? activeStops.filter(s => !isOverlapStart(s))
                      : activeStops.slice(1);
                    const isCircular = routeType === 'circular';
                    const urls = route?.optimized && activeStops.length > 0
                      ? window.BKK.buildGoogleMapsUrls(stopsForUrls, origin, isCircular, googleMaxWaypoints)
                      : [];

                    return urls.length <= 1 ? (
                      <button
                        id="open-google-maps-btn"
                        disabled={!route?.optimized}
                        style={{
                          width: '100%', height: '48px', 
                          background: route?.optimized ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : '#d1d5db',
                          color: route?.optimized ? '#15803d' : '#9ca3af', textAlign: 'center',
                          borderRadius: '14px', fontWeight: 'bold', fontSize: '15px',
                          border: route?.optimized ? '2px solid #22c55e' : '2px solid #d1d5db',
                          boxShadow: route?.optimized ? '0 4px 6px -1px rgba(34, 197, 94, 0.3)' : 'none',
                          cursor: route?.optimized ? 'pointer' : 'not-allowed'
                        }}
                        onClick={() => {
                          if (!route?.optimized) { showToast(t('route.calcRoutePrevious'), 'warning'); return; }
                          if (activeStops.length === 0) { showToast(t('places.noPlacesWithCoords'), 'warning'); return; }
                          const mapUrl = urls.length === 1 ? urls[0].url : (activeStops.length === 1 && !hasStartPoint ? window.BKK.getNavigateUrl(activeStops[0]) : '#');
                          if (mapUrl.length > 2000) showToast(`${t('toast.urlTooLong')} (${mapUrl.length})`, 'warning');
                          else if (isCircular) showToast(t('route.circularDesc'), 'info');
                          startActiveTrail(activeStops, formData.interests, formData.area);
                          showToast(`📸 ${t('trail.started')}`, 'success');
                          window.BKK.logEvent?.('place_opened_google', { source: 'route_start', stops: activeStops.length });
                          window.open(mapUrl, 'city_explorer_map');
                        }}
                      >
                        {`🚀 ${t('route.openRouteInGoogle')}`}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px' }}>
                      {urls.map((urlInfo, idx) => (
                        <button
                          key={idx}
                          id={idx === 0 ? "open-google-maps-btn" : undefined}
                          onClick={() => {
                            if (urlInfo.url.length > 2000) showToast(`${t('toast.urlTooLong')} (${urlInfo.url.length})`, 'warning');
                            if (idx === 0) startActiveTrail(activeStops, formData.interests, formData.area);
                            window.BKK.logEvent?.('place_opened_google', { source: 'route_part', part: idx + 1 });
                            window.open(urlInfo.url, 'city_explorer_map');
                          }}
                          style={{
                            flex: 1, height: '42px',
                            backgroundColor: idx === 0 ? '#2563eb' : '#1d4ed8',
                            color: 'white', textAlign: 'center',
                            borderRadius: '12px', fontWeight: 'bold', fontSize: '12px',
                            border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                            cursor: 'pointer'
                          }}
                        >
                          {`📍 ${t('route.openRoutePartN').replace('{n}', urlInfo.part).replace('{total}', urlInfo.total)}`}
                        </button>
                      ))}
                      </div>
                    );
                  })()}

                  {/* routeActionsHint removed — redundant, clutters UI */}

                  </div>
                </div>
            )}
          </div>
        )}


        {/* Saved Routes View */}
        {/* Search View */}
        {currentView === 'search' && (
          <div className="view-fade-in bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{`🔍 ${t("places.searchResults")}`}</h2>
              <button
                onClick={() => setCurrentView('myPlaces')}
                className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-300 flex items-center gap-1"
              >
                ← Back
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder={t("places.searchByNameHint")}
                value={searchQuery}
                className="w-full p-3 border-3 border-gray-300 rounded-xl text-base focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                style={{ textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}
                onChange={(e) => {
                  const query = e.target.value;
                  setSearchQuery(query);
                  
                  if (!query.trim()) {
                    setSearchResults([]);
                    return;
                  }
                  
                  const queryLower = query.toLowerCase();
                  const results = customLocations.filter(loc => 
                    loc.name.toLowerCase().includes(queryLower) ||
                    (loc.description && loc.description.toLowerCase().includes(queryLower)) ||
                    (loc.notes && loc.notes.toLowerCase().includes(queryLower))
                  );
                  setSearchResults(results);
                }}
              />
            </div>
            
            {/* Search Results */}
            {searchQuery && searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-bold">{`${searchResults.length} results found:`}</p>
                {searchResults.map(loc => (
                  <div
                    key={loc.id}
                    className="bg-gradient-to-r from-green-50 to-teal-50 border-3 border-green-400 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-green-900 flex items-center gap-2">
                          <span>{loc.name}</span>
                          {loc.outsideArea && (
                            <span 
                              className="text-orange-500" 
                              title={t("places.outsideArea")}
                              style={{ fontSize: '16px' }}
                            >
                              🔺
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-green-700 mt-1">{loc.description || t('general.noDescription')}</p>
                        {loc.notes && (
                          <p className="text-xs text-green-600 mt-1 italic">💭 {loc.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditLocation(loc)}
                        className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-bold"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                    
                    {/* Image Preview */}
                    {loc.uploadedImage && (
                      <img 
                        src={loc.uploadedImage} 
                        alt={loc.name}
                        className="w-full max-h-32 object-contain rounded-lg mt-2 cursor-pointer border-2 border-green-300"
                        onClick={() => {
                          setModalImage(loc.uploadedImage);
                          setModalImageCtx({ description: loc.description, location: loc });
                          setShowImageModal(true);
                        }}
                      />
                    )}
                    
                    {/* Interests Tags */}
                    {loc.interests && loc.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {loc.interests.map(intId => {
                          const interest = interestMap[intId];
                          return interest ? (
                            <span key={intId} className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                              {interest.icon?.startsWith?.('data:') ? <img src={interest.icon} alt="" className="w-3.5 h-3.5 object-contain inline" /> : interest.icon} {tLabel(interest)}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery && searchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🔍</div>
                <p className="font-bold">{t("places.noResultsFor")} "{searchQuery}"</p>
                <p className="text-sm mt-2">{t("general.tryDifferentSearch")}</p>/p>
              </div>
            ) : locationsLoading ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <p className="text-gray-500 text-sm">{t("general.loading")}</p>
              </div>
            ) : cityCustomLocations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📍</div>
                <p className="font-bold">{t("places.noPlacesInCity", {cityName: tLabel(window.BKK.selectedCity) || t('places.thisCity')})}</p>
                <p className="text-sm mt-2">{t("places.addPlace")}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🔍</div>
                <p className="font-bold">{t("general.startTypingToSearch")}</p>
                <p className="text-sm mt-2">{`${cityCustomLocations.length} ${t("route.places")} - ${tLabel(window.BKK.selectedCity) || t('places.thisCity')}`}</p>
              </div>
            )}
          </div>
        )}

        {currentView === 'saved' && (
          <div className="view-fade-in bg-white rounded-xl shadow-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{`🗺️ ${t("nav.saved")}`}</h2>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {citySavedRoutes.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Sort toggle */}
                <div className="flex bg-gray-200 rounded-lg p-0.5">
                  <button
                    onClick={() => setRoutesSortBy('area')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${routesSortBy === 'area' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
                  >{t("places.byArea")}</button>
                  <button
                    onClick={() => setRoutesSortBy('name')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${routesSortBy === 'name' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
                  >{t("places.byName")}</button>
                </div>
              </div>
            </div>
            {renderContextHint('hint_saved')}
            
            {citySavedRoutes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-gray-600 mb-3 text-sm">{t("places.noSavedRoutesInCity", {cityName: tLabel(window.BKK.selectedCity) || t('places.thisCity')})}</p>
                <button
                  onClick={() => setCurrentView('form')}
                  className="bg-slate-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-700"
                >{t("route.newRoute")}</button>
              </div>
            ) : (
              <div className="space-y-1">
                {(() => {
                  const sorted = [...citySavedRoutes].sort((a, b) => {
                    if (routesSortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'he');
                    return (a.areaName || '').localeCompare(b.areaName || '', 'he');
                  });
                  
                  let lastGroup = null;
                  return sorted.map(savedRoute => {
                    const groupKey = routesSortBy === 'area' ? (savedRoute.areaName || t('general.noArea')) : null;
                    const showGroupHeader = routesSortBy === 'area' && groupKey !== lastGroup;
                    if (showGroupHeader) lastGroup = groupKey;
                    
                    // Collect interest icons from route stops
                    const routeInterestIds = [...new Set((savedRoute.stops || []).flatMap(s => s.interests || []))];
                    
                    return (
                      <React.Fragment key={savedRoute.id}>
                        {showGroupHeader && (
                          <div className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded mt-2 mb-1">
                            📍 {groupKey}
                          </div>
                        )}
                        <div
                          className={`flex items-center justify-between gap-2 rounded-lg p-2 border cursor-pointer ${savedRoute.system ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-gray-200 bg-white hover:bg-blue-50'}`}
                          style={{ overflow: 'hidden' }}
                          onClick={() => loadSavedRoute(savedRoute)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              {savedRoute.system && <span style={{ fontSize: '11px' }} title="מסלול מומלץ">⭐</span>}
                              <span className="font-medium text-sm truncate">{savedRoute.name}</span>
                              {savedRoute.locked && isUnlocked && !savedRoute.system && <span title={t("general.locked")} style={{ fontSize: '11px' }}>🔒</span>}
                              {routeInterestIds.slice(0, 5).map((intId, idx) => {
                                const obj = interestMap[intId];
                                if (!obj?.icon) return null;
                                return <span key={idx} title={obj.label} style={{ fontSize: '12px' }}>{renderIcon(obj.icon, '14px')}</span>;
                              })}
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{savedRoute.stops?.length || 0} stops</span>
                            </div>
                            {savedRoute.notes && (
                              <div className="text-[10px] text-gray-500 mt-0.5" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>📝 <AutoTranslateText text={savedRoute.notes} translateText={translateText} detectNeedsTranslation={detectNeedsTranslation} /></div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoute({...savedRoute});
                              setRouteDialogMode(savedRoute.system || (savedRoute.locked && !isUnlocked) ? 'view' : 'edit');
                              setShowRouteDialog(true);
                            }}
                            className="text-xs px-1 py-0.5 rounded hover:bg-blue-100 flex-shrink-0"
                            title={savedRoute.system ? t("general.viewOnly") : (savedRoute.locked && !isUnlocked ? t("general.viewOnly") : t("places.detailsEdit"))}
                          >{savedRoute.system || (savedRoute.locked && !isUnlocked) ? '👁️' : '✏️'}</button>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

                {/* My Content View */}
        {/* My Content View - Compact Design */}
        {currentView === 'myPlaces' && (
          <div className="view-fade-in bg-white rounded-xl shadow-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold">{`⭐ ${t("nav.favorites")}`}</h2>
              <button
                onClick={() => refreshAllData()}
                disabled={isRefreshing}
                style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: isRefreshing ? 'wait' : 'pointer' }}
                title={t('settings.refreshData') || 'רענן'}
              ><span className={isRefreshing ? 'animate-spin inline-block' : ''}>🔄</span></button>
              {isUnlocked && customLocations.length > 1 && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => scanAllDuplicates(false)}
                    style={{ padding: '5px 10px', fontSize: '10px', fontWeight: 'bold', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                    title={t('dedup.scanByInterest')}
                  >🔍 {t('dedup.scanButton')}</button>
                  <button
                    onClick={() => scanAllDuplicates(true)}
                    style={{ padding: '5px 10px', fontSize: '10px', fontWeight: 'bold', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                    title={t('dedup.scanByCoords')}
                  >📐 {t('dedup.scanCoordsButton')}</button>
                </div>
              )}
              {isUnlocked && (
                <div style={{ marginLeft: customLocations.length <= 1 ? 'auto' : '0' }}>
                  <input type="file" accept=".json" id="importDataFav" className="hidden"
                    onChange={(e) => { parseImportFile(e.target.files?.[0]); e.target.value = ''; }} />
                  <label htmlFor="importDataFav"
                    style={{ padding: '5px 10px', fontSize: '10px', fontWeight: 'bold', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', display: 'inline-block' }}
                  >📥 {t('general.import')}</label>
                </div>
              )}
            </div>
            {renderContextHint('hint_favorites')}
            
            {/* Custom Locations Section - Tabbed */}
            <div className="mb-4">
              {/* Row 1: Group by + Search */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '6px', flexWrap: 'wrap' }}>
                <div className="flex items-center gap-2">
                  {/* Sort/group selector */}
                  <select
                    value={placesSortBy}
                    onChange={e => setPlacesSortBy(e.target.value)}
                    style={{ padding: '3px 6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '11px', background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    <option value="updatedAt">🕐 {t('places.sortByUpdated') || 'עודכן לאחרונה'}</option>
                    <option value="addedAt">📅 {t('places.sortByAdded') || 'נוסף לאחרונה'}</option>
                    <option value="name">🔤 {t('places.sortByName') || 'שם'}</option>
                    <option value="interest">🏷️ {t('places.byInterest') || 'לפי תחום'}</option>
                    <option value="area">📍 {t('places.byArea') || 'לפי אזור'}</option>
                  </select>
                  {/* Favorites map button moved to action row */}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1', minWidth: '120px' }}>
                  <input
                    type="text"
                    placeholder={`🔍 ${t("places.searchByNameHint")}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '4px 10px', border: '1px solid #d1d5db',
                      borderRadius: '8px', width: '100%', fontSize: '16px',
                      textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left',
                      direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#9ca3af', padding: '0', flexShrink: 0 }}
                    >✕</button>
                  )}
                </div>
              </div>
              {/* Row 2: Action buttons — Snap place removed (use floating camera button) */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button
                  onClick={() => {
                    if (!authUser || authUser.isAnonymous) { setShowLoginDialog(true); showToast(t('auth.signInRequired'), 'info', 'sticky'); return; }
                    const lastInterests = lastCaptureInterestsRef.current?.length > 0
                      ? lastCaptureInterestsRef.current
                      : formData.interests?.length > 0 ? formData.interests.slice(0, 1) : [];
                    setNewLocation({ name: '', description: '', notes: '', area: formData.area, areas: [formData.area], interests: lastInterests, lat: null, lng: null, mapsUrl: '', address: '', uploadedImage: null, imageUrls: [], googlePlace: false, googlePlaceId: '', googleRating: null, googleRatingCount: 0 });
                    setLocationSearchResults(null);
                    setShowAddLocationDialog(true);
                    window.BKK.logEvent?.('add_place_manually_clicked', { source: 'favorites' });
                  }}
                  className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-teal-600"
                >
                  {`✏️ ${t("places.addManually")}`}
                </button>
                <button
                  onClick={() => { setMapMode('favorites'); setMapFavArea(null); setMapFavRadius(null); setMapFocusPlace(null); setMapFavFilter(new Set()); setMapBottomSheet(null); setShowMapModal(true); window.BKK.logEvent?.('favorites_map_opened', { source: 'myplaces' }); }}
                  style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid #c084fc', background: '#f3e8ff', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', color: '#7c3aed', whiteSpace: 'nowrap' }}
                >
                  🗺️ {t('form.favoritesMap')}
                </button>
              </div>

              {/* Filter button for editor/admin */}
              {isUnlocked && (
              <div className="flex mb-2 gap-1 items-center justify-end">
                <span className="text-xs text-gray-400 mr-auto">{groupedPlaces.draftsCount + groupedPlaces.readyCount} {t('nav.favorites')} {groupedPlaces.blacklistCount > 0 ? `· ${groupedPlaces.blacklistCount} 🚫` : ''}</span>
                {['all', 'drafts', 'ready', 'skipped'].map(tab => (
                  <button key={tab}
                    onClick={() => { setPlacesTab(tab); setFilterNoInterest(false); }}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      placesTab === tab
                        ? tab === 'skipped' ? 'bg-red-100 text-red-700' : tab === 'ready' ? 'bg-green-100 text-green-700' : tab === 'drafts' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {tab === 'all' ? t('general.all') || 'הכל' : tab === 'drafts' ? `✏️ ${groupedPlaces.draftsCount}` : tab === 'ready' ? `✅ ${groupedPlaces.readyCount}` : `🚫 ${groupedPlaces.blacklistCount}`}
                  </button>
                ))}
                {/* No-interest filter — admin/editor only */}
                {(() => {
                  const noInterestCount = cityCustomLocations.filter(l => l.status !== 'blacklist' && (!l.interests || l.interests.length === 0)).length;
                  if (noInterestCount === 0) return null;
                  return (
                    <button
                      onClick={() => setFilterNoInterest(prev => !prev)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all ${filterNoInterest ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      title={window.BKK.i18n.currentLang === 'en' ? `No interest (${noInterestCount})` : `ללא תחום (${noInterestCount})`}
                    >🏷️ {noInterestCount}</button>
                  );
                })()}
              </div>
              )}
              
              {/* Pending locations waiting for sync */}
              {lastImportBatch && (placesTab === 'all' || placesTab === 'drafts') && (() => {
                const batchCount = cityCustomLocations.filter(l => l.importBatch === lastImportBatch && l.status !== 'blacklist' && !l.locked).length;
                if (batchCount === 0) return null;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: filterImportBatch ? '#dcfce7' : '#f0fdf4', border: `1px solid ${filterImportBatch ? '#86efac' : '#bbf7d0'}`, borderRadius: '8px', padding: '4px 10px', marginBottom: '6px', fontSize: '11px' }}>
                    <span style={{ fontWeight: 'bold', color: '#166534' }}>📦 {t('import.lastImport')}: {batchCount} {t('route.places') || 'places'}</span>
                    <button
                      onClick={() => setFilterImportBatch(!filterImportBatch)}
                      style={{ padding: '2px 8px', borderRadius: '4px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                        background: filterImportBatch ? '#16a34a' : '#e5e7eb', color: filterImportBatch ? 'white' : '#374151' }}
                    >{filterImportBatch ? (t('import.showAll')) : (t('import.filterImport'))}</button>
                  </div>
                );
              })()}
              {/* Pending locations waiting for sync */}
              {pendingLocations.filter(l => (l.cityId || 'bangkok') === selectedCityId).length > 0 && (
                <div style={{ background: '#fff7ed', border: '2px dashed #fb923c', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#c2410c' }}>
                        {`☁️ ${pendingLocations.filter(l => (l.cityId || 'bangkok') === selectedCityId).length} ${t('toast.pendingSync')}`}
                      </span>
                      <div style={{ fontSize: '10px', color: '#9a3412', marginTop: '2px' }}>
                        {pendingLocations.filter(l => (l.cityId || 'bangkok') === selectedCityId).map(l => l.name).join(', ')}
                      </div>
                    </div>
                    <button
                      onClick={() => syncPendingItems()}
                      disabled={!firebaseConnected}
                      style={{ padding: '4px 10px', background: firebaseConnected ? '#f97316' : '#d1d5db', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: firebaseConnected ? 'pointer' : 'not-allowed' }}
                    >
                      {`🔄 ${t('toast.syncNow')}`}
                    </button>
                  </div>
                </div>
              )}
              
              {locationsLoading ? (
                <div className="text-center py-8">
                  <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <p className="text-gray-500 text-sm">{t("general.loading")}</p>
                </div>
              ) : (groupedPlaces.sortedKeys.length === 0 && groupedPlaces.ungrouped.length === 0) ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">{placesTab === 'skipped' ? '🚫' : '📍'}</div>
                  <p className="text-gray-600 text-sm">
                    {t("places.noPlacesInCity", {cityName: tLabel(window.BKK.selectedCity) || t('places.thisCity')})}
                  </p>
                </div>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto" style={{ contain: 'content' }}>
                  {groupedPlaces.sortedKeys.map(key => {
                    const locs = groupedPlaces.groups[key];
                    const obj = placesGroupBy === 'interest' 
                      ? (interestMap[key] || customInterests?.find(ci => ci.id === key))
                      : areaMap[key];
                    const groupLabel = obj ? tLabel(obj) : key;
                    const groupIcon = (placesSortBy === 'area') ? '📍' : (obj?.icon || '🏷️');
                    const canEdit = true; // permissions handled in edit dialog
                    return (
                      <div key={key} className="border border-gray-200 rounded-lg overflow-hidden mb-1.5">
                        <div className="bg-gray-100 px-2 py-1 flex items-center gap-1 text-xs font-bold text-gray-700">
                          <span>{groupIcon?.startsWith?.('data:') ? <img src={groupIcon} alt="" className="w-4 h-4 object-contain inline" /> : groupIcon}</span>
                          <span>{groupLabel}</span>
                          <span className="text-gray-400 font-normal">({locs.length})</span>
                        </div>
                        <div className="p-1">
                          {locs.filter(loc => (!filterImportBatch || !lastImportBatch || loc.importBatch === lastImportBatch) && (!filterNoInterest || !loc.interests || loc.interests.length === 0)).map(loc => {
                            const mapUrl = (() => { const u = window.BKK.getNavigateUrl(loc); return u === '#' ? null : u; })();
                            const isNewImport = lastImportBatch && loc.importBatch === lastImportBatch;
                            return (
                              <div key={loc.id}
                                className={`flex items-center justify-between gap-2 border-2 rounded p-1.5 mb-0.5 ${
                                  loc.status === 'blacklist' ? 'border-red-200 bg-red-50' :
                                  isLocationValid(loc) ? "border-gray-200 bg-white" : "border-red-400 bg-red-50"
                                }`}
                                style={{ contain: 'layout style', ...(isNewImport ? { borderLeftWidth: '4px', borderLeftColor: '#22c55e' } : {}) }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {mapUrl ? (
                                      <><span onClick={() => handleEditLocation(loc, flatNavList)}
                                        className="font-medium text-sm text-blue-600 truncate cursor-pointer hover:underline"
                                      >{loc.name}</span>
                                      <a href={mapUrl} target="city_explorer_map" rel="noopener noreferrer"
                                        style={{ fontSize: '10px', opacity: 0.5, flexShrink: 0 }} title={t("general.openInGoogle")}>🔗</a></>
                                    ) : (
                                      <span onClick={() => handleEditLocation(loc, flatNavList)} className="font-medium text-sm truncate cursor-pointer hover:underline">{loc.name}</span>
                                    )}
                                    
                                    {loc.outsideArea && <span className="text-orange-500 text-xs" title={t("general.outsideBoundary")}>🔺</span>}
                                    {loc.missingCoordinates && <span className="text-red-500 text-xs" title={t("general.noLocation")}>⚠️</span>}
                                    {!isLocationValid(loc) && <span className="text-red-500 text-[9px]" title={t("places.missingDetailsLong")}>❌</span>}
                                    {placesGroupBy === 'area' && loc.interests?.map((int, idx) => {
                                      const obj2 = interestMap[int];
                                      return obj2?.icon ? <span key={idx} title={obj2.label} style={{ fontSize: '13px' }}>{renderIcon(obj2.icon, '14px')}</span> : null;
                                    })}
                                    {placesGroupBy === 'interest' && (loc.areas || [loc.area]).filter(Boolean).map((aId, idx) => (
                                      <span key={idx} className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded">{tLabel(areaMap[aId]) || aId}</span>
                                    ))}
                                  </div>
                                </div>
                                {loc.status !== 'blacklist' && (loc.uploadedImage || (loc.imageUrls && loc.imageUrls.length > 0)) && (
                                  <button onClick={() => { setModalImage(loc.uploadedImage || loc.imageUrls[0]); setModalImageCtx({ description: loc.description, location: loc }); setShowImageModal(true); }}
                                    style={{ fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0, opacity: 0.6 }}
                                    title={t("general.viewImage") || "תמונה"}>🖼️</button>
                                )}
                                {loc.status !== 'blacklist' && (() => { const pk = (loc.name || '').replace(/[.#$/\\[\]]/g, '_'); const ra = reviewAverages[pk]; return (
                                  <button onClick={() => openReviewDialog(loc)}
                                    style={{ fontSize: '10px', padding: '0 3px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0, fontWeight: 'bold', minWidth: '28px', textAlign: 'center',
                                      ...(ra ? { color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a' } : { color: '#d1d5db', background: 'none', border: '1px solid #e5e7eb' })
                                    }}
                                    title={ra ? `🌟 ${ra.avg.toFixed(1)} (${ra.count})` : (t('reviews.rate'))}
                                  >{ra ? `🌟${ra.avg.toFixed(1)}` : '☆'}</button>
                                ); })()}
                                <button onClick={() => handleEditLocation(loc, flatNavList)}
                                  className="text-xs px-1 py-0.5 rounded"
                                  title={canEdit ? t("places.detailsEdit") : t("general.viewOnly")}>{canEdit ? "✏️" : "👁️"}</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {groupedPlaces.ungrouped.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden mb-1.5">
                      <div className="bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500">
                        {t("places.noInterest")} ({groupedPlaces.ungrouped.length})
                      </div>
                      <div className="p-1">
                        {groupedPlaces.ungrouped.filter(loc => (!filterImportBatch || !lastImportBatch || loc.importBatch === lastImportBatch) && (!filterNoInterest || !loc.interests || loc.interests.length === 0)).map(loc => {
                          const mapUrl = (() => { const u = window.BKK.getNavigateUrl(loc); return u === '#' ? null : u; })();
                          const canEdit = true; // permissions handled in edit dialog
                          const isNewImport = lastImportBatch && loc.importBatch === lastImportBatch;
                          return (
                            <div key={loc.id}
                              className={`flex items-center justify-between gap-2 border-2 rounded p-1.5 mb-0.5 ${isLocationValid(loc) ? "border-gray-200 bg-white" : "border-red-400 bg-red-50"}`}
                              style={{ contain: 'layout style', ...(isNewImport ? { borderLeftWidth: '4px', borderLeftColor: '#22c55e' } : {}) }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {mapUrl ? (
                                    <><span onClick={() => handleEditLocation(loc, flatNavList)}
                                      className="font-medium text-sm text-blue-600 truncate cursor-pointer hover:underline"
                                    >{loc.name}</span>
                                    <a href={mapUrl} target="city_explorer_map" rel="noopener noreferrer"
                                      style={{ fontSize: '10px', opacity: 0.5, flexShrink: 0 }} title={t("general.openInGoogle")}>🔗</a></>
                                  ) : (
                                    <span onClick={() => handleEditLocation(loc, flatNavList)} className="font-medium text-sm truncate cursor-pointer hover:underline">{loc.name}</span>
                                  )}
                                  
                                  {!isLocationValid(loc) && <span className="text-red-500 text-[9px]" title={t("places.missingDetails")}>❌</span>}
                                </div>
                              </div>
                              {loc.status !== 'blacklist' && (loc.uploadedImage || (loc.imageUrls && loc.imageUrls.length > 0)) && (
                                <button onClick={() => { setModalImage(loc.uploadedImage || loc.imageUrls[0]); setModalImageCtx({ description: loc.description, location: loc }); setShowImageModal(true); }}
                                  style={{ fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0, opacity: 0.6 }}
                                  title={t("general.viewImage") || "תמונה"}>🖼️</button>
                              )}
                              {loc.status !== 'blacklist' && (() => { const pk = (loc.name || '').replace(/[.#$/\\[\]]/g, '_'); const ra = reviewAverages[pk]; return (
                                <button onClick={() => openReviewDialog(loc)}
                                  style={{ fontSize: '10px', padding: '0 3px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0, fontWeight: 'bold', minWidth: '28px', textAlign: 'center',
                                    ...(ra ? { color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a' } : { color: '#d1d5db', background: 'none', border: '1px solid #e5e7eb' })
                                  }}
                                  title={ra ? `⭐ ${ra.avg.toFixed(1)} (${ra.count})` : (t('reviews.rate'))}
                                >{ra ? `⭐${ra.avg.toFixed(1)}` : '☆'}</button>
                              ); })()}
                              <button onClick={() => handleEditLocation(loc, flatNavList)}
                                className="text-xs px-1 py-0.5 rounded"
                                title={canEdit ? t("places.detailsEdit") : t("general.viewOnly")}>{canEdit ? "✏️" : "👁️"}</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* My Interests View */}
        {currentView === 'myInterests' && (
          <div className="view-fade-in bg-white rounded-xl shadow-lg p-3">
            {Object.keys(interestConfig).length === 0 && allInterestOptions.every(i => !i.label) ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px', color: '#9ca3af', fontSize: '14px', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid #e5e7eb', borderTop: '2px solid #8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                {t('general.loading') || 'טוען תחומים...'}
              </div>
            ) : (<>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">🏷️ {t("nav.myInterests")}</h2>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                  {allInterestOptions.length} {t("general.total")}
                </span>
              </div>
              <div className="flex gap-1">
                {isEditor && (
                <button
                  onClick={() => {
                    setEditingCustomInterest(null);
                    setNewInterest({ label: '', labelEn: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', privateOnly: true, locked: false, builtIn: false });
                    setShowAddInterestDialog(true);
                  }}
                  className="bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-purple-600"
                >
                  {t("interests.addInterest")}
                </button>
                )}
              </div>
            </div>
            {renderContextHint('hint_interests_list')}
            
            {/* Unified Interest List */}
            {(() => {
              // Helper to open interest dialog for editing
              const openInterestDialog = (interest) => {
                const config = interestConfig[interest.id] || {};
                const isFromCustom = customInterests.some(ci => ci.id === interest.id);
                setEditingCustomInterest(isFromCustom ? interest : { ...interest, builtIn: true });
                setNewInterest({
                  id: interest.id,
                  label: config.labelOverride || interest.label || interest.name || '',
                  labelEn: config.labelEnOverride || config.labelOverrideEn || interest.labelEn || '',
                  icon: interest.icon || '📍',
                  searchMode: config.textSearch ? 'text' : 'types',
                  types: (config.types || []).join(', '),
                  textSearch: config.textSearch || '',
                  blacklist: (config.blacklist || []).join(', '),
                  nameKeywords: (config.nameKeywords || []).join(', '),
                  minRatingCount: config.minRatingCount != null ? config.minRatingCount : null,
                  lowRatingCount: config.lowRatingCount != null ? config.lowRatingCount : null,
                  privateOnly: interest.privateOnly || false,
                  noGoogleSearch: config.noGoogleSearch || interest.noGoogleSearch || false,
                  locked: interest.locked || false,
                  builtIn: !isFromCustom,
                  category: config.category || interest.category || 'attraction',
                  weight: config.weight || interest.weight || ({'attraction':3,'break':1,'meal':1,'experience':1,'shopping':2,'nature':2}[config.category || interest.category || 'attraction'] || 2),
                  minStops: config.minStops != null ? config.minStops : (interest.minStops != null ? interest.minStops : 1),
                  maxStops: config.maxStops || interest.maxStops || 10,
                  routeSlot: config.routeSlot || interest.routeSlot || 'any',
                  minGap: config.minGap || interest.minGap || 1,
                  bestTime: config.bestTime || interest.bestTime || 'anytime',
                  dedupRelated: config.dedupRelated || interest.dedupRelated || [],
                  group: config.group || interest.group || ''
                });
                setShowAddInterestDialog(true);
              };
              
              // Render a single interest row with toggle button
              // Pre-compute favorites count per interest
              const favCountByInterest = {};
              customLocations.forEach(loc => {
                if (loc.status === 'blacklist' || !loc.lat || !loc.lng) return;
                (loc.interests || []).forEach(iid => { favCountByInterest[iid] = (favCountByInterest[iid] || 0) + 1; });
              });

              const renderInterestRow = (interest, isActive = true) => {
                const isValid = isInterestValid(interest.id);
                const isInternal = !!interestConfig[interest.id]?.noGoogleSearch;
                const effectiveActive = (isValid || isInternal) ? isActive : false;
                const aStatus = interest.adminStatus || (interestConfig[interest.id]?.adminStatus) || 'active';
                const isDraft = aStatus === 'draft';
                const isHidden = aStatus === 'hidden';
                const interestColor = window.BKK.getInterestColor(interest.id, allInterestOptions);
                const favCount = favCountByInterest[interest.id] || 0;
                const borderClass = isHidden ? 'border-2 border-red-300 bg-red-50 opacity-50'
                  : isDraft ? 'border-2 border-amber-300 bg-amber-50'
                  : !effectiveActive ? 'border border-gray-300 bg-gray-50 opacity-60'
                  : (isValid || isInternal ? 'border border-gray-200 bg-white' : 'border-2 border-red-400 bg-red-50');
                
                return (
                  <div key={interest.id} className={`flex items-center justify-between gap-2 rounded-lg p-2 ${borderClass}`}>
                    {/* Color bar */}
                    <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '2px', background: effectiveActive ? interestColor : '#d1d5db', flexShrink: 0 }}></div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg flex-shrink-0">{interest.icon?.startsWith?.('data:') ? <img src={interest.icon} alt="" className="w-5 h-5 object-contain" /> : interest.icon}</span>
                      <span className={`font-medium text-sm truncate ${isHidden ? 'text-red-400 line-through' : isDraft ? 'text-amber-700' : !effectiveActive ? 'text-gray-500' : ''}`}>{tLabel(interest)}</span>
                      {favCount > 0 && <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>({favCount})</span>}
                      {interestConfig[interest.id]?.noGoogleSearch && <span style={{ fontSize: '9px', background: '#f3f4f6', color: '#6b7280', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>פנימי</span>}
                      {!interestConfig[interest.id]?.noGoogleSearch && (() => {
                        const cfg = interestConfig[interest.id];
                        const hasText = cfg?.textSearch;
                        const hasTypes = cfg?.types?.length > 0;
                        if (!hasText && !hasTypes) return <span className="text-red-500 text-xs flex-shrink-0" title={t("interests.missingSearchConfig")}>⚠️</span>;
                        return <span title={hasText ? `🔤 text: "${cfg.textSearch}"` : `🏷️ types: ${cfg.types.join(', ')}`} style={{ fontSize: '11px', flexShrink: 0, cursor: 'default' }}>{hasText ? '🔤' : '🏷️'}</span>;
                      })()}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {/* Map button — show favorites filtered to this interest */}
                      {favCount > 0 && (
                        <button
                          onClick={() => { setMapMode('favorites'); setMapFavArea(null); setMapFavRadius(null); setMapFocusPlace(null); setMapFavFilter(new Set([interest.id])); setMapBottomSheet(null); setShowMapModal(true); }}
                          style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', border: '1px solid #c084fc', background: '#faf5ff', cursor: 'pointer', color: '#7c3aed', fontWeight: 'bold' }}
                          title={`${t('wizard.showMap')} (${favCount})`}
                        >🗺️</button>
                      )}
                      {/* Admin status cycle — admin only, hide green (active is default) */}
                      {(isDraft || isHidden) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); cycleAdminStatus(interest.id); }}
                          style={{
                            fontSize: '9px', padding: '1px 4px', borderRadius: '4px',
                            background: isHidden ? '#fee2e2' : '#fef3c7',
                            border: `1px solid ${isHidden ? '#fca5a5' : '#fcd34d'}`,
                            cursor: 'pointer', lineHeight: '14px'
                          }}
                          title={`Status: ${aStatus} (click to cycle)`}
                        >{isHidden ? '🔴' : '🟡'}</button>
                      )}
                      {/* Editor: edit button. Regular user: view-only button */}
                      {isEditor ? (
                      <button
                        onClick={() => { setInterestDialogReadOnly(false); openInterestDialog(interest); }}
                        className="text-xs px-1 py-0.5 rounded flex-shrink-0"
                        title={t("places.detailsEdit")}
                      >{'✏️'}</button>
                      ) : (
                      <button
                        onClick={() => { setInterestDialogReadOnly(true); openInterestDialog(interest); }}
                        className="text-xs px-1 py-0.5 rounded flex-shrink-0"
                        title={t("general.viewOnly")}
                      >{'👁️'}</button>
                      )}
                    </div>
                  </div>
                );
              };
              
              // Use allInterestOptions — already has Firebase labels, icons, interestConfig overrides applied
              const allOpts = allInterestOptions;
              const activeBuiltIn = allOpts.filter(i => {
                const as = (interestConfig[i.id]?.adminStatus) || 'active';
                return as === 'active';
              });
              const activeCustom = []; // merged into activeBuiltIn above
              const inactiveBuiltIn = allOpts.filter(i => {
                const as = (interestConfig[i.id]?.adminStatus) || 'active';
                return false; // user toggle removed
              });
              const inactiveCustom = []; // user toggle removed
              const allForAdmin = allOpts;
              const draftInterests = allForAdmin.filter(i => (interestConfig[i.id]?.adminStatus) === 'draft');
              const hiddenInterests = allForAdmin.filter(i => (interestConfig[i.id]?.adminStatus) === 'hidden');
              
              return (
                <>
                  {/* Active Interests — merged and sorted alphabetically */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-green-700 mb-2">
                      {t("interests.activeInterests")} ({activeBuiltIn.length + activeCustom.length})
                    </h3>
                    <div className="space-y-1">
                      {[...activeBuiltIn, ...activeCustom].map(i => renderInterestRow(i, true))}
                    </div>
                  </div>
                  
                  {/* Inactive Interests */}
                  {(inactiveBuiltIn.length + inactiveCustom.length) > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-500 mb-2">
                        ⏸️ Disabled interests ({inactiveBuiltIn.length + inactiveCustom.length})
                      </h3>
                      <div className="space-y-1">
                        {inactiveBuiltIn.map(i => renderInterestRow(i, false))}
                        {inactiveCustom.map(i => renderInterestRow(i, false))}
                      </div>
                    </div>
                  )}
                  
                  {/* Draft Interests — admin only */}
                  {draftInterests.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-amber-600 mb-2">
                        🟡 Draft ({draftInterests.length})
                      </h3>
                      <div className="space-y-1">
                        {draftInterests.map(i => renderInterestRow(i, true))}
                      </div>
                    </div>
                  )}
                  
                  {/* Hidden Interests — admin only */}
                  {hiddenInterests.length > 0 && (
                    <div className="mb-2">
                      <h3 className="text-sm font-bold text-red-500 mb-2">
                        🔴 Hidden ({hiddenInterests.length})
                      </h3>
                      <div className="space-y-1">
                        {hiddenInterests.map(i => renderInterestRow(i, false))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>)}
          </div>
        )}

        {/* Settings View - Compact Design */}
        {currentView === 'settings' && isAdmin && (
          <div className="view-fade-in bg-white rounded-xl shadow-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold">{t("settings.title")}</h2>
            </div>
            {renderContextHint('hint_settings')}
            
            {/* Settings Sub-Tabs */}
            <div className="flex gap-1 mb-3" style={{ flexWrap: 'nowrap' }}>
              <button
                onClick={() => setSettingsTab('general')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
                  settingsTab === 'general' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >⚙️ כללי</button>
              <button
                onClick={() => setSettingsTab('cities')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
                  settingsTab === 'cities' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >🌍 ערים</button>
              <button
                onClick={() => setSettingsTab('interests')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
                  settingsTab === 'interests' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >🏷️ תחומים</button>
              <button
                onClick={() => setSettingsTab('sysparams')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
                  settingsTab === 'sysparams' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >🔧 פרמטרים</button>
              {debugMode && (
              <button
                onClick={() => setSettingsTab('debug')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
                  settingsTab === 'debug' ? 'bg-gray-800 text-yellow-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >🐛 {debugSessions.length > 0 ? `דיבאג (${debugSessions.length})` : 'דיבאג'}</button>
              )}
            </div>

            {/* ===== CITIES & AREAS TAB ===== */}
            {settingsTab === 'cities' && (<div>

            {/* City & Area Management */}
            <div className="mb-3">
              <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-400 rounded-lg p-2">
                <h3 className="text-sm font-bold text-gray-800 mb-2">{`🌍 ${t("settings.title")}`}</h3>
                
                {/* City selector dropdown + selected city details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <select
                    value={selectedCityId}
                    onChange={(e) => switchCity(e.target.value, true)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '2px solid #e11d48', fontSize: '13px', fontWeight: 'bold', color: '#e11d48', background: '#fef2f2', cursor: 'pointer', minWidth: '140px' }}
                  >
                    {Object.values(window.BKK.cities || {}).map(city => (
                      <option key={city.id} value={city.id}>{city.icon?.startsWith?.('data:') ? '🏙️' : (city.icon || '🏙️')} {tLabel(city)}</option>
                    ))}
                  </select>
                  <button onClick={() => setShowAddCityDialog(true)}
                    style={{ padding: '5px 10px', borderRadius: '8px', border: '1.5px dashed #d1d5db', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#6b7280' }}
                  >➕ {t('settings.addCity')}</button>
                </div>
                
                {/* Selected city info bar */}
                {(() => {
                  const city = window.BKK.selectedCity;
                  if (!city) return null;
                  const isActive = cityActiveStates[city.id] !== false && city.active !== false;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '6px 10px', background: isActive ? '#ecfdf5' : '#fef2f2', borderRadius: '8px', border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`, flexWrap: 'wrap' }}>
                      {true ? (
                        <React.Fragment>
                          {/* City icon — shows current, upload or emoji */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '52px' }}>
                            <div style={{ width: '44px', height: '44px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', overflow: 'hidden' }}>
                              {city.icon?.startsWith?.('data:') ? <img src={city.icon} alt="" style={{ width: '38px', height: '38px', objectFit: 'contain' }} /> : (city.icon || '📍')}
                            </div>
                            <div style={{ display: 'flex', gap: '3px' }}>
                              <label style={{ fontSize: '9px', padding: '2px 5px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f9fafb', cursor: 'pointer', color: '#374151', fontWeight: 'bold' }} title="העלה קובץ">
                                📁
                                <input type="file" accept="image/*,image/jpeg,image/jfif" className="hidden" onChange={(e) => handleCityIconUpload(e.target.files?.[0], city.id, 'icon', 80)} />
                              </label>
                              <button onClick={() => setIconPickerConfig({ description: city.nameEn || city.name || '', callback: (emoji) => { city.icon = emoji; if (window.BKK.cityRegistry[city.id]) window.BKK.cityRegistry[city.id].icon = emoji; setCityModified(true); setCityEditCounter(c => c + 1);
                                saveCityGeneralField(city.id, 'icon', emoji);
                              }, suggestions: [], loading: false })}
                                style={{ fontSize: '9px', padding: '2px 5px', border: '1px solid #f59e0b', borderRadius: '4px', background: '#fffbeb', cursor: 'pointer', color: '#d97706', fontWeight: 'bold' }} title="בחר אמוג'י"
                              >✨</button>
                            </div>
                          </div>
                          <input type="text" value={city.name || ''}
                            onChange={(e) => { city.name = e.target.value; if (window.BKK.cityRegistry[city.id]) window.BKK.cityRegistry[city.id].name = e.target.value; setCityModified(true); setCityEditCounter(c => c + 1); }}
                            style={{ width: '70px', fontSize: '12px', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 'bold' }}
                            placeholder="HE"
                          />
                          <input type="text" value={city.nameEn || ''}
                            onChange={(e) => { city.nameEn = e.target.value; if (window.BKK.cityRegistry[city.id]) window.BKK.cityRegistry[city.id].nameEn = e.target.value; setCityModified(true); setCityEditCounter(c => c + 1); }}
                            style={{ width: '70px', fontSize: '12px', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            placeholder="EN"
                          />
                        </React.Fragment>
                      ) : (
                        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{city.icon?.startsWith?.('data:') ? '🏙️' : (city.icon || '🏙️')} {tLabel(city)}</span>
                      )}
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>{city.areas?.length || 0} {t('general.areas')} · {city.interests?.length || 0} {t('nav.myInterests')}</span>
                          <button onClick={() => {
                            const newActive = !isActive;
                            city.active = newActive;
                            const newStates = { ...cityActiveStates, [city.id]: newActive };
                            setCityActiveStates(newStates);
                            try { localStorage.setItem('city_active_states', JSON.stringify(newStates)); } catch(e) {}
                            // Sync to Firebase so all users get the same active cities
                            if (database) database.ref(`cities/${city.id}/general/active`).set(newActive);
                            showToast(tLabel(city) + (newActive ? ' ✓' : ' ✗'), 'info');
                          }} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}
                          >{isActive ? `▶️ ${t('general.active')}` : `⏸️ ${t('general.inactive')}`}</button>
                          <button onClick={() => { window.BKK.exportCityFile(city); showToast(`📥 city-${city.id}.js`, 'success'); setCityModified(false); }}
                            style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer', background: 'white', color: '#6b7280' }}
                          >📥 {t('settings.exportCity')}</button>
                          {Object.keys(window.BKK.cities || {}).length > 1 && (
                            <button onClick={async () => {
                              showConfirm(`⚠️ ${t('general.remove')} ${tLabel(city)}?`, () => {
                              const otherCity = Object.keys(window.BKK.cities || {}).find(id => id !== city.id);
                              if (otherCity) switchCity(otherCity, true);
                              window.BKK.unloadCity(city.id);
                              try { const s = JSON.parse(localStorage.getItem('city_active_states') || '{}'); delete s[city.id]; localStorage.setItem('city_active_states', JSON.stringify(s)); } catch(e) {}
                              showToast(`${tLabel(city)} ${t('general.removed')}`, 'info');
                              setCityModified(false);
                              setFormData(prev => ({...prev}));
                              });
                            }} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', border: '1px solid #fecaca', cursor: 'pointer', background: '#fef2f2', color: '#ef4444' }}
                            >🗑️ {t('general.remove')}</button>
                          )}
                    </div>
                  );
                })()}


                                {/* Theme Editor - Color + Icons */}
                {window.BKK.selectedCity && (() => {
                  const city = window.BKK.selectedCity;
                  if (!city.theme) city.theme = { color: '#e11d48', iconLeft: '🏙️', iconRight: '🗺️' };
                  const theme = city.theme;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>🎨</span>
                      <input type="color" value={theme.color || '#e11d48'}
                        onChange={(e) => { 
                          city.theme.color = e.target.value;
                          setCityModified(true); setCityEditCounter(c => c + 1);
                          saveCityGeneralField(city.id, 'color', e.target.value);
                        }}
                        style={{ width: '28px', height: '22px', border: 'none', cursor: 'pointer', borderRadius: '4px', padding: 0 }}
                      />
                      {/* iconLeft */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '36px', height: '36px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden' }}>
                          {theme.iconLeft?.startsWith?.('data:') ? <img src={theme.iconLeft} alt="" style={{ width: '30px', height: '30px', objectFit: 'contain' }} /> : (theme.iconLeft || '◀')}
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <label style={{ fontSize: '9px', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f9fafb', cursor: 'pointer', color: '#374151' }} title="העלה קובץ">
                            📁<input type="file" accept="image/*,image/jfif" className="hidden" onChange={(e) => handleCityIconUpload(e.target.files?.[0], city.id, 'iconLeft', 64)} />
                          </label>
                          <button onClick={() => setIconPickerConfig({ description: (city.nameEn || city.name || '') + ' left side icon', callback: (emoji) => { city.theme.iconLeft = emoji; setCityModified(true); setCityEditCounter(c => c + 1);
                            saveCityGeneralField(city.id, 'iconLeft', emoji);
                          }, suggestions: [], loading: false })}
                            style={{ fontSize: '9px', padding: '2px 4px', border: '1px solid #f59e0b', borderRadius: '4px', background: '#fffbeb', cursor: 'pointer', color: '#d97706' }} title="בחר אמוג'י"
                          >✨</button>
                        </div>
                      </div>
                      <div style={{ width: '60px', height: '22px', borderRadius: '6px', background: theme.color || '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>{tLabel(city)}</span>
                      </div>
                      {/* iconRight */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '36px', height: '36px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden' }}>
                          {theme.iconRight?.startsWith?.('data:') ? <img src={theme.iconRight} alt="" style={{ width: '30px', height: '30px', objectFit: 'contain' }} /> : (theme.iconRight || '▶')}
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <label style={{ fontSize: '9px', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f9fafb', cursor: 'pointer', color: '#374151' }} title="העלה קובץ">
                            📁<input type="file" accept="image/*,image/jfif" className="hidden" onChange={(e) => handleCityIconUpload(e.target.files?.[0], city.id, 'iconRight', 64)} />
                          </label>
                          <button onClick={() => setIconPickerConfig({ description: (city.nameEn || city.name || '') + ' right side icon', callback: (emoji) => { city.theme.iconRight = emoji; setCityModified(true); setCityEditCounter(c => c + 1);
                            saveCityGeneralField(city.id, 'iconRight', emoji);
                          }, suggestions: [], loading: false })}
                            style={{ fontSize: '9px', padding: '2px 4px', border: '1px solid #f59e0b', borderRadius: '4px', background: '#fffbeb', cursor: 'pointer', color: '#d97706' }} title="בחר אמוג'י"
                          >✨</button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Modified indicator + actions */}
                {cityModified && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '6px 10px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                    <span style={{ fontSize: '11px', color: '#92400e', fontWeight: 'bold' }}>⚠️ {t('settings.unsavedChanges')}</span>
                    <button onClick={() => { 
                      const city = window.BKK.selectedCity;
                      if (city) { window.BKK.exportCityFile(city); showToast(`📥 city-${city.id}.js`, 'success'); setCityModified(false); }
                    }} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#f59e0b', color: 'white', fontWeight: 'bold' }}
                    >📥 {t('settings.exportCity')}</button>
                  </div>
                )}

                {/* City Day/Night Hours */}
                {window.BKK.selectedCity && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', padding: '8px 10px', background: 'linear-gradient(to right, #faf5ff, #fdf2f8)', borderRadius: '8px', border: '2px solid #c084fc', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7c3aed' }}>🌅 {t('settings.dayNightHours')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600' }}>☀️</label>
                    {(() => {
                      const val = window.BKK.dayStartHour ?? 6;
                      const update = (v) => {
                        const clamped = Math.min(23, Math.max(0, v));
                        window.BKK.dayStartHour = clamped;
                        const city = window.BKK.selectedCity;
                        if (city) city.dayStartHour = clamped;
                        if (isFirebaseAvailable && database && isUnlocked) {
                          saveCityGeneralField(selectedCityId, 'dayStartHour', clamped);
                        }
                        setFormData(prev => ({...prev}));
                      };
                      return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <button onClick={() => update(val - 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: val <= 0 ? '#e5e7eb' : '#7c3aed', color: val <= 0 ? '#9ca3af' : 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ minWidth: '28px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>{val}</span>
                        <button onClick={() => update(val + 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: val >= 23 ? '#e5e7eb' : '#7c3aed', color: val >= 23 ? '#9ca3af' : 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      );
                    })()}
                    <label style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600' }}>🌙</label>
                    {(() => {
                      const val = window.BKK.nightStartHour ?? 17;
                      const update = (v) => {
                        const clamped = Math.min(23, Math.max(0, v));
                        window.BKK.nightStartHour = clamped;
                        const city = window.BKK.selectedCity;
                        if (city) city.nightStartHour = clamped;
                        if (isFirebaseAvailable && database && isUnlocked) {
                          saveCityGeneralField(selectedCityId, 'nightStartHour', clamped);
                        }
                        setFormData(prev => ({...prev}));
                      };
                      return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <button onClick={() => update(val - 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: val <= 0 ? '#e5e7eb' : '#7c3aed', color: val <= 0 ? '#9ca3af' : 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ minWidth: '28px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>{val}</span>
                        <button onClick={() => update(val + 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: val >= 23 ? '#e5e7eb' : '#7c3aed', color: val >= 23 ? '#9ca3af' : 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      );
                    })()}
                  </div>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {`☀️ ${String(window.BKK.dayStartHour ?? 6).padStart(2,'0')}:00–${String(window.BKK.nightStartHour ?? 17).padStart(2,'0')}:00`}
                    {` 🌙 ${String(window.BKK.nightStartHour ?? 17).padStart(2,'0')}:00–${String(window.BKK.dayStartHour ?? 6).padStart(2,'0')}:00`}
                  </span>
                </div>
                )}

                {/* Add Area + Show Map buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                  <button onClick={() => {
                    setShowSettingsMap(!showSettingsMap);
                    if (!showSettingsMap) {
                      setTimeout(() => window._initSettingsMap?.(), 300);
                    } else {
                      try { if (window._settingsMap) { window._settingsMap.off(); window._settingsMap.remove(); } } catch(e) {}
                      window._settingsMap = null;
                      setMapEditMode(false);
                      mapMarkersRef.current = [];
                    }
                  }} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '6px', border: '1.5px solid #3b82f6', cursor: 'pointer', background: showSettingsMap ? '#3b82f6' : '#eff6ff', color: showSettingsMap ? 'white' : '#2563eb', fontWeight: 'bold' }}
                  data-settings-map-btn="true"
                  >{showSettingsMap ? '✕' : '🗺️'} {t('wizard.allAreasMap')}</button>
                  <button onClick={() => {
                    const city = window.BKK.selectedCity;
                    if (!city) return;
                    const name = prompt(t('settings.newAreaName'));
                    if (!name || !name.trim()) return;
                    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                    if (city.areas.some(a => a.id === id)) { showToast(t('settings.areaExists'), 'warning'); return; }
                    const newArea = { id, label: name.trim(), labelEn: name.trim(), desc: '', descEn: '', lat: city.center?.lat || 0, lng: city.center?.lng || 0, radius: 2000, size: 'medium', safety: 'safe' };
                    city.areas.push(newArea);
                    window.BKK.areaCoordinates[id] = { lat: newArea.lat, lng: newArea.lng, radius: newArea.radius, distanceMultiplier: city.distanceMultiplier || 1.2, size: 'medium', safety: 'safe' };
                    window.BKK.areaOptions.push({ id, label: newArea.label, labelEn: newArea.labelEn, desc: '', descEn: '' });
                    setCityModified(true); setCityEditCounter(c => c + 1); setMapVersion(v => v + 1);
                    if (showSettingsMap) setTimeout(() => window._initSettingsMap?.(), 300);
                    showToast(`➕ ${name.trim()}`, 'success');
                    setFormData(prev => ({...prev}));
                  }} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '6px', border: '1.5px dashed #d1d5db', cursor: 'pointer', background: 'white', color: '#6b7280' }}
                  >➕ {t('settings.addArea')}</button>
                </div>

                {/* All areas map — init function */}
                {(() => {
                  window._initSettingsMap = () => {
                    const container = document.getElementById('settings-all-areas-map');
                    if (!container || !window.L) return;
                    try { if (window._settingsMap) { window._settingsMap.off(); window._settingsMap.remove(); } } catch(e) {}
                    container.innerHTML = '';
                    container._leaflet_id = null;
                    const city = window.BKK.selectedCity;
                    if (!city) return;
                    const coords = window.BKK.areaCoordinates || {};
                    const areas = city.areas || [];
                    const cityCenter = city.center || window.BKK.activeCityData?.center || { lat: 0, lng: 0 };
                    const map = L.map(container).setView([cityCenter.lat, cityCenter.lng], 12);
                    L.tileLayer(window.BKK.getTileUrl(), { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
                    const colorPalette = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1', '#8b5cf6', '#06b6d4', '#f97316', '#a855f7', '#14b8a6', '#e11d48', '#84cc16', '#0ea5e9', '#d946ef', '#f43f5e'];
                    const allCircles = [];
                    mapMarkersRef.current = [];
                    areas.forEach((area, i) => {
                      const c = coords[area.id];
                      if (!c) return;
                      const color = colorPalette[i % colorPalette.length];
                      const circle = L.circle([c.lat, c.lng], { radius: c.radius, color, fillColor: color, fillOpacity: 0.15, weight: 2 }).addTo(map);
                      allCircles.push(circle);
                      const marker = L.marker([c.lat, c.lng], { draggable: false, title: tLabel(area) }).addTo(map);
                      marker.bindTooltip(tLabel(area), { permanent: true, direction: 'top', className: 'area-label-tooltip', offset: [0, -10] });
                      marker._areaId = area.id;
                      marker._circle = circle;
                      marker._area = area;
                      marker._coords = c;
                      marker.on('dragend', () => {
                        const pos = marker.getLatLng();
                        const newLat = Math.round(pos.lat * 10000) / 10000;
                        const newLng = Math.round(pos.lng * 10000) / 10000;
                        area.lat = newLat; area.lng = newLng;
                        c.lat = newLat; c.lng = newLng;
                        circle.setLatLng(pos);
                      });
                      marker.on('click', () => {
                        // Select this area for radius editing
                        window._selectedMapMarker = marker;
                        setFormData(prev => ({...prev, _selectedMapArea: area.id}));
                      });
                      mapMarkersRef.current.push(marker);
                    });
                    if (allCircles.length > 0) {
                      const group = L.featureGroup(allCircles);
                      map.fitBounds(group.getBounds().pad(0.1));
                    }
                    window._settingsMap = map;
                    setMapEditMode(false);
                    setTimeout(() => map.invalidateSize(), 200);
                  };
                  return null;
                })()}

                {/* Fullscreen map modal */}
                {showMapFullscreen && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'white', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: mapEditMode ? '#ef4444' : '#3b82f6', color: 'white', flexShrink: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                        🗺️ {tLabel(window.BKK.selectedCity)} — {t('general.editMap')}
                        {mapEditMode && <span style={{ marginRight: '8px', fontSize: '11px', opacity: 0.9 }}> · {t('general.dragToMove') || 'גרור כדי להזיז'}</span>}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {(
                          <>
                            <button onClick={() => {
                              setMapEditMode(false);
                              setShowMapFullscreen(false);
                              mapMarkersRef.current.forEach(m => { try { m.dragging.disable(); } catch(e) {} });
                              setFormData(prev => { const n = {...prev}; delete n._selectedMapArea; return n; });
                              setCityModified(true); setCityEditCounter(c => c + 1); setMapVersion(v => v + 1);
                              if (showSettingsMap) setTimeout(() => window._initSettingsMap?.(), 100);
                              showToast(t('general.mapSaved'), 'success');
                            }} style={{ padding: '4px 12px', borderRadius: '6px', background: '#16a34a', border: 'none', color: 'white', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                              ✅ {t('general.confirm')}
                            </button>
                            <button onClick={() => {
                              setMapEditMode(false);
                              const coords = window.BKK.areaCoordinates || {};
                              mapMarkersRef.current.forEach(m => {
                                const orig = mapOriginalPositions.current[m._areaId];
                                if (orig) {
                                  m.setLatLng([orig.lat, orig.lng]);
                                  m._circle?.setLatLng([orig.lat, orig.lng]);
                                  m._circle?.setRadius(orig.radius);
                                  if (m._area) { m._area.lat = orig.lat; m._area.lng = orig.lng; }
                                  if (coords[m._areaId]) { coords[m._areaId].lat = orig.lat; coords[m._areaId].lng = orig.lng; coords[m._areaId].radius = orig.radius; }
                                }
                                m.dragging.disable();
                              });
                              setFormData(prev => { const n = {...prev}; delete n._selectedMapArea; return n; });
                            }} style={{ padding: '4px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                              ↩️ {t('general.cancel')}
                            </button>
                          </>
                        )}
                        <button onClick={() => {
                          setShowMapFullscreen(false);
                          setMapEditMode(false);
                          mapMarkersRef.current.forEach(m => { try { m.dragging.disable(); } catch(e) {} });
                          // Sync back to inline map if open
                          if (showSettingsMap) setTimeout(() => window._initSettingsMap?.(), 100);
                        }} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>
                          ✕
                        </button>
                      </div>
                    </div>
                    {/* Map fills remaining space */}
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div id="settings-fullscreen-map" style={{ position: 'absolute', inset: 0 }}></div>
                    </div>
                    {/* Fullscreen map is initialized via useEffect in app-logic.js (showMapFullscreen dep) */}
                  </div>
                )}

                {/* All areas map */}
                {showSettingsMap && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <div id="settings-all-areas-map" style={{ height: '450px', borderRadius: '8px', border: `2px solid ${mapEditMode ? '#ef4444' : '#3b82f6'}`, transition: 'border-color 0.3s' }}></div>
                      {/* Fullscreen button */}
                      <button
                        onClick={() => setShowMapFullscreen(true)}
                        title="מסך מלא"
                        style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 1000, background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 8px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', lineHeight: 1 }}
                      >⛶</button>
                    </div>
                    <div className="flex gap-2 mt-2 justify-center">
                      {!mapEditMode ? (
                        <button onClick={() => {
                          setMapEditMode(true);
                          mapOriginalPositions.current = {};
                          mapMarkersRef.current.forEach(m => {
                            const ll = m.getLatLng();
                            mapOriginalPositions.current[m._areaId] = { lat: ll.lat, lng: ll.lng, radius: m._circle?.getRadius() || 0 };
                            m.dragging.enable();
                          });
                          setFormData(prev => ({...prev, _selectedMapArea: null}));
                        }} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-white">
                          ✏️ {t('general.editMap')}
                        </button>
                      ) : (
                        <>
                          <button onClick={() => {
                            setMapEditMode(false);
                            mapMarkersRef.current.forEach(m => {
                              m.dragging.disable();
                            });
                            setFormData(prev => { const n = {...prev}; delete n._selectedMapArea; return n; });
                            setCityModified(true); setCityEditCounter(c => c + 1); setMapVersion(v => v + 1);
                            showToast(t('general.mapSaved'), 'success');
                          }} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-green-500 text-white">
                            ✅ {t('general.confirm')}
                          </button>
                          <button onClick={() => {
                            setMapEditMode(false);
                            const coords = window.BKK.areaCoordinates || {};
                            mapMarkersRef.current.forEach(m => {
                              const orig = mapOriginalPositions.current[m._areaId];
                              if (orig) {
                                m.setLatLng([orig.lat, orig.lng]);
                                m._circle.setLatLng([orig.lat, orig.lng]);
                                if (orig.radius) { m._circle.setRadius(orig.radius); m._area.radius = orig.radius; m._coords.radius = orig.radius; }
                                m._area.lat = Math.round(orig.lat * 10000) / 10000;
                                m._area.lng = Math.round(orig.lng * 10000) / 10000;
                                m._coords.lat = Math.round(orig.lat * 10000) / 10000;
                                m._coords.lng = Math.round(orig.lng * 10000) / 10000;
                              }
                              m.dragging.disable();
                            });
                            setFormData(prev => { const n = {...prev}; delete n._selectedMapArea; return n; });
                            showToast(t('general.cancel'), 'info');
                          }} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gray-400 text-white">
                            ✕ {t('general.cancel')}
                          </button>
                        </>
                      )}
                    </div>
                    {mapEditMode && (
                      <p className="text-center text-[10px] text-red-500 mt-1 font-bold">{t('general.dragToMove')}</p>
                    )}
                    {mapEditMode && formData._selectedMapArea && (() => {
                      const city = window.BKK.selectedCity;
                      const selArea = city?.areas?.find(a => a.id === formData._selectedMapArea);
                      const selCoords = window.BKK.areaCoordinates?.[formData._selectedMapArea];
                      if (!selArea || !selCoords) return null;
                      const setR = (v) => {
                        const clamped = Math.max(500, Math.min(10000, v));
                        selArea.radius = clamped;
                        selCoords.radius = clamped;
                        const m = window._selectedMapMarker;
                        if (m && m._circle) m._circle.setRadius(clamped);
                        setFormData(prev => ({...prev}));
                      };
                      return (
                        <div style={{ marginTop: '6px', padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af' }}>{tLabel(selArea)}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontSize: '10px', color: '#6b7280' }}>{t('settings.radius')}:</span>
                            <button onClick={() => setR(selArea.radius - 100)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#dbeafe', color: '#1e40af', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <input type="number" value={selArea.radius} onChange={(e) => setR(parseInt(e.target.value) || 0)}
                              style={{ width: '65px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', border: '1.5px solid #93c5fd', borderRadius: '6px', padding: '4px' }} />
                            <button onClick={() => setR(selArea.radius + 100)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#dbeafe', color: '#1e40af', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            <span style={{ fontSize: '10px', color: '#9ca3af' }}>m</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Areas list for selected city */}
                <div style={{ overflowY: 'auto', maxHeight: editingArea ? 'none' : '350px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '4px' }}>
                  {/* Build combined list: whole city + areas */}
                  {(() => {
                    const city = window.BKK.selectedCity;
                    if (!city) return null;
                    const wholeCityItem = { id: '__whole_city__', label: t('general.allCity'), labelEn: 'Whole City', desc: '', descEn: '', lat: city.center?.lat || 0, lng: city.center?.lng || 0, radius: city.allCityRadius || 15000, safety: 'safe', isWholeCity: true };
                    const allItems = [wholeCityItem, ...(city.areas || [])];
                    
                    return allItems.map((area, i) => {
                      const isEditing = editingArea?.id === area.id;
                      const safetyColors = { safe: '#22c55e', caution: '#f59e0b', danger: '#ef4444' };
                      const safetyLabels = { safe: t('general.safeArea'), caution: t('general.caution'), danger: t('general.dangerArea') };
                      const areaCoord = window.BKK.areaCoordinates?.[area.id] || {};
                      
                      return (
                        <div key={area.id} style={{ padding: '5px 6px', borderBottom: i < allItems.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: '11px', background: area.isWholeCity ? '#fefce8' : 'transparent' }}>
                          {/* Area header row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 'bold', flex: 1, color: '#1f2937' }}>{area.isWholeCity ? '🌐 ' : ''}{tLabel(area)}</span>
                            <span style={{ fontSize: '9px', color: '#6b7280' }}>{area.radius}m</span>
                            {!area.isWholeCity && (
                              <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '4px', background: safetyColors[area.safety || 'safe'] + '20', color: safetyColors[area.safety || 'safe'], fontWeight: 'bold' }}>
                                {safetyLabels[area.safety || 'safe']}
                              </span>
                            )}
                            {!isEditing && (
                              <button onClick={() => {
                                showConfirm(`${t('general.remove')} ${tLabel(area)}?`, () => {
                                const city = window.BKK.selectedCity;
                                if (!city) return;
                                city.areas = city.areas.filter(a => a.id !== area.id);
                                delete window.BKK.areaCoordinates[area.id];
                                window.BKK.areaOptions = window.BKK.areaOptions.filter(a => a.id !== area.id);
                                setCityModified(true); setCityEditCounter(c => c + 1); setMapVersion(v => v + 1);
                                if (showSettingsMap) setTimeout(() => window._initSettingsMap?.(), 300);
                                showToast(`🗑️ ${tLabel(area)}`, 'info');
                                setFormData(prev => ({...prev}));
                                });
                              }} style={{ fontSize: '8px', color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                              title={t('general.remove')}>🗑️</button>
                            )}
                            {!isEditing && (
                              <button
                                onClick={() => {
                                  try { if (window._editMap) { window._editMap.off(); window._editMap.remove(); } } catch(e) {}
                                  window._editMap = null; window._editCircle = null; window._editMarker = null;
                                  // Store original values for cancel
                                  window._editOriginal = { lat: area.lat, lng: area.lng, radius: area.radius, safety: area.safety, distanceMultiplier: area.distanceMultiplier, label: area.label, labelEn: area.labelEn, desc: area.desc, descEn: area.descEn };
                                  setEditingArea(area);
                                  setTimeout(() => {
                                    const container = document.getElementById(`area-edit-map-${area.id}`);
                                    if (!container || !window.L) return;
                                    container.innerHTML = '';
                                    container._leaflet_id = null;
                                    const zoom = area.isWholeCity ? 11 : 13;
                                    const map = L.map(container).setView([area.lat, area.lng], zoom);
                                    L.tileLayer(window.BKK.getTileUrl(), { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
                                    const color = area.isWholeCity ? '#eab308' : '#10b981';
                                    const circle = L.circle([area.lat, area.lng], { radius: area.radius, color: color, fillOpacity: 0.15, weight: 2 }).addTo(map);
                                    const marker = L.marker([area.lat, area.lng], { draggable: true }).addTo(map);
                                    marker.on('dragend', () => {
                                      const pos = marker.getLatLng();
                                      area.lat = Math.round(pos.lat * 10000) / 10000;
                                      area.lng = Math.round(pos.lng * 10000) / 10000;
                                      if (area.isWholeCity) { city.center = { lat: area.lat, lng: area.lng }; }
                                      else { const ac = window.BKK.areaCoordinates?.[area.id]; if (ac) { ac.lat = area.lat; ac.lng = area.lng; } }
                                      circle.setLatLng(pos);
                                      setFormData(prev => ({...prev}));
                                    });
                                    window._editMap = map; window._editCircle = circle; window._editMarker = marker;
                                    map.fitBounds(circle.getBounds().pad(0.3));
                                    setTimeout(() => { map.invalidateSize(); map.fitBounds(circle.getBounds().pad(0.3)); }, 100);
                                    setTimeout(() => { map.invalidateSize(); map.fitBounds(circle.getBounds().pad(0.3)); }, 400);
                                    setTimeout(() => { map.invalidateSize(); }, 800);
                                    setTimeout(() => { const el = document.getElementById(`area-edit-map-${area.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 500);
                                  }, 300);
                                }}
                                style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', border: '1px solid #3b82f6', background: '#eff6ff', color: '#2563eb', cursor: 'pointer' }}
                              >✏️ {t('general.edit')}</button>
                            )}
                          </div>
                          {/* Read-only desc */}
                          {!isEditing && <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1px' }}>{tDesc(area)}</div>}
                          
                          {/* Edit mode */}
                          {isEditing && (
                            <div style={{ marginTop: '8px', border: '2px solid #3b82f6', borderRadius: '8px', padding: '8px', background: '#f0f9ff' }}>
                              {/* Name & description fields */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '6px', fontSize: '10px' }}>
                                <div>
                                  <label style={{ color: '#6b7280', fontSize: '9px' }}>שם (עברית)</label>
                                  <input value={area.label || ''} onChange={(e) => { area.label = e.target.value; const ao = window.BKK.areaOptions?.find(a => a.id === area.id); if (ao) ao.label = area.label; setFormData(prev => ({...prev})); }}
                                    style={{ width: '100%', padding: '3px 5px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px', direction: 'rtl' }} />{/* intentional: Hebrew content field */}
                                </div>
                                <div>
                                  <label style={{ color: '#6b7280', fontSize: '9px' }}>Name (English)</label>
                                  <input value={area.labelEn || ''} onChange={(e) => { area.labelEn = e.target.value; const ao = window.BKK.areaOptions?.find(a => a.id === area.id); if (ao) ao.labelEn = area.labelEn; setFormData(prev => ({...prev})); }}
                                    style={{ width: '100%', padding: '3px 5px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px', direction: 'ltr' }} />
                                </div>
                                <div>
                                  <label style={{ color: '#6b7280', fontSize: '9px' }}>תיאור (עברית)</label>
                                  <input value={area.desc || ''} onChange={(e) => { area.desc = e.target.value; setFormData(prev => ({...prev})); }}
                                    style={{ width: '100%', padding: '3px 5px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px', direction: 'rtl' }} placeholder="מקדשים, אוכל, שווקים..."/>{/* intentional: Hebrew content field */}
                                </div>
                                <div>
                                  <label style={{ color: '#6b7280', fontSize: '9px' }}>Description (English)</label>
                                  <input value={area.descEn || ''} onChange={(e) => { area.descEn = e.target.value; setFormData(prev => ({...prev})); }}
                                    style={{ width: '100%', padding: '3px 5px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px', direction: 'ltr' }} placeholder="Temples, food, markets..." />
                                </div>
                              </div>
                              <div id={`area-edit-map-${area.id}`} style={{ height: '400px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '8px' }}></div>
                              <div className="flex items-center gap-3 flex-wrap mb-2">
                                <label className="text-[9px] text-gray-600 flex items-center gap-1">
                                  {t('settings.radius')}:
                                  {(() => {
                                    const setR = (v) => {
                                      const min = area.isWholeCity ? 5000 : 500;
                                      const max = area.isWholeCity ? 30000 : 10000;
                                      const clamped = Math.max(min, Math.min(max, v));
                                      area.radius = clamped;
                                      if (area.isWholeCity) { city.allCityRadius = clamped; }
                                      else { const ac = window.BKK.areaCoordinates?.[area.id]; if (ac) ac.radius = clamped; }
                                      if (window._editCircle) window._editCircle.setRadius(clamped);
                                      setFormData(prev => ({...prev}));
                                    };
                                    return (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button onClick={() => setR(area.radius - 100)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: '#e5e7eb', color: '#374151', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
                                        <input type="number" value={area.radius} onChange={(e) => setR(parseInt(e.target.value) || 0)}
                                          style={{ width: '60px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px 4px' }} />
                                        <button onClick={() => setR(area.radius + 100)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: '#e5e7eb', color: '#374151', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
                                        <span style={{ fontSize: '9px', color: '#9ca3af' }}>m</span>
                                      </div>
                                    );
                                  })()}
                                </label>
                                {!area.isWholeCity && (
                                  <label className="text-[9px] text-gray-600 flex items-center gap-1">
                                    {t('general.multiplier')}:
                                    {(() => {
                                      const val = area.distanceMultiplier || city.distanceMultiplier || 1.2;
                                      const set = (v) => { const clamped = Math.round(Math.max(0.5, Math.min(5, v)) * 10) / 10; area.distanceMultiplier = clamped; const ac = window.BKK.areaCoordinates?.[area.id]; if (ac) ac.distanceMultiplier = clamped; setFormData(prev => ({...prev})); };
                                      return (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button onClick={() => set(val - 0.1)} style={{ width: '20px', height: '20px', borderRadius: '4px', border: 'none', background: '#e5e7eb', color: '#374151', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
                                        <span style={{ minWidth: '26px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>{val.toFixed(1)}</span>
                                        <button onClick={() => set(val + 0.1)} style={{ width: '20px', height: '20px', borderRadius: '4px', border: 'none', background: '#e5e7eb', color: '#374151', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
                                      </div>
                                      );
                                    })()}
                                  </label>
                                )}
                                {!area.isWholeCity && (
                                  <select value={area.safety || 'safe'} style={{ fontSize: '9px', padding: '1px 2px', border: '1px solid #d1d5db', borderRadius: '4px', color: safetyColors[area.safety || 'safe'] }}
                                    onChange={(e) => { area.safety = e.target.value; const ac = window.BKK.areaCoordinates?.[area.id]; if (ac) ac.safety = area.safety; setFormData(prev => ({...prev})); }}
                                  >
                                    {['safe','caution','danger'].map(s => <option key={s} value={s}>{safetyLabels[s]}</option>)}
                                  </select>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    try { if (window._editMap) { window._editMap.off(); window._editMap.remove(); } } catch(e) {}
                                    window._editMap = null;
                                    setEditingArea(null);
                                    setCityModified(true); setCityEditCounter(c => c + 1);
                                    setMapVersion(v => v + 1);
                                    // Refresh settings all-areas map if open
                                    if (showSettingsMap) {
                                      setTimeout(() => window._initSettingsMap?.(), 300);
                                    }
                                    showToast(`✓ ${tLabel(area)}`, 'success');
                                  }}
                                  className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600"
                                >✓ {t('general.save')}</button>
                                <button
                                  onClick={() => {
                                    // Restore original values
                                    const orig = window._editOriginal;
                                    if (orig) {
                                      area.lat = orig.lat; area.lng = orig.lng; area.radius = orig.radius; area.safety = orig.safety; area.distanceMultiplier = orig.distanceMultiplier;
                                      if (orig.label !== undefined) { area.label = orig.label; area.labelEn = orig.labelEn; area.desc = orig.desc; area.descEn = orig.descEn; const ao = window.BKK.areaOptions?.find(a => a.id === area.id); if (ao) { ao.label = orig.label; ao.labelEn = orig.labelEn; } }
                                      if (area.isWholeCity) { city.center = { lat: orig.lat, lng: orig.lng }; city.allCityRadius = orig.radius; }
                                      else { const ac = window.BKK.areaCoordinates?.[area.id]; if (ac) { ac.lat = orig.lat; ac.lng = orig.lng; ac.radius = orig.radius; ac.safety = orig.safety; ac.distanceMultiplier = orig.distanceMultiplier; } }
                                    }
                                    try { if (window._editMap) { window._editMap.off(); window._editMap.remove(); } } catch(e) {}
                                    window._editMap = null;
                                    setEditingArea(null);
                                    setFormData(prev => ({...prev}));
                                  }}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300"
                                >✕ {t('general.cancel')}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>



            </div>)}

            {/* ===== GENERAL SETTINGS TAB ===== */}
            {settingsTab === 'general' && (<div>

            {/* Language */}
            <div className="mb-3">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                <h3 className="text-sm font-bold text-gray-800 mb-2">🌐 {t('settings.language')}</h3>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries((window.BKK.i18n && window.BKK.i18n.languages) || {}).map(([langId, langInfo]) => (
                    <button
                      key={langId}
                      onClick={() => switchLanguage(langId)}
                      style={{
                        padding: '5px 14px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                        border: currentLang === langId ? '2px solid #3b82f6' : '1.5px solid #e5e7eb',
                        background: currentLang === langId ? '#eff6ff' : 'white',
                        color: currentLang === langId ? '#2563eb' : '#6b7280',
                        transition: 'all 0.2s'
                      }}
                    >{langInfo.flag} {langInfo.name}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Voice & Speech Rate */}
            <div className="mb-3">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-2">
                <h3 className="text-sm font-bold text-gray-800 mb-2">{`🔊 ${t('settings.voiceSelect')}`}</h3>
                {ttsVoices.length > 0 && (
                <select
                  value={selectedVoice}
                  onChange={(e) => {
                    setSelectedVoice(e.target.value);
                    localStorage.setItem('foufou_tts_voice', e.target.value);
                    if (window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(window.BKK.i18n.currentLang === 'en' ? 'Hello, this is FouFou' : 'שלום, זה פופו');
                      const voice = ttsVoices.find(v => v.name === e.target.value);
                      if (voice) u.voice = voice;
                      u.lang = window.BKK.i18n.currentLang === 'en' ? 'en-US' : 'he-IL';
                      u.rate = systemParams.speechRate || 1.0;
                      window.speechSynthesis.speak(u);
                    }
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12px', direction: 'ltr', marginBottom: '8px' }}
                >
                  <option value="">{t('settings.defaultVoice')}</option>
                  {ttsVoices.filter(v => v.lang === 'he-IL' || v.lang === 'en-US' || v.lang === 'en-GB').map(v => (
                    <option key={v.name} value={v.name}>{v.name} {v.localService ? '' : '☁️'}</option>
                  ))}
                </select>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="text-xs font-bold text-gray-600">{`⏩ ${t('settings.speechRate')}:`}</span>
                  {[0.7, 0.85, 1.0, 1.2, 1.5].map(rate => (
                    <button key={rate}
                      onClick={() => {
                        const updated = { ...systemParams, speechRate: rate };
                        window.BKK.systemParams = updated;
                        setSystemParams(updated);
                        saveSpeechRate(rate);
                      }}
                      style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                        border: (systemParams.speechRate || 1.0) === rate ? '2px solid #7c3aed' : '1px solid #d1d5db',
                        background: (systemParams.speechRate || 1.0) === rate ? '#ede9fe' : 'white',
                        color: (systemParams.speechRate || 1.0) === rate ? '#7c3aed' : '#6b7280'
                      }}
                    >{rate}x</button>
                  ))}
                </div>
              </div>
            </div>

            
            {/* Refresh Data Button */}
            <div className="mb-3">
              <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border-2 border-cyan-400 rounded-xl p-3">
                <h3 className="text-base font-bold text-gray-800 mb-1">{`🔄 ${t("settings.refreshData")}`}</h3>
                <p className="text-xs text-gray-600 mb-2">
                  {t("settings.refreshDescription")}
                </p>
                <button
                  onClick={refreshAllData}
                  disabled={isRefreshing}
                  className={`w-full py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition ${
                    isRefreshing 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-cyan-500 text-white hover:bg-cyan-600 active:bg-cyan-700'
                  }`}
                >
                  <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
                  <span>{isRefreshing ? t('general.refreshing') : t('settings.refreshData')}</span>
                </button>
                <div className="mt-2 text-[10px] text-gray-500 flex flex-wrap gap-1">
                  <span className="bg-cyan-100 px-1.5 py-0.5 rounded">{`📍 ${t("nav.myPlaces")}`}</span>
                  <span className="bg-cyan-100 px-1.5 py-0.5 rounded">{`🏷️ ${t("general.interestsHeader")}`}</span>
                  <span className="bg-cyan-100 px-1.5 py-0.5 rounded">{`💾 ${t("nav.saved")}`}</span>
                  <span className="bg-cyan-100 px-1.5 py-0.5 rounded">{`⚙️ ${t("general.searchSettings")}`}</span>
                  <span className="bg-cyan-100 px-1.5 py-0.5 rounded">{`👑 ${t("general.permissions")}`}</span>
                </div>
              </div>
            </div>
            
            {/* Refresh Google Ratings */}
            <div className="mb-3">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400 rounded-xl p-3">
                <h3 className="text-base font-bold text-gray-800 mb-1">{`⭐ ${t("settings.refreshRatings") || 'רענן דירוגי גוגל'}`}</h3>
                <p className="text-xs text-gray-600 mb-2">
                  {t("settings.refreshRatingsDesc") || 'עדכון דירוגי גוגל לכל המקומות המועדפים בעיר הנוכחית'}
                </p>
                <button
                  onClick={refreshAllGoogleRatings}
                  disabled={!!ratingsRefreshProgress}
                  className={`w-full py-2 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition ${
                    ratingsRefreshProgress
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700'
                  }`}
                >
                  {ratingsRefreshProgress ? (
                    <>
                      <span className="animate-spin">⭐</span>
                      <span>{ratingsRefreshProgress.current}/{ratingsRefreshProgress.total} ({ratingsRefreshProgress.updated} {t('settings.updated')})</span>
                    </>
                  ) : (
                    <>
                      <span>⭐</span>
                      <span>{t("settings.refreshRatings") || 'רענן דירוגי גוגל'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            )}
            {/* Bulk Approve Drafts */}
            {true && (
            <div className="mb-3">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-3">
                <h3 className="text-base font-bold text-gray-800 mb-1">{`✅ ${t("settings.bulkApprove") || 'אשר טיוטות'}`}</h3>
                <p className="text-xs text-gray-600 mb-2">
                  {t("settings.bulkApproveDesc") || 'הפוך מקומות טיוטה למאושרים בעיר הנוכחית'}
                </p>
                {(() => {
                  const cityLocs = customLocations.filter(l => (l.cityId || 'bangkok') === selectedCityId && l.status !== 'blacklist' && !l.locked);
                  const myDrafts = cityLocs.filter(l => l.addedBy === authUser?.uid);
                  const otherDrafts = cityLocs.length - myDrafts.length;
                  return (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        if (myDrafts.length === 0) { showToast(t('settings.noDrafts'), 'info'); return; }
                        showConfirm(`${t('settings.approveMyConfirm') || 'לאשר'} ${myDrafts.length} ${t('settings.myDrafts') || 'טיוטות שלי'}?`, () => {
                          let count = 0;
                          myDrafts.forEach(loc => {
                            if (loc.firebaseId && isFirebaseAvailable && database) {
                              saveLocationLocked(selectedCityId, loc.firebaseId, true);
                              count++;
                            }
                          });
                          setCustomLocations(prev => prev.map(l => myDrafts.find(d => d.name === l.name) ? {...l, locked: true} : l));
                          showToast(`✅ ${count} ${t('settings.approved')}`, 'success');
                        });
                      }}
                      disabled={myDrafts.length === 0}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition ${myDrafts.length > 0 ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      {`👤 ${t('settings.myDraftsBtn') || 'שלי'} (${myDrafts.length})`}
                    </button>
                    {true && (
                    <button
                      onClick={() => {
                        if (cityLocs.length === 0) { showToast(t('settings.noDrafts'), 'info'); return; }
                        showConfirm(`${t('settings.approveAllConfirm') || 'לאשר'} ${cityLocs.length} ${t('settings.allDrafts') || 'טיוטות'}? (${myDrafts.length} ${t('settings.mine') || 'שלי'} + ${otherDrafts} ${t('settings.others') || 'אחרים'})`, () => {
                          let count = 0;
                          cityLocs.forEach(loc => {
                            if (loc.firebaseId && isFirebaseAvailable && database) {
                              saveLocationLocked(selectedCityId, loc.firebaseId, true);
                              count++;
                            }
                          });
                          setCustomLocations(prev => prev.map(l => cityLocs.find(d => d.name === l.name) ? {...l, locked: true} : l));
                          showToast(`✅ ${count} ${t('settings.approved')}`, 'success');
                        });
                      }}
                      disabled={cityLocs.length === 0}
                      className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition ${cityLocs.length > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      {`👑 ${t('settings.allDraftsBtn') || 'הכל'} (${cityLocs.length})`}
                    </button>
                    )}
                  </div>
                  );
                })()}
              </div>
            </div>
            )}


            
            {/* Debug Mode Toggle — toggle only, filter+log in Debug tab */}
            <div className="mb-4">
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-400 rounded-xl p-3">
                <h3 className="text-base font-bold text-gray-800 mb-1">{t("general.debugMode")}</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Show activity log for debugging (console F12)
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-gray-400"
                  />
                  <span className="text-sm font-bold">
                    {debugMode ? t('toast.debugOn') : t('toast.debugOff')}
                  </span>
                </label>
                {debugMode && (
                  <div className="mt-2 text-xs text-gray-500">
                    → פרטים ב-Tab <b>🐛 דיבאג</b>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Management - Password Based (Admin Only) */}
            {isCurrentUserAdmin && (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-xl p-3">
                <h3 className="text-base font-bold text-gray-800 mb-1">{t("general.adminManagement")}</h3>
                
                {/* Current Device Info */}
                <div className="text-xs bg-white rounded-lg p-2 border border-red-200 mb-3">
                  <strong>{t("general.currentDevice")}:</strong> {authUser?.uid?.slice(-12) || 'N/A'}
                  <br />
                  <strong>{t("general.status")}:</strong> 
                  <span className="text-green-600 font-bold"> 🔓 {t("general.open")}</span>
                </div>
                
                {/* Access Stats Button */}
                <button
                  onClick={() => fetchAccessStats(data => setAccessStats(data))}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  📊 {t("settings.accessStats") || "Access Stats"}
                </button>
                
                {accessStats && (
                  <div className="bg-blue-50 rounded-lg p-3 mt-2 text-sm">
                    <div className="font-bold mb-2">📊 {t("settings.totalVisits") || "Total visits"}: {accessStats.total || 0}</div>
                    {accessStats.weekly && Object.entries(accessStats.weekly).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 8).map(([week, countries]) => (
                      <div key={week} className="mb-1">
                        <span className="font-medium text-xs text-blue-700">{week}:</span>
                        <span className="text-xs mr-2">
                          {Object.entries(countries).filter(([c]) => c !== 'unknown' || countries[c] > 0).map(([cc, count]) => {
                            const flag = cc === 'IL' ? '🇮🇱' : cc === 'TH' ? '🇹🇭' : cc === 'US' ? '🇺🇸' : cc === 'unknown' ? '❓' : `${cc}`;
                            return `${flag}${count}`;
                          }).join(' ')}
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => setAccessStats(null)}
                      className="text-xs text-blue-500 underline mt-1"
                    >{t("general.close") || "Close"}</button>
                  </div>
                )}
                
                {/* Feedback Viewer Button */}
                <button
                  onClick={() => {
                    markFeedbackAsSeen();
                    setShowFeedbackList(true);
                  }}
                  className="w-full bg-purple-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-purple-600 flex items-center justify-center gap-2 mt-2"
                >
                  💬 Feedback ({feedbackList.length})
                  {hasNewFeedback && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">{t("general.new")}</span>}
                </button>
              </div>
            </div>
            )}
            
            <div className="mb-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-xl p-3">
                <h3 className="text-base font-bold text-gray-800 mb-1">{t("general.importExport")}</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Save and transfer data between devices
                </p>
                
                <div className="space-y-2">
                  {/* Export Button */}
                  <button
                    onClick={() => {
                      try {
                        // Count active interests
                        const activeCount = Object.values(interestStatus).filter(Boolean).length;
                        
                        const dateStr = new Date().toISOString().split('T')[0];
                        const cityNameEn = (window.BKK.selectedCity?.nameEn || window.BKK.selectedCity?.name || selectedCityId || 'city').toLowerCase().replace(/\s+/g, '-');

                        // Global data: interests + config (shared across all cities)
                        const globalData = {
                          _type: 'foufou-global',
                          customInterests: customInterests,
                          interestConfig: interestConfig,
                          interestStatus: interestStatus,
                          cityHiddenInterests: Object.fromEntries(
                            Object.entries(cityHiddenInterests).map(([cid, set]) => [cid, [...set]])
                          ),
                          systemParams: systemParams,
                          exportDate: new Date().toISOString(),
                          version: window.BKK.VERSION || '3.5'
                        };

                        // City data: locations + routes for current city only
                        const cityData = {
                          _type: 'foufou-city',
                          cityId: selectedCityId,
                          customLocations: customLocations,
                          savedRoutes: savedRoutes,
                          exportDate: new Date().toISOString(),
                          version: window.BKK.VERSION || '3.5'
                        };

                        // Download global file
                        const globalStr = JSON.stringify(globalData, null, 2);
                        const globalBlob = new Blob([globalStr], { type: 'application/json' });
                        const globalUrl = URL.createObjectURL(globalBlob);
                        const globalLink = document.createElement('a');
                        globalLink.href = globalUrl;
                        globalLink.download = `foufou-global-${dateStr}.json`;
                        globalLink.click();
                        URL.revokeObjectURL(globalUrl);

                        // Download city file
                        setTimeout(() => {
                          const cityStr = JSON.stringify(cityData, null, 2);
                          const cityBlob = new Blob([cityStr], { type: 'application/json' });
                          const cityUrl = URL.createObjectURL(cityBlob);
                          const cityLink = document.createElement('a');
                          cityLink.href = cityUrl;
                          cityLink.download = `foufou-${cityNameEn}-${dateStr}.json`;
                          cityLink.click();
                          URL.revokeObjectURL(cityUrl);
                        }, 300);

                        showToast(`✅ ייצוא: ${customInterests.length} תחומים (global) + ${customLocations.length} מקומות + ${savedRoutes.length} מסלולים (${cityNameEn})`, 'success');
                      } catch (error) {
                        console.error('[EXPORT] Error:', error);
                        showToast(t('toast.exportError'), 'error');
                      }
                    }}
                    className="w-full bg-blue-500 text-white py-2 px-3 rounded-lg font-bold hover:bg-blue-600 transition text-sm flex items-center justify-center gap-2"
                  >
                    <span>{t("general.exportAll")}</span>
                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">
                      {customInterests.length + customLocations.length + savedRoutes.length}
                    </span>
                  </button>
                  
                  {/* Import Button */}
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => { parseImportFile(e.target.files?.[0]); e.target.value = ''; }}
                      id="importData"
                      className="hidden"
                    />
                    <label
                      htmlFor="importData"
                      className="block w-full bg-green-500 text-white py-2 px-3 rounded-lg font-bold hover:bg-green-600 transition text-sm text-center cursor-pointer"
                    >
                      📥 Import from file
                    </label>
                  </div>
                  
                  {/* Info Box */}
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 text-[10px]">
                    <p className="text-blue-900 font-bold mb-1">{`💡 ${t('general.uses')}:`}</p>
                    <ul className="text-blue-800 space-y-0.5 mr-3">
                      <li>{t("general.transferDevices")}</li>
                      <li>{t("general.dataBackup")}</li>
                      <li>{t("general.shareWithFriends")}</li>
                    </ul>
                  </div>

                  {/* Export Schema for AI agents */}
                  <button
                    onClick={() => {
                      try {
                        const allInterests = allInterestOptions || [];
                        const schema = {
                          _description: "FouFou Places Import Schema — use this to generate places for import",
                          _instructions: "Generate a JSON file with a 'customLocations' array (or just a plain JSON array). Each item is a place. The importer auto-maps Hebrew field names (שם המקום→name, תיאור→description, כתובת→address, קטגוריה→notes). Coordinates (lat/lng) are recommended but optional. Interests array is optional — places can be assigned to interests manually after import.",
                          cityId: selectedCityId,
                          cityName: tLabel((window.BKK.cities || {})[selectedCityId]) || selectedCityId,
                          placeFormat: {
                            name: { type: "string", required: true, description: "Place name (Hebrew or English)" },
                            description: { type: "string", required: false, description: "Short description of the place" },
                            notes: { type: "string", required: false, description: "Personal notes or tips" },
                            lat: { type: "number", required: true, description: "Latitude coordinate" },
                            lng: { type: "number", required: true, description: "Longitude coordinate" },
                            address: { type: "string", required: false, description: "Street address" },
                            mapsUrl: { type: "string", required: false, description: "Google Maps URL" },
                            interests: { type: "array of strings", required: false, description: "Interest IDs from the availableInterests list. Can be empty — places without interests can be assigned later." },
                            areas: { type: "array of strings", required: false, description: "Area IDs from the availableAreas list. If empty, will be auto-detected from coordinates." },
                          },
                          availableInterests: allInterests.map(i => ({
                            id: i.id,
                            label: i.label || i.name,
                            labelEn: i.labelEn || '',
                            icon: i.icon?.startsWith?.('data:') ? '(custom image)' : (i.icon || ''),
                          })),
                          availableAreas: (window.BKK.areaOptions || []).map(a => ({
                            id: a.id,
                            label: a.label,
                            labelEn: a.labelEn || '',
                            ...(window.BKK.areaCoordinates?.[a.id] ? {
                              center: { lat: window.BKK.areaCoordinates[a.id].lat, lng: window.BKK.areaCoordinates[a.id].lng },
                              radiusMeters: window.BKK.areaCoordinates[a.id].radius || 1500
                            } : {})
                          })),
                          examplePlace: {
                            name: "Example Cafe",
                            description: "Cozy corner cafe with great espresso",
                            notes: "Best visited in the morning",
                            lat: 13.7563,
                            lng: 100.5018,
                            address: "123 Sukhumvit Soi 11, Bangkok",
                            interests: allInterests.length > 0 ? [allInterests[0].id] : [],
                            areas: (window.BKK.areaOptions || []).length > 0 ? [(window.BKK.areaOptions[0]).id] : []
                          },
                          exampleImportFile: {
                            customLocations: [
                              {
                                name: "Example Cafe",
                                description: "Cozy corner cafe",
                                lat: 13.7563,
                                lng: 100.5018,
                                interests: allInterests.length > 0 ? [allInterests[0].id] : [],
                                areas: (window.BKK.areaOptions || []).length > 0 ? [(window.BKK.areaOptions[0]).id] : []
                              }
                            ]
                          },
                          exampleMinimalFile: [
                            { "שם המקום": "בית קפה לדוגמה", "תיאור": "בית קפה נעים", "קטגוריה": "קפה" },
                            { "שם המקום": "מסעדה לדוגמה", "תיאור": "אוכל מצוין", "קטגוריה": "אוכל" }
                          ],
                          acceptedFieldAliases: {
                            "name": ["שם המקום", "שם", "place", "title"],
                            "description": ["תיאור", "desc"],
                            "notes": ["הערות", "tip", "tips"],
                            "address": ["כתובת", "location"],
                            "interests": ["תחומים", "tags"],
                            "areas": ["אזור", "אזורים", "area"],
                            "_category→notes": ["קטגוריה", "category", "type", "סוג"]
                          }
                        };
                        const dataStr = JSON.stringify(schema, null, 2);
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `foufou-schema-${selectedCityId}-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                        showToast(`📋 Schema exported (${allInterests.length} interests, ${(window.BKK.areaOptions || []).length} areas)`, 'success');
                      } catch (e) {
                        console.error('[SCHEMA]', e);
                        showToast('Error exporting schema', 'error');
                      }
                    }}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold',
                      cursor: 'pointer', border: '1.5px solid #d1d5db', background: '#f9fafb', color: '#374151',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >📋 {t('settings.exportSchema') || 'Export Schema (for AI)'}</button>
                  
                  {/* Firebase Cleanup (Admin only) */}
                  {true && (
                    <div className="mt-3 border-t border-red-200 pt-3">
                      <p className="text-xs font-bold text-red-700 mb-2">🔧 Firebase Admin Tools</p>
                      <div className="space-y-2">
                        <button
                          onClick={async () => {
                            if (!window.confirm('Clean up stale _verify nodes and check database sizes?')) return;
                            try {
                              showToast('🔧 Running cleanup...', 'info');
                              const result = await window.BKK.cleanupFirebase(database);
                              if (result) {
                                const msg = `Cleaned ${result.verifyRemoved} _verify nodes. ` + 
                                  (result.nodes || []).map(n => `${n.node}: ${n.count} entries (~${n.sizeKB}KB)`).join(', ');
                                showToast(`✅ ${msg}`, 'success', 'sticky');
                              }
                            } catch (e) {
                              showToast(`❌ Cleanup failed: ${e.message}`, 'error');
                            }
                          }}
                          className="w-full bg-red-500 text-white py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-red-600 transition"
                        >
                          🧹 Clean _verify nodes + check sizes
                        </button>
                        <button
                          onClick={() => {
                            if (!window.confirm('Mark migration as completed? Only use if data is already in per-city structure.')) return;
                            localStorage.setItem('locations_migrated_v2', 'true');
                            showToast('✅ Migration marked as completed', 'success');
                          }}
                          className="w-full bg-orange-500 text-white py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-orange-600 transition"
                        >
                          ✅ Mark migration done (skip re-run)
                        </button>

                        <button
                          onClick={async () => {
                            if (!window.confirm('Delete ALL old accessLog entries? (replaced by accessStats)')) return;
                            try {
                              await clearAccessLog();
                              showToast('✅ Old accessLog deleted', 'success');
                            } catch (e) {
                              showToast(`❌ Failed: ${e.message}`, 'error');
                            }
                          }}
                          className="w-full bg-yellow-500 text-white py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-yellow-600 transition"
                        >
                          🗑️ Delete old accessLog data
                        </button>

                        {/* Geo Cleanup — remove locations outside this city's bounds */}
                        <div className="mt-3 border-t border-red-300 pt-3">
                          <p className="text-xs font-bold text-red-800 mb-2">🗺️ Geo Cleanup — wrong-city locations</p>
                          <button
                            onClick={async () => {
                              const city = window.BKK.selectedCity;
                              const cityId = selectedCityId;
                              const center = city.center;
                              const maxRadius = (city.allCityRadius || 20000) * 1.5;
                              if (!center?.lat || !center?.lng) { showToast('No city center coords', 'error'); return; }
                              const outliers = customLocations.filter(loc => {
                                if (!loc.lat || !loc.lng) return false;
                                const R = 6371e3;
                                const r1 = center.lat * Math.PI / 180;
                                const r2 = loc.lat * Math.PI / 180;
                                const dLat = (loc.lat - center.lat) * Math.PI / 180;
                                const dLng = (loc.lng - center.lng) * Math.PI / 180;
                                const a = Math.sin(dLat/2)**2 + Math.cos(r1)*Math.cos(r2)*Math.sin(dLng/2)**2;
                                const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                return dist > maxRadius;
                              });
                              const noName = customLocations.filter(loc => loc.name?.startsWith('(no name)'));
                              const seen = new Set();
                              const toDelete = [...outliers, ...noName].filter(l => { if (seen.has(l.firebaseId)) return false; seen.add(l.firebaseId); return true; });
                              if (toDelete.length === 0) { showToast('No out-of-city locations found!', 'success'); return; }
                              const preview = toDelete.slice(0, 5).map(l => `• ${l.name} (${l.lat?.toFixed(3)}, ${l.lng?.toFixed(3)})`).join('\n');
                              const msg = `Found ${toDelete.length} locations outside ${city.nameEn}:\n${preview}${toDelete.length > 5 ? `\n... +${toDelete.length-5} more` : ''}\n\nMax radius: ${(maxRadius/1000).toFixed(1)}km\n\nDelete all ${toDelete.length}?`;
                              if (!window.confirm(msg)) return;
                              try {
                                showToast((t('toast.cleanupDeleting') || 'Deleting {count}...').replace('{count}', toDelete.length), 'info');
                                const batch = {};
                                toDelete.forEach(loc => {
                                  if (loc.firebaseId) {
                                    batch[`cities/${cityId}/locations/${loc.firebaseId}`] = null;
                                    const pk = loc.name?.replace(/[.#$\/\[\]]/g, '_');
                                    if (pk && !pk.startsWith('(no name)')) batch[`cities/${cityId}/reviews/${pk}`] = null;
                                  }
                                });
                                if (Object.keys(batch).length > 0) await saveBulkUpdate(batch);
                                setCustomLocations(prev => prev.filter(l => !toDelete.find(d => d.firebaseId === l.firebaseId)));
                                showToast((t('toast.cleanupDeleted') || 'Deleted {count} wrong-city locations').replace('{count}', toDelete.length), 'success', 'sticky');
                                console.log(`[CLEANUP] Geo-deleted ${toDelete.length} outliers from ${cityId}`);
                              } catch(e) { showToast(`Cleanup failed: ${e.message}`, 'error'); }
                            }}
                            className="w-full bg-red-700 text-white py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-red-800 transition"
                          >
                            🗺️ Delete locations outside city bounds
                          </button>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Removes favorites outside this city's geographic radius (allCityRadius × 1.5). Also removes (no name) entries.
                          </p>
                        </div>

                        {/* URL Health Check */}
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <p className="text-xs font-bold text-blue-700 mb-2">🔗 URL Health Check</p>
                          <button
                            onClick={() => {
                              const isValidPid = (pid) => pid && /^(ChIJ|EiI|GhIJ)/.test(pid);
                              // Firebase Realtime DB push keys always start with '-' (e.g. -Mxyz123abc)
                              // Other corrupt patterns: or_xyz (seen in West Eden case)
                              const looksLikeFirebaseKey = (val) => val && (
                                /^-[a-zA-Z0-9_-]{10,}$/.test(val) ||   // standard push key: -Mxyz...
                                /^or_[a-zA-Z0-9_-]{5,}$/.test(val)     // or_ prefix pattern
                              );
                              const results = [];
                              customLocations.forEach(loc => {
                                const url = loc.mapsUrl || '';
                                if (!url) return; // No URL — not a problem, skip
                                // Check query_place_id param
                                const mPid = url.match(/query_place_id=([^&]+)/);
                                if (mPid) {
                                  const pid = decodeURIComponent(mPid[1]);
                                  if (!isValidPid(pid)) {
                                    results.push({ loc, reason: `bad query_place_id: ${pid.substring(0, 25)}` });
                                    return;
                                  }
                                }
                                // Check query param — if it looks like a Firebase key, it's corrupt
                                const mQuery = url.match(/[?&]query=([^&]+)/);
                                if (mQuery) {
                                  const q = decodeURIComponent(mQuery[1]);
                                  if (looksLikeFirebaseKey(q)) {
                                    results.push({ loc, reason: `query param is a Firebase key: ${q.substring(0, 25)}` });
                                    return;
                                  }
                                }
                                if (!url.includes('google.com/maps')) {
                                  results.push({ loc, reason: 'not a Google Maps URL' });
                                }
                              });

                              if (results.length === 0) {
                                showToast('✅ All mapsUrls look valid!', 'success');
                                return;
                              }

                              // Show results as a toast + console
                              const lines = results.map(r => `• ${r.loc.name} (${r.reason})`).join('\n');
                              console.warn('[URL-CHECK] Bad mapsUrls found:\n' + lines);
                              showToast(
                                `⚠️ ${results.length} bad URL${results.length > 1 ? 's' : ''} found — see console for details`,
                                'warning', 'sticky'
                              );

                              // Open edit dialog for first bad location
                              const first = results[0].loc;
                              setEditingLocation(first);
                              setNewLocation({
                                name: first.name || '',
                                description: first.description || '',
                                notes: first.notes || '',
                                areas: first.areas || (first.area ? [first.area] : []),
                                interests: first.interests || [],
                                lat: first.lat || null,
                                lng: first.lng || null,
                                address: first.address || '',
                                mapsUrl: first.mapsUrl || '',
                                uploadedImage: first.uploadedImage || null,
                                locked: !!first.locked,
                                googlePlaceId: first.googlePlaceId || '',
                                googleRating: first.googleRating || null,
                                googleRatingCount: first.googleRatingCount || 0,
                                googlePlace: !!first.googlePlace,
                              });
                              setShowEditLocationDialog(true);
                            }}
                            className="w-full bg-blue-500 text-white py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-blue-600 transition"
                          >
                            🔍 Check all mapsUrls
                          </button>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Finds locations with invalid query_place_id. Opens first bad one for editing — use "מידע מגוגל" to fix.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            </div>)}

            {/* ===== INTERESTS TAB ===== */}
            {settingsTab === 'interests' && (() => { if(debugMode){addDebugLog('INTEREST',`Settings/Interests tab: customInterests.length=${customInterests.length}`);} return null; })()}
            {settingsTab === 'interests' && (() => {
                            const renderInterestSettingsRow = (i, allCities, getAStatus, openFn) => {
                const icon = i.icon?.startsWith?.('data:') ? <img src={i.icon} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> : <span style={{ fontSize: '18px' }}>{i.icon || '📍'}</span>;
                const isDraft = getAStatus(i) === 'draft';
                const isHidden = getAStatus(i) === 'hidden';
                const visibleCities = allCities.filter(city => !(cityHiddenInterests[city.id] || new Set()).has(i.id));
                const allVisible = visibleCities.length === allCities.length;
                const cityLabel = allVisible ? '🌍' : `🏙️ ${visibleCities.length}/${allCities.length}`;
                return (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '8px', border: '1px solid', borderColor: isHidden ? '#fca5a5' : isDraft ? '#fde68a' : '#e5e7eb', background: isHidden ? '#fef2f2' : isDraft ? '#fffbeb' : 'white', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', marginBottom: '3px' }}>
                    <span style={{ flexShrink: 0 }}>{renderIcon(icon, '20px')}</span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: isHidden ? '#ef4444' : 'inherit' }}>{tLabel(i) || i.label}</span>
                    {interestConfig[i.id]?.noGoogleSearch && <span style={{ fontSize: '9px', background: '#f3f4f6', color: '#6b7280', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>פנימי</span>}
                    {isDraft && <span style={{ fontSize: '9px', background: '#fef3c7', color: '#92400e', padding: '1px 4px', borderRadius: '3px' }}>טיוטה</span>}
                    {isHidden && <span style={{ fontSize: '9px', background: '#fee2e2', color: '#b91c1c', padding: '1px 4px', borderRadius: '3px' }}>מוסתר</span>}
                    {/* City visibility button — opens dialog */}
                    <button onClick={() => setCityVisibilityInterest(i.id)}
                      title="ניהול ניראות לפי עיר"
                      style={{ cursor: 'pointer', fontSize: '12px', padding: '2px 6px', borderRadius: '6px', border: '1px solid #e5e7eb', background: allVisible ? '#ecfdf5' : '#fef9c3', flexShrink: 0 }}>
                      {cityLabel}
                    </button>
                    <button onClick={() => openFn(i)} style={{ padding: '2px 6px', fontSize: '11px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
                  </div>
                );
              };
              const allCities = Object.values(window.BKK.cities || {});
              // Collect interests from ALL cities + customInterests — no city filter
              const seenIds = new Set();
              const allCityInterestIds = allCities.flatMap(c => (c.interests || []).map(i => i.id));
              const allIdsToShow = [...new Set([...allCityInterestIds, ...(customInterests || []).map(i => i.id)])];
              const fullList = allIdsToShow.map(id => {
                const fromCurrent = allInterestOptions.find(o => o.id === id);
                if (fromCurrent) return fromCurrent;
                for (const city of allCities) {
                  const found = (city.interests || []).find(i => i.id === id);
                  if (found) {
                    const cfg = interestConfig[id] || {};
                    return { ...found, label: cfg.labelOverride || cfg.label || found.label || id, labelEn: cfg.labelEnOverride || cfg.labelEn || found.labelEn || '', icon: cfg.iconOverride || cfg.icon || found.icon || '📍' };
                  }
                }
                return customInterests.find(i => i.id === id) || { id };
              }).filter(Boolean);
              // Settings tab always shows ALL interests — admin needs to see hidden ones too
              const allInterestsSorted = fullList
                .sort((a, b) => (tLabel(a) || a.label || '').localeCompare(tLabel(b) || b.label || '', 'he'));
              const getAStatus = (i) => interestConfig[i.id]?.adminStatus || 'active';
              const draftCount = allInterestsSorted.filter(i => getAStatus(i) === 'draft').length;
              const openInterestDialogFromSettings = (interest) => {
                const cfg = interestConfig[interest.id] || {};
                const isFromCustom = customInterests.some(ci => ci.id === interest.id);
                const toArr = (v) => !v ? [] : Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map(s=>s.trim()).filter(Boolean) : [];
                setEditingCustomInterest(isFromCustom ? interest : { ...interest, builtIn: true });
                setNewInterest({
                  id: interest.id,
                  label: cfg.labelOverride || cfg.label || interest.label || '',
                  labelEn: cfg.labelEnOverride || cfg.labelOverrideEn || cfg.labelEn || interest.labelEn || '',
                  icon: cfg.iconOverride || cfg.icon || interest.icon || '📍',
                  searchMode: cfg.textSearch ? 'text' : 'types',
                  types: toArr(cfg.types).join(', '), textSearch: cfg.textSearch || '',
                  blacklist: toArr(cfg.blacklist).join(', '), nameKeywords: toArr(cfg.nameKeywords).join(', '),
                  minRatingCount: cfg.minRatingCount != null ? cfg.minRatingCount : null,
                  lowRatingCount: cfg.lowRatingCount != null ? cfg.lowRatingCount : null,
                  privateOnly: interest.privateOnly || false, locked: interest.locked || false,
                  builtIn: !isFromCustom, scope: 'global', cityId: '',
                  category: cfg.category || interest.category || 'attraction',
                  weight: cfg.weight || interest.weight || 3,
                  minStops: cfg.minStops != null ? cfg.minStops : (interest.minStops != null ? interest.minStops : 1),
                  maxStops: cfg.maxStops || interest.maxStops || 10,
                  routeSlot: cfg.routeSlot || interest.routeSlot || 'any',
                  minGap: cfg.minGap != null ? cfg.minGap : 1,
                  bestTime: cfg.bestTime || interest.bestTime || 'anytime',
                  group: cfg.group || interest.group || '',
                  dedupRelated: toArr(cfg.dedupRelated || interest.dedupRelated),
                  noGoogleSearch: cfg.noGoogleSearch || interest.noGoogleSearch || false,
                  color: cfg.color || interest.color || '',
                });
                setShowAddInterestDialog(true);
              };
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>
                      🏷️ ניהול תחומים <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>({allInterestsSorted.length}{draftCount > 0 ? ` · ${draftCount} טיוטות` : ''})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {(() => {
                        // Orphaned = any interest (built-in or custom) with no icon in interestConfig
                        // These show as 📍 in the list and have no real configuration
                        const orphaned = allInterestsSorted.filter(i => {
                          const cfg = interestConfig[i.id] || {};
                          const effectiveIcon = cfg.icon || cfg.iconOverride || i.icon || '';
                          const effectiveLabel = cfg.label || cfg.labelOverride || i.label || '';
                          // Orphaned = default 📍 icon AND label is still the raw id (never configured)
                          const hasDefaultIcon = !effectiveIcon || effectiveIcon === '📍';
                          const hasRawLabel = effectiveLabel === i.id || effectiveLabel === '';
                          return hasDefaultIcon && hasRawLabel;
                        });
                        if (orphaned.length === 0) return null;
                        return (
                          <button
                            onClick={() => {
                              const names = orphaned.map(i => cfg => (interestConfig[i.id]?.label || i.label || i.id)).join ? orphaned.map(i => interestConfig[i.id]?.label || i.label || i.id).join(', ') : '';
                              if (!window.confirm(`הסתר ${orphaned.length} תחומים ללא אייקון?\n${names}`)) return;
                              orphaned.forEach(i => {
                                const isCustom = customInterests.some(ci => ci.id === i.id);
                                if (isCustom) {
                                  deleteCustomInterest(i.id);
                                } else {
                                  // Built-in: hide via adminStatus
                                  const cfg = { ...(interestConfig[i.id] || {}), adminStatus: 'hidden' };
                                  setInterestConfig(prev => ({ ...prev, [i.id]: cfg }));
                                  if (isFirebaseAvailable && database) {
                                    saveInterestAdminStatus(i.id, 'hidden');
                                  }
                                }
                              });
                            }}
                            style={{ padding: '5px 10px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                          >🗑️ הסתר {orphaned.length} ריקים</button>
                        );
                      })()}
                      <button
                        onClick={() => { setShowAddInterestDialog(true); setEditingCustomInterest(null); setNewInterest({ label: '', labelEn: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', privateOnly: false, locked: false, category: 'attraction', weight: 3, minStops: 1, maxStops: 10, routeSlot: 'any', minGap: 1, bestTime: 'anytime', dedupRelated: [] }); }}
                        style={{ padding: '5px 12px', borderRadius: '8px', background: '#8b5cf6', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      >+ הוסף תחום</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span>🌍 = חשוף בכל הערים · אייקון עיר = לחץ לשינוי ניראות</span>
                    <span style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>פנימי = ללא חיפוש גוגל</span>
                  </div>
                  <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                    <div className="space-y-1">
                      {allInterestsSorted.map(i => renderInterestSettingsRow(i, allCities, getAStatus, openInterestDialogFromSettings))}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Interest Groups Management */}
            {settingsTab === 'interests' && (
            <div style={{ marginTop: '0', marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', background: '#fafafa' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                📂 קיבוץ תחומים <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#9ca3af' }}>{Object.keys(interestGroups).length}</span>
              </div>
              {(() => {
                const allOpts = allInterestOptions || [];
                const membersByGroup = {};
                const ungrouped = [];
                allOpts.forEach(opt => {
                  const aStatus = opt.adminStatus || 'active';
                  if (aStatus === 'hidden') return;
                  if (opt.group) {
                    if (!membersByGroup[opt.group]) membersByGroup[opt.group] = [];
                    membersByGroup[opt.group].push(opt);
                  } else { ungrouped.push(opt); }
                });
                const groupIds = Object.keys(interestGroups).sort((a, b) => {
                  const oa = interestGroups[a]?.order ?? 99;
                  const ob = interestGroups[b]?.order ?? 99;
                  return oa !== ob ? oa - ob : a.localeCompare(b);
                });
                const moveGroup = (gId, dir) => {
                  const ids = [...groupIds];
                  const idx = ids.indexOf(gId);
                  const swapIdx = idx + dir;
                  if (swapIdx < 0 || swapIdx >= ids.length) return;
                  const swapId = ids[swapIdx];
                  saveInterestGroup(gId, interestGroups[gId]?.labelHe || '', interestGroups[gId]?.labelEn || '', interestGroups[swapId]?.order ?? swapIdx);
                  saveInterestGroup(swapId, interestGroups[swapId]?.labelHe || '', interestGroups[swapId]?.labelEn || '', interestGroups[gId]?.order ?? idx);
                };
                const AddGroupRow = () => {
                  const [newGId, setNewGId] = React.useState('');
                  const [newGHe, setNewGHe] = React.useState('');
                  const [newGEn, setNewGEn] = React.useState('');
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed #e5e7eb', flexWrap: 'wrap' }}>
                      <input value={newGId} onChange={(e) => setNewGId(e.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder="id" style={{ fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '3px 6px', width: '68px' }} />
                      <input value={newGHe} onChange={(e) => setNewGHe(e.target.value)} placeholder="עברית" style={{ fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '3px 6px', width: '74px', textAlign: 'right', direction: 'rtl' }} />
                      <input value={newGEn} onChange={(e) => setNewGEn(e.target.value)} placeholder="English" style={{ fontSize: '11px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '3px 6px', width: '74px' }} />
                      <button onClick={() => {
                        if (!newGId.trim() || !newGHe.trim() || !newGEn.trim()) { showToast('⚠️ כל השדות חובה', 'warning'); return; }
                        if (interestGroups[newGId.trim()]) { showToast('⚠️ ID קיים כבר', 'warning'); return; }
                        saveInterestGroup(newGId.trim(), newGHe.trim(), newGEn.trim(), groupIds.length);
                        setNewGId(''); setNewGHe(''); setNewGEn('');
                      }} style={{ fontSize: '11px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}>+ הוסף</button>
                    </div>
                  );
                };
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {groupIds.map((gId, idx) => {
                      const gData = interestGroups[gId] || {};
                      const members = membersByGroup[gId] || [];
                      return (
                        <div key={gId} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: members.length ? '5px' : '0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <button onClick={() => moveGroup(gId, -1)} disabled={idx === 0} style={{ fontSize: '9px', background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: '0', lineHeight: 1 }}>▲</button>
                              <button onClick={() => moveGroup(gId, 1)} disabled={idx === groupIds.length - 1} style={{ fontSize: '9px', background: 'none', border: 'none', cursor: idx === groupIds.length - 1 ? 'default' : 'pointer', opacity: idx === groupIds.length - 1 ? 0.3 : 1, padding: '0', lineHeight: 1 }}>▼</button>
                            </div>
                            <span style={{ fontSize: '10px', color: '#9ca3af', minWidth: '46px' }}>{gId}</span>
                            <input value={gData.labelHe || ''} onChange={(e) => saveInterestGroup(gId, e.target.value, gData.labelEn || '', gData.order ?? idx)} placeholder="עברית" style={{ fontSize: '12px', fontWeight: 'bold', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px 6px', width: '80px', textAlign: 'right', direction: 'rtl' }} />
                            <input value={gData.labelEn || ''} onChange={(e) => saveInterestGroup(gId, gData.labelHe || '', e.target.value, gData.order ?? idx)} placeholder="English" style={{ fontSize: '12px', fontWeight: 'bold', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px 6px', width: '80px' }} />
                            <button onClick={() => {
                              if (members.length > 0) { showToast('⚠️ יש ' + members.length + ' תחומים בקיבוץ — שנה אותם קודם', 'warning'); return; }
                              deleteInterestGroup(gId);
                            }} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', marginLeft: 'auto' }}>🗑️</button>
                          </div>
                          {members.length > 0 && (
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                              {[...members].sort((a, b) => (tLabel(a) || '').localeCompare(tLabel(b) || '', 'he')).map(opt => (
                                <span key={opt.id} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>{renderIcon(opt.icon, '11px')} {tLabel(opt)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <AddGroupRow />
                    {ungrouped.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 6px', background: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#9a3412', minWidth: '60px' }}>ללא קיבוץ</span>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', flex: 1 }}>
                          {ungrouped.map(opt => (
                            <span key={opt.id} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: '#fef3c7', border: '1px solid #fcd34d' }}>{renderIcon(opt.icon, '11px')} {tLabel(opt)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            )}

            {/* ===== SYSTEM PARAMS TAB ===== */}
            {settingsTab === 'sysparams' && (<div>
            {(() => {
              const sections = [
                { title: t('sysParams.sectionApp'), icon: '📱', color: '#3b82f6', params: [
                  { key: 'maxStops', label: t('sysParams.maxStops'), desc: t('sysParams.maxStopsDesc'), min: 3, max: 30, step: 1, type: 'int' },
                  { key: 'fetchMoreCount', label: t('sysParams.fetchMore'), desc: t('sysParams.fetchMoreDesc'), min: 1, max: 10, step: 1, type: 'int' },
                  { key: 'googleMaxWaypoints', label: t('sysParams.maxWaypoints'), desc: t('sysParams.maxWaypointsDesc'), min: 5, max: 25, step: 1, type: 'int' },
                  { key: 'defaultRadius', label: t('sysParams.defaultRadius'), desc: t('sysParams.defaultRadiusDesc'), min: 100, max: 5000, step: 100, type: 'int' },
                  { key: 'toastDuration', label: t('sysParams.toastDurationLabel'), desc: t('sysParams.toastDurationDesc'), min: 1000, max: 10000, step: 500, type: 'int' },
                  { key: 'includeDrafts', label: t('sysParams.includeDrafts'), desc: t('sysParams.includeDraftsDesc'), type: 'bool' },
                  { key: 'systemAlertIntervalHours', label: 'System Alert Interval (hours)', desc: 'How often to send automated system feedback alerts (e.g. corrupted cacheVersion). Default: 1', min: 1, max: 72, step: 1, type: 'int' },
                ]},
                { title: t('sysParams.sectionDedup'), icon: '🔍', color: '#8b5cf6', params: [
                  { key: 'dedupRadiusMeters', label: t('sysParams.dedupRadius'), desc: t('sysParams.dedupRadiusDesc'), min: 10, max: 200, step: 10, type: 'int' },
                  { key: 'dedupGoogleEnabled', label: t('sysParams.dedupGoogle'), desc: t('sysParams.dedupGoogleDesc'), min: 0, max: 1, step: 1, type: 'int' },
                  { key: 'dedupCustomEnabled', label: t('sysParams.dedupCustom'), desc: t('sysParams.dedupCustomDesc'), min: 0, max: 1, step: 1, type: 'int' },
                ]},
                { title: t('sysParams.sectionAlgo'), icon: '🧮', color: '#f59e0b', params: [
                  { key: 'trailTimeoutHours', label: t('sysParams.trailTimeout'), desc: t('sysParams.trailTimeoutDesc'), min: 1, max: 48, step: 1, type: 'int' },
                  { key: 'defaultInterestWeight', label: t('sysParams.defaultWeight'), desc: t('sysParams.defaultWeightDesc'), min: 1, max: 10, step: 1, type: 'int' },
                  { key: 'maxContentPasses', label: t('sysParams.maxPasses'), desc: t('sysParams.maxPassesDesc'), min: 1, max: 20, step: 1, type: 'int' },
                  { key: 'timeScoreMatch', label: t('sysParams.timeMatch'), desc: t('sysParams.timeMatchDesc'), min: 0, max: 10, step: 1, type: 'int' },
                  { key: 'timeScoreAnytime', label: t('sysParams.timeAnytime'), desc: t('sysParams.timeAnytimeDesc'), min: 0, max: 10, step: 1, type: 'int' },
                  { key: 'timeScoreConflict', label: t('sysParams.timeConflict'), desc: t('sysParams.timeConflictDesc'), min: 0, max: 10, step: 1, type: 'int' },
                  { key: 'timeConflictPenalty', label: t('sysParams.timePenalty'), desc: t('sysParams.timePenaltyDesc'), min: 0, max: 20, step: 1, type: 'int' },
                  { key: 'slotEarlyThreshold', label: t('sysParams.earlyThreshold'), desc: t('sysParams.earlyThresholdDesc'), min: 0.1, max: 0.9, step: 0.05, type: 'float' },
                  { key: 'slotLateThreshold', label: t('sysParams.lateThreshold'), desc: t('sysParams.lateThresholdDesc'), min: 0.1, max: 0.9, step: 0.05, type: 'float' },
                  { key: 'speechMaxSeconds', label: t('sysParams.speechDuration'), desc: t('sysParams.speechDurationDesc'), min: 5, max: 60, step: 5, type: 'int' },
                  { key: 'slotEndThreshold', label: t('sysParams.endThreshold'), desc: t('sysParams.endThresholdDesc'), min: 0.1, max: 0.9, step: 0.05, type: 'float' },
                  { key: 'slotPenaltyMultiplier', label: t('sysParams.slotPenalty'), desc: t('sysParams.slotPenaltyDesc'), min: 1, max: 20, step: 1, type: 'int' },
                  { key: 'slotEndPenaltyMultiplier', label: t('sysParams.endPenalty'), desc: t('sysParams.endPenaltyDesc'), min: 1, max: 20, step: 1, type: 'int' },
                  { key: 'gapPenaltyMultiplier', label: t('sysParams.gapPenalty'), desc: t('sysParams.gapPenaltyDesc'), min: 1, max: 20, step: 1, type: 'int' },
                ]},
                { title: t('sysParams.sectionFavorites') || '⭐ מועדפים', icon: '⭐', color: '#f59e0b', params: [
                  { key: 'favoriteBaseScore', label: t('sysParams.favoriteBaseScore'), desc: t('sysParams.favoriteBaseScoreDesc'), min: 0, max: 100, step: 5, type: 'int' },
                  { key: 'favoriteBonusPerStar', label: t('sysParams.favoriteBonusPerStar'), desc: t('sysParams.favoriteBonusPerStarDesc'), min: 0, max: 30, step: 1, type: 'int' },
                  { key: 'favoriteLowRatingThreshold', label: t('sysParams.favoriteLowRatingThreshold'), desc: t('sysParams.favoriteLowRatingThresholdDesc'), min: 1, max: 4, step: 0.5, type: 'float' },
                  { key: 'favoriteLowRatingPenalty', label: t('sysParams.favoriteLowRatingPenalty'), desc: t('sysParams.favoriteLowRatingPenaltyDesc'), min: 0, max: 200, step: 10, type: 'int' },
                ]},
                { title: t('sysParams.sectionGoogleFilter') || '🔍 סינון גוגל', icon: '🔍', color: '#6366f1', params: [
                  { key: 'googleMaxResultCount', label: 'מקסימום תוצאות מגוגל', desc: '-1 = לא שולחים (גוגל מחליט), מספר חיובי = שולחים לגוגל', min: -1, max: 100, step: 1, type: 'int' },
                  { key: 'googleNearbyRankPreference', label: 'דירוג Nearby Search', desc: 'POPULARITY = לפי פופולריות (ברירת מחדל) | DISTANCE = לפי מרחק', type: 'select', options: ['POPULARITY', 'DISTANCE'] },
                  { key: 'googleTextRankPreference', label: 'דירוג Text Search', desc: 'RELEVANCE = לפי רלוונטיות (ברירת מחדל) | DISTANCE = לפי מרחק', type: 'select', options: ['RELEVANCE', 'DISTANCE'] },
                  { key: 'googleMinRatingCount', label: t('sysParams.googleMinRatingCount') || 'מינימום דירוגים (דלג לצמיתות)', desc: t('sysParams.googleMinRatingCountDesc') || 'מקומות גוגל עם פחות מכך דירוגים — לא יובאו לעולם', min: 0, max: 200, step: 5, type: 'int' },
                  { key: 'googleLowRatingCount', label: t('sysParams.googleLowRatingCount') || 'דירוגים לתיעדוף נמוך', desc: t('sysParams.googleLowRatingCountDesc') || 'מקומות גוגל מתחת לכך — ציון נמוך מאוד, יובאו רק אם אין אחרים בתחום', min: 0, max: 500, step: 10, type: 'int' },
                ]},
              ];
              // Google location mode toggle
              const toggleLocationMode = () => {
                const next = systemParams.googleLocationMode === 'bias' ? 'restriction' : 'bias';
                const updated = { ...systemParams, googleLocationMode: next };
                window.BKK.systemParams = updated;
                setSystemParams(updated);
                if (isFirebaseAvailable && database) saveSystemParam('googleLocationMode', next);
              };
              // Business status + openNow filter — custom UI (not a simple slider)
              const ALL_BUSINESS_STATUSES = ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY', 'BUSINESS_STATUS_UNSPECIFIED'];
              const STATUS_LABELS = {
                CLOSED_PERMANENTLY: 'סגור לצמיתות',
                CLOSED_TEMPORARILY: 'סגור זמנית',
                BUSINESS_STATUS_UNSPECIFIED: 'סטטוס לא ידוע',
              };
              const currentFiltered = systemParams.filteredBusinessStatuses || ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY'];
              const toggleStatus = (status) => {
                const next = currentFiltered.includes(status)
                  ? currentFiltered.filter(s => s !== status)
                  : [...currentFiltered, status];
                const updated = { ...systemParams, filteredBusinessStatuses: next };
                window.BKK.systemParams = updated;
                setSystemParams(updated);
                if (isFirebaseAvailable && database) saveSystemParam('filteredBusinessStatuses', next);
              };
              const toggleClosedNow = () => {
                const next = !systemParams.filterClosedNow;
                const updated = { ...systemParams, filterClosedNow: next };
                window.BKK.systemParams = updated;
                setSystemParams(updated);
                if (isFirebaseAvailable && database) saveSystemParam('filterClosedNow', next);
              };
              const updateParam = (key, val, type) => {
                const parsed = type === 'bool' ? !!val : type === 'float' ? parseFloat(val) : parseInt(val);
                if (type !== 'bool' && isNaN(parsed)) return;
                const updated = { ...systemParams, [key]: parsed };
                window.BKK.systemParams = updated;
                setSystemParams(updated);
                if (isFirebaseAvailable && database) {
                  saveSystemParam(key, parsed);
                }
                // Live-apply app settings
                if (key === 'maxStops') setFormData(prev => ({...prev, maxStops: parsed}));
                if (key === 'fetchMoreCount') setFormData(prev => ({...prev, fetchMoreCount: parsed}));
                if (key === 'googleMaxWaypoints') setGoogleMaxWaypoints(parsed);
                if (key === 'defaultRadius') window.BKK._defaultRadius = parsed;
              };
              const resetAll = () => {
                const defaults = { ...window.BKK._defaultSystemParams };
                window.BKK.systemParams = defaults;
                setSystemParams(defaults);
                setFormData(prev => ({...prev, maxStops: defaults.maxStops, fetchMoreCount: defaults.fetchMoreCount}));
                setGoogleMaxWaypoints(defaults.googleMaxWaypoints);
                window.BKK._defaultRadius = defaults.defaultRadius;
                if (isFirebaseAvailable && database) {
                  resetSystemParams(defaults);
                }
                showToast(t('sysParams.resetDone'), 'success');
              };
              const renderRow = (p) => {
                const def = window.BKK._defaultSystemParams[p.key];
                const isDefault = systemParams[p.key] === def;
                const isToggle = p.min === 0 && p.max === 1 && p.step === 1;
                return (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: isDefault ? '#f9fafb' : '#fffbeb', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: isDefault ? '1px solid #e5e7eb' : '4px solid #f59e0b' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>{p.label}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{p.desc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {p.type === 'select' ? (
                      <select value={systemParams[p.key] || p.options[0]}
                        onChange={e => {
                          const updated = { ...systemParams, [p.key]: e.target.value };
                          window.BKK.systemParams = updated;
                          setSystemParams(updated);
                          isFirebaseAvailable && database && saveSystemParam(p.key, e.target.value);
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer' }}>
                        {p.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : p.type === 'bool' ? (
                      <button onClick={() => updateParam(p.key, !systemParams[p.key], 'bool')}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          background: systemParams[p.key] ? '#22c55e' : '#ef4444', color: 'white' }}>
                        {systemParams[p.key] ? '✓ ON' : '✗ OFF'}
                      </button>
                    ) : isToggle ? (
                      <button onClick={() => updateParam(p.key, systemParams[p.key] ? 0 : 1, 'int')}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          background: systemParams[p.key] ? '#22c55e' : '#ef4444', color: 'white' }}>
                        {systemParams[p.key] ? '✓ ON' : '✗ OFF'}
                      </button>
                    ) : (() => {
                      const step = p.step || 1;
                      const val = systemParams[p.key];
                      const isEditing = editingParamKey === p.key;
                      return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isEditing ? (
                          <>
                            <button onClick={() => {
                                const parsed = p.type === 'float' ? parseFloat(editingParamVal) : parseInt(editingParamVal);
                                if (!isNaN(parsed)) updateParam(p.key, Math.max(p.min, Math.min(p.max, parsed)), p.type);
                                setEditingParamKey(null);
                              }}
                              style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#22c55e', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                            <input type="text" inputMode="decimal" autoFocus
                              value={editingParamVal}
                              onChange={(e) => setEditingParamVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const parsed = p.type === 'float' ? parseFloat(editingParamVal) : parseInt(editingParamVal);
                                  if (!isNaN(parsed)) updateParam(p.key, Math.max(p.min, Math.min(p.max, parsed)), p.type);
                                  setEditingParamKey(null);
                                } else if (e.key === 'Escape') { setEditingParamKey(null); }
                              }}
                              style={{ width: '55px', padding: '4px', fontSize: '15px', fontWeight: 'bold', border: '2px solid #3b82f6', borderRadius: '8px', textAlign: 'center', outline: 'none' }}
                            />
                            <button onClick={() => setEditingParamKey(null)}
                              style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✗</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => updateParam(p.key, Math.max(p.min, val - step), p.type)}
                              style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: val <= p.min ? '#e5e7eb' : '#3b82f6', color: val <= p.min ? '#9ca3af' : 'white', fontSize: '16px', fontWeight: 'bold', cursor: val <= p.min ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              disabled={val <= p.min}>−</button>
                            <span onClick={() => { setEditingParamKey(p.key); setEditingParamVal(p.type === 'float' ? val.toFixed(1) : String(val)); }}
                              style={{ minWidth: '40px', textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: '#374151', cursor: 'pointer', padding: '2px 4px', borderRadius: '6px', border: '1px dashed #d1d5db' }}>{p.type === 'float' ? val.toFixed(1) : val}</span>
                            <button onClick={() => updateParam(p.key, Math.min(p.max, val + step), p.type)}
                              style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: val >= p.max ? '#e5e7eb' : '#3b82f6', color: val >= p.max ? '#9ca3af' : 'white', fontSize: '16px', fontWeight: 'bold', cursor: val >= p.max ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              disabled={val >= p.max}>+</button>
                          </>
                        )}
                      </div>
                      );
                    })()}
                    {!isDefault && (
                      <button onClick={() => updateParam(p.key, def, p.type)} title={`Default: ${def}`}
                        style={{ padding: '3px 6px', fontSize: '9px', fontWeight: 'bold', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        ↩ {def}
                      </button>
                    )}
                  </div>
                </div>
                );
              };
              return (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-500">{t('sysParams.subtitle')}</p>
                {sections.map(sec => (
                  <details key={sec.title} open>
                    <summary style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', color: 'white', background: sec.color }}>
                      {sec.icon} {sec.title}
                    </summary>
                    <div className="space-y-2 mt-2">
                      {sec.params.map(p => renderRow(p))}
                    </div>
                  </details>
                ))}
                {/* Google location mode */}
                <details className="border border-indigo-200 rounded-lg overflow-hidden" style={{ marginBottom: '4px' }}>
                  <summary style={{ padding: '8px 12px', background: '#eef2ff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📍 מוד מיקום בחיפוש
                  </summary>
                  <div style={{ padding: '10px 12px', background: 'white', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                      <input type="checkbox" checked={(systemParams.googleLocationMode || 'restriction') === 'restriction'} onChange={toggleLocationMode} style={{ width: '14px', height: '14px' }} />
                      <span style={{ fontWeight: 'bold' }}>הגבלה קשה (restriction) — ברירת מחדל</span>
                    </label>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}><strong>restriction</strong> — גוגל מחזיר רק מקומות בתוך הרדיוס</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}><strong>bias</strong> — גוגל מעדיף קרוב אבל עשוי להחזיר מרוחקים</div>
                  </div>
                </details>
                {/* Business status + openNow filter */}
                <details className="border border-indigo-200 rounded-lg overflow-hidden" style={{ marginBottom: '4px' }}>
                  <summary style={{ padding: '8px 12px', background: '#eef2ff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🚫 סינון סטטוס עסקים
                  </summary>
                  <div style={{ padding: '10px 12px', background: 'white', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>סמן מה לסנן מתוצאות גוגל:</div>
                    {ALL_BUSINESS_STATUSES.map(status => (
                      <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                        <input type="checkbox" checked={currentFiltered.includes(status)} onChange={() => toggleStatus(status)} style={{ width: '14px', height: '14px' }} />
                        <span>{STATUS_LABELS[status]}</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>{status}</span>
                      </label>
                    ))}
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '2px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                        <input type="checkbox" checked={!!systemParams.filterClosedNow} onChange={toggleClosedNow} style={{ width: '14px', height: '14px' }} />
                        <span>סנן מקומות סגורים עכשיו (openNow = false)</span>
                      </label>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '3px', marginRight: '22px' }}>מקומות פתוחים בדרך כלל אבל סגורים בשעה זו. לא מומלץ — מוריד כמות תוצאות.</div>
                    </div>
                  </div>
                </details>
                <button onClick={resetAll}
                  className="w-full py-1.5 bg-gray-500 text-white rounded-lg text-xs font-bold hover:bg-gray-600">
                  🔄 {t('sysParams.resetAll')}
                </button>
              </div>
              );
            })()}

            </div>)}



            {/* ===== DEBUG TAB ===== */}
            {settingsTab === 'debug' && debugMode && (
              <DebugTab
                debugSessions={debugSessions}
                searchDebugLog={searchDebugLog}
                debugFlagged={debugFlagged}
                debugCategories={debugCategories}
                debugClaudeQ={debugClaudeQ}
                setDebugClaudeQ={setDebugClaudeQ}
                toggleDebugCategory={toggleDebugCategory}
                toggleDebugFlag={toggleDebugFlag}
                exportDebugSessions={exportDebugSessions}
                clearDebugSessions={clearDebugSessions}
                exportFlaggedStops={exportFlaggedStops}
                askClaude={askClaude}
              />
            )}
            
          </div>
        )}

        {/* Footer — minimal during active trail */}
        {activeTrail ? (
          <div className="text-center py-2 mt-2">
            <span style={{ fontSize: '11px', color: '#d1d5db' }}>🐾 FouFou</span>
          </div>
        ) : (
        <div className="text-center py-3 mt-4 border-t border-gray-200">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
            FouFou — City Trail Generator 🍜🏛️🎭
          </div>
          <div style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '6px' }}>
            © Eitan Fisher
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const appUrl = 'https://eitanfisher2026.github.io/FouFou/';
                const shareData = { title: 'FouFou', text: t('settings.appDescription') || 'City trails in Bangkok & Singapore', url: appUrl };
                window.BKK.logEvent?.('app_shared', {});
                if (navigator.share) { navigator.share(shareData).catch(() => {}); }
                else { try { navigator.clipboard.writeText(appUrl); showToast(t('route.linkCopied'), 'success'); } catch(e) { showToast(appUrl, 'info'); } }
              }}
              style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: '#374151', padding: '4px 10px' }}
            >{`📤 ${t('general.share')}`}</button>
            {/* Admin only: version + refresh */}
            {isAdmin && (<>
              <span style={{ color: '#d1d5db', fontSize: '9px' }}>·</span>
              <span style={{ fontSize: '9px', color: '#9ca3af' }}>v{window.BKK.VERSION}</span>
              <span style={{ color: '#d1d5db', fontSize: '9px' }}>·</span>
              <button onClick={() => applyUpdate()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#9ca3af' }}>{`🔄 ${t('general.refresh')}`}</button>
            </>)}
          </div>
        </div>
        )}


      {/* Leaflet Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: (mapMode === 'stops' || mapMode === 'favorites') ? '0' : '12px' }}>
          <div className="bg-white shadow-2xl w-full" style={{ 
            maxWidth: (mapMode === 'stops' || mapMode === 'favorites') ? '100%' : '42rem',
            maxHeight: (mapMode === 'stops' || mapMode === 'favorites') ? '100%' : '90vh',
            height: (mapMode === 'stops' || mapMode === 'favorites') ? '100%' : 'auto',
            borderRadius: (mapMode === 'stops' || mapMode === 'favorites') ? '0' : '12px',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b" style={{ gap: '8px' }}>
              <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                <h3 className="font-bold text-sm" style={{ whiteSpace: 'nowrap' }}>
                  {mapMode === 'areas' ? t('wizard.allAreasMap') : mapMode === 'stops' ? `${t('route.showStopsOnMap')} (${mapStops.length})` : mapMode === 'favorites' ? `⭐ ${t('nav.favorites')}` : t('form.searchRadius')}
                </h3>
                {mapMode === 'favorites' && (() => {
                  const activeCount = customLocations.filter(loc => {
                    if (loc.status === 'blacklist' || !loc.lat || !loc.lng) return false;
                    if (window.BKK.systemParams?.includeDrafts === false && !loc.locked) return false;
                    if (mapFavArea) { const la = loc.areas || (loc.area ? [loc.area] : []); if (!la.includes(mapFavArea)) return false; }
                    if (mapFavFilter.size > 0) { if (!(loc.interests || []).some(i => mapFavFilter.has(i))) return false; }
                    return true;
                  }).length;
                  const areaLabel = mapFavArea ? tLabel((window.BKK.areaOptions || []).find(a => a.id === mapFavArea)) : '';
                  const radiusLabel = mapFavRadius ? `📍 ${mapFavRadius.meters}m` : '';
                  return (
                    <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                      {activeCount} {t('nav.favorites')}{areaLabel ? ` · ${areaLabel}` : ''}{radiusLabel ? ` · ${radiusLabel}` : ''}{mapFavFilter.size > 0 ? ` · ${mapFavFilter.size} ${t('general.interests') || 'תחומים'}` : ''}
                    </span>
                  );
                })()}
              </div>
              {mapMode !== 'stops' && mapMode !== 'favorites' && (
              <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setMapMode('areas')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    mapMode === 'areas' ? 'bg-blue-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'
                  }`}
                >{t("general.areas")}</button>
                <button
                  onClick={() => {
                    if (!formData.currentLat) {
                      showToast(t('form.useGpsForRadius'), 'warning');
                      return;
                    }
                    setMapMode('radius');
                  }}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    mapMode === 'radius' ? 'bg-rose-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'
                  } ${!formData.currentLat ? 'opacity-30' : ''}`}
                  title={!formData.currentLat ? t('form.needGpsFirst') : t('form.showSearchRadius')}
                >{`📍 ${t("form.radiusMode")}`}</button>
              </div>
              )}
              <button
                onClick={() => {
                  const returnPlace = mapReturnPlace;
                  setShowMapModal(false); setMapUserLocation(null); setMapSkippedStops(new Set()); setMapBottomSheet(null); setShowFavMapFilter(false); setMapFavFilter(new Set()); setMapFavArea(null); setMapFavRadius(null); setMapFocusPlace(null); setMapReturnPlace(null); setRoute(prev => prev ? {...prev, _refresh: Date.now()} : prev);
                  if (returnPlace) { setTimeout(() => handleEditLocation(returnPlace), 100); }
                }}
                style={{ 
                  padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                  background: '#f3f4f6', color: '#374151', border: '1.5px solid #d1d5db',
                  display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >✕ {t('general.close')}</button>
            </div>
            {/* Map container with floating elements */}
            <div style={{ flex: 1, position: 'relative', minHeight: (mapMode === 'stops' || mapMode === 'favorites') ? '0' : '350px', maxHeight: (mapMode === 'stops' || mapMode === 'favorites') ? 'none' : '70vh' }}>
              <div id="leaflet-map-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}></div>
              {/* Floating filter button — favorites mode */}
              {mapMode === 'favorites' && !showFavMapFilter && (
                <button
                  onClick={() => setShowFavMapFilter(true)}
                  style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1000, padding: '8px 14px', borderRadius: '20px', background: (mapFavFilter.size > 0 || mapFavArea) ? '#7c3aed' : 'white', color: (mapFavFilter.size > 0 || mapFavArea) ? 'white' : '#374151', border: '2px solid ' + ((mapFavFilter.size > 0 || mapFavArea) ? '#7c3aed' : '#d1d5db'), boxShadow: '0 2px 10px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >🔍 {t('general.filter') || 'סינון/חיפוש'}{(mapFavFilter.size > 0 || mapFavArea) ? ' ●' : ''}</button>
              )}
              {/* Filter dialog overlay — favorites mode */}
              {mapMode === 'favorites' && showFavMapFilter && (() => {
                const allInts = allInterestOptions || [];
                const usedInterests = new Set();
                customLocations.forEach(loc => { if (loc.lat && loc.lng && loc.status !== 'blacklist') (loc.interests || []).forEach(i => usedInterests.add(i)); });
                const relevant = allInts.filter(i => {
                  const cfg = interestConfig[i.id] || {};
                  const aStatus = cfg.adminStatus || 'active';
                  if (aStatus === 'hidden') return false;
                  if (aStatus === 'draft' && !isUnlocked) return false;
                  if (!usedInterests.has(i.id)) return false;
                  // Only show interests that are enabled for this user
                  // user toggle removed — show all non-hidden
                  // Uncovered interests only shown if explicitly enabled
                  return true;
                });
                const areas = window.BKK.areaOptions || [];
                // Count per area
                const areaCounts = {};
                customLocations.forEach(loc => {
                  if (!loc.lat || !loc.lng || loc.status === 'blacklist') return;
                  (loc.areas || [loc.area]).filter(Boolean).forEach(a => { areaCounts[a] = (areaCounts[a] || 0) + 1; });
                });
                return (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                    onClick={() => { setShowFavMapFilter(false); setMapFavFilter(new Set(mapFavFilter)); /* force refresh */ }}>
                    <div style={{ width: '100%', maxWidth: '500px', maxHeight: 'calc(100% - 50px)', background: 'white', borderRadius: '16px 16px 0 0', boxShadow: '0 -8px 30px rgba(0,0,0,0.2)', overflow: 'hidden', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', display: 'flex', flexDirection: 'column' }}
                      onClick={e => e.stopPropagation()}>
                      {/* Filter header */}
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '15px' }}>🔍 {t('general.filter') || 'סינון מפה'}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { setMapFavFilter(new Set()); setMapFavArea(null); setMapFavRadius(null); setMapFocusPlace(null); }}
                            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontWeight: 'bold', color: '#6b7280' }}>{t('general.clearAll') || 'נקה הכל'}</button>
                          <button onClick={() => { setShowFavMapFilter(false); setMapFavFilter(new Set(mapFavFilter)); }}
                            style={{ fontSize: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1, minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
                        {/* 1. Place search — FIRST */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>🔎 {t('places.searchPlace') || 'חפש מקום'}</div>
                          {(() => {
                            const sd = window.BKK.systemParams?.includeDrafts !== false;
                            const searchable = customLocations.filter(l => l.lat && l.lng && l.status !== 'blacklist' && (sd || l.locked));
                            return (
                              <div>
                                <input
                                  type="text"
                                  placeholder={t('places.searchPlaceholder') || 'הקלד שם מקום...'}
                                  id="fav-map-place-search"
                                  onChange={e => {
                                    const q = e.target.value.trim().toLowerCase();
                                    const list = document.getElementById('fav-map-place-results');
                                    if (list) list.style.display = q.length >= 2 ? 'block' : 'none';
                                    if (list) {
                                      const items = list.querySelectorAll('[data-name]');
                                      items.forEach(item => {
                                        item.style.display = item.dataset.name.toLowerCase().includes(q) ? 'block' : 'none';
                                      });
                                    }
                                  }}
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', marginBottom: '4px' }}
                                />
                                <div id="fav-map-place-results" style={{ display: 'none', maxHeight: '130px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
                                  {searchable.map(loc => {
                                    const pi = (loc.interests || [])[0];
                                    const color = pi ? window.BKK.getInterestColor(pi, allInts) : '#9ca3af';
                                    return (
                                      <button key={loc.id || loc.name} data-name={loc.name}
                                        onClick={() => {
                                          setMapFocusPlace({ id: loc.id, lat: loc.lat, lng: loc.lng, name: loc.name });
                                          // If interest filter active and doesn't cover this place → clear it
                                          if (mapFavFilter.size > 0 && !mapFavFilter.has('__areas_only__') && !(loc.interests || []).some(i => mapFavFilter.has(i))) {
                                            setMapFavFilter(new Set());
                                          }
                                          // If area filter active and place is not in that area → open to whole city
                                          if (mapFavArea) {
                                            const locAreas = loc.areas || (loc.area ? [loc.area] : []);
                                            if (!locAreas.includes(mapFavArea)) {
                                              setMapFavArea(null);
                                            }
                                          }
                                          setShowFavMapFilter(false);
                                        }}
                                        style={{ display: 'block', width: '100%', textAlign: 'right', padding: '5px 10px', border: 'none', borderBottom: '1px solid #f3f4f6', background: 'none', cursor: 'pointer', fontSize: '12px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', marginLeft: '5px' }}></span>
                                        {loc.name}
                                        {loc.locked && <span style={{ fontSize: '9px', color: '#16a34a', marginRight: '4px' }}>✅</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                                {mapFocusPlace && (
                                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fbbf24' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', flex: 1 }}>📍 {mapFocusPlace.name}</span>
                                    <button onClick={() => { setMapFocusPlace(null); }}
                                      style={{ fontSize: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#92400e' }}>✕</button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        {/* 2. Area filter */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>📍 {t('general.areas')}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <button onClick={() => { setMapFavArea(null); setMapFavRadius(null); setMapFocusPlace(null); }}
                              style={{ padding: '4px 10px', borderRadius: '8px', border: !mapFavArea ? '2px solid #3b82f6' : '1px solid #d1d5db', background: !mapFavArea ? '#dbeafe' : 'white', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', color: !mapFavArea ? '#1e40af' : '#6b7280' }}>{t('general.allCity') || 'הכל'}</button>
                            {areas.map(a => {
                              const cnt = areaCounts[a.id] || 0;
                              const isSel = mapFavArea === a.id;
                              return (
                                <button key={a.id} onClick={() => { setMapFavArea(isSel ? null : a.id); setMapFavRadius(null); setMapFocusPlace(null); }}
                                  style={{ padding: '4px 8px', borderRadius: '8px', border: isSel ? '2px solid #3b82f6' : '1px solid #d1d5db', background: isSel ? '#dbeafe' : 'white', fontSize: '11px', fontWeight: isSel ? 'bold' : 'normal', cursor: 'pointer', color: isSel ? '#1e40af' : '#374151', opacity: cnt === 0 ? 0.4 : 1 }}>
                                  {tLabel(a)} <span style={{ fontSize: '9px', color: '#9ca3af' }}>({cnt})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* 3. Interest filter — grid like add-place dialog */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>🎨 {t('general.interests') || 'תחומים'}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            <button onClick={() => setMapFavFilter(new Set())}
                              style={{ padding: '8px 4px', borderRadius: '10px', border: mapFavFilter.size === 0 ? '2px solid #7c3aed' : '1.5px solid #e5e7eb', background: mapFavFilter.size === 0 ? '#ede9fe' : 'white', cursor: 'pointer', textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', marginBottom: '2px' }}>✨</div>
                              <div style={{ fontWeight: '700', fontSize: '10px', color: mapFavFilter.size === 0 ? '#6d28d9' : '#374151' }}>{t('general.all') || 'הכל'}</div>
                            </button>
                            <button onClick={() => setMapFavFilter(new Set(['__areas_only__']))}
                              style={{ padding: '8px 4px', borderRadius: '10px', border: mapFavFilter.has('__areas_only__') ? '2px solid #10b981' : '1.5px solid #e5e7eb', background: mapFavFilter.has('__areas_only__') ? '#ecfdf5' : 'white', cursor: 'pointer', textAlign: 'center' }}>
                              <div style={{ fontSize: '16px', marginBottom: '2px' }}>📍</div>
                              <div style={{ fontWeight: '700', fontSize: '9px', color: mapFavFilter.has('__areas_only__') ? '#065f46' : '#374151' }}>{t('wizard.areasOnly') || 'אזורים'}</div>
                            </button>
                            {relevant.map(int => {
                              const color = window.BKK.getInterestColor(int.id, allInts);
                              const isOn = mapFavFilter.size === 0 || mapFavFilter.has(int.id);
                              const iconRaw = int.icon || '';
                              const isImgIcon = iconRaw.startsWith('data:') || iconRaw.startsWith('http');
                              return (
                                <button key={int.id}
                                  onClick={() => {
                                    if (mapFavFilter.size === 0) { setMapFavFilter(new Set([int.id])); }
                                    else if (mapFavFilter.has(int.id) && mapFavFilter.size === 1) { setMapFavFilter(new Set()); }
                                    else if (mapFavFilter.has(int.id)) { const n = new Set(mapFavFilter); n.delete(int.id); setMapFavFilter(n); }
                                    else { setMapFavFilter(new Set([...mapFavFilter, int.id])); }
                                  }}
                                  style={{ padding: '8px 4px', borderRadius: '10px', border: isOn ? `2px solid ${color}` : '1.5px solid #e5e7eb', background: isOn ? color + '18' : 'white', cursor: 'pointer', textAlign: 'center', opacity: isOn ? 1 : 0.45 }}>
                                  <div style={{ fontSize: '16px', marginBottom: '2px', lineHeight: 1 }}>
                                    {isImgIcon ? <img src={iconRaw} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', display: 'inline' }} /> : iconRaw}
                                  </div>
                                  <div style={{ fontWeight: '700', fontSize: '9px', color: isOn ? color : '#374151', wordBreak: 'break-word', lineHeight: 1.2 }}>{tLabel(int)}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                                                {/* Color legend */}
                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>🎨 {t('general.legend') || 'מקרא צבעים'}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {relevant.map(int => {
                              const color = window.BKK.getInterestColor(int.id, allInts);
                              return (
                                <div key={int.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', border: '1px solid ' + color }}></span>
                                  <span style={{ color: '#6b7280' }}>{renderIcon(int.icon, '14px')} {tLabel(int)}</span>
                                </div>
                              );
                            })}
                            {isUnlocked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#9ca3af', display: 'inline-block', opacity: 0.5 }}></span>
                              <span style={{ color: '#9ca3af' }}>{t('places.draft') || 'טיוטה'} ({t('general.transparent') || 'שקוף'})</span>
                            </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
                              <span style={{ color: '#9ca3af' }}>📍 {t('form.currentLocation')}</span>
                            </div>
                          </div>
                        </div>
                        {/* Tip text */}
                        <div style={{ marginTop: '12px', padding: '8px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '10px', color: '#166534', lineHeight: 1.5 }}>
                            💡 <b>{t('general.tip') || 'טיפ'}:</b> {t('map.favTip') || 'ריכוז נקודות באזור מסוים מעיד שהאזור עשיר בתכנים. סנן לפי תחום כדי לראות במה מתאפיין כל אזור ולתכנן מסלול ממוקד.'}
                          </div>
                        </div>
                      </div>
                      {/* Sticky done button */}
                      <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', background: 'white', flexShrink: 0 }}>
                        <button
                          onClick={() => { setShowFavMapFilter(false); setMapFavFilter(new Set(mapFavFilter)); }}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: '#7c3aed', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                        >✓ {t('general.close') || 'סגור'}</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* GPS location button — floating */}
              {mapMode === 'favorites' && (
                <button
                  onClick={() => {
                    if (mapUserLocation) {
                      // Already have location — just center map on it
                      if (leafletMapRef?.current) {
                        leafletMapRef.current.setView([mapUserLocation.lat, mapUserLocation.lng], 15, { animate: true });
                      }
                      return;
                    }
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        pos => {
                          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
                          setMapUserLocation(loc);
                          // Center map on new location
                          if (leafletMapRef?.current) {
                            leafletMapRef.current.setView([loc.lat, loc.lng], 15, { animate: true });
                          }
                        },
                        () => showToast('📍 GPS unavailable', 'warning'),
                        { enableHighAccuracy: true, timeout: 8000 }
                      );
                    }
                  }}
                  style={{ position: 'absolute', bottom: mapBottomSheet ? '130px' : '16px', right: '12px', zIndex: 1000, padding: '8px 12px', borderRadius: '20px', background: mapUserLocation ? '#3b82f6' : 'white', color: mapUserLocation ? 'white' : '#374151', border: '2px solid ' + (mapUserLocation ? '#3b82f6' : '#d1d5db'), boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title={t('form.currentLocation')}
                >📍 {t('wizard.myLocation')}</button>
              )}
              {/* Bottom sheet — favorites mode marker info */}
              {mapMode === 'favorites' && mapBottomSheet && (() => {
                const loc = mapBottomSheet;
                const intLabels = (loc.interests || []).map(i => {
                  const opt = allInterestOptions.find(o => o.id === i);
                  return opt ? ((opt.icon?.startsWith?.('data:') ? '📍' : opt.icon) + ' ' + tLabel(opt)) : i;
                }).join(', ');
                const areaLabels = (loc.areas || [loc.area]).filter(Boolean).map(aId => {
                  const a = (window.BKK.areaOptions || []).find(o => o.id === aId);
                  return a ? tLabel(a) : aId;
                }).join(', ');
                const hasImg = loc.uploadedImage || (loc.imageUrls && loc.imageUrls.length > 0);
                const imgSrc = loc.uploadedImage || (loc.imageUrls ? loc.imageUrls[0] : null);
                const pk = (loc.name || '').replace(/[.#$/\\[\]]/g, '_');
                const ra = reviewAverages[pk];
                const addedByName = loc.addedBy ? (userNamesMap[loc.addedBy] || '') : '';
                return (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'white', borderTop: '3px solid #3b82f6', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.18)', padding: '14px 16px 12px', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', maxHeight: '55%', overflowY: 'auto' }}
                    onClick={e => e.stopPropagation()}>
                    {/* Drag handle */}
                    <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d1d5db', margin: '0 auto 10px' }}></div>
                    {/* Header: image + name + FouFou icon + X */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' }}>
                      {hasImg && (
                        <img src={imgSrc} alt=""
                          onClick={() => { setModalImage(imgSrc); setModalImageCtx({ description: loc.description, location: loc }); setShowImageModal(true); }}
                          style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', flexShrink: 0, border: '2px solid #e5e7eb' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Name row: DOM [FouFou][name][X] + direction:rtl → RTL: X(left)|name|FouFou(right) ✅ */}
                        <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setModalImage(loc.uploadedImage || '__placeholder__'); setModalImageCtx({ description: loc.description, location: loc }); setShowImageModal(true); }}
                            style={{ background: '#f5f3ff', border: '2px solid #c4b5fd', borderRadius: '8px', cursor: 'pointer', padding: '3px 6px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                            title={t('general.placeInfo') || 'פרטים'}
                          ><img src="icon-32x32.png" alt="FouFou" style={{ width: '18px', height: '18px' }} /></button>
                          <span style={{ flex: 1 }}>{loc.name}</span>
                          <button onClick={() => setMapBottomSheet(null)}
                            style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexShrink: 0 }}>✕</button>
                        </div>
                        {/* Interest labels */}
                        {intLabels && <div style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 600, marginBottom: '4px' }}>{intLabels}</div>}
                        {/* Ratings row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {loc.googleRating && (
                            <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>⭐ {loc.googleRating.toFixed?.(1) || loc.googleRating}{loc.googleRatingCount ? <span style={{ color: '#9ca3af', fontWeight: 400 }}> ({loc.googleRatingCount})</span> : null}</span>
                          )}
                          {ra ? (
                            <button onClick={() => openReviewDialog(loc)}
                              style={{ fontSize: '11px', color: '#7c3aed', background: '#f5f3ff', border: '1.5px solid #fcd34d', borderRadius: '6px', padding: '1px 6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              🌟 {ra.avg.toFixed(1)} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({ra.count})</span>
                            </button>
                          ) : (
                            <button onClick={() => openReviewDialog(loc)}
                              style={{ fontSize: '11px', color: '#7c3aed', background: '#f5f3ff', border: '1.5px solid #fcd34d', borderRadius: '6px', padding: '1px 6px', cursor: 'pointer', fontWeight: 'bold' }}>
                              🌟 {t('reviews.rate')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Description + Notes — auto-translated */}
                    {loc.description?.trim() && (
                      <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, marginBottom: '4px', whiteSpace: 'pre-line' }}>
                        <AutoTranslateText text={loc.description} translateText={translateText} detectNeedsTranslation={detectNeedsTranslation} />
                      </div>
                    )}
                    {loc.notes?.trim() && (
                      <div style={{ background: '#fffbeb', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#92400e', lineHeight: 1.5, marginBottom: '6px' }}>
                        <AutoTranslateText text={loc.notes} prefix="💭 " translateText={translateText} detectNeedsTranslation={detectNeedsTranslation} />
                      </div>
                    )}
                    {/* 2 action buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => { const u = window.BKK.getNavigateUrl(loc); if (u && u !== '#') window.open(u, '_blank'); }}
                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>🧭 {t('route.navigate') || 'נווט'}</button>
                      {(() => {
                        const googleViewUrl = window.BKK.getGoogleViewUrl(loc);
                        if (!googleViewUrl) return null;
                        const isCoordOnly = window.BKK.isCoordOnlyPlace(loc);
                        const btnLabel = isCoordOnly ? (t('general.openGooglePoint') || 'פתח נקודה בגוגל') : (t('general.openInGoogle') || 'פתח בגוגל');
                        return (
                          <a href={googleViewUrl} target="_blank" rel="noopener noreferrer"
                            onClick={() => window.BKK.logEvent?.('place_opened_google', { source: 'favorites' })}
                            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid #6ee7b7', background: '#ecfdf5', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', color: '#065f46', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >🔍 {btnLabel}</a>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Footer */}
            {mapMode !== 'favorites' && (
            <div className="border-t" style={{ background: mapMode === 'stops' ? '#f8fafc' : 'white' }}>
              {mapMode === 'stops' ? (
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Legend — interests selected by user in Step 1, plus manual stops if any */}
                  {(() => {
                    // Use route.preferences.interests = what user selected, NOT what stops happen to contain
                    const selectedIds = (route?.preferences?.interests || formData.interests || []).filter(id => id !== '_manual');
                    const legendItems = selectedIds.map(id => allInterestOptions.find(o => o.id === id)).filter(Boolean);
                    const hasManual = (mapStops || []).some(s => s.manuallyAdded || s.isRadiusCenter);
                    if (legendItems.length === 0 && !hasManual) return null;
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '6px 0', borderBottom: '1px solid #e5e7eb', marginBottom: '4px' }}>
                        {legendItems.map(int => {
                          const color = window.BKK.getInterestColor(int.id, allInterestOptions);
                          const iconRaw = int.icon || '';
                          const isImg = iconRaw.startsWith('data:');
                          return (
                            <div key={int.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#374151', padding: '2px 7px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e5e7eb' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }}></span>
                              {isImg
                                ? <img src={iconRaw} alt="" style={{ width: '13px', height: '13px', objectFit: 'contain' }} />
                                : <span style={{ fontSize: '12px', lineHeight: 1 }}>{iconRaw}</span>
                              }
                              <span style={{ fontWeight: '500' }}>{tLabel(int)}</span>
                            </div>
                          );
                        })}
                        {/* Manual stops legend entry — white circle + green border */}
                        {hasManual && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#374151', padding: '2px 7px', background: '#f0fdf4', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'white', border: '2px solid #22c55e', display: 'inline-block', flexShrink: 0 }}></span>
                            <span style={{ fontWeight: '500' }}>{currentLang === 'he' ? 'הוספו ידנית' : 'Added manually'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* Row 1: Route type toggle — auto-recomputes */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
                      <button 
                        onClick={() => {
                          setRouteType('linear');
                          routeTypeRef.current = 'linear'; // Update ref immediately
                          const result = recomputeForMap(null, 'linear', true);
                          if (result && window._mapStopsOrderRef) {
                            window._mapStopsOrderRef.current = result.optimized;
                          }
                          setTimeout(() => { if (window._mapRedrawLine) window._mapRedrawLine(); }, 100);
                        }}
                        style={{ padding: '8px 16px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                          background: routeType === 'linear' ? '#3b82f6' : 'white', color: routeType === 'linear' ? 'white' : '#6b7280'
                        }}
                      >↔ {t('route.linear')}</button>
                      <button 
                        onClick={() => {
                          setRouteType('circular');
                          routeTypeRef.current = 'circular'; // Update ref immediately
                          const result = recomputeForMap(null, 'circular', true);
                          if (result && window._mapStopsOrderRef) {
                            window._mapStopsOrderRef.current = result.optimized;
                          }
                          setTimeout(() => { if (window._mapRedrawLine) window._mapRedrawLine(); }, 100);
                        }}
                        style={{ padding: '8px 16px', border: 'none', borderLeft: '1px solid #d1d5db', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                          background: routeType === 'circular' ? '#3b82f6' : 'white', color: routeType === 'circular' ? 'white' : '#6b7280'
                        }}
                      >⭕ {t('route.circular')}</button>
                    </div>
                  </div>
                  {/* Hint + Close */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ flex: 1, fontSize: '9px', color: '#9ca3af', textAlign: 'center' }}>{t('route.tapStopForStart')}</span>
                    <button
                      onClick={() => { setShowMapModal(false); setMapUserLocation(null); setMapSkippedStops(new Set()); }}
                      style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: '#374151', color: 'white', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                    >{t('general.close')}</button>
                  </div>
                </div>
              ) : (
              <p className="text-[9px] text-gray-400 p-2 text-center">
                {mapMode === 'areas' 
                  ? `${(window.BKK.areaOptions || []).length} ${t('general.areas')}` 
                  : `${formData.radiusMeters}m - ${formData.radiusSource === 'gps' ? t('wizard.myLocation') : (formData.radiusPlaceName || t('form.currentLocation'))}`
                }
              </p>
              )}
            </div>
            )}
          </div>
        </div>
      )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* FILTER LOG — Floating Badge (טלפון + מחשב)             */}
        {/* ═══════════════════════════════════════════════════════ */}
        {debugMode && !showFilterPanel && (
          <button
            onClick={() => setShowFilterPanel(true)}
            style={{
              position: 'fixed', bottom: '140px', left: '12px', zIndex: 40,
              background: filterLog.length === 0 ? '#374151' :
                filterLog.some(e => e.passed.length === 0 && e.filtered.length === 0) ? '#b45309' : '#7c3aed',
              color: 'white', border: 'none', borderRadius: '20px',
              padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: '5px'
            }}
          >
            {filterLog.length === 0 ? '🔬 0 entries' : (
              filterLog.some(e => e.passed.length === 0 && e.filtered.length === 0)
                ? <>⚠️ {filterLog.reduce((s,e)=>s+e.passed.length,0)}✅ {filterLog.reduce((s,e)=>s+e.filtered.length,0)}❌ <span style={{fontSize:'9px'}}>גוגל 0</span></>
                : <>🔬 {filterLog.reduce((s,e)=>s+e.passed.length,0)}✅ {filterLog.reduce((s,e)=>s+e.filtered.length,0)}❌</>
            )}
          </button>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* FILTER LOG — Full Screen Panel                          */}
        {/* ═══════════════════════════════════════════════════════ */}
        {showFilterPanel && (() => {
          const mapsLink = (p) => {
            if (p.googlePlaceId) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.googlePlaceId}`;
            if (p.name && p.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.address)}`;
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}`;
          };
          const layerColor = {
            '❌ BLACKLIST':      { bg: '#fef2f2', border: '#fca5a5', badge: '#dc2626', text: 'Blacklist' },
            '❌ TYPE MISMATCH':  { bg: '#fff7ed', border: '#fdba74', badge: '#ea580c', text: 'Type' },
            '❌ NO MATCH':       { bg: '#fef9c3', border: '#fde047', badge: '#ca8a04', text: 'Text' },
            '❌ CLOSED':         { bg: '#f1f5f9', border: '#cbd5e1', badge: '#64748b', text: 'Closed' },
            '❌ TOO FAR':        { bg: '#f0fdf4', border: '#86efac', badge: '#16a34a', text: 'Distance' },
            '❌ TOO FEW RATINGS':{ bg: '#f5f3ff', border: '#c4b5fd', badge: '#7c3aed', text: 'Ratings' },
          };
          return (
            <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f8fafc' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#4c1d95', color: 'white', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>🔬 Filter Log</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>
                    {filterLog.length} interests · {filterLog.reduce((s,e) => s+e.passed.length,0)} עברו · {filterLog.reduce((s,e) => s+e.filtered.length,0)} סוּננו
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {(() => {
                    const buildText = () => {
                      const lines = ['=== FouFou Filter Log ===', new Date().toLocaleString('he-IL'), ''];
                      const calcScore = (p) => {
                        const googleScore = (p.rating || 0) * Math.log10((p.reviews || 0) + 1);
                        const base = window.BKK.systemParams?.favoriteBaseScore ?? 20;
                        const bonusPerStar = window.BKK.systemParams?.favoriteBonusPerStar ?? 5;
                        const penalty = window.BKK.systemParams?.favoriteLowRatingPenalty ?? 60;
                        const threshold = window.BKK.systemParams?.favoriteLowRatingThreshold ?? 2.5;
                        const isFav = p.isFavorite || p.custom || p.fetchMoreSource === 'custom'
                          || !!(customLocations||[]).find(cl => cl.name === p.name);
                        const pk = (p.name||'').replace(/[.#$/\\[\\]]/g,'_');
                        const ra = reviewAverages?.[pk];
                        const fouFouRating = ra?.count > 0 ? ra.avg : null;
                        let score, formula;
                        if (!isFav) {
                          score = googleScore;
                          formula = `G:${p.rating}×log(${p.reviews}+1)=${googleScore.toFixed(1)}`;
                        } else if (!fouFouRating) {
                          score = googleScore + base;
                          formula = `G:${googleScore.toFixed(1)} + base:${base} = ${score.toFixed(1)}`;
                        } else if (fouFouRating < threshold) {
                          score = googleScore + base - penalty;
                          formula = `G:${googleScore.toFixed(1)} + base:${base} - penalty:${penalty} = ${score.toFixed(1)}`;
                        } else {
                          score = googleScore + base + fouFouRating * bonusPerStar;
                          formula = `G:${googleScore.toFixed(1)} + base:${base} + FF:${fouFouRating.toFixed(1)}×${bonusPerStar} = ${score.toFixed(1)}`;
                        }
                        return { score, formula, isFav, fouFouRating };
                      };
                      filterLog.forEach(entry => {
                        lines.push(`--- ${entry.interestLabel} ---`);
                        lines.push(`${entry.searchType === 'text' ? '🔤' : '🏷️'} ${entry.searchType === 'text' ? entry.query : (entry.placeTypes || []).join(', ')}`);
                        lines.push(`${entry.fromGoogle || 0} from Google → ${entry.passed?.length || 0} passed · ${entry.filtered?.length || 0} filtered`);
                        if (entry.blacklist?.length) lines.push(`🚫 blacklist: ${entry.blacklist.join(', ')}`);
                        lines.push('');
                        (entry.passed || []).forEach((p, i) => {
                          const s = calcScore(p);
                          const favTag = s.isFav ? ' 📌' : '';
                          const ffTag = s.fouFouRating ? ` FF:${s.fouFouRating.toFixed(1)}` : '';
                          lines.push(`✅ #${i+1} ${p.name} ⭐${p.rating} (${p.reviews}) [${p.primaryType}]${favTag}${ffTag} | ${s.formula}`);
                        });
                        (entry.filtered || []).forEach(p => { lines.push(`❌ ${p.layer || p.status} | ${p.name} ⭐${p.rating} (${p.reviews}) | ${p.reason || ''}`); });
                        lines.push('');
                      });
                      return lines.join('\n');
                    };
                    const copyLog = () => navigator.clipboard?.writeText(buildText()).then(() => showToast('📋 Filter log copied!', 'success')).catch(() => showToast('⚠️ Copy failed', 'warning'));
                    const exportLog = () => { const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `filter-log-${new Date().toISOString().slice(0,10)}.txt`; a.click(); URL.revokeObjectURL(url); };
                    return (<><button onClick={copyLog} title="העתק ללוח" style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', background: '#7c3aed', border: 'none', color: 'white', cursor: 'pointer' }}>📋</button><button onClick={exportLog} title="ייצוא txt" style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', background: '#7c3aed', border: 'none', color: 'white', cursor: 'pointer' }}>⬇️</button></>);
                  })()}
                  <button onClick={() => { filterLogRef.current = []; setFilterLog([]); setShowFilterPanel(false); showToast('🔬 Filter log cleared', 'info'); }}
                    style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: '#7c3aed', border: 'none', color: 'white', cursor: 'pointer' }}>🗑️</button>
                  <button onClick={() => setShowFilterPanel(false)}
                    style={{ fontSize: '22px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px' }}>✕</button>
                </div>
              </div>

              {/* Legend */}
              <div style={{ padding: '6px 10px', background: '#ede9fe', borderBottom: '1px solid #c4b5fd', display: 'flex', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
                {Object.entries(layerColor).map(([k, v]) => (
                  <span key={k} style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '10px', background: v.badge, color: 'white', fontWeight: 'bold' }}>{v.text}</span>
                ))}
                <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '10px', background: '#059669', color: 'white', fontWeight: 'bold' }}>✅ Passed</span>
              </div>

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', direction: 'ltr' }}>
                {filterLog.map((entry, ei) => (
                  <div key={ei} style={{ marginBottom: '12px', background: 'white', borderRadius: '10px', border: `1px solid ${
                    entry.searchType === 'fetchMore' ? '#fde68a' :
                    entry.searchType === 'error' ? '#fca5a5' :
                    entry.searchType === 'internal' ? '#d1d5db' : '#e9d5ff'}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>

                    {/* Interest header */}
                    <div style={{ padding: '7px 12px', background:
                      entry.searchType === 'fetchMore' ? '#78350f' :
                      entry.searchType === 'error' ? '#991b1b' :
                      entry.searchType === 'internal' ? '#374151' : '#4c1d95',
                      color: 'white', fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>{entry.interestLabel}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {entry.searchType === 'fetchMore' ? (
                          <span>➕ {entry.passed.length} מקומות נוספו</span>
                        ) : entry.searchType === 'error' ? (
                          <>
                            <span>❌ {entry.requestDetails?.errorStatus ? `HTTP ${entry.requestDetails.errorStatus}` : 'שגיאה'}</span>
                            {entry.placeTypes?.length > 0 && <span>types: {entry.placeTypes.join(', ')}</span>}
                            {entry.query && <span>query: "{entry.query}"</span>}
                          </>
                        ) : entry.searchType === 'internal' ? (
                          <span>🏠 פנימי — ללא חיפוש גוגל</span>
                        ) : (
                          <>
                            <span>{entry.searchType === 'text' ? `🔤 "${entry.query}"` : `🏷️ category`}</span>
                            {entry.placeTypes?.length > 0 && <span>types: {entry.placeTypes.join(', ')}</span>}
                            <span>{entry.fromGoogle} from Google → {entry.passed.length} passed · {entry.filtered.length} filtered</span>
                          </>
                        )}
                      </div>
                      {entry.requestDetails?.rawBody && (
                        <details style={{ marginTop: '4px' }}>
                          <summary style={{ cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', userSelect: 'none' }}>📤 Raw Request Body</summary>
                          <pre style={{ marginTop: '3px', fontSize: '8px', background: 'rgba(0,0,0,0.4)', color: '#a5b4fc', padding: '6px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left', maxHeight: '200px' }}>{entry.requestDetails.rawBody}</pre>
          <button onClick={() => navigator.clipboard?.writeText(entry.requestDetails.rawBody).then(() => showToast('📋 Body הועתק!', 'success'))} style={{ marginTop: '2px', fontSize: '9px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>📋 העתק</button>
                        </details>
                      )}
                      {entry.blacklist?.length > 0 && (
                        <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.85 }}>
                          🚫 blacklist: <span style={{ fontFamily: 'monospace' }}>{entry.blacklist.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* PASSED list — also used for fetchMore added places */}
                    {entry.passed.length > 0 && (
                      <div>
                        <div style={{ padding: '4px 12px', background: entry.searchType === 'fetchMore' ? '#fef9c3' : '#dcfce7', fontSize: '10px', fontWeight: 'bold', color: entry.searchType === 'fetchMore' ? '#92400e' : '#166534', borderBottom: `1px solid ${entry.searchType === 'fetchMore' ? '#fde68a' : '#bbf7d0'}` }}>
                          {entry.searchType === 'fetchMore' ? `➕ נוספו (${entry.passed.length})` : `✅ עברו סינון (${entry.passed.length})`}
                        </div>
                        {entry.passed.map((p, pi) => {
                          const googleScore = (p.rating || 0) * Math.log10((p.reviews || 0) + 1);
                          const base = window.BKK.systemParams?.favoriteBaseScore ?? 20;
                          const bonusPerStar = window.BKK.systemParams?.favoriteBonusPerStar ?? 5;
                          const penalty = window.BKK.systemParams?.favoriteLowRatingPenalty ?? 60;
                          const threshold = window.BKK.systemParams?.favoriteLowRatingThreshold ?? 2.5;
                          const isFav = p.isFavorite || p.custom || p.fetchMoreSource === 'custom'
                            || !!(customLocations||[]).find(cl => cl.name === p.name);
                          const pk = (p.name||'').replace(/[.#$/\\[\\]]/g,'_');
                          const ra = reviewAverages?.[pk];
                          const fr = ra?.count > 0 ? ra.avg : null;
                          let score, formula;
                          if (!isFav) { score = googleScore; formula = `G:${googleScore.toFixed(1)}`; }
                          else if (!fr) { score = googleScore + base; formula = `G:${googleScore.toFixed(1)}+base:${base}`; }
                          else if (fr < threshold) { score = googleScore + base - penalty; formula = `G:${googleScore.toFixed(1)}+${base}-pen:${penalty}`; }
                          else { score = googleScore + base + fr * bonusPerStar; formula = `G:${googleScore.toFixed(1)}+${base}+FF:${fr.toFixed(1)}×${bonusPerStar}`; }
                          return (
                          <div key={pi} style={{ padding: '6px 12px', borderBottom: '1px solid #f0fdf4', fontSize: '11px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            {p.rank != null && <span style={{ color: '#6b7280', minWidth: '16px', fontSize: '10px' }}>#{p.rank}</span>}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <a href={mapsLink(p)} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'none' }}>{p.name} 🔗</a>
                                <span style={{ fontSize: '10px', background: isFav ? '#dbeafe' : '#f3f4f6', color: isFav ? '#1d4ed8' : '#6b7280', padding: '0 5px', borderRadius: '6px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                  {isFav ? '📌' : '🌐'} {score.toFixed(1)} <span style={{ fontWeight: 'normal', opacity: 0.7 }}>({formula})</span>
                                </span>
                              </div>
                              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span>⭐{p.rating} ({p.reviews})</span>
                                <span style={{ color: '#374151' }}>{p.primaryType}</span>
                                {p.fetchMoreSource && (
                                  <span style={{ background: p.fetchMoreSource === 'custom' ? '#dbeafe' : '#fef3c7', color: p.fetchMoreSource === 'custom' ? '#1d4ed8' : '#92400e', padding: '0 5px', borderRadius: '6px', fontWeight: 'bold', fontSize: '9px' }}>
                                    {p.fetchMoreSource === 'custom' ? '📌 custom' : p.fetchMoreSource === 'cache' ? '💾 cache' : '🌐 api'}
                                  </span>
                                )}
                                {p.matchedTypes?.length > 0 && (
                                  <span style={{ color: '#059669', fontWeight: 'bold' }}>match: {p.matchedTypes.join(', ')}</span>
                                )}
                                {p.nameKeywordMatch && (
                                  <span style={{ color: '#d97706', fontWeight: 'bold' }}>keyword: "{p.nameKeywordMatch}"</span>
                                )}
                                {p.openNow === true && <span style={{ color: '#059669' }}>🟢 פתוח</span>}
                                {p.openNow === false && <span style={{ color: '#dc2626' }}>🔴 סגור</span>}
                              </div>
                              {p.address && <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1px' }}>{p.address}</div>}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}

                    {/* FILTERED list */}
                    {entry.filtered.length > 0 && (
                      <div>
                        <div style={{ padding: '4px 12px', background: '#fef2f2', fontSize: '10px', fontWeight: 'bold', color: '#991b1b', borderBottom: '1px solid #fecaca', borderTop: entry.passed.length > 0 ? '2px solid #e5e7eb' : 'none' }}>
                          ❌ סוּננו ({entry.filtered.length})
                        </div>
                        {entry.filtered.map((p, pi) => {
                          const lc = layerColor[p.layer] || { bg: '#f9fafb', border: '#e5e7eb', badge: '#6b7280', text: p.layer };
                          return (
                            <div key={pi} style={{ padding: '6px 12px', borderBottom: '1px solid #fef2f2', fontSize: '11px', display: 'flex', gap: '8px', alignItems: 'flex-start', background: lc.bg }}>
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '8px', background: lc.badge, color: 'white', fontWeight: 'bold', marginTop: '1px', whiteSpace: 'nowrap' }}>{lc.text}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold' }}><a href={mapsLink(p)} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'none' }}>{p.name} 🔗</a></div>
                                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span>⭐{p.rating} ({p.reviews})</span>
                                  <span>{p.primaryType}</span>
                                </div>
                                {p.reason && (
                                  <div style={{ fontSize: '9px', color: lc.badge, marginTop: '2px', fontFamily: 'monospace' }}>{p.reason}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Empty state */}
                    {entry.passed.length === 0 && entry.filtered.length === 0 && (
                      <div style={{ padding: '10px 12px', background: entry.searchType === 'error' ? '#fef2f2' : entry.searchType === 'internal' ? '#f9fafb' : '#fef9c3', borderTop: `1px solid ${entry.searchType === 'error' ? '#fecaca' : entry.searchType === 'internal' ? '#e5e7eb' : '#fde68a'}` }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: entry.searchType === 'error' ? '#991b1b' : entry.searchType === 'internal' ? '#6b7280' : '#92400e', marginBottom: '6px' }}>
                          {entry.searchType === 'error' ? `❌ שגיאת API — HTTP ${entry.requestDetails?.errorStatus || '?'}` : entry.searchType === 'internal' ? '🏠 תחום פנימי — ללא חיפוש גוגל' : '⚠️ גוגל החזיר 0 תוצאות'}
                        </div>
                        {entry.requestDetails && entry.searchType !== 'internal' && (
                          <div style={{ fontSize: '10px', color: entry.searchType === 'error' ? '#7f1d1d' : '#78350f', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div>🔍 סוג: <strong>{entry.requestDetails.mode || '?'}</strong> | מיקום: <strong>{entry.requestDetails.locationMode || '?'}</strong></div>
                            {entry.requestDetails.query && <div>🔤 query: <strong>"{entry.requestDetails.query}"</strong></div>}
                            {entry.requestDetails.types?.length > 0 && <div>🏷️ types: <strong>{entry.requestDetails.types.join(', ')}</strong></div>}
                            {entry.requestDetails.center?.lat && <div>📍 מרכז: {entry.requestDetails.center.lat.toFixed(5)}, {entry.requestDetails.center.lng.toFixed(5)}</div>}
                            {entry.requestDetails.radius && <div>👉 רדיוס: <strong>{entry.requestDetails.radius}m</strong></div>}
                            {entry.searchType === 'error' && entry.requestDetails.errorText && (
                              <div style={{ color: '#b91c1c', wordBreak: 'break-word', marginTop: '2px', background: '#fef2f2', padding: '3px 6px', borderRadius: '4px' }}>
                                💬 {entry.requestDetails.errorText.slice(0, 200)}
                              </div>
                            )}
                            {entry.requestDetails.googleMapsUrl && (
                              <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button onClick={() => navigator.clipboard?.writeText(entry.requestDetails.googleMapsUrl).then(() => showToast('📋 URL הועתק!', 'success'))} style={{ fontSize: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>📋 העתק URL לגוגל</button>
                                <a href={entry.requestDetails.googleMapsUrl} target='_blank' rel='noreferrer' style={{ fontSize: '10px', background: '#10b981', color: 'white', borderRadius: '4px', padding: '3px 8px', textDecoration: 'none' }}>🔗 פתח בגוגל</a>
                              </div>
                            )}
                            {entry.searchType !== 'error' && <div style={{ marginTop: '4px', color: '#b45309' }}>גוגל לא מצא מקום מסוג זה בתוך הרדיוס.</div>}
                            {entry.requestDetails?.rawBody && (
                              <details style={{ marginTop: '6px' }}>
                                <summary style={{ cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', color: '#4338ca', userSelect: 'none' }}>📤 Raw Request Body</summary>
                                <pre style={{ marginTop: '4px', fontSize: '9px', background: '#1e1b4b', color: '#a5b4fc', padding: '8px', borderRadius: '6px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>{entry.requestDetails.rawBody}</pre>
                                <button onClick={() => navigator.clipboard?.writeText(entry.requestDetails.rawBody).then(() => showToast('📋 Body הועתק!', 'success'))} style={{ marginTop: '3px', fontSize: '9px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>📋 העתק</button>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {filterLog.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔬</div>
                    <div style={{ fontSize: '14px' }}>אין לוג סינון עדיין</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>צור מסלול עם debug mode פעיל</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Role badge removed — return to admin via hamburger menu */}

        {/* === CITY VISIBILITY DIALOG === */}
        {cityVisibilityInterest && (() => {
          // Look up fresh on every render to avoid stale label/icon
          const i = (customInterests || []).find(x => x.id === cityVisibilityInterest) 
                 || allInterestOptions?.find(x => x.id === cityVisibilityInterest)
                 || { id: cityVisibilityInterest, label: cityVisibilityInterest };
          const allCities = Object.values(window.BKK.cities || {});
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setCityVisibilityInterest(null)}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', minWidth: '260px', maxWidth: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    <span style={{ marginLeft: '6px' }}>{i.icon?.startsWith?.('data:') ? '' : (i.icon || '📍')}</span>
                    {tLabel(i) || i.label}
                  </div>
                  <button onClick={() => setCityVisibilityInterest(null)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>ניראות לפי עיר</div>
                {allCities.map(city => {
                  const isHidden = (cityHiddenInterests[city.id] || new Set()).has(i.id);
                  return (
                    <label key={city.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px', background: isHidden ? '#f9fafb' : '#f0fdf4', border: '1px solid', borderColor: isHidden ? '#e5e7eb' : '#bbf7d0' }}>
                      <input type="checkbox" checked={!isHidden}
                        onChange={() => toggleCityForInterest(i.id, city.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                      <span style={{ fontSize: '18px' }}>{city.icon?.startsWith?.('data:') ? '🏙️' : (city.icon || '🏙️')}</span>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{tLabel(city) || city.nameEn || city.id}</span>
                      <span style={{ marginRight: 'auto', fontSize: '11px', color: isHidden ? '#9ca3af' : '#16a34a' }}>{isHidden ? 'מוסתר' : 'גלוי'}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* === DIALOGS (from dialogs.js) === */}
