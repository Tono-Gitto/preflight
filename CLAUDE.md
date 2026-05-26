# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page PWA (Progressive Web App) for iPad. A Boeing 777 pilot uses it as a departure checklist anchored to STD (Standard Time of Departure). All times are UTC. Deployed via GitHub Pages for HTTPS (required for Wake Lock API and service worker on iOS).

## Running locally

```bash
cd /Users/iMacNattawut/Claude/B777tools/TimeLineApp
python3 -m http.server 8765
# open http://localhost:8765/
```

No build step. No dependencies. No package.json. Edit `index.html` and reload.

To simulate a fresh install (no stored data), open browser DevTools → Application → Storage → Clear site data, then reload.

## Testing swipe gestures on macOS

Click and drag horizontally on a checklist row. The app supports both touch and mouse events. Swipe right = complete, swipe left = undo (44px threshold).

## File structure

All app code lives in `index.html` — CSS and JS are embedded. No separate files.

| File | Purpose |
|---|---|
| `index.html` | Entire app: HTML structure, all CSS (`<style>`), all JS (`<script>`) |
| `sw.js` | Service worker — cache-first strategy for offline use |
| `manifest.json` | PWA manifest for home screen install |
| `icon-180.png` | iOS home screen icon (the one iOS actually uses) |
| `icon-192.png` | Manifest/Android icon |
| `Default List/` | Reference screenshot of the default checklist items |

## Architecture

Single HTML file, no framework. All state is in module-level JS variables, persisted to `localStorage`.

### State model (localStorage keys)
- `checklist_items` — JSON array of `{id, offset, label}` where `offset` is minutes relative to STD
- `std_hhmm` — display string e.g. `"1430"`
- `std_epoch_ms` — UTC epoch ms for the STD (computed from HH:MM + Today/Tomorrow toggle at entry time)
- `completed_ids` — JSON array of completed item IDs (reset when STD is saved)

### JS sections (in order inside `<script>`)
- **State / defaults** — module-level vars + `DEFAULT_ITEMS` array (14 B777 items)
- **localStorage helpers** — `loadState()`, `persistItems()`, `persistCompleted()`
- **Wake Lock** — `acquireWakeLock()`, re-acquired on `visibilitychange`
- **UTC clock** — `updateClock()` + `tick()` called every second via `setInterval`
- **Color logic** — `rowColorClass(item)`: blue >10 min, green 0–10 min, red past, gray done
- **Time formatting** — `formatItemTime(itemMs)` handles midnight crossings (+1/-1 day indicator)
- **Checklist render** — `renderChecklist()` rebuilds DOM on data change; `updateRowColors()` only swaps CSS classes (called every second)
- **Swipe gesture** — `attachSwipeHandlers()` called once at init; uses touch + mouse events; direction-locked per completion state
- **STD modal** — `saveStd()` validates HH:MM, computes epoch from Today/Tomorrow toggle, resets all completions
- **Editor** — `renderEditor()`, `submitAddItem()`, `deleteItem()`, `confirmReset()`
- **View management** — `showView('main' | 'editor')` toggled by bottom nav

### Two HTML views (show/hide)
- `#view-main` — UTC clock header, scrollable checklist rows, bottom nav
- `#view-editor` — item list with delete buttons, inline add form, Reset Checklist button

### Row DOM structure
```
.checklist-row  (position:relative, overflow:hidden, background = color state)
  .swipe-hint-left   (absolute left, green ✓, revealed by right-swipe)
  .swipe-hint-right  (absolute right, orange ↺, revealed by left-swipe)
  .row-inner         (translateX to reveal hints, background:inherit)
    .col-offset  .col-time  .col-label
```

## Key constraints

- **Midnight crossings**: STD epoch is stored as ms, not HH:MM. All item times computed as `stdEpochMs + offset * 60000`. The Today/Tomorrow toggle at STD entry prevents wrong-day anchoring.
- **Service worker updates**: bump `CACHE_NAME` in `sw.js` (e.g. `timeline-v3` → `timeline-v4`) to force cache refresh on existing installs.
- **iOS PWA**: `apple-touch-icon` meta tag (not manifest icons) is what iOS uses. `apple-mobile-web-app-capable` is required for standalone mode. Wake Lock requires iOS 16.4+.
- **`passive: false` on touchmove**: intentional — required to call `preventDefault()` and prevent scroll during horizontal swipe disambiguation.
