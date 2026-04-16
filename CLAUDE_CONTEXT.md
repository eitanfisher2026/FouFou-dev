# FouFou — City Trail Generator · Claude Context

## Live
https://eitanfisher2026.github.io/FouFou-dev/

## Stack
React (pre-compiled JSX via Babel), Firebase Realtime DB + Analytics, Google Places API, PWA

## Current Version
**v3.22.73**

---

## Source Files
| File | Role |
|------|------|
| `_app-code-template.js` | Main component shell, insert points |
| `app-logic.js` | All state, hooks, Firebase, business logic |
| `views.js` | Wizard + trail views JSX |
| `dialogs.js` | All dialogs/modals JSX |
| `quick-add-component.js` | QuickAdd + standalone components |
| `config.js` | VERSION only — **SOURCE ONLY, not loaded directly** |
| `utils.js` | compressImage, uploadImage, i18n helpers — **SOURCE ONLY** |
| `i18n.js` | All Hebrew + English strings — **SOURCE ONLY** |
| `city-*.js` | Per-city data |

## Built Files (deployed, not source)
| File | Contents |
|------|----------|
| `app-data.js` | **Built** — config.js + utils.js + i18n.js + city files inlined. `window.BKK.VERSION` lives here. |
| `app-code.js` | **Built** — compiled/minified JSX (app-logic + views + dialogs + quick-add) |
| `index.html` | **Built** — assembled from `_source-template.html` with CSS inlined |

## Build Order
```bash
python3 build.py              # assembles index.html + app-data.js + inlines CSS
node compile.js app-code.js   # JSX → minified JS (MUST run after build.py)
```
Claude can run both commands directly — node + npm are available in the container.

## Critical Rules
- `mangle: false` in compile.js — never change
- Double quotes only in JSX (single = Babel error)
- All Firebase writes → `app-logic.js` only
- Never use `React.useState`/`React.useRef` inside `.map()`, IIFEs, or callbacks
- Never use `{(() => { ... })()}` inside a JSX ternary `? ( ... )` — causes Babel crash. Use `? (() => { ... })()` (no wrapping `{}`)

---

## ⚠️ VERSION BUMP — MANDATORY (every release)
Both patterns must be replaced:
```bash
OLD=3.22.X; NEW=3.22.Y
sed -i "s|v=${OLD}|v=${NEW}|g; s|v${OLD}|v${NEW}|g; s|'${OLD}'|'${NEW}'|g; s|foufou-dev-v${OLD}|foufou-dev-v${NEW}|g" \
  app-data.js sw.js index.html config.js
echo "{\"version\": \"${NEW}\"}" > version.json
echo -n "${NEW}" > .last_built_version
```
**Verify ALL 6 files match before packaging:**
```bash
grep "3\.22\." app-data.js sw.js index.html config.js version.json .last_built_version
```
Must show same version in: `VERSION =`, `CACHE_NAME`, `?v=` in sw.js OFFLINE_ASSETS, all `?v=` in index.html, version.json, .last_built_version.

---

## Packaging (MANDATORY after every change)
```bash
python3 build.py
node compile.js app-code.js
# bump version (see above)
zip -q github-upload-dev-vX_YY_ZZ.zip \
  CLAUDE_CONTEXT.md README.md _app-code-template.js _source-template.html \
  app-code.js app-data.js app-logic.js build.py \
  city-bangkok.js city-gushdan.js city-malaga.js city-singapore.js city-telaviv.js \
  compile.js config.js dialogs.js favicon.ico firebase-rules.json i18n.js \
  icon-16x16.png icon-180x180.png icon-192x192.png icon-32x32.png icon-512x512.png \
  index.html manifest.json package-lock.json package.json privacy.html \
  quick-add-component.js sw.js utils.js version.json views.js \
  .last_built_version .nojekyll
```
**Always end every session with:** `📦 GitHub only — no Play Store needed` (unless twa-manifest.json changed)

---

## Architecture — Step 2 "איפה מטיילים" (3-tab selector)

### Tabs
| Tab | searchMode | radiusSource |
|-----|-----------|--------------|
| 🗺️ בחר אזור | `'area'` | — |
| 🎯 מסביב למקום | `'radius'` | `'point'` |
| 📍 קרוב אליי | `'radius'` | `'gps'` |

- Switching tabs clears `disabledStops[]`
- "קרוב אליי" tab click starts GPS silently in background; lazy retry on "מצא מקומות"

### Point Search (מסביב למקום dropdown)
- **onChange (typing)**: instant local search in `customLocations` by name only (NOT address — Watthana bug)
- **"חפש בגוגל" button**: calls `searchPointForRadius()` → returns `{favorites, google}` groups
- Favorites max: `systemParams.pointSearchMaxFavorites` (default 5)
- Google max: `systemParams.pointSearchMaxGoogle` (default 10)
- Dedup: Google results matching a favorite by `googlePlaceId` are filtered out
- Dropdown: `maxHeight: 280px, overflowY: auto` (scrollable)
- When user picks Google result matching a favorite → `showConfirm()` dialog

### buildRadiusStop(lat, lng, name, googlePlaceId)
- Matches favorites by `googlePlaceId` only (proximity match removed — unreliable)
- If `googlePlaceId` is null → always returns plain Google stop (no favorite match)
- Sets `isRadiusCenter: true, manuallyAdded: true`

### pinnedFirstStop (optimizeStopOrder)
- `isRadiusCenter` stop is pinned at position 0 (letter A), excluded from TSP
- Pin released if: (a) user skips the stop, (b) user sets a different start via map
- `isRadiusCenter` flag cleared when user sets different start

---

## Map Legend (mapMode:'stops')
- Uses `route.preferences.interests` (user selections from Step 1), NOT stop-derived interests
- Manual stops shown with white circle + green border entry: "הוספו ידנית"
- Map markers: `isRadiusCenter` / `manuallyAdded` stops → white fill + green border

---

## systemParams
Defined in `app-logic.js` `window.BKK._defaultSystemParams`. Firebase-persisted. UI in Settings → sysparams tab.

Key params:
| Key | Default | Notes |
|-----|---------|-------|
| `maxStops` | 10 | Max stops per route |
| `pointSearchMaxGoogle` | 10 | Max Google results in מסביב למקום dropdown |
| `pointSearchMaxFavorites` | 5 | Max favorites in מסביב למקום dropdown |
| `googleMaxResultCount` | -1 | -1 = let Google decide; positive = cap |
| `defaultRadius` | 500 | Default radius meters |
| `boundaryFactor` | 1.5 | Per-city field (NOT systemParam) — in city data |

### Favorite Scoring systemParams (v3.22.46+)
Formula: `googleWeight×G + base + (ff - neutral)×bonusPerStar`
- `ff < threshold` → penalty instead of bonus
- `ff = neutral` → ±0 (no effect)

| Key | Default | Notes |
|-----|---------|-------|
| `favoriteBaseScore` | 20 | Base score for any favorite with no FouFou rating |
| `favoriteBonusPerStar` | 5 | Score per star above neutral |
| `favoriteNeutralRating` | 3.0 | Rating where bonus = 0 |
| `favoriteLowRatingThreshold` | 2.5 | Below this → penalty |
| `favoriteLowRatingPenalty` | 60 | Subtracted when rating is poor |
| `favoriteMinRatingsForBonus` | 1 | Min FouFou ratings before bonus activates |
| `favoriteGoogleScoreWeight` | 1.0 | Multiplier on Google score for favorites |

Google score formula: `rating × log10(reviewCount + 1)`

---

## Auth (v3.22.44+)
- **Providers**: Google Sign-In only (+ anonymous)
- Microsoft/Apple functions exist in `app-logic.js` (`authSignInMicrosoft`, `authSignInApple`) but NOT shown in UI — kept for future use
- `getRedirectResult()` handled on app load (mobile popup-blocked fallback)
- `auth/internal-error` and `auth/no-auth-event` silently ignored (not redirect result)
- Boundary check on save: `checkLocationBoundary()` returns `'ok'`/`'warn'`/`'block'`; admin gets warning toast, non-admin gets blocked

---

## Language / Default Lang (v3.22.40+)
Detection order for new users (no saved preference):
1. `localStorage city_explorer_lang` (returning user)
2. `navigator.language` — `he*` → Hebrew, `en*` → English
3. `localStorage foufou_admin_default_lang` (admin-set default)
4. Fallback: `'en'`

Admin can set default in Settings → General → "ברירת מחדל למשתמשים חדשים"

---

## Favorites Screen (views.js `currentView === 'myPlaces'`)

### Header row
- ⭐ מועדפים + count of non-blacklisted locations
- 🔍📐 dedup scan buttons (editor+)
- 👤 הכל/אני toggle — non-anonymous logged-in users (non-editor shows in header; editor shows in filter row)
- 📥 import button — admin only (icon only)

### Filter row (editor/admin only — `isUnlocked`)
- Tab buttons: all / drafts / ready / skipped
- 🏷️ no-interest filter
- 👤 dropdown (admin) or 👤 toggle (editor) for addedBy filter
- `filterAddedBy` state persisted in `localStorage foufou_filter_addedby`

### Sort options
- `updatedAt` / `addedAt` / `name` → flat list, no group header count shown for time-based sorts
- `interest` / `area` → grouped list
- Name sort: `localeCompare('en', { sensitivity: 'base', numeric: true })` — favorites always in English

---

## Interest Dialog (dialogs.js)
### Status row (admin/editor, edit mode only)
- Active / Draft / Hidden buttons
- Lock toggle (admin only) — same style as location lock button (green🔒 / amber✏️)
- Places count

### Map color row
Order: **[מחק תחום] [צבע:] [color picker] [✕ auto] [🗺️]**
- "מחק תחום" button — first, small red border, with confirm
- Delete only shown when `editingCustomInterest && isEditor`

---

## disabledStops Clearing Logic
| Action | Clears disabledStops? |
|--------|----------------------|
| Switch tab (area ↔ point ↔ gps) | ✅ Yes |
| Change radius | ❌ No |
| Add/remove interest | ❌ No |
| Re-run same search | ❌ No |
| Select new city | ✅ Yes |
| Stop no longer in new route | ✅ Yes (auto-cleanup) |

---

## Debug Mode (admin only)
- Filter Log panel shows per-interest Google API results with score formula
- Trail list shows `🔢 score | formula` per stop when `debugMode && isUnlocked`
- Score formula in settings has ℹ️ button with dynamic examples using current param values
- `fetchMoreAll` dedup fixed (v3.22.46): `allUsedNames` recomputed per-iteration

---

## Known Open Issues / Pending Tasks
1. **Import favorites** (📥 button) — exists in UI (admin only) but not fully working. Kept for future fix.
2. **boundaryFactor** not exposed in systemParams UI — by design (per-city field).
3. **showConfirm cancelLabel** — supported in `dialogs.js` (v3.22.33+).
4. **GPS toast "מצא מיקום"** — verify sticky toast no longer appears on tab click (fixed v3.22.25).
5. **dedupRelated relationships** — `pickDominantInterest` relies on `dedupRelated` being set correctly per interest. Review interest data to ensure parent-child relationships are defined (e.g. קפה בראנץ.dedupRelated includes קפה).

---

## Changes — v3.22.55 → v3.22.64

### v3.22.56 — Search consolidation + manual add dialog
- `_searchPlacesCore(query, setResults)` — single shared function replacing duplicate `searchPointForRadius` / `searchManualForDialog`
- Manual add dialog now shows multi-result dropdown (favorites + Google groups), same as point search
- Bug fix: `searchPointForRadius` had hardcoded `maxResultCount: 5` — now uses `pointSearchMaxGoogle` param everywhere
- `manualSearchResults` state added

### v3.22.57 — Favorite match confirm in manual add
- When picking a Google result in manual add dialog that matches a favorite → same `showConfirm` as point search

### v3.22.58–59 — Status system (draft / approved)
- Lock icon (🔒/✏️) replaced with ✅ מאושר / ✕ טיוטה
- Status toggle moved out of collapsible, shown below ratings row
- Permissions: `isAdmin || isEditor || userId/addedBy === authUser.uid`
- `includeDrafts` bug fix: all checks now use `=== false` (not `!value`)
- Confirm dialog text shortened: `"X" קיים במועדפים. להשתמש בו?`

### v3.22.60 — Status row + favorites filtering
- `dedupOk` button (✕/✓ כפילות) added to status row, pushed to far side (`marginInlineStart:auto`)
- Google Info button restored to collapsible gray box
- Favorites list + map: regular users see approved + own drafts; anon sees approved only
- Filtered in 4 places: `groupedPlaces` useMemo, header count, nav count, favorites map

### v3.22.61–62 — Favorites map marker color
- `window.BKK.pickDominantInterest(ids, allInts)` added to `utils.js`
  - Finds the "child" interest (the one that appears in a sibling's `dedupRelated`)
  - Falls back to first in system order if no relationship found
- Favorites map: color based on active filter ∩ place interests → `pickDominantInterest`

### v3.22.63–64 — Fixes
- v63: Reverted Google Info button placement (v3.22.60 mistake), moved `dedupOk` correctly
- v64: `dedupOk` label changed to `✓ כפילות` / `✕ כפילות`

---

## Code Consolidation — Principles & Rules

### Goals of consolidation
1. **Single source of truth** — logic written once; a future change in one place affects all consumers automatically.
2. **Smaller codebase** — consolidation must reduce total source size, not increase it.
3. **Easier maintenance** — one function to read, debug, and update instead of N copies.

### When consolidation is valid
- Two or more functions share the same logic and differ only in a parameter (e.g. which state setter to call, which config value to use).
- The shared version is **shorter** than the sum of the originals.
- Canonical pattern: extract one shared function, replace the originals with thin wrappers:
  ```js
  const sharedFn = (query, setResults) => { /* logic once */ };
  const fnA = (q) => sharedFn(q, setResultsA);
  const fnB = (q) => sharedFn(q, setResultsB);
  ```

### When consolidation is NOT valid — Claude must refuse and explain
- The refactor would **increase** total code size.
- The "shared" function needs so many conditional branches that it becomes harder to read than two separate functions.
- The functions look similar but have genuinely different business logic that is likely to diverge in the future.

### Claude's responsibility
- Claude is the code expert. If a requested consolidation contradicts the goals above, **Claude must warn before writing any code** — not implement and report the problem afterward.
- If a task cannot achieve its stated goals (smaller, maintainable, single source of truth), Claude must say so clearly and propose an alternative or recommend not doing it.
- Never duplicate logic under the label of "consolidation."
