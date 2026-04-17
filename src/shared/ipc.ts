import type { ProviderConfig } from './types'

export const IPC_CHANNELS = {
  loadConfigs: 'load-configs',
  saveConfigs: 'save-configs',
  fetchHttp: 'fetch-http',
  openExternal: 'open-external',
  runCommandInTerminal: 'run-command-in-terminal',
  openHTMLWithScript: 'open-html-with-script'
} as const

export interface FetchHttpRequest {
  url: string
  headers?: Record<string, string>
  method?: string
  body?: string
  timeoutMs?: number
}

export interface FetchHttpExchange {
  request: {
    url: string
    method: string
    headers: Record<string, string>
    body: string | null
  }
  response?: {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
  }
  error?: string
}

export type FetchHttpResponse =
  | { ok: true; status: number; statusText: string; body: string; headers?: Record<string, string>; exchange?: FetchHttpExchange }
  | { ok: false; error: string; exchange?: FetchHttpExchange }

export interface SaveResult {
  success: boolean
  message?: string
}

export interface ElectronAPI {
  loadConfigs(): Promise<ProviderConfig[]>
  saveConfigs(configs: ProviderConfig[]): Promise<SaveResult>
  fetchHttp(request: FetchHttpRequest): Promise<FetchHttpResponse>
  openExternal(target: string): Promise<boolean>
  runCommandInTerminal(command: string): Promise<SaveResult>
  openHTMLWithScript(script: string): Promise<SaveResult>
}
