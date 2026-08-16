// 浏览器端 PDF / DOCX 文本提取（动态 import，按需加载，避免首屏过大）

export async function parsePdf(file) {
  const pdfjsLib = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

  const data = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data }).promise
  const parts = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items
      .filter((it) => 'str' in it)
      .map((it) => it.str)
      .join(' ')
    parts.push(strings)
  }
  await doc.destroy()
  return parts.join('\n\n')
}

export async function parseDocx(file) {
  const mammoth = await import('mammoth')
  const data = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: data })
  return result.value || ''
}

export async function parseFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (ext === 'pdf') return parsePdf(file)
  if (ext === 'docx') return parseDocx(file)
  if (ext === 'txt' || ext === 'md' || ext === 'html' || ext === 'htm') {
    return file.text()
  }
  return null
}

export const SUPPORTED = ['pdf', 'docx', 'txt', 'md', 'html', 'htm']