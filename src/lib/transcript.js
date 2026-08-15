import { chat, jsonFrom } from './deepseek'

export async function analyzeTranscript({ transcript, target = 'IELTS' }) {
  const text = (transcript || '').trim().slice(0, 8000)
  const prompt = `你是英语教学专家。下面是一段音视频的字幕文本（中英混排）。请输出一个 JSON 对象（不要 markdown 代码块），结构如下：
{
  "sentences": [ { "text":"原文", "translation":"中文翻译", "long":bool, "analysis":"长难句解析(若long)" } ],
  "words": [ { "word":"词", "phonetic":"音标", "pos":"词性", "meaningZh":"释义", "level":"IELTS或TOEFL", "note":"用法" } ],
  "summary": { "ielts":[{ "word":"","meaningZh":"","level":"IELTS" }], "toefl":[{ "word":"","meaningZh":"","level":"TOEFL" }] }
}
按雅思/托福不同分数标准对词汇分类（level 只能取 IELTS 或 TOEFL），只挑重点词 10-30 个，长难句 <= 句子数 40%。

目标考试：${target}

字幕文本：
"""
${text}
"""`

  const raw = await chat([{ role: 'user', content: prompt }])
  return jsonFrom(raw)
}