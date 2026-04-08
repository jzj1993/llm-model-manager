#!/usr/bin/env node
/**
 * 将 provider-presets.json 中每条供应商的顶层 baseUrl/endpoint 转为 apiConfigs 数组。
 */
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../../src/public/presets/provider-presets.json')
const data = JSON.parse(fs.readFileSync(file, 'utf8'))

function inferApiType(endpoint) {
  const e = String(endpoint || '').toLowerCase()
  if (e.includes('/messages')) return 'anthropic'
  return 'openai'
}

function convertProvider(p) {
  if (Array.isArray(p.apiConfigs)) return p
  return {
    id: p.id,
    name: p.name,
    apiConfigs: [
      {
        apiType: inferApiType(p.endpoint),
        baseUrl: p.baseUrl ?? '',
        endpoint: p.endpoint ?? ''
      }
    ]
  }
}

const providers = (data.providers || []).map(convertProvider)
const out = {
  providers,
  baseUrls: data.baseUrls || [],
  endpoints: data.endpoints || []
}

fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`)
console.log('Migrated', providers.length, 'providers')
