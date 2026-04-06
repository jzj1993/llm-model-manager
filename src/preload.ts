import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type ElectronAPI, type FetchHttpRequest } from './shared/ipc'
import type { ProviderConfig } from './shared/types'

const electronAPI: ElectronAPI = {
  loadConfigs: () => ipcRenderer.invoke(IPC_CHANNELS.loadConfigs),
  saveConfigs: (configs: ProviderConfig[]) => ipcRenderer.invoke(IPC_CHANNELS.saveConfigs, configs),
  fetchHttp: (request: FetchHttpRequest) => ipcRenderer.invoke(IPC_CHANNELS.fetchHttp, request),
  openExternal: (target: string) => ipcRenderer.invoke(IPC_CHANNELS.openExternal, target),
  runCommandInTerminal: (command: string) => ipcRenderer.invoke(IPC_CHANNELS.runCommandInTerminal, command),
  openHTMLWithScript: (script: string) => ipcRenderer.invoke(IPC_CHANNELS.openHTMLWithScript, script)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
