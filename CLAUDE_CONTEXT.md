# FouFou — City Trail Generator · Claude Context

## Live
https://eitanfisher2026.github.io/FouFou-dev/

## Stack
React (pre-compiled JSX via Babel), Firebase Realtime DB + Analytics, Google Places API, PWA

## Current Version
**v3.22.98**

## Recent Changes (v3.22.87 → v3.22.95)
- **v3.22.87**: Debug tab + `addDebugLog` infrastructure removed
- **v3.22.88**: TTS (הקראה) system removed — kept: recording playback + speech-to-text dictation
- **v3.22.89**: Dead code cleanup (adminPassword state, setter-only useStates)
- **v3.22.90**: Admin Tools section removed (5 tools + supporting functions)
- **v3.22.91**: Malaga city map updated
- **v3.22.92**: `adminPassword`/`adminUsers` removed + `places.noChanges` i18n added + `DEBUG_FULL_BACKUP.md` removed from zip
- **v3.22.93**: Place permissions overhaul (see below)
- **v3.22.95**: UI polish — anon users see no filter row; pencil→eye icon for approved places
- **v3.22.95** (next): rate button CTA styling + login z-index fix + Google ratings refresh gating

## ⚠️ CONTEXT WINDOW NOTE
Project is large (~2MB JS source). Memory fills up after 3-5 rounds of major changes.
**Recommendation**: start a fresh chat for:
- Each planned deep-dive (Firebase efficiency, Google Places efficiency, City switching)
- After completing a batch of 3-4 small fixes
Last working zip before context reset: **v3.22.95** (582KB, 36 files)

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

## Build & Compile
```bash
python3 build.py              # assembles index.html + app-data.js
node compile.js app-code.js   # JSX → minified JS (MUST run after build.py)
```

## ⚠️ VERSION BUMP — MANDATORY (every release)
```bash
OLD=3.22.X; NEW=3.22.Y
sed -i "s|v=${OLD}|v=${NEW}|g; s|v${OLD}|v${NEW}|g; s|'${OLD}'|'${NEW}'|g; s|foufou-dev-v${OLD}|foufou-dev-v${NEW}|g" \
  app-data.js sw.js index.html config.js
echo "{\"version\": \"${NEW}\"}" > version.json
echo -n "${NEW}" > .last_built_version
```
**Verify ALL 6 files match:**
```bash
grep "3\.22\." app-data.js sw.js index.html config.js version.json .last_built_version
```

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
**Always end every session with:** `📦 GitHub only — no Play Store needed`

---

## Critical Coding Rules (quick ref)
- `mangle: false` in compile.js — never change
- Double quotes only in JSX (single = Babel error)
- All Firebase writes → `app-logic.js` only
- Never `React.useState`/`React.useRef` inside `.map()`, IIFEs, or callbacks
- Never `{(() => { ... })()}` in JSX ternary — use `? (() => { ... })()`

---

## Architecture — Key Concepts

### Roles
- `userRole` / `effectiveRole`: 0=regular, 1=editor, 2=admin
- `isEditor` = effectiveRole ≥ 1 | `isAdmin` = effectiveRole ≥ 2 | `isUnlocked` = isEditor
- `isRealAdmin` = userRole ≥ 2 (ignores impersonation)

### Step 2 — Search Tabs
| Tab | searchMode | radiusSource |
|-----|-----------|--------------|
| 🗺️ בחר אזור | `'area'` | — |
| 🎯 מסביב למקום | `'radius'` | `'point'` |
| 📍 קרוב אליי | `'radius'` | `'gps'` |
- Switching tabs clears `disabledStops[]`

### Favorites / Locations
- Status: `loc.locked === true` = approved, `loc.status === 'blacklist'` = skip list, else = draft
- **Edit/Delete permissions** (v3.22.93):
  - Admin/Editor: edit/delete any place
  - Regular user: edit/delete own places (draft OR approved)
  - Anonymous: no edit/delete
- **Approve permissions** (v3.22.93): only Admin/Editor can flip draft ↔ approved (via status toggle in edit dialog OR bulk approve in Settings)
- **Auto-revert on edit** (v3.22.93): saving content edits to an approved place auto-downgrades it back to draft (`updateCustomLocation` L9027). **Exception**: when an admin/editor explicitly flips the status toggle draft→approved in the same save, the approval is preserved.
- **Reviews are safe**: writing/editing reviews goes to `cities/{cityId}/reviews/{placeKey}/{uid}` — separate Firebase path, never touches `locked` on the location
- **Tab visibility** (v3.22.94): `all/drafts/ready` tabs visible to all logged-in users; `skipped` (blacklist) hidden from non-editor; entire filter row hidden from anonymous
- **Edit icon** (v3.22.94): `!canEdit || loc.locked ? "👁️" : "✏️"` — eye for approved (hints that editing will revert to draft)
- Nav arrows in edit dialog work from `flatNavList` (app-logic.js L5410) which respects all active filters
- `addedBy` = Firebase uid of creator

### Auth
- Providers: Google Sign-In + anonymous
- `getRedirectResult()` handled on app load
- `auth/internal-error` + `auth/no-auth-event` silently ignored

### Language detection (new users)
1. `localStorage city_explorer_lang`
2. `navigator.language` (he→Hebrew, en→English)
3. `localStorage foufou_admin_default_lang`
4. Fallback: `'en'`

### Debug system (v3.22.87 — simplified)
Only the **floating bubble** (`🔬 N entries` bottom-left) remains. The Debug tab in Settings was fully removed in v3.22.87.
- State: `filterLog`, `filterLogRef`, `showFilterPanel`, `setShowFilterPanel`
- Fill function: `addToFilterLog` in `app-logic.js` (called from route generation)
- Toggle: `debugMode` in Settings → General (localStorage: `foufou_debug_mode`)
- If ever needed back: see `DEBUG_FULL_BACKUP.md` for full restoration instructions

### Removal history
- **v3.22.86**: Google Takeout import feature removed (see `TAKEOUT_FULL_BACKUP.md` in an earlier backup if restoring)
- **v3.22.95**: Debug tab + `addDebugLog` infrastructure removed (see `DEBUG_FULL_BACKUP.md`)

---

## Known Open Issues
1. **boundaryFactor** not in systemParams UI — by design (per-city field)
2. **dedupRelated** — review interest data for correct parent-child relationships (e.g. קפה בראנץ → קפה)
3. **Singapore flag icon** — stored as base64 data URL in Firebase `cities/singapore/general/icon`; was rendering as string instead of image in one case (FIXED by user manually replacing with a different icon)

## Planned Deep-Dive Sessions (one per chat, due to file size)
1. **Firebase efficiency** — reads/writes audit, reactivity, batching opportunities
2. **Google Places API efficiency** — caching, deduplication, call cost optimization
3. **City switching flow** — `selectedCityId` reactivity, subscription cleanup

## Known Code Smells (flagged but not yet cleaned)
- 6 Firebase writes live in views.js/dialogs.js (L3103, L661, L1492-1493, L3686, L3696) — violates the "writes only in app-logic.js" rule. Intentional admin UI context, cleanup deferred.
- Several `t('key') || 'fallback'` patterns exist — these don't work (t() returns the key when missing, which is truthy). If any toast shows raw key like "places.noChanges", add the key to i18n.js.
