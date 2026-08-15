import { chat, jsonFrom } from './deepseek'

const ARTICLE_SCHEMA = `
请严格输出一个 JSON 对象（不要输出其他文字，不要用 markdown 代码块），结构如下：
{
  "title": "英文标题",
  "titleZh": "中文标题",
  "translation": "全文中文翻译（按段落，用 \\n\\n 分隔）",
  "sentences": [
    {
      "text": "原文句子",
      "translation": "该句中文翻译",
      "long": true,
      "analysis": "长难句结构解析（若 long 为 true 必填，说明主干与从句、修饰关系）"
    }
  ],
  "words": [
    {
      "word": "单词或短语",
      "lemma": "词形",
      "phonetic": "音标",
      "pos": "词性",
      "meaningZh": "中文释义",
      "level": "IELTS",
      "note": "用法/易错点/搭配"
    }
  ],
  "summary": {
    "ielts": [{"word":"词","meaningZh":"释义","level":"IELTS"}],
    "toefl": [{"word":"词","meaningZh":"释义","level":"TOEFL"}]
  }
}
要求：
1. "level" 字段只能取 "IELTS" 或 "TOEFL"：若该词属于雅思(4.0-9.0)高频/核心词汇则标 "IELTS"，若属于托福(60-120)高频/核心词汇则标 "TOEFL"，两者都符合可任选或标 "IELTS"。
2. 只挑重点词、高频词、考试核心词，不要罗列全部单词，控制在 15-40 个。
3. "summary" 按 IELTS / TOEFL 两个列表分别汇总词汇。
4. 长难句标注 <= 全文句子数的 40%。`

export async function analyzeArticle({ title, content, target = 'IELTS' }) {
  const text = (content || '').trim().slice(0, 8000)
  const prompt = `你是英语教学专家。请分析下面的英文文章，并：翻译全文中译；勾画重点词语并注释（含音标、词性、中文释义、用法）；标注长难句并解析结构；按雅思和托福不同分数标准对词汇分类；在文末做词汇总结。

目标考试：${target}

文章标题（如无则留空）：${title || ''}

文章内容：
"""
${text}
"""

${ARTICLE_SCHEMA}`

  const raw = await chat([{ role: 'user', content: prompt }])
  return jsonFrom(raw)
}

export function analyzeArticleStream(title, content, target = 'IELTS', onDelta) {
  const text = (content || '').trim().slice(0, 8000)
  const prompt = `你是英语教学专家。请分析下面的英文文章并输出一个 JSON 对象（不要 markdown 代码块），结构见 ${ARTICLE_SCHEMA}。目标考试：${target}。
文章标题：${title || ''}
文章内容：
"""
${text}
"""`

  return chat([{ role: 'user', content: prompt }], { stream: true, onDelta })
}