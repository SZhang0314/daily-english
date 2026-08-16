# -*- coding: utf-8 -*-
"""
一站式储备文章抓取：合并 China Daily（双语）+ Nature / Science（学术英文）。

依赖：见 fetch_chinadaily.py 与 fetch_articles.py。

用法：
    python tools/stockpile.py                # 抓全部可直连源，写入 public/data/articles.json
    python tools/stockpile.py --week         # 只取最近 7 天的（真正的"每周更新"）
    python tools/stockpile.py --limit 30     # 每个源最多取 N 篇
"""

import argparse
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetch_chinadaily import collect_links, parse_article, SECTIONS  # noqa: E402
from fetch_articles import parse_feed, load_sources  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.join(HERE, "..", "public", "data", "articles.json")


def fetch_china_daily(limit):
    """China Daily 双语频道（HTML 抓取）。"""
    articles = []
    dedup = {}
    for sec_url, sec_name in SECTIONS.items():
        for l in collect_links(sec_url):
            if l not in dedup:
                dedup[l] = sec_name
    for url, sec_name in list(dedup.items())[:limit]:
        a = parse_article(url, sec_name)
        if a:
            articles.append(a)
    return articles


def fetch_rss_sources(sources_path, limit):
    """Nature / Science 等 RSS 源。"""
    articles = []
    sources = load_sources(sources_path)
    seen = set()
    for src in sources:
        if src.get("enabled") is False:
            continue
        for feed_url in src.get("feeds", []):
            for a in parse_feed(feed_url, src["name"], limit):
                if a["id"] not in seen:
                    seen.add(a["id"])
                    articles.append(a)
    return articles


def merge(existing_path, new_articles, week_only):
    """合并已有与新增，去重，可选只保留最近一周。"""
    existing = []
    if existing_path and os.path.exists(existing_path):
        try:
            with open(existing_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, OSError):
            existing = []

    by_id = {}
    for a in existing + new_articles:
        by_id[a.get("id")] = a

    now = datetime.datetime.now(datetime.UTC)
    result = []
    for a in by_id.values():
        if week_only:
            try:
                pub = a.get("published") or ""
                dt = datetime.datetime.fromisoformat(pub.replace("Z", "+00:00"))
                if (now - dt.replace(tzinfo=None)).days > 7:
                    continue
            except (ValueError, TypeError):
                continue
        result.append(a)

    result.sort(key=lambda x: x.get("published") or "", reverse=True)
    today = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d")
    for a in result:
        a["fetched"] = today
    return result


def main():
    parser = argparse.ArgumentParser(description="储备文章一站式抓取")
    parser.add_argument("--limit", type=int, default=40)
    parser.add_argument("--week", action="store_true", help="只保留最近 7 天")
    parser.add_argument("--out", default=DEFAULT_OUT)
    parser.add_argument("--sources", default=os.path.join(HERE, "sources.json"))
    args = parser.parse_args()

    print("=" * 70)
    print("[1/3] China Daily 双语频道")
    cd = fetch_china_daily(args.limit)
    print(f"      {len(cd)} 篇")

    print("[2/3] Nature / Science RSS")
    rss = fetch_rss_sources(args.sources, args.limit)
    print(f"      {len(rss)} 篇")

    print("[3/3] 合并去重")
    out = os.path.abspath(args.out)
    merged = merge(out, cd + rss, args.week)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print("=" * 70)
    print(f"完成：共 {len(merged)} 篇 -> {out}")
    if args.week:
        print("已过滤为最近 7 天内容。")


if __name__ == "__main__":
    sys.exit(main())