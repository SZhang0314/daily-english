import { useState } from 'react'
import ArticlePage from './pages/ArticlePage.jsx'
import MediaPage from './pages/MediaPage.jsx'
import PracticePage from './pages/PracticePage.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { hasKey } from './lib/deepseek'

const TABS = [
  { id: 'article', label: '每日文章' },
  { id: 'media', label: '音视频' },
  { id: 'practice', label: 'AI 对练' },
]

export default function App() {
  const [tab, setTab] = useState('article')
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">Daily English</span>
        <nav className="nav">
          {TABS.map((t) => (
            <a key={t.id} href="#" className={tab === t.id ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); setTab(t.id) }}>
              {t.label}
            </a>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="muted small zh" title="API Key 状态">
            {hasKey() ? '已配置 Key' : '未配置 Key'}
          </span>
          <button className="ghost" onClick={() => setShowSettings(true)}>
            <span className="zh">设置</span>
          </button>
        </div>
      </header>

      {tab === 'article' && <ArticlePage />}
      {tab === 'media' && <MediaPage />}
      {tab === 'practice' && <PracticePage />}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}