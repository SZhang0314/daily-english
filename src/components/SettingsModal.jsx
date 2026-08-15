import { useState } from 'react'
import { getSettings, saveSettings } from '../lib/deepseek'

const PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  { id: 'moonshot', name: '月之暗面 Kimi', baseUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
  { id: 'qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode', model: 'qwen-plus' },
  { id: 'zhipu', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas', model: 'glm-4-flash' },
  { id: 'custom', name: '自定义', baseUrl: '', model: '' },
]

export default function SettingsModal({ onClose }) {
  const [s, setS] = useState(getSettings())
  const [showKey, setShowKey] = useState(false)
  const [provider, setProvider] = useState(detectProvider(s))

  const selectProvider = (p) => {
    setProvider(p.id)
    setS({ ...s, baseUrl: p.baseUrl, model: p.model })
  }

  const save = () => {
    saveSettings(s)
    onClose?.()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div className="card" style={{ width: 480, maxWidth: '92vw', background: '#fff' }}
        onClick={(e) => e.stopPropagation()}>
        <h2 className="zh">API 设置</h2>
        <div style={{ marginBottom: 12 }}>
          <div className="label">服务商</div>
          <select value={provider}
            onChange={(e) => selectProvider(PROVIDERS.find((p) => p.id === e.target.value))}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="label">API Key（保存在本机浏览器）</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={s.apiKey}
              placeholder="sk-..."
              onChange={(e) => setS({ ...s, apiKey: e.target.value })}
            />
            <button type="button" className="ghost" onClick={() => setShowKey(!showKey)}>
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="label">接口地址 Base URL</div>
          <input value={s.baseUrl}
            onChange={(e) => setS({ ...s, baseUrl: e.target.value })} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="label">模型</div>
          <input value={s.model}
            onChange={(e) => setS({ ...s, model: e.target.value })} />
        </div>
        <div className="notice small zh">
          Key 仅存储于你本机 localStorage，不会上传到服务器。可选择 DeepSeek、OpenAI、Kimi、通义、智谱等任意 OpenAI 兼容接口服务商。
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" className="primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}

function detectProvider(s) {
  const base = (s?.baseUrl || '').toLowerCase()
  for (const p of PROVIDERS) {
    if (p.id !== 'custom' && base.includes(p.baseUrl.toLowerCase().replace('https://', ''))) return p.id
  }
  return 'custom'
}