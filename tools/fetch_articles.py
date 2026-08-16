# -*- coding: utf-8 -*-
"""
英文文章储备爬虫：从多个外媒 RSS 源抓取文章，清洗后存为 JSON，供前端「每日文章」备选使用。

依赖：pip install requests beautifulsoup4 lxml feedparser

用法：
    python tools/fetch_articles.py                 # 抓取所有源，写入 public/data/articles.json
    python tools/fetch_articles.py --limit 30      # 每个源最多取 30 篇
    python tools/fetch_articles.py --out foo.json  # 自定义输出路径

输出结构（每篇文章）：
{
  "id": "md5(url)",
  "source": "The Guardian",
  "title": "...",
  "summary": "摘要/首段（用于预览）",
  "content": "正文纯文本",
  "url": "原文链接",
  "published": "2026-08-16T08:00:00+00:00",
  "fetched": "2026-08-16",
  "categories": ["World"]
}
"""

import argparse
import hashlib
import html
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

import feedparser
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
TIMEOUT = 10
MAX_RETRIES = 1


def fetch(url, binary=False):
    for attempt in range(MAX_RETRIES + 1):
        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            r.raise_for_status()
            return r.content if binary else r.text
        except requests.RequestException:
            if attempt == MAX_RETRIES:
                return None
            time.sleep(1)
    return None


def clean_text(node):
    """从 BeautifulSoup 节点提取可见正文文本，按段落保留换行。"""
    if node is None:
        return ""
    for tag in node(["script", "style", "noscript", "iframe", "form", "nav",
                     "aside", "footer", "figure", "figcaption", "button",
                     "svg", "video", "audio", "img"]):
        tag.decompose()
    paragraphs = []
    for p in node.find_all(["p", "h1", "h2", "h3", "li"]):
        t = p.get_text(" ", strip=True)
        t = re.sub(r"\s+", " ", t)
        if len(t) > 20:
            paragraphs.append(t)
    if not paragraphs:
        t = node.get_text("\n", strip=True)
        paragraphs = [l for l in t.split("\n") if len(l.strip()) > 40]
    return "\n\n".join(paragraphs)


def strip_html(s):
    if not s:
        return ""
    soup = BeautifulSoup(s, "html.parser")
    return re.sub(r"\s+", " ", soup.get_text(" ", strip=True))


def extract_article_text(url, source):
    """打开原文链接，尝试抓取正文。失败则退回摘要。"""
    text = fetch(url)
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")

    selectors = [
        {"name": "article"},
        {"name": "main"},
        {"attrs": {"class": re.compile(r"(article|story|content|body-text|articleBody)", re.I)}},
        {"id": re.compile(r"(article|story|content|body)", re.I)},
    ]
    for sel in selectors:
        node = soup.find(**sel)
        if node:
            body = clean_text(node)
            if len(body) > 400:
                return body
    body = clean_text(soup.body)
    return body


def parse_feed(feed_url, source_name, limit):
    raw = fetch(feed_url, binary=True)
    if not raw:
        print(f"  [x] 无法抓取 {feed_url}")
        return []
    d = feedparser.parse(raw)
    articles = []
    for entry in d.entries[:limit]:
        link = entry.get("link", "")
        title = strip_html(entry.get("title", "")).strip()
        summary = strip_html(entry.get("summary", "") or entry.get("description", ""))
        published = ""
        for k in ("published_parsed", "updated_parsed"):
            t = entry.get(k)
            if t:
                published = datetime(*t[:6], tzinfo=timezone.utc).isoformat()
                break
        if not link or not title:
            continue
        cats = [c.get("term") for c in entry.get("tags", [])][:5]
        aid = hashlib.md5(link.encode("utf-8")).hexdigest()
        articles.append({
            "id": aid,
            "source": source_name,
            "title": title,
            "summary": summary[:500],
            "content": "",
            "url": link,
            "published": published,
            "categories": cats,
        })
    return articles


def load_sources(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    default_out = os.path.join(here, "..", "public", "data", "articles.json")
    parser = argparse.ArgumentParser(description="英文文章储备爬虫")
    parser.add_argument("--limit", type=int, default=20, help="每个源最多取的文章数")
    parser.add_argument("--sources", default=os.path.join(here, "sources.json"))
    parser.add_argument("--out", default=default_out)
    parser.add_argument("--fetch-body", action="store_true",
                        help="打开原文抓取正文（较慢，默认只存摘要）")
    args = parser.parse_args()

    sources = load_sources(args.sources)
    all_articles = []
    seen = set()

    print("=" * 70)
    for src in sources:
        if src.get("enabled") is False:
            print(f"[{src['name']}] 已禁用（跳过）")
            continue
        name, feeds = src["name"], src.get("feeds", [])
        print(f"[{name}]")
        for feed_url in feeds:
            arts = parse_feed(feed_url, name, args.limit)
            added = 0
            for a in arts:
                if a["id"] in seen:
                    continue
                seen.add(a["id"])
                added += 1
                all_articles.append(a)
            print(f"  {feed_url}  ->  +{added} 篇")
        time.sleep(0.5)

    # 可选：抓正文
    if args.fetch_body:
        print("正在抓取正文（可能较慢）...")
        for i, a in enumerate(all_articles):
            body = extract_article_text(a["url"], a["source"])
            if body and len(body) > 400:
                a["content"] = body[:20000]
            time.sleep(0.4)
            if (i + 1) % 10 == 0:
                print(f"  已处理 {i + 1}/{len(all_articles)}")

    # 写入 fetched 时间戳并排序（按发布日期倒序）
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for a in all_articles:
        a["fetched"] = today
    all_articles.sort(key=lambda x: x.get("published") or "", reverse=True)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)

    print("=" * 70)
    print(f"完成：共 {len(all_articles)} 篇文章 -> {out}")


if __name__ == "__main__":
    sys.exit(main())