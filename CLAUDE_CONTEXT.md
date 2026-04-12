# FouFou — City Trail Generator · Claude Context

## Live
https://eitanfisher2026.github.io/FouFou/

## Stack
React (pre-compiled JSX via Babel), Firebase Realtime DB + Analytics, Google Places API, PWA

## Version
**v3.22.0**

---

## Source Files
| File | Role |
|------|------|
| `_app-code-template.js` | Main component shell, insert points |
| `app-logic.js` | All state, hooks, Firebase, business logic |
| `views.js` | Wizard + trail views JSX |
| `dialogs.js` | All dialogs/modals JSX |
| `quick-add-component.js` | QuickAdd + standalone components (FeedbackItemImages, FloatingAudioPlayer, FeedbackItemImages) |
| `config.js` | VERSION, systemParams defaults |
| `utils.js` | compressImage, uploadImage, i18n helpers |
| `i18n.js` | All Hebrew + English strings |
| `city-*.js` | Per-city data |

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

## Dedup Fix (v3.21.0)
- **Bug fixed:** `googleMulti` dialog "אף אחד מאלה" button called `handleDedupConfirm('reject')` — no handler → dialog closed silently without saving
- **Fix:** changed `'reject'` → `'addNew'` in `dialogs.js` line 36

## i18n Keys (added in 3.19-3.20)
- `auth.deleteAccount`, `auth.deleteAccountConfirm`, `auth.accountDeleted`, `auth.deleteAccountError`, `auth.recentLoginRequired`

## applyUpdate Fix (v3.21.0)
- **Bug fixed:** `applyUpdate` cleared caches but did NOT unregister Service Worker → SW re-activated after reload and served stale JS → infinite update loop
- **Fix:** Added `navigator.serviceWorker.getRegistrations()` → `r.unregister()` before clearing caches and reloading

## Pending / Known Issues
- `hint_text_opened` analytics event not yet implemented
- Promote to Production track when ready
