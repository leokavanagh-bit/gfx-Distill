# GFX Distributor — Documentation

**Version:** 1.0.0  
**Platform:** Windows 11 (x64), macOS (arm64/x64)  
**Built with:** Electron 39, React 19, Vite

---

## Overview

GFX Distributor is a desktop application for the GFX team. It takes an MXF video file, runs an automated spell-check scan of on-screen text, and distributes the file to a studio watch folder as a PNG sequence. The app is designed to be simple and fast — drop a file, review, send.

---

## How It Works

### 1. Load an MXF File

Drag and drop an MXF file onto the drop zone, or use **Browse for file…** to open a file picker. Only `.mxf` files are accepted.

### 2. Automated Vetting Scan

As soon as a file is loaded, the app automatically runs an OCR-based spell check in the background:

- Frames are extracted at 1-second intervals (up to 30 frames total).
- Each frame is passed through Tesseract OCR to read any visible text.
- Words are checked against an English dictionary (nspell).
- To avoid false positives from animated or partially-revealed text, a word is only flagged if it appears misspelled in **two or more frames**.
- ALL-CAPS words, numbers, short words (under 3 characters), and words containing punctuation are skipped automatically.

Results appear in the **vetting banner** at the bottom of the window:

| Status | Meaning |
|---|---|
| Scanning… | OCR is in progress |
| No issues found | All visible text passed the spell check |
| ⚠ N possible typos | One or more words may be misspelled |
| Could not scan | Scan failed — check the file manually |

Clicking a flagged word chip jumps the frame preview to the timecode where it was found.

> The designer retains full discretion — warnings are advisory only and the file can still be sent.

### 3. Fill In Metadata

- **Document Title** — optional descriptive title, written into the output PNG metadata.
- **Job ID** — required. The unique identifier for the job (e.g. `8C378D`).
- **Keywords** — optional comma-separated tags written into the output PNG metadata.

### 4. Select a Studio Destination

Choose a studio from the dropdown. Studios and their watch folder paths are configured in Admin Settings.

### 5. Preview the Frame

Use the scrubber slider to step through the video and preview individual frames. The timecode is shown to the right of the slider. Clicking a typo chip in the vetting banner will jump the scrubber to the relevant frame.

### 6. Send

Click **Send** to begin distribution. The app will:

1. Extract a PNG frame at the selected timecode using ffmpeg.
2. Write the Job ID, title, and keywords into the PNG metadata using ExifTool.
3. Copy the tagged PNG to the configured studio watch folder.

A progress indicator is shown during sending. On completion, a **Send Another** button resets the form.

---

## Admin Settings

Access Admin Settings via the application menu (or keyboard shortcut).

### PNG Watch Folder

The local or network folder where output PNGs are staged before being picked up by the watch folder system. Click **Browse** to select it.

### Studios

A list of named destinations. Each studio has:

- **Studio Name** — the label shown in the main screen dropdown.
- **Path** — the UNC or local path to the studio's watch folder.

Use **+ Add Studio** to create a new entry. Select a studio from the list to edit its name or path, then click **Save Studio**. Use **Delete** to remove a studio.

### Import / Export Config

Use **Export Config** to save the current studio list and watch folder path to a JSON file. Use **Load from File** to restore a previously exported config — useful for onboarding new machines.

---

## Installation — Windows 11

### Requirements

- Windows 11 (64-bit)
- No additional software required — ffmpeg, ffprobe, and ExifTool are bundled

### Steps

1. Download `gfx-distributor-1.0.0-setup.exe` from the shared location provided by your team lead.
2. Double-click the installer.
3. If Windows SmartScreen shows a warning, click **More info** → **Run anyway**. (The app is not yet code-signed.)
4. Choose an installation directory (or accept the default) and click **Install**.
5. A desktop shortcut labelled **GFX Distributor** will be created automatically.
6. Launch the app from the desktop shortcut or Start Menu.

### First-Run Setup

On first launch, open **Admin Settings** and configure:

1. **PNG Watch Folder** — the staging folder for output files.
2. **Studios** — add each studio destination with its watch folder path.

If your team uses a shared config, use **Load from File** to import the pre-configured `config.json` provided by your team lead instead of entering studios manually.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| "Could not scan" in the vetting banner | The OCR engine failed — check the file is a valid MXF and try again. The file can still be sent. |
| Send button stays disabled | Ensure a file is loaded, a studio is selected, and a Job ID is entered. |
| Watch folder path not found | Check the studio path in Admin Settings is accessible from this machine (network drive may need to be mapped). |
| App won't launch after install | Check Windows Event Viewer for errors; try reinstalling. |

---

## Architecture Notes (for Engineering)

```
src/
  main/          — Electron main process
    ffmpeg.js    — frame extraction and duration probing via ffmpeg/ffprobe
    vetter.js    — OCR scan pipeline (Tesseract.js + nspell)
    ipc-handlers.js — IPC bridge between main and renderer
  preload/
    index.js     — contextBridge API exposed to renderer
  renderer/
    src/
      components/
        MainScreen.jsx     — primary workflow screen
        AdminScreen.jsx    — configuration screen
        DropZone.jsx       — file input
        FrameScrubber.jsx  — frame preview + scrubber
        MetadataFields.jsx — title / job ID / keywords inputs
        SendArea.jsx       — send button + progress + status
        VettingBanner.jsx  — OCR results banner
      hooks/
        useConfig.js       — loads app config via IPC
        useSend.js         — orchestrates the send workflow
```

**Key dependencies:**

| Package | Purpose |
|---|---|
| `tesseract.js` v7 | WebAssembly OCR for on-screen text reading |
| `nspell` + `dictionary-en` | Hunspell-based English spell checking |
| `ffmpeg-static` / `ffprobe-static` | Bundled ffmpeg binaries for frame extraction |
| `exiftool-vendored` | PNG metadata writing (Job ID, title, keywords) |
| `electron-builder` | Packaging and NSIS installer generation |

**IPC channels:**

| Channel | Direction | Purpose |
|---|---|---|
| `vet:scan` | renderer → main | Run OCR vetting scan on a file path |
| `ffmpeg:getDuration` | renderer → main | Get video duration in seconds |
| `ffmpeg:extractFrame` | renderer → main | Extract a frame as a base64 data URL |
| `config:load` | renderer → main | Load app config from disk |
| `config:save` | renderer → main | Save app config to disk |
| `dialog:openFile` | renderer → main | Open native file picker |
| `dialog:openFolder` | renderer → main | Open native folder picker |

---

## Building from Source

### Prerequisites

- Node.js 20+
- npm 10+

### macOS

```bash
npm install
npm run build:mac
# Output: dist-electron/
```

### Windows (run on a Windows machine or in CI)

```bash
npm install
npm run build:win
# Output: dist-electron/gfx-distributor-1.0.0-setup.exe
```

### Run tests

```bash
npm test
```
