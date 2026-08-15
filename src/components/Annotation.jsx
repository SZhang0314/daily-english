import { useMemo } from 'react'

export function LevelTag({ level }) {
  if (!level) return null
  const cls = String(level).toUpperCase().includes('TOEFL') ? 'toefl' : 'ielts'
  return <span className={`tag ${cls}`}>{String(level).toUpperCase()}</span>
}

export function WordBank({ words }) {
  if (!words || words.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0' }}>
      {words.map((w, i) => (
        <span key={i} style={{
          border: '1px solid var(--border)', borderRadius: 3, padding: '2px 8px',
          fontSize: 11,
        }}>
          <b>{w.word}</b> <span className="muted">{w.phonetic || ''}</span>
          <span style={{ marginLeft: 4 }} className="zh">{w.meaningZh || ''}</span>
        </span>
      ))}
    </div>
  )
}

export function SummaryTable({ summary }) {
  if (!summary) return null
  const build = (arr) => arr || []
  const ielts = build(summary.ielts)
  const toefl = build(summary.toefl)
  const rows = [...ielts, ...toefl]
  if (rows.length === 0) return null
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th className="zh">词汇</th>
            <th className="zh">释义</th>
            <th className="zh">音标</th>
            <th className="zh">分类</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w, i) => (
            <tr key={i}>
              <td><b>{w.word}</b></td>
              <td className="zh">{w.meaningZh || ''}</td>
              <td>{w.phonetic || ''}</td>
              <td><LevelTag level={w.level} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 渲染带重点词高亮的英文段落
export function HighlightedText({ text, words, onWord }) {
  const wordSet = useMemo(() => {
    const map = new Map()
    for (const w of words || []) {
      const key = (w.word || '').toLowerCase().replace(/[^a-z' -]/g, '').trim()
      if (key) map.set(key, w)
    }
    // 按长度降序，优先匹配长短语
    return [...map.entries()].sort((a, b) => b[0].length - a[0].length)
  }, [words])

  if (!text) return null
  const parts = text.split(/\n/)
  return (
    <div>
      {parts.map((para, pi) => (
        <p key={pi}>{highlightParagraph(para, wordSet, onWord)}</p>
      ))}
    </div>
  )
}

function highlightParagraph(para, wordSet, onWord) {
  if (wordSet.length === 0) return para
  // simple tokenize by keeping punctuation; we match substrings case-insensitively
  const nodes = []
  let idx = 0
  const lower = para.toLowerCase()
  while (idx < para.length) {
    let matched = null
    for (const [w, info] of wordSet) {
      if (lower.startsWith(w, idx)) {
        const end = idx + w.length
        // word boundary check
        const beforeOk = idx === 0 || !/[a-z]/.test(para[idx - 1])
        const afterOk = end >= para.length || !/[a-z]/.test(para[end])
        if (beforeOk && afterOk) { matched = { w, info, end }; break }
      }
    }
    if (matched) {
      nodes.push(
        <span key={idx} className="highlight-word"
          title={`${matched.info.meaningZh || ''}${matched.info.phonetic ? ' ' + matched.info.phonetic : ''}`}
          onClick={() => onWord?.(matched.info)}>
          {para.slice(idx, matched.end)}
        </span>
      )
      idx = matched.end
    } else {
      nodes.push(para[idx])
      idx++
    }
  }
  return nodes
}

export function WordDetail({ word, onClose }) {
  if (!word) return null
  return (
    <div className="tooltip-note" style={{ position: 'relative' }}>
      <div><b>{word.word}</b> {word.phonetic ? <span className="muted">/{word.phonetic}/</span> : null} <LevelTag level={word.level} /></div>
      <div className="zh">{word.pos ? `[${word.pos}] ` : ''}{word.meaningZh}</div>
      {word.note && <div className="zh muted">{word.note}</div>}
      <button className="ghost small" style={{ position: 'absolute', top: 4, right: 4 }}
        onClick={onClose}>×</button>
    </div>
  )
}