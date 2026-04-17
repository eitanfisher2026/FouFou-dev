# FouFou — City Trail Generator · Claude Context

## Live
https://eitanfisher2026.github.io/FouFou-dev/

## Stack
React (pre-compiled JSX via Babel), Firebase Realtime DB + Analytics, Google Places API, PWA

## Current Version
**v3.22.84**

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
  CLAUDE_CONTEXT.md CLAUDE_DEV_RULES.md README.md _app-code-template.js _source-template.html \
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
- Full rules → `CLAUDE_DEV_RULES.md`

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
- Status: `'draft'` (editors only) / `'approved'` (all users)
- Regular users see: approved + own drafts. Anon: approved only.
- Filtered in 4 places: `groupedPlaces` useMemo, header count, nav count, favorites map
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

### Google Takeout Import (v3.22.84)
- State in `app-logic.js`: `takeoutPlaces`, `takeoutImportSelections`, `takeoutBulkInterests`, `takeoutAddedBy`
- Dialog in `dialogs.js`: fullscreen, `showTakeoutDialog`
- `addedBy`: admin picks from editor dropdown (`allUsers` filtered role≥1); editor sees own name only
- Existing places: checkbox disabled, shown in separate bottom section
- `executeTakeoutImport` → saves to `cities/${selectedCityId}/locations/`

---

## Known Open Issues
1. **boundaryFactor** not in systemParams UI — by design (per-city field)
2. **dedupRelated** — review interest data for correct parent-child relationships (e.g. קפה בראנץ → קפה)
