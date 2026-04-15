// FouFou app-data.js v3.22.54
// ============================================================================
// FouFou — City Trail Generator - Internationalization (i18n)
// Copyright © 2026 Eitan Fisher. All Rights Reserved.
// ============================================================================

window.BKK = window.BKK || {};

// ============================================================================
// TRANSLATION ENGINE
// ============================================================================

window.BKK.i18n = {
  currentLang: (() => {
    const saved = localStorage.getItem('city_explorer_lang');
    if (saved) return saved;
    // Detect browser language
    const browserLang = ((navigator.language || navigator.userLanguage || '')).toLowerCase();
    if (browserLang.startsWith('he')) return 'he';
    if (browserLang.startsWith('en')) return 'en';
    // Admin-set default (falls back to 'en')
    return localStorage.getItem('foufou_admin_default_lang') || 'en';
  })(),
  
  setLang(lang) {
    this.currentLang = lang;
    localStorage.setItem('city_explorer_lang', lang);
    // Update document direction
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  },
  
  isRTL() {
    return this.currentLang === 'he';
  },
  
  // Get supported languages
  languages: {
    he: { name: 'עברית', nameEn: 'Hebrew', dir: 'rtl', flag: '🇮🇱' },
    en: { name: 'English', nameEn: 'English', dir: 'ltr', flag: '🇬🇧' }
  }
};

// Global translate function
// Usage: t('toast.placeAdded') or t('toast.placeAddedWithName', { name: 'Cafe' })
window.t = function(key, params) {
  const lang = window.BKK.i18n.currentLang;
  const dict = window.BKK.i18n.strings?.[lang];
  if (!dict) return key;
  
  // Navigate nested keys: 'toast.placeAdded' -> dict.toast.placeAdded
  const parts = key.split('.');
  let val = dict;
  for (const part of parts) {
    if (val && typeof val === 'object' && part in val) {
      val = val[part];
    } else {
      // Fallback to Hebrew if key missing in current lang
      val = null;
      break;
    }
  }
  
  // Fallback to Hebrew
  if (val === null || val === undefined) {
    const heDict = window.BKK.i18n.strings?.he;
    if (heDict) {
      val = heDict;
      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = val[part];
        } else {
          val = key; // Return key as last resort
          break;
        }
      }
    } else {
      val = key;
    }
  }
  
  // Replace parameters: {name} -> params.name
  if (params && typeof val === 'string') {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  
  return val;
};

// Helper: get label for area/interest based on current language
// Uses labelEn/nameEn fields from config data
window.tLabel = function(obj) {
  if (!obj) return '';
  const lang = window.BKK.i18n.currentLang;
  if (lang === 'he') return obj.label || obj.name || '';
  // For non-Hebrew: prefer labelEn/nameEn, fallback to label/name
  return obj.labelEn || obj.nameEn || obj.label || obj.name || '';
};

// Helper: get description based on current language
window.tDesc = function(obj) {
  if (!obj) return '';
  const lang = window.BKK.i18n.currentLang;
  if (lang === 'he') return obj.desc || obj.description || '';
  return obj.descEn || obj.descriptionEn || obj.desc || obj.description || '';
};

// ============================================================================
// HEBREW STRINGS (Source of truth)
// ============================================================================

window.BKK.i18n.strings = {
he: {

// --- General / Common ---
general: {
  appName: 'FouFou',
  city: 'עיר',
  all: 'כל',
  allCity: 'כל העיר',
  me: 'אני',
  viewImage: 'הצג תמונה',
  fromGoogleCache: 'מגוגל (מאוחסן)',
  close: 'סגור',
  cancel: 'ביטול',
  confirm: 'אישור',
  editMap: 'ערוך מיקומים',
  mapSaved: 'המיקומים נשמרו',
  dragToMove: 'גרור סמן כדי להזיז אזור',
  min: 'דק׳',
  save: 'שמור',
  update: '💾 עדכן',
  updateAndQuit: '🚪 עדכן וסגור',
  add: '➕ הוסף',
  addAndQuit: '🚪 הוסף וסגור',
  delete: 'מחק',
  deleteAll: 'מחק הכל',
  edit: 'ערוך',
  show: 'הצג',
  hide: 'הסתר',
  search: 'חיפוש',
  clear: 'נקה',
  clearSelection: 'נקה בחירה',
  help: 'עזרה',
  all: 'הכל',
  loading: '⏳ טוען...',
  searching: 'מחפש...',
  refreshing: 'מרענן...',
  password: 'סיסמה',
  general: 'כללי',
  static: 'סטטי',
  open: 'פתוח',
  viewOnly: 'צפייה בלבד',
  locked: 'נעול',
  filter: 'סינון/חיפוש',
  clearAll: 'נקה הכל',
  legend: 'מקרא צבעים',
  tip: 'טיפ',
  transparent: 'שקוף',
  interests: 'תחומים',
  status: 'סטטוס',
  readOnly: 'קריאה בלבד',
  error: 'שגיאה',
  unknownError: 'שגיאה לא ידועה',
  safeArea: 'בטוח',
  cautionArea: 'צריך להזהר',
  dangerArea: 'מסוכן',
  enabled: '✅ פעיל',
  disabled: '⏸️ מושבת',
  enable: '✅ הפעל',
  enableAlt: 'הפעל',
  disable: 'השבת',
  enableCity: 'הפעל עיר',
  disableCity: 'השבת עיר',
  included: '✅ כלול',
  custom: 'מותאם',
  private: '👤 אישי',
  system: '🏗️ מערכת',
  generalFeedback: '💭 כללי',
  personalNote: '👤 אישי',
  idea: '💡 רעיון',
  bug: '🐛 באג',
  mine: '🎖️ שלי',
  inProgress: 'בעבודה',
  underReview: '🛠️ בבדיקה',
  noDescription: 'אין תיאור',
  noLocation: 'אין מיקום',
  noArea: 'ללא איזור',
  outsideBoundary: 'מחוץ לגבולות',
  clickForDetails: 'לחץ לפרטים מלאים',
  clickForImage: 'לחץ לצפייה בתמונה',
  placeInfo: 'מידע על המקום',
  fromGoogle: 'מגוגל',
  fromGoogleApi: 'מ-Google API',
  addedFromSearch: 'נוסף מחיפוש',
  addedFromGoogle: 'נוסף מ-Google',
  addedManually: 'נוספו ידנית',
  addedByUser: 'מקום שהוספתי',
  fromMyPlaces: 'מהמקומות שלך',
  addedViaMore: 'נוסף ב+עוד',
  customPlace: 'מקום מותאם אישית',
  meters100: '>100מ',
  meters2000: '>2000מ',
  caution: 'זהירות',
  openStatus: 'פתוח',
  closedStatus: 'סגור',
  skipPermanently: 'דלג לצמיתות',
  areas: 'אזורים',
  total: 'סה"כ',
  optional: 'רשות',
  selectCity: 'בחר עיר...',
  version: 'גרסה',
  selected: 'נבחרו',
  refresh: 'רענן',
  confirmRefresh: 'לרענן את הדף? נתונים שלא נשמרו יאבדו.',
  share: 'שתף',
  search: 'חפש',
  cancel: 'ביטול',
  save: 'אישור',
  mine: '🎖️ שלי',
  clear: 'נקה',
  show: 'הצג',
  hide: 'הסתר',
  system: '🏗️ מערכת',
  private: '👤 אישי',
  bug: '🐛 באג',
  idea: '💡 רעיון',
  generalFeedback: '💭 כללי',
  customPlace: 'מקום מותאם אישית',
  general: 'כללי',
  static: 'סטטי',
  fromGoogleApi: 'מ-Google API',
  refreshing: 'מרענן...',
  searching: 'מחפש...',
  addedViaMore: 'נוסף ב+עוד',
  addedManually: 'נוספו ידנית',
  fromMyPlaces: 'מהמקומות שלך',
  addedFromGoogle: 'נוסף מ-Google',
  addedByUser: 'מקום שהוספתי',
  error: 'שגיאה',
  all: 'כל',
  enableCity: 'הפעל עיר',
  disableCity: 'השבת עיר',
  noPlacesWithCoords: 'אין מקומות עם קואורדינטות תקינות',

  updateNow: 'עדכן עכשיו',
  newVersionAvailableBanner: 'גרסה חדשה זמינה!',
  updateDesc: 'יש גרסה חדשה של FouFou עם שיפורים ותיקונים',
  later: 'אח״כ',
  howItWorks: 'איך זה עובד?',
  nearMe: 'קרוב אליי',
  nearLocation: 'קרוב למיקום',
  nearMeGps: 'קרוב אליי',
  nearMePoint: 'נקודה מוגדרת',
  searchPointPlaceholder: 'חפש מלון, כתובת, מקום...',
  pointSelected: '📍 נקודה נבחרה',
  changePoint: 'שנה נקודה',
  next: 'המשך',
  back: 'חזרה',
  backToRoute: 'חזרה למסלול',
  startOver: 'התחל מחדש',
  mayTakeSeconds: 'זה יכול לקחת כמה שניות',
  myPlace: 'מקום שלי',
  more: 'עוד',
  menu: 'תפריט',
  start: 'התחלה',
  linear: 'ליניארי',
  backToForm: 'חזרה לטופס',
  savedOn: 'נשמר ב-',
  customStops: 'מותאמים אישית',
  consoleHint: 'פרטים מלאים ב-Console (F12) - העתק ושלח לתיקון',
  clickForDetails: 'לחץ לפרטים מלאים',
  restoredToList: 'חזר לרשימה הרגילה',
  resultsFound: 'תוצאות נמצאו',
  noInterestManual: 'ללא תחום / נוספו ידנית',
  showActivityLog: 'הצג לוג לאיתור בעיות',
  debugMessages: 'הודעות Debug יופיעו בקונסול (F12)',
  adminManagement: 'ניהול Admin',
  currentDevice: 'מכשיר נוכחי',
  status: 'סטטוס',
  open: 'פתוח',
  noRegisteredUsers: 'אין משתמשים רשומים',
  you: 'אתה',
  remove: 'הסר',
  removed: 'הוסר',
  active: 'פעיל',
  inactive: 'לא פעיל',
  viewAccessLog: 'צפה בלוג כניסות',
  new: 'חדש!',
  importExport: 'ייבוא וייצוא',
  import: 'ייבוא מועדפים',
  saveAndTransfer: 'שמור והעבר נתונים בין מכשירים',
  exportAll: 'ייצא הכל',
  exportSchema: 'ייצא סכמה (עבור AI)',
  importFromFile: 'ייבא מקובץ',
  transferDevices: 'העברה בין Claude ל-GitHub',
  dataBackup: 'גיבוי נתונים',
  shareWithFriends: 'שיתוף עם חברים',
  areas: 'אזורים',
  debugMode: 'מצב Debug',
  searchError: 'שגיאה בחיפוש',
  noResultsFoundSearch: 'לא נמצאו תוצאות',
  added: 'נוסף!',
  canAddMore: 'ניתן להוסיף מקום נוסף או לסגור',
  ok: 'אישור',
  exit: 'צא',
  openInGoogle: 'פתח בגוגל',
  openInGoogleNoCoords: 'פתח בגוגל (אין קואורדינטות)',
  openPointInGoogle: 'פתח נקודה בגוגל',
  openGooglePoint: 'פתח נקודה בגוגל',
  viewOnly: 'צפייה בלבד',
  deletePlace: 'מחק מקום',
  deleteInterest: 'מחק תחום',
  deleteRoute: 'מחק מסלול',
  clearLog: 'נקה לוג',
  shareRoute: 'שתף מסלול',
  sharePoi: 'שתף נקודות עניין',
  openRoute: 'פתח מסלול',
  restoreActive: 'החזר כמקום פעיל',
  skipPermanent: 'דלג לצמיתות',
  update: 'עדכן',
  close: 'סגור',
  uses: 'שימושים',
  adminUsers: 'משתמשי Admin',
  googleInfo: 'מידע מגוגל',
  notes: 'הערות...',
  inProgress: 'בעבודה',
  locked: 'נעול',
  readOnly: 'קריאה בלבד',
  interestName: 'שם התחום',
  addInterestTitle: 'הוסף תחום עניין',
  autoDetect: 'זהה אוטומטית',
  searchHintAddress: 'הקלד כתובת מלאה, שם מלון, תחנת רכבת, או כל מקום',
  findPlaces: 'מצא נקודות עניין',
  address: 'כתובת',
  placesHeader: 'מקומות',
  interestsHeader: 'תחומים',
  searchTip: 'לחץ 🔍 לחיפוש כתובת, 📍 למיקום נוכחי, או 📌 ממקום ברשימה',
  stopsCount: 'תחנות',
  searchAndAddHint: '💡 חפש ולחץ להוסיף למסלול. אפשר להוסיף מספר מקומות.',
  placesAddedManually: 'מקומות נוספו ידנית',
  clickToUpload: 'גלריה',
  takePhoto: 'צלם',
  gpsExtracted: 'מיקום זוהה מהתמונה!',
  photoSaved: 'התמונה נשמרה',
  image: 'תמונה',
  links: 'קישורים',
  coordinates: 'קואורדינטות',
  permissions: 'הרשאות',
  found: 'נמצא',
  rating: 'דירוג',
  area: 'איזור',
  notesLabel: 'הערות',
  searchMode: 'סוג חיפוש',
  name: 'שם',
  link: 'קישור',
  location: 'מיקום',
  icon: 'אייקון',
  routeName: 'שם המסלול',
  mapsLink: 'קישור Maps',
  searchSettings: 'הגדרות חיפוש',
  tryDifferentSearch: 'נסה לחפש משהו אחר',
  startTypingToSearch: 'התחל להקליד כדי לחפש',
  multiplier: 'מכפיל',
  noEntries: 'אין כניסות עדיין',
  noFeedback: 'אין משובים עדיין',
  feedback: 'משובים',
},

// --- Navigation & Views ---
nav: {
  form: 'תכנן',
  route: 'מסלול',
  search: 'חיפוש',
  saved: 'שמורים',
  favorites: 'מועדפים',
  myPlaces: 'מקומות',
  myInterests: 'תחומים',
  settings: 'הגדרות',
  planTrip: 'תכנן את הטיול',
},

// --- Wizard / Quick Mode ---
wizard: {
  step1Title: 'איפה מטיילים?',
  chooseArea: 'בחר אזור',
  step1Subtitle: 'בחרו איזור או קרוב אליי',
  step2Title: 'מה מעניין אותך?',
  step2Subtitle: 'בחר תחום אחד או יותר',
  step3Title: 'בחר איך להמשיך',
  step3TitleResults: '{count} מקומות נמצאו',
  audioTitle: 'הסבר',
  myLocation: 'המיקום שלי',
  locationFound: '📍 מיקום נמצא!',
  findPlaces: 'מצא מקומות',
  findPlacesCount: '🔍 מצא נקודות עניין ({count} מקומות)',
  showMap: 'הצג מפה',
  showMapFavInterest: '⭐ מפת מועדפים',
  showMapFavArea: '📍 מועדפים באזור',
  areasOnly: 'אזורים בלבד',
  allAreasMap: '🗺️ מפת כל האזורים',
  placesFound: 'מקומות נמצאו!',
  yallaGo: 'יאללה לדרך! 🗺️',
  yallaDesc: 'חשב מסלול אופטימלי ופתח בגוגל מפות',
  manualMode: 'המסלול שלך',
  manualDesc: 'בחן את המקומות שנבחרו. באפשרותך לשנות ולעדכן כרצונך',
  customizeRoute: 'כוונן מסלול ידנית',
  customizeDesc: 'בחר נקודת התחלה, השהה נקודות, שנה סדר',
  orScrollToCustomize: 'או גלול למטה לכוונן ידנית',
},

// --- Form / Search ---
form: {
  whatInterests: '⭐ מה מעניין?',
  searchRadius: '⭕ רדיוס חיפוש',
  radiusLabel: 'רדיוס:',
  gpsSearch: 'חיפוש לפי GPS',
  gps: 'GPS',
  myPlace: 'מקום שלי',
  searchMyPlace: '🔍 חפש מקום שלי...',
  allMode: 'הכל',
  areaMode: 'איזור',
  radiusMode: 'רדיוס',
  currentLocation: 'מיקום נוכחי',
  findCurrentLocation: 'מצא מיקום נוכחי',
  locateMe: '📍 זהה מיקום',
  locationDetected: '📍 מיקום נקלט',
  locationDetectedFull: '📍 מיקום נוכחי נקלט!',
  locationDetectedShort: '📍 מיקום נקלט!',
  locationDetectedNoAddr: '📍 מיקום נקלט (לא נמצאה כתובת)',
  locating: '⏳ מאתר...',
  searchingLocation: 'מחפש מיקום...',
  searchAddress: 'חפש כתובת',
  searchByAddress: 'חפש לפי כתובת',
  searchByName: 'חפש לפי שם המקום',
  searchingByName: 'מחפש לפי שם...',
  searchPlaceGoogle: 'חפש מקום בגוגל',
  enterAddress: 'אנא הזן כתובת',
  enterPlaceName: 'אנא הזן שם מקום',
  enterAddressOrName: 'הזן כתובת או שם מקום',
  typeAddress: 'הקלד כתובת, שם מלון, מקום...',
  typeAddressAlt: 'הקלד כתובת, שם מקום, מלון...',
  extractFromLink: 'חלץ מקישור',
  selectStartPoint: 'בחר נקודת התחלה',
  startPointFirst: 'התחלה מהמקום הראשון ברשימה',
  setStartPoint: 'קבע כנקודת התחלה',
  chooseStartBeforeCalc: 'בחר נקודת התחלה לפני חישוב מסלול',
  setStartOnMap: 'פתח את המפה כדי לקבוע נקודת התחלה ולחשב מסלול',
  findLocationFirst: 'אנא מצא את המיקום הנוכחי שלך תחילה',
  needGpsFirst: 'צריך להגדיר מיקום GPS קודם',
  selectAreaAndInterest: 'אנא בחר איזור ולפחות תחום עניין אחד',
  selectAreaFirst: 'אנא בחר איזור לפני יצירת המסלול',
  details: 'פרטים',
  favoritesMap: 'מפת מועדפים',
  selectAtLeastOneInterest: 'אנא בחר לפחות תחום עניין אחד',
  showSearchRadius: 'הצג רדיוס חיפוש',
  gpsRadiusHint: 'חיפוש לפי GPS (1 ק"מ)',
  useGpsForRadius: '📍 לחץ GPS או הגדר מיקום כדי להשתמש במצב רדיוס',
  waitingForGps: 'ממתין לאיתור מיקום...',
  allowLocationAccess: 'אשר גישה למיקום בדפדפן',
},

// --- Route ---
route: {
  navigate: 'נווט',
  calcRoute: '🧭 חשב מסלול',
  recalcRoute: '🔄 חשב מסלול מחדש',
  helpMePlan: 'עזור לי לתכנן',
  smartSelected: '{selected} נבחרו, {disabled} הושבתו',
  saveRoute: 'שמור מסלול',
  editSavedRoute: '🗺️ ערוך מסלול שמור',
  addSavedRoute: '🗺️ הוסף מסלול שמור',
  linear: 'ליניארי',
  linearRoute: '➡️ ליניארי',
  linearDesc: '➡️ מסלול ליניארי',
  circular: 'מעגלי',
  circularRoute: '🔄 מסלול מעגלי',
  circularDesc: '🔄 מסלול מעגלי — חוזר לנקודת ההתחלה',
  routeDeleted: 'המסלול נמחק',
  routeUpdated: 'המסלול עודכן',
  routeSaved: 'המסלול נשמר!',
  routeCopied: 'מסלול הועתק ללוח',
  orderUpdated: 'סדר עצירות עודכן',
  manualOrderKept: 'הסדר שקבעת נשמר — לא בוצע חישוב מחדש',
  calcRoutePrevious: 'חשב מסלול קודם',
  returnToRoute: 'החזר למסלול',
  removeFromRoute: 'הסר מהמסלול',
  skipPlace: 'דלג על מקום',
  skipTemporarily: 'דלג זמנית',
  skipPermanently: 'דלג תמיד',
  cancelPermanentSkip: 'בטל דילוג קבוע',
  returnPlace: 'החזר מקום',
  addToMyList: 'הוסף למועדפים',
  openedSuccess: 'נפתח בהצלחה!',
  linkCopied: 'הקישור הועתק! 📋',
  pointsCopied: 'נקודות העניין הועתקו ללוח',
  addManualStop: '➕ הוסף ידנית נקודה למסלול',
  moreFromCategory: '+ עוד',
  reorderStops: 'סדר עצירות',
  dragToReorder: 'גרור לשינוי סדר',
  tapArrowsToMove: 'לחץ ▲▼ לשינוי סדר',
  openRouteInGoogle: 'יאללה לדרך! 🗺️',
  openRoutePartN: 'מסלול חלק {n} מתוך {total}',
  splitRouteWarning: '⚠️ גוגל מפות תומך ב-{max} נקודות. המסלול פוצל ל-{parts} חלקים. אפשר להשבית עצירות כדי לצמצם.',
  mapPointsWarning: 'ℹ️ יתכן שגוגל מפות לא יציג את כל {count} הנקודות על המפה.',
  showStopsOnMap: '🗺️ מפה ותכנון',
  backToList: 'חזור לרשימה',
  stopNumber: 'עצירה',
  moveUp: 'העבר למעלה',
  moveDown: 'העבר למטה',
  routeCalculated: 'מסלול חושב!',
  tapStopForStart: 'לחץ על נקודה כדי לקבוע כהתחלה',
  autoComputeHint: 'המסלול מחושב אוטומטית. שנה ב🗺️ מפה ותכנון',
  autoComputeReady: 'המסלול מחושב ומוכן!',
  routeActionsHint: '🗺️ מפה ותכנון — סדר עצירות, בחר התחלה, הוסף נקודות\n🚀 יאללה לדרך — צא לדרך עם ניווט בגוגל',
  timeAuto: 'אוטומטי',
  timeDay: 'יום',
  timeAfternoon: 'אחה״צ',
  timeNight: 'ערב/לילה',
  stops: 'עצירות',
  myRoute: 'המסלול שלי',
  reoptimizing: 'מסדר מסלול...',
  places: 'מקומות',
  savedAs: 'נשמר:',
  startPoint: 'נקודת התחלה',
  routeType: 'סוג מסלול',
  newRoute: 'צור מסלול חדש',
},

// --- Places ---
places: {
  addPlace: 'הוסף מקום',
  addFromCamera: 'צלם מקום',
  addManually: 'הוסף ידנית',
  editPlace: 'ערוך מקום',
  moreDetails: 'פרטים נוספים',
  noCoordinates: '📍 לא ניתן לשמור ללא קואורדינטות — הזן כתובת או השתמש ב-GPS',
  unsavedChangesWarning: 'יש שינויים שלא נשמרו. לצאת בלי לשמור?',
  favoriteNotOnGoogle: '📍 מקום מועדף — לא קיים בגוגל',
  openFavorite: 'פתח מקום מועדף',
  addPhoto: 'צלם או צרף תמונה',
  attachPhoto: 'צרף תמונה',
  replacePhoto: 'החלף תמונה',
  descriptionPlaceholder: 'תיאור קצר של המקום...',
  aiGenerating: 'כותב תיאור...',
  aiDone: 'תיאור נוצר!',
  photoAdded: 'תמונה נוספה!',
  camera: 'צלם',
  gallery: 'גלריה',
  placeName: 'שם המקום',
  enterPlaceName: 'אנא הזן שם למקום',
  nameExists: 'שם זה כבר קיים',
  handled: 'טופל',
  placeExists: 'מקום עם שם זה כבר קיים',
  address: 'כתובת',
  notes: 'הערות...',
  description: 'תיאור קצר של המקום',
  descriptionPlaceholder: 'הקלד/הקלט תאור קצר',
  namePlaceholderEn: 'הקלד/הקלט שם מקום באנגלית...',
  notesPlaceholder: 'הקלד/הקלט הערות...',
  findLocation: '📍 מצא מיקום',
  updateLocation: '✅ עדכן מיקום',
  googleInfo: '🔎 מידע מגוגל',
  searchingAddress: 'מחפש כתובת...',
  searchByNameHint: 'חפש בשם, תיאור או הערות',
  placeAdded: 'המקום נוסף!',
  placeUpdated: 'המקום עודכן!',
  placeDeleted: 'המקום נמחק!',
  placeAddedShared: 'המקום נוסף ונשמר לכולם!',
  detailsEdit: 'פרטים / ערוך',
  showDrafts: 'הצג טיוטות',
  searchPlace: 'חפש מקום',
  searchPlaceholder: 'הקלד שם מקום...',
  draft: 'טיוטה',
  editAddedToList: 'ערוך (נוסף לרשימה)',
  missingDetails: 'חסרים פרטים',
  missingDetailsLong: 'חסרים פרטים (כתובת/קורדינטות/תחום)',
  noCoordinates: 'אין קואורדינטות - לא יכלל במסלול',
  noCoordinatesWarning: '⚠️ חסרות קואורדינטות',
  noCoordinatesWarnLong: '⚠️ חסרות קואורדינטות - לא יכלל במסלול',
  noLocationPermission: 'אין הרשאת מיקום',
  outsideArea: 'מקום מחוץ לגבולות האזור',
  placeNotOnGoogle: 'המקום לא נמצא ב-Google',
  notEnoughInfo: 'אין מספיק מידע על המקום',
  noPlacesFound: 'לא נמצאו תוצאות',
  noMorePlaces: 'לא נמצאו עוד מקומות',
  noMatchingPlaces: 'לא נמצאו מקומות. נסה תחומי עניין או אזור אחר.',
  notEnoughInArea: 'אין מספיק מקומות תואמים בתחום זה באזור הנבחר',
  notEnoughPartial: 'לא נמצאו מספיק מקומות תואמים בחלק מתחומי העניין באזור הנבחר',
  alreadyInRoute: 'כבר קיים במסלול',
  alreadyInList: 'כבר קיים ברשימה',
  alreadyInMyList: 'כבר קיים ברשימה שלך',
  alreadyBlacklisted: 'כבר ברשימת דילוג',
  addedToSkipList: 'נוסף לדילוג קבוע',
  addedToYourList: 'נוסף לרשימה שלך!',
  returnedToList: 'חזר לרשימה הרגילה',
  markHandled: 'סמן כטופל',
  markUnhandled: 'סמן כלא טופל',
  selectImageFile: 'אנא בחר קובץ תמונה',
  noPlacesWithCoords: 'אין מקומות עם קואורדינטות תקינות',
  noPlacesInCity: 'אין מקומות ב{cityName}',
  youHavePlaces: 'יש לך {count} מקומות ב{cityName}',
  noSavedRoutesInCity: 'אין מסלולים שמורים ב{cityName}',
  googlePlaces: 'ממקומות Google Places',
  moreInCategory: '➕ מקומות נוספים ב',
  editNoCoordsHint: 'למקום זה אין קואורדינטות. לחץ על ✏️ כדי לערוך.',
  editNoCoordsHint2: 'למקום זה אין קואורדינטות. ערוך את המקום כדי להוסיף.',
  noResultsFor: 'לא נמצאו תוצאות עבור',
  searchError: 'שגיאה בחיפוש',
  addressNotFound: 'לא נמצאה כתובת תואמת',
  addressNotFoundRetry: 'לא נמצאה כתובת. נסה כתובת אחרת',
  placeNotFoundRetry: 'לא נמצא מקום. נסה שם אחר או כתובת',
  locationNotInAnyArea: 'המיקום לא נמצא בתוך אף אזור מוגדר',
  locationOutsideSelection: 'המיקום הנוכחי שלך נמצא מחוץ לאזורי הבחירה',
  noPlacesInRadius: 'לא נמצאו מקומות באזורים המוכרים ברדיוס שנבחר. נסה להגדיל רדיוס.',
  needCoordsForAreas: 'צריך קואורדינטות כדי לזהות אזורים',
  badCoords: 'לא זיהיתי קואורדינטות. נסה קישור Google Maps או: 13.7465,100.4927',
  shortLinksHint: 'קישורים מקוצרים: פתח בדפדפן והעתק את הקישור המלא',
  searchResults: 'חיפוש',
  byInterest: 'לפי תחום',
  byArea: 'לפי איזור',
  sortByUpdated: 'עודכן לאחרונה',
  sortByAdded: 'נוסף לאחרונה',
  sortByName: 'שם',
  addedAt: 'נוסף',
  updatedAt: 'עודכן',
  byName: 'לפי שם',
  includedPlaces: 'מקומות כלולים',
  skippedPlaces: 'מקומות מדולגים',
  drafts: 'טיוטות',
  ready: 'מוכנים',
  approved: 'מאושר',
  draft: 'טיוטה',
  skipped: 'דלג',
  noInterest: 'ללא תחום',
  autoName: 'שם אוטומטי',
  alreadyInRoute: 'כבר קיים במסלול',
  alreadyInMyList: 'כבר קיים ברשימה שלך',
  addedToYourList: 'נוסף לרשימה שלך!',
  alreadyBlacklisted: 'כבר ברשימת דילוג',
  addedToSkipList: 'נוסף לדילוג קבוע',
  alreadyInList: 'כבר קיים ברשימה',
  editAddedToList: 'ערוך (נוסף לרשימה)',
  noSavedRoutesInCity: 'אין מסלולים שמורים ב',
  noPlacesInCity: 'אין מקומות ב',
  noResultsFor: 'לא נמצאו תוצאות עבור',
  thisCity: 'עיר זו',
  fromGoogleCache: 'מגוגל (cache)',
},

// --- Interests ---
interests: {
  addInterest: 'הוסף תחום עניין',
  interestName: 'שם התחום',
  englishName: 'שם באנגלית',
  interestAdded: 'התחום נוסף!',
  alreadyExists: 'כבר קיים!',
  interestUpdated: 'התחום עודכן!',
  interestDeleted: 'תחום נמחק!',
  interestInvalid: 'תחום לא וולידי',
  missingSearchConfig: 'חסר הגדרות חיפוש',
  builtInRemoved: 'תחום מערכת הוסר',
  deleteBuiltIn: 'למחוק תחום מערכת',
  deleteCustom: 'למחוק תחום מותאם',
  resetToDefault: 'אפס לברירת מחדל',
  interestsReset: 'התחומים אופסו לברירת מחדל',
  exampleTypes: 'לדוגמה: בתי קולנוע',
  privateOnly: 'תחום פרטי',
  activeCount: 'פעילים',
  customCount: 'תחומים מותאמים',
  activeInterests: 'תחומים פעילים',
  disabledInterests: 'תחומים מושבתים',
  privateInterest: 'ידני',
  scopeGlobal: 'גלובלי — כל הערים',
  mapColor: 'צבע במפה:',
  routePlanning: 'תכנון מסלול',
  category: 'קטגוריה',
  catAttraction: 'אטרקציה',
  catBreak: 'הפסקה',
  catMeal: 'ארוחה',
  catExperience: 'חוויה',
  catShopping: 'קניות',
  catNature: 'טבע',
  maxStops: 'עצירות',
  weight: 'משקל',
  minStops: 'מינ׳',
  maxStopsLabel: 'מקס׳',
  routeSlot: 'מיקום',
  minGap: 'מרווח',
  bestTime: 'זמן',
  slotAny: 'כלשהו',
  slotBookend: 'התחלה+סוף',
  slotEarly: 'מוקדם',
  slotMiddle: 'אמצע',
  slotLate: 'מאוחר',
  slotEnd: 'סוף',
  timeAnytime: 'תמיד',
  timeDay: 'יום',
  timeEvening: 'ערב',
  timeNight: 'לילה',
  nextNumber: 'מספר הבא',
  scopeLocal: 'מקומי — עיר ספציפית',
  myPlacesOnly: 'רק מקומות שהוספת ידנית',
  searchesGoogle: 'מחפש גם בגוגל',
  interestStatus: 'סטטוס תחומים',
  categorySearch: 'חיפוש קטגוריה (types)',
  textSearch: 'חיפוש טקסט (query)',
  textQuery: 'טקסט חיפוש',
  placeTypes: 'סוגי מקומות (מופרדים בפסיק)',
  seeTypesList: 'ראה רשימת סוגים',
  blacklistWords: 'מילות סינון (מופרדות בפסיק)',
  dedupRelated: 'תחומים קשורים (כפילויות)',
  dedupRelatedDesc: 'תחומים שייחשבו זהים לצורך בדיקת כפילויות',
},

// --- Active Trail ---
trail: {
  started: 'מסלול פעיל! חזור לצלם מקומות חדשים',
  activeTitle: 'מסלול פעיל 🐾',
  activeDesc: 'ראית משהו מגניב? צלם והוסף למערכת!',
  capturePlace: 'צלם מקום חדש',
  whatDidYouSee: 'מה ראית?',
  stops: 'עצירות במסלול',
  backToMaps: 'חזרה לניווט',
  end: 'סיים',
  endTrail: 'סיים מסלול',
  ended: 'המסלול הסתיים',
  newTrail: 'התחל מסלול חדש',
  whereAmI: 'איפה אני?',
  youAreHere: 'אתה כאן',
  locating: 'מאתר מיקום',
  noStopsYet: 'אין עצירות במסלול עדיין',
  ratePlace: 'דרג',
  addToFavorites: 'הוסף למועדפים',
  addToFavoriteShort: 'שמור',
  addGoogleToFavorites: 'להוסיף את "{name}" למועדפים?\nנקודה זו תהיה מועדפת על פני תוצאות גוגל ותופיע ראשונה במסלולים הבאים.',
  addGoogleConfirm: 'הוסף למועדפים',
  addGoogleCancel: 'בטל',
  googleRating: 'דירוג גוגל',
  skip: 'דלג',
  unskip: 'החזר',
  needTwoStops: 'צריך לפחות 2 עצירות פעילות',
  photoRequired: 'צלם תמונה קודם',
  saved: 'המקום נשמר!',
  saveAndContinue: 'שמור והמשך בטיול',
  detectingLocation: 'מזהה מיקום',
  nearStop: 'ליד:',
  gpsBlocked: 'לא הצלחנו לזהות מיקום — המקום יישמר בלי קואורדינטות',
},

// --- Toasts & Messages ---
toast: {
  saveError: 'שגיאה בשמירה',
  saveNotVerified: 'השמירה לא אומתה — בדוק שהמקום נשמר!',
  savedLocalOnly: 'נשמר מקומית בלבד! אין חיבור לשרת — יאבד בסגירת הדף',
  offlineSaveWarning: 'אין חיבור לשרת! המקום יישמר רק מקומית ויאבד בסגירה',
  offline: 'אין חיבור לשרת',
  savedPending: 'נשמר מקומית — יסונכרן כשהחיבור יחזור',
  savedWillSync: 'נשמר — יסונכרן אוטומטית כשהחיבור יחזור',
  connectionRestored: 'החיבור לשרת חזר — הנתונים מסונכרנים',
  syncedPending: '{count} מקומות סונכרנו בהצלחה לשרת',
  stillPending: 'מקומות עדיין ממתינים לסנכרון',
  pendingSync: 'מקומות ממתינים לסנכרון',
  syncNow: 'סנכרן עכשיו',
  deleteError: 'שגיאה במחיקה',
  updateError: 'שגיאה בעדכון',
  searchError: 'שגיאה בחיפוש',
  exportError: 'שגיאה בייצוא',
  importError: 'שגיאה בייבוא',
  sendError: 'שגיאה בשליחה',
  locationError: 'שגיאה באיתור מיקום',
  addressSearchError: 'שגיאה בחיפוש כתובת',
  routeSaveError: 'שגיאה בשמירת מסלול',
  imageUploadError: 'שגיאה בהעלאת התמונה',
  uploadingImage: 'מעלה תמונה...',
  imageUploaded: 'התמונה הועלתה בהצלחה',
  addPlacesError: 'שגיאה בהוספת מקומות',
  googleInfoError: 'שגיאה בשליפת מידע מ-Google',
  resetError: 'שגיאה באיפוס',
  logClearError: 'שגיאה בניקוי הלוג',
  fileReadError: 'שגיאה בקריאת הקובץ',
  refreshError: '❌ שגיאה ברענון הנתונים',
  addressSearchErrorHint: 'שגיאה בחיפוש הכתובת. נסה באמצעות קישור Google Maps',
  storageFull: 'שגיאה בשמירה - אחסון מלא. נסה למחוק מסלולים ישנים',
  locationNotAvailable: 'המיקום לא זמין כרגע. נסה שוב.',
  locationTimeout: 'תם הזמן לקבלת המיקום. נסה שוב.',
  locationFailed: 'לא הצלחתי לקבל את המיקום.',
  locationNoPermission: 'אין הרשאת מיקום - אנא אשר גישה למיקום',
  locationNoPermissionBrowser: 'נדרשת הרשאה למיקום. אנא אפשר גישה במיקום בהגדרות הדפדפן.',
  locationUnavailable: 'לא ניתן לאתר מיקום',
  locationInaccessible: 'לא ניתן לגשת למיקום',
  outsideCity: 'המיקום שלך מחוץ לגבולות העיר',
  savingOutsideCity: 'לא ניתן לשמור — המקום מחוץ לגבולות העיר',
  adminSavingOutsideCity: '⚠️ אזהרה: המקום מחוץ לגבולות העיר — נשמר כי אתה אדמין',
  noGpsSignal: 'אין קליטת GPS',
  browserNoLocation: 'הדפדפן לא תומך במיקום',
  browserNoGps: 'הדפדפן שלך לא תומך במיקום GPS',
  noImportItems: 'לא נמצאו פריטים לייבוא',
  invalidFile: 'קובץ לא תקין - לא נמצאו נתונים',
  feedbackDeleted: 'משוב נמחק',
  feedbackThanks: 'תודה על המשוב! 🙏',
  userRemoved: 'משתמש הוסר',
  passwordSaved: 'סיסמה נשמרה!',
  passwordRemoved: 'סיסמה הוסרה - גישה פתוחה',
  logCleared: 'הלוג נוקה',
  allFeedbackDeleted: 'כל המשובים נמחקו',
  cleanupDeleting: 'מוחק {count} מקומות...',
  cleanupDeleted: 'נמחקו {count} מקומות שגויים',
  cleanupFailed: 'ניקוי נכשל: {error}',
  memoryFixesDone: 'תוקנו {count} מקומות',
  detectedAreas: '{count} אזורים זוהו',
  locationDeleted: '"{name}" נמחק',
  hintRecording: '🎤 מדבר...',
  appUpToDate: 'האפליקציה מעודכנת ✅',
  cannotCheckUpdates: 'לא ניתן לבדוק עדכונים',
  dataRefreshed: '🔄 כל הנתונים רועננו בהצלחה!',
  dataRefreshedLocal: '🔄 נתונים רועננו (localStorage בלבד - Firebase לא זמין)',
  debugOn: '✅ Debug מופעל',
  debugOff: '❌ Debug כבוי',
  addedNoteSuccess: '✅ נוסף! ניתן להוסיף מקום נוסף או לסגור',
  firebaseUnavailable: 'Firebase לא זמין',
  urlTooLong: '⚠️ כתובת ארוכה. ייתכן שחלק מהנקודות לא יוצגו',
  addressVerified: '✅ כתובת אומתה:',
  foundInArea: '📍 נמצאת באזור:',
  detectedAreas: 'זוהו אזורים',
  selectedPlace: 'נבחר',
  coordsDetected: 'קואורדינטות נקלטו:',
  locationDetectedCoords: 'מיקום נקלט:',
  found: 'נמצא!',
  foundPlace: 'נמצא:',
  newVersionAvailable: 'גרסה חדשה זמינה:',
  removedFromRoute: 'הוסר מהמסלול',
  addedMorePlaces: 'נוספו מקומות ל',
  noMoreInInterest: 'לא נמצאו עוד מקומות ב',
  errorsGettingPlaces: 'שגיאות בקבלת מקומות:',
  googleApiUnavailable: 'Google API זמנית לא זמין — נסה שוב בעוד כמה שניות',
  googleApiQuota: 'Google API: חריגה ממכסה — נסה שוב מאוחר יותר',
  interestDeletedWithPlaces: 'תחום נמחק (מקומות עדיין משתמשים בו)',
  interestDeleteWarning: 'מחיקת תחום ממועדפים:',
  interestDeleteWarningNoPlaces: 'למחוק את התחום',
  interestDeletedFull: 'תחום נמחק ונוקה מ-{count} מקומות',
  actionCannotBeUndone: 'פעולה זו אינה ניתנת לביטול.',
  outsideAreaWarning: 'אזהרה: המיקום מחוץ לאזורים שנבחרו. נשמר בכל זאת.',
  fileDownloaded: 'הקובץ הורד!',
  invalidFileNoData: 'קובץ לא תקין - לא נמצאו נתונים',
  statsTitle: 'המסלול שלך מוכן!',
  statsInterestsHeader: 'תחומי עניין במסלול:',
  statsSourceCustomOnly: 'כל המקומות נבחרו מרשימת המועדפים שלך',
  statsSourceGoogleOnly: 'כל המקומות הובאו מגוגל',
  statsSourceMixed: '{custom} מועדפים ו-{google} מקומות מגוגל',
  statsHint: 'מומלץ לפתוח את התיעוד במסך כדי להבין איך לשנות את המסלול',
  addedFromSearch: 'נוסף מחיפוש',
  privateOnlyTitle: 'תחום ללא חיפוש בגוגל',
  privateOnlyBody: 'התחום "{label}" אינו מחפש מקומות בגוגל אלא עושה שימוש רק במקומות מועדפים של המערכת',
  roleUpdated: 'תפקיד עודכן',
  noConnection: 'אין חיבור לאינטרנט',
},

// --- Settings ---
settings: {
  title: 'הגדרות',
  sendFeedback: 'שלח משוב',
  newFeedback: 'משוב חדש',
  send: 'שלח',
  writeFeedback: 'אנא כתוב משוב',
  feedbackPlaceholder: 'ספר לנו מה חשבת...',
  feedbackSubject: 'נושא',
  feedbackSenderName: 'שם',
  feedbackSenderEmail: 'מייל',
  myPastFeedback: 'המשוב שלי',
  deleteFeedbackConfirm: 'למחוק משוב זה?',
  allFeedback: 'כל המשובים',
  setPassword: 'הגדר סיסמה',
  changePassword: 'שנה סיסמת מערכת:',
  setNewPassword: 'הגדר סיסמת מערכת:',
  wrongPassword: 'סיסמה שגויה',
  newPasswordPlaceholder: 'סיסמה חדשה...',
  noPassword: '🔓 ללא סיסמה - גישה פתוחה לכולם',
  systemProtected: '🔒 מערכת מוגנת בסיסמה',
  refreshData: 'רענן את כל הנתונים',
  deleteAllConfirm: 'למחוק את כל לוג הכניסות? פעולה זו בלתי הפיכה.',
  deleteAllFeedback: 'למחוק את כל המשובים?',
  accessStats: 'סטטיסטיקות גישה',
  totalVisits: 'סה"כ ביקורים',
  exportSchema: 'ייצא סכמה (ל-AI)',
  appDescription: 'Local picks + Google spots. Choose your vibe, follow the trail 🍜🏛️🎭',
  language: 'שפה',
  newUserDefaultLang: 'ברירת מחדל למשתמשים חדשים',
  newUserDefaultLangHint: 'כשאין שפה שמורה ולא זוהתה שפת דפדפן',
  password: 'סיסמה',
  systemPassword: 'סיסמת מערכת',
  error: 'שגיאה',
  maxStops: 'מספר מקומות במסלול',
  googleMaxWaypoints: 'מקסימום נקודות בגוגל מפות',
  googleMaxWaypointsDesc: 'מגבלת גוגל מפות. אם המסלול חורג — יפוצל אוטומטית.',
  googleMaxMapPoints: 'מקסימום נקודות להצגה על מפה',
  googleMaxMapPointsDesc: 'מעל מספר זה תוצג התראה שיתכן וגוגל לא יציג את כולן.',
  dayNightHours: 'שעות יום / לילה',
  dayNightHoursDesc: 'מגדיר מתי "יום" ומתי "לילה" לצורך חיפוש ותיעדוף מקומות בעיר זו',
  dayStartHour: 'יום מתחיל',
  nightStartHour: 'לילה מתחיל',
  defaultRadius: 'רדיוס ברירת מחדל',
  radiusDescription: 'רדיוס חיפוש מסביב למיקום נוכחי (מטרים)',
  refreshData: 'רענון נתונים',
  refreshDescription: 'טען מחדש את כל הנתונים מ-Firebase: תחומים, מקומות, מסלולים והגדרות',
  voiceSelect: 'קול השמעה',
  defaultVoice: 'ברירת מחדל',
  otherVoices: 'קולות נוספים',
  noVoices: 'לא נמצאו קולות במערכת',
  speechRate: 'קצב דיבור',
  voiceHint: 'בחר קול ושמע דוגמה. ☁️ = קול ענן (איכות גבוהה יותר)',
  translating: 'מתרגם לאנגלית...',
  translated: 'תורגם ונשמר באנגלית!',
  translateBtn: '🌐 תרגם לעברית',
  translatingBtn: 'מתרגם...',
  translateDone: '✓ תורגם',
  saveAndTranslate: 'שמור ותרגם לאנגלית',
  refreshRatings: 'רענן דירוגי גוגל',
  refreshRatingsDesc: 'עדכון דירוגי גוגל לכל המקומות המועדפים בעיר הנוכחית',
  ratingsRefreshed: 'דירוגי גוגל עודכנו',
  bulkApprove: 'אשר טיוטות',
  bulkApproveDesc: 'הפוך מקומות טיוטה למאושרים בעיר הנוכחית',
  noDrafts: 'אין טיוטות לאישור',
  approveMyConfirm: 'לאשר',
  approveAllConfirm: 'לאשר',
  myDrafts: 'טיוטות שלי',
  allDrafts: 'טיוטות',
  myDraftsBtn: 'שלי',
  allDraftsBtn: 'הכל',
  mine: 'שלי',
  others: 'אחרים',
  approved: 'אושרו',
  noPlacesToRefresh: 'אין מקומות עם נוכחות בגוגל לרענון',
  updated: 'עודכנו',
  scanned: 'נסרקו',
  unchangedRating: 'ללא שינוי',
  recentlyUpdated: 'עודכנו לאחרונה',
  changePassword: 'שנה סיסמת מערכת:',
  setNewPassword: 'הגדר סיסמת מערכת:',
  systemProtected: '🔒 מערכת מוגנת בסיסמה',
  noPassword: '🔓 ללא סיסמה - גישה פתוחה לכולם',
  newPasswordPlaceholder: 'סיסמה חדשה...',
  lockedSettings: 'הגדרות נעולות',
  citiesAndAreas: 'ערים ואזורים',
  generalSettings: 'הגדרות כלליות',
  editArea: 'עריכת אזור',
  editOnMap: 'ערוך על המפה',
  addCity: 'הוסף עיר',
  enterCityName: 'הקלד שם עיר באנגלית',
  cityNotFound: 'עיר לא נמצאה, נסה שם אחר',
  cityAlreadyExists: 'עיר כבר קיימת במערכת',
  generateCity: 'צור עיר',
  generatingCity: 'מייצר נתוני עיר...',
  cityAdded: 'נוספה למערכת',
  cityStartsInactive: 'העיר תיווצר במצב לא פעיל — התאם אזורים והפעל',
  addCityConfirm: 'הוסף עיר למערכת',
  exportCity: 'ייצא קובץ עיר',
  copyInterestsFrom: 'העתק תחומים מ:',
  copy: 'העתק',
  copyInterests: 'העתק',
  copyInterestsHint: 'תחומים ספציפיים לעיר המקור לא יועתקו',
  unsavedChanges: 'יש שינויים שלא יוצאו — ייצא קובץ עיר',
  addArea: 'הוסף אזור',
  newAreaName: 'שם האזור החדש',
  areaExists: 'אזור עם שם זה כבר קיים',
  renameArea: 'שנה שם אזור',
  enterPasswordToRemove: 'הקלד סיסמת אדמין להסרת עיר',
  wrongPassword: 'סיסמה שגויה',
  radius: 'רדיוס',
  enterPassword: 'הזן סיסמה לפתיחת ההגדרות',
},

// --- Auth ---
auth: {
  signIn: 'התחבר',
  signOut: 'התנתק',
  register: 'הרשם',
  signInRequired: '🔒 כדי לבצע פעולה זו יש להתחבר — FouFou רוצה לשייך את התרומה שלך לחשבונך ולהגן על המידע',
  deleteAccount: 'מחק חשבון',
  deleteAccountConfirm: 'האם אתה בטוח שברצונך למחוק את החשבון?\nפעולה זו בלתי הפיכה.',
  accountDeleted: '🗑️ החשבון נמחק',
  deleteAccountError: '❌ שגיאה במחיקת החשבון',
  recentLoginRequired: '⚠️ יש להתחבר מחדש לפני מחיקת החשבון',
  loginSubtitle: 'התחבר כדי לשמור את ההתקדמות שלך',
  continueGoogle: 'המשך עם Google',
  continueMicrosoft: 'המשך עם Microsoft',
  continueApple: 'המשך עם Apple',
  continueAnonymous: 'המשך בלי חשבון',
  or: 'או',
  orSkip: 'או',
  email: 'אימייל',
  password: 'סיסמה',
  haveAccount: 'כבר יש חשבון? התחבר',
  noAccount: 'אין חשבון? הירשם',
  anonymous: 'אנונימי',
  regular: 'משתמש',
  anonWarning: '⚠️ חשבון אנונימי — אם תנקה cache הנתונים יאבדו. קשר לחשבון Google כדי לשמור.',
  linkGoogle: 'קשר לחשבון Google',
  accountLinked: '✅ החשבון קושר בהצלחה!',
  userNotFound: 'משתמש לא קיים. נסה להירשם.',
  wrongPassword: 'סיסמה שגויה',
  emailInUse: 'אימייל כבר רשום. נסה להתחבר.',
  weakPassword: 'סיסמה חלשה (מינימום 6 תווים)',
  userManagement: 'ניהול משתמשים',
  needEditor: 'נדרשת הרשאת עורך',
  needAdmin: 'נדרשת הרשאת מנהל',
  inUseBy: 'בשימוש מקומות',
  loginToSave: 'התחבר כדי לשמור',
},

// --- Map ---
map: {
  favTip: 'ריכוז נקודות באזור מסוים מעיד שהאזור עשיר בתכנים. סנן לפי תחום כדי לראות במה מתאפיין כל אזור ולתכנן מסלול ממוקד.',
},

// --- Help ---
help: {
  main: {
    title: 'איך להשתמש?',
    content: "**FouFou** עוזר לך לגלות מקומות מעניינים ולתכנן מסלול טיול.\n\n**3 שלבים פשוטים:**\n1. **בחר תחומי עניין** — מה מעניין אותך? גלריות, אוכל, קפה, מקדשים...\n2. **בחר אזור** — לחץ על אזור ברשימה, או \"קרוב אליי\" לחיפוש לפי GPS\n3. **קבל תוצאות** — המערכת מחפשת מקומות מהמועדפים שלך ומגוגל\n\n**אחרי שקיבלת תוצאות:**\n• **\"יאללה לדרך!\"** — פותח ניווט בגוגל מפות מיד\n• **\"מצב ידני\"** — שליטה מלאה: דלג על מקומות, שנה סדר, בחר נקודת התחלה\n• **\"🗺️ מפה ותכנון\"** — מפה אינטראקטיבית עם מסלול הליכה אמיתי\n\n**תפריט ☰ (למעלה מימין):**\n• 🗺️ **מסלול** — חזרה לתכנון\n• 💾 **שמורים** — מסלולים ששמרת\n• ⭐ **מועדפים** — מקומות שאהבת והוספת\n• 🏷️ **תחומים** — ניהול תחומי עניין\n• ⚙️ **הגדרות** — הגדרות מערכת (דורש סיסמא)\n\n**במהלך מסלול פעיל:**\n• **📸 צלם מקום חדש** — צלם, המערכת מזהה מקומות קרובים בגוגל\n• **⭐ דרג** — דרג מקומות מועדפים או הוסף מגוגל למועדפים\n• **📍 איפה אני** — מפה עם המיקום שלך והמסלול\n\n**טיפ:** מקומות שדורגו גבוה ב-FouFou יופיעו ראשונים במסלול!"
  },
  placesListing: {
    title: 'רשימת המקומות',
    content: "**מאיפה המקומות?**\nקודם מופיעים **מקומות מועדפים** שלך (שהוספת דרך ⭐), ואחר כך מקומות מ**גוגל** לפי דירוג.\n\n**מה אפשר לעשות עם כל מקום:**\n• **לחיצה על השם** — פותח בגוגל מפות (מועדפים פותחים דיאלוג עריכה)\n• **⏸️** — דלג על מקום (לא ייכלל במסלול). לחץ ▶️ להחזיר\n• **⭐** — מקום מועדף: לחץ לדירוג. מקום גוגל: לחץ להוספה למועדפים\n• **🖼️** — צפה בתמונה (מופיע רק אם יש תמונה)\n• **\"הוסף למועדפים\"** — כפתור סגול מקווקו (מקומות גוגל בלבד)\n\n**רוצה עוד מקומות?**\n• **\"עוד\"** (כפתור ירוק) — מביא עוד מקומות מגוגל באותו תחום\n• **\"➕ הוסף ידנית\"** — חפש מקום לפי שם והוסף למסלול\n\n**🕐 שעות פתיחה:**\nאם גוגל מספק שעות, הן מוצגות מתחת לשם. ירוק = פתוח, אדום = סגור.\n\n**אותיות Ⓐ Ⓑ Ⓒ:**\nתואמות את סדר העצירות בגוגל מפות."
  },
  manualMode: {
    title: 'מצב ידני',
    content: "**מצב ידני** נותן לך שליטה מלאה על המסלול.\n\n**מה אפשר לעשות:**\n• **⏸️ / ▶️** — השבת או הפעל עצירות\n• **\"🗺️ מפה ותכנון\"** — פתח מפה אינטראקטיבית\n• **\"☰ סדר עצירות\"** — שנה את סדר העצירות ידנית\n• **\"➕ הוסף ידנית\"** — הוסף מקום חדש למסלול\n• **\"עוד\"** — הבא עוד מקומות מגוגל לכל תחום\n\n**למטה:**\n• **\"יאללה לדרך!\"** — פותח ניווט בגוגל מפות\n• **💾** — שמור את המסלול\n• **📤** — שתף\n\n**המסלול מחושב אוטומטית!**\nכל שינוי (השבתה, הוספה, שינוי סדר) מעדכן את המסלול מיד."
  },
  mapPlanning: {
    title: 'מפה ותכנון',
    content: "**מפה אינטראקטיבית** עם מסלול הליכה אמיתי על כבישים ומדרכות.\n\n**מה רואים:**\n• **עיגולים צבעוניים** — העצירות שלך, עם אותיות Ⓐ Ⓑ Ⓒ\n• **קו כחול** — מסלול הליכה אמיתי (לא קו ישר!)\n• **🚶 מרחק | ⏱️ זמן** — למטה משמאל, מרחק וזמן הליכה אמיתיים\n• **נקודה כחולה** — המיקום שלך (אם GPS פעיל)\n\n**לחיצה על עצירה:**\n• **Google Maps ↗** — פתח את המקום בגוגל\n• **⏸️ דלג / ▶️ החזר** — השבת או הפעל עצירה\n• **▶ קבע כהתחלה** — קבע את העצירה כנקודת התחלה\n\n**למטה:**\n• **↔ ליניארי** — מסלול מנקודה A לנקודה Z\n• **⭕ מעגלי** — מסלול שחוזר לנקודת ההתחלה\n\n**📍 כפתור GPS** (למעלה מימין) — מציג את המיקום שלך על המפה."
  },
  activeTrail: {
    title: 'מסלול פעיל',
    content: "**כשמסלול פעיל** האפליקציה עוזרת לך בזמן הטיול.\n\n**📸 צלם מקום חדש:**\nצלם מקום מעניין שאתה רואה. המערכת:\n• מזהה את המיקום שלך ב-GPS\n• מחפשת מקומות קרובים בגוגל\n• מציעה לך להוסיף למועדפים\n\n**רשימת העצירות:**\n• **⭐** — דרג מקום מועדף (לחיץ!)\n• **☆** — הוסף מקום גוגל למועדפים (לחיץ!)\n• **🖼️** — צפה בתמונה ששמרת\n• **⏸️** — דלג על עצירה\n• **לחיצה על שם** — מועדף: עריכה. גוגל: פתיחה בגוגל מפות\n\n**כפתורים למטה:**\n• **📍 איפה אני** — מפה עם המיקום שלך ומסלול הליכה\n• **🗺️ חזרה לניווט** — פתח גוגל מפות עם העצירות הפעילות\n• **🏁 סיים מסלול** — סיום הטיול\n\n**טיפ:** אותיות Ⓐ Ⓑ Ⓒ תואמות את סדר העצירות בגוגל מפות."
  },
  route: {
    title: 'תוצאות המסלול',
    content: "**אחרי חיפוש** מופיעה רשימת מקומות מחולקת לפי תחום.\n\n**שתי אפשרויות:**\n• **\"יאללה לדרך!\"** — חישוב אוטומטי + ניווט בגוגל מפות\n• **\"מצב ידני\"** — שליטה מלאה (דלג, שנה סדר, הוסף)\n\n**\"+ עוד\"** ליד כל תחום — מביא מקומות נוספים מגוגל\n\n**💾 שמור** — שומר את המסלול לשימוש עתידי\n**📤 שתף** — שלח לחבר"
  },
  myContent: { title: 'התוכן שלי', content: "כאן אפשר לנהל את המקומות והתחומים שלך.\n\n**⭐ מועדפים** — מקומות שהוספת. הם מקבלים עדיפות על מקומות מגוגל!\n\n**🏷️ תחומים** — בחר אילו תחומי עניין יופיעו בחיפוש. אפשר גם ליצור תחומים חדשים." },
  myPlaces: { title: 'מועדפים', content: "**מקומות שהוספת** מופיעים ראשונים בתוצאות החיפוש!\n\n**איך מוסיפים:**\n• **📸 צלם מקום** — צלם ב-GPS, המערכת מזהה מקומות קרובים\n• **✏️ הוסף ידנית** — הזן שם, בחר תחום, הוסף קואורדינטות\n• **⭐ הוסף מהמסלול** — לחץ ☆ ליד מקום גוגל בתוצאות\n\n**חיפוש:** 🔍 מסנן לפי שם, תיאור, והערות\n\n**תצוגה:**\n• **לפי תחום** / **לפי אזור** — החלף בכפתורים למעלה\n• לחץ על שם מקום לעריכה\n• ⭐ דירוג מוצג (אם קיים)\n• 🖼️ תמונה מוצגת (אם קיימת)\n\n**טיפ:** מקומות שדורגו גבוה יופיעו ראשונים במסלול!" },
  myInterests: { title: 'תחומי עניין', content: "**תחומי העניין** קובעים אילו סוגי מקומות המערכת תחפש.\n\n**מה רואים כאן:**\nרשימת כל התחומים — מובנים (מהעיר) וחדשים (שיצרת).\nתחום עם ✓ = פעיל ויופיע בחיפוש.\nתחום עם ✕ = מושבת ולא יופיע.\n\n**פעולות:**\n• **לחץ על ✓/✕** — הפעל או השבת תחום\n• **✏️** — ערוך שם, אייקון, הגדרות חיפוש\n• **➕ הוסף תחום** — צור תחום חדש\n\n**חשוב:** תחום בלי הגדרות חיפוש (סוג מקום או טקסט) לא יביא מקומות מגוגל. הוא יעבוד רק עם מקומות מועדפים שלך." },
  interestConfig: { title: 'הגדרות תחום', content: "**הגדרות החיפוש של התחום**\n\n**שם התחום:**\nהשם שיופיע ברשימת התחומים.\n\n**סוג חיפוש (Place Types):**\nקטגוריות של Google למשל: temple, restaurant, museum.\nהמערכת מביאה מקומות שהסוג שלהם מתאים לאחת הקטגוריות.\n\n**חיפוש טקסט (Text Search):**\nחיפוש חופשי, למשל: \"street art\", \"rooftop bar\".\nהמערכת מביאה מקומות שגוגל מצא לפי הטקסט, ומסננת כאלה שהשם שלהם לא מכיל את הביטוי.\n\n**מילות סינון (Blacklist):**\nמילים שאם מופיעות בשם המקום, הוא לא ייכלל. למשל: \"cannabis\", \"massage\" - כדי לסנן מקומות לא רלוונטים.\n\n**⚠️ חשוב:** תחום בלי הגדרות חיפוש לא יעבוד!" },
  searchLogic: { title: 'איך המערכת מוצאת מקומות?', content: "**סדר העדיפויות:**\n1. **קודם** — מקומות מועדפים שלך שתואמים לאזור ולתחום\n2. **אחר כך** — מקומות מגוגל לפי דירוג\n\n**סינון:**\n• מקום עם מילת סינון (blacklist) בשם = מוסתר\n• מקום ששמו זהה למועדף שלך = מוסתר (מניעת כפילויות)\n• מקום ב\"דלג לצמיתות\" = מוסתר\n\n**כמות:**\nמספר המקומות מחולק בין התחומים לפי משקל ומינימום/מקסימום של כל תחום.\n\n**\"עוד\":** מוסיף מקומות נוספים מגוגל (מסומנים בגבול כחול מקווקו)" },
  saved: { title: 'מסלולים שמורים', content: "**מסלולים ששמרת** לשימוש עתידי.\n\n**שמירה:** לחץ 💾 במסך המסלול → תן שם\n\n**טעינה:** לחץ על מסלול → התוצאות נטענות מחדש\n\n**מחיקה:** 🗑️ ליד כל מסלול\n\n**טיפ:** מסלולים נכללים בייצוא/ייבוא בהגדרות!" },
  settings: { title: 'הגדרות', content: "**הגדרות המערכת** (דורש סיסמת מנהל)\n\n**מה אפשר לעשות:**\n• שינוי שפה (עברית / אנגלית)\n• ניהול ערים ואזורים\n• ייבוא/ייצוא נתונים\n• צפייה ביומן כניסות\n• שינוי סיסמת מנהל\n\n**פרמטרי מערכת:**\nהגדרות מתקדמות לכמות מקומות, רדיוס חיפוש, ועוד." },
  addLocation: { title: 'הוספת/עריכת מקום', content: "**חובה:** שם המקום + תחום עניין אחד לפחות.\n\n**שדות נוספים (לא חובה):**\n• איזורים, כתובת, הערות, תמונה\n\n**קואורדינטות** — נדרשות כדי שהמקום יופיע במסלול.\n• 🔍 חיפוש לפי שם — הדרך הקלה ביותר\n• 🏠 חיפוש לפי כתובת\n• 📍 מיקום GPS נוכחי\n\n**כפתורים:**\n• **שמור** — שומר וסוגר\n• **ביטול** — סוגר בלי לשמור\n• **🗑️** — מחק את המקום" },
  addInterest: { title: 'הוספת/עריכת תחום עניין', content: "**איך מוסיפים תחום חדש:**\n1. בחר **שם** ו**אייקון** (אימוג'י)\n2. בחר **סוג חיפוש:**\n   • **Category** — לפי סוג מקום בגוגל (למשל: museum, restaurant)\n   • **Text** — חיפוש חופשי (למשל: \"rooftop bar\")\n3. לחץ **הוסף** — התחום יופיע ברשימת התחומים\n\n**מילות סינון** — מקומות עם מילים אלו בשם לא ייכללו." },
  favoritesMap: { title: 'מפת מועדפים', content: "**מפת המועדפים** מציגה את כל המקומות ששמרת על המפה.\n\n**מה רואים:**\n• **נקודות צבעוניות** — כל נקודה היא מקום מועדף. הצבע מייצג את **תחום העניין** (גלריות, אוכל, מקדשים וכו')\n• **נקודות בהירות** — טיוטות (עוד לא מוכנות). נקודות חזקות = מוכנות\n• **עיגולים אפורים** — גבולות האזורים\n• **נקודה כחולה** — המיקום שלך (לחץ 📍)\n\n**לחיצה על נקודה:**\n• כרטיס עם שם, אזור, תחומים ותמונה\n• כפתורים: נווט בגוגל מפות, ערוך, סגור\n\n**🔍 סינון:**\n• **לפי אזור** — ראה רק מקומות באזור מסוים\n• **לפי תחום** — ראה רק תחומים נבחרים\n• **הצג/הסתר טיוטות**\n\n**💡 תובנות לתכנון:**\n• **ריכוז נקודות** באזור = האזור עשיר בתכנים, שווה להקדיש לו יותר זמן\n• **מיעוט נקודות** באזור = מספיק ביקור קצר\n• **גוון דומיננטי** באזור (למשל הרבה סגול = גלריות) = מאפיין את האזור\n• **מיקס צבעים** = אזור מגוון, מתאים למסלול של חצי יום\n• סנן לפי תחום אחד וראה באילו אזורים הוא מרוכז — שם כדאי לחפש" },
},

  emoji: {
    suggestTitle: 'הצע אייקון',
    suggest: 'הצע',
    describePlaceholder: 'תאר באנגלית, לדוגמה: public toilet, street food...',
    searching: 'מחפש',
    typeAndSearch: 'הקלד תיאור ולחץ חיפוש',
    moreOptions: 'הבא עוד',
    done: 'סיימתי',
  },
  speech: {
    startRecording: 'הקלט תיאור קולי',
    stopRecording: 'עצור הקלטה',
    micPermissionDenied: 'אין הרשאה למיקרופון',
  },
  import: {
    interests: 'תחומים:',
    configs: 'הגדרות:',
    locations: 'מקומות:',
    routes: 'מסלולים:',
    filterImport: 'סנן',
  lastImport: 'ייבוא אחרון',
  showAll: 'הצג הכל',
  importedAsDrafts: 'מקומות יובאו כטיוטות — סקור במועדפים > טיוטות',
  },
  reviews: {
    title: 'ביקורות',
    myReview: 'הביקורת שלי',
    notYetRated: 'עדיין לא דורג, מחכים לך במסלול!',
    writeReview: 'הקלד/הקלט ביקורת...',
    rating: 'דירוג',
    saved: 'הביקורת נשמרה',
    saveError: 'שגיאה בשמירת הביקורת',
    deleted: 'הביקורת נמחקה',
    noReviews: 'אין עדיין ביקורות',
    avgRating: 'דירוג ממוצע',
    save: 'שמור',
    cancel: 'ביטול',
    deleteReview: 'מחק ביקורת',
    unsavedChanges: 'יש שינויים שלא נשמרו. לשמור?',
    allReviews: 'כל הביקורות',
    rate: 'דרג',
    loginRequired: 'יש להתחבר כדי לדרג',
    ratingRequired: 'יש לבחור לפחות כוכב אחד',
  },
  sysParams: {
    tabTitle: 'פרמטרים',
    title: 'פרמטרי מערכת (אלגוריתם)',
    subtitle: 'ערכים אלה משפיעים על חיפוש, בניית מסלול ותיעדוף.',
    sectionApp: 'הגדרות אפליקציה',
    sectionDedup: 'זיהוי כפילויות',
    sectionAlgo: 'אלגוריתם מסלול',
    resetAll: 'אפס לברירת מחדל',
    resetDone: 'פרמטרי מערכת אופסו',
    maxStops: 'מקומות במסלול',
    maxStopsDesc: 'מספר מקומות מקסימלי שיופיעו ברשימת התוצאות',
    fetchMore: 'כמות "מצא עוד"',
    fetchMoreDesc: 'כמה מקומות נוספים להביא בכל לחיצה על "עוד"',
    maxWaypoints: 'נקודות בגוגל מפות',
    maxWaypointsDesc: 'מקסימום נקודות ביניים בקישור לגוגל מפות (מגבלת גוגל)',
    defaultRadius: 'רדיוס ברירת מחדל (מ\')',
    defaultRadiusDesc: 'רדיוס חיפוש ברירת מחדל למשתמשים חדשים (מטרים)',
    trailTimeout: 'תפוגת שביל (שעות)',
    trailTimeoutDesc: 'אחרי כמה שעות שביל פעיל מתפוגג אוטומטית',
    defaultWeight: 'משקל ברירת מחדל לתחום',
    defaultWeightDesc: 'משקל התחלתי לתחום — קובע כמה עצירות מוקצות לו',
    maxPasses: 'סבבי אופטימיזציה',
    maxPassesDesc: 'כמה פעמים האלגוריתם ינסה לשפר סדר עצירות',
    timeMatch: 'ניקוד זמן תואם',
    timeMatchDesc: 'ניקוד כשעצירה מתאימה לזמן המסלול (יום/לילה)',
    timeAnytime: 'ניקוד "בכל זמן"',
    timeAnytimeDesc: 'ניקוד לעצירות שמתאימות לכל זמן',
    timeConflict: 'ניקוד זמן סותר',
    timeConflictDesc: 'ניקוד כשזמן העצירה סותר את זמן המסלול',
    timePenalty: 'עונש סתירת זמן',
    timePenaltyDesc: 'עונש מיקום על עצירה שלא מתאימה לזמן בסידור מסלול',
    earlyThreshold: 'סף "מוקדם"',
    earlyThresholdDesc: 'עצירות "מוקדם" צריכות להיות לפני נקודה זו (0=התחלה, 1=סוף)',
    lateThreshold: 'סף "מאוחר"',
    lateThresholdDesc: 'עצירות "מאוחר" צריכות להיות אחרי נקודה זו (0=התחלה, 1=סוף)',
    endThreshold: 'סף "סוף"',
    endThresholdDesc: 'עצירות "סוף" צריכות להיות אחרי נקודה זו (0=התחלה, 1=סוף)',
    slotPenalty: 'כפל עונש מיקום',
    slotPenaltyDesc: 'כפל העונש כשעצירה במיקום לא מתאים',
    endPenalty: 'כפל עונש סוף',
    endPenaltyDesc: 'כפל עונש כשעצירת "סוף" לא בסוף המסלול',
    gapPenalty: 'כפל עונש ריווח',
    gapPenaltyDesc: 'עונש כשקטגוריות זהות צמודות זו לזו',
    dedupRadius: 'רדיוס זיהוי כפילויות (מ\')',
    dedupRadiusDesc: 'מרחק מקסימלי לזיהוי מקום כפול',
    dedupGoogle: 'זיהוי כפילויות בגוגל',
    dedupGoogleDesc: 'חפש מקומות קרובים בגוגל בעת הוספה (1=כן, 0=לא)',
    dedupCustom: 'זיהוי כפילויות מקומיות',
    dedupCustomDesc: 'חפש מקומות קרובים ברשימה בעת הוספה (1=כן, 0=לא)',
    maxStopsLabel: 'מקומות במסלול',
    fetchMoreLabel: 'מצא עוד — כמות',
    maxWaypointsLabel: 'נקודות בגוגל מפות',
    defaultRadiusLabel: 'רדיוס ברירת מחדל (מ\')',
    toastDurationLabel: 'זמן הצגת הודעה (ms)',
    includeDrafts: 'כלול טיוטות',
    includeDraftsDesc: 'הצג מקומות טיוטה במסלולים, מפות ורשימות',
    speechDuration: 'הקלטה (שניות)',
    speechDurationDesc: 'משך הקלטה מרבי לתיאור קולי',
    toastDurationDesc: 'כמה זמן מוצגת הודעה על המסך (אלפיות שנייה)',
    favoriteBaseScore: 'עדיפות בסיסית למועדף',
    favoriteBaseScoreDesc: 'ציון בסיסי שנוסף למקום מועדף ללא דירוג — מעל ממוצע גוגל טיפוסי (ברירת מחדל: 20)',
    favoriteBonusPerStar: 'בונוס לכוכב (מועדף מדורג)',
    favoriteBonusPerStarDesc: 'ציון שנוסף לכל כוכב כשהדירוג טוב — מועדף 5⭐ יקבל בונוס גדול (ברירת מחדל: 5)',
    favoriteLowRatingThreshold: 'סף דירוג גרוע',
    favoriteLowRatingThresholdDesc: 'ממוצע דירוג מתחת לערך זה ייחשב גרוע וייקבל עונש (ברירת מחדל: 2.5)',
    favoriteLowRatingPenalty: 'עונש על דירוג גרוע',
    favoriteLowRatingPenaltyDesc: 'מחסיר מציון המועדף כשהדירוג גרוע — מאפשר לגוגל חזק לנצח אותו (ברירת מחדל: 60)',
    favoriteNeutralRating: 'דרוג ניטרלי',
    favoriteNeutralRatingDesc: 'דרוג שמעליו = בונוס, שמתחתיו = מינוס, בדיוק עליו = ±0 — דרוג 3 = לא משפיע על הסדר (ברירת מחדל: 3.0)',
    favoriteMinRatingsForBonus: 'מינימום דרוגי פופו לבונוס',
    favoriteMinRatingsForBonusDesc: 'כמה אנשים צריכים לדרג בפופו כדי שהבונוס יופעל — פחות מכך = כאילו אין דרוג (ברירת מחדל: 1)',
    favoriteGoogleScoreWeight: 'משקל ניקוד גוגל (מועדף)',
    favoriteGoogleScoreWeightDesc: 'כפל על ניקוד גוגל של מועדף — 1.0=רגיל, 0=מתעלם מגוגל לחלוטין, 2.0=מכפיל (ברירת מחדל: 1.0)',
    sectionFavorites: '⭐ ניקוד מועדפים',
    sectionGoogleFilter: '🔍 סינון גוגל',
    googleMinRatingCount: 'מינימום דירוגים (דלג לצמיתות)',
    googleMinRatingCountDesc: 'מקומות גוגל עם פחות מכך דירוגים — לא יובאו לעולם',
    googleLowRatingCount: 'דירוגים לתיעדוף נמוך',
    googleLowRatingCountDesc: 'מקומות גוגל מתחת לכך — ציון נמוך מאוד, יובאו רק אם אין אחרים בתחום',
  },
  dedup: {
    title: 'מקום דומה נמצא בקרבת מקום!',
    subtitle: 'בחר מקום קיים מגוגל או הוסף כחדש',
    useThis: 'השתמש במקום זה',
    addAsNew: 'התעלם, הוסף כמקום חדש',
    alreadyExists: 'מקום זה כבר קיים ברשימה',
    customExists: 'כבר קיים ברשימה שלך',
    googleMatchMulti: 'מקומות קרובים בגוגל',
    selectOrSkip: 'בחר את המקום שצילמת, או דלג',
    noneOfThese: 'אף אחד מאלה — שמור כמקום חדש',
    scanButton: 'בדוק כפילויות',
    scanning: 'סורק...',
    noDuplicates: 'לא נמצאו כפילויות!',
    clustersFound: 'קבוצות חשודות',
    distance: 'מרחק',
    keep: 'השאר',
    remove: 'מחק',
    merged: 'מוזג',
    close: 'סגור',
    keepThis: 'השאר את זה',
    removeThis: 'מחק את זה',
    locOf: 'מתוך',
    googleMatch: 'נמצא מקום בגוגל',
    duplicateSkipped: 'מקום כפול — לא נוסף',
    scanByInterest: 'חיפוש לפי תחום וקרבה',
    scanByCoords: 'חיפוש לפי קרבה בלבד',
    scanCoordsButton: 'קרבה',
    confirmDelete: 'למחוק את המקום?',
    inYourList: 'קיים ברשימה שלך',
    fromGoogle: 'מגוגל',
    noGoogleId: 'ללא קישור גוגל',
    updateWithGoogle: 'עדכן מועדף בנתוני גוגל',
    updatedWithGoogle: 'עודכן בנתוני גוגל',
    openExisting: 'פתח מועדף קיים',
  },

// --- About ---
about: {
  title: 'אודות',
  edit: 'עריכה',
  cancel: 'ביטול',
  save: 'שמור',
  saveTranslate: 'שמור + תרגם לאנגלית',
  placeholder: 'כתוב כאן על FouFou...',
  noContent: 'לחץ על עריכה כדי להוסיף תוכן',
},

}, // end Hebrew


// ============================================================================
// ENGLISH STRINGS
// ============================================================================

en: {

general: {
  appName: 'FouFou',
  city: 'City',
  all: 'All',
  allCity: 'Entire city',
  me: 'Me',
  menu: 'Menu',
  viewImage: 'View image',
  fromGoogleCache: 'From Google (cached)',
  close: 'Close',
  cancel: 'Cancel',
  confirm: 'Confirm',
  editMap: 'Edit positions',
  mapSaved: 'Positions saved',
  dragToMove: 'Drag markers to reposition areas',
  min: 'min',
  save: 'Save',
  update: '💾 Update',
  updateAndQuit: '🚪 Update & Close',
  add: '➕ Add',
  addAndQuit: '🚪 Add & Close',
  delete: 'Delete',
  deleteAll: 'Delete all',
  edit: 'Edit',
  show: 'Show',
  hide: 'Hide',
  search: 'Search',
  clear: 'Clear',
  clearSelection: 'Clear selection',
  help: 'Help',
  all: 'All',
  loading: '⏳ Loading...',
  searching: 'Searching...',
  refreshing: 'Refreshing...',
  password: 'Password',
  general: 'General',
  static: 'Static',
  open: 'Open',
  viewOnly: 'View only',
  locked: 'Locked',
  filter: 'Filter / Search',
  clearAll: 'Clear all',
  legend: 'Color legend',
  tip: 'Tip',
  transparent: 'transparent',
  interests: 'Interests',
  status: 'Status',
  readOnly: 'Read only',
  error: 'Error',
  unknownError: 'Unknown error',
  safeArea: 'Safe',
  cautionArea: 'Use caution',
  dangerArea: 'Dangerous',
  enabled: '✅ Active',
  disabled: '⏸️ Disabled',
  enable: '✅ Enable',
  disable: 'Disable',
  enableAlt: 'Enable',
  enableCity: 'Enable city',
  disableCity: 'Disable city',
  included: '✅ Included',
  custom: 'Custom',
  private: '👤 Private',
  system: '🏗️ System',
  generalFeedback: '💭 General',
  personalNote: '👤 Personal',
  idea: '💡 Idea',
  bug: '🐛 Bug',
  mine: '🎖️ Mine',
  inProgress: 'In progress',
  underReview: '🛠️ Under review',
  noDescription: 'No description',
  noLocation: 'No location',
  noArea: 'No area',
  outsideBoundary: 'Outside boundary',
  clickForDetails: 'Click for full details',
  clickForImage: 'Click to view image',
  placeInfo: 'Place info',
  fromGoogle: 'From Google',
  fromGoogleApi: 'From Google API',
  addedFromSearch: 'Added from search',
  addedFromGoogle: 'Added from Google',
  addedManually: 'Added manually',
  addedByUser: 'My place',
  fromMyPlaces: 'From your places',
  addedViaMore: 'Added via +more',
  customPlace: 'Custom place',
  meters100: '>100m',
  meters2000: '>2000m',
  caution: 'Caution',
  openStatus: 'Open',
  closedStatus: 'Closed',
  skipPermanently: 'Skip permanently',
  areas: 'areas',
  total: 'Total',
  optional: 'optional',
  selectCity: 'Select city...',
  version: 'Version',
  selected: 'selected',
  refresh: 'Refresh',
  confirmRefresh: 'Refresh the page? Unsaved data will be lost.',
  share: 'Share',
  search: 'Search',
  cancel: 'Cancel',
  save: 'OK',
  mine: '🎖️ Mine',
  clear: 'Clear',
  show: 'Show',
  hide: 'Hide',
  system: '🏗️ System',
  private: '👤 Personal',
  bug: '🐛 Bug',
  idea: '💡 Idea',
  generalFeedback: '💭 General',
  customPlace: 'Custom place',
  general: 'General',
  static: 'Static',
  fromGoogleApi: 'from Google API',
  refreshing: 'Refreshing...',
  searching: 'Searching...',
  addedViaMore: 'Added via +more',
  addedManually: 'Added manually',
  fromMyPlaces: 'from my places',
  addedFromGoogle: 'Added from Google',
  addedByUser: 'Added by user',
  error: 'Error',
  all: 'All',
  enableCity: 'Enable city',
  disableCity: 'Disable city',
  noPlacesWithCoords: 'No places with valid coordinates',

  updateNow: 'Update now',
  newVersionAvailableBanner: 'New version available!',
  updateDesc: 'A new version of FouFou is available with improvements and fixes',
  later: 'Later',
  howItWorks: 'How it works',
  nearMe: 'Near me',
  nearLocation: 'Near location',
  nearMeGps: 'Near me',
  nearMePoint: 'Custom point',
  searchPointPlaceholder: 'Search hotel, address, place...',
  pointSelected: '📍 Point selected',
  changePoint: 'Change point',
  next: 'Next',
  back: 'Back',
  backToRoute: 'Back to route',
  startOver: 'Start over',
  mayTakeSeconds: 'This may take a few seconds',
  myPlace: 'My place',
  more: 'more',
  start: 'Start',
  linear: 'Linear',
  backToForm: 'Back to form',
  savedOn: 'Saved on',
  customStops: 'custom',
  consoleHint: 'Full details in Console (F12) - copy and send for fix',
  clickForDetails: 'Click for full details',
  restoredToList: 'restored to regular list',
  resultsFound: 'results found',
  noInterestManual: 'No interest / manually added',
  showActivityLog: 'Show activity log for debugging',
  debugMessages: 'Debug messages will appear in console (F12)',
  adminManagement: 'Admin management',
  currentDevice: 'Current device',
  status: 'Status',
  open: 'Open',
  noRegisteredUsers: 'No registered users',
  you: 'you',
  remove: 'Remove',
  removed: 'removed',
  active: 'Active',
  inactive: 'Inactive',
  viewAccessLog: 'View access log',
  new: 'New!',
  importExport: 'Import & Export',
  import: 'Import favorites',
  saveAndTransfer: 'Save and transfer data between devices',
  exportAll: 'Export all',
  exportSchema: 'Export Schema (for AI)',
  importFromFile: 'Import from file',
  transferDevices: 'Transfer between Claude and GitHub',
  dataBackup: 'Data backup',
  shareWithFriends: 'Share with friends',
  areas: 'areas',
  debugMode: 'Debug mode',
  searchError: 'Search error',
  noResultsFoundSearch: 'No results found',
  added: 'Added!',
  canAddMore: 'You can add more or close',
  ok: 'OK',
  exit: 'Exit',
  openInGoogle: 'Open in Google',
  openInGoogleNoCoords: 'Open in Google (no coords)',
  openPointInGoogle: 'Show point in Google',
  openGooglePoint: 'Open point in Google',
  viewOnly: 'View only',
  deletePlace: 'Delete place',
  deleteInterest: 'Delete interest',
  deleteRoute: 'Delete route',
  clearLog: 'Clear log',
  shareRoute: 'Share route',
  sharePoi: 'Share POI',
  openRoute: 'Open route',
  restoreActive: 'Restore as active',
  skipPermanent: 'Skip permanently',
  update: 'Update',
  close: 'Close',
  uses: 'Uses',
  adminUsers: 'Admin users',
  googleInfo: 'Google info',
  notes: 'Notes...',
  inProgress: 'In progress',
  locked: 'Locked',
  readOnly: 'Read only',
  interestName: 'Interest name',
  addInterestTitle: 'Add interest',
  autoDetect: 'Auto-detect',
  searchHintAddress: 'Enter address, hotel, train station, or any place',
  findPlaces: 'Find places',
  address: 'Address',
  placesHeader: 'Places',
  interestsHeader: 'Interests',
  searchTip: 'Click 🔍 to search address, 📍 for location, or 📌 from your places',
  stopsCount: 'stops',
  searchAndAddHint: '💡 Search and click to add to route. You can add multiple places.',
  placesAddedManually: 'places added manually',
  clickToUpload: 'Gallery',
  takePhoto: 'Camera',
  gpsExtracted: 'Location detected from photo!',
  photoSaved: 'Photo saved',
  image: 'Image',
  links: 'Links',
  coordinates: 'Coordinates',
  permissions: 'Permissions',
  found: 'Found',
  rating: 'Rating',
  area: 'Area',
  notesLabel: 'Notes',
  searchMode: 'Search Mode',
  name: 'Name',
  link: 'Link',
  location: 'Location',
  icon: 'Icon',
  routeName: 'Route name',
  mapsLink: 'Maps link',
  searchSettings: 'Search settings',
  tryDifferentSearch: 'Try a different search',
  startTypingToSearch: 'Start typing to search',
  multiplier: 'Multiplier',
  noEntries: 'No entries yet',
  noFeedback: 'No feedback yet',
  feedback: 'Feedback',
},

nav: {
  form: 'Plan',
  route: 'Route',
  search: 'Search',
  saved: 'Saved',
  myPlaces: 'Places',
  favorites: 'Favorites',
  myInterests: 'Interests',
  settings: 'Settings',
  planTrip: 'Plan your trip',
},

wizard: {
  step1Title: 'Plan your trip',
  chooseArea: 'Choose area',
  step1Subtitle: 'Choose an area or near me',
  step2Title: 'What interests you?',
  step2Subtitle: 'Choose one or more topics',
  step3Title: 'Choose how to continue',
  step3TitleResults: '{count} places found',
  audioTitle: 'Info',
  myLocation: 'My location',
  locationFound: '📍 Location found!',
  findPlaces: 'Find places',
  findPlacesCount: '🔍 Find points of interest ({count} places)',
  showMap: 'Show map',
  showMapFavInterest: '⭐ Favorites map',
  showMapFavArea: '📍 Favorites by area',
  areasOnly: 'Areas only',
  allAreasMap: '🗺️ All areas map',
  placesFound: 'places found!',
  yallaGo: 'Let\'s Go! 🗺️',
  yallaDesc: 'Calculate optimal route and open in Google Maps',
  manualMode: 'Your Route',
  manualDesc: 'Review the selected places. Feel free to edit and update as you like',
  customizeRoute: 'Customize route',
  customizeDesc: 'Choose start point, skip stops, reorder',
  orScrollToCustomize: 'or scroll down to customize manually',
},

form: {
  whatInterests: '⭐ What interests you?',
  searchRadius: '⭕ Search radius',
  radiusLabel: 'Radius:',
  gpsSearch: 'Search by GPS',
  gps: 'GPS',
  myPlace: 'My place',
  searchMyPlace: '🔍 Search my place...',
  allMode: 'All',
  areaMode: 'Area',
  radiusMode: 'Radius',
  currentLocation: 'Current location',
  findCurrentLocation: 'Find current location',
  locateMe: '📍 Locate me',
  locationDetected: '📍 Location detected',
  locationDetectedFull: '📍 Current location detected!',
  locationDetectedShort: '📍 Location detected!',
  locationDetectedNoAddr: '📍 Location detected (no address found)',
  locating: '⏳ Locating...',
  searchingLocation: 'Searching for location...',
  searchAddress: 'Search address',
  searchByAddress: 'Search by address',
  searchByName: 'Search by place name',
  searchingByName: 'Searching by name...',
  searchPlaceGoogle: 'Search place on Google',
  enterAddress: 'Please enter an address',
  enterPlaceName: 'Please enter a place name',
  enterAddressOrName: 'Enter address or place name',
  typeAddress: 'Type address, hotel name, place...',
  typeAddressAlt: 'Type address, place name, hotel...',
  extractFromLink: 'Extract from link',
  selectStartPoint: 'Choose a starting point',
  startPointFirst: 'Start from the first place in the list',
  setStartPoint: 'Set as starting point',
  chooseStartBeforeCalc: 'Choose a starting point before calculating route',
  setStartOnMap: 'Open the map to set a start point and calculate route',
  findLocationFirst: 'Please find your current location first',
  needGpsFirst: 'Need to set GPS location first',
  selectAreaAndInterest: 'Please select an area and at least one interest',
  selectAreaFirst: 'Please select an area before generating the route',
  details: 'Details',
  favoritesMap: 'Favorites Map',
  selectAtLeastOneInterest: 'Please select at least one interest',
  showSearchRadius: 'Show search radius',
  gpsRadiusHint: 'Search by GPS (1 km)',
  useGpsForRadius: '📍 Press GPS or set location to use radius mode',
  waitingForGps: 'Waiting for location...',
  allowLocationAccess: 'Allow location access in your browser',
},

route: {
  navigate: 'Navigate',
  calcRoute: '🧭 Calculate route',
  recalcRoute: '🔄 Recalculate route',
  helpMePlan: 'Help me plan',
  smartSelected: '{selected} selected, {disabled} disabled',
  saveRoute: 'Save route',
  editSavedRoute: '🗺️ Edit saved route',
  addSavedRoute: '🗺️ Add saved route',
  linear: 'Linear',
  linearRoute: '➡️ Linear',
  linearDesc: '➡️ Linear route',
  circular: 'Circular',
  circularRoute: '🔄 Circular route',
  circularDesc: '🔄 Circular route — returns to starting point',
  routeDeleted: 'Route deleted',
  routeUpdated: 'Route updated',
  routeSaved: 'Route saved!',
  routeCopied: 'Route copied to clipboard',
  orderUpdated: 'Stop order updated',
  manualOrderKept: 'Your custom order is kept — no recalculation done',
  calcRoutePrevious: 'Calculate previous route',
  returnToRoute: 'Return to route',
  removeFromRoute: 'Remove from route',
  skipPlace: 'Skip place',
  skipTemporarily: 'Skip temporarily',
  skipPermanently: 'Skip permanently',
  cancelPermanentSkip: 'Cancel permanent skip',
  returnPlace: 'Return place',
  addToMyList: 'Add to favorites',
  openedSuccess: 'Opened successfully!',
  linkCopied: 'Link copied! 📋',
  pointsCopied: 'Points of interest copied to clipboard',
  addManualStop: '➕ Manually add a stop to route',
  moreFromCategory: '+ more',
  reorderStops: 'סדר עצירות',
  dragToReorder: 'גרור לשינוי סדר',
  tapArrowsToMove: 'לחץ ▲▼ לשינוי סדר',
  openRouteInGoogle: 'יאללה לדרך! 🗺️',
  showStopsOnMap: '🗺️ מפה ותכנון',
  backToList: 'חזור לרשימה',
  stopNumber: 'עצירה',
  moveUp: 'העבר למעלה',
  moveDown: 'העבר למטה',
  reorderStops: 'Reorder stops',
  dragToReorder: 'Drag to reorder',
  tapArrowsToMove: 'Tap ▲▼ to reorder',
  openRouteInGoogle: 'Let\'s Go! 🗺️',
  openRoutePartN: 'Route part {n} of {total}',
  splitRouteWarning: '⚠️ Google Maps supports up to {max} points. Route split into {parts} parts. You can disable stops to reduce.',
  mapPointsWarning: 'ℹ️ Google Maps may not display all {count} points on the map.',
  showStopsOnMap: '🗺️ Map & Plan',
  backToList: 'Back to list',
  stopNumber: 'Stop',
  moveUp: 'Move up',
  moveDown: 'Move down',
  routeCalculated: 'Route calculated!',
  tapStopForStart: 'Tap a stop to set as start point',
  autoComputeHint: 'Route is auto-calculated. Change via 🗺️ Map & Plan',
  autoComputeReady: 'Route calculated and ready!',
  routeActionsHint: '🗺️ Map & Plan — reorder stops, set start, add points\n🚀 Let\'s Go — start navigating with Google Maps',
  timeAuto: 'Auto',
  timeDay: 'Day',
  timeAfternoon: 'Afternoon',
  timeNight: 'Evening',
  stops: 'stops',
  myRoute: 'My route',
  reoptimizing: 'Reordering route...',
  places: 'places',
  savedAs: 'Saved:',
  startPoint: 'Starting point',
  routeType: 'Route type',
  newRoute: 'New route',
},

places: {
  addPlace: 'Add place',
  addFromCamera: 'Snap place',
  addManually: 'Add manually',
  editPlace: 'Edit place',
  moreDetails: 'More details',
  noCoordinates: '📍 Cannot save without coordinates — enter an address or use GPS',
  unsavedChangesWarning: 'You have unsaved changes. Exit without saving?',
  favoriteNotOnGoogle: '📍 Favorite place — not on Google',
  openFavorite: 'Open favorite place',
  addPhoto: 'Take or attach photo',
  attachPhoto: 'Attach photo',
  replacePhoto: 'Replace photo',
  descriptionPlaceholder: 'Short place description...',
  aiGenerating: 'Writing description...',
  aiDone: 'Description generated!',
  photoAdded: 'Photo added!',
  camera: 'Camera',
  gallery: 'Gallery',
  placeName: 'Place name',
  enterPlaceName: 'Please enter a place name',
  nameExists: 'This name already exists',
  handled: 'Handled',
  placeExists: 'A place with this name already exists',
  address: 'Address',
  notes: 'Notes...',
  description: 'Short description of the place',
  descriptionPlaceholder: 'Type/dictate a short description',
  namePlaceholderEn: 'Type/dictate place name in English...',
  notesPlaceholder: 'Type/dictate notes...',
  findLocation: '📍 Find location',
  updateLocation: '✅ Update location',
  googleInfo: '🔎 Google info',
  searchingAddress: 'Searching address...',
  searchByNameHint: 'Search by name, description or notes...',
  placeAdded: 'Place added!',
  placeUpdated: 'Place updated!',
  placeDeleted: 'Place deleted!',
  placeAddedShared: 'Place added and saved for everyone!',
  detailsEdit: 'Details / Edit',
  showDrafts: 'Show drafts',
  searchPlace: 'Search place',
  searchPlaceholder: 'Type place name...',
  draft: 'Draft',
  editAddedToList: 'Edit (added to list)',
  missingDetails: 'Missing details',
  missingDetailsLong: 'Missing details (address/coordinates/topic)',
  noCoordinates: 'No coordinates - will not be included in route',
  noCoordinatesWarning: '⚠️ Missing coordinates',
  noCoordinatesWarnLong: '⚠️ Missing coordinates - will not be included in route',
  noLocationPermission: 'No location permission',
  outsideArea: 'Place outside area boundaries',
  placeNotOnGoogle: 'Place not found on Google',
  notEnoughInfo: 'Not enough info about the place',
  noPlacesFound: 'No results found',
  noMorePlaces: 'No more places found',
  noMatchingPlaces: 'No places found. Try different interests or area.',
  notEnoughInArea: 'Not enough matching places for this interest in selected area',
  notEnoughPartial: 'Not enough matching places for some interests in selected area',
  alreadyInRoute: 'Already in route',
  alreadyInList: 'Already in list',
  alreadyInMyList: 'Already in your list',
  alreadyBlacklisted: 'Already in skip list',
  addedToSkipList: 'Added to permanent skip',
  addedToYourList: 'Added to your list!',
  returnedToList: 'Returned to regular list',
  markHandled: 'Mark as handled',
  markUnhandled: 'Mark as not handled',
  selectImageFile: 'Please select an image file',
  noPlacesWithCoords: 'No places with valid coordinates',
  noPlacesInCity: 'No places in {cityName}',
  youHavePlaces: 'You have {count} places in {cityName}',
  noSavedRoutesInCity: 'No saved routes in {cityName}',
  googlePlaces: 'From Google Places',
  moreInCategory: '➕ More places in',
  editNoCoordsHint: 'This place has no coordinates. Click ✏️ to edit.',
  editNoCoordsHint2: 'This place has no coordinates. Edit the place to add them.',
  noResultsFor: 'No results found for',
  searchError: 'Search error',
  addressNotFound: 'No matching address found',
  addressNotFoundRetry: 'No address found. Try a different address',
  placeNotFoundRetry: 'Place not found. Try another name or address',
  locationNotInAnyArea: 'Location is not within any defined area',
  locationOutsideSelection: 'Your current location is outside the selected areas',
  noPlacesInRadius: 'No places found in recognized areas within selected radius. Try increasing radius.',
  needCoordsForAreas: 'Coordinates needed to identify areas',
  badCoords: 'Could not detect coordinates. Try a Google Maps link or: 13.7465,100.4927',
  shortLinksHint: 'Shortened links: open in browser and copy the full link',
  searchResults: 'Search',
  byInterest: 'By interest',
  byArea: 'By area',
  sortByUpdated: 'Recently updated',
  sortByAdded: 'Recently added',
  sortByName: 'Name',
  addedAt: 'Added',
  updatedAt: 'Updated',
  byName: 'By name',
  includedPlaces: 'Included places',
  skippedPlaces: 'Skipped places',
  drafts: 'Drafts',
  ready: 'Ready',
  approved: 'Approved',
  draft: 'Draft',
  skipped: 'Skipped',
  noInterest: 'No interest assigned',
  autoName: 'Auto name',
  alreadyInRoute: 'already in route',
  alreadyInMyList: 'already in your list',
  addedToYourList: 'added to your list!',
  alreadyBlacklisted: 'already in skip list',
  addedToSkipList: 'added to permanent skip',
  alreadyInList: 'already in list',
  editAddedToList: 'Edit (added to list)',
  noSavedRoutesInCity: 'No saved routes in',
  noPlacesInCity: 'No places in',
  noResultsFor: 'No results for',
  thisCity: 'this city',
  fromGoogleCache: 'from Google (cache)',
},

interests: {
  addInterest: 'Add interest',
  interestName: 'Interest name',
  englishName: 'English name',
  interestAdded: 'Interest added!',
  alreadyExists: 'already exists!',
  interestUpdated: 'Interest updated!',
  interestDeleted: 'Interest deleted!',
  interestInvalid: 'Invalid interest',
  missingSearchConfig: 'Missing search settings',
  builtInRemoved: 'System interest removed',
  deleteBuiltIn: 'Delete system interest',
  deleteCustom: 'Delete custom interest',
  resetToDefault: 'Reset to default',
  interestsReset: 'Interests reset to default',
  exampleTypes: 'For example: movie theaters',
  privateOnly: 'Private interest',
  activeCount: 'active',
  customCount: 'Custom interests',
  activeInterests: 'Active interests',
  disabledInterests: 'Disabled interests',
  privateInterest: 'Manual',
  scopeGlobal: 'Global — all cities',
  mapColor: 'Map color:',
  routePlanning: 'Route Planning',
  category: 'Category',
  catAttraction: 'Attraction',
  catBreak: 'Break',
  catMeal: 'Meal',
  catExperience: 'Experience',
  catShopping: 'Shopping',
  catNature: 'Nature',
  maxStops: 'Stops',
  weight: 'Weight',
  minStops: 'Min',
  maxStopsLabel: 'Max',
  routeSlot: 'Slot',
  minGap: 'Gap',
  bestTime: 'Time',
  slotAny: 'Any',
  slotBookend: 'Start+End',
  slotEarly: 'Early',
  slotMiddle: 'Middle',
  slotLate: 'Late',
  slotEnd: 'End',
  timeAnytime: 'Anytime',
  timeDay: 'Day',
  timeEvening: 'Evening',
  timeNight: 'Night',
  nextNumber: 'Next #',
  scopeLocal: 'Local — specific city',
  myPlacesOnly: 'Only manually added places',
  searchesGoogle: 'Also searches Google',
  interestStatus: 'Interest status',
  categorySearch: 'Category Search (types)',
  textSearch: 'Text Search (query)',
  textQuery: 'Text Query',
  placeTypes: 'Place Types (comma separated)',
  seeTypesList: 'See types list',
  blacklistWords: 'Blacklist Words (comma separated)',
  dedupRelated: 'Related interests (dedup)',
  dedupRelatedDesc: 'Interests that count as similar for duplicate detection',
},

trail: {
  started: 'Trail active! Come back to capture new places',
  activeTitle: 'Active Trail 🐾',
  activeDesc: 'Spotted something cool? Snap a photo and add it!',
  capturePlace: 'Capture New Place',
  whatDidYouSee: 'What did you see?',
  stops: 'Trail Stops',
  backToMaps: 'Resume Navigation',
  end: 'End',
  endTrail: 'End Trail',
  ended: 'Trail ended',
  newTrail: 'Start new trail',
  whereAmI: 'Where am I?',
  youAreHere: 'You are here',
  locating: 'Locating',
  noStopsYet: 'No stops on trail yet',
  ratePlace: 'Rate',
  addToFavorites: 'Add to favorites',
  addToFavoriteShort: 'Save',
  addGoogleToFavorites: 'Add "{name}" to favorites?\nThis place will be preferred over Google results and appear first in future routes.',
  addGoogleConfirm: 'Add to favorites',
  addGoogleCancel: 'Cancel',
  googleRating: 'Google rating',
  skip: 'Skip',
  unskip: 'Restore',
  needTwoStops: 'Need at least 2 active stops',
  photoRequired: 'Take a photo first',
  saved: 'Place saved!',
  saveAndContinue: 'Save & Continue Walking',
  detectingLocation: 'Detecting location',
  nearStop: 'Near:',
  gpsBlocked: 'Could not detect location — place will be saved without coordinates',
},

toast: {
  saveError: 'Save error',
  saveNotVerified: 'Save not verified — check that the place was saved!',
  savedLocalOnly: 'Saved locally only! No server connection — will be lost on page close',
  offlineSaveWarning: 'No server connection! Place will be saved locally only and lost on close',
  offline: 'No server connection',
  savedPending: 'Saved locally — will sync when connection returns',
  savedWillSync: 'Saved — will auto-sync when connection returns',
  connectionRestored: 'Server connection restored — data syncing',
  syncedPending: '{count} places synced to server',
  stillPending: 'places still waiting to sync',
  pendingSync: 'places waiting to sync',
  syncNow: 'Sync now',
  deleteError: 'Delete error',
  updateError: 'Update error',
  searchError: 'Search error',
  exportError: 'Export error',
  importError: 'Import error',
  sendError: 'Send error',
  locationError: 'Location detection error',
  addressSearchError: 'Address search error',
  routeSaveError: 'Route save error',
  imageUploadError: 'Image upload error',
  uploadingImage: 'Uploading image...',
  imageUploaded: 'Image uploaded successfully',
  addPlacesError: 'Error adding places',
  googleInfoError: 'Error fetching Google info',
  resetError: 'Reset error',
  logClearError: 'Error clearing log',
  fileReadError: 'Error reading file',
  refreshError: '❌ Error refreshing data',
  addressSearchErrorHint: 'Address search error. Try using a Google Maps link',
  storageFull: 'Save error - storage full. Try deleting old routes',
  locationNotAvailable: 'Location not available right now. Try again.',
  locationTimeout: 'Location request timed out. Try again.',
  locationFailed: 'Could not get location.',
  locationNoPermission: 'No location permission - please allow location access',
  locationNoPermissionBrowser: 'Location permission required. Please enable location access in browser settings.',
  locationUnavailable: 'Unable to detect location',
  locationInaccessible: 'Cannot access location',
  outsideCity: 'Your location is outside the city boundaries',
  savingOutsideCity: 'Cannot save — location is outside city boundaries',
  adminSavingOutsideCity: '⚠️ Warning: Location is outside city boundaries — saved because you are admin',
  noGpsSignal: 'No GPS signal',
  browserNoLocation: 'Browser does not support location',
  browserNoGps: 'Your browser does not support GPS location',
  noImportItems: 'No items found to import',
  invalidFile: 'Invalid file - no data found',
  feedbackDeleted: 'Feedback deleted',
  feedbackThanks: 'Thanks for the feedback! 🙏',
  userRemoved: 'User removed',
  passwordSaved: 'Password saved!',
  passwordRemoved: 'Password removed - open access',
  logCleared: 'Log cleared',
  allFeedbackDeleted: 'All feedback deleted',
  cleanupDeleting: 'Deleting {count} locations...',
  cleanupDeleted: 'Deleted {count} wrong-city locations',
  cleanupFailed: 'Cleanup failed: {error}',
  memoryFixesDone: 'Fixed {count} locations',
  detectedAreas: '{count} areas detected',
  locationDeleted: '"{name}" deleted',
  hintRecording: '🎤 Recording...',
  appUpToDate: 'App is up to date ✅',
  cannotCheckUpdates: 'Cannot check for updates',
  dataRefreshed: '🔄 All data refreshed successfully!',
  dataRefreshedLocal: '🔄 Data refreshed (localStorage only - Firebase unavailable)',
  debugOn: '✅ Debug enabled',
  debugOff: '❌ Debug disabled',
  addedNoteSuccess: '✅ Added! You can add another place or close',
  firebaseUnavailable: 'Firebase unavailable',
  urlTooLong: '⚠️ URL too long. Some points may not display',
  addressVerified: '✅ Address verified:',
  foundInArea: '📍 Found in area:',
  detectedAreas: 'areas detected',
  selectedPlace: 'selected',
  coordsDetected: 'Coordinates detected:',
  locationDetectedCoords: 'Location detected:',
  found: 'Found!',
  foundPlace: 'Found:',
  newVersionAvailable: 'New version available:',
  removedFromRoute: 'Removed from route',
  addedMorePlaces: 'places added to',
  noMoreInInterest: 'No more places in',
  errorsGettingPlaces: 'Errors getting places:',
  googleApiUnavailable: 'Google API temporarily unavailable — try again in a few seconds',
  googleApiQuota: 'Google API quota exceeded — try again later',
  interestDeletedWithPlaces: 'Interest deleted (places still using it)',
  interestDeleteWarning: 'Removing interest from favorites:',
  interestDeleteWarningNoPlaces: 'Delete interest',
  interestDeletedFull: 'Interest deleted and cleaned from {count} places',
  actionCannotBeUndone: 'This action cannot be undone.',
  outsideAreaWarning: 'Warning: Location outside selected areas. Saved anyway.',
  fileDownloaded: 'File downloaded!',
  invalidFileNoData: 'Invalid file - no data found',
  statsTitle: 'Your route is ready!',
  statsInterestsHeader: 'Interests in route:',
  statsSourceCustomOnly: 'All places selected from your favorites',
  statsSourceGoogleOnly: 'All places brought from Google',
  statsSourceMixed: '{custom} favorites and {google} places from Google',
  statsHint: 'Open the documentation panel on screen to learn how to edit the route',
  addedFromSearch: 'Added from search',
  privateOnlyTitle: 'No Google search for this interest',
  privateOnlyBody: 'The interest "{label}" does not search Google — it only uses places from the system favorites',
  roleUpdated: 'Role updated',
  noConnection: 'No internet connection',
},

settings: {
  title: 'Settings',
  sendFeedback: 'Send feedback',
  newFeedback: 'New feedback',
  send: 'Send',
  writeFeedback: 'Please write feedback',
  feedbackPlaceholder: 'Tell us what you think...',
  feedbackSubject: 'Subject',
  feedbackSenderName: 'Name',
  feedbackSenderEmail: 'Email',
  myPastFeedback: 'My feedback',
  deleteFeedbackConfirm: 'Delete this feedback?',
  allFeedback: 'All feedback',
  setPassword: 'Set password',
  changePassword: 'Change system password:',
  setNewPassword: 'Set system password:',
  wrongPassword: 'Wrong password',
  newPasswordPlaceholder: 'New password...',
  noPassword: '🔓 No password - open access for everyone',
  systemProtected: '🔒 System protected by password',
  refreshData: 'Refresh all data',
  deleteAllConfirm: 'Delete all access logs? This action cannot be undone.',
  deleteAllFeedback: 'Delete all feedback?',
  accessStats: 'Access statistics',
  totalVisits: 'Total visits',
  exportSchema: 'Export schema (for AI)',
  appDescription: 'Local picks + Google spots. Choose your vibe, follow the trail 🍜🏛️🎭',
  language: 'Language',
  newUserDefaultLang: 'Default for new users',
  newUserDefaultLangHint: 'When no saved preference & browser language unrecognized',
  error: 'Error',
  maxStops: 'Places per route',
  googleMaxWaypoints: 'Max points in Google Maps',
  googleMaxWaypointsDesc: 'Google Maps limit. Routes exceeding this will be automatically split.',
  googleMaxMapPoints: 'Max points to show on map',
  googleMaxMapPointsDesc: 'Above this number a warning will be shown that Google may not display all points.',
  dayNightHours: 'Day / Night Hours',
  dayNightHoursDesc: 'Defines when "day" and "night" start for search and place prioritization in this city',
  dayStartHour: 'Day starts',
  nightStartHour: 'Night starts',
  defaultRadius: 'Default radius',
  radiusDescription: 'Search radius around current location (meters)',
  refreshData: 'Refresh data',
  refreshDescription: 'Reload all data from Firebase: interests, places, routes and settings',
  voiceSelect: 'Voice',
  defaultVoice: 'Default',
  otherVoices: 'Other voices',
  noVoices: 'No voices found on this device',
  speechRate: 'Speech rate',
  voiceHint: 'Choose a voice and hear a preview. ☁️ = cloud voice (higher quality)',
  translating: 'Translating to English...',
  translated: 'Translated and saved in English!',
  translateBtn: '🌐 Translate to English',
  translatingBtn: 'Translating...',
  translateDone: '✓ Translated',
  saveAndTranslate: 'Save and translate to English',
  refreshRatings: 'Refresh Google ratings',
  refreshRatingsDesc: 'Update Google ratings for all favorite places in current city',
  ratingsRefreshed: 'Google ratings updated',
  bulkApprove: 'Approve drafts',
  bulkApproveDesc: 'Convert draft places to approved in current city',
  noDrafts: 'No drafts to approve',
  approveMyConfirm: 'Approve',
  approveAllConfirm: 'Approve',
  myDrafts: 'my drafts',
  allDrafts: 'drafts',
  myDraftsBtn: 'Mine',
  allDraftsBtn: 'All',
  mine: 'mine',
  others: 'others',
  approved: 'approved',
  noPlacesToRefresh: 'No places with Google presence to refresh',
  updated: 'updated',
  scanned: 'scanned',
  unchangedRating: 'unchanged',
  recentlyUpdated: 'recently updated',
  changePassword: 'Change system password:',
  setNewPassword: 'Set system password:',
  systemProtected: '🔒 System password protected',
  noPassword: '🔓 No password - open access',
  newPasswordPlaceholder: 'New password...',
  lockedSettings: 'Locked settings',
  citiesAndAreas: 'Cities & Areas',
  generalSettings: 'General Settings',
  editArea: 'Edit area',
  editOnMap: 'Edit on map',
  addCity: 'Add city',
  enterCityName: 'Enter city name in English',
  cityNotFound: 'City not found, try another name',
  cityAlreadyExists: 'City already exists',
  generateCity: 'Generate city',
  generatingCity: 'Generating city data...',
  cityAdded: 'added to system',
  cityStartsInactive: 'City starts inactive — adjust areas and activate',
  addCityConfirm: 'Add city to system',
  exportCity: 'Export city file',
  copyInterestsFrom: 'Copy interests from:',
  copy: 'Copy',
  copyInterests: 'Copy',
  copyInterestsHint: 'City-specific interests from the source will not be copied',
  unsavedChanges: 'Unsaved changes — export city file',
  addArea: 'Add area',
  newAreaName: 'New area name',
  areaExists: 'Area with this name already exists',
  renameArea: 'Rename area',
  enterPasswordToRemove: 'Enter admin password to remove city',
  wrongPassword: 'Wrong password',
  radius: 'Radius',
  enterPassword: 'Enter password to unlock',
},

// --- Auth ---
auth: {
  signIn: 'Sign In',
  signInRequired: '🔒 Please sign in to continue — FouFou links your contributions to your account and keeps the data secure',
  signOut: 'Sign Out',
  register: 'Register',
  deleteAccount: 'Delete account',
  deleteAccountConfirm: 'Are you sure you want to delete your account?\nThis action is irreversible.',
  accountDeleted: '🗑️ Account deleted',
  deleteAccountError: '❌ Error deleting account',
  recentLoginRequired: '⚠️ Please sign in again before deleting your account',
  loginSubtitle: 'Sign in to save your progress',
  continueGoogle: 'Continue with Google',
  continueMicrosoft: 'Continue with Microsoft',
  continueApple: 'Continue with Apple',
  continueAnonymous: 'Continue without account',
  or: 'or',
  orSkip: 'or',
  email: 'Email',
  password: 'Password',
  haveAccount: 'Already have an account? Sign in',
  noAccount: "Don't have an account? Register",
  anonymous: 'Anonymous',
  regular: 'User',
  anonWarning: '⚠️ Anonymous account — data will be lost if you clear cache. Link to Google to keep it safe.',
  linkGoogle: 'Link to Google account',
  accountLinked: '✅ Account linked successfully!',
  userNotFound: 'User not found. Try registering.',
  wrongPassword: 'Wrong password',
  emailInUse: 'Email already registered. Try signing in.',
  weakPassword: 'Weak password (minimum 6 characters)',
  userManagement: 'User Management',
  needEditor: 'Editor permission required',
  needAdmin: 'Admin permission required',
  inUseBy: 'Used by places',
  loginToSave: 'Sign in to save',
},

// --- Map ---
map: {
  favTip: 'Dense clusters indicate content-rich areas. Filter by interest to see what characterizes each area and plan a focused route.',
},

help: {
  main: {
    title: 'How to use?',
    content: "**FouFou** helps you discover interesting places and plan a trip route.\n\n**3 simple steps:**\n1. **Choose interests** — what interests you? Galleries, food, coffee, temples...\n2. **Choose an area** — tap an area from the list, or \"Near me\" to search by GPS\n3. **Get results** — the system searches your favorites and Google for places\n\n**After getting results:**\n• **\"Let's Go!\"** — opens navigation in Google Maps immediately\n• **\"Manual mode\"** — full control: skip places, change order, choose starting point\n• **\"🗺️ Map & Plan\"** — interactive map with real walking route\n\n**Menu ☰ (top right):**\n• 🗺️ **Route** — back to planning\n• 💾 **Saved** — routes you saved\n• ⭐ **Favorites** — places you liked and added\n• 🏷️ **Interests** — manage interest categories\n• ⚙️ **Settings** — system settings (requires password)\n\n**During an active trail:**\n• **📸 Snap a place** — take a photo, the system identifies nearby Google places\n• **⭐ Rate** — rate favorite places or add Google places to favorites\n• **📍 Where am I** — map with your location and the route\n\n**Tip:** Places rated highly in FouFou will appear first in your route!"
  },
  placesListing: {
    title: 'Places list',
    content: "**Where do places come from?**\nFirst come your **favorite places** (added via ⭐), then **Google** places sorted by rating.\n\n**What you can do with each place:**\n• **Click the name** — opens in Google Maps (favorites open the edit dialog)\n• **⏸️** — skip a place (won't be in the route). Press ▶️ to restore\n• **⭐** — favorite place: click to rate. Google place: click to add to favorites\n• **🖼️** — view photo (shown only if a photo exists)\n• **\"Add to favorites\"** — dashed purple button (Google places only)\n\n**Want more places?**\n• **\"More\"** (green button) — fetches more Google places in that interest\n• **\"➕ Add manually\"** — search a place by name and add to route\n\n**🕐 Opening hours:**\nIf Google provides hours, they appear below the name. Green = open, red = closed.\n\n**Letters Ⓐ Ⓑ Ⓒ:**\nMatch the stop order in Google Maps."
  },
  manualMode: {
    title: 'Manual mode',
    content: "**Manual mode** gives you full control over the route.\n\n**What you can do:**\n• **⏸️ / ▶️** — disable or enable stops\n• **\"🗺️ Map & Plan\"** — open interactive map\n• **\"☰ Reorder stops\"** — change stop order manually\n• **\"➕ Add manually\"** — add a new place to the route\n• **\"More\"** — fetch more Google places per interest\n\n**At the bottom:**\n• **\"Let's Go!\"** — opens navigation in Google Maps\n• **💾** — save the route\n• **📤** — share\n\n**Route updates automatically!**\nEvery change (disabling, adding, reordering) recalculates the route instantly."
  },
  mapPlanning: {
    title: 'Map & Plan',
    content: "**Interactive map** with real walking route on streets and sidewalks.\n\n**What you see:**\n• **Colored circles** — your stops, with letters Ⓐ Ⓑ Ⓒ\n• **Blue line** — real walking route (not a straight line!)\n• **🚶 Distance | ⏱️ Time** — bottom left, actual walking distance and time\n• **Blue dot** — your location (if GPS is active)\n\n**Clicking a stop:**\n• **Google Maps ↗** — open the place in Google\n• **⏸️ Skip / ▶️ Restore** — disable or enable a stop\n• **▶ Set as start** — set the stop as starting point\n\n**At the bottom:**\n• **↔ Linear** — route from point A to point Z\n• **⭕ Circular** — route that returns to the starting point\n\n**📍 GPS button** (top right) — shows your location on the map."
  },
  activeTrail: {
    title: 'Active trail',
    content: "**When a trail is active** the app helps you during the trip.\n\n**📸 Snap a new place:**\nTake a photo of an interesting place. The system:\n• Detects your location via GPS\n• Searches for nearby Google places\n• Offers to add them to your favorites\n\n**Stop list:**\n• **⭐** — rate a favorite place (clickable!)\n• **☆** — add a Google place to favorites (clickable!)\n• **🖼️** — view a photo you saved\n• **⏸️** — skip a stop\n• **Click name** — favorite: edit. Google: open in Google Maps\n\n**Buttons at bottom:**\n• **📍 Where am I** — map with your location and walking route\n• **🗺️ Resume Navigation** — open Google Maps with active stops\n• **🏁 Finish trail** — end the trip\n\n**Tip:** Letters Ⓐ Ⓑ Ⓒ match the stop order in Google Maps."
  },
  route: {
    title: 'Route results',
    content: "**After searching** a list of places appears divided by interest.\n\n**Two options:**\n• **\"Let's Go!\"** — automatic calculation + Google Maps navigation\n• **\"Manual mode\"** — full control (skip, reorder, add)\n\n**\"+ More\"** next to each interest — fetches more Google places\n\n**💾 Save** — saves the route for future use\n**📤 Share** — send to a friend"
  },
  myContent: { title: 'My content', content: "Here you can manage your places and interests.\n\n**⭐ Favorites** — places you added. They get priority over Google places!\n\n**🏷️ Interests** — choose which interest categories appear in search. You can also create new ones." },
  myPlaces: { title: 'Favorites', content: "**Your favorite places** appear first in search results!\n\n**How to add:**\n• **📸 Snap a place** — take a photo with GPS, the system identifies nearby places\n• **✏️ Add manually** — enter name, choose interest, add coordinates\n• **⭐ Add from route** — click ☆ next to a Google place in results\n\n**Search:** 🔍 filters by name, description, and notes\n\n**Display:**\n• **By interest** / **By area** — switch with buttons at top\n• Click a place name to edit\n• ⭐ Rating shown (if rated)\n• 🖼️ Photo shown (if available)\n\n**Tip:** Highly rated places appear first in routes!" },
  myInterests: { title: 'Interests', content: "**Interests** determine which types of places the system searches for.\n\n**What you see here:**\nList of all interests — built-in (from the city) and custom (you created).\nInterest with ✓ = active, will appear in search.\nInterest with ✕ = disabled, won't appear.\n\n**Actions:**\n• **Click ✓/✕** — enable or disable an interest\n• **✏️** — edit name, icon, search settings\n• **➕ Add interest** — create a new interest\n\n**Important:** An interest without search settings (place type or text) won't fetch Google places. It will only work with your own favorites." },
  interestConfig: { title: 'Interest settings', content: "**Search settings for the interest**\n\n**Interest name:**\nThe name shown in the interests list.\n\n**Category search (Place Types):**\nGoogle categories like: temple, restaurant, museum.\nThe system finds places whose type matches one of the categories.\n\n**Text search:**\nFree text search, e.g.: \"street art\", \"rooftop bar\".\nThe system finds places Google matched to the text, filtering those whose name doesn't contain the search term.\n\n**Filter words (Blacklist):**\nWords that if they appear in a place name, it won't be included. E.g.: \"cannabis\", \"massage\" — to filter irrelevant places.\n\n**⚠️ Important:** An interest without search settings won't work!" },
  searchLogic: { title: 'How does the system find places?', content: "**Priority order:**\n1. **First** — your favorites matching the area and interest\n2. **Then** — Google places by rating\n\n**Filtering:**\n• Place with a filter word (blacklist) in name = hidden\n• Place with same name as your favorite = hidden (duplicate prevention)\n• Place in \"skip permanently\" = hidden\n\n**Amount:**\nNumber of places is split between interests by weight and min/max per interest.\n\n**\"More\":** adds more Google places (marked with dashed blue border)" },
  saved: { title: 'Saved routes', content: "**Routes you saved** for future use.\n\n**Saving:** Click 💾 on the route screen → give a name\n\n**Loading:** Click a route → results reload\n\n**Deleting:** 🗑️ next to each route\n\n**Tip:** Routes are included in export/import in settings!" },
  settings: { title: 'Settings', content: "**System settings** (requires admin password)\n\n**What you can do:**\n• Change language (Hebrew / English)\n• Manage cities and areas\n• Import/export data\n• View access log\n• Change admin password\n\n**System parameters:**\nAdvanced settings for number of places, search radius, and more." },
  addLocation: { title: 'Add/Edit place', content: "**Required:** Place name + at least one interest.\n\n**Additional fields (optional):**\n• Areas, address, notes, image\n\n**Coordinates** — required for the place to appear in the route.\n• 🔍 Search by name — the easiest way\n• 🏠 Search by address\n• 📍 Current GPS location\n\n**Buttons:**\n• **Save** — saves and closes\n• **Cancel** — closes without saving\n• **🗑️** — delete the place" },
  addInterest: { title: 'Add/Edit interest', content: "**How to add a new interest:**\n1. Choose a **name** and **icon** (emoji)\n2. Choose **search type:**\n   • **Category** — by Google place type (e.g.: museum, restaurant)\n   • **Text** — free search (e.g.: \"rooftop bar\")\n3. Click **Add** — the interest will appear in the interests list\n\n**Filter words** — places with these words in their name won't be included." },
  favoritesMap: { title: 'Favorites Map', content: "**The favorites map** displays all your saved places on an interactive map.\n\n**What you see:**\n• **Colored dots** — each dot is a favorite place. Color represents its **interest** (galleries, food, temples, etc.)\n• **Faded dots** — drafts (not yet ready). Strong dots = ready\n• **Gray circles** — area boundaries\n• **Blue dot** — your location (tap 📍)\n\n**Tapping a dot:**\n• Card with name, area, interests and photo\n• Buttons: navigate in Google Maps, edit, close\n\n**🔍 Filtering:**\n• **By area** — see only places in a specific area\n• **By interest** — see only selected interests\n• **Show/hide drafts**\n\n**💡 Insights for planning:**\n• **Dense clusters** in an area = rich in content, worth spending more time\n• **Few dots** in an area = a short visit is enough\n• **Dominant color** in an area (e.g. lots of purple = galleries) = characterizes the area\n• **Color mix** = diverse area, good for a half-day route\n• Filter by one interest to see where it's concentrated — search there" },
},

  emoji: {
    suggestTitle: 'Suggest Icon',
    suggest: 'Suggest',
    describePlaceholder: 'Describe what the icon should represent...',
    searching: 'Searching',
    typeAndSearch: 'Type a description and click search',
    moreOptions: 'More options',
    done: 'Done',
  },
  speech: {
    startRecording: 'Record voice description',
    stopRecording: 'Stop recording',
    micPermissionDenied: 'Microphone permission denied',
  },
  import: {
    interests: 'Interests:',
    configs: 'Settings:',
    locations: 'Places:',
    routes: 'Routes:',
    filterImport: 'Filter',
  lastImport: 'Last import',
  showAll: 'Show all',
  importedAsDrafts: 'Places imported as drafts — review in Favorites > Drafts',
  },
  reviews: {
    title: 'Reviews',
    myReview: 'My Review',
    notYetRated: 'Not yet rated, waiting for you on the trail!',
    writeReview: 'Type/dictate review...' ,
    rating: 'Rating',
    saved: 'Review saved',
    saveError: 'Error saving review',
    deleted: 'Review deleted',
    noReviews: 'No reviews yet',
    avgRating: 'Average rating',
    save: 'Save',
    cancel: 'Cancel',
    deleteReview: 'Delete review',
    unsavedChanges: 'You have unsaved changes. Save?',
    allReviews: 'All Reviews',
    rate: 'Rate',
    loginRequired: 'Login required to rate',
    ratingRequired: 'Please select at least one star',
  },
  sysParams: {
    tabTitle: 'Parameters',
    title: 'System Parameters (Algorithm)',
    subtitle: 'These values affect search, route building, and prioritization.',
    sectionApp: 'App Settings',
    sectionDedup: 'Duplicate Detection',
    sectionAlgo: 'Route Algorithm',
    resetAll: 'Reset to defaults',
    resetDone: 'System parameters reset',
    maxStops: 'Places per route',
    maxStopsDesc: 'Max places shown in results list',
    fetchMore: '"Find more" count',
    fetchMoreDesc: 'How many additional places each "more" click fetches',
    maxWaypoints: 'Google Maps waypoints',
    maxWaypointsDesc: 'Max waypoints in Google Maps link (Google limit)',
    defaultRadius: 'Default radius (m)',
    defaultRadiusDesc: 'Default search radius for new users (meters)',
    dedupRadius: 'Dedup radius (m)',
    dedupRadiusDesc: 'Within how many meters to look for similar places when adding',
    dedupGoogle: 'Search Google',
    dedupGoogleDesc: 'Check if a similar place exists in Google Maps',
    dedupCustom: 'Search existing places',
    dedupCustomDesc: 'Check if a similar place already exists in the system',
    trailTimeout: 'Trail timeout (hours)',
    trailTimeoutDesc: 'Hours before an active trail auto-expires',
    defaultWeight: 'Default interest weight',
    defaultWeightDesc: 'Starting weight for new interests — determines stops allocated',
    maxPasses: 'Optimization passes',
    maxPassesDesc: 'How many times the algorithm tries to improve stop order',
    timeMatch: 'Time match score',
    timeMatchDesc: 'Score when stop time matches route time (day/night)',
    timeAnytime: '"Anytime" score',
    timeAnytimeDesc: 'Score for stops that fit any time',
    timeConflict: 'Time conflict score',
    timeConflictDesc: 'Score when stop time conflicts with route time',
    timePenalty: 'Time conflict penalty',
    timePenaltyDesc: 'Position penalty for time-mismatched stops in route ordering',
    earlyThreshold: '"Early" threshold',
    earlyThresholdDesc: '"Early" stops should be before this point (0=start, 1=end)',
    lateThreshold: '"Late" threshold',
    lateThresholdDesc: '"Late" stops should be after this point (0=start, 1=end)',
    endThreshold: '"End" threshold',
    endThresholdDesc: '"End" stops should be after this point (0=start, 1=end)',
    slotPenalty: 'Slot penalty multiplier',
    slotPenaltyDesc: 'Penalty multiplier when a stop is in the wrong position',
    endPenalty: 'End penalty multiplier',
    endPenaltyDesc: 'Penalty when "end" stops are not at end of route',
    gapPenalty: 'Gap penalty multiplier',
    gapPenaltyDesc: 'Penalty when same categories are adjacent',
    dedupRadius: 'Dedup radius (m)',
    dedupRadiusDesc: 'Max distance to detect duplicate places',
    dedupGoogle: 'Google dedup',
    dedupGoogleDesc: 'Search Google Places for nearby matches when adding (1=yes, 0=no)',
    dedupCustom: 'Custom dedup',
    dedupCustomDesc: 'Check existing places for nearby matches when adding (1=yes, 0=no)',
    maxStopsLabel: 'Places per route',
    maxStopsDesc: 'Maximum stops in a route',
    fetchMoreLabel: 'Find more — count',
    fetchMoreDesc: 'How many places to fetch per "more" click',
    maxWaypointsLabel: 'Google Maps waypoints',
    maxWaypointsDesc: 'Max waypoints in Google Maps link',
    defaultRadiusLabel: 'Default radius (m)',
    defaultRadiusDesc: 'Initial search radius for new users',
    toastDurationLabel: 'Toast duration (ms)',
    includeDrafts: 'Include drafts',
    includeDraftsDesc: 'Show draft places in routes, maps and lists',
    speechDuration: 'Recording (seconds)',
    speechDurationDesc: 'Max recording duration for voice input',
    toastDurationDesc: 'How long a message stays on screen (milliseconds)',
    favoriteBaseScore: 'Favorite base priority score',
    favoriteBaseScoreDesc: 'Base score added to any favorite with no rating — above a typical Google result (default: 20)',
    favoriteBonusPerStar: 'Bonus per star (rated favorite)',
    favoriteBonusPerStarDesc: 'Score added per star when rating is good — a 5⭐ favorite gets a large bonus (default: 5)',
    favoriteLowRatingThreshold: 'Poor rating threshold',
    favoriteLowRatingThresholdDesc: 'Average rating below this value is considered poor and receives a penalty (default: 2.5)',
    favoriteLowRatingPenalty: 'Poor rating penalty',
    favoriteLowRatingPenaltyDesc: 'Subtracted from favorite score when rating is poor — allows strong Google results to win (default: 60)',
    favoriteNeutralRating: 'Neutral FouFou rating',
    favoriteNeutralRatingDesc: 'Rating above this = bonus, below = minus, exactly = ±0 — rating 3 = no effect on order (default: 3.0)',
    favoriteMinRatingsForBonus: 'Min FouFou ratings for bonus',
    favoriteMinRatingsForBonusDesc: 'How many people must rate in FouFou before bonus activates — fewer = treated as unrated (default: 1)',
    favoriteGoogleScoreWeight: 'Google score weight (favorites)',
    favoriteGoogleScoreWeightDesc: 'Multiplier on Google score for favorites — 1.0=normal, 0=ignore Google entirely, 2.0=double (default: 1.0)',
    sectionFavorites: '⭐ Favorite Scoring',
    sectionGoogleFilter: '🔍 Google Filtering',
    googleMinRatingCount: 'Min ratings (always skip)',
    googleMinRatingCountDesc: 'Google places with fewer ratings than this are never shown',
    googleLowRatingCount: 'Ratings for low priority',
    googleLowRatingCountDesc: 'Google places below this get a near-zero score — included only if nothing better exists',
  },
  dedup: {
    title: 'Similar place found nearby!',
    subtitle: 'Choose an existing place from Google or add as new',
    useThis: 'Use this place',
    addAsNew: 'Ignore, add as new place',
    alreadyExists: 'This place already exists in your list',
    customExists: 'Already in your list',
    googleMatchMulti: 'Nearby places on Google',
    selectOrSkip: 'Select the place you photographed, or skip',
    noneOfThese: 'None of these — save as new place',
    scanButton: 'Check duplicates',
    scanning: 'Scanning...',
    noDuplicates: 'No duplicates found!',
    clustersFound: 'suspected clusters',
    distance: 'Distance',
    keep: 'Keep',
    remove: 'Remove',
    merged: 'merged',
    close: 'Close',
    keepThis: 'Keep this',
    removeThis: 'Remove this',
    locOf: 'of',
    googleMatch: 'Found Google place',
    duplicateSkipped: 'Duplicate found — not added',
    scanByInterest: 'Search by category & proximity',
    scanByCoords: 'Search by proximity only',
    scanCoordsButton: 'Proximity',
    confirmDelete: 'Delete this place?',
    inYourList: 'In your list',
    fromGoogle: 'From Google',
    noGoogleId: 'No Google link',
    updateWithGoogle: 'Update favorite with Google data',
    updatedWithGoogle: 'Updated with Google data',
    openExisting: 'Open existing favorite',
  },

// --- About ---
about: {
  title: 'About',
  edit: 'Edit',
  cancel: 'Cancel',
  save: 'Save',
  saveTranslate: 'Save + Translate to Hebrew',
  placeholder: 'Write about FouFou here...',
  noContent: 'Click edit to add content',
},

} // end English

}; // end strings

// [I18N] translations loaded

// City data: bangkok
window.BKK.cityData = window.BKK.cityData || {};
window.BKK.cityData.bangkok = {
  "id": "bangkok",
  "name": "בנגקוק",
  "nameEn": "Bangkok",
  "country": "Thailand",
  "icon": "🛺",
  "secondaryIcon": "🍜",
  "theme": {
    "color": "#e74c3c",
    "iconLeft": "🏯",
    "iconRight": "🐘"
  },
  "active": true,
  "distanceMultiplier": 1.2,
  "dayStartHour": 6,
  "nightStartHour": 17,
  "center": {
    "lat": 13.7563,
    "lng": 100.5018
  },
  "allCityRadius": 15000,
  "areas": [
    {
      "id": "sukhumvit",
      "label": "סוקומווית וטונגלור",
      "labelEn": "Sukhumvit & Thonglor",
      "desc": "חיי לילה, מסעדות, קניונים",
      "descEn": "Nightlife, restaurants, malls",
      "lat": 13.7317,
      "lng": 100.5713,
      "radius": 2800,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "old-town",
      "label": "העיר העתיקה",
      "labelEn": "Old Town",
      "desc": "מקדשים, ארמון המלך, היסטוריה",
      "descEn": "Temples, Grand Palace, history",
      "lat": 13.7634,
      "lng": 100.5016,
      "radius": 2400,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "chinatown",
      "label": "צ'יינה טאון וטאלד נוי",
      "labelEn": "Chinatown & Talad Noi",
      "desc": "אוכל רחוב, שווקים, מקדשים סיניים",
      "descEn": "Street food, markets, Chinese temples",
      "lat": 13.7381,
      "lng": 100.5167,
      "radius": 1400,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "riverside",
      "label": "ריברסייד ותונבורי",
      "labelEn": "Riverside & Thonburi",
      "desc": "נהר, מקדשים, שווקי לילה",
      "descEn": "River, temples, night markets",
      "lat": 13.7212,
      "lng": 100.4873,
      "radius": 2900,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "siam",
      "label": "סיאם ופראטונם",
      "labelEn": "Siam & Pratunam",
      "desc": "קניות, קניונים, מרכז העיר",
      "descEn": "Shopping, malls, city center",
      "lat": 13.7547,
      "lng": 100.5379,
      "radius": 2000,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "chatuchak",
      "label": "צ'אטוצ'אק וארי",
      "labelEn": "Chatuchak & Ari",
      "desc": "שוק ענק, פארקים, אמנות",
      "descEn": "Huge market, parks, art",
      "lat": 13.7927,
      "lng": 100.5338,
      "radius": 2800,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "silom",
      "label": "סילום וסאטורן",
      "labelEn": "Silom & Sathorn",
      "desc": "עסקים, מקדשים, חיי לילה",
      "descEn": "Business, temples, nightlife",
      "lat": 13.718,
      "lng": 100.5355,
      "radius": 2300,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "ratchada",
      "label": "ראצ'אדה",
      "labelEn": "Ratchada",
      "desc": "שווקי לילה, אוכל, בידור",
      "descEn": "Night markets, food, entertainment",
      "lat": 13.7761,
      "lng": 100.5726,
      "radius": 2600,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "onnut",
      "label": "און נאט",
      "labelEn": "On Nut",
      "desc": "מקומי, אוכל זול, שווקים",
      "descEn": "Local, cheap food, markets",
      "lat": 13.7014,
      "lng": 100.608,
      "radius": 2600,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "yan-nawa",
      "label": "יאן נאווה ובאנג קו לאם",
      "labelEn": "Yan Nawa & Bang Kho Laem",
      "desc": "נמל, שווקים מקומיים, אוכל",
      "descEn": "Port, local markets, food",
      "lat": 13.6817,
      "lng": 100.5177,
      "radius": 3400,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "bang-krachao",
      "label": "באנג קרצ'או",
      "labelEn": "Bang Krachao",
      "desc": "אי ירוק של טבע ופנאי",
      "descEn": "A green island of nature and leisure",
      "lat": 13.6874,
      "lng": 100.5658,
      "radius": 2400,
      "size": "medium",
      "safety": "safe"
    }
  ],
  "interestToGooglePlaces": {
    "temples": [
      "hindu_temple",
      "church",
      "mosque",
      "synagogue"
    ],
    "food": [
      "restaurant",
      "meal_takeaway"
    ],
    "graffiti": [
      "art_gallery"
    ],
    "artisans": [
      "store",
      "art_gallery"
    ],
    "galleries": [
      "art_gallery",
      "museum"
    ],
    "architecture": [
      "historical_landmark"
    ],
    "canals": [
      "boat_tour_agency",
      "marina"
    ],
    "cafes": [
      "cafe",
      "coffee_shop"
    ],
    "markets": [
      "market",
      "shopping_mall"
    ],
    "nightlife": [
      "bar",
      "night_club"
    ],
    "parks": [
      "park",
      "national_park"
    ],
    "rooftop": [
      "bar",
      "restaurant"
    ],
    "entertainment": [
      "movie_theater",
      "amusement_park",
      "performing_arts_theater"
    ]
  },
  "textSearchInterests": {
    "graffiti": "street art"
  },
  "interestTooltips": {
    "temples": "מקדשים בודהיסטיים והינדיים",
    "food": "מסעדות ואוכל רחוב",
    "graffiti": "אומנות רחוב וגרפיטי",
    "artisans": "בתי מלאכה ואומנים",
    "galleries": "גלריות ומוזיאונים",
    "architecture": "בניינים היסטוריים",
    "canals": "שייטים בתעלות ובנהר",
    "cafes": "בתי קפה",
    "markets": "שווקים ובזארים",
    "nightlife": "ברים ומועדוני לילה",
    "parks": "גנים ופארקים",
    "rooftop": "ברים ומסעדות על גגות",
    "entertainment": "קולנוע, תיאטרון, מופעים"
  },
  "systemRoutes": [
    {
      "id": "sys_bkk_chinatown_loop",
      "name": "צ'יינהטאון וטלאט נוי",
      "notes": "לולאת הליכה של 3-4 שעות דרך השכונות הסיניות ההיסטוריות",
      "circular": true,
      "cityId": "bangkok",
      "areaName": "Chinatown",
      "system": true,
      "locked": true,
      "savedAt": "2024-01-01T00:00:00.000Z",
      "preferences": {
        "hours": 4,
        "interests": [
          "temples",
          "cafes",
          "markets",
          "graffiti",
          "architecture"
        ]
      },
      "stops": [
        {
          "name": "Wat Mangkon Kamalawat",
          "lat": 13.7408,
          "lng": 100.5133,
          "interests": [
            "temples"
          ],
          "address": "Charoen Krung Rd, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=Wat+Mangkon+Kamalawat+Bangkok"
        },
        {
          "name": "Yaowarat Road",
          "lat": 13.7397,
          "lng": 100.5148,
          "interests": [
            "markets",
            "food"
          ],
          "address": "Yaowarat Rd, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=Yaowarat+Road+Bangkok"
        },
        {
          "name": "Song Wat Road",
          "lat": 13.7368,
          "lng": 100.5096,
          "interests": [
            "architecture",
            "cafes"
          ],
          "address": "Song Wat Rd, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=Song+Wat+Road+Bangkok"
        },
        {
          "name": "So Heng Tai Mansion",
          "lat": 13.7329,
          "lng": 100.5093,
          "interests": [
            "architecture"
          ],
          "address": "Talat Noi, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=So+Heng+Tai+Mansion+Bangkok"
        },
        {
          "name": "Mother Roaster",
          "lat": 13.7336,
          "lng": 100.5087,
          "interests": [
            "cafes",
            "graffiti"
          ],
          "address": "Talat Noi Soi 3, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=Mother+Roaster+Bangkok"
        },
        {
          "name": "Talat Noi Street Art",
          "lat": 13.7342,
          "lng": 100.5078,
          "interests": [
            "graffiti"
          ],
          "address": "Talat Noi, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=Talat+Noi+Street+Art+Bangkok"
        },
        {
          "name": "Chao Phraya River View",
          "lat": 13.7311,
          "lng": 100.5118,
          "interests": [
            "canals"
          ],
          "address": "Talat Noi Pier, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=13.7311,100.5118"
        }
      ]
    },
    {
      "id": "sys_bkk_four_communities",
      "name": "ארבע קהילות ליד הנהר",
      "notes": "מסלול ייחודי שחוצה קהילות סינית, מוסלמית ופורטוגזית — כולל מעבורת לצד השני של הנהר",
      "circular": false,
      "cityId": "bangkok",
      "areaName": "Riverside",
      "system": true,
      "locked": true,
      "savedAt": "2024-01-01T00:00:00.000Z",
      "preferences": {
        "hours": 5,
        "interests": [
          "temples",
          "markets",
          "architecture",
          "canals"
        ]
      },
      "stops": [
        {
          "name": "Yaowarat Road - הקהילה הסינית",
          "lat": 13.7397,
          "lng": 100.5148,
          "interests": [
            "markets",
            "temples"
          ],
          "address": "Yaowarat Rd, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=Yaowarat+Road+Bangkok"
        },
        {
          "name": "So Heng Tai Mansion - טלאט נוי",
          "lat": 13.7329,
          "lng": 100.5093,
          "interests": [
            "architecture"
          ],
          "address": "Talat Noi, Samphanthawong",
          "mapsUrl": "https://maps.google.com/?q=So+Heng+Tai+Mansion+Bangkok"
        },
        {
          "name": "Si Phraya Pier - הקהילה המוסלמית",
          "lat": 13.7267,
          "lng": 100.5142,
          "interests": [
            "markets",
            "canals"
          ],
          "address": "Si Phraya Rd, Bang Rak",
          "mapsUrl": "https://maps.google.com/?q=Si+Phraya+Pier+Bangkok"
        },
        {
          "name": "Santa Cruz Church - קהילה פורטוגזית",
          "lat": 13.7322,
          "lng": 100.4892,
          "interests": [
            "architecture",
            "temples"
          ],
          "address": "Soi Kudeejeen, Thonburi",
          "mapsUrl": "https://maps.google.com/?q=Santa+Cruz+Church+Bangkok"
        },
        {
          "name": "Wat Kalayanamit",
          "lat": 13.7295,
          "lng": 100.4888,
          "interests": [
            "temples"
          ],
          "address": "Soi Wat Kalayanamit, Thonburi",
          "mapsUrl": "https://maps.google.com/?q=Wat+Kalayanamit+Bangkok"
        }
      ]
    },
    {
      "id": "sys_bkk_nang_loeng",
      "name": "נאנג לואנג — בנגקוק של פעם",
      "notes": "שכונה שנשארה כמו לפני 100 שנה, עם שוק ותיק ובתי עץ ישנים. כ-2 שעות",
      "circular": true,
      "cityId": "bangkok",
      "areaName": "Old Bangkok",
      "system": true,
      "locked": true,
      "savedAt": "2024-01-01T00:00:00.000Z",
      "preferences": {
        "hours": 2,
        "interests": [
          "markets",
          "architecture",
          "temples",
          "food"
        ]
      },
      "stops": [
        {
          "name": "Wat Saket - הר הזהב",
          "lat": 13.7534,
          "lng": 100.5072,
          "interests": [
            "temples"
          ],
          "address": "Chakkraphatdi Phong Rd, Pom Prap",
          "mapsUrl": "https://maps.google.com/?q=Wat+Saket+Golden+Mount+Bangkok"
        },
        {
          "name": "Nang Loeng Market",
          "lat": 13.7608,
          "lng": 100.5117,
          "interests": [
            "markets",
            "food"
          ],
          "address": "Nakhon Sawan Rd, Pom Prap",
          "mapsUrl": "https://maps.google.com/?q=Nang+Loeng+Market+Bangkok"
        },
        {
          "name": "רחובות העץ הישנים - נאנג לואנג",
          "lat": 13.7615,
          "lng": 100.5105,
          "interests": [
            "architecture"
          ],
          "address": "Nang Loeng, Pom Prap",
          "mapsUrl": "https://maps.google.com/?q=13.7615,100.5105"
        },
        {
          "name": "Wat Sunthon Thammathan",
          "lat": 13.7572,
          "lng": 100.5095,
          "interests": [
            "temples"
          ],
          "address": "Nang Loeng, Pom Prap",
          "mapsUrl": "https://maps.google.com/?q=Wat+Sunthon+Thammathan+Bangkok"
        }
      ]
    },
    {
      "id": "sys_bkk_bang_krachao",
      "name": "בנג קראצ'או — הריאה הירוקה",
      "notes": "כפר טרופי בלב הנהר, 15 דקות ממרכז העיר. שכירת אופניים מומלצת. 3-4 שעות",
      "circular": true,
      "cityId": "bangkok",
      "areaName": "Bang Krachao",
      "system": true,
      "locked": true,
      "savedAt": "2024-01-01T00:00:00.000Z",
      "preferences": {
        "hours": 4,
        "interests": [
          "parks",
          "markets",
          "canals"
        ]
      },
      "stops": [
        {
          "name": "Bang Nam Phueng Floating Market",
          "lat": 13.6698,
          "lng": 100.59,
          "interests": [
            "markets",
            "food"
          ],
          "address": "Bang Nam Phueng, Phra Pradaeng",
          "mapsUrl": "https://maps.google.com/?q=Bang+Nam+Phueng+Floating+Market"
        },
        {
          "name": "Sri Nakhon Khuean Khan Park",
          "lat": 13.6715,
          "lng": 100.5948,
          "interests": [
            "parks"
          ],
          "address": "Bang Krachao, Phra Pradaeng",
          "mapsUrl": "https://maps.google.com/?q=Sri+Nakhon+Khuean+Khan+Park+Bangkok"
        },
        {
          "name": "שבילי התעלות - בנג קראצ'או",
          "lat": 13.6745,
          "lng": 100.588,
          "interests": [
            "canals",
            "parks"
          ],
          "address": "Bang Krachao, Phra Pradaeng",
          "mapsUrl": "https://maps.google.com/?q=13.6745,100.5880"
        }
      ]
    }
  ]
};

window.BKK.seedSystemRoutes = function(database) {
  if (!database) return;
  var cities = window.BKK.cityData || {};
  Object.keys(cities).forEach(function(cityId) {
    var sysRoutes = cities[cityId].systemRoutes;
    if (!sysRoutes || sysRoutes.length === 0) return;
    var flagKey = 'foufou_sys_routes_seeded_' + cityId;
    if (localStorage.getItem(flagKey) === 'true') return;
    database.ref('cities/' + cityId + '/routes')
      .orderByChild('system').equalTo(true)
      .once('value')
      .then(function(snap) {
        var existing = snap.val() || {};
        var existingIds = Object.values(existing).map(function(r) { return r.id; });
        var toSeed = sysRoutes.filter(function(r) { return !existingIds.includes(r.id); });
        if (toSeed.length === 0) {
          localStorage.setItem(flagKey, 'true');
          return;
        }
        var writes = toSeed.map(function(route) {
          return database.ref('cities/' + cityId + '/routes').push(route);
        });
        return Promise.all(writes).then(function() {
          console.log('[SEED] Seeded ' + toSeed.length + ' system routes for ' + cityId);
          localStorage.setItem(flagKey, 'true');
        });
      })
      .catch(function(e) {
        console.warn('[SEED] Error seeding system routes for ' + cityId, e);
      });
  });
};

// City data: Tel Aviv
window.BKK.cityData = window.BKK.cityData || {};
window.BKK.cityData.gushdan = {
  "id": "gushdan",
  "name": "תל אביב",
  "nameEn": "Tel Aviv",
  "country": "Israel",
  "icon": "🏖️",
  "theme": {
    "color": "#2980b9",
    "iconLeft": "",
    "iconRight": ""
  },
  "active": true,
  "distanceMultiplier": 1.2,
  "dayStartHour": 7,
  "nightStartHour": 18,
  "center": {
    "lat": 32.0418,
    "lng": 34.8761
  },
  "allCityRadius": 15000,
  "areas": [
    {
      "id": "tlv-north",
      "label": "צפון תל אביב",
      "labelEn": "North Tel Aviv",
      "desc": "הנמל, פארק הירקון, בזל",
      "descEn": "Port, Yarkon Park, Basel",
      "lat": 32.1111,
      "lng": 34.804,
      "radius": 3400,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "tlv-center",
      "label": "מרכז תל אביב",
      "labelEn": "Central Tel Aviv",
      "desc": "רוטשילד, דיזנגוף, הבימה",
      "descEn": "Rothschild, Dizengoff, Habima",
      "lat": 32.0803,
      "lng": 34.7779,
      "radius": 2000,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "tlv-south",
      "label": "דרום ת\"א ויפו",
      "labelEn": "South TLV & Jaffa",
      "desc": "שוק הפשפשים, נמל יפו, פלורנטין",
      "descEn": "Flea market, Jaffa port, Florentin",
      "lat": 32.0523,
      "lng": 34.7621,
      "radius": 2200,
      "size": "large",
      "safety": "caution"
    },
    {
      "id": "holon",
      "label": "חולון",
      "labelEn": "Holon",
      "desc": "מוזיאון הילדים, עיצוב, פארקים",
      "descEn": "Children museum, design, parks",
      "lat": 32.0148,
      "lng": 34.7872,
      "radius": 2500,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "bat-yam",
      "label": "בת ים",
      "labelEn": "Bat Yam",
      "desc": "חוף, טיילת, אוכל",
      "descEn": "Beach, boardwalk, food",
      "lat": 32.0162,
      "lng": 34.741,
      "radius": 2200,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "petah-tikva",
      "label": "פתח תקווה",
      "labelEn": "Petah Tikva",
      "desc": "מסעדות, פארקים, קניונים",
      "descEn": "Restaurants, parks, malls",
      "lat": 32.1047,
      "lng": 34.8843,
      "radius": 4100,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "herzliya",
      "label": "הרצליה",
      "labelEn": "Herzliya",
      "desc": "מרינה, חופים, הייטק",
      "descEn": "Marina, beaches, hi-tech",
      "lat": 32.1564,
      "lng": 34.8294,
      "radius": 3700,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "ramat-gan",
      "label": "רמת גן וגבעתיים",
      "labelEn": "Ramat Gan & Givatayim",
      "desc": "הבורסה, ספארי, פארקים",
      "lat": 32.0546,
      "lng": 34.815,
      "radius": 2800,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "bnei-brak",
      "label": "בני ברק",
      "labelEn": "Bnei Brak",
      "desc": "שווקים, אוכל, תרבות חרדית",
      "descEn": "Markets, food, ultra-orthodox culture",
      "lat": 32.0861,
      "lng": 34.8335,
      "radius": 1200,
      "size": "medium",
      "safety": "safe"
    }
  ],
  "systemRoutes": []
};

// City data: malaga
window.BKK.cityData = window.BKK.cityData || {};
window.BKK.cityData.malaga = {
  "id": "malaga",
  "name": "מלגה",
  "nameEn": "Malaga",
  "country": "Spain",
  "icon": "☀️",
  "secondaryIcon": "☀️",
  "active": false,
  "distanceMultiplier": 1.2,
  "dayStartHour": 8,
  "nightStartHour": 20,
  "center": {
    "lat": 36.7178196,
    "lng": -4.4255569999999995
  },
  "allCityRadius": 12185,
  "areas": [
    {
      "id": "centro",
      "label": "Centro",
      "labelEn": "Centro",
      "desc": "Centro, Malaga, Spain",
      "descEn": "Centro, Malaga, Spain",
      "lat": 36.7213,
      "lng": -4.423,
      "radius": 2500,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "este",
      "label": "Este",
      "labelEn": "Este",
      "desc": "",
      "descEn": "",
      "lat": 36.7845,
      "lng": -4.365,
      "radius": 7000,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "ciudad_jard_n",
      "label": "Ciudad Jardin",
      "labelEn": "Ciudad Jardin",
      "desc": "",
      "descEn": "",
      "lat": 36.7653,
      "lng": -4.4165,
      "radius": 3800,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "bail_n_miraflores",
      "label": "Bailen-Miraflores",
      "labelEn": "Bailen-Miraflores",
      "desc": "",
      "descEn": "",
      "lat": 36.7226,
      "lng": -4.4402,
      "radius": 1000,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "palma_palmilla",
      "label": "Palma-Palmilla",
      "labelEn": "Palma-Palmilla",
      "desc": "",
      "descEn": "",
      "lat": 36.7554,
      "lng": -4.4618,
      "radius": 2600,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "cruz_de_humilladero",
      "label": "Cruz de Humilladero",
      "labelEn": "Cruz de Humilladero",
      "desc": "",
      "descEn": "",
      "lat": 36.7144,
      "lng": -4.4584,
      "radius": 2000,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "carretera_de_c_diz",
      "label": "Carretera de Cadiz",
      "labelEn": "Carretera de Cadiz",
      "desc": "",
      "descEn": "",
      "lat": 36.6866,
      "lng": -4.4673,
      "radius": 2500,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "churriana",
      "label": "Churriana",
      "labelEn": "Churriana",
      "desc": "",
      "descEn": "",
      "lat": 36.6359,
      "lng": -4.5525,
      "radius": 6700,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "campanillas",
      "label": "Campanillas",
      "labelEn": "Campanillas",
      "desc": "",
      "descEn": "",
      "lat": 36.7207,
      "lng": -4.5003,
      "radius": 3600,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "puerto_de_la_torre",
      "label": "Puerto de la Torre",
      "labelEn": "Puerto de la Torre",
      "desc": "",
      "descEn": "",
      "lat": 36.7433,
      "lng": -4.5285,
      "radius": 4800,
      "size": "medium",
      "safety": "safe"
    }
  ],
  "interestToGooglePlaces": {
    "food": [
      "restaurant",
      "meal_takeaway"
    ],
    "cafes": [
      "cafe",
      "coffee_shop"
    ],
    "culture": [
      "performing_arts_theater",
      "cultural_center",
      "museum"
    ],
    "history": [
      "historical_landmark",
      "museum"
    ],
    "parks": [
      "park",
      "national_park"
    ],
    "shopping": [
      "shopping_mall",
      "store"
    ],
    "nightlife": [
      "bar",
      "night_club"
    ],
    "galleries": [
      "art_gallery",
      "museum"
    ],
    "markets": [
      "market"
    ],
    "graffiti": [
      "art_gallery"
    ],
    "beaches": [
      "beach"
    ],
    "architecture": [
      "historical_landmark"
    ]
  },
  "textSearchInterests": {
    "graffiti": "street art"
  },
  "interestTooltips": {},
  "theme": {
    "color": "#c60b1e",
    "iconLeft": "🏖️",
    "iconRight": "🌞"
  },
  "systemRoutes": []
};

// City data: Singapore
window.BKK.cityData = window.BKK.cityData || {};
window.BKK.cityData.singapore = {
  "id": "singapore",
  "name": "סינגפור",
  "nameEn": "Singapore",
  "country": "Singapore",
  "icon": "📍",
  "theme": {
    "color": "#c7665c",
    "iconLeft": "",
    "iconRight": ""
  },
  "active": true,
  "distanceMultiplier": 1.2,
  "dayStartHour": 7,
  "nightStartHour": 18,
  "center": {
    "lat": 1.2867,
    "lng": 103.8139
  },
  "allCityRadius": 21700,
  "areas": [
    {
      "id": "marina-bay",
      "label": "מרכז העיר",
      "labelEn": "City Center",
      "desc": "מגדלים, גנים, אטרקציות",
      "descEn": "Towers, gardens, attractions",
      "lat": 1.2922,
      "lng": 103.8126,
      "radius": 9100,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "chinatown-sg",
      "label": "מזרח סינגפור",
      "labelEn": "East ",
      "desc": "שדה תעופה ,מרכז משה ספדי",
      "descEn": "Airport,Moshe safdie",
      "lat": 1.367,
      "lng": 103.9547,
      "radius": 9200,
      "size": "small",
      "safety": "safe"
    },
    {
      "id": "little-india",
      "label": "צפון סינגפור",
      "labelEn": "North",
      "desc": "יערות",
      "descEn": "Forest",
      "lat": 1.4226,
      "lng": 103.8242,
      "radius": 6900,
      "size": "small",
      "safety": "safe"
    },
    {
      "id": "kampong-glam",
      "label": "מערב סינגפור",
      "labelEn": "West",
      "desc": "יערות, נמל",
      "descEn": "Forest,port",
      "lat": 1.3889,
      "lng": 103.7082,
      "radius": 7400,
      "size": "small",
      "safety": "safe"
    },
    {
      "id": "tiong-bahru",
      "label": "דרום מערב",
      "labelEn": "South West",
      "desc": "נמל",
      "descEn": "Port",
      "lat": 1.2633,
      "lng": 103.6608,
      "radius": 8300,
      "size": "small",
      "safety": "safe"
    }
  ],
  "systemRoutes": []
};

// City data: Tel Aviv
window.BKK.cityData = window.BKK.cityData || {};
window.BKK.cityData.gushdan = {
  "id": "gushdan",
  "name": "תל אביב",
  "nameEn": "Tel Aviv",
  "country": "Israel",
  "icon": "🏖️",
  "theme": {
    "color": "#2980b9",
    "iconLeft": "",
    "iconRight": ""
  },
  "active": true,
  "distanceMultiplier": 1.2,
  "dayStartHour": 7,
  "nightStartHour": 18,
  "center": {
    "lat": 32.0418,
    "lng": 34.8761
  },
  "allCityRadius": 15000,
  "areas": [
    {
      "id": "tlv-north",
      "label": "צפון תל אביב",
      "labelEn": "North Tel Aviv",
      "desc": "הנמל, פארק הירקון, בזל",
      "descEn": "Port, Yarkon Park, Basel",
      "lat": 32.1111,
      "lng": 34.804,
      "radius": 3400,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "tlv-center",
      "label": "מרכז תל אביב",
      "labelEn": "Central Tel Aviv",
      "desc": "רוטשילד, דיזנגוף, הבימה",
      "descEn": "Rothschild, Dizengoff, Habima",
      "lat": 32.0803,
      "lng": 34.7779,
      "radius": 2000,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "tlv-south",
      "label": "דרום ת\"א ויפו",
      "labelEn": "South TLV & Jaffa",
      "desc": "שוק הפשפשים, נמל יפו, פלורנטין",
      "descEn": "Flea market, Jaffa port, Florentin",
      "lat": 32.0523,
      "lng": 34.7621,
      "radius": 2200,
      "size": "large",
      "safety": "caution"
    },
    {
      "id": "holon",
      "label": "חולון",
      "labelEn": "Holon",
      "desc": "מוזיאון הילדים, עיצוב, פארקים",
      "descEn": "Children museum, design, parks",
      "lat": 32.0148,
      "lng": 34.7872,
      "radius": 2500,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "bat-yam",
      "label": "בת ים",
      "labelEn": "Bat Yam",
      "desc": "חוף, טיילת, אוכל",
      "descEn": "Beach, boardwalk, food",
      "lat": 32.0162,
      "lng": 34.741,
      "radius": 2200,
      "size": "medium",
      "safety": "safe"
    },
    {
      "id": "petah-tikva",
      "label": "פתח תקווה",
      "labelEn": "Petah Tikva",
      "desc": "מסעדות, פארקים, קניונים",
      "descEn": "Restaurants, parks, malls",
      "lat": 32.1047,
      "lng": 34.8843,
      "radius": 4100,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "herzliya",
      "label": "הרצליה",
      "labelEn": "Herzliya",
      "desc": "מרינה, חופים, הייטק",
      "descEn": "Marina, beaches, hi-tech",
      "lat": 32.1564,
      "lng": 34.8294,
      "radius": 3700,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "ramat-gan",
      "label": "רמת גן וגבעתיים",
      "labelEn": "Ramat Gan & Givatayim",
      "desc": "הבורסה, ספארי, פארקים",
      "lat": 32.0546,
      "lng": 34.815,
      "radius": 2800,
      "size": "large",
      "safety": "safe"
    },
    {
      "id": "bnei-brak",
      "label": "בני ברק",
      "labelEn": "Bnei Brak",
      "desc": "שווקים, אוכל, תרבות חרדית",
      "descEn": "Markets, food, ultra-orthodox culture",
      "lat": 32.0861,
      "lng": 34.8335,
      "radius": 1200,
      "size": "medium",
      "safety": "safe"
    }
  ],
  "systemRoutes": []
};

// ============================================================================
// ============================================================================

window.BKK = window.BKK || {};
window.BKK.stopColorPalette = ['#4a90d9', '#e8a838', '#d95555', '#3bba7e', '#d97eb5', '#7c7ce0', '#9b7ed9', '#2eb8c9', '#e08540', '#b36dd9', '#38b3a0', '#c93d5a', '#7fb832', '#2e9ed9', '#c25ee0', '#d95070'];

window.BKK.mapConfig = {
  route: {
    glowColor: '#818cf8', glowWeight: 6, glowOpacity: 0.15,
    baseColor: '#6366f1', baseWeight: 2.5, baseOpacity: 0.5,
    flowColor: 'white', flowWeight: 2, flowOpacity: 0.7,
    flowDash: '4,12', flowSpeed: '0.8s', flowOffset: -20,
    infoColor: '#4f46e5'
  },
  marker: {
    radius: 15, weight: 2.5, fillOpacity: 0.8, disabledFillOpacity: 0.2, disabledOpacity: 0.3,
    labelSize: 28, labelFontSize: '13px',
    startRingRadius: 20, startRingWeight: 3, startRingColor: '#22c55e', startRingDash: '6,4',
    startIconSize: 28, startIconFontSize: '14px'
  },
  area: {
    fillOpacity: 0.15, weight: 2,
    labelFontSize: '10px', labelBg: 'rgba(255,255,255,0.88)',
    ghostFillOpacity: 0.04, ghostWeight: 1, ghostColor: '#94a3b8',
    labelsPaneZ: 450, markersPaneZ: 650
  },
  radiusSearch: {
    color: '#e11d48', fillOpacity: 0.12, weight: 3, dash: '8,6',
    centerRadius: 8
  },
  gps: {
    color: '#3b82f6', radius: 7, weight: 2
  }
};

(function() {
  let vid = null;
  try { vid = localStorage.getItem('foufou_visitor_id'); } catch(e) {}
  if (!vid) {
    vid = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem('foufou_visitor_id', vid); } catch(e) {}
  }
  window.BKK.visitorId = vid;
  let vname = null;
  try { vname = localStorage.getItem('foufou_visitor_name'); } catch(e) {}
  window.BKK.visitorName = vname || vid.slice(0, 10);
})();

window.BKK.VERSION = '3.22.54';
window.BKK.stopLabel = function(i) {
  if (i < 26) return String.fromCharCode(65 + i);
  return String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26));
};

window.BKK.getTileUrl = function() {
  return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
};

window.BKK.APP_NAME = 'FouFou';

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

window.BKK.GOOGLE_PLACES_API_KEY = 'AIzaSyCE598tSisniM66ApqRvOyOq4svTf6pLHc';
window.BKK.GOOGLE_PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';
window.BKK.GOOGLE_PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// ============================================================================
// ============================================================================

window.BKK.cityRegistry = {
  bangkok: { id: 'bangkok', name: 'בנגקוק', nameEn: 'Bangkok', country: 'Thailand', icon: '🛺', secondaryIcon: '🍜', file: 'city-bangkok.js' },
  telaviv: { id: 'gushdan', name: 'תל אביב', nameEn: 'Tel Aviv', country: 'Israel', icon: '🏖️', file: 'city-telaviv.js' },
  singapore: { id: 'singapore', name: 'סינגפור', nameEn: 'Singapore', country: 'Singapore', icon: '🦁', secondaryIcon: '🌿', file: 'city-singapore.js' },
  malaga: { id: 'malaga', name: 'מלגה', nameEn: 'Malaga', country: 'Spain', icon: '☀️', secondaryIcon: '☀️', file: 'city-malaga.js' }
};

window.BKK.cities = {};
window.BKK.cityData = window.BKK.cityData || {};

// ============================================================================
// ============================================================================

/**
 * Load a city's data file dynamically, then register it.
 * Returns a Promise that resolves when the city is ready.
 */
window.BKK.loadCity = function(cityId) {
  return new Promise(function(resolve, reject) {
    var reg = window.BKK.cityRegistry[cityId];
    if (!reg) { reject('Unknown city: ' + cityId); return; }
    
    if (window.BKK.cityData[cityId]) {
      window.BKK.cities[cityId] = window.BKK.cityData[cityId];
      resolve(window.BKK.cities[cityId]);
      return;
    }
    
    var script = document.createElement('script');
    script.src = reg.file + '?v=' + window.BKK.VERSION;
    script.onload = function() {
      if (window.BKK.cityData[cityId]) {
        window.BKK.cities[cityId] = window.BKK.cityData[cityId];
        resolve(window.BKK.cities[cityId]);
      } else {
        reject('City data not found after loading: ' + cityId);
      }
    };
    script.onerror = function() { reject('Failed to load city file: ' + reg.file); };
    document.head.appendChild(script);
  });
};

/**
 * Unload a city to free memory (keeps registry entry).
 */
window.BKK.unloadCity = function(cityId) {
  delete window.BKK.cities[cityId];
  delete window.BKK.cityData[cityId];
  delete window.BKK.cityRegistry[cityId];
  try {
    var customCities = JSON.parse(localStorage.getItem('custom_cities') || '{}');
    delete customCities[cityId];
    localStorage.setItem('custom_cities', JSON.stringify(customCities));
  } catch(e) {}
};

/**
 * Export a city as a downloadable JS file (for GitHub upload).
 */
window.BKK.exportCityFile = function(city) {
  var cityId = city.id;
  var cleanCity = JSON.parse(JSON.stringify(city));
  if (cleanCity.icon && cleanCity.icon.startsWith('data:')) cleanCity.icon = '📍';
  if (cleanCity.theme) {
    if (cleanCity.theme.iconLeft && cleanCity.theme.iconLeft.startsWith('data:')) cleanCity.theme.iconLeft = '';
    if (cleanCity.theme.iconRight && cleanCity.theme.iconRight.startsWith('data:')) cleanCity.theme.iconRight = '';
  }
  var lines = [];
  lines.push('// City data: ' + city.nameEn);
  lines.push('window.BKK.cityData = window.BKK.cityData || {};');
  lines.push('window.BKK.cityData.' + cityId + ' = ' + JSON.stringify(cleanCity, null, 2) + ';');
  
  var content = lines.join('\n') + '\n';
  var blob = new Blob([content], { type: 'text/javascript' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'city-' + cityId + '.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export config registry snippet for a city (to add to config.js cityRegistry).
 */
window.BKK.getCityRegistryEntry = function(city) {
  return '  ' + city.id + ": { id: '" + city.id + "', name: '" + city.name + "', nameEn: '" + city.nameEn + "', country: '" + (city.country || '') + "', icon: '" + city.icon + "', file: 'city-" + city.id + ".js' }";
};

/**
 * One-time migration: move old flat customLocations to per-city structure.
 * Old: customLocations/{id} → New: cities/{cityId}/locations/{id}
 * Writes ONE item at a time to avoid Firebase "Write too large" error.
 */
window.BKK.migrateLocationsToPerCity = function(database) {
  if (!database) return Promise.resolve();
  var migrated = localStorage.getItem('locations_migrated_v2');
  if (migrated === 'true') return Promise.resolve();
  
  var locCount = 0;
  var routeCount = 0;
  var errors = 0;
  
  return database.ref('customLocations').once('value').then(function(snap) {
    var data = snap.val();
    if (!data) return Promise.resolve();
    var keys = Object.keys(data);
    locCount = keys.length;
    return keys.reduce(function(chain, key) {
      return chain.then(function() {
        var loc = data[key];
        if (loc.uploadedImage && typeof loc.uploadedImage === 'string' && loc.uploadedImage.startsWith('data:')) {
          delete loc.uploadedImage;
        }
        var cityId = loc.cityId || 'bangkok';
        return database.ref('cities/' + cityId + '/locations/' + key).set(loc).catch(function(e) {
          errors++;
        });
      });
    }, Promise.resolve());
  }).then(function() {
    return database.ref('savedRoutes').once('value');
  }).then(function(snap) {
    var data = snap.val();
    if (!data) return Promise.resolve();
    var keys = Object.keys(data);
    routeCount = keys.length;
    return keys.reduce(function(chain, key) {
      return chain.then(function() {
        var route = data[key];
        if (route.stops && Array.isArray(route.stops)) {
          route.stops = route.stops.map(function(s) {
            if (s.uploadedImage && typeof s.uploadedImage === 'string' && s.uploadedImage.startsWith('data:')) {
              var copy = Object.assign({}, s);
              delete copy.uploadedImage;
              return copy;
            }
            return s;
          });
        }
        var cityId = route.cityId || 'bangkok';
        return database.ref('cities/' + cityId + '/routes/' + key).set(route).catch(function(e) {
          errors++;
        });
      });
    }, Promise.resolve());
  }).then(function() {
    if (locCount === 0 && routeCount === 0) {
      localStorage.setItem('locations_migrated_v2', 'true');
      return;
    }
    if (errors > 0) {
      return;
    }
    var removals = [];
    if (locCount > 0) removals.push(database.ref('customLocations').remove());
    if (routeCount > 0) removals.push(database.ref('savedRoutes').remove());
    return Promise.all(removals).then(function() {
      localStorage.setItem('locations_migrated_v2', 'true');
    });
  }).catch(function(err) {
    console.error('[MIGRATION] Error:', err);
  });
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
      });
    }
  }).then(function() {
    localStorage.setItem('cleanup_inprogress_done', 'true');
  }).catch(function(err) {
    console.error('[CLEANUP] inProgress removal error:', err);
  });
};

/**
 * DISABLED — this function was incorrectly deleting valid interests.
 * It checked for types/textSearch on the interest object, but search config
 * is stored in settings/interestConfig/{id}, not on the interest itself.
 * Non-privateOnly interests were incorrectly flagged as orphans and deleted.
 */
window.BKK.cleanupOrphanedInterests = function(database) {
  return Promise.resolve();
};

/**
 * Admin utility: clean up stale _verify nodes and diagnose Firebase issues.
 */
window.BKK.cleanupFirebase = function(database) {
  if (!database) { console.log('[CLEANUP] No database'); return Promise.resolve(); }
  var cleaned = 0;
  return database.ref('_verify').once('value').then(function(snap) {
    var data = snap.val();
    if (!data) {
      return;
    }
    cleaned = Object.keys(data).length;
    return database.ref('_verify').remove();
  }).then(function() {
    if (cleaned > 0) console.log('[CLEANUP] Removed ' + cleaned + ' _verify nodes');
    return Promise.all([
      database.ref('accessLog').once('value').then(function(s) {
        var d = s.val();
        var count = d ? Object.keys(d).length : 0;
        var size = d ? JSON.stringify(d).length : 0;
        return { node: 'accessLog', count: count, sizeKB: Math.round(size/1024) };
      }),
      database.ref('feedback').once('value').then(function(s) {
        var d = s.val();
        var count = d ? Object.keys(d).length : 0;
        var size = d ? JSON.stringify(d).length : 0;
        return { node: 'feedback', count: count, sizeKB: Math.round(size/1024) };
      })
    ]);
  }).then(function(results) {
    return { verifyRemoved: cleaned, nodes: results };
  }).catch(function(err) {
    console.error('[CLEANUP] Error:', err);
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

  window.BKK.interestOptions = []; // interests now live in Firebase customInterests — loaded by React
  window.BKK.interestToGooglePlaces = city.interestToGooglePlaces || {};
  window.BKK.textSearchInterests = city.textSearchInterests || {};
  window.BKK.uncoveredInterests = []; // removed — noGoogleSearch flag on interests instead
  window.BKK.interestTooltips = city.interestTooltips || {};

  window.BKK.cityNameForSearch = city.nameEn;

  window.BKK.dayStartHour = city.dayStartHour != null ? city.dayStartHour : 6;
  window.BKK.nightStartHour = city.nightStartHour != null ? city.nightStartHour : 17;

  return true;
};

(function() {

  Object.keys(window.BKK.cityData).forEach(function(cityId) {
    window.BKK.cities[cityId] = window.BKK.cityData[cityId];
  });
  
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
  } catch(e) { console.error('[CONFIG] Error loading custom cities:', e); }
  
  try {
    var states = JSON.parse(localStorage.getItem('city_active_states') || '{}');
    Object.keys(states).forEach(function(cityId) {
      if (window.BKK.cities[cityId]) {
        window.BKK.cities[cityId].active = states[cityId];
      }
    });
  } catch(e) {}

  var savedCity = 'bangkok';
  try { savedCity = localStorage.getItem('city_explorer_city') || 'bangkok'; } catch(e) {}
  if (!window.BKK.cities[savedCity] || window.BKK.cities[savedCity].active === false) {
    var activeCities = Object.keys(window.BKK.cities).filter(function(id) { return window.BKK.cities[id].active !== false; });
    savedCity = activeCities[0] || Object.keys(window.BKK.cities)[0] || 'bangkok';
  }
  window.BKK.selectCity(savedCity);
})();

// ============================================================================
// ============================================================================

Object.defineProperty(window.BKK, 'helpContent', {
  get() {
    return window.BKK.i18n.strings?.[window.BKK.i18n.currentLang]?.help || window.BKK.i18n.strings?.he?.help || {};
  }
});

// ============================================================================
// ============================================================================

window.BKK = window.BKK || {};

// ============================================================================
// ============================================================================

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
      const check = window.BKK.isGpsWithinCity(pos.coords.latitude, pos.coords.longitude);
      if (check.withinCity) {
        if (onSuccess) onSuccess(pos);
      } else {
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
  if (window.BKK.INTEREST_COLORS[interestId]) return window.BKK.INTEREST_COLORS[interestId];
  const idx = allInterests.findIndex(i => i.id === interestId);
  return window.BKK.generateInterestColor(idx >= 0 ? idx : 0, allInterests.length);
};

// ============================================================================
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
  
  match = url.match(/[?&]q=([-\d.]+),([-\d.]+)/);
  if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
  
  if (!lat) {
    match = url.match(/@([-\d.]+),([-\d.]+)/);
    if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
  }
  
  if (!lat) {
    match = url.match(/[?&]ll=([-\d.]+),([-\d.]+)/);
    if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }
  }
  
  if (!lat && (url.includes('goo.gl') || url.includes('maps.app'))) {
    return { lat: null, lng: null, shortened: true };
  }
  
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
  const compressed = await window.BKK.compressImage(file);
  
  if (typeof firebase !== 'undefined' && firebase.storage) {
    try {
      const storageRef = firebase.storage().ref();
      const path = `cities/${cityId}/images/${locationId}_${Date.now()}.jpg`;
      const imageRef = storageRef.child(path);
      
      const response = await fetch(compressed);
      const blob = await response.blob();
      
      const snapshot = await imageRef.put(blob, { contentType: 'image/jpeg' });
      const downloadURL = await snapshot.ref.getDownloadURL();
      
      return downloadURL;
    } catch (err) {
      console.error('[STORAGE] Upload failed, falling back to base64:', err);
      return compressed;
    }
  }
  
  return compressed;
};

// ============================================================================
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
 * Build Google Maps directions URL from stops
 */
window.BKK.buildMapsUrl = (stops, circular = false) => {
  if (!stops || stops.length === 0) return '';
  
  const validStops = stops.filter(s => s.lat && s.lng && s.lat !== 0 && s.lng !== 0);
  if (validStops.length === 0) return '';
  
  const points = [''];  // Empty = "Your location"
  validStops.forEach(s => points.push(`${s.lat},${s.lng}`));
  if (circular && validStops.length > 1) {
    points.push(points[1]); // Return to first stop
  }
  
  const encoded = points.map(p => encodeURIComponent(p)).join('/');
  return `https://www.google.com/maps/dir/${encoded}/data=!4m2!4m1!3e2`;
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
  
  const isValidGooglePlaceId = (pid) => {
    if (!pid || typeof pid !== 'string' || pid.length < 15) return false;
    if (/^(ChIJ|EiI|GhIJ)/.test(pid)) return true;
    if (pid.length > 25 && /^[A-Za-z0-9_-]+$/.test(pid) && !pid.startsWith('-')) return true;
    return false;
  };
  
  const isBrokenUrl = (url) => {
    if (!url) return false;
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/') || url.includes('app.goo.gl')) return true;
    if (!url.includes('google.com/maps')) return true;
    if (url.includes('maps/place/?q=place_id:') || url.includes('maps/place/?q=place_id%3A')) return true;
    const m = url.match(/query_place_id=([^&]+)/);
    if (m && !isValidGooglePlaceId(decodeURIComponent(m[1]))) return true;
    return false;
  };

  const extractPlaceIdFromLegacyUrl = (url) => {
    const m = url && url.match(/[?&]q=place_id[:%3A]([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const _log = (step, url) => {
    if (_dbg) _dbg.push({ name: place.name, step, url: url || null,
      mapsUrl: place.mapsUrl || null, placeId: place.googlePlaceId || place.placeId || null,
      hasCoords, lat: place.lat, lng: place.lng, address: addressStr });
  };

  if (place.mapsUrl && !isBrokenUrl(place.mapsUrl) && !place.mapsUrl.match(/\?q=\d+\.\d+,\d+\.\d+$/)) {
    const url = place.mapsUrl;
    _log('stored_mapsUrl', url);
    return url;
  }
  if (place.mapsUrl) {
    const legacyPid = extractPlaceIdFromLegacyUrl(place.mapsUrl);
    if (legacyPid && isValidGooglePlaceId(legacyPid)) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || `${place.lat},${place.lng}`)}&query_place_id=${legacyPid}`;
      _log('legacy_placeId_rescued', url);
      return url;
    }
    _log('stored_mapsUrl_BROKEN', place.mapsUrl);
  }
  
  if (!hasCoords && !addressStr) { _log('no_data'); return '#'; }
  
  const pid = place.googlePlaceId || place.placeId;
  if (pid && isValidGooglePlaceId(pid)) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || addressStr || `${place.lat},${place.lng}`)}&query_place_id=${pid}`;
    _log('placeId', url);
    return url;
  }
  if (pid) { _log('placeId_INVALID', pid); }
  
  if (place.name?.trim() && hasCoords) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name.trim() + ' ' + place.lat + ',' + place.lng)}`;
    _log('name_coords', url);
    return url;
  }

  if (place.name?.trim() && addressStr) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name.trim() + ' ' + addressStr)}`;
    _log('name_address', url);
    return url;
  }

  if (addressStr) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressStr)}`;
    _log('address_only', url);
    return url;
  }
  
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
  if (place.lat && place.lng) {
    return `https://www.google.com/maps/place/${place.lat},${place.lng}/@${place.lat},${place.lng},17z`;
  }
  return null;
};

window.BKK.buildGoogleMapsUrls = (stops, origin, isCircular, maxPoints) => {
  maxPoints = maxPoints || 12;
  
  if (stops.length === 0) return [];
  
  const walkingData = 'data=!4m2!4m1!3e2';
  
  const buildPointsList = (stopsSlice, originCoord, circular) => {
    const points = [];
    points.push('');
    if (originCoord) points.push(originCoord);
    stopsSlice.forEach(s => points.push(`${s.lat},${s.lng}`));
    if (circular && originCoord) points.push(originCoord);
    return points;
  };
  
  const buildUrl = (points) => {
    return `https://www.google.com/maps/dir/${points.join('/')}/${walkingData}`;
  };
  
  const maxPathPoints = maxPoints;
  const allPoints = buildPointsList(stops, origin, isCircular);
  
  if (allPoints.length <= maxPathPoints) {
    return [{ url: buildUrl(allPoints), fromIndex: 0, toIndex: stops.length - 1, part: 1, total: 1 }];
  }
  
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
      points.push(''); // "Your location"
      if (currentOrigin) points.push(currentOrigin);
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
// ============================================================================

/**
 * Suggest 3 emojis for a given description.
 * Tries Gemini API first (online), falls back to local keyword mapping.
 * @param {string} description - What the emoji should represent
 * @returns {Promise<string[]>} - Array of 3 emoji suggestions
 */
window.BKK.suggestEmojis = async function(description) {
  if (!description || !description.trim()) return ['📍', '⭐', '🏷️', '🔖', '📌', '🗂️'];
  
  const prevKey = '_lastEmojiSuggestions';
  const prev = window[prevKey] || [];
  
  const all = window.BKK._suggestEmojisLocal(description, true);
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
    { keys: ['street food','אוכל רחוב','דוכן','stand','stall','hawker','vendor'], emojis: ['🍢','🍡','🥟','🍲','🍜','🥘'] },
    { keys: ['אוכל','food','restaurant','מסעד','dining','eat','snack'], emojis: ['🍜','🍲','🥘','🍛','🍔','🍕'] },
    { keys: ['קפה','coffee','cafe','קפית'], emojis: ['☕','🫖','🍵','☕'] },
    { keys: ['בר','bar','drink','שתי','cocktail','beer','בירה'], emojis: ['🍺','🍸','🥂','🍻'] },
    { keys: ['wine','יין'], emojis: ['🍷','🥂','🍇'] },
    { keys: ['ice cream','גלידה','dessert','קינוח'], emojis: ['🍦','🧁','🍰'] },
    { keys: ['bakery','מאפ','bread','לחם'], emojis: ['🥐','🍞','🧁'] },
    { keys: ['חוף','beach','sea','ים','ocean'], emojis: ['🏖️','🌊','🐚','☀️'] },
    { keys: ['פארק','park','garden','גן','טבע','nature'], emojis: ['🌳','🌿','🏞️','🌲'] },
    { keys: ['הר','mountain','hill','טיול','hike'], emojis: ['⛰️','🏔️','🥾'] },
    { keys: ['river','נהר','lake','אגם'], emojis: ['🏞️','💧','🚣'] },
    { keys: ['flower','פרח','botanical'], emojis: ['🌸','🌺','🌻'] },
    { keys: ['animal','חיות','zoo','גן חיות'], emojis: ['🦁','🐘','🦒'] },
    { keys: ['מוזיאון','museum','exhibit','תערוכה'], emojis: ['🏛️','🖼️','🎨'] },
    { keys: ['היסטורי','history','historic','עתיק','ancient'], emojis: ['🏛️','📜','⏳','🏰'] },
    { keys: ['תרבות','culture','cultural'], emojis: ['🎭','🏛️','🎪'] },
    { keys: ['temple','מקדש','church','כנסי','mosque','מסגד','synagogue','בית כנסת','religion','דת','shrine','מקום קדוש'], emojis: ['⛩️','🕌','⛪','🕍','🛕','🙏'] },
    { keys: ['buddha','בודה','buddhist','buddhism','wat','pagoda','monk','נזיר'], emojis: ['🛕','🙏','☸️','🪷','📿','🧘'] },
    { keys: ['ארכיטקטורה','architecture','building','בניין'], emojis: ['🏗️','🏢','🏰'] },
    { keys: ['אומנות','art','גלריה','gallery','street art','גרפיטי','graffiti'], emojis: ['🎨','🖼️','🖌️'] },
    { keys: ['מוזיקה','music','concert','הופעה'], emojis: ['🎵','🎶','🎸','🎤'] },
    { keys: ['תאטרון','theater','theatre','הצגה','show','performance'], emojis: ['🎭','🎪','🎬'] },
    { keys: ['cinema','סרט','movie','film'], emojis: ['🎬','🎞️','🍿'] },
    { keys: ['nightlife','לילה','club','מועדון'], emojis: ['🌃','🪩','💃','🎉'] },
    { keys: ['קניות','shopping','mall','קניון'], emojis: ['🛍️','🏬','💳'] },
    { keys: ['שוק','market','bazaar','שוק פשפשים'], emojis: ['🏪','🧺','🏬'] },
    { keys: ['שירות','שרות','service','ציבורי','public','municipal','עירי','ממשל','government','עירייה','רשות'], emojis: ['🏛️','🏥','📋','🏢','🔧','⚖️'] },
    { keys: ['בית חולים','hospital','health','בריאות','medical','רפואי'], emojis: ['🏥','⚕️','💊'] },
    { keys: ['police','משטרה','emergency','חירום'], emojis: ['🚔','🚨','👮'] },
    { keys: ['school','בית ספר','education','חינוך','university','אוניברסיטה'], emojis: ['🏫','📚','🎓'] },
    { keys: ['transport','תחבורה','bus','אוטובוס','train','רכבת','metro'], emojis: ['🚌','🚆','🚇','🚊'] },
    { keys: ['parking','חני','חנייה'], emojis: ['🅿️','🚗','🏎️'] },
    { keys: ['toilet','שירותים','שרותים','שרותיים','wc','restroom','bathroom','נוחיות'], emojis: ['🚻','🚽','🧻','🚾'] },
    { keys: ['sport','ספורט','gym','חדר כושר','fitness'], emojis: ['⚽','🏋️','🤸'] },
    { keys: ['yoga','יוגה','meditation','מדיטציה','wellness','spa'], emojis: ['🧘','💆','🧖'] },
    { keys: ['swim','שחי','pool','בריכה'], emojis: ['🏊','🤽','💦'] },
    { keys: ['bike','אופני','cycling','רכיבה'], emojis: ['🚲','🚴','🛴'] },
    { keys: ['hotel','מלון','hostel','אכסני','accommodation','לינה'], emojis: ['🏨','🛏️','🏩'] },
    { keys: ['airport','שדה תעופה','flight','טיסה'], emojis: ['✈️','🛫','🛬'] },
    { keys: ['viewpoint','תצפית','panorama','view','נוף'], emojis: ['🔭','👀','🏔️','📸'] },
    { keys: ['photo','צילום','camera','instagram'], emojis: ['📸','📷','🤳'] },
    { keys: ['spain','ספרד','spanish'], emojis: ['🇪🇸','☀️','💃','🥘'] },
    { keys: ['thailand','תאילנד','thai'], emojis: ['🇹🇭','🛺','🍜','🐘'] },
    { keys: ['israel','ישראל'], emojis: ['🇮🇱','✡️','🕍'] },
    { keys: ['japan','יפן','japanese'], emojis: ['🇯🇵','⛩️','🍣','🗾'] },
    { keys: ['italy','איטלי','italian'], emojis: ['🇮🇹','🍕','🍝'] },
    { keys: ['france','צרפת','french'], emojis: ['🇫🇷','🥐','🗼'] },
    { keys: ['usa','america','אמריקה'], emojis: ['🇺🇸','🗽','🦅'] },
    { keys: ['uk','england','אנגלי','british','london','לונדון'], emojis: ['🇬🇧','👑','🎡'] },
    { keys: ['singapore','סינגפור'], emojis: ['🇸🇬','🦁','🌿'] },
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
  
  const scored = mapping.map(entry => {
    let score = 0;
    entry.keys.forEach(key => {
      if (desc.includes(key)) {
        score += key.length * 2;
      } else if (key.length >= 3) {
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
        
        if (view.getUint16(0) !== 0xFFD8) {
          return resolve(null);
        }
        
        let offset = 2;
        let found = false;
        while (offset < view.byteLength - 4) {
          const marker = view.getUint16(offset);
          
          if ((marker & 0xFF00) !== 0xFF00) {
            break;
          }
          
          const segLen = view.getUint16(offset + 2);
          
          if (marker === 0xFFE1) { // APP1 (EXIF)
            found = true;
            const result = parseExifGps(view, offset + 4, buf.byteLength);
            return resolve(result);
          }
          
          if (marker === 0xFFDA) break;
          
          offset += 2 + segLen;
        }
        
        if (!found) console.log('[EXIF] No APP1/EXIF marker found');
        resolve(null);
      } catch (err) {
        resolve(null);
      }
    };
    reader.onerror = () => { console.warn('[EXIF] FileReader error'); resolve(null); };
    reader.readAsArrayBuffer(file.slice(0, 512 * 1024)); // Read first 512KB
  });
};

function parseExifGps(view, segStart, totalLen) {
  const e0 = view.getUint8(segStart), e1 = view.getUint8(segStart+1), e2 = view.getUint8(segStart+2), e3 = view.getUint8(segStart+3);
  const hdr = String.fromCharCode(e0, e1, e2, e3);
  if (hdr !== 'Exif') {
    return null;
  }
  
  const tiffStart = segStart + 6;
  if (tiffStart + 8 > totalLen) return null;
  
  const byteOrder = view.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949; // 'II' = Intel = little endian
  
  const get16 = (o) => o + 2 <= totalLen ? view.getUint16(o, littleEndian) : 0;
  const get32 = (o) => o + 4 <= totalLen ? view.getUint32(o, littleEndian) : 0;
  
  if (get16(tiffStart + 2) !== 0x002A) {
    return null;
  }
  
  const ifd0Offset = tiffStart + get32(tiffStart + 4);
  if (ifd0Offset + 2 > totalLen) return null;
  
  const entryCount = get16(ifd0Offset);
  
  let gpsIfdPointer = null;
  
  for (let i = 0; i < entryCount && i < 100; i++) {
    const entryOff = ifd0Offset + 2 + i * 12;
    if (entryOff + 12 > totalLen) break;
    const tag = get16(entryOff);
    
    if (tag === 0x8825) { // GPSInfo IFD pointer
      gpsIfdPointer = get32(entryOff + 8);
      break;
    }
  }
  
  if (gpsIfdPointer === null) {
    return null;
  }
  
  const gpsIfdOffset = tiffStart + gpsIfdPointer;
  if (gpsIfdOffset + 2 > totalLen) return null;
  
  const gpsEntries = get16(gpsIfdOffset);
  
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
    
    const dataOffset = (type === 5 || type === 10) 
      ? tiffStart + get32(entryOff + 8) 
      : entryOff + 8;
    
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
  
  if (gps.lat != null && gps.lng != null) {
    if (gps.latRef === 'S') gps.lat = -gps.lat;
    if (gps.lngRef === 'W') gps.lng = -gps.lng;
    if (Math.abs(gps.lat) <= 90 && Math.abs(gps.lng) <= 180 && (gps.lat !== 0 || gps.lng !== 0)) {
      const result = { lat: Math.round(gps.lat * 1000000) / 1000000, lng: Math.round(gps.lng * 1000000) / 1000000 };
      return result;
    }
  } else {
  }
  return null;
}

// ============================================================================
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

window.BKK.compressIcon = (input, maxSize = 64, maxKB = 15) => {
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
    return false;
  }
};

// ============================================================================
// ============================================================================
window.BKK.generateLocationName = (interestId, lat, lng, counters, allInterests, areaOptions) => {
  const interest = allInterests.find(i => i.id === interestId);
  const interestName = interest?.labelEn || interest?.label || interestId;
  
  let areaName = '';
  if (lat && lng) {
    const detectedAreas = window.BKK.getAreasForCoordinates(lat, lng);
    if (detectedAreas.length > 0) {
      const area = areaOptions.find(a => a.id === detectedAreas[0]);
      if (area) {
        let aName = area.labelEn || area.label || '';
        if (aName.length > 18) {
          const parts = aName.split(/\s*[&]\s*|\s+and\s+/i);
          aName = parts[0].trim();
        }
        if (aName.length > 18) {
          aName = aName.split(/\s+/).slice(0, 2).join(' ');
        }
        areaName = aName;
      }
    }
  }
  
  const currentCount = counters[interestId] || 0;
  const nextNum = currentCount + 1;
  
  const name = areaName 
    ? `${interestName} ${areaName} #${nextNum}`
    : `${interestName} #${nextNum}`;
  
  return { name, nextNum, interestId };
};

// ============================================================================
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
      onResult(newFinal, true);
    } else if (interim) {
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
  
  timeoutId = setTimeout(function() {
    try { recognition.stop(); } catch(e) {}
  }, maxDuration);
  
  return function() {
    clearTimeout(timeoutId);
    try { recognition.stop(); } catch(e) {}
  };
};

