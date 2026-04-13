import '@testing-library/jest-dom'

// Mock the window.api bridge (filled in per test file)
window.api = {
  config: {},
  ffmpeg: {},
  send: {},
  dialog: {},
  getFilePath: (file) => file.path,
}
