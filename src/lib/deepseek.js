const DEFAULT_BASE = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'

export function getSettings() {
  try {
    const raw = localStorage.getItem('de_settings')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { baseUrl: DEFAULT_BASE, apiKey: '', model: DEFAULT_MODEL }
}

export function saveSettings(s) {
  localStorage.setItem('de_settings', JSON.stringify(s))
}

export function hasKey() {
  return Boolean(getSettings().apiKey)
}

export async function chat(messages, { stream = false, onDelta } = {}) {
  const { baseUrl, apiKey, model } = getSettings()
  if (!apiKey) throw new Error('未配置 API Key，请在右上角「设置」中填写。')

  const base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, '')
  const url = base.includes('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages,
      temperature: 0.3,
      stream,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`请求失败 (${resp.status}): ${text.slice(0, 300)}`)
  }

  if (!stream) {
    const data = await resp.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const payload = t.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const json = JSON.parse(payload)
        const delta = json.choices?.[0]?.delta?.content
        if (delta && onDelta) onDelta(delta)
      } catch { /* partial chunk */ }
    }
  }
}

export function jsonFrom(text) {
  const t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  const cleaned = fence ? fence[1] : t
  return JSON.parse(cleaned)
}