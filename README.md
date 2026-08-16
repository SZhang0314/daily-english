# 每日英语 · Daily English

一个白底黑字的英语学习网站，纯静态前端，可部署到 GitHub Pages / Vercel 分享给朋友。

## 功能

1. **每日文章精读**：来源包括 China Daily、The Guardian、National Geographic、The New York Times、The Economist、Nature、Science 及其子刊；支持粘贴原文或上传 `.txt` / `.md` / `.html` / `.pdf` / `.docx`（PDF 与 Word 在浏览器本地解析），AI 自动翻译、勾画重点词、解析长难句、按雅思/托福分级词汇、文末词汇总结。
2. **音视频听说**：来源包括 TED、VOA、BBC、CNN、脱口秀等；上传音视频后可浏览器语音识别转录或粘贴字幕，中英文字幕可独立开关，附带重点词/长难句注释与词汇总结。
3. **AI 口语 · 写作对练**：模拟雅思（IELTS）与托福（TOEFL）口语/写作两种模式，AI 模拟考官打分、分项评分、纠错与提升建议。
4. **储备库（每周更新）**：内置文章库（China Daily 双语 + Nature + Science）与音视频库（TED 演讲），由爬虫每周抓取生成 `public/data/*.json`。

## 储备抓取（每周更新）

```bash
pip install requests beautifulsoup4 lxml feedparser

# 文章：China Daily 双语 + Nature + Science（合并去重）
python tools/stockpile.py --limit 40

# 只保留最近 7 天
python tools/stockpile.py --week

# 音视频：TED 演讲
python tools/fetch_media.py --limit 40
```

> 说明：Guardian / BBC / NYT / VOA / Economist 等外媒在当前网络直连会超时（被墙），
> 需在海外网络或配置代理后，把 `tools/sources.json` 里对应条目 `enabled` 置为 `true` 再抓取。
> Nature、Science、TED 已确认可直连（其中 Nature/Science 正文付费墙，RSS 提供标题+摘要）。

## 本地运行

```bash
npm install
npm run dev
```

## 配置 API Key

右上角「设置」中填 DeepSeek（或其他 OpenAI 兼容厂商）的 API Key、Base URL、模型。

- 默认：`https://api.deepseek.com` + `deepseek-chat`
- Key 仅保存在浏览器 localStorage，不上传服务器。

## 部署到 GitHub Pages / Vercel

### GitHub Pages

1. 在 GitHub 新建仓库。
2. 推送代码后，仓库 `Settings → Pages → Source` 选择 `GitHub Actions`，添加 `.github/workflows/deploy.yml`。
3. 注意 `vite.config.js` 已设置 `base: './'` 相对路径，静态部署无问题。

示例 workflow（`.github/workflows/deploy.yml`）：

```yaml
name: deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

### Vercel

1. 将仓库导入 vercel.com，框架选 Vite，Build Command `npm run build`，Output Directory `dist`。
2. 一键部署即可。

## 说明

- 音视频转录采用浏览器 Web Speech API（需 Chrome/Edge）；如需精确字幕可粘贴 `.srt` / `.vtt` / `.txt` 文本后再分析。
- 中文使用「黑体/微软雅黑」字重，英文与数字使用 Times New Roman，字号统一 11px。