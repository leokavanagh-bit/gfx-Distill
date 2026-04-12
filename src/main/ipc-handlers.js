import { ipcMain, dialog } from 'electron'
import { loadConfig, saveConfig, exportConfig, importConfig } from './config-manager.js'
import { getDuration, extractFrame } from './ffmpeg.js'
import { executeSend } from './send-orchestrator.js'
import { scanVideo } from './vetter.js'

function getWindow(win) {
  return win && !win.isDestroyed() ? win : null
}

export function registerIpcHandlers(mainWindow) {
  ipcMain.handle('config:load', () => loadConfig())

  ipcMain.handle('config:save', (_, config) => saveConfig(config))

  ipcMain.handle('config:export', async () => {
    const { filePath } = await dialog.showSaveDialog(getWindow(mainWindow), {
      title: 'Export Config',
      defaultPath: 'config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!filePath) return null
    const config = await loadConfig()
    await exportConfig(filePath, config)
    return filePath
  })

  ipcMain.handle('config:import', async () => {
    const { filePaths } = await dialog.showOpenDialog(getWindow(mainWindow), {
      title: 'Import Config',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (!filePaths.length) return null
    return importConfig(filePaths[0])
  })

  ipcMain.handle('ffmpeg:get-duration', (_, filePath) => getDuration(filePath))

  ipcMain.handle('ffmpeg:extract-frame', (_, filePath, seconds) => extractFrame(filePath, seconds))

  ipcMain.handle('dialog:open-folder', async () => {
    const { filePaths } = await dialog.showOpenDialog(getWindow(mainWindow), {
      properties: ['openDirectory'],
    })
    return filePaths[0] ?? null
  })

  ipcMain.handle('dialog:open-file', async (_, filters) => {
    const { filePaths } = await dialog.showOpenDialog(getWindow(mainWindow), {
      filters,
      properties: ['openFile'],
    })
    return filePaths[0] ?? null
  })

  ipcMain.handle('dialog:save-file', async (_, filters) => {
    const { filePath } = await dialog.showSaveDialog(getWindow(mainWindow), { filters })
    return filePath ?? null
  })

  ipcMain.handle('send:execute', async (event, params) => {
    await executeSend(params, (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('send:progress', progress)
      }
    })
  })

  ipcMain.handle('vet:scan', (_, filePath) => scanVideo(filePath))
}
