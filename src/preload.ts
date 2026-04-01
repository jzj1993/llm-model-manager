import { contextBridge, ipcRenderer } from 'electron'
import hljs from 'highlight.js/lib/common'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false
})

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfigs: () => ipcRenderer.invoke('load-configs'),
  saveConfigs: (configs) => ipcRenderer.invoke('save-configs', configs),
  checkModel: (config) => ipcRenderer.invoke('check-model', config),
  detectModelCapabilities: (config) => ipcRenderer.invoke('detect-model-capabilities', config),
  openExternal: (target) => ipcRenderer.invoke('open-external', target),
  runCommandInTerminal: (command) => ipcRenderer.invoke('run-command-in-terminal', command),
  openHTMLWithScript: (script) => ipcRenderer.invoke('open-html-with-script', script),
  highlightCode: (code, language) => {
    try {
      return hljs.highlight(code, { language }).value
    } catch (error) {
      return hljs.highlightAuto(code).value
    }
  },
  renderMarkdown: async (markdown) => {
    const source = String(markdown || '')
    const rendered = marked.parse(source)
    return String(rendered).replace(
      /<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g,
      (match, language, encodedCode) => {
        const plain = encodedCode
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
        try {
          const highlighted = language
            ? hljs.highlight(plain, { language }).value
            : hljs.highlightAuto(plain).value
          return `<pre><code class="hljs language-${language || 'plaintext'}">${highlighted}</code></pre>`
        } catch (error) {
          return `<pre><code class="hljs">${hljs.highlightAuto(plain).value}</code></pre>`
        }
      }
    )
  }
})
