// ===== QUICK ADD PLACE DIALOG — standalone React component =====
// Used in two modes:
//   captureMode=false (default): adding a Google place to favorites
//   captureMode=true: "Capture Now" FAB — photo + GPS, full save form
//
// Props:
//   place           — initial place object
//   captureMode     — boolean: green header, GPS indicator, auto-name, photo required
//   gpsStatus       — { loading, lat, lng, nearestStop, blocked } (captureMode only)
//   onAutoName      — (interestId) => string  (captureMode only)
//   allInterestOptions, interestStatus, selectedCityId, isUnlocked, tLabel, t
//   onSave(enriched, rating)
//   onCancel()

const QuickAddPlaceDialog = ({
  place, captureMode, gpsStatus,
  onAutoName, onSearchGoogle, searchResults, onSelectSearchResult, onClearSearch,
  allInterestOptions, interestStatus,
  selectedCityId, isUnlocked, tLabel, t,
  RecordingTextarea, RecordingInterim,
  onSave, onCancel
}) => {
  const [qaName, setQaName] = React.useState(place.name || "");
  const [qaNameIsAuto, setQaNameIsAuto] = React.useState(false);
  const [qaDescription, setQaDescription] = React.useState("");
  const [qaNotes, setQaNotes] = React.useState("");
  const [qaInterests, setQaInterests] = React.useState(place.interests || []);
  const [qaRatingScore, setQaRatingScore] = React.useState(0);
  const [qaRatingText, setQaRatingText] = React.useState("");
  const [qaImage, setQaImage] = React.useState(place.uploadedImage || null);
  const [qaRecordingField, setQaRecordingField] = React.useState(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const qaStopRecRef = React.useRef(null);

  // Bug fix: when dialog opens with pre-selected interests (from lastCaptureInterestsRef),
  // no toggle event fires, so onAutoName is never called. Generate name on mount.
  React.useEffect(() => {
    if (captureMode && onAutoName && qaInterests.length > 0 && !qaName) {
      const generated = onAutoName(qaInterests[0], qaInterests);
      if (generated) { setQaName(generated); setQaNameIsAuto(true); }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInterestToggle = (optId) => {
    const newInterests = qaInterests.includes(optId)
      ? qaInterests.filter(i => i !== optId)
      : [...qaInterests, optId];
    setQaInterests(newInterests);
    if (captureMode && onAutoName && newInterests.length > 0) {
      const generated = onAutoName(newInterests[0], newInterests);
      if (generated) { setQaName(generated); setQaNameIsAuto(true); }
    }
  };

  const [qaInterimText, setQaInterimText] = React.useState('');

  const startRec = (field) => {
    if (qaRecordingField) {
      if (qaStopRecRef.current) qaStopRecRef.current();
      qaStopRecRef.current = null;
      setQaRecordingField(null);
      setQaInterimText('');
      return;
    }
    setQaRecordingField(field);
    const stop = window.BKK.startSpeechToText({
      maxDuration: (window.BKK.systemParams?.speechMaxSeconds || 15) * 1000,
      ...(field === 'name' ? { lang: 'en-US' } : {}),
      onResult: (text, isFinal) => {
        if (isFinal) {
          setQaInterimText('');
          if (field === "name") { setQaName(prev => (prev ? prev + " " : "") + text); setQaNameIsAuto(false); }
          if (field === "description") setQaDescription(prev => (prev ? prev + " " : "") + text);
          if (field === "notes") setQaNotes(prev => (prev ? prev + " " : "") + text);
          if (field === "rating") setQaRatingText(prev => (prev ? prev + " " : "") + text);
        } else {
          setQaInterimText(text);
        }
      },
      onEnd: () => { setQaRecordingField(null); setQaInterimText(''); qaStopRecRef.current = null; },
      onError: () => { setQaRecordingField(null); setQaInterimText(''); qaStopRecRef.current = null; }
    });
    qaStopRecRef.current = stop;
  };

  const handleSave = () => {
    if (isSaving) return;
    const enriched = {
      ...place,
      name: qaName.trim() || place.name,
      description: qaDescription.trim(),
      notes: qaNotes.trim(),
      interests: qaInterests.length > 0 ? qaInterests : place.interests,
      uploadedImage: qaImage || null,
      _nameIsAuto: qaNameIsAuto  // flag: true = auto-generated name → trigger proximity dedup
    };
    // In captureMode: if no GPS yet, try once more before saving
    if (captureMode && !gpsStatus?.lat && !enriched.lat) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            enriched.lat = pos.coords.latitude;
            enriched.lng = pos.coords.longitude;
            const detected = window.BKK.getAreasForCoordinates(enriched.lat, enriched.lng);
            if (detected.length > 0) { enriched.areas = detected; enriched.area = detected[0]; }
            setIsSaving(true);
            onSave(enriched, qaRatingScore > 0 ? { score: qaRatingScore, text: qaRatingText } : null);
          },
          () => {
            // GPS failed — save without coordinates (will be flagged as no-coords)
            setIsSaving(true);
            onSave(enriched, qaRatingScore > 0 ? { score: qaRatingScore, text: qaRatingText } : null);
          },
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
        );
        return; // wait for GPS callback
      }
    }
    setIsSaving(true);
    onSave(enriched, qaRatingScore > 0 ? { score: qaRatingScore, text: qaRatingText } : null);
  };

  const activeInterests = allInterestOptions.filter(option => {
    const aStatus = option.adminStatus || "active";
    if (aStatus === "hidden") return false;
    if (aStatus === "draft" && !isUnlocked) return false;
    if (option.scope === "local" && option.cityId && option.cityId !== selectedCityId) return false;
    // captureMode: show all non-hidden interests (same as Add manually)
    if (captureMode) return true;
    const status = interestStatus[option.id];
    if (option.uncovered) return status === true;
    if (status === undefined && (option.custom || option.id?.startsWith("custom_"))) return false;
    return status !== false;
  });
  // Already sorted by group+label in allInterestOptions useMemo — preserve that order

  const isRTL = window.BKK.i18n.isRTL();
  const labelCls = "block text-xs font-bold mb-1";
  const textareaStyle = { direction: isRTL ? "rtl" : "ltr", fontSize: "14px", minHeight: "55px", resize: "vertical", lineHeight: "1.4" };
  const micStyle = (active) => ({
    width: "34px", height: "34px", borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
    background: active ? "#ef4444" : "#f3f4f6", color: active ? "white" : "#6b7280",
    fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
    animation: active ? "pulse 1s ease-in-out infinite" : "none",
    boxShadow: active ? "0 0 0 3px rgba(239,68,68,0.3)" : "none"
  });

  const headerBg = captureMode
    ? "linear-gradient(135deg, #22c55e, #16a34a)"
    : "linear-gradient(to right, #a855f7, #ec4899)";
  const headerTitle = captureMode
    ? `📸 ${t("trail.capturePlace")}`
    : `⭐ ${t("trail.addToFavorites")}`;
  // In captureMode: require photo OR explicit name selection (from Google or typed manually)
  const hasGooglePlace = qaName.trim() && !qaNameIsAuto;
  const saveDisabled = isSaving || (captureMode && !qaImage && !hasGooglePlace);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2" style={{ zIndex: 10300 }}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between"
          style={{ background: headerBg, flexShrink: 0 }}>
          <h3 className="text-base font-bold">{headerTitle}</h3>
          <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "white", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ direction: isRTL ? "rtl" : "ltr" }}>

          {/* GPS indicator — captureMode only */}
          {captureMode && gpsStatus && (() => {
            if (gpsStatus.loading) return (
              <div style={{ padding: "6px 10px", background: "#f0fdf4", borderRadius: "8px", fontSize: "11px", color: "#6b7280", textAlign: "center" }}>
                📍 {t("trail.detectingLocation")}...
              </div>
            );
            if (gpsStatus.blocked) return (
              <div style={{ padding: "6px 10px", background: "#fef3c7", borderRadius: "8px", fontSize: "11px", color: "#92400e", textAlign: "center" }}>
                📍 {t("trail.gpsBlocked")}
              </div>
            );
            if (gpsStatus.nearestStop) return (
              <div style={{ padding: "6px 10px", background: "#f0fdf4", borderRadius: "8px", fontSize: "12px", color: "#16a34a", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#22c55e", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", flexShrink: 0 }}>
                  {String.fromCharCode(65 + gpsStatus.nearestStop.idx)}
                </span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t("trail.nearStop")} <b>{gpsStatus.nearestStop.name}</b>
                </span>
                <span style={{ fontSize: "10px", color: "#9ca3af", flexShrink: 0 }}>
                  {gpsStatus.nearestStop.dist < 1000 ? `${gpsStatus.nearestStop.dist}m` : `${(gpsStatus.nearestStop.dist/1000).toFixed(1)}km`}
                </span>
              </div>
            );
            if (gpsStatus.lat && gpsStatus.lng) return (
              <div style={{ padding: "6px 10px", background: "#f0fdf4", borderRadius: "8px", fontSize: "11px", color: "#16a34a", textAlign: "center" }}>
                📍 GPS ✓
              </div>
            );
            return null;
          })()}

          {/* Image */}
          <div>
            <label className={labelCls}>{`📷 ${t("general.image")}`}</label>
            {qaImage ? (
              <div className="relative">
                <img src={qaImage} alt="Preview" className="w-full h-48 object-cover rounded-lg border-2 cursor-pointer hover:opacity-90"
                  style={{ borderColor: captureMode ? "#22c55e" : "#c084fc" }} />
                <button onClick={() => setQaImage(null)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold hover:bg-red-600">✕</button>
                {captureMode && gpsStatus?.lat && gpsStatus?.lng && (
                  <div style={{ position: "absolute", bottom: "6px", left: "6px", background: "rgba(0,0,0,0.7)", color: "#22c55e", padding: "2px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: "bold" }}>
                    📍 GPS ✓
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button"
                  className="flex-1 p-3 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-green-50"
                  style={{ borderColor: "#22c55e" }}
                  onClick={async () => {
                    const result = await window.BKK.openCamera();
                    if (!result) return;
                    const compressed = await window.BKK.compressImage(result.dataUrl);
                    setQaImage(compressed);
                    // Extract GPS from EXIF and bubble up to parent
                    if (captureMode && place._onGpsFromExif) {
                      const gps = await window.BKK.extractGpsFromImage(result.file);
                      if (gps && gps.lat !== 0) place._onGpsFromExif(gps);
                    }
                    // v3.23.35: removed auto-download of full-res photo to device (paired with v3.23.34 cleanups in dialogs.js + app-logic.js)
                  }}>
                  <span className="text-2xl">📸</span>
                  <div className="text-xs text-green-700 mt-1 font-bold">{t("general.takePhoto")}</div>
                </button>
                <label className="flex-1 p-3 border-2 border-dashed border-purple-300 rounded-lg text-center cursor-pointer hover:bg-purple-50 block">
                  <span className="text-2xl">🖼️</span>
                  <div className="text-xs text-gray-600 mt-1">{t("general.clickToUpload")}</div>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // DO NOT extract EXIF GPS from gallery — Android/iOS strip it when saving to gallery
                      const reader = new FileReader();
                      reader.onload = async () => { setQaImage(await window.BKK.compressImage(reader.result)); };
                      reader.readAsDataURL(file);
                    }} />
                </label>
              </div>
            )}
          </div>

          {/* Interests */}
          <div>
            <label className={labelCls}>{captureMode ? t("trail.whatDidYouSee") : t("general.interests")}</label>
            {captureMode ? (
              <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-50 rounded-lg">
                {activeInterests.map(option => {
                  const sel = qaInterests.includes(option.id);
                  return (
                    <button key={option.id} type="button"
                      onClick={() => handleInterestToggle(option.id)}
                      className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${sel ? "bg-green-500 text-white shadow-md" : "bg-white border border-gray-300"}`}>
                      <span className="text-lg block">
                        {option.icon?.startsWith?.("data:") ? <img src={option.icon} alt="" className="w-5 h-5 object-contain mx-auto" /> : option.icon}
                      </span>
                      <span className="text-[7px] block truncate leading-tight mt-0.5">{tLabel(option)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-50 rounded-lg">
                {activeInterests.map(option => {
                  const sel = qaInterests.includes(option.id);
                  return (
                    <button key={option.id} type="button"
                      onClick={() => handleInterestToggle(option.id)}
                      className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${sel ? "bg-purple-500 text-white shadow-md" : "bg-white border border-gray-300"}`}>
                      <span className="text-lg block">
                        {option.icon?.startsWith?.("data:") ? <img src={option.icon} alt="" className="w-5 h-5 object-contain mx-auto" /> : option.icon}
                      </span>
                      <span className="text-[7px] block truncate leading-tight mt-0.5">{tLabel(option)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Name field — both modes. captureMode: auto-generated but editable. QuickAdd: from Google but editable */}
          <div>
            <label className={labelCls}>{t("places.placeName")}</label>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input type="text" value={qaName}
                  onChange={e => { setQaName(e.target.value); setQaNameIsAuto(false); }}
                  placeholder={qaRecordingField === "name" ? "" : (t("places.namePlaceholderEn") || "הקלד/הקלט שם מקום באנגלית...")}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  style={{ direction: isRTL ? "rtl" : "ltr", fontSize: "16px", width: "100%", boxSizing: "border-box", borderColor: qaRecordingField === "name" ? "#ef4444" : captureMode ? "#22c55e" : "#d1d5db", paddingRight: isRTL ? "24px" : "8px", paddingLeft: isRTL ? "8px" : "24px" }} />
                {qaName && (
                  <button type="button"
                    onClick={() => { setQaName(""); setQaNameIsAuto(false); if (onClearSearch) onClearSearch(); }}
                    style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [isRTL ? "right" : "left"]: "6px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", lineHeight: 1, padding: "2px" }}>✕</button>
                )}
              </div>
              {window.BKK.speechSupported && (
                <button type="button"
                  onClick={() => { if (qaRecordingField !== "name") { setQaName(""); setQaNameIsAuto(false); } startRec("name"); }}
                  style={{ width: "34px", height: "34px", borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", background: qaRecordingField === "name" ? "#ef4444" : "#f3f4f6", color: qaRecordingField === "name" ? "white" : "#6b7280", animation: qaRecordingField === "name" ? "pulse 1s ease-in-out infinite" : "none", boxShadow: qaRecordingField === "name" ? "0 0 0 3px rgba(239,68,68,0.3)" : "none" }}
                  title={qaRecordingField === "name" ? t("speech.stopRecording") : t("speech.startRecording")}>
                  {qaRecordingField === "name" ? "⏹️" : "🎤"}
                </button>
              )}
            </div>
            {qaInterimText && qaRecordingField === "name" && (
              <div style={{ marginTop: "4px", padding: "4px 8px", background: "#fef3c7", borderRadius: "6px", fontSize: "12px", color: "#92400e", fontStyle: "italic", direction: isRTL ? "rtl" : "ltr" }}>🎤 {qaInterimText}</div>
            )}
            {captureMode && !qaName && (
              <p style={{ fontSize: "10px", color: "#9ca3af", margin: "3px 0 0 4px" }}>
                {t("trail.whatDidYouSee")} → {t("places.placeName")}
              </p>
            )}
            {/* Search Google — only when user typed manually, not auto-generated */}
            {captureMode && qaName.trim() && !qaNameIsAuto && (
              <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                <button type="button"
                  onClick={() => onSearchGoogle && onSearchGoogle(qaName)}
                  style={{ flex: 1, padding: "5px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", border: "none", cursor: "pointer", background: "#8b5cf6", color: "white" }}
                >🔍 {t("form.searchPlaceGoogle")}</button>
              </div>
            )}
            {/* Search results dropdown */}
            {captureMode && searchResults !== null && (
              <div style={{ marginTop: "4px", border: "1px solid #e5e7eb", borderRadius: "8px", maxHeight: "140px", overflowY: "auto", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                {searchResults.length > 0 && (
                  <div style={{ padding: "4px 8px", fontSize: "9px", color: "#9ca3af", borderBottom: "1px solid #f3f4f6", background: "#fafafa", textAlign: isRTL ? "right" : "left" }}>
                    {t("general.poweredByGoogle") || "Powered by Google"}
                  </div>
                )}
                {searchResults.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "8px", color: "#9ca3af", fontSize: "11px" }}>{t("general.searching")}...</p>
                ) : searchResults.map((result, idx) => (
                  <button key={idx} type="button"
                    onClick={() => { onSelectSearchResult && onSelectSearchResult(result); setQaName(result.name); setQaNameIsAuto(false); }}
                    style={{ width: "100%", textAlign: isRTL ? "right" : "left", padding: "6px 10px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: "none", border: "none", direction: isRTL ? "rtl" : "ltr" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1f2937" }}>{result.name}</div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>{result.address}{result.rating ? ` ⭐ ${result.rating}` : ""}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description + mic */}
          <div>
            <label className={labelCls}>{`📝 ${t("places.description")}`}</label>
            <div style={{ display: "flex", gap: "4px", alignItems: "flex-start" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <textarea value={qaDescription} onChange={e => setQaDescription(e.target.value)}
                  placeholder={qaRecordingField === "description" ? "" : (t("places.descriptionPlaceholder") || "הקלד או הקלט תאור קצר של המקום")}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  style={{ ...textareaStyle, width: "100%", boxSizing: "border-box", borderColor: qaRecordingField === "description" ? "#ef4444" : undefined, paddingRight: isRTL ? "24px" : "8px", paddingLeft: isRTL ? "8px" : "24px" }} rows={2} />
                {qaDescription.trim() && (
                  <button type="button" onClick={() => { if (qaRecordingField === "description") startRec("description"); setQaDescription(''); }}
                    style={{ position: "absolute", top: "6px", [isRTL ? "right" : "left"]: "6px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", lineHeight: 1, padding: "2px" }}>✕</button>
                )}
              </div>
              {window.BKK.speechSupported && (
                <button type="button" onClick={() => startRec("description")}
                  style={{ width: "34px", height: "34px", borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", background: qaRecordingField === "description" ? "#ef4444" : "#f3f4f6", color: qaRecordingField === "description" ? "white" : "#6b7280", animation: qaRecordingField === "description" ? "pulse 1s ease-in-out infinite" : "none", boxShadow: qaRecordingField === "description" ? "0 0 0 3px rgba(239,68,68,0.3)" : "none" }}
                  title={qaRecordingField === "description" ? t("speech.stopRecording") : t("speech.startRecording")}>
                  {qaRecordingField === "description" ? "⏹️" : "🎤"}
                </button>
              )}
            </div>
            {qaInterimText && qaRecordingField === "description" && (
              <div style={{ marginTop: "4px", padding: "4px 8px", background: "#fef3c7", borderRadius: "6px", fontSize: "12px", color: "#92400e", fontStyle: "italic", direction: isRTL ? "rtl" : "ltr" }}>🎤 {qaInterimText}</div>
            )}
          </div>

          {/* Notes + mic */}
          <div>
            <label className={labelCls}>{`💭 ${t("places.notes")}`}</label>
            <div style={{ display: "flex", gap: "4px", alignItems: "flex-start" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <textarea value={qaNotes} onChange={e => setQaNotes(e.target.value)}
                  placeholder={qaRecordingField === "notes" ? "" : (t("places.notesPlaceholder") || t("places.notes"))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:border-purple-500"
                  style={{ ...textareaStyle, width: "100%", boxSizing: "border-box", borderColor: qaRecordingField === "notes" ? "#ef4444" : undefined, paddingRight: isRTL ? "24px" : "8px", paddingLeft: isRTL ? "8px" : "24px" }} rows={2} />
                {qaNotes.trim() && (
                  <button type="button" onClick={() => setQaNotes('')}
                    style={{ position: "absolute", top: "6px", [isRTL ? "right" : "left"]: "6px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", lineHeight: 1, padding: "2px" }}>✕</button>
                )}
              </div>
              {window.BKK.speechSupported && (
                <button type="button" onClick={() => startRec("notes")}
                  style={{ width: "34px", height: "34px", borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", background: qaRecordingField === "notes" ? "#ef4444" : "#f3f4f6", color: qaRecordingField === "notes" ? "white" : "#6b7280", animation: qaRecordingField === "notes" ? "pulse 1s ease-in-out infinite" : "none", boxShadow: qaRecordingField === "notes" ? "0 0 0 3px rgba(239,68,68,0.3)" : "none" }}
                  title={qaRecordingField === "notes" ? t("speech.stopRecording") : t("speech.startRecording")}>
                  {qaRecordingField === "notes" ? "⏹️" : "🎤"}
                </button>
              )}
            </div>
            {qaInterimText && qaRecordingField === "notes" && (
              <div style={{ marginTop: "4px", padding: "4px 8px", background: "#fef3c7", borderRadius: "6px", fontSize: "12px", color: "#92400e", fontStyle: "italic", direction: isRTL ? "rtl" : "ltr" }}>🎤 {qaInterimText}</div>
            )}
          </div>

          {/* Rating */}
          <div style={{ background: "#fefce8", borderRadius: "12px", padding: "12px", border: "1px solid #fde68a" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#92400e", marginBottom: "8px", textAlign: isRTL ? "right" : "left" }}>
              {`⭐ ${t("reviews.rate")} (${t("general.optional")})`}
            </label>
            <div style={{ display: "flex", gap: "4px", marginBottom: qaRatingScore > 0 ? "8px" : "0" }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setQaRatingScore(qaRatingScore === n ? 0 : n)}
                  style={{ fontSize: "26px", background: "none", border: "none", cursor: "pointer", opacity: n <= qaRatingScore ? 1 : 0.25, lineHeight: 1, padding: "0 2px" }}>⭐</button>
              ))}
            </div>
            {qaRatingScore > 0 && (
              <div>
                <div style={{ display: "flex", gap: "4px", alignItems: "flex-start" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <textarea value={qaRatingText} onChange={e => setQaRatingText(e.target.value)} rows={2}
                      placeholder={qaRecordingField === "rating" ? "" : t("reviews.writeReview")}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-yellow-400"
                      style={{ direction: isRTL ? "rtl" : "ltr", fontSize: "14px", resize: "vertical", width: "100%", boxSizing: "border-box", borderColor: qaRecordingField === "rating" ? "#ef4444" : undefined, paddingRight: isRTL ? "24px" : "8px", paddingLeft: isRTL ? "8px" : "24px" }} />
                    {qaRatingText.trim() && (
                      <button type="button" onClick={() => setQaRatingText('')}
                        style={{ position: "absolute", top: "6px", [isRTL ? "right" : "left"]: "6px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "13px", lineHeight: 1, padding: "2px" }}>✕</button>
                    )}
                  </div>
                  {window.BKK.speechSupported && (
                    <button type="button" onClick={() => startRec("rating")}
                      style={{ width: "34px", height: "34px", borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", background: qaRecordingField === "rating" ? "#ef4444" : "#f3f4f6", color: qaRecordingField === "rating" ? "white" : "#6b7280", animation: qaRecordingField === "rating" ? "pulse 1s ease-in-out infinite" : "none", boxShadow: qaRecordingField === "rating" ? "0 0 0 3px rgba(239,68,68,0.3)" : "none" }}>
                      {qaRecordingField === "rating" ? "⏹️" : "🎤"}
                    </button>
                  )}
                </div>
                {qaInterimText && qaRecordingField === "rating" && (
                  <div style={{ marginTop: "4px", padding: "4px 8px", background: "#fef3c7", borderRadius: "6px", fontSize: "12px", color: "#92400e", fontStyle: "italic", direction: isRTL ? "rtl" : "ltr" }}>🎤 {qaInterimText}</div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: "8px", padding: "10px 16px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          <button onClick={handleSave}
            disabled={saveDisabled}
            className="flex-1 py-2.5 font-bold text-white rounded-xl text-base"
            style={{
              background: saveDisabled ? "#e5e7eb" : (captureMode ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(to right, #a855f7, #ec4899)"),
              border: "none", cursor: saveDisabled ? "not-allowed" : "pointer",
              color: saveDisabled ? "#9ca3af" : "white", flex: 2
            }}>
            {captureMode ? `✅ ${t("trail.saveAndContinue")}` : `💾 ${t("general.save")}`}
          </button>
          <button onClick={onCancel}
            className="py-2.5 font-bold rounded-xl text-base"
            style={{ background: "#f3f4f6", color: "#6b7280", border: "none", cursor: "pointer", flex: 1 }}>
            {t("general.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

// TranslateButton — inline translate button for description/notes/review fields
// Shows only when detected language differs from UI language
// Uses MyMemory API (free, no key needed)
const TranslateButton = ({ text, onTranslated, translateText, detectNeedsTranslation }) => {
  const [status, setStatus] = React.useState('idle'); // idle | translating | done | error
  const targetLang = detectNeedsTranslation(text);
  if (!targetLang) return null;

  const uiLang = window.BKK.i18n.currentLang || 'he';
  const label = status === 'idle' ? window.t('settings.translateBtn')
    : status === 'translating' ? window.t('settings.translatingBtn')
    : status === 'done' ? window.t('settings.translateDone')
    : '⚠️';

  const handleClick = async () => {
    if (status === 'translating' || status === 'done') return;
    setStatus('translating');
    try {
      const translated = await translateText(text, targetLang);
      onTranslated(translated);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error('[TRANSLATE] Error:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'translating'}
      style={{
        fontSize: '10px',
        padding: '2px 7px',
        borderRadius: '10px',
        border: '1px solid #93c5fd',
        background: status === 'done' ? '#dcfce7' : status === 'error' ? '#fee2e2' : '#eff6ff',
        color: status === 'done' ? '#15803d' : status === 'error' ? '#dc2626' : '#2563eb',
        cursor: status === 'translating' ? 'wait' : 'pointer',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        opacity: status === 'translating' ? 0.7 : 1,
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
};

// ReviewTextWithTranslate — read-only review text with optional inline translation
// Keeps translated state locally so original is preserved in Firebase
const ReviewTextWithTranslate = ({ text, translateText, detectNeedsTranslation }) => {
  const [translated, setTranslated] = React.useState(null);
  const lang = window.BKK.i18n.currentLang || 'he';
  return (
    <div>
      <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>
        {translated || text}
      </p>
      {!translated
        ? <TranslateButton text={text} onTranslated={(t) => setTranslated(t)} translateText={translateText} detectNeedsTranslation={detectNeedsTranslation} />
        : <button onClick={() => setTranslated(null)} style={{ fontSize: '9px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ↩ {lang === 'he' ? 'הצג מקור' : 'Show original'}
          </button>
      }
    </div>
  );
};

// AutoTranslateText — automatically translates text if language doesn't match UI
// Shows original while loading, replaces with translation on completion
// No state saved — display only, on-the-fly via MyMemory API
const AutoTranslateText = ({ text, style, className, prefix, translateText, detectNeedsTranslation }) => {
  const [display, setDisplay] = React.useState(text);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setDisplay(text); // reset when text changes
    if (!text || text.trim().length < 3) return;
    const targetLang = detectNeedsTranslation(text);
    if (!targetLang) return;
    setLoading(true);
    translateText(text, targetLang)
      .then(translated => { setDisplay(translated); setLoading(false); })
      .catch(() => setLoading(false)); // on error, keep original
  }, [text]);

  return (
    <span style={{ ...style, opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s' }} className={className}>
      {prefix}{display}
    </span>
  );
};

// FeedbackItemImages — standalone component (must be outside FouFouApp for valid hook usage)
const FeedbackItemImages = ({ images, onView }) => {
  const [idx, setIdx] = React.useState(0);
  if (!images || images.length === 0) return null;
  const canPrev = idx > 0;
  const canNext = idx < images.length - 1;
  return (
    <div style={{ marginTop: '6px' }}>
      <img
        src={images[idx]} alt=""
        style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'block' }}
        onClick={() => onView && onView(images[idx])}
      />
      {images.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '6px' }}>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={!canPrev}
            style={{ padding: '2px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: canPrev ? 'white' : '#f3f4f6', cursor: canPrev ? 'pointer' : 'default', fontSize: '12px', color: canPrev ? '#374151' : '#d1d5db' }}>◀</button>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{idx + 1} / {images.length}</span>
          <button onClick={() => setIdx(i => Math.min(images.length - 1, i + 1))} disabled={!canNext}
            style={{ padding: '2px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: canNext ? 'white' : '#f3f4f6', cursor: canNext ? 'pointer' : 'default', fontSize: '12px', color: canNext ? '#374151' : '#d1d5db' }}>▶</button>
        </div>
      )}
    </div>
  );
};

// FloatingAudioPlayer — standalone draggable component (hooks outside JSX callbacks)
const FloatingAudioPlayer = ({ isPaused, onPauseResume, onStop }) => {
  const ref = React.useRef({ dragging: false, startX: 0, startY: 0, ox: 0, oy: 0 });
  const [pos, setPos] = React.useState(null);

  const left = pos ? pos.x : (window.innerWidth / 2 - 52);
  const top  = pos ? pos.y : (window.innerHeight - 148);

  const onDown = (e) => {
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const curLeft = pos ? pos.x : (window.innerWidth / 2 - 52);
    const curTop  = pos ? pos.y : (window.innerHeight - 148);
    ref.current = { dragging: true, startX: cx, startY: cy, ox: curLeft, oy: curTop };
    const onMove = (ev) => {
      if (!ref.current.dragging) return;
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
      setPos({ x: ref.current.ox + mx - ref.current.startX, y: ref.current.oy + my - ref.current.startY });
    };
    const onUp = () => {
      ref.current.dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  };

  return (
    <div
      onMouseDown={onDown}
      onTouchStart={onDown}
      style={{
        position: 'fixed', left: left + 'px', top: top + 'px',
        zIndex: 1050, background: '#1e293b', color: 'white',
        borderRadius: '32px', padding: '6px 10px',
        display: 'flex', alignItems: 'center', gap: '6px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        cursor: 'grab', userSelect: 'none', touchAction: 'none'
      }}>
      <span style={{ fontSize: '14px', pointerEvents: 'none' }}>🔊</span>
      <button onClick={(e) => { e.stopPropagation(); onPauseResume(); }}
        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '15px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isPaused ? '▶️' : '⏸️'}
      </button>
      <button onClick={(e) => { e.stopPropagation(); onStop(); }}
        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '15px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ⏹️
      </button>
    </div>
  );
};
