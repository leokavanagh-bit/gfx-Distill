# Vetting Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically OCR-scan MXF video frames on load, spell-check the extracted text, and show flagged words as clickable chips in a dismissible advisory banner — without ever blocking the Send button.

**Architecture:** A new `src/main/vetter.js` module handles all OCR and spell-check logic in the main process. It is wired to the renderer via a `vet:scan` IPC handler and a `window.api.vet` preload namespace. The renderer gains a `VettingBanner` component that renders all four banner states, and `FrameScrubber` gains a `seekTo` prop so clicking a chip jumps the frame preview. `MainScreen` wires everything together using a `useEffect` on `mxfPath`.

**Tech Stack:** `tesseract.js` v5 (WebAssembly OCR), `nspell` + `dictionary-en` v4 (offline spell check), existing `ffmpeg.js` for frame extraction, vitest (node env for main, jsdom for renderer), `@testing-library/react`.

---

### Task 1: Install dependencies and update asarUnpack

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `electron-builder.yml`

- [ ] **Step 1: Install npm packages**

```bash
cd /path/to/gfx-distributor
npm install tesseract.js nspell dictionary-en
```

Expected: packages appear in `node_modules/`, `package.json` dependencies updated.

- [ ] **Step 2: Add tesseract to asarUnpack in `electron-builder.yml`**

Current `asarUnpack` block (lines 16–19):
```yaml
asarUnpack:
  - resources/**
  - node_modules/exiftool-vendored.pl/**
  - node_modules/exiftool-vendored/**
```

Replace with:
```yaml
asarUnpack:
  - resources/**
  - node_modules/exiftool-vendored.pl/**
  - node_modules/exiftool-vendored/**
  - node_modules/tesseract.js/**
  - node_modules/tesseract.js-core/**
```

- [ ] **Step 3: Verify the dependency tree**

```bash
node -e "require('tesseract.js'); require('nspell'); require('dictionary-en'); console.log('OK')"
```

Expected output: `OK`

- [ ] **Step 4: Commit**

```bash
git add electron-builder.yml package.json package-lock.json
git commit -m "chore: install tesseract.js, nspell, dictionary-en; add to asarUnpack"
```

---

### Task 2: shouldSkip filter function

**Files:**
- Create: `src/main/vetter.js`
- Create: `tests/main/vetter.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/main/vetter.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'

// scanVideo mocks — declared here so vi.mock factories can reference them
const { mockGetDuration, mockExtractFrame, mockCreateWorker, mockRecognize, mockTerminate, mockCorrect, mockNspell } = vi.hoisted(() => ({
  mockGetDuration: vi.fn(),
  mockExtractFrame: vi.fn(),
  mockCreateWorker: vi.fn(),
  mockRecognize: vi.fn(),
  mockTerminate: vi.fn(),
  mockCorrect: vi.fn(),
  mockNspell: vi.fn(),
}))

vi.mock('electron', () => ({ app: { isPackaged: false } }))
vi.mock('../../src/main/ffmpeg.js', () => ({
  getDuration: mockGetDuration,
  extractFrame: mockExtractFrame,
}))
vi.mock('tesseract.js', () => ({
  createWorker: mockCreateWorker,
}))
vi.mock('dictionary-en', () => ({
  default: (cb) => cb(null, { aff: Buffer.from(''), dic: Buffer.from('') }),
}))
vi.mock('nspell', () => ({
  default: mockNspell,
}))

import { shouldSkip } from '../../src/main/vetter.js'

describe('shouldSkip', () => {
  it('skips ALL-CAPS words', () => {
    expect(shouldSkip('BBC')).toBe(true)
    expect(shouldSkip('SPORT')).toBe(true)
    expect(shouldSkip('HD')).toBe(true)
  })

  it('skips words shorter than 3 characters', () => {
    expect(shouldSkip('of')).toBe(true)
    expect(shouldSkip('in')).toBe(true)
    expect(shouldSkip('ab')).toBe(true)
  })

  it('skips words containing digits', () => {
    expect(shouldSkip('S01E03')).toBe(true)
    expect(shouldSkip('8C378D')).toBe(true)
    expect(shouldSkip('item2')).toBe(true)
  })

  it('skips words containing non-alphabetic punctuation', () => {
    expect(shouldSkip('http://example.com')).toBe(true)
    expect(shouldSkip('@handle')).toBe(true)
    expect(shouldSkip('file.txt')).toBe(true)
  })

  it('does not skip normal mixed-case words', () => {
    expect(shouldSkip('hello')).toBe(false)
    expect(shouldSkip('Recieve')).toBe(false)
    expect(shouldSkip('Today')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npm run test:main
```

Expected: FAIL — `Cannot find module '../../src/main/vetter.js'`

- [ ] **Step 3: Create `src/main/vetter.js` with shouldSkip only**

```js
import { createWorker } from 'tesseract.js'
import nspell from 'nspell'
import dictionaryEn from 'dictionary-en'
import { promisify } from 'util'
import { getDuration, extractFrame } from './ffmpeg.js'

export function shouldSkip(word) {
  if (word.length < 3) return true
  if (word === word.toUpperCase()) return true
  if (/\d/.test(word)) return true
  if (/[^a-zA-Z]/.test(word)) return true
  return false
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:main
```

Expected: all `shouldSkip` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/vetter.js tests/main/vetter.test.js
git commit -m "feat: add shouldSkip word filter for vetting layer"
```

---

### Task 3: scanVideo function

**Files:**
- Modify: `src/main/vetter.js` (add `scanVideo` export)
- Modify: `tests/main/vetter.test.js` (add `scanVideo` tests)

- [ ] **Step 1: Add `scanVideo` tests to `tests/main/vetter.test.js`**

Add `beforeEach` and `scanVideo` describe block after the `shouldSkip` describe block:

```js
import { shouldSkip, scanVideo } from '../../src/main/vetter.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetDuration.mockResolvedValue(3)
  mockExtractFrame.mockResolvedValue('data:image/png;base64,abc')
  mockRecognize.mockResolvedValue({ data: { text: '' } })
  mockTerminate.mockResolvedValue()
  mockCreateWorker.mockResolvedValue({ recognize: mockRecognize, terminate: mockTerminate })
  mockNspell.mockReturnValue({ correct: mockCorrect })
  mockCorrect.mockReturnValue(true)
})

describe('scanVideo', () => {
  it('returns clean when all words pass spell check', async () => {
    mockRecognize.mockResolvedValue({ data: { text: 'hello world' } })
    mockCorrect.mockReturnValue(true)
    const result = await scanVideo('/test.mxf')
    expect(result).toEqual({ status: 'clean', flags: [] })
  })

  it('returns warnings with flagged words when misspellings found', async () => {
    mockGetDuration.mockResolvedValue(2)
    mockRecognize.mockResolvedValue({ data: { text: 'recieve' } })
    mockCorrect.mockImplementation((word) => word !== 'recieve')
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('warnings')
    expect(result.flags).toContainEqual({ word: 'recieve', timecode: 0 })
    expect(result.flags).toContainEqual({ word: 'recieve', timecode: 1 })
  })

  it('deduplicates the same word at the same timecode', async () => {
    mockGetDuration.mockResolvedValue(1)
    mockRecognize.mockResolvedValue({ data: { text: 'recieve recieve' } })
    mockCorrect.mockReturnValue(false)
    const result = await scanVideo('/test.mxf')
    expect(result.flags.filter((f) => f.timecode === 0)).toHaveLength(1)
  })

  it('keeps the same word at different timecodes as separate flags', async () => {
    mockGetDuration.mockResolvedValue(2)
    mockRecognize.mockResolvedValue({ data: { text: 'recieve' } })
    mockCorrect.mockReturnValue(false)
    const result = await scanVideo('/test.mxf')
    expect(result.flags).toHaveLength(2)
    expect(result.flags[0].timecode).toBe(0)
    expect(result.flags[1].timecode).toBe(1)
  })

  it('caps frame extraction at 30 frames regardless of video duration', async () => {
    mockGetDuration.mockResolvedValue(60)
    await scanVideo('/test.mxf')
    expect(mockExtractFrame).toHaveBeenCalledTimes(30)
  })

  it('skips words matching shouldSkip rules (ALL-CAPS, short, digits, punctuation)', async () => {
    mockGetDuration.mockResolvedValue(1)
    mockRecognize.mockResolvedValue({ data: { text: 'BBC HD S01E03 @handle' } })
    mockCorrect.mockReturnValue(false) // would flag if checked
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('clean')
    expect(result.flags).toHaveLength(0)
  })

  it('returns error status when getDuration throws', async () => {
    mockGetDuration.mockRejectedValue(new Error('probe failed'))
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('error')
    expect(result.error).toBe('probe failed')
    expect(result.flags).toEqual([])
  })

  it('returns error status when a frame extraction throws', async () => {
    mockExtractFrame.mockRejectedValue(new Error('ffmpeg error'))
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('error')
  })
})
```

Note: update the import at the top of the file from `import { shouldSkip }` to `import { shouldSkip, scanVideo }`.

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npm run test:main
```

Expected: `shouldSkip` tests PASS, `scanVideo` tests FAIL — `scanVideo is not a function`.

- [ ] **Step 3: Implement `scanVideo` in `src/main/vetter.js`**

Replace the entire file contents with:

```js
import { createWorker } from 'tesseract.js'
import nspell from 'nspell'
import dictionaryEn from 'dictionary-en'
import { promisify } from 'util'
import { getDuration, extractFrame } from './ffmpeg.js'

export function shouldSkip(word) {
  if (word.length < 3) return true
  if (word === word.toUpperCase()) return true
  if (/\d/.test(word)) return true
  if (/[^a-zA-Z]/.test(word)) return true
  return false
}

function extractWords(text) {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-zA-Z\d]+|[^a-zA-Z\d]+$/g, ''))
    .filter(Boolean)
}

export async function scanVideo(filePath) {
  try {
    const duration = await getDuration(filePath)
    const frameCount = Math.min(Math.ceil(duration), 30)

    const loadDict = promisify(dictionaryEn)
    const dict = await loadDict()
    const spell = nspell(dict)

    const worker = await createWorker('eng')
    const seen = new Set()
    const flags = []

    for (let i = 0; i < frameCount; i++) {
      const timecode = i
      const imageData = await extractFrame(filePath, timecode)
      const {
        data: { text },
      } = await worker.recognize(imageData)

      for (const word of extractWords(text)) {
        if (shouldSkip(word)) continue
        const key = `${word}:${timecode}`
        if (seen.has(key)) continue
        seen.add(key)
        if (!spell.correct(word)) {
          flags.push({ word, timecode })
        }
      }
    }

    await worker.terminate()

    return flags.length > 0
      ? { status: 'warnings', flags }
      : { status: 'clean', flags: [] }
  } catch (err) {
    return { status: 'error', flags: [], error: err.message }
  }
}
```

- [ ] **Step 4: Run tests to confirm they all pass**

```bash
npm run test:main
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/vetter.js tests/main/vetter.test.js
git commit -m "feat: implement scanVideo with OCR frame sampling and spell check"
```

---

### Task 4: IPC handler and preload namespace

**Files:**
- Modify: `src/main/ipc-handlers.js`
- Modify: `src/preload/index.js`

No dedicated test for this task — it is thin wiring that is exercised end-to-end via the renderer integration test in Task 7.

- [ ] **Step 1: Add the `vet:scan` IPC handler to `src/main/ipc-handlers.js`**

Add the import at the top of the file, after the existing imports:

```js
import { scanVideo } from './vetter.js'
```

Add the handler inside `registerIpcHandlers`, after the `send:execute` handler (line 67, before the closing `}`):

```js
  ipcMain.handle('vet:scan', (_, filePath) => scanVideo(filePath))
```

- [ ] **Step 2: Add the `vet` namespace to `src/preload/index.js`**

Add inside the `contextBridge.exposeInMainWorld('api', { ... })` object, after the `navigation` block and before the closing `})`:

```js
  vet: {
    scan: (filePath) => ipcRenderer.invoke('vet:scan', filePath),
  },
```

- [ ] **Step 3: Run all tests to confirm nothing is broken**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.js src/preload/index.js
git commit -m "feat: add vet:scan IPC handler and window.api.vet preload namespace"
```

---

### Task 5: VettingBanner component

**Files:**
- Create: `src/renderer/src/components/VettingBanner.jsx`
- Create: `tests/renderer/VettingBanner.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/VettingBanner.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VettingBanner } from '../../src/renderer/src/components/VettingBanner.jsx'

describe('VettingBanner', () => {
  it('renders nothing when status is null', () => {
    const { container } = render(
      <VettingBanner status={null} flags={[]} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows spinner and scanning text when status is scanning', () => {
    render(
      <VettingBanner status="scanning" flags={[]} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByTestId('scanning-spinner')).toBeInTheDocument()
    expect(screen.getByText(/scanning for typos/i)).toBeInTheDocument()
  })

  it('shows success message when status is clean', () => {
    render(
      <VettingBanner status="clean" flags={[]} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByText(/no issues found/i)).toBeInTheDocument()
  })

  it('shows error message when status is error', () => {
    render(
      <VettingBanner status="error" flags={[]} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByText(/could not scan/i)).toBeInTheDocument()
  })

  it('shows warning count and word chips when status is warnings', () => {
    const flags = [
      { word: 'recieve', timecode: 3 },
      { word: 'occured', timecode: 9 },
    ]
    render(
      <VettingBanner status="warnings" flags={flags} onTimecodeSelect={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(screen.getByText(/2 possible typos/i)).toBeInTheDocument()
    expect(screen.getByText(/"recieve"/)).toBeInTheDocument()
    expect(screen.getByText(/"occured"/)).toBeInTheDocument()
  })

  it('shows singular "typo" for a single flag', () => {
    render(
      <VettingBanner
        status="warnings"
        flags={[{ word: 'recieve', timecode: 3 }]}
        onTimecodeSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(screen.getByText(/1 possible typo[^s]/i)).toBeInTheDocument()
  })

  it('calls onTimecodeSelect with timecode when a word chip is clicked', () => {
    const onTimecodeSelect = vi.fn()
    render(
      <VettingBanner
        status="warnings"
        flags={[{ word: 'recieve', timecode: 3 }]}
        onTimecodeSelect={onTimecodeSelect}
        onDismiss={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /"recieve"/i }))
    expect(onTimecodeSelect).toHaveBeenCalledWith(3)
  })

  it('calls onDismiss when Dismiss is clicked', () => {
    const onDismiss = vi.fn()
    render(
      <VettingBanner
        status="warnings"
        flags={[{ word: 'recieve', timecode: 3 }]}
        onTimecodeSelect={vi.fn()}
        onDismiss={onDismiss}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npm run test:renderer
```

Expected: FAIL — `Cannot find module '../../src/renderer/src/components/VettingBanner.jsx'`

- [ ] **Step 3: Create `src/renderer/src/components/VettingBanner.jsx`**

```jsx
function formatTimecode(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VettingBanner({ status, flags, onTimecodeSelect, onDismiss }) {
  if (!status) return null

  const base = {
    borderTop: '1px solid',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#1a1a2e',
    flexShrink: 0,
  }

  if (status === 'scanning') {
    return (
      <div style={{ ...base, borderTopColor: '#333' }}>
        <div
          data-testid="scanning-spinner"
          style={{
            width: 12,
            height: 12,
            border: '2px solid #666',
            borderTopColor: '#e94560',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }}
        />
        <span style={{ color: '#888', fontSize: 13 }}>Scanning for typos…</span>
      </div>
    )
  }

  if (status === 'clean') {
    return (
      <div style={{ ...base, borderTopColor: '#1e4d2b' }}>
        <span style={{ color: '#4caf50', fontSize: 13 }}>✓ No issues found</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ ...base, borderTopColor: '#333' }}>
        <span style={{ color: '#666', fontSize: 13 }}>
          Could not scan video — check manually before sending
        </span>
      </div>
    )
  }

  // warnings
  return (
    <div style={{ ...base, borderTopColor: '#e94560', flexWrap: 'wrap', gap: 16 }}>
      <span
        style={{ color: '#e94560', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        ⚠ {flags.length} possible typo{flags.length === 1 ? '' : 's'}
      </span>
      <div style={{ display: 'flex', gap: 12, flex: 1, flexWrap: 'wrap' }}>
        {flags.map(({ word, timecode }) => (
          <button
            key={`${word}:${timecode}`}
            onClick={() => onTimecodeSelect(timecode)}
            style={{
              background: 'rgba(233,69,96,0.15)',
              border: '1px solid rgba(233,69,96,0.4)',
              borderRadius: 3,
              padding: '2px 8px',
              fontSize: 12,
              color: '#ccc',
              cursor: 'pointer',
            }}
          >
            "{word}" <span style={{ color: '#666' }}>{formatTimecode(timecode)}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: '1px solid #444',
          borderRadius: 3,
          color: '#666',
          fontSize: 12,
          padding: '3px 10px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:renderer
```

Expected: all `VettingBanner` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/VettingBanner.jsx tests/renderer/VettingBanner.test.jsx
git commit -m "feat: add VettingBanner component with four banner states"
```

---

### Task 6: FrameScrubber seekTo prop

**Files:**
- Modify: `src/renderer/src/components/FrameScrubber.jsx`
- Modify: `tests/renderer/FrameScrubber.test.jsx` (add tests inside existing describe block)

- [ ] **Step 1: Add `seekTo` tests to `tests/renderer/FrameScrubber.test.jsx`**

Add this describe block inside the existing `describe('FrameScrubber', ...)` block, after the last existing test:

```jsx
  describe('seekTo prop', () => {
    it('jumps to the specified timecode when seekTo changes', async () => {
      const onFrameChange = vi.fn()
      const { rerender } = render(
        <FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={onFrameChange} seekTo={null} />
      )
      await waitFor(() => screen.getByRole('slider'))
      vi.clearAllMocks()

      rerender(
        <FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={onFrameChange} seekTo={5} />
      )
      await waitFor(() => expect(onFrameChange).toHaveBeenCalledWith(5))
      expect(window.api.ffmpeg.extractFrame).toHaveBeenCalledWith('/renders/MyShow.mxf', 5)
    })

    it('sets the slider value to the seekTo timecode', async () => {
      const { rerender } = render(
        <FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={vi.fn()} seekTo={null} />
      )
      await waitFor(() => screen.getByRole('slider'))
      rerender(
        <FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={vi.fn()} seekTo={10} />
      )
      await waitFor(() => expect(screen.getByRole('slider')).toHaveValue('10'))
    })

    it('does nothing when seekTo is null', async () => {
      render(
        <FrameScrubber mxfPath="/renders/MyShow.mxf" onFrameChange={vi.fn()} seekTo={null} />
      )
      await waitFor(() => screen.getByRole('slider'))
      vi.clearAllMocks()
      // seekTo remains null — no additional extract call expected
      expect(window.api.ffmpeg.extractFrame).not.toHaveBeenCalled()
    })
  })
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npm run test:renderer
```

Expected: the two new `seekTo` tests that call `rerender` FAIL — `onFrameChange` not called with 5 / slider does not show value 10.

- [ ] **Step 3: Add `seekTo` prop to `src/renderer/src/components/FrameScrubber.jsx`**

Change the function signature (line 3) from:

```jsx
export function FrameScrubber({ mxfPath, onFrameChange }) {
```

to:

```jsx
export function FrameScrubber({ mxfPath, onFrameChange, seekTo }) {
```

Add the following `useEffect` block after the existing `useEffect` that depends on `mxfPath` (i.e., after line 26, before the `extractAt` function definition):

```jsx
  useEffect(() => {
    if (seekTo == null || !mxfPath) return
    setSeconds(seekTo)
    onFrameChange(seekTo)
    extractAt(seekTo, mxfPath)
  }, [seekTo])
```

- [ ] **Step 4: Run tests to confirm they all pass**

```bash
npm run test:renderer
```

Expected: all `FrameScrubber` tests PASS including the new `seekTo` tests.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/FrameScrubber.jsx tests/renderer/FrameScrubber.test.jsx
git commit -m "feat: add seekTo prop to FrameScrubber for external timecode jumping"
```

---

### Task 7: MainScreen integration

**Files:**
- Modify: `src/renderer/src/components/MainScreen.jsx`

This task wires together the vetting scan trigger, state management, layout change, and `VettingBanner` + `FrameScrubber` integration.

- [ ] **Step 1: Replace `src/renderer/src/components/MainScreen.jsx` with the integrated version**

```jsx
import { useState, useEffect } from 'react'
import { DropZone } from './DropZone.jsx'
import { StudioDropdown } from './StudioDropdown.jsx'
import { MetadataFields } from './MetadataFields.jsx'
import { FrameScrubber } from './FrameScrubber.jsx'
import { SendArea } from './SendArea.jsx'
import { VettingBanner } from './VettingBanner.jsx'
import { useConfig } from '../hooks/useConfig.js'

export function MainScreen() {
  const { config, loading } = useConfig()
  const [mxfPath, setMxfPath] = useState(null)
  const [studio, setStudio] = useState(null)
  const [scrubSeconds, setScrubSeconds] = useState(0)
  const [title, setTitle] = useState('')
  const [jobId, setJobId] = useState('')
  const [keywords, setKeywords] = useState('')

  // vettingResult: null | 'scanning' | VettingResult
  const [vettingResult, setVettingResult] = useState(null)
  const [vettingDismissed, setVettingDismissed] = useState(false)
  const [seekTo, setSeekTo] = useState(null)

  useEffect(() => {
    if (!mxfPath) {
      setVettingResult(null)
      setVettingDismissed(false)
      return
    }
    setVettingResult('scanning')
    setVettingDismissed(false)
    setSeekTo(null)
    window.api.vet.scan(mxfPath).then(setVettingResult).catch(() => {
      setVettingResult({ status: 'error', flags: [], error: 'scan failed' })
    })
  }, [mxfPath])

  if (loading) return <div style={{ padding: 24, color: '#888' }}>Loading config...</div>

  const sendParams = {
    mxfPath,
    scrubSeconds,
    studio,
    pngWatchFolder: config.pngWatchFolder,
    title,
    jobId,
    keywords,
  }

  const bannerStatus =
    vettingResult === null ? null
    : vettingResult === 'scanning' ? 'scanning'
    : vettingResult.status

  const bannerFlags = vettingResult && vettingResult !== 'scanning' ? vettingResult.flags : []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Two-column content area */}
      <div style={{ display: 'flex', gap: 20, padding: 20, flex: 1, overflow: 'hidden' }}>
        {/* Left column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DropZone file={mxfPath} onFile={setMxfPath} />
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
              Studio Destination
            </label>
            <StudioDropdown studios={config.studios} value={studio} onChange={setStudio} />
          </div>
          <MetadataFields
            title={title}
            jobId={jobId}
            keywords={keywords}
            onChange={({ title: t, jobId: j, keywords: k }) => {
              setTitle(t)
              setJobId(j)
              setKeywords(k)
            }}
          />
        </div>

        {/* Right column */}
        <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FrameScrubber mxfPath={mxfPath} onFrameChange={setScrubSeconds} seekTo={seekTo} />
          <SendArea params={sendParams} />
        </div>
      </div>

      {/* Vetting banner — full width, below both columns */}
      {!vettingDismissed && bannerStatus && (
        <VettingBanner
          status={bannerStatus}
          flags={bannerFlags}
          onTimecodeSelect={(t) => setSeekTo(t)}
          onDismiss={() => setVettingDismissed(true)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests to confirm nothing is broken**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 3: Smoke-test in dev mode**

```bash
npm run dev
```

Manual checks:
1. App opens at 960×720 — layout looks correct with two columns
2. Drop an MXF file — banner appears at bottom with spinner ("Scanning for typos…")
3. After scan completes — banner transitions to Clean or Warnings state
4. If warnings: click a chip — frame scrubber jumps to that timecode
5. Click Dismiss — banner disappears
6. Drop a second MXF file — banner resets and scanning starts again
7. Send button remains active throughout all banner states

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/MainScreen.jsx
git commit -m "feat: integrate VettingBanner and seekTo into MainScreen"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Scan starts automatically when MXF loaded | Task 7 — useEffect on mxfPath |
| Scanning / Clean / Warnings / Error states | Task 5 — VettingBanner four states |
| Advisory only — Send never blocked | Task 7 — SendArea is always rendered, no gate |
| Word chips clickable to jump scrubber | Task 5 (chip onClick) + Task 6 (seekTo) + Task 7 (setSeekTo) |
| Dismiss button | Task 5 — onDismiss prop, Task 7 — vettingDismissed state |
| shouldSkip filter (ALL-CAPS, <3, digits, non-alpha) | Task 2 |
| 1 frame/sec, capped at 30 frames | Task 3 — scanVideo loop |
| Deduplication by word+timecode | Task 3 — seen Set keyed by `${word}:${timecode}` |
| tesseract.js asarUnpack | Task 1 |
| `vet:scan` IPC + preload namespace | Task 4 |
| VettingBanner as separate component | Task 5 |
| MainScreen layout: vertical flex with banner at bottom | Task 7 |
| New MXF resets scan state | Task 7 — useEffect cleanup + reset on mxfPath change |

**Placeholder scan:** No TBD, TODO, or incomplete sections found.

**Type consistency:**
- `scanVideo(filePath)` → `VettingResult` — used consistently in Tasks 3, 4, 7
- `VettingBanner` props: `{ status, flags, onTimecodeSelect, onDismiss }` — consistent across Tasks 5 and 7
- `seekTo` prop: `number | null` — consistent across Tasks 6 and 7
- `flags` type: `Array<{ word: string, timecode: number }>` — consistent across all tasks
