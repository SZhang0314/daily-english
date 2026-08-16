# -*- coding: utf-8 -*-
"""
音视频储备爬虫：抓取 TED 演讲元数据（标题/讲者/时长/链接/主题），供前端「音视频」页预选。

VOA / BBC / CNN / 脱口秀 等在部分网络下直连超时；脚本已预留结构，
网络可达时可扩展。TED 演讲列表页（https://www.ted.com/talks）通过 __NEXT_DATA__ JSON 提取。

用法：
    python tools/fetch_media.py --limit 40 --out public/data/media.json

输出结构（每条）：
{
  "id": "slug",
  "source": "TED",
  "title": "...",
  "speaker": "...",
  "duration": 铀秒,
  "url": "https://www.ted.com/talks/slug",
  "published": "ISO",
  "topics": ["..."],
  "description": ""
}
"""

import argparse
import datetime
import json
import os
import re
import sys
import time

import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0 Safari/537.36"}
TIMEOUT = 20

TED_LIST_URL = "https://www.ted.com/talks"
EXTRA_LISTS = {
    "most-viewed": "https://www.ted.com/talks?sort=popular",
    "newest": "https://www.ted.com/talks?sort=newest",
}


def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        return r.text
    except requests.RequestException:
        return None


def extract_ted_talks(html):
    talks = []
    m = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html, re.S,
    )
    if not m:
        return talks
    try:
        data = json.loads(m.group(1))
        raw = data["props"]["pageProps"]["talks"]
    except (KeyError, json.JSONDecodeError):
        return talks

    for t in raw:
        topics = t.get("topics") or {}
        topic_names = [n.get("name") for n in (topics.get("nodes") or []) if isinstance(n, dict)]

        speakers = t.get("speakers") or {}
        spk_name = t.get("presenterDisplayName") or ""
        if not spk_name:
            nodes = speakers.get("nodes") or []
            if nodes and isinstance(nodes[0], dict):
                n = nodes[0]
                spk_name = f"{n.get('firstname', '')} {n.get('lastname', '')}".strip()

        item = {
            "id": t.get("slug") or str(t.get("id")),
            "source": "TED",
            "title": t.get("title", ""),
            "speaker": spk_name,
            "duration": t.get("duration"),
            "url": t.get("canonicalUrl") or f"https://www.ted.com/talks/{t.get('slug')}",
            "published": (t.get("publishedAt") or t.get("recordedOn") or ""),
            "topics": topic_names,
            "description": "",
        }
        if item["title"]:
            talks.append(item)
    return talks


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    here = os.path.dirname(os.path.abspath(__file__))
    default_out = os.path.join(here, "..", "public", "data", "media.json")
    parser = argparse.ArgumentParser(description="音视频储备爬虫（TED）")
    parser.add_argument("--limit", type=int, default=40)
    parser.add_argument("--out", default=default_out)
    args = parser.parse_args()

    # 合并多个列表页（newest / popular）
    merged = {}
    for label, url in [("newest", EXTRA_LISTS["newest"]), ("popular", TED_LIST_URL)]:
        html = fetch(url)
        if not html:
            print(f"[x] 无法抓取 {label}: {url}")
            continue
        talks = extract_ted_talks(html)
        for t in talks:
            if t["id"] not in merged:
                merged[t["id"]] = t
        print(f"[TED {label}] +{len(talks)}")
        time.sleep(1)

    result = []
    for t in merged.values():
        if t["id"] not in result and len(result) < args.limit:
            result.append(t)

    result.sort(key=lambda x: x.get("published") or "", reverse=True)
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    for t in result:
        t["fetched"] = today

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("=" * 70)
    print(f"完成：共 {len(result)} 条音视频 -> {out}")


if __name__ == "__main__":
    sys.exit(main())