import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config) => ipcRenderer.invoke('config:save', config),
    exportConfig: () => ipcRenderer.invoke('config:export'),
    importConfig: () => ipcRenderer.invoke('config:import'),
  },
  ffmpeg: {
    getDuration: (filePath) => ipcRenderer.invoke('ffmpeg:get-duration', filePath),
    extractFrame: (filePath, seconds) => ipcRenderer.invoke('ffmpeg:extract-frame', filePath, seconds),
  },
  send: {
    execute: (params) => ipcRenderer.invoke('send:execute', params),
    onProgress: (callback) => {
      ipcRenderer.removeAllListeners('send:progress')
      ipcRenderer.on('send:progress', (_, data) => callback(data))
    },
    removeProgressListeners: () => ipcRenderer.removeAllListeners('send:progress'),
  },
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
    openFile: (filters) => ipcRenderer.invoke('dialog:open-file', filters),
    saveFile: (filters) => ipcRenderer.invoke('dialog:save-file', filters),
  },
  navigation: {
    onGoAdmin: (callback) => ipcRenderer.on('nav:admin', callback),
    onGoMain: (callback) => ipcRenderer.on('nav:main', callback),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('nav:admin')
      ipcRenderer.removeAllListeners('nav:main')
    }
  }
})
