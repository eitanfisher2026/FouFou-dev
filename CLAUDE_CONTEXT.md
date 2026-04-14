# FouFou — City Trail Generator · Claude Context

## Live
https://eitanfisher2026.github.io/FouFou-dev/

## Stack
React (pre-compiled JSX via Babel), Firebase Realtime DB + Analytics, Google Places API, PWA

## Current Version
**v3.22.38**

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
- When user picks Google result matching a favorite → `showConfirm()` dialog:
  - "⭐ כן, השתמש במועדף" → uses favorite data
  - "לא, גוגל" → uses Google data, sets `radiusPlaceId = null` (prevents re-match in buildRadiusStop)

### buildRadiusStop(lat, lng, name, googlePlaceId)
- Matches favorites by `googlePlaceId` only (proximity match removed — unreliable)
- If `googlePlaceId` is null → always returns plain Google stop (no favorite match)
- Sets `isRadiusCenter: true, manuallyAdded: true`

### Selected place chip display
- 🎯 icon always
- If favorite: shows interest icon + FouFou cat icon (icon-32x32.png 16px)
- If Google only: just 🎯 + name

### pinnedFirstStop (optimizeStopOrder)
- `isRadiusCenter` stop is pinned at position 0 (letter A), excluded from TSP
- Pin released if: (a) user skips the stop, (b) user sets a different stop as start via map
- `isRadiusCenter` flag cleared when user sets different start (so it becomes a regular stop in TSP)

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
| `favoriteBaseScore` | — | Favorite scoring weight |
| `boundaryFactor` | 1.5 | Per-city field (NOT systemParam) — in city data |

**Note:** `boundaryFactor` is per-city (stored in `city.boundaryFactor`), not a systemParam. It is NOT in the systemParams settings UI.

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

## Known Open Issues / Pending Tasks
1. **systemParams settings UI** — `boundaryFactor` not exposed (it's per-city, not systemParam — by design). Verify if any other recently added systemParams are missing from the UI settings list.
2. **showConfirm cancelLabel** — supported in `dialogs.js` (v3.22.33+). Confirm `onCancel` fires correctly for all usages.
3. **GPS toast "מצא מיקום"** — verify sticky toast no longer appears on tab click (fixed v3.22.25).
4. **Radius center pin release** — when user manually sets different start via map, `isRadiusCenter` cleared. Test that TSP re-orders correctly.

---

## Packaging
```bash
zip -q output.zip \
  CLAUDE_CONTEXT.md README.md _app-code-template.js _source-template.html \
  app-code.js app-data.js app-logic.js build.py \
  city-bangkok.js city-gushdan.js city-malaga.js city-singapore.js city-telaviv.js \
  compile.js config.js dialogs.js favicon.ico firebase-rules.json i18n.js \
  icon-16x16.png icon-180x180.png icon-192x192.png icon-32x32.png icon-512x512.png \
  index.html manifest.json package-lock.json package.json privacy.html \
  quick-add-component.js sw.js utils.js version.json views.js \
  .last_built_version .nojekyll
```
