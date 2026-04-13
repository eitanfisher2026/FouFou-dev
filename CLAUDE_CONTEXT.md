# FouFou — City Trail Generator · Claude Context

## Live
https://eitanfisher2026.github.io/FouFou/

## Stack
React (pre-compiled JSX via Babel), Firebase Realtime DB + Analytics, Google Places API, PWA

## Version
**v3.22.17**

---

## Source Files
| File | Role |
|------|------|
| `_app-code-template.js` | Main component shell, insert points |
| `app-logic.js` | All state, hooks, Firebase, business logic |
| `views.js` | Wizard + trail views JSX |
| `dialogs.js` | All dialogs/modals JSX |
| `quick-add-component.js` | QuickAdd + standalone components (FeedbackItemImages, FloatingAudioPlayer) |
| `config.js` | VERSION, systemParams defaults — **SOURCE ONLY, not loaded directly** |
| `utils.js` | compressImage, uploadImage, i18n helpers — **SOURCE ONLY** |
| `i18n.js` | All Hebrew + English strings — **SOURCE ONLY** |
| `city-*.js` | Per-city data |

## Built Files (deployed, not source)
| File | Contents |
|------|----------|
| `app-data.js` | **Built** — contains config.js + utils.js + i18n.js + city files inlined. This is what the browser loads. `window.BKK.VERSION` lives here. |
| `app-code.js` | **Built** — compiled/minified JSX (app-logic + views + dialogs + quick-add) |
| `index.html` | **Built** — assembled from `_source-template.html` with CSS inlined |

## Build
```bash
python3 build.py          # assembles index.html + inlines CSS
node compile.js app-code.js  # JSX → minified JS
```

## Critical Rules
- `mangle: false` in compile.js — never change
- Single quotes in JSX = Babel error → always double quotes
- All Firebase writes → `app-logic.js` only
- Balance check: `() +0  {} -3  [] -2`
- Standalone components (with hooks) → `quick-add-component.js` (before FouFouApp)
- **Never use `React.useState`/`React.useRef` inside `.map()`, IIFEs, or callbacks**

---

## ⚠️ VERSION BUMP — MANDATORY CHECKLIST (every release)
**Missing even one file causes an infinite update loop in production.**
`app-data.js` is the built file the browser actually executes — it defines `window.BKK.VERSION`.
`config.js` is source only and does NOT affect the running app.

| # | File | What to change |
|---|------|----------------|
| 1 | `app-data.js` | Line 1 comment + `window.BKK.VERSION = 'X.X.X'` |
| 2 | `version.json` | `{"version": "X.X.X"}` |
| 3 | `sw.js` | Comment line 1 + `CACHE_NAME` + all URLs in `OFFLINE_ASSETS` |
| 4 | `index.html` | All `?v=X.X.X` query strings (preload + script + fetch + sw register) |
| 5 | `config.js` | `window.BKK.VERSION` (source reference, for consistency) |
| 6 | `.last_built_version` | Version string |

### Version numbering
- **Patch** (bug fix, no new feature): `3.22.x` → 📦 GitHub only
- **Minor** (new feature or Play Store release): `3.x.0` → may need 🏪 Play Store + twa-manifest

### Packaging rule
Every response that produces a modified zip must state:
- 📦 **GitHub only — no Play Store needed**, OR
- 🏪 **GitHub + Play Store** → include separate `twa-manifest` file

---

## Architecture — Wizard Flow
- **Step 1** — Select interests (grouped by category, sticky bottom buttons)
- **Step 2** — Select area / radius (sticky bottom buttons)
- **Step 3** — Results / trail

### Sticky Bottom Buttons (v3.17.77+)
Both steps use `position: sticky; bottom: 0` — no fixed px calculations:
- ⭐ 🗺️ מפת מועדפים — always visible
- 🔍 מצא מקומות / המשך — appears when condition met

### Interest Groups (v3.17.78+)
- One `<div>` per group with header **outside** the grid (avoids iOS Safari `gridColumn: 1/-1` bug)
- Header style: right border accent + subtle background
- `border-radius: 999px` on pill buttons for consistent cross-device rendering

---

## Step 2 — Area / Radius UX (v3.22.8–v3.22.17)

### Top toggle
- Side-by-side pill toggle: **בחר אזור** | **קרוב למיקום**
- Active tab gets `flex: 2` (2/3 width), inactive gets `flex: 1` (1/3 width)
- Switching to "בחר אזור" closes the point-search dropdown (`setPointSearchResults(null)`)
- Switching modes does NOT trigger GPS — GPS fires lazily on "מצא מקומות"

### Area mode
- 2-column grid of area buttons, white background, green border when selected
- No toggles — just the grid

### Radius mode (visible when "קרוב למיקום" selected)
- No outer card background — transparent, matches area screen
- Two sub-buttons side by side: **חפש מקום** (left) | **קרוב אליי** (right)
  - Both white background, green border when active (`#22c55e`), same style as area grid
  - Sub-buttons wrapped in `div` with `minHeight: 116px` so the radius stepper never jumps position
- **GPS sub-mode**: empty (no spinner) — GPS acquired lazily at search time
- **Point search sub-mode** (matches "הוסף ידנית" dialog exactly):
  - Small label: "שם מקום"
  - `input` with purple border (`#c4b5fd`), `fontSize: 16px`
  - 🎤 mic button (shown only if `window.BKK.speechSupported`)
    - Language: `en-US` (same as add-manually dialog)
    - Interim preview row on yellow background while recording
    - Speech callback calls `setPointSearchQuery(newVal)` — enables search button without physical input touch
  - "🔍 חפש בגוגל" button below — gray (`#e5e7eb`) until `pointSearchQuery` has value, purple when active
  - Dropdown results below button (purple border, up to 5 results from `searchPointForRadius`)
  - Selecting a result sets `formData.currentLat/lng/radiusPlaceName`

### Radius stepper
- Always visible below the sub-mode content area
- `+` / `−` round buttons + range slider
- 12 steps: 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500 metres
- Uses `accentColor: '#0369a1'` on the range input

### canSearch logic
- Area mode: requires `formData.area`
- Radius / GPS: **always enabled** — coords not required upfront (lazy GPS)
- Radius / point: requires `formData.currentLat`

### "מצא מקומות" click — radius mode
- If GPS mode + no coords: calls `getValidatedGps` first, then generates route. Only shows error toast on failure, no success toast.
- Builds a `radiusStop` object (`isRadiusCenter: true`, `interests: ['_manual']`) and passes it directly to `generateRoute(radiusStop)` — avoids async state timing issues.
- The radius center stop is **prepended** to the route stops array → gets letter **A**
- `setStartPointCoords` set to the radius center → route optimization starts from it
- `newRoute.optimized = true` set immediately so letter circles render without waiting for map optimization

---

## Radius Center Stop (v3.22.16+)

### Object shape
```js
{
  name: radiusPlaceName,
  lat, lng,
  address: radiusPlaceName,
  duration: 0,
  interests: ['_manual'],
  manuallyAdded: true,
  isRadiusCenter: true,   // ← key flag
  googlePlace: false,
  rating: 0, ratingCount: 0
}
```

### Visual style in route list
- Letter circle: **white background**, **green border** (`#22c55e`), green text (`#15803d`)
- Appears under "הוספו ידנית" group header
- Always gets letter **A** (prepended to stops array + `optimized: true`)
- Re-searched on next "מצא מקומות" — old `isRadiusCenter` stop is replaced

### generateRoute signature
```js
const generateRoute = async (extraManualStop = null) => { ... }
```
- `extraManualStop` bypasses async state — passed directly, not via `setManualStops`
- When `extraManualStop.isRadiusCenter`: prepended to stops, `optimized: true`, `startPointCoords` set

---

## New State (app-logic.js, v3.22.10+)
- `pointSearchResults` — `null` = hidden, `[]` = loading, `[{name,lat,lng,...}]` = results. Used for step-2 point search dropdown. Separate from `locationSearchResults` (add-manually dialog).
- `pointSearchQuery` — tracks the point search input value (string). Enables "חפש בגוגל" button. Updated both by `onChange` and by speech callback.

### searchPointForRadius()
- Calls Google Places Text Search, max 5 results
- Sets `pointSearchResults`
- City-aware query (appends city name if not present)
- Defined in `app-logic.js` alongside `searchPlacesByName`

---

## Legend (מקרא) in מפה ותכנון (v3.22.8+)
- The bottom panel of the stops map (`mapMode === 'stops'`) now shows a legend row above the route-type toggle
- Each interest shown as a pill: colored dot + icon + label
- Derived from `[...new Set(mapStops.flatMap(s => s.interests))]`
- Same pill style as active trail legend

---

## Dedup Logic (`saveWithDedupCheck`)
1. Interests check
2. Name dedup (exact match in local DB)
3. GooglePlaceId dedup (same place, different name) → popup
4. If `loc.googlePlaceId` + not in DB → save directly
5. No `googlePlaceId` → proximity search (Google API, all dialog types)

## Add Google Place Flow (`addGooglePlaceToCustom`)
- `forceAdd=false` → dedup check → opens `QuickAddPlaceDialog`
- `forceAdd=true` (from dedup confirm "add anyway") → **saves directly** via `saveQuickAddPlace` — NO dialog reopen (bug fix v3.18.21)
- `saveQuickAddPlace` does NOT do optimistic `setCustomLocations` — Firebase listener handles update (bug fix v3.18.22)

## QuickAddPlaceDialog (quick-add-component.js)
- `captureMode=false` — adding Google place to favorites (interests shown as 6-col grid, same as captureMode)
- `captureMode=true` — "Capture Now" FAB, GPS + photo flow
- Both modes use same 6-column grid for interests (unified in v3.18.20)

---

## Auth Rules
- `requireSignIn()` — blocks `!authUser || authUser.isAnonymous` — shows friendly toast + login dialog
- All write entry points check auth: FAB capture, trail capture button, add manually, addCustomLocation, updateCustomLocation, patchLocationField
- **Anonymous users CAN submit feedback** (Firebase Rules updated: `!data.exists()` allowed without auth)
- Toast message: uses `t('auth.signInRequired')` (friendly, explains why)

## Firebase Rules (feedback)
```json
"feedback": {
  "$feedbackId": {
    ".write": "!data.exists() || (auth != null && (data.child('userId').val() === auth.uid || ...))",
    ".validate": "newData.hasChildren(['text', 'timestamp'])"
  }
}
```
Note: userId is omitted from feedbackEntry when user is not authenticated.

---

## Feedback System (v3.18+)
**Dialog** — simple form: category + subject + name + email + textarea + images (up to `sp.feedbackMaxImages`, default 3)
- Draft saved to `localStorage` until sent
- Sender name/email auto-filled from `authUser` on dialog open
- Anonymous users can submit (no auth required)

**Admin Feedback List** — shows subject, senderName, senderEmail with `mailto:` link, FeedbackItemImages for prev/next

---

## Standalone Components (quick-add-component.js)
Must be defined here (outside FouFouApp) when they use hooks:
- `FeedbackItemImages` — prev/next image viewer for feedback admin
- `FloatingAudioPlayer` — draggable floating audio player (shown when hint plays, popup closed)

---

## Role Simulation (Admin only)
3 roles: Admin (null) / Editor (1) / Regular (0)
- Return to Admin via hamburger menu (no floating badge)
- For anonymous testing: sign out manually

## Edit Dialog Navigation
- Uses `cityNavList` filtered by `selectedCityId` (not global `editNavList`)
- Finds by `id` not `name` (names can duplicate)
- Counter shows `idx+1 / cityNavList.length`

## View-Only Mode (Edit Dialog)
- "Open in Google" — always visible
- "Search in Google" — hidden in read-only
- "Delete" — hidden in read-only

---

## Audio Hint System
- `closeHintPopup()` — does NOT stop audio (user can navigate away)
- `FloatingAudioPlayer` shown when `isSpeaking && !openHintPopup`
- `stopHintPlayback()` — stops audio + clears `playingHintLabel`

---

## Key State (app-logic.js)
- `wizardStep` 1/2/3
- `formData` — interests[], searchMode, area, radius, etc.
- `customLocations[]` — user's favorites (city-filtered via `cityCustomLocations` useMemo)
- `flatNavList` — built from `groupedPlaces` (already city-filtered)
- `showFeedbackDialog`, `feedbackText`, `feedbackCategory`, `feedbackSubject`, `feedbackSenderName`, `feedbackSenderEmail`, `feedbackImages[]`
- `interestGroups` — group definitions from Firebase
- `dedupConfirm` — dedup popup state
- `roleOverride` — null/0/1 (admin simulation)
- `isSpeaking`, `isPaused`, `playingHintLabel` — audio state
- `pointSearchResults` — step-2 point search dropdown state
- `pointSearchQuery` — step-2 point search input value (for button enable/disable)

## i18n Keys
- `dedup.googleMatchMulti`, `dedup.selectOrSkip`, `dedup.noneOfThese`
- `settings.feedbackSubject`, `settings.feedbackSenderName`, `settings.feedbackSenderEmail`
- `auth.signInRequired` — used for all auth-blocked toasts
- `general.nearLocation` — top toggle label (NOT `wizard.nearLocation`)
- `general.nearMeGps`, `general.nearMe`, `general.nearMePoint` — radius sub-mode labels

---

## Google Play Store Status (v3.21.0)
- **Package:** `com.foufou.citytrails`
- **Play Console:** Internal Testing track — active ✅
- **Store listing:** EN + HE — complete ✅
- **AAB signed with:** `C:\foufou\foufou-key` (alias: foufou-key)
- **Cities live:** Bangkok, Singapore
- **Pending before Production:** promote from Internal Testing → Production track

## Auth — Delete Account (v3.21.0)
- `authDeleteAccount()` in `app-logic.js` — calls `authUser.delete()`
- Shows `window.confirm` before deleting
- Handles `auth/requires-recent-login` error → signs out + toast
- Button shown in login dialog below "התנתק", hidden for anonymous users
- i18n keys: `auth.deleteAccount`, `auth.deleteAccountConfirm`, `auth.accountDeleted`, `auth.deleteAccountError`, `auth.recentLoginRequired`

---

## Color Architecture (v3.22.4+)

### Color priority (in getInterestColor)
1. Firebase `interest.color` override (admin-set) — highest priority
2. `idToHue(id)` hash (djb2 → hue) — stable fallback, same in all languages

### isRadiusCenter stop color
- Letter circle: white background + green border (`#22c55e`) + green text
- No interest color — it's a neutral start marker

### Legend (מקרא)
- Active trail stops card: pill badges (dot + icon + label), `gap: 8px`
- מפה ותכנון bottom panel: same pill style above the route-type toggle

---

## Pending / Known Issues
- `hint_text_opened` analytics event not yet implemented
- Promote to Production track when ready
