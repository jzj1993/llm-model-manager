import hljs from 'highlight.js/lib/common'
import { marked } from 'marked'
import 'highlight.js/styles/github.min.css'

export function buildEnvCommandFromPayload(payloadText: string): string {
  const payload = JSON.parse(String(payloadText || '{}'))
  const vars = payload?.vars && typeof payload.vars === 'object' ? payload.vars : {}
  const entries = Object.entries(vars).filter(([key]) => /^[A-Z_][A-Z0-9_]*$/.test(String(key || '')))
  if (entries.length === 0) throw new Error('环境变量为空')
  const lines = entries.map(([key, value]) => `export ${key}=${JSON.stringify(String(value ?? ''))}`)
  return lines.join('\n')
}

export function getRenderLanguageFromType(type?: string | null): string {
  if (type === 'command') return 'bash'
  if (type === 'env') return 'bash'
  if (type === 'deeplink') return 'plaintext'
  if (type === 'json') return 'json'
  if (type === 'markdown') return 'markdown'
  if (type === 'bash') return 'bash'
  if (type === 'javascript') return 'javascript'
  return 'plaintext'
}

export function getActionButtonText(type?: string | null): string {
  if (type === 'command' || type === 'env') return '在命令行运行'
  if (type === 'deeplink') return '调起应用'
  if (type === 'javascript') return '在浏览器运行'
  return '运行'
}

export function isRunnableType(type?: string | null): boolean {
  return type === 'command' || type === 'env' || type === 'deeplink' || type === 'javascript'
}

export function renderMarkdownWithHighlight(markdown: string): string {
  const renderer = new marked.Renderer()
  renderer.code = ((...args: any[]) => {
    let code = ''
    let lang = ''
    if (args[0] && typeof args[0] === 'object') {
      code = String(args[0].text ?? '')
      lang = String(args[0].lang ?? '')
    } else {
      code = String(args[0] ?? '')
      lang = String(args[1] ?? '')
    }
    let html = ''
    try {
      html = lang ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value
    } catch {
      html = hljs.highlightAuto(code).value
    }
    const className = lang ? `language-${lang}` : 'language-plaintext'
    return `<pre class="hljs ${className}"><code>${html}</code></pre>`
  }) as any
  return String(marked.parse(markdown, { renderer } as any))
}
