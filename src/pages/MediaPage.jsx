import { useState, useEffect, useRef } from 'react'
import { analyzeTranscript } from '../lib/transcript.js'
import { hasKey } from '../lib/deepseek.js'
import {
  LevelTag, SummaryTable, WordDetail,
} from '../components/Annotation.jsx'

const SOURCES = ['TED', 'VOA', 'BBC', 'CNN', '脱口秀 / 访谈', '本地上传']

export default function MediaPage() {
  const [source, setSource] = useState('本地上传')
  const [target, setTarget] = useState('IELTS')
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [showEn, setShowEn] = useState(true)
  const [showZh, setShowZh] = useState(true)
  const [activeWord, setActiveWord] = useState(null)

  // 浏览器语音识别（口语转录字幕）
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const [recognitionSupported] = useState(() =>
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition))

  const toggleListening = () => {
    if (!recognitionSupported) { setError('当前浏览器不支持语音识别（建议使用 Chrome/Edge）。'); return }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (event) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' '
      }
      if (final) setTranscript((t) => (t ? t + ' ' : '') + final.trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = (e) => { setError(`语音识别错误：${e.error}`); setListening(false) }
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      setError('音视频转录：当前方案使用浏览器语音识别。请在浏览器播放音视频的同时点击「开始转录录音」，或将字幕文本粘贴到下方文本框。')
    } else {
      const text = await file.text().catch(() => '')
      setTranscript(text)
    }
  }

  const run = async () => {
    if (!transcript.trim()) { setError('请先粘贴字幕文本或通过录音获得转录文本。'); return }
    if (!hasKey()) { setError('请先在右上角「设置」中填写 API Key。'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await analyzeTranscript({ transcript, target })
      setResult(r)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const words = result?.words || []
  const sentences = result?.sentences || []

  return (
    <div>
      <div className="section-title zh">音视频听说训练</div>
      <p className="muted small zh">
        来源包括 TED、VOA、BBC、CNN、脱口秀等，每周更新。上传音视频后用浏览器语音识别转录，或粘贴字幕；
        AI 生成重点词与长难句注释、雅思/托福词汇分级、文末词汇总结；下方字幕支持中英文独立开关。
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
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <label className="label zh" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            上传音视频 / 字幕
            <input type="file" accept="audio/*,video/*,.txt,.srt,.vtt,.md"
              onChange={handleFile} style={{ width: 'auto' }} />
          </label>
          {recognitionSupported && (
            <button onClick={toggleListening} disabled={loading}>
              {listening ? <><span className="spinner" />停止转录</> : '开始转录录音'}
            </button>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="label zh">字幕 / 转录文本（中英均可）</div>
          <textarea value={transcript} rows={7}
            placeholder="粘贴字幕，或点击「开始转录录音」边播放边识别..."
            onChange={(e) => setTranscript(e.target.value)} />
        </div>

        <button className="primary" onClick={run} disabled={loading}>
          {loading ? <><span className="spinner" />分析中…</> : '分析字幕 / 生成注释'}
        </button>

        {error && <div className="error zh">{error}</div>}
      </div>

      {result && (
        <div>
          <div className="card">
            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              <label className="label zh">
                <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)}
                  style={{ width: 'auto', verticalAlign: 'middle', marginRight: 4 }} />英文
              </label>
              <label className="label zh">
                <input type="checkbox" checked={showZh} onChange={(e) => setShowZh(e.target.checked)}
                  style={{ width: 'auto', verticalAlign: 'middle', marginRight: 4 }} />中文
              </label>
            </div>

            <div className="subtitle-track">
              {sentences.length > 0 ? sentences.map((s, i) => (
                <div key={i} className="subtitle-line">
                  {showEn && <span style={{ flex: 1 }}>{s.text}</span>}
                  {showZh && <span className="zh muted" style={{ flex: 1 }}>{s.translation}</span>}
                </div>
              )) : (
                <div className="muted zh">字幕将按句展示；可关闭中/英任意一栏。</div>
              )}
            </div>

            {sentences.some((s) => s.long) && (
              <div style={{ marginTop: 14 }}>
                <div className="label zh" style={{ marginBottom: 6 }}>长难句解析</div>
                {sentences.filter((s) => s.long).map((s, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontStyle: 'italic' }}>{s.text}</div>
                    <div className="zh muted">{s.translation}</div>
                    {s.analysis && <div className="tooltip-note zh">{s.analysis}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-title zh" style={{ marginTop: 0 }}>重点词汇与注释</div>
            {words.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th className="zh">词汇</th><th className="zh">音标</th><th className="zh">词性</th>
                    <th className="zh">释义</th><th className="zh">分类</th><th className="zh">用法</th>
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
            ) : <p className="muted zh">暂未提取。</p>}
            {activeWord && <WordDetail word={activeWord} onClose={() => setActiveWord(null)} />}
          </div>

          <div className="card">
            <div className="section-title zh" style={{ marginTop: 0 }}>文末词汇总结</div>
            <SummaryTable summary={result.summary} />
          </div>
        </div>
      )}
    </div>
  )
}