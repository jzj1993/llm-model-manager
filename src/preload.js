const { contextBridge, ipcRenderer } = require('electron')
const hljs = require('highlight.js/lib/common')

contextBridge.exposeInMainWorld('electronAPI', {
  checkModel: (config) => ipcRenderer.invoke('check-model', config),
  highlightCode: (code, language) => {
    try {
      return hljs.highlight(code, { language }).value
    } catch (error) {
      return hljs.highlightAuto(code).value
    }
  }
})
