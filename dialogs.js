        {/* Dedup Confirmation Dialog */}
        {dedupConfirm && (() => {
          const { type, loc, match, pendingGooglePlace } = dedupConfirm;

          // ── Multi Google picker ──
          if (type === 'googleMulti') {
            const { matches: multiMatches } = dedupConfirm;
            return (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4" style={{ zIndex: 10400 }}>
                <div style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>🌐</div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t('dedup.googleMatchMulti') || 'מקומות קרובים בגוגל'}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{t('dedup.selectOrSkip') || 'בחר את המקום שצילמת, או דלג'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {multiMatches.map((m, idx) => (
                      <button key={idx} onClick={() => {
                        dedupConfirm._pickedMatch = m;
                        handleDedupConfirm('acceptGooglePick');
                      }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: '2px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left', width: '100%' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}>
                        <span style={{ fontSize: '20px', flexShrink: 0 }}>📍</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1f2937' }}>{m.name}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', display: 'flex', gap: '8px' }}>
                            <span>📏 {m._distance}m</span>
                            {m.rating > 0 && <span>⭐{m.rating.toFixed(1)} ({m.ratingCount})</span>}
                          </div>
                          {m.address && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.address}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { handleDedupConfirm('addNew'); }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {t('dedup.noneOfThese') || 'אף אחד מאלה — שמור כמקום חדש'}
                  </button>
                </div>
              </div>
            );
          }

          const interest = allInterestOptions.find(o => match.interests?.includes(o.id) || loc?.interests?.includes(o.id) || pendingGooglePlace?.interests?.includes(o.id));
          const icon = interest?.icon?.startsWith?.('data:') ? '📍' : (interest?.icon || '📍');
          const isFromGoogle = !!pendingGooglePlace; // came from addGooglePlaceToCustom
          return (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4" style={{ zIndex: 10400 }}>
            <div style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{isFromGoogle ? '⚠️' : (type === 'google' ? '🌐' : '📍')}</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937' }}>
                  {isFromGoogle ? t('dedup.customExists') : (type === 'google' ? t('dedup.googleMatch') : t('dedup.customExists'))}
                </div>
                {match._distance > 0 && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{match._distance}m</div>}
              </div>

              {isFromGoogle ? (
                /* Two-sided comparison: existing custom vs incoming Google */
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {/* Existing custom location */}
                  <div style={{ flex: 1, background: '#fefce8', border: '2px solid #eab308', borderRadius: '12px', padding: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e', marginBottom: '6px' }}>📍 {t('dedup.inYourList')}</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>{match.name}</div>
                    {match.googleRating && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>⭐ {match.googleRating?.toFixed?.(1) || match.googleRating}</div>}
                    {match.address && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{match.address}</div>}
                    {!match.googlePlaceId && <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>⚠️ {t('dedup.noGoogleId')}</div>}
                  </div>
                  {/* Incoming Google place */}
                  <div style={{ flex: 1, background: '#f0f9ff', border: '2px solid #0ea5e9', borderRadius: '12px', padding: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#0369a1', marginBottom: '6px' }}>🌐 {t('dedup.fromGoogle')}</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>{pendingGooglePlace.name}</div>
                    {pendingGooglePlace.rating && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>⭐ {pendingGooglePlace.rating?.toFixed?.(1) || pendingGooglePlace.rating} ({pendingGooglePlace.ratingCount || 0})</div>}
                    {pendingGooglePlace.address && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{pendingGooglePlace.address}</div>}
                  </div>
                </div>
              ) : (
                /* Original single-card display for camera flow */
                <div style={{ background: '#fefce8', border: '2px solid #eab308', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
                  {type === 'custom' && match.uploadedImage && (
                    <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden', maxHeight: '140px' }}>
                      <img src={match.uploadedImage} alt={match.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#374151' }}>{match.name}</div>
                      {type === 'google' && match.rating && (
                        <div style={{ fontSize: '11px', color: '#92400e' }}>⭐ {match.rating.toFixed(1)} ({match.ratingCount || 0})</div>
                      )}
                      {match.address && <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{match.address}</div>}
                      {type === 'custom' && match.description && (
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>{match.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isFromGoogle ? (
                  <>
                    <button onClick={() => handleDedupConfirm('accept')}
                      style={{ width: '100%', padding: '11px', fontSize: '13px', fontWeight: 'bold', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '10px', cursor: 'pointer' }}>
                      📍 {t('dedup.openExisting')}
                    </button>
                    <button onClick={() => handleDedupConfirm('updateWithGoogle')}
                      style={{ width: '100%', padding: '11px', fontSize: '13px', fontWeight: 'bold', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                      🔄 {t('dedup.updateWithGoogle')}
                    </button>
                    <button onClick={() => handleDedupConfirm('addNew')}
                      style={{ width: '100%', padding: '11px', fontSize: '13px', fontWeight: 'bold', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                      ➕ {t('dedup.addAsNew')}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleDedupConfirm('accept')}
                      style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                      ✅ {type === 'google' ? t('dedup.useThis') : t('dedup.alreadyExists')}
                    </button>
                    <button onClick={() => handleDedupConfirm('addNew')}
                      style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                      ➕ {t('dedup.addAsNew')}
                    </button>
                  </>
                )}
                <button onClick={() => handleDedupConfirm('cancel')}
                  style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 'bold', background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '10px', cursor: 'pointer' }}>
                  ✕ {t('general.cancel')}
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Add/Edit Location Dialog - REDESIGNED */}
        {(showAddLocationDialog || showEditLocationDialog) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2" style={{ zIndex: 10100 }}>
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl">
              
              {/* Header - Compact */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {showEditLocationDialog && editNavList && editNavList.length > 1 && (() => {
                    // Filter nav list to current city only, find by id (not name — names can duplicate)
                    const cityNavList = editNavList.filter(l => (l.cityId || 'bangkok') === selectedCityId);
                    const idx = cityNavList.findIndex(l => l.id === (editingLocation && editingLocation.id));
                    // Always get fresh data from customLocations to reflect recent updates
                    const getFresh = (navItem) => customLocations.find(l => l.id === navItem.id) || navItem;
                    return idx >= 0 ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditLocation(getFresh(cityNavList[(idx - 1 + cityNavList.length) % cityNavList.length]), cityNavList)}
                          style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >◀</button>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>{idx + 1}/{cityNavList.length}</span>
                        <button onClick={() => handleEditLocation(getFresh(cityNavList[(idx + 1) % cityNavList.length]), cityNavList)}
                          style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >▶</button>
                      </div>
                    ) : null;
                  })()}
                  <h3 className="text-base font-bold">
                    {showEditLocationDialog ? t('places.editPlace') : t('places.addPlace')}
                  </h3>
                  <button
                    onClick={() => showHelpFor('addLocation')}
                    className="bg-white text-purple-600 hover:bg-purple-100 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow"
                    title={t("general.help")}
                  >
                    ?
                  </button>
                </div>
                <button
                  onClick={() => {
                    // Warn if edit dialog has unsaved changes
                    if (showEditLocationDialog && locationHasChanges()) {
                      showConfirm(
                        t('places.unsavedChangesWarning') || 'יש שינויים שלא נשמרו. לצאת בלי לשמור?',
                        () => {
                          setShowEditLocationDialog(false);
                          setEditingLocation(null);
                          setNewLocation({ name: '', description: '', notes: '', area: formData.area, interests: [], lat: null, lng: null, mapsUrl: '', address: '', uploadedImage: null, imageUrls: [] });
                        }
                      );
                      return;
                    }
                    setShowAddLocationDialog(false);
                    setShowEditLocationDialog(false);
                    setEditingLocation(null);
                    setNewLocation({ 
                      name: '', description: '', notes: '', area: formData.area, interests: [], 
                      lat: null, lng: null, mapsUrl: '', address: '', uploadedImage: null, imageUrls: []
                    });
                  }}
                  className="text-xl hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              
              {/* Content - Scrollable - COMPACT */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                <div style={{ position: 'relative' }}>
                
                {/* Row 1: Name + Area */}
                <div className="space-y-2">
                  {/* Name - full width, buttons below */}
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      {t("places.placeName")} <span className="text-red-500">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input type="text"
                          value={newLocation.name || ''}
                          onChange={(e) => {
                            setNewLocation({...newLocation, name: e.target.value});
                            setLocationSearchResults(null);
                            if (e.target.value.trim()) {
                              const exists = customLocations.find(loc =>
                                loc.name.toLowerCase() === e.target.value.trim().toLowerCase() &&
                                (!editingLocation || loc.id !== editingLocation.id)
                              );
                              if (exists) showToast(t('places.nameExists'), 'warning');
                            }
                          }}
                          placeholder={isRecording && recordingField === 'location_name' ? '' : (t('places.namePlaceholderEn') || 'הקלד/הקלט שם מקום באנגלית...')}
                          className="w-full p-2 border-2 border-purple-300 rounded-lg focus:border-purple-500"
                          style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', fontSize: '16px', width: '100%', boxSizing: 'border-box', borderColor: isRecording && recordingField === 'location_name' ? '#ef4444' : undefined, paddingRight: window.BKK.i18n.isRTL() ? '24px' : '8px', paddingLeft: window.BKK.i18n.isRTL() ? '8px' : '24px' }}
                          autoFocus={false}
                        />
                        {newLocation.name && (
                          <button type="button" onClick={() => { setNewLocation({...newLocation, name: ''}); setLocationSearchResults(null); }}
                            style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [window.BKK.i18n.isRTL() ? 'right' : 'left']: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '13px', lineHeight: 1, padding: '2px' }}>✕</button>
                        )}
                      </div>
                      {window.BKK?.speechSupported && (
                        <button type="button"
                          onClick={() => toggleRecording('location_name',
                            (text) => setNewLocation(prev => ({...prev, name: (prev.name ? prev.name + ' ' : '') + text})),
                            () => { setNewLocation(prev => ({...prev, name: ''})); setLocationSearchResults(null); },
                            'en-US'
                          )}
                          style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: isRecording && recordingField === 'location_name' ? '#ef4444' : '#f3f4f6', color: isRecording && recordingField === 'location_name' ? 'white' : '#6b7280', animation: isRecording && recordingField === 'location_name' ? 'pulse 1s ease-in-out infinite' : 'none', boxShadow: isRecording && recordingField === 'location_name' ? '0 0 0 3px rgba(239,68,68,0.3)' : 'none' }}
                          title={isRecording && recordingField === 'location_name' ? t('speech.stopRecording') : t('speech.startRecording')}>
                          {isRecording && recordingField === 'location_name' ? '⏹️' : '🎤'}
                        </button>
                      )}
                    </div>
                    {isRecording && recordingField === 'location_name' && interimText && (
                      <div style={{ marginTop: '4px', padding: '4px 8px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#92400e', fontStyle: 'italic', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>🎤 {interimText}</div>
                    )}
                    {isUnlocked && showEditLocationDialog && (
                      <button type="button"
                        onClick={() => setNewLocation({...newLocation, dedupOk: !newLocation.dedupOk})}
                        className={`mt-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${newLocation.dedupOk ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 bg-white text-gray-400'}`}
                        title="Duplicate OK"
                      >{newLocation.dedupOk ? '✓✓' : '✓'}</button>
                    )}
                    {(() => {
                      const isOwnP = !editingLocation?.addedBy || editingLocation.addedBy === authUser?.uid;
                      const canSearchEdit = !showEditLocationDialog || isAdmin || isEditor || (isOwnP && !editingLocation?.locked);
                      return canSearchEdit ? (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <button
                            onClick={() => searchPlacesByName(newLocation.name)}
                            disabled={!newLocation.name?.trim()}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${newLocation.name?.trim() ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                          >🔍 {t("form.searchPlaceGoogle")}</button>
                        </div>
                      ) : null;
                    })()}
                    {/* Search Results Dropdown */}
                    {locationSearchResults !== null && (
                      <div style={{ marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', background: 'white' }}>
                        {locationSearchResults.length === 0 ? (
                          <p style={{ textAlign: 'center', padding: '8px', color: '#9ca3af', fontSize: '11px' }}>{t("general.searching")}...</p>
                        ) : locationSearchResults.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              // Auto-detect areas from coordinates
                              const detected = window.BKK.getAreasForCoordinates(result.lat, result.lng);
                              const areaUpdates = detected.length > 0 ? { areas: detected, area: detected[0] } : {};
                              const updatedLoc = {
                                ...newLocation,
                                name: result.name,
                                lat: result.lat, lng: result.lng,
                                address: result.address,
                                googlePlaceId: result.googlePlaceId,
                                googlePlace: true,
                                ...areaUpdates
                              };
                              updatedLoc.mapsUrl = window.BKK.getGoogleMapsUrl(updatedLoc);
                              // Apply rating from search result immediately
                              if (result.rating) {
                                updatedLoc.googleRating = result.rating;
                                updatedLoc.googleRatingCount = result.ratingCount || 0;
                              }
                              setNewLocation(updatedLoc);
                              setLocationSearchResults(null);
                              showToast(`✅ ${result.name} ${t("toast.selectedPlace")}${detected.length > 0 ? ` (${detected.length} ${t("toast.detectedAreas")})` : ''}`, 'success');
                            }}
                            style={{ width: '100%', textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left', padding: '6px 10px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: 'none', border: 'none', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}
                            onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.style.background = 'none'}
                          >
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937' }}>{result.name}</div>
                            <div style={{ fontSize: '10px', color: '#6b7280' }}>{result.address}{result.rating ? ` ⭐ ${result.rating}` : ''}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Areas - full width multi-select */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold">{t("general.areas")}</label>
                      {isUnlocked && newLocation.lat && newLocation.lng && (
                        <button
                          type="button"
                          onClick={() => {
                            const detected = window.BKK.getAreasForCoordinates(newLocation.lat, newLocation.lng);
                            if (detected.length > 0) {
                              setNewLocation({...newLocation, areas: detected, area: detected[0], outsideArea: false});
                              showToast(`📍 ${(t('toast.detectedAreas') || '{count} אזורים זוהו').replace('{count}', detected.length)}`, 'success');
                            } else {
                              showToast('⚠️ לא נמצא אזור לקואורדינטות', 'warning');
                            }
                          }}
                          style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#dbeafe', border: '1px solid #93c5fd', color: '#1e40af', cursor: 'pointer', fontWeight: 'bold' }}
                        >📍 זהה אזור</button>
                      )}
                      {newLocation.lat && newLocation.lng && (
                        <button
                          type="button"
                          onClick={() => {
                            const locAreas = newLocation.areas || (newLocation.area ? [newLocation.area] : []);
                            setMapReturnPlace(editingLocation || null);
                            setShowEditLocationDialog(false);
                            setMapMode('favorites');
                            setMapFavRadius(null);
                            setMapFavArea(locAreas[0] || null);
                            setMapFocusPlace({ id: editingLocation?.id, lat: newLocation.lat, lng: newLocation.lng, name: newLocation.name });
                            setMapFavFilter(new Set());
                            setMapBottomSheet(null);
                            setShowMapModal(true);
                          }}
                          style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: '#f3e8ff', border: '1px solid #c084fc', color: '#7c3aed', cursor: 'pointer', fontWeight: 'bold' }}
                        >🗺️ {t('wizard.showMap') || 'מפה'}</button>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-1 p-1.5 bg-gray-50 rounded-lg overflow-y-auto border-2 border-gray-300" style={{ maxHeight: '120px' }}>
                      {areaOptions.map(area => {
                        const isSelected = (newLocation.areas || [newLocation.area]).includes(area.id);
                        return (
                          <button
                            key={area.id}
                            onClick={() => {
                              const current = newLocation.areas || (newLocation.area ? [newLocation.area] : []);
                              const updated = current.includes(area.id)
                                ? current.filter(a => a !== area.id)
                                : [...current, area.id];
                              if (updated.length === 0) return;
                              setNewLocation({...newLocation, areas: updated, area: updated[0]});
                            }}
                            className={`p-1 rounded text-[8px] font-bold transition-all text-center ${
                              isSelected
                                ? 'bg-purple-500 text-white shadow-md'
                                : 'bg-white text-gray-500 hover:bg-gray-100'
                            }`}
                            style={{ lineHeight: '1.1' }}
                          >
                            <div>{tLabel(area)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Interests - Compact Grid */}
                <div>
                  <label className="block text-xs font-bold mb-1">{t("general.interestsHeader")}</label>
                  <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-50 rounded-lg">
                    {allInterestOptions.map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          const current = newLocation.interests || [];
                          const isAdding = !current.includes(option.id);
                          const updatedInterests = isAdding
                            ? [...current, option.id]
                            : current.filter(i => i !== option.id);
                          
                          const updates = { ...newLocation, interests: updatedInterests };
                          
                          // Auto-generate name when first interest selected and name is empty
                          if (isAdding && !newLocation.name.trim()) {
                            // Use lat/lng from current state (may have been set by camera/GPS)
                            const lat = newLocation.lat;
                            const lng = newLocation.lng;
                            const result = window.BKK.generateLocationName(
                              option.id, lat, lng,
                              interestCounters, allInterestOptions, areaOptions
                            );
                            if (result.name) {
                              updates.name = result.name;
                              // Auto-detect areas too if not already set
                              if (lat && lng && (!newLocation.areas || newLocation.areas.length === 0 || (newLocation.areas.length === 1 && newLocation.areas[0] === formData.area))) {
                                const detected = window.BKK.getAreasForCoordinates(lat, lng);
                                if (detected.length > 0) {
                                  updates.areas = detected;
                                  updates.area = detected[0];
                                }
                              }
                            }
                          }
                          
                          setNewLocation(updates);
                        }}
                        className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          (newLocation.interests || []).includes(option.id)
                            ? 'bg-purple-500 text-white shadow-md'
                            : 'bg-white border border-gray-300 hover:border-purple-300'
                        }`}
                        title={tLabel(option)}
                      >
                        <span className="text-2xl block" style={{ lineHeight: 1.2 }}>{option.icon?.startsWith?.('data:') ? <img src={option.icon} alt="" className="w-7 h-7 object-contain mx-auto" /> : option.icon}</span>
                        <span className="text-[8px] block truncate leading-tight mt-0.5">{tLabel(option)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image - with Camera & EXIF GPS */}
                <div>
                  <label className="block text-xs font-bold mb-1">{`📷 ${t("general.image")}`}</label>
                  {newLocation.uploadedImage ? (
                    <div className="relative">
                      <img 
                        src={newLocation.uploadedImage} 
                        alt="Preview"
                        className="w-full object-contain rounded-lg border-2 border-purple-300 cursor-pointer hover:opacity-90"
                        style={{ maxHeight: '280px', background: '#111', display: 'block' }}
                        onClick={() => {
                          setModalImage(newLocation.uploadedImage);
                          setModalImageCtx({ description: newLocation.description });
                          setShowImageModal(true);
                        }}
                      />
                      <button
                        onClick={() => setNewLocation({...newLocation, uploadedImage: null})}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {/* Camera button */}
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await window.BKK.openCamera();
                          if (!result) return;
                          const compressed = await window.BKK.compressImage(result.dataUrl);
                          setNewLocation(prev => ({...prev, uploadedImage: compressed}));
                          const locName = newLocation.label?.en || newLocation.label?.he || 'photo';
                          const safeName = locName.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_').slice(0, 30);
                          window.BKK.saveImageToDevice(result.dataUrl, `foufou_${safeName}_${Date.now()}.jpg`);
                          const gps = await window.BKK.extractGpsFromImage(result.file);
                          if (gps && (!newLocation.lat || !newLocation.lng)) {
                            const updates = { uploadedImage: compressed, lat: gps.lat, lng: gps.lng };
                            const detected = window.BKK.getAreasForCoordinates(gps.lat, gps.lng);
                            if (detected.length > 0) {
                              updates.areas = detected;
                              updates.area = detected[0];
                            }
                            setNewLocation(prev => ({...prev, ...updates}));
                            showToast('📍 ' + t('general.gpsExtracted'), 'success');
                          }
                        }}
                        className="flex-1 p-3 border-2 border-dashed border-green-400 rounded-lg text-center cursor-pointer hover:bg-green-50"
                      >
                        <span className="text-2xl">📸</span>
                        <div className="text-xs text-green-700 mt-1 font-bold">{t('general.takePhoto')}</div>
                      </button>
                      {/* Gallery upload */}
                      <label className="flex-1 p-3 border-2 border-dashed border-purple-300 rounded-lg text-center cursor-pointer hover:bg-purple-50 block">
                        <span className="text-2xl">🖼️</span>
                        <div className="text-xs text-gray-600 mt-1">{t("general.clickToUpload")}</div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async () => {
                              // Gallery upload: DO NOT extract EXIF GPS.
                              // Android/iOS strip GPS from images when saved to gallery — always returns 0,0.
                              const compressed = await window.BKK.compressImage(reader.result);
                              setNewLocation(prev => ({...prev, uploadedImage: compressed}));
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Description + Notes */}
                <div className="space-y-1.5">
                  <div>
                    <label className="block text-xs font-bold mb-1">{`📝 ${t("places.description")}`}</label>
                    {RecordingTextarea({
                      fieldId: 'loc_description',
                      value: newLocation.description || '',
                      onChange: (e) => setNewLocation(prev => ({...prev, description: e.target.value})),
                      onClear: () => setNewLocation(prev => ({...prev, description: ''})),
                      placeholder: t('places.description'),
                      rows: 4,
                      className: 'w-full p-2 border-2 border-gray-300 rounded-lg focus:border-purple-500'
                    })}
                    {RecordingInterim({ fieldId: 'loc_description' })}
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">{`💭 ${t("places.notes")}`}</label>
                    {RecordingTextarea({
                      fieldId: 'loc_notes',
                      value: newLocation.notes || '',
                      onChange: (e) => setNewLocation(prev => ({...prev, notes: e.target.value})),
                      onClear: () => setNewLocation(prev => ({...prev, notes: ''})),
                      placeholder: t('places.notesPlaceholder') || t('places.notes'),
                      rows: 2,
                      className: 'w-full p-2 border border-gray-300 rounded-lg focus:border-purple-500'
                    })}
                    {RecordingInterim({ fieldId: 'loc_notes' })}
                  </div>
                  {/* ADD mode: big star rating (like QuickCapture) */}
                  {showAddLocationDialog && (
                    <div style={{ background: "#fefce8", borderRadius: "12px", padding: "12px", border: "1px solid #fde68a" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#92400e", marginBottom: "8px", textAlign: window.BKK.i18n.isRTL() ? "right" : "left" }}>
                        {`⭐ ${t("reviews.rate")} (${t("general.optional")})`}
                      </label>
                      {newLocation.googleRating && (
                        <div style={{ fontSize: "12px", color: "#b45309", fontWeight: 600, marginBottom: "6px" }}>
                          🔍 Google: ⭐ {newLocation.googleRating.toFixed?.(1) || newLocation.googleRating}{newLocation.googleRatingCount ? <span style={{color:"#9ca3af",fontWeight:400}}> ({newLocation.googleRatingCount})</span> : null}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "4px", marginBottom: addLocRatingScore > 0 ? "8px" : "0" }}>
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button" onClick={() => setAddLocRatingScore(addLocRatingScore === n ? 0 : n)}
                            style={{ fontSize: "26px", background: "none", border: "none", cursor: "pointer", opacity: n <= addLocRatingScore ? 1 : 0.25, lineHeight: 1, padding: "0 2px" }}>⭐</button>
                        ))}
                      </div>
                      {addLocRatingScore > 0 && (
                        <div style={{ position: "relative" }}>
                          <textarea
                            value={addLocRatingText}
                            onChange={e => setAddLocRatingText(e.target.value)}
                            rows={2}
                            placeholder={t("reviews.writeReview")}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:border-yellow-400"
                            style={{ direction: window.BKK.i18n.isRTL() ? "rtl" : "ltr", fontSize: "14px", resize: "vertical", width: "100%", boxSizing: "border-box" }}
                          />
                          {addLocRatingText.trim() && (
                            <button type="button" onClick={() => setAddLocRatingText("")}
                              style={{ position: "absolute", top: "6px", [window.BKK.i18n.isRTL() ? "right" : "left"]: "6px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px" }}>✕</button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* EDIT mode: compact Google + FouFou rating row */}
                  {showEditLocationDialog && (() => {
                    const pk = (newLocation.name || "").replace(/[.#$/\[\]]/g, "_");
                    const ra = reviewAverages[pk];
                    const gR = newLocation.googleRating;
                    return (
                      <div style={{ padding: "4px 0" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap", whiteSpace: "nowrap" }}>
                          {gR && (
                            <span style={{ fontSize: "12px", color: "#b45309", fontWeight: 600 }}>⭐ {gR.toFixed?.(1) || gR}{newLocation.googleRatingCount ? <span style={{color:"#9ca3af",fontWeight:400}}> ({newLocation.googleRatingCount})</span> : null}</span>
                          )}
                          <button
                            onClick={async () => {
                              const existing = customLocations.find(l => l.firebaseId === editingLocation?.firebaseId) || customLocations.find(l => l.name === newLocation.name);
                              if (existing) { refreshSingleGoogleRating(existing); }
                              else if (newLocation.googlePlaceId || newLocation.name) {
                                refreshSingleGoogleRating({ ...newLocation, firebaseId: null, _inPlace: true }, (updated) => {
                                  setNewLocation(prev => ({ ...prev, googleRating: updated.googleRating, googleRatingCount: updated.googleRatingCount }));
                                });
                              }
                            }}
                            style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: "#92400e", fontWeight: 700, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: "3px" }}
                            title={t("settings.refreshRatings") || "רענן דירוג גוגל"}
                          >⭐ {t("settings.refreshRatings") || "רענן"}</button>
                          {gR && ra && <span style={{ color: "#d1d5db", fontSize: "12px" }}>·</span>}
                          {ra ? (
                            <button
                              onClick={() => { const existing = customLocations.find(l => l.name === newLocation.name); if (existing) { openReviewDialog(existing); } else { showToast(t("places.enterNameFirst") || "יש להזין שם ותחום קודם", "warning"); } }}
                              style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "#7c3aed", fontWeight: 700, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >🌟 {ra.avg.toFixed(1)} ({ra.count}) <span style={{ fontSize: "14px" }}>›</span></button>
                          ) : (
                            <button
                              onClick={() => { const existing = customLocations.find(l => l.name === newLocation.name); if (existing) { openReviewDialog(existing); } else { showToast(t("places.enterNameFirst") || "יש להזין שם ותחום קודם", "warning"); } }}
                              style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "#6b7280", padding: "2px 8px" }}
                            >☆ {t("reviews.rate") || "דרג"}</button>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                </div>

                {/* ── "פרטים נוספים" collapsible ── */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setNewLocation(prev => ({ ...prev, _detailsOpen: !prev._detailsOpen }))}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>📋 {t("places.moreDetails") || "פרטים נוספים"}</span>
                    <span style={{ fontSize: '10px' }}>{newLocation._detailsOpen ? "▲" : "▼"}</span>
                  </button>
                  {newLocation._detailsOpen && (
                    <div style={{ padding: '8px 12px', background: 'white' }} className="space-y-2">

                      {/* Address */}
                      <div className="bg-blue-50 border border-blue-300 rounded-lg p-2">
                        <div className="mb-1.5">
                          <label className="block text-xs font-bold mb-1">{`🏠 ${t("places.address")}`}</label>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input type="text" value={newLocation.address || ''} onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
                              placeholder={t("places.address")} className="flex-1 p-1.5 border border-gray-300 rounded-lg focus:border-purple-500"
                              style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', fontSize: '16px' }} />
                            <button onClick={() => geocodeAddress(newLocation.address || newLocation.name)}
                              disabled={!newLocation.address?.trim() && !newLocation.name?.trim()}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: (newLocation.address?.trim() || newLocation.name?.trim()) ? 'pointer' : 'not-allowed', background: (newLocation.address?.trim() || newLocation.name?.trim()) ? '#8b5cf6' : '#d1d5db', color: 'white', fontSize: '14px', flexShrink: 0 }}
                              title={t("form.searchByAddress")}>🏠</button>
                          </div>
                        </div>
                        <label className="block text-xs font-bold mb-1">{`📍 ${t("general.coordinates")}`}</label>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                          <input type="number" step="0.000001" value={newLocation.lng || ''} onChange={(e) => setNewLocation({...newLocation, lng: parseFloat(e.target.value) || null})}
                            placeholder="Lng" className="p-1.5 text-xs border border-gray-300 rounded-lg" style={{ flex: 1, minWidth: 0 }} />
                          <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>⇄</span>
                          <input type="number" step="0.000001" value={newLocation.lat || ''} onChange={(e) => setNewLocation({...newLocation, lat: parseFloat(e.target.value) || null})}
                            placeholder="Lat" className="p-1.5 text-xs border border-gray-300 rounded-lg" style={{ flex: 1, minWidth: 0 }} />
                          <button onClick={getCurrentLocation}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#22c55e', color: 'white', fontSize: '14px', flexShrink: 0 }}
                            title={t("form.gps")}>📍</button>
                        </div>
                      </div>

                      {/* Google Maps URL */}
                      {isUnlocked && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label className="block text-xs font-bold">🔗 Google Maps URL</label>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {newLocation.mapsUrl && (
                                <button type="button" onClick={() => { navigator.clipboard?.writeText(newLocation.mapsUrl).then(() => showToast('📋 URL הועתק', 'success')).catch(() => {}); }}
                                  style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer' }}>📋 {t('general.copy') || 'העתק'}</button>
                              )}
                              {isUnlocked && newLocation.mapsUrl && (
                                <button type="button" onClick={() => setNewLocation({...newLocation, mapsUrl: ''})}
                                  style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer' }} title="מחק URL">✕</button>
                              )}
                            </div>
                          </div>
                          <textarea value={newLocation.mapsUrl || ''} onChange={(e) => setNewLocation({...newLocation, mapsUrl: e.target.value})}
                            placeholder="https://maps.google.com/..."
                            className="w-full p-1.5 border border-gray-300 rounded-lg"
                            style={{ direction: 'ltr', fontSize: '13px', minHeight: '56px', resize: 'vertical', wordBreak: 'break-all', fontFamily: 'monospace' }} rows={2} />
                        </div>
                      )}

                      {/* Edit-mode only: Google Info + Lock + Skip + Metadata */}
                      {showEditLocationDialog && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1.5" style={{ position: 'relative', zIndex: 15 }}>
                          {/* Row 1: Google Info + Lock toggle */}
                          {(isAdmin || isEditor) && (
                            <div className="flex gap-1.5 items-center">
                              <button onClick={() => { setGooglePlaceInfo(null); fetchGooglePlaceInfo(newLocation); }}
                                disabled={!newLocation.name?.trim() || loadingGoogleInfo}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${newLocation.name?.trim() && !loadingGoogleInfo ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                              >🔍 {loadingGoogleInfo ? '...' : t('places.googleInfo')}</button>
                              <button type="button" onClick={() => setNewLocation({...newLocation, locked: !newLocation.locked})}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${newLocation.locked ? 'border-green-600 bg-green-600 text-white' : 'border-amber-300 bg-amber-50 text-amber-600'}`}
                                title={newLocation.locked ? t('places.approved') || 'מאושר' : t('places.draft') || 'טיוטה'}
                              >{newLocation.locked ? '🔒' : '✏️'}</button>
                            </div>
                          )}
                          {googlePlaceInfo && !googlePlaceInfo.notFound && (
                            <div className="text-xs space-y-1 bg-white rounded p-2 border border-indigo-200" style={{ direction: 'ltr' }}>
                              <div><span className="font-bold text-indigo-700">Found:</span><span className="ml-1">{googlePlaceInfo.name}</span></div>
                              <div><span className="font-bold text-indigo-700">Primary Type:</span><span className="ml-1 bg-indigo-200 px-2 py-0.5 rounded">{googlePlaceInfo.primaryType || googlePlaceInfo.primaryTypeDisplayName || 'N/A'}</span></div>
                              <div><span className="font-bold text-indigo-700">All Types:</span>
                                <div className="flex flex-wrap gap-1 mt-1">{googlePlaceInfo.types.map((type, idx) => (<span key={idx} className="bg-gray-200 px-2 py-0.5 rounded text-[10px]">{type}</span>))}</div>
                              </div>
                              <div><span className="font-bold text-indigo-700">Rating:</span><span className="ml-1">⭐ {googlePlaceInfo.rating?.toFixed(1) || 'N/A'} ({googlePlaceInfo.ratingCount || 0})</span></div>
                            </div>
                          )}
                          {googlePlaceInfo && googlePlaceInfo.notFound && (
                            <div className="text-xs text-red-600 bg-white rounded p-2 border border-red-200">❌ Place not found on Google for: "{googlePlaceInfo.searchQuery}"</div>
                          )}
                          {/* Metadata */}
                          {editingLocation && (editingLocation.addedBy || editingLocation.addedAt) && (
                            <div style={{ fontSize: '10px', color: '#9ca3af', padding: '4px 0', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {editingLocation.addedBy && <span>👤 {userNamesMap[editingLocation.addedBy] || editingLocation.addedBy.slice(0,8)}</span>}
                              {editingLocation.addedAt && <span title={t('places.addedAt') || 'נוסף'}>📅 {new Date(editingLocation.addedAt).toLocaleDateString()}</span>}
                              {editingLocation.updatedAt && editingLocation.updatedAt !== editingLocation.addedAt && (
                                <span title={t('places.updatedAt') || 'עודכן'}>✏️ {new Date(editingLocation.updatedAt).toLocaleDateString()}</span>
                              )}
                              {editingLocation.fromGoogle && <span>🔍 Google</span>}
                              {(isAdmin || isEditor) && editingLocation.googlePlaceId && (
                                <span title="googlePlaceId — לחץ להעתקה"
                                  onClick={() => navigator.clipboard?.writeText(editingLocation.googlePlaceId).then(() => showToast('📋 Place ID הועתק', 'success')).catch(() => {})}
                                  style={{ cursor: 'pointer', color: '#6366f1', fontFamily: 'monospace', fontSize: '9px', background: '#eef2ff', padding: '1px 4px', borderRadius: '4px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >🆔 {editingLocation.googlePlaceId.slice(0, 20)}…</span>
                              )}
                              {(isAdmin || isEditor) && editingLocation.googlePlaceId && (
                                <button title="מחק googlePlaceId"
                                  onClick={() => { showConfirm('למחוק את ה-Place ID של גוגל מהמקום הזה?\nהמקום ייהפך לנקודת קואורדינטות בלבד.',
                                    () => { setNewLocation(prev => ({ ...prev, googlePlaceId: '' })); if (editingLocation.firebaseId && isFirebaseAvailable && database) { removeLocationGooglePlaceId(selectedCityId, editingLocation.firebaseId); setCustomLocations(prev => prev.map(l => l.id === editingLocation.id ? { ...l, googlePlaceId: '' } : l)); showToast('✅ Place ID נמחק', 'success'); } }, { confirmLabel: 'מחק', confirmColor: '#ef4444' }); }}
                                  style={{ cursor: 'pointer', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }}
                                >✕ ID</button>
                              )}
                              {/* Skip / Restore — inline with metadata */}
                              {((isAdmin || isEditor) || (!editingLocation.locked && editingLocation.userId && editingLocation.userId === authUser?.uid)) && (
                                editingLocation.status === 'blacklist' ? (
                                  <button onClick={() => { toggleLocationStatus(editingLocation.id); setShowEditLocationDialog(false); setEditingLocation(null); }}
                                    style={{ padding: '1px 7px', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #86efac', background: '#f0fdf4', color: '#166534', whiteSpace: 'nowrap' }}
                                  >↩ {t("general.restoreActive")}</button>
                                ) : (
                                  <button onClick={() => { toggleLocationStatus(editingLocation.id); setShowEditLocationDialog(false); setEditingLocation(null); }}
                                    style={{ padding: '1px 7px', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #fdba74', background: '#fff7ed', color: '#ea580c', whiteSpace: 'nowrap' }}
                                  >🚫 {t("route.skipPermanently")}</button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* Open in Google — always visible in edit mode. Delete — only for owners/admins */}
                {showEditLocationDialog && editingLocation && (
                  <div style={{ display: 'flex', gap: '6px', paddingTop: '4px' }}>
                    {newLocation.lat && newLocation.lng ? (() => {
                      const isCoordOnly = window.BKK.isCoordOnlyPlace(newLocation);
                      const viewUrl = window.BKK.getGoogleViewUrl(newLocation) || window.BKK.getGoogleMapsUrl(newLocation);
                      const btnLabel = isCoordOnly ? (t('general.openPointInGoogle') || 'פתח נקודה בגוגל') : t('general.openInGoogle');
                      return (
                        <a href={viewUrl} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 3, padding: '6px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', background: '#22c55e', color: 'white', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none' }}
                          onClick={() => { window.BKK.logEvent?.('place_opened_google', { source: 'edit_dialog' }); }}
                        >🗺️ {btnLabel}</a>
                      );
                    })() : (
                      <button disabled style={{ flex: 3, padding: '6px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', background: '#d1d5db', color: '#9ca3af', cursor: 'not-allowed', border: 'none' }}>
                        🗺️ {t("general.openInGoogleNoCoords")}
                      </button>
                    )}
                    {(() => {
                      const isOwnDel = !editingLocation?.addedBy || editingLocation.addedBy === authUser?.uid;
                      const canDelete = isAdmin || isEditor || (isOwnDel && !editingLocation?.locked);
                      return canDelete ? (
                        <button
                          onClick={() => { showConfirm(`${t("general.deletePlace")} "${editingLocation.name}"?`, () => { deleteCustomLocation(editingLocation.id); setShowEditLocationDialog(false); setEditingLocation(null); }); }}
                          style={{ flex: 1, padding: '6px 4px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', textAlign: 'center' }}
                        >🗑️</button>
                      ) : null;
                    })()}
                  </div>
                )}

                </div>{/* close inner wrapper */}

              </div>
              
              {/* Footer */}
              {(() => {
                const isOwnPlace = !editingLocation?.addedBy || editingLocation.addedBy === authUser?.uid;
                // Admin and Editor can edit any place (including locked ones from other users)
                // Regular users can only edit their own non-locked places
                const canEdit = isAdmin || isEditor || (isOwnPlace && !editingLocation?.locked);
                return (
              <div className="px-4 py-2.5 border-t border-gray-200 flex gap-2" style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
                {!canEdit ? (
                  <>
                    <div className="flex-1 py-2.5 px-3 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1">
                      🔒 {t("general.readOnly")}
                    </div>
                  </>
                ) : (
                <>
                {/* Save only — stays open */}
                <button
                  onClick={() => {
                    if (showEditLocationDialog) {
                      updateCustomLocation(false);
                    } else {
                      saveWithDedupCheck(false, false, null);
                    }
                  }}
                  disabled={!newLocation.name?.trim()}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    newLocation.name?.trim()
                      ? 'bg-purple-300 text-white hover:bg-purple-400'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {showEditLocationDialog ? t('general.update') : t('general.add')}
                </button>
                {/* Save and close */}
                <button
                  onClick={() => {
                    if (showEditLocationDialog) {
                      updateCustomLocation(true);
                    } else {
                      saveWithDedupCheck(true);
                    }
                  }}
                  disabled={!newLocation.name?.trim()}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    newLocation.name?.trim()
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {showEditLocationDialog ? t('general.updateAndQuit') : t('general.addAndQuit')}
                </button>
                </>
                )}
                <button
                  onClick={() => {
                    setShowAddLocationDialog(false);
                    setShowEditLocationDialog(false);
                    setEditingLocation(null);
                    setNewLocation({ 
                      name: '', description: '', notes: '', area: formData.area, areas: [formData.area], interests: [], 
                      lat: null, lng: null, mapsUrl: '', address: '', uploadedImage: null, imageUrls: []
                    });
                  }}
                  className="px-5 py-2.5 rounded-lg bg-gray-400 text-white text-sm font-bold hover:bg-gray-500"
                >
                  {`✕ ${t("general.cancel")}`}
                </button>
              </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* Unified Interest Dialog - Add / Edit / Config */}
        {showAddInterestDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">{editingCustomInterest ? `${newInterest.icon?.startsWith?.('data:') ? '' : newInterest.icon} ${newInterest.label}` : t('interests.addInterest')}</h3>
                  <button
                    onClick={() => showHelpFor('addInterest')}
                    className="bg-white text-purple-600 hover:bg-purple-100 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow"
                    title={t("general.help")}
                  >?</button>
                </div>
                <button
                  onClick={() => {
                    const hasChanges = editingCustomInterest
                      ? newInterest.label?.trim() !== (editingCustomInterest.label || '')
                        || newInterest.icon !== (editingCustomInterest.icon || '📍')
                      : !!(newInterest.label?.trim());
                    if (hasChanges) {
                      showConfirm(
                        t('places.unsavedChangesWarning') || 'יש שינויים שלא נשמרו. לצאת בלי לשמור?',
                        () => {
                          setShowAddInterestDialog(false);
                          setInterestDialogReadOnly(false);
                          setNewInterest({ label: '', labelEn: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', privateOnly: true, locked: false, scope: 'global', category: 'attraction', weight: 3, minStops: 1, maxStops: 10, routeSlot: 'any', minGap: 1, bestTime: 'anytime', dedupRelated: [] });
                          setEditingCustomInterest(null);
                        },
                        { confirmLabel: t('general.exit') || 'צא', confirmColor: '#6b7280' }
                      );
                    } else {
                      setShowAddInterestDialog(false);
                      setInterestDialogReadOnly(false);
                      setNewInterest({ label: '', labelEn: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', privateOnly: true, locked: false, scope: 'global', category: 'attraction', weight: 3, minStops: 1, maxStops: 10, routeSlot: 'any', minGap: 1, bestTime: 'anytime', dedupRelated: [] });
                      setEditingCustomInterest(null);
                    }
                  }}
                  className="text-xl hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center"
                >✕</button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={interestDialogReadOnly ? { pointerEvents: 'none', userSelect: 'text' } : {}}>
                {interestDialogReadOnly && (
                  <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👁️ {t('general.viewOnly')}
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                {/* Name + Icon row */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3">
                    <label className="block text-xs font-bold mb-1">{t("interests.interestName")} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={newInterest.label}
                      onChange={(e) => setNewInterest({...newInterest, label: e.target.value})}
                      placeholder={t("interests.exampleTypes")}
                      className="w-full p-2 border-2 border-purple-300 rounded-lg focus:border-purple-500"
                      style={{ direction: 'rtl', fontSize: '16px' }}
                      
                      autoFocus={!editingCustomInterest}
                    />
                    <div className="flex items-center gap-1 mt-1" style={{ minWidth: 0 }}>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">🇬🇧</span>
                      <input
                        type="text"
                        value={newInterest.labelEn || ''}
                        onChange={(e) => setNewInterest({...newInterest, labelEn: e.target.value})}
                        placeholder={t("interests.englishName")}
                        className="flex-1 p-1.5 border border-gray-300 rounded-lg focus:border-purple-500"
                        style={{ direction: 'ltr', fontSize: '14px', minWidth: 0 }}
                        
                      />
                    </div>
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <label className="block text-xs font-bold mb-1">{t("general.icon")}</label>
                    {newInterest.icon && newInterest.icon.startsWith('data:') ? (
                      <div className="relative">
                        <img src={newInterest.icon} alt="icon" className="w-full h-10 object-contain rounded-lg border-2 border-gray-300 bg-white" />
                        <button
                          onClick={() => setNewInterest({...newInterest, icon: '📍'})}
                          className="absolute -top-1 -right-1 bg-gray-600 text-white rounded-full w-3.5 h-3.5 text-[8px] font-bold flex items-center justify-center leading-none"
                        >✕</button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={newInterest.icon}
                        onChange={(e) => {
                          const firstEmoji = [...e.target.value][0] || '';
                          setNewInterest({...newInterest, icon: firstEmoji});
                        }}
                        placeholder="📍"
                        className="w-full p-2 text-xl border-2 border-gray-300 rounded-lg text-center"
                        
                      />
                    )}
                    {isEditor && (
                      <label className="block w-full mt-1 p-1 border border-dashed border-gray-300 rounded text-center cursor-pointer hover:bg-gray-50 text-[9px] text-gray-500">
                        📁 File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await window.BKK.compressIcon(file, 64, 2);
                              if (compressed) {
                                setNewInterest({...newInterest, icon: compressed});
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                    {isEditor && (
                      <button
                        onClick={() => setIconPickerConfig({ description: newInterest.label || '', callback: (emoji) => setNewInterest(prev => ({...prev, icon: emoji})), suggestions: [], loading: false })}
                        className="block w-full mt-1 p-1 border border-dashed border-orange-300 rounded text-center cursor-pointer hover:bg-orange-50 text-[9px] text-orange-600 font-bold"
                      >✨ {t('emoji.suggest')}</button>
                    )}
                  </div>
                </div>
                {/* Color override for map markers + delete — admin/editor only */}
                {isUnlocked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'nowrap' }}>
                    {/* Delete — first in row */}
                    {editingCustomInterest && isEditor && (() => {
                      const inUseCount = customLocations.filter(loc => (loc.interests || []).includes(editingCustomInterest?.id)).length;
                      const canDelete = isAdmin || inUseCount === 0;
                      return canDelete ? (
                        <button
                          onClick={() => {
                            if (newInterest.builtIn) {
                              const msg = `${t('interests.deleteBuiltIn')} "${newInterest.label}"?`;
                              showConfirm(msg, () => {
                                if (isFirebaseAvailable && database) removeInterestConfig(editingCustomInterest.id);
                                showToast(t('interests.builtInRemoved'), 'success');
                                setShowAddInterestDialog(false); setEditingCustomInterest(null);
                              }, { confirmLabel: t('general.delete') || 'מחק', confirmColor: '#ef4444' });
                            } else {
                              showConfirm(`מחק "${newInterest.label}"?`, () => {
                                setShowAddInterestDialog(false); setEditingCustomInterest(null);
                                deleteCustomInterest(editingCustomInterest.id);
                              }, { confirmLabel: t('general.delete') || 'מחק', confirmColor: '#ef4444' });
                            }
                          }}
                          style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                        >{t("general.deleteInterest") || 'מחק תחום'}</button>
                      ) : <span style={{ fontSize: '9px', color: '#9ca3af', flexShrink: 0 }} title={`${inUseCount} places`}>🔗{inUseCount}</span>;
                    })()}
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', whiteSpace: 'nowrap' }}>{t('interests.mapColor') || 'צבע:'}</span>
                    <input
                      type="color"
                      value={newInterest.color || window.BKK.getInterestColor(newInterest.id || '', allInterestOptions || [])}
                      onChange={e => setNewInterest({...newInterest, color: e.target.value})}
                      style={{ width: '28px', height: '22px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                    />
                    {newInterest.color && (
                      <button onClick={() => setNewInterest({...newInterest, color: ''})}
                        style={{ fontSize: '9px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                    )}
                    {newInterest.id && (
                      <button
                        onClick={() => {
                          setShowAddInterestDialog(false);
                          setMapMode('favorites');
                          setMapFavRadius(null);
                          setMapFavArea(null);
                          setMapFocusPlace(null);
                          setMapFavFilter(new Set([newInterest.id]));
                          setMapBottomSheet(null);
                          setMapReturnPlace(null);
                          setShowMapModal(true);
                        }}
                        style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px', background: '#f3e8ff', border: '1px solid #c084fc', color: '#7c3aed', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}
                      >🗺️</button>
                    )}
                  </div>
                )}
                </div>{/* close inner wrapper */}


                {/* Group — dropdown from interestGroups (managed in Settings > Interest Groups) */}
                {isUnlocked && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600">📂 קיבוץ:</span>
                    <select
                      value={newInterest.group || ''}
                      onChange={(e) => setNewInterest({...newInterest, group: e.target.value})}
                      className="p-1 text-xs border rounded flex-1"
                    >
                      <option value="">— ללא קיבוץ —</option>
                      {Object.keys(interestGroups || {}).sort().map(gId => {
                        const gData = interestGroups[gId] || {};
                        const uiLang = window.BKK.i18n?.lang?.() || 'he';
                        const label = uiLang === 'he' ? (gData.labelHe || gId) : (gData.labelEn || gId);
                        return <option key={gId} value={gId}>{label}</option>;
                      })}
                    </select>
                  </div>
                </div>
                )}

                {/* Search Configuration — with manual toggle at top */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                  <label className="block text-xs font-bold mb-2 text-blue-800">{`🔍 ${t("general.searchSettings")}`}</label>
                  
                  {/* Manual/Google toggle */}
                  <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid #bfdbfe' }}>
                    <button type="button"
                      onClick={() => setNewInterest({...newInterest, noGoogleSearch: !newInterest.noGoogleSearch, privateOnly: false})}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all cursor-pointer ${
                        newInterest.noGoogleSearch ? 'border-gray-500 bg-gray-500 text-white shadow-md'
                        : 'border-green-500 bg-green-500 text-white shadow-md'
                      }`}
                    >
                      {newInterest.noGoogleSearch ? '🏠' : '🌐'}
                      {newInterest.noGoogleSearch ? 'פנימי' : t("interests.searchesGoogle")}
                    </button>
                    <span className="text-[9px] text-gray-500">
                      {newInterest.noGoogleSearch ? 'ללא חיפוש גוגל — תיוג ידני בלבד' : t("interests.searchesGoogle")}
                    </span>
                  </div>
                  
                  <div style={{ opacity: (newInterest.privateOnly || newInterest.noGoogleSearch) ? 0.3 : 1, pointerEvents: (newInterest.privateOnly || newInterest.noGoogleSearch) ? 'none' : 'auto' }}>
                  
                  <div className="mb-2">
                    <label className="block text-[10px] text-gray-600 mb-1" style={{ direction: 'ltr' }}>{`${t("general.searchMode")}:`}</label>
                    <select
                      value={newInterest.searchMode || 'types'}
                      onChange={(e) => setNewInterest({...newInterest, searchMode: e.target.value})}
                      className="w-full p-1.5 text-sm border rounded"
                      style={{ direction: 'ltr' }}
                    >
                      <option value="types">{t('interests.categorySearch')}</option>
                      <option value="text">{t('interests.textSearch')}</option>
                    </select>
                  </div>
                  
                  {newInterest.searchMode === 'text' ? (
                    <div className="mb-3">
                      <label className="block text-[10px] text-gray-600 mb-1" style={{ direction: 'ltr' }}>{`${t('interests.textQuery')}:`}</label>
                      <textarea
                        value={newInterest.textSearch || ''}
                        onChange={(e) => setNewInterest({...newInterest, textSearch: e.target.value})}
                        placeholder="e.g., street art, wine bar"
                        className="w-full p-2 text-sm border rounded"
                        style={{ direction: 'ltr', minHeight: '50px', fontSize: '14px', resize: 'vertical' }}
                        rows={2}
                      />
                      <p className="text-[9px] text-gray-500 mt-0.5" style={{ direction: 'ltr' }}>
                        Searches: "[query] [area] {window.BKK.cityNameForSearch || 'City'}"
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="block text-[10px] text-gray-600 mb-1" style={{ direction: 'ltr' }}>{`${t('interests.placeTypes')}:`}</label>
                      <textarea
                        value={newInterest.types || ''}
                        onChange={(e) => setNewInterest({...newInterest, types: e.target.value})}
                        placeholder="e.g., movie_theater, museum, art_gallery"
                        className="w-full p-2 text-sm border rounded"
                        style={{ direction: 'ltr', minHeight: '50px', fontSize: '14px', resize: 'vertical' }}
                        rows={2}
                      />
                      <p className="text-[9px] text-gray-500 mt-0.5" style={{ direction: 'ltr' }}>
                        <a href="https://developers.google.com/maps/documentation/places/web-service/place-types" target="_blank" className="text-blue-500 underline">{t('interests.seeTypesList')}</a>
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1" style={{ direction: 'ltr' }}>{`${t('interests.blacklistWords')}:`}</label>
                    <textarea
                      value={newInterest.blacklist || ''}
                      onChange={(e) => setNewInterest({...newInterest, blacklist: e.target.value})}
                      placeholder="e.g., cannabis, massage, tattoo, hostel"
                      className="w-full p-2 text-sm border rounded"
                      style={{ direction: 'ltr', minHeight: '40px', fontSize: '14px', resize: 'vertical' }}
                      rows={2}
                    />
                    <p className="text-[9px] text-gray-500 mt-0.5" style={{ direction: 'ltr' }}>
                      Places with these words in name will be filtered out
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1" style={{ direction: 'ltr' }}>Name keywords (include by name):</label>
                    <textarea
                      value={newInterest.nameKeywords || ''}
                      onChange={(e) => setNewInterest({...newInterest, nameKeywords: e.target.value})}
                      placeholder="e.g., graffiti, mural, street art"
                      className="w-full p-2 text-sm border rounded"
                      style={{ direction: 'ltr', minHeight: '40px', fontSize: '14px', resize: 'vertical' }}
                      rows={2}
                    />
                    <p className="text-[9px] text-gray-500 mt-0.5" style={{ direction: 'ltr' }}>
                      Places with these words in name pass type filter even without matching type
                    </p>
                  </div>
                  </div>
                </div>

                {/* Rating count thresholds — admin/editor only */}
                {(isAdmin || isEditor) && (
                <div style={{ background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: '10px', padding: '10px', marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#854d0e', marginBottom: '8px' }}>
                    ⭐ {window.BKK.i18n.currentLang === 'en' ? 'Rating count thresholds' : 'סף מספר דירוגים'} ({window.BKK.i18n.currentLang === 'en' ? 'leave empty = system default' : 'ריק = ברירת מחדל מערכת'})
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: '#92400e', marginBottom: '3px' }}>
                        {window.BKK.i18n.currentLang === 'en' ? 'Min ratings' : 'מינ׳ דירוגים'}
                      </label>
                      <input
                        type="number" min="0" max="10000"
                        value={newInterest.minRatingCount ?? ''}
                        onChange={(e) => setNewInterest({...newInterest, minRatingCount: e.target.value === '' ? null : parseInt(e.target.value)})}
                        placeholder={`default: ${sp.googleMinRatingCount ?? 20}`}
                        className="w-full p-1.5 border border-yellow-300 rounded text-sm"
                        style={{ direction: 'ltr', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10px', color: '#92400e', marginBottom: '3px' }}>
                        {window.BKK.i18n.currentLang === 'en' ? 'Low ratings' : 'דירוגים נמוכים'}
                      </label>
                      <input
                        type="number" min="0" max="10000"
                        value={newInterest.lowRatingCount ?? ''}
                        onChange={(e) => setNewInterest({...newInterest, lowRatingCount: e.target.value === '' ? null : parseInt(e.target.value)})}
                        placeholder={`default: ${sp.googleLowRatingCount ?? 60}`}
                        className="w-full p-1.5 border border-yellow-300 rounded text-sm"
                        style={{ direction: 'ltr', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Route planning config — spacious layout */}
                <div style={{ background: '#faf5ff', border: '2px solid #e9d5ff', borderRadius: '12px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '10px' }}>{'🗺️ ' + t('interests.routePlanning')}</label>
                  
                  {/* Category */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>{t('interests.category')}:</label>
                    <select
                      value={newInterest.category || 'attraction'}
                      onChange={(e) => {
                        const cat = e.target.value;
                        const defaults = {
                          attraction: { weight: 3, minStops: 1, maxStops: 10, routeSlot: 'any', minGap: 1, bestTime: 'day' },
                          break:      { weight: 1, minStops: 1, maxStops: 2, routeSlot: 'bookend', minGap: 3, bestTime: 'anytime' },
                          meal:       { weight: 1, minStops: 1, maxStops: 2, routeSlot: 'middle', minGap: 3, bestTime: 'anytime' },
                          experience: { weight: 1, minStops: 1, maxStops: 3, routeSlot: 'any', minGap: 1, bestTime: 'anytime' },
                          shopping:   { weight: 2, minStops: 1, maxStops: 5, routeSlot: 'early', minGap: 2, bestTime: 'day' },
                          nature:     { weight: 2, minStops: 1, maxStops: 5, routeSlot: 'early', minGap: 1, bestTime: 'day' }
                        };
                        const d = defaults[cat] || defaults.attraction;
                        setNewInterest({...newInterest, category: cat, weight: d.weight, minStops: d.minStops, maxStops: d.maxStops, routeSlot: d.routeSlot, minGap: d.minGap, bestTime: d.bestTime});
                      }}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' }}
                    >
                      <option value="attraction">{t('interests.catAttraction')}</option>
                      <option value="break">{t('interests.catBreak')}</option>
                      <option value="meal">{t('interests.catMeal')}</option>
                      <option value="experience">{t('interests.catExperience')}</option>
                      <option value="shopping">{t('interests.catShopping')}</option>
                      <option value="nature">{t('interests.catNature')}</option>
                    </select>
                  </div>
                  
                  {/* Best Time + Route Slot — side by side */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>{t('interests.bestTime')}:</label>
                      <select
                        value={newInterest.bestTime || 'anytime'}
                        onChange={(e) => setNewInterest({...newInterest, bestTime: e.target.value})}
                        style={{ width: '100%', padding: '7px 8px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' }}
                      >
                        <option value="anytime">{t('interests.timeAnytime')}</option>
                        <option value="day">{t('interests.timeDay')}</option>
                        <option value="night">{t('interests.timeNight')}</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', fontWeight: '600', marginBottom: '4px' }}>{t('interests.routeSlot')}:</label>
                      <select
                        value={newInterest.routeSlot || 'any'}
                        onChange={(e) => setNewInterest({...newInterest, routeSlot: e.target.value})}
                        style={{ width: '100%', padding: '7px 8px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white' }}
                      >
                        <option value="any">{t('interests.slotAny')}</option>
                        <option value="bookend">{t('interests.slotBookend')}</option>
                        <option value="early">{t('interests.slotEarly')}</option>
                        <option value="middle">{t('interests.slotMiddle')}</option>
                        <option value="late">{t('interests.slotLate')}</option>
                        <option value="end">{t('interests.slotEnd')}</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Weight + Min — side by side */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    {[
                      { label: t('interests.weight'), key: 'weight', val: newInterest.weight || 2, min: 1, max: 5 },
                      { label: t('interests.minStops'), key: 'minStops', val: newInterest.minStops != null ? newInterest.minStops : 1, min: 0, max: 10 }
                    ].map(item => (
                      <div key={item.key} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '8px', padding: '6px 10px', border: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button type="button" onClick={() => setNewInterest({...newInterest, [item.key]: Math.max(item.min, item.val - 1)})}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#e5e7eb', color: '#374151', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >−</button>
                          <span style={{ width: '20px', textAlign: 'center', fontSize: '15px', fontWeight: 'bold' }}>{item.val}</span>
                          <button type="button" onClick={() => setNewInterest({...newInterest, [item.key]: Math.min(item.max, item.val + 1)})}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#e5e7eb', color: '#374151', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Max + Gap — side by side */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                      { label: t('interests.maxStopsLabel'), key: 'maxStops', val: newInterest.maxStops || 10, min: 1, max: 15 },
                      { label: t('interests.minGap'), key: 'minGap', val: newInterest.minGap || 1, min: 1, max: 5 }
                    ].map(item => (
                      <div key={item.key} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '8px', padding: '6px 10px', border: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button type="button" onClick={() => setNewInterest({...newInterest, [item.key]: Math.max(item.min, item.val - 1)})}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#e5e7eb', color: '#374151', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >−</button>
                          <span style={{ width: '20px', textAlign: 'center', fontSize: '15px', fontWeight: 'bold' }}>{item.val}</span>
                          <button type="button" onClick={() => setNewInterest({...newInterest, [item.key]: Math.min(item.max, item.val + 1)})}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#e5e7eb', color: '#374151', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related interests for dedup */}
                {isUnlocked && (() => {
                  const options = allInterestOptions.filter(o => o.id !== (editingCustomInterest?.id || newInterest.id));
                  const selected = newInterest.dedupRelated || [];
                  const toggleDedup = (id) => {
                    const cur = newInterest.dedupRelated || [];
                    setNewInterest({...newInterest, dedupRelated: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]});
                  };
                  return (
                    <div style={{ padding: '8px 14px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '4px' }}>🔗 {t('interests.dedupRelated')}</div>
                      <div style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '6px' }}>{t('interests.dedupRelatedDesc')}</div>
                      <button type="button" onClick={() => setShowDedupDropdown(v => !v)}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '7px', border: '1px solid #d8b4fe', background: '#f5f3ff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: '#6d28d9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{selected.length === 0 ? '— ללא קישורים' : `${selected.length} מקושרים`}</span>
                        <span style={{ fontSize: '9px' }}>{showDedupDropdown ? '▲' : '▼'}</span>
                      </button>
                      {showDedupDropdown && (
                        <div style={{ marginTop: '4px', border: '1px solid #e9d5ff', borderRadius: '7px', background: 'white', maxHeight: '160px', overflowY: 'auto', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
                          {options.map(o => {
                            const isSel = selected.includes(o.id);
                            return (
                              <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 8px', cursor: 'pointer', background: isSel ? '#faf5ff' : 'white', borderBottom: '1px solid #f3e8ff' }}>
                                <input type="checkbox" checked={isSel} onChange={() => toggleDedup(o.id)} style={{ cursor: 'pointer', width: '13px', height: '13px', flexShrink: 0 }} />
                                <span style={{ fontSize: '13px', flexShrink: 0, width: '18px', textAlign: 'center' }}>
                                  {o.icon?.startsWith?.('data:')
                                    ? <img src={o.icon} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', verticalAlign: 'middle' }} />
                                    : (o.icon || '📍')}
                                </span>
                                <span style={{ fontSize: '11px', fontWeight: isSel ? 'bold' : 'normal', color: isSel ? '#6d28d9' : '#374151' }}>{tLabel(o) || o.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}


                                {/* Counter for auto-naming — only in edit mode + admin */}
                {/* Admin: Status + Default + Place count */}
                {/* City exposure — admin only, uses <details> to avoid useState in IIFE */}
                {isAdmin && editingCustomInterest && (() => {
                  const interestId = editingCustomInterest.id;
                  const allCities = Object.values(window.BKK.cities || {});
                  const allVisible = allCities.every(city => !(cityHiddenInterests[city.id] || new Set()).has(interestId));
                  const visibleCount = allCities.filter(city => !(cityHiddenInterests[city.id] || new Set()).has(interestId)).length;
                  const toggleCity = (cityId) => {
                    const cur = cityHiddenInterests[cityId] || new Set();
                    const next = new Set(cur);
                    if (next.has(interestId)) next.delete(interestId); else next.add(interestId);
                    const arr = [...next];
                    setCityHiddenInterests(prev => ({ ...prev, [cityId]: next }));
                    if (isFirebaseAvailable && database) {
                      saveCityHiddenInterests(cityId, arr);
                    }
                  };
                  return (
                    <details style={{ marginBottom: '8px' }}>
                      <summary style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: '#374151', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{allVisible ? '🌍 חשוף בכל הערים' : `🏙️ חשוף ב-${visibleCount}/${allCities.length} ערים`}</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
                      </summary>
                      <div style={{ border: '1px solid #d1d5db', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '8px', background: 'white', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
                        {allCities.map(city => {
                          const isVisible = !(cityHiddenInterests[city.id] || new Set()).has(interestId);
                          return (
                            <label key={city.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', cursor: 'pointer', borderRadius: '6px', marginBottom: '2px', background: isVisible ? '#f0fdf4' : '#fafafa' }}>
                              <input type="checkbox" checked={isVisible} onChange={() => toggleCity(city.id)} style={{ cursor: 'pointer', width: '14px', height: '14px' }} />
                              <span style={{ fontSize: '14px' }}>{city.icon?.startsWith?.('data:') ? '🏙️' : (city.icon || '🏙️')}</span>
                              <span style={{ fontSize: '12px', fontWeight: isVisible ? 'bold' : 'normal', color: isVisible ? '#166534' : '#9ca3af' }}>{tLabel(city)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  );
                })()}
                {editingCustomInterest && isUnlocked && (() => {
                  const interestId = editingCustomInterest.id;
                  const cfg = interestConfig[interestId] || {};
                  const aStatus = cfg.adminStatus || 'active';
                  const builtInDefault = interestOptions.some(i => i.id === interestId);
                  const isDefault = cfg.defaultEnabled !== undefined ? cfg.defaultEnabled : builtInDefault;
                  const statusLabels = { active: '🟢 Active', draft: '🟡 Draft', hidden: '🔴 Hidden' };
                  const statusColors = { active: '#dcfce7', draft: '#fef3c7', hidden: '#fee2e2' };
                  const statusBorders = { active: '#86efac', draft: '#fcd34d', hidden: '#fca5a5' };
                  // Count places tagged with this interest
                  const cityLocs = (customLocations || []).filter(l => (l.cityId || 'bangkok') === selectedCityId && l.status !== 'blacklist');
                  const tagged = cityLocs.filter(l => (l.interests || []).includes(interestId));
                  const locked = tagged.filter(l => l.locked);
                  const withCoords = tagged.filter(l => l.lat && l.lng);
                  return (
                    <div style={{ display: 'flex', gap: '8px', padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Status</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['active', 'draft', 'hidden'].map(s => (
                            <button key={s} type="button"
                              onClick={async () => {
                                if (aStatus === s) return;
                                const updCfg = { ...interestConfig, [interestId]: { ...cfg, adminStatus: s } };
                                setInterestConfig(updCfg);
                                if (isFirebaseAvailable && database) {
                                  await saveInterestAdminStatusAsync(interestId, s);
                                }
                                const labels = { active: '🟢', draft: '🟡', hidden: '🔴' };
                                showToast(`${labels[s]} ${tLabel(editingCustomInterest) || interestId} → ${s}`, 'info');
                              }}
                              style={{
                                fontSize: '10px', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer',
                                background: aStatus === s ? statusColors[s] : '#f1f5f9',
                                border: `1px solid ${aStatus === s ? statusBorders[s] : '#e2e8f0'}`,
                                fontWeight: aStatus === s ? 'bold' : 'normal',
                                opacity: aStatus === s ? 1 : 0.5
                              }}
                            >{statusLabels[s]}</button>
                          ))}
                        </div>
                      </div>
                      {isAdmin && (
                        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>Lock</div>
                          <button type="button"
                            onClick={async () => {
                              const newLocked = !cfg.locked;
                              const updCfg = { ...interestConfig, [interestId]: { ...cfg, locked: newLocked } };
                              setInterestConfig(updCfg);
                              if (isFirebaseAvailable && database) {
                                database.ref(`settings/interestConfig/${interestId}/locked`).set(newLocked).catch(() => {});
                                database.ref('settings/cacheVersion').set(Date.now()).catch(() => {});
                              }
                              showToast(`${newLocked ? '🔒' : '🔓'} ${tLabel(editingCustomInterest) || interestId}`, 'info');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${cfg.locked ? 'border-green-600 bg-green-600 text-white' : 'border-amber-300 bg-amber-50 text-amber-600'}`}
                            title={cfg.locked ? 'Locked' : 'Unlocked'}>
                            {cfg.locked ? '🔒' : '✏️'}
                          </button>
                        </div>
                      )}
                      <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>⭐ Places</div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: tagged.length > 0 ? '#059669' : '#94a3b8' }}>
                          {tagged.length}{locked.length > 0 ? ` (${locked.length}🔒)` : ''}{tagged.length > 0 && withCoords.length < tagged.length ? ` · ${tagged.length - withCoords.length}❗` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {editingCustomInterest && isUnlocked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', direction: 'rtl' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>{t('interests.nextNumber')}:</span>
                  {(() => {
                    const val = (interestCounters[editingCustomInterest.id] || 0) + 1;
                    const update = (v) => {
                      const newCounter = Math.max(0, v - 1);
                      // Update local state immediately so UI responds — Firebase listener may lag
                      setInterestCounters(prev => ({ ...prev, [editingCustomInterest.id]: newCounter }));
                      if (isFirebaseAvailable && database) {
                        saveInterestCounter(selectedCityId, editingCustomInterest.id, newCounter);
                      }
                    };
                    return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <button type="button" onClick={() => update(Math.max(1, val - 1))}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: val <= 1 ? '#e5e7eb' : '#6b7280', color: val <= 1 ? '#9ca3af' : 'white', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '15px', fontWeight: 'bold' }}>{val}</span>
                      <button type="button" onClick={() => update(val + 1)}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#6b7280', color: 'white', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    );
                  })()}
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>({tLabel(editingCustomInterest)} · {tLabel(window.BKK.selectedCity)} #{(interestCounters[editingCustomInterest.id] || 0) + 1})</span>
                </div>
                )}

                {/* Delete button moved to map color row */}
              </div>
              
              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-200 flex gap-2" style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
                {interestDialogReadOnly ? null : (() => {
                  return (
                    <button
                      onClick={async () => {
                        if (!newInterest.label.trim()) return;
                        // Prevent double-click
                        if (window._savingInterest) return;
                        window._savingInterest = true;

                        // Validation: Google search interests must have types or textSearch
                        if (!newInterest.noGoogleSearch && !newInterest.privateOnly) {
                          const hasTypes = (newInterest.types || '').trim().length > 0;
                          const hasTextSearch = (newInterest.textSearch || '').trim().length > 0;
                          if (!hasTypes && !hasTextSearch) {
                            showToast('⚠️ תחום מסוג גוגל חייב להכיל סוגי מקומות או מילות חיפוש', 'warning');
                            window._savingInterest = false;
                            return;
                          }
                        }
                        
                        const searchConfig = {};
                        if (newInterest.noGoogleSearch) {
                          // Internal interest — no Google search
                          searchConfig.noGoogleSearch = true;
                        } else if (newInterest.privateOnly) {
                          searchConfig.privateOnly = true;
                        } else {
                          // Google search interest — clear noGoogleSearch flag if previously set
                          searchConfig.noGoogleSearch = null;
                          if (newInterest.searchMode === 'text') {
                            searchConfig.textSearch = newInterest.textSearch?.trim() || null;
                            searchConfig.types = null;
                          } else {
                            searchConfig.types = newInterest.types
                              ? newInterest.types.split(',').map(t => t.trim()).filter(t => t)
                              : null;
                            searchConfig.textSearch = null;
                          }
                        }
                        if (newInterest.blacklist) {
                          searchConfig.blacklist = newInterest.blacklist.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
                        }
                        if (newInterest.nameKeywords) {
                          searchConfig.nameKeywords = newInterest.nameKeywords.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
                        }
                        if (newInterest.minRatingCount != null) searchConfig.minRatingCount = newInterest.minRatingCount;
                        if (newInterest.lowRatingCount != null) searchConfig.lowRatingCount = newInterest.lowRatingCount;
                        
                        if (editingCustomInterest) {
                          // EDIT MODE
                          const interestId = editingCustomInterest.id;
                          
                          if (newInterest.builtIn) {
                            // Built-in interest - save search config + admin overrides to interestConfig
                            const existingConfig = interestConfig[interestId] || {};
                            const configData = { ...searchConfig };
                            // Label/icon are primary in Firebase — city file only has id+group
                            configData.label = newInterest.label.trim();
                            configData.labelEn = (newInterest.labelEn || '').trim();
                            configData.labelOverride = newInterest.label.trim();
                            configData.labelEnOverride = (newInterest.labelEn || '').trim();
                            configData.icon = newInterest.icon || '';
                            configData.iconOverride = newInterest.icon || '';
                            configData.category = newInterest.category || 'attraction';
                            configData.weight = newInterest.weight || 3;
                            configData.minStops = newInterest.minStops != null ? newInterest.minStops : 1;
                            configData.maxStops = newInterest.maxStops || 10;
                            configData.routeSlot = newInterest.routeSlot || 'any';
                            configData.minGap = newInterest.minGap || 1;
                            configData.bestTime = newInterest.bestTime || 'anytime';
                            configData.dedupRelated = newInterest.dedupRelated || [];
                            configData.group = newInterest.group || '';
                            // Preserve admin flags that are set separately
                            if (existingConfig.defaultEnabled !== undefined) configData.defaultEnabled = existingConfig.defaultEnabled;
                            if (existingConfig.adminStatus) configData.adminStatus = existingConfig.adminStatus;
                            if (isUnlocked) {
                              configData.locked = newInterest.locked || false;
                              if (newInterest.color) configData.color = newInterest.color;
                            }
                            if (isFirebaseAvailable && database) {
                              // Update local state immediately — Firebase listener may lag
                              setInterestConfig(prev => ({...prev, [interestId]: configData}));
                              saveInterestConfig(interestId, configData);
                            } else {
                              setInterestConfig(prev => ({...prev, [interestId]: configData}));
                            }
                          } else {
                            // Custom interest - update in customInterests
                            const updatedInterest = {
                              ...editingCustomInterest,
                              label: newInterest.label.trim(),
                              labelEn: (newInterest.labelEn || '').trim(),
                              name: newInterest.label.trim(),
                              icon: newInterest.icon || '📍',
                              privateOnly: newInterest.privateOnly || false,
                              noGoogleSearch: newInterest.noGoogleSearch || false,
                              locked: newInterest.locked || false,
                              category: newInterest.category || 'attraction',
                              weight: newInterest.weight || 3,
                              minStops: newInterest.minStops != null ? newInterest.minStops : 1,
                              maxStops: newInterest.maxStops || 10,
                              routeSlot: newInterest.routeSlot || 'any',
                              minGap: newInterest.minGap || 1,
                              bestTime: newInterest.bestTime || 'anytime', dedupRelated: newInterest.dedupRelated || [],
                              group: newInterest.group || '',
                              ...(newInterest.color ? { color: newInterest.color } : {})
                            };
                            delete updatedInterest.builtIn;
                            
                            if (isFirebaseAvailable && database) {
                              // Update local state immediately — Firebase listener may lag
                              setCustomInterests(prev => prev.map(ci => ci.id === interestId ? updatedInterest : ci));
                              saveCustomInterestAndConfig(editingCustomInterest.firebaseId, interestId, updatedInterest, null);
                              // Always save group + searchConfig to interestConfig (group in interestConfig takes priority in allInterestOptions)
                              const existingCfg = interestConfig[interestId] || {};
                              const cfgToSave = { ...existingCfg, ...searchConfig, group: newInterest.group || '' };
                              Object.keys(cfgToSave).forEach(k => { if (cfgToSave[k] === null) delete cfgToSave[k]; });
                              setInterestConfig(prev => ({...prev, [interestId]: cfgToSave}));
                              saveInterestConfig(interestId, { ...existingCfg, ...searchConfig, group: newInterest.group || '' });
                            } else {
                              const updated = customInterests.map(ci => ci.id === interestId ? updatedInterest : ci);
                              setCustomInterests(updated);
                            }
                          }
                          
                          showToast(t('interests.interestUpdated'), 'success');
                          setShowAddInterestDialog(false);
                          setNewInterest({ label: '', labelEn: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', privateOnly: true, locked: false, scope: 'global', category: 'attraction', weight: 3, minStops: 1, maxStops: 10, routeSlot: 'any', minGap: 1, bestTime: 'anytime', dedupRelated: [] });
                          setEditingCustomInterest(null);
                          window._savingInterest = false;
                          return;
                        } else {
                          // ADD MODE - check for duplicate name
                          const dupCheck = customInterests.find(i => 
                            i.label?.toLowerCase().trim() === newInterest.label.toLowerCase().trim() ||
                            i.name?.toLowerCase().trim() === newInterest.label.toLowerCase().trim()
                          );
                          if (dupCheck) {
                            showToast(`⚠️ "${newInterest.label}" ${t('interests.alreadyExists')}`, 'warning');
                            window._savingInterest = false;
                            return;
                          }
                          // labelEn is required — ID is derived from it
                          const labelEnRaw = (newInterest.labelEn || '').trim();
                          if (!labelEnRaw) {
                            showToast('⚠️ חובה להזין שם באנגלית', 'warning');
                            window._savingInterest = false;
                            return;
                          }
                          // Generate ID from labelEn: i_english_name
                          const interestId = 'i_' + labelEnRaw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                          // Check ID uniqueness
                          if (customInterests.find(i => i.id === interestId)) {
                            showToast(`⚠️ תחום עם שם אנגלי דומה כבר קיים (${interestId})`, 'warning');
                            window._savingInterest = false;
                            return;
                          }
                          const newInterestData = {
                            id: interestId,
                            label: newInterest.label.trim(),
                            labelEn: (newInterest.labelEn || '').trim(),
                            name: newInterest.label.trim(),
                            icon: newInterest.icon || '📍',
                            custom: true,
                            privateOnly: newInterest.privateOnly || false,
                            locked: newInterest.locked || false,
                            category: newInterest.category || 'attraction',
                            weight: newInterest.weight || 3,
                              minStops: newInterest.minStops != null ? newInterest.minStops : 1,
                              maxStops: newInterest.maxStops || 10,
                              routeSlot: newInterest.routeSlot || 'any',
                              minGap: newInterest.minGap || 1,
                              bestTime: newInterest.bestTime || 'anytime', dedupRelated: newInterest.dedupRelated || [],
                              group: newInterest.group || '',
                              ...(newInterest.color ? { color: newInterest.color } : {})
                          };
                          
                          // Close dialog immediately
                          setShowAddInterestDialog(false);
                          setNewInterest({ label: '', labelEn: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', privateOnly: true, locked: false, scope: 'global', category: 'attraction', weight: 3, minStops: 1, maxStops: 10, routeSlot: 'any', minGap: 1, bestTime: 'anytime', dedupRelated: [] });
                          setEditingCustomInterest(null);
                          
                          // Add to local state immediately so it shows in UI
                          // Mark as recently added to protect from Firebase listener race condition
                          recentlyAddedRef.current.set(interestId, Date.now());
                          setCustomInterests(prev => {
                            if (prev.some(i => i.id === interestId)) return prev;
                            return [...prev, newInterestData];
                          });
                          
                          // Enable the new interest in interestStatus
                          setInterestStatus(prev => ({ ...prev, [interestId]: newInterest.defaultEnabled !== false }));
                          
                          // Hide new interest in all cities except current by default
                          const otherCityIds = Object.keys(window.BKK.cities || {}).filter(cid => cid !== selectedCityId);
                          otherCityIds.forEach(cid => {
                            const cur = cityHiddenInterests[cid] || new Set();
                            const next = new Set(cur);
                            next.add(interestId);
                            setCityHiddenInterests(prev => ({ ...prev, [cid]: next }));
                            if (isFirebaseAvailable && database) {
                              saveCityHiddenInterests(cid, [...next]);
                            }
                          });
                          
                          // Save in background
                          const saved = saveNewCustomInterest(
                            interestId, newInterestData,
                            () => {
                              console.log(`[INTEREST-SAVE] Saved to Firebase: ${interestId}`);
                              recentlyAddedRef.current.delete(interestId);
                              showToast(`✅ ${newInterestData.label} — ${t('interests.interestAdded')}`, 'success');
                            },
                            (e) => {
                              console.error(`[INTEREST-SAVE] FAILED: ${interestId}`, e);
                              showToast(`❌ ${t('toast.saveError')}: ${e.message}`, 'error', 'sticky');
                              saveToPendingInterest(newInterestData, searchConfig);
                            }
                          );
                          if (saved) {
                            const userId = authUser?.uid || 'unknown';
                            saveNewInterestStatus(userId, interestId);
                            saveNewInterestStatus(null, interestId);
                            if (Object.keys(searchConfig).length > 0) {
                              saveInterestConfig(interestId, searchConfig);
                            }
                          } else {
                            const updated = [...customInterests, newInterestData];
                            setCustomInterests(updated);
                            showToast(`✅ ${newInterestData.label} — ${t('interests.interestAdded')}`, 'success');
                          }
                          window._savingInterest = false;
                          return; // Skip the setShow/setNew below since we already did it
                        }
                        
                        setShowAddInterestDialog(false);
                        setNewInterest({ label: '', labelEn: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', privateOnly: true, locked: false, scope: 'global', category: 'attraction', weight: 3, minStops: 1, maxStops: 10, routeSlot: 'any', minGap: 1, bestTime: 'anytime', dedupRelated: [] });
                        setEditingCustomInterest(null);
                        window._savingInterest = false;
                      }}
                      disabled={!newInterest.label?.trim()}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        newInterest.label?.trim()
                          ? 'bg-purple-500 text-white hover:bg-purple-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {editingCustomInterest ? t('general.update') : t('general.add')}
                    </button>
                  );
                })()}
                <button
                  onClick={() => {
                    setShowAddInterestDialog(false);
                    setInterestDialogReadOnly(false);
                    setNewInterest({ label: '', labelEn: '', icon: '📍', searchMode: 'types', types: '', textSearch: '', blacklist: '', privateOnly: true, locked: false, scope: 'global', category: 'attraction', weight: 3, minStops: 1, maxStops: 10, routeSlot: 'any', minGap: 1, bestTime: 'anytime', dedupRelated: [] });
                    setEditingCustomInterest(null);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600"
                >
                  {`✓ ${t("general.close")}`}
                </button>

              </div>

            </div>
          </div>
        )}

      {/* Route Dialog */}
      {showRouteDialog && editingRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">{routeDialogMode === 'add' ? t('route.addSavedRoute') : t('route.editSavedRoute')}</h3>
              </div>
              <button
                onClick={() => { setShowRouteDialog(false); setEditingRoute(null); }}
                className="text-xl hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center"
              >✕</button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div style={{ position: 'relative' }}>
              {editingRoute?.locked && !isUnlocked && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.3)' }} />
              )}
              {/* Route info */}
              <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
                {/* Area */}
                <div className="text-xs text-gray-700">
                  <span className="font-bold">{`📍 ${t('general.area')}:`}</span> {editingRoute.areaName || t('general.noArea')}
                </div>
                {/* Interests */}
                {(() => {
                  const ids = [...new Set((editingRoute.stops || []).flatMap(s => s.interests || []))];
                  return ids.length > 0 && (
                    <div className="flex gap-1 flex-wrap items-center">
                      <span className="text-xs font-bold text-gray-700">{`🏷️ ${t('general.interestsHeader')}:`}</span>
                      {ids.map((intId, idx) => {
                        const obj = allInterestOptions.find(o => o.id === intId);
                        return obj ? (
                          <span key={idx} className="text-[10px] bg-white px-1.5 py-0.5 rounded" title={obj.label}>
                            {obj.icon?.startsWith?.('data:') ? <img src={obj.icon} alt="" className="w-3.5 h-3.5 object-contain inline" /> : obj.icon} {obj.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  );
                })()}
                {/* Circular / Linear */}
                <div className="text-xs text-gray-700">
                  <span className="font-bold">{`🔀 ${t("route.routeType")}:`}</span> {editingRoute.circular ? t('route.circularRoute') : t('route.linearRoute')}
                </div>
                {/* Start point */}
                <div className="text-xs text-gray-700">
                  <span className="font-bold">{`🚩 ${t("route.startPoint")}:`}</span> {editingRoute.startPoint || editingRoute.startPointCoords?.address || t('form.startPointFirst')}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold mb-1">{t("general.routeName")}</label>
                <input
                  type="text"
                  value={editingRoute.name || ''}
                  onChange={(e) => setEditingRoute({...editingRoute, name: e.target.value})}
                  className="w-full p-2 text-sm border-2 border-blue-300 rounded-lg"
                  style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}
                  disabled={editingRoute.locked && !isUnlocked}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold mb-1">{`💬 ${t('general.notesLabel')}`}</label>
                <textarea
                  value={editingRoute.notes || ''}
                  onChange={(e) => setEditingRoute({...editingRoute, notes: e.target.value})}
                  placeholder={t("places.notes")}
                  className="w-full p-2 text-sm border-2 border-gray-300 rounded-lg h-16 resize-none"
                  style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}
                  disabled={editingRoute.locked && !isUnlocked}
                />
              </div>

              {/* Stops list */}
              <div>
                <label className="block text-xs font-bold mb-1">{t("general.stopsCount")} ({editingRoute.stops?.length || 0})</label>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {(editingRoute.stops || []).map((stop, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded">
                      <span className="text-gray-400">{window.BKK.stopLabel(idx)}.</span>
                      <span className="font-medium truncate">{stop.name}</span>
                      {stop.rating && <span className="text-yellow-600">⭐{stop.rating}</span>}
                    </div>
                  ))}
                </div>
              </div>
              </div>{/* close inner wrapper */}

              {/* Status toggle - locked (admin only) */}
              {isUnlocked && (
              <div className="flex gap-3 px-4 py-2 bg-gray-50 border-t border-gray-100">
                <button type="button"
                  onClick={() => setEditingRoute({...editingRoute, locked: !editingRoute.locked})}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all cursor-pointer ${editingRoute.locked ? 'border-gray-600 bg-gray-600 text-white shadow-md' : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'}`}
                >
                  {editingRoute.locked ? '🔒' : '○'} {t("general.locked")}
                </button>
              </div>
              )}

              {/* Actions: Open Route + Delete */}
              <div className="px-4 py-2 border-t border-gray-200" style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      loadSavedRoute(editingRoute);
                      setShowRouteDialog(false);
                      setEditingRoute(null);
                    }}
                    className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
                    style={{ fontSize: '15px' }}
                  >
                    📍 {t("general.openRoute")}
                  </button>
                  {!(editingRoute.system) && !(editingRoute.locked && !isUnlocked) && (
                    <button
                      onClick={() => {
                        showConfirm(`${t("general.deleteRoute")} "${editingRoute.name}"?`, () => {
                          deleteRoute(editingRoute.id);
                          setShowRouteDialog(false);
                          setEditingRoute(null);
                        });
                      }}
                      style={{ width: '42px', height: '42px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      title={t("general.deleteRoute")}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-gray-200 flex gap-2" style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
              {(() => {
                const isLockedRoute = editingRoute.locked && !isUnlocked;
                return (
                  <>
                    {!isLockedRoute && (
                      <button
                        onClick={() => {
                          updateRoute(editingRoute.id, {
                            name: editingRoute.name,
                            notes: editingRoute.notes,
                            locked: editingRoute.locked
                          });
                          setShowRouteDialog(false);
                          setEditingRoute(null);
                        }}
                        className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600"
                      >
                        💾 {t('general.update') || 'Update'}
                      </button>
                    )}
                    <button
                      onClick={() => { setShowRouteDialog(false); setEditingRoute(null); }}
                      className="px-5 py-2.5 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600"
                    >
                      {`✓ ${t("general.close")}`}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Stop Dialog */}
      {showManualAddDialog && (() => {
        const searchManualPlace = async () => {
          const input = document.getElementById('manual-stop-input');
          const resultsDiv = document.getElementById('manual-stop-results');
          const q = input?.value?.trim();
          if (!q || !resultsDiv) return;
          
          resultsDiv.innerHTML = '<p style="text-align:center;color:#9ca3af;font-size:12px;padding:8px">{t("general.searching")}...</p>';
          
          try {
            const result = await window.BKK.geocodeAddress(q);
            if (result) {
              const display = result.displayName || result.address || q;
              resultsDiv.innerHTML = '';
              const btn = document.createElement('button');
              btn.className = 'w-full p-3 text-right bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition';
              btn.style.direction = 'rtl';
              btn.innerHTML = `<div style="font-weight:bold;font-size:14px;color:#6d28d9">📍 ${display}</div><div style="font-size:10px;color:#6b7280;margin-top:2px">${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}</div>`;
              btn.onclick = () => {
                const newStop = {
                  name: display,
                  lat: result.lat,
                  lng: result.lng,
                  description: `⭐ N/A`,
                  address: result.address || display,
                  duration: 45,
                  interests: ['_manual'],
                  manuallyAdded: true,
                  googlePlace: false,
                  rating: 0,
                  ratingCount: 0
                };
                
                // Check duplicates against current route
                const isDup = route?.stops?.some(s => s.name.toLowerCase().trim() === newStop.name.toLowerCase().trim());
                if (isDup) {
                  showToast(`"${display}" ${t("places.alreadyInRoute")}`, 'warning');
                  return;
                }
                
                // Add to manualStops (session state)
                setManualStops(prev => [...prev, newStop]);
                
                // Add to current route if exists
                if (route) {
                  setRoute(prev => prev ? {
                    ...prev,
                    stops: [...prev.stops, newStop],
                    optimized: false
                  } : prev);
                  scheduleReoptimize();
                }
                
                showToast(`➕ ${display} ${t("interests.added")} — ${t('general.addedManually') || 'נוסף לתחתית הרשימה'}`, 'success');
                window.BKK.logEvent?.('manual_stop_added', { stop_name: display });
                
                // Clear input for next add
                const inp = document.getElementById('manual-stop-input');
                if (inp) inp.value = '';
                resultsDiv.innerHTML = '<p style="text-align:center;color:#16a34a;font-size:12px;padding:8px">✅ Added! You can add more or close</p>';
              };
              resultsDiv.appendChild(btn);
            } else {
              resultsDiv.innerHTML = '<p style="text-align:center;color:#ef4444;font-size:12px;padding:8px">❌ No results found</p>';
            }
          } catch (err) {
            console.error('[MANUAL_ADD] Search error:', err);
            resultsDiv.innerHTML = '<p style="text-align:center;color:#ef4444;font-size:12px;padding:8px">❌ Search error</p>';
          }
        };
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between">
                <h3 className="text-sm font-bold">{t("route.addManualStop")}</h3>
                <button
                  onClick={() => setShowManualAddDialog(false)}
                  className="text-xl hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              
              {/* Search input — same layout as Step 2 point search */}
              <div className="p-4 space-y-3">
                <div className="flex gap-2 items-center">
                  <input
                    id="manual-stop-input"
                    type="text"
                    onKeyDown={(e) => { if (e.key === 'Enter') searchManualPlace(); }}
                    placeholder={isRecording && recordingField === 'manual_stop' ? '' : t("form.typeAddressAlt")}
                    className="flex-1 p-2.5 border-2 border-purple-300 rounded-lg text-sm focus:border-purple-500"
                    style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', borderColor: isRecording && recordingField === 'manual_stop' ? '#ef4444' : undefined }}
                    autoFocus
                  />
                  {window.BKK?.speechSupported && (
                    <button type="button"
                      onClick={() => toggleRecording('manual_stop',
                        (text) => {
                          const inp = document.getElementById('manual-stop-input');
                          if (inp) inp.value = (inp.value ? inp.value + ' ' : '') + text;
                        },
                        () => { const inp = document.getElementById('manual-stop-input'); if (inp) inp.value = ''; },
                        'en-US'
                      )}
                      style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', background: isRecording && recordingField === 'manual_stop' ? '#ef4444' : '#f3f4f6', color: isRecording && recordingField === 'manual_stop' ? 'white' : '#6b7280', boxShadow: isRecording && recordingField === 'manual_stop' ? '0 0 0 3px rgba(239,68,68,0.3)' : 'none', animation: isRecording && recordingField === 'manual_stop' ? 'pulse 1s ease-in-out infinite' : 'none' }}
                      title={isRecording && recordingField === 'manual_stop' ? t('speech.stopRecording') : t('speech.startRecording')}>
                      {isRecording && recordingField === 'manual_stop' ? '⏹️' : '🎤'}
                    </button>
                  )}
                  <button
                    onClick={searchManualPlace}
                    className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap bg-purple-500 text-white hover:bg-purple-600"
                  >
                    {`🔍 ${t('general.search')}`}
                  </button>
                </div>
                {isRecording && recordingField === 'manual_stop' && interimText && (
                  <div style={{ padding: '4px 8px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#92400e', fontStyle: 'italic', direction: 'ltr' }}>🎤 {interimText}</div>
                )}
                
                <p className="text-[11px] text-gray-500">
                  {t('general.searchAndAddHint')}
                </p>
                
                {manualStops.length > 0 && (
                  <div className="text-[11px] text-purple-600 font-bold">
                    {`📍 ${manualStops.length} ${t('general.placesAddedManually')}`}
                  </div>
                )}
                
                {/* Results container */}
                <div id="manual-stop-results" className="space-y-2 max-h-60 overflow-y-auto"></div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Address Search Dialog */}
      {showAddressDialog && (() => {
        const searchAddress = async () => {
          const input = document.getElementById('addr-search-input');
          const resultsDiv = document.getElementById('addr-search-results');
          const q = input?.value?.trim();
          if (!q || !resultsDiv) return;
          
          resultsDiv.innerHTML = '<p style="text-align:center;color:#9ca3af;font-size:12px;padding:8px">{t("general.searching")}...</p>';
          
          try {
            const result = await window.BKK.geocodeAddress(q);
            if (result) {
              const addr = result.address || result.displayName || q;
              const display = result.displayName || result.address || q;
              resultsDiv.innerHTML = '';
              const btn = document.createElement('button');
              btn.className = 'w-full p-3 text-right bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition';
              btn.style.direction = 'rtl';
              btn.innerHTML = `<div style="font-weight:bold;font-size:14px;color:#166534">📍 ${display}</div><div style="font-size:10px;color:#6b7280;margin-top:2px">${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}</div>`;
              btn.onclick = () => {
                setFormData(prev => ({ ...prev, startPoint: display }));
                setStartPointCoords({ lat: result.lat, lng: result.lng, address: display });
                if (route?.optimized) setRoute(prev => prev ? {...prev, optimized: false} : prev);
                showToast(`✅ ${display}`, 'success');
                setShowAddressDialog(false);
              };
              resultsDiv.appendChild(btn);
            } else {
              resultsDiv.innerHTML = '<p style="text-align:center;color:#ef4444;font-size:12px;padding:8px">❌ No results found</p>';
            }
          } catch (err) {
            console.error('[ADDRESS_DIALOG] Search error:', err);
            resultsDiv.innerHTML = '<p style="text-align:center;color:#ef4444;font-size:12px;padding:8px">❌ Search error</p>';
          }
        };
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between">
                <h3 className="text-sm font-bold">{`📍 ${t("form.searchAddress")}`}</h3>
                <button
                  onClick={() => setShowAddressDialog(false)}
                  className="text-xl hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              
              {/* Search input */}
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    id="addr-search-input"
                    type="text"
                    onKeyDown={(e) => { if (e.key === 'Enter') searchAddress(); }}
                    placeholder={t("form.typeAddress")}
                    className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm"
                    style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}
                    autoFocus
                  />
                  <button
                    onClick={searchAddress}
                    className="px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap bg-green-500 text-white hover:bg-green-600"
                  >
                    {`🔍 ${t('general.search')}`}
                  </button>
                </div>
                
                <p className="text-[11px] text-gray-500">
                  💡 Enter full address, hotel name, train station, or any place in {tLabel(window.BKK.selectedCity) || t('general.city')}
                </p>
                
                {/* Results container */}
                <div id="addr-search-results" className="space-y-2 max-h-60 overflow-y-auto"></div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Image Modal */}
      {/* ===== PLACE INFO POPUP (FouFou popup) ===== */}
      {showImageModal && modalImage && (() => {
        const loc = modalImageCtx?.location || null;
        const isRTL = window.BKK.i18n.isRTL();
        const close = () => { setShowImageModal(false); setModalImage(null); setModalImageCtx(null); };
        const pk = (loc?.name || '').replace(/[.#$/\[\]]/g, '_');
        const ra = reviewAverages[pk];
        const gR = loc?.googleRating;
        const hasImage = modalImage && modalImage !== '__placeholder__';
        const mapsUrl = loc ? window.BKK.getNavigateUrl(loc) : null;
        const isCoordOnly = loc ? window.BKK.isCoordOnlyPlace(loc) : false;
        const interestLabels = (loc?.interests || []).map(id => {
          const opt = allInterestOptions.find(o => o.id === id);
          return opt ? (tLabel(opt) || opt.label) : null;
        }).filter(Boolean);

        return (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-end sm:items-center justify-center"
            onClick={close}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '16px 16px 0 0',
                width: '100%',
                maxWidth: '440px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                direction: isRTL ? 'rtl' : 'ltr',
                boxShadow: '0 -4px 32px rgba(0,0,0,0.25)',
              }}
              className="sm:rounded-2xl sm:mb-0"
            >
              {/* Header — FouFou icon + name + interests + X */}
              {/* direction on container: first child = right in RTL, last child = left in RTL */}
              {/* DOM: [FouFou] [name] [X] → RTL visual: X(left) | name | FouFou(right) */}
              {/* DOM: [FouFou] [name] [X] → LTR visual: FouFou(left) | name | X(right) */}
              <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', gap: '8px', direction: isRTL ? 'rtl' : 'ltr' }}>
                {loc && (
                  <button
                    onClick={() => { close(); handleEditLocation(loc); }}
                    style={{ background: '#f5f3ff', border: '2px solid #c4b5fd', borderRadius: '8px', cursor: 'pointer', padding: '3px 6px', display: 'inline-flex', alignItems: 'center', flexShrink: 0, marginTop: '2px' }}
                    title={isAdmin || isEditor || (authUser?.uid === loc?.addedBy && !loc?.locked) ? (t('general.edit') || 'ערוך') : (t('general.details') || 'פרטים')}
                  ><img src="icon-32x32.png" alt="FouFou" style={{ width: '20px', height: '20px' }} /></button>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: '#111827', lineHeight: 1.3 }}>{loc?.name || ''}</div>
                  {interestLabels.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 600, marginTop: '3px' }}>
                      {interestLabels.join(' · ')}
                    </div>
                  )}
                </div>
                <button onClick={close} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>✕</button>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Image area — natural aspect ratio */}
                <div style={{ width: '100%', background: '#f9fafb', position: 'relative' }}>
                  {hasImage ? (
                    <img src={modalImage} alt={loc?.name} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f3f4f6' }}>
                      <img src="icon-192x192.png" alt="FouFou" style={{ width: '40px', height: '40px', opacity: 0.15 }} />
                      {authUser && loc && (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: '1.5px dashed #9ca3af', cursor: 'pointer', fontSize: '12px', color: '#6b7280', background: 'white' }}>
                          📎 {window.BKK.i18n.currentLang === 'he' ? '+ הוסף תמונה' : '+ Add photo'}
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const compressed = await window.BKK.compressImage(file, 480);
                              if (compressed) {
                                const ok = await patchLocationField(loc, { uploadedImage: compressed });
                                if (ok) { setModalImage(compressed); showToast('✅ תמונה נוספה', 'success'); }
                              }
                            } catch(err) { showToast('שגיאה בטעינת תמונה', 'error'); }
                            e.target.value = '';
                          }} />
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* Description — show only, no edit. Add only if empty */}
                {modalImageCtx?.description ? (
                  <div style={{ padding: '12px 16px 8px', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                    <AutoTranslateText text={modalImageCtx.description} style={{ fontSize: '13px', color: '#374151' }} translateText={translateText} detectNeedsTranslation={detectNeedsTranslation} />
                  </div>
                ) : authUser && loc && !modalAddingDesc ? (
                  <div style={{ padding: '10px 16px 4px' }}>
                    <button
                      onClick={() => { setModalAddingDesc(true); setModalDescDraft(''); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', border: '1px dashed #d1d5db', background: 'none', cursor: 'pointer', fontSize: '11px', color: '#9ca3af' }}>
                      ✏️ {window.BKK.i18n.currentLang === 'he' ? '+ הוסף תיאור' : '+ Add description'}
                    </button>
                  </div>
                ) : authUser && loc && modalAddingDesc ? (
                  <div style={{ padding: '10px 16px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <textarea
                      value={modalDescDraft}
                      onChange={(e) => setModalDescDraft(e.target.value)}
                      placeholder={window.BKK.i18n.currentLang === 'he' ? 'כתוב תיאור קצר...' : 'Write a short description...'}
                      autoFocus
                      rows={3}
                      style={{ width: '100%', padding: '8px 10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', fontFamily: 'inherit' }}
                      onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={async () => {
                          if (!modalDescDraft.trim()) return;
                          const ok = await patchLocationField(loc, { description: modalDescDraft.trim() });
                          if (ok) {
                            setModalImageCtx(prev => ({ ...prev, description: modalDescDraft.trim() }));
                            setModalAddingDesc(false);
                            showToast('✅ ' + (window.BKK.i18n.currentLang === 'he' ? 'תיאור נוסף' : 'Description added'), 'success');
                          }
                        }}
                        disabled={!modalDescDraft.trim()}
                        style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', background: modalDescDraft.trim() ? '#8b5cf6' : '#e5e7eb', color: modalDescDraft.trim() ? 'white' : '#9ca3af', fontSize: '12px', fontWeight: 'bold', cursor: modalDescDraft.trim() ? 'pointer' : 'default' }}>
                        {window.BKK.i18n.currentLang === 'he' ? 'שמור' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setModalAddingDesc(false); setModalDescDraft(''); }}
                        style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>
                        {window.BKK.i18n.currentLang === 'he' ? 'ביטול' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Notes — auto-translated if language mismatch */}
                {loc?.notes?.trim() && (
                  <div style={{ padding: '4px 16px 8px' }}>
                    <div style={{ background: '#fffbeb', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                      <AutoTranslateText text={loc.notes} prefix="💭 " translateText={translateText} detectNeedsTranslation={detectNeedsTranslation} />
                    </div>
                  </div>
                )}

                {/* Ratings — single line, inline, direction-safe */}
                <div style={{ padding: '4px 16px 10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                    {gR && (
                      <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                        ⭐ {gR.toFixed?.(1) || gR}{loc?.googleRatingCount ? <span style={{ color: '#9ca3af', fontWeight: 400 }}> ({loc.googleRatingCount})</span> : null}
                      </span>
                    )}
                    {(gR || ra) && ra && <span style={{ color: '#d1d5db', fontSize: '12px' }}>·</span>}
                    {ra ? (
                      <button
                        onClick={() => { close(); openReviewDialog(loc); }}
                        style={{ background: '#f5f3ff', border: '1.5px solid #fcd34d', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#7c3aed', fontWeight: 700, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >🌟 {ra.avg.toFixed(1)} · {window.BKK.i18n.currentLang === 'en' ? `Reviews (${ra.count})` : `ביקורות (${ra.count})`}</button>
                    ) : (
                      <button
                        onClick={() => { close(); openReviewDialog(loc); }}
                        style={{ background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#92400e', fontWeight: 700, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >🌟 {t('reviews.rate')}</button>
                    )}
                  </span>
                </div>
              </div>

              {/* Action bar — matches bottom sheet layout */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Row 1: Navigate + Open in Google */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {mapsUrl && (
                    activeTrail ? (
                      <button
                        onClick={() => {
                          const msg = window.BKK.i18n.currentLang === 'en'
                            ? '⚠️ On mobile, opening Google Maps may interrupt your active navigation. Continue?'
                            : '⚠️ בטלפון, פתיחת גוגל מפס עשויה לעצור את הניווט הפעיל. להמשיך?';
                          if (window.confirm(msg)) { window.open(mapsUrl, '_blank'); }
                        }}
                        style={{ flex: 1, background: '#2563eb', color: 'white', borderRadius: '10px', padding: '10px 8px', fontSize: '13px', fontWeight: 700, textAlign: 'center', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >🧭 {t('route.navigate') || 'נווט'}</button>
                    ) : (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, background: '#2563eb', color: 'white', borderRadius: '10px', padding: '10px 8px', fontSize: '13px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >🧭 {t('route.navigate') || 'נווט'}</a>
                    )
                  )}
                  {loc && (() => {
                    const googleViewUrl = window.BKK.getGoogleViewUrl(loc);
                    if (!googleViewUrl) return null;
                    const btnLabel = isCoordOnly
                      ? (t('general.openGooglePoint') || 'פתח נקודה בגוגל')
                      : (t('general.openInGoogle') || 'פתח בגוגל');
                    return (
                      <a href={googleViewUrl} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, background: '#ecfdf5', color: '#065f46', border: '1.5px solid #6ee7b7', borderRadius: '10px', padding: '10px 8px', fontSize: '13px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >🔍 {btnLabel}</a>
                    );
                  })()}
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Help Dialog */}
      {showHelp && (() => {
        const section = getHelpSection(helpContext);
        const content = (section && section.content) || '';
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>ℹ️</span>
                {(section && section.title) || t('general.help')}
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={() => speakHelp(content)}
                  className="hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center text-sm"
                >{isSpeaking ? (isPaused ? '▶️' : '⏸️') : '🔊'}</button>
                {isSpeaking && <button onClick={stopSpeaking}
                  className="hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center text-sm"
                >⏹️</button>}
                {isAdmin && <button onClick={() => { if (!helpEditing) { setHelpEditText(content); setHelpEditing(true); } else { setHelpEditing(false); } }}
                  className="hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center text-sm"
                >{helpEditing ? '👁️' : '✏️'}</button>}
                <button onClick={() => { setShowHelp(false); stopSpeaking(); }}
                  className="text-xl hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center"
                >✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-700" style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left' }}>
              {helpEditing ? (
                <textarea value={helpEditText} onChange={(e) => setHelpEditText(e.target.value)}
                  style={{ width: '100%', minHeight: '300px', padding: '8px', fontSize: '13px', border: '2px solid #818cf8', borderRadius: '8px', resize: 'vertical', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', fontFamily: 'monospace', lineHeight: '1.6' }}
                />
              ) : (
                content.split('\n').map((line, i) => {
                  const renderBold = (text) => {
                    const parts = text.split(/\*\*(.*?)\*\*/g);
                    return parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part);
                  };
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <h4 key={i} className="font-bold text-gray-900 mt-3 mb-1">{line.replace(/\*\*/g, '')}</h4>;
                  } else if (line.startsWith('• ')) {
                    return <p key={i} style={{ marginInlineStart: '12px' }} className="mb-0.5">• {renderBold(line.substring(2))}</p>;
                  } else if (line.trim() === '') {
                    return <div key={i} className="h-2" />;
                  }
                  return <p key={i} className="mb-1">{renderBold(line)}</p>;
                })
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex gap-2">
              {helpEditing ? (
                <>
                  <button onClick={() => { saveHelpContent(helpContext, helpEditText); setHelpEditing(false); }}
                    className="flex-1 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 text-sm"
                  >💾 {t('general.save') || 'שמור'}</button>
                  <button onClick={() => { saveAndTranslateHint(helpContext, helpEditText); setHelpEditing(false); }}
                    className="py-2 px-3 rounded-lg bg-indigo-500 text-white font-bold hover:bg-indigo-600 text-sm"
                  >💾🌐 EN</button>
                  <button onClick={() => setHelpEditing(false)}
                    className="py-2 px-3 rounded-lg bg-gray-300 text-gray-700 font-bold text-sm"
                  >{t('general.cancel') || 'ביטול'}</button>
                </>
              ) : (
                <button onClick={() => { setShowHelp(false); stopSpeaking(); }}
                  className="w-full py-2 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 text-sm"
                >{t('general.close')} ✓</button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10200 }}>
          <div className="bg-white rounded-xl p-4 max-w-sm w-full shadow-2xl">
            <p className="text-sm text-gray-800 mb-4 text-center font-medium" style={{ whiteSpace: 'pre-line' }}>{confirmConfig.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                }}
                className="flex-1 py-2 text-white rounded-lg font-bold"
                style={{ background: confirmConfig.confirmColor || '#ef4444' }}
              >
                {confirmConfig.confirmLabel || t('general.confirm')}
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  if (confirmConfig.onCancel) confirmConfig.onCancel();
                }}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400"
              >
                {confirmConfig.cancelLabel || t('general.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification - Subtle */}
      {/* Feedback Dialog */}
      {showFeedbackDialog && (() => {
        const maxImgs = sp.feedbackMaxImages || 3;
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 10300 }}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md shadow-2xl" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-3 rounded-t-2xl sm:rounded-t-xl flex justify-between items-center">
              <h3 className="text-base font-bold">{`💬 ${t("settings.sendFeedback")}`}</h3>
              <button onClick={() => { setShowFeedbackDialog(false); }} className="text-white opacity-70 hover:opacity-100 text-xl leading-none">✕</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Category picker */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'bug', label: `🐛 ${t('general.bug')}`, color: '#fca5a5', border: '#ef4444', text: '#b91c1c', bg: '#fef2f2' },
                  { id: 'idea', label: `💡 ${t('general.idea')}`, color: '#fcd34d', border: '#d97706', text: '#92400e', bg: '#fffbeb' },
                  { id: 'general', label: `💭 ${t('general.generalFeedback')}`, color: '#93c5fd', border: '#3b82f6', text: '#1e40af', bg: '#eff6ff' }
                ].map(cat => (
                  <button key={cat.id} onClick={() => setFeedbackCategory(cat.id)}
                    style={{ flex: 1, padding: '6px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s',
                      border: `2px solid ${feedbackCategory === cat.id ? cat.border : '#e5e7eb'}`,
                      background: feedbackCategory === cat.id ? cat.bg : 'white',
                      color: feedbackCategory === cat.id ? cat.text : '#6b7280' }}>{cat.label}</button>
                ))}
              </div>

              {/* Subject */}
              <input type="text" value={feedbackSubject}
                onChange={(e) => {
                  setFeedbackSubject(e.target.value);
                  try { localStorage.setItem('feedback_draft', JSON.stringify({ text: feedbackText, cat: feedbackCategory, subject: e.target.value, senderName: feedbackSenderName, senderEmail: feedbackSenderEmail })); } catch(err) {}
                }}
                placeholder={t('settings.feedbackSubject') || 'נושא'}
                style={{ width: '100%', padding: '8px 10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', fontFamily: 'inherit' }}
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
              />

              {/* Sender info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" value={feedbackSenderName}
                  onChange={(e) => {
                    setFeedbackSenderName(e.target.value);
                    try { localStorage.setItem('feedback_draft', JSON.stringify({ text: feedbackText, cat: feedbackCategory, subject: feedbackSubject, senderName: e.target.value, senderEmail: feedbackSenderEmail })); } catch(err) {}
                  }}
                  placeholder={t('settings.feedbackSenderName') || 'שם'}
                  style={{ flex: 1, padding: '8px 10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', fontFamily: 'inherit' }}
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
                />
                <input type="email" value={feedbackSenderEmail}
                  onChange={(e) => {
                    setFeedbackSenderEmail(e.target.value);
                    try { localStorage.setItem('feedback_draft', JSON.stringify({ text: feedbackText, cat: feedbackCategory, subject: feedbackSubject, senderName: feedbackSenderName, senderEmail: e.target.value })); } catch(err) {}
                  }}
                  placeholder={t('settings.feedbackSenderEmail') || 'מייל'}
                  style={{ flex: 1, padding: '8px 10px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', direction: 'ltr', fontFamily: 'inherit' }}
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
                />
              </div>

              {/* Text */}
              <textarea value={feedbackText}
                onChange={(e) => {
                  setFeedbackText(e.target.value);
                  try { localStorage.setItem('feedback_draft', JSON.stringify({ text: e.target.value, cat: feedbackCategory, subject: feedbackSubject, senderName: feedbackSenderName, senderEmail: feedbackSenderEmail })); } catch(err) {}
                }}
                placeholder={t("settings.feedbackPlaceholder")}
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', resize: 'none', outline: 'none', lineHeight: '1.5', boxSizing: 'border-box', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr', wordBreak: 'break-word', fontFamily: 'inherit' }}
                rows={5} autoFocus
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
              />

              {/* Image upload */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {feedbackImages.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={img} alt="" style={{ width: '68px', height: '68px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'block' }}
                      onClick={() => setModalImage(img)} />
                    <button onClick={() => setFeedbackImages(prev => prev.filter((_, i) => i !== idx))}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', color: 'white', border: '2px solid white', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                  </div>
                ))}
                {feedbackImages.length < maxImgs && (
                  <label style={{ width: '68px', height: '68px', border: '2px dashed #d1d5db', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', gap: '3px', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>📎</span>
                    <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{feedbackImages.length}/{maxImgs}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const compressed = await window.BKK.compressImage(file, 480);
                        if (compressed) setFeedbackImages(prev => [...prev, compressed]);
                      } catch(err) {
                        showToast('שגיאה בטעינת תמונה', 'error');
                      }
                      e.target.value = '';
                    }} />
                  </label>
                )}
              </div>

              {/* Send */}
              <button onClick={submitFeedback} disabled={!feedbackText.trim()}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: feedbackText.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                  background: feedbackText.trim() ? '#3b82f6' : '#e5e7eb',
                  color: feedbackText.trim() ? 'white' : '#9ca3af',
                  border: 'none' }}>
                📨 {t('settings.send')}
              </button>

            </div>
          </div>
        </div>
        );
      })()}

            {/* Feedback List Dialog (Admin Only) */}
      {showFeedbackList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-t-xl flex justify-between items-center">
              <h3 className="text-base font-bold">{`💬 Feedback (`}{feedbackList.length})</h3>
              <div className="flex items-center gap-2">
                {feedbackList.length > 0 && (
                  <button
                    onClick={() => {
                      showConfirm(t('settings.deleteAllFeedback'), () => {
                        if (isFirebaseAvailable && database) {
                          clearFeedbackList();
                        }
                      });
                    }}
                    className="text-white opacity-70 hover:opacity-100 text-sm"
                    title={t("general.deleteAll")}
                  >
                    🗑️
                  </button>
                )}
                <button onClick={() => setShowFeedbackList(false)} className="text-white opacity-70 hover:opacity-100 text-xl leading-none">✕</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {feedbackList.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm">{t("general.noRegisteredUsers")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {feedbackList.map((item) => (
                    <div key={item.firebaseId} style={{
                      borderRadius: '10px', border: `2px solid ${item.resolved ? '#e5e7eb' : '#d1d5db'}`,
                      background: item.resolved ? '#f9fafb' : 'white', opacity: item.resolved ? 0.7 : 1,
                      overflow: 'hidden', marginBottom: '2px'
                    }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px 4px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px' }}>{item.category === 'bug' ? '🐛' : item.category === 'idea' ? '💡' : '💭'}</span>
                        {item.subject ? (
                          <span style={{ fontWeight: '700', fontSize: '13px', color: '#111827', flex: 1 }}>{item.subject}</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#9ca3af', flex: 1 }}>({item.category || 'general'})</span>
                        )}
                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                          <button onClick={() => toggleFeedbackResolved(item)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', opacity: item.resolved ? 0.5 : 1 }}
                            title={item.resolved ? t('places.markUnhandled') : t('places.markHandled')}>
                            {item.resolved ? '↩️' : '✅'}
                          </button>
                          <button onClick={() => deleteFeedback(item)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', opacity: 0.5 }}
                            title={t('general.delete')}>🗑️</button>
                        </div>
                      </div>

                      {/* Sender info */}
                      {(item.senderName || item.senderEmail || item.userEmail) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', background: '#f0f9ff', flexWrap: 'wrap' }}>
                          {item.senderName && <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af' }}>👤 {item.senderName}</span>}
                          {(item.senderEmail || item.userEmail) && (
                            <a href={`mailto:${item.senderEmail || item.userEmail}?subject=Re: ${encodeURIComponent(item.subject || 'FouFou Feedback')}`}
                              style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'underline' }}>
                              ✉️ {item.senderEmail || item.userEmail}
                            </a>
                          )}
                        </div>
                      )}

                      {/* Message body */}
                      <div style={{ padding: '8px 10px', fontSize: '13px', color: '#374151', lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {item.text}
                      </div>

                      {item.images?.length > 0 && (
                        <div style={{ padding: '0 10px 8px' }}>
                          <FeedbackItemImages images={item.images} onView={(img) => setModalImage(img)} />
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px 6px', fontSize: '10px', color: '#9ca3af', borderTop: '1px solid #f3f4f6' }}>
                        <span>{`From: ${item.currentView || '?'} · ${item.userId?.slice(-6) || ''}`}</span>
                        <span>{item.date ? new Date(item.date).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Dialog */}
      {showImportDialog && importedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 rounded-t-xl">
              <h3 className="text-base font-bold">{`📥 ${t('general.importExport')}`}</h3>
            </div>
            <div className="p-4 space-y-3">
              {importedData.exportDate && (
                <p className="text-xs text-gray-500 text-center">
                  {`Date: ${new Date(importedData.exportDate).toLocaleDateString()}`}
                  {importedData.version && ` | v${importedData.version}`}
                </p>
              )}
              
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{`🏷️ ${t('interests.customCount')}`}</span>
                  <span className="font-bold text-purple-600">{(importedData.customInterests || []).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{`📍 ${t("nav.myPlaces")}`}</span>
                  <span className="font-bold text-blue-600">{(importedData.customLocations || []).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{`🗺️ ${t("nav.saved")}`}</span>
                  <span className="font-bold text-blue-600">{(importedData.savedRoutes || []).length}</span>
                </div>
                {importedData.interestConfig && (
                  <div className="flex justify-between text-sm">
                    <span>{`⚙️ ${t("general.searchSettings")}`}</span>
                    <span className="font-bold text-gray-600">{Object.keys(importedData.interestConfig).length}</span>
                  </div>
                )}
                {importedData.interestStatus && (
                  <div className="flex justify-between text-sm">
                    <span>{`✅ ${t('interests.interestStatus')}`}</span>
                    <span className="font-bold text-gray-600">{Object.keys(importedData.interestStatus).length}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2">
                <p className="text-xs text-yellow-800">
                  💡 Existing items won't be overwritten. Only new items will be added.
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleImportMerge}
                  className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition text-sm"
                >
                  ✅ {t("general.importFromFile")}
                </button>
                <button
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportedData(null);
                  }}
                  className="flex-1 py-2.5 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add City Dialog */}
      {showAddCityDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-3 rounded-t-xl flex justify-between items-center">
              <h3 className="text-base font-bold">{`🌍 ${t('settings.addCity')}`}</h3>
              <button onClick={() => { setShowAddCityDialog(false); setAddCityInput(''); setAddCitySearchStatus(''); setAddCityFound(null); setAddCityGenerated(null); }} className="text-white text-lg font-bold">✕</button>
            </div>
            <div className="p-4">
                  <div className="space-y-4">
                    {/* Search input */}
                    <div className="flex gap-2">
                      <input
                        type="text" value={addCityInput} onChange={(e) => setAddCityInput(e.target.value)}
                        placeholder={t('settings.enterCityName')}
                        className="flex-1 p-2 border-2 border-gray-300 rounded-lg text-sm"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') {
                          const doSearch = async () => {
                            if (!addCityInput.trim()) return;
                            setAddCitySearchStatus('searching');
                            setAddCityFound(null);
                            setAddCityGenerated(null);
                            try {
                              const resp = await fetch(window.BKK.GOOGLE_PLACES_TEXT_SEARCH_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': window.BKK.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.viewport,places.id' },
                                body: JSON.stringify({ textQuery: addCityInput + ' city', languageCode: 'en' })
                              });
                              const data = await resp.json();
                              if (data.places && data.places.length > 0) {
                                const place = data.places[0];
                                const cityName = place.displayName?.text || addCityInput;
                                const lat = place.location?.latitude;
                                const lng = place.location?.longitude;
                                if (lat && lng) {
                                  const cityId = cityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                  if (window.BKK.cities[cityId]) {
                                    setAddCitySearchStatus('error');
                                    showToast(t('settings.cityAlreadyExists'), 'warning');
                                    return;
                                  }
                                  setAddCityFound({ name: cityName, lat, lng, address: place.formattedAddress, id: cityId, viewport: place.viewport });
                                  setAddCitySearchStatus('found');
                                } else { setAddCitySearchStatus('error'); }
                              } else { setAddCitySearchStatus('error'); }
                            } catch (err) { console.error('[ADD CITY] Search error:', err); setAddCitySearchStatus('error'); }
                          };
                          doSearch();
                        }}}
                      />
                      <button onClick={async () => {
                            if (!addCityInput.trim()) return;
                            setAddCitySearchStatus('searching');
                            setAddCityFound(null);
                            setAddCityGenerated(null);
                            try {
                              const resp = await fetch(window.BKK.GOOGLE_PLACES_TEXT_SEARCH_URL, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': window.BKK.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.viewport,places.id' },
                                body: JSON.stringify({ textQuery: addCityInput + ' city', languageCode: 'en' })
                              });
                              const data = await resp.json();
                              if (data.places && data.places.length > 0) {
                                const place = data.places[0];
                                const cityName = place.displayName?.text || addCityInput;
                                const lat = place.location?.latitude;
                                const lng = place.location?.longitude;
                                if (lat && lng) {
                                  const cityId = cityName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                  if (window.BKK.cities[cityId]) {
                                    setAddCitySearchStatus('error');
                                    showToast(t('settings.cityAlreadyExists'), 'warning');
                                    return;
                                  }
                                  setAddCityFound({ name: cityName, lat, lng, address: place.formattedAddress, id: cityId, viewport: place.viewport });
                                  setAddCitySearchStatus('found');
                                } else { setAddCitySearchStatus('error'); }
                              } else { setAddCitySearchStatus('error'); }
                            } catch (err) { console.error('[ADD CITY] Search error:', err); setAddCitySearchStatus('error'); }
                      }} disabled={!addCityInput.trim() || addCitySearchStatus === 'searching'}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 disabled:opacity-50"
                      >{addCitySearchStatus === 'searching' ? '...' : `🔍 ${t('general.search')}`}</button>
                    </div>

                    {/* Search result */}
                    {addCitySearchStatus === 'error' && (
                      <p className="text-sm text-red-500 text-center">{t('settings.cityNotFound')}</p>
                    )}
                    
                    {addCitySearchStatus === 'found' && addCityFound && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                        <p className="font-bold text-lg">{addCityFound.name}</p>
                        <p className="text-xs text-gray-500">{addCityFound.address}</p>
                        <p className="text-xs text-gray-400 mt-1">{addCityFound.lat.toFixed(4)}, {addCityFound.lng.toFixed(4)}</p>
                        <button onClick={async () => {
                          if (!addCityFound) return;
                          setAddCitySearchStatus('generating');
                          try {
                            const areasResp = await fetch(window.BKK.GOOGLE_PLACES_TEXT_SEARCH_URL, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': window.BKK.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'places.displayName,places.location,places.types,places.formattedAddress' },
                              body: JSON.stringify({ textQuery: `popular neighborhoods districts areas in ${addCityFound.name}`, languageCode: 'en', maxResultCount: 10 })
                            });
                            const areasData = await areasResp.json();
                            const areas = [];
                            const seen = new Set();
                            if (areasData.places) {
                              areasData.places.forEach((p, i) => {
                                const areaName = p.displayName?.text || `Area ${i+1}`;
                                const areaId = areaName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                if (seen.has(areaId) || !p.location) return;
                                seen.add(areaId);
                                areas.push({ id: areaId, label: areaName, labelEn: areaName, desc: p.formattedAddress || '', descEn: p.formattedAddress || '', lat: p.location.latitude, lng: p.location.longitude, radius: 2000, size: 'medium', safety: 'safe' });
                              });
                            }
                            if (areas.length === 0) {
                              areas.push({ id: 'center', label: 'Center', labelEn: 'Center', desc: 'City center', descEn: 'City center', lat: addCityFound.lat, lng: addCityFound.lng, radius: 3000, size: 'large', safety: 'safe' });
                            }
                            // Interests start empty — use Settings → "העתק תחומים מ:" to copy from an existing city
                            const defaultInterests = [];
                            const defaultPlaceTypes = {};
                            let allCityRadius = 15000;
                            if (addCityFound.viewport) {
                              const vp = addCityFound.viewport;
                              if (vp.high && vp.low) {
                                const latDiff = Math.abs(vp.high.latitude - vp.low.latitude);
                                const lngDiff = Math.abs(vp.high.longitude - vp.low.longitude);
                                allCityRadius = Math.round(Math.max(latDiff, lngDiff) * 111000 / 2);
                              }
                            }
                            const newCity = {
                              id: addCityFound.id, name: addCityFound.name, nameEn: addCityFound.name,
                              country: addCityFound.address?.split(',').pop()?.trim() || '',
                              icon: '📍', secondaryIcon: '🏙️',
                              theme: { color: '#6366f1', iconLeft: '📍', iconRight: '🗺️' },
                              active: false, distanceMultiplier: 1.2,
                              dayStartHour: 7, nightStartHour: 18,
                              center: { lat: addCityFound.lat, lng: addCityFound.lng },
                              allCityRadius, areas, interests: defaultInterests,
                              interestToGooglePlaces: defaultPlaceTypes,
                              textSearchInterests: { graffiti: 'street art' },
                              
                              interestTooltips: {},
                              systemRoutes: []
                            };
                            setAddCityGenerated(newCity);
                            setAddCitySearchStatus('done');
                          } catch (err) {
                            console.error('[ADD CITY] Generate error:', err);
                            setAddCitySearchStatus('error');
                            showToast(t('general.error'), 'error');
                          }
                        }}
                          className="mt-3 px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600"
                        >{`🏗️ ${t('settings.generateCity')}`}</button>
                      </div>
                    )}

                    {addCitySearchStatus === 'generating' && (
                      <div className="text-center py-4">
                        <div className="text-2xl animate-spin inline-block">🌍</div>
                        <p className="text-sm text-gray-500 mt-2">{t('settings.generatingCity')}</p>
                      </div>
                    )}

                    {addCitySearchStatus === 'done' && addCityGenerated && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="font-bold text-center mb-2">{addCityGenerated.icon} {addCityGenerated.nameEn}</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>📍 {addCityGenerated.areas.length} {t('general.areas')}: {addCityGenerated.areas.map(a => a.labelEn).join(', ')}</p>
                          <p>⭐ {addCityGenerated.interests.length} {t('nav.interests')}</p>
                          <p>🔍 {t('settings.radius')}: {addCityGenerated.allCityRadius}m</p>
                        </div>
                        <p className="text-[10px] text-amber-600 mt-2 text-center">{t('settings.cityStartsInactive')}</p>
                        <button onClick={() => {
                          if (!addCityGenerated) return;
                          window.BKK.cities[addCityGenerated.id] = addCityGenerated;
                          window.BKK.cityData[addCityGenerated.id] = addCityGenerated;
                          window.BKK.cityRegistry[addCityGenerated.id] = {
                            id: addCityGenerated.id, name: addCityGenerated.name, nameEn: addCityGenerated.nameEn,
                            country: addCityGenerated.country, icon: addCityGenerated.icon, file: `city-${addCityGenerated.id}.js`
                          };
                          try {
                            const customCities = JSON.parse(localStorage.getItem('custom_cities') || '{}');
                            customCities[addCityGenerated.id] = addCityGenerated;
                            localStorage.setItem('custom_cities', JSON.stringify(customCities));
                          } catch(e) { console.error('Failed to save city:', e); }
                          window.BKK.exportCityFile(addCityGenerated);
                          showToast(`✓ ${addCityGenerated.nameEn} ${t('settings.cityAdded')}`, 'success');
                          setShowAddCityDialog(false);
                          setAddCityInput(''); setAddCitySearchStatus(''); setAddCityFound(null); setAddCityGenerated(null);
                          switchCity(addCityGenerated.id);
                          setFormData(prev => ({...prev}));
                        }}
                          className="mt-3 w-full py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600"
                        >{`✓ ${t('settings.addCityConfirm')}`}</button>
                      </div>
                    )}
                  </div>
            </div>
          </div>
        </div>
      )}


            {/* Emoji Picker Dialog */}
            {iconPickerConfig && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between">
                    <h3 className="text-sm font-bold">✨ {t('emoji.suggestTitle')}</h3>
                    <button onClick={() => setIconPickerConfig(null)} className="text-xl hover:bg-white hover:bg-opacity-20 rounded-full w-7 h-7 flex items-center justify-center">✕</button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={iconPickerConfig.description || ''}
                        onChange={(e) => setIconPickerConfig({...iconPickerConfig, description: e.target.value})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && iconPickerConfig.description?.trim()) {
                            setIconPickerConfig(prev => ({...prev, loading: true, suggestions: []}));
                            window.BKK.suggestEmojis(iconPickerConfig.description).then(emojis => {
                              setIconPickerConfig(prev => prev ? {...prev, suggestions: emojis, loading: false} : null);
                            });
                          }
                        }}
                        placeholder={t('emoji.describePlaceholder')}
                        className="flex-1 p-2 text-sm border-2 border-orange-300 rounded-lg focus:border-orange-500"
                        style={{ direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (!iconPickerConfig.description?.trim()) return;
                          setIconPickerConfig(prev => ({...prev, loading: true, suggestions: []}));
                          window.BKK.suggestEmojis(iconPickerConfig.description).then(emojis => {
                            setIconPickerConfig(prev => prev ? {...prev, suggestions: emojis, loading: false} : null);
                          });
                        }}
                        disabled={iconPickerConfig.loading || !iconPickerConfig.description?.trim()}
                        className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50"
                      >
                        {iconPickerConfig.loading ? '...' : '🔍'}
                      </button>
                    </div>
                    
                    {iconPickerConfig.loading && (
                      <div className="text-center text-gray-500 text-sm py-4">{t('emoji.searching')}...</div>
                    )}
                    
                    {iconPickerConfig.suggestions?.length > 0 && (
                      <React.Fragment>
                        <div className="flex flex-wrap justify-center gap-2">
                          {iconPickerConfig.suggestions.map((emoji, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                if (iconPickerConfig.callback) iconPickerConfig.callback(emoji);
                                setIconPickerConfig(prev => prev ? {...prev, selected: emoji} : null);
                              }}
                              className={`text-3xl p-3 rounded-xl border-2 transition-all cursor-pointer ${iconPickerConfig.selected === emoji ? 'border-orange-500 bg-orange-100 ring-2 ring-orange-300' : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'}`}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 justify-center pt-1">
                          <button
                            onClick={() => {
                              if (!iconPickerConfig.description?.trim()) return;
                              setIconPickerConfig(prev => ({...prev, loading: true, suggestions: [], selected: null}));
                              window.BKK.suggestEmojis(iconPickerConfig.description).then(emojis => {
                                setIconPickerConfig(prev => prev ? {...prev, suggestions: emojis, loading: false} : null);
                              });
                            }}
                            className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 border border-gray-300"
                          >🔄 {t('emoji.moreOptions')}</button>
                          <button
                            onClick={() => setIconPickerConfig(null)}
                            className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600"
                          >✓ {t('emoji.done')}</button>
                        </div>
                      </React.Fragment>
                    )}
                    
                    {!iconPickerConfig.loading && (!iconPickerConfig.suggestions || iconPickerConfig.suggestions.length === 0) && (
                      <p className="text-center text-xs text-gray-400">{t('emoji.typeAndSearch')}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {toastMessage && (<>
        {/* Backdrop — click anywhere outside closes toast */}
        <div onClick={() => setToastMessage(null)} style={{ position: 'fixed', inset: 0, zIndex: 10498 }} />
        <div
          dir={window.BKK.i18n.isRTL() ? 'rtl' : 'ltr'}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            left: '10px',
            maxWidth: '420px',
            margin: '0 auto',
            padding: '12px 14px 10px',
            borderRadius: '12px',
            backgroundColor: toastMessage.type === 'error' ? '#fef2f2' : toastMessage.type === 'warning' ? '#fffbeb' : toastMessage.type === 'info' ? '#eff6ff' : '#f0fdf4',
            border: `1px solid ${toastMessage.type === 'error' ? '#fca5a5' : toastMessage.type === 'warning' ? '#fcd34d' : toastMessage.type === 'info' ? '#93c5fd' : '#86efac'}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            zIndex: 10499,
            animation: 'slideDown 0.15s ease-out',
            direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr',
          }}
        >
          {/* Close button — top corner */}
          <button
            onClick={() => setToastMessage(null)}
            style={{
              position: 'absolute',
              top: '8px',
              [window.BKK.i18n.isRTL() ? 'left' : 'right']: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '16px', color: '#9ca3af', lineHeight: 1, padding: '2px 4px',
              borderRadius: '4px'
            }}
          >✕</button>
          {/* Content */}
          <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.7',
            paddingInlineEnd: '20px',
            textAlign: window.BKK.i18n.isRTL() ? 'right' : 'left'
          }}>
            {toastMessage.message.split('\n').map((line, i) => (
              <div key={i} style={{
                fontWeight: i === 0 ? '700' : '400',
                marginBottom: i === 0 ? '6px' : '2px',
                color: i === 0 ? '#1e3a5f' : i === toastMessage.message.split('\n').length - 1 ? '#6b7280' : '#374151',
                fontSize: i === 0 ? '14px' : '13px'
              }}>{line}</div>
            ))}
          </div>
        </div>
      </>)}


      {/* === PLACE REVIEW DIALOG === */}
      {reviewDialog && (() => {
        const avgRating = reviewDialog.reviews.length > 0 
          ? (reviewDialog.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewDialog.reviews.filter(r => r.rating > 0).length || 0).toFixed(1)
          : null;
        const visitorId = authUser?.uid || window.BKK.visitorId || 'anonymous';
        
        const handleClose = () => {
          stopAllRecording(); // stop recording synchronously before any dialog logic
          setTimeout(() => { // wait one tick so onEnd fires before we check state
            if (reviewDialog?.hasChanges) {
              showConfirm(
                t('reviews.unsavedChanges') || 'יש שינויים שלא נשמרו. לשמור?',
                () => saveReview(),
                { onCancel: () => setReviewDialog(null), confirmLabel: t('general.save') || 'שמור', confirmColor: '#f59e0b' }
              );
            } else {
              setReviewDialog(null);
            }
          }, 50);
        };
        
        return (
          <div className="fixed inset-0 flex items-center justify-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10100 }} onClick={handleClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-3 border-b bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
                  <div className="text-center flex-1">
                    <h3 className="font-bold text-base text-gray-800">{reviewDialog.place.name}</h3>
                    {reviewDialog.place.description && (
                      <p className="text-[10px] text-gray-500">{reviewDialog.place.description}</p>
                    )}
                    {avgRating && avgRating !== 'NaN' && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="text-amber-500 text-sm">{'★'.repeat(Math.round(parseFloat(avgRating)))}</span>
                        <span className="text-xs text-gray-600 font-bold">{avgRating}</span>
                        <span className="text-[10px] text-gray-400">({reviewDialog.reviews.filter(r => r.rating > 0).length})</span>
                      </div>
                    )}
                  </div>
                  <div style={{ width: '24px' }}></div>
                </div>
              </div>
              
              {/* My Review Section */}
              <div className="p-3 border-b bg-blue-50">
                <h4 className="text-xs font-bold text-blue-700 mb-2">⭐ {t('reviews.myReview')}</h4>
                {/* Star Rating */}
                <div className="flex gap-1 mb-2 justify-center">
                  {[1,2,3,4,5].map(star => (
                    <button key={star}
                      onClick={() => setReviewDialog(prev => ({...prev, myRating: star, hasChanges: true}))}
                      style={{ fontSize: '28px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: star <= reviewDialog.myRating ? '#f59e0b' : '#d1d5db' }}
                    >★</button>
                  ))}
                </div>
                {/* Text + dictation — unified RecordingTextarea */}
                {RecordingTextarea({
                  fieldId: 'review_text',
                  value: reviewDialog.myText,
                  onChange: (e) => setReviewDialog(prev => ({...prev, myText: e.target.value, hasChanges: true})),
                  onClear: () => setReviewDialog(prev => ({...prev, myText: '', hasChanges: true})),
                  placeholder: t('reviews.writeReview'),
                  rows: 3
                })}
                {RecordingInterim({ fieldId: 'review_text' })}
              </div>
              
              {/* All Reviews */}
              <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: '40vh' }}>
                <h4 className="text-xs font-bold text-gray-500 mb-2">{t('reviews.allReviews')} ({reviewDialog.reviews.length})</h4>
                {reviewDialog.reviews.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">{t('reviews.noReviews')}</p>
                ) : (
                  reviewDialog.reviews.map((review, idx) => {
                    const isMe = review.odvisitorId === visitorId;
                    const canDelete = isMe || isCurrentUserAdmin;
                    return (
                      <div key={idx} className={`p-2 rounded-lg mb-2 ${isMe ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-gray-700">{isMe ? '👤 ' + (review.userName || t('general.me')) : review.userName}</span>
                            {review.rating > 0 && <span className="text-amber-500 text-xs">{'★'.repeat(review.rating)}</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-gray-400">{new Date(review.timestamp).toLocaleDateString()}</span>
                            {canDelete && (
                              <button
                                onClick={() => isMe ? deleteMyReview() : deleteReviewByAdmin(review.odvisitorId)}
                                className="text-red-400 hover:text-red-600 text-xs"
                                title={t('reviews.deleteReview')}>🗑️</button>
                            )}
                          </div>
                        </div>
                        {review.text && (
                          <ReviewTextWithTranslate text={review.text} translateText={translateText} detectNeedsTranslation={detectNeedsTranslation} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Footer Buttons */}
              <div className="p-3 border-t flex gap-2" style={{ direction: 'ltr' }}>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-50"
                >{t('reviews.cancel')}</button>
                <button
                  onClick={saveReview}
                  disabled={reviewDialog.myRating === 0}
                  className="flex-1 px-4 py-2 rounded-lg font-bold text-sm text-white"
                  style={{ background: reviewDialog.myRating > 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#d1d5db', cursor: reviewDialog.myRating > 0 ? 'pointer' : 'not-allowed' }}
                >{t('reviews.save')} ⭐</button>
              </div>
            </div>
          </div>
        );
      })()}

        {/* ===== QUICK ADD PLACE DIALOG ===== */}
        {showQuickAddDialog && quickAddPlace && (
          <QuickAddPlaceDialog
            place={quickAddPlace}
            allInterestOptions={allInterestOptions}
            interestStatus={interestStatus}
            interestConfig={interestConfig}
            selectedCityId={selectedCityId}
            isUnlocked={isUnlocked}
            tLabel={tLabel}
            t={t}
            RecordingTextarea={RecordingTextarea}
            RecordingInterim={RecordingInterim}
            onSave={saveQuickAddPlace}
            onCancel={() => { setShowQuickAddDialog(false); setQuickAddPlace(null); }}
            showToast={showToast}
          />
        )}

        {/* ===== CAPTURE NOW DIALOG — uses QuickAddPlaceDialog in captureMode ===== */}
        {showQuickCapture && (
          <QuickAddPlaceDialog
            captureMode={true}
            place={{
              ...newLocation,
              id: newLocation.id || Date.now(),
              custom: true,
              status: "active",
              cityId: selectedCityId,
              addedAt: new Date().toISOString(),
              _onGpsFromExif: (gps) => {
                const detected = window.BKK.getAreasForCoordinates(gps.lat, gps.lng);
                setNewLocation(prev => ({
                  ...prev, lat: gps.lat, lng: gps.lng,
                  ...(detected.length > 0 ? { areas: detected, area: detected[0] } : {})
                }));
              }
            }}
            gpsStatus={{
              loading: newLocation.gpsLoading,
              lat: newLocation.lat,
              lng: newLocation.lng,
              nearestStop: newLocation.nearestStop,
              blocked: newLocation.gpsBlocked
            }}
            onAutoName={(interestId, allSelectedInterests) => {
              // Guard: if interest not found in allInterestOptions, skip name generation
              const interestObj = allInterestOptions.find(o => o.id === interestId);
              if (!interestObj) return "";
              const result = window.BKK.generateLocationName(
                interestId, newLocation.lat, newLocation.lng,
                interestCounters, allInterestOptions, areaOptions
              );
              // Update newLocation and remember interests for next capture (session only)
              const updatedInterests = allSelectedInterests || [interestId];
              setNewLocation(prev => ({ ...prev, interests: updatedInterests, name: result?.name || prev.name }));
              lastCaptureInterestsRef.current = updatedInterests;
              // Remember last interest for trail
              if (activeTrail) {
                const updatedTrail = { ...activeTrail, lastInterest: interestId };
                setActiveTrail(updatedTrail);
                localStorage.setItem("foufou_active_trail", JSON.stringify(updatedTrail));
              }
              return result?.name || "";
            }}
            onSearchGoogle={(name) => searchPlacesByName(name)}
            searchResults={locationSearchResults}
            onSelectSearchResult={(result) => {
              const detected = window.BKK.getAreasForCoordinates(result.lat, result.lng);
              const areaUpdates = detected.length > 0 ? { areas: detected, area: detected[0] } : {};
              setNewLocation(prev => ({
                ...prev, name: result.name, lat: result.lat, lng: result.lng,
                address: result.address, googlePlaceId: result.googlePlaceId, googlePlace: true, ...areaUpdates
              }));
              setLocationSearchResults(null);
              showToast(`✅ ${result.name}`, 'success');
            }}
            onClearSearch={() => setLocationSearchResults(null)}
            allInterestOptions={allInterestOptions}
            interestStatus={interestStatus}
            selectedCityId={selectedCityId}
            isUnlocked={isUnlocked}
            tLabel={tLabel}
            t={t}
            RecordingTextarea={RecordingTextarea}
            RecordingInterim={RecordingInterim}
            onSave={(enriched, rating) => {
              // Build the final location object directly — do NOT use setNewLocation + saveWithDedupCheck
              // because setNewLocation is async and saveWithDedupCheck would read stale state
              // (this was the root cause of images not being saved from QuickCapture)
              const defaultInterest = activeTrail?.interests?.[0] || "spotted";
              const finalInterests = enriched.interests?.length > 0 ? enriched.interests : [defaultInterest];
              lastCaptureInterestsRef.current = finalInterests;
              const finalName = enriched.name?.trim() || (() => {
                const r = window.BKK.generateLocationName(
                  finalInterests[0], newLocation.lat, newLocation.lng,
                  interestCounters, allInterestOptions, areaOptions
                );
                return r?.name || ("Spotted #" + Date.now().toString().slice(-4));
              })();
              const finalLocation = {
                ...newLocation,
                ...enriched,
                // Use Google place coords if available (user selected from search), else GPS from newLocation
                lat: enriched.lat || newLocation.lat,
                lng: enriched.lng || newLocation.lng,
                areas: enriched.areas?.length > 0 ? enriched.areas : newLocation.areas,
                area: enriched.area || newLocation.area,
                name: finalName,
                interests: finalInterests,
                uploadedImage: enriched.uploadedImage || null,
                userRating: rating || null
              };
              // Pass finalLocation as overrideData — bypasses stale newLocation state
              saveWithDedupCheck(true, true, finalLocation);
            }}
            onCancel={() => setShowQuickCapture(false)}
          />
        )}

        {/* Reorder Stops Dialog */}
        {showRoutePreview && route?.stops && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={() => { setRoute(prev => prev ? { ...prev, stops: reorderOriginalStopsRef.current || prev.stops } : prev); setShowRoutePreview(false); }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'relative', width: '92%', maxWidth: '420px', maxHeight: '85vh', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#6b21a8' }}>{'≡ ' + t('route.reorderStops')}</span>
                <button onClick={() => { setRoute(prev => prev ? { ...prev, stops: reorderOriginalStopsRef.current || prev.stops } : prev); setShowRoutePreview(false); }}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280', padding: '0 4px' }}>✕</button>
              </div>
              
              {/* Scrollable stop list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {(() => {
                  const activeStops = route.stops.filter(s => !isStopDisabled(s));
                  const moveStop = (fromActiveIdx, toActiveIdx) => {
                    if (toActiveIdx < 0 || toActiveIdx >= activeStops.length) return;
                    const activeIndices = route.stops.map((s, i) => ({ s, i })).filter(x => !isStopDisabled(x.s));
                    const newStops = [...route.stops];
                    const fromOrig = activeIndices[fromActiveIdx].i;
                    const [moved] = newStops.splice(fromOrig, 1);
                    const updatedActiveIndices = newStops.map((s, i) => ({ s, i })).filter(x => !isStopDisabled(x.s));
                    const targetPos = toActiveIdx < updatedActiveIndices.length ? updatedActiveIndices[toActiveIdx].i : newStops.length;
                    newStops.splice(targetPos, 0, moved);
                    setRoute(prev => ({ ...prev, stops: newStops }));
                  };
                  return activeStops.map((stop, idx) => (
                    <div key={stop.name + idx}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', marginBottom: '4px', background: 'white', borderRadius: '10px', border: '2px solid #e5e7eb' }}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', 
                        background: idx === 0 ? '#22c55e' : idx === activeStops.length - 1 ? '#ef4444' : '#8b5cf6',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 'bold', flexShrink: 0
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 'bold', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stop.name}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                        <button
                          onClick={() => moveStop(idx, idx - 1)}
                          disabled={idx === 0}
                          style={{ width: '28px', height: '24px', borderRadius: '4px', border: 'none', cursor: idx === 0 ? 'default' : 'pointer',
                            background: idx === 0 ? '#f3f4f6' : '#ede9fe', color: idx === 0 ? '#d1d5db' : '#7c3aed',
                            fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >▲</button>
                        <button
                          onClick={() => moveStop(idx, idx + 1)}
                          disabled={idx === activeStops.length - 1}
                          style={{ width: '28px', height: '24px', borderRadius: '4px', border: 'none', cursor: idx === activeStops.length - 1 ? 'default' : 'pointer',
                            background: idx === activeStops.length - 1 ? '#f3f4f6' : '#ede9fe', color: idx === activeStops.length - 1 ? '#d1d5db' : '#7c3aed',
                            fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >▼</button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              
              {/* Footer: Update + Cancel */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    // Check if order changed
                    const orig = reorderOriginalStopsRef.current;
                    const curr = route.stops;
                    const changed = orig && curr && (orig.length !== curr.length || orig.some((s, i) => s.name !== curr[i]?.name));
                    setShowRoutePreview(false);
                    if (changed) {
                      userManualOrderRef.current = true;
                      setRoute(prev => prev ? { ...prev, optimized: false } : prev);
                      showToast(t('route.orderUpdated'), 'success');
                      window.BKK.logEvent?.('route_reordered', { stops_count: curr?.length || 0 });
                    }
                  }}
                  style={{ flex: 1, padding: '10px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {t('general.update')}
                </button>
                <button
                  onClick={() => {
                    setRoute(prev => prev ? { ...prev, stops: reorderOriginalStopsRef.current || prev.stops } : prev);
                    setShowRoutePreview(false);
                  }}
                  style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {t('general.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Dedup Results Dialog */}
        {(() => {
          const filtered = bulkDedupResults?.filter(cluster => {
            const all = [cluster.loc, ...cluster.matches];
            return !all.every(p => p.dedupOk);
          }) || [];
          return filtered.length > 0 && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '2px solid #eab308', background: 'linear-gradient(135deg, #fefce8, #fef9c3)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e' }}>🔍 {t('dedup.title')} ({filtered.length})</h3>
              <button onClick={() => setBulkDedupResults(null)} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #6b7280, #4b5563)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                {t('dedup.close')} ✕
              </button>
            </div>
            
            {/* Scrollable content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
              {filtered.map((cluster, ci) => {
                const allPlaces = [cluster.loc, ...cluster.matches];
                return (
                <div key={ci} style={{ marginBottom: '16px', padding: '12px', background: '#fefce8', border: '2px solid #eab308', borderRadius: '14px' }}>
                  <div style={{ fontSize: '10px', color: '#92400e', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
                    {allPlaces.length} {t('route.places')} · {cluster.matches[0]?._distance || 0}m
                  </div>
                  {allPlaces.map((loc, li) => {
                    const interest = allInterestOptions.find(o => loc.interests?.includes(o.id));
                    const icon = interest?.icon?.startsWith?.('data:') ? '📍' : (interest?.icon || '📍');
                    const mapsUrl = window.BKK.getGoogleMapsUrl(loc);
                    return (
                    <div key={li} style={{ marginBottom: '6px', background: 'white', borderRadius: '10px', border: '1px solid #fde68a', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
                        <span style={{ fontSize: '20px' }}>{icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => {
                              const fullLoc = customLocations.find(cl => cl.id === loc.id);
                              if (fullLoc) handleEditLocation(fullLoc);
                            }}
                            style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{loc.name}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>{loc.description || ''}</div>
                          {loc.address && <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>{loc.address}</div>}
                        </div>
                      </div>
                      {/* Action buttons row */}
                      <div style={{ display: 'flex', gap: '4px', padding: '0 8px 8px', direction: 'ltr' }}>
                        {mapsUrl && (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '5px 10px', fontSize: '10px', fontWeight: 'bold', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            🗺️ Google Maps
                          </a>
                        )}
                        {loc.lat && loc.lng && (
                          <span style={{ padding: '5px 8px', fontSize: '9px', color: '#6b7280', background: '#f3f4f6', borderRadius: '6px' }}>
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            showConfirm(`${t('dedup.confirmDelete')}\n\n${loc.name}`, () => {
                              mergeDedupLocations(allPlaces.find(p => p.id !== loc.id)?.id || cluster.loc.id, loc.id);
                            });
                          }}
                          style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          🗑️ {t('dedup.remove')}
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
                );
              })}
            </div>
          </div>
        );})()}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LOGIN DIALOG */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showLoginDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '16px' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full" style={{ maxWidth: '380px', direction: window.BKK.i18n.isRTL() ? 'rtl' : 'ltr' }}>
            {/* Header */}
            <div style={{ padding: '20px 20px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🐾</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>FouFou</h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>{t('auth.loginSubtitle') || 'התחבר כדי לשמור את ההתקדמות שלך'}</p>
            </div>

            {authUser ? (
              /* Already signed in — show profile */
              <div style={{ padding: '0 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '12px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
                  {authUser.photoURL && <img src={authUser.photoURL} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{authUser.displayName || authUser.email || (t('auth.anonymous'))}</div>
                    {authUser.email && <div style={{ fontSize: '11px', color: '#6b7280' }}>{authUser.email}</div>}
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                      {userRole === 2 ? '👑 Admin' : userRole === 1 ? '✏️ Editor' : '👤 ' + (t('auth.regular') || 'משתמש')}
                    </div>
                  </div>
                </div>
                {authUser.isAnonymous && (
                  <div style={{ padding: '10px', background: '#fef3c7', borderRadius: '8px', marginBottom: '10px', border: '1px solid #fbbf24' }}>
                    <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '6px' }}>{t('auth.anonWarning') || '⚠️ חשבון אנונימי — אם תנקה cache הנתונים יאבדו. קשר לחשבון Google כדי לשמור.'}</div>
                    <button onClick={authLinkAnonymousToGoogle}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #f59e0b', background: 'white', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#92400e' }}>
                      🔗 {t('auth.linkGoogle') || 'קשר לחשבון Google'}
                    </button>
                  </div>
                )}
                <button onClick={authSignOut}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #fca5a5', background: '#fef2f2', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', color: '#dc2626' }}>
                  🚪 {t('auth.signOut') || 'התנתק'}
                </button>
                {!authUser?.isAnonymous && !isEditor && (
                  <button onClick={authDeleteAccount}
                    style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #fca5a5', background: 'white', fontSize: '12px', cursor: 'pointer', color: '#ef4444', marginTop: '6px' }}>
                    🗑️ {t('auth.deleteAccount') || 'מחק חשבון'}
                  </button>
                )}
                {/* Role Impersonation — real admin only */}
                {isRealAdmin && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '6px' }}>🎭 Test as different role:</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[
                        { role: null, label: '👑 Admin', desc: 'Real' },
                        { role: 1, label: '✏️ Editor', desc: '' },
                        { role: 0, label: '👤 Regular', desc: '' }
                      ].map(opt => {
                        const isActive = roleOverride === opt.role;
                        return (
                          <button key={String(opt.role)}
                            onClick={() => { setRoleOverride(opt.role); setShowLoginDialog(false); showToast(`🎭 ${opt.label}`, 'info'); }}
                            style={{ flex: 1, padding: '6px 4px', borderRadius: '6px', border: isActive ? '2px solid #7c3aed' : '1px solid #d1d5db', background: isActive ? '#ede9fe' : 'white', fontSize: '11px', fontWeight: isActive ? 'bold' : 'normal', cursor: 'pointer', color: isActive ? '#7c3aed' : '#6b7280' }}>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not signed in — show login options */
              <div style={{ padding: '0 20px 20px' }}>

                {/* Google */}
                <button onClick={authSignInGoogle}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', background: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {t('auth.continueGoogle') || 'המשך עם Google'}
                </button>

                {/* Error */}
                {loginError && (
                  <div style={{ marginTop: '4px', marginBottom: '8px', padding: '8px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '11px', color: '#dc2626' }}>
                    ⚠️ {loginError}
                  </div>
                )}

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{t('auth.orSkip') || 'או'}</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                </div>

                {/* Anonymous */}
                <button onClick={authSignInAnonymous}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '12px', cursor: 'pointer', color: '#6b7280' }}>
                  👻 {t('auth.continueAnonymous') || 'המשך בלי חשבון'}
                </button>
              </div>            )}

            {/* Close */}
            <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
              <button onClick={() => { setShowLoginDialog(false); setLoginError(''); }}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#9ca3af', cursor: 'pointer' }}>
                {t('general.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* USER MANAGEMENT DIALOG (Admin Only) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showUserManagement && isRealAdmin && (() => {
        const roleColors = ['#6b7280', '#7c3aed', '#dc2626'];
        const isAnon = (u) => !u.email && !u.name;
        const deleteUser = async (uid, displayName) => {
          if (!window.confirm(`מחק משתמש "${displayName}"?
פעולה זו אינה ניתנת לביטול.`)) return;
          try {
            await deleteUser(uid);
            showToast(`🗑️ "${displayName}" ${t('general.removed') || 'נמחק'}`, 'success');
            authLoadAllUsers();
          } catch (e) {
            showToast('❌ ' + e.message, 'error');
          }
        };
        const named = allUsers.filter(u => !isAnon(u));
        const anons = allUsers.filter(u => isAnon(u));
        const allSorted = [...named, ...anons];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '12px' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full" style={{ maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', direction: 'ltr' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>👥 User Management</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={authLoadAllUsers} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer' }}>🔄</button>
                  <button onClick={() => setShowUserManagement(false)} style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                {allUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Loading...</div>
                ) : allSorted.map(user => {
                  const anon = isAnon(user);
                  const displayName = user.name || user.email || (anon ? `אנונימי · ${user.uid.slice(0,10)}` : user.uid.slice(0,12));
                  const isSelf = user.uid === authUser?.uid;
                  return (
                    <div key={user.uid} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderBottom: '1px solid #f3f4f6', opacity: anon ? 0.75 : 1, background: anon ? '#fafafa' : 'white' }}>
                      {user.photo
                        ? <img src={user.photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                        : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: anon ? '#f3f4f6' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{anon ? '👻' : '👤'}</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: anon ? '#9ca3af' : '#111827' }}>{displayName}</div>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                          {anon ? 'אנונימי' : (user.email || '')}
                          {user.lastLogin ? ` · ${new Date(user.lastLogin).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      {!anon && (
                        <select value={user.role || 0}
                          onChange={e => authUpdateUserRole(user.uid, parseInt(e.target.value))}
                          disabled={isSelf}
                          style={{ padding: '3px 6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '11px', fontWeight: 'bold', color: roleColors[user.role || 0], cursor: isSelf ? 'not-allowed' : 'pointer', opacity: isSelf ? 0.5 : 1 }}>
                          <option value={0}>👤 Regular</option>
                          <option value={1}>✏️ Editor</option>
                          <option value={2}>👑 Admin</option>
                        </select>
                      )}
                      {anon && <span style={{ fontSize: '10px', color: '#d1d5db', padding: '0 4px' }}>—</span>}
                      {!isSelf && (
                        <button
                          onClick={() => deleteUser(user.uid, displayName)}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}
                          title="מחק משתמש"
                        >🗑️</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>
                {named.length} רשומים · {anons.length} אנונימיים · לא ניתן לשנות תפקיד עצמי
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── About Dialog ── */}
      {showAbout && (() => {
        const lang = currentLang || 'he';
        const text = aboutContent?.[lang] || aboutContent?.he || '';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '16px' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full" style={{ maxWidth: '440px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', direction: lang === 'he' ? 'rtl' : 'ltr' }}>

              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>🐾</span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>FouFou</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>City Trail Generator</div>
                  </div>
                </div>
                <button onClick={() => { setShowAbout(false); setAboutEditing(false); }} style={{ fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

                {/* About text — view or edit */}
                {aboutEditing ? (
                  <div>
                    <textarea
                      value={aboutLocalText}
                      onChange={e => setAboutLocalText(e.target.value)}
                      rows={10}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', lineHeight: '1.6', resize: 'vertical', direction: lang === 'he' ? 'rtl' : 'ltr', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder={t('about.placeholder')}
                      autoFocus
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      {lang === 'he' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { saveAboutContentOnly(aboutLocalText); setAboutEditing(false); }}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', background: '#6b7280', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                          >
                            💾 {t('about.save')}
                          </button>
                          <button
                            onClick={async () => { await saveAboutContent(aboutLocalText); setAboutEditing(false); }}
                            style={{ flex: 2, padding: '8px', borderRadius: '8px', background: '#f97316', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                          >
                            💾 {t('about.saveTranslate')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { saveAboutContentOnly(aboutLocalText); setAboutEditing(false); }}
                          style={{ padding: '8px', borderRadius: '8px', background: '#f97316', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                        >
                          💾 {t('about.save')}
                        </button>
                      )}
                      <button
                        onClick={() => { setAboutEditing(false); setAboutLocalText(text); }}
                        style={{ padding: '8px 14px', borderRadius: '8px', background: '#f3f4f6', color: '#374151', border: 'none', fontSize: '13px', cursor: 'pointer' }}
                      >
                        {t('about.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {text ? (
                      <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#374151', whiteSpace: 'pre-wrap' }}>{text}</div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                        {isAdmin ? t('about.noContent') : ''}
                      </div>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => { setAboutLocalText(text); setAboutEditing(true); }}
                        style={{ marginTop: '14px', padding: '6px 14px', borderRadius: '8px', background: '#f3f4f6', border: '1px solid #d1d5db', fontSize: '12px', color: '#374151', cursor: 'pointer' }}
                      >
                        ✏️ {t('about.edit')}
                      </button>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: '1px', background: '#e5e7eb', margin: '20px 0' }} />

                {/* App info */}
                <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '2' }}>
                  <div>© Eitan Fisher</div>
                  <div>
                    <a href="https://eitanfisher2026.github.io/FouFou/" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316', textDecoration: 'none' }}>
                      eitanfisher2026.github.io/FouFou
                    </a>
                  </div>
                </div>

                {/* Admin section: version + refresh */}
                {isAdmin && (
                  <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fafafa', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>v{window.BKK.VERSION}</span>
                      <button
                        onClick={() => { applyUpdate(); setShowAbout(false); setAboutEditing(false); }}
                        style={{ padding: '4px 10px', borderRadius: '6px', background: '#f3f4f6', border: '1px solid #d1d5db', fontSize: '11px', color: '#374151', cursor: 'pointer' }}
                      >
                        🔄 {t('general.refresh') || 'Refresh'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}


