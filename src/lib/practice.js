import { chat, jsonFrom } from './deepseek'

export const SPEAKING_TOPICS = {
  IELTS: [
    'Describe your hometown and what you like and dislike about it.',
    'Describe a person you admire and explain why.',
    'Describe a memorable trip you have taken.',
    'Do you think technology has improved our lives? Why or why not?',
  ],
  TOEFL: [
    'Do you agree or disagree: people today are more dependent on technology than in the past?',
    'Some people prefer to work in a team; others prefer to work alone. Which do you prefer and why?',
    'Do you think students should be required to attend classes in person?',
    'Is it better to learn from books or from hands-on experience?',
  ],
}

export const WRITING_TOPICS = {
  IELTS: [
    'Some people think that the government should spend more money on public transportation than on roads. To what extent do you agree or disagree?',
    'Many people believe that advertising encourages us to buy things we do not really need. Discuss both views and give your own opinion.',
    'In some countries, young people are encouraged to work or travel for a year between high school and university. Discuss the advantages and disadvantages.',
  ],
  TOEFL: [
    'Do you agree or disagree: it is better to have a job with a high salary but less free time, or a job with a low salary and more free time?',
    'Do you agree or disagree: governments should invest more in space exploration than in solving problems on Earth?',
    'Some believe teachers should be evaluated by their students. Do you agree or disagree?',
  ],
}

const SCORE_SCHEMA = `
请严格输出 JSON（不要 markdown 代码块），结构：
{
  "band": 6.5,
  "bandLabel": "IELTS 6.5 / TOEFL 90",
  "criteria": {
    "fluency": 6.5,
    "vocabulary": 6.5,
    "grammar": 6.5,
    "coherence": 6.5
  },
  "strengths": ["优点1"],
  "weaknesses": ["不足1"],
  "suggestions": ["提升建议1"],
  "improvedVersion": "改写后的更优版本（口语为更地道的说法，写作为优化示范）",
  "correctedErrors": [ { "original":"原文", "corrected":"修正", "explain":"说明" } ]
}`

export async function practice({ exam, skill, topic, answer }) {
  const examName = exam // 'IELTS' | 'TOEFL'
  const skillName = skill // 'speaking' | 'writing'

  let scaleNote = ''
  if (exam === 'IELTS') {
    scaleNote = skillName === 'speaking'
      ? '按雅思口语 4 项标准（流利度与连贯性、词汇、语法、发音）打分，满分 9.0。'
      : '按雅思写作 4 项标准（任务回应、连贯与衔接、词汇、语法）打分，满分 9.0。'
  } else {
    scaleNote = skillName === 'speaking'
      ? '按托福口语 3 项标准（表达、语言运用、话题展开）打分，满分 30。'
      : '按托福写作 2 项标准（综合/独立写作）打分，满分 30。'
  }

  const prompt = `你是资深的${examName}${skillName === 'speaking' ? '口语' : '写作'}考官。${scaleNote}

题目：${topic}

考生回答：
"""
${answer}
"""

${SCORE_SCHEMA}

要求：
1. "bandLabel" 若 IELTS 给出口语/写作 band 分（如 "IELTS 6.5"）；若 TOEFL 给出总分（如 "TOEFL 23"）。
2. 指出具体错误并给出修正与解释。
3. 给出改进后的示范版本。
4. 反馈用中文，示范/例句用英文。`

  const raw = await chat([{ role: 'user', content: prompt }])
  return jsonFrom(raw)
}