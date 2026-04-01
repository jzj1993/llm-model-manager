import 'highlight.js/styles/github.min.css'
import hljs from 'highlight.js/lib/common'
import { marked } from 'marked'

import '../exporters/common'
import { exporters, getExporterById } from '../exporters/index'

import presetsHelper from '../presets-helper.ts?raw'

import rendererState from './state.ts?raw'
import rendererUtils from './utils.ts?raw'
import rendererCombobox from './combobox.ts?raw'
import rendererDataExport from './data-export.ts?raw'
import rendererInteractions from './interactions.ts?raw'
import rendererModals from './modals.ts?raw'
import rendererBootstrap from './render-bootstrap.ts?raw'

const scripts = [
  presetsHelper,
  rendererState,
  rendererUtils,
  rendererCombobox,
  rendererDataExport,
  rendererInteractions,
  rendererModals,
  rendererBootstrap
]

Object.assign(window, {
  exporters,
  getExporterById,
  highlightCode: (code: string, language: string) => {
    try {
      return hljs.highlight(String(code || ''), { language: String(language || 'plaintext') }).value
    } catch (error) {
      return hljs.highlightAuto(String(code || '')).value
    }
  },
  renderMarkdown: (markdown: string) => String(marked.parse(String(markdown || '')))
})

for (const [index, code] of scripts.entries()) {
  const script = document.createElement('script')
  script.textContent = `${code}\n//# sourceURL=runtime-script-${index}.js`
  document.head.appendChild(script)
  script.remove()
}
