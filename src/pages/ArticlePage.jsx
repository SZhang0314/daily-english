import { useState } from 'react'
import { analyzeArticle } from '../lib/article.js'
import { hasKey } from '../lib/deepseek.js'
import {
  LevelTag, WordBank, SummaryTable, HighlightedText, WordDetail,
} from '../components/Annotation.jsx'

const SOURCES = ['China Daily', 'The Guardian', 'National Geographic', 'The New York Times', 'The Economist', 'Nature', 'Science', '本地上传 / 粘贴']

export default function ArticlePage() {
  const [source, setSource] = useState('本地上传 / 粘贴')
  const [target, setTarget] = useState('IELTS')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activeWord, setActiveWord] = useState(null)
  const [showTranslation, setShowTranslation] = useState(true)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'pdf') {
      setError('PDF 解析需要在本地工具（如 pdf 转文本）处理后粘贴，或上传 .txt/.md/.html 纯文本。')
      return
    }
    const text = await file.text().catch(() => '')
    setContent(text)
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
  }

  const run = async () => {
    if (!content.trim()) { setError('请先输入或上传文章内容。'); return }
    if (!hasKey()) { setError('请先在右上角「设置」中填写 API Key。'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await analyzeArticle({ title, content, target })
      setResult(r)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const sentences = result?.sentences || []
  const longSentences = sentences.filter((s) => s.long)
  const words = result?.words || []

  return (
    <div>
      <div className="section-title zh">每日英文文章精读</div>
      <p className="muted small zh">
        来源包括 China Daily、The Guardian、National Geographic、The New York Times、The Economist、Nature、Science 及其子刊；
        可人工粘贴或上传 .txt / .md / .html。翻译、重点词与长难句注释、雅思/托福词汇分级、文末词汇总结由 AI 生成。
      </p>

      <div className="card">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ minWidth: 220 }}>
            <div className="label zh">来源</div>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 160 }}>
            <div className="label zh">目标考试</div>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="IELTS">雅思 IELTS</option>
              <option value="TOEFL">托福 TOEFL</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="label zh">标题（可留空）</div>
            <input value={title} placeholder="Article title"
              onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="label zh">文章内容（粘贴英文原文）</div>
          <textarea value={content} rows={8} placeholder="Paste the article text here..."
            onChange={(e) => setContent(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="label zh" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            上传文件
            <input type="file" accept=".txt,.md,.html,.htm" onChange={handleFile}
              style={{ width: 'auto' }} />
          </label>
          <button className="primary" onClick={run} disabled={loading}>
            {loading ? <><span className="spinner" />分析中…</> : '开始精读'}
          </button>
        </div>

        {error && <div className="error zh">{error}</div>}
      </div>

      {result && (
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h1>{result.title || title}</h1>
                {result.titleZh && <div className="muted zh" style={{ fontSize: 13 }}>{result.titleZh}</div>}
              </div>
              <div>
                <label className="label zh" style={{ marginRight: 6 }}>
                  <input type="checkbox" checked={showTranslation}
                    onChange={(e) => setShowTranslation(e.target.checked)}
                    style={{ width: 'auto', verticalAlign: 'middle', marginRight: 4 }} />
                  显示译文
                </label>
              </div>
            </div>

            <hr className="divider" />

            {showTranslation && result.translation && (
              <div className="tooltip-note zh" style={{ marginBottom: 16 }}>
                <div className="label zh" style={{ marginBottom: 6 }}>全文翻译</div>
                {result.translation.split(/\n{2,}/).map((p, i) => <p key={i} style={{ marginBottom: 8 }}>{p}</p>)}
              </div>
            )}

            <div className="label zh" style={{ marginBottom: 6 }}>原文（点击高亮词查看注释）</div>
            <HighlightedText text={content} words={words} onWord={setActiveWord} />
            {activeWord && <WordDetail word={activeWord} onClose={() => setActiveWord(null)} />}
          </div>

          {longSentences.length > 0 && (
            <div className="card">
              <div className="section-title zh" style={{ marginTop: 0 }}>长难句解析</div>
              {longSentences.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontStyle: 'italic' }}>{s.text}</div>
                  <div className="zh muted">{s.translation}</div>
                  {s.analysis && <div className="tooltip-note zh">{s.analysis}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="section-title zh" style={{ marginTop: 0 }}>重点词汇与注释</div>
            {words.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th className="zh">词汇 / 短语</th>
                    <th className="zh">音标</th>
                    <th className="zh">词性</th>
                    <th className="zh">释义</th>
                    <th className="zh">分类</th>
                    <th className="zh">用法 / 易错点</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((w, i) => (
                    <tr key={i}>
                      <td><b>{w.word}</b></td>
                      <td>{w.phonetic}</td>
                      <td>{w.pos}</td>
                      <td className="zh">{w.meaningZh}</td>
                      <td><LevelTag level={w.level} /></td>
                      <td className="zh">{w.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted zh">暂未提取到重点词汇。</p>}
          </div>

          {(result.summary?.ielts?.length || result.summary?.toefl?.length) ? (
            <div className="card">
              <div className="section-title zh" style={{ marginTop: 0 }}>文末词汇总结</div>
              <SummaryTable summary={result.summary} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}