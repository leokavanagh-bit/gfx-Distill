# Vetting Layer — Design Spec
**Date:** 2026-04-11
**Status:** Approved

---

## Overview

An automatic spell-checking layer that scans MXF video files for on-screen text as soon as they are loaded. Results are advisory — warnings are shown but the Send button is never blocked, because some typos are intentional (e.g. quoting a source verbatim). Flagged words are clickable and jump the frame scrubber to the timecode where they appear.

---

## Workflow

1. User drops or browses to an MXF file
2. Scan starts automatically in the background
3. Banner appears at the bottom of the window in **Scanning** state
4. On completion, banner transitions to one of three states:
   - **Clean** — no issues found
   - **Warnings** — N flagged words shown as chips with timecodes
   - **Error** — scan failed silently; user is advised to check manually
5. User can click a word chip to jump the scrubber to that timecode for visual confirmation
6. User can dismiss the banner at any time
7. Send button remains active throughout — warnings never block dispatch

---

## Tech Stack

| Concern | Library |
|---|---|
| OCR | `tesseract.js` (WebAssembly, runs in main process) |
| Spell check | `nspell` + `dictionary-en` npm package |
| Frame extraction | Existing `ffmpeg` pipeline (`ffmpeg.js`) |

---

## Architecture

### Main Process

**`src/main/vetter.js`** — new module, responsible for:
- Calling ffprobe to get the video duration
- Sampling frames from the MXF at 1 frame/second, capped at 30 frames
- Running Tesseract OCR on each frame image (PNG buffer)
- Collecting all words across frames, deduplicating by text+timecode
- Spell-checking unique words with nspell
- Returning a structured result

```
scanVideo(filePath, durationSeconds) → Promise<VettingResult>

VettingResult:
  { status: 'clean' | 'warnings' | 'error',
    flags: [{ word: string, timecode: number }],
    error?: string }
```

**`src/main/ipc-handlers.js`** — new handler:
- `vet:scan` — receives `filePath`, calls `scanVideo` (which calls ffprobe internally to get duration), returns `VettingResult`

### Renderer

**`src/renderer/src/components/VettingBanner.jsx`** — new component:
- Receives `{ status, flags }` as props
- Renders the full-width banner at the bottom of the window
- Each flag chip calls `onTimecodeSelect(timecode)` when clicked
- Dismiss button hides the banner

**`src/renderer/src/components/MainScreen.jsx`** — modified:
- Calls `window.api.vet.scan(filePath)` when `mxfPath` changes
- Tracks `vettingResult` state (null | scanning | VettingResult)
- Passes `vettingResult` and `onTimecodeSelect` to `VettingBanner`
- `onTimecodeSelect` updates `scrubSeconds` and triggers a frame extraction (same path as dragging the scrubber)

**`src/preload/index.js`** — new namespace:
- `window.api.vet.scan({ filePath, duration })` → IPC invoke

---

## Spell Check Filtering

Words are skipped (not spell-checked) if they match any of the following:

- **ALL-CAPS** — network IDs, branding, show titles (e.g. `BBC`, `SPORT`, `HD`)
- **Fewer than 3 characters** — `OF`, `IN`, `HD`, etc.
- **Contains a digit** — timecodes, job IDs, alphanumeric codes (e.g. `8C378D`, `S01E03`)
- **Contains non-alphabetic punctuation** — URLs, handles, file paths

---

## Frame Sampling

- Extract 1 frame per second of video duration
- Cap at 30 frames regardless of duration (protects against very long files)
- Use existing `ffmpeg` frame extraction — reuse the temp file approach from `ffmpeg.js`
- Frames are processed sequentially and deleted after OCR; no persistent temp files

---

## Banner States

| State | Trigger | Visual |
|---|---|---|
| Scanning | MXF loaded, scan in progress | Spinner + "Scanning for typos…" |
| Clean | Scan complete, zero flags | Green "✓ No issues found" |
| Warnings | Scan complete, ≥1 flag | Red "⚠ N possible typos" + word chips |
| Error | Tesseract or ffmpeg threw | Grey "Could not scan video — check manually before sending" |

The banner is always dismissible. Dismiss hides it for the current file. Loading a new MXF resets and re-triggers the scan.

---

## Packaging

`tesseract.js` uses WebAssembly and language data files that cannot run from inside an `.asar` archive. Add to `asarUnpack` in `electron-builder.yml`:

```yaml
asarUnpack:
  - node_modules/tesseract.js/**
  - node_modules/tesseract.js-core/**
```

`nspell` and `dictionary-en` are pure JS with no binary components — no asarUnpack needed.

---

## Out of Scope

- Confidence threshold tuning (Tesseract default used as-is)
- Custom word whitelists (e.g. show-specific proper nouns)
- Upgrading to cloud OCR (Claude Vision / Google Vision) — architecture is designed to make `vetter.js` the only file that changes for this upgrade
- Per-word false-positive feedback / learning
