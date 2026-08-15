import { useState, useRef } from 'react'
import { practice, SPEAKING_TOPICS, WRITING_TOPICS } from '../lib/practice.js'
import { hasKey } from '../lib/deepseek.js'

export default function PracticePage() {
  const [exam, setExam] = useState('IELTS')
  const [skill, setSkill] = useState('speaking')
  const [topic, setTopic] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // 口语录音
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const recognitionSupported =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

  const topics = skill === 'speaking' ? SPEAKING_TOPICS[exam] : WRITING_TOPICS[exam]

  const pickTopic = () => {
    const t = topics[Math.floor(Math.random() * topics.length)]
    setTopic(t)
  }

  const toggleRecord = () => {
    if (!recognitionSupported) { setError('当前浏览器不支持语音识别（建议 Chrome/Edge）。'); return }
    if (listening) { recRef.current?.stop(); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      let out = ''
      for (let i = 0; i < e.results.length; i++) out += e.results[i][0].transcript + ' '
      setAnswer((a) => (a ? a + ' ' : '') + out.trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = (e) => { setError(`录音识别错误：${e.error}`); setListening(false) }
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  const run = async () => {
    if (!topic) { setError('请先选题。'); return }
    if (!answer.trim()) { setError('请先输入或录音作答。'); return }
    if (!hasKey()) { setError('请先在右上角「设置」中填写 API Key。'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await practice({ exam, skill, topic, answer })
      setResult(r)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const crit = result?.criteria || {}

  return (
    <div>
      <div className="section-title zh">AI 口语 · 写作对练</div>
      <p className="muted small zh">
        模拟雅思（IELTS）与托福（TOEFL）两种模式；AI 模拟考官打分并给出分项评分与提升建议。
        口语支持浏览器录音识别，写作为文本作答。
      </p>

      <div className="card">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={exam === 'IELTS' ? 'primary' : ''} onClick={() => { setExam('IELTS'); setTopic(''); setResult(null) }}>
              雅思 IELTS
            </button>
            <button className={exam === 'TOEFL' ? 'primary' : ''} onClick={() => { setExam('TOEFL'); setTopic(''); setResult(null) }}>
              托福 TOEFL
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={skill === 'speaking' ? 'primary' : ''} onClick={() => { setSkill('speaking'); setTopic(''); setResult(null) }}>口语</button>
            <button className={skill === 'writing' ? 'primary' : ''} onClick={() => { setSkill('writing'); setTopic(''); setResult(null) }}>写作</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <button onClick={pickTopic}>随机抽题</button>
          {topic && <span className="tag" style={{ whiteSpace: 'normal' }}>{topic}</span>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="label zh">{skill === 'speaking' ? '口语作答（可录音）' : '写作作答'}</div>
          <textarea value={answer} rows={7}
            placeholder={skill === 'speaking' ? '点击「录音」说出你的回答，或直接输入文字...' : '输入你的作文...'}
            onChange={(e) => setAnswer(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {skill === 'speaking' && recognitionSupported && (
            <button onClick={toggleRecord} disabled={loading}>
              {listening ? <><span className="spinner" />停止录音</> : '录音'}
            </button>
          )}
          <button className="primary" onClick={run} disabled={loading}>
            {loading ? <><span className="spinner" />评分中…</> : '模拟评分'}
          </button>
        </div>

        {error && <div className="error zh">{error}</div>}
      </div>

      {result && (
        <div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <span className="label zh">得分</span>
                <div style={{ fontSize: 30, fontFamily: 'var(--font-en)' }}>
                  {result.band}
                </div>
              </div>
              <div className="zh" style={{ fontSize: 14 }}>{result.bandLabel}</div>
            </div>

            {Object.keys(crit).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="label zh" style={{ marginBottom: 6 }}>分项评分</div>
                <table style={{ maxWidth: 420 }}>
                  <thead>
                    <tr>{Object.keys(crit).map((k) => <th key={k} className="zh">{labelOf(k)}</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr>{Object.keys(crit).map((k) => <td key={k}>{crit[k]}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="two-col" style={{ marginTop: 14 }}>
              <div>
                <div className="label zh">优点</div>
                <ul className="zh">{result.strengths?.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
              <div>
                <div className="label zh">不足</div>
                <ul className="zh">{result.weaknesses?.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <div className="label zh">提升建议</div>
              <ul className="zh">{result.suggestions?.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>

            {result.correctedErrors?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="label zh" style={{ marginBottom: 6 }}>纠错</div>
                <table>
                  <thead><tr><th className="zh">原文</th><th className="zh">修正</th><th className="zh">说明</th></tr></thead>
                  <tbody>
                    {result.correctedErrors.map((e, i) => (
                      <tr key={i}>
                        <td>{e.original}</td><td><b>{e.corrected}</b></td><td className="zh">{e.explain}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.improvedVersion && (
              <div style={{ marginTop: 14 }}>
                <div className="label zh">示范版本</div>
                <div className="tooltip-note">{result.improvedVersion}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function labelOf(k) {
  return { fluency: '流利度', vocabulary: '词汇', grammar: '语法', coherence: '连贯', pronunciation: '发音', delivery: '表达', topicDev: '展开' }[k] || k
}