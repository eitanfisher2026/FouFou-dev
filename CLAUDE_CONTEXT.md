# FouFou — City Trail Generator · Claude Context

## Live
https://eitanfisher2026.github.io/FouFou/

## Stack
React (pre-compiled JSX via Babel), Firebase Realtime DB + Analytics, Google Places API, PWA

## Version
**v3.22.4**

---

## Source Files
| File | Role |
|------|------|
| `_app-code-template.js` | Main component shell, insert points |
| `app-logic.js` | All state, hooks, Firebase, business logic |
| `views.js` | Wizard + trail views JSX |
| `dialogs.js` | All dialogs/modals JSX |
| `quick-add-component.js` | QuickAdd + standalone components (FeedbackItemImages, FloatingAudioPlayer, FeedbackItemImages) |
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

## i18n Keys (added in 3.17-3.18)
- `dedup.googleMatchMulti`, `dedup.selectOrSkip`, `dedup.noneOfThese`
- `settings.feedbackSubject`, `settings.feedbackSenderName`, `settings.feedbackSenderEmail`
- `auth.signInRequired` — used for all auth-blocked toasts

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



## Color Architecture Fix (v3.22.4) — Root cause resolved

### The two root causes
1. **Step-3 list used group color, not stop color**: A stop in the "cafes" group showed the cafes color, but the same stop on the map showed its `interests[0]` color (e.g. architecture = red). Fix: circles in step-3 list now use `stop.interests[0]` — exactly like the map.
2. **Auto-generated colors were index-based**: `generateInterestColor(index)` used the array position, which changes when sorted by Hebrew vs English label. Fix: replaced with `idToHue(interestId)` — a hash of the ID string, deterministic and language-independent.

### Files changed
- `app-data.js`: Added `window.BKK.idToHue()` (djb2 hash → hue). Updated `getInterestColor` fallback to use `idToHue(interestId)` instead of array index.
- `app-code.js`: Step-3 list circles now use `stop.interests[0] || interest` (stop's primary interest = same as map marker color).

### Color priority (in getInterestColor)
1. Firebase `interest.color` override (admin-set) — highest priority
2. `idToHue(id)` hash — stable fallback, same in all languages

## Color & Legend Fix (v3.22.3)
Changes in `app-code.js` and `app-data.js`:
1. **Stable interest colors** (`app-data.js`): Added `window.BKK.INTEREST_COLORS` map — fixed English same-color bug where cafes/architecture got identical auto-generated colors
2. **Step-3 trail list** (`app-code.js`): Letter circles now use `getInterestColor(interest)` per group — matches map markers
3. **Active trail stop circles** (`app-code.js`): Color now from `stop.interest` via `getInterestColor` — matches map
4. **Active trail legend** (`app-code.js`): Added מקרא row showing all trail interests with color dot + icon + label
5. **Map legend** (`app-code.js`): Now shows ALL `formData.interests` (selected), not just interests that happen to have stops. Interests with 0 stops shown at 45% opacity with dashed border

**IMPORTANT**: These fixes are in `app-code.js` (compiled). `views.js` source was also updated for reference but `app-code.js` is what the browser loads.

## Color Consistency Fix (v3.22.1)
- Stop circles in step-3 list and active trail now use `window.BKK.getInterestColor()` — matches map markers
- Legend (מקרא) added to active trail stops card

## Pending / Known Issues
- `hint_text_opened` analytics event not yet implemented
- Promote to Production track when ready
