import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfigs: () => ipcRenderer.invoke('load-configs'),
  saveConfigs: (configs) => ipcRenderer.invoke('save-configs', configs),
  checkModel: (config) => ipcRenderer.invoke('check-model', config),
  detectModelCapabilities: (config) => ipcRenderer.invoke('detect-model-capabilities', config),
  openExternal: (target) => ipcRenderer.invoke('open-external', target),
  runCommandInTerminal: (command) => ipcRenderer.invoke('run-command-in-terminal', command),
  openHTMLWithScript: (script) => ipcRenderer.invoke('open-html-with-script', script)
})
