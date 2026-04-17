# Debug Tab System — Full Backup (removed in v3.22.87)

**Removed from:** v3.22.86
**Target for restoration (if ever needed):** FouFou-Future-dev

This document contains everything removed when the Debug tab system was stripped
out of FouFou-dev in v3.22.87. The floating debug bubble (`filterLog` /
`showFilterPanel` / `addToFilterLog`) was **kept** — it's a separate system.

---

## Part A — What was removed

### 1. UI layer

**DebugTab component** — `quick-add-component.js`, previously lines 480–611
(132 lines total). Full source preserved in /tmp/DebugTab_removed.js.

**Settings tab button** — `views.js`, previously lines 3029–3036:
```jsx
{debugMode && (
  <button
    onClick={() => setSettingsTab('debug')}
    className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
      settingsTab === 'debug' ? 'bg-gray-800 text-yellow-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >🐛 {debugSessions.length > 0 ? `דיבאג (${debugSessions.length})` : 'דיבאג'}</button>
)}
```

**DebugTab render site** — `views.js`, previously lines 4963–4980:
```jsx
{/* ===== DEBUG TAB ===== */}
{settingsTab === 'debug' && debugMode && (
  <DebugTab
    debugSessions={debugSessions}
    searchDebugLog={searchDebugLog}
    debugFlagged={debugFlagged}
    debugCategories={debugCategories}
    debugClaudeQ={debugClaudeQ}
    setDebugClaudeQ={setDebugClaudeQ}
    toggleDebugCategory={toggleDebugCategory}
    toggleDebugFlag={toggleDebugFlag}
    exportDebugSessions={exportDebugSessions}
    clearDebugSessions={clearDebugSessions}
    exportFlaggedStops={exportFlaggedStops}
    askClaude={askClaude}
  />
)}
```

### 2. State / refs / functions (all from `app-logic.js`)

Removed in Step 5 (the big L1908–1969 block, 61 lines):
- `searchDebugLogRef` / `searchDebugLog` / `setSearchDebugLog`
- `urlDebugLogRef` / `urlDebugLog` / `setUrlDebugLog`
- `googleInfoDebugLogRef` / `googleInfoDebugLog` / `setGoogleInfoDebugLog`
- `debugClaudeQ` / `setDebugClaudeQ`
- `debugSessions` / `setDebugSessions` (with localStorage init)
- `debugCategoriesRef` + its sync useEffect
- `window.BKK._logUrlBuild` function
- `addDebugLog` function

Removed in Step 6:
- `debugCategories` state + `toggleDebugCategory` (L1790–1800, 11 lines)
- `buildClaudeContext` (≈ 45 lines)
- `askClaude` (≈ 14 lines)
- `foufou_debug_categories` localStorage useEffect
- `foufou_debug_sessions` localStorage useEffect (kept `foufou_debug_mode` — still needed by `debugModeRef` init)
- `saveDebugSession` (28 lines) + its caller at L7287 in route generation
- `exportDebugSessions` (96 lines)
- `clearDebugSessions` (16 lines, including its comment)
- `debugFlagged` state + its localStorage useEffect
- `toggleDebugFlag`
- `exportFlaggedStops`
- The `if (debugModeRef.current)` block at L5485–5517 that wrote to `googleInfoDebugLog`

Full source of all the above preserved in /tmp/step5_6_removed.txt and
/tmp/block_1909_1969_removed.js.

### 3. Call sites (69 total)

One call in `views.js` (L4416, pattern C — whole IIFE line deleted):
```jsx
{settingsTab === 'interests' && (() => { if(debugMode){addDebugLog('INTEREST',`Settings/Interests tab: customInterests.length=${customInterests.length}`);} return null; })()}
```

67 calls in `app-logic.js`, split across four patterns:

- **Pattern A (53 single-line statements)** — just deleted
- **Pattern B (2 arrow-callback inline)** at L2484 and L2502 — replaced with `.catch(() => {})`:
  ```js
  database.ref().update(batch).catch(e => addDebugLog('firebase', '[DIALOG-SAVE] saveCustomInterestAndConfig failed', { error: e.message }));
  // → became: database.ref().update(batch).catch(() => {});
  ```
- **Pattern C (0)** — none in app-logic.js; the one Pattern C was in views.js
- **Pattern D (10 multi-line calls)** — full ranges deleted
- **Special (6 calls in one useEffect)** at app-logic.js L5894–5907 — whole debug useEffect removed

Full list of 69 call sites with their `file:line:message` preserved in
/tmp/call_sites_removed.txt (186 lines).

### 4. i18n strings

- Hebrew `debugMessages`: `'הודעות Debug יופיעו בקונסול (F12)'` (was L279)
- English `debugMessages`: `'Debug messages will appear in console (F12)'` (was L1398)

**Kept** (still needed by floating bubble toggle): `debugMode`, `debugOn`, `debugOff`.

### 5. localStorage keys (no longer written)

- `foufou_debug_categories`
- `foufou_debug_sessions`
- `foufou_debug_flagged`

Users who had these keys will just have unused entries in their localStorage
— no migration needed, no app impact.

---

## Part B — Restoration instructions (for FouFou-Future-dev)

If you want this back, restore in this order:

1. **i18n** — Add `debugMessages` back to both `i18n.js` language blocks.

2. **State + functions in `app-logic.js`:**
   - `debugCategories` state + `toggleDebugCategory` (place near the top state area)
   - In the debug-state block (near `filterLog` / `debugModeRef`): add back
     `searchDebugLogRef`, `urlDebugLogRef`, `googleInfoDebugLogRef`, `debugClaudeQ`,
     `debugSessions`, `debugCategoriesRef`, `window.BKK._logUrlBuild`, `addDebugLog`.
   - `buildClaudeContext`, `askClaude`
   - The two removed localStorage useEffects (`foufou_debug_categories`, `foufou_debug_sessions`)
   - `saveDebugSession` + restore its call in the route-generation success path
   - `exportDebugSessions`, `clearDebugSessions`
   - `debugFlagged` state + its useEffect, `toggleDebugFlag`, `exportFlaggedStops`
   - The `if (debugModeRef.current) { ... googleInfoDebugLogRef ... }` block in
     the Google place-info fetch path

3. **UI in `views.js`:**
   - Add the `{debugMode && <button>` Settings tab-row button back
   - Add the `{settingsTab === 'debug' && debugMode && <DebugTab .../>}` render site
   - Add back the `(() => { if(debugMode){addDebugLog(...)} return null; })()` on
     the Interests tab entry in Settings (optional — diagnostic only)

4. **`DebugTab` component in `quick-add-component.js`** (132 lines, from /tmp/DebugTab_removed.js)

5. **Re-add the 69 `addDebugLog(...)` calls** throughout app-logic.js and views.js.
   /tmp/call_sites_removed.txt has the full list with original line numbers
   — but those line numbers are from BEFORE removal, so you'll need to locate
   the matching context in the current code and place each call appropriately.

**Before restoration, ask:** is there a reason to bring this back? The user's
stated reason for removal was "it was an idea that didn't work." The floating
debug bubble (which was kept) covers most practical debugging needs.

---

## Part C — Verification checklist after removal (passed on v3.22.87)

All of these were verified before packaging:
- `grep -c addDebugLog app-logic.js views.js` → 0 / 0 (was 68 / 1)
- `grep "debugCategories\|debugSessions\|debugFlagged\|debugClaudeQ\|saveDebugSession\|toggleDebugCategory\|toggleDebugFlag\|exportDebugSessions\|clearDebugSessions\|exportFlaggedStops\|buildClaudeContext\|askClaude\|searchDebugLog\|urlDebugLog\|googleInfoDebugLog\|_logUrlBuild"` across all source files → 0 matches
- `filterLog` occurrences unchanged (floating bubble intact)
- `addToFilterLog` function intact
- `debugModeRef` and `searchRunIdRef` preserved (still needed by live code)
- `debugMode` / `debugOn` / `debugOff` i18n strings preserved

## Part D — Runtime behavior after removal

- Settings tabs row no longer shows `🐛 דיבאג` tab (even when debugMode is ON)
- Floating `🔬 N entries` bubble continues to work when debugMode is ON
- The `debugMode` toggle in Settings → General still toggles the bubble
- `localStorage` still stores `foufou_debug_mode` (read by `debugModeRef` init)
- `localStorage` no longer writes `foufou_debug_categories` / `foufou_debug_sessions` / `foufou_debug_flagged`
- No console output from former `addDebugLog` calls — but `console.log` / `console.error` elsewhere in the code are untouched
