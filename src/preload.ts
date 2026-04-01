import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfigs: () => ipcRenderer.invoke('load-configs'),
  saveConfigs: (configs) => ipcRenderer.invoke('save-configs', configs),
  fetchHttp: (request) => ipcRenderer.invoke('fetch-http', request),
  openExternal: (target) => ipcRenderer.invoke('open-external', target),
  runCommandInTerminal: (command) => ipcRenderer.invoke('run-command-in-terminal', command),
  openHTMLWithScript: (script) => ipcRenderer.invoke('open-html-with-script', script)
})
