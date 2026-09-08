#!/usr/bin/env python3
"""Verify the public homepage and weekly ranking after the wrapper deploys."""
import json
import time
from html.parser import HTMLParser
from urllib.request import Request, urlopen

BASE = 'https://blog.dohyeon.kr'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.featured = False
        self.slugs = []
        self.candidates = []
        self.scripts = []
        self.styles = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'data-featured-carousel' in attrs:
            self.featured = True
        if 'data-featured-slug' in attrs:
            self.slugs.append(attrs['data-featured-slug'])
            self.candidates.append({'slug': attrs['data-featured-slug'], 'publishedAt': attrs.get('data-featured-published-at')})
        if tag == 'script':
            self.scripts.append(attrs.get('src', ''))
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.styles.append(attrs.get('href', ''))


def read(path, body=None):
    from urllib.parse import urljoin, urlsplit
    url = urljoin(BASE, path)
    if urlsplit(url).netloc != 'blog.dohyeon.kr':
        raise RuntimeError('Unexpected asset origin')
    headers = {'Cache-Control': 'no-cache', 'User-Agent': 'DLOG-deploy-verification'}
    if body is not None:
        headers.update({'Content-Type': 'application/json', 'Origin': BASE})
    with urlopen(Request(url, data=body, headers=headers), timeout=15) as response:
        return response.read().decode('utf-8')


def verify():
    page = Page()
    page.feed(read('/?deploy-check=' + str(int(time.time()))))
    if not page.featured:
        raise RuntimeError('Public homepage still lacks the featured carousel. Check active Ghost theme and deployed theme mount.')
    if not page.slugs:
        raise RuntimeError('Ghost did not render published carousel candidates')
    script = next((s for s in page.scripts if '/assets/js/featured-carousel.js' in s), None)
    stylesheet = next((s for s in page.styles if '/assets/css/screen.css' in s), None)
    if not script or 'featuredPublishedAt' not in read(script):
        raise RuntimeError('Public carousel JavaScript is missing or stale')
    if not stylesheet or '.featured-carousel__slide' not in read(stylesheet):
        raise RuntimeError('Public carousel CSS is missing or stale')
    data = json.loads(read('/api/visit/featured', json.dumps({'candidates': page.candidates}).encode()))
    posts = data['posts']
    assert data['timezone'] == 'Asia/Seoul'
    assert data['algorithm'] == 'engagement-recency-v1'
    assert len(posts) == min(3, len(page.slugs))
    assert all(p['slug'] in page.slugs and p['views'] >= 0 and p['score'] >= 0 for p in posts)
    assert [p['score'] for p in posts] == sorted([p['score'] for p in posts], reverse=True)
    print(json.dumps({'verified': True, 'start': data['start'], 'end': data['end'], 'posts': posts}, ensure_ascii=False))


if __name__ == '__main__':
    for attempt in range(6):
        try:
            verify()
            break
        except Exception as error:
            print(str(error), flush=True)
            if attempt == 5:
                raise
            time.sleep(10)

