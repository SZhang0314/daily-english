# -*- coding: utf-8 -*-
"""
China Daily 英语学习频道爬虫（HTML 版）。

China Daily 的 RSS 已停止更新（feed 停留在 2017–2019），
但 HTML 列表页和文章页持续更新。本脚本爬取 language.chinadaily.com.cn
的双语内容（双语新闻 / 每日一词），非常适合英语学习。

用法：
    python tools/fetch_chinadaily.py --limit 20 --out public/data/articles.json

说明：
    - 只抓取当前网络可直连的源（chinadaily.com.cn）。
    - 外媒（Guardian/BBC/NYT/Nature/Science/TED/VOA/Economist）在国内网络
      直连超时（被墙），需在海外网络或配置代理后，把 tools/sources.json 里
      对应条目 enabled 置为 true，并由 fetch_articles.py 抓取。
"""

import argparse
import datetime
import hashlib
import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8",
}
TIMEOUT = 12

# 语言学习频道栏目（列表页 URL -> 栏目名）
SECTIONS = {
    "https://language.chinadaily.com.cn/": "China Daily 英语学习",
    "https://language.chinadaily.com.cn/news_bilingual": "双语新闻",
    "https://language.chinadaily.com.cn/news_hotwords/word_of_the_day": "每日一词",
    "https://language.chinadaily.com.cn/thelatest": "双语热搜",
}

ARTICLE_RE = re.compile(r"/a/(\d{6}/\d{2})/WS([a-z0-9]+)\.html", re.I)


def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        r.encoding = "utf-8"
        return r.text
    except requests.RequestException:
        return None


def collect_links(section_url):
    """从列表页收集文章链接（去重，保序）。"""
    html = fetch(section_url)
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    links = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith("//"):
            href = "https:" + href
        elif href.startswith("/"):
            href = "https://language.chinadaily.com.cn" + href
        m = ARTICLE_RE.search(href)
        if m and href not in seen:
            seen.add(href)
            links.append(href)
    return links


def parse_article(url, section_name):
    html = fetch(url)
    if not html:
        return None
    soup = BeautifulSoup(html, "html.parser")

    title_el = soup.find("h1")
    title = title_el.get_text(" ", strip=True) if title_el else ""
    if not title:
        title_el = soup.find("title")
        title = title_el.get_text(strip=True) if title_el else ""

    content_el = soup.find(id="Content") or soup.find(
        attrs={"class": re.compile(r"(artTxt|article|content|main_text)", re.I)}
    )
    paragraphs = []
    if content_el:
        for p in content_el.find_all("p"):
            t = re.sub(r"\s+", " ", p.get_text(" ", strip=True)).strip()
            if len(t) > 10:
                paragraphs.append(t)

    # 日期：从标题/正文旁或 meta 提取，退回到 URL 中的 /a/YYYYMM/DD/
    date_m = re.search(r"/a/(\d{4})(\d{2})/(\d{2})/", url)
    published = ""
    if date_m:
        y, m, d = date_m.group(1), date_m.group(2), date_m.group(3)
        published = f"{y}-{m}-{d}T00:00:00+08:00"

    body = "\n\n".join(paragraphs)
    if not body and len(title) < 10:
        return None

    # 过滤专题/栏目页：标题含这些词，或正文过短的跳过
    junk = ("专题", "看冬奥", "年终盘点", "百科", "LanguageTips", "Year Ender",
            "双语看两会", "双语看", "热词榜", "- Chinadaily")
    if any(j in title for j in junk) or len(body) < 200:
        return None

    aid = hashlib.md5(url.encode("utf-8")).hexdigest()
    return {
        "id": aid,
        "source": "China Daily",
        "section": section_name,
        "title": title,
        "summary": (paragraphs[0][:400] if paragraphs else ""),
        "content": body[:30000],
        "url": url,
        "published": published,
        "categories": [section_name],
    }


def safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        s = " ".join(str(a) for a in args)
        sys.stdout.buffer.write(s.encode("utf-8", "replace") + b"\n")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    here = os.path.dirname(os.path.abspath(__file__))
    default_out = os.path.join(here, "..", "public", "data", "articles.json")
    parser = argparse.ArgumentParser(description="China Daily 双语内容爬虫")
    parser.add_argument("--limit", type=int, default=20, help="最多抓取文章数")
    parser.add_argument("--out", default=default_out)
    parser.add_argument("--sections", nargs="*", help="指定栏目 URL，默认抓全部")
    args = parser.parse_args()

    if args.sections:
        target_sections = {u: SECTIONS.get(u, u) for u in args.sections}
    else:
        target_sections = dict(SECTIONS)

    dedup = {}
    for sec_url, sec_name in target_sections.items():
        links = collect_links(sec_url)
        for l in links:
            if l not in dedup:
                dedup[l] = sec_name
        print(f"[{sec_name}] {sec_url}  文章链接 {len(links)} 条")
        time.sleep(0.5)

    all_links = list(dedup.items())

    # 限流抓取详情
    articles = []
    limit = args.limit
    for i, (url, sec_name) in enumerate(all_links[:limit]):
        a = parse_article(url, sec_name)
        if a:
            articles.append(a)
            print(f"  [{i + 1}/{min(limit, len(all_links))}] {a['published'][:10]} | {a['title'][:50]}")
        else:
            print(f"  [x] 跳过 {url}")
        time.sleep(0.4)

    # 按日期倒序
    articles.sort(key=lambda x: x.get("published") or "", reverse=True)
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    for a in articles:
        a["fetched"] = today

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    print("=" * 70)
    print(f"完成：共 {len(articles)} 篇 -> {out}")


if __name__ == "__main__":
    sys.exit(main())